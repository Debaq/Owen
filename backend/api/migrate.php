<?php
/**
 * Migración unificada del Sistema Owen.
 * Ejecutar: php migrate.php
 * Idempotente — verifica existencia antes de cada operación.
 */

require_once 'config.php';

$isCli = php_sapi_name() === 'cli';

// Si no es CLI, requiere autenticación de gestor
if (!$isCli) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Use POST para ejecutar migraciones'], 405);
    }
    requireRole('gestor');
}

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
// 3. Tablas del Solver y Versionado
// ─────────────────────────────────────────────

$solverTables = [
    'secciones' => "CREATE TABLE IF NOT EXISTS secciones (
        id TEXT PRIMARY KEY, nivel_id TEXT NOT NULL, nombre TEXT NOT NULL,
        alumnos INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE)",

    'sesiones' => "CREATE TABLE IF NOT EXISTS sesiones (
        id TEXT PRIMARY KEY, asignatura_id TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('teorica', 'practica')),
        seccion_id TEXT, docente_id TEXT, alumnos_estimados INTEGER NOT NULL DEFAULT 0,
        bloques_requeridos INTEGER NOT NULL DEFAULT 1, etiqueta TEXT, fijada INTEGER DEFAULT 0,
        temporada_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
        FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE SET NULL,
        FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE)",

    'bloqueos_nivel' => "CREATE TABLE IF NOT EXISTS bloqueos_nivel (
        id TEXT PRIMARY KEY, nivel_id TEXT NOT NULL, temporada_id TEXT NOT NULL,
        dia_semana INTEGER, bloque_id TEXT, motivo TEXT, created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
        FOREIGN KEY (bloque_id) REFERENCES bloques_horarios(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id))",

    'bloqueos_institucionales' => "CREATE TABLE IF NOT EXISTS bloqueos_institucionales (
        id TEXT PRIMARY KEY, nombre TEXT NOT NULL, fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL, temporada_id TEXT, motivo TEXT, created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id))",

    'bloqueos_sala' => "CREATE TABLE IF NOT EXISTS bloqueos_sala (
        id TEXT PRIMARY KEY, sala_id TEXT NOT NULL, fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL, motivo TEXT, created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id))",

    'distancias_edificios' => "CREATE TABLE IF NOT EXISTS distancias_edificios (
        id TEXT PRIMARY KEY, edificio_origen_id TEXT NOT NULL, edificio_destino_id TEXT NOT NULL,
        minutos INTEGER NOT NULL, techado INTEGER DEFAULT 0, notas TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (edificio_origen_id) REFERENCES edificios(id) ON DELETE CASCADE,
        FOREIGN KEY (edificio_destino_id) REFERENCES edificios(id) ON DELETE CASCADE,
        UNIQUE(edificio_origen_id, edificio_destino_id))",

    'horario_branches' => "CREATE TABLE IF NOT EXISTS horario_branches (
        id TEXT PRIMARY KEY, temporada_id TEXT NOT NULL, nombre TEXT NOT NULL,
        descripcion TEXT, es_principal INTEGER DEFAULT 0, branch_padre_id TEXT,
        commit_padre_id TEXT,
        estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador','revision','aprobado','publicado','descartado')),
        created_by TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_padre_id) REFERENCES horario_branches(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id))",

    'horario_commits' => "CREATE TABLE IF NOT EXISTS horario_commits (
        id TEXT PRIMARY KEY, branch_id TEXT NOT NULL, commit_padre_id TEXT,
        mensaje TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('solver','manual','solicitud','import','merge','rollback')),
        autor_id TEXT NOT NULL, metadata TEXT, score_global REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES horario_branches(id) ON DELETE CASCADE,
        FOREIGN KEY (commit_padre_id) REFERENCES horario_commits(id) ON DELETE SET NULL,
        FOREIGN KEY (autor_id) REFERENCES users(id))",

    'horario_asignaciones' => "CREATE TABLE IF NOT EXISTS horario_asignaciones (
        id TEXT PRIMARY KEY, commit_id TEXT NOT NULL, sesion_id TEXT NOT NULL,
        sala_id TEXT, bloque_id TEXT, dia_semana INTEGER, docente_id TEXT,
        score INTEGER, explicacion TEXT,
        FOREIGN KEY (commit_id) REFERENCES horario_commits(id) ON DELETE CASCADE)",

    'horario_tags' => "CREATE TABLE IF NOT EXISTS horario_tags (
        id TEXT PRIMARY KEY, commit_id TEXT NOT NULL, nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT, created_by TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (commit_id) REFERENCES horario_commits(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id))",

    'solver_api_tokens' => "CREATE TABLE IF NOT EXISTS solver_api_tokens (
        id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL,
        nombre TEXT NOT NULL, activo INTEGER DEFAULT 1, last_used_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
];

