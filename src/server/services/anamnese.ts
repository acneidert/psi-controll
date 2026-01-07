import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { anamnese } from '@/db/schema'

export class AnamneseService {
  static async getLatestByPatientId(patientId: number) {
    return await db.query.anamnese.findFirst({
      where: eq(anamnese.pacienteId, patientId),
      orderBy: [desc(anamnese.dataPreenchimento)],
    })
  }

  static async createOrUpdate(data: typeof anamnese.$inferInsert) {
    // Check if exists
    const existing = await this.getLatestByPatientId(data.pacienteId)

    if (existing) {
      const [updated] = await db
        .update(anamnese)
        .set({
          ...data,
          dataPreenchimento: new Date(),
        })
        .where(eq(anamnese.id, existing.id))
        .returning()
      return updated
    }

    const [created] = await db.insert(anamnese).values(data).returning()
    return created
  }
}
