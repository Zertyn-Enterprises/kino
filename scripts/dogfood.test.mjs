/**
 * Unit tests for normalize() and diff() in dogfood.mjs.
 *
 * Fixtures:
 *   A. normalize — all gates ran, shipReady=true
 *   B. normalize — skip-na and coverage-gap gates
 *   C. normalize — absent coverage field (old report.json format)
 *   D. diff — match (empty drifts)
 *   E. diff — verdict flip (PASS→FAIL) detected
 *   F. diff — metric within epsilon tolerance (no drift)
 *   G. diff — metric outside epsilon tolerance (drift reported)
 *   H. diff — coverage state change detected
 *   I. diff — shipReady flip detected
 *   J. diff — blockers change detected
 */

import { describe, expect, it } from 'vitest';
import { normalize, diff, METRIC_EPSILON } from './dogfood.mjs';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Passing report.json with coverage field present (new format). */
function passingReport(overrides = {}) {
  return {
    shipReady: true,
    gates: {
      hook:            { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      retention:       { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      contrast:        { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      motion:          { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      legibility:      { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      codeCraft:       { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      musicsync:       { ran: false, hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'coverage-gap' },
      payoff:          { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      remotionCorrect: { ran: true,  hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'ran' },
      distinct:        { ran: false, hardGatesPass: true,  advisoryFailures: [], justified: true,  coverage: 'skip-na' },
      ...overrides,
    },
    blockers: [],
    coverageGaps: [],
    remediations: [],
  };
}

const baseMetrics = {
  hook: {
    'Motion by frame 10': 0.286,
    'Frame-0 contrast':   7.449,
    'Loop seam':          6.557,
  },
  contrast: {
    'text-on-bg':      17.67,
    'text-on-surface': 16.11,
  },
  retention: {
    'Dead-air.longestStaticSec': 0.167,
  },
};

// ---------------------------------------------------------------------------
// Fixture A: normalize — all gates ran, shipReady=true
// ---------------------------------------------------------------------------

describe('normalize — all gates ran, shipReady=true', () => {
  const snap = normalize(passingReport(), baseMetrics);

  it('shipReady is true', () => {
    expect(snap.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(snap.blockers).toHaveLength(0);
  });

  it('hook.hardVerdict is PASS', () => {
    expect(snap.gates.hook.hardVerdict).toBe('PASS');
  });

  it('hook.coverage is ran', () => {
    expect(snap.gates.hook.coverage).toBe('ran');
  });

  it('musicsync.hardVerdict is GAP', () => {
    expect(snap.gates.musicsync.hardVerdict).toBe('GAP');
  });

  it('musicsync.coverage is coverage-gap', () => {
    expect(snap.gates.musicsync.coverage).toBe('coverage-gap');
  });

  it('distinct.hardVerdict is SKIP-NA', () => {
    expect(snap.gates.distinct.hardVerdict).toBe('SKIP-NA');
  });

  it('distinct.coverage is skip-na', () => {
    expect(snap.gates.distinct.coverage).toBe('skip-na');
  });

  it('metrics.hook.Motion by frame 10 equals source value', () => {
    expect(snap.metrics.hook?.['Motion by frame 10']).toBe(0.286);
  });

  it('metrics.contrast.text-on-bg equals source value', () => {
    expect(snap.metrics.contrast?.['text-on-bg']).toBe(17.67);
  });

  it('metric keys within a gate are sorted', () => {
    const keys = Object.keys(snap.metrics.hook);
    expect(keys).toEqual([...keys].sort());
  });

  it('gate order follows GATE_ORDER (hook before retention)', () => {
    const gateKeys = Object.keys(snap.gates);
    expect(gateKeys.indexOf('hook')).toBeLessThan(gateKeys.indexOf('retention'));
  });
});

// ---------------------------------------------------------------------------
// Fixture B: normalize — skip-na and FAIL gates
// ---------------------------------------------------------------------------

describe('normalize — FAIL gate + skip-na', () => {
  const report = passingReport({
    hook: { ran: true, hardGatesPass: false, advisoryFailures: [], justified: false, coverage: 'ran' },
  });
  const snap = normalize({ ...report, shipReady: false, blockers: ['hook hard gates failed'] }, {});

  it('hook.hardVerdict is FAIL', () => {
    expect(snap.gates.hook.hardVerdict).toBe('FAIL');
  });

  it('hook.coverage is ran', () => {
    expect(snap.gates.hook.coverage).toBe('ran');
  });

  it('shipReady is false', () => {
    expect(snap.shipReady).toBe(false);
  });

  it('blockers sorted — hook entry present', () => {
    expect(snap.blockers).toContain('hook hard gates failed');
  });
});

// ---------------------------------------------------------------------------
// Fixture C: normalize — old report.json format (no coverage field)
// ---------------------------------------------------------------------------

describe('normalize — backward compat: no coverage field in gates', () => {
  const oldReport = {
    shipReady: true,
    gates: {
      hook:      { ran: true, hardGatesPass: true,  advisoryFailures: [] },
      retention: { ran: true, hardGatesPass: true,  advisoryFailures: [] },
      contrast:  { ran: true, hardGatesPass: false, advisoryFailures: [] },
    },
    blockers: ['contrast hard gates failed'],
  };
  const snap = normalize(oldReport, {});

  it('hook.coverage defaults to ran when ran=true', () => {
    expect(snap.gates.hook.coverage).toBe('ran');
  });

  it('hook.hardVerdict is PASS', () => {
    expect(snap.gates.hook.hardVerdict).toBe('PASS');
  });

  it('contrast.hardVerdict is FAIL when hardGatesPass=false', () => {
    expect(snap.gates.contrast.hardVerdict).toBe('FAIL');
  });

  it('retention.coverage defaults to ran', () => {
    expect(snap.gates.retention.coverage).toBe('ran');
  });
});

// ---------------------------------------------------------------------------
// Fixture D: diff — identical snapshots (match)
// ---------------------------------------------------------------------------

describe('diff — identical golden and current (match)', () => {
  const snap = normalize(passingReport(), baseMetrics);
  const drifts = diff('RelayLaunch', snap, snap);

  it('returns empty drifts array', () => {
    expect(drifts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture E: diff — verdict flip detected
// ---------------------------------------------------------------------------

describe('diff — verdict flip (PASS→FAIL on hook)', () => {
  const golden = normalize(passingReport(), {});
  const failReport = passingReport({
    hook: { ran: true, hardGatesPass: false, advisoryFailures: [], justified: false, coverage: 'ran' },
  });
  const current = normalize({ ...failReport, shipReady: false, blockers: ['hook hard gates failed'] }, {});
  const drifts = diff('RelayLaunch', golden, current);

  it('drift is reported', () => {
    expect(drifts.length).toBeGreaterThan(0);
  });

  it('hook hardVerdict drift is present', () => {
    const d = drifts.find(x => x.gate === 'hook' && x.field === 'hardVerdict');
    expect(d).toBeDefined();
    expect(d.golden).toBe('PASS');
    expect(d.actual).toBe('FAIL');
  });

  it('video field is set correctly', () => {
    expect(drifts[0].video).toBe('RelayLaunch');
  });
});

// ---------------------------------------------------------------------------
// Fixture F: diff — metric within epsilon tolerance (no drift)
// ---------------------------------------------------------------------------

describe('diff — metric within epsilon tolerance (no drift)', () => {
  const snap = normalize(passingReport(), baseMetrics);
  const tinyDelta = METRIC_EPSILON * 0.5;
  const withinMetrics = {
    ...baseMetrics,
    hook: {
      'Motion by frame 10': baseMetrics.hook['Motion by frame 10'] + tinyDelta,
      'Frame-0 contrast':   baseMetrics.hook['Frame-0 contrast'],
      'Loop seam':          baseMetrics.hook['Loop seam'],
    },
  };
  const current = normalize(passingReport(), withinMetrics);
  const drifts = diff('RelayLaunch', snap, current);

  it('no metric drifts reported when delta ≤ epsilon', () => {
    const metricDrifts = drifts.filter(d => d.field.startsWith('metrics.'));
    expect(metricDrifts).toHaveLength(0);
  });

  it('returns empty drifts array (verdicts unchanged)', () => {
    expect(drifts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture G: diff — metric outside epsilon tolerance (drift reported)
// ---------------------------------------------------------------------------

describe('diff — metric outside epsilon tolerance (drift reported)', () => {
  const snap = normalize(passingReport(), baseMetrics);
  const largeDelta = METRIC_EPSILON * 2 + 0.001;
  const outsideMetrics = {
    ...baseMetrics,
    hook: {
      'Motion by frame 10': baseMetrics.hook['Motion by frame 10'] + largeDelta,
      'Frame-0 contrast':   baseMetrics.hook['Frame-0 contrast'],
      'Loop seam':          baseMetrics.hook['Loop seam'],
    },
  };
  const current = normalize(passingReport(), outsideMetrics);
  const drifts = diff('RelayLaunch', snap, current);

  it('metric drift is reported', () => {
    const d = drifts.find(x => x.gate === 'hook' && x.field.startsWith('metrics.Motion by frame 10'));
    expect(d).toBeDefined();
  });

  it('drift includes golden and actual values', () => {
    const d = drifts.find(x => x.gate === 'hook' && x.field.startsWith('metrics.Motion by frame 10'));
    expect(d.golden).toBeCloseTo(baseMetrics.hook['Motion by frame 10'], 5);
    expect(d.actual).toBeCloseTo(baseMetrics.hook['Motion by frame 10'] + largeDelta, 5);
  });

  it('drift field includes delta annotation', () => {
    const d = drifts.find(x => x.gate === 'hook' && x.field.startsWith('metrics.Motion by frame 10'));
    expect(d.field).toContain('delta=');
    expect(d.field).toContain(`eps=${METRIC_EPSILON}`);
  });
});

// ---------------------------------------------------------------------------
// Fixture H: diff — coverage state change detected
// ---------------------------------------------------------------------------

describe('diff — coverage state change (ran→skip-na)', () => {
  const golden = normalize(passingReport({
    musicsync: { ran: true, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'ran' },
  }), {});
  const current = normalize(passingReport({
    musicsync: { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'skip-na' },
  }), {});
  const drifts = diff('GranipaLaunch', golden, current);

  it('musicsync coverage drift is reported', () => {
    const d = drifts.find(x => x.gate === 'musicsync' && x.field === 'coverage');
    expect(d).toBeDefined();
    expect(d.golden).toBe('ran');
    expect(d.actual).toBe('skip-na');
  });

  it('video is set correctly', () => {
    const d = drifts.find(x => x.gate === 'musicsync');
    expect(d.video).toBe('GranipaLaunch');
  });
});

// ---------------------------------------------------------------------------
// Fixture I: diff — shipReady flip detected
// ---------------------------------------------------------------------------

describe('diff — shipReady flip (true→false)', () => {
  const golden = normalize(passingReport(), {});
  const blockedReport = {
    ...passingReport(),
    shipReady: false,
    blockers: ['hook hard gates failed'],
    gates: {
      ...passingReport().gates,
      hook: { ran: true, hardGatesPass: false, advisoryFailures: [], justified: false, coverage: 'ran' },
    },
  };
  const current = normalize(blockedReport, {});
  const drifts = diff('RelayLaunch', golden, current);

  it('shipReady drift is reported', () => {
    const d = drifts.find(x => x.field === 'shipReady');
    expect(d).toBeDefined();
    expect(d.golden).toBe(true);
    expect(d.actual).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture J: diff — blockers change detected
// ---------------------------------------------------------------------------

describe('diff — blockers change detected', () => {
  const golden = normalize(passingReport(), {});
  const currentWithBlockers = normalize({
    ...passingReport(),
    shipReady: false,
    blockers: ['payoff coverage-gap'],
  }, {});
  const drifts = diff('RelayLaunch', golden, currentWithBlockers);

  it('blockers drift is reported', () => {
    const d = drifts.find(x => x.field === 'blockers');
    expect(d).toBeDefined();
    expect(d.golden).toEqual([]);
    expect(d.actual).toContain('payoff coverage-gap');
  });
});
