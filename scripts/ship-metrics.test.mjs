/**
 * Regression tests for computeShipVerdict.
 *
 * Seven fixture sets:
 *   - Ship-ready:           all five gates hardGatesPass true, advisory fails present
 *                           → shipReady true, blockers empty.
 *   - Blocked:              one gate hardGatesPass false → shipReady false, gate named in blockers.
 *   - Missing gate:         contrast null → shipReady false, 'contrast gate not run' blocker.
 *   - Motion blocked:       motion hardGatesPass false → shipReady false, motion in blockers.
 *   - Missing motion:       motion null → shipReady false, 'motion gate not run' blocker.
 *   - Legibility blocked:   legibility hardGatesPass false → shipReady false, legibility in blockers.
 *   - Missing legibility:   legibility null → shipReady false, 'legibility gate not run' blocker.
 *
 * All inputs are plain objects matching the shape of each gate's metrics.json;
 * no file I/O is exercised — pure computeShipVerdict path only.
 *
 * Advisory failures:
 *   hook/retention/motion/legibility: metrics.gates entries with advisory=true, pass=false, skip=false
 *   contrast:                         metrics.pairs entries with hard=false, pass=false
 */

import { describe, expect, it } from 'vitest';
import { computeShipVerdict } from './ship-metrics.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Minimal hook/retention/motion/legibility metrics object. */
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
// Fixture 1: ship-ready — all five gates pass, advisory fails present
//
// hook:       hardGatesPass=true, advisory fail: 'background-activity'
// retention:  hardGatesPass=true, advisory fail: 're-hook cadence'
// contrast:   hardGatesPass=true, advisory fail: 'accent-on-bg'
// motion:     hardGatesPass=true, advisory fail: 'Easing presence'
// legibility: hardGatesPass=true, advisory fail: 'Reading-budget share'
//
// Expected: shipReady=true, blockers=[], all gates ran
// ---------------------------------------------------------------------------

const shipReadyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true, advisoryFails: ['background-activity'] }),
  retention:  hookMetrics({ hardGatesPass: true, advisoryFails: ['re-hook cadence'] }),
  contrast:   contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg'] }),
  motion:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Easing presence'] }),
  legibility: hookMetrics({ hardGatesPass: true, advisoryFails: ['Reading-budget share'] }),
});

