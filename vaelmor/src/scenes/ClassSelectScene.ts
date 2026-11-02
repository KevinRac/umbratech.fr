/**
 * « Choisis ta voie » (jalon M6, décision n°133) : au lancement d'une
 * nouvelle partie, le joueur choisit la classe du héros parmi les 12.
 *
 * Écran natif (960×540, comme les interfaces de combat) posé par-dessus
 * l'écran titre : la liste des classes à gauche, la fiche de la classe à
 * droite (rôle, élément, arme, compétence signature, stats au niveau de
 * départ et croissances, évolutions). Le héros garde son apparence quelle que
 * soit la classe ; seule son arme change.
 *
 * Puis « Choisis ta règle » (jalon M9, décision n°166) : Blessure (GDD §9.13)
 * ou Classique (mort définitive), fixée pour toute la partie.
 */
import Phaser from 'phaser';
import { ActionInput } from '../core/input';
import { uiScaleFor } from '../core/viewport';
import { loadGameData, type GameData } from '../data';
import { GROWTH_KEYS, STAT_KEYS, type ClassDef } from '../data/schemas';
import { statsAtLevel } from '../logic/units/stats';
import { PALETTE } from '../render/palette';
import { portraitInBox } from '../render/portraits';
import type { GameMode } from '../logic/game/progress';
import { ROLE_LABELS, STAT_SHORT } from '../ui/labels';
import { drawPanel } from '../ui/panel';
import { ScrollList } from '../ui/ScrollList';
import { addText } from '../ui/text';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

export interface ClassSelectData {
  readonly onChoose: (classId: string, mode: GameMode) => void;
  readonly onCancel: () => void;
}

export class ClassSelectScene extends Phaser.Scene {
  private actions!: ActionInput;
  private list: ScrollList | null = null;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private data_!: GameData;
  private callbacks!: ClassSelectData;
  private S = 1;
  private done = false;
  /** Classe choisie : l'écran demande alors la règle de mort (n°166). */
  private chosen: string | null = null;
  private modeParts: Phaser.GameObjects.GameObject[] = [];
  private modeMenu: VerticalMenu | null = null;
  private describeMode: (() => void) | null = null;

  constructor() {
    super(SCENES.classSelect);
  }

  create(callbacks: ClassSelectData): void {
    this.callbacks = callbacks;
    this.done = false;
    this.chosen = null;
    this.modeParts = [];
    this.modeMenu = null;
    this.data_ = loadGameData();
    this.actions = new ActionInput(this);
    const S = (this.S = uiScaleFor(this.scale.height));
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.9).setOrigin(0, 0).setInteractive();
    addText(this, width / 2, 14 * S, 'CHOISIS TA VOIE', { font: 'body', scale: 2 * S, color: PALETTE.lumiereDoree, align: 'center', shadowOffset: 2 * S });
    addText(this, width / 2, 48 * S, 'La classe du Voyageur. Elle pourra évoluer au niveau 10.', { scale: S, color: PALETTE.metalClair, align: 'center' });

    const top = 70 * S;
    const panelH = height - top - 32 * S;
    const listW = 290 * S;
    drawPanel(this, 20 * S, top, listW, panelH, { scale: 2 * S });
    const classes = this.data_.classes;
    this.list = new ScrollList(this, 30 * S, top + 12 * S, this.actions, {
      width: listW - 20 * S,
      rowHeight: 32 * S,
      visibleRows: Math.min(classes.length, Math.floor((panelH - 24 * S) / (32 * S))),
      depth: 5,
      scale: S,
      hoverSelects: true,
      onCursor: (i) => this.showClass(classes[i] as ClassDef),
      onActivate: (i) => this.choose((classes[i] as ClassDef).id),
    });
    // Le rôle est dans la fiche : les noms longs (« Chasseur de Serpents de Mer ») prennent toute la ligne.
    this.list.setRows(classes.map((c) => ({ label: c.name, color: PALETTE.parchemin })));
    this.showClass(classes[0] as ClassDef);

