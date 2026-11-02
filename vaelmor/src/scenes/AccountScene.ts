/**
 * Compte et sauvegarde en ligne (lot M9b, GDD §14.3, n°170 à n°173).
 *
 * Écran natif posé sur le titre : connexion par adresse e-mail et code à
 * 6 chiffres, état du compte, synchronisation, déconnexion, et choix du
 * joueur quand un emplacement a changé des deux côtés (conflit). La saisie
 * passe par un vrai champ HTML posé sur le canevas : pendant qu'il est
 * affiché, le clavier de Phaser est suspendu (sinon Z, Q, S, D et E
 * seraient pris pour des déplacements).
 */
import Phaser from 'phaser';
import { cloudEmail, cloudStatus, logout, refreshAccount, requestCode, resolveConflict, syncAll, verifyCode, type SyncConflict } from '../core/cloud';
import { ActionInput } from '../core/input';
import { SLOT_LABEL } from '../core/saves';
import { uiScaleFor } from '../core/viewport';
import { PALETTE, toCss } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { addText } from '../ui/text';
import { VerticalMenu, type MenuItem } from '../ui/VerticalMenu';
import { SCENES } from './keys';
import { formatSavedAt, slotOneLiner } from './SaveScene';
import { formatPlayTime } from '../logic/save/snapshot';
import type { SaveMeta } from '../logic/save/schema';

export interface AccountSceneData {
  /** Conflits à trancher tout de suite (synchronisation du titre). */
  readonly conflicts?: readonly SyncConflict[];
  readonly onClose: (changed: boolean) => void;
}

const DEPTH = 800;

export class AccountScene extends Phaser.Scene {
  private actions!: ActionInput;
  private params!: AccountSceneData;
  private S = 1;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private menu: VerticalMenu | null = null;
  private field: HTMLInputElement | null = null;
  private placeField: (() => void) | null = null;
  private address = '';
  /** Une sauvegarde locale a pu changer (pull, conflit tranché) : le titre doit se reconstruire. */
  private changed = false;
  private closed = false;
  private busy = false;

  constructor() {
    super(SCENES.account);
  }

