<?php
// backend/api/diff.php
// Compara dos commits o dos branches del sistema de versionado
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Metodo no permitido'], 405);
}

requireAuth();

$commitA = isset($_GET['commit_a']) ? $_GET['commit_a'] : null;
$commitB = isset($_GET['commit_b']) ? $_GET['commit_b'] : null;
$branchA = isset($_GET['branch_a']) ? $_GET['branch_a'] : null;
$branchB = isset($_GET['branch_b']) ? $_GET['branch_b'] : null;

// Si se pasan branches, resolver a sus ultimos commits
if ($branchA && $branchB) {
    $commitA = getLatestCommitId($pdo, $branchA);
    $commitB = getLatestCommitId($pdo, $branchB);
    if (!$commitA) {
        jsonResponse(['error' => 'Branch A no tiene commits'], 400);
    }
    if (!$commitB) {
        jsonResponse(['error' => 'Branch B no tiene commits'], 400);
    }
}

if (empty($commitA) || empty($commitB)) {
    jsonResponse(['error' => 'Se requieren commit_a y commit_b, o branch_a y branch_b'], 400);
}

if ($commitA === $commitB) {
    jsonResponse(['success' => true, 'data' => [
        'added' => [], 'removed' => [], 'moved' => [],
        'unchanged_count' => 0, 'score_a' => null, 'score_b' => null
    ]]);
}

// Cargar asignaciones de ambos commits indexadas por sesion_id
$asigA = loadAsignaciones($pdo, $commitA);
$asigB = loadAsignaciones($pdo, $commitB);

// Obtener scores
$scoreA = getCommitScore($pdo, $commitA);
$scoreB = getCommitScore($pdo, $commitB);

// Calcular diff
$added = [];
$removed = [];
$moved = [];
$unchangedCount = 0;

$sesionesA = array_keys($asigA);
$sesionesB = array_keys($asigB);

$allSesiones = array_unique(array_merge($sesionesA, $sesionesB));

foreach ($allSesiones as $sesionId) {
    $inA = isset($asigA[$sesionId]);
    $inB = isset($asigB[$sesionId]);

    if ($inB && !$inA) {
        // Nueva en B
        $added[] = $asigB[$sesionId];
    } elseif ($inA && !$inB) {
        // Eliminada en B
        $removed[] = $asigA[$sesionId];
    } else {
        // Existe en ambos: comparar ubicacion
        $a = $asigA[$sesionId];
        $b = $asigB[$sesionId];

        $changed = ($a['sala_id'] !== $b['sala_id']) ||
                   ($a['bloque_id'] !== $b['bloque_id']) ||
                   ((int)$a['dia_semana'] !== (int)$b['dia_semana']) ||
                   ($a['docente_id'] !== $b['docente_id']);

        if ($changed) {
            $moved[] = [
                'sesion_id' => $sesionId,
                'antes' => $a,
                'despues' => $b
            ];
        } else {
            $unchangedCount++;
        }
    }
}

jsonResponse(['success' => true, 'data' => [
    'commit_a' => $commitA,
    'commit_b' => $commitB,
    'added' => $added,
    'removed' => $removed,
    'moved' => $moved,
    'added_count' => count($added),
    'removed_count' => count($removed),
    'moved_count' => count($moved),
    'unchanged_count' => $unchangedCount,
    'score_a' => $scoreA,
    'score_b' => $scoreB
]]);

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
                sa.name as sala_nombre, sa.code as sala_code,
                bl.nombre as bloque_nombre,
                d.name as docente_nombre
         FROM horario_asignaciones a
         LEFT JOIN sesiones s ON a.sesion_id = s.id
         LEFT JOIN salas sa ON a.sala_id = sa.id
         LEFT JOIN bloques_horarios bl ON a.bloque_id = bl.id
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

function getCommitScore($pdo, $commitId) {
    $stmt = $pdo->prepare("SELECT score_global FROM horario_commits WHERE id = ?");
    $stmt->execute([$commitId]);
    $row = $stmt->fetch();
    return $row && $row['score_global'] !== null ? (float)$row['score_global'] : null;
}
?>
