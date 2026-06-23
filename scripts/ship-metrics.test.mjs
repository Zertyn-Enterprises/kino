/**
 * Regression tests for computeShipVerdict.
 *
 * Three-state coverage model: ran | skip-na | coverage-gap.
 *   - ran         — gate produced a real verdict (PASS/FAIL).
 *   - skip-na     — gate is N/A for this video (no music declared; <2 registry entries).
 *   - coverage-gap — HARD-gated dimension needed but not verified; blocks unless acknowledged.
 *
 * Fixture groups (33 total):
 *   1.  Ship-ready: all ten gates pass, advisory fails present → shipReady true.
 *   2.  Blocked: hook hardGatesPass false → shipReady false.
 *   3.  Missing gate: contrast null → coverage-gap blocker.
 *   4.  Motion blocked: motion hardGatesPass false.
 *   5.  Missing motion: motion null → coverage-gap blocker.
 *   6.  Legibility blocked: legibility hardGatesPass false.
 *   7.  Missing legibility: legibility null → coverage-gap blocker.
 *   8.  Legibility advisory-only: ships.
 *   9.  CodeCraft blocked: codeCraft hardGatesPass false.
 *   10. Missing codeCraft: codeCraft null → coverage-gap blocker.
 *   11. CodeCraft advisory-only: ships.
 *   12. Musicsync skip-mode + declaresMusic=false → skip-na, non-blocking.
 *   13. Musicsync hard fail + declaresMusic=true → blocks.
 *   14. Musicsync null + declaresMusic=false (default) → skip-na, non-blocking.
 *   15. Payoff null → coverage-gap, BLOCKS.
 *   16. Payoff hard fail: P1/P2 blocked.
 *   17. Payoff advisory-only: ships.
 *   18. RemotionCorrect null → coverage-gap, BLOCKS.
 *   19. RemotionCorrect hard fail: R1/R2 blocked.
 *   20. RemotionCorrect advisory-only: ships.
 *   21. Distinct null + registryEntryCount=0 (default) → skip-na, non-blocking.
 *   22. Distinct hard fail: blocks.
 *   23. Distinct advisory-only: ships.
 *   24. Remediations: ship-ready → [].
 *   25. Remediations: hard blocker entry.
 *   26. Remediations: advisory entry.
 *   27. Remediations: blockers before advisories ordering.
 *   28. Coverage — declares-music + no analysis → musicsync coverage-gap BLOCKS.
 *   29. Coverage — no-music (declaresMusic=false) → musicsync skip-na non-blocking.
 *   30. Coverage — declared music + audioAcknowledged → coverage-gap acknowledged, non-blocking.
 *   31. Coverage — absent-payoff → coverage-gap BLOCKS.
 *   32. Coverage — absent-distinct with registryEntryCount=2 → coverage-gap BLOCKS.
 *   33. Coverage — distinct-skip-na with registryEntryCount<2.
 *
 * Advisory failure extraction:
 *   hook/retention/motion/legibility/codeCraft/musicsync/payoff/remotionCorrect/distinct:
 *     metrics.gates entries with advisory=true, pass=false, skip=false
 *   contrast:
 *     metrics.pairs entries with hard=false, pass=false
 */

import { describe, expect, it } from 'vitest';
import { computeShipVerdict } from './ship-metrics.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Minimal hook/retention/motion/legibility/codeCraft/musicsync/payoff/remotionCorrect/distinct metrics. */
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

/**
 * Baseline passing metrics for all ten gates.
 * Individual fixtures spread this and override what they care about.
 * musicsync omitted (null → skip-na with default declaresMusic=false).
 */
function cleanGates() {
  return {
    hook:            hookMetrics({ hardGatesPass: true }),
    retention:       hookMetrics({ hardGatesPass: true }),
    contrast:        contrastMetrics({ hardGatesPass: true }),
    motion:          hookMetrics({ hardGatesPass: true }),
    legibility:      hookMetrics({ hardGatesPass: true }),
    codeCraft:       hookMetrics({ hardGatesPass: true }),
    // musicsync: null → skip-na (declaresMusic defaults to false)
    payoff:          hookMetrics({ hardGatesPass: true }),
    remotionCorrect: hookMetrics({ hardGatesPass: true }),
    distinct:        hookMetrics({ hardGatesPass: true }),
  };
}

