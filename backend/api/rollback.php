<?php
// backend/api/rollback.php
// Rollback: crea nuevo commit con las asignaciones de un commit anterior (no borra historial)
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Metodo no permitido'], 405);
}

requireRole('gestor');

$data = getJsonInput();

$required = ['branch_id', 'target_commit_id'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        jsonResponse(['error' => "Campo requerido: {$field}"], 400);
    }
}

$branchId = $data['branch_id'];
$targetCommitId = $data['target_commit_id'];
$mensaje = isset($data['mensaje']) ? sanitizeString($data['mensaje']) : null;

// Verificar que el branch existe
$stmt = $pdo->prepare("SELECT id FROM horario_branches WHERE id = ?");
$stmt->execute([$branchId]);
if (!$stmt->fetch()) {
    jsonResponse(['error' => 'Branch no encontrado'], 404);
}

// Verificar que el commit target existe y pertenece al branch
$stmt = $pdo->prepare("SELECT id, mensaje, score_global FROM horario_commits WHERE id = ? AND branch_id = ?");
$stmt->execute([$targetCommitId, $branchId]);
$targetCommit = $stmt->fetch();

if (!$targetCommit) {
    jsonResponse(['error' => 'Commit no encontrado en este branch'], 404);
}

// Obtener ultimo commit actual del branch
$stmt = $pdo->prepare(
    "SELECT id FROM horario_commits WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1"
);
$stmt->execute([$branchId]);
$ultimoCommit = $stmt->fetch();
$commitPadreId = $ultimoCommit ? $ultimoCommit['id'] : null;

// Cargar asignaciones del commit target
$stmt = $pdo->prepare("SELECT * FROM horario_asignaciones WHERE commit_id = ?");
$stmt->execute([$targetCommitId]);
$asignaciones = $stmt->fetchAll();

if (empty($mensaje)) {
    $mensaje = 'Rollback a: ' . $targetCommit['mensaje'];
}

$commitId = generateUUID();

$pdo->beginTransaction();

try {
    // Crear nuevo commit de rollback
    $stmt = $pdo->prepare(
        "INSERT INTO horario_commits (id, branch_id, commit_padre_id, mensaje, tipo, autor_id, metadata, score_global)
         VALUES (?, ?, ?, ?, 'rollback', ?, ?, ?)"
    );

    $metadata = json_encode([
        'rollback_to_commit_id' => $targetCommitId,
        'rollback_to_mensaje' => $targetCommit['mensaje']
    ]);

    $stmt->execute([
        $commitId,
        $branchId,
        $commitPadreId,
        $mensaje,
        $_SESSION['user_id'],
        $metadata,
        $targetCommit['score_global']
    ]);

    // Copiar asignaciones del commit target al nuevo commit
    $insertStmt = $pdo->prepare(
        "INSERT INTO horario_asignaciones (id, commit_id, sesion_id, sala_id, bloque_id, dia_semana, docente_id, score, explicacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    foreach ($asignaciones as $asig) {
        $insertStmt->execute([
            generateUUID(),
            $commitId,
            $asig['sesion_id'],
            $asig['sala_id'],
            $asig['bloque_id'],
            $asig['dia_semana'],
            $asig['docente_id'],
            $asig['score'],
            $asig['explicacion']
        ]);
    }

    // Actualizar timestamp del branch
    $pdo->prepare("UPDATE horario_branches SET updated_at = datetime('now') WHERE id = ?")
        ->execute([$branchId]);

    $pdo->commit();

    jsonResponse([
        'success' => true,
        'data' => [
            'commit_id' => $commitId,
            'rollback_to' => $targetCommitId,
            'total_asignaciones' => count($asignaciones),
            'score_global' => $targetCommit['score_global'] !== null ? (float)$targetCommit['score_global'] : null
        ],
        'message' => 'Rollback completado'
    ], 201);
} catch (PDOException $e) {
    $pdo->rollBack();
    securityLog('DB_ERROR', 'rollback: ' . $e->getMessage());
    jsonResponse(['error' => 'Error al realizar rollback'], 500);
}
?>
