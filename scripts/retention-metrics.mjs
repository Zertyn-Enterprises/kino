#!/usr/bin/env node
// Computes objective PASS/FAIL for three whole-timeline retention/pacing gates.
// Reuses the zero-dep PNG decode + luminance helpers from hook-metrics.mjs.
//
// Usage:
//   node scripts/retention-metrics.mjs <frame0.png> [frame1.png ...] [options]
//   --step=N          sampling step (frames between consecutive samples; default 5)
//   --fps=N           frames per second (default 30)
//   --holds=S:E,...   declared static holds to exclude from dead-air gate (frame ranges, inclusive)
//   --climax=F        climax frame number (for gate 2; if omitted, first-third heuristic applies)
//   --rehook=N        max seconds between re-hook punches (default 8)
//   --json            emit structured JSON verdict instead of human-readable table
//
// Gates:
//   1. Dead-air (HARD)     — no sampled run > DEAD_AIR_MAX_SEC (1s) of whole-frame
//                            mean-abs-luminance-delta below DEAD_AIR_FLOOR, excluding
//                            declared holds. Reports longest static span (startFrame,
//                            endFrame, durationSec).
//   2. Energy build-to-climax (ADVISORY) — peak of a WINDOWED SUSTAINED-ENERGY signal
//                            (centered rolling mean over ~1s of samples) must fall in/after
//                            the climax window (not first third). One-frame scene-cut spikes
//                            average down; sustained climax regions dominate. Raw (unsmoothed)
//                            peak is reported as rawPeakFrame for transparency. If --climax is
//                            omitted, asserts smoothed peak ≥ first-third boundary.
//   3. Re-hook cadence (ADVISORY) — no body stretch > REHOOK_MAX_SEC (8s, configurable)
//                            without a local energy spike. Reports longest flat stretch.
//
// Smoothing rationale (gate 2 only): the raw per-pair luminance delta spikes hard on scene
// cuts (whole-frame transition in one sample). Such cuts cluster early in typical edits,
// causing peakFrame to land on a cut rather than the narrative climax. A centered rolling
// mean with win = Math.max(1, Math.round(fps/step)) (~1s of samples) suppresses single-frame
// transients without moving the peak of a genuinely sustained climax region. Gates 1 and 3
// deliberately use instantaneous deltas (dead-air detection and punch detection require
// per-pair resolution).
//
// Thresholds (calibrated so RelayLaunch + GranipaLaunch pass the HARD dead-air gate):
//   DEAD_AIR_FLOOR     = 0.05 — mean abs lum delta per sampled pair; below = static.
//                               Catches truly frozen/identical frames (delta≈0) while
//                               allowing subtly-animated content (typing, drift: ~0.07+).
//                               Measured at step=10: RelayLaunch hook deltas 0.15–0.56;
//                               GranipaLaunch deltas expected higher (motion=1.40 vs 0.29).
//   DEAD_AIR_MAX_SEC   = 1.0  — max static run before hard FAIL (seconds)
//   ENERGY_SPIKE_FLOOR = 2.0  — mean abs lum delta; above = "re-hook punch" for gate 3
//   RESOLVE_RATIO      = 0.75 — post-climax mean energy must be < 75% of peak for gate 2
//   Default REHOOK_MAX_SEC = 8.0 (overridden by --rehook=N)
//
// Measured values updated after gate-2 smoothing fix (dogfood at step=5, 2026-06-22):
//   See produce/retention.md for current snapshots.

import { fileURLToPath } from 'node:url';
import { meanAbsDelta, toLuminance, loadFrame } from './hook-metrics.mjs';

const DEAD_AIR_FLOOR    = 0.05;
const DEAD_AIR_MAX_SEC  = 1.0;
const ENERGY_SPIKE_FLOOR = 2.0;
const RESOLVE_RATIO     = 0.75;

/**
 * Parse --holds=S:E,... into an array of [startFrame, endFrame] pairs.
 * @param {string|undefined} holdsStr
 * @returns {Array<[number, number]>}
 */
function parseHolds(holdsStr) {
  if (!holdsStr) return [];
  return holdsStr.split(',').map(seg => {
    const [s, e] = seg.trim().split(':').map(Number);
    return [s, e];
  });
}

/**
 * Return true if frame index i's sampled pair (frames i→i+1, covering
 * actual frames i*step..(i+1)*step) falls entirely within any hold window.
 * @param {number} i  — sample index
 * @param {number} step
 * @param {Array<[number, number]>} holds
 */
function inHold(i, step, holds) {
  const spanStart = i * step;
  const spanEnd   = (i + 1) * step;
  return holds.some(([hs, he]) => spanStart >= hs && spanEnd <= he);
}

