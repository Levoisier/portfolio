/**
 * Scene interface — every scroll scene must satisfy this contract.
 *
 * To add a new scene:
 *   1. Create src/scripts/scroll/scenes/<name>.ts
 *   2. Implement Scene and export a default factory: () => Scene
 *   3. Register in controller.ts registry — do NOT modify the controller core.
 */
export interface Scene {
  /** Called once on mount after ScrollTrigger is ready. */
  init(el: Element): void;

  /** Called when the section enters the viewport (ScrollTrigger onEnter). */
  enter(): void;

  /** Called when the section leaves the viewport (ScrollTrigger onLeave). */
  leave(): void;

  /**
   * Called on every scroll tick while the section is active.
   * @param p — normalised progress 0→1 within this section's pin range.
   */
  progress(p: number): void;

  /** Called on resize / cleanup. Revert GSAP state if needed. */
  destroy(): void;
}

/** Factory signature — every scene module exports a default matching this. */
export type SceneFactory = (el: Element) => Scene;

/** Internal registry entry */
export interface RegistryEntry {
  sceneId: string;
  factory: SceneFactory;
}
