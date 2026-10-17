/**
 * Sprites de carte du combat (décision n°58), dans l'esprit des sprites de
 * carte de Fire Emblem GBA : petits (16 × 20, une case de large), trapus, un
 * contour sombre, la **couleur du camp** sur les vêtements (bleu pour la
 * compagnie, rouge pour l'ennemi) et une silhouette qui dit la classe au
 * premier coup d'œil : casque à plumet et bouclier-tour du Gardien, arc du
 * Veilleur, tome rougeoyant de l'Héritier, lanterne de la Porte-Lanterne,
 * bannière du Héraut, harpon du Chasseur, hache et bandana des Écumeurs…
 *
 * Chaque sprite est décrit par une **fiche** (`MapSpriteSpec`) : coiffe,
 * corps, cape, arme, bouclier, couleurs propres. Le dessin est fait par code
 * (matières → ombrage automatique éclairé en haut à gauche → contour), pour
 * trois vues : face (attente et marche vers le bas), dos, profil (retourné
 * par le moteur pour la gauche).
 *
 * Module sans DOM : il peint dans un « puits de pixels ».
 */
import { PALETTE as P, mixColor } from './palette';
import type { PixelSink } from './waterTile';

export const MS_W = 16;
export const MS_H = 20;
/** Images d'attente (respiration à la manière GBA) et de marche. */
export const MS_IDLE_FRAMES = 3;
export const MS_WALK_FRAMES = 4;
export const MS_VIEWS = ['down', 'up', 'side'] as const;
export type MsView = (typeof MS_VIEWS)[number];
export type MsTeam = 'player' | 'enemy';

export type Headgear = 'helmet' | 'hood' | 'hat' | 'bandana' | 'hair' | 'circlet' | 'horned' | 'leaves' | 'goggles';
export type BodyKind = 'armor' | 'tunic' | 'robe';
export type WeaponKind =
  | 'sword'
  | 'spear'
  | 'axe'
  | 'greataxe'
  | 'bow'
  | 'crossbow'
  | 'tome'
  | 'staff_lantern'
  | 'staff_stone'
  | 'staff_branch'
  | 'harpoon'
  | 'banner'
  | 'daggers'
  | 'flask'
  | 'torch';

export interface MapSpriteSpec {
  readonly head: Headgear;
  readonly body: BodyKind;
  readonly weapon: WeaponKind;
  readonly shield?: boolean;
  readonly cape?: boolean;
  /** Carquois, fourrure… petit détail dans le dos. */
  readonly quiver?: boolean;
  readonly hair: number;
  readonly skin?: number;
  /** Couleur propre à la classe (plumet, gemme, flamme, foulard). */
  readonly accent: number;
  /** Lueur de l'arme (tome, lanterne, torche) : la flamme ou la magie palpite. */
  readonly glow?: number;
}

const SKIN = mixColor(P.sable, P.orangeForge, 0.2);
const SKIN_DARK = mixColor(P.terreCuite, P.terreSombre, 0.3);
const SKIN_PALE = mixColor(P.parchemin, P.sable, 0.45);

