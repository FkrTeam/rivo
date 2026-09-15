-- RIVO - contact form storage.
--
-- api/contact.php creates this table on its own the first time it runs, so this
-- file is only here for review, for a manual import in phpMyAdmin, or to add
-- the indexes to a table that already exists.

CREATE TABLE IF NOT EXISTS `contact_messages` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
