#!/usr/bin/env node
// Computes objective PASS/FAIL for three closing-payoff gates over the closing window.
// Reuses PNG decode + luminance helpers from hook-metrics.mjs and edge-density from
// legibility-metrics.mjs — no logic is duplicated between the three modules.
//
// Gates:
//   P1 — Payoff presence & dwell (HARD): within the closing window, at least one
//         sustained hold exists where edge density > EDGE_DENSITY_THRESHOLD AND
//         temporal delta < HOLD_DELTA_THRESHOLD for >= MIN_PAYOFF_DWELL frames.
//         Fails only when the window ends on a bare/animating frame with no settled
//         identity card — the autonomy guard the human checklist currently provides.
//   P2 — Final-frame end-card legibility (HARD): the very last frame clears the
//         empty-frame edge floor (edge density > EDGE_DENSITY_THRESHOLD) AND has
//         sufficient luminance contrast (stddev > CONTRAST_THRESHOLD) — the closing-
//         side mirror of hook gate-2 "frame-0 works as a thumbnail".
//   P3 — Closing stability (ADVISORY, SKIP-friendly): the last P3_STABLE_PAIRS+1
//         samples in the window are held steady (delta < HOLD_DELTA_THRESHOLD),
//         indicating the video ends on a settled state rather than mid-animation.
//         SKIPs when fewer than P3_STABLE_PAIRS+1 samples are available.
//
// Usage:
//   node scripts/payoff-metrics.mjs <f0.png> [f1.png ...] [options]
//   --step=N        frame-number gap between consecutive samples (default 3)
//   --fps=N         frames per second (default 30)
//   --window=S:E    absolute closing window (start:end frame numbers; metadata only)
//   --json          emit structured JSON verdict instead of human-readable table
//
// Exit code: 0 when all HARD gates pass or are skipped; non-zero on HARD FAIL.
// Advisory failures never affect the exit code.
//
// Thresholds calibrated conservatively (egregious-only, same philosophy as legibility):
//   EDGE_DENSITY_THRESHOLD = 0.30  — mirrors legibility-metrics.mjs; clears empty/bg frames.
//   HOLD_DELTA_THRESHOLD   = 0.50  — mirrors legibility-metrics.mjs; below = held steady.
//   CONTRAST_THRESHOLD     = 5.0   — mirrors hook gate-2 luminance-stddev floor.
//   MIN_PAYOFF_DWELL       = 12    — 0.4s @ 30fps; at step=3 needs 3 hold pairs.
//   P3_STABLE_PAIRS        = 2     — last 2 pairs must be held; skips on < 3 samples.

import { fileURLToPath } from 'node:url';
import { meanAbsDelta, toLuminance, stddev, loadFrame } from './hook-metrics.mjs';
import { edgeDensity, EDGE_DENSITY_THRESHOLD } from './legibility-metrics.mjs';

const HOLD_DELTA_THRESHOLD = 0.50;
const CONTRAST_THRESHOLD   = 5.0;
const MIN_PAYOFF_DWELL     = 12;
const P3_STABLE_PAIRS      = 2;

/**
 * Pure computation: evaluate the three closing-payoff gates.
 *
 * @param {Array<{width:number,height:number,channels:number,pixels:Buffer}|null>} frames
 *   Decoded PNG images in sample order (the closing window). null entries are skipped.
 * @param {object} opts
 * @param {number} [opts.step=3]  — frame-number gap between consecutive samples
 * @param {number} [opts.fps=30]  — video fps
 * @returns {{ gates: Array, summary: object, hardGatesPass: boolean }}
 */
