<?php
require_once 'config.php';

requireAuth();
requireRole('gestor');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    if (!isset($_FILES['image'])) {
        jsonResponse(['error' => 'No se recibió ninguna imagen'], 400);
    }

    $file = $_FILES['image'];
    $max_size = 5 * 1024 * 1024; // 5MB

    // Validar errores de upload
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'Error en la subida del archivo'], 400);
    }

    // Validar tamaño
    if ($file['size'] > $max_size) {
        jsonResponse(['error' => 'La imagen es demasiado grande (máx 5MB)'], 400);
    }

    // Validar tipo MIME real del archivo (no confiar en el cliente)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $realMime = $finfo->file($file['tmp_name']);

    $allowed_mimes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    if (!isset($allowed_mimes[$realMime])) {
        securityLog('UPLOAD_BLOCKED', "MIME rechazado: {$realMime}, archivo: {$file['name']}");
        jsonResponse(['error' => 'Formato no permitido. Use JPG, PNG, WEBP o GIF'], 400);
    }

    // Usar extensión según MIME real (no la del nombre original)
    $extension = $allowed_mimes[$realMime];

    // Crear directorio si no existe
    $upload_dir = __DIR__ . '/../uploads/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0750, true);
    }

    // Proteger directorio de uploads contra ejecución PHP
    $htaccess = $upload_dir . '.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "php_flag engine off\nRemoveHandler .php .phtml .php3 .php4 .php5\nAddType text/plain .php .phtml .php3 .php4 .php5\n");
    }

    // Generar nombre seguro e impredecible
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $target_path = $upload_dir . $filename;

    if (move_uploaded_file($file['tmp_name'], $target_path)) {
        // Ajustar permisos del archivo (solo lectura)
        chmod($target_path, 0644);

        $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
        $public_path = str_replace('/api/upload.php', '/uploads/' . $filename, $_SERVER['SCRIPT_NAME']);

        securityLog('UPLOAD_SUCCESS', $filename);
        jsonResponse([
            'success' => true,
            'url' => $base_url . $public_path,
            'filename' => $filename
        ]);
    } else {
        jsonResponse(['error' => 'Error al guardar el archivo'], 500);
    }
} else {
    jsonResponse(['error' => 'Método no permitido'], 405);
}
?>
