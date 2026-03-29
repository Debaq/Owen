-- SQLite Schema for Sistema Owen - Versión Final 2.8

-- Enable foreign keys support
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------
-- Table users
-- -----------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('gestor', 'direccion')),
  name TEXT NOT NULL,
  carrera_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table sistemas_bloques
-- -----------------------------------------------------
DROP TABLE IF EXISTS sistemas_bloques;
CREATE TABLE sistemas_bloques (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  es_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table unidades_academicas
-- -----------------------------------------------------
DROP TABLE IF EXISTS unidades_academicas;
CREATE TABLE unidades_academicas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK(tipo IN ('centro', 'instituto', 'vicerrectoria', 'unidad', 'otro')),
  encargado_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table carreras
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table niveles
-- -----------------------------------------------------
DROP TABLE IF EXISTS niveles;
CREATE TABLE niveles (
  id TEXT PRIMARY KEY,
  carrera_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL,
  semestre TEXT NOT NULL DEFAULT 'impar' CHECK(semestre IN ('par', 'impar', 'anual')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table asignaturas
-- -----------------------------------------------------
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
  horas_semanales INTEGER NOT NULL DEFAULT 0, -- Total presencial (T+P)
  creditos INTEGER NOT NULL DEFAULT 0,
  duracion_semanas INTEGER NOT NULL DEFAULT 17, -- Semestre estándar
  semana_inicio INTEGER NOT NULL DEFAULT 1,     -- Semana en que parte
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table docentes
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table docente_disponibilidad
-- -----------------------------------------------------
DROP TABLE IF EXISTS docente_disponibilidad;
CREATE TABLE docente_disponibilidad (
  id TEXT PRIMARY KEY,
  docente_id TEXT NOT NULL,
  dia_semana INTEGER NOT NULL,
  bloque_id TEXT NOT NULL,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE,
  FOREIGN KEY (bloque_id) REFERENCES bloques_horarios(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table docente_asignaturas
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table edificios
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table salas
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table areas_comunes
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table temporadas
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table bloques_horarios
-- -----------------------------------------------------
DROP TABLE IF EXISTS bloques_horarios;
CREATE TABLE bloques_horarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  dia_semana INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  sistema_bloque_id TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sistema_bloque_id) REFERENCES sistemas_bloques(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table feriados
-- -----------------------------------------------------
DROP TABLE IF EXISTS feriados;
CREATE TABLE feriados (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('nacional', 'regional', 'institucional')),
  recurrente_anual INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table horarios
-- -----------------------------------------------------
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
  dia_semana INTEGER NOT NULL, -- 0=domingo, 1=lunes, ...
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

-- -----------------------------------------------------
-- Table solicitudes
-- -----------------------------------------------------
DROP TABLE IF EXISTS solicitudes;
CREATE TABLE solicitudes (
  id TEXT PRIMARY KEY,
  solicitante TEXT NOT NULL,
  carrera_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  motivo TEXT NOT NULL,
  asignatura_code TEXT,
  sala_preferida_id TEXT,
  tipo_sala TEXT CHECK(tipo_sala IN ('aula', 'laboratorio', 'auditorio', 'taller')),
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

-- -----------------------------------------------------
-- Table pois
-- -----------------------------------------------------
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
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Table map_areas
-- -----------------------------------------------------
DROP TABLE IF EXISTS map_areas;
CREATE TABLE map_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  coordinates TEXT NOT NULL, -- JSON Array of [lat, lng] points
  color TEXT NOT NULL DEFAULT '#3388ff',
  fill_opacity REAL DEFAULT 0.3,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table routes
-- -----------------------------------------------------
DROP TABLE IF EXISTS routes;
CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  from_poi_id TEXT,
  to_poi_id TEXT,
  points TEXT NOT NULL, -- JSON Array of [lat, lng] points
  type TEXT NOT NULL DEFAULT 'walking',
  color TEXT NOT NULL DEFAULT '#3388ff',
  width INTEGER DEFAULT 3,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_poi_id) REFERENCES pois(id) ON DELETE SET NULL,
  FOREIGN KEY (to_poi_id) REFERENCES pois(id) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Table observaciones
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table system_config
-- -----------------------------------------------------
DROP TABLE IF EXISTS system_config;
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);