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
        jsonResponse(['error' => 'Método no permitido'], 405);
}

function handleGet($pdo) {
    requireRoles(['gestor', 'direccion', 'secretaria']);

    $carreraId = isset($_GET['carrera_id']) ? $_GET['carrera_id'] : null;
    $nivelId = isset($_GET['nivel_id']) ? $_GET['nivel_id'] : null;
    $asignaturaId = isset($_GET['asignatura_id']) ? $_GET['asignatura_id'] : null;
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;

    // Dirección solo puede ver su carrera
    if ($_SESSION['user_role'] === 'direccion') {
        $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $u = $stmt->fetch();
        if ($u && $u['carrera_id']) {
            $carreraId = $u['carrera_id'];
        }
    }

    // Estudiantes inscritos en una asignatura específica
    if ($asignaturaId && $temporadaId) {
        $sql = "SELECT e.*, c.name as carrera_nombre, n.nombre as nivel_nombre
                FROM estudiantes e
                JOIN carreras c ON e.carrera_id = c.id
                LEFT JOIN niveles n ON e.nivel_id = n.id
                JOIN inscripciones i ON i.estudiante_id = e.id
                WHERE i.asignatura_id = ? AND i.temporada_id = ?";
        $params = [$asignaturaId, $temporadaId];

        if ($search) {
            $sql .= " AND (e.nombre LIKE ? OR e.rut LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY e.nombre";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    // Lista general
    $sql = "SELECT e.*, c.name as carrera_nombre, n.nombre as nivel_nombre
            FROM estudiantes e
            JOIN carreras c ON e.carrera_id = c.id
            LEFT JOIN niveles n ON e.nivel_id = n.id
            WHERE 1=1";
    $params = [];

    if ($carreraId) {
        $sql .= " AND e.carrera_id = ?";
        $params[] = $carreraId;
    }
    if ($nivelId) {
        $sql .= " AND e.nivel_id = ?";
        $params[] = $nivelId;
    }
    if ($search) {
        $sql .= " AND (e.nombre LIKE ? OR e.rut LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }

    $sql .= " ORDER BY e.nombre";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

function handlePost($pdo) {
    requireRoles(['gestor', 'direccion']);

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createEstudiante($pdo);
            break;
        case 'update':
            updateEstudiante($pdo);
            break;
        case 'delete':
            deleteEstudiante($pdo);
            break;
        case 'bulk_create':
            bulkCreateEstudiantes($pdo);
            break;
        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}

function createEstudiante($pdo) {
    $data = getJsonInput();

    $required = ['nombre', 'carrera_id'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    if (!isOwnCarrera($pdo, $data['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso para esta carrera'], 403);
    }

    $id = generateUUID();
    $rut = isset($data['rut']) ? sanitizeString($data['rut']) : null;
    $email = isset($data['email']) ? sanitizeString($data['email']) : null;
    $nivelId = isset($data['nivel_id']) ? $data['nivel_id'] : null;

    // Verificar RUT duplicado si se proporcionó
    if ($rut) {
        $stmt = $pdo->prepare("SELECT id FROM estudiantes WHERE rut = ?");
        $stmt->execute([$rut]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Ya existe un estudiante con ese RUT'], 409);
        }
    }

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO estudiantes (id, rut, nombre, email, carrera_id, nivel_id)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $rut,
            sanitizeString($data['nombre']),
            $email,
            $data['carrera_id'],
            $nivelId
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Estudiante creado'], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'estudiantes create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear estudiante'], 500);
    }
}

function updateEstudiante($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM estudiantes WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        jsonResponse(['error' => 'Estudiante no encontrado'], 404);
    }

    if (!isOwnCarrera($pdo, $existing['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso'], 403);
    }

    $data = getJsonInput();
    $nombre = isset($data['nombre']) ? sanitizeString($data['nombre']) : $existing['nombre'];
    $rut = isset($data['rut']) ? sanitizeString($data['rut']) : $existing['rut'];
    $email = isset($data['email']) ? sanitizeString($data['email']) : $existing['email'];
    $nivelId = array_key_exists('nivel_id', $data) ? $data['nivel_id'] : $existing['nivel_id'];

    // Verificar RUT duplicado si cambió
    if ($rut && $rut !== $existing['rut']) {
        $stmt = $pdo->prepare("SELECT id FROM estudiantes WHERE rut = ? AND id != ?");
        $stmt->execute([$rut, $id]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Ya existe un estudiante con ese RUT'], 409);
        }
    }

    try {
        $stmt = $pdo->prepare(
            "UPDATE estudiantes SET nombre = ?, rut = ?, email = ?, nivel_id = ?, carrera_id = ?
             WHERE id = ?"
        );
        $carreraId = isset($data['carrera_id']) ? $data['carrera_id'] : $existing['carrera_id'];
        $stmt->execute([$nombre, $rut, $email, $nivelId, $carreraId, $id]);

        jsonResponse(['success' => true, 'message' => 'Estudiante actualizado']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'estudiantes update: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al actualizar estudiante'], 500);
    }
}

function deleteEstudiante($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT carrera_id FROM estudiantes WHERE id = ?");
    $stmt->execute([$id]);
    $est = $stmt->fetch();
    if (!$est) {
        jsonResponse(['error' => 'Estudiante no encontrado'], 404);
    }

    if (!isOwnCarrera($pdo, $est['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso'], 403);
    }

    $pdo->prepare("DELETE FROM estudiantes WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Estudiante eliminado']);
}

function bulkCreateEstudiantes($pdo) {
    $data = getJsonInput();

    if (!isset($data['carrera_id']) || empty($data['carrera_id'])) {
        jsonResponse(['error' => 'Campo requerido: carrera_id'], 400);
    }
    if (!isset($data['estudiantes']) || !is_array($data['estudiantes']) || empty($data['estudiantes'])) {
        jsonResponse(['error' => 'Se requiere un array de estudiantes'], 400);
    }

    if (!isOwnCarrera($pdo, $data['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso para esta carrera'], 403);
    }

    $carreraId = $data['carrera_id'];
    $nivelId = isset($data['nivel_id']) ? $data['nivel_id'] : null;
    $estudiantes = $data['estudiantes'];

    $insertStmt = $pdo->prepare(
        "INSERT INTO estudiantes (id, rut, nombre, email, carrera_id, nivel_id) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $findByRut = $pdo->prepare("SELECT id FROM estudiantes WHERE rut = ?");

    $created = 0;
    $existing = 0;
    $ids = [];
    $errors = [];

    $pdo->beginTransaction();
    try {
        foreach ($estudiantes as $i => $est) {
            if (!isset($est['nombre']) || trim($est['nombre']) === '') {
                $errors[] = "Fila " . ($i + 1) . ": nombre vacío";
                continue;
            }

            $rut = isset($est['rut']) && trim($est['rut']) !== '' ? sanitizeString(trim($est['rut'])) : null;
            $email = isset($est['email']) && trim($est['email']) !== '' ? sanitizeString(trim($est['email'])) : null;
            $nombre = sanitizeString(trim($est['nombre']));

            // Upsert por RUT
            if ($rut) {
                $findByRut->execute([$rut]);
                $found = $findByRut->fetch();
                if ($found) {
                    $ids[] = $found['id'];
                    $existing++;
                    continue;
                }
            }

            $id = generateUUID();
            $insertStmt->execute([$id, $rut, $nombre, $email, $carreraId, $nivelId]);
            $ids[] = $id;
            $created++;
        }

        $pdo->commit();
        jsonResponse([
            'success' => true,
            'data' => ['ids' => $ids, 'created' => $created, 'existing' => $existing],
            'errors' => $errors,
            'message' => "Creados: {$created}, existentes: {$existing}"
        ], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'estudiantes bulk_create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error en creación masiva'], 500);
    }
}
