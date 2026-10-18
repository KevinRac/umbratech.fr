/**
 * Boutique (jalon M2) : onglets Acheter / Vendre, liste défilante, fiche de
 * l'objet à droite, or du joueur. Les prix viennent de `logic/game/shop`
 * (multiplicateur du palier de réputation, revente à 40 %).
 */
import Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import { buy, itemKindLabel, sell, sellable, shopGreeting, shopLockedCount, shopStock, shopTier, type GameCtx, type Notice } from '../logic/game';
import { PALETTE } from '../render/palette';
import { drawPanel } from './panel';
import { ScrollList, type ListRow } from './ScrollList';
import { tierName } from './notices';
import { addText, setText, type PixelText } from './text';

export interface ShopViewOptions {
  readonly S: number;
  readonly depth: number;
  readonly onNotices: (notices: Notice[]) => void;
  readonly onClose: () => void;
}

type Tab = 'buy' | 'sell';

const REFUSALS: Record<string, string> = {
  or: 'Pas assez d’or.',
  sac: 'Votre sac est plein.',
  refus: 'Le marchand refuse de commercer.',
  stock: 'Cet objet n’est plus disponible.',
  inconnu: 'Boutique inconnue.',
};

export class ShopView {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];
  private readonly list: ScrollList;
  private readonly goldText: PixelText;
  private readonly status: PixelText;
  private readonly detail: PixelText[] = [];
  private readonly tabTexts: PixelText[] = [];
  private tab: Tab = 'buy';
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: GameCtx,
    private readonly shopId: string,
    private readonly input: ActionInput,
    private readonly options: ShopViewOptions,
  ) {
    const { S, depth } = options;
    const { width: W, height: H } = scene.scale;
    const pw = Math.min(W - 40 * S, 740 * S);
    const ph = Math.min(H - 40 * S, 430 * S);
    const px = Math.round((W - pw) / 2);
    const py = Math.round((H - ph) / 2);
    const shop = ctx.index.shops.get(shopId)?.shop;

    const dim = scene.add.rectangle(0, 0, W, H, PALETTE.nuit, 0.6).setOrigin(0, 0).setDepth(depth).setInteractive();
    const panel = drawPanel(scene, px, py, pw, ph, { scale: 2 * S, depth: depth + 1, fillAlpha: 0.97 });
    const title = addText(scene, px + 18 * S, py + 12 * S, shop?.name ?? 'Boutique', { scale: 2 * S, color: PALETTE.cyanEclat }).setDepth(depth + 2);
    this.goldText = addText(scene, px + pw - 18 * S, py + 20 * S, '', { scale: S, color: PALETTE.jauneBle, align: 'right' }).setDepth(depth + 2);
    this.parts.push(dim, panel, title, this.goldText);

    this.tabTexts = (['Acheter', 'Vendre'] as const).map((label, i) => addText(scene, px + 22 * S + i * 120 * S, py + 58 * S, label, { scale: S }).setDepth(depth + 2));
    this.parts.push(...this.tabTexts);
    this.tabTexts.forEach((t, i) => {
      t.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(i === 0 ? 'buy' : 'sell'));
    });

    const listX = px + 16 * S;
    const listY = py + 88 * S;
    const listW = Math.round(pw * 0.5);
    const rowH = 24 * S;
    const rows = Math.max(3, Math.floor((ph - 88 * S - 64 * S) / rowH));
    this.list = new ScrollList(scene, listX, listY, input, {
      width: listW,
      rowHeight: rowH,
      visibleRows: rows,
      depth: depth + 2,
      scale: S,
      onCursor: () => this.refreshDetail(),
      onActivate: () => this.trade(),
    });
    this.detailX = listX + listW + 24 * S;
    this.detailY = listY;
    this.detailW = px + pw - 18 * S - this.detailX;

    const hints = addText(scene, px + 18 * S, py + ph - 22 * S, 'Entrée : valider   Gauche/Droite : onglet   Échap : quitter', { font: 'body', scale: S, color: PALETTE.metalClair }).setDepth(depth + 2);
    this.status = addText(scene, px + 18 * S, py + ph - 50 * S, '', { scale: S, color: PALETTE.parchemin, maxWidth: pw - 36 * S }).setDepth(depth + 2);
    this.parts.push(hints, this.status);

    setText(this.status, shopGreeting(ctx, shopId)[0] ?? '');
    this.setTab('buy');
  }

  private detailX = 0;
  private detailY = 0;
  private detailW = 0;

  update(): void {
    if (this.closed) return;
    if (this.input.consume('cancel')) {
      this.close();
      return;
    }
    if (this.input.justPressed('left')) this.setTab('buy');
    if (this.input.justPressed('right')) this.setTab('sell');
    this.list.update();
  }

  destroy(): void {
    this.closed = true;
    this.list.destroy();
    for (const d of this.detail) d.destroy();
    for (const p of this.parts) p.destroy();
    this.parts.length = 0;
  }

  private close(): void {
    this.destroy();
    this.options.onClose();
  }

  private setTab(tab: Tab): void {
    this.tab = tab;
    this.tabTexts.forEach((t, i) => t.setTint((i === 0) === (tab === 'buy') ? PALETTE.jauneBle : PALETTE.metal));
    this.refreshRows(false);
  }

  private rows(): ListRow[] {
    if (this.tab === 'buy') {
      return shopStock(this.ctx, this.shopId).map((e) => ({
        label: e.owned > 0 ? `${e.info.name}  (${e.owned})` : e.info.name,
        right: `${e.price} or`,
        enabled: this.ctx.progress.gold >= e.price,
      }));
    }
    return sellable(this.ctx).map((e) => ({ label: `${e.info.name}  ×${e.qty}`, right: `${e.price} or` }));
  }

  private refreshRows(keep: boolean): void {
    this.list.setRows(this.rows(), keep);
    setText(this.goldText, `Or : ${this.ctx.progress.gold}`);
    this.refreshDetail();
  }

  private refreshDetail(): void {
    for (const d of this.detail) d.destroy();
    this.detail.length = 0;
    const { S, depth } = this.options;
    const add = (y: number, text: string, color: number, scale = S, font: 'body' | 'small' = 'body'): number => {
      const t = addText(this.scene, this.detailX, this.detailY + y, text, { scale, color, maxWidth: this.detailW, font }).setDepth(depth + 2);
      this.detail.push(t);
      return y + Math.ceil(t.height) + 6 * S;
    };
    const selected = this.selectedEntry();
    const tier = shopTier(this.ctx, this.shopId);
    if (!selected) {
      let y = add(0, this.tab === 'buy' ? 'Rien à vendre ici pour le moment.' : 'Votre sac ne contient rien que ce marchand rachète.', PALETTE.metalClair);
      const hidden = shopLockedCount(this.ctx, this.shopId);
      if (this.tab === 'buy' && hidden > 0) y = add(y, 'Des objets rares attendent un meilleur accueil.', PALETTE.ambre);
      return;
    }
    const info = selected.info;
    let y = add(0, info.name, PALETTE.jauneBle);
    y = add(y, itemKindLabel(info.kind), PALETTE.cyanEclat, S + 1, 'small');
    y = add(y, info.description, PALETTE.parchemin);
    if (this.tab === 'buy') {
      const base = info.price ?? 0;
      y = add(y, `Prix : ${selected.price} or`, PALETTE.jauneBle);
      if (selected.price !== base) y = add(y, `Prix de base ${base} or · accueil ${tierName(this.ctx, tier)}`, PALETTE.metalClair, S + 1, 'small');
    } else {
      y = add(y, `Rachat : ${selected.price} or`, PALETTE.jauneBle);
      add(y, 'Revente fixe à 40 % de la valeur.', PALETTE.metalClair, S + 1, 'small');
    }
    const hidden = shopLockedCount(this.ctx, this.shopId);
    if (this.tab === 'buy' && hidden > 0) add(y + 8 * S, 'Des objets rares attendent un meilleur accueil.', PALETTE.ambre, S + 1, 'small');
  }

  private selectedEntry(): { info: { name: string; kind: 'weapon' | 'consumable' | 'accessory' | 'key'; description: string; price: number | null }; price: number } | null {
    const i = this.list.index;
    if (this.tab === 'buy') {
      const e = shopStock(this.ctx, this.shopId)[i];
      return e ? { info: e.info, price: e.price } : null;
    }
    const e = sellable(this.ctx)[i];
    return e ? { info: e.info, price: e.price } : null;
  }

  private trade(): void {
    const i = this.list.index;
    let result;
    if (this.tab === 'buy') {
      const e = shopStock(this.ctx, this.shopId)[i];
      if (!e) return;
      result = buy(this.ctx, this.shopId, e.info.id);
      if (result.ok) setText(this.status, `${e.info.name} acheté pour ${e.price} or.`);
    } else {
      const e = sellable(this.ctx)[i];
      if (!e) return;
      result = sell(this.ctx, this.shopId, e.info.id);
      if (result.ok) setText(this.status, `${e.info.name} vendu pour ${e.price} or.`);
    }
    if (!result.ok) setText(this.status, REFUSALS[result.reason] ?? 'Impossible.');
    else this.options.onNotices(result.notices.filter((n) => n.kind === 'item' && n.lost > 0));
    this.refreshRows(true);
  }
}
