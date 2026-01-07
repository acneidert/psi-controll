import * as React from 'react'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  createPatientFn,
  deletePatientFn,
  listPatientsFn,
  updatePatientFn,
} from '@/server/functions/patients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/dashboard/pacientes/')({
  component: PacientesPage,
})

function PacientesPage() {
  const listPatients = useServerFn(listPatientsFn)
  const createPatient = useServerFn(createPatientFn)
  const updatePatient = useServerFn(updatePatientFn)
  const deletePatient = useServerFn(deletePatientFn)

  const [patients, setPatients] = React.useState<Array<any>>([])
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingPatient, setEditingPatient] = React.useState<any>(null)
  const [deleteDialog, setDeleteDialog] = React.useState<{
    isOpen: boolean
    patientId: number | null
  }>({
    isOpen: false,
    patientId: null,
  })

  // Form State
  const [formData, setFormData] = React.useState({
    nomeCompleto: '',
    cpf: '',
    telefone: '',
    email: '',
    dataNascimento: '',
    endereco: '',
    contatoEmergencia: '',
    telefoneEmergencia: '',
    profissao: '',
    estadoCivil: '',
    genero: '',
    observacoes: '',
    responsaveis: [] as Array<{
      nome: string
      cpf: string
      telefone: string
      email: string
      endereco: string
      financeiro: boolean
    }>,
  })

  const loadPatients = React.useCallback(async () => {
    setLoading(true)
    try {
      // @ts-ignore - robust payload handling
      const data = await listPatients({ data: { search } })
      setPatients(data)
    } catch (error) {
      console.error('Error loading patients:', error)
      toast.error('Erro ao carregar pacientes.')
    } finally {
      setLoading(false)
    }
  }, [listPatients, search])

  React.useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPatients()
  }

  const handleOpenDialog = (patient?: any) => {
    if (patient) {
      setEditingPatient(patient)
      setFormData({
        nomeCompleto: patient.nomeCompleto,
        cpf: patient.cpf || '',
        telefone: patient.telefone,
        email: patient.email || '',
        dataNascimento: patient.dataNascimento || '',
        endereco: patient.endereco || '',
        contatoEmergencia: patient.contatoEmergencia || '',
        telefoneEmergencia: patient.telefoneEmergencia || '',
        profissao: patient.profissao || '',
        estadoCivil: patient.estadoCivil || '',
        genero: patient.genero || '',
        observacoes: patient.observacoes || '',
        responsaveis: patient.responsaveis
          ? patient.responsaveis.map((r: any) => ({
              nome: r.nome,
              cpf: r.cpf || '',
              telefone: r.telefone || '',
              email: r.email || '',
              endereco: r.endereco || '',
              financeiro: r.financeiro || false,
            }))
          : [],
      })
    } else {
      setEditingPatient(null)
      setFormData({
        nomeCompleto: '',
        cpf: '',
        telefone: '',
        email: '',
        dataNascimento: '',
        endereco: '',
        contatoEmergencia: '',
        telefoneEmergencia: '',
        profissao: '',
        estadoCivil: '',
        genero: '',
        observacoes: '',
        responsaveis: [],
      })
    }
    setIsDialogOpen(true)
  }

  const addResponsavel = () => {
    setFormData({
      ...formData,
      responsaveis: [
        ...formData.responsaveis,
        {
          nome: '',
          cpf: '',
          telefone: '',
          email: '',
          endereco: '',
          financeiro: formData.responsaveis.length === 0, // First one is default payer
        },
      ],
    })
  }

  const removeResponsavel = (index: number) => {
    const newResponsaveis = [...formData.responsaveis]
    newResponsaveis.splice(index, 1)
    setFormData({ ...formData, responsaveis: newResponsaveis })
  }

  const updateResponsavel = (index: number, field: string, value: any) => {
    const newResponsaveis = [...formData.responsaveis]
    if (field === 'financeiro' && value === true) {
      // Uncheck others if this one is set to true
      newResponsaveis.forEach((r, i) => {
        r.financeiro = i === index
      })
    } else {
      // @ts-ignore
      newResponsaveis[index][field] = value
    }
    setFormData({ ...formData, responsaveis: newResponsaveis })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        cpf: formData.cpf || undefined,
        email: formData.email || undefined,
        dataNascimento: formData.dataNascimento || undefined,
        endereco: formData.endereco || undefined,
        contatoEmergencia: formData.contatoEmergencia || undefined,
        telefoneEmergencia: formData.telefoneEmergencia || undefined,
        profissao: formData.profissao || undefined,
        estadoCivil: formData.estadoCivil || undefined,
        genero: formData.genero || undefined,
        observacoes: formData.observacoes || undefined,
        responsaveis: formData.responsaveis.map((r) => ({
          ...r,
          cpf: r.cpf || undefined,
          email: r.email || undefined,
          endereco: r.endereco || undefined,
          telefone: r.telefone || undefined,
        })),
      }

      if (editingPatient) {
        // @ts-ignore - robust payload handling
        await updatePatient({ data: { id: editingPatient.id, ...payload } })
        toast.success('Paciente atualizado com sucesso!')
      } else {
        // @ts-ignore - robust payload handling
        await createPatient({ data: payload })
        toast.success('Paciente cadastrado com sucesso!')
      }
      setIsDialogOpen(false)
      loadPatients()
    } catch (error: any) {
      console.error('Error saving patient:', error)
      toast.error(error.message || 'Erro ao salvar paciente.')
    }
  }

  const handleDelete = (id: number) => {
    setDeleteDialog({ isOpen: true, patientId: id })
  }

  const executeDelete = async () => {
    if (!deleteDialog.patientId) return
    try {
      // @ts-ignore - robust payload handling
      await deletePatient({ data: { id: deleteDialog.patientId } })
      toast.success('Paciente excluído com sucesso!')
      loadPatients()
      setDeleteDialog({ isOpen: false, patientId: null })
    } catch (error: any) {
      console.error('Error deleting patient:', error)
      toast.error(error.message || 'Erro ao excluir paciente.')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Outlet />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de pacientes da clínica.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listagem</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF..."
                  className="pl-8 w-[300px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum paciente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{patient.nomeCompleto}</span>
                          {patient.dataNascimento && (
                            <span className="text-xs text-muted-foreground">
                              {format(
                                new Date(patient.dataNascimento),
                                'dd/MM/yyyy',
                              )}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {patient.telefone}
                          </div>
                          {patient.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{patient.cpf || '-'}</TableCell>
                      <TableCell>
                        {patient.dataCadastro
                          ? format(
                              new Date(patient.dataCadastro),
                              'dd/MM/yyyy',
                              { locale: ptBR },
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/pacientes/${patient.id as number}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                Prontuário
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(patient)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(patient.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="responsaveis">Responsáveis Legais</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="py-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nomeCompleto}
                    onChange={(e) =>
                      setFormData({ ...formData, nomeCompleto: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nascimento">Data de Nascimento</Label>
                    <Input
                      id="nascimento"
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataNascimento: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                      required
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) =>
                      setFormData({ ...formData, endereco: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contatoEmergencia">
                      Contato de Emergência
                    </Label>
                    <Input
                      id="contatoEmergencia"
                      value={formData.contatoEmergencia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contatoEmergencia: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefoneEmergencia">Tel. Emergência</Label>
                    <Input
                      id="telefoneEmergencia"
                      value={formData.telefoneEmergencia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefoneEmergencia: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input
                      id="profissao"
                      value={formData.profissao}
                      onChange={(e) =>
                        setFormData({ ...formData, profissao: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estadoCivil">Estado Civil</Label>
                    <Input
                      id="estadoCivil"
                      value={formData.estadoCivil}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estadoCivil: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="genero">Gênero/Sexo</Label>
                    <Input
                      id="genero"
                      value={formData.genero}
                      onChange={(e) =>
                        setFormData({ ...formData, genero: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    placeholder="Histórico, queixas iniciais ou outras observações..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="responsaveis" className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Responsáveis Legais</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addResponsavel}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                {formData.responsaveis.map((responsavel, index) => (
                  <div
                    key={index}
                    className="rounded-md border p-4 space-y-4 bg-muted/20"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-medium">
                        Responsável {index + 1}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeResponsavel(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Nome *</Label>
                        <Input
                          value={responsavel.nome}
                          onChange={(e) =>
                            updateResponsavel(index, 'nome', e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>CPF</Label>
                        <Input
                          value={responsavel.cpf}
                          onChange={(e) =>
                            updateResponsavel(index, 'cpf', e.target.value)
                          }
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Telefone</Label>
                        <Input
                          value={responsavel.telefone}
                          onChange={(e) =>
                            updateResponsavel(index, 'telefone', e.target.value)
                          }
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input
                          value={responsavel.email}
                          onChange={(e) =>
                            updateResponsavel(index, 'email', e.target.value)
                          }
                          type="email"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Endereço</Label>
                      <Input
                        value={responsavel.endereco}
                        onChange={(e) =>
                          updateResponsavel(index, 'endereco', e.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`financeiro-${index}`}
                        checked={responsavel.financeiro}
                        onChange={(e) =>
                          updateResponsavel(
                            index,
                            'financeiro',
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label
                        htmlFor={`financeiro-${index}`}
                        className="cursor-pointer"
                      >
                        Responsável Financeiro (Pagador)
                      </Label>
                    </div>
                  </div>
                ))}
                {formData.responsaveis.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum responsável adicionado.
                  </p>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingPatient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Paciente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Tem certeza que deseja excluir este paciente? Esta ação não pode ser
              desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
