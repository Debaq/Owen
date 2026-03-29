<?php
/**
 * Observaciones / Comentarios de salas
 * POST (sin auth) → Crear observación anónima
 * GET  (con auth) → Listar observaciones (gestor)
 * POST ?action=update_status (con auth) → Cambiar estado
 */
require_once 'config.php';
require_once 'notify.php';

// Crear tabla si no existe (incluye tipo 'ayuda')
$pdo->exec("
    CREATE TABLE IF NOT EXISTS observaciones (
        id TEXT PRIMARY KEY,
        sala_id TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'comentario',
        mensaje TEXT NOT NULL,
        autor_nombre TEXT,
        autor_email TEXT,
        estado TEXT DEFAULT 'nuevo',
        prioridad TEXT DEFAULT 'media',
        respuesta TEXT,
        revisado_por TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
        FOREIGN KEY (revisado_por) REFERENCES users(id) ON DELETE SET NULL
    )
");

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $sala_id = $_GET['sala_id'] ?? null;
    $public = isset($_GET['public']);

    if ($public && $sala_id) {
        // Vista pública: solo comentarios resueltos o recientes de esta sala
        $stmt = $pdo->prepare("
            SELECT id, sala_id, tipo, mensaje, autor_nombre, estado, created_at
            FROM observaciones
            WHERE sala_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $stmt->execute([$sala_id]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    // Vista admin: requiere auth
    requireAuth();

    $where = ["1=1"];
    $params = [];

    if ($sala_id) {
        $where[] = "o.sala_id = :sala_id";
        $params['sala_id'] = $sala_id;
    }

    $estado = $_GET['estado'] ?? '';
    if ($estado !== '') {
        $where[] = "o.estado = :estado";
        $params['estado'] = $estado;
    }

    $sql = "
        SELECT o.*, s.code as sala_code, s.name as sala_name
        FROM observaciones o
        LEFT JOIN salas s ON o.sala_id = s.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY o.created_at DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

function handlePost($pdo) {
    $action = $_GET['action'] ?? 'create';

    if ($action === 'create') {
        createObservacion($pdo);
    } elseif ($action === 'update_status') {
        requireAuth();
        updateStatus($pdo);
    } else {
        jsonResponse(['error' => 'Invalid action'], 400);
    }
}

function createObservacion($pdo) {
    // Rate limiting: máximo 3 observaciones por minuto (anónimo)
    if (isRateLimited('observacion', 3, 60)) {
        jsonResponse(['error' => 'Demasiados envíos. Espere un momento.'], 429);
    }

    $input = getJsonInput();

    $required = ['sala_id', 'mensaje'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['error' => "Campo '$field' es requerido"], 400);
        }
    }

    // Sanitizar mensaje (max 2000 chars)
    $input['mensaje'] = substr(strip_tags(trim($input['mensaje'])), 0, 2000);
    if (empty($input['mensaje'])) {
        jsonResponse(['error' => 'El mensaje no puede estar vacío'], 400);
    }

    // Sanitizar nombre
    if (!empty($input['autor_nombre'])) {
        $input['autor_nombre'] = substr(strip_tags(trim($input['autor_nombre'])), 0, 100);
    }

    // Validar email si se proporciona
    if (!empty($input['autor_email'])) {
        $input['autor_email'] = filter_var($input['autor_email'], FILTER_SANITIZE_EMAIL);
        if (!filter_var($input['autor_email'], FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['error' => 'Email inválido'], 400);
        }
    }

    $tipo = isset($input['tipo']) ? $input['tipo'] : 'comentario';
    $tipos_validos = ['comentario', 'problema', 'sugerencia', 'mantenimiento', 'ayuda'];
    if (!in_array($tipo, $tipos_validos)) {
        jsonResponse(['error' => 'Tipo inválido'], 400);
    }

    // Ayuda requiere email
    if ($tipo === 'ayuda' && empty($input['autor_email'])) {
        jsonResponse(['error' => 'Email requerido para pedidos de ayuda'], 400);
    }

    // Validar que la sala existe
    $stmt = $pdo->prepare("SELECT id FROM salas WHERE id = ? AND activo = 1");
    $stmt->execute([$input['sala_id']]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Room not found'], 404);
    }

    $id = generateUUID();
    $sql = "INSERT INTO observaciones (id, sala_id, tipo, mensaje, autor_nombre, autor_email, prioridad)
            VALUES (:id, :sala_id, :tipo, :mensaje, :autor_nombre, :autor_email, :prioridad)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id' => $id,
        'sala_id' => $input['sala_id'],
        'tipo' => $tipo,
        'mensaje' => $input['mensaje'],
        'autor_nombre' => $input['autor_nombre'] ?? 'Anónimo',
        'autor_email' => $input['autor_email'] ?? null,
        'prioridad' => ($tipo === 'ayuda') ? 'alta' : ($input['prioridad'] ?? 'media'),
    ]);

    // Notificar si es pedido de ayuda
    if ($tipo === 'ayuda') {
        $s = $pdo->prepare("SELECT code, name FROM salas WHERE id = ?");
        $s->execute([$input['sala_id']]);
        $salaInfo = $s->fetch();
        if ($salaInfo) {
            notifyHelp(
                $pdo,
                $salaInfo['code'],
                $salaInfo['name'],
                $input['mensaje'],
                $input['autor_email'] ?? ''
            );
        }
    }

    jsonResponse(['success' => true, 'data' => ['id' => $id]], 201);
}

function updateStatus($pdo) {
    $input = getJsonInput();
    $id = $_GET['id'] ?? null;

    if (!$id) {
        jsonResponse(['error' => 'ID required'], 400);
    }

    $estado = $input['estado'] ?? null;
    $respuesta = $input['respuesta'] ?? null;

    if (!$estado) {
        jsonResponse(['error' => 'estado is required'], 400);
    }

    $sql = "UPDATE observaciones SET estado = :estado, respuesta = :respuesta, revisado_por = :revisado_por, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'estado' => $estado,
        'respuesta' => $respuesta,
        'revisado_por' => $_SESSION['user_id'],
        'id' => $id,
    ]);

    jsonResponse(['success' => true, 'message' => 'Status updated']);
}
?>
