/**
 * Render-free tests for scripts/new-video.mjs — hook-gate-green by construction.
 *
 * Scaffolds a throwaway video to the real project tree, asserts content
 * contracts, then tears down (restores Root.tsx + removes generated dirs).
 *
 * Contract assertions:
 *   - palette slots are valid 7-char hex (no "#TODO" in color slots)
 *   - Main.tsx imports + composes AmbientField
 *   - Main.tsx imports + mounts Hook scene
 *   - timeline.ts declares promise + payoff
 *   - Hook.tsx uses useTheme and renders the promise prop
 *   - HOOK_ARCHETYPES registry completeness vs hooks.md Reference fixtures
 *   - --hook=<key> scaffolds typecheck-clean for all 8 archetypes
 *   - unknown --hook key exits non-zero listing valid keys
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOOK_ARCHETYPE_KEYS, HOOK_ARCHETYPES } from './hook-archetypes.mjs';
import { RETENTION_PATTERN_KEYS } from './retention-patterns.mjs';
import { computeContrastMetrics } from './contrast-metrics.mjs';
import { computeIdentitySeed } from './identity-seed.mjs';
import { AMBIENT_MOTIF_KEYS } from './ambient-motif-keys.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const TEST_SLUG = 'testscaffhookgreen';
const TEST_COMP = 'TestScaffHookGreen';

const videoDir = join(PROJECT_ROOT, 'src', 'videos', TEST_SLUG);
const publicDir = join(PROJECT_ROOT, 'public', TEST_SLUG);
const rootTsx  = join(PROJECT_ROOT, 'src', 'Root.tsx');

// ── Setup / Teardown ─────────────────────────────────────────────────────────

/** @type {string} */
let rootOriginal;

beforeAll(() => {
  // Snapshot Root.tsx so we can restore it after the test.
  rootOriginal = readFileSync(rootTsx, 'utf8');

  // Remove any leftover from a failed previous run.
  if (existsSync(videoDir)) rmSync(videoDir, { recursive: true });
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true });

  execSync(`node scripts/new-video.mjs ${TEST_SLUG} ${TEST_COMP}`, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
  });
});

afterAll(() => {
  // Remove generated dirs.
  if (existsSync(videoDir)) rmSync(videoDir, { recursive: true });
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true });
  // Restore Root.tsx to pre-scaffold state.
  writeFileSync(rootTsx, rootOriginal);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEX7 = /^#[0-9a-fA-F]{6}$/;
const PALETTE_SLOTS = ['bg', 'surface', 'text', 'textDim', 'accent'];

