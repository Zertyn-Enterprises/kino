/**
 * Unit tests for rankHookVariants.
 *
 * Fixtures:
 *   allPassHigh     — all 3 HARD gates pass, high composite measures
 *   allPassLow      — all 3 HARD gates pass, low composite measures
 *   oneHardFail     — gate 2 fails (HARD), otherwise high composite measures
 *   allSkipped      — all gates skipped (missing frames)
 *   tieA / tieB     — identical hard-pass-count and composite, differ only in label
 *
 * Acceptance criteria (from plan spec):
 *   (a) rank order correct on a synthetic set
 *   (b) HARD-gate-pass count dominates the composite: a higher-composite variant
 *       that fails a hard gate ranks BELOW a hard-passing variant
 *   (c) deterministic tie-break by label
 *   (d) single-variant degenerate case returns that variant as winner
 *
 * Golden calibration:
 *   real AmbientCheck hook-metrics → hardGatesPass=true, hardPassCount=3
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rankHookVariants, DECISIVE_MARGIN } from './hook-tournament-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeGate1(pass, measured = 1.0) {
  return { id: 1, name: 'Motion by frame 10', hard: true, advisory: false, pass, skip: false, measured, threshold: 0.1 };
}
function makeGate2(pass, measured = 10.0) {
  return { id: 2, name: 'Frame-0 contrast', hard: true, advisory: false, pass, skip: false, measured, threshold: 5.0 };
}
function makeGate3(pass, measured = 5.0) {
  return { id: 3, name: 'Loop seam', hard: true, advisory: false, pass, skip: false, measured, threshold: 60.0 };
}
function makeGate4(active, separated) {
  const pass = active >= 2 && separated;
  return {
    id: 4, name: 'Background activity', hard: false, advisory: true, pass, skip: false,
    measured: { active, total: 16, separated },
    threshold: { minActive: 2, separated: true, cellThreshold: 5.0 },
  };
}
function makeGate5(cells, rows) {
  const pass = rows >= 2 && cells >= 2;
  return {
    id: 5, name: 'Frame-0 liveness', hard: false, advisory: true, pass, skip: false,
    measured: { cells, total: 16, rows },
    threshold: { minCells: 2, minRows: 2, cellThreshold: 10.0 },
  };
}
function makeSkippedGate(id, hard) {
  return { id, name: `Gate ${id}`, hard, advisory: !hard, pass: false, skip: true, measured: null, skipReason: 'frame missing' };
}

function makeVariant(label, gates) {
  const hardGatesPass = gates.filter(g => g.hard).every(g => g.skip || g.pass);
  const summary = {
    passed:  gates.filter(g => !g.skip &&  g.pass).length,
    failed:  gates.filter(g => !g.skip && !g.pass).length,
    skipped: gates.filter(g =>  g.skip).length,
  };
  return { label, gates, summary, hardGatesPass };
}

// ── Concrete fixtures ─────────────────────────────────────────────────────────

// All 3 HARD gates PASS, strong advisory measures (high composite).
const allPassHigh = makeVariant('all-pass-high', [
  makeGate1(true,  3.0),   // motion=3.0 → normalised 0.60 of MOTION_CAP=5
  makeGate2(true, 30.0),   // contrast=30 → normalised 0.60 of CONTRAST_CAP=50
  makeGate3(true,  5.0),
  makeGate4(6, true),      // active=6 → 6/16; separated=true
  makeGate5(6, 3),         // cells=6, rows=3 → liveness=18 / LIVENESS_CAP=32
]);

// All 3 HARD gates PASS, weak advisory measures (low composite).
const allPassLow = makeVariant('all-pass-low', [
  makeGate1(true, 0.2),
  makeGate2(true, 6.0),
  makeGate3(true, 5.0),
  makeGate4(1, false),
  makeGate5(1, 1),
]);

// Gate 2 (HARD) FAILS — high composite values but blocked by hard-gate count.
const oneHardFail = makeVariant('one-hard-fail', [
  makeGate1(true,  4.9),   // motion near cap
  makeGate2(false, 1.0),   // FAILS hard gate 2 (contrast too low)
  makeGate3(true,  5.0),
  makeGate4(8, true),      // excellent advisory
  makeGate5(8, 4),         // cells=8, rows=4 → liveness=32 (cap)
]);

// All gates skipped (missing frames).
const allSkipped = makeVariant('all-skipped', [
  makeSkippedGate(1, true),
  makeSkippedGate(2, true),
  makeSkippedGate(3, true),
  makeSkippedGate(4, false),
  makeSkippedGate(5, false),
]);

// Identical hard-pass-count + composite — differ only in label (tie-break test).
const tieA = makeVariant('aardvark', [
  makeGate1(true, 1.0),
  makeGate2(true, 10.0),
  makeGate3(true, 5.0),
  makeGate4(2, true),
  makeGate5(2, 2),
]);
const tieB = makeVariant('zebra', [
  makeGate1(true, 1.0),
  makeGate2(true, 10.0),
  makeGate3(true, 5.0),
  makeGate4(2, true),
  makeGate5(2, 2),
]);

// ── (a) Correct rank order on a synthetic set ─────────────────────────────────

describe('rankHookVariants — (a) rank order on synthetic set', () => {
  const { ranking, winner } = rankHookVariants([allPassLow, oneHardFail, allPassHigh]);

  it('returns ranking with all 3 variants', () => {
    expect(ranking).toHaveLength(3);
  });

  it('allPassHigh is first (most hard gates AND highest composite)', () => {
    expect(ranking[0].label).toBe('all-pass-high');
  });

  it('allPassLow is second (same hard-gate count as allPassHigh, lower composite)', () => {
    expect(ranking[1].label).toBe('all-pass-low');
  });

  it('oneHardFail is last (only 2 hard gates pass vs 3 for the others)', () => {
    expect(ranking[2].label).toBe('one-hard-fail');
  });

  it('winner === ranking[0]', () => {
    expect(winner).toBe(ranking[0]);
  });

  it('each ranked item carries hardPassCount and compositeScore', () => {
    for (const item of ranking) {
      expect(typeof item.hardPassCount).toBe('number');
      expect(typeof item.compositeScore).toBe('number');
    }
  });
});

// ── (b) Hard-gate count dominates the composite ───────────────────────────────

describe('rankHookVariants — (b) hard-gate count beats composite', () => {
  // oneHardFail has an extremely high composite (motion ≈ cap, liveness = cap)
  // but only 2/3 hard gates pass. allPassLow has all 3 pass and a low composite.
  // allPassLow must rank above oneHardFail.
  const { ranking } = rankHookVariants([oneHardFail, allPassLow]);

  it('allPassLow (3 hard-passes, low composite) ranks above oneHardFail (2 hard-passes, high composite)', () => {
    expect(ranking[0].label).toBe('all-pass-low');
    expect(ranking[1].label).toBe('one-hard-fail');
  });

  it('allPassLow.hardPassCount > oneHardFail.hardPassCount', () => {
    const low  = ranking.find(r => r.label === 'all-pass-low');
    const fail = ranking.find(r => r.label === 'one-hard-fail');
    expect(low.hardPassCount).toBeGreaterThan(fail.hardPassCount);
  });

  it('oneHardFail.compositeScore > allPassLow.compositeScore (composite alone would invert)', () => {
    const low  = ranking.find(r => r.label === 'all-pass-low');
    const fail = ranking.find(r => r.label === 'one-hard-fail');
    expect(fail.compositeScore).toBeGreaterThan(low.compositeScore);
  });
});

// ── (c) Deterministic tie-break ───────────────────────────────────────────────

describe('rankHookVariants — (c) deterministic tie-break by label', () => {
  it('tieA (aardvark) ranks before tieB (zebra) — same scores, label ascending', () => {
    const { ranking } = rankHookVariants([tieB, tieA]);
    expect(ranking[0].label).toBe('aardvark');
    expect(ranking[1].label).toBe('zebra');
  });

  it('result is identical regardless of input order', () => {
    const r1 = rankHookVariants([tieA, tieB]).ranking.map(r => r.label);
    const r2 = rankHookVariants([tieB, tieA]).ranking.map(r => r.label);
    expect(r1).toEqual(r2);
  });

  it('tieA and tieB have equal hardPassCount', () => {
    const { ranking } = rankHookVariants([tieA, tieB]);
    expect(ranking[0].hardPassCount).toBe(ranking[1].hardPassCount);
  });

  it('tieA and tieB have equal compositeScore', () => {
    const { ranking } = rankHookVariants([tieA, tieB]);
    expect(ranking[0].compositeScore).toBe(ranking[1].compositeScore);
  });
});

// ── (d) Single-variant degenerate case ───────────────────────────────────────

describe('rankHookVariants — (d) single-variant degenerate case', () => {
  it('returns that variant as winner', () => {
    const { ranking, winner } = rankHookVariants([allPassHigh]);
    expect(ranking).toHaveLength(1);
    expect(winner.label).toBe('all-pass-high');
  });

  it('winner === ranking[0]', () => {
    const { ranking, winner } = rankHookVariants([allPassLow]);
    expect(winner).toBe(ranking[0]);
  });

  it('single-variant → verdict=decisive, margin=null', () => {
    const { verdict, margin } = rankHookVariants([allPassHigh]);
    expect(verdict).toBe('decisive');
    expect(margin).toBeNull();
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('rankHookVariants — edge cases', () => {
  it('empty input returns { ranking: [], winner: null, verdict: null, margin: null }', () => {
    const { ranking, winner, verdict, margin } = rankHookVariants([]);
    expect(ranking).toHaveLength(0);
    expect(winner).toBeNull();
    expect(verdict).toBeNull();
    expect(margin).toBeNull();
  });

  it('all-skipped variant has hardPassCount=0 and compositeScore=0', () => {
    const { ranking } = rankHookVariants([allSkipped]);
    expect(ranking[0].hardPassCount).toBe(0);
    expect(ranking[0].compositeScore).toBe(0);
  });

  it('all-skipped variant ranks below all-pass-low', () => {
    const { ranking } = rankHookVariants([allSkipped, allPassLow]);
    expect(ranking[0].label).toBe('all-pass-low');
    expect(ranking[1].label).toBe('all-skipped');
  });

  it('compositeScore is in [0, 1]', () => {
    for (const v of [allPassHigh, allPassLow, oneHardFail, allSkipped]) {
      const { ranking } = rankHookVariants([v]);
      const score = ranking[0].compositeScore;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('original variant properties preserved in ranking output', () => {
    const { ranking } = rankHookVariants([allPassHigh]);
    expect(ranking[0].label).toBe('all-pass-high');
    expect(Array.isArray(ranking[0].gates)).toBe(true);
    expect(ranking[0].gates).toHaveLength(5);
    expect(typeof ranking[0].hardGatesPass).toBe('boolean');
  });
});

// ── Decisive verdict — real RelayLaunch A/B pair ─────────────────────────────
//
// Calibration fixture: the committed hook-tournament ranking.json from RelayLaunch
// (PR #68) has B(0.5438) − A(0.0763) = 0.4675, well above DECISIVE_MARGIN=0.05.
// Both variants pass all 3 hard gates (hardPassCount=3 each), so decisiveness here
// comes from the composite margin, not hard-gate dominance.
// ---------------------------------------------------------------------------

const RELAY_RANKING_PATH = join(PROJECT_ROOT, 'out', 'review', 'RelayLaunch', 'hook-tournament', 'ranking.json');

describe('rankHookVariants — decisive verdict (RelayLaunch A/B, margin ≈ 0.4675)', () => {
  const fileExists = existsSync(RELAY_RANKING_PATH);

  it('RelayLaunch hook-tournament ranking.json exists (committed reference)', () => {
    expect(fileExists).toBe(true);
  });

  if (!fileExists) return;

  const stored = JSON.parse(readFileSync(RELAY_RANKING_PATH, 'utf8'));
  // Strip annotated fields so we test the raw ranking pipeline end-to-end
  const raw = stored.ranking.map(({ hardPassCount: _, compositeScore: __, ...v }) => v);
  const result = rankHookVariants(raw);

  it('verdict is decisive (margin >> DECISIVE_MARGIN)', () => {
    expect(result.verdict).toBe('decisive');
  });

  it('margin ≈ 0.4675 (B 0.5438 − A 0.0763)', () => {
    expect(result.margin).toBeCloseTo(0.4675, 3);
  });

  it('winner is variant B (highest composite)', () => {
    expect(result.winner.label).toBe('B');
  });

  it('margin >= DECISIVE_MARGIN', () => {
    expect(result.margin).toBeGreaterThanOrEqual(DECISIVE_MARGIN);
  });
});

// ── Contested verdict — hard-gate-equal variants within DECISIVE_MARGIN ───────
//
// tieA and tieB are identical synthetic fixtures (same hardPassCount, same
// composite) → margin=0 < DECISIVE_MARGIN → contested.
// ---------------------------------------------------------------------------

describe('rankHookVariants — contested verdict (hard-gate-equal, margin 0 < DECISIVE_MARGIN)', () => {
  const result = rankHookVariants([tieA, tieB]);

  it('verdict is contested', () => {
    expect(result.verdict).toBe('contested');
  });

  it('margin is 0 (identical composite scores)', () => {
    expect(result.margin).toBe(0);
  });

  it('margin < DECISIVE_MARGIN', () => {
    expect(result.margin).toBeLessThan(DECISIVE_MARGIN);
  });

  it('winner is still ranking[0] (label-sorted aardvark)', () => {
    expect(result.winner.label).toBe('aardvark');
  });
});

// ── Golden calibration — real hook-metrics JSON yields sensible ranking ───────
//
// Reads the committed AmbientCheck hook-metrics artifact and verifies the ranking
// module produces the expected structural result. This is a calibration guard: if
// the ranking formula changes in a way that breaks the real-data path (e.g. a
// weight change that pushes compositeScore out of [0,1]), this test breaks.
//
// The AmbientCheck metrics JSON is the only committed hook-metrics artifact; it
// passes all 3 HARD gates and all 2 advisory gates.
// ---------------------------------------------------------------------------

const AMBIENT_METRICS_PATH = join(PROJECT_ROOT, 'out', 'review', 'AmbientCheck', 'hook', 'metrics.json');

describe('rankHookVariants — golden calibration (AmbientCheck real hook-metrics)', () => {
  const metricsFileExists = existsSync(AMBIENT_METRICS_PATH);

  it('AmbientCheck metrics artifact exists', () => {
    expect(metricsFileExists).toBe(true);
  });

  if (!metricsFileExists) return;

  const rawMetrics = JSON.parse(readFileSync(AMBIENT_METRICS_PATH, 'utf8'));
  const variant = { ...rawMetrics, label: 'ambient-check' };
  const { ranking, winner } = rankHookVariants([variant]);

  it('ranking contains 1 item', () => {
    expect(ranking).toHaveLength(1);
  });

  it('AmbientCheck is the winner (only variant)', () => {
    expect(winner.label).toBe('ambient-check');
  });

  it('AmbientCheck: hardGatesPass=true (calibration guard)', () => {
    expect(rawMetrics.hardGatesPass).toBe(true);
  });

  it('AmbientCheck: hardPassCount=3 (all 3 hard gates pass)', () => {
    expect(ranking[0].hardPassCount).toBe(3);
  });

  it('AmbientCheck: compositeScore is in [0, 1]', () => {
    expect(ranking[0].compositeScore).toBeGreaterThanOrEqual(0);
    expect(ranking[0].compositeScore).toBeLessThanOrEqual(1);
  });

  it('AmbientCheck: compositeScore is non-trivial (> 0.3 — real measures, not all zeroes)', () => {
    expect(ranking[0].compositeScore).toBeGreaterThan(0.3);
  });

  it('AmbientCheck: 5 gates in ranking output', () => {
    expect(ranking[0].gates).toHaveLength(5);
  });
});
