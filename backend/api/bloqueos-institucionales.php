<?php
// backend/api/bloqueos-institucionales.php
// CRUD de eventos que bloquean todo el campus (elecciones, PAES, ceremonias)
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    default:
        jsonResponse(['error' => 'Metodo no permitido'], 405);
}

function handleGet($pdo) {
    requireAuth();

    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;

    $sql = "SELECT * FROM bloqueos_institucionales WHERE 1=1";
    $params = [];

    if ($temporadaId) {
        $sql .= " AND (temporada_id = ? OR temporada_id IS NULL)";
        $params[] = $temporadaId;
    }

    $sql .= " ORDER BY fecha_inicio";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createBloqueo($pdo);
            break;
        case 'update':
            updateBloqueo($pdo);
            break;
        case 'delete':
            deleteBloqueo($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createBloqueo($pdo) {
    $data = getJsonInput();

    $required = ['nombre', 'fecha_inicio', 'fecha_fin'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    if ($data['fecha_fin'] < $data['fecha_inicio']) {
        jsonResponse(['error' => 'fecha_fin debe ser posterior a fecha_inicio'], 400);
    }

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO bloqueos_institucionales (id, nombre, fecha_inicio, fecha_fin, temporada_id, motivo, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            sanitizeString($data['nombre']),
            $data['fecha_inicio'],
            $data['fecha_fin'],
            isset($data['temporada_id']) ? $data['temporada_id'] : null,
            isset($data['motivo']) ? sanitizeString($data['motivo']) : null,
            $_SESSION['user_id']
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Bloqueo institucional creado'], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'bloqueos-institucionales create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear bloqueo'], 500);
    }
}

function updateBloqueo($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM bloqueos_institucionales WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Bloqueo no encontrado'], 404);
    }

    $data = getJsonInput();
    $allowed = ['nombre', 'fecha_inicio', 'fecha_fin', 'temporada_id', 'motivo'];
    $sets = [];
    $params = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $sets[] = "{$field} = ?";
            $params[] = in_array($field, ['nombre', 'motivo']) ? sanitizeString($data[$field]) : $data[$field];
        }
    }

    if (empty($sets)) {
        jsonResponse(['error' => 'Nada que actualizar'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE bloqueos_institucionales SET " . implode(', ', $sets) . " WHERE id = ?";

    try {
        $pdo->prepare($sql)->execute($params);
        jsonResponse(['success' => true, 'message' => 'Bloqueo actualizado']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'bloqueos-institucionales update: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al actualizar'], 500);
    }
}

function deleteBloqueo($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM bloqueos_institucionales WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Bloqueo no encontrado'], 404);
    }

    $pdo->prepare("DELETE FROM bloqueos_institucionales WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Bloqueo eliminado']);
}
?>
