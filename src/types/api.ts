export type Role = {
  id?: number | string
  name?: string
}

export type ApiUser = {
  uid: string
  email: string | null
  provider?: string
  firstName: string | null
  lastName: string | null
  role?: Role | null
  status?: number
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
}

export type LoginResponse = {
  token: string
  refreshToken: string
  tokenExpires: number
  user: ApiUser
}

export type InfinityUsersResponse = {
  data: ApiUser[]
  hasNextPage: boolean
  /** 后端用户列表接口会返回 */
  total?: number
}

export type ApiSubscription = {
  id: number
  subId: string
  userUid: string
  userEmail?: string | null
  userCreatedAt?: string | null
  priceId: string
  productId: string
  stripeSubscriptionId: string
  stripeSubscriptionItemId: string | null
  stripeCustomerId: string
  status: string
  quantity: number
  currentPeriodStart: string
  currentPeriodEnd: string
  trialStart: string | null
  trialEnd: string | null
  isTrial: boolean
  couponId: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  stripeLastEventCreated: string | null
  createdAt: string
  updatedAt: string
}

export type InfinitySubscriptionsResponse = {
  data: ApiSubscription[]
  hasNextPage: boolean
  total?: number
}

export type DashboardLineSeries = {
  name: string
  data: number[]
}

export type DashboardRegistrationStatsResponse = {
  timezone: string
  startDate: string
  endDate: string
  dates: string[]
  series: DashboardLineSeries[]
}

export type DashboardPdfUsageSeries = DashboardLineSeries & {
  minimumCount: number
}

export type DashboardPdfUsageStatsResponse = {
  timezone: string
  comparison: string
  startDate: string
  endDate: string
  dates: string[]
  series: DashboardPdfUsageSeries[]
}
