/**
 * Unit tests for computePreflightVerdict.
 *
 * Fixtures cover:
 *   P1 (HARD): composition registered with correct width/height/fps/durationInFrames
 *   P2 (HARD): required files present
 *   P3 (advisory): treatment.md Status: APPROVED / DRAFT / absent
 *   P4 (advisory): theme tokens / MANIFEST.md / storyboard status table
 *
 * Golden calibration:
 *   real relay source  → hardGatesPass:true
 *   real granipa source → hardGatesPass:true
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePreflightVerdict } from './preflight-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ── Fixture helpers ──────────────────────────────────────────────────────────

/** Minimal valid Root.tsx content for a given CompId. */
function makeRootTsx(compId, opts = {}) {
  const {
    width = 1920,
    height = 1080,
    fps = `${compId.toLowerCase()}Timeline.fps`,
    duration = `${compId.toLowerCase()}Timeline.totalDurationInFrames`,
  } = opts;
  const fpsExpr = fps === 30 ? '{30}' : `{${fps}}`;
  const durExpr = /^\d+$/.test(String(duration)) ? `{${duration}}` : `{${duration}}`;
  return `
import { Composition } from "remotion";
import { ${compId} } from "./videos/test/Main";
import { ${compId.toLowerCase()}Timeline } from "./videos/test/timeline";
export const RemotionRoot = () => (
  <>
    <Composition
      id="${compId}"
      component={${compId}}
      durationInFrames=${durExpr}
      fps=${fpsExpr}
      width={${width}}
      height={${height}}
      defaultProps={{ debug: false }}
    />
  </>
);
`;
}

const TREATMENT_APPROVED = `# Treatment\n\n## Status: APPROVED\n`;
const TREATMENT_DRAFT    = `# Treatment\n\n## Status: DRAFT\n`;
const TREATMENT_NONE     = `# Treatment\n\nNo status marker here.\n`;

const TIMELINE_WITH_PROMISE    = `export const t = buildTimeline({ fps: 30, bpm: 120 }, [{ id: "hook", beats: 10, promise: { text: "Done." } }] as const);`;
const TIMELINE_WITHOUT_PROMISE = `export const t = buildTimeline({ fps: 30, bpm: 120 }, [{ id: "hook", beats: 10 }] as const);`;

const STORYBOARD_WITH_TABLE = `# Storyboard\n\n## Scene status\n\n| # | scene | status |\n|---|-------|--------|\n| 1 | hook  | done   |\n`;
const STORYBOARD_NO_TABLE   = `# Storyboard\n\nNo status table here.\n`;

const THEME_FULL = `
export const myTheme = defineTheme({
  palette: {
    bg: "#000",
    surface: "#111",
    text: "#fff",
    textDim: "#888",
    accent: "#f00",
  },
});
`;

const THEME_MISSING_TOKEN = `
export const myTheme = defineTheme({
  palette: {
    bg: "#000",
    surface: "#111",
    text: "#fff",
    // textDim and accent are missing
  },
});
`;

/** Build a full passing opts object. */
function passingOpts(compId = 'TestComp') {
  return {
    compId,
    rootTsxContent:    makeRootTsx(compId),
    treatmentContent:  TREATMENT_APPROVED,
    storyboardContent: STORYBOARD_WITH_TABLE,
    themeContent:      THEME_FULL,
    timelineExists:    true,
    timelineContent:   TIMELINE_WITH_PROMISE,
    mainExists:        true,
    scenesNonEmpty:    true,
    manifestExists:    true,
  };
}

// ── Contract ─────────────────────────────────────────────────────────────────

describe('computePreflightVerdict — contract (metrics.json shape)', () => {
  const verdict = computePreflightVerdict(passingOpts());

  it('has hardGatesPass boolean and gates array', () => {
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(Array.isArray(verdict.gates)).toBe(true);
  });

  it('has exactly 5 gates', () => {
    expect(verdict.gates).toHaveLength(5);
  });

  it('gate names are P1-registration, P2-files, P3-approved, P4-metadata, P5-promise in order', () => {
    expect(verdict.gates.map(g => g.name)).toEqual([
      'P1-registration',
      'P2-files',
      'P3-approved',
      'P4-metadata',
      'P5-promise',
    ]);
  });

  it('each gate has name, advisory, pass, skip, detail of correct types', () => {
    for (const g of verdict.gates) {
      expect(typeof g.name).toBe('string');
      expect(typeof g.advisory).toBe('boolean');
      expect(typeof g.pass).toBe('boolean');
      expect(typeof g.skip).toBe('boolean');
      expect(typeof g.detail).toBe('string');
    }
  });

  it('P1 and P2 are hard gates (advisory:false)', () => {
    expect(verdict.gates.find(g => g.name === 'P1-registration').advisory).toBe(false);
    expect(verdict.gates.find(g => g.name === 'P2-files').advisory).toBe(false);
  });

  it('P3, P4, and P5 are advisory gates (advisory:true)', () => {
    expect(verdict.gates.find(g => g.name === 'P3-approved').advisory).toBe(true);
    expect(verdict.gates.find(g => g.name === 'P4-metadata').advisory).toBe(true);
    expect(verdict.gates.find(g => g.name === 'P5-promise').advisory).toBe(true);
  });
});

