import { and, eq } from 'drizzle-orm'
import { PricingService } from './pricing'
import { db } from '@/db'
import { consultas } from '@/db/schema'

export class ConsultationService {
  private static async upsertConsultation(data: typeof consultas.$inferInsert) {
    const existing = await db.query.consultas.findFirst({
      where: and(
        eq(consultas.agendaId, data.agendaId),
        eq(consultas.dataPrevista, data.dataPrevista),
      ),
    })

    if (existing) {
      const [updated] = await db
        .update(consultas)
        .set(data)
        .where(eq(consultas.id, existing.id))
        .returning()
      return updated
    } else {
      const [inserted] = await db.insert(consultas).values(data).returning()
      return inserted
    }
  }

  /**
   * RN-07: Criação de Consulta Padrão (Confirmar Presença)
   * RN-03: Snapshot de Preço
   */
  static async confirmConsultation(
    agendaId: number,
    originalDate: Date,
    realizationDate?: Date,
  ) {
    // RN-01 & RN-02 executados aqui dentro
    const price = await PricingService.calculateSessionPrice(agendaId, originalDate)
    const finalRealizationDate = realizationDate || originalDate

    return await this.upsertConsultation({
      agendaId,
      dataPrevista: originalDate,
      dataRealizacao: finalRealizationDate, // RN-07: data_realizacao = data_prevista ou data reagendada
      valorCobrado: price.toString(), // RN-03: Congelamento
      status: 'realizada',
      cobrarFalta: false,
    })
  }

  /**
   * RN-08: Reagendamento
   */
  static async rescheduleConsultation(
    agendaId: number,
    originalDate: Date,
    newDate: Date,
  ) {
    // Check if consultation exists and is finalized
    const existing = await db.query.consultas.findFirst({
      where: and(
        eq(consultas.agendaId, agendaId),
        eq(consultas.dataPrevista, originalDate),
      ),
    })

    if (
      existing &&
      ['realizada', 'falta', 'cancelada'].includes(existing.status)
    ) {
      throw new Error(
        `Consulta não pode ser reagendada pois está com status: ${existing.status}`,
      )
    }

    const price = await PricingService.calculateSessionPrice(
      agendaId,
      originalDate,
    )

    // Calculate History
    let history: string[] = (existing?.historico as string[]) || []
    if (existing && existing.dataRealizacao) {
      // If moving from a previously rescheduled date, add it to history
      if (existing.dataRealizacao.getTime() !== newDate.getTime()) {
        history.push(existing.dataRealizacao.toISOString())
      }
    }

    return await this.upsertConsultation({
      agendaId,
      dataPrevista: originalDate, // Mantém a referência original do slot
      dataRealizacao: newDate, // A nova data real
      valorCobrado: price.toString(),
      status: 'agendada', // Futuro
      historico: history,
    })
  }

  /**
   * RN-09: Falta (No-Show)
   */
  static async registerNoShow(
    agendaId: number,
    date: Date,
    charge: boolean = false,
  ) {
    const price = await PricingService.calculateSessionPrice(agendaId, date)

    return await this.upsertConsultation({
      agendaId,
      dataPrevista: date,
      dataRealizacao: null, // RN-09
      valorCobrado: price.toString(),
      status: 'falta',
      cobrarFalta: charge,
    })
  }

  /**
   * RN-10: Cancelamento
   */
  static async cancelConsultation(agendaId: number, date: Date) {
    const price = await PricingService.calculateSessionPrice(agendaId, date)

    return await this.upsertConsultation({
      agendaId,
      dataPrevista: date,
      dataRealizacao: null, // RN-10
      valorCobrado: price.toString(),
      status: 'cancelada',
      cobrarFalta: false,
    })
  }
}
