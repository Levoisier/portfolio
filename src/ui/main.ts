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
const debug = isDebug();

watchLayoutMode((mode) => (html.dataset.mode = mode));
// The pre-paint script already applied the language; announce it for canvas text.
bus.emit('lang:change', { lang: getLang() });
if (loading) mountLoading(loading);
if (debug) mountDebugOverlay(document.getElementById('hud') ?? document.body);
void loadFonts();
if (screen) void boot({ parent: screen, manifest: readManifest(), debug });
