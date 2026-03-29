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
        $stmt = $pdo->prepare("SELECT u.*, d.name as encargado_name 
                               FROM unidades_academicas u 
                               LEFT JOIN docentes d ON u.encargado_id = d.id 
                               WHERE u.id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        if ($data) {
            jsonResponse(['success' => true, 'data' => $data]);
        } else {
            jsonResponse(['error' => 'Unidad not found'], 404);
        }
    } else {
        $stmt = $pdo->query("SELECT u.*, d.name as encargado_name 
                             FROM unidades_academicas u 
                             LEFT JOIN docentes d ON u.encargado_id = d.id 
                             ORDER BY u.nombre ASC");
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    }
}

function handleCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    
    if (empty($input['nombre']) || empty($input['code']) || empty($input['tipo'])) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }

    $id = generateUUID();
    $sql = "INSERT INTO unidades_academicas (id, nombre, code, tipo, encargado_id) VALUES (?, ?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $input['nombre'],
            $input['code'],
            $input['tipo'],
            $input['encargado_id'] ?? null
        ]);
        $input['id'] = $id;
        jsonResponse(['success' => true, 'data' => $input], 201);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false) {
            jsonResponse(['error' => 'Code already exists'], 409);
        }
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
    $fields = [];
    $params = ['id' => $id];
    $allowed = ['nombre', 'code', 'tipo', 'encargado_id'];
    
    foreach ($allowed as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :$field";
            $params[$field] = $input[$field];
        }
    }
    
    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    
    $sql = "UPDATE unidades_academicas SET " . implode(', ', $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'message' => 'Unidad updated']);
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
    
    // Check dependencies (docentes)
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM docentes WHERE unidad_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()['count'] > 0) {
        jsonResponse(['error' => 'Cannot delete: Unit has associated teachers'], 409);
    }

    $stmt = $pdo->prepare("DELETE FROM unidades_academicas WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Unidad deleted']);
}
?>