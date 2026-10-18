<?php
declare(strict_types=1);

require __DIR__ . '/lib/common.php';
require __DIR__ . '/lib/smtp.php';

set_exception_handler(function (Throwable $e): void {
    error_log('[gw1] ' . $e);
    fail(500, 'server', 'Erreur serveur. Réessayez plus tard.');
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route  = (string) ($_GET['r'] ?? '');
if ($method !== 'GET' && $method !== 'POST') fail(405, 'method', 'Méthode non autorisée.');

$body = [];
if ($method === 'POST') {
    // Protection CSRF : en-tête personnalisé (impossible en cross-site sans préflight) + contrôle d'origine
    if (($_SERVER['HTTP_X_GW1'] ?? '') !== '1') fail(403, 'csrf', 'Requête refusée.');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && strcasecmp((string) parse_url($origin, PHP_URL_HOST), explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]) !== 0) {
        fail(403, 'csrf', 'Requête refusée.');
    }
    $body = read_json();
}

purge_expired_safe();

match ($route) {
    'auth/me'      => $method === 'GET'  ? route_me()            : fail(405, 'method', 'Méthode non autorisée.'),
    'auth/request' => $method === 'POST' ? route_request($body)  : fail(405, 'method', 'Méthode non autorisée.'),
    'auth/verify'  => $method === 'POST' ? route_verify($body)   : fail(405, 'method', 'Méthode non autorisée.'),
    'auth/logout'  => $method === 'POST' ? route_logout()        : fail(405, 'method', 'Méthode non autorisée.'),
    'profile'      => $method === 'POST' ? route_profile($body)  : fail(405, 'method', 'Méthode non autorisée.'),
    'builds/list'  => $method === 'GET'  ? route_list()          : fail(405, 'method', 'Méthode non autorisée.'),
    'builds/mine'  => $method === 'GET'  ? route_mine()          : fail(405, 'method', 'Méthode non autorisée.'),
    'builds/sync'  => $method === 'POST' ? route_sync($body)     : fail(405, 'method', 'Méthode non autorisée.'),
    'builds/delete'=> $method === 'POST' ? route_delete($body)   : fail(405, 'method', 'Méthode non autorisée.'),
    default        => fail(404, 'not_found', 'Route inconnue.'),
};

function purge_expired_safe(): void
{
    try { purge_expired(); } catch (Throwable $e) { /* sans gravité */ }
}

/* ------------------------------------------------------------------ */
/* Authentification par code envoyé par e-mail                         */
/* ------------------------------------------------------------------ */

function route_me(): never
{
    db()->query('SELECT 1');           // la base doit répondre, sinon le site passe en « mode local »
    out(200, ['user' => current_user()]);
}

function norm_email(mixed $v): ?string
{
    if (!is_string($v)) return null;
    $e = strtolower(trim($v));
    return (strlen($e) <= 254 && filter_var($e, FILTER_VALIDATE_EMAIL)) ? $e : null;
}

function code_hash(string $email, string $code): string
{
    return hash_hmac('sha256', $email . '|' . $code, secret());
}

function route_request(array $b): never
{
    $email = norm_email($b['email'] ?? null);
    if (!$email) fail(422, 'email', 'Saisissez une adresse e-mail valide.');

    if (!rate_hit('req-ip', client_ip(), 20, 3600) || !rate_hit('req-mail', $email, 5, 3600)) {
        fail(429, 'rate', 'Trop de demandes pour le moment. Réessayez dans quelques minutes.');
    }
    $st = db()->prepare('SELECT created_at FROM login_codes WHERE email = ?');
    $st->execute([$email]);
    $last = $st->fetchColumn();
    if ($last !== false && (int) $last > time() - 30) {
        fail(429, 'cooldown', 'Un code vient d\'être envoyé. Patientez quelques secondes avant d\'en redemander un.');
    }

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $now  = time();
    $pdo  = db();
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM login_codes WHERE email = ?')->execute([$email]);
    $pdo->prepare('INSERT INTO login_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)')
        ->execute([$email, code_hash($email, $code), $now + CODE_TTL, $now]);
    $pdo->commit();

    try {
        $site = (string) cfg('site_url', 'https://umbratech.fr/gw1/');
        send_mail(
            $email,
            "Votre code de connexion : $code",
            "Bonjour,\n\nVoici votre code de connexion au constructeur de builds Guild Wars 1 ($site) :\n\n    $code\n\n"
            . "Il est valable " . (CODE_TTL / 60) . " minutes et ne peut servir qu'une fois.\n"
            . "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.\n\n-- Umbratech\n"
        );
    } catch (Throwable $e) {
        error_log('[gw1] envoi du code impossible : ' . $e->getMessage());
        $pdo->prepare('DELETE FROM login_codes WHERE email = ?')->execute([$email]);
        fail(502, 'mail', 'L\'envoi de l\'e-mail a échoué. Réessayez plus tard.');
    }
    out(200, ['ok' => true, 'ttl' => CODE_TTL]);
}

