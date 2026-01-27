import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { evolucaoMensal } from '@/db/schema'

export const getEvolucaoMensalFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { pacienteId: number; mes: number; ano: number }) => data)
  .handler(async ({ data }: { data: { pacienteId: number; mes: number; ano: number } }) => {
    try {
      const evolucao = await db.select().from(evolucaoMensal)
        .where(and(
          eq(evolucaoMensal.pacienteId, data.pacienteId),
          eq(evolucaoMensal.mes, data.mes),
          eq(evolucaoMensal.ano, data.ano)
        ))
        .limit(1)
      
      return evolucao[0] || null
    } catch (error) {
      console.error('Erro ao buscar evolução mensal:', error)
      throw new Error('Erro ao buscar evolução mensal')
    }
  })

export const saveEvolucaoMensalFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { pacienteId: number; mes: number; ano: number; texto: string }) => data)
  .handler(async ({ data }: { data: { pacienteId: number; mes: number; ano: number; texto: string } }) => {
    try {
      // Verificar se já existe evolução para este mês
      const existing = await db.select().from(evolucaoMensal)
        .where(and(
          eq(evolucaoMensal.pacienteId, data.pacienteId),
          eq(evolucaoMensal.mes, data.mes),
          eq(evolucaoMensal.ano, data.ano)
        ))
        .limit(1)

      if (existing[0]) {
        // Atualizar existente
        const updated = await db.update(evolucaoMensal)
          .set({ 
            texto: data.texto,
            dataAtualizacao: new Date()
          })
          .where(eq(evolucaoMensal.id, existing[0].id))
          .returning()
        
        return updated[0]
      } else {
        // Criar novo
        const created = await db.insert(evolucaoMensal)
          .values({
            pacienteId: data.pacienteId,
            mes: data.mes,
            ano: data.ano,
            texto: data.texto,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
          })
          .returning()
        
        return created[0]
      }
    } catch (error) {
      console.error('Erro ao salvar evolução mensal:', error)
      throw new Error('Erro ao salvar evolução mensal')
    }
  })

export const listEvolucaoMensalFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { pacienteId: number }) => data)
  .handler(async ({ data }: { data: { pacienteId: number } }) => {
    try {
      const evolucoes = await db.select().from(evolucaoMensal)
        .where(eq(evolucaoMensal.pacienteId, data.pacienteId))
        .orderBy(evolucaoMensal.ano, evolucaoMensal.mes)
      
      // Re-sort in JS to be safe or use proper descending order syntax if needed
      // .orderBy(desc(evolucaoMensal.ano), desc(evolucaoMensal.mes))
      // But keeping it simple first. The original code was:
      // .orderBy((table) => [table.ano, table.mes], 'desc')
      
      return evolucoes.sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano
        return b.mes - a.mes
      })
    } catch (error) {
      console.error('Erro ao listar evoluções mensais:', error)
      throw new Error('Erro ao listar evoluções mensais')
    }
  })