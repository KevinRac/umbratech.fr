/**
 * Ambiances en boucle (jalon M10, lot D, décision n°239) : plaine, forêt,
 * ressac, marais, braises. Une ambiance = des nappes de bruit filtré qui
 * bouclent en se balançant doucement, et des événements tirés au hasard
 * (oiseaux, vagues, grenouilles, crépitements…) : jamais deux fois la même
 * minute. Deux ambiances se croisent en fondu.
 *
 * `AmbiencePlayer` marche sur tout contexte (le jeu, ou un contexte hors ligne
 * pour la planche d'écoute) ; `setAmbience` est l'entrée du jeu, branchée sur
 * le bus « ambiance » (`audio/engine.ts`).
 */
import { audioContext, busInput, whenUnlocked } from './engine';
import { AMBIENCE_DEFS, scaled, type AmbienceDef, type AmbienceId } from './sfxRecipes';
import { Synth } from './synth';

/** Avance (s) avec laquelle les événements sont programmés. */
const LOOKAHEAD = 0.6;

interface Layer {
  readonly id: AmbienceId;
  readonly gain: GainNode;
  readonly synth: Synth;
  readonly stops: AudioScheduledSourceNode[];
  readonly next: number[];
}

export class AmbiencePlayer {
  private layer: Layer | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
    private readonly rand: () => number = Math.random,
  ) {}

  get current(): AmbienceId | null {
    return this.layer?.id ?? null;
  }

  /** Change d'ambiance à l'instant `at` (fondu de `fadeS` secondes) ; null = silence. */
  set(id: AmbienceId | null, fadeS: number, at = this.ctx.currentTime): void {
    if ((this.layer?.id ?? null) === id) return;
    const old = this.layer;
    if (old) {
      // Garde le niveau que le fondu d'entrée aurait atteint à `at` (même s'il n'est pas fini).
      const g = old.gain.gain;
      if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(at);
      else {
        g.cancelScheduledValues(at);
        g.setValueAtTime(g.value, at);
      }
      g.linearRampToValueAtTime(0, at + fadeS);
      for (const s of old.stops) s.stop(at + fadeS + 0.1);
      old.next.length = 0;
    }
    this.layer = id ? this.build(id, AMBIENCE_DEFS[id], fadeS, at) : null;
  }

  /** Programme les événements jusqu'à `until` (horloge audio). Le jeu l'appelle régulièrement. */
  schedule(until: number): void {
    const layer = this.layer;
    if (!layer) return;
    const def = AMBIENCE_DEFS[layer.id];
    def.events.forEach((event, i) => {
      let t = layer.next[i] as number;
      while (t < until) {
        event.play(event.db ? scaled(layer.synth, event.db) : layer.synth, t);
        t += event.every[0] + this.rand() * (event.every[1] - event.every[0]);
      }
      layer.next[i] = t;
    });
  }

  private build(id: AmbienceId, def: AmbienceDef, fadeS: number, at: number): Layer {
    const c = this.ctx;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(10 ** (def.levelDb / 20), at + Math.max(0.05, fadeS));
    gain.connect(this.out);
    const synth = new Synth(c, gain, this.rand);
    const stops: AudioScheduledSourceNode[] = [];
    for (const bed of def.beds) {
      const src = c.createBufferSource();
      src.buffer = synth.noiseBuffer(bed.color);
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = bed.filter;
      filter.frequency.value = bed.f;
      filter.Q.value = bed.q ?? 0.7;
      const level = c.createGain();
      level.gain.value = bed.gain * (bed.swell ? 1 - bed.swell.depth / 2 : 1);
      let head: AudioNode = src.connect(filter).connect(level);
      if (bed.pan) {
        const pan = c.createStereoPanner();
        pan.pan.value = bed.pan;
        head = head.connect(pan);
      }
      head.connect(synth.outputs().dry);
      const lfo = (rate: number, depth: number, param: AudioParam): void => {
        const o = c.createOscillator();
        o.frequency.value = rate * (0.85 + this.rand() * 0.3);
        const d = c.createGain();
        d.gain.value = depth;
        o.connect(d).connect(param);
        o.start(at);
        stops.push(o);
      };
      if (bed.swell) lfo(bed.swell.rate, (bed.gain * bed.swell.depth) / 2, level.gain);
      if (bed.sweep) lfo(bed.sweep.rate, bed.sweep.depth, filter.frequency);
      src.start(at, this.rand() * 2);
      stops.push(src);
    }
    // Premiers événements tirés dans leur intervalle, pour ne pas tous partir ensemble.
    const next = def.events.map((e) => at + 0.3 + this.rand() * e.every[1]);
    return { id, gain, synth, stops, next };
  }
}

/* ---------------- Entrée du jeu ---------------- */

let player: AmbiencePlayer | null = null;
let wanted: AmbienceId | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let fadeMs = 2000;

function ensurePlayer(): AmbiencePlayer | null {
  if (player) return player;
  const ctx = audioContext();
  const bus = busInput('ambience');
  if (!ctx || !bus) return null;
  player = new AmbiencePlayer(ctx, bus);
  timer = setInterval(() => {
    const c = audioContext();
    if (c && player && c.state === 'running') player.schedule(c.currentTime + LOOKAHEAD);
  }, 200);
  return player;
}

/** Ambiance voulue (null : silence, en combat et sur les écrans titre et de fin). */
export function setAmbience(id: AmbienceId | null, fade = fadeMs): void {
  wanted = id;
  whenUnlocked(() => {
    const p = ensurePlayer();
    if (!p || p.current === wanted) return;
    p.set(wanted, fade / 1000);
    const c = audioContext();
    if (c) p.schedule(c.currentTime + LOOKAHEAD);
  });
}

/** Durée du fondu entre deux ambiances (`sounds.json`). */
export function setAmbienceFade(ms: number): void {
  fadeMs = ms;
}

/** Pour le debug et les tests du navigateur. */
export function ambienceState(): { wanted: AmbienceId | null; playing: AmbienceId | null; running: boolean } {
  return { wanted, playing: player?.current ?? null, running: timer !== null };
}
