import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { AnamneseService } from '../services/anamnese'

const anamneseSchema = z.object({
  pacienteId: z.number(),
  queixaPrincipal: z.string().optional(),
  historicoMedico: z.string().optional(),
  medicamentos: z.string().optional(),
})

export const getAnamneseFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ pacienteId: z.number() }))
  .handler(async ({ data }) => {
    return await AnamneseService.getLatestByPatientId(data.pacienteId)
  })

export const saveAnamneseFn = createServerFn({ method: 'POST' })
  .inputValidator(anamneseSchema)
  .handler(async ({ data }) => {
    return await AnamneseService.createOrUpdate(data)
  })
