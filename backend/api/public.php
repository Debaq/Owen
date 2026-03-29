<?php
/**
 * Endpoint público - No requiere autenticación
 * GET ?action=room&id=X             → Datos de sala + edificio
 * GET ?action=schedule&sala_id=X    → Horarios de una sala (enriquecidos)
 * GET ?action=rooms&search=X        → Buscar salas por nombre/código/edificio
 * GET ?action=carreras              → Listar carreras
 * GET ?action=niveles&carrera_id=X  → Niveles de una carrera
 * GET ?action=rooms_by_nivel&nivel_id=X → Salas con horarios para un nivel
 * GET ?action=bloques               → Bloques horarios activos
 * GET ?action=temporada             → Temporada activa
 */
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'room':
        getRoom($pdo);
        break;
    case 'schedule':
        getRoomSchedule($pdo);
        break;
    case 'rooms':
        searchRooms($pdo);
        break;
    case 'carreras':
        getCarreras($pdo);
        break;
    case 'niveles':
        getNiveles($pdo);
        break;
    case 'rooms_by_nivel':
        getRoomsByNivel($pdo);
        break;
    case 'building':
        getBuilding($pdo);
        break;
    case 'bloques':
        getBloques($pdo);
        break;
    case 'temporada':
        getTemporadaActiva($pdo);
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function getRoom($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['error' => 'Room ID required'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT s.*, e.name as edificio_name, e.code as edificio_code,
               e.lat as edificio_lat, e.lng as edificio_lng, e.pisos as edificio_pisos,
               e.descripcion as edificio_descripcion
        FROM salas s
        LEFT JOIN edificios e ON s.edificio_id = e.id
        WHERE s.id = ? AND s.activo = 1
    ");
    $stmt->execute([$id]);
    $sala = $stmt->fetch();

    if (!$sala) {
        jsonResponse(['error' => 'Room not found'], 404);
    }

    $sala['mobiliario'] = json_decode($sala['mobiliario'] ?: '[]');
    $sala['equipamiento'] = json_decode($sala['equipamiento'] ?: '[]');
    $sala['fotos'] = json_decode($sala['fotos'] ?: '[]');
    $sala['piso'] = (int)$sala['piso'];
    $sala['capacidad'] = (int)$sala['capacidad'];
    $sala['lat'] = (float)$sala['lat'];
    $sala['lng'] = (float)$sala['lng'];
    $sala['activo'] = (bool)$sala['activo'];
    $sala['edificio_lat'] = (float)$sala['edificio_lat'];
    $sala['edificio_lng'] = (float)$sala['edificio_lng'];

    jsonResponse(['success' => true, 'data' => $sala]);
}

function getRoomSchedule($pdo) {
    $sala_id = $_GET['sala_id'] ?? null;
    if (!$sala_id) {
        jsonResponse(['error' => 'sala_id required'], 400);
    }

    // Obtener temporada activa
    $temporada_id = $_GET['temporada_id'] ?? null;
    if (!$temporada_id) {
        $stmt = $pdo->prepare("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
        $stmt->execute();
        $temp = $stmt->fetch();
        if ($temp) {
            $temporada_id = $temp['id'];
        }
    }

    $where = "h.sala_id = :sala_id AND h.activo = 1";
    $params = ['sala_id' => $sala_id];

    if ($temporada_id) {
        $where .= " AND h.temporada_id = :temporada_id";
        $params['temporada_id'] = $temporada_id;
    }

    $stmt = $pdo->prepare("SELECT h.* FROM horarios h WHERE $where");
    $stmt->execute($params);
    $horarios = $stmt->fetchAll();

    // Enriquecer
    foreach ($horarios as &$h) {
        $h['dia_semana'] = (int)$h['dia_semana'];
        $h['activo'] = (bool)$h['activo'];

        if ($h['asignatura_id']) {
            $s2 = $pdo->prepare("SELECT id, code, name FROM asignaturas WHERE id = ?");
            $s2->execute([$h['asignatura_id']]);
            $h['asignatura'] = $s2->fetch();
        }

        if ($h['docente_id']) {
            $s2 = $pdo->prepare("SELECT id, name FROM docentes WHERE id = ?");
            $s2->execute([$h['docente_id']]);
            $h['docente'] = $s2->fetch();
        }

        $s2 = $pdo->prepare("SELECT id, nombre, hora_inicio, hora_fin, dia_semana, orden FROM bloques_horarios WHERE id = ?");
        $s2->execute([$h['bloque_id']]);
        $h['bloque'] = $s2->fetch();
    }

    jsonResponse(['success' => true, 'data' => $horarios]);
}

function searchRooms($pdo) {
    $search = $_GET['search'] ?? '';
    $tipo = $_GET['tipo'] ?? '';

    $where = ["s.activo = 1"];
    $params = [];

    if ($search !== '') {
        $where[] = "(s.code LIKE :search OR s.name LIKE :search2 OR e.name LIKE :search3)";
        $params['search'] = "%$search%";
        $params['search2'] = "%$search%";
        $params['search3'] = "%$search%";
    }

    if ($tipo !== '') {
        $where[] = "s.tipo = :tipo";
        $params['tipo'] = $tipo;
    }

    $sql = "
        SELECT s.id, s.code, s.name, s.tipo, s.capacidad, s.piso, s.lat, s.lng,
               e.name as edificio_name, e.code as edificio_code
        FROM salas s
        LEFT JOIN edificios e ON s.edificio_id = e.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY s.code ASC
        LIMIT 50
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $salas = $stmt->fetchAll();

    foreach ($salas as &$sala) {
        $sala['capacidad'] = (int)$sala['capacidad'];
        $sala['piso'] = (int)$sala['piso'];
        $sala['lat'] = (float)$sala['lat'];
        $sala['lng'] = (float)$sala['lng'];
    }

    jsonResponse(['success' => true, 'data' => $salas]);
}

function getCarreras($pdo) {
    $stmt = $pdo->prepare("SELECT id, name, code FROM carreras ORDER BY name ASC");
    $stmt->execute();
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

function getNiveles($pdo) {
    $carrera_id = $_GET['carrera_id'] ?? null;
    if (!$carrera_id) {
        jsonResponse(['error' => 'carrera_id required'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, carrera_id, nombre, orden, semestre FROM niveles WHERE carrera_id = ? ORDER BY orden ASC");
    $stmt->execute([$carrera_id]);
    $niveles = $stmt->fetchAll();

    foreach ($niveles as &$n) {
        $n['orden'] = (int)$n['orden'];
    }

    jsonResponse(['success' => true, 'data' => $niveles]);
}

function getRoomsByNivel($pdo) {
    $nivel_id = $_GET['nivel_id'] ?? null;
    if (!$nivel_id) {
        jsonResponse(['error' => 'nivel_id required'], 400);
    }

    // Obtener temporada activa
    $stmt = $pdo->prepare("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
    $stmt->execute();
    $temp = $stmt->fetch();
    $temporada_id = $temp ? $temp['id'] : null;

    // Buscar salas que tienen horarios para este nivel
    $where = "h.nivel_id = :nivel_id AND h.activo = 1";
    $params = ['nivel_id' => $nivel_id];
    if ($temporada_id) {
        $where .= " AND h.temporada_id = :temporada_id";
        $params['temporada_id'] = $temporada_id;
    }

    $sql = "
        SELECT DISTINCT s.id, s.code, s.name, s.tipo, s.capacidad, s.piso, s.lat, s.lng,
               e.name as edificio_name, e.code as edificio_code
        FROM horarios h
        INNER JOIN salas s ON h.sala_id = s.id AND s.activo = 1
        LEFT JOIN edificios e ON s.edificio_id = e.id
        WHERE $where
        ORDER BY s.code ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $salas = $stmt->fetchAll();

    foreach ($salas as &$sala) {
        $sala['capacidad'] = (int)$sala['capacidad'];
        $sala['piso'] = (int)$sala['piso'];
        $sala['lat'] = (float)$sala['lat'];
        $sala['lng'] = (float)$sala['lng'];
    }

    jsonResponse(['success' => true, 'data' => $salas]);
}

function getBuilding($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['error' => 'Building ID required'], 400);
    }

    // Datos del edificio
    $stmt = $pdo->prepare("SELECT * FROM edificios WHERE id = ?");
    $stmt->execute([$id]);
    $edificio = $stmt->fetch();
    if (!$edificio) {
        jsonResponse(['error' => 'Building not found'], 404);
    }
    $edificio['pisos'] = (int)$edificio['pisos'];
    $edificio['lat'] = (float)$edificio['lat'];
    $edificio['lng'] = (float)$edificio['lng'];
    $edificio['fotos'] = json_decode($edificio['fotos'] ?: '[]');

    // Hora y dia actuales
    $hora_actual = date('H:i');
    $dia_actual = (int)date('w'); // 0=dom, 1=lun...

    // Bloque actual: hora_inicio <= ahora < hora_fin, mismo dia
    $stmt = $pdo->prepare("
        SELECT * FROM bloques_horarios
        WHERE activo = 1 AND dia_semana = :dia
          AND hora_inicio <= :hora AND hora_fin > :hora2
        ORDER BY orden ASC LIMIT 1
    ");
    $stmt->execute(['dia' => $dia_actual, 'hora' => $hora_actual, 'hora2' => $hora_actual]);
    $bloque_actual = $stmt->fetch();

    // Bloque siguiente: siguiente bloque del mismo dia despues de ahora
    $stmt = $pdo->prepare("
        SELECT * FROM bloques_horarios
        WHERE activo = 1 AND dia_semana = :dia
          AND hora_inicio > :hora
        ORDER BY orden ASC LIMIT 1
    ");
    $stmt->execute(['dia' => $dia_actual, 'hora' => $hora_actual]);
    $bloque_siguiente = $stmt->fetch();

    // Temporada activa
    $stmt = $pdo->prepare("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
    $stmt->execute();
    $temp = $stmt->fetch();
    $temporada_id = $temp ? $temp['id'] : null;

    // Salas del edificio
    $stmt = $pdo->prepare("SELECT id, code, name, piso, tipo, capacidad, equipamiento FROM salas WHERE edificio_id = ? AND activo = 1 ORDER BY piso ASC, code ASC");
    $stmt->execute([$id]);
    $salas = $stmt->fetchAll();

    // Para cada sala: horario actual, horario siguiente, pedidos de ayuda
    foreach ($salas as &$sala) {
        $sala['piso'] = (int)$sala['piso'];
        $sala['capacidad'] = (int)$sala['capacidad'];
        $sala['equipamiento'] = json_decode($sala['equipamiento'] ?: '[]');

        $sala['horario_actual'] = null;
        $sala['horario_siguiente'] = null;

        // Horario en bloque actual
        if ($bloque_actual && $temporada_id) {
            $s2 = $pdo->prepare("
                SELECT h.id, h.tipo, a.code as asignatura_code, a.name as asignatura_name, d.name as docente_name
                FROM horarios h
                LEFT JOIN asignaturas a ON h.asignatura_id = a.id
                LEFT JOIN docentes d ON h.docente_id = d.id
                WHERE h.sala_id = :sala_id AND h.bloque_id = :bloque_id
                  AND h.temporada_id = :temporada_id AND h.activo = 1
                LIMIT 1
            ");
            $s2->execute(['sala_id' => $sala['id'], 'bloque_id' => $bloque_actual['id'], 'temporada_id' => $temporada_id]);
            $sala['horario_actual'] = $s2->fetch() ?: null;
        }

        // Horario en bloque siguiente
        if ($bloque_siguiente && $temporada_id) {
            $s2 = $pdo->prepare("
                SELECT h.id, h.tipo, a.code as asignatura_code, a.name as asignatura_name, d.name as docente_name
                FROM horarios h
                LEFT JOIN asignaturas a ON h.asignatura_id = a.id
                LEFT JOIN docentes d ON h.docente_id = d.id
                WHERE h.sala_id = :sala_id AND h.bloque_id = :bloque_id
                  AND h.temporada_id = :temporada_id AND h.activo = 1
                LIMIT 1
            ");
            $s2->execute(['sala_id' => $sala['id'], 'bloque_id' => $bloque_siguiente['id'], 'temporada_id' => $temporada_id]);
            $sala['horario_siguiente'] = $s2->fetch() ?: null;
        }

        // Pedidos de ayuda activos
        $s2 = $pdo->prepare("
            SELECT id, mensaje, autor_email, created_at
            FROM observaciones
            WHERE sala_id = ? AND tipo = 'ayuda' AND estado = 'nuevo'
            ORDER BY created_at DESC LIMIT 5
        ");
        $s2->execute([$sala['id']]);
        $sala['ayuda_activa'] = $s2->fetchAll();
    }

    // Formatear bloques para respuesta
    $formatBloque = function($b) {
        if (!$b) return null;
        return [
            'id' => $b['id'],
            'nombre' => $b['nombre'],
            'hora_inicio' => $b['hora_inicio'],
            'hora_fin' => $b['hora_fin'],
            'orden' => (int)$b['orden'],
        ];
    };

    jsonResponse(['success' => true, 'data' => [
        'edificio' => $edificio,
        'hora_actual' => $hora_actual,
        'dia_actual' => $dia_actual,
        'bloque_actual' => $formatBloque($bloque_actual),
        'bloque_siguiente' => $formatBloque($bloque_siguiente),
        'salas' => $salas,
    ]]);
}

function getBloques($pdo) {
    $stmt = $pdo->prepare("SELECT * FROM bloques_horarios WHERE activo = 1 ORDER BY orden ASC");
    $stmt->execute();
    $bloques = $stmt->fetchAll();

    foreach ($bloques as &$b) {
        $b['dia_semana'] = (int)$b['dia_semana'];
        $b['orden'] = (int)$b['orden'];
        $b['activo'] = (bool)$b['activo'];
    }

    jsonResponse(['success' => true, 'data' => $bloques]);
}

function getTemporadaActiva($pdo) {
    $stmt = $pdo->prepare("SELECT * FROM temporadas WHERE activa = 1 LIMIT 1");
    $stmt->execute();
    $temporada = $stmt->fetch();

    if (!$temporada) {
        jsonResponse(['success' => true, 'data' => null]);
    }

    $temporada['activa'] = (bool)$temporada['activa'];
    jsonResponse(['success' => true, 'data' => $temporada]);
}
?>
