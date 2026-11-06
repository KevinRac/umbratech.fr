#!/usr/bin/env node
/**
 * Banc automatique de session (lot H de M10, décision n°279).
 *
 *   npx tsx tools/session-bench.mjs [--minutes 60] [--cycle 12] [--out rapport.json] [--shots dossier] [--seed 1] [--verbe]
 *
 * Un bot joue une session « depuis Nouvelle partie », au clavier, comme un joueur : titre, choix de la
 * classe, monde (marche jusqu'aux ennemis par le chemin A* du jeu), rencontres (préparation, déplacements,
 * attaques et menus joués par l'IA prudente du simulateur, par les touches), résultats, sauvegarde
 * manuelle par le menu et rechargement de la page (Continuer, puis comparaison de la partie rechargée
 * avec celle qui a été sauvegardée). À la fin, il lit le journal de session que le kit de test a tenu
 * (`vaelmor:journal`) et **échoue** sur toute ligne « erreur », toute sauvegarde en échec ou tout blocage
 * (`logic/testkit/sessionCheck.ts`).
 *
 * « Accéléré » : le bot n'a aucun temps de lecture ni d'hésitation et enchaîne les combats ; le temps de
 * jeu (celui que le jeu affiche dans ses sauvegardes) est compté par le jeu lui-même, image par image,
 * plafonné à 250 ms par image : le banc n'accélère PAS l'horloge, il n'en falsifie aucune. Une heure de
 * temps de jeu dure donc environ une heure d'horloge, mais contient bien plus de combats qu'une heure
 * humaine. Budget : `--minutes` de temps de jeu (la partie rechargée reprend son compteur sauvegardé).
 *
 * Le jeu est servi tel quel (`play/`). Seule différence avec une session du joueur : le serveur du banc
 * ajoute `window.vaelmor` (lecture de l'état) en réécrivant à la volée la condition `?debug` de `main.ts` ;
 * l'adresse n'a pas `?debug`, donc aucune commande de debug ni étiquette de debug n'existe dans la page,
 * et le bot n'appuie jamais sur F2 à F9.
 *
 * puppeteer-core n'est pas une dépendance du jeu : chemin par `PUPPETEER_CORE`
 * (défaut `/opt/npm-tools/node_modules/puppeteer-core`), Chrome par `CHROME` (défaut `/usr/bin/google-chrome`).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { build } from 'esbuild';
import { checkSession, mergeJournal } from '../src/logic/testkit/sessionCheck.ts';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const MINUTES = Number(value('--minutes', '60'));
const CYCLE_MS = Number(value('--cycle', '12')) * 60_000;
const OUT = value('--out', '');
const SHOTS = value('--shots', '');
const PAGE = value('--page', '/play/index.html');
let seed = Number(value('--seed', '1')) >>> 0 || 1;
const WALL_LIMIT_MS = MINUTES * 60_000 * Number(value('--mur', '1.6')) + 5 * 60_000;
const VERBOSE = flag('--verbe');

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/opt/npm-tools/node_modules/puppeteer-core');

/** Hasard reproductible du bot (jitter, choix d'une destination). */
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const T0 = Date.now();
const clock = () => `${String(Math.floor((Date.now() - T0) / 60000)).padStart(3, ' ')}:${String(Math.floor(((Date.now() - T0) % 60000) / 1000)).padStart(2, '0')}`;
const say = (msg) => console.error(`[${clock()}] ${msg}`);
const dbg = (msg) => VERBOSE && say(`  · ${msg}`);

/* ---------- Serveur : le jeu tel quel, plus la lecture de l'état ---------- */

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webm': 'audio/webm', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const DEBUG_GATE = 'new URLSearchParams(window.location.search).has(`debug`)&&Object.assign(window,{vaelmor:';
let exposed = false;

function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT) || !existsSync(path) || !statSync(path).isFile()) {
      res.writeHead(404).end();
      return;
    }
    let body = readFileSync(path);
    if (/\/play\/js\/game-[^/]*\.js$/.test(path)) {
      const text = body.toString('utf8');
      if (!text.includes(DEBUG_GATE)) throw new Error('le build de play/ ne ressemble plus à ce que le banc attend (condition ?debug de main.ts introuvable) : adapter DEBUG_GATE');
      body = Buffer.from(text.replace(DEBUG_GATE, '!0&&Object.assign(window,{vaelmor:'));
      exposed = true;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/* ---------- Navigateur ---------- */

const botBundle = (
  await build({ entryPoints: [join(ROOT, 'tools/session-bot-page.ts')], bundle: true, format: 'iife', write: false, platform: 'browser', target: 'es2022', logLevel: 'silent' })
).outputFiles[0].text;

const server = await serve();
const port = server.address().port;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required', '--window-size=960,540'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
await page.evaluateOnNewDocument(botBundle);

/** Ce que Chrome signale lui-même (en plus du journal du jeu) : exceptions de page et console.error. */
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push({ at: clock(), text: String(e).slice(0, 300) }));
page.on('console', (m) => m.type() === 'error' && !/status of 404/.test(m.text()) && pageErrors.push({ at: clock(), text: m.text().slice(0, 300) }));
const missing = [];
page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/favicon.ico') && missing.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`));

