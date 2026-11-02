/**
 * Les emplacements de sauvegarde (jalon M9, GDD §13.2, §14 ; n°159 à n°165).
 *
 * Écran natif (960×540) posé par-dessus le titre, le menu, l'auberge ou un
 * autel. À gauche : la sauvegarde automatique, les 3 emplacements et
 * « Importer un fichier » ; à droite : la fiche de l'emplacement choisi et ses
 * actions (Sauvegarder ici, Charger, Exporter, Supprimer). Toute action qui
 * détruit quelque chose passe par une confirmation en deux étapes (n°163).
 */
import Phaser from 'phaser';
import { exportSave, freshSlot, pickImportFile, readImportFile, saveCurrentGame, storeImported } from '../core/gameSave';
import { ActionInput } from '../core/input';
import { deleteSlot, isLoadable, listSlots, SLOT_LABEL, type SlotEntry, type SlotKey } from '../core/saves';
import { uiScaleFor } from '../core/viewport';
import { loadGameData } from '../data';
import { MANUAL_SLOTS, SAVE_KEYS } from '../logic/save/keys';
import type { SaveEnvelope } from '../logic/save/schema';
import { formatPlayTime } from '../logic/save/snapshot';
import { PALETTE } from '../render/palette';
import { portraitInBox } from '../render/portraits';
import { ConfirmBox, type ConfirmStep } from '../ui/ConfirmBox';
import { drawPanel } from '../ui/panel';
import { ScrollList, type ListRow } from '../ui/ScrollList';
import { addText } from '../ui/text';
import { Toasts } from '../ui/Toasts';
import { VerticalMenu, type MenuItem } from '../ui/VerticalMenu';
import { SCENES } from './keys';

export interface SaveSceneData {
  /** « title » : charger, exporter, importer, supprimer ; « game » : on peut aussi sauvegarder. */
  readonly mode: 'title' | 'game';
  /** Titre de l'écran (« CHARGER UNE PARTIE », « AUBERGE DE MAËLYS »…). */
  readonly heading: string;
  readonly subtitle?: string;
  /** Lieu du héros, en toutes lettres (résumé des sauvegardes faites ici). */
  readonly place?: string;
  /** Raison qui empêche de sauvegarder maintenant (poursuite), ou null. */
  readonly blocked?: string | null;
  /** Emplacement choisi à l'ouverture. */
  readonly initialKey?: SlotKey;
  /** Charge une partie : l'écran est déjà fermé quand c'est appelé. */
  readonly onLoad: (save: SaveEnvelope) => void;
  readonly onClose: () => void;
}

type Focus = 'list' | 'actions' | 'confirm' | 'busy';

const DEPTH = 700;
const IMPORT_ROW = 'import';
const ROWS: readonly (SlotKey | typeof IMPORT_ROW)[] = [SAVE_KEYS.auto, ...MANUAL_SLOTS, IMPORT_ROW];

/** « l’emplacement 2 », « la sauvegarde automatique ». */
const theSlot = (key: SlotKey): string => (key === SAVE_KEYS.auto ? 'la sauvegarde automatique' : `l’${SLOT_LABEL[key].toLowerCase()}`);

/** Date d'une sauvegarde, à la française : « 2 nov. 2026 à 21:30 ». */
export function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

/** Une ligne de résumé : « Voyageur, Lame du Serment niv. 7 · Forêt-Racine · 2 h 14 ». */
export function slotOneLiner(save: SaveEnvelope): string {
  const m = save.meta;
  return `${m.heroName}, ${m.evolution ?? m.heroClass} niv. ${m.heroLevel} · ${m.place} · ${formatPlayTime(m.playMs)}`;
}

export class SaveScene extends Phaser.Scene {
  private actions!: ActionInput;
  private params!: SaveSceneData;
  private S = 1;
  private slots: SlotEntry[] = [];
  private list: ScrollList | null = null;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private menu: VerticalMenu | null = null;
  private confirm!: ConfirmBox;
  private toasts!: Toasts;
  private focus: Focus = 'list';
  private cursor = 0;
  private closed = false;

  constructor() {
    super(SCENES.saves);
  }

