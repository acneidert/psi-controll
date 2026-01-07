import * as React from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Printer } from 'lucide-react'
import {
  getPendingConsultationsFn,
  createInvoiceFn,
  getInvoicesFn,
} from '@/server/functions/billing'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export function BillingTab({ patientId }: { patientId: number }) {
  const getPending = useServerFn(getPendingConsultationsFn)
  const getInvoices = useServerFn(getInvoicesFn)
  const createInvoice = useServerFn(createInvoiceFn)

  const [pending, setPending] = React.useState<any[]>([])
  const [invoices, setInvoices] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [dueDate, setDueDate] = React.useState(
    new Date().toISOString().split('T')[0],
  )
  const [discount, setDiscount] = React.useState(0)
  const [creating, setCreating] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [p, i] = await Promise.all([
        getPending({ data: { patientId } }),
        getInvoices({ data: { patientId } }),
      ])
      setPending(p)
      setInvoices(i)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [patientId, getPending, getInvoices])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleCreateInvoice = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos uma consulta')
      return
    }
    if (!dueDate) {
      toast.error('Informe a data de vencimento')
      return
    }

    setCreating(true)
    try {
      await createInvoice({
        data: {
          patientId,
          consultationIds: selectedIds,
          dueDate,
          discount,
        },
      })
      toast.success('Fatura gerada com sucesso!')
      setSelectedIds([])
      setDiscount(0)
      loadData()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao gerar fatura')
    } finally {
      setCreating(false)
    }
  }

  const selectedTotal = React.useMemo(() => {
    return pending
      .filter((c) => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + Number(c.valor), 0)
  }, [pending, selectedIds])

  const finalTotal = Math.max(0, selectedTotal - discount)

  if (loading) return <div>Carregando financeiro...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerar Nova Fatura</CardTitle>
          <CardDescription>
            Selecione as consultas pendentes para faturar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma consulta pendente de faturamento.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={
                          selectedIds.length === pending.length &&
                          pending.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(pending.map((c) => c.id))
                          } else {
                            setSelectedIds([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => handleSelect(c.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(c.data), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="capitalize">{c.status}</TableCell>
                      <TableCell className="text-right">
                        R$ {Number(c.valor).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col md:flex-row items-end justify-between gap-4 pt-4 border-t">
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Vencimento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="discount">Desconto (R$)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Subtotal: R$ {selectedTotal.toFixed(2)}
                  </div>
                  <div className="text-sm text-red-500">
                    Desconto: - R$ {discount.toFixed(2)}
                  </div>
                  <div className="text-xl font-bold">
                    Total: R$ {finalTotal.toFixed(2)}
                  </div>
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={creating || selectedIds.length === 0}
                    className="w-full mt-2"
                  >
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerar Fatura
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma fatura gerada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>#{inv.id}</TableCell>
                    <TableCell>
                      {format(new Date(inv.dataEmissao), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {inv.dataVencimento
                        ? format(new Date(inv.dataVencimento), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>{inv.itens.length} consultas</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(inv.valorTotal).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'paga'
                            ? 'bg-green-100 text-green-800'
                            : inv.status === 'cancelada'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(`/print/invoice/${inv.id}`, '_blank')
                        }
                        title="Imprimir Fatura"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
