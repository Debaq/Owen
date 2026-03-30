<?php
// backend/api/solver-import.php
// Recibe resultado del solver y crea branch + commit + asignaciones
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Método no permitido'], 405);
}

requireAuthOrToken();

$data = getJsonInput();

// Validar estructura mínima
if (empty($data['temporada_id'])) {
    jsonResponse(['error' => 'temporada_id requerido'], 400);
}

if (empty($data['resultado']) || !is_array($data['resultado'])) {
    jsonResponse(['error' => 'resultado requerido (objeto con asignaciones)'], 400);
}

$resultado = $data['resultado'];
$asignaciones = isset($resultado['asignaciones']) && is_array($resultado['asignaciones'])
    ? $resultado['asignaciones'] : [];

if (empty($asignaciones)) {
    jsonResponse(['error' => 'resultado.asignaciones vacío'], 400);
}

$temporadaId = $data['temporada_id'];
$branchId = isset($data['branch_id']) ? $data['branch_id'] : null;
$branchNombre = isset($data['branch_nombre']) ? sanitizeString($data['branch_nombre']) : null;

// Verificar temporada
$stmt = $pdo->prepare("SELECT id, nombre FROM temporadas WHERE id = ?");
$stmt->execute([$temporadaId]);
$temporada = $stmt->fetch();

if (!$temporada) {
    jsonResponse(['error' => 'Temporada no encontrada'], 404);
}

$pdo->beginTransaction();

try {
    // Crear o usar branch existente
    if (empty($branchId)) {
        $branchId = generateUUID();
        if (empty($branchNombre)) {
            $branchNombre = 'Solver ' . date('Y-m-d H:i');
        }

        // Verificar si es el primer branch
        $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM horario_branches WHERE temporada_id = ?");
        $stmt->execute([$temporadaId]);
        $esPrimero = (int)$stmt->fetch()['c'] === 0;

        $stmt = $pdo->prepare(
            "INSERT INTO horario_branches (id, temporada_id, nombre, descripcion, es_principal, created_by)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $branchId,
            $temporadaId,
            $branchNombre,
            'Generado por Owen Solver',
            $esPrimero ? 1 : 0,
            $_SESSION['user_id']
        ]);
    } else {
        // Verificar que el branch existe
        $stmt = $pdo->prepare("SELECT id FROM horario_branches WHERE id = ?");
        $stmt->execute([$branchId]);
        if (!$stmt->fetch()) {
            $pdo->rollBack();
            jsonResponse(['error' => 'Branch no encontrado'], 404);
        }
    }

    // Obtener último commit del branch
    $stmt = $pdo->prepare(
        "SELECT id FROM horario_commits WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->execute([$branchId]);
    $ultimoCommit = $stmt->fetch();
    $commitPadreId = $ultimoCommit ? $ultimoCommit['id'] : null;

    // Calcular score global
    $scores = array_filter(
        array_map(function($a) { return isset($a['score']) ? $a['score'] : null; }, $asignaciones),
        function($s) { return $s !== null; }
    );
    $scoreGlobal = !empty($scores) ? round(array_sum($scores) / count($scores), 1) : null;

    // Preparar metadata
    $metadata = [];
    if (isset($data['solver_config'])) {
        $metadata['solver_config'] = $data['solver_config'];
    }
    if (isset($resultado['estadisticas'])) {
        $metadata['estadisticas'] = $resultado['estadisticas'];
    }
    if (isset($resultado['sesiones_total'])) {
        $metadata['sesiones_total'] = $resultado['sesiones_total'];
    }
    if (isset($resultado['sesiones_asignadas'])) {
        $metadata['sesiones_asignadas'] = $resultado['sesiones_asignadas'];
    }

    $mensaje = isset($data['mensaje']) ? sanitizeString($data['mensaje']) : null;
    if (empty($mensaje)) {
        $asignadas = count($asignaciones);
        $total = isset($resultado['sesiones_total']) ? $resultado['sesiones_total'] : $asignadas;
        $mensaje = "Solver: {$asignadas}/{$total} sesiones asignadas, score {$scoreGlobal}";
    }

    // Crear commit
    $commitId = generateUUID();
    $stmt = $pdo->prepare(
        "INSERT INTO horario_commits (id, branch_id, commit_padre_id, mensaje, tipo, autor_id, metadata, score_global)
         VALUES (?, ?, ?, ?, 'solver', ?, ?, ?)"
    );
    $stmt->execute([
        $commitId,
        $branchId,
        $commitPadreId,
        $mensaje,
        $_SESSION['user_id'],
        !empty($metadata) ? json_encode($metadata) : null,
        $scoreGlobal
    ]);

    // Bulk insert de asignaciones
    $insertStmt = $pdo->prepare(
        "INSERT INTO horario_asignaciones (id, commit_id, sesion_id, sala_id, bloque_id, dia_semana, docente_id, score, explicacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $insertCount = 0;
    foreach ($asignaciones as $asig) {
        if (empty($asig['sesion_id'])) {
            continue;
        }
        $insertStmt->execute([
            generateUUID(),
            $commitId,
            $asig['sesion_id'],
            isset($asig['sala_id']) ? $asig['sala_id'] : null,
            isset($asig['bloque_id']) ? $asig['bloque_id'] : null,
            isset($asig['dia_semana']) ? (int)$asig['dia_semana'] : null,
            isset($asig['docente_id']) ? $asig['docente_id'] : null,
            isset($asig['score']) ? (int)$asig['score'] : null,
            isset($asig['explicacion']) ? $asig['explicacion'] : null
        ]);
        $insertCount++;
    }

    // Actualizar branch
    $pdo->prepare("UPDATE horario_branches SET updated_at = datetime('now') WHERE id = ?")
        ->execute([$branchId]);

    $pdo->commit();

    // Construir respuesta con no_asignadas si viene
    $response = [
        'branch_id' => $branchId,
        'commit_id' => $commitId,
        'total_asignaciones' => $insertCount,
        'score_global' => $scoreGlobal
    ];

    if (isset($resultado['no_asignadas'])) {
        $response['no_asignadas'] = $resultado['no_asignadas'];
    }

    jsonResponse([
        'success' => true,
        'data' => $response,
        'message' => "Importación completada: {$insertCount} asignaciones"
    ], 201);

} catch (PDOException $e) {
    $pdo->rollBack();
    securityLog('DB_ERROR', 'solver-import: ' . $e->getMessage());
    jsonResponse(['error' => 'Error al importar resultado'], 500);
}
?>
