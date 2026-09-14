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

// =====================================================
// GET handlers
// =====================================================

function handleGet($pdo) {
    requireRoles(['gestor', 'direccion']);

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'status':
            getStatus($pdo);
            break;
        case 'conflicts':
            getConflicts($pdo);
            break;
        case 'preview':
            getPreview($pdo);
            break;
        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}

function getStatus($pdo) {
    $carreraId = isset($_GET['carrera_id']) ? $_GET['carrera_id'] : '';
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : '';

    if (empty($carreraId) || empty($temporadaId)) {
        jsonResponse(['error' => 'carrera_id y temporada_id son requeridos'], 400);
    }

    $carreraId = resolveCarrera($pdo, $carreraId);

    // Total estudiantes de la carrera
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM estudiantes WHERE carrera_id = ?");
    $stmt->execute([$carreraId]);
    $totalEstudiantes = (int)$stmt->fetch()['total'];

    // Total inscritos (estudiantes únicos con inscripción en asignaturas de la carrera)
    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT i.estudiante_id) as total
         FROM inscripciones i
         JOIN asignaturas a ON i.asignatura_id = a.id
         WHERE a.carrera_id = ? AND i.temporada_id = ?"
    );
    $stmt->execute([$carreraId, $temporadaId]);
    $totalInscritos = (int)$stmt->fetch()['total'];

    // Total asignados a secciones
    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT s.estudiante_id) as total
         FROM asignaciones_seccion s
         JOIN asignaturas a ON s.asignatura_id = a.id
         WHERE a.carrera_id = ? AND s.temporada_id = ?"
    );
    $stmt->execute([$carreraId, $temporadaId]);
    $totalAsignados = (int)$stmt->fetch()['total'];

    // Asignaturas con secciones
    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT a.id) as total
         FROM asignaturas a
         JOIN secciones sec ON sec.nivel_id = a.nivel_id
         WHERE a.carrera_id = ?"
    );
    $stmt->execute([$carreraId]);
    $asigConSecciones = (int)$stmt->fetch()['total'];

    // Asignaturas con sorting hecho
    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT s.asignatura_id) as total
         FROM asignaciones_seccion s
         JOIN asignaturas a ON s.asignatura_id = a.id
         WHERE a.carrera_id = ? AND s.temporada_id = ?"
    );
    $stmt->execute([$carreraId, $temporadaId]);
    $asigSorteadas = (int)$stmt->fetch()['total'];

    // Conflictos
    $conflictos = detectConflicts($pdo, $carreraId, $temporadaId);

    jsonResponse(['success' => true, 'data' => [
        'total_estudiantes' => $totalEstudiantes,
        'total_inscritos' => $totalInscritos,
        'total_asignados' => $totalAsignados,
        'total_conflictos' => count($conflictos),
        'asignaturas_con_secciones' => $asigConSecciones,
        'asignaturas_sorteadas' => $asigSorteadas,
    ]]);
}

function getConflicts($pdo) {
    $carreraId = isset($_GET['carrera_id']) ? $_GET['carrera_id'] : '';
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : '';

    if (empty($carreraId) || empty($temporadaId)) {
        jsonResponse(['error' => 'carrera_id y temporada_id son requeridos'], 400);
    }

    $carreraId = resolveCarrera($pdo, $carreraId);
    $conflictos = detectConflicts($pdo, $carreraId, $temporadaId);

    jsonResponse(['success' => true, 'data' => $conflictos]);
}

