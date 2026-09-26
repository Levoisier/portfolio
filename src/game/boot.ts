/**
 * Game entry for the UI. Deliberately free of Phaser: it waits for the first paint, then
 * lazy-loads main.ts (and with it the ~350 KB engine chunk).
 */
import type { RuntimeManifest } from '../assets/runtime';

export interface BootOptions {
  /** The #screen element the canvas mounts into. */
  parent: HTMLElement;
  manifest: RuntimeManifest | null;
  debug: boolean;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export async function boot(options: BootOptions): Promise<void> {
  // Two frames: the loading screen has been painted before the engine chunk is parsed.
  await nextFrame();
  await nextFrame();
  const { startGame } = await import('./main');
  startGame(options);
}
