import { createServerFn } from '@tanstack/react-start'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { observacoes, consultas } from '@/db/schema'

export const getObservacaoFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    try {
      const observacao = await db.select().from(observacoes)
        .where(eq(observacoes.id, data.id))
        .limit(1)
      
      return observacao[0] || null
    } catch (error) {
      console.error('Erro ao buscar observação:', error)
      throw new Error('Erro ao buscar observação')
    }
  })

export const saveObservacaoFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { pacienteId: number; sessaoId?: number; texto: string }) => data)
  .handler(async ({ data }: { data: { pacienteId: number; sessaoId?: number; texto: string } }) => {
    try {
      const created = await db.insert(observacoes)
        .values({
          pacienteId: data.pacienteId,
          sessaoId: data.sessaoId || null,
          texto: data.texto,
          dataCriacao: new Date(),
          dataAtualizacao: new Date(),
        })
        .returning()
      
      return created[0]
    } catch (error) {
      console.error('Erro ao salvar observação:', error)
      throw new Error('Erro ao salvar observação')
    }
  })

export const listObservacoesByPatientFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { pacienteId: number }) => data)
  .handler(async ({ data }: { data: { pacienteId: number } }) => {
    try {
      const observacoesList = await db.select({
        id: observacoes.id,
        pacienteId: observacoes.pacienteId,
        sessaoId: observacoes.sessaoId,
        texto: observacoes.texto,
        dataCriacao: observacoes.dataCriacao,
        dataAtualizacao: observacoes.dataAtualizacao,
        sessaoData: consultas.dataPrevista,
      }).from(observacoes)
        .leftJoin(consultas, eq(observacoes.sessaoId, consultas.id))
        .where(eq(observacoes.pacienteId, data.pacienteId))
        .orderBy(desc(observacoes.dataCriacao))
      
      return observacoesList
    } catch (error) {
      console.error('Erro ao listar observações:', error)
      throw new Error('Erro ao listar observações')
    }
  })

export const updateObservacaoFn = createServerFn({ method: 'PUT' })
  .inputValidator((data: { id: number; texto: string }) => data)
  .handler(async ({ data }: { data: { id: number; texto: string } }) => {
    try {
      const updated = await db.update(observacoes)
        .set({ 
          texto: data.texto,
          dataAtualizacao: new Date()
        })
        .where(eq(observacoes.id, data.id))
        .returning()
      
      return updated[0]
    } catch (error) {
      console.error('Erro ao atualizar observação:', error)
      throw new Error('Erro ao atualizar observação')
    }
  })

export const deleteObservacaoFn = createServerFn({ method: 'DELETE' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    try {
      await db.delete(observacoes)
        .where(eq(observacoes.id, data.id))
      
      return { success: true }
    } catch (error) {
      console.error('Erro ao deletar observação:', error)
      throw new Error('Erro ao deletar observação')
    }
  })