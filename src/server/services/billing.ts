import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { consultas, faturaItens, faturas, pagamentos } from '@/db/schema'

export class BillingService {
  /**
   * RN-11 & RN-12: Criar Fatura
   */
  static async createInvoice(
    patientId: number,
    consultationIds: Array<number>,
  ) {
    // 1. Validar Elegibilidade (RN-11)
    const validConsultations = await db.query.consultas.findMany({
      where: inArray(consultas.id, consultationIds),
    })

    const eligibleConsultations = validConsultations.filter(
      (c) =>
        c.status === 'realizada' || (c.status === 'falta' && c.cobrarFalta),
    )

    if (eligibleConsultations.length !== consultationIds.length) {
      throw new Error('Some consultations are not eligible for billing')
    }

    // RN-13: Validar se já estão faturadas
    // (Isso geraria erro de constraint no banco, mas podemos checar antes)

    // 2. Calcular Total (RN-12)
    const totalAmount = eligibleConsultations.reduce(
      (acc, curr) => acc + Number(curr.valorCobrado),
      0,
    )

    // 3. Criar Fatura e Itens Transacionalmente
    return await db.transaction(async (tx) => {
      const [newInvoice] = await tx
        .insert(faturas)
        .values({
          pacienteId: patientId,
          dataEmissao: new Date().toISOString(), // Hoje
          valorTotal: totalAmount.toString(),
          status: 'aberta',
          observacoes: `Fatura gerada para ${eligibleConsultations.length} atendimentos.`,
        })
        .returning()

      for (const consultation of eligibleConsultations) {
        await tx.insert(faturaItens).values({
          faturaId: newInvoice.id,
          consultaId: consultation.id,
          valorItem: consultation.valorCobrado, // RN-12 (Padrão igual ao cobrado)
        })
      }

      return newInvoice
    })
  }

  /**
   * RN-14: Registrar Pagamento e Baixar Fatura
   */
  static async registerPayment(
    faturaId: number,
    amount: number,
    method: string,
  ) {
    return await db.transaction(async (tx) => {
      // 1. Registrar Pagamento
      await tx.insert(pagamentos).values({
        faturaId,
        dataPagamento: new Date().toISOString(),
        valorPago: amount.toString(),
        formaPagamento: method,
      })

      // 2. Verificar se quita a fatura
      const invoice = await tx.query.faturas.findFirst({
        where: eq(faturas.id, faturaId),
        with: {
          pagamentos: true,
        },
      })

      if (!invoice) throw new Error('Invoice not found')

      // Re-query ou somar manual (assumindo isolamento padrão read committed pode não ver o insert da própria tx em alguns dbs sem refresh, mas no Postgres na mesma Tx vê)
      // Vamos simplificar:
      const allPayments = await tx.query.pagamentos.findMany({
        where: eq(pagamentos.faturaId, faturaId),
      })
      const realTotalPaid = allPayments.reduce(
        (acc, p) => acc + Number(p.valorPago),
        0,
      )

      if (realTotalPaid >= Number(invoice.valorTotal)) {
        await tx
          .update(faturas)
          .set({ status: 'paga' })
          .where(eq(faturas.id, faturaId))
      }
    })
  }
}
