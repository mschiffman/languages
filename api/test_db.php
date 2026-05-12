<?php
declare(strict_types=1);

// Include your database configuration file
require_once __DIR__ . '/../config/database.php';

try {
    // Try to get a PDO connection using your helper function
    $pdo = rmlives_get_pdo();

    // If we reach this line, the connection worked
    echo "<h2 style='color:green;'>✅ Connection successful!</h2>";

    // Optional: list tables to double-check
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<p>Found tables: <strong>" . implode(', ', $tables) . "</strong></p>";

} catch (Throwable $e) {
    // If something goes wrong, show the error
    echo "<h2 style='color:red;'>❌ Connection failed:</h2>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}
?>