/**
 * Unit tests for render-corpus.mjs pure functions.
 * No file I/O, no rendering — pure computation only.
 *
 * Covers:
 *   canonicalizeProps   — normalization and key-order stability
 *   computePropsHash    — stability, collision resistance, empty-props edge case
 *   buildManifest       — structure and frame mapping
 *   isManifestFresh     — freshness logic (all fields must match)
 *   sliceManifest       — step, window, and combined slicing
 */

import { describe, expect, it } from 'vitest';
import {
  canonicalizeProps,
  computePropsHash,
  corpusDirFor,
  buildManifest,
  isManifestFresh,
  sliceManifest,
} from './render-corpus.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Build a manifest over [0, frameCount) with synthetic paths. */
function makeManifest(compId, frameCount, propsHash = 'testhash0001') {
  const entries = Array.from({ length: frameCount }, (_, i) => ({
    frame: i,
    path: `/corpus/${compId}/${i}.png`,
  }));
  return buildManifest(compId, propsHash, frameCount, entries);
}

// ---------------------------------------------------------------------------
// canonicalizeProps
// ---------------------------------------------------------------------------

describe('canonicalizeProps', () => {
  it('empty string normalizes to {}', () => {
    expect(canonicalizeProps('')).toBe('{}');
  });

  it('null-ish / whitespace normalizes to {}', () => {
    expect(canonicalizeProps('   ')).toBe('{}');
    expect(canonicalizeProps(null)).toBe('{}');
    expect(canonicalizeProps(undefined)).toBe('{}');
  });

  it('single-key object is stable', () => {
    expect(canonicalizeProps('{"foo":1}')).toBe('{"foo":1}');
  });

  it('key order is sorted — {b,a} == {a,b}', () => {
    const forward  = canonicalizeProps('{"a":1,"b":2}');
    const reversed = canonicalizeProps('{"b":2,"a":1}');
    expect(forward).toBe(reversed);
    expect(forward).toBe('{"a":1,"b":2}');
  });

  it('nested object keys are sorted recursively', () => {
    const a = canonicalizeProps('{"z":{"y":1,"x":2},"m":3}');
    const b = canonicalizeProps('{"m":3,"z":{"x":2,"y":1}}');
    expect(a).toBe(b);
  });

  it('arrays are preserved without reordering', () => {
    expect(canonicalizeProps('{"arr":[3,1,2]}')).toBe('{"arr":[3,1,2]}');
  });
});

// ---------------------------------------------------------------------------
// computePropsHash
// ---------------------------------------------------------------------------

