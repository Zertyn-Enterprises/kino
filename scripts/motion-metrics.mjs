#!/usr/bin/env node
// Computes objective PASS/FAIL for three motion-craft gates.
// Detects/masks cut frames (isolated spikes above CUT_FLOOR or declared --cuts=),
// then evaluates within-scene motion quality — catching the AI-tells that bypass
// hook/retention/contrast: stutter, robotic easing, dead background.
// Reuses zero-dep PNG decode + luminance helpers from hook-metrics.mjs.
//
// Usage:
//   node scripts/motion-metrics.mjs <f0.png> [f1.png ...] [options]
//   --step=N        sampling step (frames between consecutive samples; default 3)
//   --fps=N         frames per second (default 30)
//   --cuts=F,...    declared cut frame numbers to mask (comma-separated)
//   --window=S:E    restrict analysis to samples whose implied frame is in [S, E]
//   --json          emit structured JSON verdict instead of human-readable table
//
// Gates:
//   M1 — Stutter/jank (HARD):       within an active motion run, no pair drops to
//                                    near-zero then resumes — catches choppy/dropped-
//                                    frame animation. Robust spike/dropout detection.
//   M2 — Easing presence (ADVISORY): delta peak-to-mean ratio across non-cut pairs;
//                                    flat plateau = robotic/linear easing.
//   M3 — Sustained life (ADVISORY): windowed-min delta in the body stays above ambient
//                                    life floor (complements retention dead-air;
//                                    the AmbientField requirement).
//
// Exit code: 0 when all HARD gates pass or are skipped; non-zero on HARD gate FAIL.
// Advisory failures never affect exit code. Missing/unreadable frames SKIP (not FAIL).
//
// Thresholds calibrated so RelayLaunch and GranipaLaunch PASS M1 (HARD gate):
//   CUT_FLOOR          = 15.0  — isolated pair spike above this = scene cut
//   AMBIENT_FLOOR      =  0.30 — delta ≥ this = "active motion" pair
//   STUTTER_FLOOR      = 0.05  — within a motion run, drop below this = dropout
//   MIN_ACTIVE_RUN     =    2  — consecutive active pairs required on each side of dropout
//   EASING_RATIO_FLOOR =  1.5  — peak/mean ratio; below = robotic/linear plateau
//   M3_LIFE_FLOOR      = 0.02  — windowed-min delta; below = background static
//   M3_WINDOW          =    5  — sliding window size in pairs for M3
//
// Measured values (dogfood at step=3, fps=30, frames 0-299):
//   RelayLaunch  (cuts=1, windows=2):
//     M1: stutterDetected=false  PASS  (terminal typing — smooth, no frame drops)
//     M2: peak=9.096 mean=0.454 ratio=20.04  PASS  (large spike at scene transition drives ratio)
//     M3: minWindowMean=0.0823 @pair55  PASS  (low ambient typing motion stays above floor)
//   GranipaLaunch  (cuts=1, windows=1):
//     M1: stutterDetected=false  PASS  (eased icon settle — clean ramps, no drops)
//     M2: peak=7.077 mean=0.553 ratio=12.809  PASS  (icon settle has clear peak vs. still sections)
//     M3: minWindowMean=0.1627 @pair19  PASS  (logo motion keeps life floor easily)
// (Re-run `scripts/motion.sh RelayLaunch` and `scripts/motion.sh GranipaLaunch` to refresh.)

import { fileURLToPath } from 'node:url';
import { meanAbsDelta, toLuminance, loadFrame } from './hook-metrics.mjs';

const CUT_FLOOR          = 15.0;
const AMBIENT_FLOOR      =  0.30;
const STUTTER_FLOOR      = 0.05;
const MIN_ACTIVE_RUN     =    2;
const EASING_RATIO_FLOOR =  1.5;
const M3_LIFE_FLOOR      = 0.02;
const M3_WINDOW          =    5;

