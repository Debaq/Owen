<?php
/**
 * Migración unificada del Sistema Owen.
 * Ejecutar: php migrate.php
 * Idempotente — verifica existencia antes de cada operación.
 */

require_once 'config.php';

function columnExists($pdo, $table, $column) {
    $stmt = $pdo->prepare("PRAGMA table_info($table)");
    $stmt->execute();
    $columns = $stmt->fetchAll();
    foreach ($columns as $col) {
        if ($col['name'] === $column) {
            return true;
        }
    }
    return false;
}

function tableExists($pdo, $table) {
    $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
    $stmt->execute([$table]);
    return $stmt->fetch() !== false;
}

$results = [];
$errors = [];

echo "=== Migración Sistema Owen ===\n\n";

// ─────────────────────────────────────────────
// 1. Columnas nuevas en tablas existentes
// ─────────────────────────────────────────────

// salas.tipo_mobiliario
if (!columnExists($pdo, 'salas', 'tipo_mobiliario')) {
    $pdo->exec("ALTER TABLE salas ADD COLUMN tipo_mobiliario TEXT DEFAULT NULL");
    $results[] = '[+] salas.tipo_mobiliario';
} else {
    $results[] = '[=] salas.tipo_mobiliario (ya existe)';
}

// solicitudes.mobiliario_requerido
if (!columnExists($pdo, 'solicitudes', 'mobiliario_requerido')) {
    $pdo->exec("ALTER TABLE solicitudes ADD COLUMN mobiliario_requerido TEXT DEFAULT NULL");
    $results[] = '[+] solicitudes.mobiliario_requerido';
} else {
    $results[] = '[=] solicitudes.mobiliario_requerido (ya existe)';
}

// ─────────────────────────────────────────────
// 2. Tablas nuevas
// ─────────────────────────────────────────────

// agenda_disponibilidad
if (!tableExists($pdo, 'agenda_disponibilidad')) {
    $pdo->exec("CREATE TABLE agenda_disponibilidad (
        id TEXT PRIMARY KEY,
        director_id TEXT NOT NULL,
        dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 6),
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        duracion_cita INTEGER DEFAULT 30,
        activo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (director_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    $results[] = '[+] tabla agenda_disponibilidad';
} else {
    $results[] = '[=] tabla agenda_disponibilidad (ya existe)';
}

// agenda_citas
if (!tableExists($pdo, 'agenda_citas')) {
    $pdo->exec("CREATE TABLE agenda_citas (
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
    )");
    $results[] = '[+] tabla agenda_citas';
} else {
    $results[] = '[=] tabla agenda_citas (ya existe)';
}

// ─────────────────────────────────────────────
// 3. Índices (IF NOT EXISTS es seguro)
// ─────────────────────────────────────────────

$indices = [
    'CREATE INDEX IF NOT EXISTS idx_horarios_conflictos ON horarios(sala_id, dia_semana, bloque_id, temporada_id, activo)',
    'CREATE INDEX IF NOT EXISTS idx_horarios_docente ON horarios(docente_id, dia_semana, bloque_id, temporada_id, activo)',
    'CREATE INDEX IF NOT EXISTS idx_horarios_nivel ON horarios(nivel_id, dia_semana, bloque_id, temporada_id, activo)',
    'CREATE INDEX IF NOT EXISTS idx_horarios_asignatura ON horarios(asignatura_id)',
    'CREATE INDEX IF NOT EXISTS idx_horarios_temporada ON horarios(temporada_id)',
    'CREATE INDEX IF NOT EXISTS idx_niveles_carrera ON niveles(carrera_id)',
    'CREATE INDEX IF NOT EXISTS idx_asignaturas_nivel ON asignaturas(nivel_id)',
    'CREATE INDEX IF NOT EXISTS idx_asignaturas_carrera ON asignaturas(carrera_id)',
    'CREATE INDEX IF NOT EXISTS idx_docente_disp_docente ON docente_disponibilidad(docente_id)',
    'CREATE INDEX IF NOT EXISTS idx_docente_asig_docente ON docente_asignaturas(docente_id)',
    'CREATE INDEX IF NOT EXISTS idx_docente_asig_asignatura ON docente_asignaturas(asignatura_id)',
    'CREATE INDEX IF NOT EXISTS idx_salas_edificio ON salas(edificio_id)',
    'CREATE INDEX IF NOT EXISTS idx_salas_activo ON salas(activo)',
    'CREATE INDEX IF NOT EXISTS idx_bloques_sistema ON bloques_horarios(sistema_bloque_id)',
    'CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(usuario_id)',
    'CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado)',
    'CREATE INDEX IF NOT EXISTS idx_solicitudes_carrera ON solicitudes(carrera_id)',
    'CREATE INDEX IF NOT EXISTS idx_observaciones_sala ON observaciones(sala_id)',
    'CREATE INDEX IF NOT EXISTS idx_observaciones_estado ON observaciones(estado)',
    'CREATE INDEX IF NOT EXISTS idx_pois_edificio ON pois(edificio_id)',
    'CREATE INDEX IF NOT EXISTS idx_pois_category ON pois(category)',
    'CREATE INDEX IF NOT EXISTS idx_agenda_disp_director ON agenda_disponibilidad(director_id)',
    'CREATE INDEX IF NOT EXISTS idx_agenda_citas_director ON agenda_citas(director_id, fecha)',
    'CREATE INDEX IF NOT EXISTS idx_agenda_citas_fecha ON agenda_citas(fecha, estado)',
];

$indexCount = 0;
foreach ($indices as $idx) {
    $pdo->exec($idx);
    $indexCount++;
}
$results[] = "[+] $indexCount indices creados/verificados";

// ─────────────────────────────────────────────
// Resultado
// ─────────────────────────────────────────────

foreach ($results as $r) {
    echo "  $r\n";
}

if (!empty($errors)) {
    echo "\nErrores:\n";
    foreach ($errors as $e) {
        echo "  [!] $e\n";
    }
}

echo "\nMigración finalizada (" . count($results) . " operaciones)\n";
