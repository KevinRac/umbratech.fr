/**
 * Synthétiseur des bruitages et des ambiances (jalon M10, lot D, décision n°239).
 * Aucun fichier son : chaque bruit est un empilement de couches (oscillateurs,
 * modulation de fréquence pour le métal et les cloches, bruits blanc / rose /
 * brun filtrés), avec une réverbération courte partagée en « départ ».
 *
 * Le synthétiseur travaille sur n'importe quel contexte (`BaseAudioContext`) et
 * n'importe quelle sortie : le jeu le branche sur le bus « effets » ou
 * « ambiance » (`audio/engine.ts`), la planche d'écoute (`tools/sfx/`) sur un
 * contexte hors ligne pour rendre un fichier.
 *
 * Les recettes (`audio/sfxRecipes.ts`) ne voient que l'interface `Voice` : on
 * peut les essayer sans Web Audio (tests).
 */

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';
export type NoiseColor = 'white' | 'pink' | 'brown';

interface Common {
  /** Départ (horloge audio, secondes). */
  readonly at: number;
  /** Durée jusqu'au silence (s). */
  readonly dur: number;
  /** Crête de l'enveloppe (0 à 1). */
  readonly gain: number;
  /** Montée (s), 4 ms par défaut. */
  readonly attack?: number;
  /** Palier à la crête avant la descente (s). */
  readonly hold?: number;
  /** Panoramique (−1 gauche, +1 droite). */
  readonly pan?: number;
  /** Part envoyée dans la réverbération (0 à 1). */
  readonly wet?: number;
}

export interface ToneParams extends Common {
  readonly wave: Wave;
  /** Fréquence de départ, et d'arrivée (glissando exponentiel) si donnée. */
  readonly f: number;
  readonly f1?: number;
  /** Modulation de fréquence : rapport du modulateur et indice (métal, cloche). */
  readonly fm?: { readonly ratio: number; readonly index: number };
  /** Vibrato : fréquence (Hz) et profondeur (part de la fréquence). */
  readonly vibrato?: { readonly rate: number; readonly depth: number };
  /** Coupe-haut (adoucit les ondes carrées et en dents de scie). */
  readonly lowpass?: number;
  /** Modulation d'amplitude (coassement, grésillement) : fréquence (Hz), profondeur 0 à 1. */
  readonly tremolo?: { readonly rate: number; readonly depth: number };
}

export interface NoiseParams extends Common {
  readonly filter: BiquadFilterType;
  /** Fréquence du filtre au départ, et à l'arrivée si donnée. */
  readonly f: number;
  readonly f1?: number;
  readonly q?: number;
  readonly color?: NoiseColor;
}

/** Ce que voient les recettes : deux gestes, et un hasard (seedé dans les tests et la planche). */
export interface Voice {
  tone(p: ToneParams): void;
  noise(p: NoiseParams): void;
  /** Nombre au hasard dans [0, 1). */
  random(): number;
}

const NOISE_SECONDS = 3;
const REVERB_SECONDS = 0.9;

interface Shared {
  readonly noise: Record<NoiseColor, AudioBuffer>;
  readonly impulse: AudioBuffer;
}

const shared = new WeakMap<BaseAudioContext, Shared>();

/** Bruits (blanc, rose, brun) et réponse de la salle, une fois par contexte. */
function sharedFor(ctx: BaseAudioContext): Shared {
  const known = shared.get(ctx);
  if (known) return known;
  const len = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const make = (color: NoiseColor): AudioBuffer => {
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'white') d[i] = w;
      else if (color === 'pink') {
        // Filtre de Paul Kellet (version courte).
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Raccord sans clic : les 20 dernières ms se fondent dans le début.
    const fade = Math.floor(ctx.sampleRate * 0.02);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[len - fade + i] = (d[len - fade + i] as number) * (1 - k) + (d[i] as number) * k;
    }
    return buf;
  };
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * REVERB_SECONDS), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate;
      // Petite salle de pierre : premières réflexions puis queue qui s'éteint.
      const early = i < ctx.sampleRate * 0.03 ? 0.6 : 1;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 5.5) * early;
    }
  }
  const s: Shared = { noise: { white: make('white'), pink: make('pink'), brown: make('brown') }, impulse: ir };
  shared.set(ctx, s);
  return s;
}

/**
 * Voix branchée sur un contexte et une sortie. Une seule réverbération par
 * synthétiseur (départ commun).
 */
export class Synth implements Voice {
  private readonly data: Shared;
  private readonly dry: GainNode;
  private readonly send: GainNode;

