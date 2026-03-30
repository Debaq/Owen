-- SQLite Schema for Sistema Owen - Versión 3.0
-- Orden de tablas optimizado para respetar dependencias FK

PRAGMA foreign_keys = ON;

-- =====================================================
-- TABLAS BASE (sin dependencias)
-- =====================================================

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('gestor', 'direccion', 'secretaria')),
  name TEXT NOT NULL,
  carrera_id TEXT, -- FK declarada abajo tras crear carreras (circular)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS sistemas_bloques;
CREATE TABLE sistemas_bloques (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  es_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS unidades_academicas;
CREATE TABLE unidades_academicas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK(tipo IN ('centro', 'instituto', 'vicerrectoria', 'unidad', 'otro')),
  encargado_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (encargado_id) REFERENCES users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS edificios;
CREATE TABLE edificios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  pisos INTEGER NOT NULL DEFAULT 1,
  descripcion TEXT,
  fotos TEXT, -- JSON Array of URLs
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS temporadas;
CREATE TABLE temporadas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('par', 'impar')),
  año INTEGER NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  activa INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS feriados;
CREATE TABLE feriados (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('nacional', 'regional', 'institucional')),
  recurrente_anual INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS bloques_horarios;
CREATE TABLE bloques_horarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  dia_semana INTEGER NOT NULL DEFAULT 1 CHECK(dia_semana BETWEEN 1 AND 6),
  orden INTEGER NOT NULL DEFAULT 0,
  sistema_bloque_id TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sistema_bloque_id) REFERENCES sistemas_bloques(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLAS ACADÉMICAS
-- =====================================================

DROP TABLE IF EXISTS docentes;
CREATE TABLE docentes (
  id TEXT PRIMARY KEY,
  rut TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  carreras TEXT, -- JSON Array
  unidad_id TEXT,
  user_id TEXT,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unidad_id) REFERENCES unidades_academicas(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS carreras;
CREATE TABLE carreras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  director_id TEXT,
  gestor_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (director_id) REFERENCES docentes(id) ON DELETE SET NULL,
  FOREIGN KEY (gestor_id) REFERENCES users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS niveles;
CREATE TABLE niveles (
  id TEXT PRIMARY KEY,
  carrera_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL,
  semestre TEXT NOT NULL DEFAULT 'impar' CHECK(semestre IN ('par', 'impar', 'anual')),
  alumnos_estimados INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS asignaturas;
CREATE TABLE asignaturas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  carrera_id TEXT NOT NULL,
  nivel_id TEXT NOT NULL,
  horas_teoria INTEGER NOT NULL DEFAULT 0,
  horas_practica INTEGER NOT NULL DEFAULT 0,
  horas_autonomas INTEGER NOT NULL DEFAULT 0,
  horas_semanales INTEGER NOT NULL DEFAULT 0,
  creditos INTEGER NOT NULL DEFAULT 0,
  duracion_semanas INTEGER NOT NULL DEFAULT 17,
  semana_inicio INTEGER NOT NULL DEFAULT 1,
  equipamiento_requerido TEXT DEFAULT '[]',
  requiere_laboratorio INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS docente_disponibilidad;
CREATE TABLE docente_disponibilidad (
  id TEXT PRIMARY KEY,
  docente_id TEXT NOT NULL,
  dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 6),
  bloque_id TEXT NOT NULL,
  preferencia INTEGER DEFAULT 3,
  temporada_id TEXT,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE,
  FOREIGN KEY (bloque_id) REFERENCES bloques_horarios(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS docente_asignaturas;
CREATE TABLE docente_asignaturas (
  id TEXT PRIMARY KEY,
  docente_id TEXT NOT NULL,
  asignatura_id TEXT NOT NULL,
  rol TEXT DEFAULT 'responsable' CHECK(rol IN ('responsable', 'colaborador')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE,
  FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
  UNIQUE(docente_id, asignatura_id)
);

-- =====================================================
-- TABLAS INFRAESTRUCTURA
-- =====================================================

DROP TABLE IF EXISTS salas;
CREATE TABLE salas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  edificio_id TEXT NOT NULL,
  piso INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('aula', 'laboratorio', 'auditorio', 'taller', 'sala_reuniones', 'oficina', 'biblioteca', 'medioteca')),
  capacidad INTEGER NOT NULL,
  mobiliario TEXT, -- JSON Array
  tipo_mobiliario TEXT DEFAULT NULL CHECK(tipo_mobiliario IN ('sillas_individuales', 'butacas', 'mesas_sillas', 'mesas_trabajo', 'computadores', 'mixto')),
  equipamiento TEXT, -- JSON Array
  reglas TEXT,
  lat REAL,
  lng REAL,
  tipo_gestion TEXT DEFAULT 'central' CHECK(tipo_gestion IN ('central', 'carrera', 'unidad')),
  gestion_carrera_id TEXT,
  gestion_unidad_id TEXT,
  fotos TEXT, -- JSON Array of URLs
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE,
  FOREIGN KEY (gestion_carrera_id) REFERENCES carreras(id) ON DELETE SET NULL,
  FOREIGN KEY (gestion_unidad_id) REFERENCES unidades_academicas(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS areas_comunes;
CREATE TABLE areas_comunes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK(tipo IN ('baño', 'pasillo', 'patio', 'cafeteria', 'biblioteca', 'otro')),
  edificio_id TEXT NOT NULL,
  piso INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  lat REAL,
  lng REAL,
  qr_code TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA CENTRAL: HORARIOS
-- =====================================================

DROP TABLE IF EXISTS horarios;
CREATE TABLE horarios (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK(tipo IN ('clase', 'evento', 'examen', 'taller')),
  asignatura_id TEXT,
  sala_id TEXT NOT NULL,
  docente_id TEXT,
  nivel_id TEXT,
  bloque_id TEXT NOT NULL,
  temporada_id TEXT NOT NULL,
  dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 6),
  recurrencia TEXT NOT NULL CHECK(recurrencia IN ('semanal', 'quincenal', 'mensual', 'unica', 'anual')),
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  semana_par_impar TEXT CHECK(semana_par_impar IN ('par', 'impar')),
  observaciones TEXT,
  activo INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE SET NULL,
  FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE SET NULL,
  FOREIGN KEY (bloque_id) REFERENCES bloques_horarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- TABLAS DE SOLICITUDES Y OBSERVACIONES
-- =====================================================

DROP TABLE IF EXISTS solicitudes;
CREATE TABLE solicitudes (
  id TEXT PRIMARY KEY,
  solicitante TEXT NOT NULL,
  carrera_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  motivo TEXT NOT NULL,
  asignatura_code TEXT,
  sala_preferida_id TEXT,
  tipo_sala TEXT CHECK(tipo_sala IN ('aula', 'laboratorio', 'auditorio', 'taller', 'sala_reuniones')),
  mobiliario_requerido TEXT DEFAULT NULL CHECK(mobiliario_requerido IN ('sillas_individuales', 'butacas', 'mesas_sillas', 'mesas_trabajo', 'computadores', 'mixto')),
  capacidad_requerida INTEGER,
  equipamiento_requerido TEXT, -- JSON Array
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  bloques TEXT NOT NULL, -- JSON Array of bloque_ids
  recurrente INTEGER DEFAULT 0,
  patron_recurrencia TEXT, -- JSON
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aprobada', 'rechazada', 'auto_aprobada')),
  sala_asignada_id TEXT,
  respuesta_gestor TEXT,
  revisado_por TEXT,
  procesada_por_agente INTEGER DEFAULT 0,
  confianza_agente INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sala_preferida_id) REFERENCES salas(id) ON DELETE SET NULL,
  FOREIGN KEY (sala_asignada_id) REFERENCES salas(id) ON DELETE SET NULL,
  FOREIGN KEY (revisado_por) REFERENCES users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS observaciones;
CREATE TABLE observaciones (
  id TEXT PRIMARY KEY,
  sala_id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'comentario' CHECK(tipo IN ('comentario', 'problema', 'sugerencia', 'mantenimiento', 'ayuda')),
  mensaje TEXT NOT NULL,
  autor_nombre TEXT,
  autor_email TEXT,
  estado TEXT DEFAULT 'nuevo' CHECK(estado IN ('nuevo', 'revision', 'en_proceso', 'resuelto', 'cerrado')),
  prioridad TEXT DEFAULT 'media' CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')),
  respuesta TEXT,
  revisado_por TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
  FOREIGN KEY (revisado_por) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLAS DE MAPA
-- =====================================================

DROP TABLE IF EXISTS pois;
CREATE TABLE pois (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  icon TEXT,
  color TEXT,
  edificio_id TEXT,
  activo INTEGER DEFAULT 1,
  metadata TEXT, -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS map_areas;
CREATE TABLE map_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  coordinates TEXT NOT NULL, -- JSON Array of [lat, lng]
  color TEXT NOT NULL DEFAULT '#3388ff',
  fill_opacity REAL DEFAULT 0.3,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS routes;
CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  from_poi_id TEXT,
  to_poi_id TEXT,
  points TEXT NOT NULL, -- JSON Array of [lat, lng]
  type TEXT NOT NULL DEFAULT 'walking',
  color TEXT NOT NULL DEFAULT '#3388ff',
  width INTEGER DEFAULT 3,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_poi_id) REFERENCES pois(id) ON DELETE SET NULL,
  FOREIGN KEY (to_poi_id) REFERENCES pois(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLAS DE AGENDA
-- =====================================================

DROP TABLE IF EXISTS agenda_disponibilidad;
CREATE TABLE agenda_disponibilidad (
  id TEXT PRIMARY KEY,
  director_id TEXT NOT NULL,
  dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 6),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  duracion_cita INTEGER DEFAULT 30,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (director_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS agenda_citas;
CREATE TABLE agenda_citas (
  id TEXT PRIMARY KEY,
  director_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  nombre_solicitante TEXT NOT NULL,
  email_solicitante TEXT,
  telefono_solicitante TEXT,
  motivo TEXT NOT NULL,
  estado TEXT DEFAULT 'confirmada' CHECK(estado IN ('confirmada', 'cancelada')),
  creado_por TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (director_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLAS DE CONFIGURACIÓN
-- =====================================================

DROP TABLE IF EXISTS system_config;
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Horarios: detección de conflictos (consulta más crítica)
CREATE INDEX IF NOT EXISTS idx_horarios_conflictos ON horarios(sala_id, dia_semana, bloque_id, temporada_id, activo);
CREATE INDEX IF NOT EXISTS idx_horarios_docente ON horarios(docente_id, dia_semana, bloque_id, temporada_id, activo);
CREATE INDEX IF NOT EXISTS idx_horarios_nivel ON horarios(nivel_id, dia_semana, bloque_id, temporada_id, activo);
CREATE INDEX IF NOT EXISTS idx_horarios_asignatura ON horarios(asignatura_id);
CREATE INDEX IF NOT EXISTS idx_horarios_temporada ON horarios(temporada_id);

-- Académicos
CREATE INDEX IF NOT EXISTS idx_niveles_carrera ON niveles(carrera_id);
CREATE INDEX IF NOT EXISTS idx_asignaturas_nivel ON asignaturas(nivel_id);
CREATE INDEX IF NOT EXISTS idx_asignaturas_carrera ON asignaturas(carrera_id);
CREATE INDEX IF NOT EXISTS idx_docente_disp_docente ON docente_disponibilidad(docente_id);
CREATE INDEX IF NOT EXISTS idx_docente_asig_docente ON docente_asignaturas(docente_id);
CREATE INDEX IF NOT EXISTS idx_docente_asig_asignatura ON docente_asignaturas(asignatura_id);

-- Infraestructura
CREATE INDEX IF NOT EXISTS idx_salas_edificio ON salas(edificio_id);
CREATE INDEX IF NOT EXISTS idx_salas_activo ON salas(activo);
CREATE INDEX IF NOT EXISTS idx_bloques_sistema ON bloques_horarios(sistema_bloque_id);

-- Solicitudes
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_carrera ON solicitudes(carrera_id);

-- Observaciones
CREATE INDEX IF NOT EXISTS idx_observaciones_sala ON observaciones(sala_id);
CREATE INDEX IF NOT EXISTS idx_observaciones_estado ON observaciones(estado);

-- Mapa
CREATE INDEX IF NOT EXISTS idx_pois_edificio ON pois(edificio_id);
CREATE INDEX IF NOT EXISTS idx_pois_category ON pois(category);

-- Agenda
CREATE INDEX IF NOT EXISTS idx_agenda_disp_director ON agenda_disponibilidad(director_id);
CREATE INDEX IF NOT EXISTS idx_agenda_citas_director ON agenda_citas(director_id, fecha);
CREATE INDEX IF NOT EXISTS idx_agenda_citas_fecha ON agenda_citas(fecha, estado);

-- =====================================================
-- SOLVER Y VERSIONADO DE HORARIOS
-- =====================================================

-- Secciones: subgrupos de un nivel (A, B, C) para practicas
DROP TABLE IF EXISTS secciones;
CREATE TABLE secciones (
  id TEXT PRIMARY KEY,
  nivel_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  alumnos INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE
);

-- Sesiones: unidad minima de asignacion del solver
DROP TABLE IF EXISTS sesiones;
CREATE TABLE sesiones (
  id TEXT PRIMARY KEY,
  asignatura_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('teorica', 'practica')),
  seccion_id TEXT,
  docente_id TEXT,
  alumnos_estimados INTEGER NOT NULL DEFAULT 0,
  bloques_requeridos INTEGER NOT NULL DEFAULT 1,
  etiqueta TEXT,
  fijada INTEGER DEFAULT 0,
  temporada_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
  FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE SET NULL,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL,
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE
);

-- Bloqueos de nivel: dias/bloques reservados por direccion de carrera
DROP TABLE IF EXISTS bloqueos_nivel;
CREATE TABLE bloqueos_nivel (
  id TEXT PRIMARY KEY,
  nivel_id TEXT NOT NULL,
  temporada_id TEXT NOT NULL,
  dia_semana INTEGER,
  bloque_id TEXT,
  motivo TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE,
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
  FOREIGN KEY (bloque_id) REFERENCES bloques_horarios(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Bloqueos institucionales: eventos que bloquean todo el campus
DROP TABLE IF EXISTS bloqueos_institucionales;
CREATE TABLE bloqueos_institucionales (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  temporada_id TEXT,
  motivo TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Bloqueos de sala: mantenimiento programado
DROP TABLE IF EXISTS bloqueos_sala;
CREATE TABLE bloqueos_sala (
  id TEXT PRIMARY KEY,
  sala_id TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  motivo TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Distancias entre edificios (tiempo real de traslado en minutos)
DROP TABLE IF EXISTS distancias_edificios;
CREATE TABLE distancias_edificios (
  id TEXT PRIMARY KEY,
  edificio_origen_id TEXT NOT NULL,
  edificio_destino_id TEXT NOT NULL,
  minutos INTEGER NOT NULL,
  techado INTEGER DEFAULT 0,
  notas TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edificio_origen_id) REFERENCES edificios(id) ON DELETE CASCADE,
  FOREIGN KEY (edificio_destino_id) REFERENCES edificios(id) ON DELETE CASCADE,
  UNIQUE(edificio_origen_id, edificio_destino_id)
);

-- Versionado: branches (propuestas de horario)
DROP TABLE IF EXISTS horario_branches;
CREATE TABLE horario_branches (
  id TEXT PRIMARY KEY,
  temporada_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_principal INTEGER DEFAULT 0,
  branch_padre_id TEXT,
  commit_padre_id TEXT,
  estado TEXT DEFAULT 'borrador'
    CHECK(estado IN ('borrador', 'revision', 'aprobado', 'publicado', 'descartado')),
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_padre_id) REFERENCES horario_branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Versionado: commits (snapshots con metadatos)
DROP TABLE IF EXISTS horario_commits;
CREATE TABLE horario_commits (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  commit_padre_id TEXT,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL
    CHECK(tipo IN ('solver', 'manual', 'solicitud', 'import', 'merge', 'rollback')),
  autor_id TEXT NOT NULL,
  metadata TEXT,
  score_global REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES horario_branches(id) ON DELETE CASCADE,
  FOREIGN KEY (commit_padre_id) REFERENCES horario_commits(id) ON DELETE SET NULL,
  FOREIGN KEY (autor_id) REFERENCES users(id)
);

-- Versionado: asignaciones por commit
DROP TABLE IF EXISTS horario_asignaciones;
CREATE TABLE horario_asignaciones (
  id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL,
  sesion_id TEXT NOT NULL,
  sala_id TEXT,
  bloque_id TEXT,
  dia_semana INTEGER,
  docente_id TEXT,
  score INTEGER,
  explicacion TEXT,
  FOREIGN KEY (commit_id) REFERENCES horario_commits(id) ON DELETE CASCADE
);

-- Versionado: tags (versiones oficiales publicadas)
DROP TABLE IF EXISTS horario_tags;
CREATE TABLE horario_tags (
  id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commit_id) REFERENCES horario_commits(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tokens API para autenticacion del solver externo
DROP TABLE IF EXISTS solver_api_tokens;
CREATE TABLE solver_api_tokens (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices del solver y versionado
CREATE INDEX IF NOT EXISTS idx_sesiones_asignatura ON sesiones(asignatura_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_temporada ON sesiones(temporada_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_docente ON sesiones(docente_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_nivel_nivel ON bloqueos_nivel(nivel_id, temporada_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_inst_temporada ON bloqueos_institucionales(temporada_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_sala_sala ON bloqueos_sala(sala_id);
CREATE INDEX IF NOT EXISTS idx_distancias_origen ON distancias_edificios(edificio_origen_id);
CREATE INDEX IF NOT EXISTS idx_branches_temporada ON horario_branches(temporada_id);
CREATE INDEX IF NOT EXISTS idx_commits_branch ON horario_commits(branch_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_commit ON horario_asignaciones(commit_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_sesion ON horario_asignaciones(sesion_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON solver_api_tokens(token);
