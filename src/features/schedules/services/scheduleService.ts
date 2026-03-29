import { api } from '@/shared/lib/api'
import type { 
  Horario, 
  Asignatura, 
  Docente, 
  Sala, 
  Nivel, 
  Carrera, 
  BloqueHorario,
  ApiResponse
} from '@/shared/types'

// ==================== TIPOS EXTENDIDOS ====================

export interface HorarioWithDetails extends Horario {
  asignatura?: Asignatura
  docente?: Docente
  sala?: Sala
  nivel?: Nivel
  bloque?: BloqueHorario
}

export interface ScheduleGridCell {
  dia_semana: number
  bloque_id: string
  horarios: HorarioWithDetails[]
}

// ==================== CRUD BÁSICO ====================

/**
 * Obtener todos los horarios activos
 */
export async function getAllSchedules(): Promise<Horario[]> {
  const response = await api.get<ApiResponse<Horario[]>>('/horarios.php')
  return response.data.data || []
}

/**
 * Obtener horario por ID
 */
export async function getScheduleById(id: string): Promise<Horario | undefined> {
  const response = await api.get<ApiResponse<Horario>>(`/horarios.php?id=${id}`)
  return response.data.data
}

/**
 * Crear un nuevo horario
 */
export async function createSchedule(data: Partial<Horario>): Promise<Horario> {
  const response = await api.post<ApiResponse<Horario>>('/horarios.php?action=create', data)
  return response.data.data!
}

/**
 * Eliminar (desactivar) un horario
 */
export async function deleteSchedule(id: string): Promise<void> {
  await api.post(`/horarios.php?action=delete&id=${id}`)
}

/**
 * Obtener horarios por sala
 */
export async function getSchedulesByRoom(salaId: string, temporadaId?: string): Promise<HorarioWithDetails[]> {
  const params = new URLSearchParams({ sala_id: salaId })
  if (temporadaId) params.append('temporada_id', temporadaId)
  
  const response = await api.get<ApiResponse<HorarioWithDetails[]>>(`/horarios.php?${params.toString()}&enrich=true`)
  return response.data.data || []
}

/**
 * Obtener horarios por docente
 */
export async function getSchedulesByTeacher(docenteId: string, temporadaId?: string): Promise<HorarioWithDetails[]> {
  const params = new URLSearchParams({ docente_id: docenteId })
  if (temporadaId) params.append('temporada_id', temporadaId)
  
  const response = await api.get<ApiResponse<HorarioWithDetails[]>>(`/horarios.php?${params.toString()}&enrich=true`)
  return response.data.data || []
}

/**
 * Obtener horarios por nivel
 */
export async function getSchedulesByLevel(nivelId: string, temporadaId?: string): Promise<HorarioWithDetails[]> {
  const params = new URLSearchParams({ nivel_id: nivelId })
  if (temporadaId) params.append('temporada_id', temporadaId)
  
  const response = await api.get<ApiResponse<HorarioWithDetails[]>>(`/horarios.php?${params.toString()}&enrich=true`)
  return response.data.data || []
}

/**
 * Obtener horarios por asignatura
 */
export async function getSchedulesBySubject(asignaturaId: string, temporadaId?: string): Promise<HorarioWithDetails[]> {
  const params = new URLSearchParams({ asignatura_id: asignaturaId })
  if (temporadaId) params.append('temporada_id', temporadaId)
  
  const response = await api.get<ApiResponse<HorarioWithDetails[]>>(`/horarios.php?${params.toString()}&enrich=true`)
  return response.data.data || []
}

// ==================== UTILIDADES ====================

/**
 * Obtener grilla de horarios para una vista específica
 */
export async function getScheduleGrid(
  type: 'room' | 'teacher' | 'level' | 'subject',
  id: string,
  temporadaId?: string
): Promise<ScheduleGridCell[]> {
  // Obtener horarios según el tipo
  let horarios: HorarioWithDetails[]

  switch (type) {
    case 'room':
      horarios = await getSchedulesByRoom(id, temporadaId)
      break
    case 'teacher':
      horarios = await getSchedulesByTeacher(id, temporadaId)
      break
    case 'level':
      horarios = await getSchedulesByLevel(id, temporadaId)
      break
    case 'subject':
      horarios = await getSchedulesBySubject(id, temporadaId)
      break
    default:
      horarios = []
  }

  // Obtener todos los bloques
  const bloques = await getAllBlocks()

  // Crear grilla
  const grid: ScheduleGridCell[] = []

  for (let dia = 1; dia <= 5; dia++) { // Lunes a Viernes
    for (const bloque of bloques) {
      const horariosEnCelda = horarios.filter(
        h => h.dia_semana === dia && h.bloque_id === bloque.id
      )

      grid.push({
        dia_semana: dia,
        bloque_id: bloque.id,
        horarios: horariosEnCelda,
      })
    }
  }

  return grid
}

/**
 * Obtener todos los bloques horarios activos
 */
export async function getAllBlocks(): Promise<BloqueHorario[]> {
  const response = await api.get<ApiResponse<BloqueHorario[]>>('/bloques.php?activo=1')
  return response.data.data || []
}

/**
 * Obtener todas las carreras
 */
export async function getAllCareers(): Promise<Carrera[]> {
  const response = await api.get<ApiResponse<Carrera[]>>('/carreras.php')
  return response.data.data || []
}

/**
 * Obtener niveles por carrera
 */
export async function getLevelsByCareer(carreraId: string): Promise<Nivel[]> {
  const response = await api.get<ApiResponse<Nivel[]>>(`/niveles.php?carrera_id=${carreraId}`)
  return response.data.data || []
}

/**
 * Obtener asignaturas por nivel
 */
export async function getSubjectsByLevel(nivelId: string): Promise<Asignatura[]> {
  const response = await api.get<ApiResponse<Asignatura[]>>(`/asignaturas.php?nivel_id=${nivelId}`)
  return response.data.data || []
}

/**
 * Obtener todos los docentes activos
 */
export async function getAllTeachers(): Promise<Docente[]> {
  const response = await api.get<ApiResponse<Docente[]>>('/docentes.php?activo=1')
  return response.data.data || []
}

/**
 * Obtener temporada activa
 */
export async function getActiveTemporada() {
  const response = await api.get<ApiResponse<any>>('/temporadas.php?activa=1')
  return response.data.data
}

/**
 * Obtener todas las salas activas
 */
export async function getAllActiveRooms(): Promise<Sala[]> {
  const response = await api.get<ApiResponse<Sala[]>>('/salas.php?activo=1')
  return response.data.data || []
}

// ==================== NOMBRES DE DÍAS ====================

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DIAS_SEMANA_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']