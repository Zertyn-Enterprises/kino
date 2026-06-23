#!/usr/bin/env node
// Evaluates the promise→payoff closure gate for a Remotion composition.
// Reuses PNG/grid machinery from hook-metrics.mjs (zero new deps).
//
// Usage: node scripts/payoff-closure-metrics.mjs <CompId> [<payoff-frame.png>] [--json] [--out-dir=<dir>]
//        --json        emit structured JSON instead of human-readable output
//        --out-dir=X   directory for payoff-closure.png (rendered if not yet present)
//
// Gates:
//   C1 payoffDeclared  (HARD)     — when promise != null, payoff MUST be non-null.
//                                   When promise == null → entire gate SKIPs.
//   C2 payoffLandsLate (HARD)     — payoff.frame > promise.frame AND in closing region:
//                                   payoff.frame >= climaxFrame when a climax is declared,
//                                   else payoff.frame >= floor(totalDurationInFrames * 0.75).
//   C3 payoffRendered  (ADVISORY) — central-band (rows 1–2 of 4×4 grid) luminance stddev
//                                   > threshold at payoff frame. Never affects exit code.
//
// Exit code: 0 when all HARD gates pass or are skipped; non-zero on any HARD gate FAIL.

import { computeGrid, toLuminance, loadFrame } from './hook-metrics.mjs';
import { loadTimeline } from './structure.mjs';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Matches CENTRAL_STDDEV_THRESHOLD in promise-metrics.mjs for consistency.
const CENTRAL_STDDEV_THRESHOLD = 10.0;

/**
 * Pure: evaluate all three closure gates.
 *
 * @param {object} opts
 * @param {{ text: string; frame: number; wordCount: number } | null} opts.promise
 * @param {{ text: string | null; frame: number } | null} opts.payoff
 * @param {number | null} opts.climaxFrame
 * @param {number} opts.totalDurationInFrames
 * @param {Object | null} [frameImg]  decoded PNG at the payoff frame (null → C3 skipped)
 * @returns {{ gates: Array, summary: object, hardGatesPass: boolean }}
 *
 * Each gate: { name, hard, advisory, pass, skip, measured, threshold, skipReason? }
 * hardGatesPass: true when all HARD gates pass or are skipped.
 */
