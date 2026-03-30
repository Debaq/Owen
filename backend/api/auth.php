<?php
require_once 'config.php';

$action = isset($_GET['action']) ? $_GET['action'] : 'me';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Método no permitido'], 405);
        }
        handleLogin($pdo);
        break;

    case 'logout':
        handleLogout();
        break;

    case 'me':
        if ($method !== 'GET') {
            jsonResponse(['error' => 'Método no permitido'], 405);
        }
        handleMe($pdo);
        break;

    case 'check-token':
        handleCheckToken($pdo);
        break;

    default:
        jsonResponse(['error' => 'Acción no válida'], 400);
}

function handleLogin($pdo) {
    // Rate limiting: máximo 5 intentos por minuto
    if (isRateLimited('login', 5, 60)) {
        securityLog('LOGIN_RATE_LIMITED', 'Demasiados intentos de login');
        jsonResponse(['error' => 'Demasiados intentos. Espere un momento.'], 429);
    }

    $input = getJsonInput();

    if (!isset($input['email']) || !isset($input['password'])) {
        jsonResponse(['error' => 'Email y contraseña requeridos'], 400);
    }

    $email = trim($input['email']);
    $password = $input['password'];

    // Validar formato email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Formato de email inválido'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Regenerar session ID para prevenir session fixation
        session_regenerate_id(true);

        // Solo devolver campos necesarios
        $safeUser = [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'name' => $user['name'],
            'carrera_id' => $user['carrera_id']
        ];

        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_ip'] = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        $_SESSION['last_activity'] = time();

        securityLog('LOGIN_SUCCESS', $email);
        jsonResponse(['success' => true, 'user' => $safeUser]);
    } else {
        securityLog('LOGIN_FAILED', $email);
        jsonResponse(['error' => 'Credenciales inválidas'], 401);
    }
}

function handleLogout() {
    securityLog('LOGOUT', isset($_SESSION['user_id']) ? $_SESSION['user_id'] : '');
    session_unset();
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Sesión cerrada']);
}

function handleCheckToken($pdo) {
    $header = getAuthorizationHeader();
    $hasFunc = function_exists('requireAuthOrToken') ? 'yes' : 'no';
    $hasTable = false;
    try {
        $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='solver_api_tokens'");
        $hasTable = (bool)$stmt->fetch();
    } catch (Exception $e) {
        // ignore
    }
    jsonResponse([
        'auth_header' => $header ? substr($header, 0, 20) . '...' : 'EMPTY',
        'has_function' => $hasFunc,
        'has_table' => $hasTable,
        'php_version' => PHP_VERSION,
        'sapi' => php_sapi_name(),
    ]);
}

function handleMe($pdo) {
    // Aceptar sesión PHP o Bearer token (para Owen Solver)
    requireAuthOrToken();

    // Verificar timeout de inactividad (30 min) solo para sesiones web
    $header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    $isToken = strpos($header, 'Bearer ') === 0;

    if (!$isToken && isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 1800) {
        session_unset();
        session_destroy();
        jsonResponse(['error' => 'Sesión expirada por inactividad'], 401);
    }
    if (!$isToken) {
        $_SESSION['last_activity'] = time();
    }

    $stmt = $pdo->prepare("SELECT id, email, role, name, carrera_id FROM users WHERE id = :id");
    $stmt->execute(['id' => $_SESSION['user_id']]);
    $user = $stmt->fetch();

    if ($user) {
        jsonResponse(['success' => true, 'user' => $user]);
    } else {
        jsonResponse(['error' => 'Usuario no encontrado'], 404);
    }
}
?>
