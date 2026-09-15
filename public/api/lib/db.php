<?php
/**
 * RIVO - contact storage (MySQL over PDO).
 *
 * Prepared statements only, utf8mb4, emulation off, exceptions on. The table is
 * created on first use so a fresh hosting account needs no manual import
 * (api/schema.sql is the same DDL for phpMyAdmin).
 */

declare(strict_types=1);

function rivo_db(array $config): PDO
{
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], (int) $config['port'], $config['name']);
    return new PDO($dsn, (string) $config['user'], (string) $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

/** Table names cannot be bound, so the configured name is whitelisted by shape. */
function rivo_table(array $config): string
{
    $table = (string) ($config['table'] ?? 'contact_messages');
    if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $table)) throw new RuntimeException('invalid table name');
    return '`' . $table . '`';
}

function rivo_db_migrate(PDO $db, string $table): void
{
    $db->exec(
        "CREATE TABLE IF NOT EXISTS $table (
            `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `created_at`   DATETIME        NOT NULL,
            `name`         VARCHAR(120)    NOT NULL,
            `email`        VARCHAR(190)    NOT NULL,
            `phone`        VARCHAR(60)         NULL,
            `company`      VARCHAR(160)        NULL,
            `project_type` VARCHAR(60)         NULL,
            `message`      TEXT            NOT NULL,
            `ip`           VARBINARY(16)       NULL,
            `user_agent`   VARCHAR(255)        NULL,
            `referer`      VARCHAR(255)        NULL,
            `mail_status`  VARCHAR(16)     NOT NULL DEFAULT 'pending',
            PRIMARY KEY (`id`),
            KEY `idx_created` (`created_at`),
            KEY `idx_ip_created` (`ip`, `created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

/** How many messages this address has sent in the last hour. */
function rivo_db_recent_count(PDO $db, string $table, ?string $ipBinary): int
{
    if ($ipBinary === null) return 0;
    $stmt = $db->prepare("SELECT COUNT(*) FROM $table WHERE `ip` = ? AND `created_at` >= (UTC_TIMESTAMP() - INTERVAL 1 HOUR)");
    $stmt->execute([$ipBinary]);
    return (int) $stmt->fetchColumn();
}

function rivo_db_insert(PDO $db, string $table, array $row): int
{
    $stmt = $db->prepare(
        "INSERT INTO $table (`created_at`, `name`, `email`, `phone`, `company`, `project_type`, `message`, `ip`, `user_agent`, `referer`, `mail_status`)
         VALUES (UTC_TIMESTAMP(), :name, :email, :phone, :company, :project_type, :message, :ip, :user_agent, :referer, 'pending')"
    );
    $stmt->execute([
        ':name' => $row['name'],
        ':email' => $row['email'],
        ':phone' => $row['phone'],
        ':company' => $row['company'],
        ':project_type' => $row['project_type'],
        ':message' => $row['message'],
        ':ip' => $row['ip'],
        ':user_agent' => $row['user_agent'],
        ':referer' => $row['referer'],
    ]);
    return (int) $db->lastInsertId();
}

function rivo_db_mark_mail(PDO $db, string $table, int $id, string $status): void
{
    $stmt = $db->prepare("UPDATE $table SET `mail_status` = ? WHERE `id` = ?");
    $stmt->execute([$status, $id]);
}
