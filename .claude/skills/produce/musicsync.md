# Music-sync gate — audio↔picture alignment verifier

Run `scripts/musicsync.sh <CompId> <slug>` after music analysis to verify that the
video's declared tempo and downbeat match the real track and that cuts land on the
detected beat grid. Output lands in `out/review/<CompId>/musicsync/`:

```
metrics.json   — machine verdict (hardGatesPass + per-gate detail)
metrics.txt    — human-readable table (tee'd output)
```

The script prints `HARD GATES: PASS|FAIL` and exits non-zero on HARD fail.
Degrades cleanly to SKIP (exit 0) when no `public/<slug>/*.analysis.json` is found.

## How it works

`scripts/musicsync-metrics.mjs` is a pure compute module (no I/O). It takes:
- The video's TypeScript timeline, loaded via esbuild at runtime (no hardcoded
  frames — same transform path as vitest, so timeline values are always from source).
- The `*.analysis.json` produced by `node scripts/analyze-music.mjs <slug>` (optional).
- An optional declared climax frame (`--climax=F`); auto-derived from the `role:'climax'` scene in `timeline.ts` when not explicitly passed.

`scripts/musicsync-runner.mjs` handles the I/O: loads the timeline, reads the
analysis JSON, calls `computeMusicSync`, and writes the verdict.

`scripts/musicsync.sh` auto-locates `public/<slug>/*.analysis.json`, runs the
runner twice (once with `--json` for `metrics.json`, once for human `metrics.txt`),
and prints `HARD GATES: PASS|FAIL`.

## Gates

| Gate | Type | Condition |
|------|------|-----------|
| MS1 — Tempo lock | **HARD** (when analysis present; SKIP otherwise) | Declared `bpm` ≈ detected `bpm` within ±2%. Octave relations (×2 / ÷2) are accepted — half/double-time detection does not false-fail. |
| MS2 — Downbeat lock | **HARD** (when analysis present; SKIP otherwise) | Declared `firstDownbeatSec` ≈ detected `firstBeatSec` within ±1 frame (≈0.033 s), modulo one beat period. |
| MS3 — Climax on drop | Advisory (SKIP when no drops / no climax declared) | Declared climax cut frame lands within ±3 frames of the nearest detected `drop`. |
| MS4 — Cut-on-beat coverage | Advisory (SKIP when no analysis / no cut frames) | Share of scene-boundary cut frames within ±1 frame of the detected beat grid ≥ 90%. |

## Graceful SKIP mode

When no `public/<slug>/*.analysis.json` exists — the normal state for the
open-source example videos, which ship no bundled audio — all four gates report
`skip: true` (not `fail`). The gate exits 0 and never blocks ship. This mirrors
the "no preview URL → skip" and "no palette flags → skip" conventions on other gates.

SKIP is also triggered gate-by-gate:
- MS3 skips when analysis has no `drops` array, or when `--climax=F` is not supplied.
- MS4 skips when no cut frames are found in the timeline (degenerate case).

**SKIP must never block ship.** A `musicsync.ran = false` entry in `ship/report.json`
is the expected steady-state for any video whose `analyze-music.mjs` has not been run.

## Usage

```bash
# Default — climax auto-derived from role:'climax' scene in timeline.ts (no hand-typed frame)
scripts/musicsync.sh RelayLaunch relay
scripts/musicsync.sh GranipaLaunch granipa

# Explicit climax override (takes precedence over auto-derive)
scripts/musicsync.sh GranipaLaunch granipa --climax=885

# With tolerance overrides
scripts/musicsync.sh <CompId> <slug> \
  --tol-bpm=0.02 \
  --tol-downbeat=1 \
  --tol-climax=3 \
  --tol-beat=1 \
  --coverage-floor=0.90
```

**Anti-drift:** declare the climax once in `timeline.ts` via `role:'climax'` on the
appropriate scene. `musicsync.sh` auto-derives `--climax` so the MS3 gate always
targets the correct frame even after beat/bpm changes. Explicit `--climax=F` always
overrides the auto-derived value.

The gate is also invoked automatically by `scripts/ship-gate.sh`; `--climax` is
auto-derived there too — no manual flag needed in the unified ship run.