/** Parse --cuts=F,... → number[] */
function parseCuts(str) {
  if (!str) return [];
  return str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

/** Parse --window=S:E → [S, E] or null */
function parseWindow(str) {
  if (!str) return null;
  const [s, e] = str.split(':').map(Number);
  return [s, e];
}

/**
 * Build cut-mask for the energy array.
 * Masks any pair >= CUT_FLOOR plus its immediate neighbors (to absorb blended frames).
 * Also masks pairs derived from declared cut frame numbers.
 *
 * @param {number[]} energy
 * @param {number[]} declaredCuts — frame numbers
 * @param {number}   step
 * @returns {boolean[]}
 */
function buildCutMask(energy, declaredCuts, step) {
  const n    = energy.length;
  const mask = new Array(n).fill(false);

  for (let i = 0; i < n; i++) {
    if (energy[i] >= CUT_FLOOR) {
      if (i > 0)     mask[i - 1] = true;
      mask[i]        = true;
      if (i < n - 1) mask[i + 1] = true;
    }
  }

  for (const F of declaredCuts) {
    const p = Math.floor(F / step);
    if (p >= 0 && p < n) {
      if (p > 0)     mask[p - 1] = true;
      mask[p]        = true;
      if (p < n - 1) mask[p + 1] = true;
    }
  }

  return mask;
}

/**
 * Split energy series into contiguous windows of unmasked pairs.
 * @returns {Array<{startIdx: number, pairs: number[]}>}
 */
function splitWindows(energy, cutMask) {
  const windows = [];
  let current   = null;
  for (let i = 0; i < energy.length; i++) {
    if (!cutMask[i]) {
      if (!current) current = { startIdx: i, pairs: [] };
      current.pairs.push(energy[i]);
    } else {
      if (current && current.pairs.length > 0) windows.push(current);
      current = null;
    }
  }
  if (current && current.pairs.length > 0) windows.push(current);
  return windows;
}

/**
 * Detect stutter in a window: a pair < STUTTER_FLOOR flanked by active runs
 * (>= MIN_ACTIVE_RUN consecutive pairs >= AMBIENT_FLOOR on each side).
 * @param {number[]} pairs
 * @returns {{ detected: boolean, atIndex?: number }}
 */
function detectStutter(pairs) {
  const n = pairs.length;
  if (n < 3) return { detected: false };

  // Active-run length ending at i (cumulative)
  const runBefore = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    runBefore[i] = pairs[i] >= AMBIENT_FLOOR
      ? (i > 0 ? runBefore[i - 1] : 0) + 1
      : 0;
  }
  // Active-run length starting at i (cumulative from right)
  const runAfter = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    runAfter[i] = pairs[i] >= AMBIENT_FLOOR
      ? (i < n - 1 ? runAfter[i + 1] : 0) + 1
      : 0;
  }

  for (let i = 1; i < n - 1; i++) {
    if (
      pairs[i] < STUTTER_FLOOR
      && runBefore[i - 1] >= MIN_ACTIVE_RUN
      && runAfter[i + 1] >= MIN_ACTIVE_RUN
    ) {
      return { detected: true, atIndex: i };
    }
  }
  return { detected: false };
}

/**
 * Pure computation: evaluate the three motion-craft gates.
 *
 * @param {Array<{width:number,height:number,channels:number,pixels:Buffer}|null>} frames
 *   Decoded PNG images in sample order. null entries are skipped (pair is masked).
 * @param {object} opts
 * @param {number}   [opts.step=3]    — frame-number gap between consecutive samples
 * @param {number}   [opts.fps=30]    — video fps
 * @param {number[]} [opts.cuts=[]]   — declared cut frame numbers to mask
 * @returns {{ gates: Array, summary: object, hardGatesPass: boolean }}
 */
