# Musiques de Vaelmor

Déposer ici les pistes générées avec Suno, **nommées exactement avec l'ID** ci-dessous (ex. `mus_title.mp3`).
Réglages : mode **Instrumental**, prompt collé dans le champ **Style**, 1 min 30 à 2 min par piste, boucle à nettoyer dans Audacity.

| ID | Usage | Prompt Suno (Style) | Fichier reçu |
|---|---|---|---|
| `mus_title` | Écran titre | `instrumental, epic yet melancholic medieval fantasy theme, solo cello and harp intro, swelling strings, soft choir pads, 16-bit JRPG orchestral feel, cinematic, seamless loop` | reçu ✔ |
| `mus_z1_aubemer` | Plaines (Z1) | `instrumental, warm pastoral fantasy overworld, acoustic guitar, flute, light percussion, golden sunrise mood, adventurous and hopeful, 16-bit SNES/GBA era JRPG style, seamless loop` | reçu ✔ |
| `mus_z2_foret` | Forêt-Racine (Z2) | `instrumental, mysterious enchanted forest, wooden flutes, marimba, soft strings, fireflies ambience, gentle and curious, tension underneath, retro JRPG orchestral, seamless loop` | reçu ✔ |
| `mus_z3_cote` | Côte et marais (Z3) | `instrumental, misty coastal swamp, foghorn-like low brass, sparse piano, ghostly choir pads, eerie and melancholic, slow tempo, dark fantasy JRPG overworld, seamless loop` | reçu ✔ |
| `mus_z4_monts` | Monts de Cendre (Z4) | `instrumental, harsh volcanic mountains, deep war drums, French horns, ember-like pizzicato strings, austere and heroic, slow march rhythm, fantasy JRPG, seamless loop` | reçu ✔ |
| `mus_z5_citadelle` | Citadelle engloutie (Z5) | `instrumental, drowned ancient citadel, dark ambient, pipe organ, underwater reverb, choir whispers, dread and grandeur, slow, dark fantasy final area, seamless loop` | reçu ✔ |
| `mus_village` | Villages | `instrumental, cozy medieval village, lute, tin whistle, accordion, light hand percussion, peaceful and nostalgic, tavern warmth, retro JRPG town theme, seamless loop` | reçu ✔ |
| `mus_valcendre` | Grande ville | `instrumental, fallen royal capital, stately brass fanfare tones, harpsichord, strings, noble but decayed, bittersweet grandeur, medieval fantasy city theme, seamless loop` | reçu ✔ |
| `mus_battle` | Combat normal | `instrumental, tense turn-based tactical battle, driving strings, snare rolls, brass stabs, fast tempo 150 bpm, heroic urgency, Fire Emblem GBA inspired orchestral chiptune-like, seamless loop` | reçu ✔ |
| `mus_boss` | Combat de boss | `instrumental, intense boss battle, pounding timpani, aggressive low strings, choir stabs, dramatic brass, fast tempo 160 bpm, epic tactical RPG, seamless loop` | reçu ✔ |
| `mus_final_boss` | Orvane (boss final) | `instrumental, final boss theme, tragic fallen king, pipe organ, crashing choir, relentless strings, ocean wave sound design, two-part structure calm then furious, epic dark fantasy, seamless loop` | reçu ✔ |
| `mus_victory` | Victoire (jingle) | `instrumental, short triumphant victory jingle, brass fanfare, bright strings, 10 seconds, resolves cleanly, retro JRPG, no loop` | reçu ✔ |
| `mus_prep` | Écran de préparation (jalon M10) | `instrumental, tactical preparation theme before battle, steady snare march, low strings ostinato, hopeful horn melody, calm determination, 100 bpm, Fire Emblem GBA preparation screen inspired, seamless loop` | **à générer** (sans elle, la musique d'exploration continue) |
| `mus_ending` | Les trois fins (jalon M10) | `instrumental, bittersweet ending theme, solo piano and harp opening, warm strings, distant choir, lantern light over the sea, melancholic hope, resolves gently, medieval fantasy JRPG credits, no loop` | **à générer** (sans elle : `mus_title`) |
| `mus_recruit` | Scènes « Parler » (facultative) | `instrumental, gentle reunion theme, acoustic guitar, flute, soft strings, tender and hopeful, slow tempo, Fire Emblem GBA recruit theme inspired, seamless loop` | facultative |
| `mus_arena` | Arène des Cendres (facultative) | `instrumental, arena tournament battle, festive war drums, trumpets, energetic 140 bpm, medieval fantasy gladiator, seamless loop` | facultative (sans elle : `mus_battle`) |
| `mus_ending_nuit` | Fin « La nuit basse » (facultative) | `instrumental, sorrowful ending, low cello, sparse piano, cold wind, tide receding, slow, dark fantasy, no loop` | facultative (sans elle : `mus_ending`) |
| `mus_defeat` | Défaite (jingle) | `instrumental, short somber defeat jingle, low strings, solemn horn, fading harp, 10 seconds, resolves quietly, retro JRPG, no loop` | reçu ✔ |

## Préparer les pistes pour le jeu (jalon M10)

Le jeu ne lit pas ces MP3 : il lit `web/<id>.webm` (Opus) ou `web/<id>.m4a` (AAC), produits par

```
npm run encode-music                       # toutes les pistes (ffmpeg doit être installé)
npm run encode-music -- mus_prep           # une piste nouvelle ou remplacée
npm run encode-music -- --preview <dossier>   # + raccords.m4a pour écouter chaque raccord
```

Le script trouve tout seul les points de boucle (pas besoin de nettoyer la boucle dans Audacity), cuit un raccord en fondu de 50 ms, met toutes les pistes au même volume, encode les deux formats et écrit `data/music.json › tracks`. Une piste nouvelle doit aussi avoir sa place dans `data/music.json › rules` (sinon elle n'est jamais jouée) ; les jingles (sans boucle) sont listés dans `ONE_SHOT` de `tools/encode-music.ts`.

Garder la trace de chaque piste retenue (date de génération, prompt, abonnement Suno utilisé) dans `../CREDITS.md`.
