/**
 * `pnpm assets` — normalizes art/ into public/game/ (ARCHITECTURE.md → Asset pipeline).
 * Exits non-zero only for an invalid manifest or an internal error; `--strict` also fails on
 * warnings. Art quality never breaks the build: bad deliveries fall back and warn.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_MANIFEST } from '../../src/assets/registry.ts';
import type { RuntimeAsset, RuntimeManifest } from '../../src/assets/runtime.ts';
import { encodePng } from './lib/output.ts';
import { loadSheet, processEntry, type Slices } from './pipeline.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(root, 'public/game');
const CACHE = join(root, 'node_modules/.cache/portfolio-assets');
const REF = join(root, 'art/reference');
const strict = process.argv.includes('--strict');

const sha = (...parts: (string | Buffer)[]) => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest('hex');
};

/** Pipeline source files are part of every cache key, so code changes invalidate outputs. */
const codeHash = sha(
  ...[join(root, 'scripts/assets'), join(root, 'scripts/assets/lib')].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .sort()
      .map((f) => readFileSync(join(dir, f)))
  ),
  readFileSync(join(root, 'src/design/palette.json')),
  readFileSync(join(root, 'src/assets/runtime.ts'))
);

const slicesPath = join(REF, 'panda-sheet-v1.slices.json');
const slices = existsSync(slicesPath)
  ? (JSON.parse(readFileSync(slicesPath, 'utf8')) as Slices)
  : undefined;
const sheetPath = slices ? join(REF, slices.source) : '';
let sheet: ReturnType<typeof loadSheet> | undefined;

const rawPath = (id: string) => join(root, 'art/raw', `${id}.png`);

function sourceKey(id: string): string {
  const raw = rawPath(id);
  if (existsSync(raw)) return sha('raw', readFileSync(raw));
  if (slices?.strips[id]) return sha('ref', readFileSync(sheetPath), readFileSync(slicesPath));
  return 'none';
}

interface CacheEntry {
  key: string;
  runtime: RuntimeAsset;
  files: string[];
  report: Row;
}

interface Row {
  id: string;
  source: string;
  frames: string;
  deltaE: string;
  seam: string;
  warnings: string[];
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CACHE, { recursive: true });
  const assets: Record<string, RuntimeAsset> = {};
  const rows: Row[] = [];
  const keep = new Set<string>(['assets.json']);

  for (const entry of ASSET_MANIFEST.assets) {
    const key = sha(codeHash, JSON.stringify(entry), sourceKey(entry.id));
    const cachePath = join(CACHE, `${entry.id}.json`);
    const cached = existsSync(cachePath)
      ? (JSON.parse(readFileSync(cachePath, 'utf8')) as CacheEntry)
      : null;
    if (cached?.key === key && cached.files.every((f) => existsSync(join(OUT, f)))) {
      assets[entry.id] = cached.runtime;
      rows.push(cached.report);
      cached.files.forEach((f) => keep.add(f));
      continue;
    }

    const out = await processEntry(entry, {
      rawPath,
      slices,
      sheet: slices ? () => (sheet ??= loadSheet(sheetPath, slices)) : undefined,
    });
    const files: string[] = [];
    if (out.png) {
      writeFileSync(join(OUT, `${entry.id}.png`), await encodePng(out.png));
      files.push(`${entry.id}.png`);
    }
    if (out.atlasJson) {
      writeFileSync(join(OUT, `${entry.id}.json`), JSON.stringify(out.atlasJson, null, 2));
      files.push(`${entry.id}.json`);
    }
    const r = out.runtime;
    const report: Row = {
      id: entry.id,
      source: r.source,
      frames:
        r.source !== 'missing' && r.kind === 'strip' && entry.kind === 'strip'
          ? `${r.frames}/${entry.frames}`
          : '',
      deltaE: out.stats ? `${out.stats.meanDE.toFixed(3)} / ${out.stats.p95DE.toFixed(3)}` : '',
      seam: out.seam !== undefined ? out.seam.toFixed(3) : '',
      warnings: [
        ...r.warnings,
        ...(out.stats && out.stats.p95DE > 0.12 ? ['palette snap p95 ΔE > 0.12'] : []),
      ],
    };
    assets[entry.id] = r;
    rows.push(report);
    files.forEach((f) => keep.add(f));
    writeFileSync(
      cachePath,
      JSON.stringify({ key, runtime: r, files, report } satisfies CacheEntry)
    );
  }

  // Drop outputs of assets that no longer produce a file (e.g. an optional asset removed).
  for (const f of readdirSync(OUT)) if (!keep.has(f)) rmSync(join(OUT, f));

  const manifest: RuntimeManifest = {
    version: 1,
    hash: sha(...Object.values(assets).map((a) => JSON.stringify(a))),
    assets,
  };
  writeFileSync(join(OUT, 'assets.json'), JSON.stringify(manifest, null, 2) + '\n');

  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(
    `\n${pad('asset', 24)} ${pad('source', 12)} ${pad('frames', 7)} ${pad('ΔE mean/p95', 14)} ${pad('seam', 6)} warnings`
  );
  for (const r of rows) {
    const warn = r.warnings.filter((w) => w !== 'placeholder').join('; ');
    console.log(
      `${pad(r.id, 24)} ${pad(r.source, 12)} ${pad(r.frames, 7)} ${pad(r.deltaE, 14)} ${pad(r.seam, 6)} ${warn}`
    );
  }
  const counts = rows.reduce<Record<string, number>>(
    (c, r) => ((c[r.source] = (c[r.source] ?? 0) + 1), c),
    {}
  );
  console.log(
    `\n${Object.entries(counts)
      .map(([s, n]) => `${n} ${s}`)
      .join(' · ')} → public/game/assets.json\n`
  );

  const realWarnings = rows.flatMap((r) => r.warnings.filter((w) => w !== 'placeholder'));
  if (strict && realWarnings.length) {
    console.error(`--strict: ${realWarnings.length} warning(s)`);
    process.exitCode = 1;
  }
}

await main();
