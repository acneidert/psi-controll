import { and, eq, gte, lte, or } from 'drizzle-orm'
import { addDays, getDay, isAfter, isBefore, isSameDay } from 'date-fns'
import { db } from '@/db'
import { agendas, consultas } from '@/db/schema'

type CalendarEvent = {
  date: Date
  originalDate: Date
  newDate?: Date // Para eventos reagendados (fantasma)
  type: 'slot' | 'consultation'
  agendaId: number
  status: string // 'disponivel', 'agendada', 'realizada', etc.
  consultationId?: number
  patientId: number
  patientName?: string
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

    // 1. Buscar todas as agendas ativas que interceptam o período ou são infinitas
    const activeAgendas = await db.query.agendas.findMany({
      where: and(
        eq(agendas.ativa, true),
        // Idealmente filtrar por datas aqui também para otimizar, mas a lógica de recorrência é complexa para SQL puro
      ),
      with: {
        paciente: true,
      },
    })

    // 2. Buscar consultas existentes (exceções) no período
    const existingConsultations = await db.query.consultas.findMany({
      where: or(
        and(
          gte(consultas.dataPrevista, startDate),
          lte(consultas.dataPrevista, endDate),
        ),
        and(
          gte(consultas.dataRealizacao, startDate),
          lte(consultas.dataRealizacao, endDate),
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
      let currentDate = new Date(startDate)
      const agendaStart = new Date(agenda.dataInicio)
      const agendaEnd = agenda.dataFim ? new Date(agenda.dataFim) : null

      // RN-05: Encerramento de Recorrência (Não gerar após dataFim)
      // Se o período solicitado começa depois do fim da agenda, pula
      if (agendaEnd && isAfter(startDate, agendaEnd)) continue

      // Iterar dia a dia do período solicitado para encontrar matches
      while (
        isBefore(currentDate, endDate) ||
        isSameDay(currentDate, endDate)
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
          // agenda.diaSemana: 0=Dom, 6=Sab
          // getDay(currentDate): 0=Dom, 6=Sab
          if (getDay(currentDate) === agenda.diaSemana) isMatch = true
        } else if (agenda.frequencia === 'quinzenal') {
          // Lógica simplificada: a cada 2 semanas a partir da data de início
          // Diferença em dias % 14 == 0
          const diffTime = Math.abs(
            currentDate.getTime() - agendaStart.getTime(),
          )
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays % 14 === 0) isMatch = true
        } else if (agenda.frequencia === 'mensal') {
          if (currentDate.getDate() === agendaStart.getDate()) isMatch = true
        }

        if (isMatch) {
          // Combinar Data + Hora
          // agenda.hora é string "HH:MM:SS"
          const [hours, minutes] = agenda.hora.split(':').map(Number)
          const slotDateTime = new Date(currentDate)
          slotDateTime.setHours(hours, minutes, 0, 0)

          // Verificar se existe consulta (Exceção)
          const consultation = existingConsultations.find(
            (c) =>
              c.agendaId === agenda.id &&
              c.dataPrevista.getTime() === slotDateTime.getTime(),
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
                newDate: consultation.dataRealizacao!, // Informar para onde foi
                type: 'consultation',
                agendaId: agenda.id,
                status: 'reagendado-origem',
                consultationId: consultation.id,
                patientId: agenda.pacienteId,
                patientName: agenda.paciente.nomeCompleto,
              })

              // Adicionar eventos fantasmas do histórico (Reagendamentos intermediários)
              if (
                consultation.historico &&
                Array.isArray(consultation.historico)
              ) {
                for (const histDateStr of consultation.historico) {
                  const histDate = new Date(histDateStr)
                  events.push({
                    date: histDate,
                    originalDate: consultation.dataPrevista,
                    newDate: consultation.dataRealizacao!, // Aponta para o atual
                    type: 'consultation',
                    agendaId: agenda.id,
                    status: 'reagendado-origem',
                    consultationId: consultation.id,
                    patientId: agenda.pacienteId,
                    patientName: agenda.paciente.nomeCompleto,
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
              })
            } else {
              // Slot Ocupado (Sem mudança de horário ou cancelado/realizado no mesmo horário)
              events.push({
                date: consultation.dataRealizacao || consultation.dataPrevista,
                originalDate: consultation.dataPrevista,
                type: 'consultation',
                agendaId: agenda.id,
                status: consultation.status || 'agendada',
                consultationId: consultation.id,
                patientId: agenda.pacienteId,
                patientName: agenda.paciente.nomeCompleto,
              })
            }
          } else {
            // Slot Padrão Disponível (Virtual)
            events.push({
              date: slotDateTime,
              originalDate: slotDateTime,
              type: 'slot',
              agendaId: agenda.id,
              status: 'disponivel', // Representa o "Padrão" da agenda
              patientId: agenda.pacienteId,
              patientName: agenda.paciente.nomeCompleto,
            })
          }
        }

        currentDate = addDays(currentDate, 1)
      }
    }

    // 4. Adicionar consultas que não foram "casadas" com slots virtuais
    // (Ex: Reagendadas para este período vindo de fora, ou agendas canceladas que mantiveram histórico)
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
        })
      }
    }

    return events
  }
}
