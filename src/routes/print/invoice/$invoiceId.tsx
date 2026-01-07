import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getInvoiceFn } from '@/server/functions/billing'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export const Route = createFileRoute('/print/invoice/$invoiceId')({
  component: InvoicePrint,
})

function InvoicePrint() {
  const { invoiceId } = Route.useParams()
  const getInvoice = useServerFn(getInvoiceFn)
  const [invoice, setInvoice] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getInvoice({ data: { invoiceId: Number(invoiceId) } })
      .then(setInvoice)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [invoiceId, getInvoice])

  if (loading) return <div className="p-8">Carregando fatura...</div>
  if (!invoice) return <div className="p-8">Fatura não encontrada.</div>

  const { config, paciente, itens } = invoice

  return (
    <div className="min-h-screen bg-white p-8 print:p-0 text-black">
      <div className="mx-auto max-w-[210mm] space-y-8 print:max-w-none">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold">{config?.nomePsicologo || 'Psicólogo'}</h1>
            <p className="text-sm text-gray-600">CRP: {config?.crp || '-'}</p>
            <p className="text-sm text-gray-600">{config?.contatoClinica || '-'}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">FATURA #{invoice.id}</h2>
            <p className="text-sm text-gray-600">
              Emissão: {format(new Date(invoice.dataEmissao), 'dd/MM/yyyy')}
            </p>
            {invoice.dataVencimento && (
              <p className="text-sm text-gray-600">
                Vencimento: {format(new Date(invoice.dataVencimento), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Paciente</h3>
            <p>{paciente.nomeCompleto}</p>
            <p className="text-sm text-gray-600">CPF: {paciente.cpf || '-'}</p>
            <p className="text-sm text-gray-600">{paciente.endereco || '-'}</p>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-semibold">Descrição</th>
              <th className="text-left py-2 font-semibold">Data</th>
              <th className="text-right py-2 font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">Consulta Psicológica</td>
                <td className="py-2">
                  {format(new Date(item.consulta.dataPrevista), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="text-right py-2">
                  R$ {Number(item.valorItem).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-48 space-y-2">
             <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {(Number(invoice.valorTotal) + Number(invoice.desconto)).toFixed(2)}</span>
            </div>
            {Number(invoice.desconto) > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Desconto:</span>
                <span>- R$ {Number(invoice.desconto).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>R$ {Number(invoice.valorTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Observations */}
        {invoice.observacoes && (
          <div className="pt-4 border-t mt-8">
            <h4 className="font-semibold mb-1 text-sm">Observações</h4>
            <p className="text-sm text-gray-600">{invoice.observacoes}</p>
          </div>
        )}
        
        {/* Footer */}
        <div className="pt-8 text-center text-xs text-gray-400 mt-12">
            <p>Documento gerado eletronicamente em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>

      {/* Print Button (Screen only) */}
      <div className="fixed bottom-8 right-8 print:hidden">
        <Button onClick={() => window.print()} size="lg" className="shadow-lg">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </div>
  )
}
