import { api } from '@/shared/lib/api'
import type { ApiResponse, BloqueoNivel, BloqueoInstitucional } from '@/shared/types'

// --- Bloqueos de Nivel ---

export const getLevelBlockades = async (nivelId?: string, temporadaId?: string): Promise<BloqueoNivel[]> => {
  const params = new URLSearchParams()
  if (nivelId) params.append('nivel_id', nivelId)
  if (temporadaId) params.append('temporada_id', temporadaId)
  const response = await api.get<ApiResponse<BloqueoNivel[]>>(`/bloqueos-nivel.php?${params.toString()}`)
  return response.data.data || []
}

export const createLevelBlockade = async (data: {
  nivel_id: string
  temporada_id: string
  dia_semana?: number | null
  bloque_id?: string | null
  motivo?: string
}): Promise<string> => {
  const response = await api.post<ApiResponse<{ id: string }>>('/bloqueos-nivel.php?action=create', data)
  return response.data.data!.id
}

export const deleteLevelBlockade = async (id: string): Promise<void> => {
  await api.post(`/bloqueos-nivel.php?action=delete&id=${id}`)
}

// --- Bloqueos Institucionales ---

export const getInstitutionalBlockades = async (temporadaId?: string): Promise<BloqueoInstitucional[]> => {
  const params = new URLSearchParams()
  if (temporadaId) params.append('temporada_id', temporadaId)
  const response = await api.get<ApiResponse<BloqueoInstitucional[]>>(`/bloqueos-institucionales.php?${params.toString()}`)
  return response.data.data || []
}

export const createInstitutionalBlockade = async (data: {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  temporada_id?: string
  motivo?: string
}): Promise<string> => {
  const response = await api.post<ApiResponse<{ id: string }>>('/bloqueos-institucionales.php?action=create', data)
  return response.data.data!.id
}

export const updateInstitutionalBlockade = async (id: string, data: Partial<BloqueoInstitucional>): Promise<void> => {
  await api.post(`/bloqueos-institucionales.php?action=update&id=${id}`, data)
}

export const deleteInstitutionalBlockade = async (id: string): Promise<void> => {
  await api.post(`/bloqueos-institucionales.php?action=delete&id=${id}`)
}
