# Azertyrolien

Le jeu de la Tyrolienne, façon *Juste Prix*, adapté pour le tournoi fun de l'**Azerty Party 2026** (Hippodrome de Pau, 24 & 25 octobre).

Partie **à plusieurs, en simultané** : chaque joueur a sa souris (son pseudo au-dessus, une écharpe à sa couleur) et part de **200 points**. Pour chacun des 3 objets informatiques, tous les joueurs donnent un prix sur leur téléphone pendant **1 minute**. Chaque euro d'écart retire 1 point et fait avancer la souris vers la falaise. À 0 point, elle tombe. À la fin, le classement donne les points restants de chacun, à reporter au classement général du tournoi.

## Les deux pages

| Page | Pour qui | Rôle |
|---|---|---|
| `index.html` | le grand écran / vidéoprojecteur | la montagne, les souris, le pupitre de l'animateur |
| `manette.html?salle=CODE` | le téléphone de chaque joueur | pseudo puis pavé numérique pour donner son prix |

## Déroulé le jour J

1. Ouvrir `index.html` sur le PC relié au grand écran, en plein écran (F11). La page s'ouvre sur la **salle d'attente**, avec le QR code (le bouton **Participer** l'affiche en très grand).
2. Les joueurs scannent le QR code, choisissent un pseudo (obligatoire, 2 à 16 caractères) et appuient sur **C'est parti !**. Chacun apparaît sur l'écran : sa souris au départ et sa carte sous le plateau.
3. Quand tout le monde est inscrit, l'animateur clique sur **Lancer la partie**. Plus personne ne peut rejoindre.
4. Pour chaque objet, un chrono de 60 secondes démarre. Chaque joueur tape son prix et appuie sur **OK** ; il peut le changer jusqu'à la fin du chrono. L'écran montre qui a répondu, sans dévoiler les prix. Quand tout le monde a répondu, le chrono passe à 5 secondes. **Arrêter le chrono** révèle tout de suite.
5. Le juste prix s'affiche, puis toutes les souris avancent ensemble. Un joueur **sans réponse** perd autant de points que le prix de l'objet (comme s'il avait dit 0 €).
6. **Objet suivant** pour continuer. Après le 3ᵉ objet (ou si tout le monde est tombé), le **classement** s'affiche en plein écran.
7. **Rejouer avec les mêmes joueurs** relance directement une partie ; **Nouvelle salle d'attente** repart de zéro.

Si la page de l'écran est rechargée, la partie reprend où elle en était (le chrono de l'objet en cours repart de zéro).

## Saisie manuelle (bouton en haut à droite)

En secours, si un joueur n'a pas de téléphone ou si la liaison ne marche pas :
- ajouter un joueur sans téléphone (pendant la salle d'attente) et retirer un joueur (✕ sur sa carte) ;
- pendant le chrono, cliquer sur la carte d'un joueur puis taper son prix sur le pavé (ou au clavier) ;
- **Nouvelle salle d'attente** vide la liste des joueurs.

## Réglages (bouton « Réglages » sur l'écran)

- Points de départ (200 par défaut), points perdus par euro d'écart (1 par défaut) et temps pour répondre (60 secondes par défaut).
- Texte « À gagner » affiché au-dessus du classement.
- Liste des objets et de leurs prix (12 exemples fournis : **prix indicatifs à vérifier**).

Les réglages sont gardés dans le navigateur de l'écran.

## Comment fonctionne la liaison

L'écran et les téléphones communiquent par un serveur MQTT public et gratuit (`broker.emqx.io`, via WebSocket sécurisé), sans serveur à nous. Chaque écran a un **code de salle** aléatoire. Seuls les téléphones qui connaissent ce code reçoivent l'état de la partie et peuvent envoyer un prix.

- **Changer de code** (dans le panneau Participer) déconnecte tous les téléphones, utile si un ancien joueur a gardé le lien.
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
