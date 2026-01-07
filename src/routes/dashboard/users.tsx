import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Plus, Search, User } from 'lucide-react'
import * as React from 'react'
import { createPatientFn, listPatientsFn } from '@/server/functions/patients'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/dashboard/users')({
  component: UsersPage,
})

function UsersPage() {
  const [patients, setPatients] = React.useState<Array<any>>([])
  const [search, setSearch] = React.useState('')
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [newPatient, setNewPatient] = React.useState({
    nomeCompleto: '',
    telefone: '',
    email: '',
  })

  const getPatients = useServerFn(listPatientsFn)
  const createPatient = useServerFn(createPatientFn)

  const fetchPatients = () => {
    // @ts-ignore - robust payload handling
    getPatients({ data: { search: '' } }).then(setPatients)
  }

  React.useEffect(() => {
    fetchPatients()
  }, [])

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    // @ts-ignore - robust payload handling
    await createPatient({
      data: {
        nomeCompleto: newPatient.nomeCompleto,
        telefone: newPatient.telefone,
        email: newPatient.email,
      },
    })
    setIsDialogOpen(false)
    setNewPatient({ nomeCompleto: '', telefone: '', email: '' })
    fetchPatients() // Refresh list
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Pacientes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreatePatient}>
              <DialogHeader>
                <DialogTitle>Novo Paciente</DialogTitle>
                <DialogDescription>
                  Adicione os dados básicos do paciente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={newPatient.nomeCompleto}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        nomeCompleto: e.target.value,
                      })
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={newPatient.telefone}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, telefone: e.target.value })
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPatient.email}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, email: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map((patient) => (
          <Card
            key={patient.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-base">
                  {patient.nomeCompleto}
                </CardTitle>
                <CardDescription>
                  {patient.email || 'Sem email'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center justify-between py-1">
                  <span>Telefone:</span>
                  <span className="font-medium text-foreground">
                    {patient.telefone}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Status:</span>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Ativo
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
