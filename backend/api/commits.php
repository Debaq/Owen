<?php
// backend/api/commits.php
// CRUD de commits del sistema de versionado de horarios
// Cada commit contiene un snapshot completo de asignaciones
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    default:
        jsonResponse(['error' => 'Metodo no permitido'], 405);
}

function handleGet($pdo) {
    requireAuth();

    $id = isset($_GET['id']) ? $_GET['id'] : null;
    $branchId = isset($_GET['branch_id']) ? $_GET['branch_id'] : null;

    if ($id) {
        getCommit($pdo, $id);
        return;
    }

    if (empty($branchId)) {
        jsonResponse(['error' => 'branch_id requerido'], 400);
    }

    $sql = "SELECT c.*, u.name as autor_nombre,
                   (SELECT COUNT(*) FROM horario_asignaciones WHERE commit_id = c.id) as total_asignaciones
            FROM horario_commits c
            JOIN users u ON c.autor_id = u.id
            WHERE c.branch_id = ?
            ORDER BY c.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$branchId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['score_global'] = $row['score_global'] !== null ? (float)$row['score_global'] : null;
        $row['total_asignaciones'] = (int)$row['total_asignaciones'];
        if ($row['metadata']) {
            $row['metadata'] = json_decode($row['metadata'], true);
        }
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function getCommit($pdo, $id) {
    $stmt = $pdo->prepare(
        "SELECT c.*, u.name as autor_nombre, b.nombre as branch_nombre
         FROM horario_commits c
         JOIN users u ON c.autor_id = u.id
         JOIN horario_branches b ON c.branch_id = b.id
         WHERE c.id = ?"
    );
    $stmt->execute([$id]);
    $commit = $stmt->fetch();

    if (!$commit) {
        jsonResponse(['error' => 'Commit no encontrado'], 404);
    }

    $commit['score_global'] = $commit['score_global'] !== null ? (float)$commit['score_global'] : null;
    if ($commit['metadata']) {
        $commit['metadata'] = json_decode($commit['metadata'], true);
    }

    // Cargar asignaciones si se pide
    $includeAsignaciones = isset($_GET['include_asignaciones']) && $_GET['include_asignaciones'] === 'true';

    if ($includeAsignaciones) {
        $stmt = $pdo->prepare(
            "SELECT a.*, s.etiqueta as sesion_etiqueta, s.tipo as sesion_tipo,
                    sa.name as sala_nombre, sa.code as sala_code,
                    bl.nombre as bloque_nombre, bl.hora_inicio, bl.hora_fin,
                    d.name as docente_nombre
             FROM horario_asignaciones a
             LEFT JOIN sesiones s ON a.sesion_id = s.id
             LEFT JOIN salas sa ON a.sala_id = sa.id
             LEFT JOIN bloques_horarios bl ON a.bloque_id = bl.id
             LEFT JOIN docentes d ON a.docente_id = d.id
             WHERE a.commit_id = ?
             ORDER BY a.dia_semana, bl.orden"
        );
        $stmt->execute([$id]);
        $asignaciones = $stmt->fetchAll();

        foreach ($asignaciones as &$asig) {
            $asig['dia_semana'] = $asig['dia_semana'] !== null ? (int)$asig['dia_semana'] : null;
            $asig['score'] = $asig['score'] !== null ? (int)$asig['score'] : null;
        }

        $commit['asignaciones'] = $asignaciones;
    }

    // Contar asignaciones
    $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM horario_asignaciones WHERE commit_id = ?");
    $stmt->execute([$id]);
    $commit['total_asignaciones'] = (int)$stmt->fetch()['c'];

    jsonResponse(['success' => true, 'data' => $commit]);
}

function handlePost($pdo) {
    requireAuthOrToken();
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createCommit($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createCommit($pdo) {
    $data = getJsonInput();

    $required = ['branch_id', 'mensaje', 'tipo'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    $tiposValidos = ['solver', 'manual', 'solicitud', 'import', 'merge', 'rollback'];
    if (!in_array($data['tipo'], $tiposValidos)) {
        jsonResponse(['error' => 'Tipo no valido: ' . implode(', ', $tiposValidos)], 400);
    }

    // Verificar que el branch existe
    $stmt = $pdo->prepare("SELECT id FROM horario_branches WHERE id = ?");
    $stmt->execute([$data['branch_id']]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Branch no encontrado'], 404);
    }

    // Obtener ultimo commit del branch para encadenar
    $stmt = $pdo->prepare(
        "SELECT id FROM horario_commits WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->execute([$data['branch_id']]);
    $ultimoCommit = $stmt->fetch();
    $commitPadreId = $ultimoCommit ? $ultimoCommit['id'] : null;

    $asignaciones = isset($data['asignaciones']) && is_array($data['asignaciones']) ? $data['asignaciones'] : [];

    // Calcular score global
    $scoreGlobal = null;
    if (!empty($asignaciones)) {
        $scores = array_filter(array_column($asignaciones, 'score'), function($s) { return $s !== null; });
        if (!empty($scores)) {
            $scoreGlobal = round(array_sum($scores) / count($scores), 1);
        }
    }

    $commitId = generateUUID();
    $metadata = isset($data['metadata']) ? json_encode($data['metadata']) : null;

    $pdo->beginTransaction();

    try {
        // Insertar commit
        $stmt = $pdo->prepare(
            "INSERT INTO horario_commits (id, branch_id, commit_padre_id, mensaje, tipo, autor_id, metadata, score_global)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $commitId,
            $data['branch_id'],
            $commitPadreId,
            sanitizeString($data['mensaje']),
            $data['tipo'],
            $_SESSION['user_id'],
            $metadata,
            $scoreGlobal
        ]);

        // Bulk insert de asignaciones
        if (!empty($asignaciones)) {
            $insertStmt = $pdo->prepare(
                "INSERT INTO horario_asignaciones (id, commit_id, sesion_id, sala_id, bloque_id, dia_semana, docente_id, score, explicacion)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

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
            }
        }

        // Actualizar timestamp del branch
        $pdo->prepare("UPDATE horario_branches SET updated_at = datetime('now') WHERE id = ?")
            ->execute([$data['branch_id']]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'data' => [
                'commit_id' => $commitId,
                'branch_id' => $data['branch_id'],
                'total_asignaciones' => count($asignaciones),
                'score_global' => $scoreGlobal
            ],
            'message' => 'Commit creado'
        ], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'commits create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear commit'], 500);
    }
}
?>
