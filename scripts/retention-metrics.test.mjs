/**
 * Regression tests for computeRetentionMetrics.
 *
 * Two fixture sets:
 *   - Golden positive: synthetic frames engineered to PASS all 3 gates.
 *   - Golden negative: synthetic frames engineered to FAIL gate 1 (hard).
 *
 * Frames are { width, height, channels, pixels } objects — the same shape
 * decodePNG returns — so we exercise the pure-computation path without PNG I/O.
 *
 * Frame layout (16×16, RGB, R=G=B=v so luminance = v):
 *   Each frame is uniform with a configurable fill value.
 *   Mean abs delta between frames A (fill=a) and B (fill=b) = |a − b|.
 *
 * Gate thresholds at play:
 *   DEAD_AIR_FLOOR     = 1.0  (delta below = static)
 *   DEAD_AIR_MAX_SEC   = 1.0  (1s = 30 frames; at step=5 → 6 consecutive static pairs)
 *   ENERGY_SPIKE_FLOOR = 2.0  (above = re-hook punch)
 *   RESOLVE_RATIO      = 0.75 (post-climax energy must be < 75% of peak)
 */

import { describe, expect, it } from 'vitest';
import { computeRetentionMetrics } from './retention-metrics.mjs';

const W = 16;
const H = 16;

/** Build a 16×16 RGB frame with uniform luminance = fill (0–255). */
function makeFrame(fill) {
  const pixels = Buffer.alloc(W * H * 3, fill);
  return { width: W, height: H, channels: 3, pixels };
}

// ---------------------------------------------------------------------------
// Golden positive fixture — all 3 gates pass
//
// 20 frames at step=5 → 100 real frames, 3.33s
// Energy sequence (delta between consecutive sample pairs):
//   pairs 0-1:  delta=0.5  (static, below floor=1.0)  → only 2 consecutive = 0.67s < 1s → gate1 PASS
//   pair 2:     delta=5.0  (spike > 2.0 → punch)
//   pairs 3-8:  delta=0.5  (6 consecutive static)
//   pair 9:     delta=8.0  (peak; also a punch)        → gate2: peak@pair9=45 frame,
//                                                          boundary=first-third= floor(95/3)=31 → PASS
//   pairs 10-13: delta=3.0  (spikes, keep re-hook cadence alive)
//   pairs 14-18: delta=0.5  (static tail, 5 pairs = 1.67s but < rehookSec=8 since punch at 13)
//   pair 19: last real index (N-1=19 doesn't exist as a pair; only 0..N-2=18 pairs)
//
// We have 20 frames → 19 pairs.
// Let's design the fills deliberately:
//   frame[0] = 100
//   frame[1] = 100  (delta[0]=0, below 1.0 → static)
//   frame[2] = 100  (delta[1]=0 → static)
//   frame[3] = 105  (delta[2]=5, spike) — anchor
//   frame[4] = 105  (delta[3]=0 → static)
//   ...
//   frame[9] = 105  (delta[8]=0 → static, pairs 3-8 = 6 consecutive static) → 6*5=30frames=1.0s exactly
//                    spec says ">1s" → 6 pairs = exactly 1.0s = NOT a fail (not >1.0s)
//   frame[10]= 113  (delta[9]=8, peak spike) — anchor
//   frame[11]= 110  (delta[10]=3 > 2 → spike) — anchor
//   frame[12]= 107  (delta[11]=3 > 2 → spike) — anchor
//   frame[13]= 104  (delta[12]=3 > 2 → spike) — anchor
//   frame[14]= 104  (delta[13]=0 → static)
//   frame[15]= 104  (delta[14]=0 → static)
//   frame[16]= 104  (delta[15]=0 → static)
//   frame[17]= 104  (delta[16]=0 → static)
//   frame[18]= 104  (delta[17]=0 → static)
//   frame[19]= 104  (delta[18]=0 → static)
//
// Pair deltas: [0,0,5,0,0,0,0,0,0,8,3,3,3,0,0,0,0,0,0]
// Gate 1 dead-air (excluding holds):
//   static pairs: pairs 0-1 (2 consecutive), pairs 3-8 (6 consecutive), pairs 13-18 (6 consecutive)
//   2 pairs × 5 frames = 10 frames = 0.33s < 1.0s → PASS
//   6 pairs × 5 frames = 30 frames = 1.0s → NOT > 1.0s (threshold is >1s) → PASS
//   So gate1 PASSES.
// Gate 2 energy-build-to-climax:
//   peak is delta[9]=8 at frame 9*5=45
//   total frames = 19*5 = 95; first third = 31; boundary=31
//   peakFrame=45 >= 31 → peakAfterBoundary=true
//   post-peak energy (pairs 10-18): [3,3,3,0,0,0,0,0,0] → mean = (9+0)/9 = 9/9 = 1.0
//   resolveRatio = 1.0/8.0 = 0.125 < 0.75 → resolvePass=true → gate2 PASS
// Gate 3 re-hook cadence (rehookSec=8, 8*30=240 frames):
//   Punches (delta > 2.0): pair2 → frame3*5=15, pair9 → frame10*5=50, pair10 → frame11*5=55,
//                          pair11 → frame12*5=60, pair12 → frame13*5=65
//   Anchors: 0, 15, 50, 55, 60, 65, 95
//   Gaps: 15-0=15, 50-15=35, 55-50=5, 60-55=5, 65-60=5, 95-65=30
//   longestFlat = 35 frames = 35/30 = 1.17s < 8s → gate3 PASS
// ---------------------------------------------------------------------------

