/**
 * Dialogue avec un PNJ (jalon M2, GDD §13) : boîte en bas de l'écran, portrait
 * à gauche, texte en machine à écrire, puis menu des options du PNJ (boutique,
 * repos, quête, recrutement, don, sujets, choix). Toutes les règles viennent de
 * `logic/game/dialogue` ; cette scène ne fait qu'afficher et lire les touches.
 *
 * Elle se superpose au monde ; `onClose` rend la main au monde (qui retire un
 * PNJ recruté, rafraîchit ses pastilles de quête…).
 */
import Phaser from 'phaser';
import { getGameCtx } from '../core/townContext';
import { uiScaleFor } from '../core/viewport';
import { ActionInput } from '../core/input';
import type { Expression, NpcDef } from '../data/townSchemas';
import { answer, greetingFor, selectOption, shopGreeting, shopRefuses, visibleOptions, type GameCtx, type Notice, type Outcome } from '../logic/game';
import { PALETTE } from '../render/palette';
import { ensurePortrait } from '../render/townTextures';
import { drawPanel } from '../ui/panel';
import { formatNotices } from '../ui/notices';
import { ShopView } from '../ui/ShopView';
import { addText, setText, type PixelText } from '../ui/text';
import { VerticalMenu, type MenuItem } from '../ui/VerticalMenu';
import { SCENES } from './keys';
import type { WorldHudScene } from './WorldHudScene';

export interface DialogueSceneData {
  readonly npcId: string;
  /** Appelé à la fermeture ; `recruited` : le PNJ a rejoint la compagnie et quitte le village. */
  readonly onClose: (result: { recruited: boolean }) => void;
}

const DEPTH = { box: 400, menu: 410, shop: 420 } as const;
type Mode = 'typing' | 'waiting' | 'menu' | 'shop' | 'closed';

