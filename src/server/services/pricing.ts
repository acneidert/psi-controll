import { and, desc, eq, gt, gte, isNull, lte, or } from 'drizzle-orm'
import { db } from '@/db'
import { agendas, categoriasPreco, valoresPreco } from '@/db/schema'

export class PricingService {
  // Categories
  static async listCategories() {
    return await db
      .select()
      .from(categoriasPreco)
      .where(eq(categoriasPreco.ativo, true))
  }

  static async createCategory(data: { nome: string; descricao?: string }) {
    const [category] = await db.insert(categoriasPreco).values(data).returning()
    return category
  }

  static async updateCategory(
    id: number,
    data: { nome?: string; descricao?: string; ativo?: boolean },
  ) {
    const [updated] = await db
      .update(categoriasPreco)
      .set(data)
      .where(eq(categoriasPreco.id, id))
      .returning()
    return updated
  }

  // Prices
  static async getPriceHistory(categoriaId: number) {
    return await db
      .select()
      .from(valoresPreco)
      .where(eq(valoresPreco.categoriaId, categoriaId))
      .orderBy(desc(valoresPreco.dataInicio))
  }

  static async getCurrentPrice(categoriaId: number) {
    const now = new Date().toISOString().split('T')[0]
    const [price] = await db
      .select()
      .from(valoresPreco)
      .where(
        and(
          eq(valoresPreco.categoriaId, categoriaId),
          lte(valoresPreco.dataInicio, now),
          or(isNull(valoresPreco.dataFim), gte(valoresPreco.dataFim, now)),
        ),
      )
      .orderBy(desc(valoresPreco.dataInicio))
      .limit(1)
    return price
  }

  static async addPrice(
    categoriaId: number,
    valor: number,
    dataInicio: string,
  ) {
    // Find the most recent open-ended price
    const currentLatestList = await db
      .select()
      .from(valoresPreco)
      .where(
        and(
          eq(valoresPreco.categoriaId, categoriaId),
          isNull(valoresPreco.dataFim),
        ),
      )

    if (currentLatestList.length > 0) {
      const currentLatest = currentLatestList[0]
      // Calculate end date for the previous price (day before new start date)
      const newDate = new Date(dataInicio)
      const endDate = new Date(newDate)
      endDate.setDate(endDate.getDate() - 1)
      const dataFim = endDate.toISOString().split('T')[0]

      // Validation: New start date must be after current start date
      if (new Date(currentLatest.dataInicio) >= newDate) {
        throw new Error('A nova vigência deve ser posterior à vigência atual.')
      }

      // Close the previous price
      await db
        .update(valoresPreco)
        .set({ dataFim })
        .where(eq(valoresPreco.id, currentLatest.id))
    }

    // Insert new price
    const [newPrice] = await db
      .insert(valoresPreco)
      .values({
        categoriaId,
        valor: valor.toString(),
        dataInicio,
      })
      .returning()

    return newPrice
  }

  static async calculateSessionPrice(agendaId: number, date: Date | string) {
    const dateStr =
      date instanceof Date
        ? new Intl.DateTimeFormat('fr-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(date)
        : date.split('T')[0]

    // 1. Get Agenda
    const agendasFound = await db
      .select()
      .from(agendas)
      .where(eq(agendas.id, agendaId))

    if (agendasFound.length === 0) throw new Error('Agenda não encontrada.')
    const agenda = agendasFound[0]

    // 2. Check for fixed price
    if (agenda.valorFixo) {
      return Number(agenda.valorFixo)
    }

    // 3. Check for Category Price
    if (agenda.categoriaPrecoId) {
      const prices = await db
        .select()
        .from(valoresPreco)
        .where(
          and(
            eq(valoresPreco.categoriaId, agenda.categoriaPrecoId),
            lte(valoresPreco.dataInicio, dateStr),
            or(isNull(valoresPreco.dataFim), gte(valoresPreco.dataFim, dateStr)),
          ),
        )
        .orderBy(desc(valoresPreco.dataInicio))
        .limit(1)

      if (prices.length > 0) {
        return Number(prices[0].valor)
      }
    }

    return 0 // Default if no price found
  }
}
