import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { authService, type AuthUser, type LoginCredentials } from '../services/authService'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  hasRole: (role: 'gestor' | 'direccion') => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state and validate with server
  useEffect(() => {
    const initAuth = async () => {
      // First, get from local storage for immediate UI feedback
      const currentUser = authService.getCurrentUser()
      setUser(currentUser)
      
      // Then, validate with server to ensure session is still alive
      const validatedUser = await authService.validateSession()
      setUser(validatedUser)
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    if (response.success && response.user) {
      setUser(response.user)
      return { success: true }
    }
    return { success: false, error: response.error }
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const hasRole = (role: 'gestor' | 'direccion') => {
    return user?.role === role
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