// ── All pass ─────────────────────────────────────────────────────────────────

describe('computePreflightVerdict — all gates pass', () => {
  const verdict = computePreflightVerdict(passingOpts());

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 5 gates pass', () => {
    expect(verdict.gates.every(g => g.pass)).toBe(true);
  });
});

// ── P1: composition registration ─────────────────────────────────────────────

describe('computePreflightVerdict — P1 HARD FAIL: CompId not in Root.tsx', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: '<Composition id="OtherComp" fps={30} width={1920} height={1080} durationInFrames={timeline.totalDurationInFrames} />',
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P1-registration fails', () => {
    const g = verdict.gates.find(g => g.name === 'P1-registration');
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(false);
    expect(g.detail).toMatch(/not registered/);
  });

  it('P2 still passes (independent gate)', () => {
    expect(verdict.gates.find(g => g.name === 'P2-files').pass).toBe(true);
  });
});

describe('computePreflightVerdict — P1 HARD FAIL: wrong width', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: makeRootTsx('TestComp', { width: 1280 }),
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P1-registration fails with width message', () => {
    const g = verdict.gates.find(g => g.name === 'P1-registration');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/width must be 1920/);
  });
});

describe('computePreflightVerdict — P1 HARD FAIL: wrong height', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: makeRootTsx('TestComp', { height: 720 }),
  });

  it('P1-registration fails with height message', () => {
    const g = verdict.gates.find(g => g.name === 'P1-registration');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/height must be 1080/);
  });
});

describe('computePreflightVerdict — P1 HARD FAIL: hardcoded durationInFrames integer', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: makeRootTsx('TestComp', { duration: '960' }),
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P1-registration fails — hardcoded durationInFrames', () => {
    const g = verdict.gates.find(g => g.name === 'P1-registration');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/hardcoded integer/);
  });
});

describe('computePreflightVerdict — P1 HARD FAIL: fps not 30 and not .fps binding', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: makeRootTsx('TestComp', { fps: '24' }),
  });

  it('P1-registration fails — fps is 24 (not 30)', () => {
    const g = verdict.gates.find(g => g.name === 'P1-registration');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/fps must be 30/);
  });
});

describe('computePreflightVerdict — P1 PASS: fps={30} literal', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: makeRootTsx('TestComp', { fps: 30 }),
  });

  it('P1-registration passes with literal fps={30}', () => {
    expect(verdict.gates.find(g => g.name === 'P1-registration').pass).toBe(true);
  });
});

describe('computePreflightVerdict — P1 PASS: fps bound to timeline.fps', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: makeRootTsx('TestComp', { fps: 'testcompTimeline.fps' }),
  });

  it('P1-registration passes when fps references .fps property', () => {
    expect(verdict.gates.find(g => g.name === 'P1-registration').pass).toBe(true);
  });
});

describe('computePreflightVerdict — P1 HARD FAIL: rootTsxContent is null', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    rootTsxContent: null,
  });

  it('hardGatesPass is false when Root.tsx is absent', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P1-registration fails with Root.tsx not found message', () => {
    const g = verdict.gates.find(g => g.name === 'P1-registration');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/Root\.tsx not found/);
  });
});

// ── P2: required files ───────────────────────────────────────────────────────

describe('computePreflightVerdict — P2 HARD FAIL: treatment.md missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), treatmentContent: null });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P2-files fails and mentions treatment.md', () => {
    const g = verdict.gates.find(g => g.name === 'P2-files');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/treatment\.md/);
  });
});

