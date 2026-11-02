/**
 * Contrôles croisés des ennemis nommés et des scènes de combat (GDD §7.9) :
 * références (modèles, zones, classes, quêtes, réputations, personnages),
 * règles de chaque sorte de scène, une scène « Parler » par interlocuteur.
 *
 * Module pur : ni DOM ni Phaser.
 */
import type { GameData } from './validate';
import type { BattleCondition, SceneDef } from './talkSchemas';

/**
 * Personnages qui peuvent être liés à une scène : la compagnie (héros,
 * compagnons du départ, recrues de village et de boss), les ennemis nommés
 * (ils peuvent rejoindre la compagnie) et les alliés verts nommés.
 */
export function characterIds(data: GameData): Set<string> {
  const ids = new Set<string>([data.company.hero.id, ...data.company.start.map((m) => m.id), ...Object.keys(data.company.recruitLevels), ...data.company.bossRecruits.map((r) => r.unit.id)]);
  for (const n of data.named) ids.add(n.id);
  for (const t of data.allyTemplates) if (t.named === true) ids.add(t.id);
  return ids;
}

/** Alliés verts nommés (modèles marqués `named`). */
export function namedAllyIds(data: GameData): Set<string> {
  return new Set(data.allyTemplates.filter((t) => t.named === true).map((t) => t.id));
}

function checkCondition(data: GameData, c: BattleCondition | undefined, at: string, sceneIds: ReadonlySet<string>, chars: ReadonlySet<string>, issues: string[]): void {
  if (!c) return;
  const quests = new Set(data.quests.map((q) => q.id));
  const repTargets = new Set([...data.locations.filter((l) => l.reputation).map((l) => l.id), ...data.factions.map((f) => f.id)]);
  const one = (x: Omit<BattleCondition, 'any'>, where: string): void => {
    for (const q of [x.questDone, x.questActive]) if (q !== undefined && !quests.has(q)) issues.push(`${where} : quête inconnue « ${q} »`);
    for (const ch of [x.recruited, x.deployed]) if (ch !== undefined && !chars.has(ch)) issues.push(`${where} : personnage inconnu « ${ch} »`);
    for (const s of [x.seen, x.notSeen]) if (s !== undefined && !sceneIds.has(s)) issues.push(`${where} : scène inconnue « ${s} »`);
    if (x.rep && !repTargets.has(x.rep.target)) issues.push(`${where} : réputation inconnue « ${x.rep.target} »`);
    if (x.rep && x.rep.tierMin === undefined && x.rep.tierMax === undefined) issues.push(`${where} : rep sans tierMin ni tierMax`);
  };
  one(c, at);
  c.any?.forEach((x, i) => one(x, `${at}.any[${i}]`));
}

