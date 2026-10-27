<?php
/**
 * Ring Dodge — porte d'entrée de la version d'essai (testeurs).
 *
 * Toutes les requêtes du dossier passent ici (.htaccess). Sans connexion, seuls
 * le manifeste et les icônes sont servis (ils ne révèlent rien) ; tout le reste
 * renvoie la page de mot de passe. Le mot de passe n'est jamais dans le dépôt :
 * le déploiement écrit son empreinte (password_hash) dans acces.local.php, à
 * partir du secret GitHub RINGDODGE_MDP, avec une clé de signature tirée du même
 * secret. Une connexion réussie pose un cookie signé valable 30 jours ; changer
 * le mot de passe déconnecte tout le monde.
 *
 * Le jeu construit est dans jeu/ (généré depuis le dépôt privé KevinRac/ringdodge).
 */
declare(strict_types=1);

const COOKIE = 'rd_acces';
const DUREE = 30 * 24 * 3600;
const LIBRES = ['manifest.webmanifest', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-masquable-512.png', 'icones/apple-touch-icon.png'];
const TYPES = [
    'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8',
    'json' => 'application/json', 'webmanifest' => 'application/manifest+json', 'png' => 'image/png',
    'svg' => 'image/svg+xml', 'mp3' => 'audio/mpeg', 'woff2' => 'font/woff2', 'ico' => 'image/x-icon',
];

header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/') . '/';
$jeu = __DIR__ . '/jeu';

// Chemin demandé, relatif au dossier
$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$rel = str_starts_with($uri, $base) ? substr($uri, strlen($base)) : '';
$rel = ltrim($rel, '/');
if ($rel === '' || $rel === 'porte.php') $rel = 'index.html';
elseif (str_ends_with($rel, '/')) $rel .= 'index.html';

$acces = is_file(__DIR__ . '/acces.local.php') ? (require __DIR__ . '/acces.local.php') : null;
$hash = is_array($acces) ? (string)($acces['hash'] ?? '') : '';
// Clé de signature des cookies : stable d'un déploiement à l'autre, change avec le mot de passe
$cle = is_array($acces) ? (string)($acces['cle'] ?? '') : '';

function jeton_valide(string $cle): bool
{
    $c = $_COOKIE[COOKIE] ?? '';
    if ($cle === '' || !preg_match('/^(\d{10})\.([a-f0-9]{64})$/', $c, $m)) return false;
    if ((int)$m[1] < time()) return false;
    return hash_equals(hash_hmac('sha256', $m[1], $cle), $m[2]);
}

function servir(string $dossier, string $rel): void
{
    $racine = realpath($dossier);
    $fichier = realpath($dossier . '/' . $rel);
    if ($racine === false || $fichier === false || !is_file($fichier) || !str_starts_with($fichier, $racine . DIRECTORY_SEPARATOR)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Introuvable';
        exit;
    }
    $ext = strtolower(pathinfo($fichier, PATHINFO_EXTENSION));
    header('Content-Type: ' . (TYPES[$ext] ?? 'application/octet-stream'));
    // Fichiers dont le nom contient leur version (assets/) : cache long ; le reste : toujours revalidé
    header(str_starts_with($rel, 'assets/') ? 'Cache-Control: private, max-age=31536000, immutable' : 'Cache-Control: no-cache');
    header('Content-Length: ' . filesize($fichier));
    readfile($fichier);
    exit;
}

function page_connexion(string $message, int $code, string $base): void
{
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $m = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $b = htmlspecialchars($base, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" /><meta name="theme-color" content="#0b0e16" />
<link rel="manifest" href="{$b}manifest.webmanifest" /><link rel="apple-touch-icon" href="{$b}icones/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" /><meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" /><meta name="apple-mobile-web-app-title" content="Ring Dodge" />
<title>Ring Dodge – accès testeurs</title>
<style>
html,body{margin:0;height:100%;background:#0b0e16;color:#f4f1e8;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
body{display:grid;place-items:center;padding:20px;box-sizing:border-box;background:radial-gradient(ellipse at center,#141a28,#0b0e16)}
form{width:min(380px,100%);padding:22px;border-radius:18px;background:rgba(18,20,28,.94);border:1px solid #2a3042;box-shadow:0 18px 60px rgba(0,0,0,.5)}
h1{margin:0;font-size:30px;font-weight:900}h1 span{color:#7cf5e1}
p{margin:6px 0 16px;color:#a9b0c4;font-size:14px}
input[type=password]{box-sizing:border-box;width:100%;min-height:52px;padding:0 14px;border-radius:12px;border:2px solid #2a3042;background:#1a1e2b;color:#f4f1e8;font:inherit;font-size:17px}
input[type=password]:focus{outline:none;border-color:#7cf5e1}
button{width:100%;min-height:56px;margin-top:12px;border:0;border-radius:14px;background:#7cf5e1;color:#06201c;font:inherit;font-size:19px;font-weight:900;cursor:pointer}
.err{min-height:20px;margin:10px 0 0;color:#ff9b8a}
</style></head>
<body><form method="post" action="{$b}" autocomplete="on">
<h1>Ring <span>Dodge</span></h1><p>Version d'essai réservée aux testeurs.</p>
<input type="text" name="username" value="testeur" autocomplete="username" hidden />
<input type="password" name="mdp" autocomplete="current-password" placeholder="Mot de passe" required autofocus />
<button type="submit">Entrer</button><p class="err" role="alert">{$m}</p></form></body></html>
HTML;
    exit;
}

// Manifeste et icônes : libres (le navigateur les charge sans cookie pour l'écran d'accueil)
if (in_array($rel, LIBRES, true)) servir($jeu, $rel);

if ($hash === '' || strlen($cle) < 32) page_connexion("Accès pas encore configuré (secret RINGDODGE_MDP).", 503, $base);

// Tentative de connexion
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $mdp = (string)($_POST['mdp'] ?? '');
    if ($mdp !== '' && password_verify($mdp, $hash)) {
        $fin = (string)(time() + DUREE);
        setcookie(COOKIE, $fin . '.' . hash_hmac('sha256', $fin, $cle), [
            'expires' => (int)$fin, 'path' => $base, 'secure' => true, 'httponly' => true, 'samesite' => 'Lax',
        ]);
        header('Location: ' . $base, true, 303);
        exit;
    }
    usleep(800000); // freine les essais en série
    page_connexion('Mot de passe incorrect.', 401, $base);
}

if (!jeton_valide($cle)) page_connexion('', 401, $base);

servir($jeu, $rel);
