import { desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { agendas, anamnese, pacientes } from '@/db/schema'

export class PatientService {
  static async listPatients(search?: string) {
    try {
      const query = db.select().from(pacientes)

      if (search) {
        const searchLower = `%${search.toLowerCase()}%`
        // @ts-ignore - like can handle generic sql expressions if needed but here simple strings
        return await db
          .select()
          .from(pacientes)
          .where(
            or(
              like(sql`lower(${pacientes.nomeCompleto})`, searchLower),
              like(pacientes.cpf, searchLower),
              like(pacientes.telefone, searchLower),
            ),
          )
          .orderBy(desc(pacientes.dataCadastro))
      }

      return await query.orderBy(desc(pacientes.dataCadastro))
    } catch (error) {
      console.error('Error listing patients:', error)
      throw new Error('Failed to list patients')
    }
  }

  static async getPatientById(id: number) {
    try {
      const [patient] = await db
        .select()
        .from(pacientes)
        .where(eq(pacientes.id, id))
      return patient
    } catch (error) {
      console.error('Error fetching patient:', error)
      throw new Error('Failed to fetch patient')
    }
  }

  static async createPatient(data: {
    nomeCompleto: string
    cpf?: string
    telefone: string
    email?: string
    dataNascimento?: string
    endereco?: string
    contatoEmergencia?: string
    telefoneEmergencia?: string
    profissao?: string
    estadoCivil?: string
    genero?: string
    observacoes?: string
  }) {
    try {
      if (data.cpf) {
        const existing = await db.query.pacientes.findFirst({
          where: eq(pacientes.cpf, data.cpf),
        })
        if (existing) {
          throw new Error('CPF já cadastrado.')
        }
      }

      const [newPatient] = await db.insert(pacientes).values(data).returning()
      return newPatient
    } catch (error: any) {
      console.error('Error creating patient:', error)
      throw new Error(error.message || 'Failed to create patient')
    }
  }

  static async updatePatient(
    id: number,
    data: {
      nomeCompleto?: string
      cpf?: string
      telefone?: string
      email?: string
      dataNascimento?: string
      endereco?: string
      contatoEmergencia?: string
      telefoneEmergencia?: string
      profissao?: string
      estadoCivil?: string
      genero?: string
      observacoes?: string
    },
  ) {
    try {
      if (data.cpf) {
        const existing = await db.query.pacientes.findFirst({
          where: eq(pacientes.cpf, data.cpf),
        })
        if (existing && existing.id !== id) {
          throw new Error('CPF já cadastrado para outro paciente.')
        }
      }

      const [updated] = await db
        .update(pacientes)
        .set(data)
        .where(eq(pacientes.id, id))
        .returning()

      return updated
    } catch (error: any) {
      console.error('Error updating patient:', error)
      throw new Error(error.message || 'Failed to update patient')
    }
  }

  static async deletePatient(id: number) {
    try {
      // Check for clinical links (agendas, anamnese)
      const agendaCount = await db.$count(agendas, eq(agendas.pacienteId, id))
      const anamneseCount = await db.$count(
        anamnese,
        eq(anamnese.pacienteId, id),
      )

      if (agendaCount > 0 || anamneseCount > 0) {
        throw new Error(
          'Não é possível excluir paciente com vínculos clínicos (agendas ou prontuários).',
        )
      }

      const [deleted] = await db
        .delete(pacientes)
        .where(eq(pacientes.id, id))
        .returning()
      return deleted
    } catch (error: any) {
      console.error('Error deleting patient:', error)
      throw new Error(error.message || 'Failed to delete patient')
    }
  }
}
