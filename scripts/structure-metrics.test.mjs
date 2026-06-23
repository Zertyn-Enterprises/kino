/**
 * Tests for structure.mjs — timeline structure loader.
 *
 * Fixtures for structureToFlags (pure function):
 *   1. all-null   — no roles declared → empty flag string
 *   2. climax-only — climaxFrame=720, no holds, no rehook
 *   3. holds-one   — one hold window → --holds=720:840
 *   4. holds-many  — two hold windows → --holds=100:200,300:400
 *   5. rehook-only — rehookSeconds=6 only
 *   6. all-three   — climax + holds + rehook combined
 *   7. climax+holds — no rehook
 *
 * Golden calibration (relay, via loadStructure):
 *   relay timeline has role:'climax' on the 'climax' scene (beats 48–56 at
 *   120bpm/30fps → from=720). No hold roles, no rehookSeconds.
 *   Expected: climaxFrame=720, holds=[], rehookSeconds=null, flags='--climax=720'
 */

import { describe, expect, it } from 'vitest';
import { structureToFlags, loadStructure } from './structure.mjs';

// ---------------------------------------------------------------------------
// structureToFlags — pure unit tests
// ---------------------------------------------------------------------------

describe('structureToFlags — all null (no roles declared)', () => {
  const flags = structureToFlags({ climaxFrame: null, holds: [], rehookSeconds: null });

  it('returns empty string', () => {
    expect(flags).toBe('');
  });
});

describe('structureToFlags — climaxFrame only', () => {
  const flags = structureToFlags({ climaxFrame: 720, holds: [], rehookSeconds: null });

  it('emits --climax=<frame>', () => {
    expect(flags).toBe('--climax=720');
  });
});

describe('structureToFlags — single hold window', () => {
  const flags = structureToFlags({ climaxFrame: null, holds: [[720, 840]], rehookSeconds: null });

  it('emits --holds=S:E', () => {
    expect(flags).toBe('--holds=720:840');
  });
});

describe('structureToFlags — multiple hold windows', () => {
  const flags = structureToFlags({ climaxFrame: null, holds: [[100, 200], [300, 400]], rehookSeconds: null });

  it('emits --holds=S:E,S:E', () => {
    expect(flags).toBe('--holds=100:200,300:400');
  });
});

describe('structureToFlags — rehookSeconds only', () => {
  const flags = structureToFlags({ climaxFrame: null, holds: [], rehookSeconds: 6 });

  it('emits --rehook=<sec>', () => {
    expect(flags).toBe('--rehook=6');
  });
});

describe('structureToFlags — all three flags', () => {
  const flags = structureToFlags({ climaxFrame: 720, holds: [[100, 200]], rehookSeconds: 6 });

  it('emits climax then holds then rehook', () => {
    expect(flags).toBe('--climax=720 --holds=100:200 --rehook=6');
  });
});

describe('structureToFlags — climax + holds, no rehook', () => {
  const flags = structureToFlags({ climaxFrame: 480, holds: [[600, 720], [900, 960]], rehookSeconds: null });

  it('emits climax and holds but no rehook', () => {
    expect(flags).toBe('--climax=480 --holds=600:720,900:960');
  });
});

// ---------------------------------------------------------------------------
// Golden calibration — relay via loadStructure (esbuild)
//
// relay timeline: fps=30, bpm=120, 8 scenes. 'climax' scene starts at beat 48.
// beatFrame(48) = round((48 * 60/120) * 30) = round(24 * 30) = 720.
// The 'climax' scene carries role:'climax', so structure.climaxFrame = 720.
// No hold roles, no rehookSeconds → flags = '--climax=720'.
// ---------------------------------------------------------------------------

describe('loadStructure — golden calibration (relay)', () => {
  it('climaxFrame is 720 (derived from role, not a literal)', async () => {
    const structure = await loadStructure('relay');
    expect(structure.climaxFrame).toBe(720);
  });

  it('holds is empty (no hold-roled scenes)', async () => {
    const structure = await loadStructure('relay');
    expect(structure.holds).toEqual([]);
  });

  it('rehookSeconds is null (not declared)', async () => {
    const structure = await loadStructure('relay');
    expect(structure.rehookSeconds).toBeNull();
  });

  it('flag string is --climax=720', async () => {
    const structure = await loadStructure('relay');
    expect(structureToFlags(structure)).toBe('--climax=720');
  });
});
