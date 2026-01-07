import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { AgendaService } from '../services/agenda'

// Input Schemas
const CreateAgendaSchema = z.object({
  pacienteId: z.number(),
  diaSemana: z.number().optional(),
  hora: z.string(),
  frequencia: z.enum(['unica', 'semanal', 'quinzenal', 'mensal']),
  dataInicio: z.string(),
  dataFim: z.string().optional().nullable(),
  valorFixo: z.string().optional().nullable(),
  categoriaPrecoId: z.number().optional().nullable(),
  observacoes: z.string().optional(),
})

const UpdateAgendaSchema = z.object({
  id: z.number(),
  data: CreateAgendaSchema.partial(),
})

export const listAgendasFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return await AgendaService.listAgendas()
  },
)

export const createAgendaFn = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof CreateAgendaSchema>) => data)
  .handler(async ({ data }: { data: z.infer<typeof CreateAgendaSchema> }) => {
    return await AgendaService.createAgenda(data)
  })

export const updateAgendaFn = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof UpdateAgendaSchema>) => data)
  .handler(async ({ data }: { data: z.infer<typeof UpdateAgendaSchema> }) => {
    return await AgendaService.updateAgenda(data.id, data.data)
  })

export const terminateAgendaFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; endDate: string }) => data)
  .handler(async ({ data }: { data: { id: number; endDate: string } }) => {
    return await AgendaService.terminateAgenda(data.id, data.endDate)
  })

export const deleteAgendaFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    return await AgendaService.deleteAgenda(data.id)
  })
