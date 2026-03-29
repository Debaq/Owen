<?php
/**
 * Configuracion del sistema (key-value)
 * GET (auth gestor) → todas las configs
 * GET ?key=X&public=1 → valor especifico sin auth
 * POST (auth gestor) → upsert {key: value, ...}
 * POST ?action=test_telegram (auth gestor) → probar conexion Telegram
 * POST ?action=test_email (auth gestor) → probar envio de email
 */
require_once 'config.php';

// Crear tabla si no existe
$pdo->exec("
    CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
");

// Defaults
$defaults = [
    'notifications_email_enabled' => '0',
    'notifications_email_recipients' => '[]',
    'notifications_telegram_enabled' => '0',
    'notifications_telegram_bot_token' => '',
    'notifications_telegram_chat_id' => '',
    'public_building_view_enabled' => '1',
    'public_help_requests_enabled' => '1',
    'public_comments_enabled' => '1',
    'public_navigation_enabled' => '1',
    'site_name' => 'Sistema OWEN',
    'site_subtitle' => 'Sistema de Horarios - Sede Puerto Montt',
    'site_footer' => 'Sistema OWEN - Sede Puerto Montt, Chile',
];

// Insertar defaults si no existen
foreach ($defaults as $k => $v) {
    $stmt = $pdo->prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)");
    $stmt->execute([$k, $v]);
}

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
    // Acceso publico a todas las keys de sitio
    if (isset($_GET['public']) && !isset($_GET['key'])) {
        $publicKeys = [
            'public_building_view_enabled',
            'public_help_requests_enabled',
            'public_comments_enabled',
            'public_navigation_enabled',
            'site_name',
            'site_subtitle',
            'site_footer',
        ];
        $placeholders = implode(',', array_fill(0, count($publicKeys), '?'));
        $stmt = $pdo->prepare("SELECT key, value FROM system_config WHERE key IN ($placeholders)");
        $stmt->execute($publicKeys);
        $config = [];
        foreach ($stmt->fetchAll() as $row) {
            $config[$row['key']] = $row['value'];
        }
        jsonResponse(['success' => true, 'data' => $config]);
        return;
    }

    // Acceso publico a una key especifica
    if (isset($_GET['public']) && isset($_GET['key'])) {
        $key = $_GET['key'];
        // Solo permitir keys publicas
        $publicKeys = [
            'public_building_view_enabled',
            'public_help_requests_enabled',
            'public_comments_enabled',
            'public_navigation_enabled',
            'site_name',
            'site_subtitle',
            'site_footer',
        ];
        if (!in_array($key, $publicKeys)) {
            jsonResponse(['error' => 'Key not accessible'], 403);
        }
        $stmt = $pdo->prepare("SELECT value FROM system_config WHERE key = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        jsonResponse(['success' => true, 'data' => $row ? $row['value'] : null]);
        return;
    }

    // Acceso admin: todas las configs
    requireAuth();
    requireRole('gestor');

    $stmt = $pdo->prepare("SELECT key, value FROM system_config ORDER BY key ASC");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $config = [];
    foreach ($rows as $row) {
        $config[$row['key']] = $row['value'];
    }

    jsonResponse(['success' => true, 'data' => $config]);
}

function handlePost($pdo) {
    requireAuth();
    requireRole('gestor');

    $action = $_GET['action'] ?? 'save';

    if ($action === 'test_telegram') {
        testTelegram($pdo);
        return;
    }

    if ($action === 'test_email') {
        testEmail($pdo);
        return;
    }

    // Guardar configs
    $input = getJsonInput();
    if (empty($input)) {
        jsonResponse(['error' => 'No data provided'], 400);
    }

    foreach ($input as $key => $value) {
        if (!is_string($key)) continue;
        $stmt = $pdo->prepare("
            INSERT INTO system_config (key, value, updated_at) VALUES (:key, :value, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = :value2, updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute(['key' => $key, 'value' => (string)$value, 'value2' => (string)$value]);
    }

    jsonResponse(['success' => true, 'message' => 'Configuration saved']);
}

function testTelegram($pdo) {
    $stmt = $pdo->prepare("SELECT value FROM system_config WHERE key = ?");

    $stmt->execute(['notifications_telegram_bot_token']);
    $tokenRow = $stmt->fetch();
    $token = $tokenRow ? $tokenRow['value'] : '';

    $stmt->execute(['notifications_telegram_chat_id']);
    $chatRow = $stmt->fetch();
    $chatId = $chatRow ? $chatRow['value'] : '';

    if (empty($token) || empty($chatId)) {
        jsonResponse(['error' => 'Bot token y Chat ID son requeridos'], 400);
    }

    $message = "Sistema OWEN - Prueba de conexion exitosa.\nFecha: " . date('Y-m-d H:i:s');
    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $postData = http_build_query([
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'HTML',
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $postData,
            'timeout' => 10,
        ]
    ]);

    $result = @file_get_contents($url, false, $context);
    if ($result === false) {
        jsonResponse(['error' => 'No se pudo conectar con Telegram. Verifica el token y chat ID.'], 500);
    }

    $decoded = json_decode($result, true);
    if (isset($decoded['ok']) && $decoded['ok']) {
        jsonResponse(['success' => true, 'message' => 'Mensaje de prueba enviado a Telegram']);
    } else {
        $errorMsg = isset($decoded['description']) ? $decoded['description'] : 'Error desconocido';
        jsonResponse(['error' => 'Telegram respondio con error: ' . $errorMsg], 500);
    }
}

function testEmail($pdo) {
    $stmt = $pdo->prepare("SELECT value FROM system_config WHERE key = 'notifications_email_recipients'");
    $stmt->execute();
    $row = $stmt->fetch();
    $recipients = json_decode($row ? $row['value'] : '[]', true);

    if (empty($recipients)) {
        jsonResponse(['error' => 'No hay destinatarios configurados'], 400);
    }

    $subject = "Sistema OWEN - Prueba de notificacion";
    $body = "Este es un correo de prueba del Sistema OWEN.\nFecha: " . date('Y-m-d H:i:s');
    $headers = "From: owen@" . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $sent = 0;
    foreach ($recipients as $email) {
        if (@mail(trim($email), $subject, $body, $headers)) {
            $sent++;
        }
    }

    if ($sent > 0) {
        jsonResponse(['success' => true, 'message' => "Email de prueba enviado a {$sent} destinatario(s)"]);
    } else {
        jsonResponse(['error' => 'No se pudo enviar el email. Verifica la configuracion del servidor.'], 500);
    }
}
?>
