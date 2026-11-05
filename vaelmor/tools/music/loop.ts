/**
 * Recherche des points de boucle d'une musique (jalon M10, décision n°238).
 * Calcul pur, sans ffmpeg : il reçoit les échantillons et rend des secondes.
 *
 * Une piste Suno n'est pas une boucle : elle a une introduction, un corps et une
 * fin (souvent un fondu). On cherche un saut « fin → début » inaudible : deux
 * instants s < e tels que ce qui entoure e ressemble à ce qui entoure s
 * (même harmonie, même rythme). Le jeu jouera alors 0 → e, puis s → e en boucle.
 *
 * 1. Empreinte : toutes les 0,1 s, l'énergie de 16 bandes de fréquences
 *    (log), centrée et normée ; et l'enveloppe d'énergie (pour repérer la fin).
 * 2. Recherche grossière : pour chaque couple (s, e) permis, similarité
 *    moyenne (cosinus) des empreintes sur ±1,5 s autour de s et de e.
 * 3. Affinage : décalage de e (±60 ms) qui aligne au mieux les formes d'onde
 *    autour du raccord (corrélation), pour que les battements tombent juste.
 */

export interface LoopSearchOptions {
  /** Début de boucle le plus tôt (s) : après les premières secondes. */
  readonly minStart?: number;
  /** Durée minimale de la boucle, en part de la durée de la piste. */
  readonly minLengthRatio?: number;
  /** Durée minimale de la boucle (s). */
  readonly minLength?: number;
}

export interface LoopPoints {
  readonly start: number;
  readonly end: number;
  /** Similarité moyenne autour du raccord (−1 à 1 ; au-dessus de 0,9 c'est très bon). */
  readonly score: number;
  /** Fin de la partie « pleine » de la piste (avant la fin, le fondu ou le silence), en s. */
  readonly bodyEnd: number;
}

const HOP_S = 0.1;
const BANDS = 16;
const FFT = 1024;

/** FFT réelle (radix 2, en place) : renvoie les modules des FFT/2 premières raies. */
export function magnitudes(frame: Float32Array): Float32Array {
  const n = frame.length;
  const re = Float64Array.from(frame);
  const im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] as number, re[i] as number];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const xr = (re[b] as number) * wr - (im[b] as number) * wi;
        const xi = (re[b] as number) * wi + (im[b] as number) * wr;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
      }
    }
  }
  const out = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i] as number, im[i] as number);
  return out;
}

export interface Fingerprint {
  /** Empreintes centrées et normées, BANDS valeurs par image. */
  readonly frames: Float32Array[];
  /** Énergie (RMS) de chaque image. */
  readonly rms: Float32Array;
}

/** Empreinte d'un signal mono échantillonné à `rate` Hz. */
export function fingerprint(mono: Float32Array, rate: number): Fingerprint {
  const hop = Math.round(HOP_S * rate);
  const count = Math.max(0, Math.floor((mono.length - FFT) / hop));
  const window = new Float32Array(FFT).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1)));
  // Bandes logarithmiques de 60 Hz à rate / 2.
  const edges: number[] = [];
  for (let b = 0; b <= BANDS; b++) edges.push(Math.round(((60 * Math.pow(rate / 2 / 60, b / BANDS)) / (rate / 2)) * (FFT / 2)));
  const frames: Float32Array[] = [];
  const rms = new Float32Array(count);
  const buf = new Float32Array(FFT);
  for (let f = 0; f < count; f++) {
    let e = 0;
    for (let i = 0; i < FFT; i++) {
      const v = mono[f * hop + i] as number;
      e += v * v;
      buf[i] = v * (window[i] as number);
    }
    rms[f] = Math.sqrt(e / FFT);
    const mag = magnitudes(buf);
    const vec = new Float32Array(BANDS);
    for (let b = 0; b < BANDS; b++) {
      let s = 0;
      const lo = Math.max(1, edges[b] as number);
      const hi = Math.max(lo + 1, edges[b + 1] as number);
      for (let k = lo; k < hi; k++) s += (mag[k] as number) ** 2;
      vec[b] = Math.log(1e-9 + s / (hi - lo));
    }
    let mean = 0;
    for (const v of vec) mean += v;
    mean /= BANDS;
    let norm = 0;
    for (let b = 0; b < BANDS; b++) {
      vec[b] = (vec[b] as number) - mean;
      norm += (vec[b] as number) ** 2;
    }
    norm = Math.sqrt(norm) || 1;
    for (let b = 0; b < BANDS; b++) vec[b] = (vec[b] as number) / norm;
    frames.push(vec);
  }
  return { frames, rms };
}

