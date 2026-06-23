# Retention gate — full cut, whole-timeline

> This file gates retention (measurement). To BUILD retention — craft patterns,
> structural specs, theme-token-driven build recipes — see `retention-patterns.md`.

Run `scripts/retention.sh <CompId>` to produce the evidence this gate needs:
- `out/review/<CompId>/retention/strip/` — contact-sheet filmstrip, full cut (every STEP frames)
- `out/review/<CompId>/retention/metrics.json` — machine-readable gate verdict (source of truth)
- `out/review/<CompId>/retention/metrics.txt` — human-readable verdict (tee'd output)

Optional flags (pass after the positional args):
- `--slug=<slug>` — video slug (e.g. `relay`); enables auto-derive of structure flags from `timeline.ts`
- `--holds=S:E,...` — override for declared static holds; auto-derived from `role:'hold'` scenes when `--slug` provided
- `--climax=F` — override for narrative climax frame; auto-derived from `role:'climax'` scene when `--slug` provided
- `--rehook=N` — override for re-hook cadence in seconds; auto-derived from `rehookSeconds` when `--slug` provided

**Anti-drift:** declare structure once in `timeline.ts` via scene `role` (and `rehookSeconds` on the config), then pass
`--slug=<slug>` instead of hand-typing frame numbers. Hand-typed `--climax`/`--holds`/`--rehook` go stale the instant
`bpm` or beat counts change; the auto-derived values always stay in sync with the source. Explicit CLI flags always
override auto-derived ones (for ad-hoc overrides or scripts that pre-compute flags).

## 0. Anti-rubber-stamp

Same-session review drifts toward approval. Counteract mechanically:

For the retention gate you must either (a) name **3 concrete retention defects** (with
frame ranges) and fix the ones that matter, or (b) explicitly assert **each gate below
with its measured value** ("longestStaticSec=0.00s ✓", "longestFlatSec=4.67s ✓").
"Looks fine" is not a review.

Judge the strip BEFORE re-reading the timeline source — the code's intent
cannot excuse the pixels' reality.

## 1. Retention gates

| Gate | Hard? | Pass |
|---|---|---|
| Dead-air | **HARD** | No run of >1s (sampled) with whole-frame mean-abs-lum-delta below floor (0.05), excluding declared holds. Report: longestStaticSec, startFrame, endFrame. |
| Energy build-to-climax | advisory | Peak energy in/after the climax window (not the first third); measurable resolve (energy drop) after it. Use `--climax=F` when the narrative climax is known. Report: peakFrame, boundaryFrame, peakAfterBoundary, resolveRatio. |
| Re-hook cadence | advisory | No body stretch longer than 8s (configurable `--rehook=N`) without a local energy spike. Report: longestFlatSec, longestFlatStartFrame. |
| Full-video loop seam | advisory | Frame 0 vs true final frame whole-frame mean-abs-lum-delta below 60.0 (LOOP_SEAM_THRESHOLD). `loopable:false` is an opportunity flag (not a hard failure) — deliberate CTA-card endings legitimately do not loop. Report: loopSeamDelta, loopable, frame indices compared. |
| Ending hold / no-limp-tail | advisory | Final ~1.5s (ENDING_WINDOW_SEC) is either (a) a stable held end-state (mean < 1.5, HOLD_ENERGY_THRESHOLD) or (b) lands a final energy accent (max > 2.0, ENERGY_SPIKE_FLOOR). FAIL only the limp tail: non-trivial energy decay with neither a held card nor a final accent. Report: endingMode (`held`\|`accented`\|`limp`), endingMeanEnergy, endingMaxEnergy. |

**HARD gate** — a non-zero `retention.sh` exit code blocks rough-cut checkpoint 2.

**Advisory gates** — failing requires a named, written justification before continuing.
Unjustified advisory failures are not acceptable.

## 2. Captured metrics

`scripts/retention.sh` writes `metrics.json` and `metrics.txt` to
`out/review/<CompId>/retention/` on every run — these are the source of truth.
No manual transcription needed.

```
cat out/review/<CompId>/retention/metrics.json   # machine verdict (hardGatesPass, per-gate)
cat out/review/<CompId>/retention/metrics.txt    # human-readable table
```

`retention.sh` exits non-zero on hard-gate failure and prints `HARD GATES: PASS` or
`HARD GATES: FAIL` — consumable by automated loops and QA pipelines.

---

**Recorded snapshot — 2026-06-23 (step=5, gates 1–5). Do not hand-edit; re-run
`scripts/retention.sh <CompId>` to update.**

Gates marked 🤖 are machine-asserted (see `metrics.json`). Advisory fails
require a named justification below.

Gate 2 now uses a windowed sustained-energy signal (centered rolling mean, win≈1s) so
single-frame cut spikes average down. `rawPeakFrame` in `metrics.json` shows the raw
(unsmoothed) peak for comparison.

### RelayLaunch

Full cut: 955 frames (31.83s). 192 samples at step=5.

| Gate | Measured value | Pass? |
|---|---|---|
| Dead-air 🤖 | longestStaticSec=0.17s @frames 480-485 — terminal typing animation keeps all pairs alive | ✓ |
| Energy build-to-climax 🤖 | smoothedPeakFrame=280, rawPeakFrame=265, boundary=318 (first-third heuristic), peakAfterBoundary=false, resolveRatio=0.19 | ✗ (advisory) |
| Re-hook cadence 🤖 | longestFlatSec=5.00s @frame0 (before first energy spike) | ✓ |
| Full-video loop seam 🤖 | loopSeamDelta=6.53, frames 0↔955, loopable=true (threshold <60.0) | ✓ |
| Ending hold / no-limp-tail 🤖 | endingMode=held, mean=0.09, max=0.15, window=9pairs@frame910 (threshold holdEnergy<1.5) | ✓ |

**Named advisory fails:**
1. **Gate 2 — sustained energy peak in first third (true signal)**: the smoothed peak at f280 represents a sustained region of high visual activity in the opening third — scene transitions and animated reveals front-load the visual energy. The narrative climax exists in the back half but with lower total luminance delta. This is a real finding about the edit's pacing: the opening is visually more intense than the climax. To gate the actual narrative climax, supply `--climax=<narrativeClimaxFrame>` explicitly; without it the heuristic correctly identifies that peak visual energy is not building toward the end.

### GranipaLaunch

Full cut: 1120 frames (37.33s). 225 samples at step=5.

| Gate | Measured value | Pass? |
|---|---|---|
| Dead-air 🤖 | longestStaticSec=0.00s — icon stamp-ins + transitions keep all pairs active | ✓ |
| Energy build-to-climax 🤖 | smoothedPeakFrame=305, rawPeakFrame=290, boundary=373 (first-third heuristic), peakAfterBoundary=false, resolveRatio=0.12 | ✗ (advisory) |
| Re-hook cadence 🤖 | longestFlatSec=7.67s @frame390 | ✓ |
| Full-video loop seam 🤖 | loopSeamDelta=9.49, frames 0↔1120, loopable=true (threshold <60.0) | ✓ |
| Ending hold / no-limp-tail 🤖 | endingMode=held, mean=0.17, max=0.21, window=9pairs@frame1075 (threshold holdEnergy<1.5) | ✓ |

**Named advisory fails:**
1. **Gate 2 — sustained energy peak in first third (true signal)**: the smoothed peak at f305 represents sustained visual activity (icon stamp-ins and scene transitions) concentrated in the opening act. The sovereignty/reveal scene in the back half has lower pixel delta than the opening sequence. Same diagnosis as RelayLaunch: the edit front-loads visual intensity. To gate the actual narrative climax, supply `--climax=<narrativeClimaxFrame>` explicitly; without it the heuristic is reporting a real pacing characteristic of this cut.
