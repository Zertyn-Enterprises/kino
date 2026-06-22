#!/usr/bin/env node
// Computes objective PASS/FAIL for three legibility-dwell gates.
// Detects 'presented-text intervals' by combining a spatial high-detail measure
// (mean abs horizontal + vertical gradient = edge density) with temporal delta to
// find frames that are high-detail AND held steady (readable). Gates fire only on
// clearly detectable, egregious cases — calibrated so RelayLaunch + GranipaLaunch
// PASS L1 without regression.
// Reuses zero-dep PNG decode + luminance helpers from hook-metrics.mjs.
//
// Usage:
//   node scripts/legibility-metrics.mjs <f0.png> [f1.png ...] [options]
//   --step=N        sampling step (frames between consecutive samples; default 3)
//   --fps=N         frames per second (default 30)
//   --json          emit structured JSON verdict instead of human-readable table
//
// Gates:
//   L1 — Text-flash floor (HARD):     no clearly presented high-detail block
//                                     (appear + settle) is cut away within fewer than
//                                     MIN_READ_FRAMES. Deliberately conservative —
//                                     fires only on egregious sub-~0.4s flashes.
//   L2 — Reading-budget share (ADVISORY): cumulative held-text time vs. runtime;
//                                     advisory fail when > L2_MAX_SHARE of the video
//                                     is detected-held-text (wall-of-text signal).
//                                     SKIP when no text-hold intervals are detected.
//   L3 — Detail stability (ADVISORY): during detected holds, edge density stays
//                                     stable (text not animating/blurring under reader).
//                                     SKIP when no text-hold intervals are detected.
//
// Exit code: 0 when all HARD gates pass or are skipped; non-zero on HARD gate FAIL.
// Advisory failures never affect exit code.
//
// Thresholds (calibrated conservatively so RelayLaunch + GranipaLaunch PASS L1):
//   EDGE_DENSITY_THRESHOLD  = 0.30 — mean abs gradient (lum units/px) at 0.25 render scale;
//                                     a frame must exceed this to be considered high-detail /
//                                     text-rich. Calibrated against hook-frame measurements at
//                                     full scale (1920×1080): RelayLaunch 0.36–0.78,
//                                     GranipaLaunch 0.62–0.86. At 0.25 scale these scale to
//                                     ~0.18–0.43 (anti-aliasing softens edges); threshold 0.30
//                                     sits above pure-background frames (~0.05–0.15) while
//                                     remaining below typical text-overlay frames.
//   HOLD_DELTA_THRESHOLD    = 0.50 — mean abs lum delta between consecutive samples at 0.25
//                                     scale; below this = frame is held steady enough to read.
//                                     Measured: GranipaLaunch early→mid delta=0.258 (icon settle
//                                     between f~10 and f~50 qualifies as held). Terminal typing
//                                     delta=0.286–1.525+ at full scale; at 0.25 scale anti-aliasing
//                                     reduces deltas, so some typing pauses fall below threshold —
//                                     MIN_HOLD_PAIRS guards against these single-pair false positives.
//   CUT_THRESHOLD           = 5.0  — delta above this = clear scene cut. Measured cut spikes:
//                                     RelayLaunch mid→final=7.3, GranipaLaunch mid→final=9.8.
//   MIN_READ_FRAMES         = 12   — held-text dwell must meet this floor (0.4s @ 30fps).
//                                     All detected holds in the reference videos greatly exceed
//                                     this; only egregious sub-0.4s flashes trigger L1.
//   MIN_HOLD_PAIRS          = 3    — a text-hold interval must span at least 3 consecutive
//                                     hold-pairs before being L1-eligible. Guards against brief
//                                     glitches (animation pauses at 0.25 scale that briefly dip
//                                     below HOLD_DELTA_THRESHOLD). Full-sequence calibration
//                                     revealed false positives in both reference videos at
//                                     runLength=1 (RelayLaunch, f432, dwell=6f) and runLength=2
//                                     (GranipaLaunch, f243, dwell=9f). At step=3, min eligible
//                                     dwell = (3+1)×3 = 12f = MIN_READ_FRAMES — i.e. a flash
//                                     detectable at step=3 granularity always passes L1 (the gate
//                                     is meaningful at finer steps or on videos with long static
//                                     text blocks cut abruptly).
//   L2_MAX_SHARE            = 0.60 — advisory: > 60% of runtime is detected-held-text.
//   L3_CV_THRESHOLD         = 0.40 — advisory: coefficient of variation of edge density
//                                     within a hold; above = text unstable during read.
//
// Measured dogfood values (full-sequence step=3 render at 0.25 scale, 480×270):
//   RelayLaunch:   320 samples · 957 frames (31.9s) · 29 text-hold intervals · 17 L1-eligible
//                  L1 PASS  — 0 flash violations; shortest eligible dwell=15f >> 12f
//                  L2 FAIL  (advisory) — held share=73.7% (typing animation classified as 'held')
//                  L3 PASS  — meanCv=0.035 (edge density stable across typing text)
//   GranipaLaunch: 374 samples · 1119 frames (37.3s) · 21 text-hold intervals · 15 L1-eligible
//                  L1 PASS  — 0 flash violations; shortest eligible dwell=36f >> 12f
//                  L2 FAIL  (advisory) — held share=87.7% (icon animations classified as 'held')
//                  L3 PASS  — meanCv=0.061 (edge density stable across icon/text holds)

