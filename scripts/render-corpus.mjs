#!/usr/bin/env node
// Shared render corpus: renders a composition once as a full-timeline PNG sequence
// (scale 0.25, step 1) into a cache directory keyed by (CompId, props hash).
// Re-runs are idempotent — the corpus is reused when fresh.
//
// Exported pure functions (no I/O; testable):
//   canonicalizeProps(propsJson) → stable string
//   computePropsHash(compId, propsJson) → 12-char hex string
//   corpusDirFor(root, compId, propsHash) → directory path
//   buildManifest(compId, propsHash, durationFrames, entries) → manifest object
//   isManifestFresh(manifest, compId, propsHash, durationFrames) → boolean
//   sliceManifest(manifest, { step, start, end }) → string[] (absolute paths)
//
// CLI — build mode:
//   node scripts/render-corpus.mjs <CompId> [propsJson]
//   Renders corpus (or reuses cached), prints manifest path to stdout.
//
// CLI — list mode:
//   node scripts/render-corpus.mjs --list <manifestPath> [--step=N] [--window=S:E]
//   Prints selected frame paths (one per line) for gate consumption.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

const CORPUS_ROOT = 'out/corpus';
const SCALE = 0.25;
const STEP = 1;

// ---------------------------------------------------------------------------
// Pure helpers — no I/O, fully testable
// ---------------------------------------------------------------------------

/** Recursively sort object keys for stable JSON serialization. */
function sortKeys(val) {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return val;
  return Object.fromEntries(
    Object.entries(val)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortKeys(v)]),
  );
}

/**
 * Canonicalize a JSON props string for stable hashing.
 * Different key orderings of the same object produce the same canonical form.
 * Empty / absent props normalize to "{}".
 */
export function canonicalizeProps(propsJson) {
  if (!propsJson || propsJson.trim() === '') return '{}';
  return JSON.stringify(sortKeys(JSON.parse(propsJson)));
}

/**
 * Compute a stable 12-character hex cache key from (compId, propsJson).
 */
