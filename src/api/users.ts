import type {
  ApiPowerPdfRateLimitResetResult,
  ApiPowerPdfRateLimitStatus,
  ApiUser,
  InfinityUsersResponse,
} from '../types/api'
import { api } from './client'

const getUsers = async (params: {
  page: number
  limit: number
  filters?: { email?: string; uid?: string }
}) => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.filters) {
    const payload: { email?: string; uid?: string } = {}
    const e = params.filters.email?.trim()
    const u = params.filters.uid?.trim()
    if (e) {
      payload.email = e
    }
    if (u) {
      payload.uid = u
    }
    if (Object.keys(payload).length > 0) {
      query.filters = JSON.stringify(payload)
    }
  }
  const { data } = await api.get<InfinityUsersResponse>('/users', { params: query })
  return data
}

const deleteUser = async (uid: string) => {
  await api.delete(`/users/${uid}`)
}

const getUser = async (uid: string) => {
  const { data } = await api.get<ApiUser | null>(`/users/${uid}`)
  return data
}

const updateUserEmail = async (uid: string, email: string) => {
  const { data } = await api.patch<ApiUser>(`/users/${uid}/email`, { email })
  return data
}

const getUserPowerPdfRateLimit = async (uid: string) => {
  const { data } = await api.get<ApiPowerPdfRateLimitStatus>(
    `/users/${uid}/pdf-rate-limit`,
  )
  return data
}

const resetUserPowerPdfRateLimit = async (uid: string) => {
  const { data } = await api.delete<ApiPowerPdfRateLimitResetResult>(
    `/users/${uid}/pdf-rate-limit`,
  )
  return data
}

export {
  deleteUser,
  getUser,
  getUsers,
  getUserPowerPdfRateLimit,
  resetUserPowerPdfRateLimit,
  updateUserEmail,
}
