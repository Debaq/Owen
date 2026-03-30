<?php
// backend/api/sesiones.php
// CRUD de sesiones (unidad minima de asignacion) + auto-generacion desde asignaturas
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

    $asignaturaId = isset($_GET['asignatura_id']) ? $_GET['asignatura_id'] : null;
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;
    $nivelId = isset($_GET['nivel_id']) ? $_GET['nivel_id'] : null;

    $sql = "SELECT s.*, a.name as asignatura_nombre, a.code as asignatura_code,
                   a.nivel_id, d.name as docente_nombre,
                   sec.nombre as seccion_nombre
            FROM sesiones s
            JOIN asignaturas a ON s.asignatura_id = a.id
            LEFT JOIN docentes d ON s.docente_id = d.id
            LEFT JOIN secciones sec ON s.seccion_id = sec.id
            WHERE 1=1";
    $params = [];

    if ($asignaturaId) {
        $sql .= " AND s.asignatura_id = ?";
        $params[] = $asignaturaId;
    }
    if ($temporadaId) {
        $sql .= " AND s.temporada_id = ?";
        $params[] = $temporadaId;
    }
    if ($nivelId) {
        $sql .= " AND a.nivel_id = ?";
        $params[] = $nivelId;
    }

    $sql .= " ORDER BY a.code, s.tipo, s.etiqueta";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['alumnos_estimados'] = (int)$row['alumnos_estimados'];
        $row['bloques_requeridos'] = (int)$row['bloques_requeridos'];
        $row['fijada'] = (bool)$row['fijada'];
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

function handlePost($pdo) {
    requireRole('gestor');
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'create':
            createSesion($pdo);
            break;
        case 'delete':
            deleteSesion($pdo);
            break;
        case 'generate':
            generateSesiones($pdo);
            break;
        default:
            jsonResponse(['error' => 'Accion no valida'], 400);
    }
}

function createSesion($pdo) {
    $data = getJsonInput();

    $required = ['asignatura_id', 'tipo', 'alumnos_estimados', 'bloques_requeridos'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    if (!in_array($data['tipo'], ['teorica', 'practica'])) {
        jsonResponse(['error' => 'tipo debe ser teorica o practica'], 400);
    }

    $id = generateUUID();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO sesiones (id, asignatura_id, tipo, seccion_id, docente_id, alumnos_estimados, bloques_requeridos, etiqueta, temporada_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $data['asignatura_id'],
            $data['tipo'],
            isset($data['seccion_id']) ? $data['seccion_id'] : null,
            isset($data['docente_id']) ? $data['docente_id'] : null,
            (int)$data['alumnos_estimados'],
            (int)$data['bloques_requeridos'],
            isset($data['etiqueta']) ? sanitizeString($data['etiqueta']) : null,
            isset($data['temporada_id']) ? $data['temporada_id'] : null
        ]);

        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Sesion creada'], 201);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'sesiones create: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al crear sesion'], 500);
    }
}

