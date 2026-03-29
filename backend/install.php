<?php
// backend/install.php
// PROTECCIÓN: Solo ejecutar desde CLI
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Acceso denegado. Este script solo puede ejecutarse desde la línea de comandos.";
    exit(1);
}

$dbDir = __DIR__ . '/db';
$dbFile = $dbDir . '/horarios.sqlite';
define('DB_PATH', $dbFile);

echo "=== Instalación de Sistema Owen (SQLite) ===\n\n";

// Solicitar credenciales por CLI
echo "Ingrese email del administrador: ";
$adminEmail = trim(fgets(STDIN));
if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
    die("Error: Email no válido.\n");
}

echo "Ingrese contraseña del administrador (mín. 8 caracteres): ";
$adminPass = trim(fgets(STDIN));
if (strlen($adminPass) < 8) {
    die("Error: La contraseña debe tener al menos 8 caracteres.\n");
}

echo "Ingrese nombre del administrador: ";
$adminName = trim(fgets(STDIN));
if (empty($adminName)) {
    die("Error: El nombre no puede estar vacío.\n");
}

try {
    // 1. Crear directorio si no existe
    if (!file_exists($dbDir)) {
        if (mkdir($dbDir, 0750, true)) {
            echo "[OK] Directorio 'db' creado.\n";
        } else {
            die("[ERROR] No se pudo crear el directorio 'db'.\n");
        }
    }

    // 2. Conectar a SQLite
    $pdo = new PDO("sqlite:" . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "[OK] Base de datos SQLite conectada.\n";

    // 3. Ejecutar schema
    $schemaFile = __DIR__ . '/schema.sql';
    if (!file_exists($schemaFile)) {
        die("[ERROR] No se encontró schema.sql\n");
    }

    $sql = file_get_contents($schemaFile);
    $pdo->exec($sql);
    echo "[OK] Tablas creadas correctamente.\n";

    // 4. Crear usuario admin
    $passwordHash = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$adminEmail]);

    if ($stmt->fetch()) {
        echo "[AVISO] El usuario administrador ya existe.\n";
    } else {
        $id = bin2hex(random_bytes(16));
        $id = sprintf('%s-%s-%s-%s-%s',
            substr($id, 0, 8),
            substr($id, 8, 4),
            substr($id, 12, 4),
            substr($id, 16, 4),
            substr($id, 20, 12)
        );
        $stmtInsert = $pdo->prepare(
            "INSERT INTO users (id, email, password_hash, role, name, created_at)
             VALUES (:id, :email, :pass, :role, :name, datetime('now'))"
        );
        $stmtInsert->execute([
            'id' => $id,
            'email' => $adminEmail,
            'pass' => $passwordHash,
            'role' => 'gestor',
            'name' => $adminName
        ]);
        echo "[OK] Usuario administrador creado.\n";
    }

    // 5. Crear sistema de bloques por defecto
    $systemId = 'default-system';
    $stmtSys = $pdo->prepare("SELECT id FROM sistemas_bloques WHERE id = ?");
    $stmtSys->execute([$systemId]);
    if ($stmtSys->fetch()) {
        echo "[AVISO] El sistema de bloques ya existe.\n";
    } else {
        $stmtInsertSys = $pdo->prepare("INSERT INTO sistemas_bloques (id, nombre, es_default) VALUES (?, ?, ?)");
        $stmtInsertSys->execute([$systemId, 'Régimen General', 1]);
        echo "[OK] Sistema de bloques creado.\n";
    }

    // Ajustar permisos del archivo DB
    chmod($dbFile, 0640);

    echo "\n=== Instalación Completada ===\n";

} catch (PDOException $e) {
    die("[ERROR] " . $e->getMessage() . "\n");
}
?>
