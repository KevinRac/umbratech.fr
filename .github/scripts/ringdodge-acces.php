<?php
// Génère ringdodge/acces.local.php à partir du secret RINGDODGE_MDP (variable d'environnement).
// Écrit le fichier sur la sortie standard. Aucune valeur n'est enregistrée dans le dépôt.
$mdp = (string)getenv('RINGDODGE_MDP');
if (strlen($mdp) < 8) {
    fwrite(STDERR, "RINGDODGE_MDP doit faire au moins 8 caractères\n");
    exit(1);
}
$acces = [
    // Empreinte vérifiée par password_verify (sel aléatoire à chaque déploiement)
    'hash' => password_hash($mdp, PASSWORD_DEFAULT),
    // Clé de signature des cookies : identique d'un déploiement à l'autre tant que le mot de passe ne change pas
    'cle' => hash_hmac('sha256', 'ringdodge-cookie-v1', $mdp),
];
echo "<?php\n// Fichier généré par le déploiement GitHub : ne pas modifier à la main.\nreturn " . var_export($acces, true) . ";\n";