export function evaluate(
  { promise, payoff, climaxFrame, totalDurationInFrames },
  frameImg = null,
) {
  const gates = [];

  // When promise == null: entire gate skips — no open loop to close.
  if (promise === null) {
    for (const [name, hard] of [
      ['payoffDeclared', true],
      ['payoffLandsLate', true],
      ['payoffRendered', false],
    ]) {
      gates.push({
        name, hard, advisory: !hard,
        pass: false, skip: true,
        measured: null, threshold: null,
        skipReason: 'no promise declared — closure gate skipped',
      });
    }
    return {
      gates,
      summary: { passed: 0, failed: 0, skipped: 3 },
      hardGatesPass: true,
    };
  }

  // --- C1: payoffDeclared (HARD) ---
  const payoffPresent = payoff !== null;
  gates.push({
    name: 'payoffDeclared', hard: true, advisory: false,
    pass: payoffPresent, skip: false,
    measured: payoff?.text ?? null,
    threshold: 'non-null payoff declaration',
  });

  // --- C2: payoffLandsLate (HARD) — skip when no payoff declared ---
  if (!payoffPresent) {
    gates.push({
      name: 'payoffLandsLate', hard: true, advisory: false,
      pass: false, skip: true,
      measured: null, threshold: null,
      skipReason: 'no payoff declared',
    });
  } else {
    const afterPromise = payoff.frame > promise.frame;
    const closingStart = climaxFrame != null
      ? climaxFrame
      : Math.floor(totalDurationInFrames * 0.75);
    const inClosingRegion = payoff.frame >= closingStart;
    const pass = afterPromise && inClosingRegion;
    gates.push({
      name: 'payoffLandsLate', hard: true, advisory: false,
      pass, skip: false,
      measured: { payoffFrame: payoff.frame, promiseFrame: promise.frame, closingStart },
      threshold: { afterPromise: true, inClosingRegion: true },
    });
  }

  // --- C3: payoffRendered (ADVISORY) — skip when no payoff or no frame image ---
  if (!payoffPresent || frameImg === null) {
    gates.push({
      name: 'payoffRendered', hard: false, advisory: true,
      pass: false, skip: true,
      measured: null,
      threshold: { minActiveCells: 1, cellThreshold: CENTRAL_STDDEV_THRESHOLD },
      skipReason: !payoffPresent ? 'no payoff declared' : 'payoff frame not rendered',
    });
  } else {
    const lum = toLuminance(frameImg);
    const grid = computeGrid(lum, null, frameImg.width, frameImg.height);
    const centralCells = grid.filter(c => c.row >= 1 && c.row <= 2);
    const activeCells = centralCells.filter(c => c.stddev0 > CENTRAL_STDDEV_THRESHOLD);
    gates.push({
      name: 'payoffRendered', hard: false, advisory: true,
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

function printHumanReadable({ gates }) {
  console.log('\n── Payoff closure metrics ──────────────────────────────────');
  for (const gate of gates) {
    const adv = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');
    if (gate.skip) {
      console.log(`${gate.name.padEnd(20)}${status}  (${gate.skipReason})${adv}`);
      continue;
    }
    switch (gate.name) {
      case 'payoffDeclared':
        console.log(`payoffDeclared      ${status}  text="${gate.measured ?? '(no text)'}"`);
        break;
      case 'payoffLandsLate': {
        const { payoffFrame, promiseFrame, closingStart } = gate.measured;
        const afterStr = payoffFrame > promiseFrame ? 'after-promise ✓' : 'after-promise ✗';
        const regionStr = payoffFrame >= closingStart ? 'closing-region ✓' : 'closing-region ✗';
        console.log(`payoffLandsLate     ${status}  payoff=${payoffFrame} promise=${promiseFrame} closingStart=${closingStart} (${afterStr}, ${regionStr})`);
        break;
      }
      case 'payoffRendered': {
        const { activeCells, totalCentralCells } = gate.measured;
        console.log(`payoffRendered      ${status}  activeCells=${activeCells}/${totalCentralCells} (threshold ≥1 cell stddev>${CENTRAL_STDDEV_THRESHOLD})${adv}`);
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
      'Usage: node scripts/payoff-closure-metrics.mjs <CompId> [<payoff-frame.png>] [--json] [--out-dir=<dir>]\n',
    );
    process.exit(1);
  }

  let promise = null;
  let payoff = null;
  let climaxFrame = null;
  let totalDurationInFrames = 0;

  try {
    const slug = resolveSlug(compId);
    const timeline = await loadTimeline(slug);
    promise = timeline.structure.promise;
    payoff = timeline.structure.payoff;
    climaxFrame = timeline.structure.climaxFrame;
    totalDurationInFrames = timeline.totalDurationInFrames;
  } catch (err) {
    process.stderr.write(`payoff-closure-metrics: failed to load timeline: ${err.message}\n`);
  }

  // Resolve PNG path: explicit arg takes priority, then --out-dir/payoff-closure.png
  const payoffPng = framePngArg ?? (outDir && payoff ? `${outDir}/payoff-closure.png` : null);

  // Render the payoff frame if we have a target path and a declared frame
  if (payoff != null && payoffPng) {
    try {
      execSync(
        `npx remotion still "${compId}" "${payoffPng}" --frame=${payoff.frame}`,
        { cwd: ROOT, stdio: 'pipe' },
      );
    } catch (err) {
      process.stderr.write(
        `payoff-closure-metrics: render frame ${payoff.frame} failed — payoffRendered will be SKIP\n`,
      );
    }
  }

  const frameImg = payoffPng ? loadFrame(payoffPng) : null;
  const result = evaluate({ promise, payoff, climaxFrame, totalDurationInFrames }, frameImg);

  if (jsonMode) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    printHumanReadable(result);
  }

  process.exit(result.hardGatesPass ? 0 : 1);
}
