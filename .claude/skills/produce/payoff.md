# Payoff gate — closing-window identity verifier

Run `scripts/payoff.sh <CompId>` after the full cut is assembled to verify that
the closing window contains a held, legible product identity. Output lands in
`out/review/<CompId>/payoff/`:

```
final.png      — full-res final frame (end-card check; mirrors hook.sh)
metrics.json   — machine verdict (hardGatesPass + per-gate detail)
metrics.txt    — human-readable table (tee'd output)
```

The script prints `HARD GATES: PASS|FAIL` and exits non-zero on HARD fail.

## How it works

`scripts/payoff-metrics.mjs` is a pure compute module (no I/O). It takes a PNG
sequence of the closing window (default: final 90 frames / 3 s at 30 fps,
overridable via `--window=S:E`) rendered at 0.25 scale, then evaluates:

- **Edge density** — mean absolute luminance gradient per frame; high values
  indicate a content-rich identity card rather than a bare/animated frame.
- **Temporal delta** — mean abs luminance change between consecutive samples;
  low values confirm a steady hold rather than still-animating content.

A **hold run** is a maximal run of consecutive sample-pairs where both
`edgeDensity > EDGE_DENSITY_THRESHOLD` AND `delta < HOLD_DELTA_THRESHOLD`.
Dwell in frames equals `(runLength + 1) × step`.

Reuses `loadFrame`, `toLuminance`, `meanAbsDelta`, and `stddev` from
`hook-metrics.mjs` and `edgeDensity`, `EDGE_DENSITY_THRESHOLD` from
`legibility-metrics.mjs`. No new runtime dependencies.

## Gates

| Gate | Type | Condition |
|------|------|-----------|
| P1 — Payoff presence & dwell | **HARD** | Within the closing window there exists at least one hold run with `dwellFrames ≥ MIN_PAYOFF_DWELL` (12 f / 0.4 s). Fails only on egregious cases: the video ends on a bare or still-animating frame with no settled identity card. SKIP when fewer than 2 samples are provided. |
| P2 — Final-frame end-card legibility | **HARD** | The very last frame clears the empty-frame edge floor (`edgeDensity > EDGE_DENSITY_THRESHOLD`) AND has sufficient luminance contrast (`stddev > CONTRAST_THRESHOLD`). The closing-side mirror of hook gate-2 "frame 0 works as a thumbnail". SKIP when the last frame is unreadable. |
| P3 — Closing stability | Advisory (SKIP-friendly) | The last `P3_STABLE_PAIRS` consecutive delta-pairs are all `< HOLD_DELTA_THRESHOLD`, confirming the video ends on a settled state rather than mid-animation. SKIP when fewer than `P3_STABLE_PAIRS + 1` samples are available. |

## SKIP and graceful-degradation mode

The payoff gate runs on every video — there is no conditional runner-level SKIP
(unlike musicsync, which skips when no audio analysis exists). However:

- Individual gates report `skip: true` in degenerate cases (< 2 samples for P1,
  unreadable last frame for P2, < 3 samples for P3). A gate-level SKIP is never
  a failure; it degrades to `hardGatesPass: true` for that gate.
- **Ship-level SKIP:** if `payoff.sh` was not run or its `metrics.json` is absent,
  `ship-metrics.mjs` degrades cleanly to `{ ran: false, hardGatesPass: true }` — the
  same SKIP-safe null pattern as musicsync. `payoff.ran = false` in `ship/report.json`
  is never a hard blocker; it simply means the gate was not evaluated.

**SKIP must never block ship.** Re-run `scripts/payoff.sh <CompId>` to populate
the metrics and convert the SKIP to an evaluated PASS or FAIL.

## Usage

```bash
# Default closing window (final 90 frames / 3 s); --slug passed by ship-gate.sh for consistency
scripts/payoff.sh RelayLaunch

# Custom closing window
scripts/payoff.sh GranipaLaunch 3 '' --window=870:959

# With a custom sampling step
scripts/payoff.sh <CompId> [step=3] [propsJson] [--window=S:E] [--slug=<slug>]
```

`--slug=<slug>` is accepted but produces no structural auto-loading — the payoff gate's
closing window (duration-derived default or explicit `--window`) has no timeline-role
equivalent. The flag is accepted for API symmetry with `retention.sh` and for
forward compatibility.

The gate is also invoked automatically by `scripts/ship-gate.sh` using the default
closing window. To gate a custom window in the unified ship run, run `payoff.sh`
manually first with `--window=S:E` and verify `metrics.json` before calling
`ship-gate.sh`.

## Thresholds (calibrated against 30 fps video; egregious-only, same philosophy as legibility)

