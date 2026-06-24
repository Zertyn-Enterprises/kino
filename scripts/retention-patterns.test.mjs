/**
 * Render-free tests for scripts/retention-patterns.mjs — retention-gate-green by construction.
 *
 * Scaffolds a throwaway video to the real project tree, writes each pattern's
 * body scene, asserts content contracts, then tears down.
 *
 * Contract assertions:
 *   - RETENTION_PATTERN_KEYS count matches "## Pattern N:" lines in retention-patterns.md
 *   - every key maps to a RETENTION_PATTERNS entry with required fields
 *   - renderBodyScenes() returns { sceneSrc, timelineSrc } with correct shape
 *   - timelineSrc declares role:'climax' after the hook scene (back-loaded)
 *   - timelineSrc declares at least one role:'hold'
 *   - timelineSrc declares rehookSeconds
 *   - all 9 emitted sceneSrc files typecheck clean with tsc --noEmit
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RETENTION_PATTERN_KEYS, RETENTION_PATTERNS } from './retention-patterns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const TEST_SLUG = 'testretpat';
const TEST_COMP = 'TestRetPat';

const videoDir   = join(PROJECT_ROOT, 'src', 'videos', TEST_SLUG);
const publicDir  = join(PROJECT_ROOT, 'public', TEST_SLUG);
const scenesDir  = join(videoDir, 'scenes');
const rootTsx    = join(PROJECT_ROOT, 'src', 'Root.tsx');

const RETENTION_PATTERNS_MD = join(
  PROJECT_ROOT,
  '.claude', 'skills', 'produce', 'retention-patterns.md',
);
const retentionMd = readFileSync(RETENTION_PATTERNS_MD, 'utf8');

// ── Setup / Teardown ─────────────────────────────────────────────────────────

let rootOriginal;

beforeAll(() => {
  rootOriginal = readFileSync(rootTsx, 'utf8');

  if (existsSync(videoDir)) rmSync(videoDir, { recursive: true });
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true });

  execSync(`node scripts/new-video.mjs ${TEST_SLUG} ${TEST_COMP}`, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
  });

  // Write all 9 body scene files into the test video's scenes/ directory.
  mkdirSync(scenesDir, { recursive: true });
  for (const key of RETENTION_PATTERN_KEYS) {
    const result = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testRetPatTheme',
      timelineVar: 'testRetPatTimeline',
    });
    writeFileSync(join(scenesDir, `${key}.tsx`), result.sceneSrc);
  }
});

afterAll(() => {
  if (existsSync(videoDir)) rmSync(videoDir, { recursive: true });
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true });
  writeFileSync(rootTsx, rootOriginal);
});

// ── Registry completeness ────────────────────────────────────────────────────

describe('retention-patterns.mjs — registry completeness', () => {
  it('RETENTION_PATTERN_KEYS count matches "## Pattern N:" headers in retention-patterns.md', () => {
    const patternHeaderCount = (retentionMd.match(/^## Pattern \d+:/gm) ?? []).length;
    expect(RETENTION_PATTERN_KEYS.length).toBe(patternHeaderCount);
  });

  it('every RETENTION_PATTERN_KEYS entry maps to a RETENTION_PATTERNS entry with required fields', () => {
    for (const key of RETENTION_PATTERN_KEYS) {
      const pattern = RETENTION_PATTERNS[key];
      expect(pattern, `missing RETENTION_PATTERNS entry for "${key}"`).toBeTruthy();
      expect(typeof pattern.title, `${key}.title must be string`).toBe('string');
      expect(typeof pattern.lever, `${key}.lever must be string`).toBe('string');
      expect(Array.isArray(pattern.arcFit), `${key}.arcFit must be array`).toBe(true);
      expect(typeof pattern.signaturePrimitive, `${key}.signaturePrimitive must be string`).toBe('string');
      expect(typeof pattern.renderBodyScenes, `${key}.renderBodyScenes must be function`).toBe('function');
    }
  });
});

// ── renderBodyScenes return shape ────────────────────────────────────────────

describe('retention-patterns.mjs — renderBodyScenes return shape', () => {
  it.each(RETENTION_PATTERN_KEYS)('%s renderBodyScenes returns { sceneSrc, timelineSrc }', (key) => {
    const result = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme',
      timelineVar: 'testTimeline',
    });
    expect(typeof result, `${key}.renderBodyScenes() must return object`).toBe('object');
    expect(typeof result.sceneSrc, `${key}.sceneSrc must be string`).toBe('string');
    expect(result.sceneSrc.length, `${key}.sceneSrc must be non-empty`).toBeGreaterThan(0);
    expect(typeof result.timelineSrc, `${key}.timelineSrc must be string`).toBe('string');
    expect(result.timelineSrc.length, `${key}.timelineSrc must be non-empty`).toBeGreaterThan(0);
  });
});

// ── sceneSrc structural assertions ───────────────────────────────────────────

describe('retention-patterns.mjs — sceneSrc structural assertions', () => {
  it.each(RETENTION_PATTERN_KEYS)('%s sceneSrc has "re-derive bespoke" header', (key) => {
    const { sceneSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    expect(sceneSrc, `${key} sceneSrc must have re-derive header`).toMatch(
      /re-derive bespoke per Hard Rule 3/,
    );
  });

  it.each(RETENTION_PATTERN_KEYS)('%s sceneSrc imports AmbientField (gate 1 HARD floor)', (key) => {
    const { sceneSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    expect(sceneSrc, `${key} sceneSrc must import AmbientField`).toMatch(/AmbientField/);
  });

  it.each(RETENTION_PATTERN_KEYS)('%s sceneSrc uses useTheme (no hardcoded hex)', (key) => {
    const { sceneSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    expect(sceneSrc, `${key} sceneSrc must call useTheme`).toMatch(/useTheme/);
  });
});

// ── timelineSrc structural assertions ────────────────────────────────────────

describe('retention-patterns.mjs — timelineSrc gate-green structure', () => {
  it.each(RETENTION_PATTERN_KEYS)('%s timelineSrc declares role:"climax" (back-loaded)', (key) => {
    const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    expect(timelineSrc, `${key} timelineSrc must have role:"climax"`).toMatch(
      /role:\s*["']climax["']/,
    );
  });

  it.each(RETENTION_PATTERN_KEYS)('%s timelineSrc declares role:"hold" (gate 1 exclude)', (key) => {
    const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    expect(timelineSrc, `${key} timelineSrc must have role:"hold"`).toMatch(
      /role:\s*["']hold["']/,
    );
  });

  it.each(RETENTION_PATTERN_KEYS)('%s timelineSrc sets rehookSeconds (gate 3 calibrated)', (key) => {
    const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    expect(timelineSrc, `${key} timelineSrc must set rehookSeconds`).toMatch(/rehookSeconds/);
  });

  it.each(RETENTION_PATTERN_KEYS)('%s timelineSrc: hook scene precedes climax (back-loaded)', (key) => {
    const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'testTimeline',
    });
    const hookIdx   = timelineSrc.indexOf('id: "hook"');
    const climaxIdx = timelineSrc.indexOf('role: "climax"');
    expect(hookIdx, `${key}: hook scene must appear in timelineSrc`).toBeGreaterThanOrEqual(0);
    expect(climaxIdx, `${key}: climax role must appear in timelineSrc`).toBeGreaterThanOrEqual(0);
    expect(hookIdx, `${key}: hook must precede climax (back-loaded)`).toBeLessThan(climaxIdx);
  });

  it.each(RETENTION_PATTERN_KEYS)('%s timelineSrc uses the supplied timelineVar as export name', (key) => {
    const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
      themeVar: 'testTheme', timelineVar: 'myCustomTimeline',
    });
    expect(timelineSrc, `${key} timelineSrc must use timelineVar`).toMatch(/myCustomTimeline/);
  });
});

// ── TypeScript typecheck ─────────────────────────────────────────────────────

describe('retention-patterns.mjs — all body scenes typecheck', () => {
  it(
    'all 9 emitted sceneSrc files typecheck clean (tsc --noEmit)',
    { timeout: 30000 },
    () => {
      try {
        execSync('npx tsc --noEmit', {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
        throw new Error(`tsc --noEmit failed on retention pattern body scenes:\n${out}`);
      }
    },
  );
});
