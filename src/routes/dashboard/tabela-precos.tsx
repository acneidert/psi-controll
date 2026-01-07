import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import { DollarSign, History, Plus } from 'lucide-react'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addPriceFn,
  createCategoryFn,
  getPriceHistoryFn,
  listCategoriesFn,
  updateCategoryFn,
} from '@/server/functions/pricing'

export const Route = createFileRoute('/dashboard/tabela-precos')({
  component: PricingPage,
})

function PricingPage() {
  const listCategories = useServerFn(listCategoriesFn)
  const createCategory = useServerFn(createCategoryFn)
  const updateCategory = useServerFn(updateCategoryFn)

  const [categories, setCategories] = React.useState<Array<any>>([])
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<any>(null)
  const [categoryForm, setCategoryForm] = React.useState({
    nome: '',
    descricao: '',
  })

  const loadCategories = React.useCallback(async () => {
    try {
      const data = await listCategories()
      setCategories(data)
    } catch (error) {
      toast.error('Erro ao carregar categorias.')
    }
  }, [listCategories])

  React.useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await updateCategory({
          data: { id: editingCategory.id, ...categoryForm },
        })
        toast.success('Categoria atualizada!')
      } else {
        await createCategory({ data: categoryForm })
        toast.success('Categoria criada!')
      }
      setIsCategoryDialogOpen(false)
      loadCategories()
    } catch (error: any) {
      toast.error('Erro ao salvar categoria.')
    }
  }

  const openCategoryDialog = (category?: any) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        nome: category.nome,
        descricao: category.descricao || '',
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({ nome: '', descricao: '' })
    }
    setIsCategoryDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Tabela de Preços</h1>
        <Button onClick={() => openCategoryDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <PricingCategoryCard
            key={category.id}
            category={category}
            onEdit={() => openCategoryDialog(category)}
          />
        ))}
      </div>

      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={categoryForm.nome}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={categoryForm.descricao}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      descricao: e.target.value,
                    })
                  }
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
  )
}

function PricingCategoryCard({
  category,
  onEdit,
}: {
  category: any
  onEdit: () => void
}) {
  const getHistory = useServerFn(getPriceHistoryFn)
  const addPrice = useServerFn(addPriceFn)

  const [prices, setPrices] = React.useState<Array<any>>([])
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false)
  const [isAddPriceOpen, setIsAddPriceOpen] = React.useState(false)
  const [newPriceForm, setNewPriceForm] = React.useState({
    valor: '',
    dataInicio: '',
  })

  const loadHistory = React.useCallback(async () => {
    const data = await getHistory({ data: { categoriaId: category.id } })
    setPrices(data)
  }, [category.id, getHistory])

  React.useEffect(() => {
    if (isHistoryOpen || isAddPriceOpen) {
      loadHistory()
    }
  }, [isHistoryOpen, isAddPriceOpen, loadHistory])

  // Initial load for current price
  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const currentPrice = prices.find((p) => {
    const now = new Date().toISOString().split('T')[0]
    // dataInicio <= now AND (dataFim is null OR dataFim >= now)
    return p.dataInicio <= now && (!p.dataFim || p.dataFim >= now)
  })

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addPrice({
        data: {
          categoriaId: category.id,
          valor: parseFloat(newPriceForm.valor),
          dataInicio: newPriceForm.dataInicio,
        },
      })
      toast.success('Novo preço adicionado!')
      setIsAddPriceOpen(false)
      setNewPriceForm({ valor: '', dataInicio: '' })
      loadHistory()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar preço.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            {category.nome}
          </CardTitle>
          <CardDescription>{category.descricao}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {currentPrice
            ? `R$ ${parseFloat(currentPrice.valor).toFixed(2)}`
            : 'Sem preço definido'}
        </div>
        {currentPrice && (
          <p className="text-xs text-muted-foreground mt-1">
            Vigência desde{' '}
            {format(new Date(currentPrice.dataInicio), 'dd/MM/yyyy')}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsAddPriceOpen(true)}
          >
            <DollarSign className="mr-2 h-4 w-4" /> Novo Valor
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsHistoryOpen(true)}
          >
            <History className="mr-2 h-4 w-4" /> Histórico
          </Button>
        </div>

        {/* Add Price Dialog */}
        <Dialog open={isAddPriceOpen} onOpenChange={setIsAddPriceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Valor - {category.nome}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPrice}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={newPriceForm.valor}
                    onChange={(e) =>
                      setNewPriceForm({
                        ...newPriceForm,
                        valor: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dataInicio">Início da Vigência</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={newPriceForm.dataInicio}
                    onChange={(e) =>
                      setNewPriceForm({
                        ...newPriceForm,
                        dataInicio: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Adicionar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Histórico de Preços - {category.nome}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((price) => {
                    const isActive = price.id === currentPrice?.id
                    return (
                      <TableRow
                        key={price.id}
                        className={isActive ? 'bg-muted/50' : ''}
                      >
                        <TableCell className="font-medium">
                          R$ {parseFloat(price.valor).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(price.dataInicio), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {price.dataFim
                            ? format(new Date(price.dataFim), 'dd/MM/yyyy')
                            : 'Atual'}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                              Vigente
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Histórico
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