let journal = [];
const sessionStartWall = new Map();
const sessionEnds = {};
const plannedReloads = [];
const shots = [];

async function shot(name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const path = join(SHOTS, `${name}.png`);
  await page.screenshot({ path });
  shots.push(path);
}

/* ---------- Lecture de l'état ---------- */

const scenes = () => page.evaluate(() => window.vaelmor.scene.getScenes(true).map((s) => s.scene.key).filter((k) => k !== 'Debug'));
const frame = () => page.evaluate(() => window.vaelmor.loop.frame);
const textsOf = (key) =>
  page.evaluate((k) => {
    const sc = window.vaelmor.scene.getScene(k);
    if (!sc?.children) return [];
    return sc.children.list.filter((o) => o.visible !== false && typeof o.text === 'string' && o.text.trim()).map((o) => o.text.replace(/\s+/g, ' ').trim());
  }, key);

/** Les menus verticaux (VerticalMenu) vivants d'une scène : trouvés par leurs champs, sans rien supposer des noms. */
const menusOf = (key) =>
  page.evaluate((k) => {
    const sc = window.vaelmor.scene.getScene(k);
    if (!sc) return [];
    const out = [];
    for (const name of Object.keys(sc)) {
      const v = sc[name];
      if (!v || typeof v !== 'object' || !Array.isArray(v.labels) || !Array.isArray(v.items) || typeof v.selected !== 'number') continue;
      const first = v.labels[0];
      if (!first || first.active === false || first.visible === false) continue;
      out.push({ name, labels: v.labels.map((l) => String(l.text ?? '').replace(/\s+/g, ' ').trim()), enabled: v.items.map((_, i) => (typeof v.isEnabled === 'function' ? Boolean(v.isEnabled(i)) : true)), selected: v.selected });
    }
    return out;
  }, key);

const readWorld = () =>
  page.evaluate(() => {
    const w = window.vaelmor.scene.getScene('World');
    if (!w || !w.body_ || !w.map || !w.state) return null;
    const T = w.map.tileSize;
    const foes = [...w.foeActors.values()].map((a) => ({ id: a.sim.def.id, kind: a.sim.def.kind, x: a.sim.x, y: a.sim.y, mode: a.sim.mode, level: a.sim.level, weak: a.sim.weak, shown: a.sprite.visible }));
    return {
      x: w.body_.x,
      y: w.body_.y,
      T,
      modal: Boolean(w.modal),
      leaving: Boolean(w.leaving),
      paused: Boolean(w.paused),
      playMs: w.state.playMs,
      width: w.map.width,
      height: w.map.height,
      nearNpc: w.nearNpc ? (w.nearNpc.npc?.id ?? w.nearNpc.id ?? 'pnj') : null,
      foes,
    };
  });

/** Chemin A* du jeu entre deux cases (tuiles) ; null s'il n'y en a pas. */
const planPath = (from, to) =>
  page.evaluate(
    ({ from, to }) => {
      const w = window.vaelmor.scene.getScene('World');
      const p = window.__bot.findPath(w.grid, from, to);
      return p ? p.map((c) => [c.x, c.y]) : null;
    },
    { from, to },
  );

/** Une case marchable au hasard (le bot « se promène » quand il n'a plus d'ennemi à poursuivre). */
const randomWalkable = (near, minD, maxD) =>
  page.evaluate(
    ({ near, minD, maxD, r }) => {
      const w = window.vaelmor.scene.getScene('World');
      const g = w.grid;
      for (let i = 0; i < 400; i++) {
        const a = (r + i * 0.618) * Math.PI * 2;
        const d = minD + ((i * 7919) % 1000) / 1000 * (maxD - minD);
        const x = Math.round(near.x + Math.cos(a) * d);
        const y = Math.round(near.y + Math.sin(a) * d);
        if (x < 1 || y < 1 || x >= g.width - 1 || y >= g.height - 1) continue;
        if (!g.isSolidCell(x, y)) return { x, y };
      }
      return null;
    },
    { near, minD, maxD, r: rand() },
  );

