<?php
// backend/api/branches.php
// CRUD de branches (propuestas de horario) del sistema de versionado
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

    $id = isset($_GET['id']) ? $_GET['id'] : null;
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;

    if ($id) {
        getBranch($pdo, $id);
        return;
    }

    $sql = "SELECT b.*, u.name as autor_nombre,
                   t.nombre as temporada_nombre,
                   (SELECT COUNT(*) FROM horario_commits WHERE branch_id = b.id) as total_commits,
                   (SELECT score_global FROM horario_commits WHERE branch_id = b.id ORDER BY created_at DESC LIMIT 1) as ultimo_score,
                   (SELECT mensaje FROM horario_commits WHERE branch_id = b.id ORDER BY created_at DESC LIMIT 1) as ultimo_commit_mensaje
            FROM horario_branches b
            JOIN users u ON b.created_by = u.id
            JOIN temporadas t ON b.temporada_id = t.id
            WHERE 1=1";
    $params = [];

    if ($temporadaId) {
        $sql .= " AND b.temporada_id = ?";
        $params[] = $temporadaId;
    }

    $sql .= " ORDER BY b.es_principal DESC, b.updated_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['es_principal'] = (bool)$row['es_principal'];
        $row['total_commits'] = (int)$row['total_commits'];
        $row['ultimo_score'] = $row['ultimo_score'] !== null ? (float)$row['ultimo_score'] : null;
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function getBranch($pdo, $id) {
    $stmt = $pdo->prepare(
        "SELECT b.*, u.name as autor_nombre, t.nombre as temporada_nombre
         FROM horario_branches b
         JOIN users u ON b.created_by = u.id
         JOIN temporadas t ON b.temporada_id = t.id
         WHERE b.id = ?"
    );
    $stmt->execute([$id]);
    $branch = $stmt->fetch();

    if (!$branch) {
        jsonResponse(['error' => 'Branch no encontrado'], 404);
    }

    $branch['es_principal'] = (bool)$branch['es_principal'];

    // Contar commits y asignaciones del ultimo commit
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) as total FROM horario_commits WHERE branch_id = ?"
    );
    $stmt->execute([$id]);
    $branch['total_commits'] = (int)$stmt->fetch()['total'];

    $stmt = $pdo->prepare(
        "SELECT c.id, c.score_global, c.mensaje,
                (SELECT COUNT(*) FROM horario_asignaciones WHERE commit_id = c.id) as total_asignaciones
         FROM horario_commits c WHERE c.branch_id = ? ORDER BY c.created_at DESC LIMIT 1"
    );
    $stmt->execute([$id]);
    $ultimo = $stmt->fetch();

    if ($ultimo) {
        $branch['ultimo_commit_id'] = $ultimo['id'];
        $branch['ultimo_score'] = $ultimo['score_global'] !== null ? (float)$ultimo['score_global'] : null;
        $branch['ultimo_commit_mensaje'] = $ultimo['mensaje'];
        $branch['total_asignaciones'] = (int)$ultimo['total_asignaciones'];
    }

    jsonResponse(['success' => true, 'data' => $branch]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createBranch($pdo);
            break;
        case 'update':
            updateBranch($pdo);
            break;
        case 'delete':
            deleteBranch($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createBranch($pdo) {
    $data = getJsonInput();

    if (empty($data['temporada_id']) || empty($data['nombre'])) {
        jsonResponse(['error' => 'temporada_id y nombre son requeridos'], 400);
    }

    // Verificar si es el primer branch de la temporada
    $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM horario_branches WHERE temporada_id = ?");
    $stmt->execute([$data['temporada_id']]);
    $esPrimero = (int)$stmt->fetch()['c'] === 0;

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO horario_branches (id, temporada_id, nombre, descripcion, es_principal, branch_padre_id, commit_padre_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $data['temporada_id'],
            sanitizeString($data['nombre']),
            isset($data['descripcion']) ? sanitizeString($data['descripcion']) : null,
            $esPrimero ? 1 : 0,
            isset($data['branch_padre_id']) ? $data['branch_padre_id'] : null,
            isset($data['commit_padre_id']) ? $data['commit_padre_id'] : null,
            $_SESSION['user_id']
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id, 'es_principal' => $esPrimero], 'message' => 'Branch creado'], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'branches create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear branch'], 500);
    }
}

function updateBranch($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM horario_branches WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Branch no encontrado'], 404);
    }

    $data = getJsonInput();
    $allowed = ['nombre', 'descripcion', 'estado'];
    $sets = ['updated_at = datetime(\'now\')'];
    $params = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $sets[] = "{$field} = ?";
            $params[] = in_array($field, ['nombre', 'descripcion']) ? sanitizeString($data[$field]) : $data[$field];
        }
    }

    if (count($sets) === 1) {
        jsonResponse(['error' => 'Nada que actualizar'], 400);
    }

    // Validar estado si se envio
    if (isset($data['estado'])) {
        $estados = ['borrador', 'revision', 'aprobado', 'publicado', 'descartado'];
        if (!in_array($data['estado'], $estados)) {
            jsonResponse(['error' => 'Estado no valido'], 400);
        }
    }

    $params[] = $id;
    $sql = "UPDATE horario_branches SET " . implode(', ', $sets) . " WHERE id = ?";

    try {
        $pdo->prepare($sql)->execute($params);
        jsonResponse(['success' => true, 'message' => 'Branch actualizado']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'branches update: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al actualizar'], 500);
    }
}

function deleteBranch($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT es_principal, estado FROM horario_branches WHERE id = ?");
    $stmt->execute([$id]);
    $branch = $stmt->fetch();

    if (!$branch) {
        jsonResponse(['error' => 'Branch no encontrado'], 404);
    }

    if ($branch['es_principal']) {
        jsonResponse(['error' => 'No se puede eliminar el branch principal'], 400);
    }

    if ($branch['estado'] === 'publicado') {
        jsonResponse(['error' => 'No se puede eliminar un branch publicado'], 400);
    }

    // DELETE CASCADE eliminara commits y asignaciones
    $pdo->prepare("DELETE FROM horario_branches WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Branch eliminado']);
}
?>
