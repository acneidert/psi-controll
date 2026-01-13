import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface CalendarEventProps {
  event: any
  onClick: (event: any) => void
  isGhost?: boolean
}

export function CalendarEventCard({ event, onClick, isGhost }: CalendarEventProps) {
  const isConsultation = event.type === 'consultation'
  const isRealized = event.status === 'realizada'
  const isCancelled = event.status === 'cancelada'
  
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick(event)
      }}
      className={cn(
        'absolute inset-1 rounded-md p-2 text-xs font-medium cursor-pointer transition-all hover:shadow-md overflow-hidden flex flex-col gap-1 shadow-sm border-l-4 z-10',
        isGhost && 'opacity-80 grayscale bg-muted border-dashed',
        isConsultation
          ? isGhost
            ? 'bg-slate-100 border-l-slate-400 text-slate-700'
            : isRealized
              ? 'bg-emerald-50 border-l-emerald-500 text-emerald-900'
              : isCancelled
                ? 'bg-red-50 border-l-red-500 text-red-900'
                : 'bg-sky-50 border-l-sky-500 text-sky-900'
          : 'bg-slate-50 border-l-slate-300 text-slate-700 border border-slate-200 border-l-4'
      )}
    >
      <div className="flex items-center justify-between gap-1 w-full">
          <span className={cn('font-bold truncate text-sm leading-tight')}>
            {event.patientName || 'Paciente'}
          </span>
      </div>
      
      <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold opacity-80 truncate uppercase tracking-wider">
             {event.type === 'slot'
                ? 'Recorrência'
                : isGhost
                  ? 'Reagendado'
                  : event.status}
          </span>
          {isGhost && event.newDate && (
             <span className="text-[9px] opacity-70 truncate">
               ➜ {format(new Date(event.newDate), 'dd/MM HH:mm')}
             </span>
          )}
      </div>
    </div>
  )
}
