/**
 * Regression tests for computeMotionMetrics.
 *
 * Four fixture sets:
 *   - Golden positive:   smooth bell-curve motion → PASS all 3 gates.
 *   - Jank/stutter:      motion run with dropout → M1 hard FAIL.
 *   - Linear plateau:    flat constant delta → M2 advisory FAIL, M1 PASS.
 *   - Missing frames:    fewer than 2 frames / null entries → gates SKIP.
 *
 * Frames are { width, height, channels, pixels } objects (same as decodePNG returns)
 * so we exercise pure computation without PNG I/O.
 *
 * 16×16 RGB frames where R=G=B=fill → luminance = fill.
 * Mean abs delta between uniform fill=a and fill=b = |a − b|.
 */

import { describe, expect, it } from 'vitest';
import { computeMotionMetrics } from './motion-metrics.mjs';

const W = 16;
const H = 16;

function makeFrame(fill) {
  const pixels = Buffer.alloc(W * H * 3, fill);
  return { width: W, height: H, channels: 3, pixels };
}

// ---------------------------------------------------------------------------
// Golden positive fixture — smooth eased motion, all gates pass
//
// Fill sequence creates a bell-curve energy profile:
//   fills: 100, 101, 103, 106, 110, 115, 121, 128, 135, 141, 146, 150, 153, 155, 156
//   deltas:     1,   2,   3,   4,   5,   6,   7,   7,   6,   5,   4,   3,   2,   1
//
// M1: no pair < STUTTER_FLOOR (0.05) within an active run → PASS
// M2: peak=7, mean=sum(1..6,7,7,6..1)/14=56/14=4.0, ratio=1.75 ≥ 1.5 → PASS
// M3: all windowed means > 0.02 → PASS
// ---------------------------------------------------------------------------

const bellFills = [100, 101, 103, 106, 110, 115, 121, 128, 135, 141, 146, 150, 153, 155, 156];
const bellFrames = bellFills.map(makeFrame);

describe('computeMotionMetrics — golden positive (smooth bell-curve)', () => {
  const verdict = computeMotionMetrics(bellFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('summary: 3 passed, 0 failed, 0 skipped', () => {
    expect(verdict.summary.passed).toBe(3);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(0);
  });

  it('M1 (stutter, hard) passes — no dropout within active run', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.stutterDetected).toBe(false);
  });

  it('M2 (easing, advisory) passes — peak/mean ratio ≥ 1.5', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.ratio).toBeGreaterThanOrEqual(1.5);
    expect(g.measured.peakDelta).toBeGreaterThan(g.measured.meanDelta);
  });

  it('M3 (sustained life, advisory) passes — min windowed mean above life floor', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.minWindowMean).toBeGreaterThanOrEqual(0.02);
  });

  it('summary contains expected frame counts', () => {
    expect(verdict.summary.samples).toBe(bellFrames.length);
    expect(verdict.summary.step).toBe(3);
    expect(verdict.summary.totalFrames).toBe((bellFrames.length - 1) * 3);
  });
});

// ---------------------------------------------------------------------------
// Jank fixture — M1 hard FAIL
//
// 7 frames; fills: 100, 105, 110, 110, 115, 120, 125
// Deltas:                5,   5,   0,   5,   5,   5
//
// pair 2 (delta=0) is flanked by active runs of 2+ pairs on each side:
//   runBefore[1] = 2 ≥ MIN_ACTIVE_RUN (2) ✓
//   runAfter[3]  = 3 ≥ MIN_ACTIVE_RUN (2) ✓
//   delta[2] = 0 < STUTTER_FLOOR (0.05)   ✓
// → stutter detected → M1 FAIL (hard), hardGatesPass = false
// ---------------------------------------------------------------------------

const jankFrames = [100, 105, 110, 110, 115, 120, 125].map(makeFrame);

