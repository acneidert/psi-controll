import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInvoiceFn } from '@/server/functions/billing'

export const Route = createFileRoute('/print/receipt/$invoiceId')({
  component: ReceiptPrint,
})

function ReceiptPrint() {
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

  if (loading) return <div className="p-8">Carregando recibo...</div>
  if (!invoice) return <div className="p-8">Fatura não encontrada.</div>

  const { config, paciente, pagamentos } = invoice
  const lastPayment =
    pagamentos && pagamentos.length > 0
      ? pagamentos[pagamentos.length - 1]
      : null

  if (!lastPayment)
    return (
      <div className="p-8">Esta fatura ainda não possui pagamentos registrados.</div>
    )

  const responsavelFinanceiro = paciente.responsaveis?.find(
    (r: any) => r.financeiro,
  )

  const pagador = responsavelFinanceiro
    ? {
        nome: responsavelFinanceiro.nome,
        cpf: responsavelFinanceiro.cpf,
      }
    : {
        nome: paciente.nomeCompleto,
        cpf: paciente.cpf,
      }

  return (
    <div className="min-h-screen bg-white p-8 print:p-0 text-black font-serif">
      <div className="mx-auto max-w-[210mm] border-2 border-black p-12 print:max-w-none print:border-none print:p-0">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-6 mb-6">
            Recibo de Pagamento
          </h1>
          <h2 className="text-2xl font-semibold">
            {config?.nomePsicologo || 'Psicólogo'}
          </h2>
          <p className="text-base mt-2">CRP: {config?.crp || '-'}</p>
        </div>

        {/* Amount */}
        <div className="mb-12 bg-gray-100 p-6 rounded-lg flex justify-between items-center print:bg-transparent print:border print:border-gray-300">
          <span className="font-bold text-xl">VALOR PAGO:</span>
          <span className="text-4xl font-bold">
            R$ {Number(lastPayment.valorPago).toFixed(2)}
          </span>
        </div>

        {/* Declaration */}
        <div className="space-y-8 text-xl leading-loose text-justify mb-16">
          <p>
            Recebi(emos) de <strong>{pagador.nome}</strong>, CPF nº{' '}
            <strong>{pagador.cpf || '...'}</strong>, a importância de{' '}
            <strong>R$ {Number(lastPayment.valorPago).toFixed(2)}</strong>,
            referente ao pagamento da Fatura #{invoice.id} pelos serviços de
            psicologia prestados
            {responsavelFinanceiro ? (
              <>
                {' '}
                ao paciente <strong>{paciente.nomeCompleto}</strong>
              </>
            ) : (
              '.'
            )}
          </p>
          <p>Para maior clareza, firmo(amos) o presente recibo.</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-8 mb-24 text-base">
          <div>
            <span className="font-bold block mb-1">Forma de Pagamento:</span>
            <span className="capitalize">{lastPayment.formaPagamento?.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="font-bold block mb-1">Data do Pagamento:</span>
            <span>{format(new Date(lastPayment.dataPagamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
           {lastPayment.observacoes && (
            <div className="col-span-2">
               <span className="font-bold block mb-1">Observações:</span>
               <span>{lastPayment.observacoes}</span>
            </div>
           )}
        </div>

        {/* Signature */}
        <div className="mt-32 text-center">
          <div className="inline-block border-t border-black px-16 pt-4">
            <p className="font-bold text-lg">{config?.nomePsicologo}</p>
            <p className="text-base text-gray-600">Assinatura</p>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-8 w-full left-0 text-center text-sm text-gray-400 print:relative print:bottom-auto print:mt-16">
            <p>{config?.contatoClinica}</p>
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
