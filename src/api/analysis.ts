import type {
  DashboardPdfUsageStatsResponse,
  DashboardRegistrationStatsResponse,
} from '../types/api'
import { api } from './client'

const getDashboardUserRegistrations = async (params: {
  startDate: string
  endDate: string
}) => {
  const { data } = await api.get<DashboardRegistrationStatsResponse>(
    '/analysis/user-registrations',
    {
      params,
    },
  )
  return data
}

const getDashboardPdfUsageStats = async (params: {
  startDate: string
  endDate: string
  minimumCounts: number[]
}) => {
  const { data } = await api.get<DashboardPdfUsageStatsResponse>(
    '/analysis/pdf-usage-users',
    {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        minimumCounts: params.minimumCounts.join(','),
      },
    },
  )
  return data
}

export { getDashboardPdfUsageStats, getDashboardUserRegistrations }
