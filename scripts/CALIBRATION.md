# Gate-Spine Calibration: Divergent-Shape Coverage

**Branch:** `backend/h-92343f26/calibration-divergent-fixtures`  
**Date:** 2026-06-23  
**Scope:** 9 render-free metric test suites; pure-function / injected-data paths only; zero renders required.

## Summary

All 9 gate-spine metric modules are **robust against divergent video shapes**. Zero mis-fires
(neither false-BLOCK of a valid divergent-but-legitimate shape, nor false-PASS of a real
defect) were found across the four calibration axes:

| Calibration axis | Module(s) affected | Result |
| --- | --- | --- |
| light-luminance palette | retention, payoff, payoff-closure, preflight, code-craft, remotion-correct | **Zero mis-fires** |
| music-less (no bpm) | distinct, musicsync, preflight | **Zero mis-fires** |
| alternate arc/role-naming (arc-C, no climax, ambient) | structure, payoff-closure, distinct, musicsync | **Zero mis-fires** |
| restrained-motion (no energy punches) | retention, remotion-correct, code-craft | **Zero mis-fires** |

---

## Per-module findings

### 1. `structure-metrics` — `structureToFlags`

**Divergent fixtures added:** short rehookSeconds=4, three hold windows, ambient arc (holds+rehook, no climax).

**Finding:** `structureToFlags` is purely arithmetic — it serializes `climaxFrame`,
`holds[]`, and `rehookSeconds` with no shape-specific logic. Any combination of these
fields (including edge cases like three simultaneous holds, or rehookSeconds without
climax) produces the correct flag string. **Robust, zero mis-fires.**

---

### 2. `retention-metrics` — `computeRetentionMetrics`

**Divergent fixtures added:**
- *Light-luminance palette* (fills 200–213): same delta-pattern as the dark baseline.
- *Restrained-motion* (60 frames at delta=1/pair, fills 100–159): no energy punches.

**Key design facts:**
- `DEAD_AIR_FLOOR = 0.05` is a **delta** threshold (|frame_A − frame_B|), not absolute
  luminance. A uniform light-palette frame (fill=200) and another (fill=205) produce
  delta=5, identical behavior to dark fills 100/105. Light-palette videos are
  indistinguishable from dark ones to this gate.
- Gate 1 (dead-air, HARD): passes for light-palette (same deltas) and restrained-motion
  (delta=1 > 0.05, no static run).
- Gate 3 (re-hook cadence, ADVISORY): advisory-fails for restrained-motion when no
  punch > 2.0 spans the full 9.83s clip. `hardGatesPass` remains true.

**Finding:** Light-luminance videos pass all gates identically to dark baselines.
Restrained-motion videos receive an advisory nudge (gate 3) but are never hard-blocked.
**Robust, zero mis-fires.**

---

### 3. `payoff-metrics` — `computePayoffMetrics`

**Divergent fixtures added:** light-palette end-card (bright bg fill=240, dark text
fill=20, bimodal checkerboard).

**Key design fact:** Edge density (P1/P2) is computed from pixel gradient magnitude
using a Sobel-like approach. A checkerboard with bg=240/text=20 produces the same
gradient magnitudes as bg=0/text=255. The gate is luminance-polarity-agnostic.

**Finding:** Light-bg/dark-text end-cards pass P1 (dwell legibility) and P2 (final-frame
legibility) identically to dark-bg/light-text cards. **Robust, zero mis-fires.**

---

### 4. `payoff-closure-metrics` — `evaluate`

**Divergent fixtures added:** Short music-less video (total=300 frames/10s, no climax,
payoff at frame=240).

**Key design fact:** When `climaxFrame=null`, the closing-region boundary falls back to
`floor(totalDurationInFrames * 0.75)` = 225 for a 300-frame video. Payoff at frame=240
(≥ 225) passes C2. This fallback is purely arithmetic and handles any video duration.

**Finding:** Short videos without an explicit climax scene use the 75%-threshold fallback
correctly. **Robust, zero mis-fires.**

---

### 5. `distinct-metrics` — `computeDistinctMetrics`

**Divergent fixtures added:** Music-less candidate (`SERENO_ENTRY`) with
`music: 'no music — ambient nature sound only'`. Two `parseBpmBand` string tests.