describe('computePropsHash', () => {
  it('returns a 12-character hex string', () => {
    const h = computePropsHash('RelayLaunch', '');
    expect(h).toMatch(/^[0-9a-f]{12}$/);
  });

  it('same inputs → same hash (stability)', () => {
    const h1 = computePropsHash('RelayLaunch', '{"debug":true}');
    const h2 = computePropsHash('RelayLaunch', '{"debug":true}');
    expect(h1).toBe(h2);
  });

  it('different compId → different hash', () => {
    const h1 = computePropsHash('RelayLaunch', '{}');
    const h2 = computePropsHash('GranipaLaunch', '{}');
    expect(h1).not.toBe(h2);
  });

  it('different props → different hash', () => {
    const h1 = computePropsHash('RelayLaunch', '{"variant":"a"}');
    const h2 = computePropsHash('RelayLaunch', '{"variant":"b"}');
    expect(h1).not.toBe(h2);
  });

  it('empty props and explicit {} hash identically', () => {
    const h1 = computePropsHash('RelayLaunch', '');
    const h2 = computePropsHash('RelayLaunch', '{}');
    expect(h1).toBe(h2);
  });

  it('key order does not affect hash — {a,b} == {b,a}', () => {
    const h1 = computePropsHash('RelayLaunch', '{"a":1,"b":2}');
    const h2 = computePropsHash('RelayLaunch', '{"b":2,"a":1}');
    expect(h1).toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// corpusDirFor
// ---------------------------------------------------------------------------

describe('corpusDirFor', () => {
  it('constructs path as root/compId-hash', () => {
    expect(corpusDirFor('out/corpus', 'RelayLaunch', 'abc123')).toBe(
      'out/corpus/RelayLaunch-abc123',
    );
  });
});

// ---------------------------------------------------------------------------
// buildManifest
// ---------------------------------------------------------------------------

describe('buildManifest', () => {
  it('contains expected top-level fields', () => {
    const m = makeManifest('Comp', 10);
    expect(m.compId).toBe('Comp');
    expect(m.durationFrames).toBe(10);
    expect(m.scale).toBe(0.25);
    expect(m.step).toBe(1);
  });

  it('frames map has string keys for each frame 0..N-1', () => {
    const m = makeManifest('Comp', 5);
    expect(Object.keys(m.frames)).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(m.frames[String(i)]).toBe(`/corpus/Comp/${i}.png`);
    }
  });

  it('frame paths are stored as provided', () => {
    const entries = [
      { frame: 0, path: '/abs/a.png' },
      { frame: 1, path: '/abs/b.png' },
    ];
    const m = buildManifest('X', 'h', 2, entries);
    expect(m.frames['0']).toBe('/abs/a.png');
    expect(m.frames['1']).toBe('/abs/b.png');
  });
});

// ---------------------------------------------------------------------------
// isManifestFresh
// ---------------------------------------------------------------------------

describe('isManifestFresh', () => {
  const base = makeManifest('RelayLaunch', 300);

  it('returns true when all fields match', () => {
    expect(isManifestFresh(base, 'RelayLaunch', 'testhash0001', 300)).toBe(true);
  });

  it('returns false when compId differs', () => {
    expect(isManifestFresh(base, 'GranipaLaunch', 'testhash0001', 300)).toBe(false);
  });

  it('returns false when propsHash differs', () => {
    expect(isManifestFresh(base, 'RelayLaunch', 'differenthash', 300)).toBe(false);
  });

  it('returns false when durationFrames differs', () => {
    expect(isManifestFresh(base, 'RelayLaunch', 'testhash0001', 299)).toBe(false);
  });

  it('returns false for null manifest', () => {
    expect(isManifestFresh(null, 'RelayLaunch', 'testhash0001', 300)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sliceManifest
// ---------------------------------------------------------------------------

describe('sliceManifest', () => {
  const m = makeManifest('Comp', 30);  // frames 0..29

  it('step=1, no window → all 30 frames', () => {
    const paths = sliceManifest(m, { step: 1 });
    expect(paths).toHaveLength(30);
    expect(paths[0]).toBe('/corpus/Comp/0.png');
    expect(paths[29]).toBe('/corpus/Comp/29.png');
  });

  it('step=3 → frames 0,3,6,…27 (10 frames)', () => {
    const paths = sliceManifest(m, { step: 3 });
    expect(paths).toHaveLength(10);
    expect(paths[0]).toBe('/corpus/Comp/0.png');
    expect(paths[1]).toBe('/corpus/Comp/3.png');
    expect(paths[9]).toBe('/corpus/Comp/27.png');
  });

  it('step=5 → frames 0,5,10,15,20,25 (6 frames)', () => {
    const paths = sliceManifest(m, { step: 5 });
    expect(paths).toHaveLength(6);
    expect(paths[0]).toBe('/corpus/Comp/0.png');
    expect(paths[5]).toBe('/corpus/Comp/25.png');
  });

  it('window only — step=1, start=5, end=9 → frames 5,6,7,8,9', () => {
    const paths = sliceManifest(m, { step: 1, start: 5, end: 9 });
    expect(paths).toHaveLength(5);
    expect(paths[0]).toBe('/corpus/Comp/5.png');
    expect(paths[4]).toBe('/corpus/Comp/9.png');
  });

  it('step=3, window start=6, end=18 → frames 6,9,12,15,18 (5 frames)', () => {
    const paths = sliceManifest(m, { step: 3, start: 6, end: 18 });
    expect(paths).toHaveLength(5);
    expect(paths[0]).toBe('/corpus/Comp/6.png');
    expect(paths[4]).toBe('/corpus/Comp/18.png');
  });

  it('window end beyond last frame → stops at last available frame', () => {
    const paths = sliceManifest(m, { step: 5, start: 20, end: 100 });
    // frames 20, 25 — frame 30 doesn't exist
    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe('/corpus/Comp/20.png');
    expect(paths[1]).toBe('/corpus/Comp/25.png');
  });

  it('empty window (start > end) → empty array', () => {
    const paths = sliceManifest(m, { step: 1, start: 20, end: 10 });
    expect(paths).toHaveLength(0);
  });

  it('default opts → all frames (same as step=1, start=0)', () => {
    const paths = sliceManifest(m);
    expect(paths).toHaveLength(30);
  });
});
