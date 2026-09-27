import { describe, expect, it, vi } from 'vitest';
import { Bus } from './bus';

describe('bus', () => {
  it('delivers typed payloads and unsubscribes', () => {
    const bus = new Bus();
    const fn = vi.fn();
    const off = bus.on('game:progress', fn);
    bus.emit('game:progress', { progress: 0.5 });
    off();
    bus.emit('game:progress', { progress: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ progress: 0.5 });
  });

  it('replays the last payload to late subscribers only when asked', () => {
    const bus = new Bus();
    bus.emit('fonts:ready', {});
    const plain = vi.fn();
    const replayed = vi.fn();
    bus.on('fonts:ready', plain);
    bus.on('fonts:ready', replayed, { replay: true });
    expect(plain).not.toHaveBeenCalled();
    expect(replayed).toHaveBeenCalledOnce();
  });

  it('once fires a single time, also when replayed', () => {
    const bus = new Bus();
    bus.emit('lang:change', { lang: 'en' });
    const fn = vi.fn();
    bus.once('lang:change', fn, { replay: true });
    bus.emit('lang:change', { lang: 'es' });
    expect(fn).toHaveBeenCalledExactlyOnceWith({ lang: 'en' });
  });

  it('a handler removing itself does not skip the others', () => {
    const bus = new Bus();
    const second = vi.fn();
    const off = bus.on('ui:modal', () => off());
    bus.on('ui:modal', second);
    bus.emit('ui:modal', { open: true });
    expect(second).toHaveBeenCalledOnce();
  });
});
