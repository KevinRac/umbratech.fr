<?php
// Vaelmor : configuration de l'API. Copie ce fichier en « config.local.php » SUR LE
// SERVEUR seulement (jamais dans Git : le dépôt est public). En temps normal, le
// déploiement GitHub l'écrit lui-même à partir des secrets VAELMOR_* (voir INSTALL.md).
return [
    // Base MySQL IONOS de Vaelmor (séparée de celle de gw1)
    'db_host' => 'dbXXXXXXXX.hosting-data.io',
    'db_name' => 'dbsXXXXXXXX',
    'db_user' => 'dboXXXXXXXX',
    'db_pass' => '',

    // Chaîne aléatoire d'au moins 32 caractères (ex. : openssl rand -hex 32)
    'secret' => '',

    // Envoi des e-mails : la même boîte que gw1 (no-reply@umbratech.fr)
    'mail_driver' => 'smtp',
    'mail_from'   => 'no-reply@umbratech.fr',
    'mail_name'   => 'Vaelmor',
    'smtp_host'   => 'smtp.ionos.fr',
    'smtp_port'   => 587,
    'smtp_secure' => 'starttls',
    'smtp_user'   => 'no-reply@umbratech.fr',
    'smtp_pass'   => '',

    'site_url' => 'https://umbratech.fr/vaelmor/play/',
];