/** Fiches des sprites : classes jouables, héros, ennemis. */
export const MAP_SPRITES: Readonly<Record<string, MapSpriteSpec>> = {
  heros: { head: 'hood', body: 'tunic', weapon: 'sword', cape: true, hair: P.terreSombre, accent: P.rougeCendre },
  gardien_des_marees: { head: 'helmet', body: 'armor', weapon: 'spear', shield: true, hair: P.sable, accent: P.cyanEclat },
  lame_du_serment: { head: 'circlet', body: 'tunic', weapon: 'sword', cape: true, hair: mixColor(P.braise, P.ocre, 0.5), skin: SKIN_PALE, accent: P.jauneBle },
  veilleur_des_falaises: { head: 'hood', body: 'tunic', weapon: 'bow', quiver: true, hair: P.terreSombre, accent: P.vertDore },
  heritier_des_cendres: { head: 'hood', body: 'robe', weapon: 'tome', hair: P.parchemin, skin: SKIN_PALE, accent: P.orangeForge, glow: P.braise },
  porte_lanterne: { head: 'circlet', body: 'robe', weapon: 'staff_lantern', hair: mixColor(P.jauneBle, P.ocreClair, 0.5), accent: P.parchemin, glow: P.lumiereDoree },
  heraut_des_bannieres: { head: 'hair', body: 'tunic', weapon: 'banner', cape: true, hair: mixColor(P.terreSombre, P.ombreProfonde, 0.3), skin: SKIN_DARK, accent: P.jauneBle },
  alchimiste_des_saisons: { head: 'hat', body: 'robe', weapon: 'flask', hair: P.ecume, accent: P.vertDore, glow: P.cyanEclat },
  danseur_des_courants: { head: 'bandana', body: 'tunic', weapon: 'daggers', hair: mixColor(P.bleuNuit, P.ardoise, 0.3), skin: SKIN_DARK, accent: P.cyanEclat },
  invocateur_de_pierres_anciennes: { head: 'hood', body: 'robe', weapon: 'staff_stone', hair: P.grisRoux, accent: P.cyanEclat, glow: P.cyanEclat },
  faconneur_de_racines: { head: 'leaves', body: 'robe', weapon: 'staff_branch', hair: mixColor(P.mousse, P.olive, 0.4), accent: P.vertDore },
  ingenieur_des_ruines: { head: 'goggles', body: 'tunic', weapon: 'crossbow', quiver: true, hair: mixColor(P.terreSombre, P.ocre, 0.3), accent: P.cyanEclat },
  chasseur_de_serpents_de_mer: { head: 'bandana', body: 'tunic', weapon: 'harpoon', quiver: true, hair: P.ecume, skin: SKIN_DARK, accent: P.ecume },

  ecumeur_sabreur: { head: 'bandana', body: 'tunic', weapon: 'axe', hair: P.terreSombre, accent: P.rougeCendre },
  ecumeur_archer: { head: 'hood', body: 'tunic', weapon: 'bow', quiver: true, hair: P.terreSombre, accent: P.ocre },
  ecumeur_lancier: { head: 'helmet', body: 'armor', weapon: 'spear', shield: true, hair: P.terreSombre, skin: SKIN_DARK, accent: P.rougeCendre },
  ecumeur_incendiaire: { head: 'hood', body: 'robe', weapon: 'torch', hair: P.terreSombre, accent: P.orangeForge, glow: P.braise },
  brakk: { head: 'horned', body: 'armor', weapon: 'greataxe', cape: true, hair: P.rougeCendre, skin: SKIN_DARK, accent: P.jauneBle },
};

/** Couleur des vêtements selon le camp (palette d'équipe à la manière GBA). */
export const TEAM_CLOTH: Readonly<Record<MsTeam, number>> = {
  player: mixColor(mixColor(P.ciel, P.bleuNuit, 0.42), 0x3a6fd8, 0.45),
  enemy: mixColor(P.rougeCendre, P.braise, 0.18),
};

/* ---------- Matières et ombrage ---------- */

type Mat = 'c' | 'C' | 's' | 'h' | 'm' | 'w' | 'g' | 'l' | 'x' | 'f' | 'e' | 'b' | 'p' | 'k' | 'n';

interface Ramp {
  readonly dark: number;
  readonly base: number;
  readonly light: number;
}

const SHADE = mixColor(P.ombreViolette, P.ombreProfonde, 0.3);
const ramp = (base: number, k = 1): Ramp => ({ dark: mixColor(base, SHADE, 0.38 * k), base, light: mixColor(base, P.lumiereChaude, 0.3 * k) });

