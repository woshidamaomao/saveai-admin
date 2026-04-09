import type { InfinityUsersResponse } from '../types/api'
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

export { deleteUser, getUsers }