**Key design fact:** The code guard for music-bpm comparison is:
```javascript
if (candidate.bpmBand !== 'unknown' && prior.bpmBand !== 'unknown' && ...) {
  divergences.push('music-bpm');
}
```
When `parseBpmBand()` finds no numeric BPM in the music field, it returns `'unknown'`.
The music-bpm axis is then silently excluded from comparison — not counted as same,
not counted as differing. A music-less candidate that differs on ≥4 of the remaining
8 axes still passes the anti-template gate.

The SERENO fixture (light-palette, arc-C, Playfair Display, no grain) differs from
relay on 8 axes and from granipa on 8 axes — all 8 non-bpm axes differ in both cases.

**Finding:** Music-less candidates are correctly handled; bpm axis excluded without
penalty; ≥4 axis rule met on remaining axes. `parseBpmBand` correctly returns
`'unknown'` for "no music" strings. **Robust, zero mis-fires.**

---

### 6. `code-craft-metrics` — `computeCodeCraftMetrics`

**Divergent fixtures added:** Light-palette/restrained scene using theme token references
(`theme.bg`, `theme.text`), Playfair Display font, and `<Img>` from Remotion — no raw
hex, no emoji, no system font, no linear easing.

**Key design fact:** All 4 gates (C1-emoji, C1-font, C2-hex, C3-easing) are **advisory
by design** — `hardGatesPass` is always `true` regardless of which gates fire. This was
a deliberate calibration choice (the static scanner cannot distinguish intentional
mock-UI values from theme drift). The gate cannot false-block any video shape.

**Finding:** All 4 gates advisory → `hardGatesPass` always true for any code shape.
Light-palette restrained scenes pass all 4 advisory gates. **Robust, zero mis-fires.**

---

### 7. `remotion-correct-metrics` — `computeRemotionCorrectMetrics`

**Divergent fixtures added:** Restrained minimal layout scene — pure JSX composition
with `<Img>` from Remotion, static styles from theme tokens, no animation APIs
(no `spring`, no `interpolate`, no `setTimeout`, no `useEffect`).

**Key design fact:**
- R1 (nondeterminism, HARD): only fires on `Math.random()`, `Date.now()`, `new Date()`
  (argless), `performance.now()`. A purely static JSX scene has none of these.
- R2 (raw media tags, HARD): only fires on `<img`, `<video`, `<audio`. Using `<Img>`
  from Remotion is the correct pattern and is not flagged.
- R3/R4/R5 (advisory): only fire on `interpolate` without clamp, `spring` without fps,
  and wallclock APIs. A restrained scene with no animation calls has none of these.

**Finding:** Static/restrained scenes with no animation APIs pass all 5 gates.
**Robust, zero mis-fires.**

---

### 8. `preflight-metrics` — `computePreflightVerdict`

**Divergent fixtures added:**
- *Music-less no-promise video*: timeline with no `promise:` key and no BPM.
- *Light-palette theme*: full token set (`bg`, `surface`, `text`, `textDim`, `accent`)
  with light color values.

**Key design facts:**
- P5 (promise declaration, ADVISORY): fires when `promise:` is absent from timeline
  content. Advisory only — `hardGatesPass` stays true.
- P6 (payoff declaration, ADVISORY): **skips** when no promise is declared (no open
  loop to close). Skip ≠ fail.
- P4 (metadata, ADVISORY): checks for the **presence of key names** in theme.ts
  (`bg`, `surface`, `text`, `textDim`, `accent`), not color values. Light palette
  values pass identically to dark ones.
- P1/P2 (HARD): check Root.tsx registration and file presence — unrelated to palette
  polarity or music presence.

**Finding:** Music-less no-promise videos receive two advisory signals (P5 fails, P6
skips) but are never hard-blocked. Light-palette themes pass P4 identically to dark
themes. **Robust, zero mis-fires.**

---

### 9. `musicsync-metrics` — `computeMusicSync`

**Divergent fixtures added (4 paths not previously exercised):**

**(A) Slow 72bpm ambient track:** MS1 PASS (exact bpm match), MS2 PASS (phase=0),
MS3 PASS (climax at frame=45 = drop at t=1.5s×30fps), MS4 PASS (cuts [25,50,75]
land on 72bpm beat grid at 25 frames/beat). `hardGatesPass=true`.

**(B) Empty drops array (`drops: []`):** `hasDrops = false` → MS3 SKIP. MS1/MS2
(hard) and MS4 (advisory) still evaluate. `hardGatesPass=true`. Confirms music with
no annotated drops doesn't hard-fail.

