<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../config/database.php';

const RMLIVES_ALLOWED_REACTIONS = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

try {
    $pdo = rmlives_get_pdo();
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed.']);
    exit;
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    handle_get_request($pdo);
    exit;
}

if ($method === 'POST') {
    handle_post_request($pdo);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed.']);

function handle_get_request(PDO $pdo): void
{
    $episodeParam = isset($_GET['episode']) ? trim((string) $_GET['episode']) : '';

    if ($episodeParam === '') {
        respond_with_error('The "episode" query parameter is required.', 400);
    }

    $episodeIds = array_map('trim', explode(',', $episodeParam));
    $metrics = load_episode_metrics($pdo, $episodeIds);

    respond_with_success(['metrics' => $metrics]);
}

function handle_post_request(PDO $pdo): void
{
    try {
        $payload = json_decode(file_get_contents('php://input') ?: 'null', true, 512, JSON_THROW_ON_ERROR);
    } catch (Throwable $exception) {
        respond_with_error('Invalid JSON payload.', 400);
    }

    if (!is_array($payload)) {
        respond_with_error('Invalid request body.', 400);
    }

    $action = isset($payload['action']) ? (string) $payload['action'] : '';

    try {
        switch ($action) {
            case 'sync':
                $episodeIds = $payload['episodeIds'] ?? [];
                if (!is_array($episodeIds)) {
                    respond_with_error('The "episodeIds" field must be an array.', 400);
                }
                $metrics = load_episode_metrics($pdo, $episodeIds, true);
                respond_with_success(['metrics' => $metrics]);
                return;

            case 'reaction':
                $episodeId = sanitize_episode_id($payload['episodeId'] ?? null);
                $reaction = sanitize_reaction_type($payload['reaction'] ?? null, allowNull: true);
                $previousReaction = sanitize_reaction_type($payload['previousReaction'] ?? null, allowNull: true);
                $metrics = apply_reaction_change($pdo, $episodeId, $reaction, $previousReaction);
                respond_with_success(['metrics' => $metrics]);
                return;

            case 'share':
                $episodeId = sanitize_episode_id($payload['episodeId'] ?? null);
                $metrics = increment_share_counter($pdo, $episodeId);
                respond_with_success(['metrics' => $metrics]);
                return;

            default:
                respond_with_error('Unsupported action.', 400);
        }
    } catch (InvalidArgumentException $exception) {
        respond_with_error($exception->getMessage(), 400);
    } catch (Throwable $exception) {
        error_log('RM Lives API error: ' . $exception->getMessage());
        respond_with_error('An unexpected server error occurred.', 500);
    }
}

function load_episode_metrics(PDO $pdo, array $episodeIds, bool $initialize = false): array
{
    $validIds = [];

    foreach ($episodeIds as $candidate) {
        if (!is_string($candidate)) {
            continue;
        }

        try {
            $validIds[] = sanitize_episode_id($candidate);
        } catch (InvalidArgumentException $exception) {
            continue;
        }
    }

    $validIds = array_values(array_unique($validIds));

    if (empty($validIds)) {
        return [];
    }

    if ($initialize) {
        ensure_episode_rows($pdo, $validIds);
    }

    $placeholders = implode(',', array_fill(0, count($validIds), '?'));
    $query = 'SELECT episode_id, reaction_like, reaction_love, reaction_care, reaction_haha, reaction_wow, '
           . 'reaction_sad, reaction_angry, share_count, comment_count '
           . 'FROM episode_metrics WHERE episode_id IN (' . $placeholders . ')';

    $statement = $pdo->prepare($query);
    $statement->execute($validIds);
    $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

    $indexed = [];
    foreach ($rows as $row) {
        $episodeId = (string) $row['episode_id'];
        $indexed[$episodeId] = build_metrics_array($episodeId, $row);
    }

    foreach ($validIds as $episodeId) {
        if (!isset($indexed[$episodeId])) {
            $indexed[$episodeId] = build_metrics_array($episodeId, []);
        }
    }

    return $indexed;
}

function apply_reaction_change(PDO $pdo, string $episodeId, ?string $reaction, ?string $previousReaction): array
{
    ensure_episode_rows($pdo, [$episodeId]);

    $pdo->beginTransaction();

    try {
        $row = fetch_episode_row($pdo, $episodeId, true);
        $counts = extract_reaction_counts($row);

        if ($previousReaction !== null && isset($counts[$previousReaction])) {
            $counts[$previousReaction] = max(0, $counts[$previousReaction] - 1);
        }

        if ($reaction !== null) {
            if (!isset($counts[$reaction])) {
                throw new InvalidArgumentException('Unsupported reaction type.');
            }
            $counts[$reaction] += 1;
        }

        $update = $pdo->prepare(
            'UPDATE episode_metrics SET '
            . 'reaction_like = :like, reaction_love = :love, reaction_care = :care, reaction_haha = :haha, '
            . 'reaction_wow = :wow, reaction_sad = :sad, reaction_angry = :angry '
            . 'WHERE episode_id = :episode_id'
        );

        $update->execute([
            ':like' => $counts['like'],
            ':love' => $counts['love'],
            ':care' => $counts['care'],
            ':haha' => $counts['haha'],
            ':wow' => $counts['wow'],
            ':sad' => $counts['sad'],
            ':angry' => $counts['angry'],
            ':episode_id' => $episodeId,
        ]);

        $pdo->commit();

        $row['reaction_like'] = $counts['like'];
        $row['reaction_love'] = $counts['love'];
        $row['reaction_care'] = $counts['care'];
        $row['reaction_haha'] = $counts['haha'];
        $row['reaction_wow'] = $counts['wow'];
        $row['reaction_sad'] = $counts['sad'];
        $row['reaction_angry'] = $counts['angry'];

        return build_metrics_array($episodeId, $row);
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function increment_share_counter(PDO $pdo, string $episodeId): array
{
    ensure_episode_rows($pdo, [$episodeId]);

    $update = $pdo->prepare('UPDATE episode_metrics SET share_count = share_count + 1 WHERE episode_id = :episode_id');
    $update->execute([':episode_id' => $episodeId]);

    $row = fetch_episode_row($pdo, $episodeId, false);

    return build_metrics_array($episodeId, $row);
}

function fetch_episode_row(PDO $pdo, string $episodeId, bool $lock): array
{
    $query = 'SELECT episode_id, reaction_like, reaction_love, reaction_care, reaction_haha, reaction_wow, '
           . 'reaction_sad, reaction_angry, share_count, comment_count FROM episode_metrics WHERE episode_id = :episode_id';

    if ($lock) {
        $query .= ' FOR UPDATE';
    }

    $statement = $pdo->prepare($query);
    $statement->execute([':episode_id' => $episodeId]);
    $row = $statement->fetch(PDO::FETCH_ASSOC);

    if ($row === false) {
        return [
            'episode_id' => $episodeId,
            'reaction_like' => 0,
            'reaction_love' => 0,
            'reaction_care' => 0,
            'reaction_haha' => 0,
            'reaction_wow' => 0,
            'reaction_sad' => 0,
            'reaction_angry' => 0,
            'share_count' => 0,
            'comment_count' => 0,
        ];
    }

    return $row;
}

function extract_reaction_counts(array $row): array
{
    return [
        'like' => rmlives_to_unsigned_int($row['reaction_like'] ?? 0),
        'love' => rmlives_to_unsigned_int($row['reaction_love'] ?? 0),
        'care' => rmlives_to_unsigned_int($row['reaction_care'] ?? 0),
        'haha' => rmlives_to_unsigned_int($row['reaction_haha'] ?? 0),
        'wow' => rmlives_to_unsigned_int($row['reaction_wow'] ?? 0),
        'sad' => rmlives_to_unsigned_int($row['reaction_sad'] ?? 0),
        'angry' => rmlives_to_unsigned_int($row['reaction_angry'] ?? 0),
    ];
}

function ensure_episode_rows(PDO $pdo, array $episodeIds): void
{
    if (empty($episodeIds)) {
        return;
    }

    $statement = $pdo->prepare(
        'INSERT INTO episode_metrics (episode_id) VALUES (:episode_id) '
        . 'ON DUPLICATE KEY UPDATE updated_at = updated_at'
    );

    foreach ($episodeIds as $episodeId) {
        $statement->execute([':episode_id' => $episodeId]);
    }
}

function build_metrics_array(string $episodeId, array $row): array
{
    return [
        'episodeId' => $episodeId,
        'counts' => extract_reaction_counts($row),
        'shareCount' => rmlives_to_unsigned_int($row['share_count'] ?? 0),
        'commentCount' => rmlives_to_unsigned_int($row['comment_count'] ?? 0),
    ];
}

function sanitize_episode_id(mixed $value): string
{
    if (!is_string($value)) {
        throw new InvalidArgumentException('Episode ID must be a string.');
    }

    $episodeId = trim($value);

    if ($episodeId === '') {
        throw new InvalidArgumentException('Episode ID cannot be empty.');
    }

    if (strlen($episodeId) > 128) {
        throw new InvalidArgumentException('Episode ID is too long.');
    }

    if (!preg_match('/^[A-Za-z0-9_-]+$/', $episodeId)) {
        throw new InvalidArgumentException('Episode ID contains invalid characters.');
    }

    return $episodeId;
}

function sanitize_reaction_type(mixed $value, bool $allowNull = false): ?string
{
    if ($value === null) {
        if ($allowNull) {
            return null;
        }

        throw new InvalidArgumentException('Reaction type cannot be null.');
    }

    if (!is_string($value)) {
        throw new InvalidArgumentException('Reaction type must be a string.');
    }

    $reaction = strtolower(trim($value));

    if ($reaction === '') {
        if ($allowNull) {
            return null;
        }

        throw new InvalidArgumentException('Reaction type cannot be empty.');
    }

    if (!in_array($reaction, RMLIVES_ALLOWED_REACTIONS, true)) {
        throw new InvalidArgumentException('Unsupported reaction type.');
    }

    return $reaction;
}


function respond_with_success(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function respond_with_error(string $message, int $status): void
{
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}
include 'config/database.php';
