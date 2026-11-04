/**
 * Écran de combat rapproché (jalon M8, GDD §11, décisions n°204 à n°222) :
 * logique pure, sans Phaser ni DOM.
 *
 * - `planSegments` : découpe les événements d'une commande en morceaux joués
 *   sur la carte ou dans l'écran rapproché (un échange, et les chutes qui le suivent).
 * - `strikeSteps` / `exchangeDuration` : chronologie d'un coup et d'un échange
 *   (GDD §11.2 pour la mêlée, §11.3 pour le critique), réglée dans
 *   `balance.json › closeup` ; elle sert au rendu et au critère « vitesse acceptable ».
 * - `attackKind`, `projectileFor`, `backdropFor` : ce que l'écran montre,
 *   d'après l'arme, la distance, le terrain et la zone (`battleAnims.json`).
 */
import type { BackdropId, BattleAnimsFile, CloseupTimings, CritStyle, FighterDef, ProjectileId, SlashId, SpellId } from '../../data/schemas';
import type { BattleEvent, Strike } from '../tactics/types';

/* ---------- Ce que l'écran montre ---------- */

/** Geste d'un coup : mêlée (dash), distance (projectile d'arme), magie (cercle runique et projectile). */
export type AttackKind = 'melee' | 'ranged' | 'magic';

interface WeaponLike {
  readonly type: string;
  readonly damage: 'physique' | 'magique';
}

/** Une arme magique lance un sort ; une arme physique frappe au contact à 1 case, tire ou lance au-delà. */
export function attackKind(weapon: WeaponLike, distance: number): AttackKind {
  if (weapon.damage === 'magique') return 'magic';
  return distance > 1 ? 'ranged' : 'melee';
}

/** Projectile d'un coup à distance ou d'un sort (null pour la mêlée). */
export function projectileFor(weapon: WeaponLike, kind: AttackKind, anims: BattleAnimsFile): ProjectileId | null {
  if (kind === 'melee') return null;
  if (kind === 'magic') return anims.projectiles.byWeaponType[weapon.type] === 'fiole' ? 'fiole' : anims.projectiles.magic;
  return anims.projectiles.byWeaponType[weapon.type] ?? anims.projectiles.physical;
}

/** Arme lancée (javeline) : le lanceur disparaît avec elle et réapparaît à la fin du coup. */
export function isThrown(projectile: ProjectileId | null, kind: AttackKind, anims: BattleAnimsFile): boolean {
  return kind === 'ranged' && projectile !== null && anims.projectiles.thrown.includes(projectile);
}

/** Sort d'une arme magique : celui de l'arme, sinon celui de son élément, sinon le sort par défaut (null hors magie). */
export function spellFor(weapon: WeaponLike & { readonly id: string; readonly element: string | null }, kind: AttackKind, anims: BattleAnimsFile): SpellId | null {
  if (kind !== 'magic') return null;
  return anims.spells.byWeapon[weapon.id] ?? (weapon.element ? anims.spells.byElement[weapon.element] : undefined) ?? anims.spells.default;
}

/** Fond de l'écran : celui de la zone s'il en impose un, sinon celui du terrain du défenseur (n°208). */
export function backdropFor(terrainId: string, zoneId: string, anims: BattleAnimsFile): BackdropId {
  return anims.backdrops.zones[zoneId] ?? anims.backdrops.terrains[terrainId] ?? anims.backdrops.default;
}

/** Coupure d'un coup de mêlée (type d'arme). */
export function slashFor(weapon: WeaponLike, anims: BattleAnimsFile): SlashId {
  return anims.slashes.byWeaponType[weapon.type] ?? anims.slashes.default;
}

/** Chorégraphie du critique au corps à corps : celle de la feuille peinte, sinon celle de l'arme. */
export function critStyleFor(weapon: WeaponLike, painted: Pick<FighterDef, 'critStyle'> | null, anims: BattleAnimsFile): CritStyle {
  return painted?.critStyle ?? anims.critStyles.byWeaponType[weapon.type] ?? anims.critStyles.default;
}

/** Coupures d'un critique : celle de l'arme, puis les autres dans l'ordre diagonale, croix, arc (GDD §11.3 : 2 à 3 coupes). */
export function critSlashes(first: SlashId, count: number): SlashId[] {
  const order: SlashId[] = ['diagonale', 'croix', 'arc'];
  const rest = order.filter((s) => s !== first);
  return Array.from({ length: count }, (_, i) => (i === 0 ? first : (rest[(i - 1) % rest.length] as SlashId)));
}

