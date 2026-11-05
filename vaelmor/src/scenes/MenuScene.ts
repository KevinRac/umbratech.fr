/**
 * Menu du joueur (jalon M2, GDD §13) : la compagnie (jalon M6 : fiche
 * personnage, passives, évolutions), fiche simple de l'inventaire, jauges de
 * réputation (villages et factions, effets concrets) et journal des quêtes.
 * Tab ou M l'ouvre depuis le monde, J ouvre directement le journal.
 * Onglet Sauvegarde (jalon M9, n°161) : les emplacements, qui s'ouvrent dans
 * l'écran `SaveScene`.
 */
import { playSfx } from '../audio/sfx';
import Phaser from 'phaser';
import { flashCamera } from '../render/cameraFx';
import { getGameCtx } from '../core/townContext';
import { uiScaleFor } from '../core/viewport';
import { ActionInput, keyLabel } from '../core/input';
import type { QuestDef } from '../data/townSchemas';
import { itemKindLabel, questStatus, questSteps, tierIdOf, type GameCtx } from '../logic/game';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { reputationName } from '../ui/notices';
import { ScrollList, type ListRow } from '../ui/ScrollList';
import { addText } from '../ui/text';
import { STAT_KEYS } from '../data/schemas';
import { evolutionChoices, evolveMember, evolvedGrowths, findEvolution } from '../logic/progression/evolutions';
import { equippedPassive, learnedPassives } from '../logic/progression/traits';
import { memberSprite, skinVariant } from '../logic/skinFrames';
import type { GrowthKey } from '../logic/tactics/types';
import { isWounded, type Member } from '../logic/units/company';
import { portraitInBox } from '../render/portraits';
import { STAT_SHORT } from '../ui/labels';
import { SCENES } from './keys';
import { loadTyping, onSettingsChange } from '../core/settings';
import { TalkBox } from '../ui/TalkBox';
import { buildTalkView, sceneTitle, type FaceLookup } from '../ui/talkView';
import type { SceneDef } from '../data/talkSchemas';
import { isLoadable, listSlots, SLOT_LABEL } from '../core/saves';
import { GAME_SAVE_KEYS } from '../logic/save/keys';
import type { SaveEnvelope } from '../logic/save/schema';
import { formatSavedAt } from './SaveScene';
import { OptionsPanel } from '../ui/OptionsPanel';
import { IslandMapView, type IslandMapViewOptions } from '../ui/islandMapView';

export type MenuTab = 'compagnie' | 'inventaire' | 'reputation' | 'quetes' | 'carte' | 'sauvegarde' | 'options';
const TABS: readonly { id: MenuTab; label: string }[] = [
  { id: 'compagnie', label: 'Compagnie' },
  { id: 'inventaire', label: 'Inventaire' },
  { id: 'reputation', label: 'Réputation' },
  { id: 'quetes', label: 'Quêtes' },
  { id: 'carte', label: 'Carte' },
  { id: 'sauvegarde', label: 'Sauvegarde' },
  { id: 'options', label: 'Options' },
];

export interface MenuSceneData {
  readonly tab?: MenuTab;
  readonly onClose: () => void;
  /** Sauvegarde depuis le menu (n°161) : lieu du héros, empêchement éventuel, chargement d'une partie. */
  readonly saves?: { readonly place: string; readonly blocked: string | null; readonly onLoad: (save: SaveEnvelope) => void };
  /** Onglet Carte (n°233) : la carte du monde et ce qu'il faut pour ses repères. */
  readonly island?: Omit<IslandMapViewOptions, 'x' | 'y' | 'cell' | 'depth' | 'labels' | 'scale'>;
}

const DEPTH = 500;
const STATUS_LABEL = { available: '', active: 'En cours', ready: 'À rendre', done: 'Terminée' } as const;

