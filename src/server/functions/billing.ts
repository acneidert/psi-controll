import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { BillingService } from '../services/billing'

const getPendingConsultationsSchema = z.object({
  patientId: z.number(),
})

export const getPendingConsultationsFn = createServerFn({
  method: 'GET',
})
  .inputValidator(getPendingConsultationsSchema)
  .handler(async ({ data }) => {
    return await BillingService.getPendingConsultations(data.patientId)
  })

const createInvoiceSchema = z.object({
  patientId: z.number(),
  consultationIds: z.array(z.number()),
  dueDate: z.string().transform((val) => new Date(val)),
  discount: z.number().optional(),
  observations: z.string().optional(),
})

export const createInvoiceFn = createServerFn({
  method: 'POST',
})
  .inputValidator(createInvoiceSchema)
  .handler(async ({ data }) => {
    try {
      return await BillingService.createInvoice({
        ...data,
        dueDate: data.dueDate,
      })
    } catch (error) {
      console.error('Error creating invoice:', error)
      throw error
    }
  })

const getInvoicesSchema = z.object({
  patientId: z.number(),
})

export const getInvoicesFn = createServerFn({
  method: 'GET',
})
  .inputValidator(getInvoicesSchema)
  .handler(async ({ data }) => {
    return await BillingService.getInvoices(data.patientId)
  })

const getInvoiceSchema = z.object({
  invoiceId: z.number(),
})

export const getInvoiceFn = createServerFn({
  method: 'GET',
})
  .inputValidator(getInvoiceSchema)
  .handler(async ({ data }) => {
    const invoice = await BillingService.getInvoice(data.invoiceId)
    if (!invoice) {
      throw new Error('Fatura não encontrada')
    }
    return invoice
  })