class Grid {
  readonly cells: (Mat | null)[] = new Array(MS_W * MS_H).fill(null);
  set(x: number, y: number, m: Mat): void {
    if (x < 0 || y < 0 || x >= MS_W || y >= MS_H) return;
    this.cells[y * MS_W + x] = m;
  }
  get(x: number, y: number): Mat | null {
    if (x < 0 || y < 0 || x >= MS_W || y >= MS_H) return null;
    return this.cells[y * MS_W + x] ?? null;
  }
  rect(x: number, y: number, w: number, h: number, m: Mat): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, m);
  }
  vline(x: number, y0: number, y1: number, m: Mat): void {
    for (let y = y0; y <= y1; y++) this.set(x, y, m);
  }
}

/* ---------- Dessin d'une image ---------- */

interface Pose {
  readonly view: MsView;
  /** Le haut du corps descend d'un pixel (respiration, pas). */
  readonly bob: number;
  /** Jambe levée : −1 gauche, +1 droite, 0 aucune. */
  readonly step: number;
  /** Image (pour faire palpiter flammes et magie). */
  readonly tick: number;
}

function drawLegs(g: Grid, spec: MapSpriteSpec, pose: Pose): void {
  const side = pose.view === 'side';
  const lx = side ? 6 : 6;
  const rx = side ? 8 : 9;
  const left = pose.step === -1 ? 1 : 0;
  const right = pose.step === 1 ? 1 : 0;
  if (spec.body !== 'robe') {
    g.rect(lx, 17 - left, 2, 2, 'p');
    g.rect(rx, 17 - right, 2, 2, 'p');
  }
  g.rect(lx - (side ? 0 : 1) + (side && pose.step === -1 ? 1 : 0), 19 - left, 3, 1, 'b');
  g.rect(rx, 19 - right, side ? 3 : 3, 1, 'b');
}

function drawBody(g: Grid, spec: MapSpriteSpec, pose: Pose): void {
  const b = pose.bob;
  const side = pose.view === 'side';
  const x0 = side ? 6 : 5;
  const w = side ? 5 : 7;
  // Cape dans le dos : dépasse sous les bras, de face ; tout le dos, de dos.
  if (spec.cape) {
    if (pose.view === 'up') g.rect(4, 11 + b, 9, 7, 'C');
    else if (side) g.rect(4, 11 + b, 2, 7, 'C');
    else {
      g.vline(4, 12 + b, 17, 'C');
      g.vline(12, 12 + b, 17, 'C');
    }
  }
  if (spec.quiver) {
    if (pose.view === 'up') g.rect(9, 9 + b, 2, 6, 'l');
    else if (side) g.rect(4, 10 + b, 2, 5, 'l');
    else g.rect(11, 9 + b, 1, 2, 'w');
  }
  if (spec.body === 'robe') {
    // Robe évasée jusqu'aux pieds.
    g.rect(x0, 11 + b, w, 4, 'c');
    g.rect(x0 - 1, 15 + b, w + 2, 4 - b, 'c');
    g.rect(x0 - 1, 18, w + 2, 1, 'C');
    if (!side) g.vline(8, 11 + b, 18, pose.view === 'up' ? 'c' : 'x');
  } else if (spec.body === 'armor') {
    g.rect(x0, 11 + b, w, 5, 'm');
    if (pose.view !== 'up') g.rect(side ? x0 + 1 : 7, 12 + b, side ? 3 : 3, 4, 'c'); // tabard aux couleurs du camp
    g.rect(x0, 16 + b, w, 1, 'l');
    if (!side) {
      g.rect(4, 11 + b, 2, 2, 'm'); // épaulières
      g.rect(11, 11 + b, 2, 2, 'm');
    }
  } else {
    g.rect(x0, 11 + b, w, 5, 'c');
    g.rect(x0, 15 + b, w, 1, 'l');
    if (pose.view !== 'up' && !side) g.set(8, 15 + b, 'g'); // boucle
    if (pose.view === 'down') g.vline(8, 11 + b, 12 + b, 'x'); // col, foulard
  }
  // Bras.
  const arm: Mat = spec.body === 'armor' ? 'm' : 'c';
  if (side) {
    g.rect(8, 12 + b, 2, 3, arm);
    g.set(9, 15 + b, 's');
  } else {
    g.vline(4, 13 + b, 14 + b, arm);
    g.vline(12, 13 + b, 14 + b, arm);
    g.set(4, 15 + b, 's');
    g.set(12, 15 + b, 's');
  }
}

