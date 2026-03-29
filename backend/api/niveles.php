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
        } elseif ($action === 'mass_create') {
            handleMassCreate($pdo);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $carrera_id = $_GET['carrera_id'] ?? null;
    $id = $_GET['id'] ?? null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM niveles WHERE id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        if ($data) {
            $data['orden'] = (int)$data['orden'];
            jsonResponse(['success' => true, 'data' => $data]);
        } else {
            jsonResponse(['error' => 'Nivel not found'], 404);
        }
    } else {
        $sql = "SELECT * FROM niveles";
        $params = [];
        if ($carrera_id) {
            $sql .= " WHERE carrera_id = ?";
            $params[] = $carrera_id;
        }
        $sql .= " ORDER BY orden ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($data as &$d) {
            $d['orden'] = (int)$d['orden'];
        }
        jsonResponse(['success' => true, 'data' => $data]);
    }
}

function handleCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    
    if (empty($input['carrera_id']) || empty($input['nombre']) || !isset($input['orden'])) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }

    $id = generateUUID();
    $sql = "INSERT INTO niveles (id, carrera_id, nombre, orden, semestre) VALUES (?, ?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $input['carrera_id'],
            $input['nombre'],
            $input['orden'],
            $input['semestre'] ?? 'impar'
        ]);
        $input['id'] = $id;
        jsonResponse(['success' => true, 'data' => $input], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handleMassCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    $carrera_id = $input['carrera_id'] ?? null;
    $niveles = $input['niveles'] ?? [];

    if (!$carrera_id || empty($niveles)) {
        jsonResponse(['error' => 'Datos insuficientes'], 400);
    }

    try {
        $pdo->beginTransaction();
        $sql = "INSERT INTO niveles (id, carrera_id, nombre, orden, semestre) VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        
        foreach ($niveles as $n) {
            $stmt->execute([
                generateUUID(),
                $carrera_id,
                $n['nombre'],
                $n['orden'],
                $n['semestre'] ?? 'impar'
            ]);
        }
        
        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'Plan de niveles creado correctamente']);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
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
    $allowed = ['carrera_id', 'nombre', 'orden', 'semestre'];
    
    foreach ($allowed as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :$field";
            $params[$field] = $input[$field];
        }
    }
    
    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    
    $sql = "UPDATE niveles SET " . implode(', ', $fields) . " WHERE id = :id";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'message' => 'Nivel updated']);
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
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM asignaturas WHERE nivel_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()['count'] > 0) jsonResponse(['error' => 'Cannot delete: dependencies exist'], 409);

    $stmt = $pdo->prepare("DELETE FROM niveles WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Nivel deleted']);
}
?>