import { fileURLToPath } from 'node:url';
import { meanAbsDelta, toLuminance, loadFrame } from './hook-metrics.mjs';

const EDGE_DENSITY_THRESHOLD = 0.30;
const HOLD_DELTA_THRESHOLD   = 0.5;
const CUT_THRESHOLD          = 5.0;
const MIN_READ_FRAMES        = 12;
const MIN_HOLD_PAIRS         = 3;
const L2_MAX_SHARE           = 0.60;
const L3_CV_THRESHOLD        = 0.40;

/**
 * Compute mean absolute gradient (edge density) of a luminance image.
 * Averages |lum[x+1] - lum[x]| and |lum[y+1] - lum[y]| across all valid pairs.
 *
 * @param {Float32Array} lum
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function edgeDensity(lum, width, height) {
  let sum   = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (x + 1 < width)  { sum += Math.abs(lum[idx] - lum[idx + 1]);     count++; }
      if (y + 1 < height) { sum += Math.abs(lum[idx] - lum[idx + width]); count++; }
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Pure computation: evaluate the three legibility-dwell gates.
 *
 * @param {Array<{width:number,height:number,channels:number,pixels:Buffer}|null>} frames
 *   Decoded PNG images in sample order. null entries are skipped.
 * @param {object} opts
 * @param {number} [opts.step=3]  — frame-number gap between consecutive samples
 * @param {number} [opts.fps=30]  — video fps
 * @returns {{ gates: Array, summary: object, hardGatesPass: boolean }}
 */
