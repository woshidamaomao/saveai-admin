import { message } from 'antd'
import axios from 'axios'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMe, postEmailCodeLogin, postLogout } from '../api/auth'
import { getApiV1BaseUrl } from '../config/env'
import {
  REFRESH_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from '../constants/auth'
import type { ApiUser } from '../types/api'
import { clearAuthStorage } from '../utils/auth-session'
import { getErrorMessage } from '../utils/error-message'
import { isAdminUser } from '../utils/role'

type AuthContextValue = {
  user: ApiUser | null
  isReady: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  loginWithEmailCode: (email: string, code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  const clearSession = useCallback(() => {
    clearAuthStorage()
    setUser(null)
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!token) {
        setIsReady(true)
        return
      }
      try {
        const me = await getMe()
        if (!isAdminUser(me)) {
          setUser(null)
          message.warning('当前账号不是管理员，无法进入后台')
        } else {
          setUser(me)
        }
      } catch (e) {
        const status = axios.isAxiosError(e) ? e.response?.status : undefined
        if (status === 401 || status === 404) {
          clearSession()
        } else {
          setUser(null)
        }
      } finally {
        setIsReady(true)
      }
    }
    void bootstrap()
  }, [clearSession])

  const loginWithEmailCode = useCallback(async (email: string, code: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    const res = await postEmailCodeLogin({
      email: trimmedEmail,
      code: code.trim(),
    })

    const me = await getMeWithToken(res.token)
    if (!isAdminUser(me)) {
      message.error('仅管理员账号可登录管理后台')
      throw new Error('forbidden')
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, res.token)
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.refreshToken)
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    try {
      await postLogout()
    } catch (e) {
      message.warning(getErrorMessage(e, '退出登录接口失败，已清除本地会话'))
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      isAdmin: isAdminUser(user),
      loginWithEmailCode,
      logout,
    }),
    [user, isReady, loginWithEmailCode, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const getMeWithToken = async (token: string) => {
  const { data } = await axios.get<ApiUser>(`${getApiV1BaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 60_000,
  })
  return data
}

const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export { AuthProvider, useAuth }
