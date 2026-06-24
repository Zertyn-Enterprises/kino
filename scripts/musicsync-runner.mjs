#!/usr/bin/env node
// I/O runner for the musicsync gate.
// Loads a video's TypeScript timeline via esbuild bundle (same transform path as vitest),
// reads the analysis JSON (if any), runs computeMusicSync, and outputs the verdict.
// Used by scripts/musicsync.sh.
//
// Usage:
//   node scripts/musicsync-runner.mjs --timeline=<path> [--analysis=<path>] [--climax=F]
//     [--tol-bpm=0.02] [--tol-downbeat=1] [--tol-climax=3] [--tol-beat=1]
//     [--coverage-floor=0.90] [--json]
//
// --timeline    path to the video's timeline.ts (relative to cwd or absolute)
// --analysis    path to the .analysis.json produced by analyze-music.mjs (optional)
// --climax      declared climax cut frame (MS3 gate; optional)
// --json        emit JSON verdict to stdout instead of human-readable text
//
// Exit code: 0 when all HARD gates pass or skip; non-zero on HARD FAIL.

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMusicSync } from './musicsync-metrics.mjs';

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

function flag(name) {
  const found = args.find(a => a.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : null;
}

const timelinePath    = flag('--timeline');
const analysisPath    = flag('--analysis');
const climaxArg       = flag('--climax');
const climaxFrame     = climaxArg != null ? parseInt(climaxArg, 10) : null;

const tolerances = {};
const tolBpm      = flag('--tol-bpm');      if (tolBpm      != null) tolerances.bpmTolerance      = parseFloat(tolBpm);
const tolDownbeat = flag('--tol-downbeat'); if (tolDownbeat != null) tolerances.downbeatFrameTol  = parseInt(tolDownbeat, 10);
const tolClimaxF  = flag('--tol-climax');   if (tolClimaxF  != null) tolerances.climaxTolFrames   = parseInt(tolClimaxF,  10);
const tolBeat     = flag('--tol-beat');     if (tolBeat     != null) tolerances.cutBeatTolFrames  = parseInt(tolBeat,     10);
const covFloor    = flag('--coverage-floor'); if (covFloor  != null) tolerances.beatCoverageFloor = parseFloat(covFloor);

if (!timelinePath) {
  process.stderr.write(
    'Usage: node scripts/musicsync-runner.mjs --timeline=<path> [--analysis=<path>] [--climax=F] [--json]\n',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Detect music intent from source files (render-free)
//
// Returns true when the video's Main.tsx imports/uses MusicBed or references a
// music staticFile, or when public/<slug>/MANIFEST.md has an Audio section.
// sereno (no MusicBed, no track) → false.  relay/granipa (MusicBed + staticFile) → true.
// ---------------------------------------------------------------------------

function detectMusicIntent(timelinePath) {
  const absTimeline = resolve(process.cwd(), timelinePath);
  const slugDir     = dirname(absTimeline);
  const slug        = basename(slugDir);
  const mainTsxPath = join(slugDir, 'Main.tsx');
  const manifestPath = resolve(process.cwd(), `public/${slug}/MANIFEST.md`);

  if (existsSync(mainTsxPath)) {
    const source = readFileSync(mainTsxPath, 'utf8');
    if (source.includes('MusicBed') || /staticFile\([^)]*music/i.test(source)) {
      return true;
    }
  }

  if (existsSync(manifestPath)) {
    const manifest = readFileSync(manifestPath, 'utf8');
    if (/^#{1,6}\s+Audio/im.test(manifest)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Load and bundle the TypeScript timeline via esbuild
// ---------------------------------------------------------------------------
// This mirrors the transpile path that vitest uses (both rely on esbuild)
// so timeline values are always derived from source, never hardcoded.
//
// firstDownbeatSec: the Timeline type does not expose this field (it is closed
// over inside beatFrame()). We recover it as tl.beatFrame(0) / tl.fps, which
// is exact when musicStartFrame === 0 (the current convention for all videos).

async function loadTimeline(tsPath) {
  const absPath  = resolve(process.cwd(), tsPath);
  const outFile  = join(tmpdir(), `musicsync-tl-${process.pid}.cjs`);
  try {
    await build({
      entryPoints: [absPath],
      bundle:      true,
      format:      'cjs',
      platform:    'node',
      outfile:     outFile,
      logLevel:    'error',
    });
    const req = createRequire(import.meta.url);
    const mod = req(outFile);
    // Find the *Timeline export (relayTimeline, granipaTimeline, etc.)
    const key = Object.keys(mod).find(
      k => k.endsWith('Timeline') && mod[k] !== null && typeof mod[k] === 'object',
    );
    if (!key) throw new Error(`No *Timeline export found in ${tsPath}. Exports: ${Object.keys(mod).join(', ')}`);
    const tl = mod[key];
    return {
      bpm:             tl.bpm,
      fps:             tl.fps,
      firstDownbeatSec: tl.beatFrame(0) / tl.fps,
      cutFrames:       tl.order.map(id => tl.scenes[id].cutFrame),
    };
  } finally {
    try { unlinkSync(outFile); } catch { /* temp file already gone */ }
  }
}

// ---------------------------------------------------------------------------
// Load analysis JSON (returns null when absent or unreadable — graceful SKIP)
// ---------------------------------------------------------------------------

function loadAnalysis(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Human-readable output
// ---------------------------------------------------------------------------

function printHumanReadable(verdict, slug) {
  const { gates, summary, hardGatesPass } = verdict;
  console.log('\n── Music-sync verdict ──────────────────────────────────────');
  for (const g of gates) {
    const status = g.status === 'unverified' ? 'UNVERIFIED'
      : g.skip ? 'SKIP'
      : (g.pass ? 'PASS' : 'FAIL');
    const label  = g.advisory ? '[advisory]' : '[HARD]    ';
    const detail = (g.skip || g.status === 'unverified')
      ? ` — ${g.skipReason}`
      : ` — ${JSON.stringify(g.measured)}`;
    console.log(`MS${g.id} ${g.name.padEnd(22)} ${label} ${status}${detail}`);
  }
  console.log('───────────────────────────────────────────────────────────');
  const unverifiedCount = summary.unverified ?? 0;
  console.log(
    `Summary  passed=${summary.passed} failed=${summary.failed} skipped=${summary.skipped}` +
    (unverifiedCount > 0 ? ` unverified=${unverifiedCount}` : '') +
    `  bpm=${summary.declaredBpm} fps=${summary.fps} cuts=${summary.totalCuts}`,
  );
  if (verdict.verdict === 'unverified') {
    const slugArg = slug || '<slug>';
    console.log(`\nMUSIC: UNVERIFIED (declared but unanalyzed — run \`node scripts/analyze-music.mjs ${slugArg}\`)`);
  }
  console.log(`HARD GATES: ${hardGatesPass ? 'PASS' : 'FAIL'}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const timeline = await loadTimeline(timelinePath);
const analysis = loadAnalysis(analysisPath);
const musicIntent = detectMusicIntent(timelinePath);
const slug = basename(dirname(resolve(process.cwd(), timelinePath)));

const verdict = computeMusicSync({ timeline, analysis, climaxFrame, tolerances, musicIntent });

if (jsonMode) {
  process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
} else {
  printHumanReadable(verdict, slug);
}

process.exit(verdict.hardGatesPass ? 0 : 1);
