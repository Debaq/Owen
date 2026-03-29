<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        if ($action === 'save') {
            handleSave($pdo);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $docente_id = $_GET['docente_id'] ?? null;
    if (!$docente_id) jsonResponse(['error' => 'docente_id required'], 400);

    $stmt = $pdo->prepare("SELECT dia_semana, bloque_id FROM docente_disponibilidad WHERE docente_id = ?");
    $stmt->execute([$docente_id]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($data as &$row) {
        $row['dia_semana'] = (int)$row['dia_semana'];
    }
    
    jsonResponse(['success' => true, 'data' => $data]);
}

function handleSave($pdo) {
    requireAuth();
    requireRole('gestor');
    $input = getJsonInput();
    $docente_id = $input['docente_id'] ?? null;
    $items = $input['items'] ?? []; // Array of {dia_semana, bloque_id}

    if (!$docente_id) jsonResponse(['error' => 'docente_id required'], 400);

    try {
        $pdo->beginTransaction();

        // Limpiar disponibilidad previa
        $stmt = $pdo->prepare("DELETE FROM docente_disponibilidad WHERE docente_id = ?");
        $stmt->execute([$docente_id]);

        // Insertar nueva disponibilidad
        if (!empty($items)) {
            $sql = "INSERT INTO docente_disponibilidad (id, docente_id, dia_semana, bloque_id) VALUES (?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            foreach ($items as $item) {
                $stmt->execute([
                    generateUUID(),
                    $docente_id,
                    $item['dia_semana'],
                    $item['bloque_id']
                ]);
            }
        }

        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'Disponibilidad actualizada']);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        securityLog('DB_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error interno del servidor'], 500);
    }
}
?>