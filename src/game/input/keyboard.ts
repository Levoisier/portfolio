/**
 * Keyboard source: a thin adapter from Phaser's keys to the pure `KeyboardState`. It uses only
 * the scene it is given (no runtime Phaser import).
 */
import type Phaser from 'phaser';
import { NO_INTENT, type Intent } from './intent';
import { KEY_NAMES, KeyboardState, type KeyName } from './keyboard-state';

/** `Phaser.Core.Events.BLUR` and `Phaser.Scenes.Events.PAUSE / SLEEP` — Phaser resets its keys on
 * these without emitting 'up', so the state must forget them too or a key would stay held. */
const GAME_BLUR = 'blur';
const SCENE_RESETS = ['pause', 'sleep'] as const;

type KeyListener = (key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => void;

export class KeyboardSource {
  private readonly state = new KeyboardState();
  private readonly scene: Phaser.Scene;
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null;
  private readonly listeners: [Phaser.Input.Keyboard.Key, 'down' | 'up', KeyListener][] = [];
  private readonly forget = () => this.state.reset(performance.now());

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.keyboard = scene.input.keyboard;
    if (!this.keyboard) return;
    for (const code of KEY_NAMES) {
      // No capture: Phaser's capture preventDefaults on `window` and breaks DOM focus/activation.
      const key = this.keyboard.addKey(code, false);
      this.listen(key, 'down', this.forward(code, true));
      this.listen(key, 'up', this.forward(code, false));
    }
    scene.game.events.on(GAME_BLUR, this.forget);
    for (const event of SCENE_RESETS) scene.events.on(event, this.forget);
  }

  read(): Intent {
    return this.keyboard ? this.state.read() : { ...NO_INTENT };
  }

  /** Call on every `ui:modal` (ARCHITECTURE.md → Input → Modal gating). */
  setModal(open: boolean): void {
    // `performance.now()` shares `KeyboardEvent.timeStamp`'s clock.
    this.state.setModal(open, performance.now());
    if (!open) this.keyboard?.resetKeys();
  }

  destroy(): void {
    // Only our listeners: `addKey` returns a shared Key if another source registered the code.
    for (const [key, event, fn] of this.listeners.splice(0)) key.off(event, fn);
    this.scene.game.events.off(GAME_BLUR, this.forget);
    for (const event of SCENE_RESETS) this.scene.events.off(event, this.forget);
    this.state.reset();
  }

  private forward(code: KeyName, down: boolean): KeyListener {
    return (_key, event) =>
      this.state.handle({
        code,
        down,
        timeStamp: event.timeStamp,
        repeat: event.repeat,
        modified: event.ctrlKey || event.metaKey || event.altKey,
      });
  }

  private listen(key: Phaser.Input.Keyboard.Key, event: 'down' | 'up', fn: KeyListener): void {
    key.on(event, fn);
    this.listeners.push([key, event, fn]);
  }
}