/**
 * Pure computation: evaluate the three retention/pacing gates for an ordered
 * array of decoded frames sampled across the full timeline.
 *
 * @param {Array<{width:number,height:number,channels:number,pixels:Buffer}>} frames
 *   Decoded PNG images in frame order, sampled at `step` intervals.
 *   frames[0] = frame 0, frames[1] = frame `step`, frames[i] = frame i*step.
 * @param {object} opts
 * @param {number}             [opts.step=5]      — frame-number gap between consecutive samples
 * @param {number}             [opts.fps=30]      — video fps
 * @param {Array<[number,number]>} [opts.holds=[]] — declared hold windows [startF, endF] (inclusive)
 * @param {number|null}        [opts.climax=null]  — climax frame number (null → first-third heuristic)
 * @param {number}             [opts.rehookSec=8]  — max seconds between re-hook punches
 * @returns {{ gates: Array, summary: object, hardGatesPass: boolean }}
 */
export function computeRetentionMetrics(frames, {
  step = 5, fps = 30, holds = [], climax = null, rehookSec = 8,
} = {}) {
  const N = frames.length;
  const gates = [];

  // Compute per-pair energy: energy[i] = meanAbsDelta(lum[i], lum[i+1])
  // lum[i] is lazily computed and cached.
  const lumCache = new Array(N).fill(null);
  function getLum(i) {
    if (!lumCache[i]) lumCache[i] = toLuminance(frames[i]);
    return lumCache[i];
  }

  const energy = [];
  for (let i = 0; i < N - 1; i++) {
    energy.push(meanAbsDelta(getLum(i), getLum(i + 1)));
  }

  const totalFrames  = (N - 1) * step;
  const totalSec     = totalFrames / fps;

  // ── Gate 1: Dead-air (HARD) ──────────────────────────────────────────────
  // Find the longest run of consecutive pairs below DEAD_AIR_FLOOR,
  // excluding pairs that fall entirely within a declared hold.
  let longestStaticPairs = 0;
  let longestStaticStart = 0;
  let currentRunStart    = -1;
  let currentRunLen      = 0;

  for (let i = 0; i < energy.length; i++) {
    const isHeld   = inHold(i, step, holds);
    const isStatic = !isHeld && energy[i] < DEAD_AIR_FLOOR;

    if (isStatic) {
      if (currentRunLen === 0) currentRunStart = i;
      currentRunLen++;
      if (currentRunLen > longestStaticPairs) {
        longestStaticPairs = currentRunLen;
        longestStaticStart = currentRunStart;
      }
    } else {
      currentRunLen = 0;
    }
  }

  // A run of n pairs covers n*step frames = n*step/fps seconds.
  const longestStaticFrames = longestStaticPairs * step;
  const longestStaticSec    = longestStaticFrames / fps;
  const deadAirPass         = longestStaticSec <= DEAD_AIR_MAX_SEC;

  gates.push({
    id: 1, name: 'Dead-air', hard: true, advisory: false,
    pass: deadAirPass, skip: N < 2,
    measured: {
      longestStaticSec: +longestStaticSec.toFixed(3),
      startFrame: longestStaticStart * step,
      endFrame: (longestStaticStart + longestStaticPairs) * step,
    },
    threshold: { maxSec: DEAD_AIR_MAX_SEC, floor: DEAD_AIR_FLOOR },
    ...(N < 2 ? { skipReason: 'fewer than 2 frames provided' } : {}),
  });

  // ── Gate 2: Energy build-to-climax (ADVISORY) ────────────────────────────
  if (energy.length === 0) {
    gates.push({
      id: 2, name: 'Energy build-to-climax', hard: false, advisory: true,
      pass: false, skip: true, measured: null, threshold: { resolveRatio: RESOLVE_RATIO },
      skipReason: 'fewer than 2 frames provided',
    });
  } else {
    // Raw peak — reported as diagnostic (cut vs sustained); NOT used for gate decision.
    let rawPeakIdx = 0;
    for (let i = 1; i < energy.length; i++) {
      if (energy[i] > energy[rawPeakIdx]) rawPeakIdx = i;
    }
    const rawPeakFrame = rawPeakIdx * step;

    // Windowed sustained-energy signal: centered rolling mean over ~1s of samples.
    // win derived from fps/step (no hardcoded frame counts).
    const win = Math.max(1, Math.round(fps / step));
    const half = Math.floor(win / 2);
    const smoothed = energy.map((_, i) => {
      const lo = Math.max(0, i - half);
      const hi = Math.min(energy.length - 1, i + half);
      let sum = 0;
      for (let j = lo; j <= hi; j++) sum += energy[j];
      return sum / (hi - lo + 1);
    });

    // Peak from smoothed signal.
    let peakIdx = 0;
    for (let i = 1; i < smoothed.length; i++) {
      if (smoothed[i] > smoothed[peakIdx]) peakIdx = i;
    }
    const peakFrame  = peakIdx * step;
    const peakEnergy = smoothed[peakIdx];

    // Determine the boundary that peak must not fall before.
    const firstThirdFrame = Math.floor(totalFrames / 3);
    const boundaryFrame   = climax != null ? climax : firstThirdFrame;

    const peakAfterBoundary = peakFrame >= boundaryFrame;

    // Resolve: post-peak smoothed mean must be < RESOLVE_RATIO * smoothed peak.
    const postPeak = smoothed.slice(peakIdx + 1);
    let resolveRatio = null;
    let resolvePass  = true;
    if (postPeak.length > 0) {
      const postMean = postPeak.reduce((s, v) => s + v, 0) / postPeak.length;
      resolveRatio   = +(postMean / peakEnergy).toFixed(3);
      resolvePass    = resolveRatio < RESOLVE_RATIO;
    }

    const g2Pass = peakAfterBoundary && resolvePass;
    gates.push({
      id: 2, name: 'Energy build-to-climax', hard: false, advisory: true,
      pass: g2Pass, skip: false,
      measured: {
        peakFrame,
        peakEnergy: +peakEnergy.toFixed(3),
        boundaryFrame,
        peakAfterBoundary,
        resolveRatio,
        rawPeakFrame,
      },
      threshold: { resolveRatio: RESOLVE_RATIO },
    });
  }

  // ── Gate 3: Re-hook cadence (ADVISORY) ───────────────────────────────────
  if (energy.length === 0) {
    gates.push({
      id: 3, name: 'Re-hook cadence', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { maxFlatSec: rehookSec, spikeFl: ENERGY_SPIKE_FLOOR },
      skipReason: 'fewer than 2 frames provided',
    });
  } else {
    // Anchors: start (index 0) + every index where energy > spike floor + end (index N-1).
    // Gaps between consecutive anchors = stretches without a re-hook.
    const anchorFrames = [0];
    for (let i = 0; i < energy.length; i++) {
      if (energy[i] > ENERGY_SPIKE_FLOOR) anchorFrames.push((i + 1) * step);
    }
    anchorFrames.push(totalFrames);

    let longestFlatFrames = 0;
    let longestFlatStartF = 0;
    for (let i = 1; i < anchorFrames.length; i++) {
      const gap = anchorFrames[i] - anchorFrames[i - 1];
      if (gap > longestFlatFrames) {
        longestFlatFrames = gap;
        longestFlatStartF = anchorFrames[i - 1];
      }
    }

    const longestFlatSec = longestFlatFrames / fps;
    const g3Pass         = longestFlatSec <= rehookSec;

    gates.push({
      id: 3, name: 'Re-hook cadence', hard: false, advisory: true,
      pass: g3Pass, skip: false,
      measured: {
        longestFlatSec: +longestFlatSec.toFixed(3),
        longestFlatStartFrame: longestFlatStartF,
      },
      threshold: { maxFlatSec: rehookSec, spikeFl: ENERGY_SPIKE_FLOOR },
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
  };

  return { gates, summary, hardGatesPass };
}

function printHumanReadable({ gates, summary }) {
  console.log('\n── Retention pixel metrics ─────────────────────────────────');
  console.log(`   ${summary.samples} samples · step=${summary.step} · ${summary.totalFrames} frames (${summary.totalSec}s)`);
  for (const gate of gates) {
    const adv    = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');

    if (gate.skip) {
      console.log(`${gate.name.padEnd(24)}${status}  (${gate.skipReason})${adv}`);
      continue;
    }

    switch (gate.id) {
      case 1: {
        const { longestStaticSec, startFrame, endFrame } = gate.measured;
        console.log(`Dead-air                 ${status}  longest=${longestStaticSec.toFixed(2)}s frames ${startFrame}-${endFrame} (threshold ≤${gate.threshold.maxSec}s, floor=${gate.threshold.floor})`);
        break;
      }
      case 2: {
        const { peakFrame, boundaryFrame, peakAfterBoundary, resolveRatio } = gate.measured;
        const climaxLabel = resolveRatio != null ? `resolveRatio=${resolveRatio.toFixed(2)}` : 'no post-peak samples';
        console.log(`Energy build-to-climax   ${status}  peak@${peakFrame} (boundary=${boundaryFrame}, after=${peakAfterBoundary}) ${climaxLabel} (threshold resolveRatio<${gate.threshold.resolveRatio})${adv}`);
        break;
      }
      case 3: {
        const { longestFlatSec, longestFlatStartFrame } = gate.measured;
        console.log(`Re-hook cadence          ${status}  longestFlat=${longestFlatSec.toFixed(2)}s @frame${longestFlatStartFrame} (threshold ≤${gate.threshold.maxFlatSec}s)${adv}`);
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

  const step      = parseInt(getOpt('step', '5'), 10);
  const fps       = parseInt(getOpt('fps', '30'), 10);
  const holdsStr  = getOpt('holds', '');
  const climaxStr = getOpt('climax', '');
  const rehookSec = parseFloat(getOpt('rehook', '8'));

  if (positional.length < 2) {
    process.stderr.write(
      'Usage: node scripts/retention-metrics.mjs <f0.png> <f1.png> [...] [--step=5] [--fps=30] [--holds=S:E,...] [--climax=F] [--rehook=8] [--json]\n',
    );
    process.exit(1);
  }

  const frames = positional.map(p => loadFrame(p)).filter(Boolean);
  if (frames.length < 2) {
    process.stderr.write('ERROR: fewer than 2 readable frames provided\n');
    process.exit(1);
  }

  const holds  = parseHolds(holdsStr);
  const climax = climaxStr ? parseInt(climaxStr, 10) : null;

  const verdict = computeRetentionMetrics(frames, { step, fps, holds, climax, rehookSec });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
