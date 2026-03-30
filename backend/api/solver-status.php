<?php
// backend/api/solver-status.php
// Estado de la última propuesta del solver para una temporada
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Método no permitido'], 405);
}

requireAuth();

$temporadaId = isset($_GET['temporada_id']) ? $_GET['temporada_id'] : null;

if (empty($temporadaId)) {
    $stmt = $pdo->query("SELECT id FROM temporadas WHERE activa = 1 LIMIT 1");
    $row = $stmt->fetch();
    if ($row) {
        $temporadaId = $row['id'];
    } else {
        jsonResponse(['error' => 'temporada_id requerido o debe haber una temporada activa'], 400);
    }
}

// Buscar branches de la temporada
$stmt = $pdo->prepare(
    "SELECT b.id, b.nombre, b.estado, b.es_principal, b.created_at, b.updated_at,
            u.name as autor_nombre
     FROM horario_branches b
     JOIN users u ON b.created_by = u.id
     WHERE b.temporada_id = ?
     ORDER BY b.es_principal DESC, b.updated_at DESC"
);
$stmt->execute([$temporadaId]);
$branches = $stmt->fetchAll();

if (empty($branches)) {
    jsonResponse(['success' => true, 'data' => [
        'temporada_id' => $temporadaId,
        'tiene_propuestas' => false,
        'branches' => [],
        'ultimo_solver' => null,
        'tag_publicado' => null
    ]]);
}

// Info de cada branch
foreach ($branches as &$branch) {
    $branch['es_principal'] = (bool)$branch['es_principal'];

    // Último commit
    $stmt = $pdo->prepare(
        "SELECT c.id, c.mensaje, c.tipo, c.score_global, c.created_at,
                (SELECT COUNT(*) FROM horario_asignaciones WHERE commit_id = c.id) as total_asignaciones
         FROM horario_commits c
         WHERE c.branch_id = ?
         ORDER BY c.created_at DESC LIMIT 1"
    );
    $stmt->execute([$branch['id']]);
    $ultimoCommit = $stmt->fetch();

    if ($ultimoCommit) {
        $branch['ultimo_commit'] = [
            'id' => $ultimoCommit['id'],
            'mensaje' => $ultimoCommit['mensaje'],
            'tipo' => $ultimoCommit['tipo'],
            'score_global' => $ultimoCommit['score_global'] !== null ? (float)$ultimoCommit['score_global'] : null,
            'total_asignaciones' => (int)$ultimoCommit['total_asignaciones'],
            'created_at' => $ultimoCommit['created_at']
        ];
    } else {
        $branch['ultimo_commit'] = null;
    }

    // Total commits
    $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM horario_commits WHERE branch_id = ?");
    $stmt->execute([$branch['id']]);
    $branch['total_commits'] = (int)$stmt->fetch()['c'];
}

// Último commit tipo solver en cualquier branch
$stmt = $pdo->prepare(
    "SELECT c.id, c.mensaje, c.score_global, c.created_at, c.metadata,
            b.nombre as branch_nombre, b.id as branch_id,
            (SELECT COUNT(*) FROM horario_asignaciones WHERE commit_id = c.id) as total_asignaciones
     FROM horario_commits c
     JOIN horario_branches b ON c.branch_id = b.id
     WHERE b.temporada_id = ? AND c.tipo = 'solver'
     ORDER BY c.created_at DESC LIMIT 1"
);
$stmt->execute([$temporadaId]);
$ultimoSolver = $stmt->fetch();

if ($ultimoSolver) {
    $ultimoSolver['score_global'] = $ultimoSolver['score_global'] !== null ? (float)$ultimoSolver['score_global'] : null;
    $ultimoSolver['total_asignaciones'] = (int)$ultimoSolver['total_asignaciones'];
    if ($ultimoSolver['metadata']) {
        $ultimoSolver['metadata'] = json_decode($ultimoSolver['metadata'], true);
    }
}

// Tag publicado actual
$stmt = $pdo->prepare(
    "SELECT t.*, c.score_global, b.nombre as branch_nombre
     FROM horario_tags t
     JOIN horario_commits c ON t.commit_id = c.id
     JOIN horario_branches b ON c.branch_id = b.id
     WHERE b.temporada_id = ?
     ORDER BY t.created_at DESC LIMIT 1"
);
$stmt->execute([$temporadaId]);
$tagPublicado = $stmt->fetch();

if ($tagPublicado) {
    $tagPublicado['score_global'] = $tagPublicado['score_global'] !== null ? (float)$tagPublicado['score_global'] : null;
}

// Total de sesiones de la temporada
$stmt = $pdo->prepare(
    "SELECT COUNT(*) as c FROM sesiones WHERE temporada_id = ? OR temporada_id IS NULL"
);
$stmt->execute([$temporadaId]);
$totalSesiones = (int)$stmt->fetch()['c'];

jsonResponse(['success' => true, 'data' => [
    'temporada_id' => $temporadaId,
    'tiene_propuestas' => true,
    'total_sesiones' => $totalSesiones,
    'total_branches' => count($branches),
    'branches' => $branches,
    'ultimo_solver' => $ultimoSolver ?: null,
    'tag_publicado' => $tagPublicado ?: null
]]);
?>
