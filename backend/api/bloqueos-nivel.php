<?php
// backend/api/bloqueos-nivel.php
// CRUD de bloqueos de nivel (dias/bloques reservados por direccion de carrera)
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
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;

    $sql = "SELECT b.*, n.nombre as nivel_nombre, n.carrera_id,
                   bl.nombre as bloque_nombre, bl.hora_inicio, bl.hora_fin
            FROM bloqueos_nivel b
            LEFT JOIN niveles n ON b.nivel_id = n.id
            LEFT JOIN bloques_horarios bl ON b.bloque_id = bl.id
            WHERE 1=1";
    $params = [];

    if ($nivelId) {
        $sql .= " AND b.nivel_id = ?";
        $params[] = $nivelId;
    }
    if ($temporadaId) {
        $sql .= " AND b.temporada_id = ?";
        $params[] = $temporadaId;
    }

    // Direccion solo ve bloqueos de niveles de su carrera
    if ($_SESSION['user_role'] === 'direccion') {
        $sql .= " AND n.carrera_id IN (SELECT carrera_id FROM users WHERE id = ?)";
        $params[] = $_SESSION['user_id'];
    }

    $sql .= " ORDER BY b.dia_semana, bl.orden";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['dia_semana'] = $row['dia_semana'] !== null ? (int)$row['dia_semana'] : null;
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireAuth();
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createBloqueo($pdo);
            break;
        case 'delete':
            deleteBloqueo($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createBloqueo($pdo) {
    $data = getJsonInput();

    $required = ['nivel_id', 'temporada_id'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    // Verificar permisos: gestor puede todo, direccion solo su carrera
    $stmt = $pdo->prepare("SELECT carrera_id FROM niveles WHERE id = ?");
    $stmt->execute([$data['nivel_id']]);
    $nivel = $stmt->fetch();
    if (!$nivel) {
        jsonResponse(['error' => 'Nivel no encontrado'], 404);
    }

    if ($_SESSION['user_role'] === 'direccion' && !isOwnCarrera($pdo, $nivel['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso para bloquear niveles de otra carrera'], 403);
    }

    $id = generateUUID();
    $diaSemana = isset($data['dia_semana']) ? $data['dia_semana'] : null;
    $bloqueId = isset($data['bloque_id']) ? $data['bloque_id'] : null;
    $motivo = isset($data['motivo']) ? sanitizeString($data['motivo']) : null;

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO bloqueos_nivel (id, nivel_id, temporada_id, dia_semana, bloque_id, motivo, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$id, $data['nivel_id'], $data['temporada_id'], $diaSemana, $bloqueId, $motivo, $_SESSION['user_id']]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Bloqueo creado'], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'bloqueos-nivel create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear bloqueo'], 500);
    }
}

function deleteBloqueo($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    // Verificar que existe y permisos
    $stmt = $pdo->prepare(
        "SELECT b.*, n.carrera_id FROM bloqueos_nivel b
         JOIN niveles n ON b.nivel_id = n.id WHERE b.id = ?"
    );
    $stmt->execute([$id]);
    $bloqueo = $stmt->fetch();

    if (!$bloqueo) {
        jsonResponse(['error' => 'Bloqueo no encontrado'], 404);
    }

    if ($_SESSION['user_role'] === 'direccion' && !isOwnCarrera($pdo, $bloqueo['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso'], 403);
    }

    $stmt = $pdo->prepare("DELETE FROM bloqueos_nivel WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'Bloqueo eliminado']);
}
?>
