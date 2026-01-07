import { createServerFn } from '@tanstack/react-start'
import { PricingService } from '../services/pricing'

// Categories
export const listCategoriesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return await PricingService.listCategories()
  },
)

export const createCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { nome: string; descricao?: string }) => data)
  .handler(async ({ data }: { data: any }) => {
    return await PricingService.createCategory(data)
  })

export const updateCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      nome?: string
      descricao?: string
      ativo?: boolean
    }) => data,
  )
  .handler(async ({ data }: { data: any }) => {
    const { id, ...rest } = data
    return await PricingService.updateCategory(id, rest)
  })

// Prices
export const getPriceHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { categoriaId: number }) => data)
  .handler(async ({ data }: { data: { categoriaId: number } }) => {
    return await PricingService.getPriceHistory(data.categoriaId)
  })

export const addPriceFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { categoriaId: number; valor: number; dataInicio: string }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: { categoriaId: number; valor: number; dataInicio: string }
    }) => {
      return await PricingService.addPrice(
        data.categoriaId,
        data.valor,
        data.dataInicio,
      )
    },
  )
