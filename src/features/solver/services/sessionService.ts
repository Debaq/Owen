import { api } from '@/shared/lib/api'
import type { ApiResponse, Sesion, Seccion } from '@/shared/types'

// --- Sesiones ---

export const getSessions = async (params: { asignatura_id?: string; temporada_id?: string; nivel_id?: string }): Promise<Sesion[]> => {
  const query = new URLSearchParams()
  if (params.asignatura_id) query.append('asignatura_id', params.asignatura_id)
  if (params.temporada_id) query.append('temporada_id', params.temporada_id)
  if (params.nivel_id) query.append('nivel_id', params.nivel_id)
  const response = await api.get<ApiResponse<Sesion[]>>(`/sesiones.php?${query.toString()}`)
  return response.data.data || []
}

export const createSession = async (data: {
  asignatura_id: string
  tipo: 'teorica' | 'practica'
  alumnos_estimados: number
  bloques_requeridos: number
  seccion_id?: string
  docente_id?: string
  etiqueta?: string
  temporada_id?: string
}): Promise<string> => {
  const response = await api.post<ApiResponse<{ id: string }>>('/sesiones.php?action=create', data)
  return response.data.data!.id
}

export const deleteSession = async (id: string): Promise<void> => {
  await api.post(`/sesiones.php?action=delete&id=${id}`)
}

export interface GenerateResult {
  sesiones: Array<{ id: string; etiqueta: string; tipo: string; alumnos: number; seccion?: string }>
  total_teoricas: number
  total_practicas: number
  secciones_usadas: number
}

export const generateSessions = async (asignaturaId: string, temporadaId?: string): Promise<GenerateResult> => {
  const params = new URLSearchParams({ asignatura_id: asignaturaId })
  if (temporadaId) params.append('temporada_id', temporadaId)
  const response = await api.post<ApiResponse<GenerateResult>>(`/sesiones.php?action=generate&${params.toString()}`)
  return response.data.data!
}

// --- Secciones ---

export const getSections = async (nivelId: string): Promise<Seccion[]> => {
  const response = await api.get<ApiResponse<Seccion[]>>(`/secciones.php?nivel_id=${nivelId}`)
  return response.data.data || []
}

export const createSection = async (data: { nivel_id: string; nombre: string; alumnos: number }): Promise<string> => {
  const response = await api.post<ApiResponse<{ id: string }>>('/secciones.php?action=create', data)
  return response.data.data!.id
}

export const deleteSection = async (id: string): Promise<void> => {
  await api.post(`/secciones.php?action=delete&id=${id}`)
}

export interface GenerateSectionsResult {
  secciones: Array<{ id: string; nombre: string; alumnos: number }>
  lab_capacidad_usada: number
  alumnos_total: number
}

export const generateSections = async (nivelId: string): Promise<GenerateSectionsResult> => {
  const response = await api.post<ApiResponse<GenerateSectionsResult>>(`/secciones.php?action=generate&nivel_id=${nivelId}`)
  return response.data.data!
}
