import axios from 'axios'

/**
 * URL del backend - SIEMPRE apunta al servidor remoto
 * El backend está alojado en https://tmeduca.org/owen/backend
 * tanto en desarrollo (npm run dev) como en producción
 */
const API_URL = import.meta.env.VITE_API_URL || 'https://tmeduca.org/owen/backend/api'

if (import.meta.env.DEV) {
  console.log('Backend API:', API_URL)
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for PHP sessions
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Exportar la URL para uso directo si es necesario
export const API_BASE_URL = API_URL

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we receive a 401 Unauthorized, we might want to redirect to login
      // but let's leave that decision to the caller or a higher level auth provider
      // console.warn('Unauthorized access', error.response.data) // Suppressed to avoid noise on init
    }
    return Promise.reject(error)
  }
)
