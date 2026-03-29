import { api } from '@/shared/lib/api'
import type { Sala, Edificio } from '@/shared/types'
import type { ApiResponse } from '@/shared/types'

// ==================== TIPOS ====================

export interface RoomWithBuilding extends Sala {
  edificio?: Edificio
}

export interface RoomFilters {
  tipo?: Sala['tipo']
  capacidadMin?: number
  capacidadMax?: number
  equipamiento?: string[]
  edificioId?: string
  activo?: boolean
  search?: string
}

export interface RoomFormData {
  code: string
  name: string
  edificio_id: string
  piso: number
  tipo: Sala['tipo']
  capacidad: number
  mobiliario: string[]
  equipamiento: string[]
  reglas: string
  lat: number
  lng: number
  tipo_gestion: 'central' | 'carrera' | 'unidad'
  gestion_carrera_id?: string | null
  gestion_unidad_id?: string | null
  fotos?: string[]
  gestor_id?: string
  activo: boolean
}

// ==================== CRUD BÁSICO ====================

/**
 * Obtener todas las salas activas
 */
export async function getAllRooms(): Promise<Sala[]> {
  const response = await api.get<ApiResponse<Sala[]>>('/salas.php')
  return response.data.data || []
}

/**
 * Obtener todas las salas (incluyendo inactivas)
 */
export async function getAllRoomsIncludingInactive(): Promise<Sala[]> {
  const response = await api.get<ApiResponse<Sala[]>>('/salas.php?include_inactive=true')
  return response.data.data || []
}

/**
 * Obtener sala por ID
 */
export async function getRoomById(id: string): Promise<Sala | undefined> {
   const response = await api.get<ApiResponse<Sala>>(`/salas.php?id=${id}`)
   return response.data.data
}

/**
 * Obtener sala por código
 */
export async function getRoomByCode(code: string): Promise<Sala | undefined> {
  const response = await api.get<ApiResponse<Sala>>(`/salas.php?code=${code}`)
  return response.data.data
}

/**
 * Obtener sala con datos del edificio
 */
export async function getRoomWithBuilding(id: string): Promise<RoomWithBuilding | undefined> {
  const sala = await getRoomById(id)
  if (!sala) return undefined

  const edificio = await getBuildingById(sala.edificio_id)
  return {
    ...sala,
    edificio,
  }
}

/**
 * Crear nueva sala
 */
export async function createRoom(data: RoomFormData): Promise<Sala> {
  const response = await api.post<ApiResponse<Sala>>('/salas.php', data)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Error creating room')
  }
  return response.data.data
}

/**
 * Actualizar sala existente
 */
export async function updateRoom(id: string, data: Partial<RoomFormData>): Promise<Sala> {
  const response = await api.post<ApiResponse<Sala>>(`/salas.php?action=update&id=${id}`, data)
  if (!response.data.success || !response.data.data) {
     throw new Error(response.data.error || 'Error updating room')
  }
  return response.data.data
}

/**
 * Eliminar sala (soft delete)
 */
export async function deleteRoom(id: string): Promise<void> {
   await api.post(`/salas.php?action=delete&id=${id}`)
}

/**
 * Activar sala
 */
export async function activateRoom(id: string): Promise<void> {
   await api.post(`/salas.php?action=activate&id=${id}`)
}

// ==================== BÚSQUEDA Y FILTRADO ====================

/**
 * Buscar salas por nombre o código
 */
export async function searchRooms(query: string): Promise<Sala[]> {
  const response = await api.get<ApiResponse<Sala[]>>(`/salas.php?search=${query}`)
  return response.data.data || []
}

/**
 * Filtrar salas con múltiples criterios
 */
export async function filterRooms(filters: RoomFilters): Promise<Sala[]> {
  const params = new URLSearchParams()
  if (filters.tipo) params.append('tipo', filters.tipo)
  if (filters.edificioId) params.append('edificio_id', filters.edificioId)
  
  const response = await api.get<ApiResponse<Sala[]>>(`/salas.php?${params.toString()}`)
  return response.data.data || []
}

/**
 * Obtener salas disponibles en un horario específico
 */
export async function getAvailableRooms(
  _diaSemana: number,
  _bloqueId: string,
  _temporadaId: string,
  _fecha?: Date
): Promise<Sala[]> {
  // TODO: Implement /salas/available endpoint
  return getAllRooms()
}

/**
 * Obtener salas con sus edificios
 */
export async function getRoomsWithBuildings(): Promise<RoomWithBuilding[]> {
  const salas = await getAllRooms()
  const edificios = await getAllBuildings()

  const edificiosMap = new Map(edificios.map(e => [e.id, e]))

  return salas.map(sala => ({
    ...sala,
    edificio: edificiosMap.get(sala.edificio_id),
  }))
}

// ==================== EDIFICIOS ====================

/**
 * Obtener todos los edificios
 */
export async function getAllBuildings(): Promise<Edificio[]> {
  try {
    const response = await api.get<ApiResponse<Edificio[]>>('/edificios.php')
    return response.data.data || []
  } catch (error) {
    console.error('Error fetching buildings:', error)
    return []
  }
}

/**
 * Obtener edificio por ID
 */
export async function getBuildingById(id: string): Promise<Edificio | undefined> {
  const response = await api.get<ApiResponse<Edificio>>(`/edificios.php?id=${id}`)
  return response.data.data
}

/**
 * Obtener salas de un edificio específico
 */
export async function getRoomsByBuilding(edificioId: string): Promise<Sala[]> {
  const response = await api.get<ApiResponse<Sala[]>>(`/salas.php?edificio_id=${edificioId}`)
  return response.data.data || []
}

// ==================== ESTADÍSTICAS ====================

export async function getRoomCountByType(): Promise<Record<Sala['tipo'], number>> {
  const salas = await getAllRooms()
  const counts: Record<Sala['tipo'], number> = {
    aula: 0,
    laboratorio: 0,
    auditorio: 0,
    taller: 0,
    sala_reuniones: 0,
    oficina: 0,
    biblioteca: 0,
    medioteca: 0,
  }
  salas.forEach(sala => {
      if (counts[sala.tipo] !== undefined) {
        counts[sala.tipo]++
      }
  })
  return counts
}

export async function getTotalCapacityByType(): Promise<Record<Sala['tipo'], number>> {
  const salas = await getAllRooms()
  const capacity: Record<Sala['tipo'], number> = {
    aula: 0,
    laboratorio: 0,
    auditorio: 0,
    taller: 0,
    sala_reuniones: 0,
    oficina: 0,
    biblioteca: 0,
    medioteca: 0,
  }
  salas.forEach(sala => {
      if (capacity[sala.tipo] !== undefined) {
        capacity[sala.tipo] += sala.capacidad
      }
  })
  return capacity
}

export async function getMostCommonEquipment(): Promise<Array<{ equipo: string; count: number }>> {
  const salas = await getAllRooms()
  const equipmentCount = new Map<string, number>()
  salas.forEach(sala => {
    sala.equipamiento.forEach(eq => {
      equipmentCount.set(eq, (equipmentCount.get(eq) || 0) + 1)
    })
  })
  return Array.from(equipmentCount.entries())
    .map(([equipo, count]) => ({ equipo, count }))
    .sort((a, b) => b.count - a.count)
}
