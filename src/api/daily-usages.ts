import type { InfinityDailyUsagesResponse } from '../types/api'
import { api } from './client'

type DailyUsageFilters = {
  userUid?: string
  email?: string
  startDate?: string
  endDate?: string
}

const getDailyUsages = async (params: {
  page: number
  limit: number
  filters?: DailyUsageFilters
}) => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }

  if (params.filters) {
    const payload: DailyUsageFilters = {}
    const userUid = params.filters.userUid?.trim()
    const email = params.filters.email?.trim()
    const startDate = params.filters.startDate?.trim()
    const endDate = params.filters.endDate?.trim()

    if (userUid) {
      payload.userUid = userUid
    }
    if (email) {
      payload.email = email
    }
    if (startDate) {
      payload.startDate = startDate
    }
    if (endDate) {
      payload.endDate = endDate
    }

    if (Object.keys(payload).length > 0) {
      query.filters = JSON.stringify(payload)
    }
  }

  const { data } = await api.get<InfinityDailyUsagesResponse>('/daily-usages', {
    params: query,
  })

  return data
}

export { getDailyUsages }
