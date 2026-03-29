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

// ==================== GET ====================

function handleGet($pdo) {
    requireAuth();

    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
        $stmt->execute([$id]);
        $sol = $stmt->fetch();
        if (!$sol) {
            jsonResponse(['error' => 'Solicitud no encontrada'], 404);
        }
        $sol = enrichSolicitud($pdo, $sol);
        jsonResponse(['success' => true, 'data' => $sol]);
    }

    // Listar según rol
    $role = $_SESSION['user_role'];
    $params = [];
    $where = [];

    if ($role === 'direccion') {
        $where[] = "s.usuario_id = ?";
        $params[] = $_SESSION['user_id'];
    }

    if (isset($_GET['estado']) && $_GET['estado'] !== '') {
        $where[] = "s.estado = ?";
        $params[] = $_GET['estado'];
    }

    if (isset($_GET['carrera_id']) && $_GET['carrera_id'] !== '') {
        $where[] = "s.carrera_id = ?";
        $params[] = $_GET['carrera_id'];
    }

    $sql = "SELECT s.* FROM solicitudes s";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    $sql .= " ORDER BY s.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $solicitudes = $stmt->fetchAll();

    foreach ($solicitudes as &$sol) {
        $sol = enrichSolicitud($pdo, $sol);
    }

    jsonResponse(['success' => true, 'data' => $solicitudes]);
}

function enrichSolicitud($pdo, $sol) {
    $sol['equipamiento_requerido'] = json_decode($sol['equipamiento_requerido'], true);
    if (!is_array($sol['equipamiento_requerido'])) $sol['equipamiento_requerido'] = [];
    $sol['bloques'] = json_decode($sol['bloques'], true);
    if (!is_array($sol['bloques'])) $sol['bloques'] = [];
    $sol['patron_recurrencia'] = json_decode($sol['patron_recurrencia'], true);
    $sol['capacidad_requerida'] = $sol['capacidad_requerida'] !== null ? (int)$sol['capacidad_requerida'] : null;
    $sol['recurrente'] = (bool)$sol['recurrente'];
    $sol['procesada_por_agente'] = (bool)$sol['procesada_por_agente'];
    $sol['confianza_agente'] = $sol['confianza_agente'] !== null ? (int)$sol['confianza_agente'] : null;

    // Nombres relacionados
    $stmt = $pdo->prepare("SELECT name FROM carreras WHERE id = ?");
    $stmt->execute([$sol['carrera_id']]);
    $c = $stmt->fetch();
    $sol['carrera_name'] = $c ? $c['name'] : null;

    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
    $stmt->execute([$sol['usuario_id']]);
    $u = $stmt->fetch();
    $sol['usuario_name'] = $u ? $u['name'] : null;

    if ($sol['sala_preferida_id']) {
        $stmt = $pdo->prepare("SELECT name, code FROM salas WHERE id = ?");
        $stmt->execute([$sol['sala_preferida_id']]);
        $sp = $stmt->fetch();
        $sol['sala_preferida_name'] = $sp ? $sp['code'] . ' - ' . $sp['name'] : null;
    }

    if ($sol['sala_asignada_id']) {
        $stmt = $pdo->prepare("SELECT name, code FROM salas WHERE id = ?");
        $stmt->execute([$sol['sala_asignada_id']]);
        $sa = $stmt->fetch();
        $sol['sala_asignada_name'] = $sa ? $sa['code'] . ' - ' . $sa['name'] : null;
    }

    // Nombres de bloques
    if (!empty($sol['bloques'])) {
        $placeholders = implode(',', array_fill(0, count($sol['bloques']), '?'));
        $stmt = $pdo->prepare("SELECT id, nombre, dia_semana, hora_inicio, hora_fin FROM bloques_horarios WHERE id IN ($placeholders)");
        $stmt->execute($sol['bloques']);
        $sol['bloques_detail'] = $stmt->fetchAll();
        foreach ($sol['bloques_detail'] as &$b) {
            $b['dia_semana'] = (int)$b['dia_semana'];
        }
    } else {
        $sol['bloques_detail'] = [];
    }

    return $sol;
}

// ==================== POST ====================

