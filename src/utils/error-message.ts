import axios from 'axios'

export const getErrorMessage = (error: unknown, fallback = '请求失败') => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string | string[]
          errors?: Record<string, string>
        }
      | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
    if (data?.errors && typeof data.errors === 'object') {
      return Object.values(data.errors).filter(Boolean).join(', ')
    }
    if (error.response?.status === 401) {
      return '未授权，请重新登录'
    }
    return error.message || fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
