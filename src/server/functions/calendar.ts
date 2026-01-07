import { createServerFn } from '@tanstack/react-start'
import { addDays } from 'date-fns'
import { CalendarService } from '../services/calendar'

export const getCalendarEventsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { startDate: string; endDate: string }) => data)
  .handler(
    async ({ data }: { data: { startDate: string; endDate: string } }) => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return await CalendarService.generateCalendar(start, end)
    },
  )
