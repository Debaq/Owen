<?php
// backend/api/tags.php
// CRUD de tags (versiones oficiales publicadas) del sistema de versionado
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

    $sql = "SELECT t.*, u.name as autor_nombre,
                   c.mensaje as commit_mensaje, c.score_global, c.tipo as commit_tipo,
                   b.nombre as branch_nombre, b.temporada_id
            FROM horario_tags t
            JOIN horario_commits c ON t.commit_id = c.id
            JOIN horario_branches b ON c.branch_id = b.id
            JOIN users u ON t.created_by = u.id
            WHERE 1=1";
    $params = [];

    if ($temporadaId) {
        $sql .= " AND b.temporada_id = ?";
        $params[] = $temporadaId;
    }

    $sql .= " ORDER BY t.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['score_global'] = $row['score_global'] !== null ? (float)$row['score_global'] : null;
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createTag($pdo);
            break;
        case 'delete':
            deleteTag($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createTag($pdo) {
    $data = getJsonInput();

    if (empty($data['commit_id']) || empty($data['nombre'])) {
        jsonResponse(['error' => 'commit_id y nombre son requeridos'], 400);
    }

    // Verificar que el commit existe
    $stmt = $pdo->prepare("SELECT id FROM horario_commits WHERE id = ?");
    $stmt->execute([$data['commit_id']]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Commit no encontrado'], 404);
    }

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO horario_tags (id, commit_id, nombre, descripcion, created_by)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $data['commit_id'],
            sanitizeString($data['nombre']),
            isset($data['descripcion']) ? sanitizeString($data['descripcion']) : null,
            $_SESSION['user_id']
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Tag creado'], 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['error' => 'Ya existe un tag con ese nombre'], 409);
        }
        securityLog('DB_ERROR', 'tags create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear tag'], 500);
    }
}

function deleteTag($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM horario_tags WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Tag no encontrado'], 404);
    }

    $pdo->prepare("DELETE FROM horario_tags WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Tag eliminado']);
}
?>