function getPreview($pdo) {
    $asignaturaId = isset($_GET['asignatura_id']) ? $_GET['asignatura_id'] : '';
    $temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : '';

    if (empty($asignaturaId) || empty($temporadaId)) {
        jsonResponse(['error' => 'asignatura_id y temporada_id son requeridos'], 400);
    }

    $stmt = $pdo->prepare(
        "SELECT s.*, e.nombre as estudiante_nombre, e.rut as estudiante_rut,
                sec.nombre as seccion_nombre, a.name as asignatura_nombre, a.code as asignatura_code
         FROM asignaciones_seccion s
         JOIN estudiantes e ON s.estudiante_id = e.id
         JOIN secciones sec ON s.seccion_id = sec.id
         JOIN asignaturas a ON s.asignatura_id = a.id
         WHERE s.asignatura_id = ? AND s.temporada_id = ?
         ORDER BY sec.nombre, e.nombre"
    );
    $stmt->execute([$asignaturaId, $temporadaId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['manual'] = (bool)(int)$row['manual'];
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

// =====================================================
// POST handlers
// =====================================================

function handlePost($pdo) {
    requireRoles(['gestor', 'direccion']);

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'auto_sort':
            autoSort($pdo);
            break;
        case 'move':
            moveEstudiante($pdo);
            break;
        case 'reset':
            resetSort($pdo);
            break;
        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}

function autoSort($pdo) {
    $data = getJsonInput();

    $carreraId = isset($data['carrera_id']) ? $data['carrera_id'] : '';
    $temporadaId = isset($data['temporada_id']) ? $data['temporada_id'] : '';
    $nivelId = isset($data['nivel_id']) ? $data['nivel_id'] : null;

    if (empty($carreraId) || empty($temporadaId)) {
        jsonResponse(['error' => 'carrera_id y temporada_id son requeridos'], 400);
    }

    $carreraId = resolveCarrera($pdo, $carreraId);

    // 1. Obtener asignaturas con secciones (de la carrera o nivel específico)
    $asigConSecciones = getAsignaturasConSecciones($pdo, $carreraId, $nivelId);

    if (empty($asigConSecciones)) {
        jsonResponse(['success' => true, 'data' => [
            'asignaciones_creadas' => 0,
            'conflictos_residuales' => [],
            'message' => 'No hay asignaturas con secciones para sortear'
        ]]);
        return;
    }

    // 2. Obtener mapa de horarios de secciones (para detección de conflictos)
    $seccionHorarios = getSeccionHorarios($pdo, $temporadaId);

    // 3. Obtener inscripciones por estudiante
    $estudianteInscs = getEstudianteInscripciones($pdo, $carreraId, $temporadaId);

    // 4. Obtener asignaciones manuales existentes (a preservar)
    $manuales = getAsignacionesManuales($pdo, $carreraId, $temporadaId);

    // 5. Eliminar asignaciones automáticas previas
    $deleteStmt = $pdo->prepare(
        "DELETE FROM asignaciones_seccion
         WHERE temporada_id = ? AND manual = 0
         AND asignatura_id IN (SELECT id FROM asignaturas WHERE carrera_id = ?)"
    );
    if ($nivelId) {
        $deleteStmt = $pdo->prepare(
            "DELETE FROM asignaciones_seccion
             WHERE temporada_id = ? AND manual = 0
             AND asignatura_id IN (SELECT id FROM asignaturas WHERE carrera_id = ? AND nivel_id = ?)"
        );
        $deleteStmt->execute([$temporadaId, $carreraId, $nivelId]);
    } else {
        $deleteStmt->execute([$temporadaId, $carreraId]);
    }

    // 6. Greedy sort
    $insertStmt = $pdo->prepare(
        "INSERT OR IGNORE INTO asignaciones_seccion
         (id, estudiante_id, seccion_id, asignatura_id, temporada_id, manual)
         VALUES (?, ?, ?, ?, ?, 0)"
    );

    $asignaciones = []; // [estudiante_id][asignatura_id] => seccion_id
    $seccionCounts = []; // [seccion_id] => count

    // Inicializar con manuales
    foreach ($manuales as $m) {
        $asignaciones[$m['estudiante_id']][$m['asignatura_id']] = $m['seccion_id'];
        if (!isset($seccionCounts[$m['seccion_id']])) {
            $seccionCounts[$m['seccion_id']] = 0;
        }
        $seccionCounts[$m['seccion_id']]++;
    }

    $totalCreadas = 0;

    // Ordenar asignaturas: menos secciones primero (más restringidas)
    usort($asigConSecciones, function ($a, $b) {
        return count($a['secciones']) - count($b['secciones']);
    });

    $pdo->beginTransaction();
    try {
        foreach ($asigConSecciones as $asig) {
            $asigId = $asig['id'];
            $secciones = $asig['secciones'];

            // Inicializar contadores de secciones
            foreach ($secciones as $sec) {
                if (!isset($seccionCounts[$sec['id']])) {
                    $seccionCounts[$sec['id']] = 0;
                }
            }

            // Obtener estudiantes inscritos en esta asignatura
            $stmt = $pdo->prepare(
                "SELECT DISTINCT i.estudiante_id
                 FROM inscripciones i
                 WHERE i.asignatura_id = ? AND i.temporada_id = ?"
            );
            $stmt->execute([$asigId, $temporadaId]);
            $inscritos = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($inscritos as $estId) {
                // Ya tiene asignación manual? Saltar
                if (isset($asignaciones[$estId][$asigId])) {
                    continue;
                }

                // Evaluar cada sección posible
                $mejorSeccion = null;
                $menorConflictos = PHP_INT_MAX;
                $menorAlumnos = PHP_INT_MAX;

                foreach ($secciones as $sec) {
                    $numConflictos = contarConflictos(
                        $estId, $sec['id'], $asignaciones, $seccionHorarios
                    );
                    $numAlumnos = isset($seccionCounts[$sec['id']]) ? $seccionCounts[$sec['id']] : 0;

                    if ($numConflictos < $menorConflictos ||
                        ($numConflictos === $menorConflictos && $numAlumnos < $menorAlumnos)) {
                        $mejorSeccion = $sec['id'];
                        $menorConflictos = $numConflictos;
                        $menorAlumnos = $numAlumnos;
                    }
                }

                if ($mejorSeccion) {
                    $id = generateUUID();
                    $insertStmt->execute([$id, $estId, $mejorSeccion, $asigId, $temporadaId]);
                    $asignaciones[$estId][$asigId] = $mejorSeccion;
                    $seccionCounts[$mejorSeccion]++;
                    $totalCreadas++;
                }
            }
        }

        // 7. Actualizar conteos en tabla secciones
        updateSeccionCounts($pdo, $asigConSecciones, $seccionCounts);

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        securityLog('DB_ERROR', 'sorting auto_sort: ' . $e->getMessage());
        jsonResponse(['error' => 'Error en auto-sorting'], 500);
        return;
    }

    // 8. Detectar conflictos residuales
    $conflictos = detectConflicts($pdo, $carreraId, $temporadaId);

    jsonResponse(['success' => true, 'data' => [
        'asignaciones_creadas' => $totalCreadas,
        'conflictos_residuales' => $conflictos,
    ]]);
}

function moveEstudiante($pdo) {
    $data = getJsonInput();

    $required = ['estudiante_id', 'asignatura_id', 'temporada_id', 'nueva_seccion_id'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['error' => "Campo requerido: {$field}"], 400);
        }
    }

    // Verificar permisos
    $stmt = $pdo->prepare("SELECT carrera_id FROM asignaturas WHERE id = ?");
    $stmt->execute([$data['asignatura_id']]);
    $asig = $stmt->fetch();
    if (!$asig) {
        jsonResponse(['error' => 'Asignatura no encontrada'], 404);
    }
    if (!isOwnCarrera($pdo, $asig['carrera_id'])) {
        jsonResponse(['error' => 'No tiene permiso'], 403);
    }

    // Verificar que la sección existe
    $stmt = $pdo->prepare("SELECT id FROM secciones WHERE id = ?");
    $stmt->execute([$data['nueva_seccion_id']]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Sección no encontrada'], 404);
    }

    // Upsert: actualizar si existe, crear si no
    $stmt = $pdo->prepare(
        "SELECT id FROM asignaciones_seccion
         WHERE estudiante_id = ? AND asignatura_id = ? AND temporada_id = ?"
    );
    $stmt->execute([$data['estudiante_id'], $data['asignatura_id'], $data['temporada_id']]);
    $existing = $stmt->fetch();

    try {
        if ($existing) {
            $stmt = $pdo->prepare(
                "UPDATE asignaciones_seccion SET seccion_id = ?, manual = 1 WHERE id = ?"
            );
            $stmt->execute([$data['nueva_seccion_id'], $existing['id']]);
        } else {
            $id = generateUUID();
            $stmt = $pdo->prepare(
                "INSERT INTO asignaciones_seccion
                 (id, estudiante_id, seccion_id, asignatura_id, temporada_id, manual)
                 VALUES (?, ?, ?, ?, ?, 1)"
            );
            $stmt->execute([
                $id, $data['estudiante_id'], $data['nueva_seccion_id'],
                $data['asignatura_id'], $data['temporada_id']
            ]);
        }

        jsonResponse(['success' => true, 'message' => 'Estudiante movido']);
    } catch (PDOException $e) {
        securityLog('DB_ERROR', 'sorting move: ' . $e->getMessage());
        jsonResponse(['error' => 'Error al mover estudiante'], 500);
    }
}

function resetSort($pdo) {
    $data = getJsonInput();

    $carreraId = isset($data['carrera_id']) ? $data['carrera_id'] : '';
    $temporadaId = isset($data['temporada_id']) ? $data['temporada_id'] : '';
    $preserveManual = isset($data['preserve_manual']) ? (bool)$data['preserve_manual'] : false;

    if (empty($carreraId) || empty($temporadaId)) {
        jsonResponse(['error' => 'carrera_id y temporada_id son requeridos'], 400);
    }

    $carreraId = resolveCarrera($pdo, $carreraId);

    $sql = "DELETE FROM asignaciones_seccion
            WHERE temporada_id = ?
            AND asignatura_id IN (SELECT id FROM asignaturas WHERE carrera_id = ?)";
    $params = [$temporadaId, $carreraId];

    if ($preserveManual) {
        $sql .= " AND manual = 0";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $deleted = $stmt->rowCount();

    jsonResponse(['success' => true, 'data' => ['deleted' => $deleted], 'message' => "Eliminadas: {$deleted}"]);
}

// =====================================================
// Funciones auxiliares
// =====================================================

/**
 * Resuelve carrera_id para rol dirección (usa la carrera del usuario)
 */
function resolveCarrera($pdo, $carreraId) {
    if ($_SESSION['user_role'] === 'direccion') {
        $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $u = $stmt->fetch();
        if ($u && $u['carrera_id']) {
            return $u['carrera_id'];
        }
    }
    if (!isOwnCarrera($pdo, $carreraId)) {
        jsonResponse(['error' => 'No tiene permiso para esta carrera'], 403);
    }
    return $carreraId;
}

/**
 * Obtiene asignaturas que tienen secciones en su nivel
 */
function getAsignaturasConSecciones($pdo, $carreraId, $nivelId = null) {
    $sql = "SELECT a.id, a.code, a.name, a.nivel_id
            FROM asignaturas a
            WHERE a.carrera_id = ?
            AND EXISTS (SELECT 1 FROM secciones s WHERE s.nivel_id = a.nivel_id)";
    $params = [$carreraId];

    if ($nivelId) {
        $sql .= " AND a.nivel_id = ?";
        $params[] = $nivelId;
    }

    $sql .= " ORDER BY a.nivel_id, a.code";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $asignaturas = $stmt->fetchAll();

    // Cargar secciones por nivel
    $seccionesPorNivel = [];
    foreach ($asignaturas as $asig) {
        $nid = $asig['nivel_id'];
        if (!isset($seccionesPorNivel[$nid])) {
            $s = $pdo->prepare("SELECT id, nombre, alumnos FROM secciones WHERE nivel_id = ? ORDER BY nombre");
            $s->execute([$nid]);
            $seccionesPorNivel[$nid] = $s->fetchAll();
        }
        $asig['secciones'] = $seccionesPorNivel[$nid];
    }

    // Re-asignar secciones (PHP 7.4 no tiene spread en foreach by ref con associative)
    $result = [];
    foreach ($asignaturas as $asig) {
        $asig['secciones'] = $seccionesPorNivel[$asig['nivel_id']];
        $result[] = $asig;
    }

    return $result;
}

/**
 * Obtiene mapa de horarios: seccion_id => [(dia_semana, bloque_id), ...]
 * Busca en horario_asignaciones (versionado) y horarios (legacy)
 */
function getSeccionHorarios($pdo, $temporadaId) {
    $horarios = [];

    // Intentar via versionado: sesiones -> horario_asignaciones del branch principal
    $stmt = $pdo->prepare(
        "SELECT ha.dia_semana, ha.bloque_id, ses.seccion_id
         FROM horario_asignaciones ha
         JOIN sesiones ses ON ha.sesion_id = ses.id
         JOIN horario_commits hc ON ha.commit_id = hc.id
         JOIN horario_branches hb ON hc.branch_id = hb.id
         WHERE hb.temporada_id = ? AND hb.es_principal = 1
         AND ses.seccion_id IS NOT NULL
         AND ha.dia_semana IS NOT NULL AND ha.bloque_id IS NOT NULL"
    );
    $stmt->execute([$temporadaId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as $row) {
        $secId = $row['seccion_id'];
        if (!isset($horarios[$secId])) {
            $horarios[$secId] = [];
        }
        $horarios[$secId][] = [
            'dia_semana' => (int)$row['dia_semana'],
            'bloque_id' => $row['bloque_id']
        ];
    }

    // Si no hay datos del versionado, intentar con tabla horarios legacy
    if (empty($horarios)) {
        $stmt = $pdo->prepare(
            "SELECT h.dia_semana, h.bloque_id, h.asignatura_id, h.nivel_id
             FROM horarios h
             WHERE h.temporada_id = ? AND h.activo = 1"
        );
        $stmt->execute([$temporadaId]);
        // No hay seccion_id directo en horarios, así que no podemos hacer sorting horario
        // En este caso devolvemos vacío y el sort solo balancea por cantidad
    }

    return $horarios;
}

/**
 * Obtiene inscripciones agrupadas por estudiante
 */
function getEstudianteInscripciones($pdo, $carreraId, $temporadaId) {
    $stmt = $pdo->prepare(
        "SELECT i.estudiante_id, i.asignatura_id
         FROM inscripciones i
         JOIN asignaturas a ON i.asignatura_id = a.id
         WHERE a.carrera_id = ? AND i.temporada_id = ?"
    );
    $stmt->execute([$carreraId, $temporadaId]);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $result[$row['estudiante_id']][] = $row['asignatura_id'];
    }
    return $result;
}

/**
 * Obtiene asignaciones marcadas como manuales
 */
function getAsignacionesManuales($pdo, $carreraId, $temporadaId) {
    $stmt = $pdo->prepare(
        "SELECT s.estudiante_id, s.asignatura_id, s.seccion_id
         FROM asignaciones_seccion s
         JOIN asignaturas a ON s.asignatura_id = a.id
         WHERE a.carrera_id = ? AND s.temporada_id = ? AND s.manual = 1"
    );
    $stmt->execute([$carreraId, $temporadaId]);
    return $stmt->fetchAll();
}

/**
 * Cuenta conflictos horarios si el estudiante fuera asignado a una sección
 */
function contarConflictos($estudianteId, $seccionId, $asignaciones, $seccionHorarios) {
    // Si no hay datos de horarios, no podemos detectar conflictos
    if (empty($seccionHorarios)) {
        return 0;
    }

    // Bloques que ocupa esta sección
    $bloquesPropuestos = isset($seccionHorarios[$seccionId]) ? $seccionHorarios[$seccionId] : [];
    if (empty($bloquesPropuestos)) {
        return 0;
    }

    $conflictos = 0;

    // Verificar contra secciones ya asignadas del estudiante
    if (isset($asignaciones[$estudianteId])) {
        foreach ($asignaciones[$estudianteId] as $asigId => $secId) {
            $bloquesExistentes = isset($seccionHorarios[$secId]) ? $seccionHorarios[$secId] : [];
            foreach ($bloquesPropuestos as $bp) {
                foreach ($bloquesExistentes as $be) {
                    if ($bp['dia_semana'] === $be['dia_semana'] && $bp['bloque_id'] === $be['bloque_id']) {
                        $conflictos++;
                    }
                }
            }
        }
    }

    return $conflictos;
}

/**
 * Detecta conflictos horarios entre las asignaciones de sección actuales
 */
function detectConflicts($pdo, $carreraId, $temporadaId) {
    $seccionHorarios = getSeccionHorarios($pdo, $temporadaId);

    if (empty($seccionHorarios)) {
        return []; // Sin horarios no se pueden detectar conflictos
    }

    // Obtener todas las asignaciones
    $stmt = $pdo->prepare(
        "SELECT s.estudiante_id, s.seccion_id, s.asignatura_id,
                e.nombre as estudiante_nombre, e.rut as estudiante_rut,
                a.code as asignatura_code, a.name as asignatura_name,
                sec.nombre as seccion_nombre
         FROM asignaciones_seccion s
         JOIN estudiantes e ON s.estudiante_id = e.id
         JOIN asignaturas a ON s.asignatura_id = a.id
         JOIN secciones sec ON s.seccion_id = sec.id
         WHERE a.carrera_id = ? AND s.temporada_id = ?
         ORDER BY s.estudiante_id"
    );
    $stmt->execute([$carreraId, $temporadaId]);
    $rows = $stmt->fetchAll();

    // Agrupar por estudiante
    $porEstudiante = [];
    foreach ($rows as $row) {
        $porEstudiante[$row['estudiante_id']][] = $row;
    }

    $conflictos = [];

    foreach ($porEstudiante as $estId => $asigs) {
        $estConflictos = [];

        for ($i = 0; $i < count($asigs); $i++) {
            $bloquesA = isset($seccionHorarios[$asigs[$i]['seccion_id']])
                ? $seccionHorarios[$asigs[$i]['seccion_id']] : [];

            for ($j = $i + 1; $j < count($asigs); $j++) {
                $bloquesB = isset($seccionHorarios[$asigs[$j]['seccion_id']])
                    ? $seccionHorarios[$asigs[$j]['seccion_id']] : [];

                foreach ($bloquesA as $ba) {
                    foreach ($bloquesB as $bb) {
                        if ($ba['dia_semana'] === $bb['dia_semana'] && $ba['bloque_id'] === $bb['bloque_id']) {
                            $estConflictos[] = [
                                'asignatura_a' => [
                                    'id' => $asigs[$i]['asignatura_id'],
                                    'code' => $asigs[$i]['asignatura_code'],
                                    'name' => $asigs[$i]['asignatura_name'],
                                    'seccion' => $asigs[$i]['seccion_nombre'],
                                ],
                                'asignatura_b' => [
                                    'id' => $asigs[$j]['asignatura_id'],
                                    'code' => $asigs[$j]['asignatura_code'],
                                    'name' => $asigs[$j]['asignatura_name'],
                                    'seccion' => $asigs[$j]['seccion_nombre'],
                                ],
                                'bloque' => [
                                    'dia_semana' => $ba['dia_semana'],
                                    'bloque_id' => $ba['bloque_id'],
                                    'hora' => '',
                                ],
                            ];
                        }
                    }
                }
            }
        }

        if (!empty($estConflictos)) {
            $conflictos[] = [
                'estudiante_id' => $estId,
                'estudiante_nombre' => $asigs[0]['estudiante_nombre'],
                'estudiante_rut' => $asigs[0]['estudiante_rut'],
                'conflictos' => $estConflictos,
            ];
        }
    }

    return $conflictos;
}

/**
 * Actualiza el conteo de alumnos en secciones después del sorting
 */
function updateSeccionCounts($pdo, $asigConSecciones, $seccionCounts) {
    $updateStmt = $pdo->prepare("UPDATE secciones SET alumnos = ? WHERE id = ?");
    $updated = [];

    foreach ($asigConSecciones as $asig) {
        foreach ($asig['secciones'] as $sec) {
            if (!isset($updated[$sec['id']])) {
                $count = isset($seccionCounts[$sec['id']]) ? $seccionCounts[$sec['id']] : 0;
                $updateStmt->execute([$count, $sec['id']]);
                $updated[$sec['id']] = true;
            }
        }
    }
}
