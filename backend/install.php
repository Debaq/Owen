<?php
// backend/install.php
// Instalación de Owen — funciona desde CLI y desde web
// Se auto-elimina después de ejecutarse exitosamente

$isCli = php_sapi_name() === 'cli';
$dbDir = __DIR__ . '/db';
$dbFile = $dbDir . '/horarios.sqlite';

// Si ya existe la base de datos, no permitir re-instalar
if (file_exists($dbFile) && filesize($dbFile) > 0) {
    if ($isCli) {
        die("La base de datos ya existe. Elimínala manualmente si quieres reinstalar.\n");
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'Owen ya está instalado. Elimina la base de datos para reinstalar.']);
        exit;
    }
}

// --- Modo WEB: mostrar formulario o procesar ---
if (!$isCli) {
    header('Content-Type: text/html; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Mostrar formulario
        ?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalar Owen</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 420px; width: 90%; }
        h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        .sub { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
        label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.25rem; margin-top: 1rem; }
        input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        button { width: 100%; padding: 0.7rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-top: 1.5rem; }
        button:hover { background: #2563eb; }
        .warn { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; color: #92400e; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Instalar Owen</h1>
        <p class="sub">Configuración inicial del sistema</p>
        <form method="POST">
            <label>Nombre del administrador</label>
            <input type="text" name="name" required placeholder="Ej: Juan Pérez">
            <label>Email</label>
            <input type="email" name="email" required placeholder="admin@ejemplo.cl">
            <label>Contraseña (mín. 8 caracteres)</label>
            <input type="password" name="password" required minlength="8">
            <div class="warn">Este archivo se eliminará automáticamente después de la instalación.</div>
            <button type="submit">Instalar</button>
        </form>
    </div>
</body>
</html><?php
        exit;
    }

    // POST — procesar instalación
    $adminName = isset($_POST['name']) ? trim($_POST['name']) : '';
    $adminEmail = isset($_POST['email']) ? trim($_POST['email']) : '';
    $adminPass = isset($_POST['password']) ? $_POST['password'] : '';

    if (empty($adminName) || empty($adminEmail) || empty($adminPass)) {
        http_response_code(400);
        echo '<p>Todos los campos son requeridos. <a href="install.php">Volver</a></p>';
        exit;
    }
    if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo '<p>Email no válido. <a href="install.php">Volver</a></p>';
        exit;
    }
    if (strlen($adminPass) < 8) {
        http_response_code(400);
        echo '<p>Contraseña mínimo 8 caracteres. <a href="install.php">Volver</a></p>';
        exit;
    }
} else {
    // CLI — pedir datos por consola
    echo "=== Instalación de Sistema Owen ===\n\n";

    echo "Nombre del administrador: ";
    $adminName = trim(fgets(STDIN));
    if (empty($adminName)) die("Error: nombre vacío.\n");

    echo "Email del administrador: ";
    $adminEmail = trim(fgets(STDIN));
    if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) die("Error: email no válido.\n");

    echo "Contraseña (mín. 8 caracteres): ";
    $adminPass = trim(fgets(STDIN));
    if (strlen($adminPass) < 8) die("Error: contraseña muy corta.\n");
}

// --- Ejecutar instalación ---
try {
    if (!file_exists($dbDir)) {
        mkdir($dbDir, 0750, true);
    }

    $pdo = new PDO("sqlite:" . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $schemaFile = __DIR__ . '/schema.sql';
    if (!file_exists($schemaFile)) {
        throw new Exception("No se encontró schema.sql");
    }

    $pdo->exec(file_get_contents($schemaFile));

    // Crear admin
    $passwordHash = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 12]);
    $id = sprintf('%s-%s-%s-%s-%s',
        substr($hex = bin2hex(random_bytes(16)), 0, 8),
        substr($hex, 8, 4), substr($hex, 12, 4),
        substr($hex, 16, 4), substr($hex, 20, 12));

    $pdo->prepare(
        "INSERT INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, 'gestor', ?, datetime('now'))"
    )->execute([$id, $adminEmail, $passwordHash, $adminName]);

    // Sistema de bloques default
    $pdo->prepare("INSERT OR IGNORE INTO sistemas_bloques (id, nombre, es_default) VALUES (?, ?, 1)")
        ->execute(['default-system', 'Régimen General']);

    // Proteger directorio db
    file_put_contents($dbDir . '/.htaccess', "Deny from all\n");
    chmod($dbFile, 0640);

    // Auto-eliminarse
    $selfPath = __FILE__;
    $deleted = @unlink($selfPath);

    if ($isCli) {
        echo "[OK] Base de datos creada\n";
        echo "[OK] Usuario admin: $adminEmail\n";
        echo "[OK] Sistema de bloques creado\n";
        echo $deleted ? "[OK] install.php eliminado\n" : "[AVISO] No se pudo eliminar install.php, elimínalo manualmente\n";
        echo "\n=== Instalación completada ===\n";
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Owen instalado</title>';
        echo '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9}';
        echo '.card{background:white;border-radius:16px;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;max-width:400px}';
        echo '.ok{color:#16a34a;font-size:1.5rem;margin-bottom:0.5rem}</style></head><body><div class="card">';
        echo '<p class="ok">✓</p>';
        echo '<h2>Owen instalado correctamente</h2>';
        echo '<p style="color:#64748b;margin:1rem 0">Admin: ' . htmlspecialchars($adminEmail) . '</p>';
        echo $deleted ? '<p style="color:#16a34a;font-size:0.85rem">install.php eliminado automáticamente</p>' : '<p style="color:#dc2626;font-size:0.85rem">Elimina install.php manualmente por seguridad</p>';
        echo '<a href="/" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#3b82f6;color:white;border-radius:8px;text-decoration:none">Ir a Owen</a>';
        echo '</div></body></html>';
    }

} catch (Exception $e) {
    if ($isCli) {
        die("[ERROR] " . $e->getMessage() . "\n");
    } else {
        http_response_code(500);
        echo '<p>Error: ' . htmlspecialchars($e->getMessage()) . ' <a href="install.php">Volver</a></p>';
    }
}
?>
