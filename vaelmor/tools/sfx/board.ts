/**
 * Planche d'écoute des bruitages (jalon M10, lot D). Page servie par Vite
 * (`tools/sfx/board.html`) : chaque son se joue en direct avec le mixage du jeu
 * (compresseur et volumes par défaut, n°240), et `window.vaelmorBoard.render()`
 * rend toute la planche hors ligne (fichier d'écoute : `npm run sfx-board`).
 */
import { AmbiencePlayer } from '../../src/audio/ambience';
import { DEFAULT_VOLUMES, volumeGain } from '../../src/audio/engine';
import {
  AMBIENCES,
  COMBAT_SFX,
  playRecipe,
  SPELL_TONES,
  STEP_MATERIALS,
  stepRecipe,
  UI_SFX,
  WORLD_SFX,
  type AmbienceId,
  type SfxId,
  type SfxTone,
  type StepMaterial,
} from '../../src/audio/sfxRecipes';
import { Synth } from '../../src/audio/synth';

export interface Clip {
  readonly group: string;
  readonly id: string;
  readonly label: string;
  /** Durée rendue (s). */
  readonly seconds: number;
  readonly play: (mix: Mix, t: number) => void;
}

/** Les trois bus du jeu, au volume par défaut, et le compresseur des effets. */
export interface Mix {
  readonly sfx: Synth;
  readonly ambience: AmbiencePlayer;
  readonly ctx: BaseAudioContext;
}

const LABELS: Record<string, string> = {
  dash: 'Élan',
  arme: 'Arme levée',
  swing: 'Coup qui fend l’air',
  hit: 'Coup porté',
  crit: 'Préparation du critique',
  critHit: 'Coup critique',
  miss: 'Esquive',
  bow: 'Arc bandé',
  release: 'Flèche lâchée',
  throw: 'Projectile lancé',
  charge: 'Magie qui se charge',
  land: 'Réception',
  tick: 'Barre de PV (série)',
  ko: 'KO',
  heal: 'Soin',
  cursor: 'Curseur (série)',
  confirm: 'Valider',
  cancel: 'Annuler',
  refuse: 'Refus',
  menuOpen: 'Ouvrir un menu',
  menuClose: 'Fermer un menu',
  page: 'Réplique suivante',
  buy: 'Achat (pièces)',
  notify: 'Notification',
  item: 'Objet obtenu',
  quest: 'Quête terminée / recrue',
  levelUp: 'Niveau gagné',
  repUp: 'Réputation +',
  repDown: 'Réputation −',
  save: 'Sauvegarde',
  alert: '« ! » d’un ennemi',
  battleStart: 'Passage au combat',
  villageEnter: 'Entrée dans un lieu',
  travel: 'Voyage rapide',
  gate: 'Passage bloqué',
};
const TONE_LABEL: Record<string, string> = { cendre: 'Cendre', maree: 'Marée', racine: 'Racine', lanterne: 'Lanterne', pierre: 'Pierre', null: 'sans élément' };
const STEP_LABEL: Record<StepMaterial, string> = { herbe: 'herbe', terre: 'chemin de terre', pave: 'pavés', bois: 'pont de bois', sable: 'sable', boue: 'marais', eau: 'gué', feuilles: 'sous-bois', gravier: 'gravier de montagne' };
const AMB_LABEL: Record<AmbienceId, string> = { plaine: 'Plaine (Aubemer)', foret: 'Forêt (Forêt-Racine)', ressac: 'Ressac (côte)', marais: 'Marais', braises: 'Braises (Monts de Cendre)' };

function sfxClip(group: string, id: SfxId, tone: SfxTone = null): Clip {
  const repeat = id === 'tick' ? 14 : id === 'cursor' ? 6 : 1;
  const gap = id === 'tick' ? 0.05 : 0.11;
  return {
    group,
    id: tone === null && id !== 'spell' ? id : `spell_${String(tone)}`,
    label: id === 'spell' ? `Sort : ${TONE_LABEL[String(tone)]}` : (LABELS[id] ?? id),
    seconds: id === 'spell' ? 1.2 : 0.4 + (repeat - 1) * gap + (['critHit', 'villageEnter', 'save', 'battleStart', 'quest', 'levelUp'].includes(id) ? 1.3 : 0.5),
    play: (m, t) => {
      for (let i = 0; i < repeat; i++) playRecipe(m.sfx, id, t + i * gap, tone);
    },
  };
}

function stepClip(material: StepMaterial, sprint = false): Clip {
  const every = sprint ? 0.215 : 0.3;
  return {
    group: 'Pas',
    id: `step_${material}`,
    label: `Pas sur ${STEP_LABEL[material]}`,
    seconds: 6 * every + 0.3,
    play: (m, t) => {
      for (let i = 0; i < 6; i++) stepRecipe(m.sfx, material, t + i * every);
    },
  };
}

function ambienceClip(id: AmbienceId, seconds = 16): Clip {
  return {
    group: 'Ambiances',
    id: `amb_${id}`,
    label: AMB_LABEL[id],
    seconds,
    play: (m, t) => {
      m.ambience.set(id, 0.6, t);
      m.ambience.schedule(t + seconds - 1);
      m.ambience.set(null, 1, t + seconds - 1.2);
    },
  };
}

/** Petite scène pour juger le mixage : marche en plaine, un ennemi voit le héros, passage au combat. */
const SCENE: Clip = {
  group: 'Mixage',
  id: 'scene_plaine',
  label: 'Scène : marche en plaine, « ! », combat',
  seconds: 9,
  play: (m, t) => {
    m.ambience.set('plaine', 0.5, t);
    m.ambience.schedule(t + 8.5);
    for (let i = 0; i < 14; i++) stepRecipe(m.sfx, i < 7 ? 'terre' : 'herbe', t + 0.6 + i * 0.3);
    playRecipe(m.sfx, 'alert', t + 5.2);
    playRecipe(m.sfx, 'battleStart', t + 6.3);
    m.ambience.set(null, 0.4, t + 6.5);
  },
};

