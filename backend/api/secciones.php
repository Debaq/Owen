<?php
// backend/api/secciones.php
// CRUD de secciones (subgrupos de un nivel) + auto-generacion por capacidad de lab
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

    $nivelId = isset($_GET['nivel_id']) ? $_GET['nivel_id'] : null;

    $sql = "SELECT s.*, n.nombre as nivel_nombre, n.carrera_id
            FROM secciones s
            JOIN niveles n ON s.nivel_id = n.id
            WHERE 1=1";
    $params = [];

    if ($nivelId) {
        $sql .= " AND s.nivel_id = ?";
        $params[] = $nivelId;
    }

    $sql .= " ORDER BY n.nombre, s.nombre";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['alumnos'] = (int)$row['alumnos'];
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createSeccion($pdo);
            break;
        case 'delete':
            deleteSeccion($pdo);
            break;
        case 'generate':
            generateSecciones($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createSeccion($pdo) {
    $data = getJsonInput();

    $required = ['nivel_id', 'nombre', 'alumnos'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO secciones (id, nivel_id, nombre, alumnos) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $data['nivel_id'],
            sanitizeString($data['nombre']),
            (int)$data['alumnos']
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Seccion creada'], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'secciones create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear seccion'], 500);
    }
}

function deleteSeccion($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM secciones WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Seccion no encontrada'], 404);
    }

    $pdo->prepare("DELETE FROM secciones WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Seccion eliminada']);
}

/**
 * Auto-genera secciones para un nivel basandose en la capacidad del lab mas grande.
 * Ejemplo: 58 alumnos, lab de 20 = 3 secciones (20, 20, 18)
 */
function generateSecciones($pdo) {
    $nivelId = isset($_GET['nivel_id']) ? $_GET['nivel_id'] : '';
    if (empty($nivelId)) {
        jsonResponse(['error' => 'nivel_id requerido'], 400);
    }

    // Obtener alumnos del nivel
    $stmt = $pdo->prepare("SELECT alumnos_estimados, carrera_id FROM niveles WHERE id = ?");
    $stmt->execute([$nivelId]);
    $nivel = $stmt->fetch();

    if (!$nivel) {
        jsonResponse(['error' => 'Nivel no encontrado'], 404);
    }

    $alumnos = (int)$nivel['alumnos_estimados'];
    if ($alumnos <= 0) {
        jsonResponse(['error' => 'El nivel no tiene alumnos_estimados definido'], 400);
    }

    // Buscar capacidad del lab mas grande disponible para la carrera o central
    $stmt = $pdo->prepare(
        "SELECT MAX(capacidad) as max_cap FROM salas
         WHERE tipo IN ('laboratorio', 'taller') AND activo = 1
         AND (tipo_gestion = 'central' OR gestion_carrera_id = ?)"
    );
    $stmt->execute([$nivel['carrera_id']]);
    $labInfo = $stmt->fetch();

    $labCapacidad = $labInfo && $labInfo['max_cap'] ? (int)$labInfo['max_cap'] : null;

    if (!$labCapacidad) {
        jsonResponse(['error' => 'No hay laboratorios disponibles para calcular secciones'], 400);
    }

    $numSecciones = (int)ceil($alumnos / $labCapacidad);
    $alumnosPorSeccion = (int)ceil($alumnos / $numSecciones);

    // Eliminar secciones existentes del nivel
    $pdo->prepare("DELETE FROM secciones WHERE nivel_id = ?")->execute([$nivelId]);

    $letras = range('A', 'Z');
    $created = [];

    $pdo->beginTransaction();

    try {
        $insertStmt = $pdo->prepare(
            "INSERT INTO secciones (id, nivel_id, nombre, alumnos) VALUES (?, ?, ?, ?)"
        );

        $alumnosRestantes = $alumnos;
        for ($i = 0; $i < $numSecciones; $i++) {
            $alumnosSeccion = min($alumnosPorSeccion, $alumnosRestantes);
            $alumnosRestantes -= $alumnosSeccion;

            $id = generateUUID();
            $nombre = $letras[$i];

            $insertStmt->execute([$id, $nivelId, $nombre, $alumnosSeccion]);
            $created[] = ['id' => $id, 'nombre' => $nombre, 'alumnos' => $alumnosSeccion];
        }

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => "Generadas {$numSecciones} secciones (lab max: {$labCapacidad} alumnos)",
            'data' => [
                'secciones' => $created,
                'lab_capacidad_usada' => $labCapacidad,
                'alumnos_total' => $alumnos
            ]
        ], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'secciones generate: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al generar secciones'], 500);
    }
}
?>