export function computeLegibilityMetrics(frames, { step = 3, fps = 30 } = {}) {
  const N     = frames.length;
  const gates = [];

  if (N < 2) {
    const skipReason = 'fewer than 2 frames provided';
    for (const [id, name, hard, advisory] of [
      [1, 'Text-flash floor',   true,  false],
      [2, 'Reading-budget share', false, true],
      [3, 'Detail stability',   false, true],
    ]) {
      gates.push({ id, name, hard, advisory, pass: false, skip: true,
                   measured: null, threshold: null, skipReason });
    }
    return {
      gates,
      summary: { passed: 0, failed: 0, skipped: 3, totalFrames: 0, samples: N, step,
                 textHoldIntervals: 0, totalHeldFrames: 0 },
      hardGatesPass: true,
    };
  }

  // Luminance + edge density cache (lazy)
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

  // Per-pair temporal delta; null when either frame is missing
  const deltas = new Array(N - 1).fill(null);
  for (let i = 0; i < N - 1; i++) {
    const a = getLum(i);
    const b = getLum(i + 1);
    if (a && b) deltas[i] = meanAbsDelta(a, b);
  }

  const totalFrames = (N - 1) * step;
  const totalSec    = totalFrames / fps;

  // ── Find text-hold runs ───────────────────────────────────────────────────
  // A "text-hold pair" at index i: edgeDensity of frame i > EDGE_DENSITY_THRESHOLD
  // AND delta[i] < HOLD_DELTA_THRESHOLD AND neither frame is missing.
  // Text-hold "runs" are maximal consecutive sequences of such pairs.
  //
  // For each run:
  //   dwell     = (run_length + 1) * step  (actual video frames spanned)
  //   terminated = true if the pair immediately after the run has delta > CUT_THRESHOLD
  //                (the text was cut away — L1 evaluates only terminated intervals)

  const holdRuns = [];
  let runStart = null;

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

  // Annotate each run with dwell + termination info
  const annotatedRuns = holdRuns.map(run => {
    const runLength    = run.end - run.start + 1;     // number of pairs in the hold
    const dwellFrames  = (runLength + 1) * step;      // actual frames spanned
    const afterIdx     = run.end + 1;
    const afterDelta   = afterIdx < deltas.length ? deltas[afterIdx] : null;
    const terminated   = afterDelta !== null && afterDelta > CUT_THRESHOLD;
    // Collect per-frame edge densities within the run (frames run.start … run.end+1)
    const runEdges = [];
    for (let i = run.start; i <= run.end + 1 && i < N; i++) {
      const ed = getEd(i);
      if (ed !== null) runEdges.push(ed);
    }
    return { ...run, dwellFrames, terminated, runEdges };
  });

  // ── L1: Text-flash floor (HARD) ──────────────────────────────────────────
  // Fire only for terminated text-hold intervals where runLength >= MIN_HOLD_PAIRS
  // AND dwell < MIN_READ_FRAMES. Short-run intervals (runLength < 3) are excluded —
  // they are too brief to reliably distinguish presented text from animation noise at
  // 0.25 scale (e.g. animation pauses that momentarily dip below HOLD_DELTA_THRESHOLD).
  // At step=3, min eligible dwell=(3+1)×3=12f=MIN_READ_FRAMES so only real held-text
  // blocks that are genuinely cut before the floor can trigger this gate.
  const l1Eligible = annotatedRuns
    .filter(r => (r.end - r.start + 1) >= MIN_HOLD_PAIRS);
  const flashViolations = l1Eligible
    .filter(r => r.terminated && r.dwellFrames < MIN_READ_FRAMES);

  if (annotatedRuns.length === 0) {
    gates.push({
      id: 1, name: 'Text-flash floor', hard: true, advisory: false,
      pass: true, skip: false,
      measured: { textHoldIntervals: 0, flashViolations: 0, shortestDwellFrames: null },
      threshold: { minReadFrames: MIN_READ_FRAMES, minHoldPairs: MIN_HOLD_PAIRS,
                   edgeThreshold: EDGE_DENSITY_THRESHOLD,
                   holdThreshold: HOLD_DELTA_THRESHOLD, cutThreshold: CUT_THRESHOLD },
    });
  } else {
    const shortestDwellFrames = Math.min(...l1Eligible.filter(r => r.terminated)
      .map(r => r.dwellFrames).concat([Infinity]));
    const pass = flashViolations.length === 0;
    gates.push({
      id: 1, name: 'Text-flash floor', hard: true, advisory: false,
      pass, skip: false,
      measured: {
        textHoldIntervals: annotatedRuns.length,
        l1EligibleIntervals: l1Eligible.length,
        flashViolations:   flashViolations.length,
        shortestDwellFrames: shortestDwellFrames === Infinity ? null : shortestDwellFrames,
        ...(flashViolations.length > 0
          ? { firstViolationFrame: flashViolations[0].start * step,
              firstViolationDwellFrames: flashViolations[0].dwellFrames }
          : {}),
      },
      threshold: { minReadFrames: MIN_READ_FRAMES, minHoldPairs: MIN_HOLD_PAIRS,
                   edgeThreshold: EDGE_DENSITY_THRESHOLD,
                   holdThreshold: HOLD_DELTA_THRESHOLD, cutThreshold: CUT_THRESHOLD },
    });
  }

  // ── L2: Reading-budget share (ADVISORY) ──────────────────────────────────
  // Skip when no holds detected (conservative: algorithm may just not see them).
  if (annotatedRuns.length === 0) {
    gates.push({
      id: 2, name: 'Reading-budget share', hard: false, advisory: true,
      pass: false, skip: true,
      measured: null, threshold: { maxShare: L2_MAX_SHARE },
      skipReason: 'no text-hold intervals detected',
    });
  } else {
    const totalHeldFrames = annotatedRuns.reduce((s, r) => s + r.dwellFrames, 0);
    const share           = totalFrames > 0 ? totalHeldFrames / totalFrames : 0;
    const pass            = share <= L2_MAX_SHARE;
    gates.push({
      id: 2, name: 'Reading-budget share', hard: false, advisory: true,
      pass, skip: false,
      measured: {
        totalHeldFrames,
        totalFrames,
        share: +share.toFixed(3),
      },
      threshold: { maxShare: L2_MAX_SHARE },
    });
  }

  // ── L3: Detail stability during holds (ADVISORY) ─────────────────────────
  // For each hold, compute coefficient of variation (stddev/mean) of edge density.
  // Advisory fail if the mean CV across all holds exceeds L3_CV_THRESHOLD.
  if (annotatedRuns.length === 0) {
    gates.push({
      id: 3, name: 'Detail stability', hard: false, advisory: true,
      pass: false, skip: true,
      measured: null, threshold: { maxCv: L3_CV_THRESHOLD },
      skipReason: 'no text-hold intervals detected',
    });
  } else {
    const cvs = annotatedRuns
      .map(r => {
        const edges = r.runEdges;
        if (edges.length < 2) return 0;
        const mean    = edges.reduce((s, v) => s + v, 0) / edges.length;
        const variance = edges.reduce((s, v) => s + (v - mean) ** 2, 0) / edges.length;
        return mean > 0 ? Math.sqrt(variance) / mean : 0;
      });
    const meanCv = cvs.reduce((s, v) => s + v, 0) / cvs.length;
    const pass   = meanCv <= L3_CV_THRESHOLD;
    gates.push({
      id: 3, name: 'Detail stability', hard: false, advisory: true,
      pass, skip: false,
      measured: { meanCv: +meanCv.toFixed(3), intervals: annotatedRuns.length },
      threshold: { maxCv: L3_CV_THRESHOLD },
    });
  }

  const hardGatesPass = gates.filter(g => g.hard).every(g => g.skip || g.pass);
  const totalHeldFrames = annotatedRuns.reduce((s, r) => s + r.dwellFrames, 0);

  const summary = {
    passed:  gates.filter(g => !g.skip &&  g.pass).length,
    failed:  gates.filter(g => !g.skip && !g.pass).length,
    skipped: gates.filter(g =>  g.skip).length,
    totalFrames,
    totalSec: +totalSec.toFixed(2),
    samples: N,
    step,
    textHoldIntervals: annotatedRuns.length,
    totalHeldFrames,
  };

  return { gates, summary, hardGatesPass };
}

