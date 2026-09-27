/**
 * The page's only script entry: DOM side of the shell. Reads the manifest inlined at build
 * time, tracks the layout mode on <html>, runs the loading screen and boots the game.
 */
import type { RuntimeManifest } from '../assets/runtime';
import { boot } from '../game/boot';
import { getLang } from '../i18n/lang';
import { bus } from '../shared/bus';
import { isDebug } from '../shared/debug';
import { watchLayoutMode } from '../shared/layout-mode';
import { mountDebugOverlay } from './debug-overlay';
import { loadFonts } from './fonts';
import { mountLoading } from './loading';
import { mountPad } from './pad';
import { mountPanels } from './panels';
import { forwardWheel } from './wheel';

function readManifest(): RuntimeManifest | null {
  try {
    return JSON.parse(
      document.getElementById('assets')?.textContent ?? 'null'
    ) as RuntimeManifest | null;
  } catch {
    return null;
  }
}

const html = document.documentElement;
const screen = document.getElementById('screen');
const loading = document.getElementById('loading');
const panels = document.getElementById('panels');
const hud = document.getElementById('hud');
const pad = document.getElementById('pad');
const debug = isDebug();

watchLayoutMode((mode) => (html.dataset.mode = mode));
// The pre-paint script already applied the language; announce it for canvas text.
bus.emit('lang:change', { lang: getLang() });
if (loading) mountLoading(loading);
const panelsApi = panels && hud ? mountPanels(panels, hud) : null;
// Always body-level, never inside #hud: #hud sets its own z-index (a stacking context ceiling),
// which would otherwise trap this fixed-position overlay below the pad (BACKLOG.md Phase 6)
// regardless of its own z-index.
if (debug) mountDebugOverlay(document.body);
if (pad) mountPad(pad, { onClose: () => panelsApi?.closeTopmost() ?? false });
forwardWheel();
void loadFonts();
if (screen) void boot({ parent: screen, manifest: readManifest(), debug });
