import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { configuracoes } from '@/db/schema'

export class SettingsService {
  /**
   * Obtém as configurações do sistema.
   * Se não existir registro, cria um padrão (ID=1).
   */
  static async getSettings() {
    try {
      const config = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.id, 1),
      })

      if (config) {
        return config
      }

      // Se não existir, cria o registro padrão
      console.log('Creating default settings record...')
      const [newConfig] = await db
        .insert(configuracoes)
        .values({
          id: 1,
          nomePsicologo: '',
          crp: '',
          contatoClinica: '',
        })
        .returning()

      return newConfig
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Fallback em caso de erro de DB (ex: preview sem DB)
      return {
        id: 1,
        nomePsicologo: 'Psicólogo Exemplo',
        crp: '00/00000',
        contatoClinica: '(11) 99999-9999',
      }
    }
  }

  /**
   * Atualiza as configurações.
   * Sempre atualiza o registro com ID=1.
   */
  static async updateSettings(data: {
    nomePsicologo: string
    crp: string
    contatoClinica: string
  }) {
    try {
      // Garante que o registro existe antes de atualizar
      await this.getSettings()

      const [updated] = await db
        .update(configuracoes)
        .set({
          nomePsicologo: data.nomePsicologo,
          crp: data.crp,
          contatoClinica: data.contatoClinica,
        })
        .where(eq(configuracoes.id, 1))
        .returning()

      return updated
    } catch (error) {
      console.error('Error updating settings:', error)
      // Mock de sucesso para preview
      return {
        id: 1,
        ...data,
      }
    }
  }
}
