<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        handleGet($pdo, $action);
        break;
    case 'POST':
        handlePost($pdo, $action);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

// ==================== GET ====================

function handleGet($pdo, $action) {
    switch ($action) {
        case 'directores':
            getDirectores($pdo);
            break;
        case 'disponibilidad':
            getDisponibilidad($pdo);
            break;
        case 'slots':
            getSlots($pdo);
            break;
        case 'citas':
            requireRoles(['direccion', 'secretaria', 'gestor']);
            getCitas($pdo);
            break;
        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}

// Lista de directores con agenda activa (público)
function getDirectores($pdo) {
    $sql = "SELECT DISTINCT u.id, u.name, u.email, u.carrera_id, c.name AS carrera_name
            FROM users u
            LEFT JOIN carreras c ON u.carrera_id = c.id
            INNER JOIN agenda_disponibilidad ad ON ad.director_id = u.id AND ad.activo = 1
            WHERE u.role IN ('direccion', 'secretaria')
            ORDER BY u.name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $directores = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $directores]);
}

// Disponibilidad semanal de un director (público)
function getDisponibilidad($pdo) {
    $director_id = isset($_GET['director_id']) ? $_GET['director_id'] : null;
    if (!$director_id) jsonResponse(['error' => 'director_id requerido'], 400);

    $stmt = $pdo->prepare("SELECT * FROM agenda_disponibilidad WHERE director_id = ? AND activo = 1 ORDER BY dia_semana, hora_inicio");
    $stmt->execute([$director_id]);
    $data = $stmt->fetchAll();

    foreach ($data as &$row) {
        $row['dia_semana'] = (int)$row['dia_semana'];
        $row['duracion_cita'] = (int)$row['duracion_cita'];
        $row['activo'] = (bool)$row['activo'];
    }

    jsonResponse(['success' => true, 'data' => $data]);
}

