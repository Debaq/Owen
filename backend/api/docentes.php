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
        } elseif ($action === 'activate') {
            handleActivate($pdo);
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    // Requiere autenticación para ver datos completos de docentes (RUT, email, teléfono)
    requireAuth();

    $activo = isset($_GET['activo']) ? $_GET['activo'] : null;
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    $unidad_id = isset($_GET['unidad_id']) ? $_GET['unidad_id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT d.*, u.nombre as unidad_nombre, usr.name as username
                               FROM docentes d
                               LEFT JOIN unidades_academicas u ON d.unidad_id = u.id
                               LEFT JOIN users usr ON d.user_id = usr.id
                               WHERE d.id = ?");
        $stmt->execute([$id]);
        $docente = $stmt->fetch();
        if ($docente) {
            $docente['carreras'] = json_decode($docente['carreras'] ? $docente['carreras'] : '[]');
            $docente['activo'] = (bool)$docente['activo'];
            jsonResponse(['success' => true, 'data' => $docente]);
        } else {
            jsonResponse(['error' => 'Docente no encontrado'], 404);
        }
        return;
    }

    $sql = "SELECT d.*, u.nombre as unidad_nombre
            FROM docentes d
            LEFT JOIN unidades_academicas u ON d.unidad_id = u.id";
    $where = [];
    $params = [];

    if ($activo !== null) {
        $where[] = "d.activo = ?";
        $params[] = $activo;
    }

    if ($unidad_id !== null) {
        $where[] = "d.unidad_id = ?";
        $params[] = $unidad_id;
    }

    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " ORDER BY d.name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $docentes = $stmt->fetchAll();

    foreach ($docentes as &$docente) {
        $docente['carreras'] = json_decode($docente['carreras'] ? $docente['carreras'] : '[]');
        $docente['activo'] = (bool)$docente['activo'];
    }

    jsonResponse(['success' => true, 'data' => $docentes]);
}

function handleCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    
    $input = getJsonInput();
    
    if (isset($input['rut'])) {
        $stmt = $pdo->prepare("SELECT id FROM docentes WHERE rut = ?");
        $stmt->execute([$input['rut']]);
        if ($stmt->fetch()) jsonResponse(['error' => 'RUT already exists'], 409);
    }

    $id = generateUUID();
    $sql = "INSERT INTO docentes (id, rut, name, email, telefono, carreras, unidad_id, user_id, activo) 
            VALUES (:id, :rut, :name, :email, :telefono, :carreras, :unidad_id, :user_id, :activo)";
            
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'rut' => $input['rut'],
            'name' => $input['name'],
            'email' => $input['email'],
            'telefono' => $input['telefono'] ?? null,
            'carreras' => json_encode($input['carreras'] ?? []),
            'unidad_id' => $input['unidad_id'] ?? null,
            'user_id' => $input['user_id'] ?? null,
            'activo' => 1
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
    
    if (isset($input['rut'])) {
        $stmt = $pdo->prepare("SELECT id FROM docentes WHERE rut = ? AND id != ?");
        $stmt->execute([$input['rut'], $id]);
        if ($stmt->fetch()) jsonResponse(['error' => 'RUT already exists'], 409);
    }

    $fields = [];
    $params = ['id' => $id];
    $allowed = ['rut', 'name', 'email', 'telefono', 'carreras', 'unidad_id', 'user_id', 'activo'];
    
    foreach ($allowed as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :$field";
            if ($field === 'carreras') {
                $params[$field] = json_encode($input[$field]);
            } else {
                $params[$field] = $input[$field];
            }
        }
    }
    
    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    
    $sql = "UPDATE docentes SET " . implode(', ', $fields) . " WHERE id = :id";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'message' => 'Docente updated']);
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
    
    $stmt = $pdo->prepare("UPDATE docentes SET activo = 0 WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Docente deactivated']);
}

function handleActivate($pdo) {
    requireAuth();
    requireRole('gestor');
    
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    $stmt = $pdo->prepare("UPDATE docentes SET activo = 1 WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Docente activated']);
}
?>