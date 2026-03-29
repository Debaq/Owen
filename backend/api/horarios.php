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
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;
    $enrich = isset($_GET['enrich']) && $_GET['enrich'] === 'true';

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM horarios WHERE id = ?");
        $stmt->execute([$id]);
        $horario = $stmt->fetch();
        if ($horario) {
            if ($enrich) $horario = enrichSchedule($pdo, $horario);
            jsonResponse(['success' => true, 'data' => $horario]);
        } else {
            jsonResponse(['error' => 'Horario not found'], 404);
        }
        return;
    }

    $filters = [];
    $where = ["activo = 1"];
    
    $allowed_filters = ['sala_id', 'docente_id', 'nivel_id', 'asignatura_id', 'temporada_id'];
    foreach ($allowed_filters as $filter) {
        if (isset($_GET[$filter])) {
            $where[] = "$filter = :$filter";
            $filters[$filter] = $_GET[$filter];
        }
    }

    $sql = "SELECT * FROM horarios WHERE " . implode(" AND ", $where);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($filters);
    $horarios = $stmt->fetchAll();

    if ($enrich) {
        foreach ($horarios as &$h) {
            $h = enrichSchedule($pdo, $h);
        }
    }

    jsonResponse(['success' => true, 'data' => $horarios]);
}

function handlePost($pdo) {
    requireAuth();
    requireRole('gestor');

    $action = $_GET['action'] ?? 'create';
    $input = getJsonInput();

    try {
        if ($action === 'create') {
            createHorario($pdo, $input);
        } elseif ($action === 'delete') {
            $id = $_GET['id'] ?? null;
            if (!$id) jsonResponse(['error' => 'ID required'], 400);
            deleteHorario($pdo, $id);
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
    } catch (Exception $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function createHorario($pdo, $input) {
    $required = ['tipo', 'sala_id', 'bloque_id', 'temporada_id', 'dia_semana', 'recurrencia', 'fecha_inicio', 'fecha_fin'];
    foreach ($required as $field) {
        if (!isset($input[$field])) jsonResponse(['error' => "Field '$field' is required"], 400);
    }

    // Validar conflictos
    checkConflicts($pdo, $input);

    $id = generateUUID();
    $sql = "INSERT INTO horarios (
        id, tipo, asignatura_id, sala_id, docente_id, nivel_id, 
        bloque_id, temporada_id, dia_semana, recurrencia, 
        fecha_inicio, fecha_fin, observaciones, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $id,
        $input['tipo'],
        $input['asignatura_id'] ?? null,
        $input['sala_id'],
        $input['docente_id'] ?? null,
        $input['nivel_id'] ?? null,
        $input['bloque_id'],
        $input['temporada_id'],
        $input['dia_semana'],
        $input['recurrencia'],
        $input['fecha_inicio'],
        $input['fecha_fin'],
        $input['observaciones'] ?? null,
        $_SESSION['user_id']
    ]);

    jsonResponse(['success' => true, 'data' => ['id' => $id]], 201);
}

function checkConflicts($pdo, $input) {
    $bloque_id = $input['bloque_id'];
    $dia_semana = $input['dia_semana'];
    $temporada_id = $input['temporada_id'];
    
    // 1. Conflicto de Sala
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM horarios WHERE sala_id = ? AND bloque_id = ? AND dia_semana = ? AND temporada_id = ? AND activo = 1");
    $stmt->execute([$input['sala_id'], $bloque_id, $dia_semana, $temporada_id]);
    if ($stmt->fetchColumn() > 0) throw new Exception("La sala ya está ocupada en este bloque.");

    // 2. Conflicto de Docente
    if (!empty($input['docente_id'])) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM horarios WHERE docente_id = ? AND bloque_id = ? AND dia_semana = ? AND temporada_id = ? AND activo = 1");
        $stmt->execute([$input['docente_id'], $bloque_id, $dia_semana, $temporada_id]);
        if ($stmt->fetchColumn() > 0) throw new Exception("El docente ya tiene una clase asignada en este bloque.");
        
        // Validar disponibilidad del docente
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM docente_disponibilidad WHERE docente_id = ? AND bloque_id = ? AND dia_semana = ?");
        $stmt->execute([$input['docente_id'], $bloque_id, $dia_semana]);
        if ($stmt->fetchColumn() == 0) throw new Exception("El docente no marcó este bloque como disponible.");
    }

    // 3. Conflicto de Nivel
    if (!empty($input['nivel_id'])) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM horarios WHERE nivel_id = ? AND bloque_id = ? AND dia_semana = ? AND temporada_id = ? AND activo = 1");
        $stmt->execute([$input['nivel_id'], $bloque_id, $dia_semana, $temporada_id]);
        if ($stmt->fetchColumn() > 0) throw new Exception("Este nivel ya tiene otra asignatura programada en el mismo bloque.");
    }
}

function deleteHorario($pdo, $id) {
    $stmt = $pdo->prepare("UPDATE horarios SET activo = 0 WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Horario eliminado']);
}

function enrichSchedule($pdo, $h) {
    $h['dia_semana'] = (int)$h['dia_semana'];
    $h['activo'] = (bool)$h['activo'];

    if ($h['asignatura_id']) {
        $stmt = $pdo->prepare("SELECT * FROM asignaturas WHERE id = ?");
        $stmt->execute([$h['asignatura_id']]);
        $h['asignatura'] = $stmt->fetch();
    }
    
    if ($h['docente_id']) {
        $stmt = $pdo->prepare("SELECT * FROM docentes WHERE id = ?");
        $stmt->execute([$h['docente_id']]);
        $doc = $stmt->fetch();
        if ($doc) $doc['carreras'] = json_decode($doc['carreras'] ?? '[]');
        $h['docente'] = $doc;
    }

    $stmt = $pdo->prepare("SELECT * FROM salas WHERE id = ?");
    $stmt->execute([$h['sala_id']]);
    $sala = $stmt->fetch();
    if ($sala) {
        $sala['mobiliario'] = json_decode($sala['mobiliario'] ?? '[]');
        $sala['equipamiento'] = json_decode($sala['equipamiento'] ?? '[]');
    }
    $h['sala'] = $sala;

    if ($h['nivel_id']) {
        $stmt = $pdo->prepare("SELECT * FROM niveles WHERE id = ?");
        $stmt->execute([$h['nivel_id']]);
        $h['nivel'] = $stmt->fetch();
    }

    $stmt = $pdo->prepare("SELECT * FROM bloques_horarios WHERE id = ?");
    $stmt->execute([$h['bloque_id']]);
    $h['bloque'] = $stmt->fetch();

    return $h;
}
?>