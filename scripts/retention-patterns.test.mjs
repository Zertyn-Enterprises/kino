/**
 * scripts/retention-patterns.test.mjs — unit tests for retention-patterns.mjs.
 *
 * Checks:
 *   1. Key count matches ## Pattern N: headings in retention-patterns.md
 *   2. Every key has required fields (title, lever, arcFit, signaturePrimitive, renderBodyScenes)
 *   3. renderBodyScenes() returns { timelineSrc: string, scenes: Array }
 *   4. Each scene has { filename: string, source: string }
 *   5. timelineSrc has role:'climax', role:'hold', rehookSeconds
 *   6. Every scene has Hard Rule 3 header, useTheme, AmbientField, no hardcoded hex
 *   7. timelineSrc interpolates timelineVar
 *   8. tsc --noEmit passes on all 9 scaffolds
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RETENTION_PATTERNS, RETENTION_PATTERN_KEYS } from './retention-patterns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const PATTERNS_MD = join(PROJECT_ROOT, '.claude', 'skills', 'produce', 'retention-patterns.md');

// ── Helpers ───────────────────────────────────────────────────────────────────

function patternHeadingCount() {
  const src = readFileSync(PATTERNS_MD, 'utf8');
  return (src.match(/^## Pattern \d+:/gm) ?? []).length;
}

// ── Field checks ──────────────────────────────────────────────────────────────

describe('RETENTION_PATTERN_KEYS', () => {
  it('has an entry for every ## Pattern N: heading in retention-patterns.md', () => {
    expect(RETENTION_PATTERN_KEYS.length).toBe(patternHeadingCount());
  });

  it('contains no duplicate keys', () => {
    expect(new Set(RETENTION_PATTERN_KEYS).size).toBe(RETENTION_PATTERN_KEYS.length);
  });
});

describe('RETENTION_PATTERNS — required fields', () => {
  for (const key of RETENTION_PATTERN_KEYS) {
    describe(key, () => {
      const pattern = RETENTION_PATTERNS[key];

      it('exists in RETENTION_PATTERNS', () => {
        expect(pattern).toBeDefined();
      });

      it('has title (string)', () => {
        expect(typeof pattern.title).toBe('string');
        expect(pattern.title.length).toBeGreaterThan(0);
      });

      it('has lever (string)', () => {
        expect(typeof pattern.lever).toBe('string');
        expect(pattern.lever.length).toBeGreaterThan(0);
      });

      it('has arcFit (non-empty array)', () => {
        expect(Array.isArray(pattern.arcFit)).toBe(true);
        expect(pattern.arcFit.length).toBeGreaterThan(0);
      });

      it('has signaturePrimitive (string)', () => {
        expect(typeof pattern.signaturePrimitive).toBe('string');
        expect(pattern.signaturePrimitive.length).toBeGreaterThan(0);
      });

      it('has renderBodyScenes (function)', () => {
        expect(typeof pattern.renderBodyScenes).toBe('function');
      });
    });
  }
});

// ── renderBodyScenes() output shape ──────────────────────────────────────────

describe('renderBodyScenes() return value', () => {
  const opts = { themeVar: 'testTheme', timelineVar: 'testTimeline' };

  for (const key of RETENTION_PATTERN_KEYS) {
    describe(key, () => {
      const result = RETENTION_PATTERNS[key].renderBodyScenes(opts);

      it('returns an object', () => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      it('has timelineSrc (string)', () => {
        expect(typeof result.timelineSrc).toBe('string');
        expect(result.timelineSrc.length).toBeGreaterThan(0);
      });

      it('has scenes (non-empty array)', () => {
        expect(Array.isArray(result.scenes)).toBe(true);
        expect(result.scenes.length).toBeGreaterThanOrEqual(2);
      });

      it('scenes[0].filename is Body.tsx', () => {
        expect(result.scenes[0].filename).toBe('Body.tsx');
      });

      it('scenes[1].filename is Climax.tsx or Cta.tsx', () => {
        expect(['Climax.tsx', 'Cta.tsx']).toContain(result.scenes[1].filename);
      });

      for (let i = 0; i < 2; i++) {
        it(`scenes[${i}] has filename (string) and source (string)`, () => {
          const scene = result.scenes[i];
          expect(typeof scene.filename).toBe('string');
          expect(scene.filename.endsWith('.tsx')).toBe(true);
          expect(typeof scene.source).toBe('string');
          expect(scene.source.length).toBeGreaterThan(0);
        });
      }

      // timelineSrc gate-green fields
      it('timelineSrc contains role:\'climax\'', () => {
        expect(result.timelineSrc).toContain("role: \"climax\"");
      });

      it('timelineSrc contains role:\'hold\'', () => {
        expect(result.timelineSrc).toContain("role: \"hold\"");
      });

      it('timelineSrc contains rehookSeconds', () => {
        expect(result.timelineSrc).toContain('rehookSeconds');
      });

      it('timelineSrc interpolates timelineVar', () => {
        expect(result.timelineSrc).toContain(opts.timelineVar);
      });

      // Scene source quality checks
      for (let i = 0; i < 2; i++) {
        const sceneName = i === 0 ? 'Body' : 'second';
        it(`${sceneName} scene has Hard Rule 3 header`, () => {
          expect(result.scenes[i].source).toContain('re-derive bespoke per Hard Rule 3');
        });

        it(`${sceneName} scene imports useTheme`, () => {
          expect(result.scenes[i].source).toContain('useTheme');
        });

        it(`${sceneName} scene uses AmbientField`, () => {
          expect(result.scenes[i].source).toContain('AmbientField');
        });

        it(`${sceneName} scene has no hardcoded hex colors`, () => {
          // Must not have a literal 7-char hex outside comments/strings within JSX props
          // Check that no standalone #rrggbb values appear outside template literal strings
          const src = result.scenes[i].source;
          // Strip comment lines to avoid false negatives in comment context
          const nonCommentLines = src.split('\n')
            .filter(l => !l.trimStart().startsWith('//'))
            .join('\n');
          const hexLiterals = nonCommentLines.match(/"#[0-9a-fA-F]{6}"/g) ?? [];
          expect(hexLiterals).toHaveLength(0);
        });
      }
    });
  }
});

// ── tsc --noEmit across all 9 scaffolds ──────────────────────────────────────
//
// All 9 scaffolds are written in beforeAll, ONE scoped tsc invocation runs,
// then afterAll tears everything down. A single-run window minimises the chance
// of a parallel vitest worker (new-video.test.mjs) observing our temp dirs.
// The temp tsconfig is scoped to lib + our scaffold dirs only, so any OTHER
// test files that new-video.test.mjs has written are invisible to our tsc.

const RP_TMP_TSCONFIG = join(PROJECT_ROOT, 'tsconfig.rp-tsc-test.json');
const RP_SLUG    = '__rp_tsc__';
const RP_COMP_ID = 'RpTsc';

function rpTscSlug(key)   { return `${RP_SLUG}-${key}`; }
function rpTscCompId(key) { return `${RP_COMP_ID}${key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`; }
function rpTscCamel(key)  { return rpTscSlug(key).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

describe('tsc --noEmit — all retention-pattern scaffolds', () => {
  beforeAll(() => {
    // Scaffold ALL 9 patterns before the single tsc run.
    for (const key of RETENTION_PATTERN_KEYS) {
      const slug      = rpTscSlug(key);
      const compId    = rpTscCompId(key);
      const camelSlug = rpTscCamel(key);
      const themeVar    = `${camelSlug}Theme`;
      const timelineVar = `${camelSlug}Timeline`;

      const dir = join(PROJECT_ROOT, 'src', 'videos', slug);
      mkdirSync(join(dir, 'scenes'), { recursive: true });

      const { timelineSrc, scenes } = RETENTION_PATTERNS[key].renderBodyScenes({
        themeVar,
        timelineVar,
      });

      writeFileSync(join(dir, 'timeline.ts'), timelineSrc);

      writeFileSync(join(dir, 'theme.ts'), `\
import { SPRING } from "../../lib/springs";
import { defineTheme } from "../../lib/theme";
export const ${themeVar} = defineTheme({
  name: "${slug}",
  palette: {
    bg: "#0a0a0f", surface: "#16161e", text: "#e8e8f0",
    textDim: "#6b6b80", accent: "#7effc9",
  },
  fonts: { display: { family: "Test", weight: 700 }, body: { family: "Test", weight: 500 } },
  radius: { sm: 4, md: 8, lg: 16 },
  motion: { springs: { snap: SPRING.snap, settle: SPRING.settle, dramatic: SPRING.heavy },
    enterFrames: 12, staggerFrames: 4, holdFrames: 12 },
  texture: { grainOpacity: 0, vignette: 0 },
});
`);

      for (const scene of scenes) {
        writeFileSync(join(dir, 'scenes', scene.filename), scene.source);
      }

      const CompB    = scenes[1].filename.replace('.tsx', '');
      const sceneId2 = CompB.toLowerCase();

      writeFileSync(join(dir, 'Main.tsx'), `\
import { AbsoluteFill, Sequence } from "remotion";
import { AmbientField } from "../../lib/fx";
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { ${themeVar} } from "./theme";
import { ${timelineVar} } from "./timeline";
import { Body } from "./scenes/Body";
import { ${CompB} } from "./scenes/${CompB}";

const _sc = ${timelineVar}.scenes;

export const ${compId}: React.FC<{ debug?: boolean }> = ({ debug = false }) => (
  <ThemeProvider value={${themeVar}}>
    <AbsoluteFill style={{ background: ${themeVar}.palette.bg }}>
      <AmbientField
        color={${themeVar}.palette.accent}
        colorDim={${themeVar}.palette.textDim}
        density={80}
        energy={1.5}
        itemH={8}
      />
      <Sequence from={_sc.body.from} durationInFrames={_sc.body.durationInFrames}>
        <Body />
      </Sequence>
      <Sequence from={_sc.${sceneId2}.from} durationInFrames={_sc.${sceneId2}.durationInFrames}>
        <${CompB} />
      </Sequence>
      <DebugGrid enabled={debug} />
    </AbsoluteFill>
  </ThemeProvider>
);
`);
    }

    // Scoped tsconfig: only lib + our scaffold dirs. Parallel new-video.test.mjs
    // artifacts (testbodycta01, testarchscaff*, etc.) are not in the include list
    // so tsc can't be tripped up by them appearing or disappearing.
    writeFileSync(RP_TMP_TSCONFIG, JSON.stringify({
      extends: './tsconfig.json',
      include: [
        'src/lib/**/*',
        'src/smoke/**/*',
        'src/review/**/*',
        ...RETENTION_PATTERN_KEYS.map(k => `src/videos/${rpTscSlug(k)}/**/*`),
      ],
      exclude: ['remotion.config.ts'],
    }));
  });

  afterAll(() => {
    if (existsSync(RP_TMP_TSCONFIG)) rmSync(RP_TMP_TSCONFIG);
    for (const key of RETENTION_PATTERN_KEYS) {
      const dir = join(PROJECT_ROOT, 'src', 'videos', rpTscSlug(key));
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('all 9 retention-pattern scaffolds pass tsc --noEmit', { timeout: 60000 }, () => {
    try {
      execSync('npx tsc --noEmit -p tsconfig.rp-tsc-test.json', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
      throw new Error(`tsc --noEmit failed on retention-pattern scaffolds:\n${out}`);
    }
  });
});