// Slots disponibles para una fecha específica (público)
function getSlots($pdo) {
    $director_id = isset($_GET['director_id']) ? $_GET['director_id'] : null;
    $fecha = isset($_GET['fecha']) ? $_GET['fecha'] : null;
    if (!$director_id || !$fecha) jsonResponse(['error' => 'director_id y fecha requeridos'], 400);

    // Determinar día de la semana (1=Lun...7=Dom)
    $timestamp = strtotime($fecha);
    if ($timestamp === false) jsonResponse(['error' => 'Fecha inválida'], 400);
    $diaSemana = (int)date('N', $timestamp); // 1=Lun, 7=Dom

    // Obtener disponibilidad para ese día
    $stmt = $pdo->prepare("SELECT hora_inicio, hora_fin, duracion_cita FROM agenda_disponibilidad
        WHERE director_id = ? AND dia_semana = ? AND activo = 1");
    $stmt->execute([$director_id, $diaSemana]);
    $disponibilidad = $stmt->fetchAll();

    // Obtener citas ya reservadas para esa fecha
    $stmt = $pdo->prepare("SELECT hora_inicio, hora_fin FROM agenda_citas
        WHERE director_id = ? AND fecha = ? AND estado = 'confirmada'");
    $stmt->execute([$director_id, $fecha]);
    $citasReservadas = $stmt->fetchAll();
    $horasOcupadas = [];
    foreach ($citasReservadas as $c) {
        $horasOcupadas[$c['hora_inicio']] = true;
    }

    // Generar slots disponibles
    $slots = [];
    foreach ($disponibilidad as $d) {
        $duracion = (int)($d['duracion_cita'] ? $d['duracion_cita'] : 30);
        $inicio = strtotime($d['hora_inicio']);
        $fin = strtotime($d['hora_fin']);

        while ($inicio + ($duracion * 60) <= $fin) {
            $slotInicio = date('H:i', $inicio);
            $slotFin = date('H:i', $inicio + ($duracion * 60));

            $slots[] = [
                'hora_inicio' => $slotInicio,
                'hora_fin' => $slotFin,
                'disponible' => !isset($horasOcupadas[$slotInicio]),
            ];

            $inicio += $duracion * 60;
        }
    }

    jsonResponse(['success' => true, 'data' => $slots]);
}

// Citas del director (privado)
function getCitas($pdo) {
    $director_id = isset($_GET['director_id']) ? $_GET['director_id'] : null;

    // Si no es gestor, solo puede ver su propia agenda
    if ($_SESSION['user_role'] !== 'gestor') {
        $director_id = $_SESSION['user_id'];

        // Secretaria puede ver agenda de directores de su carrera
        if ($_SESSION['user_role'] === 'secretaria') {
            $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $me = $stmt->fetch();

            if (isset($_GET['director_id']) && $_GET['director_id'] !== '') {
                $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
                $stmt->execute([$_GET['director_id']]);
                $target = $stmt->fetch();
                if ($target && $me && $target['carrera_id'] === $me['carrera_id']) {
                    $director_id = $_GET['director_id'];
                }
            }
        }
    }

    if (!$director_id) jsonResponse(['error' => 'director_id requerido'], 400);

    $sql = "SELECT * FROM agenda_citas WHERE director_id = ? ORDER BY fecha DESC, hora_inicio ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$director_id]);
    $citas = $stmt->fetchAll();

    jsonResponse(['success' => true, 'data' => $citas]);
}

// ==================== POST ====================

function handlePost($pdo, $action) {
    switch ($action) {
        case 'reservar':
            reservarCita($pdo);
            break;
        case 'save_disponibilidad':
            requireRoles(['direccion', 'secretaria', 'gestor']);
            saveDisponibilidad($pdo);
            break;
        case 'crear_cita':
            requireRoles(['direccion', 'secretaria', 'gestor']);
            crearCitaManual($pdo);
            break;
        case 'cancelar_cita':
            requireRoles(['direccion', 'secretaria', 'gestor']);
            cancelarCita($pdo);
            break;
        default:
            jsonResponse(['error' => 'Acción no válida'], 400);
    }
}

// Reserva pública (sin auth)
function reservarCita($pdo) {
    if (isRateLimited('agenda_reserva', 10, 60)) {
        jsonResponse(['error' => 'Demasiados intentos. Espere un momento.'], 429);
    }

    $input = getJsonInput();
    $required = ['director_id', 'fecha', 'hora_inicio', 'hora_fin', 'nombre_solicitante', 'motivo'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['error' => "Campo '$field' requerido"], 400);
        }
    }

    $pdo->beginTransaction();
    try {
        // Verificar conflicto
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM agenda_citas
            WHERE director_id = ? AND fecha = ? AND hora_inicio = ? AND estado = 'confirmada'");
        $stmt->execute([$input['director_id'], $input['fecha'], $input['hora_inicio']]);

        if ($stmt->fetchColumn() > 0) {
            $pdo->rollBack();
            jsonResponse(['error' => 'Este horario ya fue reservado. Seleccione otro.'], 409);
        }

        $id = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO agenda_citas
            (id, director_id, fecha, hora_inicio, hora_fin, nombre_solicitante, email_solicitante, telefono_solicitante, motivo, estado, creado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', NULL)");
        $stmt->execute([
            $id,
            $input['director_id'],
            $input['fecha'],
            $input['hora_inicio'],
            $input['hora_fin'],
            sanitizeString($input['nombre_solicitante']),
            isset($input['email_solicitante']) ? sanitizeString($input['email_solicitante']) : null,
            isset($input['telefono_solicitante']) ? sanitizeString($input['telefono_solicitante']) : null,
            sanitizeString($input['motivo']),
        ]);

        $pdo->commit();
        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Cita reservada exitosamente'], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        securityLog('AGENDA_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error al reservar la cita'], 500);
    }
}

// Guardar disponibilidad semanal
function saveDisponibilidad($pdo) {
    $input = getJsonInput();
    $director_id = isset($input['director_id']) ? $input['director_id'] : $_SESSION['user_id'];
    $items = isset($input['items']) ? $input['items'] : [];

    // Verificar permisos
    if ($_SESSION['user_role'] !== 'gestor' && $director_id !== $_SESSION['user_id']) {
        // Secretaria puede gestionar agenda de directores de su carrera
        if ($_SESSION['user_role'] === 'secretaria') {
            if (!isOwnCarrera($pdo, null)) {
                $stmt = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
                $stmt->execute([$director_id]);
                $target = $stmt->fetch();
                $stmt2 = $pdo->prepare("SELECT carrera_id FROM users WHERE id = ?");
                $stmt2->execute([$_SESSION['user_id']]);
                $me = $stmt2->fetch();
                if (!$target || !$me || $target['carrera_id'] !== $me['carrera_id']) {
                    jsonResponse(['error' => 'Solo puede gestionar agenda de su carrera'], 403);
                }
            }
        } else {
            jsonResponse(['error' => 'No puede gestionar agenda de otro usuario'], 403);
        }
    }

    $pdo->beginTransaction();
    try {
        // Limpiar disponibilidad previa
        $stmt = $pdo->prepare("DELETE FROM agenda_disponibilidad WHERE director_id = ?");
        $stmt->execute([$director_id]);

        // Insertar nueva
        if (!empty($items)) {
            $sql = "INSERT INTO agenda_disponibilidad (id, director_id, dia_semana, hora_inicio, hora_fin, duracion_cita)
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            foreach ($items as $item) {
                $stmt->execute([
                    generateUUID(),
                    $director_id,
                    $item['dia_semana'],
                    $item['hora_inicio'],
                    $item['hora_fin'],
                    isset($item['duracion_cita']) ? (int)$item['duracion_cita'] : 30,
                ]);
            }
        }

        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'Disponibilidad actualizada']);

    } catch (Exception $e) {
        $pdo->rollBack();
        securityLog('AGENDA_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error al guardar disponibilidad'], 500);
    }
}