  create(params: SaveSceneData): void {
    this.params = params;
    this.closed = false;
    this.focus = 'list';
    this.menu = null;
    this.detail = [];
    this.actions = new ActionInput(this);
    const S = (this.S = uiScaleFor(this.scale.height));
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.92).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    addText(this, width / 2, 14 * S, params.heading, { font: 'body', scale: 2 * S, color: PALETTE.lumiereDoree, align: 'center', shadowOffset: 2 * S }).setDepth(DEPTH + 1);
    if (params.subtitle) addText(this, width / 2, 48 * S, params.subtitle, { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 1);
    addText(this, width / 2, height - 22 * S, 'Haut/Bas : choisir    Entrée / clic : actions    Échap : retour', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 1);

    const top = 70 * S;
    const listW = 330 * S;
    const panelH = height - top - 34 * S;
    drawPanel(this, 20 * S, top, listW, panelH, { scale: 2 * S }).setDepth(DEPTH + 1);
    this.list = new ScrollList(this, 30 * S, top + 14 * S, this.actions, {
      width: listW - 20 * S,
      rowHeight: 40 * S,
      visibleRows: ROWS.length,
      depth: DEPTH + 2,
      scale: S,
      onCursor: (i) => {
        this.cursor = i;
        this.showDetail();
      },
      onActivate: (i) => {
        this.cursor = i;
        this.openActions();
      },
    });
    this.toasts = new Toasts(this, { depth: DEPTH + 50, scale: 2 * S, textScale: S, top: height - 70 * S });
    this.confirm = new ConfirmBox(this, this.actions, { x: width / 2, y: height / 2, width: 460 * S, scale: S, depth: DEPTH + 30, lineHeight: 22 * S });
    const initial = params.initialKey ? ROWS.indexOf(params.initialKey) : params.mode === 'game' ? 1 : 0;
    this.refresh(Math.max(0, initial));
    this.actions.consume('confirm');
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  override update(): void {
    if (this.closed || this.focus === 'busy') return;
    if (this.focus === 'confirm') {
      this.confirm.update();
      return;
    }
    if (this.actions.consume('cancel')) {
      if (this.focus === 'actions') this.closeActions();
      else this.close();
      return;
    }
    if (this.focus === 'actions') this.menu?.update();
    else this.list?.update();
  }

  /* ---------- Liste ---------- */

  private refresh(cursor = this.cursor): void {
    const game = loadGameData();
    this.slots = listSlots(game);
    const rows: ListRow[] = ROWS.map((key) => {
      if (key === IMPORT_ROW) return { label: 'Importer un fichier…', color: PALETTE.cyanEclat };
      const entry = this.slots.find((s) => s.key === key) as SlotEntry;
      const right = entry.state === 'empty' ? 'vide' : entry.state === 'broken' ? 'illisible' : `${entry.save.meta.heroName} · niv. ${entry.save.meta.heroLevel}`;
      const color = entry.state === 'broken' ? PALETTE.rougeCendre : entry.state === 'empty' ? PALETTE.metalClair : PALETTE.parchemin;
      return { label: SLOT_LABEL[key], right, color };
    });
    this.cursor = cursor;
    this.list?.reset(rows, cursor);
    this.showDetail();
  }

  private entryAt(i: number): SlotEntry | null {
    const key = ROWS[i];
    if (!key || key === IMPORT_ROW) return null;
    return this.slots.find((s) => s.key === key) ?? null;
  }

  /* ---------- Fiche ---------- */

  private showDetail(): void {
    for (const p of this.detail) p.destroy();
    this.detail = [];
    const S = this.S;
    const { width, height } = this.scale;
    const x = 370 * S;
    const y = 70 * S;
    const w = width - x - 20 * S;
    const h = height - y - 34 * S;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    add(drawPanel(this, x, y, w, h, { scale: 2 * S }).setDepth(DEPTH + 1));
    const tx = x + 16 * S;
    let cy = y + 14 * S;
    const line = (text: string, color: number = PALETTE.parchemin, gap = 20): void => {
      const t = add(addText(this, tx, cy, text, { scale: S, color, maxWidth: w - 32 * S }).setDepth(DEPTH + 2));
      cy += Math.max(gap * S, t.height + 6 * S);
    };
    const key = ROWS[this.cursor];
    if (key === IMPORT_ROW) {
      line('Importer un fichier', PALETTE.lumiereDoree, 26);
      line('Choisis un fichier .json exporté depuis Vaelmor. Il est contrôlé (somme, version, contenu), puis rangé dans l’emplacement de ton choix.');
      return;
    }
    const entry = this.entryAt(this.cursor);
    if (!entry || !key) return;
    line(SLOT_LABEL[key], PALETTE.lumiereDoree, 26);
    if (entry.state === 'empty') {
      line('Emplacement vide.', PALETTE.metalClair);
      if (this.params.mode === 'game' && key !== SAVE_KEYS.auto) line(this.params.blocked ?? 'Entrée : sauvegarder ici.', this.params.blocked ? PALETTE.ambre : PALETTE.parchemin);
      if (key === SAVE_KEYS.auto) line('Le jeu l’écrit seul : après un combat, à l’entrée et à la sortie d’un village, à la fin d’une quête et au repos.', PALETTE.metalClair);
      return;
    }
    if (entry.state === 'broken') {
      line(entry.message, PALETTE.rougeCendre);
      line('Tu peux la supprimer pour libérer la place.', PALETTE.metalClair);
      return;
    }
    const m = entry.save.meta;
    const face = portraitInBox(this, 'heros', tx, cy, 72 * S, 72 * S, S, DEPTH + 2, 'happy');
    if (face) add(face);
    const fx = tx + 86 * S;
    add(addText(this, fx, cy, m.heroName, { font: 'body', scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH + 2));
    add(addText(this, fx, cy + 24 * S, `${m.evolution ?? m.heroClass} · niveau ${m.heroLevel}`, { scale: S, color: m.evolution ? PALETTE.lumiereDoree : PALETTE.parchemin }).setDepth(DEPTH + 2));
    add(addText(this, fx, cy + 44 * S, `Compagnie : ${m.companySize} membre${m.companySize > 1 ? 's' : ''}`, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH + 2));
    if (m.mode === 'classique') add(addText(this, fx, cy + 62 * S, 'CLASSIQUE · mort définitive', { scale: S, color: PALETTE.rougeCendre }).setDepth(DEPTH + 2));
    cy += 86 * S;
    line(`Lieu : ${m.place}`);
    line(`Temps de jeu : ${formatPlayTime(m.playMs)}`);
    line(`Or : ${m.gold}`, PALETTE.jauneBle);
    line(`Sauvegardé le ${formatSavedAt(entry.save.savedAt)}`, PALETTE.metalClair);
    if (entry.message) line(entry.message, PALETTE.ambre);
  }

  /* ---------- Actions ---------- */

  private openActions(): void {
    const key = ROWS[this.cursor];
    if (!key) return;
    if (key === IMPORT_ROW) {
      void this.importFile();
      return;
    }
    const entry = this.entryAt(this.cursor);
    if (!entry) return;
    const items: MenuItem[] = [];
    const game = this.params.mode === 'game';
    if (game && key !== SAVE_KEYS.auto) items.push({ label: 'Sauvegarder ici', enabled: !this.params.blocked, onSelect: () => this.saveHere(key, entry) });
    if (isLoadable(entry)) {
      items.push({ label: 'Charger', onSelect: () => this.loadEntry(key, entry.save) });
      items.push({ label: 'Exporter en fichier', onSelect: () => this.exportEntry(key, entry.save) });
    }
    if (entry.state !== 'empty') items.push({ label: 'Supprimer', onSelect: () => this.removeEntry(key, entry) });
    // Emplacement vide en partie : Entrée sauvegarde directement, sans menu.
    if (items.length === 1 && game && entry.state === 'empty' && !this.params.blocked) {
      this.saveHere(key, entry);
      return;
    }
    if (items.length === 0) {
      this.toasts.push(this.params.blocked ?? 'Rien à faire ici : l’emplacement est vide.');
      return;
    }
    items.push({ label: 'Retour', onSelect: () => this.closeActions() });
    this.showMenu(items);
  }

  private showMenu(items: MenuItem[]): void {
    this.menu?.destroy();
    const S = this.S;
    const { width, height } = this.scale;
    const x = 370 * S + 16 * S;
    const lh = 24 * S;
    const y = height - 34 * S - 44 * S - items.length * lh;
    this.menu = new VerticalMenu(this, x, y, items, this.actions, { width: width - x - 36 * S, lineHeight: lh, depth: DEPTH + 5, scale: S, textScale: S });
    this.focus = 'actions';
    this.list?.setLocked(true);
    this.actions.consume('confirm');
  }

  private closeActions(): void {
    this.menu?.destroy();
    this.menu = null;
    this.focus = 'list';
    this.list?.setLocked(false);
  }

  private ask(steps: readonly ConfirmStep[], onYes: () => void): void {
    this.focus = 'confirm';
    this.menu?.setLocked(true);
    this.list?.setLocked(true);
    this.confirm.ask(
      steps,
      () => {
        this.closeActions();
        onYes();
      },
      () => {
        this.focus = this.menu ? 'actions' : 'list';
        this.menu?.setLocked(false);
        if (!this.menu) this.list?.setLocked(false);
      },
    );
  }

  private saveHere(key: SlotKey, entry: SlotEntry): void {
    const doSave = (): void => {
      const result = saveCurrentGame(key, this.params.place ?? '?');
      this.closeActions();
      this.refresh();
      this.toasts.push(result.ok ? `Partie sauvegardée dans ${theSlot(key)}.` : result.message);
    };
    if (entry.state === 'empty') {
      doSave();
      return;
    }
    const what = isLoadable(entry) ? slotOneLiner(entry.save) : 'une sauvegarde illisible';
    this.ask(
      [
        { title: `Écraser ${theSlot(key)} ?`, lines: [`Il contient : ${what}.`], yes: 'Continuer', no: 'Annuler' },
        { title: 'Confirmer', lines: [`L’ancienne partie de ${theSlot(key)} sera remplacée par la partie en cours.`], yes: 'Oui, écraser', no: 'Non' },
      ],
      doSave,
    );
  }

  private loadEntry(key: SlotKey, save: SaveEnvelope): void {
    const go = (): void => {
      const fresh = freshSlot(key);
      if (!fresh) {
        this.refresh();
        this.toasts.push('Cette sauvegarde n’est plus lisible.');
        return;
      }
      this.closed = true;
      this.scene.stop();
      this.params.onLoad(fresh.save);
    };
    if (this.params.mode === 'title') {
      go();
      return;
    }
    this.ask(
      [
        { title: 'Charger cette partie ?', lines: [slotOneLiner(save), `Sauvegardée le ${formatSavedAt(save.savedAt)}.`], yes: 'Continuer', no: 'Annuler' },
        { title: 'Confirmer', lines: ['Ce que tu as fait depuis ta dernière sauvegarde sera perdu.'], yes: 'Oui, charger', no: 'Non' },
      ],
      go,
    );
  }

  private exportEntry(key: SlotKey, save: SaveEnvelope): void {
    exportSave(key, save);
    this.closeActions();
    this.toasts.push('Fichier exporté : regarde dans tes téléchargements.');
  }

  private removeEntry(key: SlotKey, entry: SlotEntry): void {
    const what = isLoadable(entry) ? slotOneLiner(entry.save) : 'une sauvegarde illisible';
    this.ask(
      [
        { title: `Supprimer ${theSlot(key)} ?`, lines: [`Il contient : ${what}.`], yes: 'Continuer', no: 'Annuler' },
        { title: 'Confirmer', lines: ['La sauvegarde et sa copie de secours seront effacées.'], yes: 'Oui, supprimer', no: 'Non' },
      ],
      () => {
        deleteSlot(key);
        this.refresh();
        this.toasts.push(`${SLOT_LABEL[key]} supprimé${key === SAVE_KEYS.auto ? 'e' : ''}.`);
      },
    );
  }

  /* ---------- Import (n°164) ---------- */

  private async importFile(): Promise<void> {
    this.focus = 'busy';
    this.list?.setLocked(true);
    const file = await pickImportFile();
    if (this.closed) return;
    this.focus = 'list';
    this.list?.setLocked(false);
    if (!file) return;
    const result = await readImportFile(file);
    if (this.closed) return;
    if (!result.ok) {
      this.toasts.push(result.message);
      return;
    }
    for (const w of result.warnings) this.toasts.push(w);
    const items: MenuItem[] = MANUAL_SLOTS.map((key) => {
      const entry = this.slots.find((s) => s.key === key);
      const state = !entry || entry.state === 'empty' ? 'vide' : entry.state === 'broken' ? 'illisible' : 'occupé';
      return { label: `Ranger dans ${theSlot(key)} (${state})`, onSelect: () => this.storeImport(key, result.save) };
    });
    items.push({ label: 'Annuler', onSelect: () => this.closeActions() });
    this.toasts.push(`Fichier valide : ${slotOneLiner(result.save)}.`);
    this.showMenu(items);
  }

  private storeImport(key: SlotKey, save: SaveEnvelope): void {
    const entry = this.slots.find((s) => s.key === key);
    const doStore = (): void => {
      const res = storeImported(key, save);
      this.closeActions();
      this.refresh(ROWS.indexOf(key));
      this.toasts.push(res.ok ? `Partie importée dans ${theSlot(key)}.` : res.message);
    };
    if (!entry || entry.state === 'empty') {
      doStore();
      return;
    }
    const what = isLoadable(entry) ? slotOneLiner(entry.save) : 'une sauvegarde illisible';
    this.ask(
      [
        { title: `Écraser ${theSlot(key)} ?`, lines: [`Il contient : ${what}.`], yes: 'Continuer', no: 'Annuler' },
        { title: 'Confirmer', lines: ['Il sera remplacé par la partie importée.'], yes: 'Oui, écraser', no: 'Non' },
      ],
      doStore,
    );
  }

  private close(): void {
    this.closed = true;
    this.confirm.destroy();
    this.scene.stop();
    this.params.onClose();
  }
}
