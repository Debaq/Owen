<?php
// backend/api/solver-confirm.php
// Confirma una propuesta: escribe asignaciones del commit en tabla horarios
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Método no permitido'], 405);
}

requireRole('gestor');

$data = getJsonInput();

if (empty($data['commit_id'])) {
    jsonResponse(['error' => 'commit_id requerido'], 400);
}

$commitId = $data['commit_id'];
$tagNombre = isset($data['tag_nombre']) ? sanitizeString($data['tag_nombre']) : null;

// Verificar que el commit existe y obtener info
$stmt = $pdo->prepare(
    "SELECT c.*, b.temporada_id, b.id as branch_id
     FROM horario_commits c
     JOIN horario_branches b ON c.branch_id = b.id
     WHERE c.id = ?"
);
$stmt->execute([$commitId]);
$commit = $stmt->fetch();

if (!$commit) {
    jsonResponse(['error' => 'Commit no encontrado'], 404);
}

$temporadaId = $commit['temporada_id'];
$branchId = $commit['branch_id'];

// Cargar asignaciones del commit con datos enriquecidos
$stmt = $pdo->prepare(
    "SELECT ha.*, s.asignatura_id, s.tipo as sesion_tipo, s.seccion_id
     FROM horario_asignaciones ha
     JOIN sesiones s ON ha.sesion_id = s.id
     WHERE ha.commit_id = ?"
);
$stmt->execute([$commitId]);
$asignaciones = $stmt->fetchAll();

if (empty($asignaciones)) {
    jsonResponse(['error' => 'El commit no tiene asignaciones'], 400);
}

// Obtener temporada para fechas
$stmt = $pdo->prepare("SELECT * FROM temporadas WHERE id = ?");
$stmt->execute([$temporadaId]);
$temporada = $stmt->fetch();

if (!$temporada) {
    jsonResponse(['error' => 'Temporada no encontrada'], 404);
}

$pdo->beginTransaction();

try {
    // 1. Desactivar horarios existentes de la temporada
    $stmt = $pdo->prepare("UPDATE horarios SET activo = 0 WHERE temporada_id = ? AND activo = 1");
    $stmt->execute([$temporadaId]);
    $desactivados = $stmt->rowCount();

    // 2. Insertar nuevos horarios desde asignaciones
    $insertStmt = $pdo->prepare(
        "INSERT INTO horarios (id, tipo, asignatura_id, sala_id, docente_id, nivel_id, bloque_id,
                               temporada_id, dia_semana, recurrencia, fecha_inicio, fecha_fin,
                               observaciones, activo, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'semanal', ?, ?, ?, 1, ?)"
    );

    // Obtener nivel_id por asignatura_id (cache)
    $nivelCache = [];
    $stmtNivel = $pdo->prepare("SELECT nivel_id FROM asignaturas WHERE id = ?");

    $insertados = 0;
    foreach ($asignaciones as $asig) {
        if (empty($asig['sala_id']) || empty($asig['bloque_id']) || $asig['dia_semana'] === null) {
            continue; // Sesión no asignada, saltar
        }

        // Resolver nivel_id
        $asignaturaId = $asig['asignatura_id'];
        if (!isset($nivelCache[$asignaturaId])) {
            $stmtNivel->execute([$asignaturaId]);
            $nivelRow = $stmtNivel->fetch();
            $nivelCache[$asignaturaId] = $nivelRow ? $nivelRow['nivel_id'] : null;
        }

        $tipo = $asig['sesion_tipo'] === 'practica' ? 'taller' : 'clase';

        $insertStmt->execute([
            generateUUID(),
            $tipo,
            $asignaturaId,
            $asig['sala_id'],
            $asig['docente_id'],
            $nivelCache[$asignaturaId],
            $asig['bloque_id'],
            $temporadaId,
            (int)$asig['dia_semana'],
            $temporada['fecha_inicio'],
            $temporada['fecha_fin'],
            $asig['explicacion'],
            $_SESSION['user_id']
        ]);
        $insertados++;
    }

    // 3. Actualizar branch a publicado
    $pdo->prepare("UPDATE horario_branches SET estado = 'publicado', updated_at = datetime('now') WHERE id = ?")
        ->execute([$branchId]);

    // 4. Crear tag si se pidió
    $tagId = null;
    if (!empty($tagNombre)) {
        $tagId = generateUUID();
        $stmt = $pdo->prepare(
            "INSERT INTO horario_tags (id, commit_id, nombre, descripcion, created_by)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $tagId,
            $commitId,
            $tagNombre,
            "Publicado desde commit {$commitId}",
            $_SESSION['user_id']
        ]);
    }

    $pdo->commit();

    securityLog('SOLVER_CONFIRM', "Commit {$commitId}: {$insertados} horarios escritos, {$desactivados} desactivados");

    jsonResponse([
        'success' => true,
        'data' => [
            'horarios_insertados' => $insertados,
            'horarios_desactivados' => $desactivados,
            'branch_id' => $branchId,
            'commit_id' => $commitId,
            'tag_id' => $tagId,
            'temporada_id' => $temporadaId
        ],
        'message' => "Propuesta confirmada: {$insertados} horarios publicados"
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    securityLog('DB_ERROR', 'solver-confirm: ' . $e->getMessage());
    jsonResponse(['error' => 'Error al confirmar propuesta'], 500);
}
?>