const SCENE_TOWN: Clip = {
  group: 'Mixage',
  id: 'scene_village',
  label: 'Scène : entrée au village, boutique, menu',
  seconds: 8,
  play: (m, t) => {
    m.ambience.set('plaine', 0.5, t);
    m.ambience.schedule(t + 7.5);
    for (let i = 0; i < 6; i++) stepRecipe(m.sfx, 'terre', t + 0.3 + i * 0.3);
    playRecipe(m.sfx, 'villageEnter', t + 1.2);
    for (let i = 0; i < 4; i++) stepRecipe(m.sfx, 'pave', t + 2.1 + i * 0.3);
    playRecipe(m.sfx, 'page', t + 3.6);
    playRecipe(m.sfx, 'cursor', t + 4.1);
    playRecipe(m.sfx, 'cursor', t + 4.35);
    playRecipe(m.sfx, 'confirm', t + 4.7);
    playRecipe(m.sfx, 'buy', t + 4.8);
    playRecipe(m.sfx, 'refuse', t + 5.5);
    playRecipe(m.sfx, 'menuClose', t + 6.1);
    playRecipe(m.sfx, 'repUp', t + 6.6);
  },
};

export const CLIPS: readonly Clip[] = [
  ...COMBAT_SFX.filter((id) => id !== 'spell').map((id) => sfxClip('Combat', id)),
  ...SPELL_TONES.map((tone) => sfxClip('Combat', 'spell', tone)),
  ...UI_SFX.map((id) => sfxClip('Interface', id)),
  ...WORLD_SFX.map((id) => sfxClip('Monde', id)),
  ...STEP_MATERIALS.map((m) => stepClip(m)),
  ...AMBIENCES.map((id) => ambienceClip(id)),
  SCENE,
  SCENE_TOWN,
];

/** Branche les bus comme dans le jeu (n°240 : effets 80, ambiance 50). */
export function buildMix(ctx: BaseAudioContext, rand: () => number = Math.random): Mix {
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = volumeGain(DEFAULT_VOLUMES.sfx);
  sfxBus.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 6;
  comp.ratio.value = 5;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(comp).connect(sfxBus);
  const ambBus = ctx.createGain();
  ambBus.gain.value = volumeGain(DEFAULT_VOLUMES.ambience);
  ambBus.connect(ctx.destination);
  return { ctx, sfx: new Synth(ctx, master, rand), ambience: new AmbiencePlayer(ctx, ambBus, rand) };
}

/** Rend un clip hors ligne (48 kHz stéréo) et le renvoie en WAV 16 bits (base64). */
async function renderClip(clip: Clip): Promise<string> {
  const rate = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(clip.seconds * rate), rate);
  let seed = 1;
  for (const ch of clip.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mix = buildMix(ctx, rand);
  clip.play(mix, 0.02);
  const buf = await ctx.startRendering();
  return wavBase64(buf);
}

function wavBase64(buf: AudioBuffer): string {
  const n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  out.setUint32(4, 36 + n * 4, true);
  str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 2, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * 4, true);
  out.setUint16(32, 4, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, n * 4, true);
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, l[i] as number)) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, r[i] as number)) * 32767, true);
  }
  const bytes = new Uint8Array(out.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ---------------- Page ---------------- */

let live: Mix | null = null;

function liveMix(): Mix {
  if (live) return live;
  const ctx = new AudioContext();
  live = buildMix(ctx);
  setInterval(() => live?.ambience.schedule(ctx.currentTime + 0.6), 200);
  return live;
}

function playLive(clip: Clip): void {
  const m = liveMix();
  void (m.ctx as AudioContext).resume();
  if (clip.group === 'Ambiances') {
    const id = clip.id.slice(4) as AmbienceId;
    const on = m.ambience.current === id;
    m.ambience.set(on ? null : id, 1.2);
    m.ambience.schedule(m.ctx.currentTime + 0.6);
    document.querySelectorAll('button[data-amb]').forEach((b) => b.classList.toggle('on', !on && (b as HTMLElement).dataset['amb'] === id));
    return;
  }
  clip.play(m, m.ctx.currentTime + 0.03);
}

function buildPage(root: HTMLElement): void {
  const groups = new Map<string, Clip[]>();
  for (const c of CLIPS) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  for (const [group, clips] of groups) {
    const section = document.createElement('section');
    const h = document.createElement('h2');
    h.textContent = group;
    section.append(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const clip of clips) {
      const b = document.createElement('button');
      b.textContent = clip.label;
      if (clip.group === 'Ambiances') {
        b.dataset['amb'] = clip.id.slice(4);
        b.title = 'Cliquer pour lancer, recliquer pour arrêter';
      }
      b.addEventListener('click', () => playLive(clip));
      grid.append(b);
    }
    section.append(grid);
    root.append(section);
  }
}

declare global {
  interface Window {
    vaelmorBoard: { clips: () => { id: string; group: string; label: string; seconds: number }[]; render: (id: string) => Promise<string> };
  }
}

window.vaelmorBoard = {
  clips: () => CLIPS.map(({ id, group, label, seconds }) => ({ id, group, label, seconds })),
  render: (id) => {
    const clip = CLIPS.find((c) => c.id === id);
    if (!clip) return Promise.reject(new Error(id));
    return renderClip(clip);
  },
};

const root = document.getElementById('board');
if (root) buildPage(root);
