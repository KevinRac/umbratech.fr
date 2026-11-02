<?php
declare(strict_types=1);

/**
 * Vaelmor : API des comptes et des sauvegardes en ligne (lot M9b, GDD §14.3,
 * décisions n°170 à n°173). Calquée sur gw1/api : connexion par un code à
 * 6 chiffres envoyé par e-mail, session par cookie HttpOnly.
 *
 * Routes (paramètre `r`) :
 *   GET  auth/me        → { user: { email } | null }
 *   POST auth/request   { email }          → envoie un code
 *   POST auth/verify    { email, code }    → ouvre la session
 *   POST auth/logout
 *   GET  saves/list     → { saves: [{ slot, checksum, savedAt, meta, size, rev }] }
 *   GET  saves/get      &slot=…            → { slot, envelope, rev }
 *   POST saves/put      { slot, envelope, baseRev } → { rev } ; 409 si la version en ligne a changé
 *   POST saves/delete   { slot, baseRev? }
 *
 * Le serveur vérifie la taille (200 Ko), l'enveloppe et sa somme de contrôle,
 * pas le contenu du jeu (n°173) : le jeu le contrôle au chargement.
 */

require __DIR__ . '/lib/common.php';
require __DIR__ . '/lib/smtp.php';
require __DIR__ . '/lib/checksum.php';

set_exception_handler(function (Throwable $e): void {
    error_log('[vaelmor] ' . $e);
    fail(500, 'server', 'Erreur serveur. Réessaie plus tard.');
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route  = (string) ($_GET['r'] ?? '');
if ($method !== 'GET' && $method !== 'POST') fail(405, 'method', 'Méthode non autorisée.');

$body = [];
if ($method === 'POST') {
    // Protection CSRF : en-tête personnalisé (impossible en cross-site sans préflight) + contrôle d'origine.
    if (($_SERVER['HTTP_X_VAELMOR'] ?? '') !== '1') fail(403, 'csrf', 'Requête refusée.');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && strcasecmp((string) parse_url($origin, PHP_URL_HOST), explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]) !== 0) {
        fail(403, 'csrf', 'Requête refusée.');
    }
    $body = read_json();
}

try { purge_expired(); } catch (Throwable $e) { /* sans gravité */ }

$m = fn(string $want, callable $f) => $method === $want ? $f() : fail(405, 'method', 'Méthode non autorisée.');
match ($route) {
    'auth/me'      => $m('GET', fn() => route_me()),
    'auth/request' => $m('POST', fn() => route_request($body)),
    'auth/verify'  => $m('POST', fn() => route_verify($body)),
    'auth/logout'  => $m('POST', fn() => route_logout()),
    'saves/list'   => $m('GET', fn() => route_list()),
    'saves/get'    => $m('GET', fn() => route_get((string) ($_GET['slot'] ?? ''))),
    'saves/put'    => $m('POST', fn() => route_put($body)),
    'saves/delete' => $m('POST', fn() => route_delete($body)),
    default        => fail(404, 'not_found', 'Route inconnue.'),
};

/* ------------------------------------------------------------------ */
/* Connexion par code envoyé par e-mail                                */
/* ------------------------------------------------------------------ */

function route_me(): never
{
    db()->query('SELECT 1');           // la base doit répondre, sinon le jeu reste « hors ligne »
    $u = current_user();
    out(200, ['user' => $u ? ['email' => $u['email']] : null]);
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
    if (!$email) fail(422, 'email', 'Saisis une adresse e-mail valide.');

    if (!rate_hit('req-ip', client_ip(), 20, 3600) || !rate_hit('req-mail', $email, 5, 3600)) {
        fail(429, 'rate', 'Trop de demandes pour le moment. Réessaie dans quelques minutes.');
    }
    $st = db()->prepare('SELECT created_at FROM login_codes WHERE email = ?');
    $st->execute([$email]);
    $last = $st->fetchColumn();
    if ($last !== false && (int) $last > time() - 30) {
        fail(429, 'cooldown', 'Un code vient d’être envoyé. Patiente quelques secondes avant d’en redemander un.');
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
        $site = (string) cfg('site_url', 'https://umbratech.fr/vaelmor/play/');
        send_mail(
            $email,
            "Vaelmor : ton code de connexion $code",
            "Bonjour,\n\nVoici ton code de connexion à Vaelmor ($site) :\n\n    $code\n\n"
            . "Il est valable " . (CODE_TTL / 60) . " minutes et ne sert qu'une fois.\n"
            . "Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.\n\n-- Umbratech\n"
        );
    } catch (Throwable $e) {
        error_log('[vaelmor] envoi du code impossible : ' . $e->getMessage());
        $pdo->prepare('DELETE FROM login_codes WHERE email = ?')->execute([$email]);
        fail(502, 'mail', 'L’envoi de l’e-mail a échoué. Réessaie plus tard.');
    }
    out(200, ['ok' => true, 'ttl' => CODE_TTL]);
}