const posFrames = [
  makeFrame(100), // frame 0
  makeFrame(100), // frame 1
  makeFrame(100), // frame 2
  makeFrame(105), // frame 3  — spike (delta=5 vs prev)
  makeFrame(105), // frame 4
  makeFrame(105), // frame 5
  makeFrame(105), // frame 6
  makeFrame(105), // frame 7
  makeFrame(105), // frame 8
  makeFrame(105), // frame 9
  makeFrame(113), // frame 10 — peak spike (delta=8)
  makeFrame(110), // frame 11 — spike (delta=3)
  makeFrame(107), // frame 12 — spike (delta=3)
  makeFrame(104), // frame 13 — spike (delta=3)
  makeFrame(104), // frame 14
  makeFrame(104), // frame 15
  makeFrame(104), // frame 16
  makeFrame(104), // frame 17
  makeFrame(104), // frame 18
  makeFrame(104), // frame 19
];

// ---------------------------------------------------------------------------
// Golden negative fixture — gate 1 (dead-air) hard FAIL
//
// 10 frames (9 pairs), all identical → delta=0 for all pairs.
// 9 pairs × 5 = 45 frames = 1.5s > 1.0s → FAIL (hard gate 1)
// ---------------------------------------------------------------------------

const negFrames = Array.from({ length: 10 }, () => makeFrame(128));

// ---------------------------------------------------------------------------
// Golden negative #2 — gate 2 advisory FAIL (energy peaks in first third)
//
// 20 frames, step=5, fps=30 → totalFrames=(20-1)*5=95, firstThirdFrame=floor(95/3)=31
// Spike at pair 0 (fill=100 → fill=200, delta=100) = peakFrame=0*5=0 < 31.
// Remaining pairs delta=1 (above DEAD_AIR_FLOOR=0.05 → no dead air → gate1 PASS).
// Gate 1: PASS (longestStaticSec=0, all deltas≥1)
// Gate 2: FAIL advisory (peakAfterBoundary=false — peak at frame 0 < boundary=31)
// Gate 3: PASS (only spike at pair 0; anchors=[0,5,95]; longestFlat=90f=3s < 8s)
// hardGatesPass: true (gate 2 advisory only; gate 1 hard PASS)
// ---------------------------------------------------------------------------

const neg2Frames = [
  makeFrame(100), // frame 0
  makeFrame(200), // frame 1 — peak spike (delta=100)
  makeFrame(201), // frame 2  (delta=1)
  makeFrame(202), // frame 3
  makeFrame(203), // frame 4
  makeFrame(204), // frame 5
  makeFrame(205), // frame 6
  makeFrame(206), // frame 7
  makeFrame(207), // frame 8
  makeFrame(208), // frame 9
  makeFrame(209), // frame 10
  makeFrame(210), // frame 11
  makeFrame(211), // frame 12
  makeFrame(212), // frame 13
  makeFrame(213), // frame 14
  makeFrame(214), // frame 15
  makeFrame(215), // frame 16
  makeFrame(216), // frame 17
  makeFrame(217), // frame 18
  makeFrame(218), // frame 19
];