describe('computePreflightVerdict — P2 HARD FAIL: storyboard.md missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), storyboardContent: null });

  it('P2-files fails and mentions storyboard.md', () => {
    const g = verdict.gates.find(g => g.name === 'P2-files');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/storyboard\.md/);
  });
});

describe('computePreflightVerdict — P2 HARD FAIL: theme.ts missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), themeContent: null });

  it('P2-files fails and mentions theme.ts', () => {
    const g = verdict.gates.find(g => g.name === 'P2-files');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/theme\.ts/);
  });
});

describe('computePreflightVerdict — P2 HARD FAIL: timeline.ts missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), timelineExists: false });

  it('P2-files fails and mentions timeline.ts', () => {
    const g = verdict.gates.find(g => g.name === 'P2-files');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/timeline\.ts/);
  });
});

describe('computePreflightVerdict — P2 HARD FAIL: Main.tsx missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), mainExists: false });

  it('P2-files fails and mentions Main.tsx', () => {
    const g = verdict.gates.find(g => g.name === 'P2-files');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/Main\.tsx/);
  });
});

describe('computePreflightVerdict — P2 HARD FAIL: scenes/ empty', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), scenesNonEmpty: false });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P2-files fails and mentions scenes/', () => {
    const g = verdict.gates.find(g => g.name === 'P2-files');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/scenes\//);
  });
});

// ── P3: treatment approval ────────────────────────────────────────────────────

describe('computePreflightVerdict — P3 PASS: Status: APPROVED', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), treatmentContent: TREATMENT_APPROVED });

  it('hardGatesPass true (P3 advisory)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P3-approved passes', () => {
    expect(verdict.gates.find(g => g.name === 'P3-approved').pass).toBe(true);
  });
});

describe('computePreflightVerdict — P3 advisory FAIL: Status: DRAFT', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), treatmentContent: TREATMENT_DRAFT });

  it('hardGatesPass is still true — P3 is advisory, does NOT block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P3-approved fails with DRAFT message', () => {
    const g = verdict.gates.find(g => g.name === 'P3-approved');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/DRAFT/);
  });
});

describe('computePreflightVerdict — P3 advisory FAIL: no status marker', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), treatmentContent: TREATMENT_NONE });

  it('hardGatesPass is still true — P3 advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P3-approved fails with no-marker message', () => {
    const g = verdict.gates.find(g => g.name === 'P3-approved');
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(true);
  });
});

// ── P4: metadata checks ───────────────────────────────────────────────────────

describe('computePreflightVerdict — P4 PASS: all metadata present', () => {
  const verdict = computePreflightVerdict(passingOpts());

  it('P4-metadata passes', () => {
    expect(verdict.gates.find(g => g.name === 'P4-metadata').pass).toBe(true);
  });
});

describe('computePreflightVerdict — P4 advisory FAIL: theme token missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), themeContent: THEME_MISSING_TOKEN });

  it('hardGatesPass is true — P4 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P4-metadata fails and mentions missing tokens', () => {
    const g = verdict.gates.find(g => g.name === 'P4-metadata');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/missing palette tokens/);
  });
});

describe('computePreflightVerdict — P4 advisory FAIL: MANIFEST.md missing', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), manifestExists: false });

  it('hardGatesPass is true — P4 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P4-metadata fails and mentions MANIFEST.md', () => {
    const g = verdict.gates.find(g => g.name === 'P4-metadata');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/MANIFEST\.md/);
  });
});

describe('computePreflightVerdict — P4 advisory FAIL: storyboard missing status table', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), storyboardContent: STORYBOARD_NO_TABLE });

  it('hardGatesPass is true — P4 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P4-metadata fails and mentions status table', () => {
    const g = verdict.gates.find(g => g.name === 'P4-metadata');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/status table/);
  });
});

// ── P5: promise declaration ───────────────────────────────────────────────────

describe('computePreflightVerdict — P5 PASS: timeline.ts has promise field', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), timelineContent: TIMELINE_WITH_PROMISE });

  it('hardGatesPass is true (P5 advisory)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P5-promise passes', () => {
    expect(verdict.gates.find(g => g.name === 'P5-promise').pass).toBe(true);
  });
});

describe('computePreflightVerdict — P5 advisory FAIL: no promise in timeline.ts', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), timelineContent: TIMELINE_WITHOUT_PROMISE });

  it('hardGatesPass is still true — P5 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P5-promise fails with missing-declaration message', () => {
    const g = verdict.gates.find(g => g.name === 'P5-promise');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/promise declaration/);
  });
});