/* Têtes en « pixel art texte » : 9 colonnes (x 4 à 12), rangées y 2 à 10. */
type Rows = readonly string[];
const HEADS: Readonly<Record<'hair' | 'hood' | 'helmet', Readonly<Record<MsView, Rows>>>> = {
  hair: {
    down: ['.........', '...hhh...', '..hhhhh..', '.hhhhhhh.', '.hhhhhhh.', '.hsssssh.', '.hsesesh.', '.hsssssh.', '..sssss..'],
    up: ['.........', '...hhh...', '..hhhhh..', '.hhhhhhh.', '.hhhhhhh.', '.hhhhhhh.', '.hhhhhhh.', '.hhhhhhh.', '..sssss..'],
    side: ['.........', '...hhh...', '..hhhhh..', '.hhhhhhh.', '.hhhhhhs.', '.hhhssss.', '.hhhsses.', '.hhhssss.', '..hssss..'],
  },
  hood: {
    down: ['....C....', '...CCC...', '..CCCCC..', '.CCCCCCC.', '.CCsssCC.', '.CsssssC.', '.CsesesC.', '.CCsssCC.', '..CxxxC..'],
    up: ['....C....', '...CCC...', '..CCCCC..', '.CCCCCCC.', '.CCCCCCC.', '.CCCCCCC.', '.CCCCCCC.', '.CCCCCCC.', '..CCCCC..'],
    side: ['...C.....', '..CCC....', '.CCCCC...', '.CCCCCCC.', '.CCCCsss.', '.CCCssss.', '.CCCsses.', '.CCCssss.', '..CCCss..'],
  },
  helmet: {
    down: ['....x....', '...mmm...', '..mmmmm..', '.mmmmmmm.', '.mnnnnnm.', '.msssssm.', '.msesesm.', '.mmsssmm.', '..mmmmm..'],
    up: ['....x....', '...mmm...', '..mmmmm..', '.mmmmmmm.', '.mmmmmmm.', '.mmmmmmm.', '.mmmmmmm.', '.mmmmmmm.', '..mmmmm..'],
    side: ['...x.....', '..mmm....', '.mmmmm...', '.mmmmmmm.', '.mmmmnnn.', '.mmmssss.', '.mmmsses.', '.mmmmsss.', '..mmmmm..'],
  },
};

function stamp(g: Grid, rows: Rows, x0: number, y0: number): void {
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') g.set(x0 + x, y0 + y, ch as Mat);
    }),
  );
}

