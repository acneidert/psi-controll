import { and, desc, eq, ne } from 'drizzle-orm'
import { format, getDay, parseISO, subDays } from 'date-fns'
import { db } from '@/db'
import { agendas } from '@/db/schema'

export type CreateAgendaInput = {
  pacienteId: number
  diaSemana?: number // Optional, derived from dataInicio if needed
  hora: string
  frequencia: 'unica' | 'semanal' | 'quinzenal' | 'mensal'
  dataInicio: string
  dataFim?: string | null
  valorFixo?: string | null // string decimal
  categoriaPrecoId?: number | null
  observacoes?: string
}

export type UpdateAgendaInput = Partial<CreateAgendaInput>

export class AgendaService {
  static async listAgendas() {
    return await db.query.agendas.findMany({
      where: eq(agendas.ativa, true),
      with: {
        paciente: true,
        categoriaPreco: true,
      },
      orderBy: [desc(agendas.dataInicio)],
    })
  }

  static async getAgendaById(id: number) {
    return await db.query.agendas.findFirst({
      where: eq(agendas.id, id),
      with: {
        paciente: true,
      },
    })
  }

  static async createAgenda(data: CreateAgendaInput) {
    // Derive diaSemana if not provided
    let diaSemana = data.diaSemana
    if (diaSemana === undefined) {
      const date = parseISO(data.dataInicio)
      diaSemana = getDay(date)
    }

    // Force dataFim = dataInicio for 'unica' if not set
    let dataFim = data.dataFim
    if (data.frequencia === 'unica' && !dataFim) {
      dataFim = data.dataInicio
    }

    // 1. Validation: Check for conflicts
    await this.checkConflict(diaSemana, data.hora, data.dataInicio, dataFim)

    // 2. Insert
    const [newAgenda] = await db
      .insert(agendas)
      .values({
        ...data,
        diaSemana,
        dataFim,
        ativa: true,
      })
      .returning()

    return newAgenda
  }

  static async updateAgenda(
    id: number,
    data: UpdateAgendaInput,
    mode: 'overwrite' | 'history' = 'overwrite',
    cutoffDate?: string,
  ) {
    // 1. Get existing
    const existing = await this.getAgendaById(id)
    if (!existing) throw new Error('Agenda não encontrada.')

    if (mode === 'history') {
      // KEEP HISTORY: Terminate old and create new
      // Determine cutoff/start date (default to today if not provided)
      const newStartDateStr =
        cutoffDate ?? format(new Date(), 'yyyy-MM-dd')
      const newStartDate = parseISO(newStartDateStr)

      // Calculate end date for old agenda (day before new start)
      const endDate = subDays(newStartDate, 1)
      const endDateStr = format(endDate, 'yyyy-MM-dd')

      await this.terminateAgenda(id, endDateStr)

      // Validate dataFim: if it is before newStartDate, clear it (make it open-ended)
      // because we are starting a NEW agenda period.
      let newDataFim = data.dataFim ?? existing.dataFim
      if (newDataFim && newDataFim < newStartDateStr) {
        newDataFim = null // or undefined
      }

      // Merge existing data with new data for the new agenda
      const createData: CreateAgendaInput = {
        pacienteId: data.pacienteId ?? existing.pacienteId,
        hora: data.hora ?? existing.hora,
        frequencia: data.frequencia ?? existing.frequencia ?? 'semanal',
        dataInicio: newStartDateStr, // FORCE new start date
        dataFim: newDataFim,
        diaSemana: data.diaSemana, // Let createAgenda derive it from dataInicio if undefined
        valorFixo:
          data.valorFixo === undefined ? existing.valorFixo : data.valorFixo,
        categoriaPrecoId:
          data.categoriaPrecoId === undefined
            ? existing.categoriaPrecoId
            : data.categoriaPrecoId,
        observacoes: data.observacoes ?? existing.observacoes ?? undefined,
      }

      return await this.createAgenda(createData)
    }

    // 2. OVERWRITE: If changing critical fields, validate conflict
    if (
      data.diaSemana !== undefined ||
      data.hora !== undefined ||
      data.dataInicio !== undefined ||
      data.dataFim !== undefined ||
      data.frequencia !== undefined
    ) {
      let diaSemana = data.diaSemana ?? existing.diaSemana

      if (data.dataInicio && data.diaSemana === undefined) {
        diaSemana = getDay(parseISO(data.dataInicio))
      }

      const hora = data.hora ?? existing.hora
      const dataInicio = data.dataInicio ?? existing.dataInicio
      let dataFim = data.dataFim === undefined ? existing.dataFim : data.dataFim

      const frequencia = data.frequencia ?? existing.frequencia
      if (frequencia === 'unica' && !dataFim) {
        dataFim = dataInicio
        data.dataFim = dataFim
      }

      await this.checkConflict(diaSemana!, hora, dataInicio, dataFim, id)

      data.diaSemana = diaSemana ?? undefined
    }

    // 3. Update
    const [updated] = await db
      .update(agendas)
      .set(data)
      .where(eq(agendas.id, id))
      .returning()
    return updated
  }

  static async terminateAgenda(id: number, endDate: string) {
    const [updated] = await db
      .update(agendas)
      .set({ dataFim: endDate })
      .where(eq(agendas.id, id))
      .returning()
    return updated
  }

  static async deleteAgenda(id: number, mode: 'history' | 'everything' = 'history') {
    if (mode === 'everything') {
      const [deleted] = await db
        .update(agendas)
        .set({ ativa: false })
        .where(eq(agendas.id, id))
        .returning()
      return deleted
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    return await this.terminateAgenda(id, today)
  }

  private static async checkConflict(
    diaSemana: number,
    hora: string,
    dataInicio: string,
    dataFim?: string | null,
    excludeId?: number,
  ) {
    const conditions = [
      eq(agendas.ativa, true),
      eq(agendas.diaSemana, diaSemana),
      eq(agendas.hora, hora),
    ]

    if (excludeId) {
      conditions.push(ne(agendas.id, excludeId))
    }

    const conflicting = await db
      .select()
      .from(agendas)
      .where(and(...conditions))

    for (const existing of conflicting) {
      const existingStart = existing.dataInicio
      const existingEnd = existing.dataFim

      const newStart = dataInicio
      const newEnd = dataFim

      // Check overlap
      if (existingEnd && existingEnd < newStart) continue // No overlap
      if (newEnd && newEnd < existingStart) continue // No overlap

      throw new Error(
        `Conflito de horário detectado com agenda existente (Paciente: ${existing.pacienteId}).`,
      )
    }
  }
}
