import { addDays, endOfWeek, format, startOfWeek } from 'date-fns'
import { eq } from 'drizzle-orm'
import { auth } from '../src/lib/auth'
import { db } from '../src/db'
import { agendas, consultas, faturaItens, faturas, pacientes, pagamentos } from '../src/db/schema'
import { AgendaService } from '../src/server/services/agenda'
import { CalendarService } from '../src/server/services/calendar'
import { ConsultationService } from '../src/server/services/consultation'

async function main() {
  console.log('--- Reproducing Ghost Event Issue ---')

  // 1. Cleanup
  await db.delete(pagamentos).execute()
  await db.delete(faturaItens).execute()
  await db.delete(faturas).execute()
  await db.delete(consultas).execute()
  await db.delete(agendas).execute()
  await db.delete(pacientes).execute()

  // 2. Create Patient
  const [patient] = await db.insert(pacientes).values({
    nomeCompleto: 'Test Patient',
    email: 'test@example.com',
    telefone: '123456789',
    dataNascimento: '1990-01-01',
    status: 'ativo'
  }).returning()
  
  console.log('Patient created:', patient.id)

  // 3. Create Agenda (Weekly, Today, 10:00)
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const hour = '10:00'
  
  const agenda = await AgendaService.createAgenda({
    pacienteId: patient.id,
    dataInicio: todayStr,
    hora: hour,
    frequencia: 'semanal'
  })
  
  console.log('Agenda created:', agenda.id)

  // 4. Reschedule today's slot to 12:00
  const originalDate = new Date(`${todayStr}T${hour}:00`)
  const newDate = new Date(`${todayStr}T12:00:00`)
  
  console.log('Rescheduling from', originalDate.toISOString(), 'to', newDate.toISOString())

  await ConsultationService.rescheduleConsultation(
    agenda.id,
    originalDate,
    newDate
  )
  
  // 5. Fetch Calendar Events
  const start = startOfWeek(today, { weekStartsOn: 0 })
  const end = endOfWeek(today, { weekStartsOn: 0 })
  
  console.log('Fetching events from', start.toISOString(), 'to', end.toISOString())
  
  const events = await CalendarService.generateCalendar(start, end)
  
  // 6. Analyze Events
  const ghostEvents = events.filter(e => e.status === 'reagendado-origem')
  const realEvents = events.filter(e => e.status === 'agendada' && e.type === 'consultation')
  
  console.log('Total Events:', events.length)
  console.log('Ghost Events:', ghostEvents.length)
  console.log('Real Events:', realEvents.length)
  
  if (ghostEvents.length > 0) {
    console.log('Ghost Event Found:', ghostEvents[0])
    console.log('SUCCESS: Ghost event is present in backend response.')
  } else {
    console.log('FAILURE: Ghost event NOT found in backend response.')
    console.log('All events:', JSON.stringify(events, null, 2))
  }
  
  process.exit(0)
}

main().catch(console.error)