// Crear cita manual (secretaria/director)
function crearCitaManual($pdo) {
    $input = getJsonInput();
    $director_id = isset($input['director_id']) ? $input['director_id'] : $_SESSION['user_id'];

    $required = ['fecha', 'hora_inicio', 'hora_fin', 'nombre_solicitante', 'motivo'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['error' => "Campo '$field' requerido"], 400);
        }
    }

    $pdo->beginTransaction();
    try {
        // Verificar conflicto
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM agenda_citas
            WHERE director_id = ? AND fecha = ? AND hora_inicio = ? AND estado = 'confirmada'");
        $stmt->execute([$director_id, $input['fecha'], $input['hora_inicio']]);

        if ($stmt->fetchColumn() > 0) {
            $pdo->rollBack();
            jsonResponse(['error' => 'Ya existe una cita en ese horario'], 409);
        }

        $id = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO agenda_citas
            (id, director_id, fecha, hora_inicio, hora_fin, nombre_solicitante, email_solicitante, telefono_solicitante, motivo, estado, creado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', ?)");
        $stmt->execute([
            $id,
            $director_id,
            $input['fecha'],
            $input['hora_inicio'],
            $input['hora_fin'],
            sanitizeString($input['nombre_solicitante']),
            isset($input['email_solicitante']) ? sanitizeString($input['email_solicitante']) : null,
            isset($input['telefono_solicitante']) ? sanitizeString($input['telefono_solicitante']) : null,
            sanitizeString($input['motivo']),
            $_SESSION['user_id'],
        ]);

        $pdo->commit();
        jsonResponse(['success' => true, 'data' => ['id' => $id], 'message' => 'Cita creada'], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        securityLog('AGENDA_ERROR', $e->getMessage());
        jsonResponse(['error' => 'Error al crear la cita'], 500);
    }
}

// Cancelar cita
function cancelarCita($pdo) {
    $input = getJsonInput();
    if (empty($input['id'])) jsonResponse(['error' => 'ID requerido'], 400);

    $stmt = $pdo->prepare("UPDATE agenda_citas SET estado = 'cancelada' WHERE id = ?");
    $stmt->execute([$input['id']]);

    jsonResponse(['success' => true, 'message' => 'Cita cancelada']);
}
?>
