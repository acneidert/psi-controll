import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
} from 'lucide-react'
import { addDays, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getCalendarEventsFn } from '@/server/functions/calendar'
import {
  createAgendaFn,
  listAgendasFn,
  terminateAgendaFn,
} from '@/server/functions/agenda'
import {
  cancelConsultationFn,
  confirmConsultationFn,
  registerNoShowFn,
  rescheduleConsultationFn,
} from '@/server/functions/consultation'
import { listPatientsFn } from '@/server/functions/patients'
import { listCategoriesFn } from '@/server/functions/pricing'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/agenda')({
  component: AgendaPage,
})

function AgendaPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date())

  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 }) // Domingo
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 })

  const getEvents = useServerFn(getCalendarEventsFn)
  const listPatients = useServerFn(listPatientsFn)
  const listCategories = useServerFn(listCategoriesFn)
  const createAgenda = useServerFn(createAgendaFn)
  const listAgendas = useServerFn(listAgendasFn)
  const terminateAgenda = useServerFn(terminateAgendaFn)

  const confirmConsultation = useServerFn(confirmConsultationFn)
  const rescheduleConsultation = useServerFn(rescheduleConsultationFn)
  const registerNoShow = useServerFn(registerNoShowFn)
  const cancelConsultation = useServerFn(cancelConsultationFn)

  // Data
  const [events, setEvents] = React.useState<Array<any>>([])
  const [patients, setPatients] = React.useState<Array<any>>([])
  const [categories, setCategories] = React.useState<Array<any>>([])
  const [agendas, setAgendas] = React.useState<Array<any>>([])

  // UI State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isManageOpen, setIsManageOpen] = React.useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null)
  const [rescheduleTarget, setRescheduleTarget] = React.useState<string>('')

  // Form State
  const [formData, setFormData] = React.useState({
    pacienteId: '',
    frequencia: 'semanal',
    diaSemana: '',
    hora: '',
    dataInicio: format(new Date(), 'yyyy-MM-dd'),
    dataFim: '',
    categoriaPrecoId: '',
  })

  const loadData = React.useCallback(() => {
    getEvents({
      data: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    }).then(setEvents)
  }, [startDate.toISOString(), endDate.toISOString()])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  React.useEffect(() => {
    if (isCreateOpen) {
      listPatients({}).then(setPatients)
      listCategories().then(setCategories)
    }
  }, [isCreateOpen])

  React.useEffect(() => {
    if (isManageOpen) {
      listAgendas().then(setAgendas)
    }
  }, [isManageOpen])

  const handleCreate = async () => {
    try {
      if (!formData.pacienteId || !formData.hora || !formData.dataInicio) {
        alert('Preencha os campos obrigatórios')
        return
      }

      await createAgenda({
        data: {
          pacienteId: Number(formData.pacienteId),
          hora: formData.hora, // Ensure HH:MM
          dataInicio: formData.dataInicio,
          frequencia: formData.frequencia as any,
          diaSemana: formData.diaSemana
            ? Number(formData.diaSemana)
            : undefined,
          dataFim: formData.dataFim || undefined,
          valorFixo: undefined,
          categoriaPrecoId: formData.categoriaPrecoId
            ? Number(formData.categoriaPrecoId)
            : undefined,
        },
      })

      setIsCreateOpen(false)
      loadData()
      alert('Agenda criada com sucesso!')
    } catch (error: any) {
      alert('Erro ao criar agenda: ' + error.message)
    }
  }

  const handleTerminate = async (id: number) => {
    const date = prompt(
      'Data de encerramento (YYYY-MM-DD):',
      format(new Date(), 'yyyy-MM-dd'),
    )
    if (date) {
      try {
        await terminateAgenda({ data: { id, endDate: date } })
        listAgendas().then(setAgendas)
        loadData()
      } catch (error: any) {
        alert('Erro ao encerrar: ' + error.message)
      }
    }
  }

  const handleConfirm = async () => {
    if (!selectedEvent) return
    try {
      await confirmConsultation({
        data: {
          agendaId: selectedEvent.agendaId,
          date: new Date(selectedEvent.originalDate).toISOString(),
          realizationDate: new Date(selectedEvent.date).toISOString(),
        },
      })
      setIsDetailsOpen(false)
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleNoShow = async () => {
    if (!selectedEvent) return
    if (!confirm('Registrar falta?')) return
    try {
      await registerNoShow({
        data: {
          agendaId: selectedEvent.agendaId,
          date: new Date(selectedEvent.originalDate).toISOString(),
          charge: true,
        },
      })
      setIsDetailsOpen(false)
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCancel = async () => {
    if (!selectedEvent) return
    if (!confirm('Cancelar consulta?')) return
    try {
      await cancelConsultation({
        data: {
          agendaId: selectedEvent.agendaId,
          date: new Date(selectedEvent.originalDate).toISOString(),
        },
      })
      setIsDetailsOpen(false)
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleReschedule = async () => {
    if (!selectedEvent || !rescheduleTarget) return
    try {
      // Combine target date with existing time or new time?
      // Simple approach: Use target datetime directly if it includes time,
      // or append original time if only date.
      // Assuming rescheduleTarget is datetime-local input value
      await rescheduleConsultation({
        data: {
          agendaId: selectedEvent.agendaId,
          originalDate: new Date(selectedEvent.originalDate).toISOString(),
          newDate: new Date(rescheduleTarget).toISOString(),
        },
      })
      setIsDetailsOpen(false)
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const nextPeriod = () => {
    setCurrentDate((prev) => addDays(prev, 7))
  }

  const prevPeriod = () => {
    setCurrentDate((prev) => addDays(prev, -7))
  }

  const daysToRender = React.useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i))
    }
    return days
  }, [startDate])

  // Hours 8:00 to 22:00 in 30 min intervals
  const timeSlots = React.useMemo(() => {
    const slots = []
    for (let h = 5; h <= 23; h++) {
      slots.push({ hour: h, minute: 0, label: `${h}:00` })
      slots.push({ hour: h, minute: 30, label: `${h}:30` })
    }
    return slots
  }, [])

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Agenda
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsManageOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Agenda
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-card p-2 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-32 text-center">
            {format(startDate, 'dd/MM', { locale: ptBR })} -{' '}
            {format(endDate, 'dd/MM', { locale: ptBR })}
          </div>
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span>Agendado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>Realizado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded opacity-60 line-through decoration-gray-500"></div>
            <span className="line-through decoration-gray-500">Reagendado</span>
          </div>
        </div>
      </div>

      <div className="flex-1 border rounded-lg overflow-auto bg-card">
        <div className="grid grid-cols-[60px_1fr] h-full min-w-[800px]">
          {/* Time Column */}
          <div className="border-r bg-muted/20">
            <div className="h-12 border-b"></div> {/* Header spacer */}
            {timeSlots.map(({ label }) => (
              <div
                key={label}
                className="h-12 border-b text-xs text-muted-foreground p-2 text-center flex items-center justify-center"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="grid grid-cols-7 divide-x">
            {/* Headers */}
            {daysToRender.map((day) => (
              <div key={day.toString()} className="flex flex-col">
                <div
                  className={cn(
                    'h-12 border-b flex flex-col items-center justify-center p-1',
                    isSameDay(day, new Date()) && 'bg-primary/5',
                  )}
                >
                  <span className="text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold h-7 w-7 flex items-center justify-center rounded-full',
                      isSameDay(day, new Date()) &&
                        'bg-primary text-primary-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Grid Cells */}
                <div className="relative flex-1">
                  {timeSlots.map(({ hour, minute, label }) => {
                    // Encontrar eventos para este dia e hora (Lógica de Bucket 30min)
                    const event = events.find((e) => {
                      const eDate = new Date(e.date)
                      if (!isSameDay(eDate, day)) return false
                      if (eDate.getHours() !== hour) return false
                      
                      const m = eDate.getMinutes()
                      if (minute === 0) {
                        return m >= 0 && m < 30
                      } else {
                        return m >= 30 && m < 60
                      }
                    })

                    const isGhost = event?.status === 'reagendado-origem'

                    return (
                      <div
                        key={label}
                        className="h-12 border-b relative group"
                        onClick={() => {
                          if (event) {
                            setSelectedEvent(event)
                            setIsDetailsOpen(true)
                          } else {
                            setFormData({
                              ...formData,
                              dataInicio: format(day, 'yyyy-MM-dd'),
                              hora: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                              diaSemana: day.getDay().toString(),
                            })
                            setIsCreateOpen(true)
                          }
                        }}
                      >
                        {/* Render Event or Empty Slot */}
                        {event ? (
                          <div
                            className={cn(
                              'absolute inset-0.5 rounded-md p-1 text-[10px] font-medium cursor-pointer transition-colors overflow-hidden flex flex-col gap-0.5 shadow-sm border',
                              isGhost && 'opacity-60',
                            )}
                            style={{
                              backgroundColor:
                                event.type === 'consultation'
                                  ? isGhost
                                    ? '#f1f5f9'
                                    : event.status === 'realizada'
                                      ? '#dcfce7'
                                      : event.status === 'cancelada'
                                        ? '#fee2e2'
                                        : '#e0f2fe'
                                  : '#f8fafc',
                              borderColor:
                                event.type === 'consultation'
                                  ? 'transparent'
                                  : '#e2e8f0',
                              borderStyle:
                                event.type === 'slot' ? 'dashed' : 'solid',
                              textDecoration: isGhost ? 'line-through' : 'none',
                            }}
                          >
                            <span
                              className={cn(
                                'font-bold truncate',
                                isGhost
                                  ? 'text-muted-foreground'
                                  : event.status === 'realizada'
                                    ? 'text-green-700'
                                    : event.status === 'cancelada'
                                      ? 'text-red-700'
                                      : 'text-blue-700',
                              )}
                            >
                              {event.patientName || 'Paciente'}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {event.type === 'slot'
                                ? 'Recorrência'
                                : isGhost
                                  ? 'Reagendado'
                                  : event.status}
                            </span>
                            {isGhost && event.newDate && (
                              <span className="text-[9px] text-muted-foreground/80 truncate block mt-0.5">
                                Para: {format(new Date(event.newDate), 'dd/MM HH:mm')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 hover:bg-muted/10 cursor-pointer transition-all flex items-center justify-center">
                            <Plus className="text-muted-foreground/50 h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog Nova Agenda */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Agenda / Recorrência</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Paciente</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.pacienteId}
                onChange={(e) =>
                  setFormData({ ...formData, pacienteId: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) =>
                    setFormData({ ...formData, dataInicio: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) =>
                    setFormData({ ...formData, hora: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Frequência</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.frequencia}
                  onChange={(e) =>
                    setFormData({ ...formData, frequencia: e.target.value })
                  }
                >
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                  <option value="unica">Única</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Categoria Preço</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.categoriaPrecoId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      categoriaPrecoId: e.target.value,
                    })
                  }
                >
                  <option value="">Padrão / Fixo</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerenciar */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-[800px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Agendas Recorrentes</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground sticky top-0">
                <tr>
                  <th className="p-2">Paciente</th>
                  <th className="p-2">Dia/Hora</th>
                  <th className="p-2">Frequência</th>
                  <th className="p-2">Início</th>
                  <th className="p-2">Fim</th>
                  <th className="p-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agendas.map((agenda) => (
                  <tr key={agenda.id}>
                    <td className="p-2 font-medium">
                      {agenda.paciente?.nomeCompleto}
                    </td>
                    <td className="p-2">
                      {
                        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][
                          agenda.diaSemana ?? 0
                        ]
                      }{' '}
                      - {agenda.hora.slice(0, 5)}
                    </td>
                    <td className="p-2 capitalize">{agenda.frequencia}</td>
                    <td className="p-2">
                      {format(new Date(agenda.dataInicio), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-2">
                      {agenda.dataFim
                        ? format(new Date(agenda.dataFim), 'dd/MM/yyyy')
                        : '-'}
                    </td>
                    <td className="p-2">
                      {!agenda.dataFim && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleTerminate(agenda.id)}
                        >
                          Encerrar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Detalhes Consulta */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
          </DialogHeader>
          {selectedEvent &&
            (selectedEvent.status === 'reagendado-origem' ? (
              <div className="grid gap-4 py-4">
                <div className="p-4 bg-muted rounded-md text-center space-y-2">
                  <p className="font-medium text-muted-foreground">
                    Este agendamento foi reagendado.
                  </p>
                  {selectedEvent.newDate && (
                    <p className="text-sm">
                      Nova Data:{' '}
                      <span className="font-bold">
                        {format(
                          new Date(selectedEvent.newDate),
                          'dd/MM/yyyy HH:mm',
                          { locale: ptBR },
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Paciente</Label>
                  <div className="font-medium">{selectedEvent.patientName}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Data/Hora</Label>
                  <div>
                    {format(new Date(selectedEvent.date), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="capitalize">{selectedEvent.status}</div>
                </div>

                <div className="grid gap-2 border-t pt-4">
                  <Label>Ações</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleConfirm}
                      disabled={selectedEvent.status === 'realizada'}
                    >
                      Confirmar Realização
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleNoShow}
                      disabled={['realizada', 'falta', 'cancelada'].includes(
                        selectedEvent.status,
                      )}
                    >
                      Registrar Falta
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={['cancelada', 'realizada'].includes(
                        selectedEvent.status,
                      )}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 border-t pt-4">
                  <Label>Reagendar para</Label>
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={rescheduleTarget}
                      onChange={(e) => setRescheduleTarget(e.target.value)}
                      disabled={['realizada', 'falta', 'cancelada'].includes(
                        selectedEvent.status,
                      )}
                    />
                    <Button
                      onClick={handleReschedule}
                      disabled={
                        !rescheduleTarget ||
                        ['realizada', 'falta', 'cancelada'].includes(
                          selectedEvent.status,
                        )
                      }
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </div>
  )
}
