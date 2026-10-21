# Communauté GW1 : installation sur IONOS

La page `gw1/` parle à une petite API PHP (`gw1/api/`) qui stocke tout dans une base MySQL
IONOS. La connexion se fait par un **code à 6 chiffres envoyé par e-mail** (valable 10 min,
5 essais maximum, usage unique). Aucune dépendance, rien à installer côté serveur.

## 1. Créer la base MySQL
Espace IONOS > Hébergement > **Bases de données MySQL** > créer une base. Notez : hôte
(`dbXXXX.hosting-data.io`), nom de la base, utilisateur, mot de passe.

## 2. Créer les tables
Ouvrez **phpMyAdmin** depuis la même page, sélectionnez la base, onglet **Importer** (ou
**SQL**) et chargez `gw1/api/schema.sql`.

## 3. Créer la boîte d'envoi des e-mails
IONOS > E-mail > créer une adresse, par exemple `no-reply@umbratech.fr`. Les identifiants SMTP
sont `smtp.ionos.fr`, port 587 (STARTTLS), utilisateur = l'adresse complète.

## 4. Configuration : secrets GitHub (recommandé)
Le dépôt est public : aucun identifiant n'y figure. Dans GitHub > dépôt > **Settings > Secrets and
variables > Actions > New repository secret**, créez :

| Secret | Valeur |
|---|---|
| `GW1_DB_HOST` | hôte MySQL IONOS (`dbXXXX.hosting-data.io`) |
| `GW1_DB_NAME` | nom de la base |
| `GW1_DB_USER` | utilisateur de la base |
| `GW1_DB_PASS` | mot de passe de la base |
| `GW1_SECRET` | chaîne aléatoire d'au moins 32 caractères (`openssl rand -hex 32`) |
| `GW1_SMTP_USER` | adresse d'envoi complète (ex. `no-reply@umbratech.fr`) |
| `GW1_SMTP_PASS` | mot de passe de cette boîte e-mail |

À chaque déploiement, le workflow écrit `gw1/api/config.local.php` sur IONOS à partir de ces
secrets (`.github/scripts/gw1-config.mjs`). Le fichier n'est jamais commité. Options facultatives
(secrets aussi) : `GW1_MAIL_FROM`, `GW1_SMTP_HOST`, `GW1_SMTP_PORT`, `GW1_SMTP_SECURE`.
Tant que `GW1_SECRET` n'existe pas, l'étape est ignorée.

*Alternative manuelle :* copier `config.sample.php` en `config.local.php` dans `~/public/gw1/api/`
et le remplir (fichier ignoré par Git).

## 5. Déployer et tester
Après les secrets, relancez le déploiement (onglet Actions > « Déploiement IONOS » > Run workflow), ouvrez `https://umbratech.fr/gw1/`, cliquez sur
« Se connecter » et demandez un code. Si le site reste en « Mode local », l'API n'arrive pas à
joindre la base : consultez le journal d'erreurs PHP de l'hébergement (préfixe `[gw1]`).

## 6. Se nommer administrateur (modération)
Dans phpMyAdmin, après votre première connexion :
`UPDATE users SET is_admin = 1 WHERE email = 'vous@exemple.fr';`

## Notes
- Si `smtp.ionos.fr` pose problème, `'mail_driver' => 'mail'` utilise la fonction `mail()` de PHP.
- Les builds sont limités à 200 par joueur ; les sessions durent 1 an et sont prolongées à chaque visite (cookie HttpOnly) : un joueur actif reste connecté.
- Anciennes données Supabase : non migrées (les builds restent aussi dans le navigateur des
  joueurs et se resynchronisent à leur première connexion).
