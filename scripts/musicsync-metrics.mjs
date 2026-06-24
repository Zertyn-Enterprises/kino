#!/usr/bin/env node
// Computes objective PASS/FAIL for four music-sync gates.
// Pure module: no I/O. Accepts pre-parsed timeline data + analysis JSON.
// Gates verify audio↔picture alignment: tempo match, downbeat phase, climax-on-drop,
// and cut-on-beat coverage. Mirrors the motion/legibility/retention gate shape.
//
// Usage (as library):
//   import { computeMusicSync } from './musicsync-metrics.mjs';
//   const verdict = computeMusicSync({ timeline, analysis, climaxFrame, tolerances });
//
// Input shapes:
//   timeline:     { bpm, fps, firstDownbeatSec?, cutFrames? }
//                 bpm/fps required; firstDownbeatSec defaults to 0; cutFrames is
//                 the array of scene-boundary cut frames (from timeline.scenes).
//   analysis:     output of analyze-music.mjs (.analysis.json) or null when absent.
//                 Fields used: bpm, firstBeatSec, drops[].t
//   climaxFrame:  number | null — declared climax cut frame; null → MS3 skips.
//   tolerances:   optional threshold overrides (see constants below).
//
// Gates:
//   MS1 — Tempo lock (HARD, audio-dependent): declared bpm ≈ detected bpm within
//          BPM_TOLERANCE, accepting octave relations (×2 / ÷2).
//   MS2 — Downbeat lock (HARD, audio-dependent): declared firstDownbeatSec ≈ detected
//          firstBeatSec within DOWNBEAT_FRAME_TOL frames, modulo one beat period.
//   MS3 — Climax on drop (advisory, audio-dependent): declared climax frame lands
//          within CLIMAX_TOL_FRAMES of the nearest detected drop.
//   MS4 — Cut-on-beat coverage (advisory, audio-dependent): share of scene-boundary
//          cut frames within CUT_BEAT_TOL_FRAMES of the detected beat grid ≥
//          BEAT_COVERAGE_FLOOR.
//
// Three states:
//   skip       — no musicIntent AND no analysis (sereno). Silent exit 0, never blocks.
//   unverified — musicIntent:true AND no analysis. Per-gate status:'unverified' (not skip).
//                hardGatesPass:true (advisory — does NOT block ship). Loud warning emitted.
//   verified   — analysis present. MS1/MS2 are HARD pass/fail as normal.
//
// SKIP: all four gates are audio-dependent — when analysis is null (or bpm is null for
// gates requiring the beat grid), gates report skip:true, not fail.
// SKIP never blocks ship; mirrors the "no preview URL → skip" convention.
//
// Exit code (CLI): 0 when all HARD gates pass or skip or unverified; non-zero on HARD FAIL.
//
// Thresholds calibrated for 30fps video on a tracked music bed:
//   BPM_TOLERANCE        = 0.02  — ±2% of detected BPM; octave relations accepted.
//                                   Detected BPM from MusicTempo can be slightly off
//                                   (~0.5%) even on a clean track; 2% gives 4× headroom
//                                   while still catching gross mismatches.
//   DOWNBEAT_FRAME_TOL   =    1  — ±1 frame (≈0.033s at 30fps). Timeline beatFrame()
//                                   rounds to nearest frame, so exact alignment =
//                                   0-frame delta; 1 frame absorbs rounding on both sides.
//   CLIMAX_TOL_FRAMES    =    3  — ±3 frames (0.1s). Drop timestamp is quantized to
//                                   0.25s RMS windows; ±3 frames covers the full ±0.125s
//                                   half-window with 2 frames to spare.
//   CUT_BEAT_TOL_FRAMES  =    1  — ±1 frame; timeline beatFrame() rounds, so on-beat
//                                   cuts should land within 0–1 frames of the grid.
//   BEAT_COVERAGE_FLOOR  = 0.90  — 90% of cuts on beat. Allows 1 out-of-10 for SFX or
//                                   director-approved off-beat cut; catches systematic drift.

const BPM_TOLERANCE       = 0.02;
const DOWNBEAT_FRAME_TOL  =    1;
const CLIMAX_TOL_FRAMES   =    3;
const CUT_BEAT_TOL_FRAMES =    1;
const BEAT_COVERAGE_FLOOR = 0.90;

/**
 * Build the detected beat grid as an array of frame numbers.
 * Extends from one beat before analysis.firstBeatSec (to handle firstDownbeatSec < firstBeatSec)
 * through the frame of the last cut plus one beat period.
 *
 * @param {number} firstBeatSec
 * @param {number} bpm
 * @param {number} fps
 * @param {number} lastCutFrame
 * @returns {number[]}
 */
