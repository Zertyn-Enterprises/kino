/**
 * Tests for theme-axes.mjs — code-derived distinctiveness axes loader.
 *
 * Pure function fixtures (themeToAxes):
 *   1. Relay-like theme object → correct axes (bg, accent, fonts, grainPct, luminance)
 *   2. Granipa-like theme object → correct axes (three distinct font families)
 *   3. Light theme (#FAFAFA bg) → luminance='light'
 *   4. Tonal theme (#505050 bg, Y≈0.086) → luminance='tonal'
 *   5. Shared display+body font → deduplicated in fonts array
 *   6. Missing optional mono font → fonts from display/body only
 *   7. Partial theme (no texture) → grainPct=null, 'texture' absent from derivable
 *   8. Null/undefined theme → all null outputs, derivable=[]
 *
 * luminanceClass fixtures:
 *   9.  Near-black → 'dark'
 *  10.  Mid-gray #505050 → 'tonal'
 *  11.  Near-white → 'light'
 *  12.  Invalid hex → 'unknown'
 *
 * nonDerivable contract:
 *  13.  Always contains the 4 treatment-only axis names
 *
 * Golden calibration via loadTheme (esbuild, real source):
 *  14.  loadTheme('relay') → bg=#0A0E0B, accent=#B6F22E, grainPct=5, luminance='dark'
 *  15.  loadTheme('relay') → fonts contains 'space grotesk' and 'jetbrains mono'
 *  16.  loadTheme('granipa') → bg=#0A0B0E, accent=#3D8BFF, grainPct=4, luminance='dark'
 *  17.  loadTheme('granipa') → fonts ['jetbrains mono','sentient','switzer']
 *  18.  Both slugs → all 5 derivable axes present
 */

import { describe, expect, it } from 'vitest';
import { themeToAxes, loadTheme, luminanceClass } from './theme-axes.mjs';

// ── Minimal theme builders ────────────────────────────────────────────────────

function makeTheme({ bg = '#0A0E0B', accent = '#B6F22E', display = 'Space Grotesk',
  body = 'Space Grotesk', mono = 'JetBrains Mono', grainOpacity = 0.05 } = {}) {
  return {
    name:    'test',
    palette: { bg, surface: '#131A14', text: '#F2F5F0', textDim: '#8FA098', accent },
    fonts:   {
      display: { family: display, weight: 700 },
      body:    { family: body,    weight: 500 },
      mono:    mono ? { family: mono, weight: 400 } : undefined,
    },
    radius:  { sm: 6, md: 10, lg: 16 },
    motion:  { springs: {}, enterFrames: 12, staggerFrames: 4, holdFrames: 14 },
    texture: { grainOpacity, vignette: 0.3 },
  };
}

// ── Fixture 1: relay-like theme ───────────────────────────────────────────────

describe('themeToAxes — relay-like (dark bg, lime accent, shared display+body font)', () => {
  const theme = makeTheme();
  const axes  = themeToAxes(theme);

  it('bg is the palette bg hex', () => {
    expect(axes.bg).toBe('#0A0E0B');
  });

  it('accent is the palette accent hex', () => {
    expect(axes.accent).toBe('#B6F22E');
  });

  it('grainPct is grainOpacity*100', () => {
    expect(axes.grainPct).toBe(5);
  });

  it('luminance is dark (Y≈0.003 < 0.05)', () => {
    expect(axes.luminance).toBe('dark');
  });

  it('deduplicates shared display/body font', () => {
    // display and body both use 'Space Grotesk'; only one entry expected.
    expect(axes.fonts.filter(f => f === 'space grotesk')).toHaveLength(1);
  });

  it('fonts are lowercased', () => {
    expect(axes.fonts.every(f => f === f.toLowerCase())).toBe(true);
  });

  it('fonts are sorted', () => {
    const sorted = [...axes.fonts].sort();
    expect(axes.fonts).toEqual(sorted);
  });

  it('fonts contains space grotesk and jetbrains mono', () => {
    expect(axes.fonts).toContain('space grotesk');
    expect(axes.fonts).toContain('jetbrains mono');
    expect(axes.fonts).toHaveLength(2);
  });
});

// ── Fixture 2: granipa-like theme (three distinct font families) ──────────────