function drawHead(g: Grid, spec: MapSpriteSpec, pose: Pose): void {
  const b = pose.bob;
  const view = pose.view;
  const side = view === 'side';
  const back = view === 'up';
  const head = spec.head;
  const base = head === 'hood' ? 'hood' : head === 'helmet' || head === 'horned' ? 'helmet' : 'hair';
  stamp(g, HEADS[base][view], 4, 2 + b);
  if (head === 'horned') {
    g.set(8, 2 + b, 'm');
    if (side) g.set(7, 2 + b, 'm');
    // Cornes recourbées.
    const horns: readonly (readonly [number, number])[] = side ? [[4, 5], [3, 4], [3, 3], [4, 2]] : [[4, 5], [3, 4], [2, 3], [2, 2], [12, 5], [13, 4], [14, 3], [14, 2]];
    for (const [x, y] of horns) g.set(x, y + b, 'k');
  } else if (head === 'hat') {
    // Chapeau pointu à large bord, pointe penchée.
    g.rect(3, 6 + b, 11, 1, 'C');
    const cone: readonly (readonly [number, number, number])[] = [[9, 0, 1], [8, 1, 2], [7, 2, 3], [6, 3, 5], [5, 4, 7], [5, 5, 7]];
    for (const [x, y, w] of cone) g.rect(x, y + b, w, 1, 'C');
    g.rect(5, 5 + b, 7, 1, 'x'); // ruban
  } else if (head === 'bandana') {
    g.rect(side ? 5 : 5, 4 + b, 7, 2, 'x');
    if (side) g.rect(4, 5 + b, 1, 3, 'x');
    else g.rect(12, 5 + b, 1, 3, 'x');
  } else if (head === 'circlet') {
    if (!back) {
      g.rect(5, 5 + b, 7, 1, 'g');
      if (!side) g.set(8, 5 + b, 'x');
    }
    // Cheveux longs sur les épaules.
    g.vline(4, 6 + b, 11 + b, 'h');
    if (!side) g.vline(12, 6 + b, 11 + b, 'h');
  } else if (head === 'leaves') {
    for (const [x, y] of [[5, 3], [6, 2], [8, 1], [10, 2], [11, 3], [7, 2], [9, 2]] as const) g.set(x, y + b, 'x');
  } else if (head === 'goggles') {
    if (!back) {
      g.rect(5, 6 + b, 7, 1, 'l');
      if (side) g.set(10, 6 + b, 'g');
      else {
        g.set(6, 6 + b, 'g');
        g.set(10, 6 + b, 'g');
      }
    }
  }
}

