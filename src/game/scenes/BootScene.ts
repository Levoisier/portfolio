/** Loads the active tier's assets from the inlined manifest, reporting progress on the bus. */
import Phaser from 'phaser';
import { bus } from '../../shared/bus';
import { REGISTRY_KEY, type GameContext } from '../context';
import { loadPlan } from '../load-plan';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const ctx = this.registry.get(REGISTRY_KEY) as GameContext;
    for (const item of loadPlan(ctx.manifest, ctx.tier)) {
      if (item.type === 'spritesheet')
        this.load.spritesheet(item.key, item.url, {
          frameWidth: item.frameWidth,
          frameHeight: item.frameHeight,
        });
      else if (item.type === 'atlas') this.load.atlas(item.key, item.url, item.atlasUrl);
      else this.load.image(item.key, item.url);
    }
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) =>
      bus.emit('game:progress', { progress })
    );
  }

  create() {
    bus.emit('game:progress', { progress: 1 });
    this.scene.start('world');
  }
}