describe('themeToAxes — granipa-like (three distinct font families)', () => {
  const theme = makeTheme({ bg: '#0A0B0E', accent: '#3D8BFF',
    display: 'Sentient', body: 'Switzer', mono: 'JetBrains Mono',
    grainOpacity: 0.04 });
  const axes = themeToAxes(theme);

  it('bg is coldBg', () => {
    expect(axes.bg).toBe('#0A0B0E');
  });

  it('accent is brand blue', () => {
    expect(axes.accent).toBe('#3D8BFF');
  });

  it('grainPct is 4', () => {
    expect(axes.grainPct).toBe(4);
  });

  it('three unique font families', () => {
    expect(axes.fonts).toHaveLength(3);
    expect(axes.fonts).toContain('sentient');
    expect(axes.fonts).toContain('switzer');
    expect(axes.fonts).toContain('jetbrains mono');
  });

  it('fonts sorted alphabetically', () => {
    expect(axes.fonts).toEqual(['jetbrains mono', 'sentient', 'switzer']);
  });
});

// ── Fixture 3: light theme ───────────────────────────────────────────────────

describe('themeToAxes — light bg (#FAFAFA)', () => {
  const axes = themeToAxes(makeTheme({ bg: '#FAFAFA', accent: '#FF5757' }));

  it('luminance is light', () => {
    expect(axes.luminance).toBe('light');
  });

  it('palette-bg in derivable', () => {
    expect(axes.derivable).toContain('palette-bg');
  });
});

// ── Fixture 4: tonal theme ───────────────────────────────────────────────────

describe('themeToAxes — tonal bg (#505050, Y≈0.086)', () => {
  const axes = themeToAxes(makeTheme({ bg: '#505050', accent: '#FF9900' }));

  it('luminance is tonal', () => {
    expect(axes.luminance).toBe('tonal');
  });
});

// ── Fixture 5: shared display+body font deduplication ────────────────────────

describe('themeToAxes — display === body deduplication', () => {
  const axes = themeToAxes(makeTheme({
    display: 'Inter', body: 'Inter', mono: 'Fira Code',
  }));

  it('contains inter only once', () => {
    expect(axes.fonts.filter(f => f === 'inter')).toHaveLength(1);
  });

  it('contains fira code', () => {
    expect(axes.fonts).toContain('fira code');
  });

  it('has 2 fonts total', () => {
    expect(axes.fonts).toHaveLength(2);
  });
});

// ── Fixture 6: no mono font ──────────────────────────────────────────────────

describe('themeToAxes — no mono font', () => {
  const axes = themeToAxes(makeTheme({ display: 'Canela', body: 'Neue Haas Grotesk', mono: null }));

  it('fonts has 2 entries (display + body, both distinct)', () => {
    expect(axes.fonts).toHaveLength(2);
  });

  it('type still in derivable', () => {
    expect(axes.derivable).toContain('type');
  });
});

// ── Fixture 7: partial theme (no texture) ────────────────────────────────────

describe('themeToAxes — partial theme missing texture', () => {
  const theme = {
    palette: { bg: '#0A0E0B', accent: '#B6F22E', text: '#fff', textDim: '#888', surface: '#111' },
    fonts:   { display: { family: 'Inter', weight: 700 }, body: { family: 'Inter', weight: 400 } },
    radius:  { sm: 4, md: 8, lg: 12 },
    motion:  { springs: {}, enterFrames: 12, staggerFrames: 4, holdFrames: 14 },
    // No texture field
  };
  const axes = themeToAxes(theme);

  it('grainPct is null', () => {
    expect(axes.grainPct).toBeNull();
  });

  it('texture not in derivable', () => {
    expect(axes.derivable).not.toContain('texture');
  });

  it('other derivable axes still present', () => {
    expect(axes.derivable).toContain('palette-bg');
    expect(axes.derivable).toContain('palette-accent');
    expect(axes.derivable).toContain('luminance');
    expect(axes.derivable).toContain('type');
  });
});

// ── Fixture 8: null/undefined theme ─────────────────────────────────────────

describe('themeToAxes — null theme', () => {
  const axes = themeToAxes(null);

  it('bg is null', ()    => { expect(axes.bg).toBeNull(); });
  it('accent is null', () => { expect(axes.accent).toBeNull(); });
  it('fonts is []', ()  => { expect(axes.fonts).toEqual([]); });
  it('grainPct is null', () => { expect(axes.grainPct).toBeNull(); });
  it('luminance is unknown', () => { expect(axes.luminance).toBe('unknown'); });
  it('derivable is empty', () => { expect(axes.derivable).toHaveLength(0); });
});

// ── Fixtures 9–12: luminanceClass ────────────────────────────────────────────

