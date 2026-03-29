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
    case 'PUT':
        handlePut($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM edificios WHERE id = ?");
        $stmt->execute([$id]);
        $edificio = $stmt->fetch();
        if ($edificio) {
            $edificio['lat'] = (float)$edificio['lat'];
            $edificio['lng'] = (float)$edificio['lng'];
            $edificio['pisos'] = (int)$edificio['pisos'];
            $edificio['fotos'] = json_decode($edificio['fotos'] ?? '[]');
            jsonResponse(['success' => true, 'data' => $edificio]);
        } else {
            jsonResponse(['error' => 'Edificio not found'], 404);
        }
    } else {
        $stmt = $pdo->prepare("SELECT * FROM edificios ORDER BY name ASC");
        $stmt->execute();
        $edificios = $stmt->fetchAll();
        
        foreach ($edificios as &$edificio) {
            $edificio['lat'] = (float)$edificio['lat'];
            $edificio['lng'] = (float)$edificio['lng'];
            $edificio['pisos'] = (int)$edificio['pisos'];
            $edificio['fotos'] = json_decode($edificio['fotos'] ?? '[]');
        }
        
        jsonResponse(['success' => true, 'data' => $edificios]);
    }
}

function handlePost($pdo) {
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'gestor') {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['name']) || !isset($data['code']) || !isset($data['lat']) ||
        !isset($data['lng']) || !isset($data['pisos'])) {
        jsonResponse(['error' => 'Missing required fields'], 400);
        return;
    }

    $stmt = $pdo->prepare("SELECT id FROM edificios WHERE code = ?");
    $stmt->execute([$data['code']]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'El código ya existe'], 400);
        return;
    }

    $id = generateUUID();
    $descripcion = $data['descripcion'] ?? null;
    $fotos = json_encode($data['fotos'] ?? []);

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO edificios (id, name, code, lat, lng, pisos, descripcion, fotos)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            trim($data['name']),
            trim($data['code']),
            floatval($data['lat']),
            floatval($data['lng']),
            intval($data['pisos']),
            $descripcion,
            $fotos
        ]);

        $stmt = $pdo->prepare("SELECT * FROM edificios WHERE id = ?");
        $stmt->execute([$id]);
        $edificio = $stmt->fetch();
        $edificio['fotos'] = json_decode($edificio['fotos'] ?? '[]');

        jsonResponse(['success' => true, 'data' => $edificio], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handlePut($pdo) {
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'gestor') {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        jsonResponse(['error' => 'ID requerido'], 400);
        return;
    }

    $updates = array();
    $params = array();

    $fields = ['name', 'code', 'lat', 'lng', 'pisos', 'descripcion', 'fotos'];
    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            if ($field === 'fotos') {
                $params[] = json_encode($data[$field]);
            } else {
                $params[] = $data[$field];
            }
        }
    }

    if (empty($updates)) {
        jsonResponse(['error' => 'No hay campos para actualizar'], 400);
        return;
    }

    $params[] = $data['id'];

    try {
        $sql = "UPDATE edificios SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $stmt = $pdo->prepare("SELECT * FROM edificios WHERE id = ?");
        $stmt->execute([$data['id']]);
        $edificio = $stmt->fetch();
        $edificio['fotos'] = json_decode($edificio['fotos'] ?? '[]');

        jsonResponse(['success' => true, 'data' => $edificio]);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handleDelete($pdo) {
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'gestor') {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID requerido'], 400);

    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM salas WHERE edificio_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()['count'] > 0) {
        jsonResponse(['error' => 'No se puede eliminar el edificio porque tiene salas asociadas'], 400);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM edificios WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Edificio eliminado correctamente']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}
?>