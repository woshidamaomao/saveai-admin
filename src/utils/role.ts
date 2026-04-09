import { ADMIN_ROLE_ID } from '../constants/auth'
import type { ApiUser } from '../types/api'

export const isAdminUser = (user: ApiUser | null | undefined) => {
  if (!user?.role) {
    return false
  }
  const id = Number(user.role.id)
  if (!Number.isNaN(id) && id === ADMIN_ROLE_ID) {
    return true
  }
  const name = String(user.role.name ?? '').toLowerCase()
  return name === 'admin'
}