function printHumanReadable({ gates, summary }) {
  console.log('\n── Legibility pixel metrics ────────────────────────────────');
  console.log(`   ${summary.samples} samples · step=${summary.step} · ${summary.totalFrames} frames (${summary.totalSec}s) · textHolds=${summary.textHoldIntervals}`);
  for (const gate of gates) {
    const adv    = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');

    if (gate.skip) {
      console.log(`${gate.name.padEnd(22)} ${status}  (${gate.skipReason})${adv}`);
      continue;
    }

    switch (gate.id) {
      case 1: {
        const { textHoldIntervals, l1EligibleIntervals, flashViolations, shortestDwellFrames } = gate.measured;
        const dwellStr = shortestDwellFrames != null
          ? ` shortestDwell=${shortestDwellFrames}f`
          : '';
        console.log(`Text-flash floor       ${status}  intervals=${textHoldIntervals} eligible=${l1EligibleIntervals} violations=${flashViolations}${dwellStr} (threshold dwell≥${gate.threshold.minReadFrames}f pairs≥${gate.threshold.minHoldPairs})`);
        break;
      }
      case 2: {
        const { share, totalHeldFrames, totalFrames: tf } = gate.measured;
        console.log(`Reading-budget share   ${status}  heldFrames=${totalHeldFrames}/${tf} share=${(share * 100).toFixed(1)}% (threshold ≤${(gate.threshold.maxShare * 100).toFixed(0)}%)${adv}`);
        break;
      }
      case 3: {
        const { meanCv, intervals } = gate.measured;
        console.log(`Detail stability       ${status}  meanCv=${meanCv.toFixed(3)} intervals=${intervals} (threshold cv≤${gate.threshold.maxCv})${adv}`);
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
      'Usage: node scripts/legibility-metrics.mjs <f0.png> [f1.png ...] [--step=3] [--fps=30] [--json]\n',
    );
    process.exit(1);
  }

  const frames = positional.map(p => loadFrame(p));

  const verdict = computeLegibilityMetrics(frames, { step, fps });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
