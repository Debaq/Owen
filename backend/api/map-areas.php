<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// GET - Listar áreas activas
if ($method === 'GET' && empty($action)) {
    try {
        $query = "SELECT * FROM map_areas WHERE activo = 1 ORDER BY type, name";
        $stmt = $pdo->query($query);
        $areas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decodificar coordinates JSON
        foreach ($areas as &$area) {
            if ($area['coordinates']) {
                $area['coordinates'] = json_decode($area['coordinates'], true);
            }
            $area['activo'] = (bool)$area['activo'];
        }

        echo json_encode(array('success' => true, 'data' => $areas));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// POST - Crear área
if ($method === 'POST' && empty($action)) {
    requireAuth();
    requireRole('gestor');

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['name']) || !isset($data['coordinates']) || !isset($data['type']) || !isset($data['color'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Faltan campos requeridos'));
        exit;
    }

    try {
        $id = generateUUID();
        $coordinates = json_encode($data['coordinates']);

        $stmt = $pdo->prepare("
            INSERT INTO map_areas (id, name, description, type, coordinates, color, fill_opacity, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute(array(
            $id,
            $data['name'],
            $data['description'] ?? null,
            $data['type'],
            $coordinates,
            $data['color'],
            $data['fill_opacity'] ?? 0.3,
            isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1
        ));

        echo json_encode(array('success' => true, 'message' => 'Área creada exitosamente', 'id' => $id));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// PUT - Actualizar área
if ($method === 'PUT' || ($method === 'POST' && $action === 'update')) {
    requireAuth();
    requireRole('gestor');

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'ID requerido'));
        exit;
    }

    try {
        $coordinates = json_encode($data['coordinates']);

        $stmt = $pdo->prepare("
            UPDATE map_areas SET
                name = ?,
                description = ?,
                type = ?,
                coordinates = ?,
                color = ?,
                fill_opacity = ?,
                activo = ?
            WHERE id = ?
        ");

        $stmt->execute(array(
            $data['name'],
            $data['description'] ?? null,
            $data['type'],
            $coordinates,
            $data['color'],
            $data['fill_opacity'] ?? 0.3,
            isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1,
            $data['id']
        ));

        echo json_encode(array('success' => true, 'message' => 'Área actualizada exitosamente'));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// DELETE - Eliminar área
if ($method === 'DELETE' || ($method === 'POST' && $action === 'delete')) {
    requireAuth();
    requireRole('gestor');

    $id = $method === 'DELETE' ? $_GET['id'] : json_decode(file_get_contents('php://input'), true)['id'];

    if (!$id) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'ID requerido'));
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE map_areas SET activo = 0 WHERE id = ?");
        $stmt->execute(array($id));

        echo json_encode(array('success' => true, 'message' => 'Área eliminada exitosamente'));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

http_response_code(400);
echo json_encode(array('success' => false, 'message' => 'Acción no válida'));
