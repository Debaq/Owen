<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        if ($action === 'create') handleCreate($pdo);
        elseif ($action === 'update') handleUpdate($pdo);
        elseif ($action === 'delete') handleDelete($pdo);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $stmt = $pdo->query("SELECT * FROM sistemas_bloques ORDER BY es_default DESC, nombre ASC");
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

function handleCreate($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    if (empty($input['nombre'])) jsonResponse(['error' => 'Nombre requerido'], 400);

    $id = generateUUID();
    $stmt = $pdo->prepare("INSERT INTO sistemas_bloques (id, nombre, es_default) VALUES (?, ?, ?)");
    $stmt->execute([$id, $input['nombre'], 0]);
    
    jsonResponse(['success' => true, 'data' => ['id' => $id, 'nombre' => $input['nombre']]]);
}

function handleUpdate($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? '';
    $input = getJsonInput();
    if (!$id || empty($input['nombre'])) jsonResponse(['error' => 'ID y nombre requeridos'], 400);

    $stmt = $pdo->prepare("UPDATE sistemas_bloques SET nombre = ? WHERE id = ? AND es_default = 0");
    $stmt->execute([$input['nombre'], $id]);
    jsonResponse(['success' => true, 'message' => 'Actualizado']);
}

function handleDelete($pdo) {
    requireAuth();
    requireRole('gestor');
    $id = $_GET['id'] ?? '';
    if (!$id) jsonResponse(['error' => 'ID requerido'], 400);

    // No borrar el default
    $stmt = $pdo->prepare("DELETE FROM sistemas_bloques WHERE id = ? AND es_default = 0");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Eliminado']);
}
?>