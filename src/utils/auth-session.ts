import { REFRESH_TOKEN_STORAGE_KEY, TOKEN_STORAGE_KEY } from '../constants/auth'

/** 仅应在 401 或会话失效类 404 时调用 */
export const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

export const redirectToLoginIfNeeded = () => {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login')
  }
}

/** 请求 URL（相对或绝对）是否视为「当前登录身份」接口，其 404 表示应退出登录 */
export const isSessionIdentityRequestUrl = (url: string) => {
  const u = url.replace(/^\//, '')
  return u.includes('auth/me')
}
