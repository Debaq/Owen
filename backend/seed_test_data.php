<?php
// backend/seed_test_data.php
// Genera datos de prueba para testear el solver
// Ejecutar: php seed_test_data.php
// ADVERTENCIA: Inserta datos, no borra los existentes

if (php_sapi_name() !== 'cli') {
    die("Solo ejecutar desde CLI.\n");
}

$dbFile = __DIR__ . '/db/horarios.sqlite';
if (!file_exists($dbFile)) {
    die("[ERROR] Base de datos no encontrada. Ejecute install.php primero.\n");
}

$pdo = new PDO("sqlite:" . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("PRAGMA foreign_keys = ON;");

function uuid() {
    $bytes = random_bytes(16);
    $hex = bin2hex($bytes);
    return sprintf('%s-%s-4%s-%s%s-%s',
        substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 13, 3),
        dechex(8 | (hexdec(substr($hex, 16, 1)) & 3)), substr($hex, 17, 3),
        substr($hex, 20, 12));
}

echo "=== Generando datos de prueba ===\n\n";

$pdo->beginTransaction();

try {
    // --- TEMPORADA ---
    $temporadaId = uuid();
    $pdo->prepare("INSERT OR IGNORE INTO temporadas (id, nombre, tipo, año, fecha_inicio, fecha_fin, activa) VALUES (?, ?, ?, ?, ?, ?, 1)")
        ->execute([$temporadaId, 'Semestre 1 - 2026', 'impar', 2026, '2026-03-09', '2026-07-17']);
    echo "[OK] Temporada: Semestre 1 - 2026\n";

    // --- SISTEMA DE BLOQUES ---
    $sistemaId = 'default-system';
    $stmt = $pdo->prepare("SELECT id FROM sistemas_bloques WHERE id = ?");
    $stmt->execute([$sistemaId]);
    if (!$stmt->fetch()) {
        $pdo->prepare("INSERT INTO sistemas_bloques (id, nombre, es_default) VALUES (?, ?, 1)")
            ->execute([$sistemaId, 'Régimen General']);
    }

    // --- BLOQUES HORARIOS (8 bloques, lunes a viernes) ---
    $bloqueIds = [];
    $horas = [
        ['08:15', '09:35', 'Bloque 1'],
        ['09:45', '11:05', 'Bloque 2'],
        ['11:15', '12:35', 'Bloque 3'],
        ['13:30', '14:50', 'Bloque 4'],
        ['15:00', '16:20', 'Bloque 5'],
        ['16:30', '17:50', 'Bloque 6'],
        ['18:00', '19:20', 'Bloque 7'],
        ['19:30', '20:50', 'Bloque 8'],
    ];

    $insertBloque = $pdo->prepare(
        "INSERT OR IGNORE INTO bloques_horarios (id, nombre, hora_inicio, hora_fin, dia_semana, orden, sistema_bloque_id, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    );

    for ($dia = 1; $dia <= 5; $dia++) {
        foreach ($horas as $orden => $h) {
            $bid = uuid();
            $insertBloque->execute([$bid, $h[2], $h[0], $h[1], $dia, $orden + 1, $sistemaId]);
            $bloqueIds[] = ['id' => $bid, 'dia' => $dia, 'orden' => $orden + 1];
        }
    }
    echo "[OK] " . count($bloqueIds) . " bloques horarios (8 bloques x 5 días)\n";

    // --- EDIFICIOS (10) ---
    $edificioIds = [];
    $edificios = [
        ['ED-A', 'Edificio Central', -41.4870, -72.8960, 4],
        ['ED-B', 'Edificio Ciencias', -41.4875, -72.8955, 3],
        ['ED-C', 'Edificio Ingeniería', -41.4880, -72.8970, 3],
        ['ED-D', 'Edificio Salud', -41.4890, -72.8965, 2],
        ['ED-E', 'Edificio Humanidades', -41.4865, -72.8975, 2],
        ['ED-F', 'Laboratorios Norte', -41.4860, -72.8950, 2],
        ['ED-G', 'Laboratorios Sur', -41.4900, -72.8980, 2],
        ['ED-H', 'Edificio Postgrado', -41.4910, -72.9000, 3],
        ['ED-I', 'Campus Deportivo', -41.4920, -72.9020, 1],
        ['ED-J', 'Sede Anexa', -41.4950, -72.9050, 2],
    ];

    $insertEdificio = $pdo->prepare(
        "INSERT OR IGNORE INTO edificios (id, name, code, lat, lng, pisos) VALUES (?, ?, ?, ?, ?, ?)"
    );

    foreach ($edificios as $e) {
        $eid = uuid();
        $insertEdificio->execute([$eid, $e[1], $e[0], $e[2], $e[3], $e[4]]);
        $edificioIds[$e[0]] = $eid;
    }
    echo "[OK] " . count($edificioIds) . " edificios\n";

    // --- SALAS (40) ---
    $salaIds = [];
    $salasData = [];
    $tiposSala = ['aula', 'aula', 'aula', 'laboratorio', 'taller', 'auditorio'];
    $salaCount = 0;

    foreach ($edificioIds as $code => $edId) {
        $pisos = $edificios[array_search($code, array_column($edificios, 0))][4];
        $salasPerEdificio = ($code === 'ED-A' || $code === 'ED-B') ? 6 : 3;

        for ($i = 1; $i <= $salasPerEdificio; $i++) {
            $salaCount++;
            $sid = uuid();
            $tipo = $tiposSala[($salaCount - 1) % count($tiposSala)];
            $capacidad = $tipo === 'laboratorio' ? rand(18, 25) : ($tipo === 'auditorio' ? rand(80, 150) : rand(30, 60));
            $piso = rand(1, $pisos);
            $salaCode = $code . '-' . str_pad($i, 2, '0', STR_PAD_LEFT);

            $equipamiento = [];
            if ($tipo === 'laboratorio') $equipamiento = ['computadores', 'proyector'];
            elseif ($tipo === 'aula') $equipamiento = ['proyector'];
            elseif ($tipo === 'auditorio') $equipamiento = ['proyector', 'microfono', 'pantalla'];

            $pdo->prepare(
                "INSERT OR IGNORE INTO salas (id, code, name, edificio_id, piso, tipo, capacidad, equipamiento, tipo_gestion, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'central', 1)"
            )->execute([$sid, $salaCode, "Sala $salaCode", $edId, $piso, $tipo, $capacidad, json_encode($equipamiento)]);

            $salaIds[] = $sid;
            $salasData[] = ['id' => $sid, 'tipo' => $tipo, 'capacidad' => $capacidad, 'edificio_id' => $edId];
        }
    }
    echo "[OK] $salaCount salas\n";

    // --- CARRERAS (5) ---
    $carreraIds = [];
    $carreras = [
        ['ICI', 'Ingeniería Civil Informática'],
        ['ENF', 'Enfermería'],
        ['ICM', 'Ingeniería Civil Mecánica'],
        ['KIN', 'Kinesiología'],
        ['ARQ', 'Arquitectura'],
    ];

    foreach ($carreras as $c) {
        $cid = uuid();
        $pdo->prepare("INSERT OR IGNORE INTO carreras (id, name, code) VALUES (?, ?, ?)")
            ->execute([$cid, $c[1], $c[0]]);
        $carreraIds[$c[0]] = $cid;
    }
    echo "[OK] " . count($carreraIds) . " carreras\n";

    // --- NIVELES (4 por carrera = 20) ---
    $nivelIds = [];
    $insertNivel = $pdo->prepare(
        "INSERT OR IGNORE INTO niveles (id, carrera_id, nombre, orden, semestre, alumnos_estimados) VALUES (?, ?, ?, ?, ?, ?)"
    );

    foreach ($carreraIds as $code => $cid) {
        for ($year = 1; $year <= 4; $year++) {
            $nid = uuid();
            $alumnos = rand(30, 65);
            $insertNivel->execute([$nid, $cid, "Año $year", $year, 'impar', $alumnos]);
            $nivelIds[] = ['id' => $nid, 'carrera_id' => $cid, 'code' => $code, 'year' => $year, 'alumnos' => $alumnos];
        }
    }
    echo "[OK] " . count($nivelIds) . " niveles\n";

    // --- DOCENTES (30) ---
    $docenteIds = [];
    $nombres = [
        'María González', 'Juan Pérez', 'Ana López', 'Carlos Muñoz', 'Patricia Soto',
        'Roberto Silva', 'Claudia Martínez', 'Fernando Díaz', 'Rosa Hernández', 'Miguel Torres',
        'Laura Vargas', 'Diego Rojas', 'Carmen Flores', 'Andrés Mora', 'Sofía Castro',
        'Pablo Reyes', 'Isabel Ortiz', 'Tomás Fuentes', 'Valentina Rivas', 'Matías Sepúlveda',
        'Francisca Bravo', 'Nicolás Vera', 'Camila Núñez', 'Sebastián Jara', 'Daniela Pinto',
        'Alejandro Vega', 'Javiera Campos', 'Cristián Lagos', 'Marcela Espinoza', 'Eduardo Paredes',
    ];

    $insertDocente = $pdo->prepare(
        "INSERT OR IGNORE INTO docentes (id, rut, name, email, activo) VALUES (?, ?, ?, ?, 1)"
    );

    foreach ($nombres as $i => $nombre) {
        $did = uuid();
        $rut = rand(10000000, 25000000) . '-' . rand(0, 9);
        $email = strtolower(str_replace(' ', '.', $nombre)) . '@universidad.cl';
        $insertDocente->execute([$did, $rut, $nombre, $email]);
        $docenteIds[] = $did;
    }
    echo "[OK] " . count($docenteIds) . " docentes\n";

    // --- DISPONIBILIDAD DOCENTE ---
    $insertDisp = $pdo->prepare(
        "INSERT OR IGNORE INTO docente_disponibilidad (id, docente_id, dia_semana, bloque_id, preferencia, temporada_id) VALUES (?, ?, ?, ?, ?, ?)"
    );

    $dispCount = 0;
    foreach ($docenteIds as $idx => $did) {
        // Docentes parttime (últimos 10): solo 3 días
        $diasDisponibles = $idx >= 20 ? [1, 3, 5] : [1, 2, 3, 4, 5];
        // Bloques: matutinos o vespertinos según docente
        $bloquesDisponibles = $idx % 2 === 0 ? [1, 2, 3, 4, 5] : [3, 4, 5, 6, 7];

        foreach ($bloqueIds as $bloque) {
            if (in_array($bloque['dia'], $diasDisponibles) && in_array($bloque['orden'], $bloquesDisponibles)) {
                $preferencia = in_array($bloque['orden'], [1, 2, 3]) ? 4 : 3; // Prefiere mañana
                $insertDisp->execute([uuid(), $did, $bloque['dia'], $bloque['id'], $preferencia, $temporadaId]);
                $dispCount++;
            }
        }
    }
    echo "[OK] $dispCount registros de disponibilidad\n";

    // --- ASIGNATURAS (4 por nivel = 80) ---
    $asignaturaIds = [];
    $asigNombres = [
        'Cálculo', 'Física', 'Programación', 'Estadística',
        'Álgebra', 'Química', 'Anatomía', 'Biomecánica',
        'Diseño', 'Estructuras', 'Redes', 'Base de Datos',
        'Fisiología', 'Farmacología', 'Ética', 'Investigación',
        'Electrónica', 'Termodinámica', 'Materiales', 'Gestión',
    ];

    $insertAsig = $pdo->prepare(
        "INSERT OR IGNORE INTO asignaturas (id, code, name, carrera_id, nivel_id, horas_teoria, horas_practica, horas_semanales, equipamiento_requerido, requiere_laboratorio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $asigIdx = 0;
    foreach ($nivelIds as $nivel) {
        for ($a = 0; $a < 4; $a++) {
            $aid = uuid();
            $nombreAsig = $asigNombres[$asigIdx % count($asigNombres)] . ' ' . ($nivel['year'] > 1 ? 'II' : 'I');
            $code = $nivel['code'] . $nivel['year'] . str_pad($a + 1, 2, '0', STR_PAD_LEFT);
            $horasT = rand(2, 3);
            $horasP = rand(1, 2);
            $requiereLab = $horasP > 1 ? 1 : 0;
            $equipamiento = $requiereLab ? '["computadores","proyector"]' : '["proyector"]';

            $insertAsig->execute([$aid, $code, $nombreAsig, $nivel['carrera_id'], $nivel['id'],
                $horasT, $horasP, $horasT + $horasP, $equipamiento, $requiereLab]);

            $asignaturaIds[] = ['id' => $aid, 'nivel' => $nivel, 'horas_t' => $horasT, 'horas_p' => $horasP];
            $asigIdx++;
        }
    }
    echo "[OK] " . count($asignaturaIds) . " asignaturas\n";

    // --- DOCENTE-ASIGNATURAS ---
    $insertDA = $pdo->prepare(
        "INSERT OR IGNORE INTO docente_asignaturas (id, docente_id, asignatura_id, rol) VALUES (?, ?, ?, ?)"
    );

    foreach ($asignaturaIds as $i => $asig) {
        // Responsable
        $respIdx = $i % count($docenteIds);
        $insertDA->execute([uuid(), $docenteIds[$respIdx], $asig['id'], 'responsable']);
        // Colaborador para prácticas
        $colabIdx = ($i + 7) % count($docenteIds);
        $insertDA->execute([uuid(), $docenteIds[$colabIdx], $asig['id'], 'colaborador']);
    }
    echo "[OK] " . (count($asignaturaIds) * 2) . " asignaciones docente-asignatura\n";

    // --- SECCIONES (para niveles con >40 alumnos) ---
    $seccionIds = [];
    $insertSeccion = $pdo->prepare(
        "INSERT OR IGNORE INTO secciones (id, nivel_id, nombre, alumnos) VALUES (?, ?, ?, ?)"
    );

    foreach ($nivelIds as $nivel) {
        if ($nivel['alumnos'] > 40) {
            $numSec = 2;
            $alumnosPorSec = (int)ceil($nivel['alumnos'] / $numSec);
            $restante = $nivel['alumnos'];
            $letras = ['A', 'B', 'C'];

            for ($s = 0; $s < $numSec; $s++) {
                $sid = uuid();
                $alSec = min($alumnosPorSec, $restante);
                $restante -= $alSec;
                $insertSeccion->execute([$sid, $nivel['id'], $letras[$s], $alSec]);
                $seccionIds[] = ['id' => $sid, 'nivel_id' => $nivel['id']];
            }
        }
    }
    echo "[OK] " . count($seccionIds) . " secciones\n";

    // --- SESIONES ---
    $insertSesion = $pdo->prepare(
        "INSERT OR IGNORE INTO sesiones (id, asignatura_id, tipo, seccion_id, docente_id, alumnos_estimados, bloques_requeridos, etiqueta, temporada_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $sesionCount = 0;
    foreach ($asignaturaIds as $i => $asig) {
        $nivel = $asig['nivel'];
        $respIdx = $i % count($docenteIds);
        $colabIdx = ($i + 7) % count($docenteIds);

        // Sesiones teóricas
        for ($t = 1; $t <= $asig['horas_t']; $t++) {
            $insertSesion->execute([
                uuid(), $asig['id'], 'teorica', null, $docenteIds[$respIdx],
                $nivel['alumnos'], 1, $nivel['code'] . '-T' . $t, $temporadaId
            ]);
            $sesionCount++;
        }

        // Sesiones prácticas
        $seccionesNivel = array_filter($seccionIds, function($s) use ($nivel) { return $s['nivel_id'] === $nivel['id']; });

        if (empty($seccionesNivel)) {
            for ($p = 1; $p <= $asig['horas_p']; $p++) {
                $insertSesion->execute([
                    uuid(), $asig['id'], 'practica', null, $docenteIds[$colabIdx],
                    $nivel['alumnos'], 1, $nivel['code'] . '-P' . $p, $temporadaId
                ]);
                $sesionCount++;
            }
        } else {
            foreach ($seccionesNivel as $sec) {
                for ($p = 1; $p <= $asig['horas_p']; $p++) {
                    $insertSesion->execute([
                        uuid(), $asig['id'], 'practica', $sec['id'], $docenteIds[$colabIdx],
                        (int)ceil($nivel['alumnos'] / count($seccionesNivel)), 1,
                        $nivel['code'] . '-P' . $p, $temporadaId
                    ]);
                    $sesionCount++;
                }
            }
        }
    }
    echo "[OK] $sesionCount sesiones\n";

    // --- FERIADOS ---
    $feriados = [
        ['2026-05-01', 'Día del Trabajo', 'nacional'],
        ['2026-05-21', 'Día de las Glorias Navales', 'nacional'],
        ['2026-06-20', 'Día Nacional de los Pueblos Indígenas', 'nacional'],
        ['2026-06-29', 'San Pedro y San Pablo', 'nacional'],
        ['2026-07-16', 'Día de la Virgen del Carmen', 'nacional'],
    ];

    foreach ($feriados as $f) {
        $pdo->prepare("INSERT OR IGNORE INTO feriados (id, fecha, nombre, tipo, recurrente_anual) VALUES (?, ?, ?, ?, 0)")
            ->execute([uuid(), $f[0], $f[1], $f[2]]);
    }
    echo "[OK] " . count($feriados) . " feriados\n";

    // --- DISTANCIAS ENTRE EDIFICIOS ---
    $edKeys = array_keys($edificioIds);
    $distCount = 0;
    for ($i = 0; $i < count($edKeys); $i++) {
        for ($j = $i + 1; $j < count($edKeys); $j++) {
            $e1 = $edificios[$i];
            $e2 = $edificios[$j];
            // Haversine simplificado
            $dlat = deg2rad($e2[2] - $e1[2]);
            $dlng = deg2rad($e2[3] - $e1[3]);
            $a = sin($dlat/2)**2 + cos(deg2rad($e1[2])) * cos(deg2rad($e2[2])) * sin($dlng/2)**2;
            $metros = 6371000 * 2 * atan2(sqrt($a), sqrt(1-$a));
            $minutos = max(1, (int)round($metros / 80));

            $pdo->prepare("INSERT OR IGNORE INTO distancias_edificios (id, edificio_origen_id, edificio_destino_id, minutos) VALUES (?, ?, ?, ?)")
                ->execute([uuid(), $edificioIds[$edKeys[$i]], $edificioIds[$edKeys[$j]], $minutos]);
            $pdo->prepare("INSERT OR IGNORE INTO distancias_edificios (id, edificio_origen_id, edificio_destino_id, minutos) VALUES (?, ?, ?, ?)")
                ->execute([uuid(), $edificioIds[$edKeys[$j]], $edificioIds[$edKeys[$i]], $minutos]);
            $distCount += 2;
        }
    }
    echo "[OK] $distCount distancias entre edificios\n";

    // --- BLOQUEOS INSTITUCIONALES ---
    $pdo->prepare("INSERT OR IGNORE INTO bloqueos_institucionales (id, nombre, fecha_inicio, fecha_fin, temporada_id, motivo, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
        ->execute([uuid(), 'PAES - Prueba de Acceso', '2026-06-08', '2026-06-09', $temporadaId, 'Evaluación nacional de ingreso universitario', 'system']);
    echo "[OK] 1 bloqueo institucional (PAES)\n";

    $pdo->commit();

    // Resumen
    echo "\n=== Datos de prueba generados ===\n";
    echo "Temporada: Semestre 1 - 2026 (ID: $temporadaId)\n";
    echo "Bloques: " . count($bloqueIds) . "\n";
    echo "Edificios: " . count($edificioIds) . "\n";
    echo "Salas: $salaCount\n";
    echo "Carreras: " . count($carreraIds) . "\n";
    echo "Niveles: " . count($nivelIds) . "\n";
    echo "Docentes: " . count($docenteIds) . "\n";
    echo "Asignaturas: " . count($asignaturaIds) . "\n";
    echo "Sesiones: $sesionCount\n";
    echo "Secciones: " . count($seccionIds) . "\n";
    echo "Distancias: $distCount\n";

} catch (Exception $e) {
    $pdo->rollBack();
    die("[ERROR] " . $e->getMessage() . "\n");
}
?>