/** Fin du corps de la piste : la dernière image dont l'énergie lissée (1 s) atteint 55 % de l'énergie médiane. */
export function bodyEndFrame(rms: Float32Array): number {
  const n = rms.length;
  const smooth = new Float32Array(n);
  const half = Math.round(0.5 / HOP_S);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(n - 1, i + half); k++) {
      s += rms[k] as number;
      c++;
    }
    smooth[i] = s / c;
  }
  const sorted = [...smooth].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)] ?? 0;
  for (let i = n - 1; i >= 0; i--) if ((smooth[i] as number) >= 0.55 * median) return i;
  return n - 1;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] as number) * (b[i] as number);
  return s;
}

/** Points de boucle d'un signal mono. */
export function findLoop(mono: Float32Array, rate: number, options: LoopSearchOptions = {}): LoopPoints {
  const { frames, rms } = fingerprint(mono, rate);
  const n = frames.length;
  const duration = mono.length / rate;
  const minStart = Math.round((options.minStart ?? 2) / HOP_S);
  const minLen = Math.round(Math.max(options.minLength ?? 40, duration * (options.minLengthRatio ?? 0.5)) / HOP_S);
  const W = Math.round(1.5 / HOP_S);
  const bodyEnd = bodyEndFrame(rms);
  const eMax = Math.min(n - W - 1, bodyEnd);
  let best = { s: minStart, e: Math.max(minStart + minLen, eMax), score: -Infinity };
  for (let e = minStart + minLen; e <= eMax; e++) {
    for (let s = Math.max(minStart, W); s <= e - minLen; s++) {
      let sum = 0;
      for (let k = -W; k <= W; k += 2) sum += dot(frames[s + k] as Float32Array, frames[e + k] as Float32Array);
      const score = sum / (W + 1);
      // À score égal, on préfère la boucle la plus longue.
      if (score > best.score + 1e-4 || (Math.abs(score - best.score) <= 1e-4 && e - s > best.e - best.s)) best = { s, e, score };
    }
  }
  // Affinage à l'échantillon : décaler la fin pour que l'onde après e prolonge l'onde après s.
  const s0 = Math.round(best.s * HOP_S * rate);
  const e0 = Math.round(best.e * HOP_S * rate);
  const span = Math.round(0.06 * rate);
  const len = Math.round(0.25 * rate);
  let bestLag = 0;
  let bestCorr = -Infinity;
  for (let lag = -span; lag <= span; lag++) {
    let c = 0;
    let ea = 0;
    let eb = 0;
    for (let i = 0; i < len; i++) {
      const a = mono[s0 + i] ?? 0;
      const b = mono[e0 + lag + i] ?? 0;
      c += a * b;
      ea += a * a;
      eb += b * b;
    }
    const corr = c / Math.sqrt(ea * eb || 1);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  return { start: s0 / rate, end: (e0 + bestLag) / rate, score: best.score, bodyEnd: bodyEnd * HOP_S };
}

/**
 * Raccord en fondu (`fade` s) cuit dans le signal entrelacé : juste avant `end`,
 * le son qui précède `start` monte pendant que l'original descend. Au saut
 * `end → start`, on entend donc la suite exacte de ce qui jouait.
 */
export function bakeCrossfade(pcm: Float32Array, channels: number, rate: number, start: number, end: number, fade: number): void {
  const n = Math.round(fade * rate);
  const s = Math.round(start * rate);
  const e = Math.round(end * rate);
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    const gIn = Math.sin((t * Math.PI) / 2);
    const gOut = Math.cos((t * Math.PI) / 2);
    for (let c = 0; c < channels; c++) {
      const at = (e - n + i) * channels + c;
      const from = (s - n + i) * channels + c;
      if (from < 0) continue;
      pcm[at] = (pcm[at] as number) * gOut + (pcm[from] as number) * gIn;
    }
  }
}
