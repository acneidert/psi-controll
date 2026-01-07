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

export const getAllPendingConsultationsFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await BillingService.getAllPendingConsultations()
})

const createBatchInvoicesSchema = z.object({
  invoices: z.array(
    z.object({
      patientId: z.number(),
      consultationIds: z.array(z.number()),
      dueDate: z.string().transform((val) => new Date(val)),
      discount: z.number().optional(),
      observations: z.string().optional(),
    })
  ),
})

export const createBatchInvoicesFn = createServerFn({
  method: 'POST',
})
  .inputValidator(createBatchInvoicesSchema)
  .handler(async ({ data }) => {
    const results = []
    const errors = []

    for (const invoiceData of data.invoices) {
      try {
        const invoice = await BillingService.createInvoice({
          ...invoiceData,
          dueDate: invoiceData.dueDate,
        })
        results.push(invoice)
      } catch (error) {
        console.error(
          `Error creating invoice for patient ${invoiceData.patientId}:`,
          error,
        )
        errors.push({ patientId: invoiceData.patientId, error: String(error) })
      }
    }

    return { results, errors }
  })

export const getAllOpenInvoicesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await BillingService.getAllOpenInvoices()
})

const payInvoiceSchema = z.object({
  invoiceId: z.number(),
  amount: z.number(),
  date: z.string().transform((val) => new Date(val)),
  method: z.string(),
  notes: z.string().optional(),
})

export const payInvoiceFn = createServerFn({
  method: 'POST',
})
  .inputValidator(payInvoiceSchema)
  .handler(async ({ data }) => {
    await BillingService.payInvoice({
      ...data,
      date: data.date,
    })
  })

const getPaidInvoicesSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
})

export const getPaidInvoicesFn = createServerFn({
  method: 'GET',
})
  .inputValidator(getPaidInvoicesSchema)
  .handler(async ({ data }) => {
    return await BillingService.getPaidInvoices(data)
  })