export function checkTalk(data: GameData, issues: string[]): void {
  const enemies = new Map(data.enemies.map((e) => [e.id, e]));
  const namedIds = new Set(data.named.map((n) => n.id));
  const bossIds = new Set(data.bosses.map((b) => b.enemy));
  const zones = new Set(data.zones.map((z) => z.id));
  const classes = new Set(data.classes.map((c) => c.id));
  const chars = characterIds(data);
  const greens = namedAllyIds(data);
  const sceneIds = new Set(data.scenes.map((s) => s.id));

  // Fiches nommées
  const seenNamed = new Set<string>();
  for (const n of data.named) {
    const at = `enemies.json › named « ${n.id} »`;
    if (seenNamed.has(n.id)) issues.push(`${at} : identifiant en double`);
    seenNamed.add(n.id);
    const model = enemies.get(n.skinOf);
    if (!model || namedIds.has(n.skinOf)) issues.push(`${at}.skinOf : modèle d'ennemi inconnu « ${n.skinOf} »`);
    if (bossIds.has(n.id)) issues.push(`${at} : un boss n'est pas un nommé (il a déjà sa fiche de boss)`);
    if (!zones.has(n.zone)) issues.push(`${at}.zone : zone inconnue « ${n.zone} »`);
    if (n.pop !== undefined && n.pop !== false) checkCondition(data, n.pop, `${at}.pop`, sceneIds, chars, issues);
    const r = n.recruit;
    if (!r) continue;
    if (!classes.has(r.asClass)) issues.push(`${at}.recruit.asClass : classe inconnue « ${r.asClass} »`);
    for (const t of r.talkers) {
      if (!chars.has(t) || t === n.id) issues.push(`${at}.recruit.talkers : personnage inconnu « ${t} »`);
      else if (!data.scenes.some((s) => s.kind === 'talk' && s.enemy === n.id && s.units.includes(t))) issues.push(`${at}.recruit.talkers : « ${t} » n'a pas de scène « talk » avec lui (battleQuotes.json)`);
    }
    checkCondition(data, r.requires, `${at}.recruit.requires`, sceneIds, chars, issues);
    checkCondition(data, r.ransom?.waivedIf, `${at}.recruit.ransom.waivedIf`, sceneIds, chars, issues);
  }

  // Scènes
  const seen = new Set<string>();
  for (const s of data.scenes) checkScene(s);
  function checkScene(s: SceneDef): void {
    const at = `battleQuotes.json › « ${s.id} »`;
    if (seen.has(s.id)) issues.push(`${at} : identifiant en double`);
    seen.add(s.id);
    const isBoss = bossIds.has(s.enemy);
    if (!enemies.has(s.enemy)) issues.push(`${at}.enemy : ennemi inconnu « ${s.enemy} »`);
    else if (!namedIds.has(s.enemy) && !isBoss) issues.push(`${at}.enemy : « ${s.enemy} » n'est ni un nommé ni un boss (les ennemis communs sont muets)`);
    for (const u of s.units) if (!chars.has(u) || u === s.enemy) issues.push(`${at}.units : personnage inconnu « ${u} »`);
    if (new Set(s.units).size !== s.units.length) issues.push(`${at}.units : personnage en double`);
    if ((s.kind === 'battle' || s.kind === 'talk' || s.kind === 'mourn') && s.units.length === 0) issues.push(`${at} : une scène « ${s.kind} » demande au moins une unité liée`);
    if (s.kind === 'talk') {
      const recruit = data.named.find((n) => n.id === s.enemy)?.recruit;
      if (!recruit) issues.push(`${at} : « ${s.enemy} » n'est pas recrutable (pas de fiche recruit)`);
      else for (const u of s.units) if (!recruit.talkers.includes(u)) issues.push(`${at} : « ${u} » n'est pas dans recruit.talkers de « ${s.enemy} »`);
      if (!s.onFail) issues.push(`${at} : une scène « talk » demande ses répliques de refus (onFail)`);
    } else if (s.onFail) issues.push(`${at}.onFail : réservé aux scènes « talk »`);
    if (s.direction !== undefined && s.kind !== 'battle') issues.push(`${at}.direction : réservé aux scènes « battle »`);
    if (s.kind === 'phase' && !isBoss) issues.push(`${at} : une scène « phase » demande un boss`);
    if (s.kind === 'mourn') for (const u of s.units) if (!greens.has(u)) issues.push(`${at} : le deuil concerne un allié vert nommé, « ${u} » n'en est pas un`);
    const speakers = new Set([...chars, s.enemy]);
    for (const [i, line] of [...s.lines, ...(s.onFail ?? [])].entries()) if (!speakers.has(line.speaker)) issues.push(`${at}.lines[${i}].speaker : personnage inconnu « ${line.speaker} »`);
    checkCondition(data, s.when, `${at}.when`, sceneIds, chars, issues);
  }

  // Réglages
  const pop = data.balance.namedPop;
  if (pop.base > pop.cap) issues.push('balance.json › namedPop.base > cap');
  const encounters = new Set(data.encounters.encounters.map((e) => e.id));
  for (const id of pop.excludeEncounters) if (!encounters.has(id)) issues.push(`balance.json › namedPop.excludeEncounters : rencontre inconnue « ${id} »`);
}
