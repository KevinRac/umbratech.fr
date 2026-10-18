/**
 * Portraits de dialogue peints (jalon M2, retouche de l'auteur du 18/10/2026) :
 * un buste de style anime en haute définition, peint au canevas 2D à partir de
 * l'apparence du PNJ (couleurs, coiffure, tenue, accessoire) et de ses traits
 * (`portrait` : genre, âge, barbe, yeux, signes). Les couleurs sont les mêmes
 * que celles de son sprite du monde : le personnage se reconnaît d'un coup d'œil.
 *
 * Tout est dessiné dans un repère 100×100 mis à l'échelle de la texture. Les
 * variations aléatoires (fond, mèches) sont tirées d'une graine dérivée de l'id
 * du PNJ : un même PNJ a toujours le même visage.
 */
import type { Expression, PortraitDef } from '../data/townSchemas';
import type { CharacterLook, Ramp3 } from './characterSprite';
import { PALETTE as P, mixColor } from './palette';

export interface PortraitSpec {
  readonly id: string;
  readonly look: CharacterLook;
  readonly traits: PortraitDef;
  readonly expression: Expression;
}

type Ctx = CanvasRenderingContext2D;

const css = (c: number, a = 1): string => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const dark = (c: number, k: number): number => mixColor(c, P.ombreProfonde, k);
const light = (c: number, k: number): number => mixColor(c, P.lumiereDoree, k);

/** Générateur déterministe (mulberry32) à partir d'une chaîne. */
function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Proportions du visage selon le genre et l'âge. */
interface Geo {
  cx: number;
  top: number;
  chin: number;
  /** Demi-largeur aux pommettes. */
  w: number;
  /** Demi-largeur de la mâchoire. */
  jaw: number;
  eyeY: number;
  eyeDX: number;
  eyeW: number;
  eyeH: number;
  mouthY: number;
  /** Échelle des épaules. */
  shoulders: number;
}

function geometry(t: PortraitDef): Geo {
  const g: Geo = { cx: 50, top: 17, chin: 69, w: 19, jaw: 11, eyeY: 47, eyeDX: 9.6, eyeW: 7.4, eyeH: 6.4, mouthY: 61.5, shoulders: 1 };
  if (t.face === 'm') Object.assign(g, { w: 20, jaw: 14, chin: 71, eyeH: 4.9, eyeW: 7.6, mouthY: 63, shoulders: 1.08 });
  switch (t.age) {
    case 'enfant':
      Object.assign(g, { top: 22, chin: 68, w: 18.5, jaw: 12, eyeY: 50, eyeH: 7.8, eyeW: 7.8, mouthY: 61.5, shoulders: 0.82 });
      break;
    case 'jeune':
      g.eyeH += 0.8;
      g.chin -= 1;
      break;
    case 'age':
      g.eyeH -= 1.1;
      g.jaw += 0.8;
      break;
    case 'adulte':
      break;
  }
  return g;
}

/** Tracé du visage (crâne compris, caché ensuite par les cheveux). */
function facePath(ctx: Ctx, g: Geo, pointy: number): void {
  const { cx, top, chin, w, jaw, eyeY, mouthY } = g;
  ctx.beginPath();
  ctx.moveTo(cx - w, top + 17);
  ctx.bezierCurveTo(cx - w, top - 3, cx + w, top - 3, cx + w, top + 17);
  ctx.bezierCurveTo(cx + w + 0.6, eyeY + 5, cx + jaw + 3.5, mouthY - 3, cx + jaw, mouthY + 2);
  ctx.bezierCurveTo(cx + jaw - 3, chin - 2.5, cx + pointy, chin, cx, chin);
  ctx.bezierCurveTo(cx - pointy, chin, cx - jaw + 3, chin - 2.5, cx - jaw, mouthY + 2);
  ctx.bezierCurveTo(cx - jaw - 3.5, mouthY - 3, cx - w - 0.6, eyeY + 5, cx - w, top + 17);
  ctx.closePath();
}

