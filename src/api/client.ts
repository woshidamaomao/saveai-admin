import axios from 'axios'
import { getApiV1BaseUrl } from '../config/env'
import { TOKEN_STORAGE_KEY } from '../constants/auth'
import {
  clearAuthStorage,
  isSessionIdentityRequestUrl,
  redirectToLoginIfNeeded,
} from '../utils/auth-session'

const api = axios.create({
  baseURL: getApiV1BaseUrl(),
  timeout: 60_000,
})

api.interceptors.request.use((config) => {
  const url = config.url ?? ''
  if (url.includes('/auth/email-code/login') || url.includes('/code/send')) {
    return config
  }
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }
    const status = error.response?.status
    const path = error.config?.url ?? ''

    const isAuthLogin = path.includes('/auth/email-code/login')
    const isCodeSend = path.includes('/code/send')

    if (isAuthLogin || isCodeSend) {
      return Promise.reject(error)
    }

    if (status === 401) {
      clearAuthStorage()
      redirectToLoginIfNeeded()
      return Promise.reject(error)
    }

    if (status === 404 && isSessionIdentityRequestUrl(path)) {
      clearAuthStorage()
      redirectToLoginIfNeeded()
      return Promise.reject(error)
    }

    return Promise.reject(error)
  },
)

export { api }
