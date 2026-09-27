/**
 * Procedural sound effects (DECISIONS.md → Audio): tiny Web Audio blips, no audio files, off by
 * default. The AudioContext is created on the first play after sound was switched on — the
 * toggle click is a user gesture, so browsers allow it; nothing ever autoplays.
 */
import { safeLocalStorage } from '../i18n/lang';
import { bus, type Events } from '../shared/bus';
import { readSoundOn } from '../shared/sound';

type Sfx = Events['sfx']['name'] | 'open' | 'close';

/** [start Hz, end Hz, duration s, oscillator type] per effect. */
const SOUNDS: Record<Sfx, [number, number, number, OscillatorType]> = {
  jump: [420, 820, 0.09, 'square'],
  bump: [180, 120, 0.08, 'square'],
  vault: [90, 45, 0.5, 'sawtooth'],
  open: [520, 780, 0.07, 'triangle'],
  close: [780, 520, 0.07, 'triangle'],
};
const VOLUME = 0.06;

export function mountAudio(): void {
  let on = readSoundOn(safeLocalStorage());
  let ctx: AudioContext | null = null;

  const play = (name: Sfx) => {
    if (!on) return;
    try {
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      const [from, to, dur, type] = SOUNDS[name];
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      gain.gain.setValueAtTime(VOLUME, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch {
      // No Web Audio: stay silent.
    }
  };

  bus.on('sound:toggle', ({ on: next }) => {
    on = next;
    if (on) play('open');
  });
  bus.on('sfx', ({ name }) => play(name));
  bus.on('ui:modal', ({ open }) => play(open ? 'open' : 'close'));
}