function drawWeapon(g: Grid, spec: MapSpriteSpec, pose: Pose): void {
  const b = pose.bob;
  const side = pose.view === 'side';
  // Main qui tient l'arme : main droite de face (côté droit de l'image), main avant de profil.
  const hx = side ? 10 : 13;
  const hy = 15 + b;
  const flicker = pose.tick % 2 === 0;
  switch (spec.weapon) {
    case 'sword':
      g.vline(hx, hy - 9, hy - 2, 'm');
      g.set(hx, hy - 10, 'k');
      g.rect(hx - 1, hy - 1, 3, 1, 'g');
      g.set(hx, hy, 'l');
      break;
    case 'spear':
      g.vline(hx, Math.max(0, hy - 15), hy + 3, 'w');
      g.rect(hx, Math.max(0, hy - 16), 1, 2, 'm');
      g.set(hx - 1, hy - 14, 'm');
      g.set(hx + 1, hy - 14, 'm');
      break;
    case 'harpoon':
      g.vline(hx, Math.max(0, hy - 14), hy + 3, 'w');
      g.rect(hx, Math.max(0, hy - 16), 1, 3, 'm');
      g.set(hx - 1, hy - 13, 'm');
      g.set(hx + 1, hy - 13, 'm');
      g.set(hx + 1, hy - 7, 'k'); // corde
      g.set(hx + 1, hy - 6, 'k');
      break;
    case 'axe':
      g.vline(hx, hy - 8, hy + 1, 'w');
      g.rect(hx + 1, hy - 8, 2, 3, 'm');
      g.rect(hx - 1, hy - 7, 1, 2, 'm');
      break;
    case 'greataxe':
      g.vline(hx, hy - 12, hy + 2, 'w');
      g.rect(hx + 1, hy - 12, 2, 5, 'm');
      g.rect(hx - 2, hy - 11, 2, 4, 'm');
      g.set(hx, hy - 13, 'k');
      break;
    case 'bow': {
      // Arc long : deux branches courbes, corde claire.
      for (let y = -9; y <= 2; y++) {
        const bend = Math.abs(y + 3.5) < 2.5 ? 2 : Math.abs(y + 3.5) < 4.5 ? 1 : 0;
        g.set(hx + bend - 1, hy + y, 'w');
      }
      g.vline(hx - 1, hy - 8, hy + 1, 'k');
      g.set(hx, hy - 4, 'l');
      break;
    }
    case 'crossbow':
      g.rect(hx - 3, hy - 1, 5, 1, 'w');
      g.vline(hx + 1, hy - 3, hy + 1, 'm');
      g.set(hx + 2, hy - 1, 'g');
      break;
    case 'tome':
      g.rect(hx - 1, hy - 2, 3, 3, 'x');
      g.vline(hx - 1, hy - 2, hy, 'l');
      if (spec.glow && flicker) g.set(hx + 1, hy - 3, 'f');
      break;
    case 'staff_lantern':
    case 'staff_stone':
    case 'staff_branch':
      g.vline(hx, hy - 12, hy + 3, 'w');
      if (spec.weapon === 'staff_lantern') {
        g.rect(hx - 1, hy - 14, 3, 3, 'g');
        g.set(hx, hy - 13, flicker ? 'f' : 'x');
      } else if (spec.weapon === 'staff_stone') {
        g.rect(hx - 1, hy - 15, 3, 3, 'm');
        g.set(hx, hy - 14, flicker ? 'f' : 'x');
      } else {
        for (const [dx, dy] of [[-1, -13], [1, -14], [0, -15], [2, -12], [-2, -12]] as const) g.set(hx + dx, hy + dy, 'x');
      }
      break;
    case 'banner': {
      const px = side ? hx : 12;
      g.vline(px, 0 + b, hy + 3, 'w');
      // Drapeau aux couleurs du camp, frappé du symbole de la classe.
      const fx = side ? px + 1 : px - 5;
      g.rect(fx, 1 + b, 5, 4, 'c');
      g.rect(fx, 5 + b, 5, 1, 'C');
      g.set(fx + 2, 2 + b, 'x');
      g.set(fx + 2, 3 + b, 'x');
      g.set(px, 0, 'g');
      break;
    }
    case 'daggers':
      g.vline(hx, hy - 4, hy - 1, 'm');
      g.set(hx, hy - 5, 'k');
      if (!side) {
        g.vline(3, hy - 4, hy - 1, 'm');
        g.set(3, hy - 5, 'k');
      }
      break;
    case 'flask':
      g.rect(hx - 1, hy - 3, 3, 3, 'x');
      g.set(hx, hy - 4, 'k');
      if (flicker) g.set(hx, hy - 5, 'f');
      if (!side) g.rect(9, 16 + b, 2, 1, 'g'); // fioles à la ceinture
      break;
    case 'torch':
      g.vline(hx, hy - 6, hy + 1, 'w');
      g.rect(hx - 1, hy - 9, 3, 3, 'f');
      g.set(hx, flicker ? hy - 10 : hy - 9, 'x');
      break;
  }
  if (spec.shield) {
    // Bouclier-tour, tenu à gauche (de face) ou devant (de profil).
    if (pose.view === 'down') {
      g.rect(1, 11 + b, 5, 7, 'm');
      g.rect(2, 12 + b, 3, 5, 'c');
      g.set(3, 14 + b, 'x');
    } else if (side) {
      g.rect(10, 11 + b, 2, 7, 'm');
    } else {
      g.rect(10, 11 + b, 5, 7, 'm');
    }
  }
}

