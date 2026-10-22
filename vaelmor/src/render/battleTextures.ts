/**
 * Textures du combat tactique (jalon M4), toutes générées par code :
 * champ de bataille (images d'eau animée), feuilles de sprites des unités
 * au gabarit commun (`unitSprites.ts`), curseur, cases colorées, marqueurs.
 */
import type Phaser from 'phaser';
import { BF_WATER_FRAMES, paintBattlefield } from './battlefield';
import { PALETTE as P, mixColor } from './palette';
import { PixelCanvas } from './pixelCanvas';
import { CHAR_POSES, type CharPose } from './characterSprite';
import { BATTLE_CELL, SKINS, SKIN_FRAME_MS, SKIN_ROWS } from '../data/skins';
import { hasSkin, skinCombatKey } from './skins';
import { UNIT_H, UNIT_IDLE_FRAMES, UNIT_READY_FRAMES, UNIT_W, UNIT_WALK_FRAMES, paintUnitSprite, type UnitFrameKind, type UnitTeam } from './unitSprites';

export const BATTLE_TEX = {
  field: (key: string, frame: number): string => `battle:field:${key}:${frame}`,
  /** Unités : gabarit 16×28 équipé selon la classe, aux couleurs du camp (décision n°60). */
  ms: (sprite: string, team: UnitTeam): string => `battle:unit:${sprite}:${team}`,
  msFrame: (kind: UnitFrameKind, frame: number): string => `${kind}_${frame}`,
  msIdle: (sprite: string, team: UnitTeam): string => `battle:unit:${sprite}:${team}:idle`,
  /** Unité survolée ou choisie : elle brandit son arme. */
  msReady: (sprite: string, team: UnitTeam): string => `battle:unit:${sprite}:${team}:ready`,
  msWalk: (sprite: string, team: UnitTeam, view: CharPose): string => `battle:unit:${sprite}:${team}:walk:${view}`,
  cursor: (frame: number): string => `battle:cursor:${frame}`,
  tile: 'battle:tile',
  crown: 'battle:crown',
  heroMark: 'battle:heroMark',
  spark: 'battle:spark',
  /** Marque de statut au-dessus d'une unité (jalon M5) : renfort, affaiblissement, gel. */
  status: (kind: 'buff' | 'debuff' | 'stun'): string => `battle:status:${kind}`,
  /** Ronces du Mur de ronces, posées sur une case (un peu plus hautes qu'elle). */
  brambles: 'battle:brambles',
  /** Halo doux (aura du boss en phase 2, éclat d'une compétence), teinté par le moteur. */
  aura: 'battle:aura',
  /** Flèche du chemin de déplacement : segment droit (W–E), virage (W–S), pointe (vers l'est), départ (vers l'est). */
  arrow: (kind: 'line' | 'corner' | 'head' | 'start'): string => `battle:arrow:${kind}`,
  px: 'battle:px',
} as const;

/** Peint les images du champ de bataille d'une carte (une par image d'eau). */
export function ensureBattlefield(scene: Phaser.Scene, key: string, rows: readonly (readonly string[])[], seed: number): void {
  if (scene.textures.exists(BATTLE_TEX.field(key, 0))) return;
  for (let frame = 0; frame < BF_WATER_FRAMES; frame++) {
    const field = paintBattlefield(rows, frame, seed);
    const canvas = new PixelCanvas(field.width, field.height);
    for (let i = 0; i < field.pixels.length; i++) {
      const c = field.pixels[i] as number;
      if (c >= 0) canvas.set(i % field.width, Math.floor(i / field.width), c);
    }
    canvas.toTexture(scene, BATTLE_TEX.field(key, frame));
  }
}

/**
 * Feuille d'une unité (décision n°60) : 2 images d'attente (respiration) puis
 * 4 images de marche par pose (face, dos, profil), et leurs animations.
 */
