/**
 * Tests for computeRegistrySync.
 *
 * Fixtures:
 *  1. in-sync: relay+granipa dirs, both APPROVED, both in registry → PASS
 *  2. approved-missing-entry: APPROVED video not in registry → HARD FAIL (missingEntries)
 *  3. draft-no-entry-OK: DRAFT video not in registry → PASS (no entry required for DRAFT)
 *  4. orphan-entry: registry entry with no matching dir → advisory FAIL only
 *  5. candidate-unresolved: candidateSlug not in registry → HARD FAIL (candidateResolved=false)
 */

import { describe, expect, it } from 'vitest';
import { computeRegistrySync } from './registry-sync-metrics.mjs';
import { parseRegistry } from './distinct-metrics.mjs';

// ── Registry fixture ──────────────────────────────────────────────────────────

const RELAY_ENTRY = `
## 1 · relay / RelayLaunch (2026-06-11)

| field     | value                                                |
| --------- | ---------------------------------------------------- |
| product   | Relay — instant preview deploys                     |
| arc       | B · problem-first                                   |
| rhythm    | dead-stop tension                                   |
| luminance | dark                                                |
| palette   | bg #0A0E0B · accent lime #B6F22E                    |
| type      | Space Grotesk / JetBrains Mono                      |
| signature moves | ripple reveals                                |
| texture   | filmic — grain 5%                                   |
| transitions | hard cuts                                          |
| music     | 120bpm                                              |
`;

const GRANIPA_ENTRY = `
## 2 · granipa / GranipaLaunch (2026-06-16)

| field     | value                                                |
| --------- | ---------------------------------------------------- |
| product   | Grañipa — on-device Mac memory layer                |
| arc       | A · demo-first                                      |
| rhythm    | one confident take                                  |
| luminance | tonal dark                                          |
| palette   | bg #0B0F18 · accent blue #3D8BFF                    |
| type      | Sentient / Switzer / JetBrains Mono                 |
| signature moves | live ink                                      |
| texture   | light filmic — grain 2.5%                           |
| transitions | contained internal motions                         |
| music     | ~98-122bpm                                          |
`;

const REGISTRY_RELAY_GRANIPA = RELAY_ENTRY + GRANIPA_ENTRY;
const REGISTRY_ONLY_RELAY = RELAY_ENTRY;
const REGISTRY_WITH_GHOST = RELAY_ENTRY + GRANIPA_ENTRY + `
## 3 · ghost / GhostLaunch (2026-07-01)

| field     | value  |
| --------- | ------ |
| product   | Ghost  |
| arc       | C      |
| rhythm    | slow   |
| luminance | light  |
| palette   | bg #FFFFFF · accent pink #FF69B4 |
| type      | Georgia / Courier |
| signature moves | fade |
| texture   | clean |
| transitions | crossfade |
| music     | 80bpm |
`;

// ── Fixture 1: in-sync ────────────────────────────────────────────────────────

describe('computeRegistrySync — in-sync (relay + granipa both APPROVED and in registry)', () => {
  const registryEntries = parseRegistry(REGISTRY_RELAY_GRANIPA);
  const videoDirs = ['relay', 'granipa'];
  const treatmentStatuses = new Map([
    ['relay', 'APPROVED'],
    ['granipa', 'APPROVED'],
  ]);

  const result = computeRegistrySync({
    videoDirs,
    registryEntries,
    candidateSlug: null,
    treatmentStatuses,
  });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('missingEntries is empty', () => {
    expect(result.missingEntries).toHaveLength(0);
  });

  it('orphanEntries is empty', () => {
    expect(result.orphanEntries).toHaveLength(0);
  });

  it('candidateResolved is true (no candidate specified)', () => {
    expect(result.candidateResolved).toBe(true);
  });

  it('has 3 gates', () => {
    expect(result.gates).toHaveLength(3);
  });

  it('all hard gates pass', () => {
    const hardGates = result.gates.filter(g => !g.advisory);
    expect(hardGates.every(g => g.skip || g.pass)).toBe(true);
  });

  it('candidate gate is skipped (no candidateSlug)', () => {
    const cg = result.gates.find(g => g.name.includes('candidate slug'));
    expect(cg.skip).toBe(true);
  });

  it('advisory gate passes (no orphans)', () => {
    const og = result.gates.find(g => g.advisory);
    expect(og.pass).toBe(true);
  });
});

