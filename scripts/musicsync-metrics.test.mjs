/**
 * Golden tests for computeMusicSync.
 *
 * Six fixture scenarios (each in its own describe block):
 *
 *   aligned-PASS        — all four gates pass; declared bpm/downbeat match analysis;
 *                          climax lands on drop; all cuts on beat.
 *   off-tempo-FAIL      — MS1 HARD FAIL: declared bpm 20% off detected, no octave match.
 *   phase-shift-FAIL    — MS2 HARD FAIL: bpm matches but downbeat phase is 0.1s off
 *                          (3× the 1-frame ≈ 0.033s tolerance).
 *   climax-off-drop     — MS3 advisory FAIL: climaxFrame 85 frames from nearest drop;
 *                          hardGatesPass remains true.
 *   off-grid-cut        — MS4 advisory FAIL: all cuts 2 frames off the beat grid;
 *                          hardGatesPass remains true.
 *   no-analysis-SKIP    — analysis=null: all 4 gates skip, hardGatesPass=true.
 *
 * Arithmetic (bpm=120, fps=30 unless noted):
 *   beatPeriodSec = 60/120 = 0.5s
 *   framesPerBeat = 0.5 × 30 = 15 frames
 *   downbeatTolSec = 1/30 ≈ 0.0333s
 */

import { describe, expect, it } from 'vitest';
import { computeMusicSync } from './musicsync-metrics.mjs';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** A clean 30fps 120bpm timeline with declared downbeat at 0s. */
const baseTimeline = {
  bpm: 120,
  fps: 30,
  firstDownbeatSec: 0,
  // beats at 0, 0.5, 1.0, 1.5s → frames 0, 15, 30, 45
  cutFrames: [15, 30, 45],
};

/** Analysis matching baseTimeline exactly (bpm 120, firstBeatSec 0s). */
const cleanAnalysis = {
  bpm: 120,
  firstBeatSec: 0,
  drops: [{ t: 1.5, jump: 0.8 }],   // frame 45 — matches cutFrames[2]
};

// ---------------------------------------------------------------------------
// 1. aligned-PASS — all four gates pass
//
// MS1: |120 - 120| / 120 = 0 ≤ 0.02 → PASS
// MS2: phaseDiff(0, 0, 0.5) = 0 ≤ 1/30 ≈ 0.033 → PASS
// MS3: climaxFrame=45, drop.t=1.5s → dropFrame=45, dist=0 ≤ 3 → PASS
// MS4: beatGrid at 0,15,30,45...; cuts [15,30,45] all dist=0 ≤ 1 → share=1.0 ≥ 0.9 → PASS
// hardGatesPass = true
// ---------------------------------------------------------------------------

