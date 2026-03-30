<?php
// backend/api/solver-export.php
// Exporta todos los datos de una temporada como JSON para el solver
// Una query por entidad, cero N+1
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Metodo no permitido'], 405);
}

requireAuthOrToken();

$temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;

if (empty($temporadaId)) {
    // Intentar usar la temporada activa
    $stmt = $pdo->query("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
    $row = $stmt->fetch();
    if ($row) {
        $temporadaId = $row['id'];
    } else {
        jsonResponse(['error' => 'temporada_id requerido o debe haber una temporada activa'], 400);
    }
}

// Verificar que la temporada existe
$stmt = $pdo->prepare("SELECT * FROM temporadas WHERE id = ?");
$stmt->execute([$temporadaId]);
$temporada = $stmt->fetch();

if (!$temporada) {
    jsonResponse(['error' => 'Temporada no encontrada'], 404);
}

$temporada['activa'] = (bool)$temporada['activa'];

// --- Bloques horarios (del sistema default o todos) ---
$bloques = $pdo->query(
    "SELECT bh.*, sb.nombre as sistema_nombre
     FROM bloques_horarios bh
     JOIN sistemas_bloques sb ON bh.sistema_bloque_id = sb.id
     WHERE bh.activo = 1
     ORDER BY bh.dia_semana, bh.orden"
)->fetchAll();

foreach ($bloques as &$b) {
    $b['dia_semana'] = (int)$b['dia_semana'];
    $b['orden'] = (int)$b['orden'];
    $b['activo'] = (bool)$b['activo'];
}

// --- Edificios ---
$edificios = $pdo->query("SELECT * FROM edificios ORDER BY name")->fetchAll();
foreach ($edificios as &$e) {
    $e['lat'] = (float)$e['lat'];
    $e['lng'] = (float)$e['lng'];
    $e['pisos'] = (int)$e['pisos'];
}

// --- Distancias entre edificios ---
$distancias = $pdo->query(
    "SELECT edificio_origen_id, edificio_destino_id, minutos, techado FROM distancias_edificios"
)->fetchAll();

foreach ($distancias as &$d) {
    $d['minutos'] = (int)$d['minutos'];
    $d['techado'] = (bool)$d['techado'];
}

// --- Salas ---
$salas = $pdo->query(
    "SELECT s.*, e.name as edificio_nombre, e.code as edificio_code
     FROM salas s
     JOIN edificios e ON s.edificio_id = e.id
     WHERE s.activo = 1
     ORDER BY e.name, s.code"
)->fetchAll();

foreach ($salas as &$s) {
    $s['piso'] = (int)$s['piso'];
    $s['capacidad'] = (int)$s['capacidad'];
    $s['activo'] = (bool)$s['activo'];
    $s['lat'] = $s['lat'] !== null ? (float)$s['lat'] : null;
    $s['lng'] = $s['lng'] !== null ? (float)$s['lng'] : null;
    $s['mobiliario'] = $s['mobiliario'] ? json_decode($s['mobiliario']) : [];
    $s['equipamiento'] = $s['equipamiento'] ? json_decode($s['equipamiento']) : [];
    $s['fotos'] = $s['fotos'] ? json_decode($s['fotos']) : [];
}

// --- Carreras ---
$carreras = $pdo->query("SELECT id, name, code, director_id, gestor_id FROM carreras ORDER BY name")->fetchAll();

// --- Niveles ---
$niveles = $pdo->query(
    "SELECT n.*, c.name as carrera_nombre
     FROM niveles n
     JOIN carreras c ON n.carrera_id = c.id
     ORDER BY c.name, n.orden"
)->fetchAll();

foreach ($niveles as &$n) {
    $n['orden'] = (int)$n['orden'];
    $n['alumnos_estimados'] = (int)$n['alumnos_estimados'];
}

// --- Asignaturas ---
$asignaturas = $pdo->query(
    "SELECT a.*, n.nombre as nivel_nombre, c.name as carrera_nombre
     FROM asignaturas a
     JOIN niveles n ON a.nivel_id = n.id
     JOIN carreras c ON a.carrera_id = c.id
     ORDER BY c.name, n.orden, a.name"
)->fetchAll();

foreach ($asignaturas as &$a) {
    $a['horas_teoria'] = (int)$a['horas_teoria'];
    $a['horas_practica'] = (int)$a['horas_practica'];
    $a['horas_autonomas'] = (int)$a['horas_autonomas'];
    $a['horas_semanales'] = (int)$a['horas_semanales'];
    $a['creditos'] = (int)$a['creditos'];
    $a['duracion_semanas'] = (int)$a['duracion_semanas'];
    $a['semana_inicio'] = (int)$a['semana_inicio'];
    $a['requiere_laboratorio'] = (bool)$a['requiere_laboratorio'];
    $a['equipamiento_requerido'] = $a['equipamiento_requerido'] ? json_decode($a['equipamiento_requerido']) : [];
}

// --- Sesiones ---
$stmt = $pdo->prepare(
    "SELECT s.*, a.code as asignatura_code, a.name as asignatura_nombre,
            sec.nombre as seccion_nombre, d.name as docente_nombre
     FROM sesiones s
     JOIN asignaturas a ON s.asignatura_id = a.id
     LEFT JOIN secciones sec ON s.seccion_id = sec.id
     LEFT JOIN docentes d ON s.docente_id = d.id
     WHERE s.temporada_id = ? OR s.temporada_id IS NULL
     ORDER BY a.code, s.tipo, s.etiqueta"
);
$stmt->execute([$temporadaId]);
$sesiones = $stmt->fetchAll();

foreach ($sesiones as &$s) {
    $s['alumnos_estimados'] = (int)$s['alumnos_estimados'];
    $s['bloques_requeridos'] = (int)$s['bloques_requeridos'];
    $s['fijada'] = (bool)$s['fijada'];
}

// --- Secciones ---
$secciones = $pdo->query(
    "SELECT s.*, n.nombre as nivel_nombre FROM secciones s
     JOIN niveles n ON s.nivel_id = n.id ORDER BY n.nombre, s.nombre"
)->fetchAll();

foreach ($secciones as &$sec) {
    $sec['alumnos'] = (int)$sec['alumnos'];
}

// --- Docentes activos ---
$docentes = $pdo->query(
    "SELECT id, rut, name, email, carreras, unidad_id, activo
     FROM docentes WHERE activo = 1 ORDER BY name"
)->fetchAll();

foreach ($docentes as &$doc) {
    $doc['activo'] = (bool)$doc['activo'];
    $doc['carreras'] = $doc['carreras'] ? json_decode($doc['carreras']) : [];
}

// --- Docente-Asignaturas ---
$docenteAsignaturas = $pdo->query(
    "SELECT da.*, d.name as docente_nombre, a.code as asignatura_code
     FROM docente_asignaturas da
     JOIN docentes d ON da.docente_id = d.id
     JOIN asignaturas a ON da.asignatura_id = a.id
     WHERE d.activo = 1"
)->fetchAll();

// --- Disponibilidad docente ---
$stmt = $pdo->prepare(
    "SELECT dd.*, d.name as docente_nombre
     FROM docente_disponibilidad dd
     JOIN docentes d ON dd.docente_id = d.id
     WHERE d.activo = 1 AND (dd.temporada_id = ? OR dd.temporada_id IS NULL)"
);
$stmt->execute([$temporadaId]);
$disponibilidad = $stmt->fetchAll();

foreach ($disponibilidad as &$disp) {
    $disp['dia_semana'] = (int)$disp['dia_semana'];
    $disp['preferencia'] = (int)$disp['preferencia'];
}

// --- Bloqueos de nivel ---
$stmt = $pdo->prepare(
    "SELECT bn.*, n.nombre as nivel_nombre, bl.nombre as bloque_nombre
     FROM bloqueos_nivel bn
     JOIN niveles n ON bn.nivel_id = n.id
     LEFT JOIN bloques_horarios bl ON bn.bloque_id = bl.id
     WHERE bn.temporada_id = ?"
);
$stmt->execute([$temporadaId]);
$bloqueosNivel = $stmt->fetchAll();

foreach ($bloqueosNivel as &$bn) {
    $bn['dia_semana'] = $bn['dia_semana'] !== null ? (int)$bn['dia_semana'] : null;
}

// --- Bloqueos institucionales ---
$stmt = $pdo->prepare(
    "SELECT * FROM bloqueos_institucionales
     WHERE temporada_id = ? OR temporada_id IS NULL
     ORDER BY fecha_inicio"
);
$stmt->execute([$temporadaId]);
$bloqueosInstitucionales = $stmt->fetchAll();

// --- Bloqueos de sala ---
$bloqueosSala = $pdo->query(
    "SELECT bs.*, s.code as sala_code, s.name as sala_nombre
     FROM bloqueos_sala bs
     JOIN salas s ON bs.sala_id = s.id
     ORDER BY bs.fecha_inicio"
)->fetchAll();

// --- Feriados ---
$feriados = $pdo->query("SELECT * FROM feriados ORDER BY fecha")->fetchAll();

foreach ($feriados as &$f) {
    $f['recurrente_anual'] = (bool)$f['recurrente_anual'];
}

// --- Horarios fijados (sesiones con fijada=1 que ya tienen asignacion) ---
$stmt = $pdo->prepare(
    "SELECT h.* FROM horarios h
     WHERE h.temporada_id = ? AND h.activo = 1
     ORDER BY h.dia_semana, h.created_at"
);
$stmt->execute([$temporadaId]);
$horariosFijados = $stmt->fetchAll();

foreach ($horariosFijados as &$h) {
    $h['dia_semana'] = (int)$h['dia_semana'];
    $h['activo'] = (bool)$h['activo'];
}

// --- Unidades academicas ---
$unidades = $pdo->query("SELECT id, nombre, code, tipo FROM unidades_academicas ORDER BY nombre")->fetchAll();

// --- Construir respuesta ---
$export = [
    'version' => '1.0',
    'exported_at' => date('c'),
    'temporada' => $temporada,
    'estadisticas' => [
        'total_sesiones' => count($sesiones),
        'total_salas' => count($salas),
        'total_docentes' => count($docentes),
        'total_bloques' => count($bloques),
        'total_asignaturas' => count($asignaturas),
        'total_bloqueos_nivel' => count($bloqueosNivel),
        'total_bloqueos_institucionales' => count($bloqueosInstitucionales),
        'total_feriados' => count($feriados),
    ],
    'bloques' => $bloques,
    'edificios' => $edificios,
    'distancias' => $distancias,
    'salas' => $salas,
    'unidades' => $unidades,
    'carreras' => $carreras,
    'niveles' => $niveles,
    'asignaturas' => $asignaturas,
    'sesiones' => $sesiones,
    'secciones' => $secciones,
    'docentes' => $docentes,
    'docente_asignaturas' => $docenteAsignaturas,
    'docente_disponibilidad' => $disponibilidad,
    'bloqueos_nivel' => $bloqueosNivel,
    'bloqueos_institucionales' => $bloqueosInstitucionales,
    'bloqueos_sala' => $bloqueosSala,
    'feriados' => $feriados,
    'horarios_fijados' => $horariosFijados,
];

jsonResponse(['success' => true, 'data' => $export]);
?>