export function ensureMapSprite(scene: Phaser.Scene, sprite: string, team: UnitTeam): void {
  const key = BATTLE_TEX.ms(sprite, team);
  if (team === 'player' && hasSkin(scene, sprite)) {
    ensureSkinMapSprite(scene, sprite, key);
    return;
  }
  if (!scene.textures.exists(key)) {
    const rows: [UnitFrameKind, number][] = [['idle', UNIT_IDLE_FRAMES], ['ready', UNIT_READY_FRAMES], ...CHAR_POSES.map((v) => [v, UNIT_WALK_FRAMES] as [CharPose, number])];
    const sheet = new PixelCanvas(UNIT_W * Math.max(UNIT_WALK_FRAMES, UNIT_READY_FRAMES), UNIT_H * rows.length);
    rows.forEach(([kind, count], row) => {
      for (let f = 0; f < count; f++) paintUnitSprite({ set: (x, y, color) => sheet.set(x, y, color) }, f * UNIT_W, row * UNIT_H, sprite, team, kind, f);
    });
    sheet.toTexture(scene, key);
    const texture = scene.textures.get(key);
    rows.forEach(([kind, count], row) => {
      for (let f = 0; f < count; f++) texture.add(BATTLE_TEX.msFrame(kind, f), 0, f * UNIT_W, row * UNIT_H, UNIT_W, UNIT_H);
    });
  }
  const idle = BATTLE_TEX.msIdle(sprite, team);
  if (!scene.anims.exists(idle)) {
    scene.anims.create({
      key: idle,
      frames: [
        { key, frame: BATTLE_TEX.msFrame('idle', 0), duration: 640 },
        { key, frame: BATTLE_TEX.msFrame('idle', 1), duration: 520 },
      ],
      repeat: -1,
    });
  }
  const ready = BATTLE_TEX.msReady(sprite, team);
  if (!scene.anims.exists(ready)) {
    // Ramassé, geste, éclat tenu, retour ; une pause debout avant de recommencer.
    const durations = [260, 90, 300, 110];
    scene.anims.create({
      key: ready,
      frames: durations.map((duration, f) => ({ key, frame: BATTLE_TEX.msFrame('ready', f), duration })),
      repeat: -1,
    });
  }
  for (const view of CHAR_POSES) {
    const walk = BATTLE_TEX.msWalk(sprite, team, view);
    if (scene.anims.exists(walk)) continue;
    scene.anims.create({
      key: walk,
      frames: Array.from({ length: UNIT_WALK_FRAMES }, (_, f) => ({ key, frame: BATTLE_TEX.msFrame(view, f) })),
      frameRate: 8,
      repeat: -1,
    });
  }
}

/**
 * Unité de la compagnie peinte (feuille `assets/personnages/<id>.png`) : on garde les mêmes noms d'images
 * et d'animations que les sprites générés (`idle_0`, `ready_2`, `down_3`…), donc le reste du combat,
 * de la préparation et des panneaux n'a rien à savoir. Attente = pose de face ; « prêt » et marche = marche
 * sur place / déplacement (la feuille compte 4 ou 8 images par direction).
 */
function ensureSkinMapSprite(scene: Phaser.Scene, id: string, key: string): void {
  const def = SKINS.find((k) => k.id === id);
  if (!def) return;
  if (!scene.textures.exists(key)) {
    const source = scene.textures.get(skinCombatKey(id)).getSourceImage() as HTMLImageElement;
    const texture = scene.textures.addImage(key, source);
    if (!texture) return;
    const at = (row: number, col: number): [number, number] => [col * BATTLE_CELL, row * BATTLE_CELL];
    const add = (name: string, row: number, col: number): void => {
      const [x, y] = at(row, col);
      texture.add(name, 0, x, y, BATTLE_CELL, BATTLE_CELL);
    };
    SKIN_ROWS.forEach((pose, row) => {
      for (let f = 0; f < def.frames; f++) add(BATTLE_TEX.msFrame(pose, f), row, f);
    });
    for (let f = 0; f < UNIT_IDLE_FRAMES; f++) add(BATTLE_TEX.msFrame('idle', f), 0, 0);
    for (let f = 0; f < UNIT_READY_FRAMES; f++) add(BATTLE_TEX.msFrame('ready', f), 0, 0);
  }
  const frames = (pose: string): { key: string; frame: string }[] => Array.from({ length: def.frames }, (_, f) => ({ key, frame: BATTLE_TEX.msFrame(pose as UnitFrameKind, f) }));
  const make = (animKey: string, list: { key: string; frame: string }[], frameMs: number): void => {
    if (!scene.anims.exists(animKey)) scene.anims.create({ key: animKey, frames: list, frameRate: 1000 / frameMs, repeat: -1 });
  };
  const idleKey = BATTLE_TEX.msIdle(id, 'player');
  if (!scene.anims.exists(idleKey)) {
    scene.anims.create({ key: idleKey, frames: [{ key, frame: BATTLE_TEX.msFrame('idle', 0) }, { key, frame: BATTLE_TEX.msFrame('idle', 1) }], frameRate: 2, repeat: -1 });
  }
  make(BATTLE_TEX.msReady(id, 'player'), frames('down'), SKIN_FRAME_MS * 1.6);
  for (const view of CHAR_POSES) make(BATTLE_TEX.msWalk(id, 'player', view), frames(view), SKIN_FRAME_MS);
}

