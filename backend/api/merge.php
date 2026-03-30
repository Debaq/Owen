<?php
// backend/api/merge.php
// Merge de branches del sistema de versionado de horarios
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Metodo no permitido'], 405);
}

requireRole('gestor');

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action !== 'merge') {
    jsonResponse(['error' => 'Accion no valida. Use ?action=merge'], 400);
}

$data = getJsonInput();

$required = ['source_branch_id', 'target_branch_id', 'mensaje'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        jsonResponse(['error' => "Campo requerido: {$field}"], 400);
    }
}

$strategy = isset($data['strategy']) ? $data['strategy'] : 'source_wins';
$validStrategies = ['source_wins', 'target_wins', 'manual'];
if (!in_array($strategy, $validStrategies)) {
    jsonResponse(['error' => 'Strategy no valida: ' . implode(', ', $validStrategies)], 400);
}

$sourceBranchId = $data['source_branch_id'];
$targetBranchId = $data['target_branch_id'];

if ($sourceBranchId === $targetBranchId) {
    jsonResponse(['error' => 'No se puede mergear un branch consigo mismo'], 400);
}

// Obtener ultimos commits de cada branch
$sourceCommitId = getLatestCommitId($pdo, $sourceBranchId);
$targetCommitId = getLatestCommitId($pdo, $targetBranchId);

if (!$sourceCommitId) {
    jsonResponse(['error' => 'Branch source no tiene commits'], 400);
}
if (!$targetCommitId) {
    jsonResponse(['error' => 'Branch target no tiene commits'], 400);
}

// Cargar asignaciones de ambos
$sourceAsig = loadAsignaciones($pdo, $sourceCommitId);
$targetAsig = loadAsignaciones($pdo, $targetCommitId);

// Detectar conflictos: misma sesion_id con datos diferentes
$conflicts = [];
$merged = [];

$allSesiones = array_unique(array_merge(array_keys($sourceAsig), array_keys($targetAsig)));

foreach ($allSesiones as $sesionId) {
    $inSource = isset($sourceAsig[$sesionId]);
    $inTarget = isset($targetAsig[$sesionId]);

    if ($inSource && !$inTarget) {
        // Solo en source: agregar
        $merged[$sesionId] = $sourceAsig[$sesionId];
    } elseif (!$inSource && $inTarget) {
        // Solo en target: mantener
        $merged[$sesionId] = $targetAsig[$sesionId];
    } else {
        // En ambos: verificar si son iguales
        $s = $sourceAsig[$sesionId];
        $t = $targetAsig[$sesionId];

        $isDifferent = ($s['sala_id'] !== $t['sala_id']) ||
                       ($s['bloque_id'] !== $t['bloque_id']) ||
                       ((int)$s['dia_semana'] !== (int)$t['dia_semana']) ||
                       ($s['docente_id'] !== $t['docente_id']);

        if (!$isDifferent) {
            // Iguales: sin conflicto
            $merged[$sesionId] = $targetAsig[$sesionId];
        } else {
            // Conflicto
            $conflicts[] = [
                'sesion_id' => $sesionId,
                'source' => $s,
                'target' => $t
            ];

            // Resolver segun strategy
            if ($strategy === 'source_wins') {
                $merged[$sesionId] = $sourceAsig[$sesionId];
            } elseif ($strategy === 'target_wins') {
                $merged[$sesionId] = $targetAsig[$sesionId];
            }
            // manual: no agregar, el usuario debe resolver
        }
    }
}

// Si hay conflictos y strategy es manual, devolver conflictos sin mergear
if ($strategy === 'manual' && !empty($conflicts)) {
    // Si el usuario envio resoluciones, aplicarlas
    $resoluciones = isset($data['resoluciones']) ? $data['resoluciones'] : [];

    if (empty($resoluciones)) {
        jsonResponse([
            'success' => false,
            'conflicts' => $conflicts,
            'conflicts_count' => count($conflicts),
            'message' => 'Hay conflictos que requieren resolucion manual. Envie resoluciones.'
        ]);
    }

    // Aplicar resoluciones
    foreach ($resoluciones as $resolucion) {
        $sid = $resolucion['sesion_id'];
        $elegido = $resolucion['elegir']; // 'source' o 'target'
        if ($elegido === 'source' && isset($sourceAsig[$sid])) {
            $merged[$sid] = $sourceAsig[$sid];
        } elseif ($elegido === 'target' && isset($targetAsig[$sid])) {
            $merged[$sid] = $targetAsig[$sid];
        }
    }
}