describe('computeMusicSync — aligned-PASS (all four gates pass)', () => {
  const verdict = computeMusicSync({
    timeline: baseTimeline,
    analysis: cleanAnalysis,
    climaxFrame: 45,
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('summary: 4 passed, 0 failed, 0 skipped', () => {
    expect(verdict.summary.passed).toBe(4);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(0);
  });

  it('MS1 (tempo lock, hard) passes — bpm delta=0%', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.deltaPercent).toBeLessThanOrEqual(2);
  });

  it('MS2 (downbeat lock, hard) passes — phaseDiff=0', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.phaseDiffSec).toBeCloseTo(0, 4);
  });

  it('MS3 (climax on drop, advisory) passes — dist=0 frames', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.distFrames).toBe(0);
  });

  it('MS4 (cut-on-beat, advisory) passes — all cuts on beat grid', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.share).toBeCloseTo(1.0, 2);
    expect(g.measured.onBeatCuts).toBe(3);
  });

  it('verdict has expected shape: hardGatesPass, gates[4], summary', () => {
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(verdict.gates).toHaveLength(4);
    for (const gate of verdict.gates) {
      expect(typeof gate.id).toBe('number');
      expect(typeof gate.name).toBe('string');
      expect(typeof gate.hard).toBe('boolean');
      expect(typeof gate.advisory).toBe('boolean');
      expect(typeof gate.pass).toBe('boolean');
      expect(typeof gate.skip).toBe('boolean');
    }
    expect(typeof verdict.summary.passed).toBe('number');
    expect(typeof verdict.summary.failed).toBe('number');
    expect(typeof verdict.summary.skipped).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 2. off-tempo-FAIL — MS1 HARD FAIL
//
// Declared bpm=120, detected bpm=100. Delta = |120-100|/100 = 20% > 2%.
// Octave checks: |120-200|/200 = 40%; |120-50|/50 = 140% — no match.
// MS1 HARD FAIL → hardGatesPass = false.
// MS2: firstDownbeatSec=0, firstBeatSec=0 → phaseDiff=0 → PASS.
// MS3: no climaxFrame → SKIP.
// MS4: beat grid for 100bpm at fps=30: frames 0,18,36,54...
//      cuts [15,30,45]: min dists 15,12,9 — all > 1 → share=0 → advisory FAIL.
//      (hardGatesPass driven by MS1 HARD FAIL, not MS4 advisory.)
// ---------------------------------------------------------------------------

describe('computeMusicSync — off-tempo-FAIL (MS1 HARD FAIL)', () => {
  const verdict = computeMusicSync({
    timeline: baseTimeline,
    analysis: { ...cleanAnalysis, bpm: 100 },
    // no climaxFrame
  });

  it('hardGatesPass is false — MS1 is a hard gate', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('MS1 (tempo lock, hard) fails — 20% bpm delta exceeds 2% tolerance', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.deltaPercent).toBeGreaterThan(2);
    expect(g.measured.declaredBpm).toBe(120);
    expect(g.measured.detectedBpm).toBeCloseTo(100, 1);
  });

  it('MS2 and advisory gates do not affect hardGatesPass verdict', () => {
    const g2 = verdict.gates.find(g => g.id === 2);
    const g3 = verdict.gates.find(g => g.id === 3);
    const g4 = verdict.gates.find(g => g.id === 4);
    expect(g2.hard).toBe(true);
    expect(g3.advisory).toBe(true);
    expect(g4.advisory).toBe(true);
    // MS2 passes; MS3 skips (no climaxFrame); MS4 may fail advisory
    expect(g2.pass).toBe(true);
    expect(g3.skip).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. phase-shift-FAIL — MS2 HARD FAIL
//
// Declared bpm=120 matches detected bpm=120 → MS1 PASS.
// Declared firstDownbeatSec=0.1, detected firstBeatSec=0.5, beatPeriod=0.5s.
//   diff = 0.1 - 0.5 = -0.4
//   mod  = ((-0.4 % 0.5) + 0.5) % 0.5 = (-0.4 + 0.5) % 0.5 = 0.1 % 0.5 = 0.1
//   phaseDiff = min(0.1, 0.4) = 0.1s
//   downbeatTolSec = 1/30 ≈ 0.033s
//   0.1 > 0.033 → MS2 HARD FAIL → hardGatesPass = false.
// ---------------------------------------------------------------------------

describe('computeMusicSync — phase-shift-FAIL (MS2 HARD FAIL)', () => {
  const phaseShiftedTimeline = {
    ...baseTimeline,
    firstDownbeatSec: 0.1,   // declared beat at 0.1s
  };
  const verdict = computeMusicSync({
    timeline: phaseShiftedTimeline,
    analysis: { bpm: 120, firstBeatSec: 0.5, drops: [] },
    // no climaxFrame
  });

  it('hardGatesPass is false — MS2 is a hard gate', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('MS1 (tempo lock, hard) passes — bpm matches exactly', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.deltaPercent).toBeCloseTo(0, 2);
  });

  it('MS2 (downbeat lock, hard) fails — phaseDiff 0.1s > 1-frame tolerance', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.phaseDiffSec).toBeGreaterThan(1 / 30);
    expect(g.measured.phaseDiffSec).toBeCloseTo(0.1, 3);
    expect(g.measured.beatPeriodSec).toBeCloseTo(0.5, 3);
  });

  it('MS3 and MS4 are advisory — do not affect hardGatesPass', () => {
    const g3 = verdict.gates.find(g => g.id === 3);
    const g4 = verdict.gates.find(g => g.id === 4);
    expect(g3.advisory).toBe(true);
    expect(g4.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. climax-off-drop — MS3 advisory FAIL, hardGatesPass unaffected
//
// MS1+MS2: bpm=120 matches, firstDownbeatSec=0 matches firstBeatSec=0 → both PASS.
// MS3: climaxFrame=100, drop at t=0.5s → dropFrame=15, dist=|100-15|=85 > 3 → FAIL.
// MS4: cuts [15,30,45] on beat grid → PASS.
// hardGatesPass = true (MS3 is advisory).
// ---------------------------------------------------------------------------

describe('computeMusicSync — climax-off-drop (MS3 advisory FAIL)', () => {
  const verdict = computeMusicSync({
    timeline: baseTimeline,
    analysis: { bpm: 120, firstBeatSec: 0, drops: [{ t: 0.5, jump: 0.9 }] },
    climaxFrame: 100,
  });

  it('hardGatesPass is true — MS3 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('MS3 (climax on drop, advisory) fails — dist=85 frames >> 3-frame tolerance', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.distFrames).toBeGreaterThan(3);
    expect(g.measured.climaxFrame).toBe(100);
    expect(g.measured.nearestDropFrame).toBe(15);  // 0.5s × 30fps
  });

  it('MS1 and MS2 (hard gates) both pass', () => {
    const g1 = verdict.gates.find(g => g.id === 1);
    const g2 = verdict.gates.find(g => g.id === 2);
    expect(g1.pass).toBe(true);
    expect(g2.pass).toBe(true);
  });

  it('MS4 (advisory) passes — cuts are on beat', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. off-grid-cut — MS4 advisory FAIL, hardGatesPass unaffected
//
// MS1+MS2: bpm=120 matches, firstDownbeatSec=0 matches → both PASS.
// MS3: no climaxFrame → SKIP.
// MS4: cuts at [17, 32] — each 2 frames off the beat grid (beats at 0,15,30,45...).
//      dist(17, nearest=15)=2 > 1 → off; dist(32, nearest=30)=2 > 1 → off.
//      share = 0/2 = 0 < 0.9 → advisory FAIL.
// hardGatesPass = true.
// ---------------------------------------------------------------------------

describe('computeMusicSync — off-grid-cut (MS4 advisory FAIL)', () => {
  const offGridTimeline = { ...baseTimeline, cutFrames: [17, 32] };
  const verdict = computeMusicSync({
    timeline: offGridTimeline,
    analysis: cleanAnalysis,
    // no climaxFrame
  });

  it('hardGatesPass is true — MS4 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('MS4 (cut-on-beat, advisory) fails — 0 of 2 cuts on beat grid', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.onBeatCuts).toBe(0);
    expect(g.measured.totalCuts).toBe(2);
    expect(g.measured.share).toBeCloseTo(0, 2);
    // Both cuts are 2 frames off
    for (const cut of g.measured.cuts) {
      expect(cut.distFrames).toBe(2);
      expect(cut.onBeat).toBe(false);
    }
  });

  it('MS1 and MS2 (hard gates) both pass', () => {
    const g1 = verdict.gates.find(g => g.id === 1);
    const g2 = verdict.gates.find(g => g.id === 2);
    expect(g1.pass).toBe(true);
    expect(g2.pass).toBe(true);
  });

  it('MS3 skips (no climaxFrame declared)', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. no-analysis-SKIP — all four gates skip, hardGatesPass=true
//
// When analysis=null, every gate is audio-dependent and reports skip:true.
// SKIP never blocks ship: hardGatesPass=true because all hard gates skip (not fail).
// ---------------------------------------------------------------------------

describe('computeMusicSync — no-analysis-SKIP (analysis=null)', () => {
  const verdict = computeMusicSync({
    timeline: baseTimeline,
    analysis: null,
    climaxFrame: 45,
  });

  it('hardGatesPass is true — all hard gates skipped (SKIP ≠ FAIL)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('summary: 0 passed, 0 failed, 4 skipped', () => {
    expect(verdict.summary.passed).toBe(0);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(4);
  });

  it('MS1 (hard) skips — not a FAIL', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.measured).toBeNull();
  });

  it('MS2 (hard) skips — not a FAIL', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(true);
    expect(g.pass).toBe(false);
  });

  it('MS3 (advisory) skips', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(true);
  });

  it('MS4 (advisory) skips', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(true);
  });

  it('all skip reasons mention missing analysis', () => {
    for (const gate of verdict.gates) {
      expect(gate.skipReason).toMatch(/no audio analysis/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Divergent-shape fixtures (render-free)
//
// These cover musicsync code paths not exercised by relay/granipa (both fast-
// bpm, drop-annotated, fully cut-mapped):
//
//   (A) Slow 72bpm ambient: MS1/MS2 PASS (exact match, zero phase error),
//       MS3 PASS (climax on drop at t=1.5s=frame45), MS4 PASS (cuts [25,50,75]
//       on 72bpm beat grid at 25 frames/beat). No false-block on slow tempo.
//
//   (B) Empty drops array: MS3 SKIP (hasDrops=false). MS1/MS2/MS4 still run.
//       No false-block when music has no annotated drops.
//
//   (C) Octave BPM relation (declared=120, detected=60): MS1 PASS via octave
//       check (60×2=120=declared). Half-time mixing/scoring accepted.
//
//   (D) Empty cutFrames: MS4 SKIP. MS1/MS2/MS3 still evaluate normally.
//       No false-block when timeline has no cut markers declared.
//
// Result: robust, zero mis-fires on divergent musical shapes.
// ---------------------------------------------------------------------------

describe('computeMusicSync — divergent (A): slow 72bpm ambient track (all PASS or SKIP-only)', () => {
  // At 72bpm, fps=30: framesPerBeat=25. Cuts at [25,50,75] land on beats 1,2,3.
  // Drop at t=1.5s → frame=45 = climaxFrame → MS3 distFrames=0 → PASS.
  const slowTimeline = { bpm: 72, fps: 30, firstDownbeatSec: 0, cutFrames: [25, 50, 75] };
  const slowAnalysis  = { bpm: 72, firstBeatSec: 0, drops: [{ t: 1.5, jump: 0.6 }] };
  const verdict = computeMusicSync({ timeline: slowTimeline, analysis: slowAnalysis, climaxFrame: 45 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('MS1 (bpm-match, hard) PASS — 72bpm detected matches 72bpm declared exactly', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.deltaPercent).toBeCloseTo(0, 4);
  });

  it('MS2 (phase-align, hard) PASS — firstDownbeatSec=0 matches firstBeatSec=0', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
  });

  it('MS3 (climax-on-drop, advisory) PASS — climaxFrame=45 matches drop at t=1.5s (frame 45)', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.distFrames).toBeCloseTo(0, 0);
  });

  it('MS4 (cut-on-beat, advisory) PASS — cuts [25,50,75] on 72bpm beat grid', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.onBeatCuts).toBe(3);
    expect(g.measured.totalCuts).toBe(3);
  });
});

describe('computeMusicSync — divergent (B): empty drops array (MS3 SKIP)', () => {
  // Music without annotated drops: hasDrops=false → MS3 SKIP.
  // MS1/MS2 (hard) and MS4 (advisory) still evaluate.
  const noDropsAnalysis = { bpm: 120, firstBeatSec: 0, drops: [] };
  const verdict = computeMusicSync({ timeline: baseTimeline, analysis: noDropsAnalysis, climaxFrame: 45 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('MS3 SKIP — drops=[] means no drop to check climax against', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(true);
    expect(g.pass).toBe(false);
  });

  it('MS1 (hard) still evaluates and passes', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.skip).toBe(false);
    expect(g.pass).toBe(true);
  });

  it('MS2 (hard) still evaluates and passes', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.skip).toBe(false);
    expect(g.pass).toBe(true);
  });

  it('MS4 (advisory) evaluates (cutFrames present)', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.skip).toBe(false);
  });
});

describe('computeMusicSync — divergent (C): octave BPM relation (declared=120, detected=60)', () => {
  // Half-time: detected=60 = declared/2. Octave check: 60×2=120=declared → MS1 PASS.
  const halfTimeAnalysis = { bpm: 60, firstBeatSec: 0, drops: [] };
  const verdict = computeMusicSync({ timeline: baseTimeline, analysis: halfTimeAnalysis, climaxFrame: 45 });

  it('hardGatesPass is true — octave relation accepted', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('MS1 PASS via octave check — 60×2=120 matches declared=120', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
  });

  it('MS2 (phase-align, hard) PASS', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
  });

  it('MS3 SKIP — no drops in half-time analysis', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(true);
  });
});

