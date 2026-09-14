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

// Response interceptor: extract backend error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data
      if (data && data.error) {
        return Promise.reject(new Error(data.error))
      }
    }
    return Promise.reject(error)
  }
)