function background(ctx: Ctx, spec: PortraitSpec, rnd: () => number): void {
  const ground = mixColor(P.ardoise, spec.look.top.base, 0.35);
  const grad = ctx.createRadialGradient(36, 28, 4, 50, 50, 78);
  grad.addColorStop(0, css(light(ground, 0.5)));
  grad.addColorStop(0.45, css(ground));
  grad.addColorStop(1, css(dark(ground, 0.65)));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 100, 100);
  // Bokeh : quelques disques de lumière chaude, flous, dans le fond.
  for (let i = 0; i < 9; i++) {
    const x = rnd() * 100;
    const y = rnd() * 70;
    const r = 3 + rnd() * 9;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rnd() < 0.5 ? P.lumiereDoree : light(ground, 0.6);
    b.addColorStop(0, css(tone, 0.22 + rnd() * 0.18));
    b.addColorStop(0.7, css(tone, 0.08));
    b.addColorStop(1, css(tone, 0));
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hairGradient(ctx: Ctx, hair: Ramp3, y0: number, y1: number): CanvasGradient {
  const grad = ctx.createLinearGradient(30, y0, 70, y1);
  grad.addColorStop(0, css(light(hair.light, 0.15)));
  grad.addColorStop(0.45, css(hair.base));
  grad.addColorStop(1, css(dark(hair.dark, 0.25)));
  return grad;
}

/** Cheveux et capuche à l'arrière du buste. */
function backLayer(ctx: Ctx, spec: PortraitSpec, g: Geo): void {
  const { look } = spec;
  const { cx, top, w } = g;
  if (look.head === 'long') {
    ctx.fillStyle = hairGradient(ctx, look.hair, top, 96);
    ctx.beginPath();
    ctx.moveTo(cx - w - 2, top + 8);
    ctx.bezierCurveTo(cx - w - 9, top + 30, cx - w - 12, 80, cx - w - 7, 98);
    ctx.lineTo(cx + w + 7, 98);
    ctx.bezierCurveTo(cx + w + 12, 80, cx + w + 9, top + 30, cx + w + 2, top + 8);
    ctx.bezierCurveTo(cx + w, top - 8, cx - w, top - 8, cx - w - 2, top + 8);
    ctx.fill();
  } else if (look.head === 'bun') {
    const bx = cx + 3;
    const by = top - 2;
    const grad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 10);
    grad.addColorStop(0, css(look.hair.light));
    grad.addColorStop(0.6, css(look.hair.base));
    grad.addColorStop(1, css(look.hair.dark));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(bx, by, 10, 8.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(dark(look.hair.dark, 0.3), 0.7);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
  } else if (look.head === 'hood') {
    const grad = ctx.createLinearGradient(20, 0, 80, 100);
    grad.addColorStop(0, css(look.top.light));
    grad.addColorStop(1, css(dark(look.top.dark, 0.3)));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - w - 12, 96);
    ctx.bezierCurveTo(cx - w - 16, top - 4, cx - 4, top - 14, cx + 2, top - 12);
    ctx.bezierCurveTo(cx + w + 14, top - 8, cx + w + 16, top + 30, cx + w + 12, 96);
    ctx.closePath();
    ctx.fill();
  }
}

