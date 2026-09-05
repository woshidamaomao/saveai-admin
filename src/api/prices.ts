import type { ApiPrice, InfinityPricesResponse, StripePriceCandidate } from '../types/api'
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

export const getStripePriceCandidates = async (productId: string) => {
  const { data } = await api.get<StripePriceCandidate[]>('/prices/stripe-candidates', {
    params: { productId },
  })
  return data
}

export const importStripePrice = async (priceId: string) => {
  const { data } = await api.post<ApiPrice>('/prices/import-stripe', { priceId })
  return data
}

export const syncStripePrice = async (id: number) => {
  const { data } = await api.post<ApiPrice>(`/prices/${id}/sync-stripe`)
  return data
}

export const updatePriceState = async (id: number, state: 1 | 2) => {
  const { data } = await api.patch<ApiPrice>(`/prices/${id}/state`, { state })
  return data
}
