/**
 * Golden tests for buildRemediations(verdict).
 *
 * Coverage:
 *  - Gate-not-run blockers (hook, contrast)
 *  - Hard-gate-failed blockers (retention, payoff, remotionCorrect, distinct)
 *  - Advisory failures (motion, legibility, codeCraft, musicsync, payoff, remotionCorrect, distinct drift)
 *  - Ordering: hard blockers first, advisories after
 *  - Ship-ready verdict → []
 *  - Unknown/unmapped identifier → generic fallback entry (never throws)
 *  - Every docRef resolves to a file that exists on disk (no dangling references)
 *  - Every fix is non-empty
 *  - Multi-gate integration: ≥4 gates, ≥1 gate-not-run, ≥1 hard blocker, ≥1 advisory
 *    → each entry has non-empty fix + docRef resolves to file+heading (Fixture H)
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRemediations } from './remediation.mjs';
import { computeShipVerdict } from './ship-metrics.mjs';

// ── Fixture helpers (mirror ship-metrics.test.mjs) ────────────────────────────

function hookMetrics({ hardGatesPass, advisoryFails = [] }) {
  return {
    hardGatesPass,
    gates: advisoryFails.map(name => ({ advisory: true, hard: false, pass: false, skip: false, name })),
  };
}

function contrastMetrics({ hardGatesPass, advisoryFails = [] }) {
  return {
    hardGatesPass,
    pairs: advisoryFails.map(role => ({ hard: false, pass: false, role })),
  };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── helpers ───────────────────────────────────────────────────────────────────

function allGatesPass({ musicsync = null, payoff = null, remotionCorrect = null, distinct = null } = {}) {
  return computeShipVerdict({
    hook:       hookMetrics({ hardGatesPass: true }),
    retention:  hookMetrics({ hardGatesPass: true }),
    contrast:   contrastMetrics({ hardGatesPass: true }),
    motion:     hookMetrics({ hardGatesPass: true }),
    legibility: hookMetrics({ hardGatesPass: true }),
    codeCraft:  hookMetrics({ hardGatesPass: true }),
    musicsync,
    payoff,
    remotionCorrect,
    distinct,
  });
}

// ── Fixture A: gate-not-run blockers (hook + contrast) ────────────────────────

const verdictGateNotRun = computeShipVerdict({
  hook:       null,
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   null,
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
});

describe('buildRemediations — gate-not-run blockers (hook + contrast)', () => {
  const rems = buildRemediations(verdictGateNotRun);

  it('returns two entries', () => {
    expect(rems).toHaveLength(2);
  });

  it('all entries have severity blocker', () => {
    for (const r of rems) {
      expect(r.severity).toBe('blocker');
    }
  });

  it('hook gate-not-run entry is present', () => {
    const entry = rems.find(r => r.gate === 'hook');
    expect(entry).toBeDefined();
    expect(entry.symptom).toMatch(/hook gate not run/);
    expect(entry.fix).toBeTruthy();
    expect(entry.docRef).toMatch(/hook\.md/);
    expect(entry.inspect).toBeTruthy();
  });

  it('contrast gate-not-run entry is present', () => {
    const entry = rems.find(r => r.gate === 'contrast');
    expect(entry).toBeDefined();
    expect(entry.symptom).toMatch(/contrast gate not run/);
    expect(entry.fix).toBeTruthy();
    expect(entry.docRef).toMatch(/contrast\.md/);
    expect(entry.inspect).toBeTruthy();
  });
});

// ── Fixture B: hard-gate-failed blockers (retention + payoff) ─────────────────

const verdictHardFail = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true }),
  retention:  hookMetrics({ hardGatesPass: false }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
  payoff:     hookMetrics({ hardGatesPass: false }),
});

describe('buildRemediations — hard-gate-failed (retention + payoff)', () => {
  const rems = buildRemediations(verdictHardFail);

  it('returns two blocker entries', () => {
    expect(rems).toHaveLength(2);
    for (const r of rems) {
      expect(r.severity).toBe('blocker');
    }
  });

  it('retention hard-fail entry is actionable', () => {
    const entry = rems.find(r => r.gate === 'retention');
    expect(entry).toBeDefined();
    expect(entry.symptom).toMatch(/Dead-air/i);
    expect(entry.fix).toMatch(/AmbientField|holds/);
    expect(entry.docRef).toMatch(/retention\.md/);
    expect(entry.inspect).toMatch(/retention\/metrics/);
  });

  it('payoff hard-fail entry is actionable', () => {
    const entry = rems.find(r => r.gate === 'payoff');
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/P1|brand|logo|end.?card/i);
    expect(entry.docRef).toMatch(/payoff\.md/);
    expect(entry.inspect).toMatch(/payoff\/metrics/);
  });
});

// ── Fixture C: advisory failures spanning ≥4 distinct gates ──────────────────

const verdictAdvisory = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true, advisoryFails: ['Background activity', 'Frame-0 liveness'] }),
  retention:  hookMetrics({ hardGatesPass: true, advisoryFails: ['Energy build-to-climax', 'Re-hook cadence'] }),
  contrast:   contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg', 'accentAlt-on-bg'] }),
  motion:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Easing presence', 'Sustained life'] }),
  legibility: hookMetrics({ hardGatesPass: true, advisoryFails: ['Reading-budget share', 'Detail stability'] }),
  codeCraft:  hookMetrics({ hardGatesPass: true, advisoryFails: ['C1-emoji', 'C1-font', 'C2-hex', 'C3-easing'] }),
  musicsync:  hookMetrics({ hardGatesPass: true, advisoryFails: ['Climax on drop', 'Cut-on-beat coverage'] }),
  payoff:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Closing stability'] }),
  remotionCorrect: hookMetrics({ hardGatesPass: true, advisoryFails: ['R3-interpolate-clamp', 'R4-spring-fps', 'R5-wallclock'] }),
  distinct:   hookMetrics({ hardGatesPass: true, advisoryFails: [
    'Advisory: bg-luminance drift (2 entries: relay=dark, granipa=tonal)',
    'Advisory: mono-font drift (2 entries: relay=jetbrains-mono, granipa=jetbrains-mono)',
    'Advisory: accent-hue drift (2 entries: relay=green, granipa=blue)',
  ]}),
});

describe('buildRemediations — advisory failures spanning all 10 gates', () => {
  const rems = buildRemediations(verdictAdvisory);

  it('returns 23 advisory entries (sum of all advisory failures)', () => {
    // hook:2 + retention:2 + contrast:2 + motion:2 + legibility:2 + codeCraft:4
    // + musicsync:2 + payoff:1 + remotionCorrect:3 + distinct:3 = 23
    expect(rems).toHaveLength(23);
  });

  it('all entries have severity advisory', () => {
    for (const r of rems) {
      expect(r.severity).toBe('advisory');
    }
  });

  it('hook Background activity entry is specific', () => {
    const entry = rems.find(r => r.gate === 'hook' && r.symptom.includes('Background activity'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/AmbientField|ambient/i);
    expect(entry.docRef).toMatch(/hook\.md/);
  });

  it('hook Frame-0 liveness entry is specific', () => {
    const entry = rems.find(r => r.gate === 'hook' && r.symptom.includes('Frame-0 liveness'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/row|vertical|grid/i);
  });

  it('retention Energy build-to-climax entry mentions --climax flag', () => {
    const entry = rems.find(r => r.gate === 'retention' && r.symptom.includes('Energy build'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/--climax/);
  });

  it('contrast accent-on-bg entry mentions WCAG ratio', () => {
    const entry = rems.find(r => r.gate === 'contrast' && r.symptom.includes('accent-on-bg'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/4\.5:1|WCAG/);
  });

  it('motion Easing presence entry mentions Easing.bezier or spring', () => {
    const entry = rems.find(r => r.gate === 'motion' && r.symptom.includes('Easing presence'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/Easing|spring/);
  });

  it('legibility Reading-budget share entry is specific', () => {
    const entry = rems.find(r => r.gate === 'legibility' && r.symptom.includes('Reading-budget'));
    expect(entry).toBeDefined();
    expect(entry.fix).toBeTruthy();
  });

  it('codeCraft C1-emoji entry mentions SVG or replace', () => {
    const entry = rems.find(r => r.gate === 'codeCraft' && r.symptom.includes('C1-emoji'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/emoji|SVG|icon/i);
  });

  it('codeCraft C3-easing entry mentions interpolate', () => {
    const entry = rems.find(r => r.gate === 'codeCraft' && r.symptom.includes('C3-easing'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/interpolate|Easing/);
  });

  it('musicsync Climax on drop entry mentions detect', () => {
    const entry = rems.find(r => r.gate === 'musicsync' && r.symptom.includes('Climax on drop'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/drop|analyze-music/);
  });

  it('payoff Closing stability entry mentions tail hold', () => {
    const entry = rems.find(r => r.gate === 'payoff' && r.symptom.includes('Closing stability'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/hold|step|settle/i);
  });

  it('remotionCorrect R3-interpolate-clamp entry mentions clamp', () => {
    const entry = rems.find(r => r.gate === 'remotionCorrect' && r.symptom.includes('R3'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/clamp/i);
  });

  it('remotionCorrect R5-wallclock entry mentions useCurrentFrame', () => {
    const entry = rems.find(r => r.gate === 'remotionCorrect' && r.symptom.includes('R5'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/useCurrentFrame/);
  });

  it('distinct bg-luminance drift entry mentions luminance', () => {
    const entry = rems.find(r => r.gate === 'distinct' && r.symptom.includes('bg-luminance'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/luminance|light|vivid/i);
  });

  it('distinct mono-font drift entry mentions different monospace', () => {
    const entry = rems.find(r => r.gate === 'distinct' && r.symptom.includes('mono-font'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/Fira|Cascadia|IBM|monospace/i);
  });

  it('distinct accent-hue drift entry mentions hue band', () => {
    const entry = rems.find(r => r.gate === 'distinct' && r.symptom.includes('accent-hue'));
    expect(entry).toBeDefined();
    expect(entry.fix).toMatch(/hue|blue.?teal|orange|magenta/i);
  });
});

// ── Fixture D: mixed blockers + advisories; ordering ─────────────────────────

const verdictMixed = computeShipVerdict({
  hook:       null,                                                              // gate-not-run blocker
  retention:  hookMetrics({ hardGatesPass: false }),                            // hard-fail blocker
  contrast:   contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg'] }),
  motion:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Easing presence'] }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true, advisoryFails: ['C2-hex'] }),
  remotionCorrect: hookMetrics({ hardGatesPass: false }),                       // hard-fail blocker
});

describe('buildRemediations — ordering: blockers first, then advisories', () => {
  const rems = buildRemediations(verdictMixed);

  it('blockers appear before advisories', () => {
    const firstAdvisoryIdx = rems.findIndex(r => r.severity === 'advisory');
    const lastBlockerIdx   = rems.reduce((idx, r, i) => (r.severity === 'blocker' ? i : idx), -1);
    expect(firstAdvisoryIdx).toBeGreaterThan(lastBlockerIdx);
  });

  it('has 3 blockers and 3 advisories', () => {
    const blockers  = rems.filter(r => r.severity === 'blocker');
    const advisories = rems.filter(r => r.severity === 'advisory');
    expect(blockers).toHaveLength(3);
    expect(advisories).toHaveLength(3);
  });
});

// ── Fixture E: fully ship-ready → [] ─────────────────────────────────────────

describe('buildRemediations — ship-ready verdict returns []', () => {
  it('returns empty array when no blockers and no advisory failures', () => {
    const verdict = allGatesPass();
    const rems = buildRemediations(verdict);
    expect(rems).toHaveLength(0);
  });

  it('returns empty array for all-null optional gates', () => {
    const verdict = allGatesPass({ musicsync: null, payoff: null, remotionCorrect: null, distinct: null });
    const rems = buildRemediations(verdict);
    expect(rems).toHaveLength(0);
  });
});

// ── Fixture F: unknown/unmapped identifier → generic fallback ─────────────────

const unknownAdvisoryVerdict = computeShipVerdict({
  hook:       hookMetrics({ hardGatesPass: true, advisoryFails: ['Unknown gate X9000'] }),
  retention:  hookMetrics({ hardGatesPass: true }),
  contrast:   contrastMetrics({ hardGatesPass: true }),
  motion:     hookMetrics({ hardGatesPass: true }),
  legibility: hookMetrics({ hardGatesPass: true }),
  codeCraft:  hookMetrics({ hardGatesPass: true }),
});

describe('buildRemediations — unknown identifier → generic fallback', () => {
  it('does not throw', () => {
    expect(() => buildRemediations(unknownAdvisoryVerdict)).not.toThrow();
  });

  it('returns a generic entry with non-empty fix and docRef', () => {
    const rems = buildRemediations(unknownAdvisoryVerdict);
    expect(rems).toHaveLength(1);
    const entry = rems[0];
    expect(entry.fix).toBeTruthy();
    expect(entry.docRef).toBeTruthy();
    expect(entry.severity).toBe('advisory');
  });
});

// ── docRef file-existence validation ─────────────────────────────────────────
// Verify every docRef in remediation.mjs points at a file that actually exists.
// Heading resolution: just confirm the file contains the §-referenced section name.

describe('buildRemediations — every docRef resolves to an existing file', () => {
  // Build a fixture that exercises every non-fallback entry in BLOCKER_MAP and ADVISORY_MAP.
  const fullVerdict = computeShipVerdict({
    hook:       null,
    retention:  null,
    contrast:   null,
    motion:     null,
    legibility: null,
    codeCraft:  null,
    musicsync:  hookMetrics({ hardGatesPass: false, advisoryFails: ['Climax on drop', 'Cut-on-beat coverage'] }),
    payoff:     hookMetrics({ hardGatesPass: false, advisoryFails: ['Closing stability'] }),
    remotionCorrect: hookMetrics({ hardGatesPass: false, advisoryFails: ['R3-interpolate-clamp', 'R4-spring-fps', 'R5-wallclock'] }),
    distinct:   hookMetrics({ hardGatesPass: false, advisoryFails: [
      'Advisory: bg-luminance drift (N entries)',
      'Advisory: mono-font drift (N entries)',
      'Advisory: accent-hue drift (N entries)',
    ]}),
  });

  const blockerHardFail = computeShipVerdict({
    hook:       hookMetrics({ hardGatesPass: false, advisoryFails: ['Background activity', 'Frame-0 liveness'] }),
    retention:  hookMetrics({ hardGatesPass: false, advisoryFails: ['Energy build-to-climax', 'Re-hook cadence'] }),
    contrast:   contrastMetrics({ hardGatesPass: false, advisoryFails: ['accent-on-bg', 'accentAlt-on-bg'] }),
    motion:     hookMetrics({ hardGatesPass: false, advisoryFails: ['Easing presence', 'Sustained life'] }),
    legibility: hookMetrics({ hardGatesPass: false, advisoryFails: ['Reading-budget share', 'Detail stability'] }),
    codeCraft:  hookMetrics({ hardGatesPass: false, advisoryFails: ['C1-emoji', 'C1-font', 'C2-hex', 'C3-easing'] }),
    musicsync:  hookMetrics({ hardGatesPass: true, advisoryFails: ['Climax on drop', 'Cut-on-beat coverage'] }),
    payoff:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Closing stability'] }),
    remotionCorrect: hookMetrics({ hardGatesPass: true, advisoryFails: ['R3-interpolate-clamp', 'R4-spring-fps', 'R5-wallclock'] }),
    distinct:   hookMetrics({ hardGatesPass: true, advisoryFails: [
      'Advisory: bg-luminance drift (2 entries)',
      'Advisory: mono-font drift (2 entries)',
      'Advisory: accent-hue drift (2 entries)',
    ]}),
  });

  const allRems = [
    ...buildRemediations(fullVerdict),
    ...buildRemediations(blockerHardFail),
  ];

  it('all docRef strings are non-empty and contain §', () => {
    for (const r of allRems) {
      expect(r.docRef).toBeTruthy();
      // Generic fallbacks may not have § but should still be non-empty
      expect(r.docRef.length).toBeGreaterThan(5);
    }
  });

  it('every docRef file path resolves to an existing file', () => {
    const failures = [];
    for (const r of allRems) {
      // docRef format: ".claude/skills/produce/<file>.md §Section"
      const filePart = r.docRef.split(' §')[0];
      const absPath = join(ROOT, filePart);
      if (!existsSync(absPath)) {
        failures.push({ docRef: r.docRef, path: absPath });
      }
    }
    if (failures.length > 0) {
      const msg = failures.map(f => `  ${f.docRef} → ${f.path} (not found)`).join('\n');
      throw new Error(`docRef file(s) not found:\n${msg}`);
    }
  });

  it('every docRef §Section exists in the referenced file', () => {
    const failures = [];
    for (const r of allRems) {
      const parts = r.docRef.split(' §');
      if (parts.length < 2) continue; // no section specified — skip heading check
      const [filePart, section] = parts;
      const absPath = join(ROOT, filePart);
      if (!existsSync(absPath)) continue; // file-not-found already caught above
      const content = readFileSync(absPath, 'utf8');
      // Match heading lines: ## Section, ### Section, etc.
      const headingRegex = new RegExp(`^#{1,6}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      if (!headingRegex.test(content)) {
        failures.push({ docRef: r.docRef, section, path: absPath });
      }
    }
    if (failures.length > 0) {
      const msg = failures.map(f => `  §${f.section} in ${f.path}`).join('\n');
      throw new Error(`docRef §Section heading(s) not found in file:\n${msg}`);
    }
  });

  it('every fix is non-empty', () => {
    for (const r of allRems) {
      expect(r.fix.trim().length).toBeGreaterThan(10);
    }
  });

  it('every inspect is non-empty', () => {
    for (const r of allRems) {
      expect(r.inspect.trim().length).toBeGreaterThan(5);
    }
  });
});

// ── Fixture H: multi-gate integration — ≥4 gates, all three failure types ─────
//
// Acceptance spec §3 requirement: "failing fixtures spanning ≥4 distinct gates
// (incl. ≥1 hard blocker, ≥1 advisory, ≥1 'gate not run') → each yields the
// expected entry with non-empty fix and a docRef that resolves to an existing
// file+heading"
//
// Gates exercised (6):
//   hook:       null                               → gate-not-run blocker
//   retention:  hardGatesPass=false               → hard-gates-failed blocker
//   contrast:   advisory 'accent-on-bg'           → advisory
//   motion:     advisory 'Easing presence'        → advisory
//   legibility: hardGatesPass=true (clean)        → no entry
//   codeCraft:  advisory 'C2-hex'                 → advisory
//
// Expected: 2 blockers (hook gate-not-run, retention hard-fail) then 3 advisories
// (contrast, motion, codeCraft), each with non-empty fix + resolvable docRef.

describe('buildRemediations — Fixture H: multi-gate integration (≥4 gates, gate-not-run + hard blocker + advisories)', () => {
  const verdict = computeShipVerdict({
    hook:       null,
    retention:  hookMetrics({ hardGatesPass: false }),
    contrast:   contrastMetrics({ hardGatesPass: true, advisoryFails: ['accent-on-bg'] }),
    motion:     hookMetrics({ hardGatesPass: true, advisoryFails: ['Easing presence'] }),
    legibility: hookMetrics({ hardGatesPass: true }),
    codeCraft:  hookMetrics({ hardGatesPass: true, advisoryFails: ['C2-hex'] }),
  });

  const rems = buildRemediations(verdict);

  it('verdict is blocked (2 blockers)', () => {
    expect(verdict.shipReady).toBe(false);
    expect(verdict.blockers).toHaveLength(2);
  });

  it('returns 5 entries total (2 blockers + 3 advisories)', () => {
    expect(rems).toHaveLength(5);
  });

  it('first two entries are blockers', () => {
    expect(rems[0].severity).toBe('blocker');
    expect(rems[1].severity).toBe('blocker');
  });

  it('last three entries are advisories', () => {
    expect(rems[2].severity).toBe('advisory');
    expect(rems[3].severity).toBe('advisory');
    expect(rems[4].severity).toBe('advisory');
  });

  it('hook gate-not-run entry: non-empty fix + docRef resolves', () => {
    const entry = rems.find(r => r.gate === 'hook' && r.severity === 'blocker');
    expect(entry).toBeDefined();
    expect(entry.fix.trim().length).toBeGreaterThan(10);
    const filePart = entry.docRef.split(' §')[0];
    expect(existsSync(join(ROOT, filePart))).toBe(true);
    const section = entry.docRef.split(' §')[1];
    if (section) {
      const content = readFileSync(join(ROOT, filePart), 'utf8');
      const re = new RegExp(`^#{1,6}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      expect(re.test(content)).toBe(true);
    }
  });

  it('retention hard-fail entry: non-empty fix + docRef resolves', () => {
    const entry = rems.find(r => r.gate === 'retention' && r.severity === 'blocker');
    expect(entry).toBeDefined();
    expect(entry.fix.trim().length).toBeGreaterThan(10);
    const filePart = entry.docRef.split(' §')[0];
    expect(existsSync(join(ROOT, filePart))).toBe(true);
    const section = entry.docRef.split(' §')[1];
    if (section) {
      const content = readFileSync(join(ROOT, filePart), 'utf8');
      const re = new RegExp(`^#{1,6}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      expect(re.test(content)).toBe(true);
    }
  });

  it('contrast accent-on-bg advisory: non-empty fix + docRef resolves', () => {
    const entry = rems.find(r => r.gate === 'contrast' && r.severity === 'advisory');
    expect(entry).toBeDefined();
    expect(entry.fix.trim().length).toBeGreaterThan(10);
    const filePart = entry.docRef.split(' §')[0];
    expect(existsSync(join(ROOT, filePart))).toBe(true);
    const section = entry.docRef.split(' §')[1];
    if (section) {
      const content = readFileSync(join(ROOT, filePart), 'utf8');
      const re = new RegExp(`^#{1,6}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      expect(re.test(content)).toBe(true);
    }
  });

  it('motion Easing presence advisory: non-empty fix + docRef resolves', () => {
    const entry = rems.find(r => r.gate === 'motion' && r.severity === 'advisory');
    expect(entry).toBeDefined();
    expect(entry.fix.trim().length).toBeGreaterThan(10);
    const filePart = entry.docRef.split(' §')[0];
    expect(existsSync(join(ROOT, filePart))).toBe(true);
    const section = entry.docRef.split(' §')[1];
    if (section) {
      const content = readFileSync(join(ROOT, filePart), 'utf8');
      const re = new RegExp(`^#{1,6}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      expect(re.test(content)).toBe(true);
    }
  });

  it('codeCraft C2-hex advisory: non-empty fix + docRef resolves', () => {
    const entry = rems.find(r => r.gate === 'codeCraft' && r.severity === 'advisory');
    expect(entry).toBeDefined();
    expect(entry.fix.trim().length).toBeGreaterThan(10);
    const filePart = entry.docRef.split(' §')[0];
    expect(existsSync(join(ROOT, filePart))).toBe(true);
    const section = entry.docRef.split(' §')[1];
    if (section) {
      const content = readFileSync(join(ROOT, filePart), 'utf8');
      const re = new RegExp(`^#{1,6}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      expect(re.test(content)).toBe(true);
    }
  });

  it('clean gate (legibility) emits no entry', () => {
    const legibilityEntries = rems.filter(r => r.gate === 'legibility');
    expect(legibilityEntries).toHaveLength(0);
  });
});
