/**
 * Qualité automatique en jeu (lot G, n°246) : branche la règle pure `logic/perf/autoQuality.ts`
 * sur la boucle de Phaser. Quand le réglage « Qualité des effets » est sur « Automatique », la durée
 * réelle de chaque image est mesurée ; si le jeu ralentit, le cran baisse (Haute → Basse → Désactivée)
 * et les scènes ouvertes sont prévenues par la clé `quality`. Jamais de remontée automatique.
 */
import Phaser from 'phaser';
import { AutoQuality } from '../logic/perf/autoQuality';
import { loadAutoLevel, loadQualitySetting, onSettingsChange, saveAutoLevel } from './settings';

let watcher: AutoQuality | null = null;

/** Cran que le contrôleur automatique tient en ce moment (`null` si le réglage est fixe) : pour l'affichage de debug. */
export function autoQualityState(): { level: string; inGrace: boolean } | null {
  return watcher && loadQualitySetting() === 'auto' ? { level: watcher.level, inGrace: watcher.inGrace } : null;
}

/** À appeler une fois, après la création du jeu. */
export function startPerfWatch(game: Phaser.Game): void {
  const auto = new AutoQuality(loadAutoLevel());
  watcher = auto;
  let automatic = loadQualitySetting() === 'auto';
  // Le réglage a changé (Options) : on repart de zéro. Notre propre baisse émet aussi `quality`, sans changer le réglage.
  onSettingsChange((key) => {
    if (key !== 'quality') return;
    const now = loadQualitySetting() === 'auto';
    if (now && !automatic) auto.reset(loadAutoLevel());
    automatic = now;
  });
  game.events.on(Phaser.Core.Events.STEP, () => {
    if (!automatic) return;
    const level = auto.feed(game.loop.rawDelta);
    if (level) saveAutoLevel(level);
  });
}
