import type { InfinityProductsResponse } from '../types/api'
import { api } from './client'

type ProductFilters = {
  productId?: string
  slug?: string
  name?: string
}

export const getProducts = async (params: {
  page: number
  limit: number
  filters?: ProductFilters
}) => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }

  if (params.filters) {
    const payload: ProductFilters = {}
    const productId = params.filters.productId?.trim()
    const slug = params.filters.slug?.trim()
    const name = params.filters.name?.trim()

    if (productId) {
      payload.productId = productId
    }
    if (slug) {
      payload.slug = slug
    }
    if (name) {
      payload.name = name
    }
    if (Object.keys(payload).length > 0) {
      query.filters = JSON.stringify(payload)
    }
  }

  const { data } = await api.get<InfinityProductsResponse>('/products', {
    params: query,
  })
  return data
}
