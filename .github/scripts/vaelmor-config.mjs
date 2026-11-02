// Génère vaelmor/api/config.local.php à partir des variables d'environnement
// (alimentées par les secrets GitHub). Écrit le fichier sur la sortie standard.
// Aucune valeur n'est enregistrée dans le dépôt.
// L'envoi des e-mails passe par la même boîte que gw1 : sans VAELMOR_SMTP_*, on
// reprend GW1_SMTP_* (même adresse no-reply@umbratech.fr).
const E = process.env;
const smtpUser = E.VAELMOR_SMTP_USER || E.GW1_SMTP_USER;
const smtpPass = E.VAELMOR_SMTP_PASS || E.GW1_SMTP_PASS;
const need = ['VAELMOR_DB_HOST', 'VAELMOR_DB_NAME', 'VAELMOR_DB_USER', 'VAELMOR_DB_PASS', 'VAELMOR_SECRET'];
const missing = need.filter((k) => !E[k]);
if (!smtpUser) missing.push('VAELMOR_SMTP_USER (ou GW1_SMTP_USER)');
if (!smtpPass) missing.push('VAELMOR_SMTP_PASS (ou GW1_SMTP_PASS)');
if (missing.length) { console.error('Secrets manquants : ' + missing.join(', ')); process.exit(1); }
if (E.VAELMOR_SECRET.length < 32) { console.error('VAELMOR_SECRET doit faire au moins 32 caractères'); process.exit(1); }

// chaîne PHP entre apostrophes : seuls \ et ' sont spéciaux
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const lines = {
  db_host: q(E.VAELMOR_DB_HOST), db_name: q(E.VAELMOR_DB_NAME), db_user: q(E.VAELMOR_DB_USER), db_pass: q(E.VAELMOR_DB_PASS),
  secret: q(E.VAELMOR_SECRET),
  mail_driver: q('smtp'), mail_from: q(E.VAELMOR_MAIL_FROM || smtpUser), mail_name: q('Vaelmor'),
  smtp_host: q(E.VAELMOR_SMTP_HOST || E.GW1_SMTP_HOST || 'smtp.ionos.fr'), smtp_port: String(parseInt(E.VAELMOR_SMTP_PORT || E.GW1_SMTP_PORT || '587', 10)),
  smtp_secure: q(E.VAELMOR_SMTP_SECURE || E.GW1_SMTP_SECURE || 'starttls'), smtp_user: q(smtpUser), smtp_pass: q(smtpPass),
  site_url: q('https://umbratech.fr/vaelmor/play/'),
};
process.stdout.write('<?php\n// Fichier généré par le déploiement GitHub : ne pas modifier à la main.\nreturn [\n'
  + Object.entries(lines).map(([k, v]) => `    '${k}' => ${v},`).join('\n') + '\n];\n');
