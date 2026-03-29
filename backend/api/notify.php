<?php
/**
 * Helper de notificaciones - NO es un endpoint directo
 * Se incluye desde otros archivos con require_once
 *
 * Uso: notifyHelp($pdo, $salaCode, $salaName, $mensaje, $autorEmail)
 */

function notifyHelp($pdo, $salaCode, $salaName, $mensaje, $autorEmail) {
    // Sanitizar inputs para prevenir inyección de headers
    $salaCode = preg_replace('/[\r\n]/', '', strip_tags($salaCode));
    $salaName = preg_replace('/[\r\n]/', '', strip_tags($salaName));
    $mensaje = strip_tags($mensaje);

    // Validar y sanitizar email (prevenir header injection)
    $autorEmail = filter_var($autorEmail, FILTER_SANITIZE_EMAIL);
    if (!filter_var($autorEmail, FILTER_VALIDATE_EMAIL)) {
        $autorEmail = 'no-reply@localhost';
    }

    // Leer configuracion
    $config = [];
    $stmt = $pdo->prepare("SELECT key, value FROM system_config WHERE key LIKE 'notifications_%'");
    $stmt->execute();
    foreach ($stmt->fetchAll() as $row) {
        $config[$row['key']] = $row['value'];
    }

    $subject = "OWEN - Pedido de ayuda en {$salaCode}";
    $body = "Sala: {$salaCode} - {$salaName}\n";
    $body .= "Mensaje: {$mensaje}\n";
    $body .= "Email contacto: {$autorEmail}\n";
    $body .= "Fecha: " . date('Y-m-d H:i:s') . "\n";

    // Email
    $emailEnabled = isset($config['notifications_email_enabled']) ? $config['notifications_email_enabled'] : '0';
    if ($emailEnabled === '1') {
        $recipientsJson = isset($config['notifications_email_recipients']) ? $config['notifications_email_recipients'] : '[]';
        $recipients = json_decode($recipientsJson, true);
        if (is_array($recipients) && count($recipients) > 0) {
            $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[\r\n]/', '', $_SERVER['HTTP_HOST']) : 'localhost';
            $headers = "From: owen@" . $host . "\r\n";
            $headers .= "Reply-To: " . $autorEmail . "\r\n";
            $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

            foreach ($recipients as $recipientEmail) {
                $recipientEmail = filter_var(trim($recipientEmail), FILTER_VALIDATE_EMAIL);
                if ($recipientEmail) {
                    @mail($recipientEmail, $subject, $body, $headers);
                }
            }
        }
    }

    // Telegram
    $telegramEnabled = isset($config['notifications_telegram_enabled']) ? $config['notifications_telegram_enabled'] : '0';
    if ($telegramEnabled === '1') {
        $token = isset($config['notifications_telegram_bot_token']) ? $config['notifications_telegram_bot_token'] : '';
        $chatId = isset($config['notifications_telegram_chat_id']) ? $config['notifications_telegram_chat_id'] : '';

        if ($token !== '' && $chatId !== '') {
            // Sanitizar para HTML de Telegram
            $safeSalaCode = htmlspecialchars($salaCode, ENT_QUOTES, 'UTF-8');
            $safeSalaName = htmlspecialchars($salaName, ENT_QUOTES, 'UTF-8');
            $safeMensaje = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');
            $safeEmail = htmlspecialchars($autorEmail, ENT_QUOTES, 'UTF-8');

            $emoji = "\xF0\x9F\x86\x98";
            $text = "{$emoji} <b>Pedido de ayuda</b>\n";
            $text .= "<b>Sala:</b> {$safeSalaCode} - {$safeSalaName}\n";
            $text .= "<b>Mensaje:</b> {$safeMensaje}\n";
            $text .= "<b>Contacto:</b> {$safeEmail}\n";
            $text .= "<i>" . date('H:i') . "</i>";

            $url = "https://api.telegram.org/bot" . urlencode($token) . "/sendMessage";
            $postData = http_build_query([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
            ]);

            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/x-www-form-urlencoded',
                    'content' => $postData,
                    'timeout' => 5,
                ]
            ]);

            @file_get_contents($url, false, $context);
        }
    }
}
?>
