# Azertyrolien

Le jeu de la Tyrolienne, façon *Juste Prix*, adapté pour le tournoi fun de l'**Azerty Party 2026** (Hippodrome de Pau, 24 & 25 octobre).

La souris de l'Azerty Club grimpe une montagne de touches de clavier. Le candidat part de **200 points**. Il estime le prix de 3 objets informatiques, et chaque euro d'écart lui retire 1 point, ce qui fait avancer la souris vers la falaise. À 0 point, elle tombe. S'il lui reste des points après le 3ᵉ objet, il les gagne pour le classement général du tournoi.

## Les deux pages

| Page | Pour qui | Rôle |
|---|---|---|
| `index.html` | le grand écran / vidéoprojecteur | la montagne, la souris, le pupitre de l'animateur |
| `manette.html?salle=CODE` | le téléphone du candidat | pavé numérique pour saisir le prix |

## Déroulé le jour J

1. Ouvrir `index.html` sur le PC relié au grand écran, en plein écran (F11).
2. Cliquer sur **Manette** en haut à droite : un QR code et un lien s'affichent, avec le code de la salle.
3. Le candidat scanne le QR code avec son téléphone. Aucun compte n'est nécessaire, il suffit d'avoir internet.
4. Il tape son pseudo, puis son prix, et valide avec **OK** : le prix s'affiche sur le grand écran et la souris bouge.
5. Après le résultat, il passe à l'objet suivant depuis son téléphone (ou l'animateur depuis l'écran).
6. Pour le candidat suivant : **Nouveau candidat** sur l'écran. Le même lien de manette reste valable.

Le bouton de la manette passe au vert (« Manette connectée ») quand un téléphone est relié.
L'animateur peut toujours saisir le prix lui-même sur le pavé de l'écran ou au clavier.

## Réglages (bouton « Réglages » sur l'écran)

- Points de départ (200 par défaut) et points perdus par euro d'écart (1 par défaut).
- Texte « À gagner » affiché au pupitre.
- Liste des objets et de leurs prix (12 exemples fournis : **prix indicatifs à vérifier**).

Les réglages sont gardés dans le navigateur de l'écran.

## Comment fonctionne la liaison

L'écran et les téléphones communiquent par un serveur MQTT public et gratuit (`broker.emqx.io`, via WebSocket sécurisé), sans serveur à nous. Chaque écran a un **code de salle** aléatoire. Seuls les téléphones qui connaissent ce code reçoivent l'état de la partie et peuvent envoyer un prix.

- **Changer de code** (dans le panneau Manette) déconnecte tous les téléphones, utile si un ancien joueur a gardé le lien.
- Un autre serveur MQTT peut être utilisé avec `?broker=wss://hote:port/mqtt` sur l'écran : le lien de la manette le reprend automatiquement.
- Le serveur public n'offre aucune garantie : en cas de souci, l'animateur saisit les prix sur l'écran.

## Fichiers

```
index.html            grand écran
manette.html          téléphone du candidat
css/style.css         styles (couleurs d'azertyparty.fr, police Barlow)
js/jeu.js             le jeu : montagne, souris, règles, réglages
js/manette.js         la manette
js/liaison.js         la liaison écran <-> téléphones (MQTT)
assets/               logo de l'Azerty Club
```

Bibliothèques chargées depuis un CDN : [MQTT.js](https://github.com/mqttjs/MQTT.js) et [qrcodejs](https://github.com/davidshimjs/qrcodejs). Il faut donc internet sur l'écran et sur les téléphones.

## Mise en ligne

Le jeu fait partie du site umbratech.fr : chaque push sur `main` le déploie automatiquement.

- Grand écran : https://umbratech.fr/Azertyrolien/
- Manette : https://umbratech.fr/Azertyrolien/manette.html?salle=CODE (le QR code de l'écran contient le bon lien)