## Thresholds (calibrated against 30 fps video on a tracked music bed)

| Constant | Value | Calibration rationale |
|----------|-------|-----------------------|
| `BPM_TOLERANCE` | 0.02 (±2%) | MusicTempo detection is typically within ~0.5% of the true BPM on a clean track; ±2% gives 4× headroom while still catching gross mismatches (e.g. declaring 120 on a 95 BPM track). Octave relations (×2/÷2) are always tested so a half-time or double-time detection does not fail a correctly declared tempo. |
| `DOWNBEAT_FRAME_TOL` | 1 frame | `timeline.ts` `beatFrame()` rounds to the nearest frame; exact alignment produces a 0-frame delta. ±1 frame absorbs the rounding on both the declared and detected sides without masking a full-frame drift. |
| `CLIMAX_TOL_FRAMES` | 3 frames | Drop timestamps from `analyze-music.mjs` are quantized to 0.25 s RMS windows; ±3 frames (0.1 s) covers the full ±0.125 s half-window with 2 frames to spare. |
| `CUT_BEAT_TOL_FRAMES` | 1 frame | `beatFrame()` rounds, so a correctly placed beat cut lands within 0–1 frames of the grid. |
| `BEAT_COVERAGE_FLOOR` | 0.90 (90%) | Allows 1 out-of-10 for director-approved off-beat cuts (SFX, intentional syncopation) while catching systematic drift. |

## Blocking vs advisory enforcement

**MS1 and MS2 (HARD, when analysis present):** A declared BPM or downbeat that
does not match the track's measured values means every cut in the video is
phase-shifted away from the beat grid — the dominant studio-vs-amateur tell on
playback. Fix `bpm` / `firstDownbeatSec` in `timeline.ts` before proceeding.
Do not proceed to rough-cut checkpoint 2 with a non-zero `musicsync.sh` exit code
(when analysis is present).

**MS3–MS4 (ADVISORY):** Failing either requires a named, written justification in
the review before continuing. Common justified MS4 fail: a SFX cut or intentional
syncopated off-beat transition documented in the storyboard. Unjustified advisory
failures are not acceptable.

**Machine signal:** `out/review/<CompId>/musicsync/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`hard`/`skip` fields.

---

**Recorded snapshots — 2026-06-22. Both reference videos running in SKIP mode
(no audio analysis bundled). Do not hand-edit; re-run the command shown under
each video to update.**

### RelayLaunch

```bash
scripts/musicsync.sh RelayLaunch relay
```

**Recorded snapshot — 2026-06-22. `hardGatesPass: true` (SKIP mode — no analysis)**

```
MS1 Tempo lock             [HARD]     SKIP — no audio analysis provided
MS2 Downbeat lock          [HARD]     SKIP — no audio analysis provided
MS3 Climax on drop         [advisory] SKIP — no audio analysis provided
MS4 Cut-on-beat coverage   [advisory] SKIP — no audio analysis provided

Summary  passed=0 failed=0 skipped=4  bpm=120 fps=30 cuts=8
HARD GATES: PASS
```

All four gates skip: no `public/relay/*.analysis.json` present (open-source video
ships without bundled audio). SKIP-mode PASS never blocks ship. When a licensed
track is committed and `analyze-music.mjs` is run, re-run this command and update
the snapshot.

### GranipaLaunch

```bash
scripts/musicsync.sh GranipaLaunch granipa
```

**Recorded snapshot — 2026-06-22. `hardGatesPass: true` (SKIP mode — no analysis)**

```
MS1 Tempo lock             [HARD]     SKIP — no audio analysis provided
MS2 Downbeat lock          [HARD]     SKIP — no audio analysis provided
MS3 Climax on drop         [advisory] SKIP — no audio analysis provided
MS4 Cut-on-beat coverage   [advisory] SKIP — no audio analysis provided

Summary  passed=0 failed=0 skipped=4  bpm=122 fps=30 cuts=9
HARD GATES: PASS
```

All four gates skip: no `public/granipa/*.analysis.json` present. Same rationale as
RelayLaunch above.