function handlePost($pdo) {
    requireAuth();

    $action = isset($_GET['action']) ? $_GET['action'] : 'create';
    $input = getJsonInput();

    try {
        switch ($action) {
            case 'create':
                createSolicitud($pdo, $input);
                break;
            case 'match':
                $results = matchRooms($pdo, $input);
                jsonResponse(['success' => true, 'data' => $results]);
                break;
            case 'auto_process':
                autoProcess($pdo, $input);
                break;
            case 'approve':
                requireRole('gestor');
                approveSolicitud($pdo, $input);
                break;
            case 'reject':
                requireRole('gestor');
                rejectSolicitud($pdo, $input);
                break;
            default:
                jsonResponse(['error' => 'Acción inválida'], 400);
        }
    } catch (Exception $e) {
        securityLog('SOLICITUD_ERROR', $e->getMessage());
        jsonResponse(['error' => $e->getMessage()], 400);
    }
}

// ==================== CREAR SOLICITUD ====================

function createSolicitud($pdo, $input) {
    $required = ['motivo', 'fecha_inicio', 'fecha_fin', 'bloques'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            jsonResponse(['error' => "Campo '$field' es requerido"], 400);
        }
    }

    if (!is_array($input['bloques']) || empty($input['bloques'])) {
        jsonResponse(['error' => 'Debe seleccionar al menos un bloque horario'], 400);
    }

    if ($input['fecha_inicio'] > $input['fecha_fin']) {
        jsonResponse(['error' => 'La fecha de inicio debe ser anterior a la fecha de fin'], 400);
    }

    // Obtener info del usuario
    $stmt = $pdo->prepare("SELECT name, carrera_id FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonResponse(['error' => 'Usuario no encontrado'], 404);
    }

    $id = generateUUID();

    $sql = "INSERT INTO solicitudes (
        id, solicitante, carrera_id, usuario_id, motivo, asignatura_code,
        sala_preferida_id, tipo_sala, mobiliario_requerido, capacidad_requerida,
        equipamiento_requerido, fecha_inicio, fecha_fin, bloques,
        recurrente, patron_recurrencia, estado
    ) VALUES (
        :id, :solicitante, :carrera_id, :usuario_id, :motivo, :asignatura_code,
        :sala_preferida_id, :tipo_sala, :mobiliario_requerido, :capacidad_requerida,
        :equipamiento_requerido, :fecha_inicio, :fecha_fin, :bloques,
        :recurrente, :patron_recurrencia, :estado
    )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id' => $id,
        'solicitante' => $user['name'],
        'carrera_id' => $input['carrera_id'] ? $input['carrera_id'] : ($user['carrera_id'] ? $user['carrera_id'] : ''),
        'usuario_id' => $_SESSION['user_id'],
        'motivo' => sanitizeString($input['motivo']),
        'asignatura_code' => isset($input['asignatura_code']) ? $input['asignatura_code'] : null,
        'sala_preferida_id' => isset($input['sala_preferida_id']) ? $input['sala_preferida_id'] : null,
        'tipo_sala' => isset($input['tipo_sala']) ? $input['tipo_sala'] : null,
        'mobiliario_requerido' => isset($input['mobiliario_requerido']) ? $input['mobiliario_requerido'] : null,
        'capacidad_requerida' => isset($input['capacidad_requerida']) ? (int)$input['capacidad_requerida'] : null,
        'equipamiento_requerido' => json_encode(isset($input['equipamiento_requerido']) ? $input['equipamiento_requerido'] : []),
        'fecha_inicio' => $input['fecha_inicio'],
        'fecha_fin' => $input['fecha_fin'],
        'bloques' => json_encode($input['bloques']),
        'recurrente' => !empty($input['recurrente']) ? 1 : 0,
        'patron_recurrencia' => isset($input['patron_recurrencia']) ? json_encode($input['patron_recurrencia']) : null,
        'estado' => 'pendiente',
    ]);

    $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
    $stmt->execute([$id]);
    $sol = $stmt->fetch();
    $sol = enrichSolicitud($pdo, $sol);

    jsonResponse(['success' => true, 'data' => $sol], 201);
}

// ==================== ALGORITMO DE MATCHING ====================

