#!/usr/bin/env node
// Evaluates the hook "Promise by 2.5s" gate for a Remotion composition.
// Reuses PNG/grid machinery from hook-metrics.mjs (zero new deps).
//
// Usage: node scripts/promise-metrics.mjs <CompId> [<promise-frame.png>] [--json] [--out-dir=<dir>]
//        --json        emit structured JSON instead of human-readable output
//        --out-dir=X   directory for promise.png (rendered if not yet present)
//
// Gates (1–3 HARD block on FAIL; 4 advisory, never affects exit code):
//   1. promiseDeclared  — promise field non-null and text non-empty
//   2. wordCount        — promise.wordCount <= 6
//   3. promiseFrame     — promise.frame <= round(2.5 * fps) (fps derived from timeline)
//   4. promiseRendered  — central band (rows 1–2 of 4×4 grid) luminance stddev > threshold
//                         in ≥1 cell (advisory — never affects exit code)
//
// Exit code: 0 when all HARD gates pass or are skipped; non-zero on any HARD gate FAIL.

import { computeGrid, toLuminance, loadFrame } from './hook-metrics.mjs';
import { loadStructure } from './structure.mjs';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Matches GRID_STDDEV_THRESHOLD in hook-metrics.mjs for consistency.
const CENTRAL_STDDEV_THRESHOLD = 10.0;

/**
 * Pure: evaluate all four promise gates.
 *
 * @param {{ promise: {text: string, frame: number, wordCount: number}|null, fps: number }} opts
 * @param {Object|null} frameImg  decoded PNG at the promise frame (null → promiseRendered skipped)
 * @returns {{ gates: Array, summary: Object, hardGatesPass: boolean }}
 *
 * Each gate: { name, hard, advisory, pass, skip, measured, threshold, skipReason? }
 * hardGatesPass: true when all HARD gates (1–3) pass or are skipped.
 */
export function evaluate({ promise, fps }, frameImg = null) {
  const frameThreshold = Math.round(2.5 * fps);
  const gates = [];
  const declared = promise != null && promise.text.trim().length > 0;

  // Gate 1: promiseDeclared (HARD)
  gates.push({
    name: 'promiseDeclared', hard: true, advisory: false,
    pass: declared, skip: false,
    measured: promise?.text ?? null, threshold: 'non-empty',
  });

  // Gate 2: wordCount <= 6 (HARD)
  if (!declared) {
    gates.push({
      name: 'wordCount', hard: true, advisory: false,
      pass: false, skip: true,
      measured: null, threshold: 6, skipReason: 'no promise declared',
    });
  } else {
    gates.push({
      name: 'wordCount', hard: true, advisory: false,
      pass: promise.wordCount <= 6, skip: false,
      measured: promise.wordCount, threshold: 6,
    });
  }

  // Gate 3: promiseFrame <= round(2.5 * fps) (HARD)
  if (!declared) {
    gates.push({
      name: 'promiseFrame', hard: true, advisory: false,
      pass: false, skip: true,
      measured: null, threshold: frameThreshold, skipReason: 'no promise declared',
    });
  } else {
    gates.push({
      name: 'promiseFrame', hard: true, advisory: false,
      pass: promise.frame <= frameThreshold, skip: false,
      measured: promise.frame, threshold: frameThreshold,
    });
  }

  // Gate 4: promiseRendered — central band (rows 1–2 of 4×4 grid) stddev check (ADVISORY)
  if (!declared || frameImg == null) {
    gates.push({
      name: 'promiseRendered', hard: false, advisory: true,
      pass: false, skip: true,
      measured: null,
      threshold: { minActiveCells: 1, cellThreshold: CENTRAL_STDDEV_THRESHOLD },
      skipReason: !declared ? 'no promise declared' : 'promise frame not rendered',
    });
  } else {
    const lum = toLuminance(frameImg);
    const grid = computeGrid(lum, null, frameImg.width, frameImg.height);
    const centralCells = grid.filter(c => c.row >= 1 && c.row <= 2);
    const activeCells = centralCells.filter(c => c.stddev0 > CENTRAL_STDDEV_THRESHOLD);
    gates.push({
      name: 'promiseRendered', hard: false, advisory: true,
      pass: activeCells.length >= 1, skip: false,
      measured: { activeCells: activeCells.length, totalCentralCells: centralCells.length },
      threshold: { minActiveCells: 1, cellThreshold: CENTRAL_STDDEV_THRESHOLD },
    });
  }

  const hardGatesPass = gates.filter(g => g.hard).every(g => g.skip || g.pass);
  const summary = {
    passed: gates.filter(g => !g.skip && g.pass).length,
    failed: gates.filter(g => !g.skip && !g.pass).length,
    skipped: gates.filter(g => g.skip).length,
  };

  return { gates, summary, hardGatesPass };
}