function swordHilt(ctx: Ctx, look: CharacterLook, g: Geo): void {
  const x = g.cx + 30 * g.shoulders;
  ctx.save();
  ctx.translate(x, 70);
  ctx.rotate(0.38);
  const leather = ctx.createLinearGradient(-2, 0, 2, 0);
  leather.addColorStop(0, css(look.belt.light));
  leather.addColorStop(1, css(look.belt.dark));
  ctx.fillStyle = leather;
  ctx.fillRect(-1.8, -14, 3.6, 14);
  ctx.strokeStyle = css(dark(look.belt.dark, 0.4));
  ctx.lineWidth = 0.5;
  for (let y = -12; y < 0; y += 2.4) {
    ctx.beginPath();
    ctx.moveTo(-1.8, y);
    ctx.lineTo(1.8, y + 1.2);
    ctx.stroke();
  }
  const steel = ctx.createLinearGradient(0, -2, 0, 2);
  steel.addColorStop(0, css(P.metalClair));
  steel.addColorStop(1, css(dark(P.metal, 0.3)));
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.lineTo(8, 2.4);
  ctx.lineTo(-8, 2.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -15.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(P.ecume, 0.8);
  ctx.beginPath();
  ctx.arc(-0.8, -16.3, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Silhouette des épaules. */
function shouldersPath(ctx: Ctx, g: Geo): void {
  const { cx } = g;
  const s = g.shoulders;
  const X = (dx: number): number => cx + dx * s;
  const y0 = 74 + (s < 1 ? 4 : 0);
  ctx.beginPath();
  ctx.moveTo(X(-60), 101);
  ctx.lineTo(X(-52), 93);
  ctx.bezierCurveTo(X(-46), y0 + 8, X(-34), y0 + 4, X(-20), y0 + 2);
  ctx.bezierCurveTo(X(-14), y0 + 1, X(-10), y0, X(-8), y0);
  ctx.lineTo(X(8), y0);
  ctx.bezierCurveTo(X(10), y0, X(14), y0 + 1, X(20), y0 + 2);
  ctx.bezierCurveTo(X(34), y0 + 4, X(46), y0 + 8, X(52), 93);
  ctx.lineTo(X(60), 101);
  ctx.closePath();
}

function clothGradient(ctx: Ctx, ramp: Ramp3): CanvasGradient {
  const grad = ctx.createLinearGradient(10, 72, 90, 100);
  grad.addColorStop(0, css(light(ramp.light, 0.1)));
  grad.addColorStop(0.5, css(ramp.base));
  grad.addColorStop(1, css(dark(ramp.dark, 0.25)));
  return grad;
}

function body(ctx: Ctx, spec: PortraitSpec, g: Geo): void {
  const { look } = spec;
  const { cx } = g;
  const s = g.shoulders;
  const y0 = 74 + (s < 1 ? 4 : 0);
  const outline = css(dark(look.tunic.dark, 0.55));

  // Cou (derrière le col).
  const neck = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0);
  neck.addColorStop(0, css(look.skin.base));
  neck.addColorStop(1, css(look.skin.dark));
  ctx.fillStyle = neck;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, g.mouthY - 2);
  ctx.lineTo(cx - 7.5, y0 + 4);
  ctx.lineTo(cx + 7.5, y0 + 4);
  ctx.lineTo(cx + 6.5, g.mouthY - 2);
  ctx.closePath();
  ctx.fill();
  // Ombre du menton sur le cou.
  ctx.fillStyle = css(dark(look.skin.dark, 0.25), 0.75);
  ctx.beginPath();
  ctx.moveTo(cx - 7, g.chin - 6);
  ctx.quadraticCurveTo(cx, g.chin + 6, cx + 7, g.chin - 6);
  ctx.lineTo(cx + 7, g.chin - 10);
  ctx.lineTo(cx - 7, g.chin - 10);
  ctx.closePath();
  ctx.fill();

  shouldersPath(ctx, g);
  ctx.fillStyle = clothGradient(ctx, look.tunic);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.save();
  shouldersPath(ctx, g);
  ctx.clip();
  // Manches / épaules dans la couleur du haut.
  if (look.outfit !== 'cloak') {
    ctx.fillStyle = clothGradient(ctx, look.top);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 60 * s, 101);
      ctx.lineTo(cx + side * 60 * s, 80);
      ctx.bezierCurveTo(cx + side * 40 * s, y0 + 2, cx + side * 30 * s, y0 + 4, cx + side * 27 * s, y0 + 8);
      ctx.bezierCurveTo(cx + side * 31 * s, 88, cx + side * 33 * s, 96, cx + side * 33 * s, 101);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Encolure : en V (tunique, cape) ou arrondie (robe).
  ctx.fillStyle = css(look.skin.dark);
  ctx.beginPath();
  if (look.outfit === 'dress') {
    ctx.moveTo(cx - 12, y0 + 1);
    ctx.quadraticCurveTo(cx, y0 + 16, cx + 12, y0 + 1);
  } else {
    ctx.moveTo(cx - 8, y0);
    ctx.lineTo(cx, y0 + 13);
    ctx.lineTo(cx + 8, y0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(look.accent.base);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (look.outfit === 'dress') {
    ctx.moveTo(cx - 12.5, y0 + 1);
    ctx.quadraticCurveTo(cx, y0 + 17, cx + 12.5, y0 + 1);
  } else {
    ctx.moveTo(cx - 8.5, y0);
    ctx.lineTo(cx, y0 + 13.5);
    ctx.lineTo(cx + 8.5, y0);
  }
  ctx.stroke();
  if (look.outfit === 'tunic') {
    // Laçage du col.
    ctx.strokeStyle = css(look.belt.base);
    ctx.lineWidth = 0.7;
    for (const y of [y0 + 5, y0 + 8.5]) {
      const half = (13 - (y - y0)) * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y + 1.6);
      ctx.moveTo(cx + half, y);
      ctx.lineTo(cx - half, y + 1.6);
      ctx.stroke();
    }
  }
  // Ombre douce sous le menton sur le tissu.
  ctx.fillStyle = css(P.ombreProfonde, 0.18);
  ctx.beginPath();
  ctx.ellipse(cx + 2, y0 + 3, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (look.outfit === 'cloak') {
    // Pans de la cape sur les épaules, fermoir de métal.
    ctx.fillStyle = clothGradient(ctx, look.top);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 62 * s, 101);
      ctx.lineTo(cx + side * 54 * s, 90);
      ctx.bezierCurveTo(cx + side * 44 * s, y0 + 4, cx + side * 24 * s, y0 - 1, cx + side * 9, y0 - 1);
      ctx.bezierCurveTo(cx + side * 11, y0 + 8, cx + side * 15, y0 + 16, cx + side * 18, 101);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = css(dark(look.top.dark, 0.5));
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.strokeStyle = css(look.top.light, 0.6);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(cx + side * 10, y0 + 1);
      ctx.bezierCurveTo(cx + side * 12, y0 + 8, cx + side * 15, y0 + 15, cx + side * 17, 100);
      ctx.stroke();
    }
    // Col / écharpe dans la couleur d'accent.
    ctx.fillStyle = clothGradient(ctx, look.accent);
    ctx.beginPath();
    ctx.moveTo(cx - 12, y0 - 1);
    ctx.quadraticCurveTo(cx, y0 + 7, cx + 12, y0 - 1);
    ctx.quadraticCurveTo(cx + 11, y0 + 5, cx + 7, y0 + 7);
    ctx.quadraticCurveTo(cx, y0 + 10, cx - 7, y0 + 7);
    ctx.quadraticCurveTo(cx - 11, y0 + 5, cx - 12, y0 - 1);
    ctx.fill();
    const clasp = ctx.createRadialGradient(cx - 10.5, y0 + 7, 0.3, cx - 10, y0 + 8, 3);
    clasp.addColorStop(0, css(P.ecume));
    clasp.addColorStop(0.5, css(P.jauneBle));
    clasp.addColorStop(1, css(dark(P.ambre, 0.4)));
    ctx.fillStyle = clasp;
    ctx.beginPath();
    ctx.arc(cx - 10, y0 + 8, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.outfit === 'dress') {
    // Châle du haut sur les épaules.
    ctx.strokeStyle = css(look.top.light, 0.85);
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 13, y0 + 1);
      ctx.bezierCurveTo(cx + side * 20, y0 + 4, cx + side * 30 * s, y0 + 6, cx + side * 40 * s, y0 + 9);
      ctx.stroke();
    }
  }

  if (look.accessory === 'satchel') {
    ctx.save();
    ctx.translate(cx + 24 * s, y0 + 3);
    ctx.rotate(0.95);
    const strap = ctx.createLinearGradient(0, -2, 0, 2);
    strap.addColorStop(0, css(look.belt.light));
    strap.addColorStop(1, css(look.belt.dark));
    ctx.fillStyle = strap;
    ctx.fillRect(0, -2.2, 40, 4.4);
    ctx.strokeStyle = css(look.belt.light, 0.7);
    ctx.lineWidth = 0.4;
    ctx.setLineDash([1.2, 1]);
    ctx.beginPath();
    ctx.moveTo(0, -1.3);
    ctx.lineTo(40, -1.3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = css(P.metalClair);
    ctx.fillRect(11, -2.8, 3.4, 5.6);
    ctx.fillStyle = css(look.belt.dark);
    ctx.fillRect(12, -1.6, 1.4, 3.2);
    ctx.restore();
  }
}

/** Œil dans un repère local : +x vers l'extérieur du visage. */
function eye(ctx: Ctx, spec: PortraitSpec, g: Geo, side: number): void {
  const { traits, look, expression } = spec;
  const x = g.cx + side * g.eyeDX;
  const y = g.eyeY;
  const w = g.eyeW / 2 + 0.6;
  let h = g.eyeH / 2 + 0.6;
  const ink = css(dark(mixColor(look.hair.dark, P.encre, 0.6), 0.3));
  const soft = traits.face === 'f' || traits.age === 'enfant';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side, 1);

  if (expression === 'content' && soft) {
    // Yeux fermés de joie, en arc.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w, 1);
    ctx.quadraticCurveTo(0, -h * 1.3, w, 0.5);
    ctx.stroke();
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(w - 0.4, 0.2);
    ctx.lineTo(w + 1.4, -0.8);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (expression === 'content') h *= 0.72;

  const almond = (): void => {
    ctx.beginPath();
    ctx.moveTo(-w, 0.4);
    ctx.bezierCurveTo(-w * 0.6, -h * 1.15, w * 0.55, -h * 1.2, w, -h * 0.25);
    ctx.bezierCurveTo(w * 0.6, h * 0.95, -w * 0.5, h * 0.95, -w, 0.4);
    ctx.closePath();
  };
  almond();
  ctx.fillStyle = css(mixColor(P.ecume, P.parchemin, 0.35));
  ctx.fill();
  ctx.save();
  almond();
  ctx.clip();
  // Iris : dégradé vertical, pupille, reflets.
  const iris = mixColor(parseInt(traits.eyes.slice(1), 16), P.terreSeche, 0.08);
  const ix = -w * 0.08;
  const iy = -h * 0.08;
  const rx = w * 0.56;
  const ry = h * 0.98;
  const grad = ctx.createLinearGradient(0, iy - ry, 0, iy + ry);
  grad.addColorStop(0, css(dark(iris, 0.6)));
  grad.addColorStop(0.55, css(iris));
  grad.addColorStop(1, css(light(iris, 0.45)));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(ix, iy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(dark(iris, 0.85));
  ctx.beginPath();
  ctx.ellipse(ix, iy - ry * 0.05, rx * 0.45, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(dark(iris, 0.7), 0.8);
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.ellipse(ix, iy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Ombre de la paupière sur l'œil.
  ctx.fillStyle = css(P.ombreProfonde, 0.28);
  ctx.beginPath();
  ctx.ellipse(0, -h * 1.05, w * 1.2, h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(0xffffff, 0.95);
  ctx.beginPath();
  ctx.ellipse(ix - rx * 0.38 * side, iy - ry * 0.42, Math.max(0.6, rx * 0.3), Math.max(0.6, ry * 0.24), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(0xffffff, 0.7);
  ctx.beginPath();
  ctx.arc(ix + rx * 0.35 * side, iy + ry * 0.4, Math.max(0.35, rx * 0.13), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Paupières (et coupe de l'expression).
  const skin = css(spec.look.skin.base);
  if (expression === 'fache' || expression === 'triste') {
    const innerY = expression === 'fache' ? -h * 0.15 : -h * 1.05;
    const outerY = expression === 'fache' ? -h * 0.95 : -h * 0.2;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-w - 1, innerY);
    ctx.lineTo(w + 1.5, outerY);
    ctx.lineTo(w + 1.5, -h * 2.4);
    ctx.lineTo(-w - 1, -h * 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = soft ? 1.25 : 1.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w, innerY + 0.2);
    ctx.lineTo(w + 0.8, outerY);
    ctx.stroke();
  } else {
    ctx.strokeStyle = ink;
    ctx.lineWidth = soft ? 1.3 : 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w, 0.4);
    ctx.bezierCurveTo(-w * 0.6, -h * 1.15, w * 0.55, -h * 1.2, w, -h * 0.25);
    ctx.stroke();
  }
  if (soft) {
    // Cils extérieurs.
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(w * 0.55, -h * 0.85);
    ctx.lineTo(w + 1.9, -h * 0.75);
    ctx.lineTo(w + 0.2, -h * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = css(dark(spec.look.skin.dark, 0.35), 0.55);
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, h * 0.75);
  ctx.quadraticCurveTo(w * 0.3, h * 0.95, w * 0.85, h * 0.2);
  ctx.stroke();
  if (traits.age === 'age') {
    // Pattes d'oie et cernes.
    ctx.strokeStyle = css(dark(spec.look.skin.dark, 0.2), 0.5);
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(w + 1.3, -0.4);
    ctx.lineTo(w + 3.2, -1.3);
    ctx.moveTo(w + 1.3, 0.6);
    ctx.lineTo(w + 3.2, 1.2);
    ctx.moveTo(-w * 0.3, h + 1.4);
    ctx.quadraticCurveTo(w * 0.3, h + 2.3, w * 0.9, h + 0.8);
    ctx.stroke();
  }
  if (expression === 'triste') {
    // Larme au coin de l'œil.
    const tear = ctx.createLinearGradient(w * 0.4, h, w * 0.4, h + 5);
    tear.addColorStop(0, css(P.ecume, 0.9));
    tear.addColorStop(1, css(P.ciel, 0.4));
    ctx.fillStyle = tear;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.6);
    ctx.quadraticCurveTo(w * 0.95, h + 3, w * 0.5, h + 4.2);
    ctx.quadraticCurveTo(w * 0.05, h + 3, w * 0.5, h * 0.6);
    ctx.fill();
  }

  // Sourcil.
  const browY = -h - (traits.face === 'm' ? 2.6 : 3.4);
  let inner = browY;
  let outer = browY - 0.6;
  if (expression === 'fache') {
    inner = browY + 2.4;
    outer = browY - 1.6;
  } else if (expression === 'triste') {
    inner = browY - 2;
    outer = browY + 1.2;
  } else if (expression === 'content') {
    inner = browY - 0.8;
    outer = browY - 1.2;
  }
  const browColor = traits.age === 'age' ? mixColor(look.hair.base, look.hair.dark, 0.5) : dark(look.hair.dark, 0.25);
  ctx.fillStyle = css(browColor);
  const thick = traits.face === 'm' ? 1.5 : 0.95;
  ctx.beginPath();
  ctx.moveTo(-w * 0.95, inner + thick * 0.5);
  ctx.quadraticCurveTo(0, Math.min(inner, outer) - 1.6, w * 1.25, outer + 0.5);
  ctx.quadraticCurveTo(0, Math.min(inner, outer) - 1.6 + thick, -w * 0.95, inner + thick * 0.5 + thick);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function mouth(ctx: Ctx, spec: PortraitSpec, g: Geo): void {
  const { traits, expression, look } = spec;
  const { cx, mouthY: y } = g;
  const lip = css(dark(mixColor(look.skin.dark, P.rougeCendre, 0.35), 0.35));
  const soft = traits.face === 'f' || traits.age === 'enfant';
  ctx.lineCap = 'round';
  ctx.strokeStyle = lip;
  switch (expression) {
    case 'neutre':
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(cx - 3.2, y);
      ctx.quadraticCurveTo(cx, y + 0.7, cx + 3.4, y - 0.1);
      ctx.stroke();
      break;
    case 'content':
      if (soft) {
        ctx.fillStyle = css(mixColor(P.brique, P.ombreProfonde, 0.45));
        ctx.beginPath();
        ctx.moveTo(cx - 4.5, y - 1);
        ctx.quadraticCurveTo(cx, y + 5.5, cx + 4.5, y - 1);
        ctx.quadraticCurveTo(cx, y + 0.4, cx - 4.5, y - 1);
        ctx.fill();
        ctx.fillStyle = css(mixColor(P.rougeCendre, P.parchemin, 0.4));
        ctx.beginPath();
        ctx.ellipse(cx + 0.3, y + 2.6, 2, 1, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(cx - 5, y - 1.2);
        ctx.quadraticCurveTo(cx, y + 2.8, cx + 5, y - 1.2);
        ctx.stroke();
      }
      break;
    case 'fache':
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - 4, y + 1.2);
      ctx.quadraticCurveTo(cx, y - 1.8, cx + 4, y + 1.2);
      ctx.stroke();
      break;
    case 'triste':
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(cx - 3, y + 1.2);
      ctx.quadraticCurveTo(cx, y - 0.6, cx + 3, y + 1.2);
      ctx.stroke();
      break;
  }
  if (traits.face === 'f' && traits.age !== 'enfant') {
    ctx.fillStyle = css(P.rougeCendre, 0.22);
    ctx.beginPath();
    ctx.ellipse(cx + 0.3, y + 1.9, 2.4, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function beard(ctx: Ctx, spec: PortraitSpec, g: Geo, rnd: () => number): void {
  const { look, traits } = spec;
  const { cx, w, eyeY, mouthY: y, chin, jaw } = g;
  if (traits.beard === 'aucune') return;
  if (traits.beard === 'courte') {
    ctx.save();
    facePath(ctx, g, 4);
    ctx.clip();
    ctx.fillStyle = css(mixColor(look.hair.base, look.skin.dark, 0.4), 0.2);
    ctx.beginPath();
    ctx.moveTo(cx - w - 1, eyeY + 6);
    ctx.bezierCurveTo(cx - jaw - 2, chin + 2, cx + jaw + 2, chin + 2, cx + w + 1, eyeY + 6);
    ctx.lineTo(cx + w - 3, eyeY + 6);
    ctx.bezierCurveTo(cx + 9, y - 5, cx + 4, y - 4, cx, y - 4);
    ctx.bezierCurveTo(cx - 4, y - 4, cx - 9, y - 5, cx - w + 3, eyeY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(dark(look.hair.dark, 0.2), 0.3);
    for (let i = 0; i < 140; i++) {
      const a = rnd() * Math.PI;
      const r = 0.55 + rnd() * 0.45;
      const px = cx + Math.cos(a) * (w - 1) * r;
      const py = y + Math.sin(a) * (chin - y) * r;
      ctx.fillRect(px, py, 0.3, 0.3);
    }
    ctx.restore();
    return;
  }
  if (traits.beard === 'pleine') {
    ctx.fillStyle = hairGradient(ctx, look.hair, eyeY, chin + 12);
    ctx.beginPath();
    ctx.moveTo(cx - w - 0.6, eyeY + 1);
    ctx.bezierCurveTo(cx - w + 0.5, y + 2, cx - 9, chin + 7, cx, chin + 10);
    ctx.bezierCurveTo(cx + 9, chin + 7, cx + w - 0.5, y + 2, cx + w + 0.6, eyeY + 1);
    ctx.lineTo(cx + w - 3, eyeY + 4);
    ctx.bezierCurveTo(cx + 8, y - 3, cx + 5, y + 3, cx, y + 3);
    ctx.bezierCurveTo(cx - 5, y + 3, cx - 8, y - 3, cx - w + 3, eyeY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(dark(look.hair.dark, 0.3), 0.5);
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const sx = cx - w + 2 + t * (2 * w - 4);
      ctx.beginPath();
      ctx.moveTo(sx, y - 1 + rnd() * 3);
      ctx.quadraticCurveTo(sx + (cx - sx) * 0.2, chin, sx + (cx - sx) * 0.45, chin + 4 + rnd() * 4);
      ctx.stroke();
    }
  }
  // Moustache (barbe pleine ou moustache seule).
  ctx.fillStyle = hairGradient(ctx, look.hair, y - 5, y + 2);
  ctx.beginPath();
  ctx.moveTo(cx - 7.5, y + 1);
  ctx.quadraticCurveTo(cx - 3.5, y - 4.5, cx, y - 2.6);
  ctx.quadraticCurveTo(cx + 3.5, y - 4.5, cx + 7.5, y + 1);
  ctx.quadraticCurveTo(cx + 3, y - 1, cx, y - 0.6);
  ctx.quadraticCurveTo(cx - 3, y - 1, cx - 7.5, y + 1);
  ctx.fill();
}

function faceDetails(ctx: Ctx, spec: PortraitSpec, g: Geo, rnd: () => number): void {
  const { traits, look, expression } = spec;
  const { cx, eyeY, mouthY, w } = g;
  // Joues.
  if (traits.face === 'f' || traits.age === 'enfant' || traits.age === 'jeune') {
    const a = expression === 'content' ? 0.34 : 0.2;
    for (const side of [-1, 1]) {
      const bx = cx + side * 11.5;
      const by = eyeY + 7.5;
      const blush = ctx.createRadialGradient(bx, by, 0, bx, by, 4.5);
      blush.addColorStop(0, css(P.rougeCendre, a));
      blush.addColorStop(1, css(P.rougeCendre, 0));
      ctx.fillStyle = blush;
      ctx.beginPath();
      ctx.ellipse(bx, by, 4.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (expression === 'content') {
        ctx.strokeStyle = css(P.rougeCendre, 0.45);
        ctx.lineWidth = 0.35;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(bx + k * 1.4 - 0.5, by + 0.8);
          ctx.lineTo(bx + k * 1.4 + 0.5, by - 0.8);
          ctx.stroke();
        }
      }
    }
  }
  if (traits.marks.includes('taches')) {
    ctx.fillStyle = css(dark(look.skin.dark, 0.15), 0.55);
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const px = cx + side * (5 + rnd() * 8);
      const py = eyeY + 4 + rnd() * 4;
      ctx.beginPath();
      ctx.arc(px, py, 0.3 + rnd() * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (traits.age === 'age') {
    ctx.strokeStyle = css(dark(look.skin.dark, 0.2), 0.42);
    ctx.lineWidth = 0.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 4.5, eyeY + 8);
      ctx.quadraticCurveTo(cx + side * 7.5, mouthY - 2, cx + side * 6.2, mouthY + 1.5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 6, eyeY - 10.5);
    ctx.quadraticCurveTo(cx, eyeY - 11.5, cx + 6, eyeY - 10.5);
    ctx.stroke();
  }
  // Nez : une ombre et un reflet.
  ctx.strokeStyle = css(dark(look.skin.dark, 0.25), 0.7);
  ctx.lineWidth = traits.face === 'm' ? 0.75 : 0.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (traits.face === 'm' && traits.age !== 'enfant') {
    ctx.moveTo(cx + 1.2, eyeY + 2);
    ctx.quadraticCurveTo(cx + 2.6, eyeY + 7, cx + 2, eyeY + 9.8);
    ctx.quadraticCurveTo(cx + 0.5, eyeY + 10.8, cx - 1.2, eyeY + 10);
  } else {
    ctx.moveTo(cx + 0.6, eyeY + 8.4);
    ctx.quadraticCurveTo(cx + 1.4, eyeY + 9.6, cx - 0.4, eyeY + 9.9);
  }
  ctx.stroke();
  ctx.fillStyle = css(P.ecume, 0.55);
  ctx.beginPath();
  ctx.ellipse(cx - 0.4, eyeY + 7.6, 0.55, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (traits.marks.includes('cicatrice')) {
    ctx.strokeStyle = css(mixColor(look.skin.light, P.rougeCendre, 0.4), 0.9);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.75, eyeY - 6);
    ctx.lineTo(cx - w * 0.35, eyeY + 7);
    ctx.stroke();
    ctx.strokeStyle = css(dark(look.skin.dark, 0.3), 0.5);
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.75 + 0.5, eyeY - 6);
    ctx.lineTo(cx - w * 0.35 + 0.5, eyeY + 7);
    ctx.stroke();
  }
}

/** Mèches du front : pointes alternées, légèrement balayées (aléas tirés une fois, le tracé est rejoué). */
function bangs(ctx: Ctx, g: Geo, count: number, depth: number, sweep: number, jitter: readonly number[]): void {
  const { cx, w, top } = g;
  const left = cx - w + 0.5;
  const right = cx + w - 0.5;
  const root = top + 11;
  const tipBase = g.eyeY - 6.5 - depth;
  ctx.lineTo(cx + w - 0.3, g.eyeY - 3);
  ctx.lineTo(right, root + 4);
  for (let i = 0; i < count; i++) {
    const x0 = right - (i / count) * (right - left);
    const x1 = right - ((i + 1) / count) * (right - left);
    const mid = (x0 + x1) / 2;
    const edge = Math.abs(mid - cx) / w;
    const tip = tipBase + edge * 2.5 + ((jitter[i] ?? 0.5) - 0.5) * 3;
    const tx = mid + sweep;
    ctx.bezierCurveTo(x0 - 0.5, root + 6, tx + 1.2, tip - 4, tx, tip);
    ctx.bezierCurveTo(tx - 0.6, tip - 4.5, x1 + 0.8, root + 7, x1, root + 3 + (jitter[i + count] ?? 0.5) * 2);
  }
  ctx.lineTo(cx - w + 0.3, g.eyeY - 3);
}

function frontHair(ctx: Ctx, spec: PortraitSpec, g: Geo, rnd: () => number): void {
  const { look, traits } = spec;
  const { cx, w, top, eyeY } = g;
  const hair = look.hair;
  const outline = css(dark(hair.dark, 0.5));
  const jitter = Array.from({ length: 16 }, () => rnd());
  const path = (): void => {
    ctx.beginPath();
    if (look.head === 'hood') {
      ctx.moveTo(cx - w - 3, eyeY - 1);
      ctx.bezierCurveTo(cx - w - 5, top - 9, cx + w + 5, top - 9, cx + w + 3, eyeY - 1);
      bangs(ctx, g, 4, -1, -1.5, jitter);
    } else if (look.head === 'bun') {
      ctx.moveTo(cx - w - 2.5, eyeY + 1);
      ctx.bezierCurveTo(cx - w - 4, top - 7, cx + w + 4, top - 7, cx + w + 2.5, eyeY + 1);
      bangs(ctx, g, 5, -2, 2.5, jitter);
    } else if (look.head === 'long') {
      ctx.moveTo(cx - w - 3, eyeY + 4);
      ctx.bezierCurveTo(cx - w - 5, top - 8, cx + w + 5, top - 8, cx + w + 3, eyeY + 4);
      bangs(ctx, g, 6, 1, -2, jitter);
    } else {
      ctx.moveTo(cx - w - 2.5, eyeY);
      ctx.bezierCurveTo(cx - w - 5, top - 9, cx + w + 5, top - 9, cx + w + 2.5, eyeY);
      bangs(ctx, g, traits.face === 'm' ? 5 : 6, traits.face === 'm' ? -2 : 0, traits.face === 'm' ? 3 : -2, jitter);
    }
    ctx.closePath();
  };
  path();
  ctx.fillStyle = hairGradient(ctx, hair, top - 6, eyeY);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // Ombrage en aplat à droite, reflet en anneau (style anime), mèches.
  ctx.fillStyle = css(dark(hair.dark, 0.2), 0.45);
  ctx.beginPath();
  ctx.moveTo(cx + 4, top - 10);
  ctx.bezierCurveTo(cx + 10, top + 6, cx + 8, eyeY - 6, cx + w + 6, eyeY);
  ctx.lineTo(cx + w + 8, top - 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(light(hair.light, 0.45), 0.75);
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 2.2, 3, 2.6]);
  ctx.beginPath();
  ctx.ellipse(cx - 3, top + 7, w - 2, 5.5, -0.08, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = css(dark(hair.dark, 0.35), 0.55);
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 9; i++) {
    const sx = cx - w + rnd() * 2 * w;
    ctx.beginPath();
    ctx.moveTo(cx + (sx - cx) * 0.3, top);
    ctx.quadraticCurveTo(sx, top + 8, sx + (rnd() - 0.5) * 3, eyeY - 6);
    ctx.stroke();
  }
  ctx.restore();
  path();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Mèches latérales devant les oreilles.
  if (look.head === 'long' || (look.head === 'bun' && traits.face === 'f')) {
    const len = look.head === 'long' ? 84 : eyeY + 13;
    const thick = look.head === 'long' ? 5.5 : 2.2;
    for (const side of [-1, 1]) {
      ctx.fillStyle = hairGradient(ctx, hair, eyeY - 10, len);
      ctx.beginPath();
      ctx.moveTo(cx + side * (w + 3), eyeY - 8);
      ctx.bezierCurveTo(cx + side * (w + 4), eyeY + 10, cx + side * (w + 2), len - 10, cx + side * (w + 1 - thick * 0.4), len);
      ctx.bezierCurveTo(cx + side * (w + 3 - thick), len - 12, cx + side * (w + 3.5 - thick), eyeY + 8, cx + side * (w + 3 - thick), eyeY - 6);
      ctx.closePath();
      ctx.fill();
      if (look.head === 'long') {
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  } else if (look.head === 'short' && traits.face === 'm') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = css(hair.base);
      ctx.beginPath();
      ctx.moveTo(cx + side * (w + 2.5), eyeY - 4);
      ctx.lineTo(cx + side * (w + 1), eyeY + 6);
      ctx.lineTo(cx + side * (w - 1.5), eyeY - 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (look.head === 'hood') {
    // Bord de la capuche autour du visage.
    const top3 = look.top;
    ctx.beginPath();
    ctx.moveTo(cx - w - 13, 100);
    ctx.bezierCurveTo(cx - w - 17, top - 8, cx + w + 17, top - 8, cx + w + 13, 100);
    ctx.lineTo(cx + 13, 100);
    ctx.bezierCurveTo(cx + w + 5, 80, cx + w + 4.5, top + 2, cx, top - 1);
    ctx.bezierCurveTo(cx - w - 4.5, top + 2, cx - w - 5, 80, cx - 13, 100);
    ctx.closePath();
    const grad = ctx.createLinearGradient(20, top, 80, 100);
    grad.addColorStop(0, css(light(top3.light, 0.12)));
    grad.addColorStop(0.5, css(top3.base));
    grad.addColorStop(1, css(dark(top3.dark, 0.35)));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = css(dark(top3.dark, 0.55));
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Ombre intérieure de la capuche sur le visage.
    ctx.save();
    facePath(ctx, g, 4);
    ctx.clip();
    ctx.strokeStyle = css(P.ombreProfonde, 0.35);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - w - 6, 90);
    ctx.bezierCurveTo(cx - w - 3, top + 2, cx + w + 3, top + 2, cx + w + 6, 90);
    ctx.stroke();
    ctx.restore();
    // Pli et liseré clair.
    ctx.strokeStyle = css(top3.light, 0.55);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - w - 9, 92);
    ctx.bezierCurveTo(cx - w - 11, top + 10, cx - 6, top - 5, cx + 4, top - 5);
    ctx.stroke();
  }
}

/** Peint le portrait complet dans un canevas carré de `size` pixels. */
export function paintPortraitHD(ctx: Ctx, spec: PortraitSpec, size: number): void {
  const rnd = seeded(spec.id);
  const look = spec.look;
  const g = geometry(spec.traits);
  const pointy = spec.traits.face === 'f' ? 2.6 : spec.traits.age === 'enfant' ? 5 : 5.5;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';

  background(ctx, spec, rnd);
  // Plan rapproché : la tête occupe l'essentiel du cadre.
  ctx.translate(50, 30);
  ctx.scale(1.2, 1.2);
  ctx.translate(-50, -34);
  backLayer(ctx, spec, g);
  if (look.accessory === 'sword') swordHilt(ctx, look, g);
  body(ctx, spec, g);

  // Oreilles.
  for (const side of [-1, 1]) {
    ctx.fillStyle = css(side < 0 ? look.skin.base : look.skin.dark);
    ctx.beginPath();
    ctx.ellipse(g.cx + side * (g.w + 0.3), g.eyeY + 2.5, 2.6, 4.6, side * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Visage : dégradé de peau, ombre portée en aplat à droite, contour.
  facePath(ctx, g, pointy);
  const skin = ctx.createRadialGradient(g.cx - 6, g.eyeY - 6, 2, g.cx, g.eyeY, 30);
  skin.addColorStop(0, css(light(look.skin.light, 0.12)));
  skin.addColorStop(0.55, css(look.skin.base));
  skin.addColorStop(1, css(look.skin.dark));
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.save();
  facePath(ctx, g, pointy);
  ctx.clip();
  ctx.fillStyle = css(dark(look.skin.dark, 0.1), 0.38);
  ctx.beginPath();
  ctx.moveTo(g.cx + g.w * 0.6, g.top);
  ctx.bezierCurveTo(g.cx + g.w * 1.05, g.eyeY - 2, g.cx + g.jaw * 0.9, g.mouthY, g.cx + 3, g.chin + 2);
  ctx.lineTo(g.cx + g.w + 4, g.chin + 4);
  ctx.lineTo(g.cx + g.w + 4, g.top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(dark(look.skin.dark, 0.2), 0.45);
  ctx.beginPath();
  ctx.ellipse(g.cx, g.eyeY - 13, g.w + 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  facePath(ctx, g, pointy);
  ctx.strokeStyle = css(dark(look.skin.dark, 0.45));
  ctx.lineWidth = 0.6;
  ctx.stroke();

  if (spec.traits.beard === 'courte') beard(ctx, spec, g, rnd);
  faceDetails(ctx, spec, g, rnd);
  eye(ctx, spec, g, -1);
  eye(ctx, spec, g, 1);
  if (spec.traits.beard === 'pleine' || spec.traits.beard === 'moustache') beard(ctx, spec, g, rnd);
  mouth(ctx, spec, g);
  frontHair(ctx, spec, g, rnd);

  // Lumière : lanterne (lueur chaude par en dessous) ou soleil de fin d'après-midi.
  if (look.accessory === 'lantern') {
    const lamp = ctx.createRadialGradient(18, 104, 2, 18, 104, 70);
    lamp.addColorStop(0, css(P.orangeForge, 0.45));
    lamp.addColorStop(0.5, css(P.lumiereChaude, 0.16));
    lamp.addColorStop(1, css(P.lumiereChaude, 0));
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, 100, 100);
  }
  const sun = ctx.createLinearGradient(0, 0, 100, 40);
  sun.addColorStop(0, css(P.lumiereDoree, 0.16));
  sun.addColorStop(0.5, css(P.lumiereDoree, 0));
  sun.addColorStop(1, css(P.ombreViolette, 0.14));
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 100, 100);
  // Vignette.
  const vignette = ctx.createRadialGradient(50, 46, 40, 50, 50, 74);
  vignette.addColorStop(0, css(P.ombreProfonde, 0));
  vignette.addColorStop(1, css(P.ombreProfonde, 0.5));
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 100, 100);
  ctx.restore();
}
