import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
} from 'lucide-react'
import { addDays, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { getCalendarEventsFn } from '@/server/functions/calendar'
import {
  createAgendaFn,
  deleteAgendaFn,
  listAgendasFn,
  terminateAgendaFn,
  updateAgendaFn,
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
import { CalendarHeader } from '@/components/calendar/calendar-header'
import { CalendarGrid } from '@/components/calendar/calendar-grid'

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
  const updateAgenda = useServerFn(updateAgendaFn)
  const deleteAgenda = useServerFn(deleteAgendaFn)

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
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [selectedAgendaId, setSelectedAgendaId] = React.useState<number | null>(
    null,
  )
  const [isManageOpen, setIsManageOpen] = React.useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null)
  const [rescheduleTarget, setRescheduleTarget] = React.useState<string>('')

  // Dialog States
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: 'default' | 'destructive'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'default',
  })

  const [choiceDialog, setChoiceDialog] = React.useState<{
    isOpen: boolean
    title: string
    description: string
    options: Array<{
      label: string
      value: string
      variant?: 'default' | 'destructive' | 'outline'
    }>
    onSelect: (value: string) => void
  }>({
    isOpen: false,
    title: '',
    description: '',
    options: [],
    onSelect: () => {},
  })

  const [formData, setFormData] = React.useState({
    pacienteId: '',
    frequencia: 'semanal',
    diaSemana: '',
    hora: '',
    dataInicio: format(new Date(), 'yyyy-MM-dd'),
    dataFim: '',
    categoriaPrecoId: '',
  })

  // Edit Confirmation State
  const [isEditConfirmOpen, setIsEditConfirmOpen] = React.useState(false)
  const [editModeSelection, setEditModeSelection] = React.useState<'history' | 'overwrite'>('history')
  const [editCutoffDate, setEditCutoffDate] = React.useState(format(new Date(), 'yyyy-MM-dd'))

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
        toast.warning('Preencha os campos obrigatórios')
        return
      }

      if (isEditMode && selectedAgendaId) {
        setEditModeSelection('history')
        setEditCutoffDate(formData.dataInicio || format(new Date(), 'yyyy-MM-dd'))
        setIsEditConfirmOpen(true)
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
      toast.success('Agenda criada com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao salvar agenda: ' + error.message)
    }
  }

  const handleConfirmEdit = async () => {
    await executeEdit(editModeSelection, editCutoffDate)
    setIsEditConfirmOpen(false)
  }

  const executeEdit = async (
    mode: 'history' | 'overwrite',
    cutoffDate?: string,
  ) => {
    if (!selectedAgendaId) return
    try {
      await updateAgenda({
        data: {
          id: selectedAgendaId,
          mode,
          cutoffDate,
          data: {
            pacienteId: Number(formData.pacienteId),
            hora: formData.hora,
            dataInicio: formData.dataInicio,
            frequencia: formData.frequencia as any,
            diaSemana: formData.diaSemana
              ? Number(formData.diaSemana)
              : undefined,
            dataFim: formData.dataFim || undefined,
            categoriaPrecoId: formData.categoriaPrecoId
              ? Number(formData.categoriaPrecoId)
              : undefined,
          },
        },
      })

      setIsCreateOpen(false)
      loadData()
      listAgendas().then(setAgendas)
      toast.success('Agenda atualizada com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message)
    }
  }

  const handleEdit = (agenda: any) => {
    setFormData({
      pacienteId: agenda.pacienteId.toString(),
      frequencia: agenda.frequencia,
      diaSemana: agenda.diaSemana?.toString() || '',
      hora: agenda.hora.slice(0, 5),
      dataInicio: agenda.dataInicio,
      dataFim: agenda.dataFim || '',
      categoriaPrecoId: agenda.categoriaPrecoId?.toString() || '',
    })
    setSelectedAgendaId(agenda.id)
    setIsEditMode(true)
    setIsCreateOpen(true)
  }

  const handleDelete = (id: number) => {
    setChoiceDialog({
      isOpen: true,
      title: 'Excluir Agenda',
      description:
        'Deseja manter o histórico desta agenda (apenas encerrar) ou excluir completamente do sistema?',
      options: [
        { label: 'Manter Histórico', value: 'history' },
        {
          label: 'Excluir Tudo',
          value: 'everything',
          variant: 'destructive',
        },
      ],
      onSelect: (mode) => executeDelete(id, mode as 'history' | 'everything'),
    })
  }

  const executeDelete = async (id: number, mode: 'history' | 'everything') => {
    try {
      await deleteAgenda({ data: { id, mode } })
      listAgendas().then(setAgendas)
      loadData()
      setChoiceDialog((prev) => ({ ...prev, isOpen: false }))
      toast.success(
        mode === 'history' ? 'Agenda encerrada!' : 'Agenda excluída!',
      )
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
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
      toast.success('Consulta confirmada!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const executeNoShow = async () => {
    if (!selectedEvent) return
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
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
      toast.success('Falta registrada!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleNoShow = () => {
    if (!selectedEvent) return
    setConfirmDialog({
      isOpen: true,
      title: 'Registrar falta?',
      description: 'Isso irá registrar uma falta para o paciente e gerar cobrança. Continuar?',
      onConfirm: executeNoShow,
      variant: 'default',
    })
  }

  const executeCancel = async () => {
    if (!selectedEvent) return
    try {
      await cancelConsultation({
        data: {
          agendaId: selectedEvent.agendaId,
          date: new Date(selectedEvent.originalDate).toISOString(),
        },
      })
      setIsDetailsOpen(false)
      loadData()
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
      toast.success('Consulta cancelada!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleCancel = () => {
    if (!selectedEvent) return
    setConfirmDialog({
      isOpen: true,
      title: 'Cancelar consulta?',
      description: 'Tem certeza que deseja cancelar esta consulta?',
      onConfirm: executeCancel,
      variant: 'destructive',
    })
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
      toast.success('Consulta reagendada!')
    } catch (e: any) {
      toast.error(e.message)
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

  // Hours 5:00 to 23:30 in 30 min intervals
  const timeSlots = React.useMemo(() => {
    const slots = []
    for (let h = 5; h <= 23; h++) {
      slots.push({ hour: h, minute: 0, label: `${h}:00` })
      slots.push({ hour: h, minute: 30, label: `${h}:30` })
    }
    return slots
  }, [])

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6 bg-muted/10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
               <CalendarIcon className="h-6 w-6" />
            </div>
            Agenda
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsManageOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Gerenciar</span>
          </Button>
          <Button onClick={() => {
            setFormData({
              pacienteId: '',
              frequencia: 'semanal',
              diaSemana: '',
              hora: '',
              dataInicio: format(new Date(), 'yyyy-MM-dd'),
              dataFim: '',
              categoriaPrecoId: '',
            })
            setIsEditMode(false)
            setSelectedAgendaId(null)
            setIsCreateOpen(true)
          }} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Agenda</span>
          </Button>
        </div>
      </div>

      <CalendarHeader 
        currentDate={currentDate}
        onPrev={prevPeriod}
        onNext={nextPeriod}
        onToday={() => setCurrentDate(new Date())}
        startDate={startDate}
        endDate={endDate}
      >
         <div className="flex items-center gap-2 text-xs font-medium border rounded-lg p-1 bg-background shadow-sm">
             <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
               <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
               <span>Agendado</span>
             </div>
             <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
               <span>Realizado</span>
             </div>
         </div>
      </CalendarHeader>

      <CalendarGrid 
        days={daysToRender}
        timeSlots={timeSlots}
        events={events}
        onEventClick={(event) => {
             setSelectedEvent(event)
             setIsDetailsOpen(true)
        }}
        onSlotClick={(date, hour, minute) => {
             setFormData({
               ...formData,
               dataInicio: format(date, 'yyyy-MM-dd'),
               hora: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
               diaSemana: date.getDay().toString(),
             })
             setIsCreateOpen(true)
        }}
      />

      {/* Dialog Nova Agenda */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Editar Agenda' : 'Nova Agenda / Recorrência'}
            </DialogTitle>
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

      {/* Choice Dialog */}
      <Dialog
        open={choiceDialog.isOpen}
        onOpenChange={(open) =>
          setChoiceDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{choiceDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {choiceDialog.description}
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="sm:mr-auto"
              onClick={() =>
                setChoiceDialog((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancelar
            </Button>
            {choiceDialog.options.map((option) => (
              <Button
                key={option.value}
                variant={option.variant || 'default'}
                onClick={() => choiceDialog.onSelect(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{confirmDialog.description}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.variant || 'default'}
              onClick={confirmDialog.onConfirm}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <Dialog open={isEditConfirmOpen} onOpenChange={setIsEditConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Como deseja aplicar as alterações nesta agenda recorrente?
            </p>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => setEditModeSelection('history')}>
                <input
                  type="radio"
                  id="mode-history"
                  name="edit-mode"
                  value="history"
                  checked={editModeSelection === 'history'}
                  onChange={(e) => setEditModeSelection(e.target.value as any)}
                  className="h-4 w-4"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="mode-history" className="cursor-pointer font-medium">
                    Manter Histórico
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Encerra a agenda atual e cria uma nova a partir da data de corte.
                  </p>
                </div>
              </div>

              {editModeSelection === 'history' && (
                <div className="ml-6 pl-4 border-l-2 border-muted animate-in fade-in slide-in-from-top-2">
                   <Label className="mb-2 block">Data de Corte (Início da Nova Agenda)</Label>
                   <Input
                      type="date"
                      value={editCutoffDate}
                      onChange={(e) => setEditCutoffDate(e.target.value)}
                   />
                   <p className="text-xs text-muted-foreground mt-1">
                     O agendamento antigo será encerrado no dia anterior a esta data.
                   </p>
                </div>
              )}

              <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => setEditModeSelection('overwrite')}>
                <input
                  type="radio"
                  id="mode-overwrite"
                  name="edit-mode"
                  value="overwrite"
                  checked={editModeSelection === 'overwrite'}
                  onChange={(e) => setEditModeSelection(e.target.value as any)}
                  className="h-4 w-4"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="mode-overwrite" className="cursor-pointer font-medium">
                    Sobrescrever Tudo
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Atualiza todos os registros, passados e futuros (Cuidado!).
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmEdit}>
              Confirmar
            </Button>
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
                      {agenda.dataInicio.split('-').reverse().join('/')}
                    </td>
                    <td className="p-2">
                      {agenda.dataFim
                        ? agenda.dataFim.split('-').reverse().join('/')
                        : '-'}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(agenda)}
                        >
                          Editar
                        </Button>
                        {!agenda.dataFim && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(agenda.id)}
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
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