function route_verify(array $b): never
{
    $email = norm_email($b['email'] ?? null);
    $code  = is_string($b['code'] ?? null) ? preg_replace('/\s+/', '', $b['code']) : '';
    if (!$email || !preg_match('/^\d{6}$/', (string) $code)) fail(422, 'code', 'Saisissez le code à 6 chiffres reçu par e-mail.');

    if (!rate_hit('verify-ip', client_ip(), 40, 3600)) {
        fail(429, 'rate', 'Trop de tentatives. Réessayez dans quelques minutes.');
    }
    $bad = fn() => fail(400, 'code', 'Code invalide ou expiré. Demandez un nouveau code.');

    $pdo = db();
    $st  = $pdo->prepare('SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?');
    $st->execute([$email]);
    $row = $st->fetch();
    if (!$row || (int) $row['expires_at'] < time() || (int) $row['attempts'] >= 5) {
        if ($row) $pdo->prepare('DELETE FROM login_codes WHERE email = ?')->execute([$email]);
        $bad();
    }
    $pdo->prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?')->execute([$email]);
    if (!hash_equals($row['code_hash'], code_hash($email, (string) $code))) $bad();

    // Le code est à usage unique : on ne le consomme que s'il a bien été supprimé par nous (anti-rejeu concurrent)
    $del = $pdo->prepare('DELETE FROM login_codes WHERE email = ? AND code_hash = ?');
    $del->execute([$email, $row['code_hash']]);
    if ($del->rowCount() !== 1) $bad();

    $st = $pdo->prepare('SELECT id, display_name, is_admin FROM users WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();
    if (!$u) {
        $id   = uuid();
        $name = 'Joueur' . random_int(1000, 9999);
        $pdo->prepare('INSERT INTO users (id, email, display_name, is_admin, created_at) VALUES (?, ?, ?, 0, ?)')
            ->execute([$id, $email, $name, time()]);
        $u = ['id' => $id, 'display_name' => $name, 'is_admin' => 0];
    }
    create_session($u['id']);
    out(200, ['user' => ['id' => $u['id'], 'display_name' => $u['display_name'], 'is_admin' => (bool) (int) $u['is_admin']]]);
}

function route_logout(): never
{
    $t = (string) ($_COOKIE[SESSION_COOKIE] ?? '');
    if (preg_match('/^[a-f0-9]{64}$/', $t)) {
        db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([hash('sha256', $t)]);
    }
    set_session_cookie('', time() - 3600);
    out(200, ['ok' => true]);
}

function route_profile(array $b): never
{
    $u = require_user();
    $n = is_string($b['display_name'] ?? null) ? trim(preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $b['display_name'])) : '';
    $len = mb_strlen($n);
    if ($len < 2 || $len > 32) fail(422, 'name', 'Le pseudo doit faire entre 2 et 32 caractères.');
    db()->prepare('UPDATE users SET display_name = ? WHERE id = ?')->execute([$n, $u['id']]);
    out(200, ['user' => ['id' => $u['id'], 'display_name' => $n, 'is_admin' => $u['is_admin']]]);
}

/* ------------------------------------------------------------------ */
/* Builds                                                              */
/* ------------------------------------------------------------------ */

