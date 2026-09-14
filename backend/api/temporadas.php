<?php
require_once 'config.php';
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo) {
    $activa = $_GET['activa'] ?? null;
    if ($activa !== null) {
        $stmt = $pdo->prepare("SELECT * FROM temporadas WHERE activa = ? LIMIT 1");
        $stmt->execute([$activa]);
        $row = $stmt->fetch();
        if ($row) {
            $row['año'] = (int)$row['año'];
            $row['activa'] = (bool)$row['activa'];
        }
        jsonResponse(['success' => true, 'data' => $row]);
    } else {
        $stmt = $pdo->query("SELECT * FROM temporadas ORDER BY año DESC, tipo DESC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['año'] = (int)$row['año'];
            $row['activa'] = (bool)$row['activa'];
        }
        jsonResponse(['success' => true, 'data' => $rows]);
    }
}

function handlePost($pdo) {
    requireAuth();
    requireRole('gestor');

    $action = $_GET['action'] ?? 'create';
    $input = getJsonInput();

    if ($action === 'create') {
        $required = ['nombre', 'tipo', 'año', 'fecha_inicio', 'fecha_fin'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                jsonResponse(['error' => "Campo '$field' es requerido"], 400);
            }
        }

        $id = generateUUID();

        // Si se marca como activa, desactivar las demás
        if (!empty($input['activa'])) {
            $pdo->exec("UPDATE temporadas SET activa = 0");
        }

        $stmt = $pdo->prepare("INSERT INTO temporadas (id, nombre, tipo, año, fecha_inicio, fecha_fin, sistema_bloque_id, activa)
            VALUES (:id, :nombre, :tipo, :año, :fecha_inicio, :fecha_fin, :sistema_bloque_id, :activa)");
        $stmt->execute([
            'id' => $id,
            'nombre' => $input['nombre'],
            'tipo' => $input['tipo'],
            'año' => (int)$input['año'],
            'fecha_inicio' => $input['fecha_inicio'],
            'fecha_fin' => $input['fecha_fin'],
            'sistema_bloque_id' => $input['sistema_bloque_id'] ?? null,
            'activa' => !empty($input['activa']) ? 1 : 0,
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id]], 201);

    } elseif ($action === 'update') {
        $id = $_GET['id'] ?? null;
        if (!$id) jsonResponse(['error' => 'ID requerido'], 400);

        $fields = [];
        $params = ['id' => $id];
        $allowed = ['nombre', 'tipo', 'año', 'fecha_inicio', 'fecha_fin', 'sistema_bloque_id', 'activa'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $input)) {
                $fields[] = "$field = :$field";
                $params[$field] = $input[$field];
            }
        }

        if (empty($fields)) {
            jsonResponse(['error' => 'Nada que actualizar'], 400);
        }

        // Si se marca como activa, desactivar las demás primero
        if (isset($input['activa']) && $input['activa']) {
            $pdo->exec("UPDATE temporadas SET activa = 0");
        }

        $sql = "UPDATE temporadas SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $stmt = $pdo->prepare("SELECT * FROM temporadas WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $row['año'] = (int)$row['año'];
            $row['activa'] = (bool)$row['activa'];
        }

        jsonResponse(['success' => true, 'data' => $row]);

    } elseif ($action === 'delete') {
        $id = $_GET['id'] ?? null;
        if (!$id) jsonResponse(['error' => 'ID requerido'], 400);

        $stmt = $pdo->prepare("DELETE FROM temporadas WHERE id = ? AND activa = 0");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'No se puede eliminar una temporada activa'], 400);
        }

        jsonResponse(['success' => true, 'message' => 'Temporada eliminada']);
    } else {
        jsonResponse(['error' => 'Acción no válida'], 400);
    }
}
?>
