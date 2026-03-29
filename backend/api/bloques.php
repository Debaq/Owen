<?php
// backend/api/bloques.php
require_once 'config.php';


$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
                    if ($action === 'create') handleCreate($pdo);
                    elseif ($action === 'update') handleUpdate($pdo);
                    elseif ($action === 'delete') handleDelete($pdo);
                    elseif ($action === 'mass_create') handleMassCreate($pdo);
                    elseif ($action === 'delete_day') handleDeleteDay($pdo);
                    else jsonResponse(['error' => 'Acción no válida'], 400);            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    securityLog('DB_ERROR', $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'error' => 'Error interno del servidor'
    ]);
    exit;
}

function handleGet($pdo) {
    $sistema_id = $_GET['sistema_bloque_id'] ?? null;
    
    // Consulta segura: si no hay sistema_id, no intentar filtrar para evitar errores de tipo
    if ($sistema_id) {
        $stmt = $pdo->prepare("SELECT * FROM bloques_horarios WHERE sistema_bloque_id = ? ORDER BY dia_semana ASC, hora_inicio ASC");
        $stmt->execute([$sistema_id]);
    } else {
        $stmt = $pdo->query("SELECT * FROM bloques_horarios ORDER BY dia_semana ASC, hora_inicio ASC");
    }
    
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Normalizar tipos para JS
    foreach($res as &$r) {
        $r['dia_semana'] = isset($r['dia_semana']) ? (int)$r['dia_semana'] : 1;
        $r['orden'] = isset($r['orden']) ? (int)$r['orden'] : 0;
        $r['activo'] = isset($r['activo']) ? (bool)$r['activo'] : true;
    }
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'data' => $res]);
    exit;
}

function handleCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    
    if (empty($input['nombre']) || empty($input['sistema_bloque_id'])) {
        jsonResponse(['error' => 'Nombre y Sistema son requeridos'], 400);
    }

    $id = generateUUID();
    // Usamos nombres de columnas explícitos
    $sql = "INSERT INTO bloques_horarios (id, nombre, hora_inicio, hora_fin, orden, dia_semana, sistema_bloque_id, activo) 
            VALUES (:id, :nombre, :inicio, :fin, :orden, :dia, :sistema, 1)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id' => $id,
        'nombre' => $input['nombre'],
        'inicio' => $input['hora_inicio'],
        'fin' => $input['hora_fin'],
        'orden' => $input['orden'] ?? 0,
        'dia' => $input['dia_semana'] ?? 1,
        'sistema' => $input['sistema_bloque_id']
    ]);
    
    jsonResponse(['success' => true, 'data' => ['id' => $id]]);
}

function handleMassCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    $sistema_id = $input['sistema_bloque_id'] ?? null;
    $bloques = $input['bloques'] ?? [];

    if (!$sistema_id) jsonResponse(['error' => 'sistema_bloque_id missing'], 400);

    $pdo->beginTransaction();
    $sql = "INSERT INTO bloques_horarios (id, nombre, hora_inicio, hora_fin, orden, dia_semana, sistema_bloque_id, activo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
    $stmt = $pdo->prepare($sql);
    
    foreach ($bloques as $b) {
        $stmt->execute([
            generateUUID(),
            $b['nombre'],
            $b['hora_inicio'],
            $b['hora_fin'],
            $b['orden'] ?? 0,
            $b['dia_semana'] ?? 1,
            $sistema_id
        ]);
    }
    $pdo->commit();
    jsonResponse(['success' => true]);
}

function handleDeleteDay($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    $sistema_id = $input['sistema_bloque_id'] ?? null;
    $dia = $input['dia_semana'] ?? null;

    if ($sistema_id === null || $dia === null) {
        jsonResponse(['error' => 'Faltan datos (sistema_id o dia_semana)'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM bloques_horarios WHERE sistema_bloque_id = ? AND dia_semana = ?");
    $stmt->execute([$sistema_id, (int)$dia]);
    jsonResponse(['success' => true, 'message' => 'Día limpiado: ' . $dia]);
}

function handleUpdate($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? '';
    $input = getJsonInput();
    
    if (!$id) jsonResponse(['error' => 'ID requerido'], 400);

    $fields = []; $params = [];
    $allowed = ['nombre', 'hora_inicio', 'hora_fin', 'orden', 'dia_semana', 'activo'];
    foreach($allowed as $f) {
        if (isset($input[$f])) {
            $fields[] = "$f = ?";
            $params[] = $input[$f];
        }
    }
    
    if (empty($fields)) jsonResponse(['error' => 'Nada que actualizar'], 400);
    
    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE bloques_horarios SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);
    jsonResponse(['success' => true]);
}

function handleDelete($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? '';
    $stmt = $pdo->prepare("DELETE FROM bloques_horarios WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}
?>