// Crear commit de merge en el target branch
$commitId = generateUUID();

$pdo->beginTransaction();

try {
    // Insertar commit
    $stmt = $pdo->prepare(
        "INSERT INTO horario_commits (id, branch_id, commit_padre_id, mensaje, tipo, autor_id, metadata, score_global)
         VALUES (?, ?, ?, ?, 'merge', ?, ?, ?)"
    );

    $metadata = json_encode([
        'source_branch_id' => $sourceBranchId,
        'source_commit_id' => $sourceCommitId,
        'target_commit_id' => $targetCommitId,
        'strategy' => $strategy,
        'conflicts_count' => count($conflicts)
    ]);

    // Calcular score promedio
    $scores = array_filter(array_map(function($a) { return $a['score']; }, $merged), function($s) { return $s !== null; });
    $scoreGlobal = !empty($scores) ? round(array_sum($scores) / count($scores), 1) : null;

    $stmt->execute([
        $commitId,
        $targetBranchId,
        $targetCommitId,
        sanitizeString($data['mensaje']),
        $_SESSION['user_id'],
        $metadata,
        $scoreGlobal
    ]);

    // Bulk insert de asignaciones mergeadas
    $insertStmt = $pdo->prepare(
        "INSERT INTO horario_asignaciones (id, commit_id, sesion_id, sala_id, bloque_id, dia_semana, docente_id, score, explicacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    foreach ($merged as $sesionId => $asig) {
        $insertStmt->execute([
            generateUUID(),
            $commitId,
            $sesionId,
            $asig['sala_id'],
            $asig['bloque_id'],
            $asig['dia_semana'],
            $asig['docente_id'],
            $asig['score'],
            $asig['explicacion']
        ]);
    }

    // Actualizar timestamp del target branch
    $pdo->prepare("UPDATE horario_branches SET updated_at = datetime('now') WHERE id = ?")
        ->execute([$targetBranchId]);

    $pdo->commit();

    jsonResponse([
        'success' => true,
        'data' => [
            'commit_id' => $commitId,
            'total_asignaciones' => count($merged),
            'conflicts_resolved' => count($conflicts),
            'score_global' => $scoreGlobal
        ],
        'message' => 'Merge completado'
    ], 201);
} catch (PDOException $e) {
    $pdo->rollBack();
    securityLog('DB_ERROR', 'merge: ' . $e->getMessage());
    jsonResponse(['error' => 'Error al realizar merge'], 500);
}

// --- Helpers ---

function getLatestCommitId($pdo, $branchId) {
    $stmt = $pdo->prepare(
        "SELECT id FROM horario_commits WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->execute([$branchId]);
    $row = $stmt->fetch();
    return $row ? $row['id'] : null;
}

function loadAsignaciones($pdo, $commitId) {
    $stmt = $pdo->prepare(
        "SELECT a.*, s.etiqueta as sesion_etiqueta, s.tipo as sesion_tipo,
                sa.name as sala_nombre, d.name as docente_nombre
         FROM horario_asignaciones a
         LEFT JOIN sesiones s ON a.sesion_id = s.id
         LEFT JOIN salas sa ON a.sala_id = sa.id
         LEFT JOIN docentes d ON a.docente_id = d.id
         WHERE a.commit_id = ?"
    );
    $stmt->execute([$commitId]);
    $rows = $stmt->fetchAll();

    $indexed = [];
    foreach ($rows as $row) {
        $row['dia_semana'] = $row['dia_semana'] !== null ? (int)$row['dia_semana'] : null;
        $row['score'] = $row['score'] !== null ? (int)$row['score'] : null;
        $indexed[$row['sesion_id']] = $row;
    }
    return $indexed;
}
?>
