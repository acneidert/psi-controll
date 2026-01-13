import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface CalendarHeaderProps {
  currentDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  startDate: Date
  endDate: Date
  className?: string
  children?: React.ReactNode
}

export function CalendarHeader({ 
  currentDate, 
  onPrev, 
  onNext, 
  onToday, 
  startDate, 
  endDate,
  className,
  children 
}: CalendarHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
       <div className="flex items-center gap-4">
         <div className="flex items-center rounded-md border bg-background shadow-sm">
           <Button variant="ghost" size="icon" onClick={onPrev} className="h-8 w-8 rounded-none rounded-l-md border-r">
             <ChevronLeft className="h-4 w-4" />
           </Button>
           <Button variant="ghost" size="sm" onClick={onToday} className="h-8 rounded-none px-3 font-normal">
             Hoje
           </Button>
           <Button variant="ghost" size="icon" onClick={onNext} className="h-8 w-8 rounded-none rounded-r-md border-l">
             <ChevronRight className="h-4 w-4" />
           </Button>
         </div>
         <h2 className="text-xl font-semibold tracking-tight capitalize">
           {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
         </h2>
       </div>
       
       <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-4 hidden md:block capitalize">
            {format(startDate, 'd MMM', { locale: ptBR })} - {format(endDate, 'd MMM yyyy', { locale: ptBR })}
          </div>
          {children}
       </div>
    </div>
  )
}
