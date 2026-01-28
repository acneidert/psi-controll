import { and, desc, eq, ne } from 'drizzle-orm'
import {
  differenceInCalendarDays,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  subDays,
} from 'date-fns'
import { db } from '@/db'
import { agendas, consultas } from '@/db/schema'

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
    await this.checkConflict(
      diaSemana,
      data.hora,
      data.dataInicio,
      dataFim,
      data.frequencia,
    )

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

      const frequencia = data.frequencia ?? (existing.frequencia as any)
      if (frequencia === 'unica' && !dataFim) {
        dataFim = dataInicio
        data.dataFim = dataFim
      }

      await this.checkConflict(diaSemana!, hora, dataInicio, dataFim, frequencia, id)

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
    dataFim: string | null | undefined,
    frequencia: 'unica' | 'semanal' | 'quinzenal' | 'mensal',
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
      .select({
        id: agendas.id,
        pacienteId: agendas.pacienteId,
        frequencia: agendas.frequencia,
        dataInicio: agendas.dataInicio,
        dataFim: agendas.dataFim,
      })
      .from(agendas)
      .where(and(...conditions))

    const newStart = parseISO(dataInicio)
    const newEnd = dataFim ? parseISO(dataFim) : null

    for (const existing of conflicting) {
      const existingStart = parseISO(existing.dataInicio)
      const existingEnd = existing.dataFim ? parseISO(existing.dataFim) : null

      // 1. Basic Date Range Overlap
      if (existingEnd && isBefore(existingEnd, newStart)) continue
      if (newEnd && isBefore(newEnd, existingStart)) continue

      // 2. Frequency Specific Overlap
      let hasOverlap = false

      // If one is weekly, it always conflicts with any recurrence on that day/time
      if (frequencia === 'semanal' || existing.frequencia === 'semanal') {
        hasOverlap = true
      } 
      // Both are single/once
      else if (frequencia === 'unica' && existing.frequencia === 'unica') {
        if (isSameDay(newStart, existingStart)) hasOverlap = true
      }
      // One is single, other is recurring
      else if (frequencia === 'unica' || existing.frequencia === 'unica') {
        const singleDate = frequencia === 'unica' ? newStart : existingStart
        const recurringStart = frequencia === 'unica' ? existingStart : newStart
        const recurringEnd = frequencia === 'unica' ? existingEnd : newEnd
        const recurringFreq = frequencia === 'unica' ? existing.frequencia : frequencia
        const recurringAgendaId = frequencia === 'unica' ? existing.id : (excludeId || 0) // This logic is slightly flawed for update, but excludeId handles it

        // Check if singleDate lands on a recurring date
        let landsOnRecurringDay = false
        if (!isBefore(singleDate, recurringStart) && (!recurringEnd || !isAfter(singleDate, recurringEnd))) {
          if (recurringFreq === 'quinzenal') {
            const diff = differenceInCalendarDays(singleDate, recurringStart)
            if (diff % 14 === 0) landsOnRecurringDay = true
          } else if (recurringFreq === 'mensal') {
            if (singleDate.getDate() === recurringStart.getDate()) landsOnRecurringDay = true
          } else if (recurringFreq === 'semanal') {
            landsOnRecurringDay = true
          }
        }

        if (landsOnRecurringDay) {
          // EXCEPTION: If the recurring slot is CANCELLED or RESCHEDULED for this specific date, 
          // allow the "unica" agenda to occupy it.
          const agendaIdToCheck = frequencia === 'unica' ? existing.id : (excludeId || 0)
          
          if (agendaIdToCheck > 0) {
             const exception = await db.query.consultas.findFirst({
               where: and(
                 eq(consultas.agendaId, agendaIdToCheck),
                 eq(consultas.dataPrevista, singleDate)
               )
             })

             // If there is a cancellation or it was moved to another date, it's NOT an overlap
             const isFree = exception && (
               exception.status === 'cancelada' || 
               (exception.dataRealizacao && !isSameDay(exception.dataRealizacao, exception.dataPrevista))
             )

             if (!isFree) {
               hasOverlap = true
             }
          } else {
            hasOverlap = true
          }
        }
      }
      // Both are quinzenal
      else if (frequencia === 'quinzenal' && existing.frequencia === 'quinzenal') {
        const diff = differenceInCalendarDays(newStart, existingStart)
        // If diff is multiple of 14, they are on the same week cycle
        if (Math.abs(diff) % 14 === 0) hasOverlap = true
      }
      // Both are mensal
      else if (frequencia === 'mensal' && existing.frequencia === 'mensal') {
        if (newStart.getDate() === existingStart.getDate()) hasOverlap = true
      }
      // Mix of quinzenal and mensal - very likely to overlap eventually
      else {
        hasOverlap = true
      }

      if (hasOverlap) {
        throw new Error(
          `Conflito de horário detectado com agenda existente (Paciente: ${existing.pacienteId}).`,
        )
      }
    }
  }
}