// ---------------------------------------------------------------------------
// Internal helpers (CLI only — not exported)
// ---------------------------------------------------------------------------

function resolveSlug(compId) {
  const src = readFileSync(join(ROOT, 'src/Root.tsx'), 'utf8');
  const blocks = src.split('<Composition');
  const block = blocks.find(b => b.includes(`id="${compId}"`));
  if (!block) throw new Error(`No <Composition id="${compId}"> in src/Root.tsx`);
  const durMatch = block.match(/durationInFrames=\{(\w+)\.totalDurationInFrames\}/);
  if (!durMatch) throw new Error(`Composition "${compId}" has no .totalDurationInFrames binding`);
  const timelineVar = durMatch[1];
  const importMatch = src.match(
    new RegExp(`import\\s*\\{[^}]*\\b${timelineVar}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`),
  );
  if (!importMatch) throw new Error(`Cannot find import for "${timelineVar}" in src/Root.tsx`);
  const parts = importMatch[1].replace(/\/timeline$/, '').split('/');
  return parts[parts.length - 1];
}

function resolveFps(slug) {
  const src = readFileSync(resolve(ROOT, 'src/videos', slug, 'timeline.ts'), 'utf8');
  const m = src.match(/buildTimeline\s*\(\s*\{[^}]*fps\s*:\s*(\d+)/s);
  return m ? parseInt(m[1], 10) : 30;
}

function printHumanReadable({ gates }, fps) {
  const frameThreshold = Math.round(2.5 * fps);
  console.log('\n── Promise metrics ─────────────────────────────────────────');
  for (const gate of gates) {
    const adv = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');
    if (gate.skip) {
      console.log(`${gate.name.padEnd(20)}${status}  (${gate.skipReason})${adv}`);
      continue;
    }
    switch (gate.name) {
      case 'promiseDeclared':
        console.log(`promiseDeclared     ${status}  text="${gate.measured}"`);
        break;
      case 'wordCount':
        console.log(`wordCount           ${status}  words=${gate.measured} (threshold ≤${gate.threshold})`);
        break;
      case 'promiseFrame':
        console.log(`promiseFrame        ${status}  frame=${gate.measured} (threshold ≤${frameThreshold}=round(2.5×${fps}fps))`);
        break;
      case 'promiseRendered': {
        const { activeCells, totalCentralCells } = gate.measured;
        console.log(`promiseRendered     ${status}  activeCells=${activeCells}/${totalCentralCells} (threshold ≥1 cell stddev>${CENTRAL_STDDEV_THRESHOLD})${adv}`);
        break;
      }
    }
  }
  console.log('────────────────────────────────────────────────────────────\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));
  const outDirArg = args.find(a => a.startsWith('--out-dir='));
  const outDir = outDirArg ? outDirArg.slice('--out-dir='.length) : null;
  const [compId, framePngArg] = positional;

  if (!compId) {
    process.stderr.write(
      'Usage: node scripts/promise-metrics.mjs <CompId> [<promise-frame.png>] [--json] [--out-dir=<dir>]\n',
    );
    process.exit(1);
  }

  let promise = null;
  let fps = 30;
  try {
    const slug = resolveSlug(compId);
    const structure = await loadStructure(slug);
    promise = structure.promise;
    fps = resolveFps(slug);
  } catch (err) {
    process.stderr.write(`promise-metrics: failed to load structure: ${err.message}\n`);
  }

  // Resolve PNG path: explicit arg takes priority, then --out-dir/promise.png
  const promisePng = framePngArg ?? (outDir && promise ? `${outDir}/promise.png` : null);

  // Render the promise frame if we have a target path and a declared frame
  if (promise != null && promisePng) {
    try {
      execSync(
        `npx remotion still "${compId}" "${promisePng}" --frame=${promise.frame}`,
        { cwd: ROOT, stdio: 'pipe' },
      );
    } catch (err) {
      process.stderr.write(
        `promise-metrics: render frame ${promise.frame} failed — promiseRendered will be SKIP\n`,
      );
    }
  }

  const frameImg = promisePng ? loadFrame(promisePng) : null;
  const result = evaluate({ promise, fps }, frameImg);

  if (jsonMode) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    printHumanReadable(result, fps);
  }

  process.exit(result.hardGatesPass ? 0 : 1);
}