// ---------------------------------------------------------------------------
// Tests: golden positive
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — golden positive control', () => {
  const verdict = computeRetentionMetrics(posFrames, { step: 5, fps: 30 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('summary: no hard-gate failures', () => {
    const hardFails = verdict.gates.filter(g => g.hard && !g.skip && !g.pass);
    expect(hardFails).toHaveLength(0);
  });

  it('gate 1 (dead-air, hard) passes — longest static span ≤ 1s', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.longestStaticSec).toBeLessThanOrEqual(1.0);
  });

  it('gate 2 (energy build-to-climax, advisory) passes', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.peakAfterBoundary).toBe(true);
    expect(g.measured.resolveRatio).toBeLessThan(0.75);
  });

  it('gate 3 (re-hook cadence, advisory) passes — longest flat stretch ≤ 8s', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.longestFlatSec).toBeLessThanOrEqual(8.0);
  });

  it('summary counts are consistent', () => {
    const { summary } = verdict;
    expect(summary.samples).toBe(posFrames.length);
    expect(summary.step).toBe(5);
    expect(summary.totalFrames).toBe((posFrames.length - 1) * 5);
  });
});

// ---------------------------------------------------------------------------
// Tests: golden negative
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — golden negative control (gate 1 hard FAIL)', () => {
  const verdict = computeRetentionMetrics(negFrames, { step: 5, fps: 30 });

  it('hardGatesPass is false (gate 1 hard FAIL)', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('gate 1 (dead-air) fails — all frames identical → 1.5s static', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(false);
    // 9 pairs × 5 step / 30 fps = 1.5s
    expect(g.measured.longestStaticSec).toBeCloseTo(1.5, 1);
  });

  it('gate 2 and 3 are advisory and do not affect hardGatesPass', () => {
    const g2 = verdict.gates.find(g => g.id === 2);
    const g3 = verdict.gates.find(g => g.id === 3);
    expect(g2.hard).toBe(false);
    expect(g3.hard).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: golden negative #2 (gate 2 advisory FAIL — climax in first third)
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — golden negative #2 (gate 2 advisory FAIL: climax in first third)', () => {
  const verdict = computeRetentionMetrics(neg2Frames, { step: 5, fps: 30 });

  it('hardGatesPass is true — gate 2 is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('gate 2 (energy build-to-climax) fails — peak at frame 0, before first-third boundary 31', () => {
    const g = verdict.gates.find(g => g.id === 2);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.measured.peakAfterBoundary).toBe(false);
    expect(g.measured.peakFrame).toBe(0);
    expect(g.measured.boundaryFrame).toBe(31);
  });

  it('gate 1 (dead-air) passes — no static run (all consecutive deltas ≥ 1)', () => {
    const g = verdict.gates.find(g => g.id === 1);
    expect(g.hard).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.longestStaticSec).toBe(0);
  });

  it('gate 3 (re-hook cadence) passes — flat stretch after initial spike is 3s < 8s', () => {
    const g = verdict.gates.find(g => g.id === 3);
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(true);
    expect(g.measured.longestFlatSec).toBeCloseTo(3.0, 1);
  });
});