function matchRooms($pdo, $input) {
    // Paso 1: Pool de candidatas con filtros duros
    $where = ["activo = 1"];
    $params = [];

    if (!empty($input['tipo_sala'])) {
        $where[] = "tipo = ?";
        $params[] = $input['tipo_sala'];
    }

    if (!empty($input['capacidad_requerida'])) {
        $where[] = "capacidad >= ?";
        $params[] = (int)$input['capacidad_requerida'];
    }

    if (!empty($input['mobiliario_requerido'])) {
        $where[] = "tipo_mobiliario = ?";
        $params[] = $input['mobiliario_requerido'];
    }

    $sql = "SELECT * FROM salas WHERE " . implode(' AND ', $where) . " ORDER BY capacidad ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $candidatas = $stmt->fetchAll();

    if (empty($candidatas)) {
        return [
            'matches' => [],
            'confianza' => 0,
            'auto_aprobable' => false,
            'total_candidates' => 0,
            'available_count' => 0,
        ];
    }

    // Decodificar JSON en candidatas
    foreach ($candidatas as &$sala) {
        $sala['mobiliario'] = json_decode($sala['mobiliario'], true);
        if (!is_array($sala['mobiliario'])) $sala['mobiliario'] = [];
        $sala['tipo_mobiliario'] = isset($sala['tipo_mobiliario']) ? $sala['tipo_mobiliario'] : null;
        $sala['equipamiento'] = json_decode($sala['equipamiento'], true);
        if (!is_array($sala['equipamiento'])) $sala['equipamiento'] = [];
        $sala['fotos'] = json_decode($sala['fotos'], true);
        if (!is_array($sala['fotos'])) $sala['fotos'] = [];
        $sala['piso'] = (int)$sala['piso'];
        $sala['capacidad'] = (int)$sala['capacidad'];
        $sala['lat'] = (float)$sala['lat'];
        $sala['lng'] = (float)$sala['lng'];
        $sala['activo'] = (bool)$sala['activo'];
    }
    unset($sala);

    $bloques = isset($input['bloques']) ? $input['bloques'] : [];
    if (!is_array($bloques)) $bloques = [];
    $fecha_inicio = isset($input['fecha_inicio']) ? $input['fecha_inicio'] : '';
    $fecha_fin = isset($input['fecha_fin']) ? $input['fecha_fin'] : '';

    // Paso 2: Obtener dia_semana de cada bloque solicitado
    $bloquesDias = [];
    if (!empty($bloques)) {
        $placeholders = implode(',', array_fill(0, count($bloques), '?'));
        $stmt = $pdo->prepare("SELECT id, dia_semana FROM bloques_horarios WHERE id IN ($placeholders)");
        $stmt->execute($bloques);
        $rows = $stmt->fetchAll();
        foreach ($rows as $r) {
            $bloquesDias[$r['id']] = (int)$r['dia_semana'];
        }
    }

    // Paso 2b: Obtener temporada activa
    $stmt = $pdo->prepare("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
    $stmt->execute();
    $tempRow = $stmt->fetch();
    $temporada_id = $tempRow ? $tempRow['id'] : null;

    // Paso 2c: Batch query - ocupación en horarios para todas las candidatas
    $salaIds = array_column($candidatas, 'id');
    $occupiedSlots = [];

    if (!empty($salaIds) && !empty($bloques) && $temporada_id) {
        $salaPlaceholders = implode(',', array_fill(0, count($salaIds), '?'));
        $bloquePlaceholders = implode(',', array_fill(0, count($bloques), '?'));

        $conflictSql = "SELECT sala_id, bloque_id, dia_semana FROM horarios
            WHERE sala_id IN ($salaPlaceholders)
              AND bloque_id IN ($bloquePlaceholders)
              AND activo = 1
              AND temporada_id = ?
              AND fecha_inicio <= ?
              AND fecha_fin >= ?";

        $conflictParams = array_merge($salaIds, $bloques, [$temporada_id, $fecha_fin, $fecha_inicio]);
        $stmt = $pdo->prepare($conflictSql);
        $stmt->execute($conflictParams);
        $conflicts = $stmt->fetchAll();

        foreach ($conflicts as $c) {
            $key = $c['sala_id'] . '_' . $c['bloque_id'];
            $occupiedSlots[$key] = true;
        }
    }

    // Paso 2d: Verificar solicitudes ya aprobadas
    $approvedConflicts = [];
    if (!empty($salaIds) && !empty($bloques)) {
        $stmt = $pdo->prepare("SELECT sala_asignada_id, bloques, fecha_inicio, fecha_fin FROM solicitudes
            WHERE sala_asignada_id IN (" . implode(',', array_fill(0, count($salaIds), '?')) . ")
              AND estado IN ('aprobada', 'auto_aprobada')
              AND fecha_inicio <= ?
              AND fecha_fin >= ?");
        $approvedParams = array_merge($salaIds, [$fecha_fin, $fecha_inicio]);
        $stmt->execute($approvedParams);
        $approvedSols = $stmt->fetchAll();

        foreach ($approvedSols as $as) {
            $asBloques = json_decode($as['bloques'], true);
            if (!is_array($asBloques)) continue;
            foreach ($asBloques as $ab) {
                if (in_array($ab, $bloques)) {
                    $key = $as['sala_asignada_id'] . '_' . $ab;
                    $approvedConflicts[$key] = true;
                }
            }
        }
    }

    // Paso 3: Puntuar cada candidata
    $matches = [];
    $reqEquip = isset($input['equipamiento_requerido']) ? $input['equipamiento_requerido'] : [];
    if (!is_array($reqEquip)) $reqEquip = [];

    foreach ($candidatas as $sala) {
        $conflictList = [];
        $isAvailable = true;

        // Verificar cada bloque solicitado
        foreach ($bloques as $bloqueId) {
            $key = $sala['id'] . '_' . $bloqueId;
            if (isset($occupiedSlots[$key]) || isset($approvedConflicts[$key])) {
                $isAvailable = false;
                $dia = isset($bloquesDias[$bloqueId]) ? $bloquesDias[$bloqueId] : '?';
                $conflictList[] = "Bloque $bloqueId ocupado (día $dia)";
            }
        }

        // Calcular puntaje
        $breakdown = scoreRoom($sala, $input, $isAvailable, $reqEquip);
        $totalScore = $breakdown['disponibilidad'] + $breakdown['capacidad'] + $breakdown['tipo'] +
                      $breakdown['mobiliario'] + $breakdown['equipamiento'] + $breakdown['preferida'];

        // Enriquecer sala con edificio
        $stmtE = $pdo->prepare("SELECT name FROM edificios WHERE id = ?");
        $stmtE->execute([$sala['edificio_id']]);
        $edif = $stmtE->fetch();
        $sala['edificio_name'] = $edif ? $edif['name'] : null;

        $matches[] = [
            'sala' => $sala,
            'score' => $totalScore,
            'available' => $isAvailable,
            'conflicts' => $conflictList,
            'breakdown' => $breakdown,
        ];
    }

    // Ordenar por score descendente
    usort($matches, function($a, $b) {
        return $b['score'] - $a['score'];
    });

    $topScore = !empty($matches) ? $matches[0]['score'] : 0;
    $topAvailable = !empty($matches) ? $matches[0]['available'] : false;
    $availableCount = 0;
    foreach ($matches as $m) {
        if ($m['available']) $availableCount++;
    }

    return [
        'matches' => $matches,
        'confianza' => $topScore,
        'auto_aprobable' => ($topScore >= 80 && $topAvailable),
        'total_candidates' => count($candidatas),
        'available_count' => $availableCount,
    ];
}

function scoreRoom($sala, $input, $isAvailable, $reqEquip) {
    // 1. Disponibilidad (40 pts)
    $disponibilidad = $isAvailable ? 40 : 0;

    // 2. Capacidad (20 pts) - penaliza sobrecapacidad
    $capacidad = 0;
    $requerida = isset($input['capacidad_requerida']) ? (int)$input['capacidad_requerida'] : 0;
    if ($requerida > 0 && $sala['capacidad'] >= $requerida) {
        $ratio = $requerida / $sala['capacidad'];
        $capacidad = (int)round(20 * $ratio);
    } elseif ($requerida <= 0) {
        $capacidad = 10;
    }

    // 3. Tipo de sala (15 pts)
    $tipo = 0;
    if (empty($input['tipo_sala'])) {
        $tipo = 8;
    } elseif ($sala['tipo'] === $input['tipo_sala']) {
        $tipo = 15;
    }

    // 4. Mobiliario (10 pts)
    $mobiliario = 0;
    if (empty($input['mobiliario_requerido'])) {
        $mobiliario = 5;
    } elseif ($sala['tipo_mobiliario'] === $input['mobiliario_requerido']) {
        $mobiliario = 10;
    }

    // 5. Equipamiento (10 pts)
    $equipamiento = 0;
    if (empty($reqEquip)) {
        $equipamiento = 5;
    } else {
        $salaEquip = is_array($sala['equipamiento']) ? $sala['equipamiento'] : [];
        $salaEquipLower = array_map('strtolower', $salaEquip);
        $reqEquipLower = array_map('strtolower', $reqEquip);
        $matched = count(array_intersect($reqEquipLower, $salaEquipLower));
        $equipamiento = (int)round(10 * $matched / count($reqEquipLower));
    }

    // 6. Sala preferida (5 pts)
    $preferida = 0;
    if (!empty($input['sala_preferida_id']) && $sala['id'] === $input['sala_preferida_id']) {
        $preferida = 5;
    }

    return [
        'disponibilidad' => $disponibilidad,
        'capacidad' => $capacidad,
        'tipo' => $tipo,
        'mobiliario' => $mobiliario,
        'equipamiento' => $equipamiento,
        'preferida' => $preferida,
    ];
}

// ==================== AUTO-PROCESAR ====================

function autoProcess($pdo, $input) {
    $pdo->beginTransaction();

    try {
        // 1. Ejecutar matching
        $matchResults = matchRooms($pdo, $input);

        // 2. Obtener info del usuario
        $stmt = $pdo->prepare("SELECT name, carrera_id FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if (!$user) {
            throw new Exception('Usuario no encontrado');
        }

        $id = generateUUID();
        $topMatch = !empty($matchResults['matches']) ? $matchResults['matches'][0] : null;
        $autoApprove = $matchResults['auto_aprobable'] && $topMatch && $topMatch['available'];

        $estado = $autoApprove ? 'auto_aprobada' : 'pendiente';
        $salaAsignada = $autoApprove ? $topMatch['sala']['id'] : null;

        $sql = "INSERT INTO solicitudes (
            id, solicitante, carrera_id, usuario_id, motivo, asignatura_code,
            sala_preferida_id, tipo_sala, mobiliario_requerido, capacidad_requerida,
            equipamiento_requerido, fecha_inicio, fecha_fin, bloques,
            recurrente, patron_recurrencia, estado,
            sala_asignada_id, procesada_por_agente, confianza_agente
        ) VALUES (
            :id, :solicitante, :carrera_id, :usuario_id, :motivo, :asignatura_code,
            :sala_preferida_id, :tipo_sala, :mobiliario_requerido, :capacidad_requerida,
            :equipamiento_requerido, :fecha_inicio, :fecha_fin, :bloques,
            :recurrente, :patron_recurrencia, :estado,
            :sala_asignada_id, :procesada_por_agente, :confianza_agente
        )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'solicitante' => $user['name'],
            'carrera_id' => isset($input['carrera_id']) && $input['carrera_id'] ? $input['carrera_id'] : ($user['carrera_id'] ? $user['carrera_id'] : ''),
            'usuario_id' => $_SESSION['user_id'],
            'motivo' => sanitizeString($input['motivo']),
            'asignatura_code' => isset($input['asignatura_code']) ? $input['asignatura_code'] : null,
            'sala_preferida_id' => isset($input['sala_preferida_id']) ? $input['sala_preferida_id'] : null,
            'tipo_sala' => isset($input['tipo_sala']) ? $input['tipo_sala'] : null,
            'mobiliario_requerido' => isset($input['mobiliario_requerido']) ? $input['mobiliario_requerido'] : null,
            'capacidad_requerida' => isset($input['capacidad_requerida']) ? (int)$input['capacidad_requerida'] : null,
            'equipamiento_requerido' => json_encode(isset($input['equipamiento_requerido']) ? $input['equipamiento_requerido'] : []),
            'fecha_inicio' => $input['fecha_inicio'],
            'fecha_fin' => $input['fecha_fin'],
            'bloques' => json_encode($input['bloques']),
            'recurrente' => !empty($input['recurrente']) ? 1 : 0,
            'patron_recurrencia' => isset($input['patron_recurrencia']) ? json_encode($input['patron_recurrencia']) : null,
            'estado' => $estado,
            'sala_asignada_id' => $salaAsignada,
            'procesada_por_agente' => 1,
            'confianza_agente' => $matchResults['confianza'],
        ]);

        // Si auto-aprobada, crear entradas en horarios
        if ($autoApprove) {
            createHorariosFromSolicitud($pdo, $id, $salaAsignada, $input);
        }

        $pdo->commit();

        // Leer solicitud completa
        $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
        $stmt->execute([$id]);
        $sol = $stmt->fetch();
        $sol = enrichSolicitud($pdo, $sol);

        jsonResponse([
            'success' => true,
            'data' => [
                'solicitud' => $sol,
                'match_results' => $matchResults,
            ]
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ==================== APROBAR / RECHAZAR ====================

function approveSolicitud($pdo, $input) {
    if (empty($input['id'])) {
        jsonResponse(['error' => 'ID de solicitud requerido'], 400);
    }
    if (empty($input['sala_asignada_id'])) {
        jsonResponse(['error' => 'Debe asignar una sala'], 400);
    }

    // Verificar que existe y está pendiente
    $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
    $stmt->execute([$input['id']]);
    $sol = $stmt->fetch();
    if (!$sol) {
        jsonResponse(['error' => 'Solicitud no encontrada'], 404);
    }
    if ($sol['estado'] !== 'pendiente') {
        jsonResponse(['error' => 'Solo se pueden aprobar solicitudes pendientes'], 400);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("UPDATE solicitudes SET
            estado = 'aprobada',
            sala_asignada_id = ?,
            revisado_por = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?");
        $stmt->execute([$input['sala_asignada_id'], $_SESSION['user_id'], $input['id']]);

        // Crear horarios
        $solData = [
            'bloques' => json_decode($sol['bloques'], true),
            'fecha_inicio' => $sol['fecha_inicio'],
            'fecha_fin' => $sol['fecha_fin'],
            'recurrente' => (bool)$sol['recurrente'],
            'asignatura_code' => $sol['asignatura_code'],
        ];
        createHorariosFromSolicitud($pdo, $input['id'], $input['sala_asignada_id'], $solData);

        $pdo->commit();

        $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
        $stmt->execute([$input['id']]);
        $sol = $stmt->fetch();
        $sol = enrichSolicitud($pdo, $sol);

        jsonResponse(['success' => true, 'data' => $sol, 'message' => 'Solicitud aprobada']);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function rejectSolicitud($pdo, $input) {
    if (empty($input['id'])) {
        jsonResponse(['error' => 'ID de solicitud requerido'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
    $stmt->execute([$input['id']]);
    $sol = $stmt->fetch();
    if (!$sol) {
        jsonResponse(['error' => 'Solicitud no encontrada'], 404);
    }
    if ($sol['estado'] !== 'pendiente') {
        jsonResponse(['error' => 'Solo se pueden rechazar solicitudes pendientes'], 400);
    }

    $stmt = $pdo->prepare("UPDATE solicitudes SET
        estado = 'rechazada',
        respuesta_gestor = ?,
        revisado_por = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?");
    $stmt->execute([
        isset($input['respuesta_gestor']) ? sanitizeString($input['respuesta_gestor']) : null,
        $_SESSION['user_id'],
        $input['id']
    ]);

    $stmt = $pdo->prepare("SELECT * FROM solicitudes WHERE id = ?");
    $stmt->execute([$input['id']]);
    $sol = $stmt->fetch();
    $sol = enrichSolicitud($pdo, $sol);

    jsonResponse(['success' => true, 'data' => $sol, 'message' => 'Solicitud rechazada']);
}

// ==================== HELPERS ====================

function createHorariosFromSolicitud($pdo, $solicitudId, $salaId, $input) {
    $bloques = isset($input['bloques']) ? $input['bloques'] : [];
    if (!is_array($bloques)) $bloques = json_decode($bloques, true);
    if (!is_array($bloques)) return;

    // Obtener temporada activa
    $stmt = $pdo->prepare("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
    $stmt->execute();
    $temp = $stmt->fetch();
    if (!$temp) return;

    // Obtener dia_semana para cada bloque
    if (empty($bloques)) return;
    $placeholders = implode(',', array_fill(0, count($bloques), '?'));
    $stmt = $pdo->prepare("SELECT id, dia_semana FROM bloques_horarios WHERE id IN ($placeholders)");
    $stmt->execute($bloques);
    $bloqueRows = $stmt->fetchAll();
    $bloqueDias = [];
    foreach ($bloqueRows as $br) {
        $bloqueDias[$br['id']] = (int)$br['dia_semana'];
    }

    $recurrencia = !empty($input['recurrente']) ? 'semanal' : 'unica';

    foreach ($bloques as $bloqueId) {
        if (!isset($bloqueDias[$bloqueId])) continue;

        $hId = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO horarios (
            id, tipo, sala_id, bloque_id, temporada_id, dia_semana,
            recurrencia, fecha_inicio, fecha_fin, observaciones, activo, created_by
        ) VALUES (
            ?, 'evento', ?, ?, ?, ?,
            ?, ?, ?, ?, 1, ?
        )");
        $stmt->execute([
            $hId,
            $salaId,
            $bloqueId,
            $temp['id'],
            $bloqueDias[$bloqueId],
            $recurrencia,
            $input['fecha_inicio'],
            $input['fecha_fin'],
            'Generado por solicitud ' . $solicitudId,
            $_SESSION['user_id']
        ]);
    }
}
?>
