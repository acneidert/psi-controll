import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { DollarSign, Plus, Save } from 'lucide-react'
import { toast } from 'sonner' // Assuming sonner is available or we can use a simple alert fallback
import {
  addPriceFn,
  createCategoryFn,
  getPriceHistoryFn,
  listCategoriesFn,
} from '@/server/functions/pricing'
import { getSettingsFn, updateSettingsFn } from '@/server/functions/settings'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, parseISO } from 'date-fns'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const getCategories = useServerFn(listCategoriesFn)
  const createCategory = useServerFn(createCategoryFn)
  const getPriceHistory = useServerFn(getPriceHistoryFn)
  const addPrice = useServerFn(addPriceFn)

  const getSettings = useServerFn(getSettingsFn)
  const updateSettings = useServerFn(updateSettingsFn)

  // General Settings State
  const [settings, setSettings] = React.useState({
    nomePsicologo: '',
    crp: '',
    contatoClinica: '',
  })
  const [loadingSettings, setLoadingSettings] = React.useState(true)

  // Financial Settings State
  const [categories, setCategories] = React.useState<Array<any>>([])
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null)
  const [priceHistory, setPriceHistory] = React.useState<Array<any>>([])

  // Dialog states
  const [isCatDialogOpen, setIsCatDialogOpen] = React.useState(false)
  const [isPriceDialogOpen, setIsPriceDialogOpen] = React.useState(false)

  // Form states
  const [newCatName, setNewCatName] = React.useState('')
  const [newCatDesc, setNewCatDesc] = React.useState('')
  const [newPriceVal, setNewPriceVal] = React.useState('')
  const [newPriceDate, setNewPriceDate] = React.useState(
    new Date().toISOString().split('T')[0],
  )

  // --- Loaders ---
  const loadSettings = React.useCallback(async () => {
    try {
      const data = await getSettings()
      setSettings({
        nomePsicologo: data.nomePsicologo || '',
        crp: data.crp || '',
        contatoClinica: data.contatoClinica || '',
      })
    } catch (e) {
      console.error('Failed to load settings', e)
    } finally {
      setLoadingSettings(false)
    }
  }, [getSettings])

  const loadCategories = React.useCallback(async () => {
    try {
      const data = await getCategories()
      setCategories(data)
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0])
      }
    } catch (e) {
      console.error(e)
    }
  }, [getCategories, selectedCategory])

  const loadHistory = React.useCallback(async () => {
    if (!selectedCategory) return
    try {
      const data = await getPriceHistory({
        data: { categoriaId: selectedCategory.id },
      })
      setPriceHistory(data)
    } catch (e) {
      console.error(e)
    }
  }, [getPriceHistory, selectedCategory])

  // --- Effects ---
  React.useEffect(() => {
    loadSettings()
    loadCategories()
  }, [])

  React.useEffect(() => {
    loadHistory()
  }, [selectedCategory, isPriceDialogOpen])

  // --- Handlers ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Sending settings:', settings)
    try {
      // @ts-ignore - robust payload handling
      await updateSettings({ data: settings })
      toast.success('Configurações salvas com sucesso!')
    } catch (err) {
      console.error('Failed to save settings', err)
      toast.error('Erro ao salvar configurações.')
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    await createCategory({ data: { nome: newCatName, descricao: newCatDesc } })
    setIsCatDialogOpen(false)
    setNewCatName('')
    setNewCatDesc('')
    loadCategories()
  }

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    await addPrice({
      data: {
        categoriaId: selectedCategory.id,
        valor: Number(newPriceVal),
        dataInicio: newPriceDate,
      },
    })
    setIsPriceDialogOpen(false)
    setNewPriceVal('')
    loadHistory()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie dados da clínica e parâmetros financeiros.
          </p>
        </div>
      </div>

      <Tabs defaultValue="institutional" className="space-y-4">
        <TabsList>
          <TabsTrigger value="institutional">Dados Institucionais</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="institutional">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Clínica</CardTitle>
              <CardDescription>
                Estes dados serão utilizados em relatórios e impressos.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveSettings}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nomePsicologo">
                    Nome do Profissional / Clínica
                  </Label>
                  <Input
                    id="nomePsicologo"
                    value={settings.nomePsicologo}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        nomePsicologo: e.target.value,
                      })
                    }
                    placeholder="Ex: Dr. João Silva"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="crp">CRP / Documento</Label>
                    <Input
                      id="crp"
                      value={settings.crp}
                      onChange={(e) =>
                        setSettings({ ...settings, crp: e.target.value })
                      }
                      placeholder="Ex: 06/12345"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contato">Telefone / Contato</Label>
                    <Input
                      id="contato"
                      value={settings.contatoClinica}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contatoClinica: e.target.value,
                        })
                      }
                      placeholder="Ex: (11) 99999-9999"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loadingSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Categories Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Categorias</CardTitle>
                  <CardDescription>
                    Tipos de atendimento disponíveis
                  </CardDescription>
                </div>
                <Dialog
                  open={isCatDialogOpen}
                  onOpenChange={setIsCatDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Nova
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Categoria</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCategory} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          value={newCatDesc}
                          onChange={(e) => setNewCatDesc(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Salvar
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 ${selectedCategory?.id === cat.id ? 'bg-muted border-primary' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <div>
                        <p className="font-medium">{cat.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {cat.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma categoria encontrada.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price History Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Histórico de Preços</CardTitle>
                  <CardDescription>
                    {selectedCategory
                      ? `Preços para ${selectedCategory.nome}`
                      : 'Selecione uma categoria'}
                  </CardDescription>
                </div>
                {selectedCategory && (
                  <Dialog
                    open={isPriceDialogOpen}
                    onOpenChange={setIsPriceDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <DollarSign className="mr-2 h-4 w-4" /> Novo Preço
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Preço</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddPrice} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newPriceVal}
                            onChange={(e) => setNewPriceVal(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data de Vigência</Label>
                          <Input
                            type="date"
                            value={newPriceDate}
                            onChange={(e) => setNewPriceDate(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Adicionar
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Vigência</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell>
                          De {' ' + format(
                            parseISO(price.dataInicio),
                            'dd/MM/yyyy',
                          )+' ' }
                          Até{' '}
                          {price.dataFim ? format(
                            parseISO(price.dataFim),
                            'dd/MM/yyyy',
                          ) : 'Agora'}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(price.valor))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {priceHistory.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center text-muted-foreground"
                        >
                          Nenhum histórico encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