describe('luminanceClass', () => {
  it('#0A0E0B (relay bg, Y≈0.003) → dark', () => {
    expect(luminanceClass('#0A0E0B')).toBe('dark');
  });

  it('#505050 (Y≈0.086) → tonal', () => {
    expect(luminanceClass('#505050')).toBe('tonal');
  });

  it('#FAFAFA (Y≈0.955) → light', () => {
    expect(luminanceClass('#FAFAFA')).toBe('light');
  });

  it('invalid hex → unknown', () => {
    expect(luminanceClass('not-a-hex')).toBe('unknown');
  });

  it('#FFFFFF → light', () => {
    expect(luminanceClass('#FFFFFF')).toBe('light');
  });

  it('#000000 → dark', () => {
    expect(luminanceClass('#000000')).toBe('dark');
  });
});

// ── Fixture 13: nonDerivable contract ────────────────────────────────────────

describe('themeToAxes nonDerivable', () => {
  const axes = themeToAxes(makeTheme());

  it('contains arc', () => {
    expect(axes.nonDerivable).toContain('arc');
  });

  it('contains rhythm+moves', () => {
    expect(axes.nonDerivable).toContain('rhythm+moves');
  });

  it('contains transitions', () => {
    expect(axes.nonDerivable).toContain('transitions');
  });

  it('contains music-bpm', () => {
    expect(axes.nonDerivable).toContain('music-bpm');
  });

  it('has exactly 4 entries', () => {
    expect(axes.nonDerivable).toHaveLength(4);
  });
});

// ── Fixtures 14–15: relay golden calibration (via loadTheme/esbuild) ─────────

describe('loadTheme golden — relay', () => {
  it('bg is #0A0E0B', async () => {
    const theme = await loadTheme('relay');
    const axes  = themeToAxes(theme);
    expect(axes.bg).toBe('#0A0E0B');
  });

  it('accent is #B6F22E', async () => {
    const theme = await loadTheme('relay');
    const axes  = themeToAxes(theme);
    expect(axes.accent).toBe('#B6F22E');
  });

  it('grainPct is 5', async () => {
    const theme = await loadTheme('relay');
    const axes  = themeToAxes(theme);
    expect(axes.grainPct).toBe(5);
  });

  it('luminance is dark', async () => {
    const theme = await loadTheme('relay');
    const axes  = themeToAxes(theme);
    expect(axes.luminance).toBe('dark');
  });

  it('fonts contains space grotesk and jetbrains mono', async () => {
    const theme = await loadTheme('relay');
    const axes  = themeToAxes(theme);
    expect(axes.fonts).toContain('space grotesk');
    expect(axes.fonts).toContain('jetbrains mono');
  });

  it('all 5 derivable axes present', async () => {
    const theme = await loadTheme('relay');
    const axes  = themeToAxes(theme);
    expect(axes.derivable).toContain('palette-bg');
    expect(axes.derivable).toContain('palette-accent');
    expect(axes.derivable).toContain('luminance');
    expect(axes.derivable).toContain('type');
    expect(axes.derivable).toContain('texture');
    expect(axes.derivable).toHaveLength(5);
  });
});

// ── Fixtures 16–18: granipa golden calibration (via loadTheme/esbuild) ────────

describe('loadTheme golden — granipa', () => {
  it('bg is #0A0B0E (ink.coldBg)', async () => {
    const theme = await loadTheme('granipa');
    const axes  = themeToAxes(theme);
    expect(axes.bg).toBe('#0A0B0E');
  });

  it('accent is #3D8BFF (brand.blue)', async () => {
    const theme = await loadTheme('granipa');
    const axes  = themeToAxes(theme);
    expect(axes.accent).toBe('#3D8BFF');
  });

  it('grainPct is 4', async () => {
    const theme = await loadTheme('granipa');
    const axes  = themeToAxes(theme);
    expect(axes.grainPct).toBe(4);
  });

  it('luminance is dark', async () => {
    const theme = await loadTheme('granipa');
    const axes  = themeToAxes(theme);
    expect(axes.luminance).toBe('dark');
  });

  it('fonts are [jetbrains mono, sentient, switzer]', async () => {
    const theme = await loadTheme('granipa');
    const axes  = themeToAxes(theme);
    expect(axes.fonts).toEqual(['jetbrains mono', 'sentient', 'switzer']);
  });

  it('all 5 derivable axes present', async () => {
    const theme = await loadTheme('granipa');
    const axes  = themeToAxes(theme);
    expect(axes.derivable).toHaveLength(5);
  });
});
