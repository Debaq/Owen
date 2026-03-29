<?php
require_once 'config.php';
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') jsonResponse(['error' => 'Method not allowed'], 405);

$activa = $_GET['activa'] ?? null;
if ($activa !== null) {
    $stmt = $pdo->prepare("SELECT * FROM temporadas WHERE activa = ? LIMIT 1");
    $stmt->execute([$activa]);
    jsonResponse(['success' => true, 'data' => $stmt->fetch()]);
} else {
    $stmt = $pdo->query("SELECT * FROM temporadas ORDER BY año DESC, tipo DESC");
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}
?>
