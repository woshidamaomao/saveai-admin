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
  subscriptionType?: 'monthly' | 'yearly' | 'one_time' | null
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
  subscriptionType?: 'monthly' | 'yearly' | 'one_time' | null
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

export type ApiProduct = {
  id: number
  productId: string
  slug: string
  name: string
  description: string | null
  pdfExportDailyLimit: number
  notionExportDailyLimit: number
  wordExportDailyLimit: number
  teamMembersLimit: number
  state: number
  displayOrder: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type ApiPrice = {
  id: number
  productId: string
  product?: ApiProduct
  priceId: string
  billingInterval: number
  billingMode: number
  unitAmount: number
  showPrice: number
  currency: string
  trialDays: number
  state: number
  isDefault: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type ApiSubscriptionRefundFundingInvoice = {
  invoiceId: string
  invoiceNumber: string | null
  invoiceCreatedAt: string
  lineId: string
  fundingType: string
  periodStart: string
  periodEnd: string
  refundPeriodStart: string
  refundPeriodEnd: string
  amountPaid: number
  refundBaseAmount: number
  calculatedRefundAmount: number
  maxRefundAmount: number
  refundDays: number
  currency: string
  creditedInvoiceId: string | null
  creditedLineIds: string[]
}

export type ApiSubscriptionRefundPhase = {
  phaseKey: string
  phaseType: string
  periodStart: string
  periodEnd: string
  refundDays: number
  currency: string
  calculatedRefundAmount: number
  maxRefundAmount: number
  fundingInvoiceCount: number
  fundingInvoices: ApiSubscriptionRefundFundingInvoice[]
}

export type ApiSubscriptionRefundPreview = {
  subId: string
  stripeSubscriptionId: string
  currency: string | null
  phaseCount: number
  fundingInvoiceCount: number
  invoiceCount: number
  totalCalculatedRefundAmount: number
  phases: ApiSubscriptionRefundPhase[]
}

export type ApiSubscriptionRefundItem = {
  refundId: string
  paymentIntentId: string
  amount: number
  currency: string
  status: string | null
}

export type ApiSubscriptionRefundResponse = ApiSubscriptionRefundPreview & {
  refundAmount: number
  refunded: boolean
  refunds: ApiSubscriptionRefundItem[]
  subscription: ApiSubscription
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
