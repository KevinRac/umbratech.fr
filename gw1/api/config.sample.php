<?php
// Copiez ce fichier en « config.local.php » SUR LE SERVEUR (jamais dans Git :
// le dépôt est public) et renseignez vos valeurs.
return [
    // Base MySQL IONOS (Hébergement > Bases de données MySQL)
    'db_host' => 'dbXXXXXXXX.hosting-data.io',
    'db_name' => 'dbsXXXXXXXX',
    'db_user' => 'dboXXXXXXXX',
    'db_pass' => '',

    // Chaîne aléatoire d'au moins 32 caractères (ex. : openssl rand -hex 32)
    'secret' => '',

    // Envoi des e-mails : boîte créée dans IONOS (ex. no-reply@umbratech.fr)
    'mail_driver' => 'smtp',            // 'smtp' (recommandé) ou 'mail' (fonction mail() de PHP)
    'mail_from'   => 'no-reply@umbratech.fr',
    'mail_name'   => 'Umbratech',
    'smtp_host'   => 'smtp.ionos.fr',
    'smtp_port'   => 587,
    'smtp_secure' => 'starttls',        // 'starttls' (587), 'ssl' (465) ou 'none'
    'smtp_user'   => 'no-reply@umbratech.fr',
    'smtp_pass'   => '',

    'site_url' => 'https://umbratech.fr/gw1/',
];