    addText(this, width / 2, height - 22 * S, 'Entrée / clic : choisir    Échap : retour', { scale: S, color: PALETTE.metalClair, align: 'center' });
    this.actions.consume('confirm');
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  override update(): void {
    if (this.done) return;
    if (this.chosen !== null) {
      if (this.actions.consume('cancel')) this.closeModes();
      else {
        this.modeMenu?.update();
        this.describeMode?.();
      }
      return;
    }
    if (this.actions.justPressed('cancel')) {
      this.done = true;
      this.callbacks.onCancel();
      this.scene.stop();
      return;
    }
    this.list?.update();
  }

  private choose(classId: string): void {
    if (this.done || this.chosen !== null) return;
    this.chosen = classId;
    this.list?.setLocked(true);
    this.showModes();
  }

  /* ---------- Règle de mort (n°166) ---------- */

  private static readonly MODES: readonly { readonly id: GameMode; readonly label: string; readonly lines: readonly string[]; readonly color: number }[] = [
    {
      id: 'blessure',
      label: 'Blessure (conseillé)',
      color: PALETTE.parchemin,
      lines: ['Une unité tombée revient après le combat, blessée jusqu’au prochain repos à l’auberge (−10 % aux stats, −2 Mob).'],
    },
    {
      id: 'classique',
      label: 'Classique : mort définitive',
      color: PALETTE.rougeCendre,
      lines: [
        'Une unité tombée est perdue pour toujours, avec ses niveaux. Une recrue perdue coûte 3 de réputation à son village.',
        'Le héros ne meurt jamais : sa chute est une défaite, comme en Blessure.',
      ],
    },
  ];

