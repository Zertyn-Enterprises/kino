/**
 * Regression tests for computeShipVerdict.
 *
 * Three fixture sets:
 *   - Ship-ready:    all three gates hardGatesPass true, advisory fails present
 *                    → shipReady true, blockers empty.
 *   - Blocked:       one gate hardGatesPass false → shipReady false, gate named in blockers.
 *   - Missing gate:  contrast null → shipReady false, 'contrast gate not run' blocker.
 *
 * All inputs are plain objects matching the shape of each gate's metrics.json;
 * no file I/O is exercised — pure computeShipVerdict path only.
 *
 * Advisory failures:
 *   hook/retention: metrics.gates entries with advisory=true, pass=false, skip=false
 *   contrast:       metrics.pairs entries with hard=false, pass=false
 */

import { describe, expect, it } from 'vitest';
import { computeShipVerdict } from './ship-metrics.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Minimal hook/retention metrics object. */
function hookMetrics({ hardGatesPass, advisoryFails = [] }) {
  return {
    hardGatesPass,
    gates: [
      ...advisoryFails.map(name => ({ advisory: true, hard: false, pass: false, skip: false, name })),
    ],
  };
}

/** Minimal contrast metrics object. */
function contrastMetrics({ hardGatesPass, advisoryFails = [] }) {
  return {
    hardGatesPass,
    pairs: [
      ...advisoryFails.map(role => ({ hard: false, pass: false, role })),
    ],
  };
}

// ---------------------------------------------------------------------------
// Fixture 1: ship-ready — all gates pass, advisory fails present
//
// hook:      hardGatesPass=true, advisory fail: 'background-activity'
// retention: hardGatesPass=true, advisory fail: 're-hook cadence'
// contrast:  hardGatesPass=true, advisory fail: 'accent-on-bg'
//
// Expected: shipReady=true, blockers=[], all gates ran
// ---------------------------------------------------------------------------

const shipReadyVerdict = computeShipVerdict({
  hook:      hookMetrics({ hardGatesPass: true, advisoryFails: ['background-activity'] }),
  retention: hookMetrics({ hardGatesPass: true, advisoryFails: ['re-hook cadence'] }),
  contrast:  contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg'] }),
});

describe('computeShipVerdict — ship-ready (all hard gates pass, advisory fails present)', () => {
  it('shipReady is true', () => {
    expect(shipReadyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(shipReadyVerdict.blockers).toHaveLength(0);
  });

  it('all three gates ran', () => {
    expect(shipReadyVerdict.gates.hook.ran).toBe(true);
    expect(shipReadyVerdict.gates.retention.ran).toBe(true);
    expect(shipReadyVerdict.gates.contrast.ran).toBe(true);
  });

  it('all three gates hardGatesPass true', () => {
    expect(shipReadyVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.contrast.hardGatesPass).toBe(true);
  });

  it('hook advisory failure listed — background-activity', () => {
    expect(shipReadyVerdict.gates.hook.advisoryFailures).toContain('background-activity');
    expect(shipReadyVerdict.gates.hook.justified).toBe(false);
  });

  it('retention advisory failure listed — re-hook cadence', () => {
    expect(shipReadyVerdict.gates.retention.advisoryFailures).toContain('re-hook cadence');
    expect(shipReadyVerdict.gates.retention.justified).toBe(false);
  });

  it('contrast advisory failure listed — accent-on-bg', () => {
    expect(shipReadyVerdict.gates.contrast.advisoryFailures).toContain('accent-on-bg');
    expect(shipReadyVerdict.gates.contrast.justified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: blocked — hook hardGatesPass false → named in blockers
//
// hook:      hardGatesPass=false (hard gate failed)
// retention: hardGatesPass=true
// contrast:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['hook hard gates failed']
// ---------------------------------------------------------------------------

const blockedVerdict = computeShipVerdict({
  hook:      hookMetrics({ hardGatesPass: false }),
  retention: hookMetrics({ hardGatesPass: true }),
  contrast:  contrastMetrics({ hardGatesPass: true }),
});

describe('computeShipVerdict — blocked (hook hard gates failed)', () => {
  it('shipReady is false', () => {
    expect(blockedVerdict.shipReady).toBe(false);
  });

  it('blockers contains "hook hard gates failed"', () => {
    expect(blockedVerdict.blockers).toContain('hook hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(blockedVerdict.blockers).toHaveLength(1);
  });

  it('hook gate ran but hardGatesPass false', () => {
    expect(blockedVerdict.gates.hook.ran).toBe(true);
    expect(blockedVerdict.gates.hook.hardGatesPass).toBe(false);
  });

  it('retention and contrast gates are not blockers', () => {
    expect(blockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.contrast.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: missing gate — contrast null → 'contrast gate not run' blocker
//
// hook:      hardGatesPass=true
// retention: hardGatesPass=true
// contrast:  null (gate not run)
//
// Expected: shipReady=false, blockers=['contrast gate not run'], contrast.ran=false
// ---------------------------------------------------------------------------

const missingGateVerdict = computeShipVerdict({
  hook:      hookMetrics({ hardGatesPass: true }),
  retention: hookMetrics({ hardGatesPass: true }),
  contrast:  null,
});

describe('computeShipVerdict — missing gate (contrast null)', () => {
  it('shipReady is false', () => {
    expect(missingGateVerdict.shipReady).toBe(false);
  });

  it('blockers contains "contrast gate not run"', () => {
    expect(missingGateVerdict.blockers).toContain('contrast gate not run');
  });

  it('blockers has exactly one entry', () => {
    expect(missingGateVerdict.blockers).toHaveLength(1);
  });

  it('contrast gate ran=false, hardGatesPass=false', () => {
    expect(missingGateVerdict.gates.contrast.ran).toBe(false);
    expect(missingGateVerdict.gates.contrast.hardGatesPass).toBe(false);
  });

  it('contrast advisoryFailures is empty (gate never ran)', () => {
    expect(missingGateVerdict.gates.contrast.advisoryFailures).toHaveLength(0);
  });

  it('hook and retention gates ran and passed', () => {
    expect(missingGateVerdict.gates.hook.ran).toBe(true);
    expect(missingGateVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.retention.ran).toBe(true);
    expect(missingGateVerdict.gates.retention.hardGatesPass).toBe(true);
  });
});
