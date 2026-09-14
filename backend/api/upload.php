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

    $allowed_mimes = array(
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    );

    if (!isset($allowed_mimes[$realMime])) {
        securityLog('UPLOAD_BLOCKED', "MIME rechazado: {$realMime}, archivo: {$file['name']}");
        jsonResponse(['error' => 'Formato no permitido. Use JPG, PNG, WEBP o GIF'], 400);
    }

    // Crear directorio si no existe
    $upload_dir = __DIR__ . '/../uploads/';
    $thumb_dir = $upload_dir . 'thumbs/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0750, true);
    }
    if (!file_exists($thumb_dir)) {
        mkdir($thumb_dir, 0750, true);
    }

    // Proteger directorio de uploads contra ejecución PHP
    $htaccess = $upload_dir . '.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "php_flag engine off\nRemoveHandler .php .phtml .php3 .php4 .php5\nAddType text/plain .php .phtml .php3 .php4 .php5\n");
    }

    // Generar nombre seguro e impredecible
    $baseName = bin2hex(random_bytes(16));

    // Detectar si GD está disponible para convertir a WebP y generar thumbs
    $hasGD = extension_loaded('gd');
    $hasWebP = $hasGD && function_exists('imagewebp');

    $url = '';
    $thumbUrl = '';
    $filename = '';

    if ($hasGD) {
        // Cargar imagen original
        $srcImage = null;
        switch ($realMime) {
            case 'image/jpeg':
                $srcImage = imagecreatefromjpeg($file['tmp_name']);
                break;
            case 'image/png':
                $srcImage = imagecreatefrompng($file['tmp_name']);
                break;
            case 'image/webp':
                $srcImage = imagecreatefromwebp($file['tmp_name']);
                break;
            case 'image/gif':
                $srcImage = imagecreatefromgif($file['tmp_name']);
                break;
        }

        if (!$srcImage) {
            jsonResponse(['error' => 'No se pudo procesar la imagen'], 500);
        }

        // Preservar transparencia
        imagealphablending($srcImage, true);
        imagesavealpha($srcImage, true);

        $origW = imagesx($srcImage);
        $origH = imagesy($srcImage);

        // --- Imagen principal: redimensionar si es muy grande, convertir a WebP ---
        $maxDim = 1920;
        $mainImage = $srcImage;
        if ($origW > $maxDim || $origH > $maxDim) {
            if ($origW >= $origH) {
                $newW = $maxDim;
                $newH = (int)round($origH * ($maxDim / $origW));
            } else {
                $newH = $maxDim;
                $newW = (int)round($origW * ($maxDim / $origH));
            }
            $mainImage = imagecreatetruecolor($newW, $newH);
            imagealphablending($mainImage, false);
            imagesavealpha($mainImage, true);
            imagecopyresampled($mainImage, $srcImage, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
        }

        // Guardar imagen principal
        if ($hasWebP) {
            $filename = $baseName . '.webp';
            $target_path = $upload_dir . $filename;
            imagewebp($mainImage, $target_path, 82);
        } else {
            // Fallback: guardar como JPEG si no hay soporte WebP
            $filename = $baseName . '.jpg';
            $target_path = $upload_dir . $filename;
            imagejpeg($mainImage, $target_path, 85);
        }

        if ($mainImage !== $srcImage) {
            imagedestroy($mainImage);
        }

        // --- Thumbnail: 200x200 crop centrado ---
        $thumbSize = 200;
        $cropSize = min($origW, $origH);
        $cropX = (int)round(($origW - $cropSize) / 2);
        $cropY = (int)round(($origH - $cropSize) / 2);

        $thumbImage = imagecreatetruecolor($thumbSize, $thumbSize);
        imagealphablending($thumbImage, false);
        imagesavealpha($thumbImage, true);
        imagecopyresampled($thumbImage, $srcImage, 0, 0, $cropX, $cropY, $thumbSize, $thumbSize, $cropSize, $cropSize);

        if ($hasWebP) {
            $thumbFilename = $baseName . '.webp';
            imagewebp($thumbImage, $thumb_dir . $thumbFilename, 75);
        } else {
            $thumbFilename = $baseName . '.jpg';
            imagejpeg($thumbImage, $thumb_dir . $thumbFilename, 80);
        }

        imagedestroy($thumbImage);
        imagedestroy($srcImage);

        chmod($target_path, 0644);
        chmod($thumb_dir . $thumbFilename, 0644);

        // Construir URLs
        $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
        $uploads_path = str_replace('/api/upload.php', '/uploads/', $_SERVER['SCRIPT_NAME']);

        $url = $base_url . $uploads_path . $filename;
        $thumbUrl = $base_url . $uploads_path . 'thumbs/' . $thumbFilename;

    } else {
        // Sin GD: guardar archivo original sin procesar
        $extension = $allowed_mimes[$realMime];
        $filename = $baseName . '.' . $extension;
        $target_path = $upload_dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $target_path)) {
            jsonResponse(['error' => 'Error al guardar el archivo'], 500);
        }

        chmod($target_path, 0644);

        $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
        $uploads_path = str_replace('/api/upload.php', '/uploads/', $_SERVER['SCRIPT_NAME']);

        $url = $base_url . $uploads_path . $filename;
        $thumbUrl = $url; // Sin thumb, usar la misma
    }

    securityLog('UPLOAD_SUCCESS', $filename);
    jsonResponse(array(
        'success' => true,
        'url' => $url,
        'thumb' => $thumbUrl,
        'filename' => $filename
    ));

} else {
    jsonResponse(['error' => 'Método no permitido'], 405);
}
?>
