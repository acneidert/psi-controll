import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { evolucaoAtendimento } from '@/db/schema'

export class EvolucaoAtendimentoService {
  static async listByPacienteId(pacienteId: number) {
    return await db.query.evolucaoAtendimento.findMany({
      where: eq(evolucaoAtendimento.prontuarioId, pacienteId),
      orderBy: [desc(evolucaoAtendimento.dataAtendimento)],
    })
  }

  static async create(data: {
    pacienteId: number
    dataAtendimento: Date
    procedimentosUtilizados: string
    intervencoesRealizadas: string
    informacoesRelevantes: string
  }) {
    const [created] = await db
      .insert(evolucaoAtendimento)
      .values({
        prontuarioId: data.pacienteId,
        dataAtendimento: data.dataAtendimento,
        procedimentosUtilizados: data.procedimentosUtilizados,
        intervencoesRealizadas: data.intervencoesRealizadas,
        informacoesRelevantes: data.informacoesRelevantes,
      })
      .returning()

    return created
  }
}