function route_verify(array $b): never
{
    $email = norm_email($b['email'] ?? null);
    $code  = is_string($b['code'] ?? null) ? preg_replace('/\s+/', '', $b['code']) : '';
    if (!$email || !preg_match('/^\d{6}$/', (string) $code)) fail(422, 'code', 'Saisis le code à 6 chiffres reçu par e-mail.');

    if (!rate_hit('verify-ip', client_ip(), 40, 3600)) {
        fail(429, 'rate', 'Trop de tentatives. Réessaie dans quelques minutes.');
    }
    $bad = fn() => fail(400, 'code', 'Code invalide ou expiré. Demande un nouveau code.');

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

    // Code à usage unique : il n'est consommé que si c'est bien nous qui l'avons supprimé (anti-rejeu concurrent).
    $del = $pdo->prepare('DELETE FROM login_codes WHERE email = ? AND code_hash = ?');
    $del->execute([$email, $row['code_hash']]);
    if ($del->rowCount() !== 1) $bad();

    $st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $st->execute([$email]);
    $id = $st->fetchColumn();
    if ($id === false) {
        $id = uuid();
        $pdo->prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)')->execute([$id, $email, time()]);
    }
    create_session((string) $id);
    out(200, ['user' => ['email' => $email]]);
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

/* ------------------------------------------------------------------ */
/* Sauvegardes                                                         */
/* ------------------------------------------------------------------ */

function check_slot(mixed $slot): string
{
    if (!is_string($slot) || !in_array($slot, SLOTS, true)) fail(422, 'slot', 'Emplacement inconnu.');
    return $slot;
}

function route_list(): never
{
    $me = require_user();
    $st = db()->prepare('SELECT slot, checksum, saved_at, meta, size, rev FROM saves WHERE user_id = ? ORDER BY slot');
    $st->execute([$me['id']]);
    $saves = [];
    foreach ($st->fetchAll() as $r) {
        $saves[] = [
            'slot' => $r['slot'], 'checksum' => $r['checksum'], 'savedAt' => $r['saved_at'],
            'meta' => json_decode((string) $r['meta']), 'size' => (int) $r['size'], 'rev' => (int) $r['rev'],
        ];
    }
    out(200, ['saves' => $saves]);
}

function route_get(string $slot): never
{
    $me = require_user();
    $slot = check_slot($slot);
    $st = db()->prepare('SELECT envelope, rev FROM saves WHERE user_id = ? AND slot = ?');
    $st->execute([$me['id'], $slot]);
    $r = $st->fetch();
    if (!$r) fail(404, 'empty', 'Aucune sauvegarde en ligne dans cet emplacement.');
    out(200, ['slot' => $slot, 'envelope' => $r['envelope'], 'rev' => (int) $r['rev']]);
}

/** Révision actuelle d'un emplacement (0 s'il est vide). */
function current_rev(string $userId, string $slot): int
{
    $st = db()->prepare('SELECT rev FROM saves WHERE user_id = ? AND slot = ?');
    $st->execute([$userId, $slot]);
    $r = $st->fetchColumn();
    return $r === false ? 0 : (int) $r;
}

function route_put(array $b): never
{
    $me   = require_user();
    $slot = check_slot($b['slot'] ?? null);
    $text = $b['envelope'] ?? null;
    if (!is_string($text) || $text === '') fail(422, 'envelope', 'Sauvegarde absente.');
    if (strlen($text) > MAX_SAVE_BYTES) fail(413, 'too_large', 'Sauvegarde trop grosse (200 Ko au plus).');
    if (!rate_hit('put', $me['id'], 240, 3600)) fail(429, 'rate', 'Trop d’écritures pour le moment.');

    $env = json_decode($text, false);
    if (!$env instanceof stdClass || ($env->game ?? null) !== 'vaelmor' || !is_int($env->saveVersion ?? null)
        || !is_string($env->checksum ?? null) || !is_string($env->savedAt ?? null) || !($env->meta ?? null) instanceof stdClass) {
        fail(422, 'envelope', 'Ce n’est pas une sauvegarde de Vaelmor.');
    }
    if (!preg_match('/^[0-9a-f]{8}$/', $env->checksum) || !hash_equals($env->checksum, envelope_checksum($env))) {
        fail(422, 'checksum', 'La somme de contrôle ne correspond pas : sauvegarde refusée.');
    }

    $base = $b['baseRev'] ?? null;
    $pdo  = db();
    $pdo->beginTransaction();
    try {
        $rev = current_rev($me['id'], $slot);
        // Contrôle des conflits (n°172) : on n'écrase que la version que le jeu connaît.
        if ($base !== null && (!is_int($base) || $base !== $rev)) {
            $pdo->rollBack();
            out(409, ['error' => 'conflict', 'message' => 'La sauvegarde en ligne a changé depuis la dernière synchronisation.', 'rev' => $rev]);
        }
        $meta = json_encode($env->meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $vals = [$text, $env->checksum, substr($env->savedAt, 0, 32), $meta, strlen($text), $rev + 1, time()];
        if ($rev === 0) {
            $pdo->prepare('INSERT INTO saves (envelope, checksum, saved_at, meta, size, rev, updated_at, user_id, slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([...$vals, $me['id'], $slot]);
        } else {
            $pdo->prepare('UPDATE saves SET envelope = ?, checksum = ?, saved_at = ?, meta = ?, size = ?, rev = ?, updated_at = ? WHERE user_id = ? AND slot = ?')
                ->execute([...$vals, $me['id'], $slot]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    out(200, ['ok' => true, 'rev' => $rev + 1]);
}

function route_delete(array $b): never
{
    $me   = require_user();
    $slot = check_slot($b['slot'] ?? null);
    $base = $b['baseRev'] ?? null;
    $rev  = current_rev($me['id'], $slot);
    if ($base !== null && $base !== $rev) {
        out(409, ['error' => 'conflict', 'message' => 'La sauvegarde en ligne a changé depuis la dernière synchronisation.', 'rev' => $rev]);
    }
    db()->prepare('DELETE FROM saves WHERE user_id = ? AND slot = ?')->execute([$me['id'], $slot]);
    out(200, ['ok' => true]);
}
