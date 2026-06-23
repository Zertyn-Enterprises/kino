/**
 * Unit tests for computeCodeCraftMetrics.
 *
 * Fixtures:
 *   cleanFiles      — all 4 gates PASS (no violations)
 *   emojiFiles      — C1-emoji advisory FAIL (emoji in quoted string literal)
 *   systemFontFiles — C1-font advisory FAIL (system-ui as primary fontFamily)
 *   interFontFiles  — C1-font advisory FAIL (Inter as primary fontFamily)
 *   hexFiles        — C2-hex advisory FAIL (raw #hex literal in scene file)
 *   easingFiles     — C3-easing advisory FAIL (Easing.linear + no-easing interpolate)
 *
 * All 4 gates are advisory → hardGatesPass is always true for non-empty input.
 * Advisory fails never flip hardGatesPass=false; they are listed in violations only.
 *
 * Golden calibration:
 *   real relay source  → hardGatesPass=true
 *   real granipa source → hardGatesPass=true
 *
 * Fixture paths:
 *   SCENE_PATH  — under /scenes/, scanned by all 4 gates
 *   THEME_PATH  — not under /scenes/, scanned by C1-emoji + C1-font only
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCodeCraftMetrics } from './code-craft-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SCENE_PATH = 'src/videos/testslug/scenes/Test.tsx';
const THEME_PATH = 'src/videos/testslug/theme.ts';

// ---------------------------------------------------------------------------
// Fixture 1: clean scene — all 4 gates PASS
//
// - No emoji anywhere in the source
// - fontFamily uses a theme token reference, not a literal system/Inter stack
// - No raw hex literals in the scene file
// - interpolate() call includes easing: option
// Expected: all gates pass=true, violations=[], hardGatesPass=true
// ---------------------------------------------------------------------------

const cleanFiles = [
  {
    path: SCENE_PATH,
    content: `
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
export function Hero() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { easing: t => 1 - Math.pow(1 - t, 2) });
  return <div style={{ fontFamily: theme.fontFamily, color: theme.colors.text, opacity }} />;
}
`,
  },
];

describe('computeCodeCraftMetrics — clean scene (all gates pass)', () => {
  const verdict = computeCodeCraftMetrics({ files: cleanFiles });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 4 gates pass', () => {
    expect(verdict.gates.every(g => g.pass)).toBe(true);
  });

  it('no violations', () => {
    expect(verdict.violations).toHaveLength(0);
  });

  it('C1-emoji passes — no emoji in string literals', () => {
    const g = verdict.gates.find(g => g.name === 'C1-emoji');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.advisory).toBe(true);
  });

  it('C1-font passes — no system/Inter primary fontFamily literal', () => {
    const g = verdict.gates.find(g => g.name === 'C1-font');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
  });

  it('C2-hex passes — no raw hex in scene file', () => {
    const g = verdict.gates.find(g => g.name === 'C2-hex');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
  });

  it('C3-easing passes — interpolate() has easing: in options', () => {
    const g = verdict.gates.find(g => g.name === 'C3-easing');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: emoji in on-screen copy — C1-emoji advisory FAIL
//
// "Ship fast 🚀 and iterate" — U+1F680 in the range U+1F000-U+1FFFF → detected.
// Expected: C1-emoji pass=false, hardGatesPass=true (advisory-only fail).
// ---------------------------------------------------------------------------

const emojiFiles = [
  {
    path: SCENE_PATH,
    content: `const label = "Ship fast 🚀 and iterate";`,
  },
];

describe('computeCodeCraftMetrics — C1-emoji advisory FAIL (emoji in copy)', () => {
  const verdict = computeCodeCraftMetrics({ files: emojiFiles });

  it('hardGatesPass is true — C1-emoji is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('C1-emoji gate fails — emoji detected in string literal', () => {
    const g = verdict.gates.find(g => g.name === 'C1-emoji');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violations contain a C1-emoji entry with file, line, snippet', () => {
    const v = verdict.violations.find(v => v.gate === 'C1-emoji');
    expect(v).toBeDefined();
    expect(v.file).toBe(SCENE_PATH);
    expect(typeof v.line).toBe('number');
    expect(typeof v.snippet).toBe('string');
  });

  it('C1-font, C2-hex, C3-easing all pass (no cross-gate contamination)', () => {
    expect(verdict.gates.find(g => g.name === 'C1-font').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'C2-hex').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'C3-easing').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3a: system-ui primary font — C1-font advisory FAIL
//
// fontFamily: "system-ui, -apple-system, sans-serif" — primary = "system-ui"
// Expected: C1-font pass=false, hardGatesPass=true.
// ---------------------------------------------------------------------------

const systemFontFiles = [
  {
    path: THEME_PATH,
    content: `export const theme = { fontFamily: "system-ui, -apple-system, sans-serif" };`,
  },
];

describe('computeCodeCraftMetrics — C1-font advisory FAIL (system-ui primary)', () => {
  const verdict = computeCodeCraftMetrics({ files: systemFontFiles });

  it('hardGatesPass is true — C1-font is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('C1-font gate fails — system-ui detected as primary fontFamily', () => {
    const g = verdict.gates.find(g => g.name === 'C1-font');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violations contain a C1-font entry', () => {
    const v = verdict.violations.find(v => v.gate === 'C1-font');
    expect(v).toBeDefined();
    expect(v.file).toBe(THEME_PATH);
    expect(typeof v.line).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Fixture 3b: Inter primary font — C1-font advisory FAIL
//
// fontFamily: "Inter, Georgia, serif" — primary = "inter" (in BAD_FONT_PRIMARIES)
// Expected: C1-font pass=false, hardGatesPass=true.
// ---------------------------------------------------------------------------

const interFontFiles = [
  {
    path: SCENE_PATH,
    content: `const style = { fontFamily: "Inter, Georgia, serif" };`,
  },
];

describe('computeCodeCraftMetrics — C1-font advisory FAIL (Inter primary)', () => {
  const verdict = computeCodeCraftMetrics({ files: interFontFiles });

  it('hardGatesPass is true — C1-font is advisory, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('C1-font gate fails — Inter detected as primary fontFamily', () => {
    const g = verdict.gates.find(g => g.name === 'C1-font');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
  });

  it('violations contain a C1-font entry for Inter', () => {
    const v = verdict.violations.find(v => v.gate === 'C1-font');
    expect(v).toBeDefined();
    expect(v.file).toBe(SCENE_PATH);
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: raw hex in scene — C2-hex advisory FAIL (calibrated tier)
//
// Scene file contains '#ff3300' — raw hex outside theme.ts.
// C2 is advisory (not HARD) because the static scanner cannot distinguish
// intentional mock-UI values (traffic lights, browser chrome) from theme drift.
// Calibration: relay and granipa both contain raw hex for mock UI elements.
// theme.ts is the allowlisted home for palette hex — not scanned by C2.
// Expected: C2-hex pass=false, advisory=true, hardGatesPass=true.
// ---------------------------------------------------------------------------

const hexFiles = [
  {
    path: SCENE_PATH,
    content: `const buttonColor = '#ff3300';`,
  },
];

describe('computeCodeCraftMetrics — C2-hex advisory FAIL (raw hex in scene, calibrated tier)', () => {
  const verdict = computeCodeCraftMetrics({ files: hexFiles });

  it('hardGatesPass is true — C2-hex is advisory at calibrated tier, does not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('C2-hex gate fails — raw hex literal detected in scene file', () => {
    const g = verdict.gates.find(g => g.name === 'C2-hex');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violations contain a C2-hex entry with file, line, snippet', () => {
    const v = verdict.violations.find(v => v.gate === 'C2-hex');
    expect(v).toBeDefined();
    expect(v.file).toBe(SCENE_PATH);
    expect(typeof v.line).toBe('number');
    expect(typeof v.snippet).toBe('string');
  });

  it('theme.ts is allowlisted — C2-hex does not scan non-scene files', () => {
    const themeOnlyFiles = [{ path: THEME_PATH, content: `export const bg = '#0a0a0a';` }];
    const v2 = computeCodeCraftMetrics({ files: themeOnlyFiles });
    expect(v2.gates.find(g => g.name === 'C2-hex').pass).toBe(true);
    expect(v2.violations.filter(v => v.gate === 'C2-hex')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 5: Easing.linear / no-easing — C3-easing advisory FAIL
//
// Scene file has two C3-triggering patterns:
//   (a) interpolate(frame, [0,30], [0,100]) — no easing: option (C3a)
//   (b) { easing: Easing.linear }           — explicit linear easing (C3b)
// Both trip the advisory gate. hardGatesPass must NOT become false.
// ---------------------------------------------------------------------------

const easingFiles = [
  {
    path: SCENE_PATH,
    content: `
import { Easing, interpolate } from 'remotion';
const x = interpolate(frame, [0, 30], [0, 100]);
const y = interpolate(frame, [0, 30], [0, 200], { easing: Easing.linear });
`,
  },
];

describe('computeCodeCraftMetrics — C3-easing advisory FAIL (Easing.linear + no-easing interpolate)', () => {
  const verdict = computeCodeCraftMetrics({ files: easingFiles });

  it('hardGatesPass is true — C3-easing is advisory, does NOT set hardGatesPass=false', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('C3-easing gate fails — both Easing.linear and no-easing interpolate detected', () => {
    const g = verdict.gates.find(g => g.name === 'C3-easing');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('C3-easing violations include at least 2 entries (one C3a, one C3b)', () => {
    const vs = verdict.violations.filter(v => v.gate === 'C3-easing');
    expect(vs.length).toBeGreaterThanOrEqual(2);
  });

  it('C1-emoji, C1-font, C2-hex all pass (no cross-gate contamination)', () => {
    expect(verdict.gates.find(g => g.name === 'C1-emoji').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'C1-font').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'C2-hex').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Contract — metrics.json shape
//
// The output must match the ship-metrics.mjs consumption contract exactly:
//   { hardGatesPass: boolean, gates: [...], violations: [...] }
// gate fields:      name (string), advisory (boolean), pass (boolean), skip (boolean), detail (string)
// violation fields: gate (string), file (string), line (number), snippet (string)
// ---------------------------------------------------------------------------

describe('computeCodeCraftMetrics — contract (metrics.json shape)', () => {
  it('verdict has hardGatesPass (boolean), gates (array), violations (array)', () => {
    const verdict = computeCodeCraftMetrics({ files: cleanFiles });
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(Array.isArray(verdict.gates)).toBe(true);
    expect(Array.isArray(verdict.violations)).toBe(true);
  });

  it('gates array has exactly 4 entries', () => {
    const verdict = computeCodeCraftMetrics({ files: cleanFiles });
    expect(verdict.gates).toHaveLength(4);
  });

  it('gate names are C1-emoji, C1-font, C2-hex, C3-easing in order', () => {
    const verdict = computeCodeCraftMetrics({ files: cleanFiles });
    expect(verdict.gates.map(g => g.name)).toEqual(['C1-emoji', 'C1-font', 'C2-hex', 'C3-easing']);
  });

  it('each gate has name, advisory, pass, skip, detail fields of correct types', () => {
    const verdict = computeCodeCraftMetrics({ files: cleanFiles });
    for (const g of verdict.gates) {
      expect(typeof g.name).toBe('string');
      expect(typeof g.advisory).toBe('boolean');
      expect(typeof g.pass).toBe('boolean');
      expect(typeof g.skip).toBe('boolean');
      expect(typeof g.detail).toBe('string');
    }
  });

  it('each violation has gate, file, line, snippet fields of correct types', () => {
    const verdict = computeCodeCraftMetrics({ files: emojiFiles });
    expect(verdict.violations.length).toBeGreaterThan(0);
    for (const v of verdict.violations) {
      expect(typeof v.gate).toBe('string');
      expect(typeof v.file).toBe('string');
      expect(typeof v.line).toBe('number');
      expect(typeof v.snippet).toBe('string');
    }
  });

  it('hardGatesPass=true even when advisory gates fail (all 4 are advisory)', () => {
    const verdict = computeCodeCraftMetrics({ files: emojiFiles });
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('hardGatesPass=true and all gates skip=true when files=[]', () => {
    const verdict = computeCodeCraftMetrics({ files: [] });
    expect(verdict.hardGatesPass).toBe(true);
    expect(verdict.gates.every(g => g.skip)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Golden calibration — real relay + granipa sources yield hardGatesPass=true
//
// Reads the actual shipped example video sources and asserts no hard failures.
// These are the calibration guard: if a future regex change makes an example
// source trip a newly-upgraded HARD gate, this test breaks immediately.
// ---------------------------------------------------------------------------

function collectSlugFiles(slug) {
  const videoDir = join(PROJECT_ROOT, 'src', 'videos', slug);
  const scenesDir = join(videoDir, 'scenes');

  function walk(dir) {
    const results = [];
    function _walk(d) {
      let entries;
      try { entries = readdirSync(d, { withFileTypes: true }); }
      catch { return; }
      for (const e of entries) {
        const full = join(d, e.name);
        if (e.isDirectory()) _walk(full);
        else if (/\.(tsx?|jsx?)$/.test(e.name)) results.push(full);
      }
    }
    _walk(dir);
    return results;
  }

  const scenePaths = existsSync(scenesDir) ? walk(scenesDir) : [];
  const rootPaths = walk(videoDir).filter(p => !p.startsWith(scenesDir + '/'));

  return [...scenePaths, ...rootPaths].map(p => ({
    path: relative(PROJECT_ROOT, p),
    content: readFileSync(p, 'utf8'),
  }));
}

describe('computeCodeCraftMetrics — golden calibration (relay source)', () => {
  const files = collectSlugFiles('relay');
  const verdict = computeCodeCraftMetrics({ files });

  it('relay: hardGatesPass=true (calibration guard)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('relay: source files found and scanned', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('relay: 4 gates returned', () => {
    expect(verdict.gates).toHaveLength(4);
  });

  it('relay: all gates are advisory', () => {
    expect(verdict.gates.every(g => g.advisory)).toBe(true);
  });
});

describe('computeCodeCraftMetrics — golden calibration (granipa source)', () => {
  const files = collectSlugFiles('granipa');
  const verdict = computeCodeCraftMetrics({ files });

  it('granipa: hardGatesPass=true (calibration guard)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('granipa: source files found and scanned', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('granipa: 4 gates returned', () => {
    expect(verdict.gates).toHaveLength(4);
  });

  it('granipa: all gates are advisory', () => {
    expect(verdict.gates.every(g => g.advisory)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Divergent-shape fixture: light-palette/restrained scene
//
// Uses theme token references (no raw hex), a custom display font (Playfair
// Display — not in BAD_FONT_PRIMARIES), Remotion's <Img>, and no springs or
// interpolate calls. All 4 gates are advisory by design → hardGatesPass is
// always true for any code shape. Confirms light-palette restrained style
// is not false-blocked.
// Result: robust, zero mis-fires.
// ---------------------------------------------------------------------------

const lightPaletteFiles = [
  {
    path: 'src/videos/sereno/scenes/AuraBloom.tsx',
    content: `
import { Img } from 'remotion';
export function AuraBloom({ opacity }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: theme.bg,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Playfair Display, Georgia, serif',
      }}
    >
      <Img src={staticFile('sereno/bloom.png')} style={{ width: '60%' }} />
      <p style={{ color: theme.text }}>Focus starts here.</p>
    </div>
  );
}
`,
  },
];

describe('computeCodeCraftMetrics — divergent: light-palette restrained scene (all advisory, hardGatesPass=true)', () => {
  const verdict = computeCodeCraftMetrics({ files: lightPaletteFiles });

  it('hardGatesPass is true — all 4 gates are advisory by design', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('C1-emoji passes — no emoji in light-palette scene', () => {
    expect(verdict.gates.find(g => g.name === 'C1-emoji').pass).toBe(true);
  });

  it('C1-font passes — Playfair Display is not a bad system font primary', () => {
    expect(verdict.gates.find(g => g.name === 'C1-font').pass).toBe(true);
  });

  it('C2-hex passes — no raw hex literals in scene (uses theme.bg/theme.text tokens)', () => {
    expect(verdict.gates.find(g => g.name === 'C2-hex').pass).toBe(true);
  });

  it('C3-easing passes — no interpolate or Easing.linear calls in restrained scene', () => {
    expect(verdict.gates.find(g => g.name === 'C3-easing').pass).toBe(true);
  });
});
