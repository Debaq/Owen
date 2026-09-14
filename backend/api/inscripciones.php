<?php
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
        jsonResponse(['error' => 'Método no permitido'], 405);
}

function handleGet($pdo) {
    requireRoles(['gestor', 'direccion', 'secretaria']);

    $asignaturaId = isset($_GET['asignatura_id']) ? $_GET['asignatura_id'] : null;
    $estudianteId = isset($_GET['estudiante_id']) ? $_GET['estudiante_id'] : null;
    $nivelId = isset($_GET['nivel_id']) ? $_GET['nivel_id'] : null;
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;

    if (!$temporadaId) {
        jsonResponse(['error' => 'temporada_id es requerido'], 400);
    }

    // Inscripciones de un estudiante específico
    if ($estudianteId) {
        $sql = "SELECT i.*, a.name as asignatura_nombre, a.code as asignatura_code,
                       n.nombre as nivel_nombre, n.id as nivel_id
                FROM inscripciones i
                JOIN asignaturas a ON i.asignatura_id = a.id
                JOIN niveles n ON a.nivel_id = n.id
                WHERE i.estudiante_id = ? AND i.temporada_id = ?
                ORDER BY n.orden, a.name";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$estudianteId, $temporadaId]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    // Inscripciones por asignatura
    if ($asignaturaId) {
        $sql = "SELECT i.*, e.nombre as estudiante_nombre, e.rut as estudiante_rut, e.email as estudiante_email
                FROM inscripciones i
                JOIN estudiantes e ON i.estudiante_id = e.id
                WHERE i.asignatura_id = ? AND i.temporada_id = ?
                ORDER BY e.nombre";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$asignaturaId, $temporadaId]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    // Inscripciones por nivel (join via asignaturas)
    if ($nivelId) {
        // Verificar permiso de carrera
        $stmt = $pdo->prepare("SELECT carrera_id FROM niveles WHERE id = ?");
        $stmt->execute([$nivelId]);
        $nivel = $stmt->fetch();
        if ($nivel && !isOwnCarrera($pdo, $nivel['carrera_id'])) {
            jsonResponse(['error' => 'No tiene permiso'], 403);
        }

        $sql = "SELECT i.*, e.nombre as estudiante_nombre, e.rut as estudiante_rut,
                       a.name as asignatura_nombre, a.code as asignatura_code
                FROM inscripciones i
                JOIN estudiantes e ON i.estudiante_id = e.id
                JOIN asignaturas a ON i.asignatura_id = a.id
                WHERE a.nivel_id = ? AND i.temporada_id = ?
                ORDER BY a.name, e.nombre";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$nivelId, $temporadaId]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    jsonResponse(['error' => 'Se requiere asignatura_id, estudiante_id o nivel_id'], 400);
}

function handlePost($pdo) {
    requireRoles(['gestor', 'direccion']);

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createInscripcion($pdo);
            break;
        case 'bulk_create':
            bulkCreateInscripciones($pdo);
            break;
        case 'delete':
            deleteInscripcion($pdo);
            break;
        case 'delete_by_asignatura':
            deleteByAsignatura($pdo);
            break;
        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}

function createInscripcion($pdo) {
    $data = getJsonInput();

    $required = ['estudiante_id', 'asignatura_id', 'temporada_id'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    // Verificar que la asignatura existe y obtener carrera
    $stmt = $pdo->prepare("SELECT carrera_id FROM asignaturas WHERE id = ?");
    $stmt->execute([$data['asignatura_id']]);
    $asig = $stmt->fetch();
    if (!$asig) {
        jsonResponse(['error' => 'Asignatura no encontrada'], 404);
    }

    if (!isOwnCarrera($pdo, $asig['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso para esta carrera'], 403);
    }

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO inscripciones (id, estudiante_id, asignatura_id, temporada_id)
             VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$id, $data['estudiante_id'], $data['asignatura_id'], $data['temporada_id']]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Inscripción creada'], 201);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'UNIQUE') !== false) {
            jsonResponse(['error' => 'El estudiante ya está inscrito en esta asignatura'], 409);
        }
        securityLog('DB_ERROR', 'inscripciones create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear inscripción'], 500);
    }
}

function bulkCreateInscripciones($pdo) {
    $data = getJsonInput();

    $required = ['asignatura_id', 'temporada_id', 'estudiante_ids'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && $data[$field] === '')) {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    if (!is_array($data['estudiante_ids']) || empty($data['estudiante_ids'])) {
        jsonResponse(['error' => 'Se requiere un array de estudiante_ids'], 400);
    }

    // Verificar carrera
    $stmt = $pdo->prepare("SELECT carrera_id FROM asignaturas WHERE id = ?");
    $stmt->execute([$data['asignatura_id']]);
    $asig = $stmt->fetch();
    if (!$asig) {
        jsonResponse(['error' => 'Asignatura no encontrada'], 404);
    }

    if (!isOwnCarrera($pdo, $asig['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso para esta carrera'], 403);
    }

    $insertStmt = $pdo->prepare(
        "INSERT OR IGNORE INTO inscripciones (id, estudiante_id, asignatura_id, temporada_id)
         VALUES (?, ?, ?, ?)"
    );

    $created = 0;
    $skipped = 0;

    $pdo->beginTransaction();
    try {
        foreach ($data['estudiante_ids'] as $estId) {
            $id = generateUUID();
            $insertStmt->execute([$id, $estId, $data['asignatura_id'], $data['temporada_id']]);
            if ($insertStmt->rowCount() > 0) {
                $created++;
            } else {
                $skipped++;
            }
        }

        $pdo->commit();
        jsonResponse([
            'success' => true,
            'data' => ['created' => $created, 'skipped' => $skipped],
            'message' => "Inscritos: {$created}, ya existían: {$skipped}"
        ], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'inscripciones bulk_create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error en inscripción masiva'], 500);
    }
}

function deleteInscripcion($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare(
        "SELECT i.*, a.carrera_id FROM inscripciones i
         JOIN asignaturas a ON i.asignatura_id = a.id
         WHERE i.id = ?"
    );
    $stmt->execute([$id]);
    $insc = $stmt->fetch();
    if (!$insc) {
        jsonResponse(['error' => 'Inscripción no encontrada'], 404);
    }

    if (!isOwnCarrera($pdo, $insc['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso'], 403);
    }

    $pdo->prepare("DELETE FROM inscripciones WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Inscripción eliminada']);
}

function deleteByAsignatura($pdo) {
    $data = getJsonInput();

    if (!isset($data['asignatura_id']) || !isset($data['temporada_id'])) {
        jsonResponse(['error' => 'Se requiere asignatura_id y temporada_id'], 400);
    }

    $stmt = $pdo->prepare("SELECT carrera_id FROM asignaturas WHERE id = ?");
    $stmt->execute([$data['asignatura_id']]);
    $asig = $stmt->fetch();
    if (!$asig) {
        jsonResponse(['error' => 'Asignatura no encontrada'], 404);
    }

    if (!isOwnCarrera($pdo, $asig['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso'], 403);
    }

    $stmt = $pdo->prepare(
        "DELETE FROM inscripciones WHERE asignatura_id = ? AND temporada_id = ?"
    );
    $stmt->execute([$data['asignatura_id'], $data['temporada_id']]);
    $deleted = $stmt->rowCount();

    jsonResponse(['success' => true, 'data' => ['deleted' => $deleted], 'message' => "Eliminadas: {$deleted}"]);
}
