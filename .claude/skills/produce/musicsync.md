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

The gate has three states depending on music intent and whether an analysis file exists:

| State | Condition | Per-gate | Top-level verdict | Blocks ship? |
|-------|-----------|----------|-------------------|-------------|
| **skip** | No music intent AND no analysis (sereno) | `skip: true` | `'skip'`, `hardGatesPass: true` | No |
| **unverified** | Music intent declared AND no analysis (relay, granipa before analysis) | MS1/MS2/MS3: `status: 'unverified'`; MS4: `skip: true` | `'unverified'`, `hardGatesPass: true` | No (advisory) |
| **verified** | Analysis present | MS1/MS2: HARD pass/fail | `'pass'` or `'fail'` | Yes on HARD fail |

**Music-intent detection (render-free):** the runner reads `src/videos/<slug>/Main.tsx` for
`MusicBed` import/usage or `staticFile(...music...)` references, and checks
`public/<slug>/MANIFEST.md` for an Audio section. Videos with no music composition
(sereno) resolve to no-intent → `skip`. Music-scored videos (relay, granipa) resolve to
intent → `unverified` when no `.analysis.json` is present.

**Why three states?** A music-scored video whose analysis was never run previously silently
skipped all four gates and shipped READY with beat-lock unchecked — a false-READY on the
core virality lever. The `unverified` state emits a loud advisory (`MUSIC: UNVERIFIED ...`)
and records `musicsync.status: 'unverified'` in `ship/report.json`, so the ship gate no
longer silently passes unanalyzed music-scored videos.

SKIP is also triggered gate-by-gate (independent of the top-level three-state logic):
- MS3 skips when analysis has no `drops` array, or when `--climax=F` is not supplied.
- MS4 skips when no cut frames are found in the timeline (degenerate case).

**SKIP must never block ship.** A `musicsync.ran = false` entry in `ship/report.json`
is the expected steady-state for any video whose `analyze-music.mjs` has not been run.
`musicsync.status: 'unverified'` is the expected state for a music-scored video that has
not yet been analyzed — it is advisory, not a hard blocker.

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

**Recorded snapshots — 2026-06-24. relay=UNVERIFIED (music intent detected, no analysis),
sereno=SKIP (no music intent). Do not hand-edit; re-run the command shown under each video
to update.**

### RelayLaunch

```bash
scripts/musicsync.sh RelayLaunch relay
```

**Recorded snapshot — 2026-06-24. `hardGatesPass: true` (UNVERIFIED — music intent detected, analysis not yet run)**

```
MS1 Tempo lock             [HARD]     UNVERIFIED — music intent declared but analysis not run
MS2 Downbeat lock          [HARD]     UNVERIFIED — music intent declared but analysis not run
MS3 Climax on drop         [advisory] UNVERIFIED — music intent declared but analysis not run
MS4 Cut-on-beat coverage   [advisory] SKIP — no audio analysis provided

Summary  passed=0 failed=0 skipped=1 unverified=3  bpm=120 fps=30 cuts=8

MUSIC: UNVERIFIED (declared but unanalyzed — run `node scripts/analyze-music.mjs relay`)
HARD GATES: PASS
```

MS1/MS2/MS3 are UNVERIFIED (not SKIP): relay imports `MusicBed` and declares `bpm:120`,
so music intent is detected. MS4 stays `skip: true` (no analysis for the beat grid).
HARD GATES: PASS (advisory — does not block ship). Run `node scripts/analyze-music.mjs relay`
and re-run this command to move to the `verified` state.

### GranipaLaunch

```bash
scripts/musicsync.sh GranipaLaunch granipa
```

**Recorded snapshot — 2026-06-24. `hardGatesPass: true` (UNVERIFIED — music intent detected, analysis not yet run)**

```
MS1 Tempo lock             [HARD]     UNVERIFIED — music intent declared but analysis not run
MS2 Downbeat lock          [HARD]     UNVERIFIED — music intent declared but analysis not run
MS3 Climax on drop         [advisory] UNVERIFIED — music intent declared but analysis not run
MS4 Cut-on-beat coverage   [advisory] SKIP — no audio analysis provided

Summary  passed=0 failed=0 skipped=1 unverified=3  bpm=122 fps=30 cuts=9

MUSIC: UNVERIFIED (declared but unanalyzed — run `node scripts/analyze-music.mjs granipa`)
HARD GATES: PASS
```

Same three-state rationale as RelayLaunch: granipa imports `MusicBed`, so music intent is
detected. Run `node scripts/analyze-music.mjs granipa` to move to the `verified` state.

### SerenoLaunch

```bash
scripts/musicsync.sh SerenoLaunch sereno
```

**Recorded snapshot — 2026-06-24. `hardGatesPass: true` (clean SKIP — no music intent)**

```
MS1 Tempo lock             [HARD]     SKIP — no audio analysis provided
MS2 Downbeat lock          [HARD]     SKIP — no audio analysis provided
MS3 Climax on drop         [advisory] SKIP — no audio analysis provided
MS4 Cut-on-beat coverage   [advisory] SKIP — no audio analysis provided

Summary  passed=0 failed=0 skipped=4  bpm=60 fps=30 cuts=4
HARD GATES: PASS
```

All four gates skip: sereno does not compose `MusicBed` and declares no music track, so
music intent resolves to false → clean SKIP (not UNVERIFIED). SKIP is the correct steady
state for audio-less videos and never blocks ship.