function buildBeatGrid(firstBeatSec, bpm, fps, lastCutFrame) {
  const beatPeriodSec = 60 / bpm;
  const maxSec = lastCutFrame / fps + beatPeriodSec;
  const nStart = Math.ceil((-firstBeatSec - beatPeriodSec) / beatPeriodSec);
  const grid = [];
  for (let n = nStart; ; n++) {
    const beatSec = firstBeatSec + n * beatPeriodSec;
    if (beatSec > maxSec) break;
    if (grid.length > 20000) break; // safety cap
    grid.push(Math.round(beatSec * fps));
  }
  return grid;
}

/**
 * Compute phase difference between two timestamps modulo the beat period.
 * Returns a value in [0, beatPeriodSec / 2] — the distance to the nearest beat.
 *
 * @param {number} declaredSec
 * @param {number} detectedSec
 * @param {number} beatPeriodSec
 * @returns {number}
 */
function phaseDiff(declaredSec, detectedSec, beatPeriodSec) {
  const raw = declaredSec - detectedSec;
  // JS % preserves sign of dividend; normalize to [0, beatPeriodSec)
  const mod = ((raw % beatPeriodSec) + beatPeriodSec) % beatPeriodSec;
  return Math.min(mod, beatPeriodSec - mod);
}

/**
 * Pure computation: evaluate the four music-sync gates.
 *
 * @param {object} params
 * @param {object}        params.timeline       — { bpm, fps, firstDownbeatSec?, cutFrames? }
 * @param {object|null}   params.analysis       — .analysis.json object or null
 * @param {number|null}   [params.climaxFrame]  — declared climax frame, or null
 * @param {object}        [params.tolerances]   — optional threshold overrides
 * @param {boolean}       [params.musicIntent]  — true when the video declares music intent
 *                                                (MusicBed import or music asset reference).
 *                                                When true and analysis is absent, gates emit
 *                                                status:'unverified' instead of skip:true, and
 *                                                the top-level verdict is 'unverified' (advisory,
 *                                                not a hard blocker). Default: false (legacy SKIP).
 * @returns {{ musicIntent: boolean, analysisPresent: boolean, verdict: string, gates: Array, summary: object, hardGatesPass: boolean }}
 */