| Constant | Value | Calibration rationale |
|----------|-------|-----------------------|
| `EDGE_DENSITY_THRESHOLD` | 0.30 | Mirrors `legibility-metrics.mjs`. A settled wordmark + CTA card on a dark background reads edge density > 1.0 on both reference videos; 0.30 is the floor that separates content-rich frames from bare/gradient-only frames without false-failing subtle design work. |
| `HOLD_DELTA_THRESHOLD` | 0.50 | Mirrors `legibility-metrics.mjs`. A held static card produces deltas of 0.0–0.2 (RelayLaunch: 0.08, GranipaLaunch: 0.16 measured max-tail); 0.50 provides 2.5–6× headroom over real hold deltas while still flagging continuing animation. |
| `CONTRAST_THRESHOLD` | 5.0 | Mirrors hook gate-2 luminance-stddev floor. Both reference videos clear 19+ on the final frame (RelayLaunch: 19.85, GranipaLaunch: 20.96); 5.0 is an egregious-only floor that only catches a near-monochrome end card. |
| `MIN_PAYOFF_DWELL` | 12 | 0.4 s @ 30 fps — the same minimum-dwell constant as legibility gate L1. At `step=3` a dwell of 12 requires 3 consecutive hold pairs; RelayLaunch + GranipaLaunch both hold the entire 90-frame closing window (dwell=90). |
| `P3_STABLE_PAIRS` | 2 | Last 2 delta-pairs must be held; skips on < 3 samples. Two consecutive stable pairs (0.13 s at step=3) is enough to confirm the video does not cut away while animating, without requiring the full window to be still. |

## Blocking vs advisory enforcement

**P1 and P2 (HARD):** A closing window with no settled identity card (P1) or a
final frame that is blank or monochrome (P2) is a direct conversion failure — the
autoplay loop ends on nothing, and the install/follow CTA is lost. Fix the CTA scene
(ensure wordmark + action text hold for ≥ 12 frames) before proceeding to the final
render. Do not call `SHIP: READY` with a non-zero `payoff.sh` exit code.

**P3 (ADVISORY):** Failing P3 requires a named, written justification in the review
before continuing. Common justified P3 fail: a loop-back animation intentionally
resolves after the declared window end. Unjustified advisory failures are not
acceptable.

**Machine signal:** `out/review/<CompId>/payoff/metrics.json` is the artifact of
record — inspect `hardGatesPass` and the per-gate `pass`/`hard`/`skip` fields.

---

**Recorded snapshots — 2026-06-22. Both reference videos PASS all gates.
Do not hand-edit; re-run the command shown under each video to update.**

### RelayLaunch

```bash
scripts/payoff.sh RelayLaunch
```

**Recorded snapshot — 2026-06-22. `hardGatesPass: true` (30 samples, step=3, default window)**

```
── Payoff pixel metrics ────────────────────────────────────
   30 samples · step=3 · holdRuns=1
Payoff presence & dwell      PASS  runs=1 maxDwell=90f (threshold ≥12f, edge>0.3)
Final-frame legibility       PASS  edge=1.040 contrast=19.85 (threshold edge>0.3 contrast>5)
Closing stability            PASS  pairs=2 maxDelta=0.079 stable=true (threshold delta<0.5) (advisory)
───────────────────────────────────────────────────────────

HARD GATES: PASS
```

P1: one continuous hold run spanning the entire 90-frame default window — wordmark
+ `npm i` chip + URL held steady from the first closing frame. P2: final-frame edge
density 1.040 and luminance contrast 19.85 — both well above the 0.30 / 5.0 floors.
P3: max tail delta 0.079, well below 0.50.

### GranipaLaunch

```bash
scripts/payoff.sh GranipaLaunch
```

**Recorded snapshot — 2026-06-22. `hardGatesPass: true` (30 samples, step=3, default window)**

```
── Payoff pixel metrics ────────────────────────────────────
   30 samples · step=3 · holdRuns=1
Payoff presence & dwell      PASS  runs=1 maxDwell=90f (threshold ≥12f, edge>0.3)
Final-frame legibility       PASS  edge=1.664 contrast=20.96 (threshold edge>0.3 contrast>5)
Closing stability            PASS  pairs=2 maxDelta=0.159 stable=true (threshold delta<0.5) (advisory)
───────────────────────────────────────────────────────────

HARD GATES: PASS
```

P1: one continuous hold run spanning the entire 90-frame default window — resolved
home screen + wordmark held steady. P2: final-frame edge density 1.664 and luminance
contrast 20.96 — both well above the 0.30 / 5.0 floors. P3: max tail delta 0.159,
well below 0.50.
