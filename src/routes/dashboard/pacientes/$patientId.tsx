import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { format } from 'date-fns'
import { getPatientByIdFn } from '@/server/functions/patients'
import { getAnamneseFn, saveAnamneseFn } from '@/server/functions/anamnese'
import {
  listConsultationsByPatientFn,
  updateConsultationNotesFn,
} from '@/server/functions/consultation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/pacientes/$patientId')({
  component: PatientDetailsPage,
  loader: async ({ params }) => {
    return { patientId: Number(params.patientId) }
  },
})

function PatientDetailsPage() {
  const { patientId } = Route.useLoaderData()
  const getPatient = useServerFn(getPatientByIdFn)
  const getAnamnese = useServerFn(getAnamneseFn)
  const saveAnamnese = useServerFn(saveAnamneseFn)

  const [patient, setPatient] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  // Anamnese Form
  const [queixaPrincipal, setQueixaPrincipal] = React.useState('')
  const [historicoMedico, setHistoricoMedico] = React.useState('')
  const [medicamentos, setMedicamentos] = React.useState('')

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [pData, aData] = await Promise.all([
        getPatient({ data: { id: patientId } }),
        getAnamnese({ data: { pacienteId: patientId } }),
      ])
      setPatient(pData)
      if (aData) {
        setQueixaPrincipal(aData.queixaPrincipal || '')
        setHistoricoMedico(aData.historicoMedico || '')
        setMedicamentos(aData.medicamentos || '')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados do paciente')
    } finally {
      setLoading(false)
    }
  }, [patientId, getPatient, getAnamnese])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveAnamnese = async () => {
    try {
      await saveAnamnese({
        data: {
          pacienteId: patientId,
          queixaPrincipal,
          historicoMedico,
          medicamentos,
        },
      })
      toast.success('Anamnese salva com sucesso!')
      loadData()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar anamnese')
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>
  if (!patient) return <div className="p-8">Paciente não encontrado</div>

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/pacientes">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">
            {patient.nomeCompleto}
          </h2>
        </div>
      </div>

      <Tabs defaultValue="anamnese" className="space-y-4">
        <TabsList>
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
        </TabsList>

        <TabsContent value="anamnese" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Queixa Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={queixaPrincipal}
                  onChange={setQueixaPrincipal}
                  placeholder="Descreva a queixa principal..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Histórico Médico</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={historicoMedico}
                  onChange={setHistoricoMedico}
                  placeholder="Histórico médico relevante..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medicamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={medicamentos}
                  onChange={setMedicamentos}
                  placeholder="Medicamentos em uso..."
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveAnamnese}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Anamnese
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evolucao">
          <EvolucaoList patientId={patientId} />
        </TabsContent>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold">CPF:</span> {patient.cpf}
                </div>
                <div>
                  <span className="font-bold">Telefone:</span>{' '}
                  {patient.telefone}
                </div>
                <div>
                  <span className="font-bold">Email:</span> {patient.email}
                </div>
                <div>
                  <span className="font-bold">Data Nascimento:</span>{' '}
                  {patient.dataNascimento
                    ? format(new Date(patient.dataNascimento), 'dd/MM/yyyy')
                    : '-'}
                </div>
                <div className="col-span-2">
                  <span className="font-bold">Endereço:</span>{' '}
                  {patient.endereco}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EvolucaoList({ patientId }: { patientId: number }) {
  const listConsultations = useServerFn(listConsultationsByPatientFn)
  const updateNotes = useServerFn(updateConsultationNotesFn)
  const [consultations, setConsultations] = React.useState<Array<any>>([])
  const [expandedId, setExpandedId] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Local state for editing to avoid constant re-renders/saves
  const [editNotes, setEditNotes] = React.useState('')

  const fetchConsultations = React.useCallback(async () => {
    try {
      const data = await listConsultations({ data: { patientId } })
      setConsultations(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [patientId, listConsultations])

  React.useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  const handleExpand = (c: any) => {
    if (expandedId === c.id) {
      setExpandedId(null)
    } else {
      setExpandedId(c.id)
      setEditNotes(c.observacoes || '')
    }
  }

  const handleSave = async (consultationId: number) => {
    try {
      await updateNotes({
        data: {
          consultationId,
          notes: editNotes,
        },
      })
      toast.success('Evolução salva!')
      // Update local list
      setConsultations((prev) =>
        prev.map((c) =>
          c.id === consultationId ? { ...c, observacoes: editNotes } : c,
        ),
      )
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar evolução')
    }
  }

  if (loading) return <div>Carregando histórico...</div>
  if (consultations.length === 0) return <div>Nenhuma consulta registrada.</div>

  return (
    <div className="space-y-4">
      {consultations.map((c) => (
        <Card
          key={c.id}
          className={cn(
            'transition-all',
            expandedId === c.id ? 'ring-2 ring-primary' : '',
          )}
        >
          <CardHeader
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => handleExpand(c)}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <CardTitle className="text-lg">
                  {format(new Date(c.dataPrevista), 'dd/MM/yyyy HH:mm')}
                </CardTitle>
                <span
                  className={cn(
                    'text-sm font-medium uppercase w-fit px-2 py-0.5 rounded-full mt-1',
                    c.status === 'realizada'
                      ? 'bg-green-100 text-green-800'
                      : c.status === 'agendada'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800',
                  )}
                >
                  {c.status}
                </span>
              </div>
              <Button variant="ghost" size="icon">
                {expandedId === c.id ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
          </CardHeader>
          {expandedId === c.id && (
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Evolução / Observações da Sessão
                  </label>
                  <RichTextEditor
                    value={editNotes}
                    onChange={setEditNotes}
                    placeholder="Descreva a evolução da sessão..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave(c.id)}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Evolução
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
