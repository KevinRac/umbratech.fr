/**
 * Ennemis du monde ouvert à l'écran (jalon M3) : le sprite d'unité (silhouette
 * du combat, couleur rouge cendre du camp ennemi), son ombre, l'indicateur de
 * difficulté (GDD §7.5) et les bulles « ! » / « ? ». Aucune règle ici : l'état
 * vient de `FoeSim` (logic/world/foes.ts).
 */
import Phaser from 'phaser';
import { foeFacing, isHidden, type FoeSim } from '../logic/world/foes';
import { spritePose } from '../logic/world/movement';
import { BATTLE_TEX, ensureMapSprite } from './battleTextures';
import { FOE_TEX, ensureFoeTextures } from './foeTextures';

export interface FoeLook {
  readonly color: number;
  readonly boss: boolean;
  /** Zone de vision à marcher (pixels, degrés) : cône et/ou cercle. Rien pour les ennemis qui n'ont pas de vue (embuscade, boss). */
  readonly vision?: { readonly circle: number; readonly cone: number; readonly coneAngle: number } | null;
}

export class FoeActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly skull: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly zone: Phaser.GameObjects.Graphics;
  private bubbleUntil = 0;
  private lastKey = '';
  private readonly phase: number;

  constructor(
    scene: Phaser.Scene,
    readonly sim: FoeSim,
    private readonly spriteId: string,
    private readonly look: FoeLook,
    private readonly depth: { entities: number; marker: number; shadow: number },
  ) {
    ensureFoeTextures(scene);
    ensureMapSprite(scene, spriteId, 'enemy');
    this.phase = (sim.home.x * 7 + sim.home.y * 13) % 900;
    const boss = look.boss;
    this.shadow = scene.add.image(sim.x, sim.y, boss ? FOE_TEX.shadowBig : 'world:shadow').setDepth(depth.shadow);
    this.sprite = scene.add.sprite(sim.x, sim.y + 2, BATTLE_TEX.ms(spriteId, 'enemy'), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1);
    if (boss) this.sprite.setScale(1.15);
    this.skull = scene.add.image(sim.x, sim.y - 36, FOE_TEX.skull).setDepth(depth.marker).setTint(look.color).setVisible(false);
    this.bubble = scene.add.image(sim.x, sim.y - 42, FOE_TEX.bang).setDepth(depth.marker + 0.01).setVisible(false);
    this.zone = scene.add.graphics().setDepth(depth.shadow + 0.05).setVisible(false);
  }

  /** Bulle au-dessus de la tête : « ! » (repéré) ou « ? » (piste perdue). */
  showBubble(kind: 'bang' | 'question', now: number, ms = 900): void {
    this.bubble.setTexture(kind === 'bang' ? FOE_TEX.bang : FOE_TEX.question);
    this.bubbleUntil = now + ms;
  }

  /** `indicator` : le crâne de difficulté est visible (ennemi assez proche, GDD §7.5). */
  sync(time: number, indicator: boolean): void {
    const sim = this.sim;
    const hidden = isHidden(sim);
    const x = Math.round(sim.x);
    const y = Math.round(sim.y);
    this.sprite.setVisible(!hidden);
    this.shadow.setVisible(!hidden);
    if (hidden) {
      this.zone.setVisible(false);
      this.skull.setVisible(false);
      this.bubble.setVisible(false);
      return;
    }
    const { pose, flipX } = spritePose(foeFacing(sim));
    const staticPose = !sim.moving && pose !== 'down';
    const key = sim.moving ? `walk:${pose}` : staticPose ? `static:${pose}` : 'idle';
    if (key !== this.lastKey) {
      this.lastKey = key;
      if (sim.moving) this.sprite.anims.play(BATTLE_TEX.msWalk(this.spriteId, 'enemy', pose), true);
      else if (staticPose) {
        // À l'arrêt de profil ou de dos (vigie qui guette) : la première image de marche, pour que le regard se lise.
        this.sprite.anims.stop();
        this.sprite.setFrame(BATTLE_TEX.msFrame(pose, 0));
      } else this.sprite.anims.play(BATTLE_TEX.msIdle(this.spriteId, 'enemy'), true);
    }
    this.sprite.setFlipX(flipX).setPosition(x, y + 2).setDepth(this.depth.entities + sim.y / 100000);
    this.shadow.setPosition(x, y - 1);
    const bob = Math.round(Math.sin((time + this.phase) / 300) * 1);
    const top = y - 38 - (this.look.boss ? 5 : 0);
    this.skull.setVisible(indicator && sim.mode !== 'flee').setPosition(x, top + bob);
    // Le « ! » reste affiché tant que l'ennemi donne l'alerte ou poursuit : on voit qu'on est repéré.
    const hunting = sim.mode === 'alert' || sim.mode === 'chase';
    if (hunting && time >= this.bubbleUntil) this.bubbleUntil = time + 1;
    const bubbleOn = time < this.bubbleUntil;
    if (hunting) this.bubble.setTexture(FOE_TEX.bang);
    const pulse = hunting ? 1 + 0.15 * Math.sin(time / 90) : 1;
    this.bubble.setVisible(bubbleOn).setPosition(x, top - (indicator ? 12 : 0)).setScale(pulse);
    this.drawVision(x, y, indicator, hunting);
    // La vigie alertée ou le poursuivant se tient « sur ses gardes » : léger sursaut.
    if (sim.mode === 'alert') this.sprite.setY(y + 2 - (Math.floor(time / 90) % 2));
  }

  /** Cône et cercle de vision à l'écran, comme dans un jeu d'infiltration : on sait où l'on est vu. */
  private drawVision(x: number, y: number, indicator: boolean, hunting: boolean): void {
    const v = this.look.vision;
    const sim = this.sim;
    const visible = v != null && indicator && sim.mode !== 'flee' && sim.mode !== 'dormant';
    this.zone.setVisible(visible);
    if (!visible || !v) return;
    const g = this.zone;
    g.clear();
    const color = hunting ? 0xff3a20 : 0xffb030;
    const fill = hunting ? 0.32 : 0.2;
    const feetY = y - 6;
    if (v.cone > 0) {
      const half = (v.coneAngle / 2) * (Math.PI / 180);
      g.fillStyle(color, fill);
      g.slice(x, feetY, v.cone, sim.aim - half, sim.aim + half, false);
      g.fillPath();
      g.lineStyle(1, color, hunting ? 0.9 : 0.5);
      g.beginPath();
      g.moveTo(x, feetY);
      g.lineTo(x + Math.cos(sim.aim - half) * v.cone, feetY + Math.sin(sim.aim - half) * v.cone);
      g.arc(x, feetY, v.cone, sim.aim - half, sim.aim + half, false);
      g.lineTo(x, feetY);
      g.strokePath();
    }
    if (v.circle > 0) {
      g.fillStyle(color, fill * 0.7);
      g.fillCircle(x, feetY, v.circle);
      g.lineStyle(1, color, hunting ? 0.9 : 0.45);
      g.strokeCircle(x, feetY, v.circle);
    }
  }

  destroy(): void {
    this.zone.destroy();
    this.sprite.destroy();
    this.shadow.destroy();
    this.skull.destroy();
    this.bubble.destroy();
  }
}
