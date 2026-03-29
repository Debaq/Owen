<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        if ($action === 'create' || empty($action)) {
            handleCreate($pdo);
        } elseif ($action === 'update') {
            handleUpdate($pdo);
        } elseif ($action === 'delete') {
            handleDelete($pdo);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("SELECT c.*, d.name as director_name 
                               FROM carreras c 
                               LEFT JOIN docentes d ON c.director_id = d.id 
                               WHERE c.id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        if ($data) {
            jsonResponse(['success' => true, 'data' => $data]);
        } else {
            jsonResponse(['error' => 'Carrera not found'], 404);
        }
    } else {
        $stmt = $pdo->query("SELECT c.*, d.name as director_name 
                             FROM carreras c 
                             LEFT JOIN docentes d ON c.director_id = d.id 
                             ORDER BY c.name ASC");
        $carreras = $stmt->fetchAll();
        jsonResponse(['success' => true, 'data' => $carreras]);
    }
}

function handleCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    
    // Check Code uniqueness
    $stmt = $pdo->prepare("SELECT id FROM carreras WHERE code = ?");
    $stmt->execute([$input['code'] ?? '']);
    if ($stmt->fetch()) jsonResponse(['error' => 'El código ya existe'], 409);

    $id = generateUUID();
    $sql = "INSERT INTO carreras (id, name, code, director_id, gestor_id) VALUES (?, ?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id, 
            $input['name'], 
            $input['code'], 
            $input['director_id'] ?? null,
            $input['gestor_id'] ?? null
        ]);
        $input['id'] = $id;
        jsonResponse(['success' => true, 'data' => $input], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handleUpdate($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    $input = getJsonInput();
    
    if (isset($input['code'])) {
        $stmt = $pdo->prepare("SELECT id FROM carreras WHERE code = ? AND id != ?");
        $stmt->execute([$input['code'], $id]);
        if ($stmt->fetch()) jsonResponse(['error' => 'El código ya existe'], 409);
    }

    $fields = [];
    $params = ['id' => $id];
    $allowed = ['name', 'code', 'director_id', 'gestor_id'];
    
    foreach ($allowed as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :$field";
            $params[$field] = $input[$field];
        }
    }
    
    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    
    $sql = "UPDATE carreras SET " . implode(', ', $fields) . " WHERE id = :id";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'message' => 'Carrera updated']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handleDelete($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    // Check dependencies (niveles)
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM niveles WHERE carrera_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()['count'] > 0) jsonResponse(['error' => 'No se puede eliminar: tiene niveles asociados'], 409);

    $stmt = $pdo->prepare("DELETE FROM carreras WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Carrera deleted']);
}
?>