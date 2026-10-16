/** Clés des scènes Phaser (GDD §16.2). Ajouter une scène : une clé ici + l'enregistrer dans main.ts. */
export const SCENES = {
  boot: 'Boot',
  title: 'Title',
  world: 'World',
  debug: 'Debug',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];
