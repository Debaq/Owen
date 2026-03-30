<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    jsonResponse(['error' => 'Método no permitido'], 405);
}

requireAuth();

$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';
$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : '';
$carreraId = null;

/**
 * Ejecuta query de forma segura; si la tabla no existe devuelve $default
 */
function safeQuery($pdo, $sql, $params = [], $default = false) {
    try {
        if (!empty($params)) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        } else {
            $stmt = $pdo->query($sql);
        }
        return $stmt;
    } catch (Exception $e) {
        return $default;
    }
}

function safeCount($pdo, $sql, $params = []) {
    $stmt = safeQuery($pdo, $sql, $params);
    if ($stmt === false) return 0;
    return (int)$stmt->fetchColumn();
}

// Si es dirección, obtener su carrera
if ($role === 'direccion') {
    $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $u = $stmt->fetch();
    $carreraId = $u ? $u['carrera_id'] : null;
}

$data = [];

// ── Temporada activa ──
$stmt = safeQuery($pdo, "SELECT id, nombre, tipo, fecha_inicio, fecha_fin FROM temporadas WHERE activa = 1 LIMIT 1");
$data['temporada_activa'] = ($stmt !== false) ? ($stmt->fetch() ?: null) : null;

// ── Conteos generales ──
$data['conteos'] = [
    'salas' => safeCount($pdo, "SELECT COUNT(*) FROM salas WHERE activo = 1"),
    'edificios' => safeCount($pdo, "SELECT COUNT(*) FROM edificios"),
    'docentes' => safeCount($pdo, "SELECT COUNT(*) FROM docentes WHERE activo = 1"),
    'carreras' => safeCount($pdo, "SELECT COUNT(*) FROM carreras"),
    'asignaturas' => safeCount($pdo, "SELECT COUNT(*) FROM asignaturas"),
    'horarios_activos' => 0,
];

if ($data['temporada_activa']) {
    $data['conteos']['horarios_activos'] = safeCount(
        $pdo,
        "SELECT COUNT(*) FROM horarios WHERE temporada_id = ? AND activo = 1",
        [$data['temporada_activa']['id']]
    );
} else {
    $data['conteos']['horarios_activos'] = safeCount($pdo, "SELECT COUNT(*) FROM horarios WHERE activo = 1");
}

// ── Solicitudes ──
$solicitudes = [
    'pendiente' => 0,
    'aprobada' => 0,
    'rechazada' => 0,
    'auto_aprobada' => 0,
    'total' => 0
];
$stmt = safeQuery($pdo, "SELECT estado, COUNT(*) as total FROM solicitudes GROUP BY estado");
if ($stmt !== false) {
    foreach ($stmt->fetchAll() as $r) {
        $solicitudes[$r['estado']] = (int)$r['total'];
        $solicitudes['total'] += (int)$r['total'];
    }
}
$data['solicitudes'] = $solicitudes;

// Solicitudes recientes (últimas 5)
$stmt = safeQuery($pdo,
    "SELECT s.id, s.motivo, s.estado, s.fecha_inicio, s.created_at,
            c.name as carrera_nombre, u.name as solicitante_nombre
     FROM solicitudes s
     LEFT JOIN carreras c ON s.carrera_id = c.id
     LEFT JOIN users u ON s.usuario_id = u.id
     ORDER BY s.created_at DESC
     LIMIT 5"
);
$data['solicitudes_recientes'] = ($stmt !== false) ? $stmt->fetchAll() : [];

// ── Observaciones ──
$observaciones = [
    'nuevo' => 0,
    'revision' => 0,
    'en_proceso' => 0,
    'resuelto' => 0,
    'cerrado' => 0,
    'total' => 0
];
$stmt = safeQuery($pdo, "SELECT estado, COUNT(*) as total FROM observaciones GROUP BY estado");
if ($stmt !== false) {
    foreach ($stmt->fetchAll() as $r) {
        $observaciones[$r['estado']] = (int)$r['total'];
        $observaciones['total'] += (int)$r['total'];
    }
}
$data['observaciones'] = $observaciones;