// ---------------------------------------------------------------------------
// Fixture 1: ship-ready — all hard gates pass, advisory fails present
// ---------------------------------------------------------------------------

const shipReadyVerdict = computeShipVerdict({
  ...cleanGates(),
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

  it('coverageGaps is empty', () => {
    expect(shipReadyVerdict.coverageGaps).toHaveLength(0);
  });

  it('all six base gates ran', () => {
    expect(shipReadyVerdict.gates.hook.ran).toBe(true);
    expect(shipReadyVerdict.gates.retention.ran).toBe(true);
    expect(shipReadyVerdict.gates.contrast.ran).toBe(true);
    expect(shipReadyVerdict.gates.motion.ran).toBe(true);
    expect(shipReadyVerdict.gates.legibility.ran).toBe(true);
    expect(shipReadyVerdict.gates.codeCraft.ran).toBe(true);
  });

  it('all six base gates coverage is ran', () => {
    expect(shipReadyVerdict.gates.hook.coverage).toBe('ran');
    expect(shipReadyVerdict.gates.retention.coverage).toBe('ran');
    expect(shipReadyVerdict.gates.contrast.coverage).toBe('ran');
    expect(shipReadyVerdict.gates.motion.coverage).toBe('ran');
    expect(shipReadyVerdict.gates.legibility.coverage).toBe('ran');
    expect(shipReadyVerdict.gates.codeCraft.coverage).toBe('ran');
  });

  it('all six base gates hardGatesPass true', () => {
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

  it('musicsync is skip-na (declaresMusic=false default)', () => {
    expect(shipReadyVerdict.gates.musicsync.coverage).toBe('skip-na');
    expect(shipReadyVerdict.gates.musicsync.ran).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: blocked — hook hardGatesPass false → named in blockers
// ---------------------------------------------------------------------------

const blockedVerdict = computeShipVerdict({
  ...cleanGates(),
  hook: hookMetrics({ hardGatesPass: false }),
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
// Fixture 3: missing gate — contrast null → coverage-gap blocker
// ---------------------------------------------------------------------------

const missingGateVerdict = computeShipVerdict({
  ...cleanGates(),
  contrast: null,
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

  it('contrast gate ran=false, hardGatesPass=false, coverage=coverage-gap', () => {
    expect(missingGateVerdict.gates.contrast.ran).toBe(false);
    expect(missingGateVerdict.gates.contrast.hardGatesPass).toBe(false);
    expect(missingGateVerdict.gates.contrast.coverage).toBe('coverage-gap');
  });

  it('coverageGaps contains contrast', () => {
    expect(missingGateVerdict.coverageGaps).toContain('contrast');
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
// ---------------------------------------------------------------------------

const motionBlockedVerdict = computeShipVerdict({
  ...cleanGates(),
  motion: hookMetrics({ hardGatesPass: false }),
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
// Fixture 5: missing motion — motion null → coverage-gap blocker
// ---------------------------------------------------------------------------

const missingMotionVerdict = computeShipVerdict({
  ...cleanGates(),
  motion: null,
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

  it('motion gate ran=false, hardGatesPass=false, coverage=coverage-gap', () => {
    expect(missingMotionVerdict.gates.motion.ran).toBe(false);
    expect(missingMotionVerdict.gates.motion.hardGatesPass).toBe(false);
    expect(missingMotionVerdict.gates.motion.coverage).toBe('coverage-gap');
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
// ---------------------------------------------------------------------------

const legibilityBlockedVerdict = computeShipVerdict({
  ...cleanGates(),
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

  it('hook, retention, contrast, motion, codeCraft gates are not blockers', () => {
    expect(legibilityBlockedVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(legibilityBlockedVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 7: missing legibility — legibility null → coverage-gap blocker
// ---------------------------------------------------------------------------

const missingLegibilityVerdict = computeShipVerdict({
  ...cleanGates(),
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

  it('legibility gate ran=false, hardGatesPass=false, coverage=coverage-gap', () => {
    expect(missingLegibilityVerdict.gates.legibility.ran).toBe(false);
    expect(missingLegibilityVerdict.gates.legibility.hardGatesPass).toBe(false);
    expect(missingLegibilityVerdict.gates.legibility.coverage).toBe('coverage-gap');
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
// Fixture 8: legibility advisory-only — ships (advisory never blocks)
// ---------------------------------------------------------------------------

const legibilityAdvisoryOnlyVerdict = computeShipVerdict({
  ...cleanGates(),
  legibility: hookMetrics({ hardGatesPass: true, advisoryFails: ['Reading-budget share'] }),
});

describe('computeShipVerdict — legibility advisory-only (L2/L3 advisory fail, all others clean)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(legibilityAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(legibilityAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('all six base gates ran', () => {
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
// ---------------------------------------------------------------------------

const codeCraftBlockedVerdict = computeShipVerdict({
  ...cleanGates(),
  codeCraft: hookMetrics({ hardGatesPass: false }),
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
// Fixture 10: missing codeCraft — codeCraft null → coverage-gap blocker
// ---------------------------------------------------------------------------

const missingCodeCraftVerdict = computeShipVerdict({
  ...cleanGates(),
  codeCraft: null,
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

  it('codeCraft gate ran=false, hardGatesPass=false, coverage=coverage-gap', () => {
    expect(missingCodeCraftVerdict.gates.codeCraft.ran).toBe(false);
    expect(missingCodeCraftVerdict.gates.codeCraft.hardGatesPass).toBe(false);
    expect(missingCodeCraftVerdict.gates.codeCraft.coverage).toBe('coverage-gap');
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
// Fixture 11: codeCraft advisory-only — ships
// ---------------------------------------------------------------------------

const codeCraftAdvisoryOnlyVerdict = computeShipVerdict({
  ...cleanGates(),
  codeCraft: hookMetrics({ hardGatesPass: true, advisoryFails: ['C3-easing'] }),
});

describe('computeShipVerdict — codeCraft advisory-only (C2/C3 advisory fail, all others clean)', () => {
  it('shipReady is true — advisory fails never block', () => {
    expect(codeCraftAdvisoryOnlyVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(codeCraftAdvisoryOnlyVerdict.blockers).toHaveLength(0);
  });

  it('all six base gates ran', () => {
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
// Fixture 12: musicsync skip-mode + declaresMusic=false → skip-na, non-blocking
//
// Video does not declare music. musicsync metrics present but all gates skip.
// With declaresMusic=false, musicsync is skip-na regardless of metrics content.
// ---------------------------------------------------------------------------

const musicSyncSkipNoMusicVerdict = computeShipVerdict({
  ...cleanGates(),
  musicsync: {
    hardGatesPass: true,
    gates: [
      { id: 1, name: 'Tempo lock',            hard: true,  advisory: false, pass: false, skip: true },
      { id: 2, name: 'Downbeat lock',         hard: true,  advisory: false, pass: false, skip: true },
      { id: 3, name: 'Climax on drop',        hard: false, advisory: true,  pass: false, skip: true },
      { id: 4, name: 'Cut-on-beat coverage',  hard: false, advisory: true,  pass: false, skip: true },
    ],
  },
  declaresMusic: false,
});

describe('computeShipVerdict — musicsync skip-mode + declaresMusic=false → skip-na', () => {
  it('shipReady is true — no music declared, musicsync is N/A', () => {
    expect(musicSyncSkipNoMusicVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(musicSyncSkipNoMusicVerdict.blockers).toHaveLength(0);
  });

  it('coverageGaps is empty', () => {
    expect(musicSyncSkipNoMusicVerdict.coverageGaps).toHaveLength(0);
  });

  it('musicsync coverage is skip-na', () => {
    expect(musicSyncSkipNoMusicVerdict.gates.musicsync.coverage).toBe('skip-na');
  });

  it('musicsync ran=false (skip-na gate is not executed)', () => {
    expect(musicSyncSkipNoMusicVerdict.gates.musicsync.ran).toBe(false);
  });

  it('musicsync hardGatesPass=true', () => {
    expect(musicSyncSkipNoMusicVerdict.gates.musicsync.hardGatesPass).toBe(true);
  });

  it('musicsync advisory failures is empty', () => {
    expect(musicSyncSkipNoMusicVerdict.gates.musicsync.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 13: musicsync hard fail + declaresMusic=true → BLOCKS
// ---------------------------------------------------------------------------

const musicSyncHardFailVerdict = computeShipVerdict({
  ...cleanGates(),
  musicsync:      hookMetrics({ hardGatesPass: false }),
  declaresMusic:  true,
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

  it('musicsync gate ran, coverage=ran, hardGatesPass false', () => {
    expect(musicSyncHardFailVerdict.gates.musicsync.ran).toBe(true);
    expect(musicSyncHardFailVerdict.gates.musicsync.coverage).toBe('ran');
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
// Fixture 14: musicsync null + declaresMusic=false (default) → skip-na, non-blocking
//
// Back-compat: a video with no music declared has musicsync=skip-na
// regardless of whether metrics are present.
// ---------------------------------------------------------------------------

const musicSyncNullVerdict = computeShipVerdict({
  ...cleanGates(),
  musicsync: null,
  // declaresMusic defaults to false
});

describe('computeShipVerdict — musicsync null + declaresMusic=false → skip-na (non-blocking)', () => {
  it('shipReady is true — no music declared', () => {
    expect(musicSyncNullVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(musicSyncNullVerdict.blockers).toHaveLength(0);
  });

  it('coverageGaps is empty', () => {
    expect(musicSyncNullVerdict.coverageGaps).toHaveLength(0);
  });

  it('musicsync coverage is skip-na', () => {
    expect(musicSyncNullVerdict.gates.musicsync.coverage).toBe('skip-na');
  });

  it('musicsync ran=false', () => {
    expect(musicSyncNullVerdict.gates.musicsync.ran).toBe(false);
  });

  it('musicsync hardGatesPass=true', () => {
    expect(musicSyncNullVerdict.gates.musicsync.hardGatesPass).toBe(true);
  });

  it('musicsync advisory failures is empty', () => {
    expect(musicSyncNullVerdict.gates.musicsync.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 15: payoff null → coverage-gap BLOCKS
//
// payoff=null means the closing-payoff gate (P1/P2 HARD) was never verified.
// This is a coverage-gap, not a graceful SKIP.
// ---------------------------------------------------------------------------

const payoffNullVerdict = computeShipVerdict({
  ...cleanGates(),
  payoff: null,
});

describe('computeShipVerdict — payoff null → coverage-gap BLOCKS', () => {
  it('shipReady is false', () => {
    expect(payoffNullVerdict.shipReady).toBe(false);
  });

  it('blockers contains "payoff coverage-gap"', () => {
    expect(payoffNullVerdict.blockers).toContain('payoff coverage-gap');
  });

  it('blockers has exactly one entry', () => {
    expect(payoffNullVerdict.blockers).toHaveLength(1);
  });

  it('payoff gate coverage=coverage-gap', () => {
    expect(payoffNullVerdict.gates.payoff.coverage).toBe('coverage-gap');
  });

  it('payoff gate ran=false', () => {
    expect(payoffNullVerdict.gates.payoff.ran).toBe(false);
  });

  it('payoff gate hardGatesPass=true (never ran, not a hard fail)', () => {
    expect(payoffNullVerdict.gates.payoff.hardGatesPass).toBe(true);
  });

  it('coverageGaps contains payoff', () => {
    expect(payoffNullVerdict.coverageGaps).toContain('payoff');
  });

  it('payoff advisory failures is empty', () => {
    expect(payoffNullVerdict.gates.payoff.advisoryFailures).toHaveLength(0);
  });

  it('all base gates and other optional gates are not blockers', () => {
    expect(payoffNullVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(payoffNullVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(payoffNullVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(payoffNullVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(payoffNullVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(payoffNullVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 16: payoff hard fail — P1/P2 blocked → shipReady=false
// ---------------------------------------------------------------------------

const payoffHardFailVerdict = computeShipVerdict({
  ...cleanGates(),
  payoff: hookMetrics({ hardGatesPass: false }),
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
    expect(payoffHardFailVerdict.gates.payoff.coverage).toBe('ran');
  });

  it('all seven other gates are not blockers', () => {
    expect(payoffHardFailVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(payoffHardFailVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 17: payoff advisory-only — P3 advisory fail only → ships
// ---------------------------------------------------------------------------

const payoffAdvisoryOnlyVerdict = computeShipVerdict({
  ...cleanGates(),
  payoff: hookMetrics({ hardGatesPass: true, advisoryFails: ['Closing stability'] }),
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
// Fixture 18: remotionCorrect null → coverage-gap BLOCKS
//
// remotionCorrect=null means the Remotion-correctness gate (R1/R2 HARD) was
// never verified. This is a coverage-gap, not a graceful SKIP.
// ---------------------------------------------------------------------------

const remotionCorrectNullVerdict = computeShipVerdict({
  ...cleanGates(),
  remotionCorrect: null,
});

describe('computeShipVerdict — remotionCorrect null → coverage-gap BLOCKS', () => {
  it('shipReady is false', () => {
    expect(remotionCorrectNullVerdict.shipReady).toBe(false);
  });

  it('blockers contains "remotionCorrect coverage-gap"', () => {
    expect(remotionCorrectNullVerdict.blockers).toContain('remotionCorrect coverage-gap');
  });

  it('blockers has exactly one entry', () => {
    expect(remotionCorrectNullVerdict.blockers).toHaveLength(1);
  });

  it('remotionCorrect gate coverage=coverage-gap', () => {
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.coverage).toBe('coverage-gap');
  });

  it('remotionCorrect gate ran=false', () => {
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.ran).toBe(false);
  });

  it('remotionCorrect gate hardGatesPass=true (never ran, not a hard fail)', () => {
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.hardGatesPass).toBe(true);
  });

  it('coverageGaps contains remotionCorrect', () => {
    expect(remotionCorrectNullVerdict.coverageGaps).toContain('remotionCorrect');
  });

  it('remotionCorrect advisory failures is empty', () => {
    expect(remotionCorrectNullVerdict.gates.remotionCorrect.advisoryFailures).toHaveLength(0);
  });

  it('all base gates and other optional gates are not blockers', () => {
    expect(remotionCorrectNullVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(remotionCorrectNullVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(remotionCorrectNullVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(remotionCorrectNullVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(remotionCorrectNullVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(remotionCorrectNullVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 19: remotionCorrect hard fail — R1/R2 blocked → shipReady=false
// ---------------------------------------------------------------------------

const remotionCorrectHardFailVerdict = computeShipVerdict({
  ...cleanGates(),
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

  it('remotionCorrect gate ran but hardGatesPass false, coverage=ran', () => {
    expect(remotionCorrectHardFailVerdict.gates.remotionCorrect.ran).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.remotionCorrect.hardGatesPass).toBe(false);
    expect(remotionCorrectHardFailVerdict.gates.remotionCorrect.coverage).toBe('ran');
  });

  it('all eight other gates are not blockers', () => {
    expect(remotionCorrectHardFailVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.contrast.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.motion.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.legibility.hardGatesPass).toBe(true);
    expect(remotionCorrectHardFailVerdict.gates.codeCraft.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 20: remotionCorrect advisory-only — R3/R4/R5 advisory fail → ships
// ---------------------------------------------------------------------------

const remotionCorrectAdvisoryOnlyVerdict = computeShipVerdict({
  ...cleanGates(),
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
// Fixture 21: distinct null + registryEntryCount=0 (default) → skip-na, non-blocking
//
// When fewer than 2 registry entries exist, there is nothing to compare against.
// distinct is skip-na — the gate is legitimately N/A.
// ---------------------------------------------------------------------------

const distinctNullVerdict = computeShipVerdict({
  ...cleanGates(),
  distinct: null,
  // registryEntryCount defaults to 0 (< 2) → skip-na
});

describe('computeShipVerdict — distinct null + registryEntryCount=0 → skip-na (non-blocking)', () => {
  it('shipReady is true — <2 registry entries, distinct is N/A', () => {
    expect(distinctNullVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(distinctNullVerdict.blockers).toHaveLength(0);
  });

  it('coverageGaps is empty', () => {
    expect(distinctNullVerdict.coverageGaps).toHaveLength(0);
  });

  it('distinct gate coverage=skip-na', () => {
    expect(distinctNullVerdict.gates.distinct.coverage).toBe('skip-na');
  });

  it('distinct gate ran=false', () => {
    expect(distinctNullVerdict.gates.distinct.ran).toBe(false);
  });

  it('distinct gate hardGatesPass=true', () => {
    expect(distinctNullVerdict.gates.distinct.hardGatesPass).toBe(true);
  });

  it('distinct advisory failures is empty', () => {
    expect(distinctNullVerdict.gates.distinct.advisoryFailures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 22: distinct hard fail — HARD BLOCKED → shipReady=false
// ---------------------------------------------------------------------------

const distinctHardFailVerdict = computeShipVerdict({
  ...cleanGates(),
  distinct: hookMetrics({ hardGatesPass: false }),
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

  it('distinct gate ran but hardGatesPass false, coverage=ran', () => {
    expect(distinctHardFailVerdict.gates.distinct.ran).toBe(true);
    expect(distinctHardFailVerdict.gates.distinct.hardGatesPass).toBe(false);
    expect(distinctHardFailVerdict.gates.distinct.coverage).toBe('ran');
  });

  it('all nine other gates are not blockers', () => {
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
// ---------------------------------------------------------------------------

const distinctAdvisoryOnlyVerdict = computeShipVerdict({
  ...cleanGates(),
  distinct: hookMetrics({ hardGatesPass: true, advisoryFails: ['Advisory: bg-luminance drift (2 entries: relay=dark, granipa=tonal)'] }),
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

// ---------------------------------------------------------------------------
// Fixtures 24–27: computeShipVerdict().remediations
// ---------------------------------------------------------------------------

// Fixture 24: ship-ready verdict → remediations is empty
describe('computeShipVerdict().remediations — ship-ready (no blockers, no advisories)', () => {
  const verdict = computeShipVerdict({ ...cleanGates() });

  it('remediations field is present in the return value', () => {
    expect(verdict).toHaveProperty('remediations');
  });

  it('remediations is [] when no failures', () => {
    expect(verdict.remediations).toHaveLength(0);
  });
});

// Fixture 25: hard blocker → remediations contains a blocker entry
describe('computeShipVerdict().remediations — hard blocker (retention failed)', () => {
  const verdict = computeShipVerdict({
    ...cleanGates(),
    retention: hookMetrics({ hardGatesPass: false }),
  });

  it('remediations has one entry', () => {
    expect(verdict.remediations).toHaveLength(1);
  });

  it('entry severity is blocker', () => {
    expect(verdict.remediations[0].severity).toBe('blocker');
  });

  it('entry has non-empty fix', () => {
    expect(verdict.remediations[0].fix.trim().length).toBeGreaterThan(10);
  });

  it('entry docRef references retention.md', () => {
    expect(verdict.remediations[0].docRef).toMatch(/retention/);
  });
});

// Fixture 26: advisory failure → remediations contains an advisory entry
describe('computeShipVerdict().remediations — advisory failure (codeCraft C3-easing)', () => {
  const verdict = computeShipVerdict({
    ...cleanGates(),
    codeCraft: hookMetrics({ hardGatesPass: true, advisoryFails: ['C3-easing'] }),
  });

  it('remediations has one advisory entry', () => {
    expect(verdict.remediations).toHaveLength(1);
    expect(verdict.remediations[0].severity).toBe('advisory');
  });

  it('shipReady is still true — advisory never blocks', () => {
    expect(verdict.shipReady).toBe(true);
  });

  it('advisory entry has non-empty fix mentioning interpolate or Easing', () => {
    expect(verdict.remediations[0].fix).toMatch(/interpolate|Easing/);
  });
});

// Fixture 27: mixed blockers + advisories → blockers before advisories in remediations
describe('computeShipVerdict().remediations — ordering: blockers before advisories', () => {
  const verdict = computeShipVerdict({
    ...cleanGates(),
    hook:      null,                                                            // gate-not-run blocker
    retention: hookMetrics({ hardGatesPass: false }),                          // hard-fail blocker
    contrast:  contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg'] }),
    motion:    hookMetrics({ hardGatesPass: true, advisoryFails: ['Easing presence'] }),
  });

  it('all blockers appear before all advisories', () => {
    const rems = verdict.remediations;
    const firstAdvisoryIdx = rems.findIndex(r => r.severity === 'advisory');
    const lastBlockerIdx   = rems.reduce((idx, r, i) => (r.severity === 'blocker' ? i : idx), -1);
    expect(firstAdvisoryIdx).toBeGreaterThan(lastBlockerIdx);
  });

  it('has 2 blockers (hook gate-not-run + retention hard-fail)', () => {
    expect(verdict.remediations.filter(r => r.severity === 'blocker')).toHaveLength(2);
  });

  it('has 2 advisories (accent-on-bg + Easing presence)', () => {
    expect(verdict.remediations.filter(r => r.severity === 'advisory')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Fixture 28: Coverage — declares-music + no analysis → musicsync coverage-gap BLOCKS
//
// Video declares music (Main.tsx has <Audio>/staticFile ref) but no .analysis.json
// has been produced (musicsync=null). This is a coverage-gap that blocks ship.
// ---------------------------------------------------------------------------

const declaresMusicNoAnalysisVerdict = computeShipVerdict({
  ...cleanGates(),
  musicsync:     null,
  declaresMusic: true,
  // audioAcknowledged defaults to false
});

describe('Coverage: declares-music + no analysis → musicsync coverage-gap BLOCKS', () => {
  it('shipReady is false', () => {
    expect(declaresMusicNoAnalysisVerdict.shipReady).toBe(false);
  });

  it('blockers contains "musicsync coverage-gap"', () => {
    expect(declaresMusicNoAnalysisVerdict.blockers).toContain('musicsync coverage-gap');
  });

  it('blockers has exactly one entry', () => {
    expect(declaresMusicNoAnalysisVerdict.blockers).toHaveLength(1);
  });

  it('coverageGaps contains musicsync', () => {
    expect(declaresMusicNoAnalysisVerdict.coverageGaps).toContain('musicsync');
  });

  it('musicsync coverage=coverage-gap', () => {
    expect(declaresMusicNoAnalysisVerdict.gates.musicsync.coverage).toBe('coverage-gap');
  });

  it('musicsync ran=false (never verified)', () => {
    expect(declaresMusicNoAnalysisVerdict.gates.musicsync.ran).toBe(false);
  });

  it('musicsync hardGatesPass=true (coverage-gap, not a hard fail)', () => {
    expect(declaresMusicNoAnalysisVerdict.gates.musicsync.hardGatesPass).toBe(true);
  });

  it('all base gates and other optional gates are not blockers', () => {
    expect(declaresMusicNoAnalysisVerdict.gates.hook.hardGatesPass).toBe(true);
    expect(declaresMusicNoAnalysisVerdict.gates.retention.hardGatesPass).toBe(true);
    expect(declaresMusicNoAnalysisVerdict.gates.payoff.hardGatesPass).toBe(true);
    expect(declaresMusicNoAnalysisVerdict.gates.remotionCorrect.hardGatesPass).toBe(true);
    expect(declaresMusicNoAnalysisVerdict.gates.distinct.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 29: Coverage — no-music (declaresMusic=false) → musicsync skip-na, non-blocking
//
// Explicit back-compat case: video declares no music → musicsync is always skip-na.
// ---------------------------------------------------------------------------

const noMusicVerdict = computeShipVerdict({
  ...cleanGates(),
  musicsync:     null,
  declaresMusic: false,
});

describe('Coverage: no-music (declaresMusic=false) → musicsync skip-na, non-blocking', () => {
  it('shipReady is true', () => {
    expect(noMusicVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(noMusicVerdict.blockers).toHaveLength(0);
  });

  it('coverageGaps is empty', () => {
    expect(noMusicVerdict.coverageGaps).toHaveLength(0);
  });

  it('musicsync coverage=skip-na', () => {
    expect(noMusicVerdict.gates.musicsync.coverage).toBe('skip-na');
  });

  it('musicsync ran=false', () => {
    expect(noMusicVerdict.gates.musicsync.ran).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 30: Coverage — declared music + audioAcknowledged → non-blocking, still surfaced
//
// Video declares music but audio is not bundled; gap is explicitly acknowledged.
// coverageGaps stays empty (acknowledged → non-blocking); musicsync.coverage='coverage-gap'.
// ---------------------------------------------------------------------------

const acknowledgedGapVerdict = computeShipVerdict({
  ...cleanGates(),
  musicsync:        null,
  declaresMusic:    true,
  audioAcknowledged: true,
});

describe('Coverage: declared music + audioAcknowledged → non-blocking, still surfaced', () => {
  it('shipReady is true — acknowledged gap does not block', () => {
    expect(acknowledgedGapVerdict.shipReady).toBe(true);
  });

  it('blockers is empty — acknowledged gap not in blockers', () => {
    expect(acknowledgedGapVerdict.blockers).toHaveLength(0);
  });

  it('coverageGaps is empty — acknowledged gap is non-blocking', () => {
    expect(acknowledgedGapVerdict.coverageGaps).toHaveLength(0);
  });

  it('musicsync coverage=coverage-gap (still surfaced, not skip-na)', () => {
    expect(acknowledgedGapVerdict.gates.musicsync.coverage).toBe('coverage-gap');
  });

  it('musicsync ran=false', () => {
    expect(acknowledgedGapVerdict.gates.musicsync.ran).toBe(false);
  });

  it('musicsync hardGatesPass=true', () => {
    expect(acknowledgedGapVerdict.gates.musicsync.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 31: Coverage — absent-payoff blocks
//
// payoff=null with all other gates passing → coverage-gap → BLOCKS.
// (Alias for fixture 15 using named coverage test.)
// ---------------------------------------------------------------------------

describe('Coverage: absent-payoff → coverage-gap BLOCKS', () => {
  const verdict = computeShipVerdict({
    ...cleanGates(),
    payoff: null,
  });

  it('shipReady is false', () => {
    expect(verdict.shipReady).toBe(false);
  });

  it('blockers contains "payoff coverage-gap"', () => {
    expect(verdict.blockers).toContain('payoff coverage-gap');
  });

  it('coverageGaps contains payoff', () => {
    expect(verdict.coverageGaps).toContain('payoff');
  });

  it('payoff.coverage is coverage-gap', () => {
    expect(verdict.gates.payoff.coverage).toBe('coverage-gap');
  });

  it('remediations has a blocker entry for payoff coverage-gap', () => {
    const payoffRem = verdict.remediations.find(r => r.gate === 'payoff' && r.severity === 'blocker');
    expect(payoffRem).toBeDefined();
    expect(payoffRem.fix.trim().length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Fixture 32: Coverage — absent-distinct with registryEntryCount=2 → coverage-gap BLOCKS
//
// distinct=null AND registryEntryCount=2 (≥2 entries exist) → coverage-gap.
// The distinctiveness gate MUST be run before shipping with 2+ registry entries.
// ---------------------------------------------------------------------------

const absentDistinctWith2EntriesVerdict = computeShipVerdict({
  ...cleanGates(),
  distinct:            null,
  registryEntryCount:  2,
});

describe('Coverage: absent-distinct with registryEntryCount=2 → coverage-gap BLOCKS', () => {
  it('shipReady is false', () => {
    expect(absentDistinctWith2EntriesVerdict.shipReady).toBe(false);
  });

  it('blockers contains "distinct coverage-gap"', () => {
    expect(absentDistinctWith2EntriesVerdict.blockers).toContain('distinct coverage-gap');
  });

  it('blockers has exactly one entry', () => {
    expect(absentDistinctWith2EntriesVerdict.blockers).toHaveLength(1);
  });

  it('coverageGaps contains distinct', () => {
    expect(absentDistinctWith2EntriesVerdict.coverageGaps).toContain('distinct');
  });

  it('distinct.coverage is coverage-gap', () => {
    expect(absentDistinctWith2EntriesVerdict.gates.distinct.coverage).toBe('coverage-gap');
  });

  it('distinct.ran=false', () => {
    expect(absentDistinctWith2EntriesVerdict.gates.distinct.ran).toBe(false);
  });

  it('remediations has a blocker entry for distinct coverage-gap', () => {
    const rem = absentDistinctWith2EntriesVerdict.remediations.find(r => r.gate === 'distinct' && r.severity === 'blocker');
    expect(rem).toBeDefined();
    expect(rem.fix).toMatch(/distinct\.sh/);
  });
});

// ---------------------------------------------------------------------------
// Fixture 33: Coverage — distinct-skip-na with registryEntryCount<2
//
// distinct=null AND registryEntryCount=0 (default, < 2) → skip-na.
// Nothing to compare against when only one video exists in the registry.
// ---------------------------------------------------------------------------

const distinctSkipNaVerdict = computeShipVerdict({
  ...cleanGates(),
  distinct:            null,
  registryEntryCount:  0,
});

describe('Coverage: distinct-skip-na with registryEntryCount<2', () => {
  it('shipReady is true — <2 registry entries, distinct is N/A', () => {
    expect(distinctSkipNaVerdict.shipReady).toBe(true);
  });

  it('blockers is empty', () => {
    expect(distinctSkipNaVerdict.blockers).toHaveLength(0);
  });

  it('coverageGaps is empty', () => {
    expect(distinctSkipNaVerdict.coverageGaps).toHaveLength(0);
  });

  it('distinct.coverage is skip-na', () => {
    expect(distinctSkipNaVerdict.gates.distinct.coverage).toBe('skip-na');
  });

  it('distinct.ran=false', () => {
    expect(distinctSkipNaVerdict.gates.distinct.ran).toBe(false);
  });

  it('distinct.hardGatesPass=true', () => {
    expect(distinctSkipNaVerdict.gates.distinct.hardGatesPass).toBe(true);
  });
});
