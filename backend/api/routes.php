<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// GET - Listar rutas activas
if ($method === 'GET' && empty($action)) {
    try {
        $query = "SELECT * FROM routes WHERE activo = 1 ORDER BY name";
        $stmt = $pdo->query($query);
        $routes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decodificar points JSON
        foreach ($routes as &$route) {
            if ($route['points']) {
                $route['points'] = json_decode($route['points'], true);
            }
            $route['activo'] = (bool)$route['activo'];
        }

        echo json_encode(array('success' => true, 'data' => $routes));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// POST - Crear ruta
if ($method === 'POST' && empty($action)) {
    requireAuth();
    requireRole('gestor');

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['name']) || !isset($data['points']) || !isset($data['type']) || !isset($data['color'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Faltan campos requeridos'));
        exit;
    }

    try {
        $id = generateUUID();
        $points = json_encode($data['points']);

        $stmt = $pdo->prepare("
            INSERT INTO routes (id, name, description, from_poi_id, to_poi_id, points, type, color, width, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute(array(
            $id,
            $data['name'],
            $data['description'] ?? null,
            $data['from_poi_id'] ?? null,
            $data['to_poi_id'] ?? null,
            $points,
            $data['type'],
            $data['color'],
            $data['width'] ?? 3,
            isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1
        ));

        echo json_encode(array('success' => true, 'message' => 'Ruta creada exitosamente', 'id' => $id));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// PUT - Actualizar ruta
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
        $points = json_encode($data['points']);

        $stmt = $pdo->prepare("
            UPDATE routes SET
                name = ?,
                description = ?,
                from_poi_id = ?,
                to_poi_id = ?,
                points = ?,
                type = ?,
                color = ?,
                width = ?,
                activo = ?
            WHERE id = ?
        ");

        $stmt->execute(array(
            $data['name'],
            $data['description'] ?? null,
            $data['from_poi_id'] ?? null,
            $data['to_poi_id'] ?? null,
            $points,
            $data['type'],
            $data['color'],
            $data['width'] ?? 3,
            isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1,
            $data['id']
        ));

        echo json_encode(array('success' => true, 'message' => 'Ruta actualizada exitosamente'));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// DELETE - Eliminar ruta
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
        $stmt = $pdo->prepare("UPDATE routes SET activo = 0 WHERE id = ?");
        $stmt->execute(array($id));

        echo json_encode(array('success' => true, 'message' => 'Ruta eliminada exitosamente'));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

http_response_code(400);
echo json_encode(array('success' => false, 'message' => 'Acción no válida'));