function readGenerated(file) {
  return readFileSync(join(videoDir, file), 'utf8');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('new-video.mjs — hook-gate-green scaffold', () => {
  describe('theme.ts', () => {
    it('has no #TODO in palette slots', () => {
      const src = readGenerated('theme.ts');
      expect(src).not.toMatch(/"#TODO"/);
    });

    it.each(PALETTE_SLOTS)('%s is a valid 7-char hex', (slot) => {
      const src = readGenerated('theme.ts');
      // Match:  bg: "#0a0a0f"  or  bg: '#0a0a0f'
      const m = src.match(new RegExp(`${slot}:\\s*["']([^"']+)["']`));
      expect(m, `${slot} not found in theme.ts`).toBeTruthy();
      expect(HEX7.test(m[1]), `${slot} = "${m[1]}" is not a valid 7-char hex`).toBe(true);
    });
  });

  describe('Main.tsx', () => {
    it('imports AmbientField from lib/fx', () => {
      const src = readGenerated('Main.tsx');
      expect(src).toMatch(/import\s*\{[^}]*AmbientField[^}]*\}\s*from\s*["'].*lib\/fx["']/);
    });

    it('composes <AmbientField', () => {
      const src = readGenerated('Main.tsx');
      expect(src).toMatch(/<AmbientField/);
    });

    it('imports Hook scene', () => {
      const src = readGenerated('Main.tsx');
      expect(src).toMatch(/import\s*\{[^}]*Hook[^}]*\}\s*from\s*["']\.\/scenes\/Hook["']/);
    });

    it('mounts <Hook', () => {
      const src = readGenerated('Main.tsx');
      expect(src).toMatch(/<Hook/);
    });

    it('passes promise text via timeline.structure', () => {
      const src = readGenerated('Main.tsx');
      expect(src).toMatch(/\.structure/);
      expect(src).toMatch(/promise/);
    });
  });

  describe('timeline.ts', () => {
    it('declares a promise field', () => {
      const src = readGenerated('timeline.ts');
      expect(src).toMatch(/promise\s*:/);
    });

    it('declares a payoff field', () => {
      const src = readGenerated('timeline.ts');
      expect(src).toMatch(/payoff\s*:/);
    });
  });

  describe('scenes/Hook.tsx', () => {
    it('exists', () => {
      expect(existsSync(join(videoDir, 'scenes', 'Hook.tsx'))).toBe(true);
    });

    it('uses useTheme from lib/theme', () => {
      const src = readGenerated('scenes/Hook.tsx');
      expect(src).toMatch(/useTheme/);
    });

    it('renders the promise prop', () => {
      const src = readGenerated('scenes/Hook.tsx');
      expect(src).toMatch(/promise/);
    });

    it('is the generic placeholder — no AmbientField (AmbientField lives in Main.tsx) and no re-derive header', () => {
      // (d) Verifies that the no-flag path emits the generic Hook, not an archetype Hook.
      // Every archetype Hook.tsx has AmbientField + the "re-derive bespoke" header.
      // The generic placeholder has neither — AmbientField is in Main.tsx instead.
      const src = readGenerated('scenes/Hook.tsx');
      expect(src).not.toMatch(/AmbientField/);
      expect(src).not.toMatch(/re-derive bespoke per Hard Rule 3/);
    });
  });

  describe('regression lock (d) — no-flag path emits pure generic scaffold', () => {
    it('timeline.ts has no role:\'climax\' or rehookSeconds', () => {
      const src = readGenerated('timeline.ts');
      expect(src).not.toContain('role: "climax"');
      expect(src).not.toContain('rehookSeconds');
    });

    it('scenes/Body.tsx does not exist', () => {
      expect(existsSync(join(videoDir, 'scenes', 'Body.tsx'))).toBe(false);
    });

    it('scenes/Climax.tsx does not exist', () => {
      expect(existsSync(join(videoDir, 'scenes', 'Climax.tsx'))).toBe(false);
    });

    it('scenes/Cta.tsx does not exist', () => {
      expect(existsSync(join(videoDir, 'scenes', 'Cta.tsx'))).toBe(false);
    });

    it('Main.tsx does not mount <Sequence (no body scenes wired)', () => {
      const src = readGenerated('Main.tsx');
      expect(src).not.toMatch(/<Sequence/);
    });

    it('theme.ts uses the generic dark/teal default palette (not an anti-convergence seed)', () => {
      const src = readGenerated('theme.ts');
      expect(src).toContain('"#0a0a0f"'); // bg default
      expect(src).toContain('"#7effc9"'); // accent default
      expect(src).toContain('"TODO"');    // font families are TODO
    });
  });

  describe('TypeScript typecheck', () => {
    it('generated scaffold typechecks clean (tsc --noEmit)', { timeout: 15000 }, () => {
      try {
        execSync('npx tsc --noEmit', {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
        throw new Error(`tsc --noEmit failed:\n${out}`);
      }
    });
  });
});

// ── Hook archetype registry completeness ──────────────────────────────────────

const HOOKS_MD_PATH = join(PROJECT_ROOT, '.claude', 'skills', 'produce', 'hooks.md');
const hooksMd = readFileSync(HOOKS_MD_PATH, 'utf8');

describe('hook-archetypes.mjs — registry completeness', () => {
  it('HOOK_ARCHETYPE_KEYS count matches Reference fixture lines in hooks.md', () => {
    const fixtureLineCount = (hooksMd.match(/\*\*Reference fixture:/g) ?? []).length;
    expect(HOOK_ARCHETYPE_KEYS.length).toBe(fixtureLineCount);
  });

  it('every HOOK_ARCHETYPE_KEYS entry maps to a HOOK_ARCHETYPES entry with required fields', () => {
    for (const key of HOOK_ARCHETYPE_KEYS) {
      const arch = HOOK_ARCHETYPES[key];
      expect(arch, `missing HOOK_ARCHETYPES entry for "${key}"`).toBeTruthy();
      expect(typeof arch.title, `${key}.title must be string`).toBe('string');
      expect(typeof arch.renderHookScene, `${key}.renderHookScene must be function`).toBe('function');
      const scene = arch.renderHookScene({ themeVar: 'testTheme', timelineVar: 'testTimeline' });
      expect(typeof scene, `${key}.renderHookScene() must return string`).toBe('string');
      expect(scene.length, `${key}.renderHookScene() returned empty string`).toBeGreaterThan(0);
    }
  });
});

// ── --hook flag validation ────────────────────────────────────────────────────

describe('new-video.mjs — --hook flag validation', () => {
  it('unknown --hook key exits non-zero and lists valid keys', () => {
    let threw = false;
    let stderr = '';
    try {
      execSync('node scripts/new-video.mjs badslug9 BadComp9 --hook=bad-unknown-key', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      threw = true;
      stderr = err.stderr?.toString() ?? '';
    }
    expect(threw, 'unknown --hook key should exit non-zero').toBe(true);
    expect(stderr).toMatch(/bad-unknown-key/);
    for (const key of HOOK_ARCHETYPE_KEYS) {
      expect(stderr, `stderr should list valid key "${key}"`).toContain(key);
    }
  });

  it('blank --hook= value exits non-zero', () => {
    let threw = false;
    try {
      execSync('node scripts/new-video.mjs blankslug9 BlankComp9 --hook=', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      threw = true;
    }
    expect(threw, 'blank --hook= should exit non-zero').toBe(true);
  });
});

// ── Hook archetype scaffolds typecheck ────────────────────────────────────────

const ARCH_TEST_CASES = HOOK_ARCHETYPE_KEYS.map((key, i) => ({
  key,
  slug:  `testarchscaff${String(i + 1).padStart(2, '0')}`,
  comp:  `TestArchScaff${String(i + 1).padStart(2, '0')}`,
}));

describe('new-video.mjs --hook — archetype scaffolds typecheck', () => {
  let rootSnapArch;

  beforeAll(() => {
    rootSnapArch = readFileSync(rootTsx, 'utf8');
    // Clean up any leftover arch test dirs from a previous failed run.
    for (const { slug } of ARCH_TEST_CASES) {
      const vd = join(PROJECT_ROOT, 'src', 'videos', slug);
      const pd = join(PROJECT_ROOT, 'public', slug);
      if (existsSync(vd)) rmSync(vd, { recursive: true });
      if (existsSync(pd)) rmSync(pd, { recursive: true });
    }
    // Scaffold all 8 archetypes into unique temp slugs.
    for (const { key, slug, comp } of ARCH_TEST_CASES) {
      execSync(`node scripts/new-video.mjs ${slug} ${comp} --hook=${key}`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    }
  });

  afterAll(() => {
    for (const { slug } of ARCH_TEST_CASES) {
      const vd = join(PROJECT_ROOT, 'src', 'videos', slug);
      const pd = join(PROJECT_ROOT, 'public', slug);
      if (existsSync(vd)) rmSync(vd, { recursive: true });
      if (existsSync(pd)) rmSync(pd, { recursive: true });
    }
    writeFileSync(rootTsx, rootSnapArch);
  });

  it('all 8 archetype scaffolds typecheck clean (tsc --noEmit)', { timeout: 30000 }, () => {
    // Scoped tsconfig: only lib + these archetype slugs — insulates against
    // parallel retention-patterns.test.mjs writing __rp_tsc__-* dirs in src/videos/.
    const archTsConfig = join(PROJECT_ROOT, 'tsconfig.arch-tsc-test.json');
    writeFileSync(archTsConfig, JSON.stringify({
      extends: './tsconfig.json',
      include: [
        'src/lib/**/*',
        'src/smoke/**/*',
        'src/review/**/*',
        ...ARCH_TEST_CASES.map(({ slug }) => `src/videos/${slug}/**/*`),
      ],
      exclude: ['remotion.config.ts'],
    }));
    try {
      execSync('npx tsc --noEmit -p tsconfig.arch-tsc-test.json', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
      throw new Error(`tsc --noEmit failed on archetype scaffolds:\n${out}`);
    } finally {
      if (existsSync(archTsConfig)) rmSync(archTsConfig);
    }
  });

  it.each(ARCH_TEST_CASES)('--hook=$key emits archetype Hook.tsx with AmbientField', ({ key, slug }) => {
    const hookSrc = readFileSync(
      join(PROJECT_ROOT, 'src', 'videos', slug, 'scenes', 'Hook.tsx'),
      'utf8',
    );
    expect(hookSrc, `Hook.tsx for ${key} should contain AmbientField`).toMatch(/AmbientField/);
    expect(hookSrc, `Hook.tsx for ${key} should contain useTheme`).toMatch(/useTheme/);
    expect(hookSrc, `Hook.tsx for ${key} should contain promise prop`).toMatch(/promise/);
    expect(hookSrc, `Hook.tsx for ${key} should have re-derive bespoke header`).toMatch(/re-derive bespoke per Hard Rule 3/);
  });

  it.each(ARCH_TEST_CASES)('--hook=$key emits Main.tsx without top-level AmbientField', ({ key, slug }) => {
    const mainSrc = readFileSync(
      join(PROJECT_ROOT, 'src', 'videos', slug, 'Main.tsx'),
      'utf8',
    );
    // Archetype Main.tsx does NOT import AmbientField (Hook.tsx has it).
    expect(mainSrc, `Main.tsx for ${key} should not import AmbientField`).not.toMatch(/AmbientField/);
    // byFrame is passed to Hook component.
    expect(mainSrc, `Main.tsx for ${key} should pass byFrame to Hook`).toMatch(/byFrame/);
  });
});

// ── --body flag validation ────────────────────────────────────────────────────

describe('new-video.mjs — --body flag validation', () => {
  it('unknown --body key exits non-zero and lists valid keys', () => {
    let threw = false;
    let stderr = '';
    try {
      execSync('node scripts/new-video.mjs badslug10 BadComp10 --body=bad-unknown-key', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      threw = true;
      stderr = err.stderr?.toString() ?? '';
    }
    expect(threw, 'unknown --body key should exit non-zero').toBe(true);
    expect(stderr).toMatch(/bad-unknown-key/);
    for (const key of RETENTION_PATTERN_KEYS) {
      expect(stderr, `stderr should list valid key "${key}"`).toContain(key);
    }
  });

  it('blank --body= value exits non-zero', () => {
    let threw = false;
    try {
      execSync('node scripts/new-video.mjs blankslug10 BlankComp10 --body=', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      threw = true;
    }
    expect(threw, 'blank --body= should exit non-zero').toBe(true);
  });

  it('unknown --body key does not create any directories', () => {
    try {
      execSync('node scripts/new-video.mjs safeslug10 SafeComp10 --body=bad-key', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch {
      // expected failure
    }
    expect(existsSync(join(PROJECT_ROOT, 'src', 'videos', 'safeslug10'))).toBe(false);
    expect(existsSync(join(PROJECT_ROOT, 'public', 'safeslug10'))).toBe(false);
  });
});

// ── --body scaffold content ───────────────────────────────────────────────────

// Use 'back-loaded-climax' (Climax scene) and 'cta-tension-resolve' (Cta scene)
// to cover both scene variants.
const BODY_TEST_CASES = [
  { key: 'back-loaded-climax',    slug: 'testbodyclimax01', comp: 'TestBodyClimax01', expectCta: false },
  { key: 'cta-tension-resolve',   slug: 'testbodycta01',    comp: 'TestBodyCta01',    expectCta: true  },
];

describe('new-video.mjs --body — scaffold content', () => {
  let rootSnapBody;

  beforeAll(() => {
    rootSnapBody = readFileSync(rootTsx, 'utf8');
    for (const { slug } of BODY_TEST_CASES) {
      const vd = join(PROJECT_ROOT, 'src', 'videos', slug);
      const pd = join(PROJECT_ROOT, 'public', slug);
      if (existsSync(vd)) rmSync(vd, { recursive: true });
      if (existsSync(pd)) rmSync(pd, { recursive: true });
    }
    for (const { key, slug, comp } of BODY_TEST_CASES) {
      execSync(`node scripts/new-video.mjs ${slug} ${comp} --body=${key}`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    }
  });

  afterAll(() => {
    for (const { slug } of BODY_TEST_CASES) {
      const vd = join(PROJECT_ROOT, 'src', 'videos', slug);
      const pd = join(PROJECT_ROOT, 'public', slug);
      if (existsSync(vd)) rmSync(vd, { recursive: true });
      if (existsSync(pd)) rmSync(pd, { recursive: true });
    }
    writeFileSync(rootTsx, rootSnapBody);
  });

  it.each(BODY_TEST_CASES)('--body=$key: timeline.ts has role:\'climax\'', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'timeline.ts'), 'utf8');
    expect(src).toContain("role: \"climax\"");
  });

  it.each(BODY_TEST_CASES)('--body=$key: timeline.ts has role:\'hold\'', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'timeline.ts'), 'utf8');
    expect(src).toContain("role: \"hold\"");
  });

  it.each(BODY_TEST_CASES)('--body=$key: timeline.ts has rehookSeconds', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'timeline.ts'), 'utf8');
    expect(src).toContain('rehookSeconds');
  });

  it.each(BODY_TEST_CASES)('--body=$key: scenes/Body.tsx exists', ({ slug }) => {
    expect(existsSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'scenes', 'Body.tsx'))).toBe(true);
  });

  it.each(BODY_TEST_CASES)('--body=$key: correct second scene file exists', ({ slug, expectCta }) => {
    const secondFile = expectCta ? 'Cta.tsx' : 'Climax.tsx';
    expect(existsSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'scenes', secondFile))).toBe(true);
  });

  it.each(BODY_TEST_CASES)('--body=$key: Main.tsx imports Sequence from remotion', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*Sequence[^}]*\}\s*from\s*["']remotion["']/);
  });

  it.each(BODY_TEST_CASES)('--body=$key: Main.tsx mounts <Sequence', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/<Sequence/);
  });

  it.each(BODY_TEST_CASES)('--body=$key: Main.tsx imports AmbientField (gate-1 PASS for gaps)', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/AmbientField/);
  });

  it.each(BODY_TEST_CASES)('--body=$key: Main.tsx does NOT import Hook (body-only)', ({ slug }) => {
    const src = readFileSync(join(PROJECT_ROOT, 'src', 'videos', slug, 'Main.tsx'), 'utf8');
    expect(src).not.toMatch(/import\s*\{[^}]*Hook[^}]*\}\s*from/);
  });

  it('all --body scaffolds typecheck clean (tsc --noEmit)', { timeout: 30000 }, () => {
    const bodyTsConfig = join(PROJECT_ROOT, 'tsconfig.body-tsc-test.json');
    writeFileSync(bodyTsConfig, JSON.stringify({
      extends: './tsconfig.json',
      include: [
        'src/lib/**/*',
        'src/smoke/**/*',
        'src/review/**/*',
        ...BODY_TEST_CASES.map(({ slug }) => `src/videos/${slug}/**/*`),
      ],
      exclude: ['remotion.config.ts'],
    }));
    try {
      execSync('npx tsc --noEmit -p tsconfig.body-tsc-test.json', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
      throw new Error(`tsc --noEmit failed on --body scaffolds:\n${out}`);
    } finally {
      if (existsSync(bodyTsConfig)) rmSync(bodyTsConfig);
    }
  });
});

