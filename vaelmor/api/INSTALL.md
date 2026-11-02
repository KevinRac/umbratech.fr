# Vaelmor : compte et sauvegarde en ligne (lot M9b)

Le jeu (`vaelmor/play/`) parle à une petite API PHP (`vaelmor/api/`) qui range les
sauvegardes dans une base MySQL IONOS **séparée de celle de gw1**. La connexion se
fait par un **code à 6 chiffres envoyé par e-mail** (valable 10 min, 5 essais, usage
unique) ; la session tient un an. Le jeu reste jouable sans compte. Aucune dépendance.

## 1. Créer les tables
IONOS > Hébergement > Bases de données MySQL > ouvrir **phpMyAdmin** sur la base de
Vaelmor, onglet **Importer** (ou **SQL**), charger `vaelmor/api/schema.sql`.
Réimporter ne casse rien (`CREATE TABLE IF NOT EXISTS`).

## 2. Secrets GitHub
GitHub > dépôt `umbratech.fr` > **Settings > Secrets and variables > Actions** :

| Secret | Valeur |
|---|---|
| `VAELMOR_DB_HOST` | hôte MySQL (`dbXXXX.hosting-data.io`) |
| `VAELMOR_DB_NAME` | nom de la base (`dbsXXXX`) |
| `VAELMOR_DB_USER` | utilisateur de la base (`dboXXXX`) |
| `VAELMOR_DB_PASS` | mot de passe de la base |
| `VAELMOR_SECRET` | chaîne aléatoire d'au moins 32 caractères, différente de `GW1_SECRET` (`openssl rand -hex 32`) |

Les e-mails partent de la même boîte que gw1 (`no-reply@umbratech.fr`) : sans
`VAELMOR_SMTP_USER` / `VAELMOR_SMTP_PASS`, le déploiement reprend `GW1_SMTP_USER` /
`GW1_SMTP_PASS`. Facultatifs : `VAELMOR_MAIL_FROM`, `VAELMOR_SMTP_HOST`,
`VAELMOR_SMTP_PORT`, `VAELMOR_SMTP_SECURE`.

À chaque déploiement, le workflow écrit `vaelmor/api/config.local.php` sur IONOS à
partir de ces secrets (`.github/scripts/vaelmor-config.mjs`). Le fichier n'est jamais
commité. Tant que `VAELMOR_SECRET` n'existe pas, l'étape est ignorée.

## 3. Déployer et tester
Après les secrets : onglet **Actions** > « Déploiement IONOS » > **Run workflow**.
Puis `https://umbratech.fr/vaelmor/play/` > **Compte** > saisir une adresse > recevoir
le code. Si l'écran dit « serveur injoignable », l'API n'atteint pas la base : voir le
journal d'erreurs PHP de l'hébergement (préfixe `[vaelmor]`).

## Notes
- Routes, règles de synchronisation et conflits : GDD §14.3, décisions n°170 à n°173.
- Le serveur vérifie la taille (200 Ko au plus), l'enveloppe et la somme de contrôle
  (`lib/checksum.php`, identique à `src/logic/save/checksum.ts` : un test le vérifie),
  pas le contenu du jeu.
- Essais locaux : `tests/api.test.ts` lance l'API sous `php -S` avec SQLite (sauté si
  PHP n'est pas installé).