foreach ($solverTables as $name => $sql) {
    if (!tableExists($pdo, $name)) {
        $pdo->exec($sql);
        $results[] = "[+] tabla $name";
    } else {
        $results[] = "[=] tabla $name (ya existe)";
    }
}

// Columnas solver
$solverColumns = [
    ['niveles', 'alumnos_estimados', 'INTEGER DEFAULT 0'],
    ['asignaturas', 'equipamiento_requerido', "TEXT DEFAULT '[]'"],
    ['asignaturas', 'requiere_laboratorio', 'INTEGER DEFAULT 0'],
    ['docente_disponibilidad', 'preferencia', 'INTEGER DEFAULT 3'],
    ['docente_disponibilidad', 'temporada_id', 'TEXT'],
];

foreach ($solverColumns as $col) {
    if (tableExists($pdo, $col[0]) && !columnExists($pdo, $col[0], $col[1])) {
        $pdo->exec("ALTER TABLE {$col[0]} ADD COLUMN {$col[1]} {$col[2]}");
        $results[] = "[+] {$col[0]}.{$col[1]}";
    } else {
        $results[] = "[=] {$col[0]}.{$col[1]} (ya existe)";
    }
}

// ─────────────────────────────────────────────
// 4. Índices (IF NOT EXISTS es seguro)
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
    // Solver
    'CREATE INDEX IF NOT EXISTS idx_sesiones_asignatura ON sesiones(asignatura_id)',
    'CREATE INDEX IF NOT EXISTS idx_sesiones_temporada ON sesiones(temporada_id)',
    'CREATE INDEX IF NOT EXISTS idx_sesiones_docente ON sesiones(docente_id)',
    'CREATE INDEX IF NOT EXISTS idx_bloqueos_nivel_nivel ON bloqueos_nivel(nivel_id, temporada_id)',
    'CREATE INDEX IF NOT EXISTS idx_bloqueos_inst_temporada ON bloqueos_institucionales(temporada_id)',
    'CREATE INDEX IF NOT EXISTS idx_bloqueos_sala_sala ON bloqueos_sala(sala_id)',
    'CREATE INDEX IF NOT EXISTS idx_distancias_origen ON distancias_edificios(edificio_origen_id)',
    'CREATE INDEX IF NOT EXISTS idx_branches_temporada ON horario_branches(temporada_id)',
    'CREATE INDEX IF NOT EXISTS idx_commits_branch ON horario_commits(branch_id)',
    'CREATE INDEX IF NOT EXISTS idx_asignaciones_commit ON horario_asignaciones(commit_id)',
    'CREATE INDEX IF NOT EXISTS idx_asignaciones_sesion ON horario_asignaciones(sesion_id)',
    'CREATE INDEX IF NOT EXISTS idx_tokens_token ON solver_api_tokens(token)',
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

if ($isCli) {
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
} else {
    jsonResponse([
        'success' => true,
        'data' => $results,
        'message' => 'Migración completada: ' . count($results) . ' operaciones'
    ]);
}
