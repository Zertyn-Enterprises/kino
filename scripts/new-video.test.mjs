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
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
