// Génère gw1/api/config.local.php à partir des variables d'environnement
// (alimentées par les secrets GitHub). Écrit le fichier sur la sortie standard.
// Aucune valeur n'est enregistrée dans le dépôt.
const E = process.env;
const need = ['GW1_DB_HOST', 'GW1_DB_NAME', 'GW1_DB_USER', 'GW1_DB_PASS', 'GW1_SECRET', 'GW1_SMTP_USER', 'GW1_SMTP_PASS'];
const missing = need.filter((k) => !E[k]);
if (missing.length) { console.error('Secrets manquants : ' + missing.join(', ')); process.exit(1); }
if (E.GW1_SECRET.length < 32) { console.error('GW1_SECRET doit faire au moins 32 caractères'); process.exit(1); }

// chaîne PHP entre apostrophes : seuls \ et ' sont spéciaux
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const lines = {
  db_host: q(E.GW1_DB_HOST), db_name: q(E.GW1_DB_NAME), db_user: q(E.GW1_DB_USER), db_pass: q(E.GW1_DB_PASS),
  secret: q(E.GW1_SECRET),
  mail_driver: q('smtp'), mail_from: q(E.GW1_MAIL_FROM || E.GW1_SMTP_USER), mail_name: q('Umbratech'),
  smtp_host: q(E.GW1_SMTP_HOST || 'smtp.ionos.fr'), smtp_port: String(parseInt(E.GW1_SMTP_PORT || '587', 10)),
  smtp_secure: q(E.GW1_SMTP_SECURE || 'starttls'), smtp_user: q(E.GW1_SMTP_USER), smtp_pass: q(E.GW1_SMTP_PASS),
  site_url: q('https://umbratech.fr/gw1/'),
};
process.stdout.write('<?php\n// Fichier généré par le déploiement GitHub : ne pas modifier à la main.\nreturn [\n'
  + Object.entries(lines).map(([k, v]) => `    '${k}' => ${v},`).join('\n') + '\n];\n');