function row_out(array $r): array
{
    return [
        'id' => $r['id'], 'user_id' => $r['user_id'], 'name' => $r['name'], 'description' => $r['description'],
        'bar' => json_decode((string) $r['bar'], true) ?: [],
        'p1' => $r['p1'] === null ? null : (int) $r['p1'],
        'p2' => $r['p2'] === null ? null : (int) $r['p2'],
        'ranks' => (object) (json_decode((string) $r['ranks'], true) ?: []),
        'code' => $r['code'],
        'created_at' => ts_iso((int) $r['created_at']),
        'updated_at' => ts_iso((int) $r['updated_at']),
        'author_name' => $r['author_name'] ?? null,
    ];
}

function route_list(): never
{
    $where = []; $args = [];
    $p = $_GET['p'] ?? '';
    if ($p !== '' && ctype_digit((string) $p) && (int) $p <= 20) {
        $where[] = '(b.p1 = ? OR b.p2 = ?)'; $args[] = (int) $p; $args[] = (int) $p;
    }
    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $q = mb_substr(mb_strtolower($q), 0, 100);
        $where[] = "b.search_text LIKE ? ESCAPE '|'";
        $args[]  = '%' . str_replace(['|', '%', '_'], ['||', '|%', '|_'], $q) . '%';
    }
    $sort = (string) ($_GET['sort'] ?? 'recent');
    if ($sort === 'mine') {
        $me = current_user();
        if (!$me) out(200, ['builds' => [], 'count' => 0]);
        $where[] = 'b.user_id = ?'; $args[] = $me['id'];
    }
    $order  = $sort === 'name' ? 'b.name ASC, b.id ASC' : 'b.updated_at DESC, b.id ASC';
    $page   = max(0, min(10000, (int) ($_GET['page'] ?? 0)));
    $limit  = 30;
    $offset = $page * $limit;
    $w = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $st = db()->prepare("SELECT COUNT(*) FROM builds b $w");
    $st->execute($args);
    $count = (int) $st->fetchColumn();

    $st = db()->prepare(
        "SELECT b.*, u.display_name AS author_name FROM builds b JOIN users u ON u.id = b.user_id
         $w ORDER BY $order LIMIT $limit OFFSET $offset"
    );
    $st->execute($args);
    out(200, ['builds' => array_map('row_out', $st->fetchAll()), 'count' => $count]);
}

function route_mine(): never
{
    $u  = require_user();
    $st = db()->prepare('SELECT b.*, NULL AS author_name FROM builds b WHERE b.user_id = ? ORDER BY b.updated_at DESC');
    $st->execute([$u['id']]);
    out(200, ['builds' => array_map('row_out', $st->fetchAll())]);
}

/** Valide et normalise une ligne de build reçue du navigateur ; null si invalide. */
function clean_build(mixed $r): ?array
{
    if (!is_array($r)) return null;
    $id = $r['id'] ?? null;
    if (!is_string($id) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) return null;
    $name = is_string($r['name'] ?? null) ? mb_substr(trim($r['name']), 0, 60) : '';
    if ($name === '') $name = 'Build';
    $desc = is_string($r['description'] ?? null) ? mb_substr($r['description'], 0, 280) : '';
    $bar  = $r['bar'] ?? null;
    if (!is_array($bar) || count($bar) > 8) return null;
    $bar = array_values($bar);
    foreach ($bar as $k) if ($k !== null && !(is_string($k) && strlen($k) <= 80)) return null;
    $prof = function (mixed $v) { return $v === null ? null : ((is_int($v) && $v >= 0 && $v <= 20) ? $v : false); };
    $p1 = $prof($r['p1'] ?? null); $p2 = $prof($r['p2'] ?? null);
    if ($p1 === false || $p2 === false) return null;
    $ranks = $r['ranks'] ?? [];
    if (!is_array($ranks) || count($ranks) > 60) return null;
    foreach ($ranks as $k => $v) if (!is_string($k) || strlen($k) > 80 || !is_int($v) || $v < 0 || $v > 30) return null;
    return [
        'id' => strtolower($id), 'name' => $name, 'description' => $desc,
        'bar' => json_encode($bar, JSON_UNESCAPED_UNICODE), 'p1' => $p1, 'p2' => $p2,
        'ranks' => json_encode((object) $ranks, JSON_UNESCAPED_UNICODE),
        'code' => is_string($r['code'] ?? null) ? mb_substr($r['code'], 0, 80) : '',
        'search_text' => is_string($r['search_text'] ?? null) ? mb_substr($r['search_text'], 0, 2000) : '',
    ];
}

