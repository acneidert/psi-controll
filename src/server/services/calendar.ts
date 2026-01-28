import { and, eq, gte, lte, or } from 'drizzle-orm'
import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns'
import { db } from '@/db'
import { agendas, consultas } from '@/db/schema'

type CalendarEvent = {
  date: Date
  originalDate: Date
  newDate?: Date // Para eventos reagendados (fantasma)
  type: 'slot' | 'consultation'
  agendaId: number
  status: string // 'disponivel', 'agendada', 'realizada', etc.
  isFreeable?: boolean // Indicates if a recurring slot is empty due to cancellation/reschedule
  consultationId?: number
  patientId: number
  patientName?: string
  patientEmail?: string
}

export class CalendarService {
  /**
   * RN-04: Geração de Grade de Horários Dinâmica
   */
  static async generateCalendar(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<CalendarEvent>> {
    const events: Array<CalendarEvent> = []

    // Normalizar datas de busca para início do dia
    const startOfPeriod = startOfDay(startDate)
    const endOfPeriod = startOfDay(endDate)

    // 1. Buscar todas as agendas ativas que interceptam o período ou são infinitas
    const activeAgendas = await db.query.agendas.findMany({
      where: and(
        eq(agendas.ativa, true),
      ),
      with: {
        paciente: true,
      },
    })

    // 2. Buscar consultas existentes (exceções) no período
    const existingConsultations = await db.query.consultas.findMany({
      where: or(
        and(
          gte(consultas.dataPrevista, startOfPeriod),
          lte(consultas.dataPrevista, endOfPeriod),
        ),
        and(
          gte(consultas.dataRealizacao, startOfPeriod),
          lte(consultas.dataRealizacao, endOfPeriod),
        ),
      ),
      with: {
        agenda: {
          with: {
            paciente: true,
          },
        },
      },
    })

    const matchedConsultationIds = new Set<number>()

    // 3. Processar cada agenda para gerar os slots
    for (const agenda of activeAgendas) {
      let currentDate = new Date(startOfPeriod)
      const agendaStart = parseISO(agenda.dataInicio)
      const agendaEnd = agenda.dataFim ? parseISO(agenda.dataFim) : null

      // RN-05: Encerramento de Recorrência (Não gerar após dataFim)
      if (agendaEnd && isAfter(startOfPeriod, agendaEnd)) continue

      // Iterar dia a dia do período solicitado para encontrar matches
      while (
        isBefore(currentDate, endOfPeriod) ||
        isSameDay(currentDate, endOfPeriod)
      ) {
        // Verificar validade temporal da agenda
        if (isBefore(currentDate, agendaStart)) {
          currentDate = addDays(currentDate, 1)
          continue
        }
        if (agendaEnd && isAfter(currentDate, agendaEnd)) {
          break
        }

        // Verificar recorrência
        let isMatch = false

        if (agenda.frequencia === 'unica') {
          if (isSameDay(currentDate, agendaStart)) isMatch = true
        } else if (agenda.frequencia === 'semanal') {
          if (getDay(currentDate) === agenda.diaSemana) isMatch = true
        } else if (agenda.frequencia === 'quinzenal') {
          // A cada 2 semanas (14 dias) a partir da data de início
          const diffDays = differenceInCalendarDays(currentDate, agendaStart)
          if (diffDays % 14 === 0) isMatch = true
        } else if (agenda.frequencia === 'mensal') {
          if (currentDate.getDate() === agendaStart.getDate()) isMatch = true
        }

        if (isMatch) {
          // Combinar Data + Hora
          const [hours, minutes] = agenda.hora.split(':').map(Number)
          
          // Fix Timezone Issue: Force -03:00 (Brazil)
          const dateStr = format(currentDate, 'yyyy-MM-dd')
          const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
          const slotDateTime = new Date(`${dateStr}T${timeStr}-03:00`)

          // Verificar se existe consulta (Exceção)
          const consultation = existingConsultations.find(
            (c) =>
              c.agendaId === agenda.id &&
              isSameDay(c.dataPrevista, slotDateTime) &&
              c.dataPrevista.getHours() === slotDateTime.getHours() &&
              c.dataPrevista.getMinutes() === slotDateTime.getMinutes()
          )

          if (consultation) {
            matchedConsultationIds.add(consultation.id)

            const originalTime = consultation.dataPrevista.getTime()
            const realTime = consultation.dataRealizacao
              ? consultation.dataRealizacao.getTime()
              : originalTime

            if (realTime !== originalTime) {
              // Adicionar evento fantasma (Original Riscado)
              events.push({
                date: consultation.dataPrevista,
                originalDate: consultation.dataPrevista,
                newDate: consultation.dataRealizacao!,
                type: 'consultation',
                agendaId: agenda.id,
                status: 'reagendado-origem',
                isFreeable: true, // Mark as freeable because it was moved
                consultationId: consultation.id,
                patientId: agenda.pacienteId,
                patientName: agenda.paciente.nomeCompleto,
                patientEmail: agenda?.paciente?.email || '',
              })

              // Adicionar eventos fantasmas do histórico
              if (
                consultation.historico &&
                Array.isArray(consultation.historico)
              ) {
                for (const histDateStr of consultation.historico) {
                  const histDate = new Date(histDateStr)
                  events.push({
                    date: histDate,
                    originalDate: consultation.dataPrevista,
                    newDate: consultation.dataRealizacao!,
                    type: 'consultation',
                    agendaId: agenda.id,
                    status: 'reagendado-origem',
                    consultationId: consultation.id,
                    patientId: agenda.pacienteId,
                    patientName: agenda.paciente.nomeCompleto,
                    patientEmail: agenda?.paciente?.email || '',
                  })
                }
              }

              // Adicionar evento real (Novo Horário)
              events.push({
                date: consultation.dataRealizacao!,
                originalDate: consultation.dataPrevista,
                type: 'consultation',
                agendaId: agenda.id,
                status: consultation.status || 'agendada',
                consultationId: consultation.id,
                patientId: agenda.pacienteId,
                patientName: agenda.paciente.nomeCompleto,
                patientEmail: agenda?.paciente?.email || '',
              })
            } else {
              // Slot Ocupado
              events.push({
                date: consultation.dataRealizacao || consultation.dataPrevista,
                originalDate: consultation.dataPrevista,
                type: 'consultation',
                agendaId: agenda.id,
                status: consultation.status || 'agendada',
                isFreeable: consultation.status === 'cancelada', // Mark as freeable if cancelled
                consultationId: consultation.id,
                patientId: agenda.pacienteId,
                patientName: agenda.paciente.nomeCompleto,
                patientEmail: agenda?.paciente?.email || '',
              })
            }
          } else {
            // Slot Padrão Disponível
            events.push({
              date: slotDateTime,
              originalDate: slotDateTime,
              type: 'slot',
              agendaId: agenda.id,
              status: 'disponivel',
              patientId: agenda.pacienteId,
              patientName: agenda.paciente.nomeCompleto,
              patientEmail: agenda?.paciente?.email || '',
            })
          }
        }

        currentDate = addDays(currentDate, 1)
      }
    }

    // 4. Adicionar consultas avulsas ou reagendadas
    for (const c of existingConsultations) {
      if (!matchedConsultationIds.has(c.id)) {
        events.push({
          date: c.dataRealizacao || c.dataPrevista,
          originalDate: c.dataPrevista,
          type: 'consultation',
          agendaId: c.agendaId,
          status: c.status || 'agendada',
          consultationId: c.id,
          patientId: c.agenda.pacienteId,
          patientName: c.agenda.paciente.nomeCompleto,
          patientEmail: c.agenda?.paciente?.email || '',
        })
      }
    }

    return events
  }
}
