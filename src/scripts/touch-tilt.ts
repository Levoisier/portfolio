/**
 * Device-tilt → `tilt:change` event bridge (mobile, touch-native).
 *
 * The desktop companion follows the cursor (mousemove). Touch devices have no
 * cursor, so this is the analog: it reads `deviceorientation` and dispatches a
 * normalized CustomEvent on `window` — mirroring the `scroll:progress` contract
 * (controller.ts) so consumers (companionMobile.ts, optionally the backdrop)
 * stay fully decoupled from the sensor wiring.
 *
 * detail: { x, y } each in [-1, 1] — x = left/right tilt, y = forward/back tilt.
 *
 * iOS 13+ requires DeviceOrientationEvent.requestPermission() from a user
 * gesture, so `requestTilt()` is meant to be called from the first tap on the
 * panda. Android / most browsers grant immediately. If sensors are unsupported
 * or permission is denied, everything no-ops silently (graceful degrade) and no
 * listener is ever attached (no idle battery cost).
 */

export const TILT_EVENT = 'tilt:change';

export interface TiltDetail {
  x: number; // left/right tilt, [-1, 1]
  y: number; // forward/back tilt, [-1, 1]
}

// iOS exposes a non-standard static requestPermission() on the constructor.
type PermissionState = 'granted' | 'denied' | 'default';
interface DeviceOrientationEventiOS {
  requestPermission?: () => Promise<PermissionState>;
}

// A phone is typically held tilted ~45° forward; treat that as the neutral y.
const NEUTRAL_BETA = 45;
const RANGE_DEG = 45; // ± this many degrees maps to the full [-1, 1] range.

let listening = false;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function onOrientation(event: DeviceOrientationEvent): void {
  const gamma = event.gamma ?? 0; // left/right, [-90, 90]
  const beta = event.beta ?? NEUTRAL_BETA; // front/back, [-180, 180]
  const x = clamp(gamma / RANGE_DEG, -1, 1);
  const y = clamp((beta - NEUTRAL_BETA) / RANGE_DEG, -1, 1);
  window.dispatchEvent(new CustomEvent<TiltDetail>(TILT_EVENT, { detail: { x, y } }));
}

function attach(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('deviceorientation', onOrientation, { passive: true });
}

/**
 * Request tilt access and start emitting `tilt:change`. Call from a user gesture
 * (iOS permission requirement). Idempotent; resolves true if tilt is active.
 */
export async function requestTilt(): Promise<boolean> {
  if (listening) return true;
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;

  const ctor = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
  if (typeof ctor.requestPermission === 'function') {
    try {
      const state = await ctor.requestPermission();
      if (state !== 'granted') return false;
    } catch {
      return false; // user gesture missing or denied
    }
  }

  attach();
  return true;
}
