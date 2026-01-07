import { db } from '@/db'
import {
  consultas,
  pacientes,
  pagamentos,
  agendas,
  faturas,
} from '@/db/schema'
import { eq, and, sql, gte, lte, desc, count, sum } from 'drizzle-orm'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export class DashboardService {
  static async getStats() {
    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)
    const startOfCurrentMonth = startOfMonth(today)
    const endOfCurrentMonth = endOfMonth(today)
    
    // 1. Total Patients
    const [patientsCount] = await db
      .select({ count: count() })
      .from(pacientes)
    
    // 2. Consultations Today
    const [consultationsToday] = await db
      .select({ count: count() })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataPrevista, startOfToday),
          lte(consultas.dataPrevista, endOfToday)
        )
      )

    // 3. Active Patients (Patients with active agendas)
    const [activePatients] = await db
      .select({ count: count() })
      .from(agendas)
      .where(eq(agendas.ativa, true))
      
    // 4. Revenue This Month
    const [revenueMonth] = await db
      .select({ total: sum(pagamentos.valorPago) })
      .from(pagamentos)
      .where(
        and(
          gte(pagamentos.dataPagamento, startOfCurrentMonth.toISOString().split('T')[0]),
          lte(pagamentos.dataPagamento, endOfCurrentMonth.toISOString().split('T')[0])
        )
      )

    return {
      totalPatients: Number(patientsCount?.count || 0),
      consultationsToday: Number(consultationsToday?.count || 0),
      activePatients: Number(activePatients?.count || 0),
      revenueMonth: Number(revenueMonth?.total || 0),
    }
  }

  static async getRecentConsultations() {
    const now = new Date()
    
    return await db
      .select({
        id: consultas.id,
        patientName: pacientes.nomeCompleto,
        patientEmail: pacientes.email,
        date: consultas.dataPrevista,
        status: consultas.status,
      })
      .from(consultas)
      .innerJoin(agendas, eq(consultas.agendaId, agendas.id))
      .innerJoin(pacientes, eq(agendas.pacienteId, pacientes.id))
      .where(gte(consultas.dataPrevista, now))
      .orderBy(consultas.dataPrevista)
      .limit(5)
  }
}