**(C) Octave BPM relation (declared=120, detected=60):** The gate checks candidate
values [60, 60×2=120, 60÷2=30]; 120=declared → MS1 PASS. Covers half-time
mixing/scoring arrangements. `hardGatesPass=true`.

**(D) Empty cutFrames (`cutFrames: []`):** MS4 SKIP (no cuts to check against beat
grid). MS1/MS2/MS3 still evaluate and pass with `cleanAnalysis`. `hardGatesPass=true`.

**Key design facts:**
- All 4 divergent musicsync paths had correct skip/pass logic already in the source.
  These fixtures confirm those paths are exercised and correct.
- MS1/MS2 are HARD; MS3/MS4 are advisory. SKIP on HARD gates ≠ FAIL → `hardGatesPass`
  is true when hard gates skip or pass.

**Finding:** Slow BPM, empty drops, octave relations, and empty cutFrames all handled
correctly via the existing skip paths. **Robust, zero mis-fires.**

---

## Test count delta

| Metric module | Tests before | Tests after | Added |
| --- | ---: | ---: | ---: |
| structure-metrics | 29 | 33 | +4 |
| retention-metrics | 45 | 53 | +8 |
| payoff-metrics | 22 | 28 | +6 |
| payoff-closure-metrics | 11 | 16 | +5 |
| distinct-metrics | 97 | 106 | +9 |
| code-craft-metrics | 28 | 34 | +6 |
| remotion-correct-metrics | 44 | 50 | +6 |
| preflight-metrics | 54 | 63 | +9 |
| musicsync-metrics | 15 | 31 | +16 |
| **Total** | **345** | **414** | **+59** |

Task 2 (plan-3i2law) added 7 further tests (`dogfood.test.mjs` Fixture K — see §Lock below).

All 1103 tests pass (all-suite, includes Fixture K). `npm run lint` green.

---

## Lock (Task 2 — plan-3i2law)

**Status:** Confirmed. All 59 divergent-shape fixtures from Task 1 are permanent
regression tests in `npm test`. Zero gate-source files were modified (zero
mis-fires found, so no threshold or parser changes were needed).

### Spine guard: coverage beyond relay + granipa

`npm test` now validates the gate spine against **>2 shapes**:
- **relay** + **granipa** — original canonical dark, music-driven shapes
- **59 divergent-synthetic fixtures** across all 9 metric modules, covering:
  - light-luminance palette (retention, payoff, payoff-closure, preflight, code-craft, remotion-correct)
  - music-less (distinct, musicsync, preflight)
  - alternate arc / role naming (structure, payoff-closure, distinct, musicsync)
  - restrained motion (retention, remotion-correct, code-craft)

`dogfood.test.mjs` **Fixture K** wires a divergent-shape synthetic video report
through `normalize()` and `diff()` — any gate-spine edit that accidentally
false-blocks a light-palette, music-less, or restrained-motion shape will
flip a PASS verdict to FAIL in this fixture and fail `npm test`.

### Pre-merge checklist for gate-spine changes

Before merging any edit to `scripts/*-metrics.mjs`, `ship-metrics.mjs`, or `structure.mjs`:

1. **`npm test`** — validates all 9 metric modules including divergent-shape regression
   fixtures; also validates the dogfood normalize/diff logic against a divergent synthetic shape (Fixture K)
2. **`npm run dogfood:check:rf`** — validates relay+granipa source-level (render-free) verdicts
   against the committed golden (`scripts/dogfood.renderfree.golden.json`); **CI-enforced on every PR** (no Chromium needed)
3. **`npm run dogfood:check`** — validates relay+granipa full-render verdicts against
   the committed golden (`scripts/dogfood.golden.json`); run locally before merging (renders too heavy for CI)

All three must exit 0.

---

## Two-tier dogfood

| Tier | Command | Golden | CI | What it catches |
| --- | --- | --- | --- | --- |
| Render-free | `npm run dogfood:check:rf` | `scripts/dogfood.renderfree.golden.json` | ✅ every PR | Regressions in code-craft, remotion-correct, distinct, preflight source gates |
| Full render | `npm run dogfood:check` | `scripts/dogfood.golden.json` | ❌ local only | Regressions in all 10 ship gates including pixel-level hook/retention/motion/legibility/contrast/payoff |

The render-free tier runs on every PR automatically (`.github/workflows/checks.yml`). It protects the source-level gates with no Chromium dependency. The full-render tier is the authoritative pre-merge check — run it locally before merging any gate-spine or `src/lib` change.
