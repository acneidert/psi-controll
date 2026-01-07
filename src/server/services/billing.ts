import { db } from '@/db'
import {
  faturas,
  faturaItens,
  consultas,
  agendas,
  configuracoes,
  pacientes,
  pagamentos,
} from '@/db/schema'
import { eq, and, inArray, notExists, desc, sql } from 'drizzle-orm'

export class BillingService {
  static async getInvoice(invoiceId: number) {
    const invoice = await db.query.faturas.findFirst({
      where: eq(faturas.id, invoiceId),
      with: {
        paciente: {
          with: {
            responsaveis: true,
          },
        },
        itens: {
          with: {
            consulta: true,
          },
        },
        pagamentos: true,
      },
    })

    if (!invoice) return null

    // Get config (assuming id 1)
    const [config] = await db.select().from(configuracoes).limit(1)

    return {
      ...invoice,
      config,
    }
  }

  static async getAllPendingConsultations() {
    return await db
      .select({
        id: consultas.id,
        data: consultas.dataPrevista,
        valor: consultas.valorCobrado,
        status: consultas.status,
        patientId: pacientes.id,
        patientName: pacientes.nomeCompleto,
      })
      .from(consultas)
      .innerJoin(agendas, eq(consultas.agendaId, agendas.id))
      .innerJoin(pacientes, eq(agendas.pacienteId, pacientes.id))
      .where(
        and(
          sql`(${consultas.status} = 'realizada' OR (${consultas.status} = 'falta' AND ${consultas.cobrarFalta} = true))`,
          notExists(
            db
              .select()
              .from(faturaItens)
              .where(eq(faturaItens.consultaId, consultas.id))
          )
        )
      )
      .orderBy(pacientes.nomeCompleto, desc(consultas.dataPrevista))
  }

  static async getPendingConsultations(patientId: number) {
    // Consultas realizadas ou faltas cobráveis que não estão em nenhuma fatura
    const pendingConsultations = await db
      .select({
        id: consultas.id,
        data: consultas.dataPrevista,
        valor: consultas.valorCobrado,
        status: consultas.status,
      })
      .from(consultas)
      .innerJoin(agendas, eq(consultas.agendaId, agendas.id))
      .where(
        and(
          eq(agendas.pacienteId, patientId),
          sql`(${consultas.status} = 'realizada' OR (${consultas.status} = 'falta' AND ${consultas.cobrarFalta} = true))`,
          notExists(
            db
              .select()
              .from(faturaItens)
              .where(eq(faturaItens.consultaId, consultas.id))
          )
        )
      )
      .orderBy(desc(consultas.dataPrevista))

    return pendingConsultations
  }

  static async createInvoice({
    patientId,
    consultationIds,
    dueDate,
    discount = 0,
    observations,
  }: {
    patientId: number
    consultationIds: number[]
    dueDate: Date
    discount?: number
    observations?: string
  }) {
    return await db.transaction(async (tx) => {
      // 1. Buscar consultas para validar e somar valores
      const selectedConsultations = await tx
        .select()
        .from(consultas)
        .where(inArray(consultas.id, consultationIds))

      if (selectedConsultations.length !== consultationIds.length) {
        throw new Error('Algumas consultas não foram encontradas.')
      }

      // Validar se já estão faturadas
      const existingItems = await tx
        .select()
        .from(faturaItens)
        .where(inArray(faturaItens.consultaId, consultationIds))
      
      if (existingItems.length > 0) {
        throw new Error('Algumas consultas já foram faturadas.')
      }

      // 2. Calcular total
      const subtotal = selectedConsultations.reduce(
        (sum, c) => sum + Number(c.valorCobrado),
        0
      )
      const total = Math.max(0, subtotal - discount)

      // 3. Criar Fatura
      const [newInvoice] = await tx
        .insert(faturas)
        .values({
          pacienteId: patientId,
          dataEmissao: new Date().toISOString().split('T')[0], // Hoje
          dataVencimento: dueDate.toISOString().split('T')[0],
          valorTotal: total.toString(),
          desconto: discount.toString(),
          status: 'aberta',
          observacoes: observations,
        })
        .returning()

      // 4. Criar Itens da Fatura
      await tx.insert(faturaItens).values(
        selectedConsultations.map((c) => ({
          faturaId: newInvoice.id,
          consultaId: c.id,
          valorItem: c.valorCobrado,
        }))
      )

      return newInvoice
    })
  }

  static async getInvoices(patientId: number) {
    return await db.query.faturas.findMany({
      where: eq(faturas.pacienteId, patientId),
      with: {
        itens: {
          with: {
            consulta: true,
          },
        },
      },
      orderBy: [desc(faturas.dataEmissao)],
    })
  }

  static async getAllOpenInvoices() {
    return await db.query.faturas.findMany({
      where: eq(faturas.status, 'aberta'),
      with: {
        paciente: true,
        itens: {
          with: {
            consulta: true,
          },
        },
      },
      orderBy: [desc(faturas.dataVencimento)],
    })
  }

  static async getPaidInvoices({ page = 1, limit = 10 }: { page?: number; limit?: number }) {
    const offset = (page - 1) * limit
    const whereClause = eq(faturas.status, 'paga')

    const items = await db.query.faturas.findMany({
      where: whereClause,
      with: {
        paciente: true,
        pagamentos: true,
      },
      orderBy: [desc(faturas.dataVencimento)],
      limit,
      offset,
    })

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(faturas)
      .where(whereClause)

    const total = Number(countResult.count)
    const totalPages = Math.ceil(total / limit)

    return {
      data: items,
      total,
      page,
      totalPages,
    }
  }

  static async payInvoice({
    invoiceId,
    amount,
    date,
    method,
    notes,
  }: {
    invoiceId: number
    amount: number
    date: Date
    method: string
    notes?: string
  }) {
    return await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(faturas)
        .where(eq(faturas.id, invoiceId))

      if (!invoice) throw new Error('Fatura não encontrada')
      if (invoice.status === 'paga') throw new Error('Fatura já paga')

      await tx.insert(pagamentos).values({
        faturaId: invoiceId,
        dataPagamento: date.toISOString().split('T')[0],
        valorPago: amount.toString(),
        formaPagamento: method,
        observacoes: notes,
      })

      await tx
        .update(faturas)
        .set({ status: 'paga' })
        .where(eq(faturas.id, invoiceId))
    })
  }
}
