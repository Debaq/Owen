<?php
// backend/api/config.php

// 1. Suprimir advertencias para evitar que rompan el JSON/CORS
error_reporting(0);
ini_set('display_errors', 0);

// 2. Configurar Cookies seguras
session_set_cookie_params([
    'lifetime' => 3600,     // 1 hora
    'path' => '/',
    'domain' => '',         // Dominio actual
    'secure' => true,       // Solo HTTPS
    'httponly' => true,      // Seguridad contra XSS
    'samesite' => 'Strict'  // Protección CSRF
]);

// Iniciar sesión
session_start();

// Database Path
define('DB_PATH', __DIR__ . '/../db/horarios.sqlite');

// 3. CORS - Lista explícita de orígenes permitidos
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

$allowed_origins = [
    'https://tmeduca.org',
    'https://www.tmeduca.org',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
}

// 4. Headers de seguridad
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");

// 5. Manejo inmediato de OPTIONS (Preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit(0);
}

// Database Connection
try {
    $dsn = "sqlite:" . DB_PATH;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $pdo = new PDO($dsn, null, null, $options);
    $pdo->exec("PRAGMA foreign_keys = ON;");

} catch (\PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error interno del servidor']);
    exit;
}

// Helpers
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function getJsonInput() {
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

function generateUUID() {
    $bytes = random_bytes(16);
    $hex = bin2hex($bytes);
    return sprintf(
        '%s-%s-4%s-%s%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 13, 3),
        dechex(8 | (hexdec(substr($hex, 16, 1)) & 3)),
        substr($hex, 17, 3),
        substr($hex, 20, 12)
    );
}

function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'No autorizado'], 401);
    }
}

function requireRole($role) {
    requireAuth();
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== $role) {
        jsonResponse(['error' => 'Acceso denegado'], 403);
    }
}

function requireRoles($roles) {
    requireAuth();
    if (!in_array($_SESSION['user_role'], $roles)) {
        jsonResponse(['error' => 'Acceso denegado'], 403);
    }
}

function isOwnCarrera($pdo, $carreraId) {
    if ($_SESSION['user_role'] === 'gestor') return true;
    $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    return $user && $user['carrera_id'] === $carreraId;
}

/**
 * Sanitiza un string para prevenir XSS al devolver en JSON
 */
function sanitizeString($str) {
    if (!is_string($str)) return $str;
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

/**
 * Rate limiting simple basado en sesión
 * Retorna true si se excede el límite
 */
function isRateLimited($key, $maxAttempts, $windowSeconds) {
    $now = time();
    $sessionKey = 'rate_limit_' . $key;

    if (!isset($_SESSION[$sessionKey])) {
        $_SESSION[$sessionKey] = [];
    }

    // Limpiar intentos fuera de la ventana
    $_SESSION[$sessionKey] = array_filter($_SESSION[$sessionKey], function($timestamp) use ($now, $windowSeconds) {
        return ($now - $timestamp) < $windowSeconds;
    });

    if (count($_SESSION[$sessionKey]) >= $maxAttempts) {
        return true;
    }

    $_SESSION[$sessionKey][] = $now;
    return false;
}

/**
 * Log de seguridad
 */
function securityLog($action, $details = '') {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0750, true);
    }

    $logFile = $logDir . '/security_' . date('Y-m') . '.log';
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'anonymous';
    $timestamp = date('Y-m-d H:i:s');

    $entry = "[{$timestamp}] [{$ip}] [{$userId}] {$action}: {$details}\n";
    @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}
?>
