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
    $nivel_id = $_GET['nivel_id'] ?? null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT a.*, (SELECT COUNT(*) FROM docente_asignaturas WHERE asignatura_id = a.id) as docente_count FROM asignaturas a WHERE id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($data) {
            castTypes($data);
            $data['docente_count'] = (int)$data['docente_count'];
            jsonResponse(['success' => true, 'data' => $data]);
        } else {
            jsonResponse(['error' => 'Asignatura not found'], 404);
        }
    } else {
        $sql = "SELECT a.*, (SELECT COUNT(*) FROM docente_asignaturas WHERE asignatura_id = a.id) as docente_count 
                FROM asignaturas a";
        $params = [];
        if ($nivel_id) {
            $sql .= " WHERE a.nivel_id = ?";
            $params[] = $nivel_id;
        }
        $sql .= " ORDER BY a.name ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($data as &$d) {
            castTypes($d);
            $d['docente_count'] = (int)$d['docente_count'];
        }
        jsonResponse(['success' => true, 'data' => $data]);
    }
}

function castTypes(&$d) {
    $d['horas_teoria'] = (int)$d['horas_teoria'];
    $d['horas_practica'] = (int)$d['horas_practica'];
    $d['horas_autonomas'] = (int)$d['horas_autonomas'];
    $d['horas_semanales'] = (int)$d['horas_semanales'];
    $d['creditos'] = (int)$d['creditos'];
    $d['duracion_semanas'] = (int)$d['duracion_semanas'];
    $d['semana_inicio'] = (int)$d['semana_inicio'];
}

function handleCreate($pdo) {
    requireAuth();
    requireRoles(['gestor', 'direccion', 'secretaria']);
    $input = getJsonInput();
    
    $stmt = $pdo->prepare("SELECT id FROM asignaturas WHERE code = ?");
    $stmt->execute([$input['code']]);
    if ($stmt->fetch()) jsonResponse(['error' => 'Code already exists'], 409);

    $id = generateUUID();
    $sql = "INSERT INTO asignaturas (
        id, code, name, carrera_id, nivel_id, 
        horas_teoria, horas_practica, horas_autonomas, horas_semanales, 
        creditos, duracion_semanas, semana_inicio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $input['code'],
            $input['name'],
            $input['carrera_id'],
            $input['nivel_id'],
            $input['horas_teoria'] ?? 0,
            $input['horas_practica'] ?? 0,
            $input['horas_autonomas'] ?? 0,
            $input['horas_semanales'] ?? 0,
            $input['creditos'] ?? 0,
            $input['duracion_semanas'] ?? 17,
            $input['semana_inicio'] ?? 1
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
    requireRoles(['gestor', 'direccion', 'secretaria']);
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    $input = getJsonInput();
    
    if (isset($input['code'])) {
        $stmt = $pdo->prepare("SELECT id FROM asignaturas WHERE code = ? AND id != ?");
        $stmt->execute([$input['code'], $id]);
        if ($stmt->fetch()) jsonResponse(['error' => 'Code already exists'], 409);
    }

    $fields = [];
    $params = ['id' => $id];
    $allowed = [
        'code', 'name', 'carrera_id', 'nivel_id', 
        'horas_teoria', 'horas_practica', 'horas_autonomas', 'horas_semanales', 
        'creditos', 'duracion_semanas', 'semana_inicio'
    ];
    
    foreach ($allowed as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :$field";
            $params[$field] = $input[$field];
        }
    }
    
    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    
    $sql = "UPDATE asignaturas SET " . implode(', ', $fields) . " WHERE id = :id";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'message' => 'Asignatura updated']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handleDelete($pdo) {
    requireAuth();
    requireRoles(['gestor', 'direccion', 'secretaria']);
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    $stmt = $pdo->prepare("DELETE FROM asignaturas WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Asignatura deleted']);
}
?>