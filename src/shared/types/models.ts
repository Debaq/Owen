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
  alumnos_estimados?: number
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
  equipamiento_requerido?: string[]
  requiere_laboratorio?: boolean
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

// Solver: Sesiones y Secciones
export interface Seccion {
  id: string
  nivel_id: string
  nombre: string
  alumnos: number
  created_at?: string
  nivel_nombre?: string
  carrera_id?: string
}

export interface Sesion {
  id: string
  asignatura_id: string
  tipo: 'teorica' | 'practica'
  seccion_id?: string
  docente_id?: string
  alumnos_estimados: number
  bloques_requeridos: number
  etiqueta?: string
  fijada: boolean
  temporada_id?: string
  created_at?: string
  asignatura_nombre?: string
  asignatura_code?: string
  nivel_id?: string
  docente_nombre?: string
  seccion_nombre?: string
}

// Bloqueos
export interface BloqueoNivel {
  id: string
  nivel_id: string
  temporada_id: string
  dia_semana?: number | null
  bloque_id?: string | null
  motivo?: string
  created_by: string
  created_at?: string
  nivel_nombre?: string
  carrera_id?: string
  bloque_nombre?: string
  hora_inicio?: string
  hora_fin?: string
}

export interface BloqueoInstitucional {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  temporada_id?: string
  motivo?: string
  created_by: string
  created_at?: string
}

export interface BloqueoSala {
  id: string
  sala_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo?: string
  created_by: string
  created_at?: string
  sala_code?: string
  sala_nombre?: string
}

// Distancias
export interface DistanciaEdificio {
  id: string
  edificio_origen_id: string
  edificio_destino_id: string
  minutos: number
  techado: boolean
  notas?: string
  created_at?: string
  edificio_origen_nombre?: string
  edificio_origen_code?: string
  edificio_destino_nombre?: string
  edificio_destino_code?: string
}

// Versionado de horarios
export interface HorarioBranch {
  id: string
  temporada_id: string
  nombre: string
  descripcion?: string
  es_principal: boolean
  branch_padre_id?: string
  commit_padre_id?: string
  estado: 'borrador' | 'revision' | 'aprobado' | 'publicado' | 'descartado'
  created_by: string
  created_at: string
  updated_at: string
  autor_nombre?: string
  temporada_nombre?: string
  total_commits?: number
  ultimo_score?: number | null
  ultimo_commit_mensaje?: string
  ultimo_commit_id?: string
  total_asignaciones?: number
}

export interface HorarioCommit {
  id: string
  branch_id: string
  commit_padre_id?: string
  mensaje: string
  tipo: 'solver' | 'manual' | 'solicitud' | 'import' | 'merge' | 'rollback'
  autor_id: string
  metadata?: Record<string, unknown>
  score_global?: number | null
  created_at: string
  autor_nombre?: string
  branch_nombre?: string
  total_asignaciones?: number
  asignaciones?: HorarioAsignacion[]
}

export interface HorarioAsignacion {
  id: string
  commit_id: string
  sesion_id: string
  sala_id?: string
  bloque_id?: string
  dia_semana?: number
  docente_id?: string
  score?: number
  explicacion?: string
  sesion_etiqueta?: string
  sesion_tipo?: string
  sala_nombre?: string
  sala_code?: string
  bloque_nombre?: string
  hora_inicio?: string
  hora_fin?: string
  docente_nombre?: string
}

export interface HorarioTag {
  id: string
  commit_id: string
  nombre: string
  descripcion?: string
  created_by: string
  created_at: string
  autor_nombre?: string
  commit_mensaje?: string
  score_global?: number | null
  commit_tipo?: string
  branch_nombre?: string
  temporada_id?: string
}

export interface HorarioDiff {
  commit_a: string
  commit_b: string
  added: HorarioAsignacion[]
  removed: HorarioAsignacion[]
  moved: Array<{
    sesion_id: string
    antes: HorarioAsignacion
    despues: HorarioAsignacion
  }>
  added_count: number
  removed_count: number
  moved_count: number
  unchanged_count: number
  score_a?: number | null
  score_b?: number | null
}

// Token API del solver
export interface SolverApiToken {
  id: string
  nombre: string
  activo: boolean
  token?: string // solo disponible al crear
  last_used_at?: string
  created_at: string
}