function deleteSesion($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (empty($id)) {
        jsonResponse(['error' => 'ID requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM sesiones WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Sesion no encontrada'], 404);
    }

    $pdo->prepare("DELETE FROM sesiones WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Sesion eliminada']);
}

/**
 * Auto-genera sesiones para una asignatura:
 * - Sesiones teoricas: grupo completo del nivel
 * - Sesiones practicas: divididas en secciones segun capacidad de labs
 */
function generateSesiones($pdo) {
    $asignaturaId = isset($_GET['asignatura_id']) ? $_GET['asignatura_id'] : '';
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : '';

    if (empty($asignaturaId)) {
        jsonResponse(['error' => 'asignatura_id requerido'], 400);
    }

    // Obtener datos de la asignatura
    $stmt = $pdo->prepare(
        "SELECT a.*, n.alumnos_estimados, n.id as nid, c.name as carrera_name
         FROM asignaturas a
         JOIN niveles n ON a.nivel_id = n.id
         JOIN carreras c ON a.carrera_id = c.id
         WHERE a.id = ?"
    );
    $stmt->execute([$asignaturaId]);
    $asignatura = $stmt->fetch();

    if (!$asignatura) {
        jsonResponse(['error' => 'Asignatura no encontrada'], 404);
    }

    $alumnosNivel = (int)$asignatura['alumnos_estimados'];
    if ($alumnosNivel <= 0) {
        jsonResponse(['error' => 'El nivel no tiene alumnos_estimados definido'], 400);
    }

    $horasTeoria = (int)$asignatura['horas_teoria'];
    $horasPractica = (int)$asignatura['horas_practica'];
    $code = $asignatura['code'];

    // Obtener docente responsable
    $stmt = $pdo->prepare(
        "SELECT docente_id FROM docente_asignaturas WHERE asignatura_id = ? AND rol = 'responsable' LIMIT 1"
    );
    $stmt->execute([$asignaturaId]);
    $docenteResp = $stmt->fetch();
    $docenteRespId = $docenteResp ? $docenteResp['docente_id'] : null;

    // Obtener docentes colaboradores
    $stmt = $pdo->prepare(
        "SELECT docente_id FROM docente_asignaturas WHERE asignatura_id = ? AND rol = 'colaborador'"
    );
    $stmt->execute([$asignaturaId]);
    $colaboradores = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Obtener secciones del nivel (si existen)
    $stmt = $pdo->prepare("SELECT * FROM secciones WHERE nivel_id = ? ORDER BY nombre");
    $stmt->execute([$asignatura['nid']]);
    $secciones = $stmt->fetchAll();

    // Eliminar sesiones existentes de esta asignatura + temporada
    if (!empty($temporadaId)) {
        $pdo->prepare("DELETE FROM sesiones WHERE asignatura_id = ? AND temporada_id = ?")
            ->execute([$asignaturaId, $temporadaId]);
    } else {
        $pdo->prepare("DELETE FROM sesiones WHERE asignatura_id = ? AND temporada_id IS NULL")
            ->execute([$asignaturaId]);
    }

    $created = [];
    $insertStmt = $pdo->prepare(
        "INSERT INTO sesiones (id, asignatura_id, tipo, seccion_id, docente_id, alumnos_estimados, bloques_requeridos, etiqueta, temporada_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $pdo->beginTransaction();

    try {
        // Generar sesiones teoricas (grupo completo)
        for ($i = 1; $i <= $horasTeoria; $i++) {
            $id = generateUUID();
            $etiqueta = $code . '-T' . $i;
            $insertStmt->execute([
                $id, $asignaturaId, 'teorica', null, $docenteRespId,
                $alumnosNivel, 1, $etiqueta, $temporadaId ?: null
            ]);
            $created[] = ['id' => $id, 'etiqueta' => $etiqueta, 'tipo' => 'teorica', 'alumnos' => $alumnosNivel];
        }

        // Generar sesiones practicas (por seccion)
        if ($horasPractica > 0) {
            if (empty($secciones)) {
                // Sin secciones: una sola sesion practica con todo el grupo
                for ($i = 1; $i <= $horasPractica; $i++) {
                    $id = generateUUID();
                    $etiqueta = $code . '-P' . $i;
                    $docenteId = !empty($colaboradores) ? $colaboradores[0] : $docenteRespId;
                    $insertStmt->execute([
                        $id, $asignaturaId, 'practica', null, $docenteId,
                        $alumnosNivel, 1, $etiqueta, $temporadaId ?: null
                    ]);
                    $created[] = ['id' => $id, 'etiqueta' => $etiqueta, 'tipo' => 'practica', 'alumnos' => $alumnosNivel];
                }
            } else {
                // Con secciones: sesiones por cada seccion
                $numColabs = count($colaboradores);
                foreach ($secciones as $secIdx => $seccion) {
                    for ($i = 1; $i <= $horasPractica; $i++) {
                        $id = generateUUID();
                        $etiqueta = $code . '-P' . $seccion['nombre'] . $i;
                        // Distribuir docentes entre secciones
                        if ($numColabs > 0) {
                            $docenteId = $colaboradores[$secIdx % $numColabs];
                        } else {
                            $docenteId = $docenteRespId;
                        }
                        $insertStmt->execute([
                            $id, $asignaturaId, 'practica', $seccion['id'], $docenteId,
                            (int)$seccion['alumnos'], 1, $etiqueta, $temporadaId ?: null
                        ]);
                        $created[] = [
                            'id' => $id, 'etiqueta' => $etiqueta, 'tipo' => 'practica',
                            'alumnos' => (int)$seccion['alumnos'], 'seccion' => $seccion['nombre']
                        ];
                    }
                }
            }
        }

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Generadas ' . count($created) . ' sesiones',
            'data' => [
                'sesiones' => $created,
                'total_teoricas' => $horasTeoria,
                'total_practicas' => count($created) - $horasTeoria,
                'secciones_usadas' => count($secciones)
            ]
        ], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'sesiones generate: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al generar sesiones'], 500);
    }
}
?>
