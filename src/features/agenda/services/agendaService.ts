import { api } from '@/shared/lib/api'

// ==================== TIPOS ====================

export interface Director {
  id: string
  name: string
  email: string
  carrera_id?: string
  carrera_name?: string
}

export interface Disponibilidad {
  id: string
  director_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  duracion_cita: number
  activo: boolean
}

export interface DisponibilidadInput {
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  duracion_cita?: number
}

export interface Slot {
  hora_inicio: string
  hora_fin: string
  disponible: boolean
}

export interface Cita {
  id: string
  director_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  nombre_solicitante: string
  email_solicitante?: string
  telefono_solicitante?: string
  motivo: string
  estado: 'confirmada' | 'cancelada'
  creado_por?: string
  created_at: string
}

export interface ReservaInput {
  director_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  nombre_solicitante: string
  email_solicitante?: string
  telefono_solicitante?: string
  motivo: string
}

// ==================== PÚBLICO ====================

export async function getDirectoresConAgenda(): Promise<Director[]> {
  const res = await api.get('/agenda.php?action=directores')
  return res.data.data || []
}

export async function getDisponibilidad(directorId: string): Promise<Disponibilidad[]> {
  const res = await api.get(`/agenda.php?action=disponibilidad&director_id=${directorId}`)
  return res.data.data || []
}

export async function getSlots(directorId: string, fecha: string): Promise<Slot[]> {
  const res = await api.get(`/agenda.php?action=slots&director_id=${directorId}&fecha=${fecha}`)
  return res.data.data || []
}

export async function reservarCita(data: ReservaInput): Promise<string> {
  const res = await api.post('/agenda.php?action=reservar', data)
  return res.data.data.id
}

// ==================== AUTENTICADO ====================

export async function getCitas(directorId?: string): Promise<Cita[]> {
  const params = directorId ? `&director_id=${directorId}` : ''
  const res = await api.get(`/agenda.php?action=citas${params}`)
  return res.data.data || []
}

export async function saveDisponibilidad(directorId: string, items: DisponibilidadInput[]): Promise<void> {
  await api.post('/agenda.php?action=save_disponibilidad', { director_id: directorId, items })
}

export async function crearCitaManual(data: ReservaInput): Promise<string> {
  const res = await api.post('/agenda.php?action=crear_cita', data)
  return res.data.data.id
}

export async function cancelarCita(id: string): Promise<void> {
  await api.post('/agenda.php?action=cancelar_cita', { id })
}
