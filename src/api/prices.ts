import type { ApiPrice, InfinityPricesResponse } from '../types/api'
import { api } from './client'

type PriceFilters = {
  priceId?: string
  productId?: string
}

export const getPrices = async (params: {
  page: number
  limit: number
  filters?: PriceFilters
}) => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }

  if (params.filters) {
    const payload: PriceFilters = {}
    const priceId = params.filters.priceId?.trim()
    const productId = params.filters.productId?.trim()

    if (priceId) {
      payload.priceId = priceId
    }
    if (productId) {
      payload.productId = productId
    }
    if (Object.keys(payload).length > 0) {
      query.filters = JSON.stringify(payload)
    }
  }

  const { data } = await api.get<InfinityPricesResponse>('/prices', {
    params: query,
  })
  return data
}

export type CreatePricePayload = {
  productId: string
  priceId: string
  billingInterval: number
  billingMode: number
  unitAmount: number
  showPrice: number
  currency: string
  trialDays?: number
  state?: number
  isDefault?: boolean
  displayOrder?: number
}

export const createPrice = async (payload: CreatePricePayload) => {
  const { data } = await api.post<ApiPrice>('/prices', payload)
  return data
}
