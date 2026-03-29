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
    $sql = "SELECT * FROM salas WHERE activo = 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $salas = $stmt->fetchAll();

    foreach ($salas as &$sala) {
        $sala['mobiliario'] = json_decode($sala['mobiliario'] ?? '[]');
        $sala['equipamiento'] = json_decode($sala['equipamiento'] ?? '[]');
        $sala['fotos'] = json_decode($sala['fotos'] ?? '[]');
        
        $sala['piso'] = (int)$sala['piso'];
        $sala['capacidad'] = (int)$sala['capacidad'];
        $sala['lat'] = (float)$sala['lat'];
        $sala['lng'] = (float)$sala['lng'];
        $sala['activo'] = (bool)$sala['activo'];
    }

    jsonResponse(['success' => true, 'data' => $salas]);
}

function handlePost($pdo) {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    if ($_SESSION['user_role'] !== 'gestor') {
        jsonResponse(['error' => 'Forbidden: Only managers can manage rooms'], 403);
    }

    $action = $_GET['action'] ?? 'create';
    $input = getJsonInput();

    try {
        if ($action === 'create') {
            createSala($pdo, $input);
        } elseif ($action === 'update') {
            $id = $_GET['id'] ?? null;
            if (!$id) jsonResponse(['error' => 'ID is required for update'], 400);
            updateSala($pdo, $id, $input);
        } elseif ($action === 'delete') {
            $id = $_GET['id'] ?? null;
            if (!$id) jsonResponse(['error' => 'ID is required for delete'], 400);
            deleteSala($pdo, $id);
        } elseif ($action === 'activate') {
            $id = $_GET['id'] ?? null;
            if (!$id) jsonResponse(['error' => 'ID is required for activation'], 400);
            activateSala($pdo, $id);
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
    } catch (\PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['error' => 'Room code already exists'], 409);
        }
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function createSala($pdo, $input) {
    $required = ['code', 'name', 'edificio_id', 'piso', 'tipo', 'capacidad'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            jsonResponse(['error' => "Field '$field' is required"], 400);
        }
    }

    $id = generateUUID();
    $sql = "INSERT INTO salas (
        id, code, name, edificio_id, piso, tipo, 
        capacidad, mobiliario, equipamiento, reglas, 
        lat, lng, tipo_gestion, gestion_carrera_id, gestion_unidad_id, fotos, activo
    ) VALUES (
        :id, :code, :name, :edificio_id, :piso, :tipo, 
        :capacidad, :mobiliario, :equipamiento, :reglas, 
        :lat, :lng, :tipo_gestion, :gestion_carrera_id, :gestion_unidad_id, :fotos, :activo
    )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id' => $id,
        'code' => $input['code'],
        'name' => $input['name'],
        'edificio_id' => $input['edificio_id'],
        'piso' => $input['piso'],
        'tipo' => $input['tipo'],
        'capacidad' => $input['capacidad'],
        'mobiliario' => json_encode($input['mobiliario'] ?? []),
        'equipamiento' => json_encode($input['equipamiento'] ?? []),
        'reglas' => $input['reglas'] ?? null,
        'lat' => $input['lat'] ?? 0,
        'lng' => $input['lng'] ?? 0,
        'tipo_gestion' => $input['tipo_gestion'] ?? 'central',
        'gestion_carrera_id' => $input['gestion_carrera_id'] ?? null,
        'gestion_unidad_id' => $input['gestion_unidad_id'] ?? null,
        'fotos' => json_encode($input['fotos'] ?? []),
        'activo' => 1
    ]);

    $input['id'] = $id;
    jsonResponse(['success' => true, 'data' => $input], 201);
}

function updateSala($pdo, $id, $input) {
    $fields = [];
    $params = ['id' => $id];

    $allowed = [
        'code', 'name', 'edificio_id', 'piso', 'tipo', 'capacidad', 
        'mobiliario', 'equipamiento', 'reglas', 'lat', 'lng', 
        'fotos', 'activo', 'tipo_gestion', 'gestion_carrera_id', 'gestion_unidad_id'
    ];

    foreach ($allowed as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :$field";
            if (in_array($field, ['mobiliario', 'equipamiento', 'fotos'])) {
                $params[$field] = json_encode($input[$field]);
            } else {
                $params[$field] = $input[$field];
            }
        }
    }

    if (empty($fields)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }

    $sql = "UPDATE salas SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmt = $pdo->prepare("SELECT * FROM salas WHERE id = ?");
    $stmt->execute([$id]);
    $sala = $stmt->fetch();

    if ($sala) {
        $sala['mobiliario'] = json_decode($sala['mobiliario'] ?? '[]');
        $sala['equipamiento'] = json_decode($sala['equipamiento'] ?? '[]');
        $sala['fotos'] = json_decode($sala['fotos'] ?? '[]');
        $sala['piso'] = (int)$sala['piso'];
        $sala['capacidad'] = (int)$sala['capacidad'];
        $sala['lat'] = (float)$sala['lat'];
        $sala['lng'] = (float)$sala['lng'];
        $sala['activo'] = (bool)$sala['activo'];
    }

    jsonResponse(['success' => true, 'data' => $sala, 'message' => 'Room updated successfully']);
}

function deleteSala($pdo, $id) {
    $sql = "UPDATE salas SET activo = 0 WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);
    jsonResponse(['success' => true, 'message' => 'Room deactivated successfully']);
}

function activateSala($pdo, $id) {
    $sql = "UPDATE salas SET activo = 1 WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);
    jsonResponse(['success' => true, 'message' => 'Room activated successfully']);
}
?>