// ---------------------------------------------------------------------------
// Tests: holds exclusion
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — holds exclusion', () => {
  // All-static 10 frames, but declare the whole span as a hold.
  // Dead-air gate should skip all pairs → longestStaticSec=0 → PASS.
  it('declared hold covering full span → gate 1 passes (no un-held static)', () => {
    const frames = Array.from({ length: 10 }, () => makeFrame(50));
    const totalFrames = (frames.length - 1) * 5;
    const holds = [[0, totalFrames]];
    const verdict = computeRetentionMetrics(frames, { step: 5, fps: 30, holds });
    const g1 = verdict.gates.find(g => g.id === 1);
    expect(g1.pass).toBe(true);
    expect(g1.measured.longestStaticSec).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: climax parameter
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — climax parameter', () => {
  // Peak is at pair index 0 (fill jump: 100→200=delta 100). With climax at frame 5,
  // peak is at frame 0 which is < climax → gate 2 FAIL.
  it('climax after peak → gate 2 fails (peak before climax window)', () => {
    const frames = [makeFrame(100), makeFrame(200), makeFrame(200), makeFrame(200)];
    const verdict = computeRetentionMetrics(frames, { step: 5, fps: 30, climax: 10 });
    const g2 = verdict.gates.find(g => g.id === 2);
    expect(g2.pass).toBe(false);
    expect(g2.measured.peakAfterBoundary).toBe(false);
  });

  it('climax at or before peak → gate 2 can pass (check resolve)', () => {
    // Spike at pair 5 (frame 25), resolve to 0 by pair 11. climax=5 → peakAfterBoundary=true.
    // With win=6/half=3, smoothed peak lands near the spike (well after climax=5).
    // Post-peak smoothed energy drops to 0 → resolveRatio≈0 < 0.75 → PASS.
    const frames = [
      makeFrame(100), // 0
      makeFrame(100), // 1  delta[0]=0
      makeFrame(100), // 2  delta[1]=0
      makeFrame(100), // 3  delta[2]=0
      makeFrame(100), // 4  delta[3]=0
      makeFrame(100), // 5  delta[4]=0
      makeFrame(200), // 6  delta[5]=100 (spike)
      makeFrame(200), // 7  delta[6]=0
      makeFrame(200), // 8  delta[7]=0
      makeFrame(200), // 9  delta[8]=0
      makeFrame(200), // 10 delta[9]=0
      makeFrame(200), // 11 delta[10]=0
    ];
    // climax=5; smoothed peak at frame 40 (pair 8) → peakAfterBoundary=true
    const verdict = computeRetentionMetrics(frames, { step: 5, fps: 30, climax: 5 });
    const g2 = verdict.gates.find(g => g.id === 2);
    expect(g2.measured.peakAfterBoundary).toBe(true);
    expect(g2.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: rehookSec parameter
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — rehookSec parameter', () => {
  // 10 static frames, no spikes → longest flat = 9 pairs × 5 = 45 frames = 1.5s.
  it('rehookSec=1 with 1.5s flat stretch → gate 3 FAIL', () => {
    const frames = Array.from({ length: 10 }, () => makeFrame(128));
    const verdict = computeRetentionMetrics(frames, { step: 5, fps: 30, rehookSec: 1 });
    const g3 = verdict.gates.find(g => g.id === 3);
    expect(g3.pass).toBe(false);
  });

  it('rehookSec=10 with 1.5s flat stretch → gate 3 PASS', () => {
    const frames = Array.from({ length: 10 }, () => makeFrame(128));
    const verdict = computeRetentionMetrics(frames, { step: 5, fps: 30, rehookSec: 10 });
    const g3 = verdict.gates.find(g => g.id === 3);
    expect(g3.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Golden fixture: gate-2 smoothing discriminates cut spike from sustained energy
//
// Bug case: 20 frames, step=5, fps=30 → 19 pairs, totalFrames=95, boundary=31.
// All consecutive pairs differ by ≥1 so gate 1 (dead-air) always passes.
// energy[0]=10 (one-frame cut spike, rawPeakFrame=0 < 31).
// energy[1-9]=1 (low drift, above dead-air floor=0.05).
// energy[10-14]=5 (sustained region in back half, frames 50-75).
// energy[15-18]=1 (resolve).
//
// Raw peak: pair 0 (energy=10) → rawPeakFrame=0 < 31 → old gate would FAIL.
// Smoothed (win=6, half=3): smoothed peak ≈ 3.86 lands at pair 11 (frame 55 ≥ 31).
//   The spike at pair 0 smooths to ≤ 3.25 — below the sustained-region peak.
//   → peakAfterBoundary=true → PASS.
//
// No-false-pass case: 20 frames, energy[0-5]=5 (sustained in first-third pairs),
// energy[6-18]=1 (low drift tail). Smoothed peak at pairs 0-2 = 5 > tail smoothed values.
// peakFrame=0 < 31 → peakAfterBoundary=false → gate 2 FAIL.
// ---------------------------------------------------------------------------

describe('computeRetentionMetrics — gate-2 smoothing: cut spike vs sustained energy', () => {
  // Case (a): cut spike early + sustained region in back half → gate 2 PASS
  // energy: [10, 1,1,1,1,1,1,1,1,1, 5,5,5,5,5, 1,1,1,1]
  const cutSpikeFrames = [
    makeFrame(100), // 0
    makeFrame(110), // 1   energy[0]=10 (cut spike; rawPeakFrame=0)
    makeFrame(111), // 2   energy[1]=1
    makeFrame(112), // 3   energy[2]=1
    makeFrame(113), // 4   energy[3]=1
    makeFrame(114), // 5   energy[4]=1
    makeFrame(115), // 6   energy[5]=1
    makeFrame(116), // 7   energy[6]=1
    makeFrame(117), // 8   energy[7]=1
    makeFrame(118), // 9   energy[8]=1
    makeFrame(119), // 10  energy[9]=1
    makeFrame(124), // 11  energy[10]=5 (sustained region)
    makeFrame(129), // 12  energy[11]=5
    makeFrame(134), // 13  energy[12]=5
    makeFrame(139), // 14  energy[13]=5
    makeFrame(144), // 15  energy[14]=5
    makeFrame(145), // 16  energy[15]=1 (resolve)
    makeFrame(146), // 17  energy[16]=1
    makeFrame(147), // 18  energy[17]=1
    makeFrame(148), // 19  energy[18]=1
  ];

  it('cut-spike case: rawPeakFrame is in first third (the old bug)', () => {
    const verdict = computeRetentionMetrics(cutSpikeFrames, { step: 5, fps: 30 });
    const g2 = verdict.gates.find(g => g.id === 2);
    // totalFrames=95, firstThirdBoundary=31; rawPeakFrame=0 < 31
    expect(g2.measured.rawPeakFrame).toBe(0);
    expect(g2.measured.rawPeakFrame).toBeLessThan(31);
  });

  it('cut-spike case: smoothed peak is after boundary → gate 2 PASS', () => {
    const verdict = computeRetentionMetrics(cutSpikeFrames, { step: 5, fps: 30 });
    const g2 = verdict.gates.find(g => g.id === 2);
    expect(g2.measured.peakAfterBoundary).toBe(true);
    expect(g2.measured.peakFrame).toBeGreaterThanOrEqual(31);
    expect(g2.pass).toBe(true);
  });

  it('cut-spike case: hardGatesPass is true', () => {
    const verdict = computeRetentionMetrics(cutSpikeFrames, { step: 5, fps: 30 });
    expect(verdict.hardGatesPass).toBe(true);
  });

  // Case (b): genuinely front-loaded (sustained energy in first third, low drift tail)
  // energy: [5,5,5,5,5,5, 1,1,1,1,1,1,1,1,1,1,1,1,1]
  const frontLoadedFrames = [
    makeFrame(100), // 0
    makeFrame(105), // 1   energy[0]=5
    makeFrame(110), // 2   energy[1]=5
    makeFrame(115), // 3   energy[2]=5
    makeFrame(120), // 4   energy[3]=5
    makeFrame(125), // 5   energy[4]=5
    makeFrame(130), // 6   energy[5]=5 (sustained; first-third boundary=31, pair 6 = frame 30)
    makeFrame(131), // 7   energy[6]=1 (low drift tail)
    makeFrame(132), // 8   energy[7]=1
    makeFrame(133), // 9   energy[8]=1
    makeFrame(134), // 10  energy[9]=1
    makeFrame(135), // 11  energy[10]=1
    makeFrame(136), // 12  energy[11]=1
    makeFrame(137), // 13  energy[12]=1
    makeFrame(138), // 14  energy[13]=1
    makeFrame(139), // 15  energy[14]=1
    makeFrame(140), // 16  energy[15]=1
    makeFrame(141), // 17  energy[16]=1
    makeFrame(142), // 18  energy[17]=1
    makeFrame(143), // 19  energy[18]=1
  ];

  it('front-loaded case: gate 2 FAIL (smoothed peak still in first third)', () => {
    const verdict = computeRetentionMetrics(frontLoadedFrames, { step: 5, fps: 30 });
    const g2 = verdict.gates.find(g => g.id === 2);
    // Smoothed peak among pairs 0-2 (energy=5 dominates); peakFrame < 31
    expect(g2.measured.peakAfterBoundary).toBe(false);
    expect(g2.measured.peakFrame).toBeLessThan(31);
    expect(g2.pass).toBe(false);
  });

  it('front-loaded case: hardGatesPass is true (gate 2 advisory only)', () => {
    const verdict = computeRetentionMetrics(frontLoadedFrames, { step: 5, fps: 30 });
    expect(verdict.hardGatesPass).toBe(true);
  });
});