export function computeMotionMetrics(frames, { step = 3, fps = 30, cuts = [] } = {}) {
  const N     = frames.length;
  const gates = [];

  if (N < 2) {
    const skipReason = 'fewer than 2 frames provided';
    for (const [id, name, hard, advisory] of [
      [1, 'Stutter/jank',    true,  false],
      [2, 'Easing presence', false, true ],
      [3, 'Sustained life',  false, true ],
    ]) {
      gates.push({ id, name, hard, advisory, pass: false, skip: true,
                   measured: null, threshold: null, skipReason });
    }
    return {
      gates,
      summary: { passed: 0, failed: 0, skipped: 3, totalFrames: 0, samples: N, step },
      hardGatesPass: true,
    };
  }

  // Luminance cache (lazy); null frames stay null
  const lumCache = new Array(N).fill(null);
  function getLum(i) {
    if (lumCache[i] === null && frames[i] !== null) lumCache[i] = toLuminance(frames[i]);
    return lumCache[i];
  }

  // Build energy array (null frame → 0, flagged as skipped)
  const energy    = new Array(N - 1).fill(0);
  const skipped   = new Array(N - 1).fill(false);
  for (let i = 0; i < N - 1; i++) {
    const a = getLum(i);
    const b = getLum(i + 1);
    if (!a || !b) { skipped[i] = true; continue; }
    energy[i] = meanAbsDelta(a, b);
  }

  const totalFrames = (N - 1) * step;
  const totalSec    = totalFrames / fps;

  // Build cut mask; also mask pairs with missing frames
  const cutMask = buildCutMask(energy, cuts, step);
  for (let i = 0; i < skipped.length; i++) {
    if (skipped[i]) cutMask[i] = true;
  }

  const windows       = splitWindows(energy, cutMask);
  const unmaskedPairs = energy.filter((_, i) => !cutMask[i]);

  // Count cut events (leading edge of each masked run)
  const cutsDetected = cutMask.reduce(
    (acc, v, i) => acc + (v && (i === 0 || !cutMask[i - 1]) ? 1 : 0), 0,
  );

  // ── M1: Stutter/jank (HARD) ──────────────────────────────────────────────
  if (unmaskedPairs.length === 0) {
    gates.push({
      id: 1, name: 'Stutter/jank', hard: true, advisory: false,
      pass: false, skip: true, measured: null,
      threshold: { stutterFloor: STUTTER_FLOOR, ambientFloor: AMBIENT_FLOOR },
      skipReason: 'no unmasked pairs to analyze',
    });
  } else {
    let stutterAt = null;
    for (const win of windows) {
      const result = detectStutter(win.pairs);
      if (result.detected) {
        stutterAt = (win.startIdx + result.atIndex) * step;
        break;
      }
    }
    const pass = stutterAt === null;
    gates.push({
      id: 1, name: 'Stutter/jank', hard: true, advisory: false,
      pass, skip: false,
      measured: {
        stutterDetected: !pass,
        windows: windows.length,
        cutsDetected,
        ...(stutterAt !== null ? { stutterAtFrame: stutterAt } : {}),
      },
      threshold: { stutterFloor: STUTTER_FLOOR, ambientFloor: AMBIENT_FLOOR,
                   minActiveRun: MIN_ACTIVE_RUN },
    });
  }

  // ── M2: Easing presence (ADVISORY) ──────────────────────────────────────
  if (unmaskedPairs.length === 0) {
    gates.push({
      id: 2, name: 'Easing presence', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { easingRatioFloor: EASING_RATIO_FLOOR },
      skipReason: 'no unmasked pairs to analyze',
    });
  } else {
    const peak  = Math.max(...unmaskedPairs);
    const mean  = unmaskedPairs.reduce((s, v) => s + v, 0) / unmaskedPairs.length;
    const ratio = mean > 0 ? peak / mean : 0;
    const pass  = ratio >= EASING_RATIO_FLOOR;
    gates.push({
      id: 2, name: 'Easing presence', hard: false, advisory: true,
      pass, skip: false,
      measured: { peakDelta: +peak.toFixed(3), meanDelta: +mean.toFixed(3), ratio: +ratio.toFixed(3) },
      threshold: { easingRatioFloor: EASING_RATIO_FLOOR },
    });
  }

  // ── M3: Sustained life (ADVISORY) ───────────────────────────────────────
  if (unmaskedPairs.length < M3_WINDOW) {
    gates.push({
      id: 3, name: 'Sustained life', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { lifeFloor: M3_LIFE_FLOOR, window: M3_WINDOW },
      skipReason: `fewer than ${M3_WINDOW} unmasked pairs`,
    });
  } else {
    const bodyStart = Math.floor(unmaskedPairs.length * 0.1);
    const bodyEnd   = Math.ceil(unmaskedPairs.length * 0.9);
    const body      = unmaskedPairs.slice(bodyStart, bodyEnd);

    let minWindowMean   = Infinity;
    let minWindowPair   = bodyStart;
    for (let i = 0; i <= body.length - M3_WINDOW; i++) {
      const wMean = body.slice(i, i + M3_WINDOW).reduce((s, v) => s + v, 0) / M3_WINDOW;
      if (wMean < minWindowMean) { minWindowMean = wMean; minWindowPair = bodyStart + i; }
    }

    const pass = minWindowMean >= M3_LIFE_FLOOR;
    gates.push({
      id: 3, name: 'Sustained life', hard: false, advisory: true,
      pass, skip: false,
      measured: { minWindowMean: +minWindowMean.toFixed(4), minWindowStartPair: minWindowPair },
      threshold: { lifeFloor: M3_LIFE_FLOOR, window: M3_WINDOW },
    });
  }

  const hardGatesPass = gates.filter(g => g.hard).every(g => g.skip || g.pass);
  const summary = {
    passed:  gates.filter(g => !g.skip &&  g.pass).length,
    failed:  gates.filter(g => !g.skip && !g.pass).length,
    skipped: gates.filter(g =>  g.skip).length,
    totalFrames,
    totalSec: +totalSec.toFixed(2),
    samples: N,
    step,
    cutsDetected,
  };

  return { gates, summary, hardGatesPass };
}

