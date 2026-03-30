<?php
// backend/api/solver-tokens.php
// Gestion de tokens API para autenticacion del solver externo
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
    requireRole('gestor');

    $stmt = $pdo->prepare(
        "SELECT id, nombre, activo, last_used_at, created_at
         FROM solver_api_tokens
         WHERE user_id = ?
         ORDER BY created_at DESC"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['activo'] = (bool)$row['activo'];
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createToken($pdo);
            break;
        case 'revoke':
            revokeToken($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createToken($pdo) {
    $data = getJsonInput();
    $nombre = isset($data['nombre']) ? sanitizeString($data['nombre']) : 'Owen Solver';

    $id = generateUUID();
    $token = bin2hex(random_bytes(32)); // 64 caracteres hex

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO solver_api_tokens (id, token, user_id, nombre)
             VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$id, $token, $_SESSION['user_id'], $nombre]);

        // Retornar el token SOLO en la creacion (no se puede recuperar despues)
        jsonResponse([
            'success' => true,
            'data' => ['id' => $id, 'token' => $token, 'nombre' => $nombre],
            'message' => 'Token creado. Guardelo, no se puede recuperar despues.'
        ], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'solver-tokens create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear token'], 500);
    }
}

function revokeToken($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    // Solo puede revocar sus propios tokens
    $stmt = $pdo->prepare("SELECT id FROM solver_api_tokens WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $_SESSION['user_id']]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Token no encontrado'], 404);
    }

    $pdo->prepare("UPDATE solver_api_tokens SET activo = 0 WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Token revocado']);
}
?>
