/**
 * Unit tests for computeRemotionCorrectMetrics.
 *
 * Fixtures:
 *   cleanFiles        — all 5 gates PASS (no violations)
 *   r1RandomFiles     — R1-determinism HARD FAIL (Math.random())
 *   r1DateNowFiles    — R1-determinism HARD FAIL (Date.now())
 *   r1NewDateFiles    — R1-determinism HARD FAIL (new Date())
 *   r1PerfNowFiles    — R1-determinism HARD FAIL (performance.now())
 *   r2ImgFiles        — R2-media HARD FAIL (raw <img>)
 *   r2VideoFiles      — R2-media HARD FAIL (raw <video>)
 *   r2AudioFiles      — R2-media HARD FAIL (raw <audio>)
 *   r3Files           — R3-interpolate-clamp advisory FAIL
 *   r4Files           — R4-spring-fps advisory FAIL
 *   r5Files           — R5-wallclock advisory FAIL
 *   skipFiles         — empty array → all gates SKIP
 *
 * R1/R2 are HARD → hardGatesPass:false when they fail.
 * R3/R4/R5 are advisory → hardGatesPass:true even when they fail.
 *
 * Golden calibration:
 *   real relay source  → hardGatesPass:true
 *   real granipa source → hardGatesPass:true
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRemotionCorrectMetrics } from './remotion-correct-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SCENE_PATH = 'src/videos/testslug/scenes/Test.tsx';
const THEME_PATH = 'src/videos/testslug/theme.ts';

// ---------------------------------------------------------------------------
// Fixture 1: clean scene — all 5 gates PASS
// ---------------------------------------------------------------------------

const cleanFiles = [
  {
    path: SCENE_PATH,
    content: `
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Img } from 'remotion';
export function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  return <Img src="hero.png" style={{ opacity, transform: \`scale(\${scale})\` }} />;
}
`,
  },
];

describe('computeRemotionCorrectMetrics — clean scene (all gates pass)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 5 gates pass', () => {
    expect(verdict.gates.every(g => g.pass)).toBe(true);
  });

  it('no violations', () => {
    expect(verdict.violations).toHaveLength(0);
  });

  it('R1-determinism passes — no nondeterministic calls', () => {
    const g = verdict.gates.find(g => g.name === 'R1-determinism');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.advisory).toBe(false);
  });

  it('R2-media passes — no raw media tags', () => {
    const g = verdict.gates.find(g => g.name === 'R2-media');
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(false);
  });

  it('R3-interpolate-clamp passes — explicit clamp options present', () => {
    const g = verdict.gates.find(g => g.name === 'R3-interpolate-clamp');
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
  });

  it('R4-spring-fps passes — fps in spring options', () => {
    const g = verdict.gates.find(g => g.name === 'R4-spring-fps');
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
  });

  it('R5-wallclock passes — no wallclock APIs', () => {
    const g = verdict.gates.find(g => g.name === 'R5-wallclock');
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2a: R1 HARD FAIL — Math.random()
// hardGatesPass must become false.
// ---------------------------------------------------------------------------

const r1RandomFiles = [
  {
    path: SCENE_PATH,
    content: `const noise = Math.random();`,
  },
];

describe('computeRemotionCorrectMetrics — R1 HARD FAIL (Math.random)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1RandomFiles });

  it('hardGatesPass is false — Math.random() is a HARD R1 violation', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('R1-determinism gate fails', () => {
    const g = verdict.gates.find(g => g.name === 'R1-determinism');
    expect(g.advisory).toBe(false);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violation has correct gate/file/line/snippet', () => {
    const v = verdict.violations.find(v => v.gate === 'R1-determinism');
    expect(v).toBeDefined();
    expect(v.file).toBe(SCENE_PATH);
    expect(typeof v.line).toBe('number');
    expect(typeof v.snippet).toBe('string');
  });

  it('R2/R3/R4/R5 all pass (no cross-gate contamination)', () => {
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R3-interpolate-clamp').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R4-spring-fps').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R5-wallclock').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2b: R1 HARD FAIL — Date.now()
// ---------------------------------------------------------------------------

const r1DateNowFiles = [
  {
    path: SCENE_PATH,
    content: `const ts = Date.now();`,
  },
];

describe('computeRemotionCorrectMetrics — R1 HARD FAIL (Date.now)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1DateNowFiles });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('R1-determinism gate fails', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(false);
  });

  it('violation for Date.now()', () => {
    const v = verdict.violations.find(v => v.gate === 'R1-determinism');
    expect(v).toBeDefined();
    expect(v.snippet).toContain('Date.now');
  });
});

// ---------------------------------------------------------------------------
// Fixture 2c: R1 HARD FAIL — new Date() (argless)
// new Date(someArg) must NOT be flagged.
// ---------------------------------------------------------------------------

const r1NewDateFiles = [
  {
    path: SCENE_PATH,
    content: `const now = new Date();`,
  },
];

const r1NewDateWithArgFiles = [
  {
    path: SCENE_PATH,
    content: `const d = new Date('2026-01-01');`,
  },
];

describe('computeRemotionCorrectMetrics — R1 HARD FAIL (new Date argless)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1NewDateFiles });

  it('hardGatesPass is false — new Date() is HARD R1', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('R1-determinism gate fails', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(false);
  });
});

describe('computeRemotionCorrectMetrics — R1 PASS: new Date(arg) is not flagged', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1NewDateWithArgFiles });

  it('hardGatesPass is true — new Date(arg) is not flagged', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('R1-determinism passes', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2d: R1 HARD FAIL — performance.now()
// ---------------------------------------------------------------------------

const r1PerfNowFiles = [
  {
    path: SCENE_PATH,
    content: `const t = performance.now();`,
  },
];

describe('computeRemotionCorrectMetrics — R1 HARD FAIL (performance.now)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1PerfNowFiles });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('violation for performance.now()', () => {
    const v = verdict.violations.find(v => v.gate === 'R1-determinism');
    expect(v).toBeDefined();
    expect(v.snippet).toContain('performance.now');
  });
});

// ---------------------------------------------------------------------------
// Fixture 3a: R2 HARD FAIL — raw <img>
// ---------------------------------------------------------------------------

const r2ImgFiles = [
  {
    path: SCENE_PATH,
    content: `return <img src="photo.jpg" alt="hero" />;`,
  },
];

describe('computeRemotionCorrectMetrics — R2 HARD FAIL (raw <img>)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r2ImgFiles });

  it('hardGatesPass is false — raw <img> is a HARD R2 violation', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('R2-media gate fails', () => {
    const g = verdict.gates.find(g => g.name === 'R2-media');
    expect(g.advisory).toBe(false);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violation has gate=R2-media with file/line/snippet', () => {
    const v = verdict.violations.find(v => v.gate === 'R2-media');
    expect(v).toBeDefined();
    expect(v.file).toBe(SCENE_PATH);
    expect(v.snippet).toContain('<img');
  });

  it('R1/R3/R4/R5 all pass', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R3-interpolate-clamp').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R4-spring-fps').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R5-wallclock').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3b: R2 HARD FAIL — raw <video>
// ---------------------------------------------------------------------------

const r2VideoFiles = [
  {
    path: SCENE_PATH,
    content: `return <video src="clip.mp4" autoPlay />;`,
  },
];

describe('computeRemotionCorrectMetrics — R2 HARD FAIL (raw <video>)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r2VideoFiles });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('R2-media gate fails with <video>', () => {
    const v = verdict.violations.find(v => v.gate === 'R2-media');
    expect(v).toBeDefined();
    expect(v.snippet).toContain('<video');
  });
});

// ---------------------------------------------------------------------------
// Fixture 3c: R2 HARD FAIL — raw <audio>
// ---------------------------------------------------------------------------

const r2AudioFiles = [
  {
    path: SCENE_PATH,
    content: `return <audio src="track.mp3" />;`,
  },
];

describe('computeRemotionCorrectMetrics — R2 HARD FAIL (raw <audio>)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r2AudioFiles });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('R2-media violation contains <audio', () => {
    const v = verdict.violations.find(v => v.gate === 'R2-media');
    expect(v).toBeDefined();
    expect(v.snippet).toContain('<audio');
  });
});

// ---------------------------------------------------------------------------
// Fixture 3d: R2 PASS — Remotion's <Img> and <Video> and <Audio> are allowed
// ---------------------------------------------------------------------------

const r2RemotionTagsFiles = [
  {
    path: SCENE_PATH,
    content: `
import { Img, Video, Audio } from 'remotion';
return (
  <>
    <Img src="photo.jpg" />
    <Video src="clip.mp4" />
    <Audio src="track.mp3" />
  </>
);
`,
  },
];

describe('computeRemotionCorrectMetrics — R2 PASS (Remotion Img/Video/Audio)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r2RemotionTagsFiles });

  it('hardGatesPass is true — uppercase tags are not flagged', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('R2-media passes', () => {
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: R3 advisory FAIL — interpolate() without clamp options
// hardGatesPass must remain true (advisory only).
// ---------------------------------------------------------------------------

const r3Files = [
  {
    path: SCENE_PATH,
    content: `
import { interpolate, useCurrentFrame } from 'remotion';
const frame = useCurrentFrame();
const x = interpolate(frame, [0, 30], [0, 100]);
const y = interpolate(frame, [0, 30], [100, 200], { easing: t => t * t });
`,
  },
];

describe('computeRemotionCorrectMetrics — R3 advisory FAIL (interpolate without clamp)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r3Files });

  it('hardGatesPass is true — R3 is advisory, does NOT block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('R3-interpolate-clamp gate fails', () => {
    const g = verdict.gates.find(g => g.name === 'R3-interpolate-clamp');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violations contain R3-interpolate-clamp entries', () => {
    const vs = verdict.violations.filter(v => v.gate === 'R3-interpolate-clamp');
    expect(vs.length).toBeGreaterThanOrEqual(2);
  });

  it('R1/R2 both pass (no cross-gate contamination)', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
  });
});

// R3 PASS: explicit extrapolateLeft + extrapolateRight in the call.
const r3PassFiles = [
  {
    path: SCENE_PATH,
    content: `
const x = interpolate(frame, [0, 30], [0, 100], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
`,
  },
];

describe('computeRemotionCorrectMetrics — R3 PASS (explicit clamp in options)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r3PassFiles });

  it('R3-interpolate-clamp passes when extrapolateLeft/Right are explicit', () => {
    expect(verdict.gates.find(g => g.name === 'R3-interpolate-clamp').pass).toBe(true);
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 5: R4 advisory FAIL — spring() without fps
// hardGatesPass must remain true (advisory only).
// ---------------------------------------------------------------------------

const r4Files = [
  {
    path: SCENE_PATH,
    content: `
import { spring, useCurrentFrame } from 'remotion';
const frame = useCurrentFrame();
const scale = spring({ frame, config: { damping: 200 }, durationInFrames: 30 });
`,
  },
];

describe('computeRemotionCorrectMetrics — R4 advisory FAIL (spring without fps)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r4Files });

  it('hardGatesPass is true — R4 is advisory, does NOT block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('R4-spring-fps gate fails', () => {
    const g = verdict.gates.find(g => g.name === 'R4-spring-fps');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violation has gate=R4-spring-fps', () => {
    const v = verdict.violations.find(v => v.gate === 'R4-spring-fps');
    expect(v).toBeDefined();
    expect(v.file).toBe(SCENE_PATH);
  });

  it('R1/R2 both pass', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
  });
});

// R4 PASS: fps is present in spring() options.
const r4PassFiles = [
  {
    path: SCENE_PATH,
    content: `const s = spring({ frame, fps, config: {}, durationInFrames: 20 });`,
  },
];

describe('computeRemotionCorrectMetrics — R4 PASS (fps present in spring options)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r4PassFiles });

  it('R4-spring-fps passes when fps is in the call', () => {
    expect(verdict.gates.find(g => g.name === 'R4-spring-fps').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 6: R5 advisory FAIL — setTimeout / useEffect in scene code
// hardGatesPass must remain true (advisory only).
// ---------------------------------------------------------------------------

const r5Files = [
  {
    path: SCENE_PATH,
    content: `
import { useEffect, useState } from 'react';
export function Scene() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setTick(t => t + 1), 100);
    return () => clearTimeout(id);
  }, [tick]);
  return <div>{tick}</div>;
}
`,
  },
];

describe('computeRemotionCorrectMetrics — R5 advisory FAIL (wallclock APIs in scene)', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r5Files });

  it('hardGatesPass is true — R5 is advisory, does NOT block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('R5-wallclock gate fails', () => {
    const g = verdict.gates.find(g => g.name === 'R5-wallclock');
    expect(g.advisory).toBe(true);
    expect(g.pass).toBe(false);
    expect(g.skip).toBe(false);
  });

  it('violations contain R5-wallclock entries', () => {
    const vs = verdict.violations.filter(v => v.gate === 'R5-wallclock');
    expect(vs.length).toBeGreaterThanOrEqual(1);
  });

  it('R1/R2 both pass', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 7: HARD FAIL — both R1 and R2 in same file
// ---------------------------------------------------------------------------

const r1AndR2Files = [
  {
    path: SCENE_PATH,
    content: `
const n = Math.random();
return <img src="x.jpg" />;
`,
  },
];

describe('computeRemotionCorrectMetrics — HARD FAIL: R1 + R2 simultaneously', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1AndR2Files });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('both R1 and R2 gates fail', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(false);
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(false);
  });

  it('violations contain entries for both gates', () => {
    expect(verdict.violations.find(v => v.gate === 'R1-determinism')).toBeDefined();
    expect(verdict.violations.find(v => v.gate === 'R2-media')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// R1 PASS: Math.random in a comment line must NOT be flagged.
// ---------------------------------------------------------------------------

const r1CommentFiles = [
  {
    path: SCENE_PATH,
    content: `
// const noise = Math.random(); // <- do not use this
const deterministic = 0.5;
`,
  },
];

describe('computeRemotionCorrectMetrics — R1 PASS: Math.random in comment is ignored', () => {
  const verdict = computeRemotionCorrectMetrics({ files: r1CommentFiles });

  it('hardGatesPass is true — comment lines are excluded', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('R1-determinism passes', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Contract — metrics.json shape
// ---------------------------------------------------------------------------

describe('computeRemotionCorrectMetrics — contract (metrics.json shape)', () => {
  it('verdict has hardGatesPass (boolean), gates (array), violations (array)', () => {
    const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(Array.isArray(verdict.gates)).toBe(true);
    expect(Array.isArray(verdict.violations)).toBe(true);
  });

  it('gates array has exactly 5 entries', () => {
    const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });
    expect(verdict.gates).toHaveLength(5);
  });

  it('gate names are R1-determinism, R2-media, R3-interpolate-clamp, R4-spring-fps, R5-wallclock in order', () => {
    const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });
    expect(verdict.gates.map(g => g.name)).toEqual([
      'R1-determinism',
      'R2-media',
      'R3-interpolate-clamp',
      'R4-spring-fps',
      'R5-wallclock',
    ]);
  });

  it('each gate has name, advisory, pass, skip, detail fields of correct types', () => {
    const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });
    for (const g of verdict.gates) {
      expect(typeof g.name).toBe('string');
      expect(typeof g.advisory).toBe('boolean');
      expect(typeof g.pass).toBe('boolean');
      expect(typeof g.skip).toBe('boolean');
      expect(typeof g.detail).toBe('string');
    }
  });

  it('R1 and R2 are hard gates (advisory:false)', () => {
    const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });
    expect(verdict.gates.find(g => g.name === 'R1-determinism').advisory).toBe(false);
    expect(verdict.gates.find(g => g.name === 'R2-media').advisory).toBe(false);
  });

  it('R3, R4, R5 are advisory gates (advisory:true)', () => {
    const verdict = computeRemotionCorrectMetrics({ files: cleanFiles });
    expect(verdict.gates.find(g => g.name === 'R3-interpolate-clamp').advisory).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R4-spring-fps').advisory).toBe(true);
    expect(verdict.gates.find(g => g.name === 'R5-wallclock').advisory).toBe(true);
  });

  it('each violation has gate, file, line, snippet fields of correct types', () => {
    const verdict = computeRemotionCorrectMetrics({ files: r1RandomFiles });
    expect(verdict.violations.length).toBeGreaterThan(0);
    for (const v of verdict.violations) {
      expect(typeof v.gate).toBe('string');
      expect(typeof v.file).toBe('string');
      expect(typeof v.line).toBe('number');
      expect(typeof v.snippet).toBe('string');
    }
  });

  it('hardGatesPass=true and all gates skip=true when files=[]', () => {
    const verdict = computeRemotionCorrectMetrics({ files: [] });
    expect(verdict.hardGatesPass).toBe(true);
    expect(verdict.gates.every(g => g.skip)).toBe(true);
    expect(verdict.violations).toHaveLength(0);
  });

  it('hardGatesPass=false when any non-advisory gate fails', () => {
    const verdict = computeRemotionCorrectMetrics({ files: r1RandomFiles });
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('hardGatesPass=true even when advisory gates fail', () => {
    const verdict = computeRemotionCorrectMetrics({ files: r3Files });
    expect(verdict.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Golden calibration — real relay + granipa sources yield hardGatesPass:true
//
// R1 and R2 are confirmed zero in both videos (grep'd during gate design).
// Advisory failures (R3/R4/R5) are expected for named CLAMP refs and do not
// affect hardGatesPass.
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
  const ROOT_TARGETS = ['theme.ts', 'Main.tsx'];
  const rootPaths = ROOT_TARGETS
    .map(name => join(videoDir, name))
    .filter(p => existsSync(p));

  return [...scenePaths, ...rootPaths].map(p => ({
    path: relative(PROJECT_ROOT, p),
    content: readFileSync(p, 'utf8'),
  }));
}

describe('computeRemotionCorrectMetrics — golden calibration (relay source)', () => {
  const files = collectSlugFiles('relay');
  const verdict = computeRemotionCorrectMetrics({ files });

  it('relay: hardGatesPass=true (calibration guard — no R1/R2 violations)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('relay: source files found and scanned', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('relay: 5 gates returned', () => {
    expect(verdict.gates).toHaveLength(5);
  });

  it('relay: R1-determinism passes (no Math.random/Date.now/new Date()/performance.now)', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
  });

  it('relay: R2-media passes (no raw <img>/<video>/<audio>)', () => {
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
  });
});

describe('computeRemotionCorrectMetrics — golden calibration (granipa source)', () => {
  const files = collectSlugFiles('granipa');
  const verdict = computeRemotionCorrectMetrics({ files });

  it('granipa: hardGatesPass=true (calibration guard — no R1/R2 violations)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('granipa: source files found and scanned', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('granipa: 5 gates returned', () => {
    expect(verdict.gates).toHaveLength(5);
  });

  it('granipa: R1-determinism passes (no Math.random/Date.now/new Date()/performance.now)', () => {
    expect(verdict.gates.find(g => g.name === 'R1-determinism').pass).toBe(true);
  });

  it('granipa: R2-media passes (no raw <img>/<video>/<audio>)', () => {
    expect(verdict.gates.find(g => g.name === 'R2-media').pass).toBe(true);
  });
});