function colorOf(m: Mat, spec: MapSpriteSpec, team: MsTeam): Ramp {
  const cloth = TEAM_CLOTH[team];
  switch (m) {
    case 'c':
      return ramp(cloth);
    case 'C':
      return ramp(mixColor(cloth, SHADE, 0.32));
    case 's':
      return ramp(spec.skin ?? SKIN, 0.8);
    case 'h':
      return ramp(spec.hair);
    case 'm':
      return ramp(mixColor(P.metalClair, P.pierre, 0.35));
    case 'w':
      return ramp(mixColor(P.ambre, P.terreSombre, 0.5));
    case 'g':
      return ramp(P.jauneBle);
    case 'l':
      return ramp(mixColor(P.terreSombre, P.brique, 0.3));
    case 'x':
      return ramp(spec.accent);
    case 'f':
      return { dark: spec.glow ?? P.braise, base: spec.glow ?? P.braise, light: 0xfff1c9 };
    case 'e':
      return { dark: P.ombreProfonde, base: P.ombreProfonde, light: P.ombreProfonde };
    case 'b':
      return ramp(mixColor(P.terreSombre, P.ombreProfonde, 0.25));
    case 'p':
      return ramp(mixColor(P.grisRoux, P.terreSombre, 0.5));
    case 'k':
      return ramp(P.parchemin, 0.6);
    case 'n':
      return { dark: P.ombreProfonde, base: P.ombreProfonde, light: P.ombreProfonde };
  }
}

/**
 * Peint une image (16 × 20) au coin (ox, oy). `kind` : « idle » (3 images),
 * ou une vue de marche (4 images). Les pieds touchent la rangée 19.
 */
export function paintMapSprite(sink: PixelSink, ox: number, oy: number, spec: MapSpriteSpec, team: MsTeam, kind: 'idle' | MsView, frame: number): void {
  const g = new Grid();
  const view: MsView = kind === 'idle' ? 'down' : kind;
  const f = kind === 'idle' ? frame % MS_IDLE_FRAMES : frame % MS_WALK_FRAMES;
  const pose: Pose =
    kind === 'idle'
      ? { view, bob: f === 1 ? 1 : 0, step: 0, tick: f }
      : { view, bob: f === 1 || f === 3 ? 1 : 0, step: f === 1 ? -1 : f === 3 ? 1 : 0, tick: f };
  drawLegs(g, spec, pose);
  drawBody(g, spec, pose);
  drawHead(g, spec, pose);
  drawWeapon(g, spec, pose);

  // Ombrage : bord haut ou gauche d'une matière = clair, bord bas ou droit = sombre.
  const colors = new Map<number, number>();
  for (let y = 0; y < MS_H; y++) {
    for (let x = 0; x < MS_W; x++) {
      const m = g.get(x, y);
      if (!m) continue;
      const r = colorOf(m, spec, team);
      const leftEdge = g.get(x - 1, y) !== m;
      const topEdge = g.get(x, y - 1) !== m;
      const rightEdge = g.get(x + 1, y) !== m;
      const bottomEdge = g.get(x, y + 1) !== m;
      const tone = (leftEdge || topEdge) && !(rightEdge && !leftEdge) ? r.light : rightEdge || bottomEdge ? r.dark : r.base;
      colors.set(y * MS_W + x, tone);
    }
  }
  const ink = mixColor(mixColor(TEAM_CLOTH[team], P.ombreProfonde, 0.82), P.nuit, 0.3);
  for (let y = 0; y < MS_H; y++) {
    for (let x = 0; x < MS_W; x++) {
      const own = colors.get(y * MS_W + x);
      if (own !== undefined) {
        sink.set(ox + x, oy + y, own);
        continue;
      }
      // Contour sombre d'un pixel, teinté par le camp (jamais du noir pur).
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        if (x + dx < 0 || x + dx >= MS_W || y + dy < 0 || y + dy >= MS_H) continue;
        if (!colors.has((y + dy) * MS_W + x + dx)) continue;
        sink.set(ox + x, oy + y, ink);
        break;
      }
    }
  }
}

/** Fiche d'un sprite ; une fiche inconnue retombe sur l'Écumeur (le test le signale). */
export function mapSpriteSpec(sprite: string): MapSpriteSpec {
  return MAP_SPRITES[sprite] ?? (MAP_SPRITES['ecumeur_sabreur'] as MapSpriteSpec);
}
