import type { ApiUser, LoginResponse } from '../types/api'
import { api } from './client'

const postEmailCodeLogin = async (body: {
  email: string
  code: string
  firstName?: string
  lastName?: string
}) => {
  const { data } = await api.post<LoginResponse>('/auth/email-code/login', body)
  return data
}

const postSendEmailLoginCode = async (recipient: string) => {
  const { data } = await api.post<{ success: boolean; message?: string; expiresIn?: number }>(
    '/code/send',
    {
      channel: 'email',
      recipient,
      type: 'email-login',
    },
  )
  return data
}

const getMe = async () => {
  const { data } = await api.get<ApiUser>('/auth/me')
  return data
}

const postLogout = async () => {
  await api.post('/auth/logout')
}

export { getMe, postEmailCodeLogin, postLogout, postSendEmailLoginCode }
