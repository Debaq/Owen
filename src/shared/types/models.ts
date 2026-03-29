// src/shared/types/models.ts

// Usuarios y Organización
export interface User {
  id: string
  email: string
  role: 'gestor' | 'direccion'
  name: string
  carrera_id?: string
  created_at: string
  updated_at?: string
}

export interface Carrera {
  id: string
  name: string
  code: string
  director_id?: string
  gestor_id?: string
  created_at: string
  director_name?: string
  tiene_gestion_propia?: boolean
}

export interface Nivel {
  id: string
  carrera_id: string
  nombre: string
  orden: number
  semestre: 'par' | 'impar' | 'anual'
  created_at: string
}

export interface Asignatura {
  id: string
  code: string
  name: string
  carrera_id: string
  nivel_id: string
  horas_teoria: number
  horas_practica: number
  horas_autonomas: number
  horas_semanales: number
  creditos: number
  duracion_semanas: number
  semana_inicio: number
  created_at: string
  docente_count?: number
}

export interface Docente {
  id: string
  rut: string
  name: string
  email: string
  telefono?: string
  carreras: string[]
  unidad_id?: string
  user_id?: string
  activo: boolean
  created_at: string
  unidad_nombre?: string
  username?: string
}

export interface UnidadAcademica {
  id: string
  nombre: string
  code: string
  tipo: 'centro' | 'instituto' | 'vicerrectoria' | 'unidad' | 'otro'
  encargado_id?: string
  created_at: string
  updated_at?: string
  encargado_name?: string
}

// Espacios Físicos
export interface Edificio {
  id: string
  name: string
  code: string
  lat: number
  lng: number
  pisos: number
  descripcion?: string
  fotos?: string[]
  created_at: string
}

export interface Sala {
  id: string
  code: string
  name: string
  edificio_id: string
  piso: number
  tipo: 'aula' | 'laboratorio' | 'auditorio' | 'taller' | 'sala_reuniones' | 'oficina' | 'biblioteca' | 'medioteca'
  capacidad: number
  mobiliario: string[]
  tipo_mobiliario?: 'sillas_individuales' | 'butacas' | 'mesas_sillas' | 'mesas_trabajo' | 'computadores' | 'mixto' | null
  equipamiento: string[]
  reglas?: string
  lat: number
  lng: number
  gestor_id?: string
  tipo_gestion: 'central' | 'carrera' | 'unidad'
  gestion_carrera_id?: string
  gestion_unidad_id?: string
  fotos?: string[]
  activo: boolean
  created_at: string
}

// Sistema de Horarios
export interface SistemaBloque {
  id: string
  nombre: string
  es_default: boolean
  created_at: string
}

export interface BloqueHorario {
  id: string
  nombre: string
  hora_inicio: string
  hora_fin: string
  dia_semana: number
  sistema_bloque_id: string
  orden: number
  activo: boolean
  created_at: string
}

export interface Feriado {
  id: string
  fecha: string
  nombre: string
  tipo: 'nacional' | 'regional' | 'institucional'
  recurrente_anual: boolean
  created_at: string
}

export interface Horario {
  id: string
  tipo: 'clase' | 'evento' | 'examen' | 'taller'
  asignatura_id?: string
  sala_id: string
  docente_id?: string
  nivel_id?: string
  bloque_id: string
  temporada_id: string
  dia_semana: number
  recurrencia: 'semanal' | 'quincenal' | 'mensual' | 'unica' | 'anual'
  fecha_inicio: string
  fecha_fin: string
  semana_par_impar?: 'par' | 'impar'
  observaciones?: string
  activo: boolean
  created_by: string
  created_at: string
  updated_at?: string
}

// Sistema de Solicitudes
export type MobiliarioType = 'sillas_individuales' | 'butacas' | 'mesas_sillas' | 'mesas_trabajo' | 'computadores' | 'mixto'

export interface Solicitud {
  id: string
  solicitante: string
  carrera_id: string
  usuario_id: string
  motivo: string
  asignatura_code?: string
  sala_preferida_id?: string
  tipo_sala?: 'aula' | 'laboratorio' | 'auditorio' | 'taller'
  mobiliario_requerido?: MobiliarioType | null
  capacidad_requerida?: number
  equipamiento_requerido: string[]
  fecha_inicio: string
  fecha_fin: string
  bloques: string[]
  recurrente: boolean
  patron_recurrencia?: object
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'auto_aprobada'
  sala_asignada_id?: string
  respuesta_gestor?: string
  revisado_por?: string
  procesada_por_agente: boolean
  confianza_agente?: number
  created_at: string
  updated_at?: string
}

export interface RoomMatchResult {
  sala: Sala
  score: number
  available: boolean
  conflicts: string[]
  breakdown: {
    disponibilidad: number
    capacidad: number
    tipo: number
    mobiliario: number
    equipamiento: number
    preferida: number
  }
}