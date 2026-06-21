# Retention gate — full cut, whole-timeline

Run `scripts/retention.sh <CompId>` to produce the evidence this gate needs:
- `out/review/<CompId>/retention/strip/` — contact-sheet filmstrip, full cut (every STEP frames)
- `out/review/<CompId>/retention/metrics.json` — machine-readable gate verdict (source of truth)
- `out/review/<CompId>/retention/metrics.txt` — human-readable verdict (tee'd output)

Optional flags (pass after the positional args):
- `--holds=S:E,...` — exclude declared static holds (e.g. a freeze-frame or credits card) from gate 1
- `--climax=F` — supply the narrative climax frame to gate 2 (default: first-third boundary heuristic)
- `--rehook=N` — max seconds between re-hook punches for gate 3 (default: 8)

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

**Recorded snapshot — 2026-06-21 (step=10). Do not hand-edit; re-run
`scripts/retention.sh <CompId>` to update.**

Gates marked 🤖 are machine-asserted (see `metrics.json`). Advisory fails
require a named justification below.

### RelayLaunch

Full cut: 950 frames (31.67s). 96 samples at step=10.

| Gate | Measured value | Pass? |
|---|---|---|
| Dead-air 🤖 | longestStaticSec=0.00s — all sampled pairs show delta≥0.15 (terminal typing animation keeps every frame alive) | ✓ |
| Energy build-to-climax 🤖 | peakFrame=260, boundary=316 (first-third heuristic, no --climax supplied), peakAfterBoundary=false, resolveRatio=N/A | ✗ (advisory) |
| Re-hook cadence 🤖 | longestFlatSec=5.00s @frame0 (longest stretch before first energy spike) | ✓ |

**Named advisory fails:**
1. **Gate 2 — energy peak in first third**: the pixel-energy peak at f260 correlates with a dramatic visual scene transition (high frame-to-frame delta), not the narrative climax. Both shipped videos exhibit this pattern — the gate is a diagnostic signal for future productions. Supply `--climax=<narrativeClimaxFrame>` to assert the correct window once the edit is final.

### GranipaLaunch

Full cut: 1120 frames (37.33s). 113 samples at step=10.

| Gate | Measured value | Pass? |
|---|---|---|
| Dead-air 🤖 | longestStaticSec=0.00s — all sampled pairs show motion (icon stamp-ins + transitions throughout) | ✓ |
| Energy build-to-climax 🤖 | peakFrame=290, boundary=373 (first-third heuristic, no --climax supplied), peakAfterBoundary=false, resolveRatio=N/A | ✗ (advisory) |
| Re-hook cadence 🤖 | longestFlatSec=4.67s @frame630 | ✓ |

**Named advisory fails:**
1. **Gate 2 — energy peak in first third**: same pattern as RelayLaunch — the pixel-energy peak correlates with the largest scene transition (f290), which falls before the first-third boundary (f373). The narrative climax (sovereignty scene) is later but produces lower pixel delta. Known limitation of the first-third heuristic when dramatic transitions cluster early; supply `--climax=F` to gate the actual narrative climax on future productions.
