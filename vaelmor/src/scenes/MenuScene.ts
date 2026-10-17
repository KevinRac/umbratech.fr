/**
 * Menu du joueur (jalon M2, GDD §13) : fiche simple de l'inventaire, jauges de
 * réputation (villages et factions, effets concrets) et journal des quêtes.
 * Tab ou M l'ouvre depuis le monde, J ouvre directement le journal.
 */
import Phaser from 'phaser';
import { getGameCtx } from '../core/townContext';
import { uiScaleFor } from '../core/viewport';
import { ActionInput } from '../core/input';
import type { QuestDef } from '../data/townSchemas';
import { itemKindLabel, questStatus, questSteps, tierIdOf, type GameCtx } from '../logic/game';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { reputationName } from '../ui/notices';
import { ScrollList, type ListRow } from '../ui/ScrollList';
import { addText } from '../ui/text';
import { SCENES } from './keys';

export type MenuTab = 'inventaire' | 'reputation' | 'quetes';
const TABS: readonly { id: MenuTab; label: string }[] = [
  { id: 'inventaire', label: 'Inventaire' },
  { id: 'reputation', label: 'Réputation' },
  { id: 'quetes', label: 'Quêtes' },
];

export interface MenuSceneData {
  readonly tab?: MenuTab;
  readonly onClose: () => void;
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
  private closing = false;

  constructor() {
    super({ key: SCENES.menu, active: false });
  }

  create(data: MenuSceneData): void {
    const ctx = getGameCtx();
    if (!ctx) {
      data.onClose();
      this.scene.stop();
      return;
    }
    this.ctx = ctx;
    this.data_ = data;
    this.closing = false;
    this.tab = data.tab ?? 'inventaire';
    this.frame = [];
    this.content = [];
    this.tabTexts = [];
    this.list = null;
    this.actions = new ActionInput(this);
    this.S = uiScaleFor(this.scale.height);
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  private onResize(): void {
    this.S = uiScaleFor(this.scale.height);
    this.build();
  }

  override update(): void {
    if (this.closing) return;
    if (this.actions.consume('cancel') || this.actions.consume('menu')) {
      this.close();
      return;
    }
    if (this.actions.justPressed('left')) this.setTab(TABS[(this.tabIndex() + TABS.length - 1) % TABS.length]?.id ?? this.tab);
    if (this.actions.justPressed('right')) this.setTab(TABS[(this.tabIndex() + 1) % TABS.length]?.id ?? this.tab);
    this.list?.update();
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
    const gold = addText(this, x + w - 18 * S, y + 18 * S, `Or : ${this.ctx.progress.gold}`, { scale: S, color: PALETTE.jauneBle, align: 'right' }).setDepth(DEPTH + 2);
    const hints = addText(this, x + 18 * S, y + h - 22 * S, 'Gauche/Droite : onglet   Haut/Bas : choisir   Échap ou Tab : fermer', { font: 'small', scale: S + 1, color: PALETTE.metalClair }).setDepth(DEPTH + 2);
    this.frame.push(dim, panel, gold, hints);
    this.tabTexts = TABS.map((t, i) => {
      const text = addText(this, x + 22 * S + i * 150 * S, y + 16 * S, t.label, { scale: S }).setDepth(DEPTH + 2);
      text.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(t.id));
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
    for (const p of this.content) p.destroy();
    this.content = [];
    if (tab === 'inventaire') this.buildInventory();
    else if (tab === 'reputation') this.buildReputation();
    else this.buildQuests();
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.push(o);
    return o;
  }

  /** Zone de contenu : sous les onglets, au-dessus des raccourcis. */
  private area(): { x: number; y: number; w: number; h: number } {
    const S = this.S;
    const { x, y, w, h } = this.box;
    return { x: x + 18 * S, y: y + 56 * S, w: w - 36 * S, h: h - 56 * S - 40 * S };
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
    this.keep(addText(this, a.x, a.y, `Sac  ${stacks.length}/${this.ctx.data.balance.economy.inventoryCapacity}`, { font: 'small', scale: S + 1, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
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
        const kind = addText(this, dx, a.y + 50 * S, itemKindLabel(info.kind), { font: 'small', scale: S + 1, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2);
        const desc = addText(this, dx, a.y + 74 * S, info.description, { scale: S, maxWidth: dw }).setDepth(DEPTH + 2);
        detail.push(name, kind, desc);
        if (info.price !== null) {
          detail.push(addText(this, dx, a.y + 74 * S + Math.ceil(desc.height) + 10 * S, `Valeur : ${info.price} or`, { font: 'small', scale: S + 1, color: PALETTE.metalClair }).setDepth(DEPTH + 2));
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
      this.keep(addText(this, x, y + 38 * S, note, { font: 'small', scale: S + 1, color: PALETTE.metalClair }).setDepth(DEPTH + 2));
    };
    this.keep(addText(this, a.x, a.y - 4 * S, 'Villages', { font: 'small', scale: S + 1, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
    this.keep(addText(this, a.x + colW + 24 * S, a.y - 4 * S, 'Factions', { font: 'small', scale: S + 1, color: PALETTE.cyanEclat }).setDepth(DEPTH + 2));
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

  private buildQuests(): void {
    const S = this.S;
    const a = this.area();
    const quests = this.ctx.data.quests
      .filter((q) => questStatus(this.ctx, q.id) !== 'available' || this.ctx.progress.quests[q.id] !== undefined)
      .sort((p, q) => this.order(p) - this.order(q));
    const rows: ListRow[] = quests.map((q) => {
      const status = questStatus(this.ctx, q.id);
      return {
        label: q.name,
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
      const q = quests[i];
      if (!q) {
        detail.push(addText(this, dx, a.y, 'Aucune quête pour l’instant. Parlez aux habitants : ceux qui ont besoin d’aide le montrent.', { scale: S, color: PALETTE.metalClair, maxWidth: dw }).setDepth(DEPTH + 2));
        this.content.push(...detail);
        return;
      }
      let y = a.y;
      const push = (text: string, color: number, scale = S, font: 'body' | 'small' = 'body'): void => {
        const t = addText(this, dx, y, text, { scale, color, maxWidth: dw, font }).setDepth(DEPTH + 2);
        detail.push(t);
        y += Math.ceil(t.height) + 6 * S;
      };
      push(q.name, PALETTE.jauneBle);
      const giver = this.ctx.index.npcs.get(q.giver);
      push(`${q.principal ? 'Quête principale · ' : ''}${giver ? `${giver.npc.name}, ${giver.location.name}` : ''}`, PALETTE.cyanEclat, S + 1, 'small');
      push(q.summary, PALETTE.parchemin);
      for (const { step, done } of questSteps(this.ctx, q)) push(`${done ? '[x]' : '[ ]'} ${step.text}`, done ? PALETTE.vertDore : PALETTE.parchemin);
      push(`Récompense : ${this.rewardText(q)}`, PALETTE.metalClair, S + 1, 'small');
      this.content.push(...detail);
    };
    this.list = new ScrollList(this, a.x, a.y, this.actions, { width: listW, rowHeight: rowH, visibleRows: visible, depth: DEPTH + 2, scale: S, onCursor: show });
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