// ── --hook + --body compose test ──────────────────────────────────────────────

describe('new-video.mjs --hook + --body — compose correctly', () => {
  const HOOK_BODY_SLUG = 'testhookbody01';
  const HOOK_BODY_COMP = 'TestHookBody01';
  const hookBodyDir    = join(PROJECT_ROOT, 'src', 'videos', HOOK_BODY_SLUG);
  const hookBodyPub    = join(PROJECT_ROOT, 'public', HOOK_BODY_SLUG);
  let rootSnapHookBody;

  beforeAll(() => {
    rootSnapHookBody = readFileSync(rootTsx, 'utf8');
    if (existsSync(hookBodyDir)) rmSync(hookBodyDir, { recursive: true });
    if (existsSync(hookBodyPub)) rmSync(hookBodyPub, { recursive: true });
    execSync(
      `node scripts/new-video.mjs ${HOOK_BODY_SLUG} ${HOOK_BODY_COMP} --hook=bold-claim --body=back-loaded-climax`,
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );
  });

  afterAll(() => {
    if (existsSync(hookBodyDir)) rmSync(hookBodyDir, { recursive: true });
    if (existsSync(hookBodyPub)) rmSync(hookBodyPub, { recursive: true });
    writeFileSync(rootTsx, rootSnapHookBody);
  });

  it('Main.tsx imports Hook from scenes/Hook', () => {
    const src = readFileSync(join(hookBodyDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*Hook[^}]*\}\s*from\s*["']\.\/scenes\/Hook["']/);
  });

  it('Main.tsx imports Body from scenes/Body', () => {
    const src = readFileSync(join(hookBodyDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*Body[^}]*\}\s*from\s*["']\.\/scenes\/Body["']/);
  });

  it('Main.tsx mounts <Hook> in a Sequence', () => {
    const src = readFileSync(join(hookBodyDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/<Hook/);
    expect(src).toMatch(/<Sequence/);
  });

  it('Main.tsx mounts <Body> in a Sequence', () => {
    const src = readFileSync(join(hookBodyDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/<Body/);
  });

  it('Main.tsx has AmbientField at top level (covers gap periods)', () => {
    const src = readFileSync(join(hookBodyDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/AmbientField/);
  });

  it('scenes/Hook.tsx exists (archetype)', () => {
    expect(existsSync(join(hookBodyDir, 'scenes', 'Hook.tsx'))).toBe(true);
  });

  it('scenes/Body.tsx exists', () => {
    expect(existsSync(join(hookBodyDir, 'scenes', 'Body.tsx'))).toBe(true);
  });

  it('scenes/Climax.tsx exists (back-loaded-climax pattern)', () => {
    expect(existsSync(join(hookBodyDir, 'scenes', 'Climax.tsx'))).toBe(true);
  });

  it('timeline.ts has role:\'climax\' (retention gate-green by construction)', () => {
    const src = readFileSync(join(hookBodyDir, 'timeline.ts'), 'utf8');
    expect(src).toContain('role: "climax"');
  });

  it('timeline.ts has role:\'hold\' (retention gate-green by construction)', () => {
    const src = readFileSync(join(hookBodyDir, 'timeline.ts'), 'utf8');
    expect(src).toContain('role: "hold"');
  });

  it('timeline.ts has rehookSeconds (retention gate-green by construction)', () => {
    const src = readFileSync(join(hookBodyDir, 'timeline.ts'), 'utf8');
    expect(src).toContain('rehookSeconds');
  });

  it('hook+body scaffold typechecks clean (tsc --noEmit)', { timeout: 30000 }, () => {
    const hookBodyTsConfig = join(PROJECT_ROOT, 'tsconfig.hookbody-tsc-test.json');
    writeFileSync(hookBodyTsConfig, JSON.stringify({
      extends: './tsconfig.json',
      include: [
        'src/lib/**/*',
        'src/smoke/**/*',
        'src/review/**/*',
        `src/videos/${HOOK_BODY_SLUG}/**/*`,
      ],
      exclude: ['remotion.config.ts'],
    }));
    try {
      execSync('npx tsc --noEmit -p tsconfig.hookbody-tsc-test.json', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
      throw new Error(`tsc --noEmit failed on --hook+--body scaffold:\n${out}`);
    } finally {
      if (existsSync(hookBodyTsConfig)) rmSync(hookBodyTsConfig);
    }
  });
});

// ── Render-free HARD gate assertions (preflight / distinct / code-craft / remotion-correct) ──

describe('new-video.mjs --hook + --body — render-free HARD gate assertions', () => {
  const GATE_SLUG = 'testhookbodygates';
  const GATE_COMP = 'TestHookBodyGates';
  const gateDir    = join(PROJECT_ROOT, 'src', 'videos', GATE_SLUG);
  const gatePub    = join(PROJECT_ROOT, 'public', GATE_SLUG);
  const outComp    = join(PROJECT_ROOT, 'out', 'review', GATE_COMP);
  const outSlug    = join(PROJECT_ROOT, 'out', 'review', GATE_SLUG);
  const registryMd = join(PROJECT_ROOT, 'src', 'videos', '_registry.md');

  let rootSnapGate;
  let registrySnap;

  beforeAll(() => {
    rootSnapGate = readFileSync(rootTsx, 'utf8');
    registrySnap = readFileSync(registryMd, 'utf8');

    if (existsSync(gateDir)) rmSync(gateDir, { recursive: true });
    if (existsSync(gatePub)) rmSync(gatePub, { recursive: true });

    execSync(
      `node scripts/new-video.mjs ${GATE_SLUG} ${GATE_COMP} --hook=mid-action-demo --body=back-loaded-climax`,
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );

    // Append registry stubs so distinct's registry-completeness HARD check passes.
    // Two stubs needed: one for GATE_SLUG (candidate — axes match starter palette
    // so registry-axis-drift = 0) and one for TEST_SLUG (prior only — axis-drift
    // is not checked for priors, so values are set deliberately different on ≥4
    // axes so the ≥4-axes-distinct HARD check passes against it).
    const existingCount = (registrySnap.match(/^## \d+\s*·/gm) ?? []).length;
    // TEST_SLUG prior stub: differ on luminance, palette-bg, palette-accent, type, texture.
    const priorStub = [
      '',
      `## ${existingCount + 1} · ${TEST_SLUG} / ${TEST_COMP}`,
      '',
      '> Render-free gate vitest fixture. Auto-removed by new-video.test.mjs.',
      '',
      '| field           | value                                             |',
      '| --------------- | ------------------------------------------------- |',
      '| product         | render-free gate fixture (prior)                  |',
      '| arc             | linear                                            |',
      '| rhythm          | TODO(director)                                    |',
      '| luminance       | light                                             |',
      '| palette         | bg #f5f5f5 · accent #e63946                       |',
      '| type            | Playfair display / Open Sans body                 |',
      '| signature moves | TODO(director)                                    |',
      '| texture         | rich — grain 40%, vignette 70%                    |',
      '| transitions     | TODO(director)                                    |',
      '| music           | TODO(director)                                    |',
    ].join('\n');
    // GATE_SLUG candidate stub: exact starter palette so registry-axis-drift = 0.
    const candidateStub = [
      '',
      `## ${existingCount + 2} · ${GATE_SLUG} / ${GATE_COMP}`,
      '',
      '> Render-free gate vitest fixture. Auto-removed by new-video.test.mjs.',
      '',
      '| field           | value                                       |',
      '| --------------- | ------------------------------------------- |',
      '| product         | render-free gate fixture                    |',
      '| arc             | TODO(director)                              |',
      '| rhythm          | TODO(director)                              |',
      '| luminance       | dark                                        |',
      '| palette         | bg #0a0a0f · accent #7effc9                 |',
      '| type            | TODO display / TODO body                    |',
      '| signature moves | TODO(director)                              |',
      '| texture         | clean — grain 0%, vignette 0%               |',
      '| transitions     | TODO(director)                              |',
      '| music           | TODO(director)                              |',
    ].join('\n');
    writeFileSync(registryMd, registrySnap.trimEnd() + '\n' + priorStub + '\n' + candidateStub);

    // Run render-free gates (may exit non-zero on advisory fails; hardGatesPass checked in it()).
    for (const cmd of [
      `bash scripts/preflight.sh ${GATE_COMP} ${GATE_SLUG}`,
      `bash scripts/distinct.sh ${GATE_SLUG}`,
      `bash scripts/code-craft.sh ${GATE_COMP} ${GATE_SLUG}`,
      `bash scripts/remotion-correct.sh ${GATE_COMP} ${GATE_SLUG}`,
    ]) {
      try {
        execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'pipe', encoding: 'utf8' });
      } catch { /* advisory fails may cause non-zero exit; hardGatesPass checked below */ }
    }
  }, 60000);

  afterAll(() => {
    if (existsSync(gateDir)) rmSync(gateDir, { recursive: true });
    if (existsSync(gatePub)) rmSync(gatePub, { recursive: true });
    if (existsSync(outComp)) rmSync(outComp, { recursive: true });
    if (existsSync(outSlug)) rmSync(outSlug, { recursive: true });
    writeFileSync(rootTsx, rootSnapGate);
    writeFileSync(registryMd, registrySnap);
  });

  function readMetrics(relPath) {
    try { return JSON.parse(readFileSync(join(PROJECT_ROOT, relPath), 'utf8')); } catch { return null; }
  }

  it('preflight P1/P2 HARD passes (no render)', () => {
    const m = readMetrics(`out/review/${GATE_COMP}/preflight/metrics.json`);
    expect(m, 'preflight metrics.json missing').not.toBeNull();
    expect(m.hardGatesPass, JSON.stringify(m)).toBe(true);
  });

  it('distinct HARD passes (no render)', () => {
    const m = readMetrics(`out/review/${GATE_SLUG}/distinct/metrics.json`);
    expect(m, 'distinct metrics.json missing').not.toBeNull();
    expect(m.hardGatesPass, JSON.stringify(m)).toBe(true);
  });

  it('code-craft HARD passes (no render)', () => {
    const m = readMetrics(`out/review/${GATE_COMP}/code-craft/metrics.json`);
    expect(m, 'code-craft metrics.json missing').not.toBeNull();
    expect(m.hardGatesPass, JSON.stringify(m)).toBe(true);
  });

  it('remotion-correct HARD passes (no render)', () => {
    const m = readMetrics(`out/review/${GATE_COMP}/remotion-correct/metrics.json`);
    expect(m, 'remotion-correct metrics.json missing').not.toBeNull();
    expect(m.hardGatesPass, JSON.stringify(m)).toBe(true);
  });
});

// ── --distinct flag validation ─────────────────────────────────────────────────

describe('new-video.mjs — --distinct flag validation', () => {
  it('unknown flag alongside --distinct does not break arg parsing', () => {
    // --distinct is a boolean flag; it should not conflict with --hook or --body.
    // This test verifies the flag is recognized without triggering an error.
    // We just test that the scaffold exits non-zero when slug/CompId are missing,
    // since we cannot scaffold inside this narrow test.
    let threw = false;
    try {
      execSync('node scripts/new-video.mjs --distinct', { cwd: PROJECT_ROOT, stdio: 'pipe' });
    } catch (err) {
      threw = true;
      const stderr = err.stderr?.toString() ?? '';
      // Should show usage with --distinct in it, not an unknown-flag error.
      expect(stderr).toMatch(/--distinct/);
    }
    expect(threw, '--distinct with no slug/CompId should exit non-zero').toBe(true);
  });
});

// ── --distinct scaffold: gate-green by construction ────────────────────────────

// Derive the WCAG luminance class from a bg hex — matches what distinct.sh derives
// from theme.ts. Used to build registry stubs that pass the drift check.
function hexToLuminanceClass(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toL = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const Y = 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
  return Y < 0.05 ? 'dark' : Y < 0.18 ? 'tonal' : 'light';
}

describe('new-video.mjs --distinct — anti-convergence seed + render-free gates', () => {
  const DISTINCT_SLUG = 'testdistinctseed01';
  const DISTINCT_COMP = 'TestDistinctSeed01';
  const distinctDir   = join(PROJECT_ROOT, 'src', 'videos', DISTINCT_SLUG);
  const distinctPub   = join(PROJECT_ROOT, 'public', DISTINCT_SLUG);
  const outSlug       = join(PROJECT_ROOT, 'out', 'review', DISTINCT_SLUG);
  const outComp       = join(PROJECT_ROOT, 'out', 'review', DISTINCT_COMP);
  const registryMd    = join(PROJECT_ROOT, 'src', 'videos', '_registry.md');

  let rootSnapDistinct;
  let registrySnapDistinct;
  /** @type {ReturnType<typeof computeIdentitySeed>} */
  let seed;

  beforeAll(() => {
    rootSnapDistinct     = readFileSync(rootTsx, 'utf8');
    registrySnapDistinct = readFileSync(registryMd, 'utf8');

    // Pre-compute the seed from the original registry (before any stubs are added).
    seed = computeIdentitySeed(registrySnapDistinct);

    if (existsSync(distinctDir)) rmSync(distinctDir, { recursive: true });
    if (existsSync(distinctPub)) rmSync(distinctPub, { recursive: true });

    execSync(
      `node scripts/new-video.mjs ${DISTINCT_SLUG} ${DISTINCT_COMP} --distinct`,
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );

    // Derive the ACTUAL luminance class from the seed's bg hex — this is what
    // distinct.sh derives from theme.ts via themeToAxes. We must use this value
    // (not seed.luminance) in the stub so the registry-axis-drift check passes.
    const derivedLuminance = hexToLuminanceClass(seed.bg);
    const grainPct = seed.grainPct;
    const grainBand = grainPct === 0 ? 'clean — grain 0%' : `grain ${grainPct}%`;

    // Append stubs so registry-completeness and registry-axis-drift both pass.
    // Two stubs needed: one for TEST_SLUG (always present during the file run, created
    // by the module-level beforeAll) and one for DISTINCT_SLUG (the candidate).
    const existingCount = (registrySnapDistinct.match(/^## \d+\s*·/gm) ?? []).length;

    // TEST_SLUG prior stub: generic dark palette from the no-flag scaffold.
    const priorStub = [
      '',
      `## ${existingCount + 1} · ${TEST_SLUG} / ${TEST_COMP}`,
      '',
      '> Render-free gate vitest fixture. Auto-removed by new-video.test.mjs.',
      '',
      '| field           | value                                             |',
      '| --------------- | ------------------------------------------------- |',
      '| product         | render-free gate fixture (prior)                  |',
      '| arc             | A · TODO(director)                                |',
      '| rhythm          | TODO(director)                                    |',
      '| luminance       | dark                                              |',
      '| palette         | bg #0a0a0f · accent #7effc9                       |',
      '| type            | TODO display / TODO body                          |',
      '| signature moves | TODO(director)                                    |',
      '| texture         | clean — grain 0%, vignette 0%                     |',
      '| transitions     | TODO(director)                                    |',
      '| music           | TODO(director)                                    |',
    ].join('\n');

    // DISTINCT_SLUG candidate stub: derived values matching the generated theme.ts.
    const candidateStub = [
      '',
      `## ${existingCount + 2} · ${DISTINCT_SLUG} / ${DISTINCT_COMP}`,
      '',
      '> Render-free gate vitest fixture. Auto-removed by new-video.test.mjs.',
      '',
      '| field           | value                                             |',
      '| --------------- | ------------------------------------------------- |',
      `| product         | render-free distinct gate fixture                 |`,
      `| arc             | ${seed.arc} · TODO(director)                      |`,
      '| rhythm          | TODO(director)                                    |',
      `| luminance       | ${derivedLuminance}                               |`,
      `| palette         | bg ${seed.bg} · accent ${seed.accent}             |`,
      `| type            | ${seed.displayFamily} display / ${seed.bodyFamily} body |`,
      '| signature moves | TODO(director)                                    |',
      `| texture         | ${grainBand}, vignette 0%                         |`,
      '| transitions     | TODO(director)                                    |',
      `| music           | ${seed.bpmBpm}bpm (${seed.bpmBand}) TODO(director)|`,
    ].join('\n');

    writeFileSync(registryMd, registrySnapDistinct.trimEnd() + '\n' + priorStub + '\n' + candidateStub);

    // Run render-free gates (may exit non-zero on advisory; hardGatesPass checked in tests).
    for (const cmd of [
      `bash scripts/preflight.sh ${DISTINCT_COMP} ${DISTINCT_SLUG}`,
      `bash scripts/distinct.sh ${DISTINCT_SLUG}`,
    ]) {
      try {
        execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'pipe', encoding: 'utf8' });
      } catch { /* advisory fails may cause non-zero exit */ }
    }
  }, 30000);

  afterAll(() => {
    if (existsSync(distinctDir)) rmSync(distinctDir, { recursive: true });
    if (existsSync(distinctPub)) rmSync(distinctPub, { recursive: true });
    if (existsSync(outSlug))    rmSync(outSlug, { recursive: true });
    if (existsSync(outComp))    rmSync(outComp, { recursive: true });
    writeFileSync(rootTsx, rootSnapDistinct);
    writeFileSync(registryMd, registrySnapDistinct);
  });

  function readDistinctGenerated(file) {
    return readFileSync(join(distinctDir, file), 'utf8');
  }

  function readDistinctMetrics(relPath) {
    try { return JSON.parse(readFileSync(join(PROJECT_ROOT, relPath), 'utf8')); } catch { return null; }
  }

  describe('theme.ts — anti-convergence seed values', () => {
    it('palette slots are valid 7-char hex', () => {
      const src = readDistinctGenerated('theme.ts');
      for (const slot of ['bg', 'surface', 'text', 'textDim', 'accent']) {
        const m = src.match(new RegExp(`${slot}:\\s*["']([^"']+)["']`));
        expect(m, `${slot} not found in theme.ts`).toBeTruthy();
        expect(HEX7.test(m[1]), `${slot} = "${m[1]}" is not a valid 7-char hex`).toBe(true);
      }
    });

    it('bg is NOT the generic default #0a0a0f', () => {
      const src = readDistinctGenerated('theme.ts');
      expect(src).not.toContain('"#0a0a0f"');
    });

    it('accent is NOT the generic default #7effc9', () => {
      const src = readDistinctGenerated('theme.ts');
      expect(src).not.toContain('"#7effc9"');
    });

    it('font families are NOT "TODO"', () => {
      const src = readDistinctGenerated('theme.ts');
      // Both display and body families should be real names from the seed.
      expect(src).not.toMatch(/family:\s*["']TODO["']/);
    });

    it('contains anti-convergence seed comment', () => {
      const src = readDistinctGenerated('theme.ts');
      expect(src).toContain('anti-convergence seed — refine to taste');
    });
  });

  describe('render-free HARD gates', () => {
    it('preflight P1/P2 HARD passes', () => {
      const m = readDistinctMetrics(`out/review/${DISTINCT_COMP}/preflight/metrics.json`);
      expect(m, 'preflight metrics.json missing').not.toBeNull();
      expect(m.hardGatesPass, JSON.stringify(m)).toBe(true);
    });

    it('distinct HARD passes (≥4 axes differ from all priors)', () => {
      const m = readDistinctMetrics(`out/review/${DISTINCT_SLUG}/distinct/metrics.json`);
      expect(m, 'distinct metrics.json missing').not.toBeNull();
      expect(m.hardGatesPass, JSON.stringify(m)).toBe(true);
    });

    it('contrast HARD passes for the seed palette', () => {
      // Verify the seed's palette passes WCAG contrast floors programmatically.
      const result = computeContrastMetrics({
        bg:      seed.bg,
        surface: seed.surface,
        text:    seed.text,
        textDim: seed.textDim,
        accent:  seed.accent,
      });
      expect(result.hardGatesPass, JSON.stringify(result)).toBe(true);
    });
  });

  it('--distinct and --hook compose: scaffold exits 0 with both flags', () => {
    const COMPOSE_SLUG = 'testdistincthook01';
    const COMPOSE_COMP = 'TestDistinctHook01';
    const composeDir   = join(PROJECT_ROOT, 'src', 'videos', COMPOSE_SLUG);
    const composePub   = join(PROJECT_ROOT, 'public', COMPOSE_SLUG);
    const rootSnap     = readFileSync(rootTsx, 'utf8');

    if (existsSync(composeDir)) rmSync(composeDir, { recursive: true });
    if (existsSync(composePub)) rmSync(composePub, { recursive: true });
    try {
      execSync(
        `node scripts/new-video.mjs ${COMPOSE_SLUG} ${COMPOSE_COMP} --distinct --hook=bold-claim`,
        { cwd: PROJECT_ROOT, stdio: 'pipe' },
      );
      // Verify the Hook.tsx from the archetype is present (AmbientField).
      const hookSrc = readFileSync(join(composeDir, 'scenes', 'Hook.tsx'), 'utf8');
      expect(hookSrc).toMatch(/AmbientField/);
      // And theme.ts has seed palette (not generic default).
      const themeSrc = readFileSync(join(composeDir, 'theme.ts'), 'utf8');
      expect(themeSrc).not.toContain('"#7effc9"');
      expect(themeSrc).toContain('anti-convergence seed');
    } finally {
      if (existsSync(composeDir)) rmSync(composeDir, { recursive: true });
      if (existsSync(composePub)) rmSync(composePub, { recursive: true });
      writeFileSync(rootTsx, rootSnap);
    }
  });

  it('--distinct and --body compose: seed palette + retention structure both present', () => {
    const COMPOSE_SLUG = 'testdistinctbody01';
    const COMPOSE_COMP = 'TestDistinctBody01';
    const composeDir   = join(PROJECT_ROOT, 'src', 'videos', COMPOSE_SLUG);
    const composePub   = join(PROJECT_ROOT, 'public', COMPOSE_SLUG);
    const rootSnap     = readFileSync(rootTsx, 'utf8');

    if (existsSync(composeDir)) rmSync(composeDir, { recursive: true });
    if (existsSync(composePub)) rmSync(composePub, { recursive: true });
    try {
      execSync(
        `node scripts/new-video.mjs ${COMPOSE_SLUG} ${COMPOSE_COMP} --distinct --body=back-loaded-climax`,
        { cwd: PROJECT_ROOT, stdio: 'pipe' },
      );
      // theme.ts has seed palette (not generic dark/teal default).
      const themeSrc = readFileSync(join(composeDir, 'theme.ts'), 'utf8');
      expect(themeSrc).not.toContain('"#0a0a0f"');
      expect(themeSrc).not.toContain('"#7effc9"');
      expect(themeSrc).toContain('anti-convergence seed');
      // timeline.ts has retention structure from --body (gate-green by construction).
      const timelineSrc = readFileSync(join(composeDir, 'timeline.ts'), 'utf8');
      expect(timelineSrc).toContain('role: "climax"');
      expect(timelineSrc).toContain('rehookSeconds');
      // scenes/Body.tsx exists (body pattern applied).
      expect(existsSync(join(composeDir, 'scenes', 'Body.tsx'))).toBe(true);
    } finally {
      if (existsSync(composeDir)) rmSync(composeDir, { recursive: true });
      if (existsSync(composePub)) rmSync(composePub, { recursive: true });
      writeFileSync(rootTsx, rootSnap);
    }
  });

  it('--distinct uses a non-strips ambient motif in Main.tsx', () => {
    const src = readDistinctGenerated('Main.tsx');
    // --distinct auto-selects a non-strips motif, so Main.tsx imports MoteField, GridPulse,
    // or EmberRise directly — never the bare AmbientField symbol from fx.
    expect(src).not.toMatch(/import\s*\{[^}]*AmbientField[^}]*\}\s*from\s*["'].*lib\/fx["']/);
    // One of the non-strips components must be imported.
    const hasNonStrips = ['MoteField', 'GridPulse', 'EmberRise'].some(c =>
      src.includes(`import { ${c} }`),
    );
    expect(hasNonStrips, 'Main.tsx should import one of MoteField, GridPulse, EmberRise').toBe(true);
  });
});

// ── --ambient flag validation ──────────────────────────────────────────────────

describe('new-video.mjs — --ambient flag validation', () => {
  it('unknown --ambient key exits non-zero and lists valid keys', () => {
    let threw = false;
    let stderr = '';
    try {
      execSync('node scripts/new-video.mjs badslug11 BadComp11 --ambient=bad-unknown-motif', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      threw = true;
      stderr = err.stderr?.toString() ?? '';
    }
    expect(threw, 'unknown --ambient key should exit non-zero').toBe(true);
    expect(stderr).toMatch(/bad-unknown-motif/);
    for (const key of AMBIENT_MOTIF_KEYS) {
      expect(stderr, `stderr should list valid key "${key}"`).toContain(key);
    }
  });

  it('blank --ambient= value exits non-zero', () => {
    let threw = false;
    try {
      execSync('node scripts/new-video.mjs blankslug11 BlankComp11 --ambient=', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      threw = true;
    }
    expect(threw, 'blank --ambient= should exit non-zero').toBe(true);
  });

  it('unknown --ambient key does not create any directories', () => {
    try {
      execSync('node scripts/new-video.mjs safeslug11 SafeComp11 --ambient=bad-motif', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    } catch {
      // expected failure
    }
    expect(existsSync(join(PROJECT_ROOT, 'src', 'videos', 'safeslug11'))).toBe(false);
    expect(existsSync(join(PROJECT_ROOT, 'public', 'safeslug11'))).toBe(false);
  });
});

// ── --ambient=motes scaffold ──────────────────────────────────────────────────

describe('new-video.mjs --ambient=motes — motif wired into Main.tsx', () => {
  const MOTES_SLUG = 'testambientmotes01';
  const MOTES_COMP = 'TestAmbientMotes01';
  const motesDir   = join(PROJECT_ROOT, 'src', 'videos', MOTES_SLUG);
  const motesPub   = join(PROJECT_ROOT, 'public', MOTES_SLUG);
  let rootSnapMotes;

  beforeAll(() => {
    rootSnapMotes = readFileSync(rootTsx, 'utf8');
    if (existsSync(motesDir)) rmSync(motesDir, { recursive: true });
    if (existsSync(motesPub)) rmSync(motesPub, { recursive: true });
    execSync(
      `node scripts/new-video.mjs ${MOTES_SLUG} ${MOTES_COMP} --ambient=motes`,
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );
  });

  afterAll(() => {
    if (existsSync(motesDir)) rmSync(motesDir, { recursive: true });
    if (existsSync(motesPub)) rmSync(motesPub, { recursive: true });
    writeFileSync(rootTsx, rootSnapMotes);
  });

  it('Main.tsx imports MoteField from lib/fx (not AmbientField)', () => {
    const src = readFileSync(join(motesDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{\s*MoteField\s*\}\s*from\s*["'].*lib\/fx["']/);
    expect(src).not.toMatch(/import\s*\{[^}]*AmbientField[^}]*\}\s*from\s*["'].*lib\/fx["']/);
  });

  it('Main.tsx composes <MoteField', () => {
    const src = readFileSync(join(motesDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/<MoteField/);
  });

  it('--ambient=strips scaffold keeps AmbientField import identical to no-flag default', () => {
    const STRIPS_SLUG = 'testambientstrips01';
    const STRIPS_COMP = 'TestAmbientStrips01';
    const stripsDir   = join(PROJECT_ROOT, 'src', 'videos', STRIPS_SLUG);
    const stripsPub   = join(PROJECT_ROOT, 'public', STRIPS_SLUG);
    const rootSnap    = readFileSync(rootTsx, 'utf8');
    if (existsSync(stripsDir)) rmSync(stripsDir, { recursive: true });
    if (existsSync(stripsPub)) rmSync(stripsPub, { recursive: true });
    try {
      execSync(
        `node scripts/new-video.mjs ${STRIPS_SLUG} ${STRIPS_COMP} --ambient=strips`,
        { cwd: PROJECT_ROOT, stdio: 'pipe' },
      );
      const src = readFileSync(join(stripsDir, 'Main.tsx'), 'utf8');
      // strips motif uses the original AmbientField component directly.
      expect(src).toMatch(/import\s*\{[^}]*AmbientField[^}]*\}\s*from\s*["'].*lib\/fx["']/);
      expect(src).toMatch(/<AmbientField/);
    } finally {
      if (existsSync(stripsDir)) rmSync(stripsDir, { recursive: true });
      if (existsSync(stripsPub)) rmSync(stripsPub, { recursive: true });
      writeFileSync(rootTsx, rootSnap);
    }
  });

  it('--hook + --ambient=motes applies alias import in Hook.tsx', () => {
    const HOOKAMB_SLUG = 'testhookambient01';
    const HOOKAMB_COMP = 'TestHookAmbient01';
    const hookAmbDir   = join(PROJECT_ROOT, 'src', 'videos', HOOKAMB_SLUG);
    const hookAmbPub   = join(PROJECT_ROOT, 'public', HOOKAMB_SLUG);
    const rootSnap     = readFileSync(rootTsx, 'utf8');
    if (existsSync(hookAmbDir)) rmSync(hookAmbDir, { recursive: true });
    if (existsSync(hookAmbPub)) rmSync(hookAmbPub, { recursive: true });
    try {
      execSync(
        `node scripts/new-video.mjs ${HOOKAMB_SLUG} ${HOOKAMB_COMP} --hook=bold-claim --ambient=motes`,
        { cwd: PROJECT_ROOT, stdio: 'pipe' },
      );
      const hookSrc = readFileSync(join(hookAmbDir, 'scenes', 'Hook.tsx'), 'utf8');
      // The alias import replaces bare AmbientField with "MoteField as AmbientField".
      expect(hookSrc).toMatch(/MoteField\s+as\s+AmbientField/);
      // JSX references remain <AmbientField (resolved to MoteField at runtime via alias).
      expect(hookSrc).toMatch(/AmbientField/);
    } finally {
      if (existsSync(hookAmbDir)) rmSync(hookAmbDir, { recursive: true });
      if (existsSync(hookAmbPub)) rmSync(hookAmbPub, { recursive: true });
      writeFileSync(rootTsx, rootSnap);
    }
  });
});

// ── --ambient=grid-pulse scaffold ─────────────────────────────────────────────

describe('new-video.mjs --ambient=grid-pulse — motif wired into Main.tsx', () => {
  const GP_SLUG = 'testambientgp01';
  const GP_COMP = 'TestAmbientGp01';
  const gpDir   = join(PROJECT_ROOT, 'src', 'videos', GP_SLUG);
  const gpPub   = join(PROJECT_ROOT, 'public', GP_SLUG);
  let rootSnapGp;

  beforeAll(() => {
    rootSnapGp = readFileSync(rootTsx, 'utf8');
    if (existsSync(gpDir)) rmSync(gpDir, { recursive: true });
    if (existsSync(gpPub)) rmSync(gpPub, { recursive: true });
    execSync(
      `node scripts/new-video.mjs ${GP_SLUG} ${GP_COMP} --ambient=grid-pulse`,
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );
  });

  afterAll(() => {
    if (existsSync(gpDir)) rmSync(gpDir, { recursive: true });
    if (existsSync(gpPub)) rmSync(gpPub, { recursive: true });
    writeFileSync(rootTsx, rootSnapGp);
  });

  it('Main.tsx imports GridPulse from lib/fx (not AmbientField)', () => {
    const src = readFileSync(join(gpDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{\s*GridPulse\s*\}\s*from\s*["'].*lib\/fx["']/);
    expect(src).not.toMatch(/import\s*\{[^}]*AmbientField[^}]*\}\s*from\s*["'].*lib\/fx["']/);
  });

  it('Main.tsx composes <GridPulse', () => {
    const src = readFileSync(join(gpDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/<GridPulse/);
  });

  it('--hook + --ambient=grid-pulse applies alias import in Hook.tsx', () => {
    const HOOKGP_SLUG = 'testhookgp01';
    const HOOKGP_COMP = 'TestHookGp01';
    const hookGpDir   = join(PROJECT_ROOT, 'src', 'videos', HOOKGP_SLUG);
    const hookGpPub   = join(PROJECT_ROOT, 'public', HOOKGP_SLUG);
    const rootSnap    = readFileSync(rootTsx, 'utf8');
    if (existsSync(hookGpDir)) rmSync(hookGpDir, { recursive: true });
    if (existsSync(hookGpPub)) rmSync(hookGpPub, { recursive: true });
    try {
      execSync(
        `node scripts/new-video.mjs ${HOOKGP_SLUG} ${HOOKGP_COMP} --hook=bold-claim --ambient=grid-pulse`,
        { cwd: PROJECT_ROOT, stdio: 'pipe' },
      );
      const hookSrc = readFileSync(join(hookGpDir, 'scenes', 'Hook.tsx'), 'utf8');
      expect(hookSrc).toMatch(/GridPulse\s+as\s+AmbientField/);
      expect(hookSrc).toMatch(/AmbientField/);
    } finally {
      if (existsSync(hookGpDir)) rmSync(hookGpDir, { recursive: true });
      if (existsSync(hookGpPub)) rmSync(hookGpPub, { recursive: true });
      writeFileSync(rootTsx, rootSnap);
    }
  });
});

// ── --ambient=ember-rise scaffold ─────────────────────────────────────────────

describe('new-video.mjs --ambient=ember-rise — motif wired into Main.tsx', () => {
  const ER_SLUG = 'testambientember01';
  const ER_COMP = 'TestAmbientEmber01';
  const erDir   = join(PROJECT_ROOT, 'src', 'videos', ER_SLUG);
  const erPub   = join(PROJECT_ROOT, 'public', ER_SLUG);
  let rootSnapEr;

  beforeAll(() => {
    rootSnapEr = readFileSync(rootTsx, 'utf8');
    if (existsSync(erDir)) rmSync(erDir, { recursive: true });
    if (existsSync(erPub)) rmSync(erPub, { recursive: true });
    execSync(
      `node scripts/new-video.mjs ${ER_SLUG} ${ER_COMP} --ambient=ember-rise`,
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );
  });

  afterAll(() => {
    if (existsSync(erDir)) rmSync(erDir, { recursive: true });
    if (existsSync(erPub)) rmSync(erPub, { recursive: true });
    writeFileSync(rootTsx, rootSnapEr);
  });

  it('Main.tsx imports EmberRise from lib/fx (not AmbientField)', () => {
    const src = readFileSync(join(erDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{\s*EmberRise\s*\}\s*from\s*["'].*lib\/fx["']/);
    expect(src).not.toMatch(/import\s*\{[^}]*AmbientField[^}]*\}\s*from\s*["'].*lib\/fx["']/);
  });

  it('Main.tsx composes <EmberRise', () => {
    const src = readFileSync(join(erDir, 'Main.tsx'), 'utf8');
    expect(src).toMatch(/<EmberRise/);
  });

  it('--hook + --ambient=ember-rise applies alias import in Hook.tsx', () => {
    const HOOKER_SLUG = 'testhooker01';
    const HOOKER_COMP = 'TestHookEr01';
    const hookErDir   = join(PROJECT_ROOT, 'src', 'videos', HOOKER_SLUG);
    const hookErPub   = join(PROJECT_ROOT, 'public', HOOKER_SLUG);
    const rootSnap    = readFileSync(rootTsx, 'utf8');
    if (existsSync(hookErDir)) rmSync(hookErDir, { recursive: true });
    if (existsSync(hookErPub)) rmSync(hookErPub, { recursive: true });
    try {
      execSync(
        `node scripts/new-video.mjs ${HOOKER_SLUG} ${HOOKER_COMP} --hook=bold-claim --ambient=ember-rise`,
        { cwd: PROJECT_ROOT, stdio: 'pipe' },
      );
      const hookSrc = readFileSync(join(hookErDir, 'scenes', 'Hook.tsx'), 'utf8');
      expect(hookSrc).toMatch(/EmberRise\s+as\s+AmbientField/);
      expect(hookSrc).toMatch(/AmbientField/);
    } finally {
      if (existsSync(hookErDir)) rmSync(hookErDir, { recursive: true });
      if (existsSync(hookErPub)) rmSync(hookErPub, { recursive: true });
      writeFileSync(rootTsx, rootSnap);
    }
  });
});
