import { createServerFn } from '@tanstack/react-start'
import { addDays } from 'date-fns'
import { CalendarService } from '../services/calendar'

export const getCalendarEventsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { startDate: string; endDate: string }) => data)
  .handler(
    async ({ data }: { data: { startDate: string; endDate: string } }) => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      
      // Debug: Check if agendas exist
      // const allAgendas = await db.query.agendas.findMany()
      // console.log('Total Agendas:', allAgendas.length)

      return await CalendarService.generateCalendar(start, end)
    },
  )