  private showModes(): void {
    const S = this.S;
    const { width, height } = this.scale;
    const w = 600 * S;
    const h = 250 * S;
    const x = Math.round((width - w) / 2);
    const y = Math.round((height - h) / 2);
    const depth = 20;
    const dim = this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.7).setOrigin(0, 0).setDepth(depth).setInteractive();
    const panel = drawPanel(this, x, y, w, h, { scale: 2 * S, fillAlpha: 0.98 }).setDepth(depth + 1);
    const title = addText(this, width / 2, y + 14 * S, 'CHOISIS TA RÈGLE', { font: 'body', scale: S, color: PALETTE.lumiereDoree, align: 'center' }).setDepth(depth + 2);
    const sub = addText(this, width / 2, y + 38 * S, 'Ce que devient une unité tombée au combat. Ce choix vaut pour toute la partie.', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(depth + 2);
    const explain = addText(this, x + 24 * S, y + 128 * S, '', { scale: S, color: PALETTE.parchemin, maxWidth: w - 48 * S }).setDepth(depth + 2);
    const hint = addText(this, width / 2, y + h - 24 * S, 'Entrée : commencer    Échap : changer de classe', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(depth + 2);
    this.modeParts = [dim, panel, title, sub, explain, hint];
    const modes = ClassSelectScene.MODES;
    this.modeMenu = new VerticalMenu(
      this,
      x + 24 * S,
      y + 64 * S,
      modes.map((m) => ({ label: m.label, onSelect: () => this.start(m.id) })),
      this.actions,
      { width: w - 48 * S, lineHeight: 26 * S, depth: depth + 2, scale: S, textScale: S },
    );
    const describe = (): void => {
      const mode = modes[this.modeMenu?.selected ?? 0];
      if (!mode) return;
      explain.setText(mode.lines.join('\n'));
      explain.setTint(mode.color === PALETTE.rougeCendre ? PALETTE.ocreClair : PALETTE.parchemin);
    };
    describe();
    this.describeMode = describe;
    this.actions.consume('confirm');
  }

  private closeModes(): void {
    this.modeMenu?.destroy();
    this.modeMenu = null;
    for (const p of this.modeParts) p.destroy();
    this.modeParts = [];
    this.describeMode = null;
    this.chosen = null;
    this.list?.setLocked(false);
  }

  private start(mode: GameMode): void {
    if (this.done || this.chosen === null) return;
    this.done = true;
    this.modeMenu?.setLocked(true);
    this.callbacks.onChoose(this.chosen, mode);
  }

  /** Fiche de la classe survolée. */
  private showClass(cls: ClassDef): void {
    for (const part of this.detail) part.destroy();
    this.detail = [];
    const S = this.S;
    const { width, height } = this.scale;
    const x = 324 * S;
    const y = 70 * S;
    const w = width - x - 20 * S;
    const h = height - y - 32 * S;
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.detail.push(obj);
      return obj;
    };
    add(drawPanel(this, x, y, w, h, { scale: 2 * S }));
    const level = this.data_.company.hero.level;
    const face = portraitInBox(this, 'heros', x + 14 * S, y + 14 * S, 72 * S, 72 * S, S, 1);
    if (face) add(face);
    const element = cls.element ? this.data_.elements.find((e) => e.id === cls.element) : null;
    const ex = x + 100 * S;
    add(addText(this, ex, y + 12 * S, cls.name, { font: 'body', scale: S, color: PALETTE.lumiereDoree }));
    add(addText(this, ex, y + 34 * S, `${ROLE_LABELS[cls.role]}${element ? ` · élément ${element.name}` : ''} · armure ${cls.armor === 'lourde' ? 'lourde' : 'légère'}`, { scale: S, color: PALETTE.cyanEclat }));
    add(addText(this, ex, y + 52 * S, cls.description, { scale: S, color: PALETTE.parchemin, maxWidth: w - 114 * S }));

    let cy = y + 98 * S;
    const line = (label: string, text: string, color: number = PALETTE.parchemin): void => {
      add(addText(this, x + 14 * S, cy, label, { scale: S, color: PALETTE.metalClair }));
      const t = add(addText(this, x + 104 * S, cy, text, { scale: S, color, maxWidth: w - 118 * S }));
      cy += Math.max(18 * S, t.height + 4 * S);
    };
    const weapon = this.data_.weapons.find((wp) => wp.id === cls.startingWeapon);
    const range = cls.weapon.range[0] === cls.weapon.range[1] ? `${cls.weapon.range[0]}` : `${cls.weapon.range[0]}-${cls.weapon.range[1]}`;
    line('Arme', `${weapon?.name ?? cls.weapon.name} · portée ${range} · dégâts ${cls.weapon.damage === 'magique' ? 'magiques' : 'physiques'}`, PALETTE.ocreClair);
    const skill = this.data_.skills.find((s) => s.owner === cls.id);
    if (skill) {
      const cost = skill.cost.resonance !== undefined ? `${skill.cost.resonance} Résonance` : skill.cost.resource ? `${skill.cost.resource.amount} ${cls.resource?.name ?? skill.cost.resource.id}` : '';
      line('Signature', `${skill.name} (${cost}) : ${skill.description}`, PALETTE.lumiereDoree);
    }
    line('Évolutions', cls.evolutions.map((e) => e.name).join(' · '), PALETTE.parchemin);

    // Stats au niveau de départ et croissances.
    cy += 26 * S;
    const stats = statsAtLevel(cls.baseStats, cls.growths, level);
    add(addText(this, x + 14 * S, cy, `Niveau ${level}`, { scale: S, color: PALETTE.metalClair }));
    add(addText(this, x + 14 * S, cy + 20 * S, 'Croissance', { scale: S, color: PALETTE.metalClair }));
    const colW = (w - 118 * S) / STAT_KEYS.length;
    STAT_KEYS.forEach((key, i) => {
      const cx = x + 104 * S + i * colW;
      add(addText(this, cx + colW / 2, cy - 18 * S, STAT_SHORT[key], { scale: S, color: PALETTE.metalClair, align: 'center' }));
      add(addText(this, cx + colW / 2, cy, `${stats[key]}`, { scale: S, color: PALETTE.parchemin, align: 'center' }));
      if ((GROWTH_KEYS as readonly string[]).includes(key)) {
        const g = cls.growths[key as (typeof GROWTH_KEYS)[number]];
        add(addText(this, cx + colW / 2, cy + 20 * S, `${g}%`, { scale: S, color: g >= 60 ? 0x7fcf6a : g >= 35 ? PALETTE.parchemin : PALETTE.metalClair, align: 'center' }));
      }
    });
  }
}
