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
  avatar?: string | null
  role?: Role | null
  status?: number
  subscriptionStatus?: string
  planSlug?: string
  planName?: string
  subscriptionPeriodStart?: string | null
  subscriptionPeriodEnd?: string | null
  subscriptionTrialStart?: string | null
  subscriptionTrialEnd?: string | null
  subscriptionIsTrial?: boolean
  subscriptionQuantity?: number | null
  subscriptionCancelAtPeriodEnd?: boolean
  subscriptionCanceledAt?: string | null
  subscription?: ApiSubscription | null
  pdfExportUsed?: number
  pdfExportLimit?: number
  notionExportUsed?: number
  notionExportLimit?: number
  wordExportUsed?: number
  wordExportLimit?: number
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

export type ApiDailyUsage = {
  id: number
  userUid: string
  userEmail?: string | null
  pdfExportUsedToday: number
  notionExportUsedToday: number
  usageDate: string
  createdAt: string
  updatedAt: string
}

export type InfinityDailyUsagesResponse = {
  data: ApiDailyUsage[]
  hasNextPage: boolean
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
