/**
 * Musique (jalon M10, décisions n°236 à n°238) : règles de choix des pistes,
 * reprise d'une boucle, recherche des points de boucle et raccord en fondu,
 * fichiers encodés présents pour chaque piste.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { musicFor, resolveTrack, resumeOffset } from '../src/logic/audio/musicRules';
import { bakeCrossfade, findLoop } from '../tools/music/loop';

const data = loadGameData();
const music = data.music;

describe('choix des pistes (n°236)', () => {
  it('zones, villages, Valcendre, titre', () => {
    expect(musicFor(music, { kind: 'title' })).toEqual({ track: 'mus_title' });
    expect(musicFor(music, { kind: 'world', zone: 'z3', place: null })).toEqual({ track: 'mus_z3_cote' });
    expect(musicFor(music, { kind: 'world', zone: 'z1', place: { id: 'haut_gue', kind: 'village' } })).toEqual({ track: 'mus_village' });
    expect(musicFor(music, { kind: 'world', zone: 'z2', place: { id: 'valcendre', kind: 'ville' } })).toEqual({ track: 'mus_valcendre' });
    // Un autel ou un pont n'est pas un lieu habité : la musique de la zone continue.
    expect(musicFor(music, { kind: 'world', zone: 'z1', place: { id: 'autel_aubemer', kind: 'autel' } })).toEqual({ track: 'mus_z1_aubemer' });
    expect(musicFor(music, { kind: 'world', zone: null, place: null })).toBeNull();
  });

  it('combats : ordinaire, boss, Orvane, arène (remplacée tant qu’elle n’est pas livrée)', () => {
    expect(musicFor(music, { kind: 'battle', encounter: 'embuscade_du_gue', boss: false })).toEqual({ track: 'mus_battle' });
    expect(musicFor(music, { kind: 'battle', encounter: 'camp_des_ecumeurs', boss: true })).toEqual({ track: 'mus_boss' });
    expect(musicFor(music, { kind: 'battle', encounter: 'roi_maree_brise', boss: true })).toEqual({ track: 'mus_final_boss' });
    const arena = musicFor(music, { kind: 'battle', encounter: 'arene_serie_1', boss: false });
    expect(arena?.track).toBe(music.tracks['mus_arena'] ? 'mus_arena' : 'mus_battle');
  });

  it('une piste pas encore livrée : remplaçant, ou la musique en cours continue (préparation)', () => {
    if (!music.tracks['mus_prep']) expect(musicFor(music, { kind: 'prep' })).toBeNull();
    if (!music.tracks['mus_ending']) expect(musicFor(music, { kind: 'ending', ending: 'lanterne' })).toEqual({ track: 'mus_title' });
    expect(resolveTrack(music, 'mus_inconnue')).toBeNull();
  });

  it('chaque piste encodée a ses deux fichiers (Opus et AAC)', () => {
    for (const id of Object.keys(music.tracks)) {
      for (const ext of ['webm', 'm4a']) expect(existsSync(resolve(import.meta.dirname, '..', 'music', 'web', `${id}.${ext}`)), `${id}.${ext}`).toBe(true);
    }
    expect(Object.keys(music.tracks).length).toBeGreaterThanOrEqual(13);
  });
});

describe('reprise d’une boucle', () => {
  const track = { loop: true, loopStart: 10, loopEnd: 70, duration: 71 };
  it('avant la fin de boucle : la position avance ; après : elle revient dans la boucle', () => {
    expect(resumeOffset(track, 5, 20)).toBe(25);
    expect(resumeOffset(track, 65, 10)).toBeCloseTo(15);
    expect(resumeOffset(track, 65, 130)).toBeCloseTo(15);
    expect(resumeOffset({ loop: false, duration: 9 }, 5, 30)).toBe(9);
  });
});

describe('points de boucle (n°238)', () => {
  const rate = 8000;
  /** Une « musique » : introduction en bruit doux, motif de 2 s répété, fondu final. */
  function song(): { mono: Float32Array; period: number } {
    const period = 2;
    const seconds = 70;
    const mono = new Float32Array(seconds * rate);
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let i = 0; i < mono.length; i++) {
      const t = i / rate;
      if (t < 6) mono[i] = 0.05 * rnd();
      else {
        const p = (t - 6) % period;
        const note = p < 0.5 ? 220 : p < 1 ? 330 : p < 1.5 ? 440 : 275;
        mono[i] = 0.5 * Math.sin(2 * Math.PI * note * t) * Math.exp(-3 * (p % 0.5));
      }
      if (t > 62) mono[i] = (mono[i] as number) * Math.max(0, (70 - t) / 8);
    }
    return { mono, period };
  }

  it('la boucle commence après l’introduction, finit avant le fondu, et dure un nombre entier de motifs', () => {
    const { mono, period } = song();
    const loop = findLoop(mono, rate, { minLength: 20, minLengthRatio: 0.4 });
    expect(loop.start).toBeGreaterThan(6);
    expect(loop.end).toBeLessThan(64);
    expect(loop.score).toBeGreaterThan(0.9);
    const cycles = (loop.end - loop.start) / period;
    expect(Math.abs(cycles - Math.round(cycles))).toBeLessThan(0.02);
  });

  it('le raccord en fondu rejoint exactement la suite du début de boucle', () => {
    const { mono } = song();
    const pcm = Float32Array.from(mono);
    bakeCrossfade(pcm, 1, rate, 10, 40, 0.05);
    // Au point de saut, l'échantillon joué avant le saut prolonge celui d'avant le début de boucle.
    expect(pcm[40 * rate - 1]).toBeCloseTo(mono[10 * rate - 1] as number, 5);
    // Loin du raccord, rien ne change.
    expect(pcm[30 * rate]).toBe(mono[30 * rate]);
  });
});