function route_sync(array $b): never
{
    $me     = require_user();
    $upsert = $b['upsert'] ?? [];
    $remove = $b['remove'] ?? [];
    if (!is_array($upsert) || !is_array($remove) || count($upsert) > MAX_BUILDS || count($remove) > MAX_BUILDS) {
        fail(422, 'payload', 'Données invalides.');
    }
    $rows = [];
    foreach ($upsert as $r) {
        $c = clean_build($r);
        if (!$c) fail(422, 'payload', 'Un build contient des données invalides.');
        $rows[$c['id']] = $c;
    }
    $rm = [];
    foreach ($remove as $id) {
        if (is_string($id) && preg_match('/^[0-9a-f-]{36}$/i', $id)) $rm[] = strtolower($id);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        if ($rm) {
            $in = implode(',', array_fill(0, count($rm), '?'));
            $pdo->prepare("DELETE FROM builds WHERE user_id = ? AND id IN ($in)")->execute(array_merge([$me['id']], $rm));
        }
        $existing = [];
        if ($rows) {
            $ids = array_keys($rows);
            $in  = implode(',', array_fill(0, count($ids), '?'));
            $st  = $pdo->prepare("SELECT id, user_id FROM builds WHERE id IN ($in)");
            $st->execute($ids);
            foreach ($st->fetchAll() as $e) $existing[$e['id']] = $e['user_id'];
            foreach ($existing as $owner) {
                if ($owner !== $me['id']) { $pdo->rollBack(); fail(403, 'forbidden', 'Ce build appartient à un autre joueur.'); }
            }
        }
        $new = count(array_diff_key($rows, $existing));
        $st  = $pdo->prepare('SELECT COUNT(*) FROM builds WHERE user_id = ?');
        $st->execute([$me['id']]);
        if ((int) $st->fetchColumn() + $new > MAX_BUILDS) {
            $pdo->rollBack();
            fail(409, 'limit', 'Limite de ' . MAX_BUILDS . ' builds en ligne atteinte.');
        }
        $now = time();
        $ins = $pdo->prepare(
            'INSERT INTO builds (id, user_id, name, description, bar, p1, p2, ranks, code, search_text, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $upd = $pdo->prepare(
            'UPDATE builds SET name = ?, description = ?, bar = ?, p1 = ?, p2 = ?, ranks = ?, code = ?, search_text = ?, updated_at = ?
             WHERE id = ? AND user_id = ?'
        );
        foreach ($rows as $id => $r) {
            if (isset($existing[$id])) {
                $upd->execute([$r['name'], $r['description'], $r['bar'], $r['p1'], $r['p2'], $r['ranks'], $r['code'], $r['search_text'], $now, $id, $me['id']]);
            } else {
                $ins->execute([$id, $me['id'], $r['name'], $r['description'], $r['bar'], $r['p1'], $r['p2'], $r['ranks'], $r['code'], $r['search_text'], $now, $now]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    out(200, ['ok' => true]);
}

function route_delete(array $b): never
{
    $me = require_user();
    $id = $b['id'] ?? null;
    if (!is_string($id) || !preg_match('/^[0-9a-f-]{36}$/i', $id)) fail(422, 'payload', 'Identifiant invalide.');
    $id = strtolower($id);
    $st = db()->prepare('SELECT user_id FROM builds WHERE id = ?');
    $st->execute([$id]);
    $owner = $st->fetchColumn();
    if ($owner === false) out(200, ['ok' => true]);
    if ($owner !== $me['id'] && !$me['is_admin']) fail(403, 'forbidden', 'Suppression refusée.');
    db()->prepare('DELETE FROM builds WHERE id = ?')->execute([$id]);
    out(200, ['ok' => true]);
}
