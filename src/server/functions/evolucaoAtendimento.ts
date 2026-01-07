import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { EvolucaoAtendimentoService } from '../services/evolucaoAtendimento'

export const listEvolucaoAtendimentoFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ pacienteId: z.number() }))
  .handler(async ({ data }) => {
    return await EvolucaoAtendimentoService.listByPacienteId(data.pacienteId)
  })

export const createEvolucaoAtendimentoFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      pacienteId: z.number(),
      dataAtendimento: z.string(),
      procedimentosUtilizados: z.string().min(1, 'Campo obrigatório'),
      intervencoesRealizadas: z.string().min(1, 'Campo obrigatório'),
      informacoesRelevantes: z.string().min(1, 'Campo obrigatório'),
    }),
  )
  .handler(async ({ data }) => {
    return await EvolucaoAtendimentoService.create({
      pacienteId: data.pacienteId,
      dataAtendimento: new Date(data.dataAtendimento),
      procedimentosUtilizados: data.procedimentosUtilizados,
      intervencoesRealizadas: data.intervencoesRealizadas,
      informacoesRelevantes: data.informacoesRelevantes,
    })
  })