describe('computeShipVerdict — ship-ready (all hard gates pass, advisory fails present)', () => {
  it('shipReady is true', () => {
    expect(shipReadyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(shipReadyVerdict.blockers).toHaveLength(0);
  });

  it('all five gates ran', () => {
    expect(shipReadyVerdict.gates.hook.ran).toBe(true);
    expect(shipReadyVerdict.gates.retention.ran).toBe(true);
    expect(shipReadyVerdict.gates.contrast.ran).toBe(true);
    expect(shipReadyVerdict.gates.motion.ran).toBe(true);
    expect(shipReadyVerdict.gates.legibility.ran).toBe(true);
  });

  it('all five gates hardGatesPass true', () => {
    expect(shipReadyVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.legibility.hardGatesPass).toBe(true);
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

  it('motion advisory failure listed — Easing presence', () => {
    expect(shipReadyVerdict.gates.motion.advisoryFailures).toContain('Easing presence');
    expect(shipReadyVerdict.gates.motion.justified).toBe(false);
  });

  it('legibility advisory failure listed — Reading-budget share', () => {
    expect(shipReadyVerdict.gates.legibility.advisoryFailures).toContain('Reading-budget share');
    expect(shipReadyVerdict.gates.legibility.justified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: blocked — hook hardGatesPass false → named in blockers
//
// hook:       hardGatesPass=false (hard gate failed)
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     hardGatesPass=true
// legibility: hardGatesPass=true
//
// Expected: shipReady=false, blockers=['hook hard gates failed']
// ---------------------------------------------------------------------------

const blockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: false }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
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

  it('retention, contrast, motion, legibility gates are not blockers', () => {
    expect(blockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.legibility.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: missing gate — contrast null → 'contrast gate not run' blocker
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   null (gate not run)
// motion:     hardGatesPass=true
// legibility: hardGatesPass=true
//
// Expected: shipReady=false, blockers=['contrast gate not run'], contrast.ran=false
// ---------------------------------------------------------------------------

const missingGateVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   null,
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
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

  it('hook, retention, motion, legibility gates ran and passed', () => {
    expect(missingGateVerdict.gates.hook.ran).toBe(true);
    expect(missingGateVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.retention.ran).toBe(true);
    expect(missingGateVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.motion.ran).toBe(true);
    expect(missingGateVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.legibility.ran).toBe(true);
    expect(missingGateVerdict.gates.legibility.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: motion blocked — motion hardGatesPass false → named in blockers
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     hardGatesPass=false (M1 stutter detected)
// legibility: hardGatesPass=true
//
// Expected: shipReady=false, blockers=['motion hard gates failed']
// ---------------------------------------------------------------------------

const motionBlockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: false }),
  legibility: hookMetrics({ hardGatesPass: true }),
});

describe('computeShipVerdict — motion blocked (motion hard gate failed)', () => {
  it('shipReady is false', () => {
    expect(motionBlockedVerdict.shipReady).toBe(false);
  });

  it('blockers contains "motion hard gates failed"', () => {
    expect(motionBlockedVerdict.blockers).toContain('motion hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(motionBlockedVerdict.blockers).toHaveLength(1);
  });

  it('motion gate ran but hardGatesPass false', () => {
    expect(motionBlockedVerdict.gates.motion.ran).toBe(true);
    expect(motionBlockedVerdict.gates.motion.hardGatesPass).toBe(false);
  });

  it('hook, retention, contrast, legibility gates are not blockers', () => {
    expect(motionBlockedVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.legibility.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 5: missing motion — motion null → 'motion gate not run' blocker
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     null (gate not run — missing metrics.json = hard blocker)
// legibility: hardGatesPass=true
//
// Expected: shipReady=false, blockers=['motion gate not run'], motion.ran=false
// ---------------------------------------------------------------------------

const missingMotionVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     null,
  legibility: hookMetrics({ hardGatesPass: true }),
});

describe('computeShipVerdict — missing motion gate (motion null)', () => {
  it('shipReady is false', () => {
    expect(missingMotionVerdict.shipReady).toBe(false);
  });

  it('blockers contains "motion gate not run"', () => {
    expect(missingMotionVerdict.blockers).toContain('motion gate not run');
  });

  it('blockers has exactly one entry', () => {
    expect(missingMotionVerdict.blockers).toHaveLength(1);
  });

  it('motion gate ran=false, hardGatesPass=false', () => {
    expect(missingMotionVerdict.gates.motion.ran).toBe(false);
    expect(missingMotionVerdict.gates.motion.hardGatesPass).toBe(false);
  });

  it('motion advisoryFailures is empty (gate never ran)', () => {
    expect(missingMotionVerdict.gates.motion.advisoryFailures).toHaveLength(0);
  });

  it('hook, retention, contrast, legibility gates ran and passed', () => {
    expect(missingMotionVerdict.gates.hook.ran).toBe(true);
    expect(missingMotionVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.retention.ran).toBe(true);
    expect(missingMotionVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.contrast.ran).toBe(true);
    expect(missingMotionVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.legibility.ran).toBe(true);
    expect(missingMotionVerdict.gates.legibility.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 6: legibility blocked — legibility hardGatesPass false → named in blockers
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     hardGatesPass=true
// legibility: hardGatesPass=false (L1 text-flash detected)
//
// Expected: shipReady=false, blockers=['legibility hard gates failed']
// ---------------------------------------------------------------------------

const legibilityBlockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: false }),
});

describe('computeShipVerdict — legibility blocked (legibility hard gate failed)', () => {
  it('shipReady is false', () => {
    expect(legibilityBlockedVerdict.shipReady).toBe(false);
  });

  it('blockers contains "legibility hard gates failed"', () => {
    expect(legibilityBlockedVerdict.blockers).toContain('legibility hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(legibilityBlockedVerdict.blockers).toHaveLength(1);
  });

  it('legibility gate ran but hardGatesPass false', () => {
    expect(legibilityBlockedVerdict.gates.legibility.ran).toBe(true);
    expect(legibilityBlockedVerdict.gates.legibility.hardGatesPass).toBe(false);
  });

  it('hook, retention, contrast, motion gates are not blockers', () => {
    expect(legibilityBlockedVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.motion.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 7: missing legibility — legibility null → 'legibility gate not run' blocker
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     hardGatesPass=true
// legibility: null (gate not run — missing metrics.json = hard blocker)
//
// Expected: shipReady=false, blockers=['legibility gate not run'], legibility.ran=false
// ---------------------------------------------------------------------------

const missingLegibilityVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: null,
});

describe('computeShipVerdict — missing legibility gate (legibility null)', () => {
  it('shipReady is false', () => {
    expect(missingLegibilityVerdict.shipReady).toBe(false);
  });

  it('blockers contains "legibility gate not run"', () => {
    expect(missingLegibilityVerdict.blockers).toContain('legibility gate not run');
  });

  it('blockers has exactly one entry', () => {
    expect(missingLegibilityVerdict.blockers).toHaveLength(1);
  });

  it('legibility gate ran=false, hardGatesPass=false', () => {
    expect(missingLegibilityVerdict.gates.legibility.ran).toBe(false);
    expect(missingLegibilityVerdict.gates.legibility.hardGatesPass).toBe(false);
  });

  it('legibility advisoryFailures is empty (gate never ran)', () => {
    expect(missingLegibilityVerdict.gates.legibility.advisoryFailures).toHaveLength(0);
  });

  it('hook, retention, contrast, motion gates ran and passed', () => {
    expect(missingLegibilityVerdict.gates.hook.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.retention.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.contrast.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.motion.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.motion.hardGatesPass).toBe(true);
  });
});