export function computeMusicSync({
  timeline,
  analysis,
  climaxFrame = null,
  tolerances = {},
  musicIntent = false,
}) {
  const {
    bpmTolerance      = BPM_TOLERANCE,
    downbeatFrameTol  = DOWNBEAT_FRAME_TOL,
    climaxTolFrames   = CLIMAX_TOL_FRAMES,
    cutBeatTolFrames  = CUT_BEAT_TOL_FRAMES,
    beatCoverageFloor = BEAT_COVERAGE_FLOOR,
  } = tolerances;

  const fps                  = timeline.fps;
  const declaredBpm          = timeline.bpm;
  const declaredDownbeatSec  = timeline.firstDownbeatSec ?? 0;
  const cutFrames            = timeline.cutFrames ?? [];

  const hasBpm     = analysis != null && analysis.bpm != null;
  const hasAnalysis = analysis != null;

  const gates = [];

  // ── MS1: Tempo lock (HARD) ───────────────────────────────────────────────
  if (!hasBpm) {
    const ms1Unverified = musicIntent && !hasAnalysis;
    gates.push({
      id: 1, name: 'Tempo lock', hard: true, advisory: false,
      pass: false, skip: !ms1Unverified, measured: null,
      ...(ms1Unverified ? { status: 'unverified' } : {}),
      threshold: { bpmTolerance },
      skipReason: ms1Unverified
        ? 'music intent declared but analysis not run'
        : 'no audio analysis provided',
    });
  } else {
    const detectedBpm = analysis.bpm;
    // Check 1:1 ratio and octave relations (×2, ÷2) — half/double-time detection.
    const candidates = [
      { ratio: 1,   candidate: detectedBpm },
      { ratio: 2,   candidate: detectedBpm * 2 },
      { ratio: 0.5, candidate: detectedBpm / 2 },
    ];
    let bestDelta  = Infinity;
    let bestOctave = 1;
    for (const { ratio, candidate } of candidates) {
      const delta = Math.abs(declaredBpm - candidate) / candidate;
      if (delta < bestDelta) { bestDelta = delta; bestOctave = ratio; }
    }
    const pass = bestDelta <= bpmTolerance;
    gates.push({
      id: 1, name: 'Tempo lock', hard: true, advisory: false,
      pass, skip: false,
      measured: {
        declaredBpm,
        detectedBpm: +detectedBpm.toFixed(2),
        deltaPercent: +(bestDelta * 100).toFixed(2),
        octaveRelation: bestOctave !== 1 ? bestOctave : null,
      },
      threshold: { bpmTolerance },
    });
  }

  // ── MS2: Downbeat lock (HARD) ────────────────────────────────────────────
  if (!hasBpm) {
    const ms2Unverified = musicIntent && !hasAnalysis;
    gates.push({
      id: 2, name: 'Downbeat lock', hard: true, advisory: false,
      pass: false, skip: !ms2Unverified, measured: null,
      ...(ms2Unverified ? { status: 'unverified' } : {}),
      threshold: { downbeatFrameTol },
      skipReason: ms2Unverified
        ? 'music intent declared but analysis not run'
        : 'no audio analysis provided',
    });
  } else {
    const beatPeriodSec   = 60 / analysis.bpm;
    const downbeatTolSec  = downbeatFrameTol / fps;
    const phase           = phaseDiff(declaredDownbeatSec, analysis.firstBeatSec, beatPeriodSec);
    const pass            = phase <= downbeatTolSec;
    gates.push({
      id: 2, name: 'Downbeat lock', hard: true, advisory: false,
      pass, skip: false,
      measured: {
        declaredFirstDownbeatSec: declaredDownbeatSec,
        detectedFirstBeatSec: analysis.firstBeatSec,
        phaseDiffSec: +phase.toFixed(4),
        beatPeriodSec: +beatPeriodSec.toFixed(4),
      },
      threshold: { downbeatFrameTol, downbeatTolSec: +downbeatTolSec.toFixed(4) },
    });
  }

  // ── MS3: Climax on drop (advisory) ──────────────────────────────────────
  const hasDrops    = hasAnalysis && Array.isArray(analysis.drops) && analysis.drops.length > 0;
  const hasClimaxF  = climaxFrame != null;
  if (!hasAnalysis || !hasDrops || !hasClimaxF) {
    const ms3Unverified = musicIntent && !hasAnalysis;
    const skipReason = ms3Unverified
      ? 'music intent declared but analysis not run'
      : !hasAnalysis
        ? 'no audio analysis provided'
        : !hasDrops ? 'no drops in analysis' : 'no climax frame declared';
    gates.push({
      id: 3, name: 'Climax on drop', hard: false, advisory: true,
      pass: false, skip: !ms3Unverified, measured: null,
      ...(ms3Unverified ? { status: 'unverified' } : {}),
      threshold: { climaxTolFrames },
      skipReason,
    });
  } else {
    let nearestDropFrame = null;
    let nearestDist      = Infinity;
    for (const drop of analysis.drops) {
      const dropFrame = Math.round(drop.t * fps);
      const dist      = Math.abs(climaxFrame - dropFrame);
      if (dist < nearestDist) { nearestDist = dist; nearestDropFrame = dropFrame; }
    }
    const pass = nearestDist <= climaxTolFrames;
    gates.push({
      id: 3, name: 'Climax on drop', hard: false, advisory: true,
      pass, skip: false,
      measured: { climaxFrame, nearestDropFrame, distFrames: nearestDist },
      threshold: { climaxTolFrames },
    });
  }

  // ── MS4: Cut-on-beat coverage (advisory) ────────────────────────────────
  if (!hasBpm || cutFrames.length === 0) {
    const skipReason = !hasBpm
      ? 'no audio analysis provided'
      : 'no cut frames in timeline';
    gates.push({
      id: 4, name: 'Cut-on-beat coverage', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { cutBeatTolFrames, beatCoverageFloor },
      skipReason,
    });
  } else {
    const lastCut  = Math.max(...cutFrames);
    const beatGrid = buildBeatGrid(analysis.firstBeatSec, analysis.bpm, fps, lastCut);

    let onBeatCount = 0;
    const cuts = cutFrames.map(frame => {
      let minDist = Infinity;
      for (const bf of beatGrid) {
        const d = Math.abs(frame - bf);
        if (d < minDist) minDist = d;
        if (d === 0) break;
      }
      const onBeat = minDist <= cutBeatTolFrames;
      if (onBeat) onBeatCount++;
      return { frame, distFrames: minDist, onBeat };
    });

    const share = onBeatCount / cutFrames.length;
    const pass  = share >= beatCoverageFloor;
    gates.push({
      id: 4, name: 'Cut-on-beat coverage', hard: false, advisory: true,
      pass, skip: false,
      measured: {
        totalCuts: cutFrames.length,
        onBeatCuts: onBeatCount,
        share: +share.toFixed(3),
        cuts,
      },
      threshold: { cutBeatTolFrames, beatCoverageFloor },
    });
  }

  const hardGatesPass = gates.filter(g => g.hard).every(g => g.skip || g.pass || g.status === 'unverified');
  const summary = {
    passed:     gates.filter(g => !g.skip && g.status !== 'unverified' &&  g.pass).length,
    failed:     gates.filter(g => !g.skip && g.status !== 'unverified' && !g.pass).length,
    skipped:    gates.filter(g =>  g.skip).length,
    unverified: gates.filter(g =>  g.status === 'unverified').length,
    declaredBpm,
    fps,
    totalCuts: cutFrames.length,
  };

  const analysisPresent = hasAnalysis;
  const verdict = !analysisPresent && musicIntent ? 'unverified'
    : !analysisPresent ? 'skip'
    : hardGatesPass ? 'pass' : 'fail';

  return { musicIntent, analysisPresent, verdict, gates, summary, hardGatesPass };
}
