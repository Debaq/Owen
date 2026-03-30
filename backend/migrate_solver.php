<?php
// backend/migrate_solver.php
// Migracion para el sistema de solver y versionado de horarios
// Ejecutar: php migrate_solver.php
// Idempotente: se puede ejecutar multiples veces sin romper nada

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Acceso denegado. Solo ejecutar desde CLI.";
    exit(1);
}

$dbFile = __DIR__ . '/db/horarios.sqlite';

if (!file_exists($dbFile)) {
    die("[ERROR] Base de datos no encontrada. Ejecute install.php primero.\n");
}

echo "=== Migracion Owen Solver ===\n\n";

try {
    $pdo = new PDO("sqlite:" . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("PRAGMA foreign_keys = ON;");
    echo "[OK] Base de datos conectada.\n";

    // Helper: verificar si una columna existe en una tabla
    function columnExists($pdo, $table, $column) {
        $stmt = $pdo->query("PRAGMA table_info({$table})");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $col) {
            if ($col['name'] === $column) {
                return true;
            }
        }
        return false;
    }

    // Helper: verificar si una tabla existe
    function tableExists($pdo, $table) {
        $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
        $stmt->execute([$table]);
        return (bool)$stmt->fetch();
    }

    // =========================================================
    // NUEVAS TABLAS
    // =========================================================

    // --- secciones ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS secciones (
            id TEXT PRIMARY KEY,
            nivel_id TEXT NOT NULL,
            nombre TEXT NOT NULL,
            alumnos INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE
        )
    ");
    echo "[OK] Tabla secciones.\n";

    // --- sesiones ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sesiones (
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
        )
    ");
    echo "[OK] Tabla sesiones.\n";

    // --- bloqueos_nivel ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bloqueos_nivel (
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
        )
    ");
    echo "[OK] Tabla bloqueos_nivel.\n";

    // --- bloqueos_institucionales ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bloqueos_institucionales (
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
        )
    ");
    echo "[OK] Tabla bloqueos_institucionales.\n";

    // --- bloqueos_sala ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bloqueos_sala (
            id TEXT PRIMARY KEY,
            sala_id TEXT NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_fin TEXT NOT NULL,
            motivo TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ");
    echo "[OK] Tabla bloqueos_sala.\n";

    // --- distancias_edificios ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS distancias_edificios (
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
        )
    ");
    echo "[OK] Tabla distancias_edificios.\n";

    // --- horario_branches ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS horario_branches (
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
        )
    ");
    echo "[OK] Tabla horario_branches.\n";

    // --- horario_commits ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS horario_commits (
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
        )
    ");
    echo "[OK] Tabla horario_commits.\n";

    // --- horario_asignaciones ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS horario_asignaciones (
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
        )
    ");
    echo "[OK] Tabla horario_asignaciones.\n";

    // --- horario_tags ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS horario_tags (
            id TEXT PRIMARY KEY,
            commit_id TEXT NOT NULL,
            nombre TEXT NOT NULL UNIQUE,
            descripcion TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (commit_id) REFERENCES horario_commits(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ");
    echo "[OK] Tabla horario_tags.\n";

    // --- solver_api_tokens ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS solver_api_tokens (
            id TEXT PRIMARY KEY,
            token TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL,
            nombre TEXT NOT NULL,
            activo INTEGER DEFAULT 1,
            last_used_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "[OK] Tabla solver_api_tokens.\n";

    // =========================================================
    // ALTER TABLAS EXISTENTES
    // =========================================================

    // niveles: alumnos_estimados
    if (tableExists($pdo, 'niveles') && !columnExists($pdo, 'niveles', 'alumnos_estimados')) {
        $pdo->exec("ALTER TABLE niveles ADD COLUMN alumnos_estimados INTEGER DEFAULT 0");
        echo "[OK] Columna niveles.alumnos_estimados agregada.\n";
    } else {
        echo "[--] niveles.alumnos_estimados ya existe.\n";
    }

    // asignaturas: equipamiento_requerido
    if (tableExists($pdo, 'asignaturas') && !columnExists($pdo, 'asignaturas', 'equipamiento_requerido')) {
        $pdo->exec("ALTER TABLE asignaturas ADD COLUMN equipamiento_requerido TEXT DEFAULT '[]'");
        echo "[OK] Columna asignaturas.equipamiento_requerido agregada.\n";
    } else {
        echo "[--] asignaturas.equipamiento_requerido ya existe.\n";
    }

    // asignaturas: requiere_laboratorio
    if (tableExists($pdo, 'asignaturas') && !columnExists($pdo, 'asignaturas', 'requiere_laboratorio')) {
        $pdo->exec("ALTER TABLE asignaturas ADD COLUMN requiere_laboratorio INTEGER DEFAULT 0");
        echo "[OK] Columna asignaturas.requiere_laboratorio agregada.\n";
    } else {
        echo "[--] asignaturas.requiere_laboratorio ya existe.\n";
    }

    // docente_disponibilidad: preferencia
    if (tableExists($pdo, 'docente_disponibilidad') && !columnExists($pdo, 'docente_disponibilidad', 'preferencia')) {
        $pdo->exec("ALTER TABLE docente_disponibilidad ADD COLUMN preferencia INTEGER DEFAULT 3");
        echo "[OK] Columna docente_disponibilidad.preferencia agregada.\n";
    } else {
        echo "[--] docente_disponibilidad.preferencia ya existe.\n";
    }

    // docente_disponibilidad: temporada_id
    if (tableExists($pdo, 'docente_disponibilidad') && !columnExists($pdo, 'docente_disponibilidad', 'temporada_id')) {
        $pdo->exec("ALTER TABLE docente_disponibilidad ADD COLUMN temporada_id TEXT");
        echo "[OK] Columna docente_disponibilidad.temporada_id agregada.\n";
    } else {
        echo "[--] docente_disponibilidad.temporada_id ya existe.\n";
    }

    // =========================================================
    // INDICES
    // =========================================================

    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sesiones_asignatura ON sesiones(asignatura_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sesiones_temporada ON sesiones(temporada_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sesiones_docente ON sesiones(docente_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bloqueos_nivel_nivel ON bloqueos_nivel(nivel_id, temporada_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bloqueos_inst_temporada ON bloqueos_institucionales(temporada_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bloqueos_sala_sala ON bloqueos_sala(sala_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_distancias_origen ON distancias_edificios(edificio_origen_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_branches_temporada ON horario_branches(temporada_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_commits_branch ON horario_commits(branch_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_asignaciones_commit ON horario_asignaciones(commit_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_asignaciones_sesion ON horario_asignaciones(sesion_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tokens_token ON solver_api_tokens(token)");
    echo "[OK] Indices creados.\n";

    echo "\n=== Migracion completada ===\n";

} catch (PDOException $e) {
    die("[ERROR] " . $e->getMessage() . "\n");
}
?>
