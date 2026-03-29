import { api } from '@/shared/lib/api'
import type { Solicitud, RoomMatchResult, MobiliarioType } from '@/shared/types'

// ==================== TIPOS ====================

export interface SolicitudFormData {
  motivo: string
  carrera_id?: string
  tipo_sala?: 'aula' | 'laboratorio' | 'auditorio' | 'taller' | null
  mobiliario_requerido?: MobiliarioType | null
  capacidad_requerida?: number | null
  equipamiento_requerido: string[]
  fecha_inicio: string
  fecha_fin: string
  bloques: string[]
  sala_preferida_id?: string | null
  asignatura_code?: string | null
  recurrente: boolean
  patron_recurrencia?: object
}

export interface MatchResponse {
  matches: RoomMatchResult[]
  confianza: number
  auto_aprobable: boolean
  total_candidates: number
  available_count: number
}

export interface SolicitudWithDetails extends Solicitud {
  carrera_name?: string
  usuario_name?: string
  sala_preferida_name?: string
  sala_asignada_name?: string
  bloques_detail?: Array<{
    id: string
    nombre: string
    dia_semana: number
    hora_inicio: string
    hora_fin: string
  }>
}

export interface AutoProcessResponse {
  solicitud: SolicitudWithDetails
  match_results: MatchResponse
}

// ==================== CRUD ====================

export async function getAllSolicitudes(filters?: {
  estado?: string
  carrera_id?: string
}): Promise<SolicitudWithDetails[]> {
  const params = new URLSearchParams()
  if (filters?.estado) params.append('estado', filters.estado)
  if (filters?.carrera_id) params.append('carrera_id', filters.carrera_id)
  const query = params.toString()
  const res = await api.get(`/solicitudes.php${query ? '?' + query : ''}`)
  return res.data.data || []
}

export async function getSolicitudById(id: string): Promise<SolicitudWithDetails> {
  const res = await api.get(`/solicitudes.php?id=${id}`)
  return res.data.data
}

export async function createSolicitud(data: SolicitudFormData): Promise<SolicitudWithDetails> {
  const res = await api.post('/solicitudes.php?action=create', data)
  return res.data.data
}

// ==================== ALGORITMO ====================

export async function matchRooms(data: SolicitudFormData): Promise<MatchResponse> {
  const res = await api.post('/solicitudes.php?action=match', data)
  return res.data.data
}

export async function autoProcessSolicitud(data: SolicitudFormData): Promise<AutoProcessResponse> {
  const res = await api.post('/solicitudes.php?action=auto_process', data)
  return res.data.data
}

// ==================== GESTIÓN ====================

export async function approveSolicitud(id: string, sala_asignada_id: string): Promise<SolicitudWithDetails> {
  const res = await api.post('/solicitudes.php?action=approve', { id, sala_asignada_id })
  return res.data.data
}

export async function rejectSolicitud(id: string, respuesta_gestor: string): Promise<SolicitudWithDetails> {
  const res = await api.post('/solicitudes.php?action=reject', { id, respuesta_gestor })
  return res.data.data
}