// ── Horarios recientes (últimos 5 creados/modificados) ──
$stmt = safeQuery($pdo,
    "SELECT h.id, h.dia_semana, h.tipo,
            sa.name as sala_nombre, sa.code as sala_codigo,
            a.name as asignatura_nombre,
            d.name as docente_nombre,
            bh.hora_inicio, bh.hora_fin,
            h.created_at
     FROM horarios h
     LEFT JOIN salas sa ON h.sala_id = sa.id
     LEFT JOIN asignaturas a ON h.asignatura_id = a.id
     LEFT JOIN docentes d ON h.docente_id = d.id
     LEFT JOIN bloques_horarios bh ON h.bloque_id = bh.id
     WHERE h.activo = 1
     ORDER BY h.created_at DESC
     LIMIT 5"
);
$data['horarios_recientes'] = ($stmt !== false) ? $stmt->fetchAll() : [];

// ── Salas por tipo ──
$stmt = safeQuery($pdo, "SELECT tipo, COUNT(*) as total FROM salas WHERE activo = 1 GROUP BY tipo ORDER BY total DESC");
$data['salas_por_tipo'] = ($stmt !== false) ? $stmt->fetchAll() : [];

// ── Ocupación de salas (resumen del día actual) ──
$diaSemana = (int)date('N'); // 1=lunes ... 7=domingo
$data['dia_actual'] = $diaSemana;

if ($diaSemana <= 6) {
    $data['ocupacion_hoy'] = [
        'salas_ocupadas' => safeCount(
            $pdo,
            "SELECT COUNT(DISTINCT h.sala_id)
             FROM horarios h
             JOIN bloques_horarios bh ON h.bloque_id = bh.id
             WHERE h.activo = 1 AND bh.dia_semana = ?",
            [$diaSemana]
        ),
        'salas_totales' => $data['conteos']['salas'],
    ];
} else {
    $data['ocupacion_hoy'] = [
        'salas_ocupadas' => 0,
        'salas_totales' => $data['conteos']['salas'],
    ];
}

// ── Versionado: último commit/branch activo ──
$stmt = safeQuery($pdo,
    "SELECT hc.id, hc.mensaje, hc.tipo, hc.created_at, hb.nombre as branch_nombre
     FROM horario_commits hc
     LEFT JOIN horario_branches hb ON hc.branch_id = hb.id
     ORDER BY hc.created_at DESC
     LIMIT 1"
);
$data['ultimo_commit'] = ($stmt !== false) ? ($stmt->fetch() ?: null) : null;

$data['branches_activos'] = safeCount($pdo, "SELECT COUNT(*) FROM horario_branches WHERE estado IN ('borrador', 'revision')");

// ── Info específica para dirección ──
if ($role === 'direccion' && $carreraId) {
    $stmt = safeQuery($pdo, "SELECT name FROM carreras WHERE id = ?", [$carreraId]);
    $carr = ($stmt !== false) ? $stmt->fetch() : null;
    $data['mi_carrera'] = $carr ? $carr['name'] : null;

    $misSol = ['pendiente' => 0, 'aprobada' => 0, 'rechazada' => 0, 'auto_aprobada' => 0, 'total' => 0];
    $stmt = safeQuery($pdo, "SELECT estado, COUNT(*) as total FROM solicitudes WHERE usuario_id = ? GROUP BY estado", [$userId]);
    if ($stmt !== false) {
        foreach ($stmt->fetchAll() as $r) {
            $misSol[$r['estado']] = (int)$r['total'];
            $misSol['total'] += (int)$r['total'];
        }
    }
    $data['mis_solicitudes'] = $misSol;

    $data['mi_carrera_niveles'] = safeCount($pdo, "SELECT COUNT(*) FROM niveles WHERE carrera_id = ?", [$carreraId]);
    $data['mi_carrera_asignaturas'] = safeCount($pdo, "SELECT COUNT(*) FROM asignaturas WHERE carrera_id = ?", [$carreraId]);
}

$data['role'] = $role;
$data['user_name'] = isset($_SESSION['user_name']) ? $_SESSION['user_name'] : '';

jsonResponse($data);