/* ---------- Chronologie ---------- */

export type StepName = 'dark' | 'prep' | 'dash' | 'arme' | 'draw' | 'rune' | 'fly' | 'spell' | 'choreo' | 'strike' | 'cut' | 'impact' | 'recoil' | 'pose' | 'back' | 'settle';

/** Une étape d'un coup : début (ms depuis le début du coup) et durée, à la vitesse « Normales ». */
export interface Step {
  readonly name: StepName;
  readonly at: number;
  readonly ms: number;
}

export interface StrikeShape {
  readonly kind: AttackKind;
  readonly crit: boolean;
  readonly hit: boolean;
  /** Deuxième coup de la même unité (double attaque) : pas de préparation. */
  readonly repeat: boolean;
  /** Chorégraphie du critique au corps à corps (`assaut` par défaut). */
  readonly style?: CritStyle;
}

/** Durée de la chorégraphie d'un critique (`choreo`) : tourbillon ou bond. */
export function choreoDuration(style: CritStyle, t: CloseupTimings): number {
  if (style === 'tourbillon') return t.tourbillon.vanish + t.tourbillon.passes * t.tourbillon.pass + t.tourbillon.reappear;
  if (style === 'bond') return t.bond.rise + t.bond.apex + t.bond.fall;
  return 0;
}

/**
 * Étapes d'un coup (GDD §11.2) : préparation, approche (dash, arme levée ou
 * cercle runique), armé tenu (mêlée et tir, façon GBA), vol du projectile,
 * frappe, impact, recul, pose, retour.
 * Critique (§11.3) : écran assombri d'abord, plusieurs coupes au lieu de la
 * frappe (mêlée) ou un projectile plus appuyé, pose tenue plus longtemps.
 * Un coup raté garde la même chronologie (l'impact devient l'esquive).
 */
export function strikeSteps(shape: StrikeShape, t: CloseupTimings): Step[] {
  const out: Step[] = [];
  let at = 0;
  const push = (name: StepName, ms: number): void => {
    out.push({ name, at, ms });
    at += ms;
  };
  if (shape.crit && shape.hit) push('dark', t.critDark);
  if (!shape.repeat) push('prep', t.prep);
  const crit = shape.crit && shape.hit;
  const style = shape.style ?? 'assaut';
  if (shape.kind === 'melee' && crit && style !== 'assaut') {
    // Tourbillon ou bond : la chorégraphie remplace le dash et les coupes.
    push('choreo', choreoDuration(style, t));
  } else if (shape.kind === 'melee') {
    push('dash', t.dash);
    // Armé tenu au contact (GBA) : la tension avant la frappe sèche.
    push('arme', t.arme.melee);
    if (crit) for (let i = 0; i < t.critCuts; i++) push('cut', t.critCut);
    else push('strike', t.strike);
  } else if (shape.kind === 'magic') {
    // Le sort se joue à la cible (colonnes, rayons…), plus grand au critique.
    push('rune', t.rune);
    push('spell', crit ? t.spell.crit : t.spell.cast);
  } else {
    push('draw', t.draw);
    push('arme', t.arme.ranged);
    push('fly', t.fly);
  }
  push('impact', t.impact);
  push('recoil', t.recoil);
  push('pose', shape.crit && shape.hit ? t.critPose : t.pose);
  push(shape.kind === 'melee' ? 'back' : 'settle', shape.kind === 'melee' ? t.back : t.settle);
  return out;
}

/** Durée d'un coup (ms, à la vitesse « Normales »). */
export function strikeDuration(shape: StrikeShape, t: CloseupTimings): number {
  const steps = strikeSteps(shape, t);
  const last = steps[steps.length - 1];
  return last ? last.at + last.ms : 0;
}

/**
 * Forme des coups d'un échange : chaque coup prend le geste de son auteur ;
 * le second coup d'une même unité (double attaque) est un coup répété.
 */
export function exchangeShapes(strikes: readonly Strike[], kindOf: (unitId: string) => AttackKind, styleOf: (unitId: string) => CritStyle = () => 'assaut'): StrikeShape[] {
  const struck = new Set<string>();
  return strikes.map((s) => {
    const repeat = struck.has(s.attackerId);
    struck.add(s.attackerId);
    return { kind: kindOf(s.attackerId), crit: s.crit, hit: s.hit, repeat, style: styleOf(s.attackerId) };
  });
}