// ── Fixture 2: approved-missing-entry — HARD FAIL ────────────────────────────

describe('computeRegistrySync — approved-missing-entry (APPROVED video not in registry)', () => {
  const registryEntries = parseRegistry(REGISTRY_ONLY_RELAY);
  const videoDirs = ['relay', 'granipa'];
  const treatmentStatuses = new Map([
    ['relay', 'APPROVED'],
    ['granipa', 'APPROVED'], // APPROVED but not in registry
  ]);

  const result = computeRegistrySync({
    videoDirs,
    registryEntries,
    candidateSlug: null,
    treatmentStatuses,
  });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('missingEntries contains granipa', () => {
    expect(result.missingEntries).toContain('granipa');
  });

  it('missingEntries does not contain relay (relay is in registry)', () => {
    expect(result.missingEntries).not.toContain('relay');
  });

  it('missing-entry gate fails with detail mentioning granipa', () => {
    const g = result.gates.find(g => g.name.includes('APPROVED videos'));
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/granipa/);
  });

  it('missing-entry gate is hard (not advisory)', () => {
    const g = result.gates.find(g => g.name.includes('APPROVED videos'));
    expect(g.advisory).toBe(false);
  });
});

// ── Fixture 3: draft-no-entry-OK — PASS ──────────────────────────────────────

describe('computeRegistrySync — draft-no-entry-OK (DRAFT video not in registry is fine)', () => {
  const registryEntries = parseRegistry(REGISTRY_ONLY_RELAY);
  const videoDirs = ['relay', 'newvideo'];
  const treatmentStatuses = new Map([
    ['relay', 'APPROVED'],
    ['newvideo', 'DRAFT'], // DRAFT — no registry entry required
  ]);

  const result = computeRegistrySync({
    videoDirs,
    registryEntries,
    candidateSlug: null,
    treatmentStatuses,
  });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('missingEntries is empty (DRAFT is exempt)', () => {
    expect(result.missingEntries).toHaveLength(0);
  });

  it('newvideo not flagged as missing', () => {
    expect(result.missingEntries).not.toContain('newvideo');
  });
});

// ── Fixture 4: orphan-entry — advisory only ───────────────────────────────────

