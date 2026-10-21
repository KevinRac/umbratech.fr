<?php
declare(strict_types=1);

const SESSION_COOKIE = 'gw1_session';
const SESSION_DAYS   = 365;  // durée glissante : prolongée à chaque visite
const CODE_TTL       = 600;   // validité du code : 10 minutes
const MAX_BUILDS     = 200;

function cfg(string $key, mixed $default = null): mixed
{
    static $c = null;
    if ($c === null) {
        $f = __DIR__ . '/../config.local.php';
        $c = is_file($f) ? (require $f) : [];
        if (!is_array($c)) $c = [];
    }
    return $c[$key] ?? $default;
}

function out(int $status, array $data): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(int $status, string $code, string $message): never
{
    out($status, ['error' => $code, 'message' => $message]);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = cfg('db_dsn') ?: sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', cfg('db_host', 'localhost'), cfg('db_name', ''));
    $pdo = new PDO($dsn, cfg('db_user'), cfg('db_pass'), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function secret(): string
{
    $s = (string) cfg('secret', '');
    if (strlen($s) < 32) throw new RuntimeException('config: "secret" manquant ou trop court (32 caractères minimum)');
    return $s;
}

function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return sprintf('%s-%s-%s-%s-%s', substr($h, 0, 8), substr($h, 8, 4), substr($h, 12, 4), substr($h, 16, 4), substr($h, 20));
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/** Limite de débit : renvoie false si le plafond est atteint, sinon enregistre l'appel. */
function rate_hit(string $scope, string $who, int $max, int $window): bool
{
    $k   = hash_hmac('sha256', $scope . '|' . $who, secret());
    $now = time();
    $st  = db()->prepare('SELECT COUNT(*) FROM rate_hits WHERE k = ? AND ts > ?');
    $st->execute([$k, $now - $window]);
    if ((int) $st->fetchColumn() >= $max) return false;
    db()->prepare('INSERT INTO rate_hits (k, ts) VALUES (?, ?)')->execute([$k, $now]);
    return true;
}

/** Nettoyage occasionnel des données périmées. */
function purge_expired(): void
{
    if (random_int(1, 50) !== 1) return;
    $now = time();
    db()->prepare('DELETE FROM sessions WHERE expires_at < ?')->execute([$now]);
    db()->prepare('DELETE FROM login_codes WHERE expires_at < ?')->execute([$now]);
    db()->prepare('DELETE FROM rate_hits WHERE ts < ?')->execute([$now - 86400]);
}

function cookie_path(): string
{
    $p = rtrim(dirname(dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/gw1/api/index.php'))), '/');
    return ($p === '' ? '' : $p) . '/';
}

function set_session_cookie(string $value, int $expires): void
{
    setcookie(SESSION_COOKIE, $value, [
        'expires'  => $expires,
        'path'     => cookie_path(),
        'secure'   => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function current_user(): ?array
{
    $t = (string) ($_COOKIE[SESSION_COOKIE] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $t)) return null;
    $st = db()->prepare(
        'SELECT u.id, u.display_name, u.is_admin, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?'
    );
    $st->execute([hash('sha256', $t), time()]);
    $u = $st->fetch();
    if ($u && (int) $u['expires_at'] < time() + (SESSION_DAYS - 1) * 86400) {
        // session glissante : au plus une prolongation par jour (évite une écriture à chaque requête)
        $exp = time() + SESSION_DAYS * 86400;
        db()->prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')->execute([$exp, hash('sha256', $t)]);
        set_session_cookie($t, $exp);
    }
    return $u ? ['id' => $u['id'], 'display_name' => $u['display_name'], 'is_admin' => (bool) (int) $u['is_admin']] : null;
}

function require_user(): array
{
    $u = current_user();
    if (!$u) fail(401, 'auth', 'Connexion requise.');
    return $u;
}

function create_session(string $userId): void
{
    $token = bin2hex(random_bytes(32));
    $exp   = time() + SESSION_DAYS * 86400;
    db()->prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $userId, $exp, time()]);
    set_session_cookie($token, $exp);
}

function read_json(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 2_000_001);
    if ($raw === false || strlen($raw) > 2_000_000) fail(413, 'too_large', 'Requête trop volumineuse.');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function ts_iso(int $t): string
{
    return gmdate('Y-m-d\TH:i:s\Z', $t);
}
