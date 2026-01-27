import { desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { agendas, anamnese, pacientes, responsaveis } from '@/db/schema'

export class PatientService {
  static async listPatients(search?: string) {
    try {
      if (search) {
        const searchLower = `%${search.toLowerCase()}%`
        return await db.query.pacientes.findMany({
          where: or(
            like(sql`lower(${pacientes.nomeCompleto})`, searchLower),
            like(pacientes.cpf, searchLower),
            like(pacientes.telefone, searchLower),
          ),
          with: {
            responsaveis: true,
          },
          orderBy: [desc(pacientes.dataCadastro)],
        })
      }

      return await db.query.pacientes.findMany({
        with: {
          responsaveis: true,
        },
        orderBy: [desc(pacientes.dataCadastro)],
      })
    } catch (error) {
      console.error('Error listing patients:', error)
      throw new Error('Failed to list patients')
    }
  }

  static async getPatientById(id: number) {
    try {
      const patient = await db.query.pacientes.findFirst({
        where: eq(pacientes.id, id),
        with: {
          responsaveis: true,
        },
      })
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
    responsaveis?: Array<{
      nome: string
      cpf?: string
      telefone?: string
      email?: string
      endereco?: string
      financeiro?: boolean
    }>
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

      return await db.transaction(async (tx) => {
        const { responsaveis: responsaveisList, ...patientData } = data
        const [newPatient] = await tx
          .insert(pacientes)
          .values(patientData)
          .returning()

        if (responsaveisList && responsaveisList.length > 0) {
          await tx.insert(responsaveis).values(
            responsaveisList.map((r) => ({
              ...r,
              pacienteId: newPatient.id,
            })),
          )
        }

        return newPatient
      })
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
      responsaveis?: Array<{
        nome: string
        cpf?: string
        telefone?: string
        email?: string
        endereco?: string
        financeiro?: boolean
      }>
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

      return await db.transaction(async (tx) => {
        const { responsaveis: responsaveisList, ...patientData } = data

        const [updated] = await tx
          .update(pacientes)
          .set(patientData)
          .where(eq(pacientes.id, id))
          .returning()

        if (responsaveisList) {
          // Replace all responsaveis
          await tx
            .delete(responsaveis)
            .where(eq(responsaveis.pacienteId, id))

          if (responsaveisList.length > 0) {
            await tx.insert(responsaveis).values(
              responsaveisList.map((r) => ({
                ...r,
                pacienteId: id,
              })),
            )
          }
        }

        return updated
      })
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