describe('computeMusicSync — divergent (D): empty cutFrames (MS4 SKIP)', () => {
  // Music-less minimal scene with no cut markers declared.
  // MS4 skips when cutFrames=[]. MS1/MS2/MS3 still evaluate.
  const noCutsTimeline = { ...baseTimeline, cutFrames: [] };
  const verdict = computeMusicSync({ timeline: noCutsTimeline, analysis: cleanAnalysis, climaxFrame: 45 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('MS4 SKIP — cutFrames=[] means no cuts to check on beat grid', () => {
    const g = verdict.gates.find(g => g.id === 4);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(true);
  });

  it('MS1 and MS2 (hard) still pass', () => {
    expect(verdict.gates.find(g => g.id === 1).pass).toBe(true);
    expect(verdict.gates.find(g => g.id === 2).pass).toBe(true);
  });

  it('MS3 evaluates and passes — cleanAnalysis has drops, climaxFrame=45 matches drop at t=1.5s', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.skip).toBe(false);
    expect(g.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Octave-relation acceptance — MS1 should pass when analysis detects half/double bpm
//
// Declared bpm=120; detected bpm=60 (half-time) → octave relation ÷2.
// deltaPercent = |120 - 60×2| / (60×2) = 0 → PASS.
// ---------------------------------------------------------------------------

describe('computeMusicSync — MS1 octave relation (half-time detection accepts)', () => {
  const verdict = computeMusicSync({
    timeline: baseTimeline,
    analysis: { bpm: 60, firstBeatSec: 0, drops: [] },
  });

  it('MS1 passes — declared=120, detected=60 (octave ×2 accepted)', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.pass).toBe(true);
    expect(g.measured.octaveRelation).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Downbeat modulo — MS2 passes when declared downbeat is exactly one beat earlier
//
// Declared firstDownbeatSec=0, detected firstBeatSec=0.5, beatPeriod=0.5s.
// diff = 0 - 0.5 = -0.5; mod = 0; phaseDiff = min(0, 0.5) = 0 → PASS.
// This is correct: beat 0 (declared) is one beat before beat 0.5 (detected) —
// they are on the same phase grid.
// ---------------------------------------------------------------------------

describe('computeMusicSync — MS2 downbeat modulo (one beat earlier passes)', () => {
  const verdict = computeMusicSync({
    timeline: { ...baseTimeline, firstDownbeatSec: 0 },
    analysis: { bpm: 120, firstBeatSec: 0.5, drops: [] },
  });

  it('MS2 passes — declared=0s is one beat before detected=0.5s (same grid)', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.pass).toBe(true);
    expect(g.measured.phaseDiffSec).toBeCloseTo(0, 4);
  });
});
