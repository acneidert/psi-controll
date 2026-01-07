import { createServerFn } from '@tanstack/react-start'
import { DashboardService } from '../services/dashboard'

export const getDashboardStatsFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await DashboardService.getStats()
})

export const getRecentConsultationsFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await DashboardService.getRecentConsultations()
})

export const getOverdueInvoicesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await DashboardService.getOverdueInvoices()
})
