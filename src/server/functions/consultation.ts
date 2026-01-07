import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ConsultationService } from '../services/consultation'

const ConfirmSchema = z.object({
  agendaId: z.number(),
  date: z.string(), // ISO string (Original Date)
  realizationDate: z.string().optional(), // ISO string (Realization Date)
})

const RescheduleSchema = z.object({
  agendaId: z.number(),
  originalDate: z.string(),
  newDate: z.string(),
})

const NoShowSchema = z.object({
  agendaId: z.number(),
  date: z.string(),
  charge: z.boolean().optional(),
})

const CancelSchema = z.object({
  agendaId: z.number(),
  date: z.string(),
})

export const confirmConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof ConfirmSchema>) => data)
  .handler(async ({ data }: { data: z.infer<typeof ConfirmSchema> }) => {
    return await ConsultationService.confirmConsultation(
      data.agendaId,
      new Date(data.date),
      data.realizationDate ? new Date(data.realizationDate) : undefined,
    )
  })

export const rescheduleConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof RescheduleSchema>) => data)
  .handler(async ({ data }: { data: z.infer<typeof RescheduleSchema> }) => {
    return await ConsultationService.rescheduleConsultation(
      data.agendaId,
      new Date(data.originalDate),
      new Date(data.newDate),
    )
  })

export const registerNoShowFn = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof NoShowSchema>) => data)
  .handler(async ({ data }: { data: z.infer<typeof NoShowSchema> }) => {
    return await ConsultationService.registerNoShow(
      data.agendaId,
      new Date(data.date),
      data.charge,
    )
  })

export const cancelConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof CancelSchema>) => data)
  .handler(async ({ data }: { data: z.infer<typeof CancelSchema> }) => {
    return await ConsultationService.cancelConsultation(
      data.agendaId,
      new Date(data.date),
    )
  })