describe('computePreflightVerdict — P5 advisory FAIL: timelineContent null', () => {
  const verdict = computePreflightVerdict({ ...passingOpts(), timelineContent: null });

  it('hardGatesPass is still true — P5 is advisory', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P5-promise fails with absent message', () => {
    const g = verdict.gates.find(g => g.name === 'P5-promise');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/absent/);
  });
});

// ── HARD gates block, advisory do not ────────────────────────────────────────

describe('computePreflightVerdict — advisory failures do not block', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    treatmentContent:  TREATMENT_DRAFT,      // P3 advisory fail
    manifestExists:    false,                // P4 advisory fail
    timelineContent:   TIMELINE_WITHOUT_PROMISE, // P5 advisory fail
  });

  it('hardGatesPass is true even with advisory failures', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P3 fails (advisory)', () => {
    expect(verdict.gates.find(g => g.name === 'P3-approved').pass).toBe(false);
  });

  it('P4 fails (advisory)', () => {
    expect(verdict.gates.find(g => g.name === 'P4-metadata').pass).toBe(false);
  });

  it('P5 fails (advisory)', () => {
    expect(verdict.gates.find(g => g.name === 'P5-promise').pass).toBe(false);
  });
});

describe('computePreflightVerdict — HARD fail blocks even when advisory pass', () => {
  const verdict = computePreflightVerdict({
    ...passingOpts(),
    mainExists: false,  // P2 HARD fail
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });
});

// ── Golden calibration ────────────────────────────────────────────────────────

function loadSlugOpts(compId, slug) {
  const videoDir  = join(PROJECT_ROOT, 'src', 'videos', slug);
  const rootPath  = join(PROJECT_ROOT, 'src', 'Root.tsx');
  const scenesDir = join(videoDir, 'scenes');

  const read = p => (existsSync(p) ? readFileSync(p, 'utf8') : null);

  const rootTsxContent    = read(rootPath);
  const treatmentContent  = read(join(videoDir, 'treatment.md'));
  const storyboardContent = read(join(videoDir, 'storyboard.md'));
  const themeContent      = read(join(videoDir, 'theme.ts'));
  const timelineExists    = existsSync(join(videoDir, 'timeline.ts'));
  const timelineContent   = read(join(videoDir, 'timeline.ts'));
  const mainExists        = existsSync(join(videoDir, 'Main.tsx'));
  const scenesNonEmpty    = existsSync(scenesDir) &&
    readdirSync(scenesDir).some(f => !f.startsWith('.'));
  const manifestExists    = existsSync(join(PROJECT_ROOT, 'public', slug, 'MANIFEST.md'));

  return { compId, rootTsxContent, treatmentContent, storyboardContent, themeContent,
           timelineExists, timelineContent, mainExists, scenesNonEmpty, manifestExists };
}

describe('computePreflightVerdict — golden calibration (relay)', () => {
  const verdict = computePreflightVerdict(loadSlugOpts('RelayLaunch', 'relay'));

  it('relay: hardGatesPass=true (P1+P2 must pass)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('relay: P1-registration passes', () => {
    expect(verdict.gates.find(g => g.name === 'P1-registration').pass).toBe(true);
  });

  it('relay: P2-files passes', () => {
    expect(verdict.gates.find(g => g.name === 'P2-files').pass).toBe(true);
  });

  it('relay: P5-promise passes (promise declared in timeline.ts)', () => {
    expect(verdict.gates.find(g => g.name === 'P5-promise').pass).toBe(true);
  });

  it('relay: 5 gates returned', () => {
    expect(verdict.gates).toHaveLength(5);
  });
});

describe('computePreflightVerdict — golden calibration (granipa)', () => {
  const verdict = computePreflightVerdict(loadSlugOpts('GranipaLaunch', 'granipa'));

  it('granipa: hardGatesPass=true (P1+P2 must pass)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('granipa: P1-registration passes', () => {
    expect(verdict.gates.find(g => g.name === 'P1-registration').pass).toBe(true);
  });

  it('granipa: P2-files passes', () => {
    expect(verdict.gates.find(g => g.name === 'P2-files').pass).toBe(true);
  });

  it('granipa: P5-promise passes (promise declared in timeline.ts)', () => {
    expect(verdict.gates.find(g => g.name === 'P5-promise').pass).toBe(true);
  });

  it('granipa: 5 gates returned', () => {
    expect(verdict.gates).toHaveLength(5);
  });
});