  constructor(
    readonly ctx: BaseAudioContext,
    output: AudioNode,
    private readonly rand: () => number = Math.random,
  ) {
    this.data = sharedFor(ctx);
    this.dry = ctx.createGain();
    this.dry.connect(output);
    this.send = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = this.data.impulse;
    const wetLevel = ctx.createGain();
    wetLevel.gain.value = 0.55;
    this.send.connect(reverb).connect(wetLevel).connect(output);
  }

  random(): number {
    return this.rand();
  }

  /** Buffer de bruit (les ambiances bouclent dessus). */
  noiseBuffer(color: NoiseColor): AudioBuffer {
    return this.data.noise[color];
  }

  /** Entrée « sèche » et départ de réverbération, pour les nappes d'ambiance. */
  outputs(): { readonly dry: AudioNode; readonly send: AudioNode } {
    return { dry: this.dry, send: this.send };
  }

  tone(p: ToneParams): void {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = p.wave;
    glide(o.frequency, p.at, p.f, p.f1, p.dur);
    const stops: AudioScheduledSourceNode[] = [o];
    if (p.fm) {
      const m = c.createOscillator();
      const depth = c.createGain();
      glide(m.frequency, p.at, p.f * p.fm.ratio, p.f1 === undefined ? undefined : p.f1 * p.fm.ratio, p.dur);
      // L'indice s'éteint avec le son : l'attaque est brillante, la queue plus pure (cloche).
      depth.gain.setValueAtTime(p.f * p.fm.index, p.at);
      depth.gain.exponentialRampToValueAtTime(Math.max(1, p.f * p.fm.index * 0.15), p.at + p.dur);
      m.connect(depth).connect(o.frequency);
      stops.push(m);
    }
    if (p.vibrato) {
      const v = c.createOscillator();
      const depth = c.createGain();
      v.frequency.value = p.vibrato.rate;
      depth.gain.value = p.f * p.vibrato.depth;
      v.connect(depth).connect(o.frequency);
      stops.push(v);
    }
    let head: AudioNode = o;
    if (p.lowpass) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = p.lowpass;
      head = head.connect(f);
    }
    if (p.tremolo) head = this.tremolo(head, p.tremolo, stops);
    this.finish(head, p);
    for (const s of stops) {
      s.start(p.at);
      s.stop(p.at + p.dur + 0.05);
    }
  }

  noise(p: NoiseParams): void {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.data.noise[p.color ?? 'white'];
    const f = c.createBiquadFilter();
    f.type = p.filter;
    f.Q.value = p.q ?? 1;
    glide(f.frequency, p.at, p.f, p.f1, p.dur);
    src.connect(f);
    this.finish(f, p);
    src.start(p.at, this.rand() * (NOISE_SECONDS - 0.5 - Math.min(p.dur, 2)));
    src.stop(p.at + p.dur + 0.05);
  }

  private tremolo(head: AudioNode, t: { rate: number; depth: number }, stops: AudioScheduledSourceNode[]): AudioNode {
    const c = this.ctx;
    const amp = c.createGain();
    amp.gain.value = 1 - t.depth / 2;
    const lfo = c.createOscillator();
    lfo.frequency.value = t.rate;
    const depth = c.createGain();
    depth.gain.value = t.depth / 2;
    lfo.connect(depth).connect(amp.gain);
    stops.push(lfo);
    return head.connect(amp);
  }

  /** Enveloppe, panoramique, sortie sèche et départ de réverbération. */
  private finish(head: AudioNode, p: Common): void {
    const c = this.ctx;
    const env = c.createGain();
    const attack = Math.max(0.001, p.attack ?? 0.004);
    const hold = Math.max(0, p.hold ?? 0);
    const peak = Math.max(0.0002, Math.min(1, p.gain));
    env.gain.setValueAtTime(0.0001, p.at);
    env.gain.exponentialRampToValueAtTime(peak, p.at + attack);
    if (hold > 0) env.gain.setValueAtTime(peak, p.at + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, Math.max(p.at + attack + hold + 0.005, p.at + p.dur));
    head.connect(env);
    let out: AudioNode = env;
    if (p.pan) {
      const pan = c.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, p.pan));
      out = env.connect(pan);
    }
    out.connect(this.dry);
    if (p.wet && p.wet > 0) {
      const w = c.createGain();
      w.gain.value = Math.min(1, p.wet);
      out.connect(w).connect(this.send);
    }
  }
}

function glide(param: AudioParam, at: number, f0: number, f1: number | undefined, dur: number): void {
  param.setValueAtTime(Math.max(20, f0), at);
  if (f1 !== undefined && f1 !== f0) param.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
}