export class MenuScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private actions!: ActionInput;
  private data_!: MenuSceneData;
  private S = 1;
  private tab: MenuTab = 'inventaire';
  private frame: Phaser.GameObjects.GameObject[] = [];
  private content: Phaser.GameObjects.GameObject[] = [];
  private tabTexts: ReturnType<typeof addText>[] = [];
  private list: ScrollList | null = null;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private options: OptionsPanel | null = null;
  private island: IslandMapView | null = null;
  private closing = false;
  /** L'écran des emplacements est ouvert par-dessus : le menu attend. */
  private covered = false;

  constructor() {
    super({ key: SCENES.menu, active: false });
  }

  create(data: MenuSceneData): void {
    this.talkBox = null;
    const ctx = getGameCtx();
    if (!ctx) {
      data.onClose();
      this.scene.stop();
      return;
    }
    this.ctx = ctx;
    this.data_ = data;
    this.closing = false;
    this.covered = false;
    this.tab = data.tab ?? 'compagnie';
    this.frame = [];
    this.content = [];
    this.tabTexts = [];
    this.list = null;
    this.actions = new ActionInput(this);
    this.S = uiScaleFor(this.scale.height);
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    // Taille du texte changée dans l'onglet Options : il se reconstruit sur la même ligne.
    const offSettings = onSettingsChange((key) => {
      if (key !== 'textSize' || this.tab !== 'options') return;
      this.optionsSelected = this.options?.selectedId ?? null;
      this.build();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offSettings();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  private onResize(): void {
    this.S = uiScaleFor(this.scale.height);
    this.build();
  }

  override update(_time: number, delta: number): void {
    if (this.closing || this.covered || this.game.loop.frame < this.listenFrom) return;
    // Journal des rencontres : une scène relue occupe toutes les touches (Échap la passe).
    if (this.talkBox) {
      this.talkBox.update(delta);
      return;
    }
    if (this.actions.consume('cancel') || this.actions.consume('menu')) {
      this.close();
      return;
    }
    if (this.actions.justPressed('left') || this.actions.justPressed('right')) playSfx('cursor');
    if (this.actions.justPressed('left')) this.setTab(TABS[(this.tabIndex() + TABS.length - 1) % TABS.length]?.id ?? this.tab);
    if (this.actions.justPressed('right')) this.setTab(TABS[(this.tabIndex() + 1) % TABS.length]?.id ?? this.tab);
    this.list?.update();
    this.options?.update();
  }

  private tabIndex(): number {
    return TABS.findIndex((t) => t.id === this.tab);
  }

  private close(): void {
    this.closing = true;
    this.scene.stop();
    this.data_.onClose();
  }

  /* ---------- Cadre ---------- */

  private build(): void {
    for (const p of this.frame) p.destroy();
    this.frame = [];
    const S = this.S;
    const { width: W, height: H } = this.scale;
    const w = Math.min(W - 40 * S, 780 * S);
    const h = Math.min(H - 40 * S, 450 * S);
    const x = Math.round((W - w) / 2);
    const y = Math.round((H - h) / 2);
    this.box = { x, y, w, h };
    const dim = this.add.rectangle(0, 0, W, H, PALETTE.nuit, 0.7).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    const panel = drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH + 1, fillAlpha: 0.97 });
    const gold = addText(this, x + w - 18 * S, y + h - 22 * S, `Or : ${this.ctx.progress.gold}`, { scale: S, color: PALETTE.jauneBle, align: 'right' }).setDepth(DEPTH + 2);
    const hints = addText(this, x + 18 * S, y + h - 22 * S, `Gauche/Droite : onglet   Haut/Bas : choisir   Échap ou ${keyLabel('menu')} : fermer`, { font: 'body', scale: S, color: PALETTE.metalClair }).setDepth(DEPTH + 2);
    this.frame.push(dim, panel, gold, hints);
    this.tabTexts = TABS.map((t, i) => {
      const step = Math.floor((w - 44 * S) / TABS.length);
      const text = addText(this, x + 22 * S + i * step, y + 16 * S, t.label, { scale: S }).setDepth(DEPTH + 2);
      text.setInteractive({ useHandCursor: true }).on('pointerdown', () => !this.covered && this.setTab(t.id));
      this.frame.push(text);
      return text;
    });
    this.setTab(this.tab);
  }

  private setTab(tab: MenuTab): void {
    this.tab = tab;
    this.tabTexts.forEach((t, i) => t.setTint(TABS[i]?.id === tab ? PALETTE.jauneBle : PALETTE.metal));
    this.list?.destroy();
    this.list = null;
    this.options?.destroy();
    this.options = null;
    this.island?.destroy();
    this.island = null;
    for (const p of this.content) p.destroy();
    this.content = [];
    if (tab === 'compagnie') this.buildCompany();
    else if (tab === 'options') this.buildOptions();
    else if (tab === 'carte') this.buildIsland();
    else if (tab === 'inventaire') this.buildInventory();
    else if (tab === 'reputation') this.buildReputation();
    else if (tab === 'sauvegarde') this.buildSaves();
    else this.buildQuests();
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.push(o);
    return o;
  }

  /* ---------- Options (n°232) et carte (n°233) ---------- */

  private buildOptions(): void {
    const S = this.S;
    const a = this.area();
    this.options = new OptionsPanel(this, this.actions, { x: a.x, y: a.y, width: a.w, height: a.h, scale: S, depth: DEPTH + 2, horizontal: false, onOpen: () => this.openKeys() });
    this.options.selectId(this.optionsSelected);
    this.keep(addText(this, a.x + a.w, a.y - 2 * S, 'Entrée : changer', { scale: S, color: PALETTE.metalClair, align: 'right' }).setDepth(DEPTH + 3));
  }

  /** Ligne choisie dans l'onglet Options, gardée quand l'onglet se reconstruit (taille du texte). */
  private optionsSelected: string | null = null;

  /** Écran des touches (n°241) par-dessus le menu ; la touche qui le ferme ne ferme pas le menu. */
  private openKeys(): void {
    this.covered = true;
    this.scene.launch(SCENES.keyBind, {
      onClose: () => {
        this.covered = false;
        this.listenFrom = this.game.loop.frame + 2;
      },
    });
    this.scene.bringToTop(SCENES.keyBind);
  }

  private listenFrom = 0;

  private buildIsland(): void {
    const S = this.S;
    const a = this.area();
    const island = this.data_.island;
    if (!island) {
      this.keep(addText(this, a.x, a.y, 'La carte s’ouvre dans le monde (N).', { scale: S, color: PALETTE.metalClair }).setDepth(DEPTH + 2));
      return;
    }
    const cell = 3 * S;
    const y = a.y - 4 * S;
    this.island = new IslandMapView(this, { ...island, x: a.x, y, cell, depth: DEPTH + 2, labels: true, scale: S });
    const tx = a.x + island.map.width * cell + 16 * S;
    let ty = a.y;
    const lines = [
      'N : carte en grand.',
      '',
      'Voyage rapide : depuis un autel des Lanternes ou un lieu habité, ouvre la carte (N) et choisis une destination.',
      '',
      'Les zones jamais visitées restent dans le brouillard.',
    ];
    for (const line of lines) {
      const t = this.keep(addText(this, tx, ty, line, { scale: S, color: PALETTE.metalClair, maxWidth: a.x + a.w - tx }).setDepth(DEPTH + 2));
      ty += Math.max(16 * S, t.height + 4 * S);
    }
  }

  /** Zone de contenu : sous les onglets, au-dessus des raccourcis. */
  private area(): { x: number; y: number; w: number; h: number } {
    const S = this.S;
    const { x, y, w, h } = this.box;
    return { x: x + 18 * S, y: y + 56 * S, w: w - 36 * S, h: h - 56 * S - 40 * S };
  }

  /* ---------- Compagnie (jalon M6, GDD §13.2 : fiche personnage, n°141) ---------- */

  private companyCursor = 0;
  private notice: string | null = null;

  private buildCompany(): void {
    const S = this.S;
    const a = this.area();
    const company = this.ctx.progress.company;
    const data = this.ctx.data;
    const listW = 216 * S;
    const rowH = 24 * S;
    const nameOf = (m: Member): string => (m.evolution ? (findEvolution(data, m.evolution)?.evo.name ?? m.class) : (data.classes.find((c) => c.id === m.class)?.name ?? m.class));
    const rows: ListRow[] = company.map((m) => ({ label: `${m.name}${isWounded(m, this.ctx.progress.day) ? ' +' : ''}`, right: `${m.level}`, color: m.evolution ? PALETTE.lumiereDoree : m.hero ? PALETTE.jauneBle : PALETTE.parchemin }));
    this.keep(addText(this, a.x, a.y, `Compagnie  ${company.length}`, { font: 'body', scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
    const detail: Phaser.GameObjects.GameObject[] = [];
    const show = (i: number): void => {
      this.companyCursor = i;
      for (const d of detail) d.destroy();
      detail.length = 0;
      const m = company[i];
      const cls = m ? data.classes.find((c) => c.id === m.class) : undefined;
      const dx = a.x + listW + 20 * S;
      const dw = a.w - listW - 20 * S;
      const put = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
        detail.push(o);
        return o;
      };
      const line = (x: number, y: number, t: string, color: number = PALETTE.parchemin, maxWidth?: number) =>
        put(addText(this, x, y, t, { scale: S, color, ...(maxWidth ? { maxWidth } : {}) }).setDepth(DEPTH + 2));
      if (!m || !cls) {
        this.content.push(...detail);
        return;
      }
      // En-tête : portrait (cadre doré après une évolution, n°143), nom, classe, niveau, XP.
      const sprite = m.hero ? 'heros' : memberSprite(cls.id, skinVariant(company, i));
      put(this.add.rectangle(dx, a.y, 52 * S, 52 * S, m.evolution ? PALETTE.lumiereDoree : PALETTE.violetBrume, m.evolution ? 0.9 : 0.4).setOrigin(0, 0).setDepth(DEPTH + 2));
      const face = portraitInBox(this, sprite, dx + 2 * S, a.y + 2 * S, 48 * S, 48 * S, S, DEPTH + 3);
      if (face) put(face);
      line(dx + 62 * S, a.y, m.name, PALETTE.jauneBle);
      line(dx + 62 * S, a.y + 18 * S, `${nameOf(m)} · niveau ${m.level}/${m.levelCap}`, m.evolution ? PALETTE.lumiereDoree : PALETTE.cyanEclat);
      line(dx + 62 * S, a.y + 36 * S, m.level >= m.levelCap ? 'EXP MAX' : `EXP ${m.xp}/100${isWounded(m, this.ctx.progress.day) ? '   Blessé jusqu’au repos' : ''}`, isWounded(m, this.ctx.progress.day) ? PALETTE.braise : PALETTE.metalClair);
      // Stats et croissances.
      const evo = m.evolution ? (findEvolution(data, m.evolution)?.evo ?? null) : null;
      const growths = evolvedGrowths(cls, evo);
      const colW = Math.floor(dw / 9);
      STAT_KEYS.forEach((k, j) => {
        const cx = dx + j * colW;
        line(cx, a.y + 60 * S, STAT_SHORT[k], PALETTE.metalClair);
        line(cx, a.y + 76 * S, `${m.stats[k]}`);
        if (k !== 'mob') line(cx, a.y + 92 * S, `${growths[k as GrowthKey]}%`, PALETTE.metalClair);
      });
      // Arme, compétence, passives.
      const weapon = data.weapons.find((w) => w.id === cls.startingWeapon);
      const skill = data.skills.find((s) => s.owner === cls.id);
      line(dx, a.y + 114 * S, `Arme : ${weapon?.name ?? cls.weapon.name}   ·   Compétence : ${skill?.name ?? '—'}`, PALETTE.ocreClair, dw);
      const learned = learnedPassives(cls, m.level);
      const equipped = equippedPassive(cls, m.level, m.passive);
      const passives = cls.passives.map((p) => `${p.name}${p.id === equipped ? ' (équipée)' : learned.includes(p) ? '' : ` (niv ${p.level})`}`).join('   ');
      line(dx, a.y + 132 * S, `Passives : ${passives}`, PALETTE.parchemin, dw);
      // Évolution.
      let y = a.y + 156 * S;
      line(dx, y, evo ? `Évolution : ${evo.name}` : 'Évolution', PALETTE.cyanEclat);
      y += 18 * S;
      if (evo) {
        line(dx, y, evo.description, PALETTE.lumiereDoree, dw);
      } else {
        const world = { data, progress: this.ctx.progress, discovered: this.ctx.discovered };
        const { choices, blocker } = evolutionChoices(world, m);
        if (blocker) {
          const why = line(dx, y, `${blocker} : il faut le niveau ${data.balance.levels.promotionMinLevel}, un Sceau de Maîtrise et la condition d’une branche.`, PALETTE.metalClair, dw);
          y += Math.ceil(why.height) + 6 * S;
        }
        for (const c of choices) {
          const head = line(dx, y, c.evo.name, c.ready ? PALETTE.lumiereDoree : PALETTE.parchemin);
          if (c.ready) {
            const btn = put(addText(this, dx + dw, y, '[ Évoluer ]', { scale: S, color: 0x7fcf6a, align: 'right' }).setDepth(DEPTH + 3));
            btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.evolve(i, c.evo.id));
          }
          void head;
          const trait = line(dx, y + 16 * S, c.evo.description, PALETTE.metalClair, dw);
          const cond = line(dx, y + 18 * S + Math.ceil(trait.height), `${c.met ? 'Condition remplie' : 'Condition'} : ${c.evo.condition}${c.progress && !c.met ? ` (${c.progress})` : ''}`, c.met ? 0x7fcf6a : PALETTE.ambre, dw);
          y += 22 * S + Math.ceil(trait.height) + Math.ceil(cond.height);
        }
      }
      if (this.notice) line(dx, a.y + a.h - 16 * S, this.notice, PALETTE.lumiereDoree, dw);
      this.content.push(...detail);
    };
    this.list = new ScrollList(this, a.x, a.y + 24 * S, this.actions, {
      width: listW,
      rowHeight: rowH,
      visibleRows: Math.max(3, Math.floor((a.h - 28 * S) / rowH)),
      depth: DEPTH + 2,
      scale: S,
      onCursor: show,
      onActivate: (i) => {
        // Entrée : évoluer si une seule branche est prête.
        const m = company[i];
        if (!m) return;
        const ready = evolutionChoices({ data, progress: this.ctx.progress, discovered: this.ctx.discovered }, m).choices.filter((c) => c.ready);
        if (ready.length === 1 && ready[0]) this.evolve(i, ready[0].evo.id);
      },
    });
    this.list.reset(rows, Math.min(this.companyCursor, Math.max(0, rows.length - 1)));
    show(this.companyCursor);
  }

  /** Fait évoluer un membre (n°141) puis redessine l'onglet. */
  private evolve(index: number, evoId: string): void {
    const m = this.ctx.progress.company[index];
    if (!m) return;
    const error = evolveMember({ data: this.ctx.data, progress: this.ctx.progress, discovered: this.ctx.discovered }, m, evoId);
    const evo = findEvolution(this.ctx.data, evoId)?.evo;
    this.notice = error ?? `${m.name} devient ${evo?.name ?? evoId} !`;
    this.companyCursor = index;
    flashCamera(this.cameras.main, 300, 255, 223, 154);
    this.setTab('compagnie');
    this.notice = null;
  }

  /* ---------- Inventaire ---------- */

  private buildInventory(): void {
    const S = this.S;
    const a = this.area();
    const stacks = this.ctx.progress.inventory;
    const rows: ListRow[] = stacks.map((s) => ({ label: this.ctx.index.catalog.get(s.item)?.name ?? s.item, right: `×${s.qty}` }));
    const listW = Math.round(a.w * 0.48);
    const rowH = 24 * S;
    const visible = Math.max(3, Math.floor((a.h - 28 * S) / rowH));
    this.keep(addText(this, a.x, a.y, `Sac  ${stacks.length}/${this.ctx.data.balance.economy.inventoryCapacity}`, { font: 'body', scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
    const detail: Phaser.GameObjects.GameObject[] = [];
    const show = (i: number): void => {
      for (const d of detail) d.destroy();
      detail.length = 0;
      const stack = stacks[i];
      const info = stack ? this.ctx.index.catalog.get(stack.item) : undefined;
      const dx = a.x + listW + 24 * S;
      const dw = a.w - listW - 24 * S;
      if (!info) {
        detail.push(addText(this, dx, a.y + 24 * S, 'Le sac est vide. Les marchands vendent de quoi le remplir.', { scale: S, color: PALETTE.metalClair, maxWidth: dw }).setDepth(DEPTH + 2));
      } else {
        const name = addText(this, dx, a.y + 24 * S, info.name, { scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH + 2);
        const kind = addText(this, dx, a.y + 50 * S, itemKindLabel(info.kind), { font: 'body', scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2);
        const desc = addText(this, dx, a.y + 74 * S, info.description, { scale: S, maxWidth: dw }).setDepth(DEPTH + 2);
        detail.push(name, kind, desc);
        if (info.price !== null) {
          detail.push(addText(this, dx, a.y + 74 * S + Math.ceil(desc.height) + 10 * S, `Valeur : ${info.price} or`, { font: 'body', scale: S, color: PALETTE.metalClair }).setDepth(DEPTH + 2));
        }
      }
      this.content.push(...detail);
    };
    this.list = new ScrollList(this, a.x, a.y + 24 * S, this.actions, { width: listW, rowHeight: rowH, visibleRows: visible, depth: DEPTH + 2, scale: S, onCursor: show });
    this.list.setRows(rows, false);
    if (rows.length === 0) show(0);
  }

  /* ---------- Réputation ---------- */

  private buildReputation(): void {
    const S = this.S;
    const a = this.area();
    const cfg = this.ctx.data.reputation;
    const colW = Math.floor((a.w - 24 * S) / 2);
    const bar = (x: number, y: number, w: number, value: number, color: number): void => {
      const span = cfg.max - cfg.min;
      const at = (v: number): number => x + Math.round(((v - cfg.min) / span) * w);
      this.keep(this.add.rectangle(x - S, y - S, w + 2 * S, 8 * S + 2 * S, PALETTE.encre).setOrigin(0, 0).setDepth(DEPTH + 2));
      for (const t of cfg.tiers) {
        const tc = Phaser.Display.Color.HexStringToColor(t.color).color;
        this.keep(this.add.rectangle(at(t.min), y, Math.max(S, at(t.max + 1) - at(t.min) - S), 8 * S, tc, 0.38).setOrigin(0, 0).setDepth(DEPTH + 3));
      }
      const zero = at(0);
      const here = at(value);
      this.keep(this.add.rectangle(Math.min(zero, here), y, Math.max(S, Math.abs(here - zero)), 8 * S, color).setOrigin(0, 0).setDepth(DEPTH + 4));
      this.keep(this.add.rectangle(here - S, y - 2 * S, 3 * S, 8 * S + 4 * S, 0xffffff).setOrigin(0, 0).setDepth(DEPTH + 5));
    };
    const rowH = 54 * S;
    const place = (x: number, y: number, name: string, target: string, note: string, dim = false): void => {
      const value = this.ctx.progress.reputation[target] ?? 0;
      const tier = cfg.tiers.find((t) => t.id === tierIdOf(value, cfg)) ?? cfg.tiers[2];
      const color = Phaser.Display.Color.HexStringToColor(tier?.color ?? '#c9bfa9').color;
      this.keep(addText(this, x, y, name, { scale: S, color: dim ? PALETTE.desactive : PALETTE.parchemin }).setDepth(DEPTH + 2));
      const label = `${tier?.name ?? ''}  ${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value)}`;
      this.keep(addText(this, x + colW - 8 * S, y, label, { scale: S, color: dim ? PALETTE.desactive : color, align: 'right' }).setDepth(DEPTH + 2));
      bar(x, y + 26 * S, colW - 8 * S, value, dim ? PALETTE.desactive : color);
      this.keep(addText(this, x, y + 38 * S, note, { font: 'body', scale: S, color: PALETTE.metalClair }).setDepth(DEPTH + 2));
    };
    this.keep(addText(this, a.x, a.y - 4 * S, 'Villages', { font: 'body', scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
    this.keep(addText(this, a.x + colW + 24 * S, a.y - 4 * S, 'Factions', { font: 'body', scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
    const villages = this.ctx.data.locations.filter((l) => l.reputation !== null);
    villages.forEach((loc, i) => {
      const value = this.ctx.progress.reputation[loc.id] ?? 0;
      const tier = cfg.tiers.find((t) => t.id === tierIdOf(value, cfg));
      const mult = tier ? (tier.refusesTrade ? 'commerce refusé' : `prix ×${tier.priceMultiplier.toString().replace('.', ',')}`) : '';
      const seen = this.ctx.discovered.includes(loc.id);
      place(a.x, a.y + 16 * S + i * rowH, loc.name, loc.id, seen ? mult : 'pas encore visité', !seen);
    });
    this.ctx.data.factions.forEach((f, i) => place(a.x + colW + 24 * S, a.y + 16 * S + i * rowH, f.name, f.id, f.description));
  }

  /* ---------- Quêtes ---------- */

  /* ---------- Sauvegarde (jalon M9, n°161) ---------- */

  private buildSaves(): void {
    const S = this.S;
    const a = this.area();
    const saves = this.data_.saves;
    const slots = listSlots(this.ctx.data);
    const rows: ListRow[] = slots.map((e) => ({
      label: SLOT_LABEL[e.key],
      right: e.state === 'empty' ? 'vide' : e.state === 'broken' ? 'illisible' : `${e.save.meta.heroName} · niv. ${e.save.meta.heroLevel} · ${e.save.meta.place}`,
      color: e.state === 'broken' ? PALETTE.rougeCendre : e.state === 'empty' ? PALETTE.metalClair : PALETTE.parchemin,
    }));
    const listW = Math.round(a.w * 0.62);
    this.keep(addText(this, a.x, a.y, 'Emplacements', { font: 'body', scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
    const info = this.keep(addText(this, a.x + listW + 24 * S, a.y + 30 * S, '', { scale: S, color: PALETTE.parchemin, maxWidth: a.w - listW - 24 * S }).setDepth(DEPTH + 2));
    const show = (i: number): void => {
      const e = slots[i];
      if (!e) return;
      const lines: string[] = [];
      if (isLoadable(e)) lines.push(`Sauvegardé le ${formatSavedAt(e.save.savedAt)}.`);
      if (e.key === GAME_SAVE_KEYS[0]) lines.push('Écrite seule après un combat, à l’entrée et à la sortie d’un village, à la fin d’une quête et au repos.');
      else lines.push(saves?.blocked ?? 'Entrée : sauvegarder ici, charger, exporter ou supprimer.');
      info.setText(lines.join('\n\n'));
      info.setTint(saves?.blocked && e.key !== GAME_SAVE_KEYS[0] ? PALETTE.ambre : PALETTE.parchemin);
    };
    this.list = new ScrollList(this, a.x, a.y + 30 * S, this.actions, {
      width: listW,
      rowHeight: 30 * S,
      visibleRows: rows.length,
      depth: DEPTH + 2,
      scale: S,
      onCursor: show,
      onActivate: (i) => this.openSaves(slots[i]?.key ?? GAME_SAVE_KEYS[1]),
    });
    this.list.reset(rows, 1);
    show(1);
    this.keep(addText(this, a.x, a.y + 30 * S + rows.length * 30 * S + 16 * S, 'Tu peux aussi sauvegarder chez un aubergiste ou à un autel des Lanternes.', { scale: S, color: PALETTE.metalClair, maxWidth: a.w }).setDepth(DEPTH + 2));
  }

  private openSaves(key: (typeof GAME_SAVE_KEYS)[number]): void {
    const saves = this.data_.saves;
    if (!saves) return;
    this.covered = true;
    this.list?.setLocked(true);
    this.scene.launch(SCENES.saves, {
      mode: 'game',
      heading: 'SAUVEGARDE',
      subtitle: 'Les emplacements de ta partie.',
      place: saves.place,
      blocked: saves.blocked,
      initialKey: key,
      onLoad: saves.onLoad,
      onClose: () => {
        this.covered = false;
        this.actions.consume('cancel');
        this.setTab('sauvegarde');
      },
    });
  }

  private talkBox: TalkBox | null = null;

  /** Visages du journal : la compagnie de la partie (les autres viennent des données). */
  private faceLookup(): FaceLookup {
    return (charId) => {
      const m = this.ctx.progress.company.find((c) => c.id === charId);
      return m ? { name: m.name, title: null, sprite: m.hero ? 'heros' : m.class, team: 'player' } : null;
    };
  }

  /** Relit une scène du journal des rencontres (n°188). */
  private replay(scene: SceneDef): void {
    const box = new TalkBox(this, this.actions, buildTalkView(this.ctx.data, scene, false, this.faceLookup()), {
      scale: this.S,
      depth: DEPTH + 20,
      bottom: this.scale.height - 12 * this.S,
      ...loadTyping(this.ctx.data.balance.dialogue),
    });
    this.talkBox = box;
    this.list?.setLocked(true);
    void box.done.then(() => {
      if (this.talkBox === box) this.talkBox = null;
      this.list?.setLocked(false);
      // Échap a fermé la scène : il ne doit pas fermer le menu dans la même image.
      this.actions.consume('cancel');
    });
  }

  private buildQuests(): void {
    const S = this.S;
    const a = this.area();
    const quests = this.ctx.data.quests
      .filter((q) => questStatus(this.ctx, q.id) !== 'available' || this.ctx.progress.quests[q.id] !== undefined)
      .sort((p, q) => this.order(p) - this.order(q));
    // Journal des rencontres (GDD §7.9, n°188) : les scènes de combat déjà vues, par ennemi.
    const lookup = this.faceLookup();
    const seen = new Set(this.ctx.progress.scenesSeen);
    const enemyOrder = (id: string): number => this.ctx.data.enemies.findIndex((e) => e.id === id);
    const scenes = this.ctx.data.scenes.filter((sc) => seen.has(sc.id)).sort((p, q) => enemyOrder(p.enemy) - enemyOrder(q.enemy) || this.ctx.progress.scenesSeen.indexOf(p.id) - this.ctx.progress.scenesSeen.indexOf(q.id));
    type Entry = { readonly quest: QuestDef } | { readonly scene: SceneDef } | { readonly header: true };
    const entries: Entry[] = [...quests.map((quest) => ({ quest })), ...(scenes.length > 0 ? [{ header: true as const }, ...scenes.map((scene) => ({ scene }))] : [])];
    const rows: ListRow[] = entries.map((e) => {
      if ('header' in e) return { label: '— Rencontres —', color: PALETTE.ambre };
      if ('scene' in e) return { label: sceneTitle(this.ctx.data, e.scene, lookup), right: 'Relire', color: PALETTE.parchemin };
      const status = questStatus(this.ctx, e.quest.id);
      return {
        label: e.quest.name,
        right: STATUS_LABEL[status],
        color: status === 'done' ? PALETTE.desactive : status === 'ready' ? PALETTE.cyanEclat : PALETTE.parchemin,
      };
    });
    const listW = Math.round(a.w * 0.44);
    const rowH = 24 * S;
    const visible = Math.max(3, Math.floor((a.h - 8 * S) / rowH));
    const detail: Phaser.GameObjects.GameObject[] = [];
    const show = (i: number): void => {
      for (const d of detail) d.destroy();
      detail.length = 0;
      const dx = a.x + listW + 24 * S;
      const dw = a.w - listW - 24 * S;
      const entry = entries[i];
      let y = a.y;
      const push = (text: string, color: number, scale = S, font: 'body' | 'small' = 'body'): void => {
        const t = addText(this, dx, y, text, { scale, color, maxWidth: dw, font }).setDepth(DEPTH + 2);
        detail.push(t);
        y += Math.ceil(t.height) + 6 * S;
      };
      if (!entry) {
        push('Aucune quête pour l’instant. Parlez aux habitants : ceux qui ont besoin d’aide le montrent.', PALETTE.metalClair);
        this.content.push(...detail);
        return;
      }
      if ('header' in entry || 'scene' in entry) {
        push('Journal des rencontres', PALETTE.jauneBle);
        push('Les paroles échangées au combat avec les ennemis nommés.', PALETTE.parchemin);
        if ('scene' in entry) {
          const first = entry.scene.lines[0];
          if (first) push(`« ${first.text} »`, PALETTE.metalClair);
          push('Entrée : relire la scène. Échap : la passer.', PALETTE.cyanEclat, S + 1, 'small');
        }
        this.content.push(...detail);
        return;
      }
      const q = entry.quest;
      push(q.name, PALETTE.jauneBle);
      const giver = this.ctx.index.npcs.get(q.giver);
      push(`${q.principal ? 'Quête principale · ' : ''}${giver ? `${giver.npc.name}, ${giver.location.name}` : ''}`, PALETTE.cyanEclat, S + 1, 'small');
      push(q.summary, PALETTE.parchemin);
      for (const { step, done } of questSteps(this.ctx, q)) push(`${done ? '[x]' : '[ ]'} ${step.text}`, done ? PALETTE.vertDore : PALETTE.parchemin);
      push(`Récompense : ${this.rewardText(q)}`, PALETTE.metalClair, S + 1, 'small');
      this.content.push(...detail);
    };
    const activate = (i: number): void => {
      const entry = entries[i];
      if (entry && 'scene' in entry) this.replay(entry.scene);
    };
    this.list = new ScrollList(this, a.x, a.y, this.actions, { width: listW, rowHeight: rowH, visibleRows: visible, depth: DEPTH + 2, scale: S, onCursor: show, onActivate: activate });
    this.list.setRows(rows, false);
    if (rows.length === 0) show(0);
  }

  private order(q: QuestDef): number {
    const status = questStatus(this.ctx, q.id);
    return { ready: 0, active: 1, available: 2, done: 3 }[status] * 100 + (q.principal ? 0 : 10);
  }

  private rewardText(q: QuestDef): string {
    const parts: string[] = [];
    if (q.reward.gold) parts.push(`${q.reward.gold} or`);
    for (const r of q.reward.rep) parts.push(`${reputationName(this.ctx, r.target)} ${r.delta > 0 ? '+' : '-'}${Math.abs(r.delta)}`);
    for (const it of q.reward.items ?? []) parts.push(`${this.ctx.index.catalog.get(it.item)?.name ?? it.item}${it.qty > 1 ? ` ×${it.qty}` : ''}`);
    return parts.join(', ') || '—';
  }
}