describe('computeMotionMetrics — jank (M1 hard FAIL: dropout at pair 2)', () => {
  const verdict = computeMotionMetrics(jankFrames, { step: 3, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('M1 (stutter) fails — dropout detected', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.stutterDetected).toBe(true);
    expect(g.measured).toHaveProperty('stutterAtFrame');
  });

  it('M2 and M3 are advisory and do not affect hardGatesPass', () => {
    const g2 = verdict.gates.find(g => g.id === 2);
    const g3 = verdict.gates.find(g => g.id === 3);
    expect(g2.advisory).toBe(true);
    expect(g3.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Linear plateau fixture — M2 advisory FAIL, M1 PASS
//
// 10 frames all with delta=5 between consecutive pairs (constant motion).
// Deltas: [5, 5, 5, 5, 5, 5, 5, 5, 5]
//
// M1: no pair < STUTTER_FLOOR, no dropout → PASS
// M2: peak=5, mean=5, ratio=1.0 < 1.5 → FAIL (advisory)
// M3: min windowed mean=5 >> 0.02 → PASS
// hardGatesPass = true (M1 hard PASS; M2 advisory FAIL doesn't block)
// ---------------------------------------------------------------------------

// Each consecutive frame is 5 higher, so delta between any consecutive pair = 5.
const plateauFrames = Array.from({ length: 10 }, (_, i) => makeFrame(100 + i * 5));

describe('computeMotionMetrics — linear plateau (M2 advisory FAIL: robotic easing)', () => {
  const verdict = computeMotionMetrics(plateauFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true — M2 is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('M1 (stutter) passes — constant motion, no dropouts', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.pass).toBe(true);
    expect(g.measured.stutterDetected).toBe(false);
  });

  it('M2 (easing) fails — flat plateau: ratio=1.0 < 1.5', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.measured.ratio).toBeCloseTo(1.0, 2);
  });

  it('M3 (sustained life) passes — constant motion is well above life floor', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Missing-frames fixture — all gates SKIP
//
// Fewer than 2 frames → skip gate contract (missing frames SKIP not FAIL).
// hardGatesPass = true (all hard gates skipped = pass-or-skip).
// ---------------------------------------------------------------------------

describe('computeMotionMetrics — missing frames (fewer than 2 → all SKIP)', () => {
  const verdict = computeMotionMetrics([makeFrame(128)], { step: 3, fps: 30 });

  it('hardGatesPass is true (all hard gates skipped)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 3 gates are skipped', () => {
    expect(verdict.summary.skipped).toBe(3);
    expect(verdict.summary.passed).toBe(0);
    expect(verdict.summary.failed).toBe(0);
  });

  it('M1 (hard) is skipped — not a FAIL', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.skip).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
  });

  it('empty frame list also skips all gates', () => {
    const v2 = computeMotionMetrics([], { step: 3, fps: 30 });
    expect(v2.hardGatesPass).toBe(true);
    expect(v2.summary.skipped).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Cut masking — declared cut isolates scene-transition spike from stutter detection
//
// 8 frames; fills: 100, 105, 110, 200 (cut!), 110, 115, 120, 125
// Deltas: [5, 5, 90, 90, 5, 5, 5]  — pairs 2 and 3 are a scene cut (delta ≥ CUT_FLOOR=15)
// After auto-cut-masking (pairs 1,2,3 masked as neighbors), remaining pairs: [5, 5, 5]
// No stutter in remaining pairs → M1 PASS
// ---------------------------------------------------------------------------

const cutFrames = [100, 105, 110, 200, 110, 115, 120, 125].map(makeFrame);

describe('computeMotionMetrics — cut masking (scene transition auto-detected)', () => {
  const verdict = computeMotionMetrics(cutFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true — cut masked; no stutter in remaining pairs', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('M1 passes — transition spike masked as cut, not a stutter', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.pass).toBe(true);
    expect(g.measured.stutterDetected).toBe(false);
    expect(g.measured.cutsDetected).toBeGreaterThanOrEqual(1);
  });

  it('cuts detected > 0', () => {
    expect(verdict.summary.cutsDetected).toBeGreaterThan(0);
  });

  it('M3 skips — cut masking leaves only 3 unmasked pairs (< M3_WINDOW=5)', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// M3 independent skip — enough frames for M1+M2 but too few unmasked pairs for M3
//
// 4 frames; fills: [100, 110, 120, 130]
// 3 pairs all unmasked (no cut; nothing >= CUT_FLOOR=15) → 3 < M3_WINDOW=5 → M3 SKIP
// M1: constant motion (all pairs active), no dropout → PASS
// M2: peak=10, mean=10, ratio=1.0 < 1.5 → FAIL (advisory)
// M3: 3 pairs < M3_WINDOW=5 → SKIP
// hardGatesPass = true (M1 hard PASS; M2 advisory FAIL and M3 skip do not block)
// ---------------------------------------------------------------------------

const m3SkipFrames = [100, 110, 120, 130].map(makeFrame);

describe('computeMotionMetrics — M3 independent skip (too few unmasked pairs)', () => {
  const verdict = computeMotionMetrics(m3SkipFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true — M3 skip and M2 advisory FAIL do not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('M1 (stutter, hard) passes — constant motion, no dropouts', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.stutterDetected).toBe(false);
  });

  it('M2 (easing, advisory) fails — flat plateau, ratio=1.0 < 1.5', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.ratio).toBeCloseTo(1.0, 2);
  });

  it('M3 (sustained life, advisory) skips — 3 unmasked pairs is below M3_WINDOW=5', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(true);
    expect(g.pass).toBe(false);
  });

  it('summary: 1 passed, 1 failed, 1 skipped', () => {
    expect(verdict.summary.passed).toBe(1);
    expect(verdict.summary.failed).toBe(1);
    expect(verdict.summary.skipped).toBe(1);
  });
});
