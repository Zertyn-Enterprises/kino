/**
 * Unit tests for computeLegibilityMetrics.
 *
 * Fixtures:
 *   flashFrames  — L1 HARD FAIL (brief flash, terminated cut, dwell=6 < MIN_READ_FRAMES=12)
 *   heldFrames   — L1 PASS + L2 PASS + L3 PASS (dwell=12, share≈0.57, CV=0)
 *   wallFrames   — L2 advisory FAIL (share≈1.11 > 0.60, no terminated run → L1 PASS)
 *   spotFrames   — L3 advisory FAIL (ED varies within run, L1+L2 PASS)
 *   noTextFrames — skip path (N≥2 but no hold pairs → L1 pass, L2/L3 skip)
 *   singleFrame  — skip path (N<2 → all 3 gates skip, hardGatesPass=true)
 *
 * Frame anatomy (16×16 RGB, R=G=B=fill → luminance = fill since 0.299+0.587+0.114=1.0):
 *
 *   makeUniform(v):  all pixels = v, ED = 0 (no gradients)
 *
 *   makeTextFrame(): horizontal-alternating 100/101
 *     ED  = (15 horiz pairs/row × 16 rows × diff=1) / (240+240 total pairs) = 240/480 = 0.5
 *     delta(T,T) = 0                         (identical → < HOLD_DELTA_THRESHOLD=0.50 ✓)
 *     delta(T,U(100)) = 128×0 + 128×1 / 256 = 0.50  (boundary → NOT < 0.50, breaks run)
 *     delta(T,CUT)    ≈ 100.5                (>> CUT_THRESHOLD=5.0 → terminates run)
 *
 *   makeSpotFrame(): one bright pixel (200) at (0,0), rest = 100
 *     ED  = (100+100) / 480 = 200/480 ≈ 0.417   (> EDGE_DENSITY_THRESHOLD=0.30 ✓)
 *     delta(S,U(100)) = 100 / 256 ≈ 0.391       (< HOLD_DELTA_THRESHOLD=0.50 → hold pair ✓)
 *     ED(U(100)) = 0  → pair (U,S) NOT a hold pair (ED check on first frame fails)
 *
 * Key thresholds (from legibility-metrics.mjs):
 *   EDGE_DENSITY_THRESHOLD = 0.30
 *   HOLD_DELTA_THRESHOLD   = 0.50  (strict <)
 *   CUT_THRESHOLD          = 5.0   (strict >)
 *   MIN_READ_FRAMES        = 12    (dwell must be ≥ 12 to avoid L1 violation)
 *   MIN_HOLD_PAIRS         = 3     (run must span ≥ 3 pairs to be L1-eligible)
 *   L2_MAX_SHARE           = 0.60
 *   L3_CV_THRESHOLD        = 0.40
 *
 * Note on L1 detectability: at step=3, min eligible dwell = (3+1)×3 = 12f = MIN_READ_FRAMES,
 * so a flash is only detectable if step < 3. The L1 FAIL fixture uses step=1 to demonstrate
 * a 3-pair run with dwell=4f that genuinely violates the 0.4s floor.
 */

import { describe, expect, it } from 'vitest';
import { computeLegibilityMetrics } from './legibility-metrics.mjs';

const W = 16;
const H = 16;

function makeUniform(fill) {
  const pixels = Buffer.alloc(W * H * 3, fill);
  return { width: W, height: H, channels: 3, pixels };
}

function makeTextFrame() {
  // Horizontal-alternating 100/101 per column; all rows identical.
  // ED = 0.5 > EDGE_DENSITY_THRESHOLD. delta to another textFrame = 0.
  const pixels = Buffer.alloc(W * H * 3);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const v = c % 2 === 0 ? 100 : 101;
      const base = (r * W + c) * 3;
      pixels[base] = pixels[base + 1] = pixels[base + 2] = v;
    }
  }
  return { width: W, height: H, channels: 3, pixels };
}

function makeSpotFrame() {
  // One bright pixel at (row=0,col=0) = 200; rest = 100.
  // ED ≈ 0.417. delta to makeUniform(100) = 100/256 ≈ 0.391 < 0.50 → hold pair.
  const pixels = Buffer.alloc(W * H * 3, 100);
  pixels[0] = pixels[1] = pixels[2] = 200;
  return { width: W, height: H, channels: 3, pixels };
}

