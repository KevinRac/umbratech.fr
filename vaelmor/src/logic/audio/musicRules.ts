/**
 * Quelle musique joue où (jalon M10, décision n°236). Module pur : il lit les
 * règles de `music.json` et rend une piste encodée, ou « garder la musique en
 * cours » quand une piste n'est pas encore livrée et n'a pas de remplaçant.
 */
import type { MusicFile } from '../../data/schemas';

export type MusicContext =
  | { readonly kind: 'title' }
  /** Monde ouvert : zone et lieu sous les pieds du héros. */
  | { readonly kind: 'world'; readonly zone: string | null; readonly place: { readonly id: string; readonly kind: string } | null }
  | { readonly kind: 'prep' }
  | { readonly kind: 'battle'; readonly encounter: string; readonly boss: boolean }
  | { readonly kind: 'victory' }
  | { readonly kind: 'defeat' }
  | { readonly kind: 'ending'; readonly ending: string };

/** Piste à jouer, ou `null` : la musique en cours continue. */
export type MusicChoice = { readonly track: string } | null;

/** Suit les remplaçants jusqu'à une piste encodée (ou null). */
export function resolveTrack(music: MusicFile, id: string): string | null {
  const seen = new Set<string>();
  let current: string | null = id;
  while (current !== null && !music.tracks[current]) {
    if (seen.has(current) || !(current in music.fallback)) return null;
    seen.add(current);
    current = music.fallback[current] ?? null;
  }
  return current;
}

/** Piste voulue par les règles, avant remplacement. */
export function wantedTrack(music: MusicFile, ctx: MusicContext): string | null {
  const r = music.rules;
  switch (ctx.kind) {
    case 'title':
      return r.title;
    case 'world':
      if (ctx.place && r.places[ctx.place.id]) return r.places[ctx.place.id] ?? null;
      if (ctx.place && (ctx.place.kind === 'village' || ctx.place.kind === 'ville')) return r.village;
      return ctx.zone ? (r.zones[ctx.zone] ?? null) : null;
    case 'prep':
      return r.prep;
    case 'battle':
      return r.encounters[ctx.encounter] ?? (ctx.boss ? r.boss : r.battle);
    case 'victory':
      return r.victory;
    case 'defeat':
      return r.defeat;
    case 'ending':
      return r.endings[ctx.ending] ?? r.ending;
  }
}

export function musicFor(music: MusicFile, ctx: MusicContext): MusicChoice {
  const wanted = wantedTrack(music, ctx);
  const track = wanted ? resolveTrack(music, wanted) : null;
  return track ? { track } : null;
}

/**
 * Position de reprise d'une piste en boucle (n°236 : après un combat, la musique
 * d'exploration reprend là où elle s'était arrêtée) : `elapsed` secondes après
 * son départ à `offset`, ramenées dans la boucle.
 */
export function resumeOffset(track: { readonly loop: boolean; readonly loopStart?: number; readonly loopEnd?: number; readonly duration: number }, offset: number, elapsed: number): number {
  const at = offset + Math.max(0, elapsed);
  if (!track.loop || track.loopStart === undefined || track.loopEnd === undefined) return Math.min(at, track.duration);
  if (at < track.loopEnd) return at;
  const len = track.loopEnd - track.loopStart;
  return track.loopStart + ((at - track.loopStart) % len);
}