/** Curseur, cases colorées, couronne du boss, étoile du héros, étincelle. */
export function ensureBattleFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(BATTLE_TEX.tile)) return;

  // Curseur : quatre coins dorés qui « respirent » (2 images, 20 × 20).
  for (const frame of [0, 1]) {
    const size = 20;
    const c = new PixelCanvas(size, size);
    const inset = frame === 0 ? 0 : 1;
    const ink = mixColor(P.ombreProfonde, P.nuit, 0.4);
    const corner = (x: number, y: number, sx: number, sy: number): void => {
      for (let i = 0; i < 6; i++) {
        c.set(x + sx * i, y, P.lumiereDoree);
        c.set(x, y + sy * i, P.lumiereDoree);
        c.set(x + sx * i, y + sy, i < 5 ? P.ambre : ink);
        c.set(x + sx, y + sy * i, i < 5 ? P.ambre : ink);
      }
      c.set(x, y, 0xfff8ee);
    };
    corner(inset, inset, 1, 1);
    corner(size - 1 - inset, inset, -1, 1);
    corner(inset, size - 1 - inset, 1, -1);
    corner(size - 1 - inset, size - 1 - inset, -1, -1);
    c.toTexture(scene, BATTLE_TEX.cursor(frame));
  }

  // Case colorée (teintée par le moteur) : fond translucide, liseré plus franc, coins arrondis.
  const tile = new PixelCanvas(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const corner = (x === 0 || x === 15) && (y === 0 || y === 15);
      if (corner) continue;
      const inner = x === 1 || y === 1 || x === 14 || y === 14;
      tile.set(x, y, 0xffffff, edge ? 200 : inner ? 120 : 90);
    }
  }
  tile.toTexture(scene, BATTLE_TEX.tile);

  // Couronne du boss (7 × 5).
  const crown = new PixelCanvas(7, 5);
  ['y.y.y.y', 'yyyyyyy', 'yryyyry', 'yyyyyyy', 'ddddddd'].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'y') crown.set(x, y, x < 3 ? P.lumiereDoree : P.jauneBle);
      if (ch === 'r') crown.set(x, y, P.rougeCendre);
      if (ch === 'd') crown.set(x, y, P.ambre);
    }),
  );
  crown.toTexture(scene, BATTLE_TEX.crown);

  // Marque du héros : petite étoile (5 × 5).
  const star = new PixelCanvas(5, 5);
  ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'].forEach((row, y) => [...row].forEach((ch, x) => ch === 'y' && star.set(x, y, x < 2 ? P.lumiereDoree : P.cyanEclat)));
  star.toTexture(scene, BATTLE_TEX.heroMark);

  // Étincelle d'impact (croix 5 × 5, blanche, teintée par l'émetteur).
  const spark = new PixelCanvas(5, 5);
  for (const [x, y, a] of [[2, 0, 160], [2, 1, 255], [0, 2, 160], [1, 2, 255], [2, 2, 255], [3, 2, 255], [4, 2, 160], [2, 3, 255], [2, 4, 160]] as const) spark.set(x, y, 0xffffff, a);
  spark.toTexture(scene, BATTLE_TEX.spark);

  // Flèche de déplacement façon GBA : ruban cyan clair à liseré sombre, dessiné vers l'est.
  const ribbon = (name: 'line' | 'corner' | 'head' | 'start', cells: (x: number, y: number) => boolean): void => {
    const c = new PixelCanvas(16, 16);
    const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < 16 && y < 16 && cells(x, y);
    const ink = mixColor(P.ombreProfonde, P.nuit, 0.5);
    const dark = mixColor(P.cyanEclat, P.bleuNuit, 0.45);
    for (let y = -1; y <= 16; y++) {
      for (let x = -1; x <= 16; x++) {
        if (inside(x, y)) {
          const light = !inside(x, y - 1) || !inside(x - 1, y);
          const shade = !inside(x, y + 1) || !inside(x + 1, y);
          c.set(x, y, light ? 0xeafcff : shade ? dark : P.cyanEclat);
        } else if (x >= 0 && y >= 0 && x < 16 && y < 16 && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) {
          c.set(x, y, ink);
        }
      }
    }
    c.toTexture(scene, BATTLE_TEX.arrow(name));
  };
  const band = (_x: number, y: number): boolean => y >= 6 && y <= 9;
  ribbon('line', (x, y) => band(x, y) && x >= 0);
  ribbon('corner', (x, y) => (y >= 6 && y <= 9 && x <= 9) || (x >= 6 && x <= 9 && y >= 6));
  ribbon('start', (x, y) => y >= 6 && y <= 9 && x >= 6);
  ribbon('head', (x, y) => (y >= 6 && y <= 9 && x <= 5) || (x >= 5 && Math.abs(y - 7.5) <= (15 - x) * 0.66 + 0.5));

  const px = new PixelCanvas(1, 1);
  px.set(0, 0, 0xffffff);
  px.toTexture(scene, BATTLE_TEX.px);

  // Marques de statut (7 × 7, contour sombre teinté) : flèche dorée (renfort), flèche rouge (affaiblissement), flocon cyan (gel).
  const ink = mixColor(P.ombreProfonde, P.nuit, 0.4);
  const mark = (kind: 'buff' | 'debuff' | 'stun', rows: readonly string[], light: number, dark: number): void => {
    const c = new PixelCanvas(7, 7);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === 'o') c.set(x, y, ink);
      if (ch === 'x') c.set(x, y, light);
      if (ch === 'd') c.set(x, y, dark);
    }));
    c.toTexture(scene, BATTLE_TEX.status(kind));
  };
  mark('buff', ['..ooo..', '.oxxxo.', 'oxxxxxo', 'ooxxdoo', '.oxxdo.', '.oxddo.', '.ooooo.'], P.lumiereDoree, P.ambre);
  mark('debuff', ['.ooooo.', '.oxddo.', '.oxxdo.', 'ooxxdoo', 'oxxxxdo', '.oxxdo.', '..ooo..'], P.braise, P.rougeCendre);
  mark('stun', ['o.ooo.o', '.oxoxo.', 'oxxxxxo', 'ooxdxoo', 'oxxxxxo', '.oxoxo.', 'o.ooo.o'], 0xeafcff, P.cyanEclat);

  // Ronces : tiges sombres entrelacées, feuilles olive, épines brique (16 × 20, la touffe dépasse vers le haut).
  const br = new PixelCanvas(16, 20);
  const stem = mixColor(P.oliveSombre, P.terreSombre, 0.35);
  const leaf = P.olive;
  const leafLight = P.oliveClair;
  const thorn = P.brique;
  const curves: [number, number, number][] = [
    [2, 19, 1],
    [6, 19, -1],
    [10, 19, 1],
    [13, 19, -1],
  ];
  for (const [x0, y0, dir] of curves) {
    let x = x0;
    for (let y = y0; y > 3; y--) {
      br.set(x, y, stem);
      br.set(x + dir, y, mixColor(stem, P.ombreProfonde, 0.3));
      if ((y + x0) % 4 === 0) x = Math.max(0, Math.min(15, x + dir));
      if ((y + x0) % 5 === 0) br.set(Math.max(0, Math.min(15, x - dir)), y, thorn);
      if ((y + x0) % 6 === 1) {
        br.set(Math.max(0, Math.min(15, x + 2 * dir)), y, leaf);
        br.set(Math.max(0, Math.min(15, x + 2 * dir)), y - 1, leafLight);
      }
    }
  }
  for (let x = 0; x < 16; x++) br.set(x, 19, mixColor(P.ombreViolette, P.oliveSombre, 0.5), 160);
  br.toTexture(scene, BATTLE_TEX.brambles);

  // Halo : disque doux blanc (32 × 16), teinté et additif.
  const aura = new PixelCanvas(32, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot((x - 15.5) / 16, (y - 7.5) / 8);
      if (d < 1) aura.set(x, y, 0xffffff, Math.round(200 * (1 - d) * (1 - d)));
    }
  }
  aura.toTexture(scene, BATTLE_TEX.aura);
}
