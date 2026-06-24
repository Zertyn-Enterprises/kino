/**
 * Render-free tests for scripts/retention-patterns.mjs.
 *
 * Contract assertions:
 *   - RETENTION_PATTERN_KEYS count matches "## Pattern" headings in retention-patterns.md
 *   - Every key maps to an entry with required fields and a callable renderBodyScenes
 *   - Emitted timelineSrc declares role:'climax' + role:'hold' + rehookSeconds (gate-green)
 *   - All patterns' emitted scenes pass tsc --noEmit (scaffolded into real project tree)
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RETENTION_PATTERN_KEYS, RETENTION_PATTERNS } from './retention-patterns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const RETENTION_MD_PATH = join(
  PROJECT_ROOT,
  '.claude',
  'skills',
  'produce',
  'retention-patterns.md',
);
const retentionMd = readFileSync(RETENTION_MD_PATH, 'utf8');

// ── Registry completeness ─────────────────────────────────────────────────────

describe('retention-patterns.mjs — registry completeness', () => {
  it('RETENTION_PATTERN_KEYS count matches "## Pattern" headings in retention-patterns.md', () => {
    const patternHeadings = (retentionMd.match(/^## Pattern \d+:/gm) ?? []).length;
    expect(RETENTION_PATTERN_KEYS.length).toBe(patternHeadings);
  });

  it('every RETENTION_PATTERN_KEYS entry maps to a RETENTION_PATTERNS entry with required fields', () => {
    for (const key of RETENTION_PATTERN_KEYS) {
      const p = RETENTION_PATTERNS[key];
      expect(p, `missing RETENTION_PATTERNS entry for "${key}"`).toBeTruthy();
      expect(typeof p.title, `${key}.title must be string`).toBe('string');
      expect(typeof p.lever, `${key}.lever must be string`).toBe('string');
      expect(Array.isArray(p.arcFit), `${key}.arcFit must be array`).toBe(true);
      expect(typeof p.signaturePrimitive, `${key}.signaturePrimitive must be string`).toBe('string');
      expect(typeof p.renderBodyScenes, `${key}.renderBodyScenes must be function`).toBe('function');
    }
  });

  it('every renderBodyScenes() returns { timelineSrc: string, scenes: Array }', () => {
    for (const key of RETENTION_PATTERN_KEYS) {
      const result = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      expect(result, `${key}.renderBodyScenes() must return object`).toBeTruthy();
      expect(typeof result.timelineSrc, `${key}.timelineSrc must be string`).toBe('string');
      expect(result.timelineSrc.length, `${key}.timelineSrc must be non-empty`).toBeGreaterThan(0);
      expect(Array.isArray(result.scenes), `${key}.scenes must be array`).toBe(true);
      expect(result.scenes.length, `${key} must emit at least one scene`).toBeGreaterThan(0);
      for (const scene of result.scenes) {
        expect(typeof scene.filename, `${key} scene.filename must be string`).toBe('string');
        expect(typeof scene.source, `${key} scene.source must be string`).toBe('string');
        expect(scene.source.length, `${key} ${scene.filename} source must be non-empty`).toBeGreaterThan(0);
      }
    }
  });
});

// ── Gate-green structural assertions (render-free) ────────────────────────────

describe('retention-patterns.mjs — gate-green structural assertions', () => {
  it.each(RETENTION_PATTERN_KEYS)(
    '%s: timelineSrc declares role:"climax" (gate-2 auto-derive)',
    (key) => {
      const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      expect(timelineSrc, `${key}: missing role:"climax" in timelineSrc`).toMatch(
        /role:\s*["']climax["']/,
      );
    },
  );

  it.each(RETENTION_PATTERN_KEYS)(
    '%s: timelineSrc declares role:"hold" (≥1 hold for gate-1 exclusion)',
    (key) => {
      const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      expect(timelineSrc, `${key}: missing role:"hold" in timelineSrc`).toMatch(
        /role:\s*["']hold["']/,
      );
    },
  );

  it.each(RETENTION_PATTERN_KEYS)(
    '%s: timelineSrc declares rehookSeconds (gate-3 auto-derive)',
    (key) => {
      const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      expect(timelineSrc, `${key}: missing rehookSeconds in timelineSrc`).toMatch(/rehookSeconds/);
    },
  );

  it.each(RETENTION_PATTERN_KEYS)(
    '%s: every emitted scene carries "re-derive bespoke per Hard Rule 3" header',
    (key) => {
      const { scenes } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      for (const scene of scenes) {
        expect(
          scene.source,
          `${key}/${scene.filename}: missing Hard Rule 3 header`,
        ).toMatch(/re-derive bespoke per Hard Rule 3/);
      }
    },
  );

  it.each(RETENTION_PATTERN_KEYS)(
    '%s: every emitted scene uses useTheme() — no hardcoded hex',
    (key) => {
      const { scenes } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      for (const scene of scenes) {
        expect(scene.source, `${key}/${scene.filename}: must use useTheme`).toMatch(/useTheme/);
        // No bare hex literals (7-char or 4-char) — palette must flow from theme.
        expect(
          scene.source,
          `${key}/${scene.filename}: must not contain hardcoded hex`,
        ).not.toMatch(/"#[0-9a-fA-F]{3,6}"/);
      }
    },
  );

  it.each(RETENTION_PATTERN_KEYS)(
    '%s: every emitted scene uses AmbientField (dead-air gate floor)',
    (key) => {
      const { scenes } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'testTimeline',
      });
      const hasAmbient = scenes.some((s) => s.source.includes('AmbientField'));
      expect(hasAmbient, `${key}: at least one scene must include AmbientField`).toBe(true);
    },
  );

  it.each(RETENTION_PATTERN_KEYS)(
    '%s: timelineSrc interpolates timelineVar as the export name',
    (key) => {
      const { timelineSrc } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: 'testTheme',
        timelineVar: 'myTestTimeline',
      });
      expect(
        timelineSrc,
        `${key}: timelineSrc must contain the timelineVar name "myTestTimeline"`,
      ).toContain('myTestTimeline');
    },
  );
});

// ── TypeScript typecheck (render-free, scaffolds into project tree) ───────────

const RETENTION_TEST_CASES = RETENTION_PATTERN_KEYS.map((key, i) => ({
  key,
  slug: `testretscaff${String(i + 1).padStart(2, '0')}`,
  comp: `TestRetScaff${String(i + 1).padStart(2, '0')}`,
}));

const rootTsx = join(PROJECT_ROOT, 'src', 'Root.tsx');

describe('retention-patterns.mjs — all patterns typecheck (tsc --noEmit)', () => {
  let rootSnap;

  beforeAll(() => {
    rootSnap = readFileSync(rootTsx, 'utf8');

    // Clean up any leftovers from a failed previous run.
    for (const { slug } of RETENTION_TEST_CASES) {
      const vd = join(PROJECT_ROOT, 'src', 'videos', slug);
      const pd = join(PROJECT_ROOT, 'public', slug);
      if (existsSync(vd)) rmSync(vd, { recursive: true });
      if (existsSync(pd)) rmSync(pd, { recursive: true });
    }

    // Scaffold each pattern: use new-video.mjs for the base structure (handles
    // Root.tsx registration), then overwrite timeline.ts and add body scenes.
    for (const { key, slug, comp } of RETENTION_TEST_CASES) {
      execSync(`node scripts/new-video.mjs ${slug} ${comp}`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });

      const result = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar: `${slug}Theme`,
        timelineVar: `${slug}Timeline`,
      });

      const videoDir = join(PROJECT_ROOT, 'src', 'videos', slug);
      const scenesDir = join(videoDir, 'scenes');

      // Overwrite timeline.ts with the gate-green retention timeline.
      writeFileSync(join(videoDir, 'timeline.ts'), result.timelineSrc);

      // Write body scene files into scenes/.
      for (const scene of result.scenes) {
        writeFileSync(join(scenesDir, scene.filename), scene.source);
      }
    }
  });

  afterAll(() => {
    for (const { slug } of RETENTION_TEST_CASES) {
      const vd = join(PROJECT_ROOT, 'src', 'videos', slug);
      const pd = join(PROJECT_ROOT, 'public', slug);
      if (existsSync(vd)) rmSync(vd, { recursive: true });
      if (existsSync(pd)) rmSync(pd, { recursive: true });
    }
    // Restore Root.tsx.
    writeFileSync(rootTsx, rootSnap);
  });

  it('all 9 pattern scaffolds typecheck clean (tsc --noEmit)', { timeout: 60000 }, () => {
    try {
      execSync('npx tsc --noEmit', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
      throw new Error(`tsc --noEmit failed on retention pattern scaffolds:\n${out}`);
    }
  });
});
