import { api } from '@/shared/lib/api'
import type { Estudiante, Inscripcion, AsignacionSeccion, ConflictoHorario, SortingStatus } from '@/shared/types'

// =====================================================
// Estudiantes
// =====================================================

export async function getEstudiantes(params: {
  carrera_id?: string
  nivel_id?: string
  asignatura_id?: string
  temporada_id?: string
  search?: string
}): Promise<Estudiante[]> {
  const res = await api.get('/estudiantes.php', { params })
  return res.data.data
}

export async function createEstudiante(data: {
  nombre: string
  rut?: string
  email?: string
  carrera_id: string
  nivel_id?: string
}): Promise<string> {
  const res = await api.post('/estudiantes.php?action=create', data)
  return res.data.data.id
}

export async function updateEstudiante(id: string, data: {
  nombre?: string
  rut?: string
  email?: string
  nivel_id?: string
  carrera_id?: string
}): Promise<void> {
  await api.post(`/estudiantes.php?action=update&id=${id}`, data)
}

export async function deleteEstudiante(id: string): Promise<void> {
  await api.post(`/estudiantes.php?action=delete&id=${id}`)
}

export interface BulkCreateResult {
  ids: string[]
  created: number
  existing: number
}

export async function bulkCreateEstudiantes(data: {
  carrera_id: string
  nivel_id?: string
  estudiantes: Array<{ nombre: string; rut?: string; email?: string }>
}): Promise<BulkCreateResult> {
  const res = await api.post('/estudiantes.php?action=bulk_create', data)
  return res.data.data
}

// =====================================================
// Inscripciones
// =====================================================

export async function getInscripciones(params: {
  asignatura_id?: string
  estudiante_id?: string
  nivel_id?: string
  temporada_id: string
}): Promise<Inscripcion[]> {
  const res = await api.get('/inscripciones.php', { params })
  return res.data.data
}

export async function createInscripcion(data: {
  estudiante_id: string
  asignatura_id: string
  temporada_id: string
}): Promise<string> {
  const res = await api.post('/inscripciones.php?action=create', data)
  return res.data.data.id
}

export async function bulkCreateInscripciones(data: {
  asignatura_id: string
  temporada_id: string
  estudiante_ids: string[]
}): Promise<{ created: number; skipped: number }> {
  const res = await api.post('/inscripciones.php?action=bulk_create', data)
  return res.data.data
}

export async function deleteInscripcion(id: string): Promise<void> {
  await api.post(`/inscripciones.php?action=delete&id=${id}`)
}

export async function deleteInscripcionesByAsignatura(data: {
  asignatura_id: string
  temporada_id: string
}): Promise<number> {
  const res = await api.post('/inscripciones.php?action=delete_by_asignatura', data)
  return res.data.data.deleted
}

// =====================================================
// Sorting
// =====================================================

export async function getSortingStatus(carreraId: string, temporadaId: string): Promise<SortingStatus> {
  const res = await api.get('/sorting.php', {
    params: { action: 'status', carrera_id: carreraId, temporada_id: temporadaId }
  })
  return res.data.data
}

export async function getSortingConflicts(carreraId: string, temporadaId: string): Promise<ConflictoHorario[]> {
  const res = await api.get('/sorting.php', {
    params: { action: 'conflicts', carrera_id: carreraId, temporada_id: temporadaId }
  })
  return res.data.data
}

export async function getSortingPreview(params: {
  asignatura_id: string
  temporada_id: string
}): Promise<Array<AsignacionSeccion & { seccion_nombre: string }>> {
  const res = await api.get('/sorting.php', {
    params: { action: 'preview', ...params }
  })
  return res.data.data
}

export interface AutoSortResult {
  asignaciones_creadas: number
  conflictos_residuales: ConflictoHorario[]
}

export async function autoSort(data: {
  carrera_id: string
  temporada_id: string
  nivel_id?: string
}): Promise<AutoSortResult> {
  const res = await api.post('/sorting.php?action=auto_sort', data)
  return res.data.data
}

export async function moveEstudiante(data: {
  estudiante_id: string
  asignatura_id: string
  temporada_id: string
  nueva_seccion_id: string
}): Promise<{ nuevos_conflictos?: ConflictoHorario[] }> {
  const res = await api.post('/sorting.php?action=move', data)
  return res.data.data
}

export async function resetSort(data: {
  carrera_id: string
  temporada_id: string
  preserve_manual?: boolean
}): Promise<{ deleted: number }> {
  const res = await api.post('/sorting.php?action=reset', data)
  return res.data.data
}
