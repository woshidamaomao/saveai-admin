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