export function computePayoffMetrics(frames, { step = 3, fps = 30 } = {}) {
  const N     = frames.length;
  const gates = [];

  if (N === 0) {
    const skipReason = 'no frames provided';
    for (const [id, name, hard, advisory] of [
      [1, 'Payoff presence & dwell', true,  false],
      [2, 'Final-frame legibility',  true,  false],
      [3, 'Closing stability',       false, true],
    ]) {
      gates.push({ id, name, hard, advisory, pass: false, skip: true,
                   measured: null, threshold: null, skipReason });
    }
    return {
      gates,
      summary: { passed: 0, failed: 0, skipped: 3, samples: 0, step },
      hardGatesPass: true,
    };
  }

  // Lazy luminance + edge-density cache
  const lumCache = new Array(N).fill(null);
  const edCache  = new Array(N).fill(null);

  function getLum(i) {
    if (lumCache[i] === null && frames[i] !== null) lumCache[i] = toLuminance(frames[i]);
    return lumCache[i];
  }

  function getEd(i) {
    if (edCache[i] === null) {
      const lum = getLum(i);
      if (lum && frames[i]) edCache[i] = edgeDensity(lum, frames[i].width, frames[i].height);
    }
    return edCache[i];
  }

  // Per-pair temporal delta (null when either frame missing)
  const deltas = new Array(Math.max(0, N - 1)).fill(null);
  for (let i = 0; i < N - 1; i++) {
    const a = getLum(i);
    const b = getLum(i + 1);
    if (a && b) deltas[i] = meanAbsDelta(a, b);
  }

  // ── Find hold runs ────────────────────────────────────────────────────────
  // A "hold pair" at index i: edgeDensity(frame[i]) > EDGE_DENSITY_THRESHOLD
  // AND delta[i] < HOLD_DELTA_THRESHOLD AND neither frame is null.
  const holdRuns = [];
  let runStart   = null;

  for (let i = 0; i < N - 1; i++) {
    const ed    = getEd(i);
    const delta = deltas[i];

    const isHoldPair = (
      ed !== null &&
      delta !== null &&
      ed    > EDGE_DENSITY_THRESHOLD &&
      delta < HOLD_DELTA_THRESHOLD
    );

    if (isHoldPair) {
      if (runStart === null) runStart = i;
    } else {
      if (runStart !== null) {
        holdRuns.push({ start: runStart, end: i - 1 });
        runStart = null;
      }
    }
  }
  if (runStart !== null) holdRuns.push({ start: runStart, end: N - 2 });

  const annotatedRuns = holdRuns.map(run => {
    const runLength   = run.end - run.start + 1;
    const dwellFrames = (runLength + 1) * step;
    return { ...run, dwellFrames };
  });

  // ── P1: Payoff presence & dwell (HARD) ───────────────────────────────────
  if (N < 2) {
    gates.push({
      id: 1, name: 'Payoff presence & dwell', hard: true, advisory: false,
      pass: false, skip: true, measured: null,
      threshold: { minPayoffDwellFrames: MIN_PAYOFF_DWELL, edgeThreshold: EDGE_DENSITY_THRESHOLD,
                   holdThreshold: HOLD_DELTA_THRESHOLD },
      skipReason: 'fewer than 2 frames provided',
    });
  } else {
    const maxDwell  = annotatedRuns.length > 0
      ? Math.max(...annotatedRuns.map(r => r.dwellFrames))
      : 0;
    const pass      = maxDwell >= MIN_PAYOFF_DWELL;
    gates.push({
      id: 1, name: 'Payoff presence & dwell', hard: true, advisory: false,
      pass, skip: false,
      measured: {
        holdRuns:    annotatedRuns.length,
        maxDwellFrames: maxDwell,
        ...(annotatedRuns.length > 0
          ? { longestRunStart: annotatedRuns.reduce((b, r) => r.dwellFrames > b.dwellFrames ? r : b).start * step }
          : {}),
      },
      threshold: { minPayoffDwellFrames: MIN_PAYOFF_DWELL, edgeThreshold: EDGE_DENSITY_THRESHOLD,
                   holdThreshold: HOLD_DELTA_THRESHOLD },
    });
  }

  // ── P2: Final-frame end-card legibility (HARD) ───────────────────────────
  const lastIdx   = N - 1;
  const lastFrame = frames[lastIdx];
  const lastLum   = lastFrame ? getLum(lastIdx) : null;

  if (!lastLum) {
    gates.push({
      id: 2, name: 'Final-frame legibility', hard: true, advisory: false,
      pass: false, skip: true, measured: null,
      threshold: { edgeThreshold: EDGE_DENSITY_THRESHOLD, contrastThreshold: CONTRAST_THRESHOLD },
      skipReason: 'last frame missing or unreadable',
    });
  } else {
    const ed        = getEd(lastIdx);
    const contrast  = stddev(lastLum);
    const pass      = ed > EDGE_DENSITY_THRESHOLD && contrast > CONTRAST_THRESHOLD;
    gates.push({
      id: 2, name: 'Final-frame legibility', hard: true, advisory: false,
      pass, skip: false,
      measured: {
        edgeDensity:  +ed.toFixed(4),
        contrast:     +contrast.toFixed(2),
      },
      threshold: { edgeThreshold: EDGE_DENSITY_THRESHOLD, contrastThreshold: CONTRAST_THRESHOLD },
    });
  }

  // ── P3: Closing stability (ADVISORY, SKIP-friendly) ───────────────────────
  // Requires P3_STABLE_PAIRS+1 samples at the tail of the window.
  const p3Need = P3_STABLE_PAIRS + 1;
  if (N < p3Need) {
    gates.push({
      id: 3, name: 'Closing stability', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { stablePairs: P3_STABLE_PAIRS, holdThreshold: HOLD_DELTA_THRESHOLD },
      skipReason: `fewer than ${p3Need} samples — cannot evaluate end stability`,
    });
  } else {
    const tailStart = N - 1 - P3_STABLE_PAIRS;
    const tailPairs = deltas.slice(tailStart, tailStart + P3_STABLE_PAIRS);
    const stable    = tailPairs.every(d => d !== null && d < HOLD_DELTA_THRESHOLD);
    const maxTailDelta = tailPairs
      .filter(d => d !== null)
      .reduce((m, d) => Math.max(m, d), 0);
    gates.push({
      id: 3, name: 'Closing stability', hard: false, advisory: true,
      pass: stable, skip: false,
      measured: {
        tailPairsChecked: tailPairs.length,
        maxTailDelta:     +maxTailDelta.toFixed(4),
        stable,
      },
      threshold: { stablePairs: P3_STABLE_PAIRS, holdThreshold: HOLD_DELTA_THRESHOLD },
    });
  }

  const hardGatesPass    = gates.filter(g => g.hard).every(g => g.skip || g.pass);
  const advisoryFailures = gates.filter(g => g.advisory && !g.skip && !g.pass).map(g => g.name);

  const summary = {
    passed:            gates.filter(g => !g.skip &&  g.pass).length,
    failed:            gates.filter(g => !g.skip && !g.pass).length,
    skipped:           gates.filter(g =>  g.skip).length,
    samples:           N,
    step,
    holdRuns:          annotatedRuns.length,
    advisoryFailures,
  };

  return { gates, summary, hardGatesPass };
}

