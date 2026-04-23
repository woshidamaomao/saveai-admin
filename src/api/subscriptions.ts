import type { ApiSubscription, InfinitySubscriptionsResponse } from '../types/api'
import { api } from './client'

type SubscriptionFilters = {
  subId?: string
  userUid?: string
  email?: string
  status?: string
  priceId?: string
  stripeSubscriptionId?: string
}

export const getSubscriptions = async (params: {
  page: number
  limit: number
  filters?: SubscriptionFilters
}) => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }

  if (params.filters) {
    const payload: SubscriptionFilters = {}
    const subId = params.filters.subId?.trim()
    const userUid = params.filters.userUid?.trim()
    const email = params.filters.email?.trim()
    const status = params.filters.status?.trim()
    const priceId = params.filters.priceId?.trim()
    const stripeSubscriptionId = params.filters.stripeSubscriptionId?.trim()

    if (subId) {
      payload.subId = subId
    }
    if (userUid) {
      payload.userUid = userUid
    }
    if (email) {
      payload.email = email
    }
    if (status) {
      payload.status = status
    }
    if (priceId) {
      payload.priceId = priceId
    }
    if (stripeSubscriptionId) {
      payload.stripeSubscriptionId = stripeSubscriptionId
    }

    if (Object.keys(payload).length > 0) {
      query.filters = JSON.stringify(payload)
    }
  }

  const { data } = await api.get<InfinitySubscriptionsResponse>('/subscriptions', {
    params: query,
  })

  return data
}

export const getSubscription = async (subId: string) => {
  const { data } = await api.get<ApiSubscription>(`/subscriptions/${subId}`)
  return data
}

export const updateSubscriptionTrialEnd = async (subId: string, trialEndAt: number) => {
  const { data } = await api.patch<ApiSubscription>(
    `/payment/admin/subscriptions/${subId}/trial-end`,
    {
      trialEndAt,
    },
  )
  return data
}
