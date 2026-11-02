/**
 * Contrôle des références d'une sauvegarde contre les données du jeu
 * (décision n°156, 6ᵉ contrôle).
 *
 * Une sauvegarde peut citer une classe, un objet ou une quête qu'une version
 * plus récente du jeu a retirés. Ce qui n'existe plus est **ignoré avec un
 * avertissement** (objet retiré du sac, quête oubliée…) ; seuls un héros
 * absent ou une classe de héros inconnue rendent la partie inchargeable.
 * Les lieux et factions apparus depuis la sauvegarde reçoivent leur
 * réputation de départ. Module pur : la sauvegarde est modifiée en place.
 */
import type { GameData } from '../../data/validate';
import type { SaveData } from './schema';

export interface ReferenceReport {
  /** Message d'erreur si la partie ne peut pas être chargée. */
  readonly fatal: string | null;
  /** Ce qui a été ignoré ou complété, en phrases courtes. */
  readonly warnings: string[];
}

export function checkReferences(save: SaveData, data: GameData): ReferenceReport {
  const warnings: string[] = [];
  const p = save.world.progress;
  const items = new Set<string>([...data.weapons, ...data.consumables, ...data.accessories, ...data.keyItems].map((i) => i.id));
  const classes = new Map(data.classes.map((c) => [c.id, c]));

  // Compagnie : un membre de classe inconnue est retiré ; le héros est indispensable.
  const hero = p.company.find((m) => m.hero);
  if (!hero) return { fatal: 'La compagnie n’a pas de héros.', warnings };
  if (!classes.has(hero.class)) return { fatal: `La classe du héros (« ${hero.class} ») n’existe pas dans cette version du jeu.`, warnings };
  if (p.company.filter((m) => m.hero).length > 1) return { fatal: 'La compagnie a plusieurs héros.', warnings };
  const ids = new Set<string>();
  for (const m of [...p.company]) {
    const cls = classes.get(m.class);
    if (!cls || ids.has(m.id)) {
      p.company.splice(p.company.indexOf(m), 1);
      warnings.push(cls ? `Membre en double ignoré : ${m.name}.` : `${m.name} a quitté la compagnie (classe inconnue).`);
      continue;
    }
    ids.add(m.id);
    if (m.evolution !== null && !cls.evolutions.some((e) => e.id === m.evolution)) {
      warnings.push(`${m.name} revient à sa classe de base (évolution inconnue).`);
      m.evolution = null;
    }
    if (m.passive !== null && !cls.passives.some((s) => s.id === m.passive)) m.passive = null;
  }

  // Sac et achats.
  const before = p.inventory.length;
  p.inventory = p.inventory.filter((s) => items.has(s.item));
  if (p.inventory.length < before) warnings.push(`${before - p.inventory.length} objet(s) inconnu(s) retiré(s) du sac.`);

  // Quêtes, lieux, zones, ennemis et errants inconnus : oubliés en silence s'ils ne coûtent rien au joueur.
  const quests = new Set(data.quests.map((q) => q.id));
  for (const q of Object.keys(p.quests)) {
    if (quests.has(q)) continue;
    delete p.quests[q];
    warnings.push(`Quête inconnue oubliée : « ${q} ».`);
  }
  const locations = new Set(data.locations.map((l) => l.id));
  const zones = new Set(data.zones.map((z) => z.id));
  save.world.discoveredLocations = save.world.discoveredLocations.filter((l) => locations.has(l));
  save.world.discoveredZones = save.world.discoveredZones.filter((z) => zones.has(z));
  if (p.lastVillage !== null && !locations.has(p.lastVillage)) p.lastVillage = null;
  const foes = new Set(data.worldFoes.map((f) => f.id));
  for (const f of Object.keys(p.foes)) if (!foes.has(f)) delete p.foes[f];
  const wanderers = new Set(data.wanderers.map((w) => w.id));
  for (const w of Object.keys(p.errants)) if (!wanderers.has(w)) delete p.errants[w];
  if (p.wounded) for (const w of Object.keys(p.wounded)) if (!wanderers.has(w)) delete p.wounded[w];
  // Dialogues de combat (n°189) : scènes et nommés disparus oubliés en silence.
  const scenes = new Set(data.scenes.map((sc) => sc.id));
  p.scenesSeen = p.scenesSeen.filter((sc) => scenes.has(sc));
  const named = new Set(data.named.map((n) => n.id));
  for (const n of Object.keys(p.named)) if (!named.has(n)) delete p.named[n];

  // Réputation : cibles disparues retirées, nouvelles cibles à leur valeur de départ.
  const starts = new Map<string, number>();
  for (const l of data.locations) if (l.reputation) starts.set(l.id, l.reputation.start);
  for (const f of data.factions) starts.set(f.id, f.start);
  for (const key of Object.keys(p.reputation)) if (!starts.has(key)) delete p.reputation[key];
  for (const [key, start] of starts) if (p.reputation[key] === undefined) p.reputation[key] = start;

  // Équipement de la session : membres partis, objets inconnus.
  const session = save.session;
  for (const [memberId, l] of Object.entries(session.loadouts)) {
    if (!ids.has(memberId)) {
      delete session.loadouts[memberId];
      continue;
    }
    if (l.weapon !== null && !items.has(l.weapon)) l.weapon = null;
    if (l.accessory !== null && !items.has(l.accessory)) l.accessory = null;
    l.items = l.items.filter((s) => items.has(s.item));
  }
  if (session.lastDeployed) session.lastDeployed = session.lastDeployed.filter((m) => ids.has(m));

  return { fatal: null, warnings };
}
