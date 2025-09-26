import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../utils/api'

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      checkSession()
    }
  }, [])

  const login = async (password: string) => {
    try {
      const response = await api.post('/auth/login', { password })
      const { token } = response.data

      localStorage.setItem('token', token)
      setToken(token)
      setIsAuthenticated(true)

      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token')
      setToken(null)
      setIsAuthenticated(false)
      delete api.defaults.headers.common['Authorization']
    }
  }

  const checkSession = async (): Promise<boolean> => {
    if (!token) return false

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      await api.get('/auth/session')
      setIsAuthenticated(true)
      return true
    } catch (error) {
      await logout()
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}