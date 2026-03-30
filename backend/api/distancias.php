<?php
// backend/api/distancias.php
// CRUD de distancias entre edificios + auto-generacion desde coordenadas
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
        jsonResponse(['error' => 'Metodo no permitido'], 405);
}

function handleGet($pdo) {
    requireAuth();

    $edificioId = isset($_GET['edificio_id']) ? $_GET['edificio_id'] : null;

    $sql = "SELECT d.*,
                   eo.name as edificio_origen_nombre, eo.code as edificio_origen_code,
                   ed.name as edificio_destino_nombre, ed.code as edificio_destino_code
            FROM distancias_edificios d
            JOIN edificios eo ON d.edificio_origen_id = eo.id
            JOIN edificios ed ON d.edificio_destino_id = ed.id
            WHERE 1=1";
    $params = [];

    if ($edificioId) {
        $sql .= " AND (d.edificio_origen_id = ? OR d.edificio_destino_id = ?)";
        $params[] = $edificioId;
        $params[] = $edificioId;
    }

    $sql .= " ORDER BY eo.name, ed.name";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['minutos'] = (int)$row['minutos'];
        $row['techado'] = (bool)$row['techado'];
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createDistancia($pdo);
            break;
        case 'update':
            updateDistancia($pdo);
            break;
        case 'delete':
            deleteDistancia($pdo);
            break;
        case 'generate':
            generateDistancias($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createDistancia($pdo) {
    $data = getJsonInput();

    $required = ['edificio_origen_id', 'edificio_destino_id', 'minutos'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    if ($data['edificio_origen_id'] === $data['edificio_destino_id']) {
        jsonResponse(['error' => 'Origen y destino deben ser diferentes'], 400);
    }

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO distancias_edificios (id, edificio_origen_id, edificio_destino_id, minutos, techado, notas)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $data['edificio_origen_id'],
            $data['edificio_destino_id'],
            (int)$data['minutos'],
            isset($data['techado']) ? (int)(bool)$data['techado'] : 0,
            isset($data['notas']) ? sanitizeString($data['notas']) : null
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Distancia creada'], 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['error' => 'Ya existe distancia entre estos edificios'], 409);
        }
        securityLog('DB_ERROR', 'distancias create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear distancia'], 500);
    }
}

function updateDistancia($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM distancias_edificios WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Distancia no encontrada'], 404);
    }

    $data = getJsonInput();
    $allowed = ['minutos', 'techado', 'notas'];
    $sets = [];
    $params = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $sets[] = "{$field} = ?";
            if ($field === 'minutos') {
                $params[] = (int)$data[$field];
            } elseif ($field === 'techado') {
                $params[] = (int)(bool)$data[$field];
            } else {
                $params[] = sanitizeString($data[$field]);
            }
        }
    }

    if (empty($sets)) {
        jsonResponse(['error' => 'Nada que actualizar'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE distancias_edificios SET " . implode(', ', $sets) . " WHERE id = ?";

    try {
        $pdo->prepare($sql)->execute($params);
        jsonResponse(['success' => true, 'message' => 'Distancia actualizada']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'distancias update: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al actualizar'], 500);
    }
}

function deleteDistancia($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM distancias_edificios WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Distancia no encontrada'], 404);
    }

    $pdo->prepare("DELETE FROM distancias_edificios WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Distancia eliminada']);
}

/**
 * Auto-genera distancias entre todos los pares de edificios usando Haversine.
 * Solo inserta pares que no tienen entrada manual.
 * Velocidad estimada: 80m/min caminando.
 */
function generateDistancias($pdo) {
    $stmt = $pdo->query("SELECT id, name, lat, lng FROM edificios");
    $edificios = $stmt->fetchAll();

    if (count($edificios) < 2) {
        jsonResponse(['error' => 'Se necesitan al menos 2 edificios'], 400);
    }

    $inserted = 0;
    $skipped = 0;

    $checkStmt = $pdo->prepare(
        "SELECT id FROM distancias_edificios WHERE edificio_origen_id = ? AND edificio_destino_id = ?"
    );
    $insertStmt = $pdo->prepare(
        "INSERT INTO distancias_edificios (id, edificio_origen_id, edificio_destino_id, minutos, techado, notas)
         VALUES (?, ?, ?, ?, 0, ?)"
    );

    $pdo->beginTransaction();

    try {
        for ($i = 0; $i < count($edificios); $i++) {
            for ($j = $i + 1; $j < count($edificios); $j++) {
                $a = $edificios[$i];
                $b = $edificios[$j];

                // Verificar si ya existe (en cualquier direccion)
                $checkStmt->execute([$a['id'], $b['id']]);
                if ($checkStmt->fetch()) {
                    $skipped++;
                    continue;
                }
                $checkStmt->execute([$b['id'], $a['id']]);
                if ($checkStmt->fetch()) {
                    $skipped++;
                    continue;
                }

                $distMetros = haversine($a['lat'], $a['lng'], $b['lat'], $b['lng']);
                $minutos = max(1, (int)round($distMetros / 80)); // 80m/min caminando

                // A -> B
                $insertStmt->execute([
                    generateUUID(), $a['id'], $b['id'], $minutos,
                    'Auto-generado desde coordenadas'
                ]);
                // B -> A (misma distancia)
                $insertStmt->execute([
                    generateUUID(), $b['id'], $a['id'], $minutos,
                    'Auto-generado desde coordenadas'
                ]);

                $inserted += 2;
            }
        }

        $pdo->commit();
        jsonResponse([
            'success' => true,
            'message' => "Generadas {$inserted} distancias, {$skipped} pares omitidos (ya existian)"
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'distancias generate: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al generar distancias'], 500);
    }
}

/**
 * Calcula distancia en metros entre dos puntos usando formula de Haversine
 */
function haversine($lat1, $lng1, $lat2, $lng2) {
    $earthRadius = 6371000; // metros
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLng / 2) * sin($dLng / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}
?>