export function computePropsHash(compId, propsJson) {
  const input = `${compId}\0${canonicalizeProps(propsJson)}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

/**
 * Derive the corpus directory path for a given (root, compId, propsHash) triple.
 */
export function corpusDirFor(root, compId, propsHash) {
  return join(root, `${compId}-${propsHash}`);
}

/**
 * Build a manifest object from {frame, path} entries.
 * `frames` maps frame number (string key) → absolute file path.
 */
export function buildManifest(compId, propsHash, durationFrames, entries) {
  const frames = {};
  for (const { frame, path: p } of entries) {
    frames[String(frame)] = p;
  }
  return { compId, propsHash, durationFrames, scale: SCALE, step: STEP, frames };
}

/**
 * Return true iff the given manifest still represents a fresh corpus for
 * the supplied (compId, propsHash, durationFrames) combination.
 */
export function isManifestFresh(manifest, compId, propsHash, durationFrames) {
  return (
    manifest != null &&
    manifest.compId === compId &&
    manifest.propsHash === propsHash &&
    manifest.durationFrames === durationFrames &&
    manifest.scale === SCALE &&
    manifest.step === STEP
  );
}

/**
 * Slice a manifest to extract the frame paths a gate needs.
 *
 * @param {object} manifest - parsed manifest.json
 * @param {object} opts
 * @param {number} [opts.step=1] - frame sampling step
 * @param {number} [opts.start=0] - first frame (inclusive)
 * @param {number} [opts.end] - last frame (inclusive); defaults to durationFrames-1
 * @returns {string[]} absolute paths in ascending frame order
 */
export function sliceManifest(manifest, { step = 1, start = 0, end } = {}) {
  const last = end != null ? end : manifest.durationFrames - 1;
  const paths = [];
  for (let f = start; f <= last; f += step) {
    const p = manifest.frames[String(f)];
    if (p) paths.push(p);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  // --list mode: slice an existing manifest and print paths, one per line.
  if (args[0] === '--list') {
    const manifestPath = args[1];
    if (!manifestPath || !existsSync(manifestPath)) {
      process.stderr.write(`ERROR: manifest not found: ${manifestPath ?? '(not provided)'}\n`);
      process.exit(1);
    }
    let step = 1, start = 0, end;
    for (const a of args.slice(2)) {
      if (a.startsWith('--step=')) step = parseInt(a.slice('--step='.length), 10);
      if (a.startsWith('--window=')) {
        const [s, e] = a.slice('--window='.length).split(':').map(Number);
        start = s; end = e;
      }
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const paths = sliceManifest(manifest, { step, start, end });
    if (paths.length) process.stdout.write(paths.join('\n') + '\n');
    process.exit(0);
  }

  // Build mode: ensure corpus exists for <CompId>, print manifest path.
  const compId = args[0];
  const propsJson = args[1] || '';
  if (!compId) {
    process.stderr.write(
      'Usage:\n' +
      '  node scripts/render-corpus.mjs <CompId> [propsJson]\n' +
      '  node scripts/render-corpus.mjs --list <manifestPath> [--step=N] [--window=S:E]\n',
    );
    process.exit(1);
  }

  // Resolve duration via `npx remotion compositions`.
  const composResult = spawnSync('npx', ['remotion', 'compositions'], { encoding: 'utf8' });
  const composOutput = (composResult.stdout || '') + (composResult.stderr || '');
  let durationFrames = 0;
  for (const line of composOutput.split('\n')) {
    if (!line.trim().startsWith(compId + ' ') && !line.trim().startsWith(compId + '\t')) continue;
    const tokens = line.trim().split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      if (/^\d+x\d+$/.test(tokens[i]) && /^\d+$/.test(tokens[i + 1])) {
        durationFrames = parseInt(tokens[i + 1], 10);
        break;
      }
    }
    if (durationFrames) break;
  }
  if (!durationFrames) {
    process.stderr.write(`ERROR: could not determine duration for ${compId}\n`);
    process.exit(1);
  }

  const propsHash = computePropsHash(compId, propsJson);
  // relDir is relative (no dot-prefixed components) — safe for Remotion's CLI path check.
  // dir is the absolute path used for all file-system operations and manifest entries.
  const relDir = corpusDirFor(CORPUS_ROOT, compId, propsHash);
  const dir = resolve(relDir);
  const relFramesDir = join(relDir, 'frames');   // passed to Remotion CLI (no dots in path)
  const absFramesDir = join(dir, 'frames');      // used for fs reads/writes
  const manifestFile = join(dir, 'manifest.json');

  // Idempotency: skip render if a fresh corpus already exists.
  if (existsSync(manifestFile)) {
    try {
      const existing = JSON.parse(readFileSync(manifestFile, 'utf8'));
      if (isManifestFresh(existing, compId, propsHash, durationFrames)) {
        process.stderr.write(`Corpus: reusing ${manifestFile}\n`);
        process.stdout.write(manifestFile + '\n');
        process.exit(0);
      }
    } catch {
      // stale or corrupt — fall through to re-render
    }
  }

  // Render the full timeline at scale 0.25, step 1.
  // Use the relative path for the Remotion CLI so that Remotion's extension check
  // does not trip on dot-prefixed parent directories (e.g. .claude in worktrees).
  mkdirSync(absFramesDir, { recursive: true });
  const renderArgs = [
    'remotion', 'render', compId, relFramesDir,
    '--sequence', '--image-format=png',
    `--scale=${SCALE}`,
    `--every-nth-frame=${STEP}`,
    `--frames=0-${durationFrames - 1}`,
  ];
  if (propsJson) renderArgs.push(`--props=${propsJson}`);
  process.stderr.write(`Corpus: rendering ${compId} (${durationFrames} frames at scale ${SCALE})…\n`);
  // Route child stdout → stderr so render progress doesn't pollute this process's stdout
  // (which the shell captures via $(...) to obtain the manifest path).
  execFileSync('npx', renderArgs, { stdio: ['inherit', process.stderr, process.stderr] });

  // Collect rendered PNG files in frame order (file index i == frame number i with step=1).
  const pngFiles = readdirSync(absFramesDir)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const na = parseInt((a.match(/-(\d+)\.png$/) || ['', '0'])[1], 10);
      const nb = parseInt((b.match(/-(\d+)\.png$/) || ['', '0'])[1], 10);
      return na - nb;
    });

  const entries = pngFiles.map((f, i) => ({ frame: i, path: resolve(join(absFramesDir, f)) }));
  const manifest = buildManifest(compId, propsHash, durationFrames, entries);
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  process.stderr.write(`Corpus: wrote ${manifestFile} (${entries.length} frames)\n`);
  process.stdout.write(manifestFile + '\n');
}