function printHumanReadable({ gates, summary }) {
  console.log('\n── Payoff pixel metrics ────────────────────────────────────');
  console.log(`   ${summary.samples} samples · step=${summary.step} · holdRuns=${summary.holdRuns}`);
  for (const gate of gates) {
    const adv    = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');

    if (gate.skip) {
      console.log(`${gate.name.padEnd(28)} ${status}  (${gate.skipReason})${adv}`);
      continue;
    }

    switch (gate.id) {
      case 1: {
        const { holdRuns, maxDwellFrames } = gate.measured;
        console.log(`Payoff presence & dwell      ${status}  runs=${holdRuns} maxDwell=${maxDwellFrames}f (threshold ≥${gate.threshold.minPayoffDwellFrames}f, edge>${gate.threshold.edgeThreshold})`);
        break;
      }
      case 2: {
        const { edgeDensity: ed, contrast } = gate.measured;
        console.log(`Final-frame legibility       ${status}  edge=${ed.toFixed(3)} contrast=${contrast.toFixed(2)} (threshold edge>${gate.threshold.edgeThreshold} contrast>${gate.threshold.contrastThreshold})`);
        break;
      }
      case 3: {
        const { tailPairsChecked, maxTailDelta, stable } = gate.measured;
        console.log(`Closing stability            ${status}  pairs=${tailPairsChecked} maxDelta=${maxTailDelta.toFixed(3)} stable=${stable} (threshold delta<${gate.threshold.holdThreshold})${adv}`);
        break;
      }
    }
  }
  console.log('───────────────────────────────────────────────────────────\n');
}

// CLI — only runs when this file is the entry point, not when imported.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args       = process.argv.slice(2);
  const jsonMode   = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));

  function getOpt(name, def) {
    const flag = args.find(a => a.startsWith(`--${name}=`));
    return flag ? flag.slice(name.length + 3) : def;
  }

  const step = parseInt(getOpt('step', '3'),  10);
  const fps  = parseInt(getOpt('fps',  '30'), 10);

  if (positional.length < 1) {
    process.stderr.write(
      'Usage: node scripts/payoff-metrics.mjs <f0.png> [f1.png ...] [--step=3] [--fps=30] [--window=S:E] [--json]\n',
    );
    process.exit(1);
  }

  const frames = positional.map(p => loadFrame(p));
  const verdict = computePayoffMetrics(frames, { step, fps });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