const hudInfo = async () => {
  const t = await textsOf('WorldHud');
  const lvl = t.map((s) => /niv\.\s*(\d+)/.exec(s)).find(Boolean);
  const orAt = t.indexOf('or');
  return { level: lvl ? Number(lvl[1]) : 1, gold: orAt > 0 ? Number(t[orAt - 1]) : null, place: t.find((s) => /^[A-ZÉ][\p{L}'’ -]+$/u.test(s) && !['Voyageur', 'Neutre'].includes(s)) ?? null };
};

const readBattle = () =>
  page.evaluate(() => {
    const b = window.vaelmor.scene.getScene('Battle');
    if (!b || !b.state) return null;
    const hud = window.vaelmor.scene.getScene('BattleHud');
    return {
      mode: b.mode,
      cursor: { x: b.cursorCell.x, y: b.cursorCell.y },
      selected: b.selected ? { id: b.selected.id, x: b.selected.x, y: b.selected.y } : null,
      turn: b.state.turn,
      phase: b.state.phase,
      outcome: b.state.outcome,
      units: b.state.units.map((u) => ({ id: u.id, team: u.team, x: u.x, y: u.y, acted: u.acted, hp: u.hp, name: u.name })),
      targeting: b.targeting ? { kind: b.targeting.kind, free: Boolean(b.targeting.free), cells: b.targeting.cells.map((c) => ({ x: c.x, y: c.y })), index: b.targetIndex } : null,
      prepFocus: hud?.prepFocus ?? null,
      enemyName: b.state.name,
    };
  });

const planBattle = () =>
  page.evaluate(() => {
    const b = window.vaelmor.scene.getScene('Battle');
    const plan = window.__bot.nextPrudentPlan(b.state, b.rules);
    if (!plan) return null;
    const cellOf = (id) => {
      const u = id ? b.state.units.find((x) => x.id === id) : null;
      return u ? { x: u.x, y: u.y } : null;
    };
    const unit = b.state.units.find((u) => u.id === plan.unitId);
    return {
      unitId: plan.unitId,
      from: unit ? { x: unit.x, y: unit.y } : null,
      to: { x: plan.to.x, y: plan.to.y },
      attack: cellOf(plan.targetId),
      heal: cellOf(plan.healId),
      talk: cellOf(plan.talkId),
      skill: plan.skill ? { id: plan.skill.id, cell: { x: plan.skill.cell.x, y: plan.skill.cell.y } } : null,
      item: plan.item ? { id: plan.item.id, cell: cellOf(plan.item.targetId) } : null,
    };
  });

/* ---------- Touches ---------- */

async function press(key, hold = 70) {
  await page.keyboard.down(key);
  await sleep(hold);
  await page.keyboard.up(key);
}
const held = new Set();
async function setHeld(wanted) {
  for (const k of [...held]) {
    if (!wanted.has(k)) {
      await page.keyboard.up(k);
      held.delete(k);
    }
  }
  for (const k of wanted) {
    if (!held.has(k)) {
      await page.keyboard.down(k);
      held.add(k);
    }
  }
}
const releaseAll = () => setHeld(new Set());

/** Choisit une ligne d'un menu vertical par son libellé : navigue (les lignes grisées sont sautées) puis valide. */
async function chooseMenu(sceneKey, label, { exact = false, confirm = true } = {}) {
  for (let i = 0; i < 16; i++) {
    const menus = await menusOf(sceneKey);
    const menu = menus.find((m) => m.labels.some((l) => (exact ? l === label : l.startsWith(label))));
    if (!menu) return false;
    const idx = menu.labels.findIndex((l) => (exact ? l === label : l.startsWith(label)));
    if (!menu.enabled[idx]) return false;
    if (menu.selected === idx) {
      if (confirm) await press('Enter');
      return true;
    }
    const n = menu.labels.length;
    const down = (idx - menu.selected + n) % n;
    await press(down <= n - down ? 'ArrowDown' : 'ArrowUp');
    await sleep(110);
  }
  return false;
}

/* ---------- Journal ---------- */

async function harvest() {
  const raw = await page.evaluate(() => localStorage.getItem('vaelmor:journal')).catch(() => null);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    journal = mergeJournal(journal, parsed.entries ?? []);
    const s = Math.max(0, ...(parsed.entries ?? []).map((e) => e.s));
    if (s > 0 && !sessionStartWall.has(s)) sessionStartWall.set(s, Date.now() - 1500);
    if (s > 0) sessionEnds[s] = Date.now() - (sessionStartWall.get(s) ?? Date.now());
  } catch {
    /* journal illisible : le verdict le dira par l'absence de lignes */
  }
}

/* ---------- Démarrage et chargement ---------- */

async function openGame() {
  await page.goto(`http://127.0.0.1:${port}${PAGE}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.vaelmor), { timeout: 60000 });
  sessionStartWall.set(-1, Date.now());
  for (let i = 0; i < 120; i++) {
    if ((await scenes()).includes('Title')) break;
    await sleep(500);
  }
  if (!(await scenes()).includes('Title')) throw new Error('le titre ne s’affiche jamais');
  await sleep(800);
}

async function waitFor(pred, ms, label) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await pred()) return true;
    await sleep(250);
  }
  throw new Error(`délai dépassé : ${label}`);
}

async function newGame() {
  await chooseMenu('Title', 'Nouvelle partie');
  await waitFor(async () => (await scenes()).includes('ClassSelect'), 15000, 'choix de la classe');
  await sleep(700);
  await shot('01-classe');
  await press('Enter');
  for (let i = 0; i < 25 && !(await scenes()).includes('World'); i++) {
    await sleep(900);
    if (!(await scenes()).includes('World')) await press('Enter');
  }
  await waitFor(async () => (await readWorld()) !== null && (await scenes()).includes('WorldHud'), 40000, 'le monde');
  await sleep(2500);
  await shot('02-monde-haut-gue');
}

async function continueGame() {
  await chooseMenu('Title', 'Continuer');
  await waitFor(async () => (await readWorld()) !== null && (await scenes()).includes('WorldHud'), 40000, 'le monde rechargé');
  await sleep(2500);
}

/* ---------- Monde ---------- */

const world = { target: null, route: [], routeAt: 0, lastPos: null, lastMoveAt: Date.now(), stuck: 0, blacklist: new Map(), talked: new Set(), wander: null, kills: 0 };

function keysToward(dx, dy) {
  const k = new Set();
  const dead = 3;
  if (dx > dead) k.add('ArrowRight');
  if (dx < -dead) k.add('ArrowLeft');
  if (dy > dead) k.add('ArrowDown');
  if (dy < -dead) k.add('ArrowUp');
  return k;
}

async function chooseFoe(w, heroLevel) {
  const now = Date.now();
  const hero = { x: w.x, y: w.y };
  const candidates = w.foes
    .filter((f) => f.shown !== false && !f.weak && f.mode !== 'flee' && !(world.blacklist.get(f.id) > now))
    .filter((f) => f.level <= heroLevel + 3 && (f.kind !== 'boss' || f.level <= heroLevel))
    .map((f) => ({ f, d: Math.hypot(f.x - hero.x, f.y - hero.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);
  let best = null;
  const from = { x: Math.floor(w.x / w.T), y: Math.floor((w.y - 1) / w.T) };
  for (const { f } of candidates) {
    const p = await planPath(from, { x: Math.floor(f.x / w.T), y: Math.floor((f.y - 1) / w.T) });
    if (p && (!best || p.length < best.len)) best = { id: f.id, len: p.length };
  }
  return best?.id ?? null;
}

async function worldStep(state) {
  const w = await readWorld();
  if (!w) return;
  const sc = state.scenes;
  if (w.leaving) {
    await releaseAll();
    return;
  }
  // Fenêtre ouverte (dialogue, boutique, menu) : on la traverse par Entrée ; si elle s'éternise, Échap.
  if (w.modal || sc.some((k) => ['Dialogue', 'Menu', 'Saves', 'Options', 'IslandMap', 'KeyBind'].includes(k))) {
    await releaseAll();
    state.modalSince ??= Date.now();
    const long = Date.now() - state.modalSince;
    await press(long > 25000 || sc.includes('Menu') || sc.includes('Saves') ? 'Escape' : 'Enter');
    await sleep(500);
    return;
  }
  state.modalSince = null;

  // Un PNJ à portée : on lui parle une fois (dialogue, boutique…) pour exercer ces écrans.
  if (w.nearNpc && !world.talked.has(w.nearNpc) && stats.worldSteps % 5 === 0) {
    world.talked.add(w.nearNpc);
    await releaseAll();
    await press('KeyE');
    stats.dialogues += 1;
    dbg(`parole à ${w.nearNpc}`);
    await sleep(700);
    return;
  }

  const hud = state.hud;
  const hero = { x: w.x, y: w.y };
  if (world.lastPos && Math.hypot(hero.x - world.lastPos.x, hero.y - world.lastPos.y) > 6) {
    world.lastMoveAt = Date.now();
    world.lastPos = hero;
    world.stuck = 0;
    state.progressAt = Date.now();
  } else if (!world.lastPos) world.lastPos = hero;

  // Cible : l'ennemi le plus proche (par le chemin) qu'on peut raisonnablement affronter, sinon une balade.
  const foe = world.target ? w.foes.find((f) => f.id === world.target) : null;
  if (!foe || foe.shown === false) {
    world.target = await chooseFoe(w, hud.level);
    world.route = [];
    if (!world.target && !world.wander) {
      const from = { x: Math.floor(w.x / w.T), y: Math.floor((w.y - 1) / w.T) };
      world.wander = await randomWalkable(from, 18, 70);
      world.route = [];
      stats.wanders += 1;
      dbg(`balade vers ${JSON.stringify(world.wander)}`);
    }
  }
  const goal = world.target ? (() => { const f = w.foes.find((x) => x.id === world.target); return f ? { x: Math.floor(f.x / w.T), y: Math.floor((f.y - 1) / w.T) } : null; })() : world.wander;
  if (!goal) {
    await releaseAll();
    return;
  }
  if (!world.route.length || Date.now() - world.routeAt > (world.target ? 900 : 4000)) {
    const from = { x: Math.floor(w.x / w.T), y: Math.floor((w.y - 1) / w.T) };
    const p = await planPath(from, goal);
    world.routeAt = Date.now();
    if (!p || p.length < 2) {
      if (world.target) world.blacklist.set(world.target, Date.now() + 90_000);
      world.target = null;
      world.wander = null;
      world.route = [];
      return;
    }
    world.route = p.slice(1);
  }
  while (world.route.length > 1) {
    const [cx, cy] = world.route[0];
    if (Math.hypot((cx + 0.5) * w.T - hero.x, (cy + 1) * w.T - 4 - hero.y) < w.T * 0.7) world.route.shift();
    else break;
  }
  const next = world.route[0];
  if (!next) {
    world.wander = null;
    return;
  }
  const nx = (next[0] + 0.5) * w.T;
  const ny = (next[1] + 1) * w.T - 4;
  const dx = nx - hero.x;
  const dy = ny - hero.y;
  if (!world.target && Math.hypot(dx, dy) < w.T * 0.8 && world.route.length <= 1) {
    world.wander = null;
    world.route = [];
  }
  const wanted = keysToward(dx, dy);
  if (Math.hypot(goal.x * w.T - hero.x, goal.y * w.T - hero.y) > 60) wanted.add('ShiftLeft');
  // Bloqué : le héros ne bouge plus depuis 2,5 s alors qu'une touche est tenue.
  if (Date.now() - world.lastMoveAt > 2500) {
    world.stuck += 1;
    world.lastMoveAt = Date.now();
    world.route = [];
    if (world.stuck >= 3 && world.target) {
      world.blacklist.set(world.target, Date.now() + 90_000);
      world.target = null;
    }
    if (world.stuck >= 2) {
      const jitter = new Set([['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'][Math.floor(rand() * 4)]]);
      await setHeld(jitter);
      await sleep(700);
      stats.unstuck += 1;
    }
  }
  await setHeld(wanted);
  stats.worldSteps += 1;
}

/* ---------- Combat ---------- */

const battle = { pending: null, sig: '', sigAt: Date.now(), count: 0, endTurnAt: 0 };

async function moveCursorTo(cur, cell) {
  const dx = cell.x - cur.x;
  const dy = cell.y - cur.y;
  if (dx === 0 && dy === 0) return false;
  await press(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp');
  await sleep(90);
  return true;
}

async function battleStep(state) {
  const b = await readBattle();
  if (!b) return;
  const sig = JSON.stringify([b.mode, b.turn, b.phase, b.units.map((u) => [u.x, u.y, u.hp, u.acted])]);
  if (sig !== battle.sig) {
    battle.sig = sig;
    battle.sigAt = Date.now();
    state.progressAt = Date.now();
  }
  const still = Date.now() - battle.sigAt;
  if (!battle.active) {
    battle.active = true;
    stats.battles += 1;
    battle.turns = 0;
    say(`combat ${stats.battles} : ${b.enemyName}`);
    if (stats.battles === 1) await shot('03-preparation');
  }
  battle.lastTurn = b.turn;
  switch (b.mode) {
    case 'prep': {
      if (b.prepFocus === 'roster') {
        await press('ArrowRight');
        await sleep(300);
      }
      if (!(await chooseMenu('BattleHud', 'Combattre'))) await press('Enter');
      await sleep(600);
      return;
    }
    case 'place':
      await press('Escape');
      return;
    case 'browse': {
      if (!battle.shotBrowse && stats.battles === 1 && b.turn >= 1) {
        battle.shotBrowse = true;
        await shot('04-combat-carte');
      }
      const plan = await planBattle();
      if (!plan || (battle.pending && b.selected === null && battle.pending.unitId === plan.unitId && still > 30000)) {
        // Plus personne ne peut agir (ou l'IA tourne en rond) : fin du tour par le menu.
        battle.pending = null;
        await press('Tab');
        await sleep(400);
        await chooseMenu('BattleHud', 'Fin du tour');
        await sleep(500);
        return;
      }
      battle.pending = plan;
      if (await moveCursorTo(b.cursor, plan.from)) return;
      await press('Enter');
      await sleep(250);
      return;
    }
    case 'move': {
      const plan = battle.pending;
      if (!plan || !b.selected || b.selected.id !== plan.unitId) {
        await press('Escape');
        battle.pending = null;
        return;
      }
      if (await moveCursorTo(b.cursor, plan.to)) return;
      await press('Enter');
      await sleep(250);
      return;
    }
    case 'menu': {
      const menus = await menusOf('BattleHud');
      const m = menus.find((x) => x.labels.length > 0);
      if (!m) {
        await press('Escape');
        return;
      }
      const plan = battle.pending;
      const has = (l) => m.labels.some((x) => x.startsWith(l));
      if (has('Fin du tour')) {
        // Menu de la carte ouvert sans l'avoir voulu : on le ferme (la fin de tour est demandée plus haut).
        if (!plan) await chooseMenu('BattleHud', 'Fin du tour');
        else await press('Escape');
        return;
      }
      if (!has('Attaquer') && !has('Attendre')) {
        // Sous-menu d'objets, ou autre : la première ligne utilisable, sinon Échap.
        const i = m.labels.findIndex((l, k) => m.enabled[k] && l !== 'Retour');
        if (i >= 0 && plan?.item) await chooseMenu('BattleHud', m.labels[i], { exact: true });
        else await press('Escape');
        return;
      }
      const std = ['Attaquer', 'Parler', 'Objet', 'Soigner', 'Attendre'];
      let wanted = 'Attendre';
      if (plan?.attack && has('Attaquer')) wanted = 'Attaquer';
      else if (plan?.heal && has('Soigner')) wanted = 'Soigner';
      else if (plan?.talk && has('Parler')) wanted = 'Parler';
      else if (plan?.skill) wanted = m.labels.find((l, k) => !std.some((s) => l.startsWith(s)) && m.enabled[k]) ?? 'Attendre';
      else if (plan?.item && has('Objet')) wanted = 'Objet';
      if (!(await chooseMenu('BattleHud', wanted, { exact: false }))) await chooseMenu('BattleHud', 'Attendre');
      await sleep(250);
      return;
    }
    case 'target': {
      const plan = battle.pending;
      const t = b.targeting;
      if (!plan || !t) {
        await press('Escape');
        return;
      }
      const want = t.kind === 'attack' ? plan.attack : t.kind === 'heal' ? plan.heal : t.kind === 'talk' ? plan.talk : t.kind === 'skill' ? plan.skill?.cell : plan.item?.cell;
      if (!want) {
        await press('Escape');
        return;
      }
      if (t.free) {
        if (await moveCursorTo(b.cursor, want)) return;
        await press('Enter');
        return;
      }
      const at = t.cells[t.index];
      if (at && at.x === want.x && at.y === want.y) {
        await press('Enter');
        battle.pending = null;
        await sleep(300);
        return;
      }
      if (battle.cycled > t.cells.length + 1) {
        await press('Escape');
        battle.cycled = 0;
        return;
      }
      battle.cycled = (battle.cycled ?? 0) + 1;
      await press('ArrowRight');
      await sleep(120);
      return;
    }
    case 'end': {
      if (!battle.shotEnd) {
        battle.shotEnd = true;
        await shot(`05-resultat-${stats.battles}`);
      }
      await press('Enter');
      await sleep(900);
      return;
    }
    default: {
      // Animations, phase ennemie, dialogues de combat : on attend ; une réplique qui n'avance pas est passée par Entrée.
      if (still > 9000 && Date.now() - battle.lastEnter > 2500) {
        battle.lastEnter = Date.now();
        await press('Enter');
      }
      await sleep(250);
    }
  }
}
battle.lastEnter = 0;

/* ---------- Sauvegarde et rechargement ---------- */

async function saveAndReload(state) {
  const t = Date.now();
  await releaseAll();
  await sleep(700);
  const before = { ...(await hudInfo()), ...(await readWorld()) };
  // Menu (Tab) → onglet Sauvegarde → emplacement 1 → « Sauvegarder ici ».
  await press('Tab');
  await waitFor(async () => (await scenes()).includes('Menu'), 8000, 'le menu');
  for (let i = 0; i < 10; i++) {
    const tab = await page.evaluate(() => window.vaelmor.scene.getScene('Menu').tab);
    if (tab === 'sauvegarde') break;
    await press('ArrowRight');
    await sleep(500);
  }
  await press('Enter');
  await waitFor(async () => (await scenes()).includes('Saves'), 8000, 'l’écran des emplacements');
  await sleep(600);
  await shot('06-sauvegarde');
  await press('Enter');
  await sleep(900);
  // Le journal est circulaire (600 lignes) : le nombre de lignes de sauvegarde peut ne pas monter alors qu'une nouvelle est écrite.
  // La preuve est donc la date d'écriture de l'emplacement 1 dans le stockage du navigateur.
  const slotStamp = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('vaelmor:save:slot1') ?? 'null')?.savedAt ?? null; } catch { return 'illisible'; } });
  const known = await slotStamp();
  const manualSaves = async () => ((await slotStamp()) !== known ? 1 : 0);
  if ((await menusOf('Saves')).length > 0) {
    await chooseMenu('Saves', 'Sauvegarder ici');
    await sleep(900);
  }
  // Emplacement déjà plein : deux confirmations d'écrasement (n°163), chacune validée par Entrée.
  for (let i = 0; i < 4; i++) {
    if (await manualSaves()) break;
    if (stats.manualSaves === 1) await shot(`06b-confirm-${i}`);
    // Seconde confirmation : la réponse par défaut est « Non », le joueur descend sur « Oui, écraser ».
    if ((await textsOf('Saves')).some((t) => t === 'Oui, écraser')) {
      await press('ArrowDown');
      await sleep(200);
    }
    await press('Enter');
    await sleep(800);
  }
  await harvest();
  const saved = (await manualSaves()) ? { m: `emplacement 1 écrit (${await slotStamp()})`, d: { ok: true } } : null;
  stats.manualSaves += 1;
  if (!saved || saved.d?.ok !== true) {
    say('sauvegarde manuelle NON écrite');
    failures.push({ kind: 'sauvegarde', message: 'la sauvegarde manuelle n’a pas été écrite (aucune ligne de journal neuve)' });
  } else say(`sauvegarde manuelle : ${saved.m}`);
  for (let i = 0; i < 4; i++) {
    await press('Escape');
    await sleep(500);
  }
  await sleep(6500);
  const slots = () => page.evaluate(() => ['auto', 'slot1'].map((k) => { try { const e = JSON.parse(localStorage.getItem('vaelmor:save:' + k) ?? 'null'); return e ? [k, e.savedAt, e.meta?.playMs, e.meta?.heroLevel] : [k, null]; } catch { return [k, 'illisible']; } }));
  say(`emplacements avant rechargement : ${JSON.stringify(await slots())}`);
  await harvest();
  plannedReloads.push(Math.max(0, ...journal.map((e) => e.s)));
  // Rechargement de la page, puis Continuer : la partie rechargée doit être celle qu'on vient de sauvegarder.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.vaelmor), { timeout: 60000 });
  await waitFor(async () => (await scenes()).includes('Title'), 60000, 'le titre après rechargement');
  await sleep(1200);
  await shot('07-titre-continuer');
  await continueGame();
  const after = { ...(await hudInfo()), ...(await readWorld()) };
  const same = after.level === before.level && after.gold === before.gold && Math.hypot(after.x - before.x, after.y - before.y) < 24;
  const check = { at: clock(), avant: pick(before), apres: pick(after), identique: same };
  stats.reloads.push(check);
  say(`rechargement : ${same ? "partie identique" : "PARTIE DIFFÉRENTE"} avant ${JSON.stringify(check.avant)} après ${JSON.stringify(check.apres)}`);
  if (!same) failures.push({ kind: 'rechargement', message: `la partie rechargée diffère de la partie sauvegardée : ${JSON.stringify(check.avant)} → ${JSON.stringify(check.apres)}` });
  world.target = null;
  world.route = [];
  world.wander = null;
  state.progressAt = Date.now();
  state.lastCycleAt = after.playMs ?? 0;
  await sleep(1000);
  void t;
}
const pick = (o) => ({ niveau: o.level, or: o.gold, x: Math.round(o.x), y: Math.round(o.y), tempsDeJeuMs: Math.round(o.playMs ?? 0) });

/* ---------- Boucle principale ---------- */

const stats = { battles: 0, worldSteps: 0, wanders: 0, unstuck: 0, dialogues: 0, manualSaves: 0, reloads: [], recoveries: 0, victoriesSeen: 0 };
const failures = [];

async function main() {
  say(`banc de session : ${MINUTES} min de temps de jeu, cycle de sauvegarde ${CYCLE_MS / 60000} min`);
  await openGame();
  if (!exposed) throw new Error('window.vaelmor n’est pas exposé : le banc ne peut pas lire l’état');
  await newGame();
  const state = { scenes: [], hud: { level: 1, gold: 0 }, progressAt: Date.now(), modalSince: null, lastCycleAt: 0, frameAt: Date.now(), lastFrame: await frame(), lastHarvest: Date.now(), lastShot: Date.now() };
  let playMs = 0;
  let endReason = 'budget';
  while (true) {
    const wall = Date.now() - T0;
    if (wall > WALL_LIMIT_MS) {
      endReason = 'limite d’horloge atteinte avant le budget de temps de jeu';
      break;
    }
    const sc = await scenes();
    state.scenes = sc;
    // Vivacité : le jeu doit produire des images.
    const f = await frame();
    if (f !== state.lastFrame) {
      state.lastFrame = f;
      state.frameAt = Date.now();
    } else if (Date.now() - state.frameAt > 20000) {
      failures.push({ kind: 'blocage', message: `aucune image dessinée pendant 20 s (scènes : ${sc.join(', ')})` });
      endReason = 'blocage : le jeu ne dessine plus';
      break;
    }
    if (sc.includes('Ending')) {
      endReason = 'fin du jeu atteinte';
      break;
    }
    const inBattle = sc.includes('Battle');
    if (!inBattle && battle.active) {
      battle.active = false;
      battle.shotEnd = false;
      battle.pending = null;
      battle.cycled = 0;
      const last = journal.filter((e) => e.k === 'combat' && e.d?.ev === 'fin').pop();
      say(`combat terminé (tours ${battle.lastTurn ?? '?'})`);
      void last;
      world.target = null;
      world.route = [];
      world.lastPos = null;
      await sleep(500);
    }
    if (sc.includes('World')) {
      const w = await readWorld();
      if (w) playMs = w.playMs;
    }
    if (playMs >= MINUTES * 60_000) break;
    state.hud = sc.includes('WorldHud') ? await hudInfo() : state.hud;
    if (inBattle) await battleStep(state);
    else if (sc.includes('World')) {
      if (playMs - state.lastCycleAt >= CYCLE_MS && !(await readWorld())?.modal && !sc.includes('Dialogue')) await saveAndReload(state);
      else await worldStep(state);
    } else if (sc.includes('ClassSelect') || sc.includes('Title')) {
      // Retour au titre inattendu : on reprend la dernière sauvegarde.
      say(`retour inattendu à l’écran ${sc.join('+')} : Continuer`);
      stats.recoveries += 1;
      await continueGame();
    } else await sleep(400);

    // Rien n'avance depuis trop longtemps : relances, puis blocage.
    const idle = Date.now() - state.progressAt;
    if (idle > 150_000 && idle < 151_500) {
      stats.recoveries += 1;
      say(`aucun progrès depuis ${Math.round(idle / 1000)} s (scènes ${sc.join('+')}) : Échap ×3`);
      await releaseAll();
      for (let i = 0; i < 3; i++) await press('Escape');
    }
    if (idle > 360_000) {
      failures.push({ kind: 'blocage', message: `aucun progrès depuis ${Math.round(idle / 1000)} s malgré les relances (scènes : ${sc.join(', ')})` });
      await shot('99-blocage');
      endReason = 'blocage : plus aucun progrès';
      break;
    }
    if (Date.now() - state.lastHarvest > 20000) {
      state.lastHarvest = Date.now();
      await harvest();
    }
    if (Date.now() - state.lastShot > 10 * 60_000) {
      state.lastShot = Date.now();
      await shot(`10-${clock().replace(':', 'h').trim()}`);
    }
    if (VERBOSE && stats.worldSteps % 40 === 0) dbg(`temps de jeu ${Math.round(playMs / 1000)} s · combats ${stats.battles} · scènes ${sc.join('+')}`);
  }
  await releaseAll();
  await shot('08-fin');
  await sleep(6500);
  await harvest();
  return { endReason, playMs };
}

let outcome;
try {
  outcome = await main();
} catch (e) {
  failures.push({ kind: 'banc', message: `le banc s’est arrêté sur une exception : ${e instanceof Error ? e.stack ?? e.message : String(e)}` });
  outcome = { endReason: 'exception du banc', playMs: 0 };
  try {
    await shot('99-exception');
    await harvest();
  } catch {
    /* page perdue */
  }
}

const verdict = checkSession(journal, { sessionEnds, plannedReloads });
const bench = failures.filter((f) => f.kind !== 'rechargement');
const reloadFailures = failures.filter((f) => f.kind === 'rechargement');
const report = {
  date: new Date().toISOString(),
  page: PAGE,
  budgetMinutes: MINUTES,
  finBanc: outcome.endReason,
  tempsDeJeuMs: Math.round(outcome.playMs),
  horlogeMs: Date.now() - T0,
  ok: verdict.ok && failures.length === 0 && outcome.endReason === 'budget',
  bot: stats,
  echecsDuBanc: failures,
  verdict,
  erreursChrome: pageErrors.slice(0, 20),
  introuvables: [...new Set(missing)].slice(0, 20),
  captures: shots,
  journalLignes: journal.length,
};
void bench;
void reloadFailures;
console.log(JSON.stringify(report, null, 2));
if (OUT) {
  writeFileSync(OUT, JSON.stringify({ ...report, journal }, null, 2));
}
await browser.close();
server.close();
process.exit(report.ok ? 0 : 1);
