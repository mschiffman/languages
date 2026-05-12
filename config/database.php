<?php
declare(strict_types=1);

/**
 * Returns a shared PDO instance configured for the RM Lives project.
 *
 * Update the default credentials to match your MySQL setup, or override them
 * by defining the RMLIVES_DB_* environment variables in your hosting
 * configuration.
 */
function rmlives_get_pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('RMLIVES_DB_HOST') ?: '127.0.0.1';
    $port = getenv('RMLIVES_DB_PORT') ?: '3306';
    $dbname = getenv('RMLIVES_DB_NAME') ?: 'rmlives';
    $user = getenv('RMLIVES_DB_USER') ?: 'root';
    $password = getenv('RMLIVES_DB_PASS') ?: '';

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $dbname);

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $password, $options);
    } catch (PDOException $exception) {
        throw new RuntimeException('Unable to connect to the RM Lives database.', 0, $exception);
    }

    return $pdo;
}

/**
 * Ensures a non-negative integer value (stored as UNSIGNED in MySQL).
 */
function rmlives_to_unsigned_int(mixed $value): int
{
    $numeric = is_numeric($value) ? (int) $value : 0;

    return max(0, $numeric);
}