export class DialogueScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private npc!: NpcDef;
  private actions!: ActionInput;
  private data_!: DialogueSceneData;
  private S = 1;
  private mode: Mode = 'closed';

  private parts: Phaser.GameObjects.GameObject[] = [];
  private portrait!: Phaser.GameObjects.Image;
  private body!: PixelText;
  private measure!: PixelText;
  private arrow!: Phaser.GameObjects.Triangle;
  private textMaxWidth = 0;
  private lines = '';
  private revealed = 0;
  private charClock = 0;
  private pages: string[] = [];
  private pageIndex = 0;
  private expression: Expression = 'neutre';
  private afterPages: (() => void) | null = null;
  private menu: VerticalMenu | null = null;
  private menuParts: Phaser.GameObjects.GameObject[] = [];
  private shop: ShopView | null = null;
  private recruited = false;

  constructor() {
    super({ key: SCENES.dialogue, active: false });
  }

  create(data: DialogueSceneData): void {
    const ctx = getGameCtx();
    const npc = ctx?.index.npcs.get(data.npcId)?.npc;
    if (!ctx || !npc) {
      data.onClose({ recruited: false });
      this.scene.stop();
      return;
    }
    this.ctx = ctx;
    this.npc = npc;
    this.data_ = data;
    this.recruited = false;
    this.mode = 'closed';
    this.menu = null;
    this.menuParts = [];
    this.shop = null;
    this.parts = [];
    this.actions = new ActionInput(this);
    this.S = uiScaleFor(this.scale.height);
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.destroyMenu();
      this.shop?.destroy();
      this.shop = null;
    });

    const greeting = greetingFor(ctx, npc);
    this.say(greeting.pages, greeting.expression, [], () => this.openMenu());
  }

  /* ---------- Construction ---------- */

  private onResize(): void {
    if (this.mode === 'closed') return;
    this.S = uiScaleFor(this.scale.height);
    const text = this.pages[this.pageIndex] ?? '';
    const revealed = this.revealed;
    this.destroyMenu();
    this.shop?.destroy();
    this.shop = null;
    this.build();
    this.showPage(text, this.mode === 'typing' ? revealed : Infinity);
    if (this.mode === 'menu' || this.mode === 'shop') {
      this.mode = 'menu';
      this.openMenu();
    }
  }

  private build(): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const S = this.S;
    const { width: W, height: H } = this.scale;
    const bw = Math.min(W - 32 * S, 820 * S);
    const bh = 164 * S;
    const x = Math.round((W - bw) / 2);
    const y = H - bh - 16 * S;

    const panel = drawPanel(this, x, y, bw, bh, { scale: 2 * S, depth: DEPTH.box, fillAlpha: 0.94 });
    const frame = drawPanel(this, x + 12 * S, y + 14 * S, 136 * S, 136 * S, { scale: S, depth: DEPTH.box + 1, fill: 0x0c0b14, fillAlpha: 1 });
    this.portrait = this.add
      .image(x + 12 * S + 4 * S, y + 14 * S + 4 * S, ensurePortrait(this, this.npc, this.expression))
      .setOrigin(0, 0)
      .setScale(2 * S)
      .setDepth(DEPTH.box + 2);

    const nameText = addText(this, x + 168 * S, y - 14 * S, this.npc.name, { scale: S, color: PALETTE.jauneBle, shadow: PALETTE.encre }).setDepth(DEPTH.box + 3);
    const titleText = addText(this, x + 168 * S, y + 4 * S, this.npc.title, { font: 'small', scale: S + 1, color: PALETTE.cyanEclat }).setDepth(DEPTH.box + 3);
    const tagWidth = Math.max(Math.ceil(nameText.width), Math.ceil(titleText.width)) + 24 * S;
    const tag = drawPanel(this, x + 156 * S, y - 22 * S, tagWidth, 44 * S, { scale: S, depth: DEPTH.box + 2, fillAlpha: 0.96 });
    // Le cadre du nom recouvre le haut de la boîte : on repasse le texte au-dessus.
    nameText.setDepth(DEPTH.box + 4);
    titleText.setDepth(DEPTH.box + 4);

    this.textMaxWidth = bw - 168 * S - 28 * S;
    this.body = addText(this, x + 168 * S, y + 38 * S, '', { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.box + 3);
    this.measure = addText(this, 0, 0, '', { scale: S }).setVisible(false);
    this.arrow = this.add
      .triangle(x + bw - 22 * S, y + bh - 20 * S, 0, 0, 10 * S, 0, 5 * S, 7 * S, PALETTE.ambre)
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.box + 3)
      .setVisible(false);
    this.tweens.add({ targets: this.arrow, y: this.arrow.y + 3 * S, duration: 380, yoyo: true, repeat: -1 });

    const hit = this.add.zone(x, y, bw, bh).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.advance());
    this.parts.push(panel, frame, this.portrait, nameText, titleText, tag, this.body, this.measure, this.arrow, hit);
    this.boxX = x;
    this.boxY = y;
    this.boxW = bw;
  }

  private boxX = 0;
  private boxY = 0;
  private boxW = 0;

  /* ---------- Texte ---------- */

  /** Coupe le texte en lignes qui tiennent dans la boîte (sans que les mots ne sautent pendant la frappe). */
  private wrap(text: string): string {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const candidate = line === '' ? word : `${line} ${word}`;
      setText(this.measure, candidate);
      if (this.measure.width > this.textMaxWidth && line !== '') {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line !== '') lines.push(line);
    return lines.join('\n');
  }

  private say(pages: string[], expression: Expression, notices: Notice[], then: () => void): void {
    this.setExpression(expression);
    this.notify(notices);
    this.pages = pages.length > 0 ? pages : [''];
    this.pageIndex = 0;
    this.afterPages = then;
    this.showPage(this.pages[0] as string, 0);
  }

  private showPage(text: string, revealed: number): void {
    this.lines = this.wrap(text);
    this.revealed = Math.min(revealed, this.lines.length);
    this.charClock = 0;
    setText(this.body, this.lines.slice(0, this.revealed));
    this.arrow.setVisible(false);
    this.mode = this.revealed >= this.lines.length ? 'waiting' : 'typing';
    if (this.mode === 'waiting') this.arrow.setVisible(this.pageIndex < this.pages.length - 1);
  }

  private setExpression(expression: Expression): void {
    this.expression = expression;
    this.portrait.setTexture(ensurePortrait(this, this.npc, expression));
  }

  private notify(notices: Notice[]): void {
    if (notices.length === 0) return;
    const hud = this.scene.get(SCENES.worldHud) as WorldHudScene | undefined;
    hud?.notify?.(formatNotices(this.ctx, notices));
  }

  /** Confirmer : finit la frappe, ou passe à la page suivante, ou à la suite. */
  private advance(): void {
    if (this.mode === 'typing') {
      this.revealed = this.lines.length;
      setText(this.body, this.lines);
      this.mode = 'waiting';
      this.arrow.setVisible(this.pageIndex < this.pages.length - 1);
      return;
    }
    if (this.mode !== 'waiting') return;
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex++;
      this.showPage(this.pages[this.pageIndex] as string, 0);
      return;
    }
    const then = this.afterPages;
    this.afterPages = null;
    then?.();
  }

  override update(_time: number, delta: number): void {
    if (this.mode === 'shop') {
      this.shop?.update();
      return;
    }
    if (this.mode === 'menu') {
      this.menu?.update();
      if (this.actions.consume('cancel')) this.close();
      return;
    }
    if (this.mode === 'typing') {
      const balance = this.ctx.data.balance.dialogue;
      const speed = balance.charsPerSecond * (this.actions.isDown('confirm') ? balance.fastMultiplier : 1);
      this.charClock += (delta / 1000) * speed;
      const whole = Math.floor(this.charClock);
      if (whole > 0) {
        this.charClock -= whole;
        this.revealed = Math.min(this.lines.length, this.revealed + whole);
        setText(this.body, this.lines.slice(0, this.revealed));
        if (this.revealed >= this.lines.length) {
          this.mode = 'waiting';
          this.arrow.setVisible(this.pageIndex < this.pages.length - 1);
        }
      }
      if (this.actions.justPressed('confirm')) this.advance();
      if (this.actions.consume('cancel')) this.advance();
      return;
    }
    if (this.mode === 'waiting') {
      if (this.actions.justPressed('confirm') || this.actions.consume('cancel')) this.advance();
    }
  }

  /* ---------- Menu des options ---------- */

  private destroyMenu(): void {
    this.menu?.destroy();
    this.menu = null;
    for (const p of this.menuParts) p.destroy();
    this.menuParts = [];
  }

  /** Affiche un menu de réponses au-dessus de la boîte. */
  private showChoices(items: MenuItem[]): void {
    this.destroyMenu();
    const S = this.S;
    const lineHeight = 30 * S;
    const width = Math.min(this.boxW, 470 * S);
    const height = items.length * lineHeight + 20 * S;
    const x = this.boxX + this.boxW - width;
    const y = this.boxY - height - 14 * S;
    const panel = drawPanel(this, x, y, width, height, { scale: S, depth: DEPTH.menu, fillAlpha: 0.96 });
    this.menuParts = [panel];
    this.menu = new VerticalMenu(this, x + 8 * S, y + 10 * S, items, this.actions, {
      width: width - 16 * S,
      lineHeight,
      depth: DEPTH.menu + 1,
      scale: S,
      textScale: S,
    });
    this.arrow.setVisible(false);
    this.mode = 'menu';
  }

  private openMenu(): void {
    const options = visibleOptions(this.ctx, this.npc);
    const items: MenuItem[] = options.map((o) => ({ label: o.label, onSelect: () => this.choose(o.index) }));
    items.push({ label: 'Au revoir', onSelect: () => this.close() });
    if (options.length === 0) {
      this.close();
      return;
    }
    this.showChoices(items);
  }

  private choose(optionIndex: number): void {
    this.destroyMenu();
    this.apply(selectOption(this.ctx, this.npc, optionIndex), optionIndex);
  }

  private apply(outcome: Outcome, optionIndex: number): void {
    if (outcome.type === 'shop') {
      this.openShop(outcome.shopId);
      return;
    }
    if (outcome.type === 'ask') {
      this.say(outcome.pages, outcome.expression, [], () => {
        const items: MenuItem[] = outcome.choices.map((c) => ({
          label: c.label,
          onSelect: () => {
            this.destroyMenu();
            this.finish(answer(this.ctx, this.npc, optionIndex, c.index));
          },
        }));
        this.showChoices(items);
      });
      return;
    }
    this.finish(outcome);
  }

  private finish(outcome: Outcome): void {
    if (outcome.type !== 'say') return;
    const recruit = outcome.notices.some((n) => n.kind === 'recruit');
    if (recruit) this.recruited = true;
    this.say(outcome.pages, outcome.expression, outcome.notices, () => (recruit ? this.close() : this.openMenu()));
  }

  /* ---------- Boutique ---------- */

  private openShop(shopId: string): void {
    const found = this.ctx.index.shops.get(shopId);
    if (!found) {
      this.openMenu();
      return;
    }
    // Un marchand qui refuse de commercer le dit dans la boîte, sans ouvrir de boutique.
    if (shopRefuses(this.ctx, shopId)) {
      this.say(shopGreeting(this.ctx, shopId), 'fache', [], () => this.openMenu());
      return;
    }
    this.mode = 'shop';
    this.shop = new ShopView(this, this.ctx, shopId, this.actions, {
      S: this.S,
      depth: DEPTH.shop,
      onNotices: (notices) => this.notify(notices),
      onClose: () => {
        this.shop = null;
        this.openMenu();
      },
    });
  }

  private close(): void {
    if (this.mode === 'closed') return;
    this.mode = 'closed';
    this.destroyMenu();
    this.shop?.destroy();
    this.shop = null;
    const result = { recruited: this.recruited };
    this.scene.stop();
    this.data_.onClose(result);
  }
}
