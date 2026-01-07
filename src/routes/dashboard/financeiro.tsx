import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  getAllPendingConsultationsFn,
  createBatchInvoicesFn,
  getAllOpenInvoicesFn,
  payInvoiceFn,
  getPaidInvoicesFn,
} from '@/server/functions/billing'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Loader2,
  Banknote,
  Calendar,
  Printer,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/dashboard/financeiro')({
  component: FinanceiroPage,
})

function FinanceiroPage() {
  const getAllPending = useServerFn(getAllPendingConsultationsFn)
  const createBatch = useServerFn(createBatchInvoicesFn)
  const getAllOpen = useServerFn(getAllOpenInvoicesFn)
  const payInvoice = useServerFn(payInvoiceFn)
  const getPaidInvoices = useServerFn(getPaidInvoicesFn)

  // Pending State
  const [items, setItems] = React.useState<any[]>([])
  const [loadingPending, setLoadingPending] = React.useState(true)
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isBatchDialogOpen, setIsBatchDialogOpen] = React.useState(false)
  const [batchDueDate, setBatchDueDate] = React.useState(
    new Date().toISOString().split('T')[0],
  )
  const [processingBatch, setProcessingBatch] = React.useState(false)

  // Open Invoices State
  const [openInvoices, setOpenInvoices] = React.useState<any[]>([])
  const [loadingOpen, setLoadingOpen] = React.useState(true)

  // Paid Invoices State
  const [paidInvoices, setPaidInvoices] = React.useState<any[]>([])
  const [loadingPaid, setLoadingPaid] = React.useState(true)
  const [paidPage, setPaidPage] = React.useState(1)
  const [paidTotalPages, setPaidTotalPages] = React.useState(1)
  const [paidTotal, setPaidTotal] = React.useState(0)

  // Pay Dialog State
  const [isPayDialogOpen, setIsPayDialogOpen] = React.useState(false)
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = React.useState<any>(
    null,
  )
  const [payAmount, setPayAmount] = React.useState('')
  const [payMethod, setPayMethod] = React.useState('pix')
  const [payDate, setPayDate] = React.useState(
    new Date().toISOString().split('T')[0],
  )
  const [payNotes, setPayNotes] = React.useState('')
  const [processingPay, setProcessingPay] = React.useState(false)

  const loadPendingData = React.useCallback(async () => {
    setLoadingPending(true)
    try {
      const data = await getAllPending()
      setItems(data)
    } catch (err) {
      toast.error('Erro ao carregar consultas pendentes')
    } finally {
      setLoadingPending(false)
    }
  }, [getAllPending])

  const loadOpenInvoicesData = React.useCallback(async () => {
    setLoadingOpen(true)
    try {
      const data = await getAllOpen()
      setOpenInvoices(data)
    } catch (err) {
      toast.error('Erro ao carregar faturas em aberto')
    } finally {
      setLoadingOpen(false)
    }
  }, [getAllOpen])

  const loadPaidInvoicesData = React.useCallback(
    async (page: number) => {
      setLoadingPaid(true)
      try {
        const result = await getPaidInvoices({ data: { page, limit: 10 } })
        setPaidInvoices(result.data)
        setPaidTotalPages(result.totalPages)
        setPaidTotal(result.total)
        setPaidPage(result.page)
      } catch (err) {
        toast.error('Erro ao carregar faturas pagas')
      } finally {
        setLoadingPaid(false)
      }
    },
    [getPaidInvoices],
  )

  React.useEffect(() => {
    loadPendingData()
    loadOpenInvoicesData()
    loadPaidInvoicesData(1)
  }, [loadPendingData, loadOpenInvoicesData, loadPaidInvoicesData])

  // --- Pending Logic ---
  const groupedItems = React.useMemo(() => {
    const filtered = items.filter((item) =>
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const groups: Record<
      number,
      { name: string; items: any[]; total: number }
    > = {}

    filtered.forEach((item) => {
      if (!groups[item.patientId]) {
        groups[item.patientId] = {
          name: item.patientName,
          items: [],
          total: 0,
        }
      }
      groups[item.patientId].items.push(item)
      groups[item.patientId].total += Number(item.valor)
    })

    return Object.entries(groups)
      .map(([id, group]) => ({
        patientId: Number(id),
        ...group,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, searchTerm])

  const handleToggleItem = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleTogglePatient = (patientId: number, patientItems: any[]) => {
    const newSet = new Set(selectedIds)
    const allSelected = patientItems.every((i) => newSet.has(i.id))

    if (allSelected) {
      patientItems.forEach((i) => newSet.delete(i.id))
    } else {
      patientItems.forEach((i) => newSet.add(i.id))
    }
    setSelectedIds(newSet)
  }

  const handleBatchInvoice = async () => {
    setProcessingBatch(true)
    try {
      const invoicesToCreate: any[] = []
      const selectedItemsList = items.filter((i) => selectedIds.has(i.id))
      const byPatient: Record<number, number[]> = {}

      selectedItemsList.forEach((i) => {
        if (!byPatient[i.patientId]) byPatient[i.patientId] = []
        byPatient[i.patientId].push(i.id)
      })

      Object.entries(byPatient).forEach(([pId, ids]) => {
        invoicesToCreate.push({
          patientId: Number(pId),
          consultationIds: ids,
          dueDate: batchDueDate,
        })
      })

      const { results, errors } = await createBatch({
        data: { invoices: invoicesToCreate },
      })

      if (errors.length > 0) {
        toast.error(`Erro ao gerar ${errors.length} faturas.`)
        console.error(errors)
      }

      if (results.length > 0) {
        toast.success(`${results.length} faturas geradas com sucesso!`)
      }

      setIsBatchDialogOpen(false)
      setSelectedIds(new Set())
      loadPendingData()
      loadOpenInvoicesData() // Refresh open invoices too
    } catch (error) {
      toast.error('Erro ao processar faturas')
      console.error(error)
    } finally {
      setProcessingBatch(false)
    }
  }

  const totalSelected = items
    .filter((i) => selectedIds.has(i.id))
    .reduce((acc, i) => acc + Number(i.valor), 0)
  const countSelected = selectedIds.size

  // --- Pay Logic ---
  const handlePayClick = (inv: any) => {
    setSelectedInvoiceToPay(inv)
    setPayAmount(inv.valorTotal) // Default to full amount
    setPayMethod('pix')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayNotes('')
    setIsPayDialogOpen(true)
  }

  const handleConfirmPay = async () => {
    if (!selectedInvoiceToPay) return
    setProcessingPay(true)
    try {
      await payInvoice({
        data: {
          invoiceId: selectedInvoiceToPay.id,
          amount: Number(payAmount),
          date: payDate,
          method: payMethod,
          notes: payNotes,
        },
      })
      toast.success('Pagamento registrado com sucesso!')
      setIsPayDialogOpen(false)
      loadOpenInvoicesData()
      loadPaidInvoicesData(1) // Refresh paid list
    } catch (e) {
      toast.error('Erro ao registrar pagamento')
      console.error(e)
    } finally {
      setProcessingPay(false)
    }
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Banknote className="h-8 w-8" />
        Financeiro
      </h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="pending">A Faturar</TabsTrigger>
          <TabsTrigger value="open">Em Aberto</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
        </TabsList>

        {/* --- Pending Tab --- */}
        <TabsContent value="pending" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Consultas Pendentes</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
              >
                Limpar Seleção
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedIds(new Set(items.map((i) => i.id)))}
              >
                Selecionar Tudo
              </Button>
            </div>
          </div>

          <div className="max-w-md">
            <Input
              placeholder="Filtrar por paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loadingPending ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : groupedItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma consulta pendente encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedItems.map((group) => (
                <Card key={group.patientId}>
                  <CardHeader className="py-4 bg-muted/30">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={group.items.every((i) =>
                          selectedIds.has(i.id),
                        )}
                        onChange={() =>
                          handleTogglePatient(group.patientId, group.items)
                        }
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {group.items.length} consultas pendentes
                          </p>
                        </div>
                        <div className="font-semibold text-lg">
                          R$ {group.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="divide-y">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="py-3 flex items-center gap-4 pl-9"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleToggleItem(item.id)}
                          />
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(
                                  new Date(item.data),
                                  'dd/MM/yyyy HH:mm',
                                )}
                              </span>
                            </div>
                            <div className="capitalize text-sm bg-gray-100 px-2 py-1 rounded w-fit">
                              {item.status}
                            </div>
                            <div className="text-right font-medium">
                              R$ {Number(item.valor).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Floating Action Bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-4 rounded-full shadow-xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in">
              <div className="flex flex-col">
                <span className="font-bold">
                  {countSelected} itens selecionados
                </span>
                <span className="text-sm opacity-90">
                  Total: R$ {totalSelected.toFixed(2)}
                </span>
              </div>
              <Button
                onClick={() => setIsBatchDialogOpen(true)}
                size="lg"
                className="rounded-full"
              >
                Gerar Faturas
              </Button>
            </div>
          )}
        </TabsContent>

        {/* --- Open Invoices Tab --- */}
        <TabsContent value="open" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas Aguardando Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOpen ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="animate-spin" />
                </div>
              ) : openInvoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma fatura em aberto.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fatura #</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">#{inv.id}</TableCell>
                        <TableCell>
                          {inv.paciente?.nomeCompleto || 'Desconhecido'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(inv.dataEmissao), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              new Date(inv.dataVencimento) < new Date()
                                ? 'text-red-500 font-bold'
                                : ''
                            }
                          >
                            {format(
                              new Date(inv.dataVencimento),
                              'dd/MM/yyyy',
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          R$ {Number(inv.valorTotal).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Imprimir"
                              onClick={() =>
                                window.open(
                                  `/print/invoice/${inv.id}`,
                                  '_blank',
                                )
                              }
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePayClick(inv)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pagar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Paid Invoices Tab --- */}
        <TabsContent value="paid" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Histórico de Faturas Pagas</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Total: {paidTotal}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPaid ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="animate-spin" />
                </div>
              ) : paidInvoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma fatura paga encontrada.
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fatura #</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidInvoices.map((inv) => {
                        const lastPayment =
                          inv.pagamentos && inv.pagamentos.length > 0
                            ? inv.pagamentos[inv.pagamentos.length - 1]
                            : null
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              #{inv.id}
                            </TableCell>
                            <TableCell>
                              {inv.paciente?.nomeCompleto || 'Desconhecido'}
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(inv.dataVencimento),
                                'dd/MM/yyyy',
                              )}
                            </TableCell>
                            <TableCell>
                              {lastPayment
                                ? format(
                                    new Date(lastPayment.dataPagamento),
                                    'dd/MM/yyyy',
                                  )
                                : '-'}
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              R$ {Number(inv.valorTotal).toFixed(2)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {lastPayment?.formaPagamento?.replace('_', ' ') ||
                                '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Imprimir Recibo"
                                onClick={() =>
                                  window.open(
                                    `/print/receipt/${inv.id}`,
                                    '_blank',
                                  )
                                }
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPaidInvoicesData(paidPage - 1)}
                      disabled={paidPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="text-sm font-medium">
                      Página {paidPage} de {paidTotalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPaidInvoicesData(paidPage + 1)}
                      disabled={paidPage >= paidTotalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Invoice Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Faturas em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Você está prestes a gerar faturas para {countSelected} consultas
              de{' '}
              {
                new Set(
                  items
                    .filter((i) => selectedIds.has(i.id))
                    .map((i) => i.patientId),
                ).size
              }{' '}
              pacientes.
            </p>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={batchDueDate}
                onChange={(e) => setBatchDueDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esta data será aplicada a todas as faturas geradas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBatchDialogOpen(false)}
              disabled={processingBatch}
            >
              Cancelar
            </Button>
            <Button onClick={handleBatchInvoice} disabled={processingBatch}>
              {processingBatch && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar e Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Invoice Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar Pagamento - Fatura #{selectedInvoiceToPay?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Pago (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPayDialogOpen(false)}
              disabled={processingPay}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmPay} disabled={processingPay}>
              {processingPay && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
