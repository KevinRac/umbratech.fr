-- Schéma de la communauté GW1 (MySQL / MariaDB).
-- À importer une seule fois via phpMyAdmin (IONOS) dans la base créée pour le site.

CREATE TABLE IF NOT EXISTS users (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  email        VARCHAR(254) NOT NULL,
  display_name VARCHAR(64)  NOT NULL,
  is_admin     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   BIGINT       NOT NULL,
  UNIQUE KEY users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_codes (
  email      VARCHAR(254) NOT NULL PRIMARY KEY,
  code_hash  CHAR(64)     NOT NULL,
  expires_at BIGINT       NOT NULL,
  attempts   INT          NOT NULL DEFAULT 0,
  created_at BIGINT       NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  expires_at BIGINT   NOT NULL,
  created_at BIGINT   NOT NULL,
  KEY sessions_user (user_id),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS builds (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  name        VARCHAR(60)  NOT NULL,
  description VARCHAR(280) NOT NULL DEFAULT '',
  bar         TEXT         NOT NULL,
  p1          TINYINT      NULL,
  p2          TINYINT      NULL,
  ranks       TEXT         NOT NULL,
  code        VARCHAR(80)  NOT NULL DEFAULT '',
  search_text TEXT         NOT NULL,
  created_at  BIGINT       NOT NULL,
  updated_at  BIGINT       NOT NULL,
  KEY builds_user (user_id),
  KEY builds_updated (updated_at),
  CONSTRAINT builds_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_hits (
  k  CHAR(64) NOT NULL,
  ts BIGINT   NOT NULL,
  KEY rate_k_ts (k, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
