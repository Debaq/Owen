import { api } from '@/shared/lib/api'


export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'gestor' | 'direccion'
  carrera_id?: string
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  error?: string
}

class AuthService {
  private readonly STORAGE_KEY = 'sistema_owen_auth'

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<any>('/auth.php?action=login', credentials)
      const responseData = response.data

      if (responseData.success && (responseData.user || responseData.data)) {
        // PHP auth.php returns 'user', generic API returns 'data'. We handle both.
        const userData = (responseData.user || responseData.data) as AuthUser
        
        // Save to sessionStorage for client-side quick access
        this.setCurrentUser(userData)

        return {
          success: true,
          user: userData,
        }
      } else {
         return {
          success: false,
          error: responseData.error || 'Login failed',
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'Error al conectar con el servidor',
      }
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await api.get('/auth.php?action=logout')
    } catch (error) {
      console.warn('Logout failed on server', error)
    } finally {
      sessionStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * Validate session with server
   */
  async validateSession(): Promise<AuthUser | null> {
    try {
      const response = await api.get('/auth.php?action=me')
      if (response.data.success && response.data.user) {
        const user = response.data.user as AuthUser
        this.setCurrentUser(user)
        return user
      }
    } catch (error) {
      // If 401, clear local storage
      this.clearSession()
    }
    return null
  }

  /**
   * Get current authenticated user from sessionStorage
   */
  getCurrentUser(): AuthUser | null {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY)
      if (!data) return null
      return JSON.parse(data) as AuthUser
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Save user to sessionStorage
   */
  private setCurrentUser(user: AuthUser): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'gestor' | 'direccion'): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }

  /**
   * Get user role
   */
  getRole(): 'gestor' | 'direccion' | null {
    const user = this.getCurrentUser()
    return user?.role || null
  }
}

// Export singleton instance
export const authService = new AuthService()