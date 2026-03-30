// Import types from models
import type {
  User,
  Carrera,
  Nivel,
  Asignatura,
  Docente,
  Edificio,
  Sala,
  BloqueHorario,
  Feriado,
  Horario,
  Solicitud,
  MobiliarioType,
  RoomMatchResult,
  Seccion,
  Sesion,
  BloqueoNivel,
  BloqueoInstitucional,
  BloqueoSala,
  DistanciaEdificio,
  HorarioBranch,
  HorarioCommit,
  HorarioAsignacion,
  HorarioTag,
  HorarioDiff,
  SolverApiToken,
} from './models'

// Re-export all types
export type {
  User,
  Carrera,
  Nivel,
  Asignatura,
  Docente,
  Edificio,
  Sala,
  BloqueHorario,
  Feriado,
  Horario,
  Solicitud,
  MobiliarioType,
  RoomMatchResult,
  Seccion,
  Sesion,
  BloqueoNivel,
  BloqueoInstitucional,
  BloqueoSala,
  DistanciaEdificio,
  HorarioBranch,
  HorarioCommit,
  HorarioAsignacion,
  HorarioTag,
  HorarioDiff,
  SolverApiToken,
}

// Additional utility types
export type Role = 'gestor' | 'direccion' | 'secretaria'
export type RoomType = 'aula' | 'laboratorio' | 'auditorio' | 'taller' | 'sala_reuniones' | 'oficina' | 'biblioteca' | 'medioteca'
export type RecurrenceType = 'semanal' | 'quincenal' | 'mensual' | 'unica' | 'anual'
export type RequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'auto_aprobada'
export type ObservationStatus = 'nuevo' | 'revision' | 'en_proceso' | 'resuelto' | 'cerrado'
export type Priority = 'baja' | 'media' | 'alta' | 'urgente'
export type TemporadaType = 'par' | 'impar'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Conflict detection types
export interface ScheduleConflict {
  type: 'sala' | 'docente' | 'nivel' | 'bloqueo' | 'feriado'
  message: string
  horario?: Horario
  // bloqueo?: Bloqueo
  feriado?: Feriado
}

// Availability types
export interface RoomAvailability {
  sala_id: string
  status: 'libre' | 'ocupada'
  current?: Horario
  next?: Horario
}
