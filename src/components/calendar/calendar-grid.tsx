import * as React from 'react'
import { cn } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarEventCard } from './calendar-event-card'
import { Plus } from 'lucide-react'

interface CalendarGridProps {
  days: Date[]
  timeSlots: { hour: number; minute: number; label: string }[]
  events: any[]
  onEventClick: (event: any) => void
  onSlotClick: (date: Date, hour: number, minute: number) => void
}

export function CalendarGrid({ days, timeSlots, events, onEventClick, onSlotClick }: CalendarGridProps) {
  const getEventForSlot = (day: Date, hour: number, minute: number) => {
      const slotEvents = events.filter((e) => {
        const eDate = new Date(e.date)
        if (!isSameDay(eDate, day)) return false
        if (eDate.getHours() !== hour) return false
        const m = eDate.getMinutes()
        return minute === 0 ? (m >= 0 && m < 30) : (m >= 30 && m < 60)
      })

      return slotEvents.sort((a, b) => {
        const score = (e: any) => {
          if (e.type === 'slot') return 0
          if (e.status === 'reagendado-origem') return 1
          return 2
        }
        return score(b) - score(a)
      })[0]
  }

  return (
    <div className="flex-1 border rounded-xl overflow-hidden bg-background shadow-sm flex flex-col h-full">
      {/* Header - Sticky */}
      <div className="grid grid-cols-[60px_1fr] border-b bg-muted/30">
        <div className="p-2 border-r bg-muted/10"></div>
        <div className="grid grid-cols-7 divide-x">
           {days.map((day) => {
             const isToday = isSameDay(day, new Date())
             return (
              <div 
                key={day.toString()} 
                className={cn(
                  "p-2 text-center flex flex-col gap-1 items-center justify-center py-3 transition-colors",
                  isToday ? "bg-primary/5" : "bg-background"
                )}
              >
                <span className={cn("text-xs font-medium uppercase text-muted-foreground", isToday && "text-primary")}>
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-full text-lg font-bold transition-all",
                   isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
             )
           })}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto flex-1 relative scrollbar-thin scrollbar-thumb-gray-200">
         <div className="grid grid-cols-[60px_1fr]">
            {/* Time Column */}
            <div className="border-r bg-muted/5 divide-y sticky left-0 z-20 bg-background">
               {timeSlots.map(({ label }) => (
                 <div key={label} className="h-20 flex items-start justify-center pt-2 text-xs font-medium text-muted-foreground relative">
                    <span className="bg-background px-1 z-10 -mt-2.5">{label}</span>
                 </div>
               ))}
            </div>
            
            {/* Grid */}
            <div className="grid grid-cols-7 divide-x relative">
               {days.map((day) => {
                 const isSunday = day.getDay() === 0
                 return (
                 <div key={day.toString()} className={cn("divide-y relative bg-background", isSunday && "bg-muted/5")}>
                    {timeSlots.map(({ hour, minute, label }) => {
                       const event = getEventForSlot(day, hour, minute)
                       const isGhost = event?.status === 'reagendado-origem'
                       
                       return (
                         <div 
                           key={`${day}-${label}`} 
                           className={cn(
                             "h-20 relative group transition-colors border-b border-dashed border-b-gray-100 last:border-b-0",
                             !isSunday && "hover:bg-muted/5",
                             isSunday && "bg-[image:repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.05)_10px,rgba(0,0,0,0.05)_20px)]"
                           )}
                           onClick={() => {
                             if (!isSunday && !event) onSlotClick(day, hour, minute)
                           }}
                         >
                            {event ? (
                              <>
                                <CalendarEventCard 
                                  event={event} 
                                  onClick={onEventClick} 
                                  isGhost={isGhost}
                                />
                                {isGhost && !isSunday && (
                                   <div 
                                      className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-primary text-primary-foreground rounded-full p-1 shadow-sm hover:scale-110"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onSlotClick(day, hour, minute)
                                      }}
                                      title="Adicionar agendamento"
                                   >
                                      <Plus className="h-3 w-3" />
                                   </div>
                                )}
                              </>
                            ) : (
                                !isSunday && (
                                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                      <div className="bg-primary/10 text-primary rounded-md p-1">
                                        <Plus className="h-4 w-4" />
                                      </div>
                                   </div>
                                )
                            )}
                         </div>
                       )
                    })}
                    
                    {/* Current Time Indicator */}
                    {isSameDay(day, new Date()) && (
                      <CurrentTimeIndicator /> 
                    )}
                 </div>
                 )
               })}
            </div>
         </div>
      </div>
    </div>
  )
}

function CurrentTimeIndicator() {
  const [top, setTop] = React.useState<number | null>(null)
  
  React.useEffect(() => {
     const updatePosition = () => {
        const now = new Date()
        const startHour = 5
        // We render slots from 5:00 to 23:30.
        // Each slot is 80px (h-20) for 30 minutes.
        // So 1 hour = 160px.
        // 1 minute = 160 / 60 = 2.666px.
        
        const currentHour = now.getHours()
        if (currentHour < startHour) {
            setTop(null)
            return
        }

        const pxPerMinute = 160 / 60
        const totalMinutes = (currentHour - startHour) * 60 + now.getMinutes()
        setTop(totalMinutes * pxPerMinute)
     }
     
     updatePosition()
     const interval = setInterval(updatePosition, 60000)
     return () => clearInterval(interval)
  }, [])
  
  if (top === null) return null
  
  return (
    <div 
      className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center shadow-sm"
      style={{ top: `${top}px` }}
    >
      <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5 ring-2 ring-white"></div>
    </div>
  )
}
