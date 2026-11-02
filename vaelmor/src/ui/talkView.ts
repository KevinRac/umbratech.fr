/**
 * Mise en forme d'une scène de dialogue de combat pour la boîte de scène
 * (`TalkBox`) : qui parle, sous quel nom, avec quel visage et de quel côté.
 * Sert au combat (les unités présentes sur la carte d'abord) et au journal des
 * rencontres (la compagnie de la partie).
 */
import type { SceneDef } from '../data/talkSchemas';
import type { GameData } from '../data/validate';
import type { TalkFace, TalkView } from './TalkBox';

/** Un personnage tel qu'on le connaît (unité sur la carte, membre de la compagnie). */
export type FaceLookup = (charId: string) => Omit<TalkFace, 'key'> | null;

/** Visage d'un personnage : l'ennemi de la scène, puis ce que sait `lookup`, puis les données. */
export function talkFace(data: GameData, scene: SceneDef, charId: string, lookup: FaceLookup): TalkFace {
  if (charId === scene.enemy) {
    const def = data.enemies.find((e) => e.id === charId);
    return { key: charId, name: def?.name ?? charId, title: def?.title && def.title !== def.name ? def.title : null, sprite: def?.sprite ?? null, team: 'enemy' };
  }
  const known = lookup(charId);
  if (known) return { key: charId, ...known };
  const template = data.allyTemplates.find((t) => t.id === charId);
  if (template) return { key: charId, name: template.name, title: null, sprite: template.sprite, team: 'ally' };
  const named = data.named.find((n) => n.id === charId);
  if (named) return { key: charId, name: named.name, title: null, sprite: named.recruit?.asClass ?? null, team: 'player' };
  for (const loc of data.locations) {
    for (const npc of loc.npcs) {
      for (const o of npc.options) if (o.kind === 'recruit' && o.unit.id === charId) return { key: charId, name: o.unit.name, title: null, sprite: o.unit.class, team: 'player' };
    }
  }
  if (charId === data.company.hero.id) return { key: charId, name: data.company.hero.name, title: null, sprite: 'heros', team: 'player' };
  const start = [...data.company.start, ...data.company.bossRecruits.map((r) => r.unit)].find((m) => m.id === charId);
  if (start) return { key: charId, name: start.name, title: null, sprite: start.class, team: 'player' };
  return { key: charId, name: charId, title: null, sprite: null, team: 'player' };
}

/**
 * La scène prête à jouer (répliques du refus si `failed`). `linked` : l'unité
 * liée qui joue la scène ; son visage reste à l'écran même si elle se tait
 * (citation de mort : celui qui a porté le coup).
 */
export function buildTalkView(data: GameData, scene: SceneDef, failed: boolean, lookup: FaceLookup, linked: string | null = scene.units[0] ?? null): TalkView {
  const lines = failed ? (scene.onFail ?? []) : scene.lines;
  return {
    tag: scene.kind === 'talk' ? (failed ? 'Parler · refus' : 'Parler') : null,
    cast: [talkFace(data, scene, scene.enemy, lookup), ...(linked ? [talkFace(data, scene, linked, lookup)] : [])],
    lines: lines.map((l) => ({ face: talkFace(data, scene, l.speaker, lookup), text: l.text, mood: l.mood ?? 'neutral' })),
  };
}

/** Titre court d'une scène pour le journal (« Brakk et Nessa », « Mort de Gorm »). */
export function sceneTitle(data: GameData, scene: SceneDef, lookup: FaceLookup): string {
  const enemy = talkFace(data, scene, scene.enemy, lookup).name;
  const who = scene.units.map((u) => talkFace(data, scene, u, lookup).name);
  const pair = who.length > 0 ? ` · ${who.join(', ')}` : '';
  switch (scene.kind) {
    case 'talk':
      return `Parler à ${enemy}${pair}`;
    case 'death':
      return `Chute de ${enemy}${pair}`;
    case 'phase':
      return `${enemy}, seconde phase${pair}`;
    case 'mourn':
      return `${enemy}, deuil${pair}`;
    default:
      return `${enemy}${pair}`;
  }
}
