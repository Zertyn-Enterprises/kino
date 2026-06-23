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
 *
 * Golden calibration (granipa, via loadStructure):
 *   granipa timeline has role:'climax' on the 'kicker' scene (cumulative beats
 *   0+5+12+3+6+16+10+8=60 at 122bpm/30fps → beatFrame(60)=885). No hold roles.
 *   Expected: climaxFrame=885, holds=[], rehookSeconds=null, flags='--climax=885'
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

// ---------------------------------------------------------------------------
// Golden calibration — granipa via loadStructure (esbuild)
//
// granipa timeline: fps=30, bpm=122, 9 scenes. 'kicker' scene starts at the
// cumulative cut of 'sovereignty' = beatFrame(60).
// beatFrame(60) = round((60 * 60/122) * 30) = round(885.25) = 885.
// The 'kicker' scene carries role:'climax', so structure.climaxFrame = 885.
// No hold roles, no rehookSeconds → flags = '--climax=885'.
// ---------------------------------------------------------------------------

describe('loadStructure — golden calibration (granipa)', () => {
  it('climaxFrame is 885 (kicker.from derived from role, not a literal)', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.climaxFrame).toBe(885);
  });

  it('holds is empty (no hold-roled scenes)', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.holds).toEqual([]);
  });

  it('rehookSeconds is null (not declared)', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.rehookSeconds).toBeNull();
  });

  it('flag string is --climax=885', async () => {
    const structure = await loadStructure('granipa');
    expect(structureToFlags(structure)).toBe('--climax=885');
  });
});

// ---------------------------------------------------------------------------
// Golden calibration — promise field via loadStructure (relay)
//
// relay hook beat: 10 beats @ 120bpm/30fps → cutFrame = beatFrame(10) = 150.
// Declared: promise.text = "Queued — waiting for runner", byFrame = 52.
// Resolved: frame = 52, wordCount = 4.
// ---------------------------------------------------------------------------

describe('loadStructure — promise golden (relay)', () => {
  it('promise is non-null', async () => {
    const structure = await loadStructure('relay');
    expect(structure.promise).not.toBeNull();
  });

  it('promise.text matches hook tension copy', async () => {
    const structure = await loadStructure('relay');
    expect(structure.promise.text).toBe('Queued — waiting for runner');
  });

  it('promise.frame uses byFrame=52 (not cutFrame=150)', async () => {
    const structure = await loadStructure('relay');
    expect(structure.promise.frame).toBe(52);
  });

  it('promise.wordCount is 5 (em-dash counts as a token)', async () => {
    const structure = await loadStructure('relay');
    expect(structure.promise.wordCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Golden calibration — promise field via loadStructure (granipa)
//
// granipa hook beat: 5 beats @ 122bpm/30fps → cutFrame = beatFrame(5) = 74.
// Declared: promise.text = "what your mac tools see in a day:", byFrame = 8.
// Resolved: frame = 8, wordCount = 8.
// ---------------------------------------------------------------------------

describe('loadStructure — promise golden (granipa)', () => {
  it('promise is non-null', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.promise).not.toBeNull();
  });

  it('promise.text matches hook question copy', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.promise.text).toBe('what your mac tools see in a day:');
  });

  it('promise.frame uses byFrame=8 (not cutFrame=74)', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.promise.frame).toBe(8);
  });

  it('promise.wordCount is 8', async () => {
    const structure = await loadStructure('granipa');
    expect(structure.promise.wordCount).toBe(8);
  });
});
