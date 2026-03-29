<?php
require_once 'config.php';

header('Content-Type: application/json');

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// GET - Listar POIs
if ($method === 'GET' && empty($action)) {
    try {
        $query = "SELECT * FROM pois WHERE activo = 1 ORDER BY category, name";
        $stmt = $pdo->query($query);
        $pois = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decodificar metadata JSON
        foreach ($pois as &$poi) {
            if ($poi['metadata']) {
                $poi['metadata'] = json_decode($poi['metadata'], true);
            }
            $poi['activo'] = (bool)$poi['activo'];
        }

        echo json_encode(array('success' => true, 'data' => $pois));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// GET - Obtener POI por ID
if ($method === 'GET' && $action === 'get' && isset($_GET['id'])) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM pois WHERE id = ?");
        $stmt->execute(array($_GET['id']));
        $poi = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$poi) {
            http_response_code(404);
            echo json_encode(array('success' => false, 'message' => 'POI no encontrado'));
            exit;
        }

        if ($poi['metadata']) {
            $poi['metadata'] = json_decode($poi['metadata'], true);
        }
        $poi['activo'] = (bool)$poi['activo'];

        echo json_encode(array('success' => true, 'data' => $poi));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// POST - Crear POI (requiere autenticación gestor)
if ($method === 'POST' && empty($action)) {
    requireAuth();
    requireRole('gestor');

    $data = json_decode(file_get_contents('php://input'), true);

    // Validar campos requeridos
    if (!isset($data['category']) || !isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Faltan campos requeridos'));
        exit;
    }

    try {
        $id = generateUUID();
        $metadata = isset($data['metadata']) ? json_encode($data['metadata']) : null;

        $stmt = $pdo->prepare("
            INSERT INTO pois (id, category, name, description, lat, lng, icon, color, edificio_id, activo, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute(array(
            $id,
            $data['category'],
            $data['name'],
            $data['description'] ?? null,
            $data['lat'],
            $data['lng'],
            $data['icon'] ?? null,
            $data['color'] ?? null,
            $data['edificio_id'] ?? null,
            isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1,
            $metadata
        ));

        echo json_encode(array('success' => true, 'message' => 'POI creado exitosamente', 'id' => $id));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// PUT - Actualizar POI
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
        $metadata = isset($data['metadata']) ? json_encode($data['metadata']) : null;

        $stmt = $pdo->prepare("
            UPDATE pois SET
                category = ?,
                name = ?,
                description = ?,
                lat = ?,
                lng = ?,
                icon = ?,
                color = ?,
                edificio_id = ?,
                activo = ?,
                metadata = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");

        $stmt->execute(array(
            $data['category'],
            $data['name'],
            $data['description'] ?? null,
            $data['lat'],
            $data['lng'],
            $data['icon'] ?? null,
            $data['color'] ?? null,
            $data['edificio_id'] ?? null,
            isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1,
            $metadata,
            $data['id']
        ));

        echo json_encode(array('success' => true, 'message' => 'POI actualizado exitosamente'));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

// DELETE - Eliminar POI (soft delete)
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
        $stmt = $pdo->prepare("UPDATE pois SET activo = 0 WHERE id = ?");
        $stmt->execute(array($id));

        echo json_encode(array('success' => true, 'message' => 'POI eliminado exitosamente'));
    } catch (PDOException $e) {
        http_response_code(500);
        securityLog('DB_ERROR', $e->getMessage());
        echo json_encode(array('success' => false, 'message' => 'Error interno del servidor'));
    }
    exit;
}

http_response_code(400);
echo json_encode(array('success' => false, 'message' => 'Acción no válida'));