/**
 * Durée d'un échange dans l'écran rapproché, transitions comprises (n°209) :
 * entrée, temps d'arrêt d'ouverture, coups séparés par `between`, sortie ; `factor` = vitesse
 * (1 « Normales », 0,5 « Rapides », ×0,5 de plus avec Maj maintenue).
 */
export function exchangeDuration(shapes: readonly StrikeShape[], t: CloseupTimings, factor = 1): number {
  if (shapes.length === 0) return 0;
  const strikes = shapes.reduce((n, s) => n + strikeDuration(s, t), 0);
  return Math.round((t.entry + t.opening + strikes + t.between * (shapes.length - 1) + t.exit) * factor);
}

/** Étape en cours à l'instant `ms` d'un coup (la dernière une fois le coup fini). */
export function stepAt(steps: readonly Step[], ms: number): Step | null {
  let current: Step | null = null;
  for (const s of steps) if (ms >= s.at) current = s;
  return current;
}

/**
 * Image d'une animation peinte à l'instant `ms` du coup : les images avant
 * l'impact se répartissent de la préparation jusqu'à la frappe, l'image
 * d'impact tombe au début de la frappe (ou de la première coupe), les
 * suivantes se répartissent sur le recul et la pose ; le retour reste sur la dernière.
 */
export function frameAt(steps: readonly Step[], ms: number, frames: number, impact: number): number {
  if (frames <= 1) return 0;
  // Une chorégraphie (tourbillon, bond) garde l'image d'impact pour l'atterrissage : ses images la précèdent.
  // Un tir lâche sa flèche quand le projectile part (`fly`).
  const hitStep = steps.find((s) => s.name === 'strike' || s.name === 'cut' || s.name === 'spell' || s.name === 'fly' || s.name === 'impact');
  const start = steps.find((s) => s.name === 'prep' || s.name === 'dash' || s.name === 'draw' || s.name === 'rune' || s.name === 'choreo');
  const pose = steps.find((s) => s.name === 'pose');
  if (!hitStep || !start || !pose) return 0;
  const i = Math.max(0, Math.min(frames - 1, impact));
  if (ms < hitStep.at) {
    if (i === 0) return 0;
    const span = Math.max(1, hitStep.at - start.at);
    return Math.max(0, Math.min(i - 1, Math.floor(((ms - start.at) / span) * i)));
  }
  const after = frames - 1 - i;
  const end = pose.at + pose.ms;
  if (after <= 0 || ms >= end) return frames - 1;
  const span = Math.max(1, end - hitStep.at);
  return Math.min(frames - 1, i + Math.floor(((ms - hitStep.at) / span) * (after + 1)));
}

/**
 * Image d'une animation peinte au rythme des animations GBA (n°225) : les
 * durées des images ne sont pas égales. L'élan (images jusqu'à `peak`) se joue
 * pendant la préparation et l'approche, l'armé (`peak`) est tenu, les images
 * entre l'armé et l'impact passent en un éclair (`snapMs` chacune), l'image
 * d'impact tombe d'un coup sur la frappe (ou le départ du trait), les images
 * de traînée jusqu'à la pose de contact (`hold`) passent en un éclair, puis
 * celle-ci reste tenue pendant le gel, le recul et la descente des PV ; la
 * récupération vient ensuite, vite (`recoverMs` par image), et la dernière
 * image est tenue.
 * Sans armé dans la chronologie (critique chorégraphié), retombe sur `frameAt`.
 */
export function rhythmFrameAt(steps: readonly Step[], ms: number, frames: number, impact: number, peak: number | undefined, recoverMs: number, hold?: number, snapMs = 34): number {
  if (frames <= 1) return 0;
  const arme = steps.find((s) => s.name === 'arme');
  const hit = steps.find((s) => s.name === 'strike' || s.name === 'cut' || s.name === 'fly');
  const start = steps.find((s) => s.name === 'prep' || s.name === 'dash' || s.name === 'draw');
  const pose = steps.find((s) => s.name === 'pose');
  if (!arme || !hit || !start || !pose) return frameAt(steps, ms, frames, impact);
  const i = Math.max(0, Math.min(frames - 1, impact));
  const p = Math.max(0, Math.min(i, peak ?? i - 1));
  if (ms < hit.at) {
    // Images de la frappe (entre l'armé et l'impact) : en un éclair juste avant le contact.
    const snap = i - 1 - p;
    const snapAt = hit.at - snap * snapMs;
    if (snap > 0 && ms >= snapAt) return Math.min(i - 1, p + 1 + Math.floor((ms - snapAt) / snapMs));
    if (ms >= arme.at) return p;
    const span = Math.max(1, arme.at - start.at);
    return Math.max(0, Math.min(p, Math.floor(((ms - start.at) / span) * (p + 1))));
  }
  const h = Math.max(i, Math.min(frames - 1, hold ?? i));
  // Traînée de la frappe, puis pose de contact tenue.
  const smear = i + Math.floor((ms - hit.at) / snapMs);
  if (smear < h) return smear;
  if (ms < pose.at) return h;
  return Math.min(frames - 1, h + 1 + Math.floor((ms - pose.at) / Math.max(1, recoverMs)));
}