describe('computeRegistrySync — orphan-entry (registry entry with no matching dir)', () => {
  const registryEntries = parseRegistry(REGISTRY_WITH_GHOST);
  const videoDirs = ['relay', 'granipa']; // "ghost" dir absent
  const treatmentStatuses = new Map([
    ['relay', 'APPROVED'],
    ['granipa', 'APPROVED'],
  ]);

  const result = computeRegistrySync({
    videoDirs,
    registryEntries,
    candidateSlug: null,
    treatmentStatuses,
  });

  it('hardGatesPass is true (orphan is advisory only)', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('orphanEntries contains ghost', () => {
    expect(result.orphanEntries).toContain('ghost');
  });

  it('orphan gate fails (advisory)', () => {
    const og = result.gates.find(g => g.advisory);
    expect(og.pass).toBe(false);
  });

  it('orphan gate is advisory (not hard)', () => {
    const og = result.gates.find(g => g.advisory);
    expect(og.advisory).toBe(true);
    expect(og.hard).toBe(false);
  });

  it('orphan gate detail mentions ghost', () => {
    const og = result.gates.find(g => g.advisory);
    expect(og.detail).toMatch(/ghost/);
  });
});

// ── Fixture 5: candidate-unresolved — HARD FAIL ──────────────────────────────

describe('computeRegistrySync — candidate-unresolved (candidateSlug not in registry)', () => {
  const registryEntries = parseRegistry(REGISTRY_ONLY_RELAY);
  const videoDirs = ['relay'];
  const treatmentStatuses = new Map([['relay', 'APPROVED']]);

  const result = computeRegistrySync({
    videoDirs,
    registryEntries,
    candidateSlug: 'newvideo', // not in registry
    treatmentStatuses,
  });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('candidateResolved is false', () => {
    expect(result.candidateResolved).toBe(false);
  });

  it('candidate gate fails', () => {
    const cg = result.gates.find(g => g.name.includes('candidate slug'));
    expect(cg.pass).toBe(false);
    expect(cg.skip).toBe(false);
  });

  it('candidate gate detail mentions the slug', () => {
    const cg = result.gates.find(g => g.name.includes('candidate slug'));
    expect(cg.detail).toMatch(/newvideo/);
  });

  it('candidate gate is hard (not advisory)', () => {
    const cg = result.gates.find(g => g.name.includes('candidate slug'));
    expect(cg.advisory).toBe(false);
  });
});

// ── Contract shape ────────────────────────────────────────────────────────────

describe('computeRegistrySync — return shape contract', () => {
  const registryEntries = parseRegistry(REGISTRY_RELAY_GRANIPA);
  const result = computeRegistrySync({
    videoDirs: ['relay', 'granipa'],
    registryEntries,
    candidateSlug: null,
    treatmentStatuses: new Map([['relay', 'APPROVED'], ['granipa', 'APPROVED']]),
  });

  it('has missingEntries, orphanEntries, candidateResolved, hardGatesPass, gates', () => {
    expect(Array.isArray(result.missingEntries)).toBe(true);
    expect(Array.isArray(result.orphanEntries)).toBe(true);
    expect(typeof result.candidateResolved).toBe('boolean');
    expect(typeof result.hardGatesPass).toBe('boolean');
    expect(Array.isArray(result.gates)).toBe(true);
  });

  it('each gate has name, hard, advisory, pass, skip, detail', () => {
    for (const g of result.gates) {
      expect(typeof g.name).toBe('string');
      expect(typeof g.hard).toBe('boolean');
      expect(typeof g.advisory).toBe('boolean');
      expect(typeof g.pass).toBe('boolean');
      expect(typeof g.skip).toBe('boolean');
      expect(typeof g.detail).toBe('string');
    }
  });

  it('has exactly 3 gates', () => {
    expect(result.gates).toHaveLength(3);
  });
});

// ── Golden calibration against real relay+granipa ────────────────────────────

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath as fu } from 'node:url';

const __dirname = dirname(fu(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

describe('computeRegistrySync — golden calibration (relay+granipa in sync)', () => {
  const registryPath = join(PROJECT_ROOT, 'src', 'videos', '_registry.md');
  const videosDir = join(PROJECT_ROOT, 'src', 'videos');

  if (!existsSync(registryPath)) {
    it.skip('_registry.md not found — skip golden calibration', () => {});
    return;
  }

  const registryText = readFileSync(registryPath, 'utf8');
  const registryEntries = parseRegistry(registryText);

  const rawDirs = readdirSync(videosDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map(d => d.name.toLowerCase());

  const treatmentStatuses = new Map();
  for (const slug of rawDirs) {
    const tp = join(videosDir, slug, 'treatment.md');
    if (!existsSync(tp)) { treatmentStatuses.set(slug, null); continue; }
    const text = readFileSync(tp, 'utf8');
    if (/^Status:\s*APPROVED/m.test(text) || /^##\s*Status:\s*APPROVED/m.test(text)) {
      treatmentStatuses.set(slug, 'APPROVED');
    } else if (/Status:\s*DRAFT/i.test(text)) {
      treatmentStatuses.set(slug, 'DRAFT');
    } else {
      treatmentStatuses.set(slug, null);
    }
  }

  const result = computeRegistrySync({
    videoDirs: rawDirs,
    registryEntries,
    candidateSlug: null,
    treatmentStatuses,
  });

  it('relay+granipa are in sync — hardGatesPass=true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('no missingEntries for relay+granipa', () => {
    expect(result.missingEntries).toHaveLength(0);
  });

  it('no orphanEntries for relay+granipa', () => {
    expect(result.orphanEntries).toHaveLength(0);
  });
});
