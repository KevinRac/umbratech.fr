-- Vaelmor : comptes et sauvegardes en ligne (lot M9b, GDD §14.3).
-- MySQL / MariaDB. À importer une seule fois via phpMyAdmin (IONOS), dans la base
-- créée pour Vaelmor (séparée de celle de gw1). Réimporter ne casse rien : chaque
-- table n'est créée que si elle n'existe pas.

-- Joueurs : un compte par adresse e-mail.
CREATE TABLE IF NOT EXISTS users (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  email      VARCHAR(254) NOT NULL,
  created_at BIGINT       NOT NULL,
  UNIQUE KEY users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Codes de connexion à 6 chiffres (10 minutes, 5 essais, usage unique). Le code n'est jamais stocké en clair.
CREATE TABLE IF NOT EXISTS login_codes (
  email      VARCHAR(254) NOT NULL PRIMARY KEY,
  code_hash  CHAR(64)     NOT NULL,
  expires_at BIGINT       NOT NULL,
  attempts   INT          NOT NULL DEFAULT 0,
  created_at BIGINT       NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions (cookie HttpOnly d'un an, prolongé à l'usage). Seule l'empreinte du jeton est stockée.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  expires_at BIGINT   NOT NULL,
  created_at BIGINT   NOT NULL,
  KEY sessions_user (user_id),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sauvegardes : une ligne par joueur et par emplacement (auto, slot1, slot2, slot3).
-- `envelope` est la sauvegarde telle que le jeu l'écrit (JSON, 200 Ko au plus) ;
-- `rev` augmente à chaque écriture (contrôle des conflits entre deux appareils).
CREATE TABLE IF NOT EXISTS saves (
  user_id    CHAR(36)    NOT NULL,
  slot       VARCHAR(8)  NOT NULL,
  envelope   MEDIUMTEXT  NOT NULL,
  checksum   CHAR(8)     NOT NULL,
  saved_at   VARCHAR(32) NOT NULL,
  meta       TEXT        NOT NULL,
  size       INT         NOT NULL,
  rev        INT         NOT NULL,
  updated_at BIGINT      NOT NULL,
  PRIMARY KEY (user_id, slot),
  CONSTRAINT saves_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limitation du nombre de demandes (codes, vérifications, écritures).
CREATE TABLE IF NOT EXISTS rate_hits (
  k  CHAR(64) NOT NULL,
  ts BIGINT   NOT NULL,
  KEY rate_k_ts (k, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