/**
 * Image d'une incantation entretenue à l'instant `ms` du coup (sorts) :
 * l'élan (images avant `loop[0]`) se joue de la préparation jusqu'au début du
 * sort, la boucle `[loop[0], loop[1]]` en aller-retour (`loopMs` par image)
 * tant que le sort dure, puis le lancement (de `impact` à la dernière image,
 * une image toutes les `loopMs`), dont la dernière image est tenue.
 */
export function castFrameAt(steps: readonly Step[], ms: number, frames: number, loop: readonly [number, number], impact: number, loopMs = 90): number {
  const spell = steps.find((s) => s.name === 'spell');
  const start = steps.find((s) => s.name === 'prep' || s.name === 'rune');
  const pose = steps.find((s) => s.name === 'pose');
  if (!spell || !start || !pose) return frameAt(steps, ms, frames, impact);
  const [a, b] = loop;
  if (ms < spell.at) {
    const span = Math.max(1, spell.at - start.at);
    return Math.max(0, Math.min(a, Math.floor(((ms - start.at) / span) * (a + 1))));
  }
  const releaseAt = spell.at + spell.ms;
  if (ms < releaseAt) {
    const n = b - a;
    if (n <= 0) return a;
    const k = Math.floor((ms - spell.at) / loopMs) % (2 * n);
    return a + (k <= n ? k : 2 * n - k);
  }
  // Lancement : une image toutes les `loopMs`, puis la dernière est tenue (relayée par `tenue` s'il y en a une).
  return Math.min(frames - 1, impact + Math.floor((ms - releaseAt) / loopMs));
}

/* ---------- Découpage des événements ---------- */

export type CombatEvent = Extract<BattleEvent, { type: 'combat' }>;

export type HealEvent = Extract<BattleEvent, { type: 'heal' }>;

export type Segment =
  | { readonly kind: 'event'; readonly event: BattleEvent }
  /** Soin au bâton (n°205) : le soigneur et l'allié soigné face à face. */
  | { readonly kind: 'heal'; readonly heal: HealEvent }
  /** Un échange dans l'écran rapproché, et la chute (KO) des unités de l'échange qui la suit aussitôt. */
  | { readonly kind: 'closeup'; readonly combat: CombatEvent; readonly falls: readonly string[] };

/**
 * Découpe les événements d'une commande (n°205) : un échange que `inCloseup`
 * accepte (pas une compétence de zone) ouvre l'écran rapproché, comme un soin
 * au bâton (`heal` donné par une autre unité) ; les KO des
 * deux unités de l'échange qui le suivent directement s'y jouent aussi.
 * Une citation de mort entre l'échange et la chute garde son ordre : l'écran
 * se ferme avant elle et la chute se joue sur la carte (cut-ins : lot 6).
 */
export function planSegments(events: readonly BattleEvent[], inCloseup: (combat: CombatEvent) => boolean): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i] as BattleEvent;
    // Un soin donné par une autre unité (bâton) ; les soins de terrain ou de statut restent sur la carte.
    if (event.type === 'heal' && event.sourceId !== undefined && event.sourceId !== event.unitId) {
      out.push({ kind: 'heal', heal: event });
      continue;
    }
    if (event.type !== 'combat' || !inCloseup(event)) {
      out.push({ kind: 'event', event });
      continue;
    }
    const pair = new Set([event.attackerId, event.defenderId]);
    const falls: string[] = [];
    while (i + 1 < events.length) {
      const next = events[i + 1] as BattleEvent;
      if (next.type !== 'ko' || !pair.has(next.unitId) || falls.includes(next.unitId)) break;
      falls.push(next.unitId);
      i++;
    }
    out.push({ kind: 'closeup', combat: event, falls });
  }
  return out;
}
