/**
 * Tests for distinct-metrics.mjs — distinctiveness gate.
 *
 * Fixtures:
 *   1. relay-vs-granipa real divergence: both shipped videos, candidate=relay, prior=granipa.
 *      All 9 axes differ → hardGatesPass=true.
 *   2. granipa-vs-relay real divergence: candidate=granipa, prior=relay.
 *      All 9 axes differ → hardGatesPass=true.
 *   3. Synthetic too-similar candidate: <4 axes differ from relay → HARD FAIL with colliders named.
 *   4. Clean candidate: differs on all 9 axes from both relay and granipa → PASS.
 *   5. SKIP when n<2 (only one registry entry).
 *   6. deltaE parsing edge cases: same hex → ΔE=0 (below threshold).
 *   7. Hex parsing: 6-digit uppercase and lowercase accepted.
 *   8. parseBpmBand: range averaging (98–122 → avg 110 → mid), single (120 → upbeat).
 *   9. parseGrainBand: 5% → filmic, 2.5% → light, 0% → none, "clean" → none.
 *  10. parseFontFamilies: strips role suffixes, lowercases, splits on "/".
 *  11. parseLuminanceClass: 'tonal dark' → tonal, 'dark' → dark, 'light' → light.
 *  12. parsePaletteHex: extracts bg and accent from registry palette field.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  computeDistinctMetrics,
  computeAxisDivergences,
  computeRegistryDriftGate,
  computeNonDerivableCoverage,
  checkRegistryCompleteness,
  grainPctToBand,
  parseRegistry,
  parseHex,
  hexToLab,
  deltaE94,
  jaccard,
  tokenSet,
  parseLuminanceClass,
  parseFontFamilies,
  parseArc,
  parseGrainBand,
  parseBpmBand,
  parsePaletteHex,
} from './distinct-metrics.mjs';
import { loadTheme, themeToAxes } from './theme-axes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Registry fixtures ─────────────────────────────────────────────────────────────────────────

// Minimal _registry.md text matching the real shipped examples.
const RELAY_ENTRY = `
## 1 · relay / RelayLaunch (2026-06-11)

| field           | value                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| product         | Relay — instant preview deploys for every git push (fictional demo product)                                     |
| arc             | B · problem-first                                                                                                |
| rhythm          | dead-stop tension, then everything at once; holds shorten toward climax                                          |
| luminance       | dark (green-tinted near-black #0A0E0B)                                                                           |
| palette         | bg #0A0E0B · accent lime #B6F22E (live-only semantic) · alt red #E5484D (waiting)                                |
| type            | Space Grotesk display+body / JetBrains Mono terminal+data                                                        |
| signature moves | zero-gap cut (cause IS effect, same beat) · ripple-from-origin reveals · live-pulse heartbeat on accent elements |
| texture         | filmic — grain 5%, vignette 0.3, no light leaks                                                                  |
| transitions     | hard cuts only, all on downbeats                                                                                 |
| music           | 120bpm character (audio not bundled); drop at beat 16, biggest hit beat 48                                       |
`;

const GRANIPA_ENTRY = `
## 2 · granipa / GranipaLaunch (2026-06-16)

| field           | value                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| product         | Grañipa — on-device Mac memory layer (local transcription, clipboard history, screen OCR, window snapping)                                                                                                                      |
| arc             | A · demo-first cold open                                                                                                                                                                                                         |
| rhythm          | one confident take — the product performing live inside a single developing window, micro-punctuation on the beat, one satisfying wide resolve at the end                                                                        |
| luminance       | tonal dark (rich surfaces, single world)                                                                                                                                                                                         |
| palette         | bg #0B0F18 · accent blue #3D8BFF (alive) · violet #A05BF0 (depth) · coral #F4604C scarce for trusted-local                                                                                                                       |
| type            | Sentient display / Switzer body / JetBrains Mono                                                                                                                                                                                 |
| signature moves | live ink (text writes itself in real time inside the window) · converge & seal (features lock into one MacWindow chrome with seal) · sovereign drift + pullback (slow camera life + one deliberate wide reveal of the container) |
| texture         | light filmic — grain 2.5%, vignette 0.18, almost no leaks                                                                                                                                                                        |
| transitions     | contained internal motions + one wide pullback at the sovereignty moment                                                                                                                                                         |
| music           | warm assured modern, ~98-122bpm character (audio not bundled); home bloom aligned to the reveal                                                                                                                                  |
`;

const REGISTRY_TWO = RELAY_ENTRY + GRANIPA_ENTRY;

// A synthetic candidate that is too similar to relay (differs on <4 axes).
const TOO_SIMILAR_ENTRY = `
## 3 · copycat / CopycatLaunch (2026-07-01)

| field           | value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| product         | Copycat — another dark terminal product                                     |
| arc             | B · problem-first                                                           |
| rhythm          | dead-stop tension, then everything at once; holds shorten toward climax     |
| luminance       | dark (dark near-black #0A0E10)                                              |
| palette         | bg #0A0E10 · accent green #B8F030 (live)                                   |
| type            | Space Grotesk display+body / JetBrains Mono terminal                        |
| signature moves | cut (cause IS effect) · ripple reveals · heartbeat on accent                |
| texture         | filmic — grain 5%, vignette 0.3, no leaks                                  |
| transitions     | hard cuts only, all on downbeats                                            |
| music           | 120bpm electronic (audio not bundled)                                       |
`;

// A clearly distinct candidate — fresh identity on all axes.
const FRESH_ENTRY = `
## 3 · sparkle / SparkleLaunch (2026-07-01)

| field           | value                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| product         | Sparkle — visual collaboration tool for design teams                                 |
| arc             | D · transformation                                                                   |
| rhythm          | slow reveal then sudden expansion; each scene breathes before the next punch arrives |
| luminance       | light (bright white canvas #FAFAFA)                                                  |
| palette         | bg #FAFAFA · accent coral #FF5757 (interactive) · sand #F5E6C8 (warmth)             |
| type            | Canela display / Neue Haas Grotesk body / IBM Plex Mono                              |
| signature moves | bloom expand (element fans outward) · gravity snap (objects fall into place) · color wash fade |
| texture         | clean — no grain, soft shadows only                                                  |
| transitions     | cross-dissolve with scale, one dramatic wipe for the hero moment                     |
| music           | 72bpm ambient electronic, slow swell with sudden drop                                |
`;

const REGISTRY_ONE = RELAY_ENTRY;
const REGISTRY_THREE_SIMILAR = RELAY_ENTRY + GRANIPA_ENTRY + TOO_SIMILAR_ENTRY;
const REGISTRY_THREE_FRESH   = RELAY_ENTRY + GRANIPA_ENTRY + FRESH_ENTRY;

// ── Fixture 1: relay-vs-granipa real divergence ──────────────────────────────────────────────

describe('relay-vs-granipa — candidate=relay, prior=granipa', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,
    candidateSlug: 'relay',
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('skip is false', () => {
    expect(verdict.skip).toBe(false);
  });

  it('candidate is relay', () => {
    expect(verdict.candidateSlug).toBe('relay');
  });

  it('prior is granipa', () => {
    expect(verdict.priorSlugs).toEqual(['granipa']);
  });

  it('relay vs granipa differs on ≥4 axes', () => {
    expect(verdict.perPrior[0].differingCount).toBeGreaterThanOrEqual(4);
    expect(verdict.perPrior[0].hardPass).toBe(true);
  });

  it('HARD gate passes', () => {
    const hardGate = verdict.gates.find(g => g.hard);
    expect(hardGate).toBeDefined();
    expect(hardGate.pass).toBe(true);
    expect(hardGate.skip).toBe(false);
  });

  it('palette-bg axis differs (relay #0A0E0B vs granipa #0B0F18 ΔE94 > 5)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('palette-bg');
  });

  it('palette-accent axis differs (lime vs blue, large ΔE94)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('palette-accent');
  });

  it('luminance axis differs (dark vs tonal)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('luminance');
  });

  it('type axis differs (Space Grotesk vs Sentient/Switzer — Jaccard 0.25 < 0.5)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('type');
  });

  it('arc axis differs (B vs A)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('arc');
  });

  it('texture axis differs (filmic 5% vs light 2.5%)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('texture');
  });

  it('music-bpm axis differs (upbeat 120bpm vs mid avg 110bpm)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('music-bpm');
  });
});

// ── Fixture 2: granipa-vs-relay real divergence ──────────────────────────────────────────────

describe('granipa-vs-relay — candidate=granipa, prior=relay', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,
    candidateSlug: 'granipa',
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('granipa vs relay differs on ≥4 axes', () => {
    expect(verdict.perPrior[0].differingCount).toBeGreaterThanOrEqual(4);
    expect(verdict.perPrior[0].hardPass).toBe(true);
  });
});

// ── Fixture 3: too-similar candidate HARD fails ──────────────────────────────────────────────

describe('too-similar candidate — <4 axes differ from relay → HARD FAIL', () => {
  // copycat vs relay: same arc (B), same luminance (dark), same type (Space Grotesk / JetBrains Mono),
  // same rhythm tokens (dead-stop, tension, holds, climax), same texture band (filmic 5%),
  // same bpm band (upbeat 120), similar transitions. palette-bg and palette-accent may differ slightly.
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_THREE_SIMILAR,
    candidateSlug: 'copycat',
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('skip is false', () => {
    expect(verdict.skip).toBe(false);
  });

  it('HARD gate fails', () => {
    const hardGate = verdict.gates.find(g => g.hard);
    expect(hardGate.pass).toBe(false);
  });

  it('copycat vs relay has <4 differing axes', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay).toBeDefined();
    expect(vsRelay.hardPass).toBe(false);
    expect(vsRelay.differingCount).toBeLessThan(4);
  });

  it('colliding axes named on hard fail', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay.collidingAxes.length).toBeGreaterThan(0);
  });
});

// ── Fixture 4: clean candidate passes ────────────────────────────────────────────────────────

describe('clean candidate — differs on all axes from relay and granipa → PASS', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_THREE_FRESH,
    candidateSlug: 'sparkle',
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('HARD gate passes for both priors', () => {
    expect(verdict.perPrior).toHaveLength(2);
    expect(verdict.perPrior.every(p => p.hardPass)).toBe(true);
  });

  it('sparkle vs relay differs on ≥4 axes', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay.differingCount).toBeGreaterThanOrEqual(4);
  });

  it('sparkle vs granipa differs on ≥4 axes', () => {
    const vsGranipa = verdict.perPrior.find(p => p.priorSlug === 'granipa');
    expect(vsGranipa.differingCount).toBeGreaterThanOrEqual(4);
  });

  it('luminance differs (light vs dark/tonal)', () => {
    for (const p of verdict.perPrior) {
      expect(p.differingAxes).toContain('luminance');
    }
  });

  it('arc differs (D vs A/B)', () => {
    for (const p of verdict.perPrior) {
      expect(p.differingAxes).toContain('arc');
    }
  });

  it('music-bpm differs (slow 72bpm vs mid/upbeat)', () => {
    for (const p of verdict.perPrior) {
      expect(p.differingAxes).toContain('music-bpm');
    }
  });
});

// ── Fixture 5: SKIP when n<2 ─────────────────────────────────────────────────────────────────

describe('SKIP when n<2 — only one registry entry', () => {
  const verdict = computeDistinctMetrics({
    registryText: REGISTRY_ONE,
  });

  it('hardGatesPass is true (SKIP)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('skip is true', () => {
    expect(verdict.skip).toBe(true);
  });

  it('n is 1', () => {
    expect(verdict.n).toBe(1);
  });

  it('perPrior is empty', () => {
    expect(verdict.perPrior).toHaveLength(0);
  });

  it('HARD gate is marked skip', () => {
    const hardGate = verdict.gates.find(g => g.hard);
    expect(hardGate.skip).toBe(true);
  });
});

// ── Fixture 6: deltaE = 0 for same hex ───────────────────────────────────────────────────────

describe('deltaE edge cases', () => {
  it('same hex → deltaE94 = 0', () => {
    const lab = hexToLab('#0A0E0B');
    expect(deltaE94(lab, lab)).toBe(0);
  });

  it('same hex → palette-bg does NOT differ', () => {
    const r = parseRegistry(REGISTRY_TWO);
    const relay   = r.find(rec => rec.slug === 'relay');
    const sameParsed = {
      ...relay.parsed,
      bg:     relay.parsed.bg,     // same bg
      accent: relay.parsed.accent, // same accent
    };
    const axes = computeAxisDivergences(sameParsed, relay.parsed);
    expect(axes).not.toContain('palette-bg');
    expect(axes).not.toContain('palette-accent');
  });

  it('very different colors have deltaE94 > threshold', () => {
    const lime = hexToLab('#B6F22E');
    const blue = hexToLab('#3D8BFF');
    expect(deltaE94(lime, blue)).toBeGreaterThan(5);
  });

  it('relay bg vs granipa bg deltaE94 > 5', () => {
    const relayBg   = hexToLab('#0A0E0B');
    const granipaBg = hexToLab('#0B0F18');
    expect(deltaE94(relayBg, granipaBg)).toBeGreaterThan(5);
  });
});

// ── Fixture 7: hex parsing ────────────────────────────────────────────────────────────────────

describe('parseHex', () => {
  it('parses lowercase hex', () => {
    expect(parseHex('#0a0e0b')).toEqual([10, 14, 11]);
  });

  it('parses uppercase hex', () => {
    expect(parseHex('#0A0E0B')).toEqual([10, 14, 11]);
  });

  it('parses mid-range hex', () => {
    expect(parseHex('#B6F22E')).toEqual([182, 242, 46]);
  });

  it('throws on invalid length', () => {
    expect(() => parseHex('#abc')).toThrow();
  });
});

// ── Fixture 8: parseBpmBand ──────────────────────────────────────────────────────────────────

describe('parseBpmBand', () => {
  it('parses range "~98-122bpm" → mid (avg 110)', () => {
    expect(parseBpmBand('warm assured modern, ~98-122bpm character')).toBe('mid');
  });

  it('parses single "120bpm" → upbeat', () => {
    expect(parseBpmBand('120bpm character; drop at beat 16')).toBe('upbeat');
  });

  it('parses slow bpm ≤89 → slow', () => {
    expect(parseBpmBand('ambient 72bpm slow swell')).toBe('slow');
  });

  it('parses fast bpm >140 → fast', () => {
    expect(parseBpmBand('drum and bass 170bpm aggressive')).toBe('fast');
  });

  it('returns unknown when no bpm found', () => {
    expect(parseBpmBand('no tempo information here')).toBe('unknown');
  });
});

// ── Fixture 9: parseGrainBand ────────────────────────────────────────────────────────────────

describe('parseGrainBand', () => {
  it('5% → filmic', () => {
    expect(parseGrainBand('filmic — grain 5%, vignette 0.3')).toBe('filmic');
  });

  it('2.5% → light', () => {
    expect(parseGrainBand('light filmic — grain 2.5%, vignette 0.18')).toBe('light');
  });

  it('"clean" with no grain % → none', () => {
    expect(parseGrainBand('clean — no grain, soft shadows only')).toBe('none');
  });

  it('0% → none', () => {
    expect(parseGrainBand('minimal — grain 0%')).toBe('none');
  });

  it('8% → heavy', () => {
    expect(parseGrainBand('heavy filmic — grain 8%')).toBe('heavy');
  });
});

// ── Fixture 10: parseFontFamilies ────────────────────────────────────────────────────────────

describe('parseFontFamilies', () => {
  it('extracts relay type families', () => {
    const fams = parseFontFamilies('Space Grotesk display+body / JetBrains Mono terminal+data');
    expect(fams).toContain('space grotesk');
    expect(fams).toContain('jetbrains mono');
    expect(fams).toHaveLength(2);
  });

  it('extracts granipa type families', () => {
    const fams = parseFontFamilies('Sentient display / Switzer body / JetBrains Mono');
    expect(fams).toContain('sentient');
    expect(fams).toContain('switzer');
    expect(fams).toContain('jetbrains mono');
    expect(fams).toHaveLength(3);
  });

  it('Jaccard of relay and granipa families is 0.25 (one shared / four total)', () => {
    const a = parseFontFamilies('Space Grotesk display+body / JetBrains Mono terminal+data');
    const b = parseFontFamilies('Sentient display / Switzer body / JetBrains Mono');
    expect(jaccard(a, b)).toBeCloseTo(1 / 4, 5);
  });
});

// ── Fixture 11: parseLuminanceClass ─────────────────────────────────────────────────────────

describe('parseLuminanceClass', () => {
  it('"tonal dark" → tonal', () => {
    expect(parseLuminanceClass('tonal dark (rich surfaces, single world)')).toBe('tonal');
  });

  it('"dark (green-tinted near-black)" → dark', () => {
    expect(parseLuminanceClass('dark (green-tinted near-black #0A0E0B)')).toBe('dark');
  });

  it('"light (bright white canvas)" → light', () => {
    expect(parseLuminanceClass('light (bright white canvas #FAFAFA)')).toBe('light');
  });

  it('unknown string → unknown', () => {
    expect(parseLuminanceClass('mid-tone warm')).toBe('unknown');
  });
});

// ── Fixture 12: parsePaletteHex ─────────────────────────────────────────────────────────────

describe('parsePaletteHex', () => {
  it('extracts relay bg and accent', () => {
    const p = parsePaletteHex('bg #0A0E0B · accent lime #B6F22E (live-only) · alt red #E5484D');
    expect(p.bg).toBe('#0A0E0B');
    expect(p.accent).toBe('#B6F22E');
  });

  it('extracts granipa bg and accent', () => {
    const p = parsePaletteHex('bg #0B0F18 · accent blue #3D8BFF (alive) · violet #A05BF0');
    expect(p.bg).toBe('#0B0F18');
    expect(p.accent).toBe('#3D8BFF');
  });

  it('extracts accent without color name qualifier', () => {
    const p = parsePaletteHex('bg #FAFAFA · accent #FF5757 (interactive)');
    expect(p.bg).toBe('#FAFAFA');
    expect(p.accent).toBe('#FF5757');
  });

  it('returns null when field absent', () => {
    const p = parsePaletteHex('no palette here');
    expect(p.bg).toBeNull();
    expect(p.accent).toBeNull();
  });
});

// ── Fixture 13: convergence drift advisory ───────────────────────────────────────────────────

describe('convergence drift advisory', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,
    candidateSlug: 'relay',
  });

  it('drift advisory fires for bg-luminance (relay=dark + granipa=tonal, both dark-family)', () => {
    const driftGates = verdict.gates.filter(g => g.advisory && !g.pass);
    const bgDrift = driftGates.find(g => g.name.includes('bg-luminance'));
    expect(bgDrift).toBeDefined();
  });

  it('drift advisory fires for JetBrains Mono (both relay and granipa use it)', () => {
    const driftGates = verdict.gates.filter(g => g.advisory && !g.pass);
    const monoDrift = driftGates.find(g => g.name.includes('mono-font'));
    expect(monoDrift).toBeDefined();
  });

  it('drift advisory is advisory=true and does NOT affect hardGatesPass', () => {
    expect(verdict.hardGatesPass).toBe(true);
    const driftGates = verdict.gates.filter(g => g.advisory && !g.pass);
    expect(driftGates.every(g => g.hard === false)).toBe(true);
  });
});

// ── Fixture 14: parseRegistry structure ─────────────────────────────────────────────────────

describe('parseRegistry', () => {
  const records = parseRegistry(REGISTRY_TWO);

  it('parses two records', () => {
    expect(records).toHaveLength(2);
  });

  it('relay is first, granipa is second', () => {
    expect(records[0].slug).toBe('relay');
    expect(records[1].slug).toBe('granipa');
  });

  it('relay parsed correctly', () => {
    const relay = records[0];
    expect(relay.parsed.bg).toBe('#0A0E0B');
    expect(relay.parsed.accent).toBe('#B6F22E');
    expect(relay.parsed.luminance).toBe('dark');
    expect(relay.parsed.arc).toBe('B');
    expect(relay.parsed.grainBand).toBe('filmic');
    expect(relay.parsed.bpmBand).toBe('upbeat');
    expect(relay.parsed.usesJetbrainsMono).toBe(true);
  });

  it('granipa parsed correctly', () => {
    const granipa = records[1];
    expect(granipa.parsed.bg).toBe('#0B0F18');
    expect(granipa.parsed.accent).toBe('#3D8BFF');
    expect(granipa.parsed.luminance).toBe('tonal');
    expect(granipa.parsed.arc).toBe('A');
    expect(granipa.parsed.grainBand).toBe('light');
    expect(granipa.parsed.bpmBand).toBe('mid');
    expect(granipa.parsed.usesJetbrainsMono).toBe(true);
  });
});

// ── Fixture 15: default candidate (last entry) ───────────────────────────────────────────────

describe('default candidate (last entry when no slug given)', () => {
  const verdict = computeDistinctMetrics({ registryText: REGISTRY_TWO });

  it('uses granipa as candidate (last entry)', () => {
    expect(verdict.candidateSlug).toBe('granipa');
  });

  it('uses relay as prior', () => {
    expect(verdict.priorSlugs).toEqual(['relay']);
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });
});

// ── Fixture 16: tokenSet and jaccard ────────────────────────────────────────────────────────

describe('tokenSet and jaccard', () => {
  it('tokenSet drops short tokens', () => {
    const s = tokenSet('a and in the foo bar baz');
    expect(s.has('foo')).toBe(true);
    expect(s.has('bar')).toBe(true);
    expect(s.has('baz')).toBe(true);
    expect(s.has('and')).toBe(true);
    expect(s.has('the')).toBe(true);
    expect(s.has('in')).toBe(false);  // 2 chars — dropped
    expect(s.has('a')).toBe(false);   // 1 char — dropped
  });

  it('jaccard of identical sets is 1', () => {
    expect(jaccard(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1);
  });

  it('jaccard of disjoint sets is 0', () => {
    expect(jaccard(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('jaccard of two empty sets is 1', () => {
    expect(jaccard([], [])).toBe(1);
  });

  it('jaccard({a,b,c},{a}) = 1/3', () => {
    expect(jaccard(['a', 'b', 'c'], ['a'])).toBeCloseTo(1 / 3, 5);
  });
});

// ── Derived axes fixtures ─────────────────────────────────────────────────────────────────────
//
// Synthetic derivedAxes objects mirroring real relay and granipa source values.
// These are used in pure-function tests that don't need loadTheme().

const RELAY_DERIVED = {
  bg: '#0A0E0B', accent: '#B6F22E',
  fonts: ['jetbrains mono', 'space grotesk'],
  grainPct: 5, luminance: 'dark',
  derivable: ['palette-bg','palette-accent','luminance','type','texture'],
  nonDerivable: ['arc','rhythm+moves','transitions','music-bpm'],
};

const GRANIPA_DERIVED = {
  bg: '#0A0B0E', accent: '#3D8BFF',
  fonts: ['jetbrains mono', 'sentient', 'switzer'],
  grainPct: 4, luminance: 'dark',
  derivable: ['palette-bg','palette-accent','luminance','type','texture'],
  nonDerivable: ['arc','rhythm+moves','transitions','music-bpm'],
};

// Fixed granipa registry entry (matches source values).
const GRANIPA_ENTRY_FIXED = `
## 2 · granipa / GranipaLaunch (2026-06-16)

| field           | value                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| product         | Grañipa — on-device Mac memory layer                                                                                                                                                                                             |
| arc             | A · demo-first cold open                                                                                                                                                                                                         |
| rhythm          | one confident take — the product performing live inside a single developing window, micro-punctuation on the beat, one satisfying wide resolve at the end                                                                        |
| luminance       | dark (#0A0B0E near-black with subtle blue cast)                                                                                                                                                                                  |
| palette         | bg #0A0B0E · accent blue #3D8BFF (alive) · violet #A05BF0 (depth) · coral #F4604C                                                                                                                                               |
| type            | Sentient display / Switzer body / JetBrains Mono                                                                                                                                                                                 |
| signature moves | live ink · converge & seal · sovereign drift + pullback                                                                                                                                                                          |
| texture         | filmic — grain 4%, vignette 0.28, almost no leaks                                                                                                                                                                                |
| transitions     | contained internal motions + one wide pullback at the sovereignty moment                                                                                                                                                         |
| music           | warm assured modern, ~98-122bpm character                                                                                                                                                                                        |
`;

const REGISTRY_TWO_FIXED = RELAY_ENTRY + GRANIPA_ENTRY_FIXED;

// ── Fixture 17: relay derived-axes path — no registry drift, passes anti-template ────────────

describe('derived-axes — relay with synthetic RELAY_DERIVED (no drift, anti-template pass)', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,        // granipa still the old registry values (as prior)
    candidateSlug: 'relay',
    derivedAxes:   RELAY_DERIVED,
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('registry-axis-drift gate passes (relay registry matches source)', () => {
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    expect(driftGate).toBeDefined();
    expect(driftGate.pass).toBe(true);
  });

  it('anti-template gate passes (≥4 axes differ vs granipa)', () => {
    const antiGate = verdict.gates.find(g => g.name === 'HARD: ≥4 axes distinct from every prior');
    expect(antiGate.pass).toBe(true);
  });

  it('derived bg is used for relay candidate (not registry)', () => {
    // The relay registry bg and derived bg are the same hex, so no observable change,
    // but derived axes are applied — confirm anti-template result still correct.
    expect(verdict.perPrior[0].differingAxes).toContain('palette-accent');
  });

  it('nonDerivableCoverage has ran for all 4 axes', () => {
    const cov = verdict.nonDerivableCoverage;
    expect(cov['arc']).toBe('ran');
    expect(cov['rhythm+moves']).toBe('ran');
    expect(cov['transitions']).toBe('ran');
    expect(cov['music-bpm']).toBe('ran');
  });
});

// ── Fixture 18: granipa derived-axes path — no drift with fixed registry ──────────────────────

describe('derived-axes — granipa with GRANIPA_DERIVED + fixed registry (no drift)', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO_FIXED,
    candidateSlug: 'granipa',
    derivedAxes:   GRANIPA_DERIVED,
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('registry-axis-drift gate passes (fixed registry matches derived source)', () => {
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    expect(driftGate).toBeDefined();
    expect(driftGate.pass).toBe(true);
  });

  it('anti-template gate passes (≥4 axes differ vs relay)', () => {
    const antiGate = verdict.gates.find(g => g.name === 'HARD: ≥4 axes distinct from every prior');
    expect(antiGate.pass).toBe(true);
  });

  it('palette-accent axis differs (blue vs lime)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('palette-accent');
  });

  it('type axis differs (sentient/switzer/jetbrains vs space grotesk/jetbrains)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('type');
  });

  it('arc axis differs (A vs B)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('arc');
  });

  it('music-bpm axis differs (mid vs upbeat)', () => {
    expect(verdict.perPrior[0].differingAxes).toContain('music-bpm');
  });

  it('nonDerivableCoverage all ran', () => {
    const cov = verdict.nonDerivableCoverage;
    expect(Object.values(cov).every(v => v === 'ran')).toBe(true);
  });
});

// ── Fixture 19: stale registry triggers registry-axis-drift HARD fail ─────────────────────────
//
// Uses the OLD GRANIPA_ENTRY (registry bg=#0B0F18, luminance=tonal, grain=2.5%) as the
// candidate registry value, combined with GRANIPA_DERIVED (derived bg=#0A0B0E, grain=4%,
// luminance='dark') to simulate a registry that hasn't been updated to match source.

describe('registry-axis-drift — stale granipa registry HARD fail', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,    // old GRANIPA_ENTRY: bg=#0B0F18, luminance=tonal, grain=2.5%
    candidateSlug: 'granipa',
    derivedAxes:   GRANIPA_DERIVED, // derived: bg=#0A0B0E, luminance=dark, grain=4%
  });

  it('hardGatesPass is false (registry-axis-drift blocks)', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('registry-axis-drift gate is present and fails', () => {
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    expect(driftGate).toBeDefined();
    expect(driftGate.hard).toBe(true);
    expect(driftGate.pass).toBe(false);
  });

  it('drift detail names the disagreeing fields', () => {
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    // luminance mismatch (registry=tonal, derived=dark) and grain mismatch (light vs filmic) must appear.
    expect(driftGate.detail).toMatch(/luminance/);
    expect(driftGate.detail).toMatch(/texture\/grain/);
  });

  it('drift detail includes registry and source values', () => {
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    expect(driftGate.detail).toMatch(/tonal/);   // registry luminance
    expect(driftGate.detail).toMatch(/dark/);    // derived luminance
  });

  it('anti-template gate is still evaluated and passes (≥4 axes differ)', () => {
    const antiGate = verdict.gates.find(g => g.name === 'HARD: ≥4 axes distinct from every prior');
    expect(antiGate).toBeDefined();
    expect(antiGate.pass).toBe(true);
  });
});

// ── Fixture 20: pre-registry SKIP — nonDerivableCoverage all skip-na ─────────────────────────

describe('pre-registry SKIP path — nonDerivableCoverage is skip-na for all non-derivable axes', () => {
  const verdict = computeDistinctMetrics({ registryText: REGISTRY_ONE });

  it('skip is true', () => {
    expect(verdict.skip).toBe(true);
  });

  it('nonDerivableCoverage exists and all skip-na', () => {
    const cov = verdict.nonDerivableCoverage;
    expect(cov['arc']).toBe('skip-na');
    expect(cov['rhythm+moves']).toBe('skip-na');
    expect(cov['transitions']).toBe('skip-na');
    expect(cov['music-bpm']).toBe('skip-na');
  });
});

// ── Fixture 21: override flags override derived axes ─────────────────────────────────────────

describe('override flags take precedence over derivedAxes', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,
    candidateSlug: 'relay',
    derivedAxes:   RELAY_DERIVED,            // derived: bg=#0A0E0B, luminance=dark
    overrides:     { luminance: 'light' },   // override wins → luminance='light'
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('luminance override wins over derived (relay now light → differs from granipa tonal)', () => {
    // With override luminance=light and prior granipa registry luminance=tonal, they differ.
    expect(verdict.perPrior[0].differingAxes).toContain('luminance');
  });
});

// ── Fixture 22: grainPctToBand helper ────────────────────────────────────────────────────────

describe('grainPctToBand', () => {
  it('0 → none', () => { expect(grainPctToBand(0)).toBe('none'); });
  it('null → none', () => { expect(grainPctToBand(null)).toBe('none'); });
  it('2.5 → light', () => { expect(grainPctToBand(2.5)).toBe('light'); });
  it('3.0 → light (boundary inclusive)', () => { expect(grainPctToBand(3.0)).toBe('light'); });
  it('4 → filmic', () => { expect(grainPctToBand(4)).toBe('filmic'); });
  it('5 → filmic', () => { expect(grainPctToBand(5)).toBe('filmic'); });
  it('7.0 → filmic (boundary inclusive)', () => { expect(grainPctToBand(7.0)).toBe('filmic'); });
  it('8 → heavy', () => { expect(grainPctToBand(8)).toBe('heavy'); });
});

// ── Fixture 23: computeRegistryDriftGate — pure unit tests ───────────────────────────────────

describe('computeRegistryDriftGate', () => {
  const records = parseRegistry(REGISTRY_TWO);
  const relayRecord   = records.find(r => r.slug === 'relay');
  const granipaRecord = records.find(r => r.slug === 'granipa');

  it('relay + RELAY_DERIVED → pass (registry matches source)', () => {
    const gate = computeRegistryDriftGate(relayRecord, RELAY_DERIVED);
    expect(gate.pass).toBe(true);
  });

  it('granipa (old registry) + GRANIPA_DERIVED → fail (luminance mismatch + grain mismatch)', () => {
    const gate = computeRegistryDriftGate(granipaRecord, GRANIPA_DERIVED);
    expect(gate.pass).toBe(false);
    expect(gate.detail).toContain('luminance');
    expect(gate.detail).toContain('texture/grain');
  });

  it('drift gate is always hard:true', () => {
    const gate = computeRegistryDriftGate(relayRecord, RELAY_DERIVED);
    expect(gate.hard).toBe(true);
  });

  it('accent drift fires when ΔE94 > 5', () => {
    // Swap relay accent with granipa blue → large ΔE94 → drift fires
    const staleAxes = { ...RELAY_DERIVED, accent: '#3D8BFF' };
    const gate = computeRegistryDriftGate(relayRecord, staleAxes);
    expect(gate.pass).toBe(false);
    expect(gate.detail).toContain('palette-accent');
  });

  it('bg drift fires when registry bg is stale (ΔE94 > 5)', () => {
    // Simulate stale registry with bright-blue bg; derived retains the correct near-black value.
    // ΔE94(#3D8BFF, #0A0E0B) >> 5 → drift gate fires and names palette-bg.
    const staleRecord = { ...relayRecord, parsed: { ...relayRecord.parsed, bg: '#3D8BFF' } };
    const gate = computeRegistryDriftGate(staleRecord, RELAY_DERIVED);
    expect(gate.pass).toBe(false);
    expect(gate.detail).toContain('palette-bg');
  });
});

// ── Fixture 24: computeNonDerivableCoverage ──────────────────────────────────────────────────

describe('computeNonDerivableCoverage', () => {
  const records = parseRegistry(REGISTRY_TWO);
  const relayRecord = records.find(r => r.slug === 'relay');

  it('relay (in registry, all fields present) → all ran', () => {
    const cov = computeNonDerivableCoverage(relayRecord, false);
    expect(cov['arc']).toBe('ran');
    expect(cov['rhythm+moves']).toBe('ran');
    expect(cov['transitions']).toBe('ran');
    expect(cov['music-bpm']).toBe('ran');
  });

  it('isPreRegistry=true → all skip-na', () => {
    const cov = computeNonDerivableCoverage(relayRecord, true);
    expect(Object.values(cov).every(v => v === 'skip-na')).toBe(true);
  });
});

// ── Fixture 25: golden calibration via real loadTheme (integration) ──────────────────────────
//
// These tests load the actual theme.ts for relay and granipa and verify that
// distinct-metrics passes for both with the corrected _registry.md.

describe('golden calibration — relay loadTheme + real registry (derived-axes path)', () => {
  const registryText = readFileSync(resolve(__dirname, '..', 'src', 'videos', '_registry.md'), 'utf8');

  it('relay passes with derived axes from real loadTheme', async () => {
    const theme = await loadTheme('relay');
    const derivedAxes = themeToAxes(theme);
    const verdict = computeDistinctMetrics({ registryText, candidateSlug: 'relay', derivedAxes });
    expect(verdict.hardGatesPass).toBe(true);
    expect(verdict.skip).toBe(false);
  });

  it('relay registry-axis-drift gate passes (registry matches source)', async () => {
    const theme = await loadTheme('relay');
    const derivedAxes = themeToAxes(theme);
    const verdict = computeDistinctMetrics({ registryText, candidateSlug: 'relay', derivedAxes });
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    expect(driftGate.pass).toBe(true);
  });
});

describe('golden calibration — granipa loadTheme + real registry (derived-axes path)', () => {
  const registryText = readFileSync(resolve(__dirname, '..', 'src', 'videos', '_registry.md'), 'utf8');

  it('granipa passes with derived axes from real loadTheme', async () => {
    const theme = await loadTheme('granipa');
    const derivedAxes = themeToAxes(theme);
    const verdict = computeDistinctMetrics({ registryText, candidateSlug: 'granipa', derivedAxes });
    expect(verdict.hardGatesPass).toBe(true);
    expect(verdict.skip).toBe(false);
  });

  it('granipa registry-axis-drift gate passes after registry fix', async () => {
    const theme = await loadTheme('granipa');
    const derivedAxes = themeToAxes(theme);
    const verdict = computeDistinctMetrics({ registryText, candidateSlug: 'granipa', derivedAxes });
    const driftGate = verdict.gates.find(g => g.name === 'HARD: registry-axis-drift');
    expect(driftGate.pass).toBe(true);
  });

  it('granipa differs from relay on ≥4 axes with derived axes', async () => {
    const theme = await loadTheme('granipa');
    const derivedAxes = themeToAxes(theme);
    const verdict = computeDistinctMetrics({ registryText, candidateSlug: 'granipa', derivedAxes });
    expect(verdict.perPrior[0].differingCount).toBeGreaterThanOrEqual(4);
    expect(verdict.perPrior[0].hardPass).toBe(true);
  });
});

// ── Registry-completeness fixtures ───────────────────────────────────────────────────────────
//
// videoFolders shape: [{ slug, hasTheme, hasMain }]
//
// Fixture 26: relay+granipa complete registry → PASS (no missing, no orphan).
// Fixture 27: third buildable folder 'aurora' (theme.ts+Main.tsx) with no entry → HARD fail.
// Fixture 28: registry entry 'ghost' with no matching folder → HARD fail.
// Fixture 29: folder with theme.ts but NO Main.tsx (scaffold-only) → NOT flagged.

const TWO_BUILDABLE_FOLDERS = [
  { slug: 'relay',   hasTheme: true, hasMain: true },
  { slug: 'granipa', hasTheme: true, hasMain: true },
];

// Minimal ghost registry entry — valid heading + table so parseRegistry would pick it up.
const GHOST_ENTRY = `
## 3 · ghost / GhostLaunch (2026-07-01)

| field     | value                     |
| --------- | ------------------------- |
| product   | Ghost — an orphan video   |
| arc       | C · build-in-public       |
| rhythm    | slow pulse                |
| luminance | dark (#0D0D0D)            |
| palette   | bg #0D0D0D · accent gold #FFD700 |
| type      | Neue Haas Grotesk body    |
| signature moves | single lock reveal  |
| texture   | clean                     |
| transitions | cross-dissolve          |
| music     | 95bpm ambient             |
`;

// ── Fixture 26: complete registry (relay+granipa) → PASS ─────────────────────────────────────

describe('registry-completeness — relay+granipa complete → PASS', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,
    candidateSlug: 'relay',
    videoFolders:  TWO_BUILDABLE_FOLDERS,
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('no registry-completeness gate in output (all complete)', () => {
    const cg = verdict.gates.find(g => g.name === 'HARD: registry-completeness');
    expect(cg).toBeUndefined();
  });
});

// ── Fixture 27: buildable folder 'aurora' missing a registry entry → HARD fail ──────────────

describe('registry-completeness — aurora buildable with no entry → HARD fail', () => {
  const foldersWithAurora = [
    ...TWO_BUILDABLE_FOLDERS,
    { slug: 'aurora', hasTheme: true, hasMain: true },
  ];

  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,   // relay + granipa only — no aurora entry
    candidateSlug: 'relay',
    videoFolders:  foldersWithAurora,
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('registry-completeness gate is present and fails', () => {
    const cg = verdict.gates.find(g => g.name === 'HARD: registry-completeness');
    expect(cg).toBeDefined();
    expect(cg.hard).toBe(true);
    expect(cg.pass).toBe(false);
  });

  it('gate detail names aurora as missing', () => {
    const cg = verdict.gates.find(g => g.name === 'HARD: registry-completeness');
    expect(cg.detail).toMatch(/aurora/);
    expect(cg.detail).toMatch(/missing entry/);
  });
});

// ── Fixture 28: registry entry 'ghost' with no folder → HARD fail ─────────────────────────

describe('registry-completeness — ghost registry entry with no folder → HARD fail', () => {
  const registryWithGhost = REGISTRY_TWO + GHOST_ENTRY;

  const verdict = computeDistinctMetrics({
    registryText:  registryWithGhost,  // relay + granipa + ghost
    candidateSlug: 'relay',
    videoFolders:  TWO_BUILDABLE_FOLDERS,  // no ghost folder
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('registry-completeness gate is present and fails', () => {
    const cg = verdict.gates.find(g => g.name === 'HARD: registry-completeness');
    expect(cg).toBeDefined();
    expect(cg.hard).toBe(true);
    expect(cg.pass).toBe(false);
  });

  it('gate detail names ghost as orphan', () => {
    const cg = verdict.gates.find(g => g.name === 'HARD: registry-completeness');
    expect(cg.detail).toMatch(/ghost/);
    expect(cg.detail).toMatch(/orphan entry/);
  });
});

// ── Fixture 29: scaffold-only folder (theme.ts but NO Main.tsx) → not flagged ───────────────

describe('registry-completeness — scaffold-only folder (theme.ts, no Main.tsx) → NOT flagged', () => {
  const foldersWithDraft = [
    ...TWO_BUILDABLE_FOLDERS,
    { slug: 'draft', hasTheme: true, hasMain: false },  // scaffold-only: not buildable
  ];

  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_TWO,   // relay + granipa only — no draft entry
    candidateSlug: 'relay',
    videoFolders:  foldersWithDraft,
  });

  it('hardGatesPass is true (draft scaffold-only folder is not flagged)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('no registry-completeness gate (scaffold-only folder is not buildable)', () => {
    const cg = verdict.gates.find(g => g.name === 'HARD: registry-completeness');
    expect(cg).toBeUndefined();
  });
});

// ── checkRegistryCompleteness pure unit tests ─────────────────────────────────────────────────

describe('checkRegistryCompleteness — pure function', () => {
  it('complete registry → no missing, no orphan', () => {
    const result = checkRegistryCompleteness({
      registryText: REGISTRY_TWO,
      videoFolders: TWO_BUILDABLE_FOLDERS,
    });
    expect(result.missing).toEqual([]);
    expect(result.orphan).toEqual([]);
  });

  it('aurora buildable, no entry → missing=[aurora]', () => {
    const result = checkRegistryCompleteness({
      registryText: REGISTRY_TWO,
      videoFolders: [...TWO_BUILDABLE_FOLDERS, { slug: 'aurora', hasTheme: true, hasMain: true }],
    });
    expect(result.missing).toContain('aurora');
    expect(result.orphan).toEqual([]);
  });

  it('ghost registry entry, no folder → orphan=[ghost]', () => {
    const result = checkRegistryCompleteness({
      registryText: REGISTRY_TWO + GHOST_ENTRY,
      videoFolders: TWO_BUILDABLE_FOLDERS,
    });
    expect(result.missing).toEqual([]);
    expect(result.orphan).toContain('ghost');
  });

  it('theme.ts only (no Main.tsx) → not in missing', () => {
    const result = checkRegistryCompleteness({
      registryText: REGISTRY_TWO,
      videoFolders: [...TWO_BUILDABLE_FOLDERS, { slug: 'draft', hasTheme: true, hasMain: false }],
    });
    expect(result.missing).not.toContain('draft');
  });

  it('empty videoFolders → no missing, no orphan', () => {
    const result = checkRegistryCompleteness({
      registryText: REGISTRY_TWO,
      videoFolders: [],
    });
    expect(result.missing).toEqual([]);
    expect(result.orphan).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Divergent-shape fixtures: music-less candidate
//
// SERENO_ENTRY is a light-palette ambient video with no music.
// parseBpmBand('no music — ambient nature sound only') → 'unknown'.
// The music-bpm axis is excluded when either side has bpmBand='unknown' — the
// axis is simply not counted (neither same nor differing). With 8 of 9 axes
// comparing, SERENO still differs from relay+granipa on all 8 → hardGatesPass=true.
// Result: robust, zero mis-fires for music-less candidates.
// ---------------------------------------------------------------------------

const SERENO_ENTRY = `
## 3 · sereno / SerenoLaunch (2026-07-01)

| field           | value                                                            |
| --------------- | ---------------------------------------------------------------- |
| product         | Sereno — ambient focus timer for distraction-free deep work      |
| arc             | C · build-in-public                                             |
| rhythm          | slow reveal, single long hold at centre, soft bloom at the end  |
| luminance       | light (warm white #FDF8F2)                                      |
| palette         | bg #FDF8F2 · accent warm coral #FF7A5C                          |
| type            | Playfair Display display / Lora body                            |
| signature moves | soft bloom · gravity settle · whisper fade                      |
| texture         | clean — no grain, warm shadow depth                             |
| transitions     | slow cross-dissolve across all scene boundaries                 |
| music           | no music — ambient nature sound only                            |
`;

const REGISTRY_THREE = REGISTRY_TWO + SERENO_ENTRY;

describe('computeDistinctMetrics — divergent: music-less candidate (bpmBand=unknown, ≥4 other axes differ)', () => {
  const verdict = computeDistinctMetrics({
    registryText:  REGISTRY_THREE,
    candidateSlug: 'sereno',
  });

  it('hardGatesPass is true — music-less candidate not blocked', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('sereno differs from relay on ≥4 non-bpm axes', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay.differingCount).toBeGreaterThanOrEqual(4);
    expect(vsRelay.hardPass).toBe(true);
  });

  it('sereno differs from granipa on ≥4 non-bpm axes', () => {
    const vsGranipa = verdict.perPrior.find(p => p.priorSlug === 'granipa');
    expect(vsGranipa.differingCount).toBeGreaterThanOrEqual(4);
    expect(vsGranipa.hardPass).toBe(true);
  });

  it('luminance axis differs (light vs dark)', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay.differingAxes).toContain('luminance');
  });

  it('arc axis differs (C vs B for relay)', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay.differingAxes).toContain('arc');
  });

  it('music-bpm axis NOT counted (bpmBand=unknown skips comparison)', () => {
    const vsRelay = verdict.perPrior.find(p => p.priorSlug === 'relay');
    expect(vsRelay.differingAxes).not.toContain('music-bpm');
  });
});

describe('parseBpmBand — music-less strings return unknown', () => {
  it('"no music — ambient nature sound only" → unknown', () => {
    expect(parseBpmBand('no music — ambient nature sound only')).toBe('unknown');
  });

  it('"ambient sound design, no BPM" → unknown', () => {
    expect(parseBpmBand('ambient sound design, no BPM')).toBe('unknown');
  });
});
