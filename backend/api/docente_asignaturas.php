<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        if ($action === 'assign') {
            handleAssign($pdo);
        } elseif ($action === 'unassign') {
            handleUnassign($pdo);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $asignatura_id = $_GET['asignatura_id'] ?? null;
    if (!$asignatura_id) jsonResponse(['error' => 'Asignatura ID required'], 400);

    $sql = "SELECT da.*, d.name as docente_name, d.rut as docente_rut 
            FROM docente_asignaturas da
            JOIN docentes d ON da.docente_id = d.id
            WHERE da.asignatura_id = ?
            ORDER BY da.rol DESC, d.name ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$asignatura_id]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(['success' => true, 'data' => $data]);
}

function handleAssign($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    
    if (empty($input['docente_id']) || empty($input['asignatura_id'])) {
        jsonResponse(['error' => 'Missing fields'], 400);
    }

    $id = generateUUID();
    $rol = $input['rol'] ?? 'responsable';

    $sql = "INSERT INTO docente_asignaturas (id, docente_id, asignatura_id, rol) 
            VALUES (?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $input['docente_id'],
            $input['asignatura_id'],
            $rol
        ]);
        jsonResponse(['success' => true, 'data' => ['id' => $id, 'rol' => $rol]], 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Unique constraint
             jsonResponse(['error' => 'El docente ya está asignado a esta asignatura'], 409);
        }
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}

function handleUnassign($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    $stmt = $pdo->prepare("DELETE FROM docente_asignaturas WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Assignment removed']);
}
?>