  create(params: AccountSceneData): void {
    this.params = params;
    this.closed = false;
    this.busy = false;
    this.changed = false;
    this.parts = [];
    this.menu = null;
    this.actions = new ActionInput(this);
    this.S = uiScaleFor(this.scale.height);
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.92).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    addText(this, width / 2, 14 * this.S, 'COMPTE', { font: 'body', scale: 2 * this.S, color: PALETTE.lumiereDoree, align: 'center', shadowOffset: 2 * this.S }).setDepth(DEPTH + 1);
    addText(this, width / 2, 48 * this.S, 'Sauvegardes en ligne : retrouve ta partie sur un autre appareil.', { scale: this.S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 1);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeField());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
    this.actions.consume('confirm');
    if (params.conflicts && params.conflicts.length > 0) this.showConflicts([...params.conflicts]);
    else void this.start();
  }

  override update(): void {
    if (this.closed || this.busy || this.field) return;
    if (this.actions.consume('cancel')) {
      this.close();
      return;
    }
    this.menu?.update();
  }

  private onResize(): void {
    this.placeField?.();
  }

  /* ---------- Écrans ---------- */

  private async start(): Promise<void> {
    this.screen(['Connexion au serveur…'], []);
    this.busy = true;
    const st = await refreshAccount();
    this.busy = false;
    if (this.closed) return;
    if (st === 'signedIn') this.showSignedIn(null);
    else if (st === 'signedOut') this.showEmail(null);
    else this.showOffline();
  }

  private showOffline(): void {
    this.screen(
      ['Le serveur de sauvegarde est injoignable.', 'Tes sauvegardes restent dans ce navigateur ; tu pourras te connecter plus tard.'],
      [
        { label: 'Réessayer', onSelect: () => void this.start() },
        { label: 'Retour', onSelect: () => this.close() },
      ],
    );
  }

  private showEmail(message: string | null, error = false): void {
    this.screen(
      [
        'Connecte-toi avec ton adresse e-mail : tu recevras un code à 6 chiffres.',
        'Pas de mot de passe. Le jeu reste jouable sans compte.',
      ],
      [
        { label: 'Recevoir le code', onSelect: () => void this.sendCode() },
        { label: 'Retour', onSelect: () => this.close() },
      ],
      message,
      error,
    );
    this.showField('email', 'ton.adresse@exemple.fr', this.address, () => void this.sendCode());
  }

  private showCode(message: string | null, error = false): void {
    this.screen(
      [`Code envoyé à ${this.address}.`, 'Il est valable 10 minutes et ne sert qu’une fois. Regarde aussi dans tes indésirables.'],
      [
        { label: 'Valider', onSelect: () => void this.checkCode() },
        { label: 'Renvoyer un code', onSelect: () => void this.sendCode() },
        { label: 'Changer d’adresse', onSelect: () => this.showEmail(null) },
        { label: 'Retour', onSelect: () => this.close() },
      ],
      message,
      error,
    );
    this.showField('code', '000000', '', () => void this.checkCode());
  }

  private showSignedIn(message: string | null, error = false): void {
    this.screen(
      [`Connecté : ${cloudEmail() ?? ''}`, 'Chaque sauvegarde part aussi en ligne. Au titre, le jeu reprend la plus récente.'],
      [
        { label: 'Synchroniser maintenant', onSelect: () => void this.sync() },
        { label: 'Se déconnecter', onSelect: () => void this.signOut() },
        { label: 'Retour', onSelect: () => this.close() },
      ],
      message,
      error,
    );
  }

  /** Un emplacement a changé des deux côtés : le joueur garde l'une des deux versions (n°172). */
  private showConflicts(queue: SyncConflict[]): void {
    const c = queue[0];
    if (!c) {
      if (cloudStatus() === 'signedIn') this.showSignedIn('Synchronisation terminée.');
      else this.close();
      return;
    }
    const line = (m: SaveMeta, savedAt: string): string => `${m.heroName}, ${m.evolution ?? m.heroClass} niv. ${m.heroLevel} · ${m.place} · ${formatPlayTime(m.playMs)} · ${formatSavedAt(savedAt)}`;
    this.screen(
      [
        `${SLOT_LABEL[c.key]} : deux versions différentes.`,
        `Ce navigateur : ${slotOneLiner(c.local)} · ${formatSavedAt(c.local.savedAt)}`,
        `En ligne : ${line(c.remote.meta, c.remote.savedAt)}`,
        'Laquelle garder ? L’autre sera remplacée.',
      ],
      [
        { label: 'Garder celle de ce navigateur', onSelect: () => void this.resolve(queue, 'local') },
        { label: 'Garder celle en ligne', onSelect: () => void this.resolve(queue, 'remote') },
        { label: 'Décider plus tard', onSelect: () => this.showConflicts(queue.slice(1)) },
      ],
    );
  }

  /* ---------- Actions ---------- */

  private async sendCode(): Promise<void> {
    if (this.field?.dataset['kind'] === 'email') this.address = this.field.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.address)) {
      this.showEmail('Saisis une adresse e-mail valide.', true);
      return;
    }
    this.screen([`Envoi du code à ${this.address}…`], []);
    this.busy = true;
    const res = await requestCode(this.address);
    this.busy = false;
    if (this.closed) return;
    if (res.ok) this.showCode(null);
    else if (res.code === 'offline') this.showOffline();
    else if (res.code === 'cooldown') this.showCode(res.message, true);
    else this.showEmail(res.message, true);
  }

  private async checkCode(): Promise<void> {
    const code = (this.field?.value ?? '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      this.showCode('Saisis les 6 chiffres reçus par e-mail.', true);
      return;
    }
    this.screen(['Vérification du code…'], []);
    this.busy = true;
    const res = await verifyCode(this.address, code);
    this.busy = false;
    if (this.closed) return;
    if (!res.ok) {
      if (res.code === 'offline') this.showOffline();
      else this.showCode(res.message, true);
      return;
    }
    await this.sync('Connecté. ');
  }

  private async sync(prefix = ''): Promise<void> {
    this.screen([`${prefix}Synchronisation des sauvegardes…`], []);
    this.busy = true;
    const report = await syncAll();
    this.busy = false;
    if (this.closed) return;
    if (report.pulled > 0) this.changed = true;
    if (report.conflicts.length > 0) {
      this.showConflicts([...report.conflicts]);
      return;
    }
    const done = report.pushed + report.pulled === 0 ? 'Tout est à jour.' : `${report.pushed} envoyée(s), ${report.pulled} reprise(s) en ligne.`;
    this.showSignedIn(report.ok ? `${prefix}${done}` : (report.message ?? 'Synchronisation incomplète.'), !report.ok);
  }

  private async resolve(queue: SyncConflict[], keep: 'local' | 'remote'): Promise<void> {
    const c = queue[0];
    if (!c) return;
    this.screen(['Synchronisation…'], []);
    this.busy = true;
    const res = await resolveConflict(c, keep);
    this.busy = false;
    if (this.closed) return;
    if (keep === 'remote' && res.ok) this.changed = true;
    if (!res.ok) {
      this.showSignedIn(res.message, true);
      return;
    }
    this.showConflicts(queue.slice(1));
  }

  private async signOut(): Promise<void> {
    this.busy = true;
    await logout();
    this.busy = false;
    if (this.closed) return;
    this.showEmail('Déconnecté. Tes sauvegardes restent dans ce navigateur.');
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.removeField();
    this.scene.stop();
    this.params.onClose(this.changed);
  }

  /* ---------- Mise en page ---------- */

  /** Remplace le contenu du cadre : lignes de texte, message, menu. */
  private screen(lines: readonly string[], items: MenuItem[], message: string | null = null, error = false): void {
    this.removeField();
    this.menu?.destroy();
    this.menu = null;
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const S = this.S;
    const { width, height } = this.scale;
    const w = 640 * S;
    const h = 380 * S;
    const x = Math.round((width - w) / 2);
    const y = 76 * S;
    this.parts.push(drawPanel(this, x, y, w, Math.min(h, height - y - 30 * S), { scale: 2 * S }).setDepth(DEPTH + 1));
    let cy = y + 18 * S;
    lines.forEach((text, i) => {
      const t = addText(this, x + 20 * S, cy, text, { scale: S, color: i === 0 ? PALETTE.lumiereDoree : PALETTE.parchemin, maxWidth: w - 40 * S }).setDepth(DEPTH + 2);
      this.parts.push(t);
      cy += t.height + 10 * S;
    });
    this.fieldY = cy + 6 * S;
    if (message) this.parts.push(addText(this, x + 20 * S, y + 200 * S, message, { scale: S, color: error ? PALETTE.rougeCendre : PALETTE.cyanEclat, maxWidth: w - 40 * S }).setDepth(DEPTH + 2));
    if (items.length > 0) {
      const lh = 24 * S;
      this.menu = new VerticalMenu(this, x + 20 * S, y + 236 * S, items, this.actions, { width: w - 40 * S, lineHeight: lh, depth: DEPTH + 3, scale: S, textScale: S });
      this.actions.consume('confirm');
    }
  }

  private fieldY = 0;

  /** Champ de saisie HTML posé sur le canevas ; Entrée valide, Échap ferme l'écran. */
  private showField(kind: 'email' | 'code', placeholder: string, value: string, onEnter: () => void): void {
    this.removeField();
    const input = document.createElement('input');
    input.dataset['kind'] = kind;
    input.type = kind === 'email' ? 'email' : 'text';
    input.inputMode = kind === 'email' ? 'email' : 'numeric';
    input.autocomplete = kind === 'email' ? 'email' : 'one-time-code';
    if (kind === 'code') input.maxLength = 6;
    input.placeholder = placeholder;
    input.value = value;
    input.spellcheck = false;
    Object.assign(input.style, {
      position: 'fixed',
      zIndex: '20',
      boxSizing: 'border-box',
      background: toCss(0x14121f),
      color: toCss(PALETTE.parchemin),
      border: `2px solid ${toCss(PALETTE.metalClair)}`,
      outline: 'none',
      padding: '0 10px',
      fontFamily: '"Vaelmor Jersey 10", monospace',
      letterSpacing: kind === 'code' ? '0.3em' : '0.02em',
    } satisfies Partial<CSSStyleDeclaration>);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') onEnter();
      if (e.key === 'Escape') this.close();
    });
    document.body.append(input);
    this.field = input;
    const keyboard = this.input.keyboard;
    if (keyboard) keyboard.manager.enabled = false;
    this.placeField = () => {
      const canvas = this.game.canvas.getBoundingClientRect();
      const k = canvas.width / this.scale.width;
      const S = this.S;
      const w = 600 * S;
      const left = (this.scale.width - w) / 2;
      Object.assign(input.style, {
        left: `${canvas.left + left * k}px`,
        top: `${canvas.top + this.fieldY * k}px`,
        width: `${w * k}px`,
        height: `${34 * S * k}px`,
        fontSize: `${22 * S * k}px`,
      });
    };
    this.placeField();
    setTimeout(() => input.focus(), 0);
  }

  private removeField(): void {
    if (!this.field) return;
    this.field.remove();
    this.field = null;
    this.placeField = null;
    const keyboard = this.input.keyboard;
    if (keyboard) keyboard.manager.enabled = true;
  }
}