function printHumanReadable({ gates, summary }) {
  console.log('\n── Motion pixel metrics ────────────────────────────────────');
  console.log(`   ${summary.samples} samples · step=${summary.step} · ${summary.totalFrames} frames (${summary.totalSec}s) · cuts=${summary.cutsDetected}`);
  for (const gate of gates) {
    const adv    = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');

    if (gate.skip) {
      console.log(`${gate.name.padEnd(20)} ${status}  (${gate.skipReason})${adv}`);
      continue;
    }

    switch (gate.id) {
      case 1: {
        const { stutterDetected, windows, cutsDetected: c } = gate.measured;
        console.log(`Stutter/jank         ${status}  stutterDetected=${stutterDetected} windows=${windows} cuts=${c} (threshold ambientFloor=${gate.threshold.ambientFloor}, stutterFloor=${gate.threshold.stutterFloor})`);
        break;
      }
      case 2: {
        const { peakDelta, meanDelta, ratio } = gate.measured;
        console.log(`Easing presence      ${status}  peak=${peakDelta} mean=${meanDelta} ratio=${ratio} (threshold ratio≥${gate.threshold.easingRatioFloor})${adv}`);
        break;
      }
      case 3: {
        const { minWindowMean, minWindowStartPair } = gate.measured;
        console.log(`Sustained life       ${status}  minWindowMean=${minWindowMean} @pair${minWindowStartPair} (threshold ≥${gate.threshold.lifeFloor}, window=${gate.threshold.window})${adv}`);
        break;
      }
    }
  }
  console.log('───────────────────────────────────────────────────────────\n');
}

// CLI — only runs when this file is the entry point.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args       = process.argv.slice(2);
  const jsonMode   = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));

  function getOpt(name, def) {
    const flag = args.find(a => a.startsWith(`--${name}=`));
    return flag ? flag.slice(name.length + 3) : def;
  }

  const step      = parseInt(getOpt('step', '3'),  10);
  const fps       = parseInt(getOpt('fps',  '30'), 10);
  const cutsStr   = getOpt('cuts',   '');
  const windowStr = getOpt('window', '');

  if (positional.length < 1) {
    process.stderr.write(
      'Usage: node scripts/motion-metrics.mjs <f0.png> [f1.png ...] [--step=3] [--fps=30] [--cuts=F,...] [--window=S:E] [--json]\n',
    );
    process.exit(1);
  }

  const cuts       = parseCuts(cutsStr);
  const windowRange = parseWindow(windowStr);

  // Load frames; apply --window filter
  let files = positional;
  if (windowRange) {
    const [wS, wE] = windowRange;
    files = files.filter((_, i) => {
      const frameNum = i * step;
      return frameNum >= wS && frameNum <= wE;
    });
  }

  if (files.length < 2) {
    process.stderr.write('ERROR: fewer than 2 frames in the specified window\n');
    process.exit(1);
  }

  const frames = files.map(p => loadFrame(p));

  const verdict = computeMotionMetrics(frames, { step, fps, cuts });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
