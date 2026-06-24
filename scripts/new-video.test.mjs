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
