<?php
require_once 'config.php';

requireAuth();
requireRole('gestor');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, name, email, role FROM users ORDER BY name ASC");
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
?>