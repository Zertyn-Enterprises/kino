# Legibility gate — text-dwell scorer

Run `scripts/legibility.sh <CompId>` after the full cut is assembled to verify that
on-screen text stays up long enough for a viewer to read it. Output lands in
`out/review/<CompId>/legibility/`:

```
metrics.json   — machine verdict (hardGatesPass + per-gate detail)
metrics.txt    — human-readable table (tee'd output)
```

The script prints `HARD GATES: PASS|FAIL` and exits non-zero on HARD fail.

## How it works

Legibility is measured by combining two signals on 0.25-scale rendered frames:

- **Edge density** (`edgeDensity`) — mean absolute luminance gradient; high values
  indicate text-like sharp edges rather than smooth photographic content.
- **Temporal delta** (`meanAbsDelta`) — mean abs luminance change between consecutive
  samples; low values mean the frame is held steady (readable).

A **text-hold interval** is a maximal run of consecutive samples where both
`edgeDensity > 0.30` AND `temporalDelta < 0.50`. A run is **L1-eligible** if it
spans ≥ `MIN_HOLD_PAIRS = 3` consecutive pairs. A **flash violation** is an
eligible interval that is immediately followed by a clear scene cut
(`delta > CUT_THRESHOLD = 5.0`) AND has a dwell shorter than `MIN_READ_FRAMES = 12`
(0.4 s @ 30 fps).

Reuses `loadFrame`, `toLuminance`, and `meanAbsDelta` from `hook-metrics.mjs`.
No new runtime dependencies.

## Gates

| Gate | Type | Condition |
|------|------|-----------|
| L1 — Text-flash floor | **HARD** | No L1-eligible text-hold interval is cut away in fewer than 12 frames (0.4 s). Only fires on clearly egregious sub-0.4 s flashes. SKIP when no intervals found. |
| L2 — Reading-budget share | Advisory | Cumulative held-text time ≤ 60% of runtime. Fires when the video is a wall of text. SKIP when no intervals found. |
| L3 — Detail stability | Advisory | Mean coefficient of variation of edge density across all holds ≤ 0.40. Fires when text animates/blurs under the reader. SKIP when no intervals found. |

L2 and L3 SKIP when no text-hold intervals are detected (conservative — avoids
false advisories on videos the algorithm cannot measure).

## Thresholds (calibrated against RelayLaunch + GranipaLaunch)

| Constant | Value | Meaning |
|----------|-------|---------|
| `EDGE_DENSITY_THRESHOLD` | 0.30 | Mean abs gradient for a frame to be considered high-detail / text-rich. |
| `HOLD_DELTA_THRESHOLD` | 0.50 | Max frame-to-frame delta for a pair to count as a steady hold. |
| `CUT_THRESHOLD` | 5.0 | Delta that signals a hard scene cut (L1 only fires on cut-terminated intervals). |
| `MIN_READ_FRAMES` | 12 | Minimum dwell in frames (0.4 s) before a terminated hold is allowed. |
| `MIN_HOLD_PAIRS` | 3 | Minimum run length before an interval is L1-eligible (guards animation-pause noise). |
| `L2_MAX_SHARE` | 0.60 | Advisory threshold for the held-text share of runtime. |
| `L3_CV_THRESHOLD` | 0.40 | Advisory threshold for mean edge-density coefficient of variation. |

## Blocking vs advisory enforcement

**L1 (HARD):** A video where L1 fails cannot proceed to rough-cut checkpoint 2
until fixed. Do not proceed with a non-zero `legibility.sh` exit code.

**L2–L3 (ADVISORY):** Failing either requires a named, written justification before
continuing. Unjustified advisory failures are not acceptable.

Common justified L2 fails: typing-animation or icon-animation content where the
algorithm classifies motion pauses as "held text" (RelayLaunch: 74.9%, GranipaLaunch: 87.7%).
Common justified L3 fails: text with animated decorations that raise the CV.

**Machine signal:** `out/review/<CompId>/legibility/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`hard`/`skip` fields.

---

**Recorded snapshots — 2026-06-22. Both reference videos L1 PASS.**

### RelayLaunch

```
Text-flash floor   PASS  intervals=31 eligible=17 violations=0 shortestDwell=15f
Reading-budget share  FAIL (advisory)  share=74.9% (typing animation classified as held)
Detail stability   PASS  meanCv=0.033
```

**Named advisory fail:**
1. **legibility / Reading-budget share** — typing animation in the terminal holds edge
   density above the threshold while remaining temporally stable; the algorithm
   classifies these animation pauses as held-text intervals (share 74.9% > 60%).
   Intentional: the typing IS readable text, not a wall-of-text violation.

### GranipaLaunch

```
Text-flash floor   PASS  intervals=21 eligible=15 violations=0 shortestDwell=36f
Reading-budget share  FAIL (advisory)  share=87.7% (icon animation classified as held)
Detail stability   PASS  meanCv=0.061
```

**Named advisory fail:**
1. **legibility / Reading-budget share** — icon stamp animations hold high edge density
   while dipping below the temporal-delta threshold; the algorithm classifies these as
   held-text intervals (share 87.7% > 60%). Intentional: these are visual anchors, not
   a wall-of-text violation. The icon content is design-intentional.
