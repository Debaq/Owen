import { api } from '@/shared/lib/api'
import type { ApiResponse, DistanciaEdificio } from '@/shared/types'

export const getDistances = async (edificioId?: string): Promise<DistanciaEdificio[]> => {
  const params = edificioId ? `?edificio_id=${edificioId}` : ''
  const response = await api.get<ApiResponse<DistanciaEdificio[]>>(`/distancias.php${params}`)
  return response.data.data || []
}

export const createDistance = async (data: {
  edificio_origen_id: string
  edificio_destino_id: string
  minutos: number
  techado?: boolean
  notas?: string
}): Promise<string> => {
  const response = await api.post<ApiResponse<{ id: string }>>('/distancias.php?action=create', data)
  return response.data.data!.id
}

export const updateDistance = async (id: string, data: { minutos?: number; techado?: boolean; notas?: string }): Promise<void> => {
  await api.post(`/distancias.php?action=update&id=${id}`, data)
}

export const deleteDistance = async (id: string): Promise<void> => {
  await api.post(`/distancias.php?action=delete&id=${id}`)
}

export const generateDistances = async (): Promise<string> => {
  const response = await api.post<ApiResponse<never>>('/distancias.php?action=generate')
  return response.data.message || 'Distancias generadas'
}