const T   = makeTextFrame();
const S   = makeSpotFrame();
const U   = makeUniform(100); // ED=0; delta(T,U)=0.50 (boundary, NOT < 0.50 → breaks run)
const CUT = makeUniform(0);   // delta(T,CUT)≈100.5 >> CUT_THRESHOLD=5.0 → terminates run

// ---------------------------------------------------------------------------
// L1 HARD FAIL — brief presented flash (terminated cut, dwell < MIN_READ_FRAMES)
//
// [T, T, T, T, CUT] — N=5, step=1
//   pairs 0,1,2 (T→T): hold pairs (ED=0.5>0.30, delta=0<0.50)
//   pair 3 (T→CUT): delta≈100.5 > 0.50 → NOT hold pair → run ends
//   Run {start:0,end:2}: runLength=3 ≥ MIN_HOLD_PAIRS=3 → L1-eligible
//   dwell=(3+1)×1=4f < MIN_READ_FRAMES=12 → violation; afterDelta≈100.5>CUT_THRESHOLD → terminated
//   L1: flashViolations=1 (dwell=4 < MIN_READ_FRAMES=12) → HARD FAIL
//   hardGatesPass = false
// ---------------------------------------------------------------------------

const flashFrames = [T, T, T, T, CUT];

describe('computeLegibilityMetrics — L1 HARD FAIL (brief flash, terminated cut)', () => {
  const verdict = computeLegibilityMetrics(flashFrames, { step: 1, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('L1 (text-flash floor, hard) fails — dwell=4 < MIN_READ_FRAMES=12', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.flashViolations).toBeGreaterThanOrEqual(1);
    expect(g.measured.shortestDwellFrames).toBeLessThan(12);
  });

  it('L1 measured has expected fields', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.measured).toHaveProperty('textHoldIntervals');
    expect(g.measured).toHaveProperty('l1EligibleIntervals');
    expect(g.measured).toHaveProperty('flashViolations');
    expect(g.measured).toHaveProperty('shortestDwellFrames');
    expect(g.measured).toHaveProperty('firstViolationDwellFrames');
    expect(g.threshold).toHaveProperty('minReadFrames');
    expect(g.threshold).toHaveProperty('minHoldPairs');
  });

  it('L2 and L3 are advisory — do not affect hardGatesPass', () => {
    const g2 = verdict.gates.find(g => g.id === 2);
    const g3 = verdict.gates.find(g => g.id === 3);
    expect(g2.advisory).toBe(true);
    expect(g3.advisory).toBe(true);
  });

  it('JSON shape: verdict has hardGatesPass, gates, summary', () => {
    expect(verdict).toHaveProperty('hardGatesPass');
    expect(verdict).toHaveProperty('gates');
    expect(verdict).toHaveProperty('summary');
    expect(Array.isArray(verdict.gates)).toBe(true);
    expect(verdict.gates).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// L1 HARD PASS — held block long enough to read (dwell ≥ MIN_READ_FRAMES)
//
// [T,T,T,T, U,U,U,U] — N=8, step=3
//   pairs 0,1,2 (T→T): hold pairs (delta=0 < 0.50, ED=0.5 > 0.30)
//   pair 3 (T→U):       delta=0.50 (NOT < 0.50) → NOT hold pair → run ends
//   Run {start:0,end:2}: runLength=3, dwell=(3+1)×3=12 ≥ 12
//   afterDelta = delta(T→U) = 0.50 < CUT_THRESHOLD=5.0 → terminated=false
//   L1: no terminated violations → PASS
//   L2: totalHeldFrames=12, totalFrames=(8-1)×3=21, share=12/21≈0.571 ≤ 0.60 → PASS
//   L3: runEdges all T (ED=0.5), CV=0 ≤ 0.40 → PASS
//   hardGatesPass = true
// ---------------------------------------------------------------------------

const heldFrames = [T, T, T, T, U, U, U, U];

describe('computeLegibilityMetrics — L1 HARD PASS (held block, dwell=12)', () => {
  const verdict = computeLegibilityMetrics(heldFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('summary: 3 passed, 0 failed, 0 skipped', () => {
    expect(verdict.summary.passed).toBe(3);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(0);
  });

  it('L1 (text-flash floor, hard) passes — dwell=12 ≥ MIN_READ_FRAMES', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.flashViolations).toBe(0);
    expect(g.measured.textHoldIntervals).toBeGreaterThanOrEqual(1);
  });

  it('L2 (reading-budget share, advisory) passes — share ≈ 0.571 ≤ 0.60', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.share).toBeLessThanOrEqual(0.60);
  });

  it('L3 (detail stability, advisory) passes — identical frames, CV=0', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.meanCv).toBeCloseTo(0, 3);
  });

  it('summary contains expected frame-count fields', () => {
    const { summary } = verdict;
    expect(summary.samples).toBe(heldFrames.length);
    expect(summary.step).toBe(3);
    expect(summary.totalFrames).toBe((heldFrames.length - 1) * 3);
    expect(summary.textHoldIntervals).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// L2 advisory FAIL — wall of text (share > 0.60), hardGatesPass unaffected
//
// 10 identical T frames — N=10, step=3
//   All 9 pairs are hold pairs (T→T, delta=0, ED=0.5).
//   One run {start:0,end:8}: dwell=(9+1)×3=30 frames.
//   afterIdx=9 ≥ deltas.length=9 → terminated=false → L1 PASS (no terminated violations).
//   totalFrames=(10-1)×3=27; share=30/27≈1.11 > L2_MAX_SHARE=0.60 → L2 advisory FAIL.
//   L3: all frames identical → CV=0 → PASS.
//   hardGatesPass = true (L2 advisory FAIL does not block).
// ---------------------------------------------------------------------------

const wallFrames = Array.from({ length: 10 }, () => makeTextFrame());

describe('computeLegibilityMetrics — L2 advisory FAIL (wall of text, share > 0.60)', () => {
  const verdict = computeLegibilityMetrics(wallFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true — L2 is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('L1 (text-flash floor, hard) passes — no terminated runs', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.flashViolations).toBe(0);
  });

  it('L2 (reading-budget share, advisory) fails — share > 0.60', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.share).toBeGreaterThan(0.60);
  });

  it('L3 (detail stability, advisory) passes — constant ED, CV=0', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
  });

  it('summary: 2 passed, 1 failed (L2 advisory), 0 skipped', () => {
    expect(verdict.summary.passed).toBe(2);
    expect(verdict.summary.failed).toBe(1);
    expect(verdict.summary.skipped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// L3 advisory FAIL — unstable edge density within hold, hardGatesPass unaffected
//
// [S, U, U, U, U] — N=5, step=3
//   pair 0 (S→U): ED(S)≈0.417>0.30, delta≈0.391<0.50 → hold pair
//   pairs 1-3 (U→U): ED(U)=0<0.30 → NOT hold pairs
//   Run {start:0,end:0}: runEdges=[ED(S),ED(U)]=[0.417,0]
//   CV = stddev([0.417,0]) / mean([0.417,0]) = 0.208/0.208 = 1.0 > L3_CV_THRESHOLD=0.40 → L3 FAIL
//   afterDelta = delta(U→U) = 0 < CUT_THRESHOLD=5.0 → terminated=false → L1 PASS
//   totalHeldFrames=(1+1)×3=6, totalFrames=(5-1)×3=12, share=0.5 ≤ 0.60 → L2 PASS
//   hardGatesPass = true (L3 advisory FAIL does not block)
// ---------------------------------------------------------------------------

const spotFrames = [S, U, U, U, U];

describe('computeLegibilityMetrics — L3 advisory FAIL (unstable edge density during hold)', () => {
  const verdict = computeLegibilityMetrics(spotFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true — L3 is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('L1 (text-flash floor, hard) passes — not terminated, no violations', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.flashViolations).toBe(0);
  });

  it('L2 (reading-budget share, advisory) passes — share=0.5 ≤ 0.60', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.share).toBeCloseTo(0.5, 2);
  });

  it('L3 (detail stability, advisory) fails — ED jumps from ≈0.417 to 0 within hold', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
    expect(g.measured.meanCv).toBeGreaterThan(0.40);
  });

  it('summary: 2 passed, 1 failed (L3 advisory), 0 skipped', () => {
    expect(verdict.summary.passed).toBe(2);
    expect(verdict.summary.failed).toBe(1);
    expect(verdict.summary.skipped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Skip path (no text detected) — N≥2 but no hold pairs, L2/L3 skip conservatively
//
// Two identical uniform frames (ED=0 < EDGE_DENSITY_THRESHOLD) — no hold pairs form.
// L1: pass=true, skip=false (no intervals → no violations — conservative skip only for advisory)
// L2: skip=true (no text holds detected → cannot measure reading budget)
// L3: skip=true (no text holds detected → cannot measure stability)
// hardGatesPass = true
// ---------------------------------------------------------------------------

describe('computeLegibilityMetrics — skip path (no text holds detected)', () => {
  const noTextFrames = [makeUniform(128), makeUniform(128)];
  const verdict = computeLegibilityMetrics(noTextFrames, { step: 3, fps: 30 });

  it('hardGatesPass is true (L1 passes trivially — no intervals to violate)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('L1 passes (no holds detected → no flash violations possible)', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.textHoldIntervals).toBe(0);
    expect(g.measured.flashViolations).toBe(0);
  });

  it('L2 skips (no text holds → algorithm cannot measure reading budget)', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
  });

  it('L3 skips (no text holds → algorithm cannot measure stability)', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
  });

  it('summary: 1 passed (L1), 0 failed, 2 skipped (L2+L3)', () => {
    expect(verdict.summary.passed).toBe(1);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Skip path (fewer than 2 frames) — all 3 gates skip, hardGatesPass=true
//
// N<2 always produces the short-circuit path: all gates skip, pass=false,
// hardGatesPass=true (all hard gates are skipped = pass-or-skip satisfied).
// ---------------------------------------------------------------------------

describe('computeLegibilityMetrics — skip path (fewer than 2 frames)', () => {
  it('hardGatesPass is true when 1 frame provided (all gates skip)', () => {
    const verdict = computeLegibilityMetrics([makeUniform(128)], { step: 3, fps: 30 });
    expect(verdict.hardGatesPass).toBe(true);
    expect(verdict.summary.skipped).toBe(3);
    expect(verdict.summary.passed).toBe(0);
    expect(verdict.summary.failed).toBe(0);
  });

  it('hardGatesPass is true when 0 frames provided (all gates skip)', () => {
    const verdict = computeLegibilityMetrics([], { step: 3, fps: 30 });
    expect(verdict.hardGatesPass).toBe(true);
    expect(verdict.summary.skipped).toBe(3);
  });

  it('L1 (hard gate) is skip=true — not a FAIL', () => {
    const verdict = computeLegibilityMetrics([makeUniform(64)], { step: 3, fps: 30 });
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.skip).toBe(true);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Exit-code / JSON-shape contract
//
// hardGatesPass mirrors L1 only — advisory fails (L2, L3) never affect it.
// The verdict object always has the expected shape regardless of pass/fail.
// ---------------------------------------------------------------------------

describe('computeLegibilityMetrics — exit-code / JSON-shape contract', () => {
  it('hardGatesPass=false iff L1 hard gate fails (flash fixture, step=1)', () => {
    const verdict = computeLegibilityMetrics(flashFrames, { step: 1, fps: 30 });
    const l1 = verdict.gates.find(g => g.id === 1);
    expect(l1.pass).toBe(false);
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('hardGatesPass=true when L2 advisory fails (wall fixture)', () => {
    const verdict = computeLegibilityMetrics(wallFrames, { step: 3, fps: 30 });
    const l2 = verdict.gates.find(g => g.id === 2);
    expect(l2.pass).toBe(false);
    expect(l2.advisory).toBe(true);
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('hardGatesPass=true when L3 advisory fails (spot fixture)', () => {
    const verdict = computeLegibilityMetrics(spotFrames, { step: 3, fps: 30 });
    const l3 = verdict.gates.find(g => g.id === 3);
    expect(l3.pass).toBe(false);
    expect(l3.advisory).toBe(true);
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('verdict shape: hardGatesPass is boolean, gates is array of 3, summary has required keys', () => {
    const verdict = computeLegibilityMetrics(heldFrames, { step: 3, fps: 30 });
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(verdict.gates).toHaveLength(3);
    const { summary } = verdict;
    expect(typeof summary.passed).toBe('number');
    expect(typeof summary.failed).toBe('number');
    expect(typeof summary.skipped).toBe('number');
    expect(typeof summary.totalFrames).toBe('number');
    expect(typeof summary.samples).toBe('number');
    expect(typeof summary.step).toBe('number');
    expect(typeof summary.textHoldIntervals).toBe('number');
  });

  it('each gate has id, name, hard, advisory, pass, skip fields', () => {
    const verdict = computeLegibilityMetrics(heldFrames, { step: 3, fps: 30 });
    for (const gate of verdict.gates) {
      expect(typeof gate.id).toBe('number');
      expect(typeof gate.name).toBe('string');
      expect(typeof gate.hard).toBe('boolean');
      expect(typeof gate.advisory).toBe('boolean');
      expect(typeof gate.pass).toBe('boolean');
      expect(typeof gate.skip).toBe('boolean');
    }
  });
});
