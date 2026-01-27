import { and, count, desc, eq, gte, inArray, isNull, lt, lte, sql, sum } from 'drizzle-orm'
import { addMonths, endOfDay, endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { CalendarService } from './calendar'
import {
  agendas,
  consultas,
  faturaItens,
  faturas,
  pacientes,
  pagamentos,
} from '@/db/schema'
import { db } from '@/db'

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

    // 5. Open Invoices Value
    const [openInvoices] = await db
      .select({ total: sum(faturas.valorTotal) })
      .from(faturas)
      .where(eq(faturas.status, 'aberta'))

    // 6. Unbilled Consultations (Pending)
    const [unbilled] = await db
      .select({ total: sum(consultas.valorCobrado) })
      .from(consultas)
      .leftJoin(faturaItens, eq(consultas.id, faturaItens.consultaId))
      .where(
        and(
          eq(consultas.status, 'realizada'),
          isNull(faturaItens.id)
        )
      )

    return {
      totalPatients: Number(patientsCount?.count || 0),
      consultationsToday: Number(consultationsToday?.count || 0),
      activePatients: Number(activePatients?.count || 0),
      revenueMonth: Number(revenueMonth?.total || 0),
      openInvoices: Number(openInvoices?.total || 0),
      unbilledConsultations: Number(unbilled?.total || 0),
    }
  }

  static async getRecentConsultations() {
    const now = new Date()
    const endDate = addMonths(now, 1)

    // Generate calendar events including recurrences
    const events = await CalendarService.generateCalendar(now, endDate)

    // Filter and sort
    const nextConsultations = events
      .filter((e) => {
        return (
          e.date >= now &&
          ['disponivel', 'agendada', 'confirmada'].includes(e.status)
        )
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5)

    return nextConsultations.map((e) => ({
      id: e.consultationId || `virtual-${e.agendaId}-${e.date.getTime()}`,
      patientName: e.patientName || 'Paciente',
      patientEmail: e.patientEmail,
      date: e.date,
      status: e.status === 'disponivel' ? 'agendada' : e.status,
    }))
  }

  static async getOverdueInvoices() {
    const query = db
      .select({
        id: faturas.id,
        patientName: pacientes.nomeCompleto,
        dueDate: faturas.dataVencimento,
        value: faturas.valorTotal,
        status: faturas.status,
      })
      .from(faturas)
      .innerJoin(pacientes, eq(faturas.pacienteId, pacientes.id))
      .where(
        and(
          eq(faturas.status, 'aberta'),
          lt(faturas.dataVencimento,  sql`CURRENT_DATE`)
        )
      )
      .orderBy(faturas.dataVencimento)
    return await query
  }
}
