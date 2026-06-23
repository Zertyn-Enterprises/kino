/**
 * Regression tests for computeShipVerdict.
 *
 * Twenty-three fixture sets:
 *   - Ship-ready:                     all gates hardGatesPass true, advisory fails present
 *                                     → shipReady true, blockers empty.
 *   - Blocked:                        hook hardGatesPass false → shipReady false, gate named in blockers.
 *   - Missing gate:                   contrast null → shipReady false, 'contrast gate not run' blocker.
 *   - Motion blocked:                 motion hardGatesPass false → shipReady false, motion in blockers.
 *   - Missing motion:                 motion null → shipReady false, 'motion gate not run' blocker.
 *   - Legibility blocked:             legibility hardGatesPass false → shipReady false, legibility in blockers.
 *   - Missing legibility:             legibility null → shipReady false, 'legibility gate not run' blocker.
 *   - Legibility advisory-only:       legibility has advisory fail only, all other gates clean
 *                                     → shipReady true (advisory fails never block).
 *   - CodeCraft blocked:              codeCraft hardGatesPass false → shipReady false, codeCraft in blockers.
 *   - Missing codeCraft:              codeCraft null → shipReady false, 'codeCraft gate not run' blocker.
 *   - CodeCraft advisory-only:        codeCraft has advisory fail only, all other gates clean
 *                                     → shipReady true (advisory fails never block).
 *   - Musicsync skip-mode:            musicsync all gates SKIP (no audio analysis) → shipReady true.
 *   - Musicsync hard fail:            musicsync hardGatesPass false → shipReady false.
 *   - Musicsync null:                 musicsync=null → graceful SKIP, does NOT block ship.
 *   - Payoff null:                    payoff=null → graceful SKIP, does NOT block ship.
 *   - Payoff hard fail:               payoff hardGatesPass false → shipReady false.
 *   - Payoff advisory-only:           payoff has P3 advisory fail only → shipReady true.
 *   - RemotionCorrect null:           remotionCorrect=null → graceful SKIP, does NOT block ship.
 *   - RemotionCorrect hard fail:      remotionCorrect hardGatesPass false → shipReady false.
 *   - RemotionCorrect advisory-only:  remotionCorrect has R3/R4/R5 advisory fail only → shipReady true.
 *   - Distinct null:                  distinct=null → graceful SKIP, does NOT block ship.
 *   - Distinct hard fail:             distinct hardGatesPass false (<4 axes differ) → shipReady false.
 *   - Distinct advisory-only:         distinct has drift advisory fail only → shipReady true.
 *
 * All inputs are plain objects matching the shape of each gate's metrics.json;
 * no file I/O is exercised — pure computeShipVerdict path only.
 *
 * Advisory failures:
 *   hook/retention/motion/legibility/codeCraft/musicsync/payoff/remotionCorrect/distinct:
 *                                   metrics.gates entries with advisory=true, pass=false, skip=false
 *   contrast:                       metrics.pairs entries with hard=false, pass=false
 */

import { describe, expect, it } from 'vitest';
import { computeShipVerdict } from './ship-metrics.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Minimal hook/retention/motion/legibility/codeCraft metrics object. */
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
// Fixture 1: ship-ready — all six gates pass, advisory fails present
//
// hook:       hardGatesPass=true, advisory fail: 'background-activity'
// retention:  hardGatesPass=true, advisory fail: 're-hook cadence'
// contrast:   hardGatesPass=true, advisory fail: 'accent-on-bg'
// motion:     hardGatesPass=true, advisory fail: 'Easing presence'
// legibility: hardGatesPass=true, advisory fail: 'Reading-budget share'
// codeCraft:  hardGatesPass=true, advisory fail: 'C2-hex'
//
// Expected: shipReady=true, blockers=[], all gates ran
// ---------------------------------------------------------------------------

const shipReadyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true, advisoryFails: ['background-activity'] }),
  retention:  hookMetrics({ hardGatesPass: true, advisoryFails: ['re-hook cadence'] }),
  contrast:   contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg'] }),
  motion:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Easing presence'] }),
  legibility: hookMetrics({ hardGatesPass: true, advisoryFails: ['Reading-budget share'] }),
  codeCraft:  hookMetrics({ hardGatesPass: true, advisoryFails: ['C2-hex'] }),
});

describe('computeShipVerdict — ship-ready (all hard gates pass, advisory fails present)', () => {
  it('shipReady is true', () => {
    expect(shipReadyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(shipReadyVerdict.blockers).toHaveLength(0);
  });

  it('all six gates ran', () => {
    expect(shipReadyVerdict.gates.hook.ran).toBe(true);
    expect(shipReadyVerdict.gates.retention.ran).toBe(true);
    expect(shipReadyVerdict.gates.contrast.ran).toBe(true);
    expect(shipReadyVerdict.gates.motion.ran).toBe(true);
    expect(shipReadyVerdict.gates.legibility.ran).toBe(true);
    expect(shipReadyVerdict.gates.codeCraft.ran).toBe(true);
  });

  it('all six gates hardGatesPass true', () => {
    expect(shipReadyVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(shipReadyVerdict.gates.codeCraft.hardGatesPass).toBe(true);
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

  it('codeCraft advisory failure listed — C2-hex', () => {
    expect(shipReadyVerdict.gates.codeCraft.advisoryFailures).toContain('C2-hex');
    expect(shipReadyVerdict.gates.codeCraft.justified).toBe(false);
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
// codeCraft:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['hook hard gates failed']
// ---------------------------------------------------------------------------

const blockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: false }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
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

  it('retention, contrast, motion, legibility, codeCraft gates are not blockers', () => {
    expect(blockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(blockedVerdict.gates.codeCraft.hardGatesPass).toBe(true);
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
// codeCraft:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['contrast gate not run'], contrast.ran=false
// ---------------------------------------------------------------------------

const missingGateVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   null,
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
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

  it('hook, retention, motion, legibility, codeCraft gates ran and passed', () => {
    expect(missingGateVerdict.gates.hook.ran).toBe(true);
    expect(missingGateVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.retention.ran).toBe(true);
    expect(missingGateVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.motion.ran).toBe(true);
    expect(missingGateVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.legibility.ran).toBe(true);
    expect(missingGateVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(missingGateVerdict.gates.codeCraft.ran).toBe(true);
    expect(missingGateVerdict.gates.codeCraft.hardGatesPass).toBe(true);
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
// codeCraft:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['motion hard gates failed']
// ---------------------------------------------------------------------------

const motionBlockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: false }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
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

  it('hook, retention, contrast, legibility, codeCraft gates are not blockers', () => {
    expect(motionBlockedVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(motionBlockedVerdict.gates.codeCraft.hardGatesPass).toBe(true);
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
// codeCraft:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['motion gate not run'], motion.ran=false
// ---------------------------------------------------------------------------

const missingMotionVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     null,
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
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

  it('hook, retention, contrast, legibility, codeCraft gates ran and passed', () => {
    expect(missingMotionVerdict.gates.hook.ran).toBe(true);
    expect(missingMotionVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.retention.ran).toBe(true);
    expect(missingMotionVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.contrast.ran).toBe(true);
    expect(missingMotionVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.legibility.ran).toBe(true);
    expect(missingMotionVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(missingMotionVerdict.gates.codeCraft.ran).toBe(true);
    expect(missingMotionVerdict.gates.codeCraft.hardGatesPass).toBe(true);
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
// codeCraft:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['legibility hard gates failed']
// ---------------------------------------------------------------------------

const legibilityBlockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: false }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
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

  it('hook, retention, contrast, motion, codeCraft gates are not blockers', () => {
    expect(legibilityBlockedVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.codeCraft.hardGatesPass).toBe(true);
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
// codeCraft:  hardGatesPass=true
//
// Expected: shipReady=false, blockers=['legibility gate not run'], legibility.ran=false
// ---------------------------------------------------------------------------

const missingLegibilityVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: null,
  codeCraft:  hookMetrics({ hardGatesPass: true }),
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

  it('hook, retention, contrast, motion, codeCraft gates ran and passed', () => {
    expect(missingLegibilityVerdict.gates.hook.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.retention.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.contrast.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.motion.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(missingLegibilityVerdict.gates.codeCraft.ran).toBe(true);
    expect(missingLegibilityVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 8: legibility advisory-only — legibility has L2/L3 advisory fails,
//            all other gates clean (no advisory fails) → still ships.
//
// hook:       hardGatesPass=true, no advisory fails
// retention:  hardGatesPass=true, no advisory fails
// contrast:   hardGatesPass=true, no advisory fails
// motion:     hardGatesPass=true, no advisory fails
// legibility: hardGatesPass=true, advisory fail: 'Reading-budget share' (L2)
// codeCraft:  hardGatesPass=true, no advisory fails
//
// Expected: shipReady=true, blockers=[], legibility.justified=false
// ---------------------------------------------------------------------------

const legibilityAdvisoryOnlyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true, advisoryFails: ['Reading-budget share'] }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
});

describe('computeShipVerdict — legibility advisory-only (L2/L3 advisory fail, all others clean)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(legibilityAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(legibilityAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('all six gates ran', () => {
    expect(legibilityAdvisoryOnlyVerdict.gates.hook.ran).toBe(true);
    expect(legibilityAdvisoryOnlyVerdict.gates.retention.ran).toBe(true);
    expect(legibilityAdvisoryOnlyVerdict.gates.contrast.ran).toBe(true);
    expect(legibilityAdvisoryOnlyVerdict.gates.motion.ran).toBe(true);
    expect(legibilityAdvisoryOnlyVerdict.gates.legibility.ran).toBe(true);
    expect(legibilityAdvisoryOnlyVerdict.gates.codeCraft.ran).toBe(true);
  });

  it('legibility advisory failure listed — Reading-budget share', () => {
    expect(legibilityAdvisoryOnlyVerdict.gates.legibility.advisoryFailures).toContain('Reading-budget share');
    expect(legibilityAdvisoryOnlyVerdict.gates.legibility.justified).toBe(false);
  });

  it('legibility hardGatesPass true despite advisory fail', () => {
    expect(legibilityAdvisoryOnlyVerdict.gates.legibility.hardGatesPass).toBe(true);
  });

  it('other gates have no advisory failures', () => {
    expect(legibilityAdvisoryOnlyVerdict.gates.hook.advisoryFailures).toHaveLength(0);
    expect(legibilityAdvisoryOnlyVerdict.gates.retention.advisoryFailures).toHaveLength(0);
    expect(legibilityAdvisoryOnlyVerdict.gates.motion.advisoryFailures).toHaveLength(0);
    expect(legibilityAdvisoryOnlyVerdict.gates.codeCraft.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 9: codeCraft blocked — codeCraft hardGatesPass false → named in blockers
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     hardGatesPass=true
// legibility: hardGatesPass=true
// codeCraft:  hardGatesPass=false (C1 emoji detected in on-screen copy)
//
// Expected: shipReady=false, blockers=['codeCraft hard gates failed']
// ---------------------------------------------------------------------------

const codeCraftBlockedVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: false }),
});

describe('computeShipVerdict — codeCraft blocked (codeCraft hard gate failed)', () => {
  it('shipReady is false', () => {
    expect(codeCraftBlockedVerdict.shipReady).toBe(false);
  });

  it('blockers contains "codeCraft hard gates failed"', () => {
    expect(codeCraftBlockedVerdict.blockers).toContain('codeCraft hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(codeCraftBlockedVerdict.blockers).toHaveLength(1);
  });

  it('codeCraft gate ran but hardGatesPass false', () => {
    expect(codeCraftBlockedVerdict.gates.codeCraft.ran).toBe(true);
    expect(codeCraftBlockedVerdict.gates.codeCraft.hardGatesPass).toBe(false);
  });

  it('hook, retention, contrast, motion, legibility gates are not blockers', () => {
    expect(codeCraftBlockedVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(codeCraftBlockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(codeCraftBlockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(codeCraftBlockedVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(codeCraftBlockedVerdict.gates.legibility.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 10: missing codeCraft — codeCraft null → 'codeCraft gate not run' blocker
//
// hook:       hardGatesPass=true
// retention:  hardGatesPass=true
// contrast:   hardGatesPass=true
// motion:     hardGatesPass=true
// legibility: hardGatesPass=true
// codeCraft:  null (gate not run — missing metrics.json = hard blocker)
//
// Expected: shipReady=false, blockers=['codeCraft gate not run'], codeCraft.ran=false
// ---------------------------------------------------------------------------

const missingCodeCraftVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  null,
});

describe('computeShipVerdict — missing codeCraft gate (codeCraft null)', () => {
  it('shipReady is false', () => {
    expect(missingCodeCraftVerdict.shipReady).toBe(false);
  });

  it('blockers contains "codeCraft gate not run"', () => {
    expect(missingCodeCraftVerdict.blockers).toContain('codeCraft gate not run');
  });

  it('blockers has exactly one entry', () => {
    expect(missingCodeCraftVerdict.blockers).toHaveLength(1);
  });

  it('codeCraft gate ran=false, hardGatesPass=false', () => {
    expect(missingCodeCraftVerdict.gates.codeCraft.ran).toBe(false);
    expect(missingCodeCraftVerdict.gates.codeCraft.hardGatesPass).toBe(false);
  });

  it('codeCraft advisoryFailures is empty (gate never ran)', () => {
    expect(missingCodeCraftVerdict.gates.codeCraft.advisoryFailures).toHaveLength(0);
  });

  it('hook, retention, contrast, motion, legibility gates ran and passed', () => {
    expect(missingCodeCraftVerdict.gates.hook.ran).toBe(true);
    expect(missingCodeCraftVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(missingCodeCraftVerdict.gates.retention.ran).toBe(true);
    expect(missingCodeCraftVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(missingCodeCraftVerdict.gates.contrast.ran).toBe(true);
    expect(missingCodeCraftVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(missingCodeCraftVerdict.gates.motion.ran).toBe(true);
    expect(missingCodeCraftVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(missingCodeCraftVerdict.gates.legibility.ran).toBe(true);
    expect(missingCodeCraftVerdict.gates.legibility.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 11: codeCraft advisory-only — codeCraft has C2/C3 advisory fails only,
//             all other gates clean → still ships.
//
// hook:       hardGatesPass=true, no advisory fails
// retention:  hardGatesPass=true, no advisory fails
// contrast:   hardGatesPass=true, no advisory fails
// motion:     hardGatesPass=true, no advisory fails
// legibility: hardGatesPass=true, no advisory fails
// codeCraft:  hardGatesPass=true, advisory fail: 'C3-easing'
//
// Expected: shipReady=true, blockers=[], codeCraft.justified=false
// ---------------------------------------------------------------------------

const codeCraftAdvisoryOnlyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true, advisoryFails: ['C3-easing'] }),
});

describe('computeShipVerdict — codeCraft advisory-only (C2/C3 advisory fail, all others clean)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(codeCraftAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(codeCraftAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('all six gates ran', () => {
    expect(codeCraftAdvisoryOnlyVerdict.gates.hook.ran).toBe(true);
    expect(codeCraftAdvisoryOnlyVerdict.gates.retention.ran).toBe(true);
    expect(codeCraftAdvisoryOnlyVerdict.gates.contrast.ran).toBe(true);
    expect(codeCraftAdvisoryOnlyVerdict.gates.motion.ran).toBe(true);
    expect(codeCraftAdvisoryOnlyVerdict.gates.legibility.ran).toBe(true);
    expect(codeCraftAdvisoryOnlyVerdict.gates.codeCraft.ran).toBe(true);
  });

  it('codeCraft advisory failure listed — C3-easing', () => {
    expect(codeCraftAdvisoryOnlyVerdict.gates.codeCraft.advisoryFailures).toContain('C3-easing');
    expect(codeCraftAdvisoryOnlyVerdict.gates.codeCraft.justified).toBe(false);
  });

  it('codeCraft hardGatesPass true despite advisory fail', () => {
    expect(codeCraftAdvisoryOnlyVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });

  it('other gates have no advisory failures', () => {
    expect(codeCraftAdvisoryOnlyVerdict.gates.hook.advisoryFailures).toHaveLength(0);
    expect(codeCraftAdvisoryOnlyVerdict.gates.retention.advisoryFailures).toHaveLength(0);
    expect(codeCraftAdvisoryOnlyVerdict.gates.motion.advisoryFailures).toHaveLength(0);
    expect(codeCraftAdvisoryOnlyVerdict.gates.legibility.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 12: musicsync skip-mode — all four gates SKIP (no audio analysis),
//             hardGatesPass=true → shipReady=true
//
// All six base gates: hardGatesPass=true
// musicsync: hardGatesPass=true, all gates skip:true (no analysis.json)
//
// Expected: shipReady=true, blockers=[], musicsync.ran=true, musicsync.hardGatesPass=true
// ---------------------------------------------------------------------------

const musicSyncSkipVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync: {
    hardGatesPass: true,
    gates: [
      { id: 1, name: 'Tempo lock',            hard: true,  advisory: false, pass: false, skip: true },
      { id: 2, name: 'Downbeat lock',         hard: true,  advisory: false, pass: false, skip: true },
      { id: 3, name: 'Climax on drop',        hard: false, advisory: true,  pass: false, skip: true },
      { id: 4, name: 'Cut-on-beat coverage',  hard: false, advisory: true,  pass: false, skip: true },
    ],
  },
});

describe('computeShipVerdict — musicsync skip-mode (all four gates SKIP, no audio analysis)', () => {
  it('shipReady is true — skipped audio gates never block', () => {
    expect(musicSyncSkipVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(musicSyncSkipVerdict.blockers).toHaveLength(0);
  });

  it('musicsync gate ran and hardGatesPass true', () => {
    expect(musicSyncSkipVerdict.gates.musicsync.ran).toBe(true);
    expect(musicSyncSkipVerdict.gates.musicsync.hardGatesPass).toBe(true);
  });

  it('musicsync advisory failures is empty — skipped gates are not advisory failures', () => {
    expect(musicSyncSkipVerdict.gates.musicsync.advisoryFailures).toHaveLength(0);
    expect(musicSyncSkipVerdict.gates.musicsync.justified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 13: musicsync hard fail — MS1 tempo mismatch → blocked
//
// All six base gates: hardGatesPass=true
// musicsync: hardGatesPass=false (MS1 tempo lock failed)
//
// Expected: shipReady=false, blockers=['musicsync hard gates failed']
// ---------------------------------------------------------------------------

const musicSyncHardFailVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  hookMetrics({ hardGatesPass: false }),
});

describe('computeShipVerdict — musicsync hard fail (MS1 tempo mismatch)', () => {
  it('shipReady is false', () => {
    expect(musicSyncHardFailVerdict.shipReady).toBe(false);
  });

  it('blockers contains "musicsync hard gates failed"', () => {
    expect(musicSyncHardFailVerdict.blockers).toContain('musicsync hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(musicSyncHardFailVerdict.blockers).toHaveLength(1);
  });

  it('musicsync gate ran but hardGatesPass false', () => {
    expect(musicSyncHardFailVerdict.gates.musicsync.ran).toBe(true);
    expect(musicSyncHardFailVerdict.gates.musicsync.hardGatesPass).toBe(false);
  });

  it('all six base gates are not blockers', () => {
    expect(musicSyncHardFailVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(musicSyncHardFailVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(musicSyncHardFailVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(musicSyncHardFailVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(musicSyncHardFailVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(musicSyncHardFailVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 14: musicsync null — gate not run → does NOT block
//             (unlike other gates; null musicsync degrades gracefully to SKIP)
//
// All six base gates: hardGatesPass=true
// musicsync: null (no metrics.json — audio absent, no analysis run)
//
// Expected: shipReady=true, blockers=[], musicsync.ran=false, musicsync.hardGatesPass=true
// ---------------------------------------------------------------------------

const musicSyncNullVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
});

describe('computeShipVerdict — musicsync null (gate not run — graceful SKIP, not a hard blocker)', () => {
  it('shipReady is true — null musicsync does not block', () => {
    expect(musicSyncNullVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(musicSyncNullVerdict.blockers).toHaveLength(0);
  });

  it('musicsync gate ran=false but hardGatesPass=true (graceful SKIP)', () => {
    expect(musicSyncNullVerdict.gates.musicsync.ran).toBe(false);
    expect(musicSyncNullVerdict.gates.musicsync.hardGatesPass).toBe(true);
  });

  it('musicsync advisory failures is empty', () => {
    expect(musicSyncNullVerdict.gates.musicsync.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 15: payoff null — gate not run → does NOT block
//             (same graceful SKIP semantics as musicsync: absent metrics ≠ hard fail)
//
// All seven base gates: hardGatesPass=true
// payoff: null (no metrics.json — absent metrics, graceful SKIP)
//
// Expected: shipReady=true, blockers=[], payoff.ran=false, payoff.hardGatesPass=true
// ---------------------------------------------------------------------------

const payoffNullVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
});

describe('computeShipVerdict — payoff null (gate not run — graceful SKIP, not a hard blocker)', () => {
  it('shipReady is true — null payoff does not block', () => {
    expect(payoffNullVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(payoffNullVerdict.blockers).toHaveLength(0);
  });

  it('payoff gate ran=false but hardGatesPass=true (graceful SKIP)', () => {
    expect(payoffNullVerdict.gates.payoff.ran).toBe(false);
    expect(payoffNullVerdict.gates.payoff.hardGatesPass).toBe(true);
  });

  it('payoff advisory failures is empty', () => {
    expect(payoffNullVerdict.gates.payoff.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 16: payoff hard fail — P1/P2 blocked → shipReady=false
//
// All seven base gates: hardGatesPass=true
// payoff: hardGatesPass=false (P1 no settled identity in closing window)
//
// Expected: shipReady=false, blockers=['payoff hard gates failed']
// ---------------------------------------------------------------------------

const payoffHardFailVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     hookMetrics({ hardGatesPass: false }),
});

describe('computeShipVerdict — payoff hard fail (P1/P2 failed)', () => {
  it('shipReady is false', () => {
    expect(payoffHardFailVerdict.shipReady).toBe(false);
  });

  it('blockers contains "payoff hard gates failed"', () => {
    expect(payoffHardFailVerdict.blockers).toContain('payoff hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(payoffHardFailVerdict.blockers).toHaveLength(1);
  });

  it('payoff gate ran but hardGatesPass false', () => {
    expect(payoffHardFailVerdict.gates.payoff.ran).toBe(true);
    expect(payoffHardFailVerdict.gates.payoff.hardGatesPass).toBe(false);
  });

  it('all seven base gates are not blockers', () => {
    expect(payoffHardFailVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 17: payoff advisory-only — P3 closing stability advisory fail only,
//             all other gates clean → still ships.
//
// All seven base gates: hardGatesPass=true
// payoff: hardGatesPass=true, advisory fail: 'Closing stability'
//
// Expected: shipReady=true, blockers=[], payoff.justified=false
// ---------------------------------------------------------------------------

const payoffAdvisoryOnlyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Closing stability'] }),
});

describe('computeShipVerdict — payoff advisory-only (P3 advisory fail, all others clean)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(payoffAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(payoffAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('payoff gate ran and hardGatesPass true', () => {
    expect(payoffAdvisoryOnlyVerdict.gates.payoff.ran).toBe(true);
    expect(payoffAdvisoryOnlyVerdict.gates.payoff.hardGatesPass).toBe(true);
  });

  it('payoff advisory failure listed — Closing stability', () => {
    expect(payoffAdvisoryOnlyVerdict.gates.payoff.advisoryFailures).toContain('Closing stability');
    expect(payoffAdvisoryOnlyVerdict.gates.payoff.justified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 18: remotionCorrect null — gate not run → does NOT block
//             (same graceful SKIP semantics as musicsync/payoff: absent metrics ≠ hard fail)
//
// All eight base gates: hardGatesPass=true
// remotionCorrect: null (no metrics.json — graceful SKIP)
//
// Expected: shipReady=true, blockers=[], remotionCorrect.ran=false, remotionCorrect.hardGatesPass=true
// ---------------------------------------------------------------------------

const remotionCorrectNullVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
  remotionCorrect: null,
});

describe('computeShipVerdict — remotionCorrect null (gate not run — graceful SKIP, not a hard blocker)', () => {
  it('shipReady is true — null remotionCorrect does not block', () => {
    expect(remotionCorrectNullVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(remotionCorrectNullVerdict.blockers).toHaveLength(0);
  });

  it('remotionCorrect gate ran=false but hardGatesPass=true (graceful SKIP)', () => {
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.ran).toBe(false);
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.hardGatesPass).toBe(true);
  });

  it('remotionCorrect advisory failures is empty', () => {
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 19: remotionCorrect hard fail — R1/R2 blocked → shipReady=false
//
// All eight base gates: hardGatesPass=true
// remotionCorrect: hardGatesPass=false (R1 Math.random detected)
//
// Expected: shipReady=false, blockers=['remotionCorrect hard gates failed']
// ---------------------------------------------------------------------------

const remotionCorrectHardFailVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
  remotionCorrect: hookMetrics({ hardGatesPass: false }),
});

describe('computeShipVerdict — remotionCorrect hard fail (R1/R2 failed)', () => {
  it('shipReady is false', () => {
    expect(remotionCorrectHardFailVerdict.shipReady).toBe(false);
  });

  it('blockers contains "remotionCorrect hard gates failed"', () => {
    expect(remotionCorrectHardFailVerdict.blockers).toContain('remotionCorrect hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(remotionCorrectHardFailVerdict.blockers).toHaveLength(1);
  });

  it('remotionCorrect gate ran but hardGatesPass false', () => {
    expect(remotionCorrectHardFailVerdict.gates.remotionCorrect.ran).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.remotionCorrect.hardGatesPass).toBe(false);
  });

  it('all eight base gates are not blockers', () => {
    expect(remotionCorrectHardFailVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 20: remotionCorrect advisory-only — R3/R4/R5 advisory fail only,
//             all other gates clean → still ships.
//
// All eight base gates: hardGatesPass=true
// remotionCorrect: hardGatesPass=true, advisory fail: 'R3-interpolate-clamp'
//
// Expected: shipReady=true, blockers=[], remotionCorrect.justified=false
// ---------------------------------------------------------------------------

const remotionCorrectAdvisoryOnlyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
  remotionCorrect: hookMetrics({ hardGatesPass: true, advisoryFails: ['R3-interpolate-clamp'] }),
});

describe('computeShipVerdict — remotionCorrect advisory-only (R3/R4/R5 advisory fail, all others clean)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(remotionCorrectAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(remotionCorrectAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('remotionCorrect gate ran and hardGatesPass true', () => {
    expect(remotionCorrectAdvisoryOnlyVerdict.gates.remotionCorrect.ran).toBe(true);
    expect(remotionCorrectAdvisoryOnlyVerdict.gates.remotionCorrect.hardGatesPass).toBe(true);
  });

  it('remotionCorrect advisory failure listed — R3-interpolate-clamp', () => {
    expect(remotionCorrectAdvisoryOnlyVerdict.gates.remotionCorrect.advisoryFailures).toContain('R3-interpolate-clamp');
    expect(remotionCorrectAdvisoryOnlyVerdict.gates.remotionCorrect.justified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 21: distinct null — gate not run → does NOT block
//             (same graceful SKIP semantics as musicsync/payoff/remotionCorrect)
//
// All nine base gates: hardGatesPass=true
// distinct: null (no metrics.json — graceful SKIP)
//
// Expected: shipReady=true, blockers=[], distinct.ran=false, distinct.hardGatesPass=true
// ---------------------------------------------------------------------------

const distinctNullVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
  remotionCorrect: null,
  distinct:   null,
});

describe('computeShipVerdict — distinct null (gate not run — graceful SKIP, not a hard blocker)', () => {
  it('shipReady is true — null distinct does not block', () => {
    expect(distinctNullVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(distinctNullVerdict.blockers).toHaveLength(0);
  });

  it('distinct gate ran=false but hardGatesPass=true (graceful SKIP)', () => {
    expect(distinctNullVerdict.gates.distinct.ran).toBe(false);
    expect(distinctNullVerdict.gates.distinct.hardGatesPass).toBe(true);
  });

  it('distinct advisory failures is empty', () => {
    expect(distinctNullVerdict.gates.distinct.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 22: distinct hard fail — HARD BLOCKED → shipReady=false
//
// All nine base gates: hardGatesPass=true
// distinct: hardGatesPass=false (<4 axes differ from a prior entry)
//
// Expected: shipReady=false, blockers=['distinct hard gates failed']
// ---------------------------------------------------------------------------

const distinctHardFailVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
  remotionCorrect: null,
  distinct:   hookMetrics({ hardGatesPass: false }),
});

describe('computeShipVerdict — distinct hard fail (<4 axes differ from prior)', () => {
  it('shipReady is false', () => {
    expect(distinctHardFailVerdict.shipReady).toBe(false);
  });

  it('blockers contains "distinct hard gates failed"', () => {
    expect(distinctHardFailVerdict.blockers).toContain('distinct hard gates failed');
  });

  it('blockers has exactly one entry', () => {
    expect(distinctHardFailVerdict.blockers).toHaveLength(1);
  });

  it('distinct gate ran but hardGatesPass false', () => {
    expect(distinctHardFailVerdict.gates.distinct.ran).toBe(true);
    expect(distinctHardFailVerdict.gates.distinct.hardGatesPass).toBe(false);
  });

  it('all nine base gates are not blockers', () => {
    expect(distinctHardFailVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(distinctHardFailVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(distinctHardFailVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(distinctHardFailVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(distinctHardFailVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(distinctHardFailVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 23: distinct advisory-only — drift advisory fires, hard gate passes → ships
//
// All nine base gates: hardGatesPass=true
// distinct: hardGatesPass=true, advisory fail: 'Advisory: bg-luminance drift...'
//
// Expected: shipReady=true, blockers=[], distinct.justified=false
// ---------------------------------------------------------------------------

const distinctAdvisoryOnlyVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  musicsync:  null,
  payoff:     null,
  remotionCorrect: null,
  distinct:   hookMetrics({ hardGatesPass: true, advisoryFails: ['Advisory: bg-luminance drift (2 entries: relay=dark, granipa=tonal)'] }),
});

describe('computeShipVerdict — distinct advisory-only (drift advisory, hard gate passes)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(distinctAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(distinctAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('distinct gate ran and hardGatesPass true', () => {
    expect(distinctAdvisoryOnlyVerdict.gates.distinct.ran).toBe(true);
    expect(distinctAdvisoryOnlyVerdict.gates.distinct.hardGatesPass).toBe(true);
  });

  it('distinct advisory failure listed — bg-luminance drift', () => {
    expect(distinctAdvisoryOnlyVerdict.gates.distinct.advisoryFailures).toHaveLength(1);
    expect(distinctAdvisoryOnlyVerdict.gates.distinct.justified).toBe(false);
  });
});
