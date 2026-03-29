// Roles de usuario
export const ROLES = {
  GESTOR: 'gestor',
  DIRECCION: 'direccion',
} as const

// Tipos de sala
export const ROOM_TYPES = {
  AULA: 'aula',
  LABORATORIO: 'laboratorio',
  AUDITORIO: 'auditorio',
  TALLER: 'taller',
  SALA_REUNIONES: 'sala_reuniones',
} as const

// Tipos de recurrencia
export const RECURRENCE_TYPES = {
  SEMANAL: 'semanal',
  QUINCENAL: 'quincenal',
  MENSUAL: 'mensual',
  UNICA: 'unica',
  ANUAL: 'anual',
} as const

// Estados de solicitud
export const REQUEST_STATUS = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  AUTO_APROBADA: 'auto_aprobada',
} as const

// Estados de observación
export const OBSERVATION_STATUS = {
  NUEVO: 'nuevo',
  REVISION: 'revision',
  EN_PROCESO: 'en_proceso',
  RESUELTO: 'resuelto',
  CERRADO: 'cerrado',
} as const

// Categorías de observación
export const OBSERVATION_CATEGORIES = {
  MANTENIMIENTO: 'mantenimiento',
  LIMPIEZA: 'limpieza',
  EQUIPAMIENTO: 'equipamiento',
  RUIDO: 'ruido',
  SEGURIDAD: 'seguridad',
  OTRO: 'otro',
} as const

// Prioridades
export const PRIORITY_LEVELS = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const

// Tipos de temporada
export const TEMPORADA_TYPES = {
  PAR: 'par',
  IMPAR: 'impar',
} as const

// Días de la semana
export const DAYS_OF_WEEK = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
} as const

// Campus coordinates (Puerto Montt, Chile)
export const CAMPUS_COORDINATES = {
  lat: -41.48780,
  lng: -72.89699,
  zoom: 16,
} as const
