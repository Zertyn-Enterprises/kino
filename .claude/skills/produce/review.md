# Review — gates and judging protocol

The self-review loop is the quality mechanism. It exists because plausible
code produces amateur pixels; only the pixels know. Judge RENDERS before
re-reading source.

## 0. Anti-rubber-stamp protocol

Same-session review drifts toward approval. Counteract mechanically:

- For every scene you must either (a) name **3 concrete defects** (with frame
  numbers) and fix the ones that matter, or (b) explicitly assert **each**
  gate below with its measured value ("caption 34px ✓", "body contrast 9.2:1 ✓").
  "Looks good" is not a review.
- Review stills at two zooms: full size AND mentally at thumbnail size
  (does the focal point survive?).
- Judge the render BEFORE re-reading the scene source, so the code's intent
  can't excuse the pixels' reality.

## 1. Still gates (every scene; render with `--props='{"debug":true}'`)

| Gate | Pass |
|---|---|
| Safe margins | No text/UI beyond the DebugGrid 5% rect (bleed-by-design excepted) |
| Text size | Captions ≥22px; check the SMALLEST text in frame |
| Contrast 🤖 | Palette gate run at design-system lock (stage B): `scripts/contrast.sh <slug> ...` → `out/review/<slug>/contrast/metrics.json` must show `hardGatesPass: true`. Assert each pair: text ≥7:1 on bg+surface (HARD), textDim ≥4.5:1 on bg+surface (HARD). Advisory: accent/accentAlt ≥4.5:1 on bg. For gradients, compute against the worst-point bg hex. See `contrast.md`. |
| Focal clarity | One focal point, findable in <0.5s at thumbnail size |
| Alignment | Edges align to something (grid, optical center, each other); no almost-aligned |
| Realism | UI data plausible & dense; no Lorem/John Doe; nothing stretched or upscaled-blurry |
| Frame 0 | Works as a static thumbnail (hook scene only) |
| Final frame 🤖 | Payoff gate (`scripts/payoff.sh <CompId>`) run at full-cut review: P1 (payoff presence & dwell) + P2 (final-frame legibility) are HARD; P3 (closing stability) is advisory. `hardGatesPass: true` is required before final render. See `payoff.md` + §12. |

## 2. Motion gates (filmstrip, step 8 per-scene / 15 full cut)

| Gate | Pass |
|---|---|
| Beat alignment | Scene changes appear within ±1 tile of their storyboard beat frame |
| No teleports | Adjacent tiles show traceable element paths (huge displacement = too fast / missing motion blur) |
| No dead air | >1s of identical tiles only where the storyboard declares a hold |
| Reveal hold | Text readable across ≥2 consecutive tiles at step 8 (≈0.5s), per reading-time rule |
| Single dominance | No tile-pair where two unrelated things both moved significantly |
| Camera alive | Across any 1s of tiles, the frame is never pixel-identical (drift exists) |
| Hero moment | Exactly one scene uses outsized motion; if every scene shouts, re-grade them |
| Loop seam | Last tile → first tile transition wouldn't embarrass the autoplay loop |

## 3. Full-cut judgment (after all scenes pass)

Run `scripts/motion.sh <Comp>`, `scripts/retention.sh <Comp>`, and
`scripts/legibility.sh <Comp>` and record the verdicts before reading the filmstrip:

- **Dead-air (HARD):** confirm `hardGatesPass: true` in
  `out/review/<Comp>/retention/metrics.json`. Non-zero exit = dead air detected;
  fix the timeline. Add `--holds=S:E,...` for intentional freeze-frames.
- **Energy build-to-climax (advisory):** record `peakFrame`, `boundaryFrame`,
  `peakAfterBoundary` from `metrics.json`. Supply `--climax=<narrativeClimaxFrame>`
  when the edit is final. Failing requires a named written justification.
- **Re-hook cadence (advisory):** record `longestFlatSec` and its start frame.
  Failing (>8s flat) requires a named written justification or cut the stretch.

Then read the whole filmstrip start to finish and answer in writing:

1. Where does the eye go in each second, and is that where the story is?
2. Could a muted viewer state the one message after one viewing?
3. Side-by-side with the most similar prior video's filmstrip
   (`src/videos/_registry.md` → `out/review/<that>/strip/`): would a viewer
   suspect the same template? Must be NO on structure/rhythm, not just colors.

## 4. What you cannot review (route to humans)

- **Audio**: mix levels, whether the drop lands, music taste. Place by grid
  math; checkpoint 2 (rough-cut listen) owns the verdict. Say so explicitly.
- **Brand taste**: "feels like us" is the user's call at treatment + rough cut.
- **Smoothness at full framerate**: filmstrips sample; if displacement math
  says a move is fast (>40px/frame) ensure motion blur regardless of how the
  tiles look.

## 6. Hook gate (run on EVERY video, both build paths)

**Tournament (build phase):** Before finalizing the hook scene, build ≥2 archetype
variants and rank them: `scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>'`.
See `hook.md §3` for the ranking key, usage, and RelayLaunch snapshot. Adopt the
winner before running `hook.sh`.

Run `scripts/hook.sh <CompId>` and judge against `hook.md`. This gate is
mandatory on the solo/portable path — not multi-agent-only.

### Blocking vs advisory enforcement

**Hard gates 1–3** (Motion by frame 10 / Frame-0 contrast / Loop seam) are
**BLOCKING**. A video whose hook fails any hard gate cannot be presented as a
rough cut (checkpoint 2) until the failure is fixed. Do not proceed to the
rough-cut listen with a non-zero `hook.sh` exit code.

**Advisory gates 4–5** (Background activity / Frame-0 liveness 🤖) are
**advisory**. A failing advisory gate does not block the rough cut, but it
requires a named, written justification in the review before continuing —
describe the specific creative reason the defect is acceptable (mirrors the
"Named defects" practice in `hook.md`). Unjustified advisory failures are not
acceptable.

**Machine signal**: `metrics.json` (`out/review/<CompId>/hook/metrics.json`) is
the artifact of record — inspect `hardGatesPass` and the per-gate `pass`/`hard`
fields. The `hook.sh` exit code (0 = all hard gates pass, non-zero = at least
one hard gate fails) is the signal an autonomous loop or QA pipeline consumes.
Human-readable verdict is tee'd to `metrics.txt`.

## 7. Retention gate (run on EVERY video at full-cut, both build paths)

Run `scripts/retention.sh <CompId>` after the full cut is assembled and judge
against `retention.md`. Optional flags:
  `--holds=S:E,...`  exclude declared holds from the dead-air gate (frame ranges)
  `--climax=F`       climax frame for the energy-build gate
  `--rehook=N`       max seconds between re-hook punches (default 8)

### Blocking vs advisory enforcement

**Gate 1 — Dead-air (HARD):** A video with >1s of identical-looking tiles
(outside declared holds) cannot proceed to rough-cut checkpoint 2 until fixed.
Do not proceed with a non-zero `retention.sh` exit code.

**Gates 2–3 — Energy build-to-climax / Re-hook cadence (ADVISORY):**
Failing either requires a named, written justification in the review before
continuing. Unjustified advisory failures are not acceptable.

**Machine signal**: `out/review/<CompId>/retention/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`hard` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 8. Motion gate (run on EVERY video at full-cut, both build paths)

Run `scripts/motion.sh <CompId>` after the full cut is assembled and judge
against `motion.md`. Optional flags:
  `--window=S:E`  restrict analysis to a frame range
  `--cuts=F,...`  declare cut frame numbers (auto-detected by default)

### Blocking vs advisory enforcement

**Gate M1 — Stutter/jank (HARD):** Within an active motion run, no pair drops
to near-zero then resumes — catches choppy/dropped-frame animation. A video
where M1 fails cannot proceed to rough-cut checkpoint 2 until fixed. Do not
proceed with a non-zero `motion.sh` exit code.

**Gates M2–M3 — Easing presence / Sustained life (ADVISORY):**
Failing either requires a named, written justification in the review before
continuing. Unjustified advisory failures are not acceptable.

**Machine signal**: `out/review/<CompId>/motion/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`hard` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 9. Legibility gate (run on EVERY video at full-cut, both build paths)

Run `scripts/legibility.sh <CompId>` after the full cut is assembled and judge
against `legibility.md`.

### Blocking vs advisory enforcement

**Gate L1 — Text-flash floor (HARD):** A video where a clearly presented text
block (appear + settle) is cut away in fewer than 12 frames (0.4 s) cannot
proceed to rough-cut checkpoint 2 until fixed. Do not proceed with a non-zero
`legibility.sh` exit code.

**Gates L2–L3 — Reading-budget share / Detail stability (ADVISORY):**
Failing either requires a named, written justification in the review before
continuing. Common justified L2 fail: typing-animation or icon-animation
content where the algorithm classifies motion pauses as held text. Unjustified
advisory failures are not acceptable.

**Machine signal**: `out/review/<CompId>/legibility/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`hard`/`skip` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 10. Code-craft gate (run on EVERY video at full-cut, no render required)

Run `scripts/code-craft.sh <CompId> <slug>` after the full cut is assembled and
judge against `code-craft.md`. The gate is render-free (pure source analysis) and
can also be run at any point during scene work.

### Blocking vs advisory enforcement

**All gates C1–C3 are ADVISORY.** `hardGatesPass` is always `true` when source
files are found, so the gate never blocks by exit code. However:

**C1-emoji and C1-font advisory fails with no justification are production AI-tells** —
treat them as 🔴 blockers in peer review. An emoji in on-screen copy (not in a mock
social-proof string or documented UGC simulation) must be replaced with a vendored
vector icon. A system/Inter font as the primary brand face must be replaced with a
professional foundry face from the design system.

**C2-hex advisory fails:** raw hex in `scenes/**` must be either (a) mock-UI
product-accurate colors (terminal traffic lights, browser chrome, product brand
surfaces) documented with a written justification, or (b) replaced with theme tokens.

**C3-easing advisory fails:** `interpolate()` calls without `easing:` must be
either (a) documented as intentional micro-transitions where neutral easing is
appropriate, or (b) updated to use an explicit easing curve.

**Machine signal**: `out/review/<CompId>/code-craft/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`advisory`/`skip` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 11. Music-sync gate (run before the rough-cut listen, when analysis present)

Run `scripts/musicsync.sh <CompId> <slug> [--climax=F]` after `analyze-music.mjs`
updates `timeline.ts` and before the render. Optional flag:
  `--climax=F`  declared climax cut frame (enables MS3 gate)

### Blocking vs advisory enforcement

**Gates MS1–MS2 — Tempo lock / Downbeat lock (HARD, when analysis present):**
A declared BPM or downbeat that does not match the track shifts every cut in the
video away from the beat grid. A video where MS1 or MS2 fails cannot proceed to
rough-cut checkpoint 2 until the mismatch in `timeline.ts` is corrected. Do not
proceed with a non-zero `musicsync.sh` exit code (when analysis is present).

**SKIP mode (no analysis):** When no `public/<slug>/*.analysis.json` is found, all
gates report `skip: true` and the script exits 0. SKIP never blocks. This is the
normal state for any video whose track has not yet been committed and analyzed.

**Gates MS3–MS4 — Climax on drop / Cut-on-beat coverage (ADVISORY):**
Failing either requires a named, written justification in the review before
continuing. Common justified MS4 fail: a storyboard-documented off-beat SFX cut
or intentional syncopation. Unjustified advisory failures are not acceptable.

**Machine signal**: `out/review/<CompId>/musicsync/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`hard`/`skip` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 12. Payoff gate (run on EVERY video at full-cut, both build paths)

Run `scripts/payoff.sh <CompId>` after the full cut is assembled and judge
against `payoff.md`. Optional flag:
  `--window=S:E`  override the closing window (default: final 90 frames / 3 s)

### Blocking vs advisory enforcement

**Gates P1–P2 — Payoff presence & dwell / Final-frame end-card legibility (HARD):**
P1 fails when the closing window contains no settled identity card (video ends on a
bare or still-animating frame). P2 fails when the final frame is blank or near-
monochrome (fails as a static end card). Either failure means the CTA/autoplay loop
is broken. A video where P1 or P2 fails cannot proceed to the final render. Do not
call `SHIP: READY` with a non-zero `payoff.sh` exit code.

**Gate P3 — Closing stability (ADVISORY):**
Failing requires a named, written justification in the review before continuing.
Common justified P3 fail: a loop-back animation that intentionally resolves after
the declared window end. Unjustified advisory failures are not acceptable.

**SKIP / graceful degradation:** individual gates SKIP in degenerate-sample cases
(never a hard failure). If `payoff.sh` was not run, `ship-metrics.mjs` reports
`payoff.ran = false` (not a hard blocker) — re-run the script to evaluate.

**Machine signal**: `out/review/<CompId>/payoff/metrics.json` is the artifact of
record — inspect `hardGatesPass` and the per-gate `pass`/`hard`/`skip` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 13. Remotion-correctness gate (run on EVERY video, no render required)

Run `scripts/remotion-correct.sh <CompId> <slug>` at any point during scene work
and again at full-cut. Judge against `remotion-correct.md`.

### Blocking vs advisory enforcement

**Gates R1–R2 (HARD):** R1-determinism fails when any nondeterministic call
(`Math.random()`, `Date.now()`, `new Date()`, `performance.now()`) appears in scanned
source — these produce different values on every render call, guaranteeing frame flicker
in the export. R2-media fails when raw `<img>` / `<video>` / `<audio>` JSX opening tags
appear in source — Remotion's renderer cannot sequence these reliably, and they tear on
export. Either failure must be fixed before the next render. Do not call `SHIP: READY`
with a non-zero `remotion-correct.sh` exit code.

**Gates R3–R5 (ADVISORY):** Failing any advisory gate requires a named, written
justification before continuing. Accepted exception classes:
- **R3-interpolate-clamp:** named clamp constant (`CLAMP` / `clamp`) passed as the
  options object — the static scanner cannot resolve identifiers, so these are flagged
  even when clamping is explicit. Short micro-transitions in the `[0, 1]` output range
  where overshoot is geometrically impossible are also acceptable.
- **R4-spring-fps:** `fps` delivered via object spread where the spread source carries `fps`.
- **R5-wallclock:** `useState` for non-animation UI state (tabs, hover, toggle) where
  no time-based side-effect exists.

Unjustified advisory failures are not acceptable.

**SKIP / graceful degradation:** all gates report `skip: true` when no scene files are
found (never a failure). If `remotion-correct.sh` was not run, `ship-metrics.mjs`
reports `remotionCorrect.ran = false` (not a hard blocker) — re-run to evaluate.

**Machine signal:** `out/review/<CompId>/remotion-correct/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`advisory`/`skip` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## 14. Distinctiveness gate (run at treatment time and at ship)

Run `scripts/distinct.sh <slug> [--bg=.. --accent=.. --luminance=.. --arc=.. --bpm=.. --grain=..]`
to confirm the candidate differs on ≥4 identity axes from every prior `_registry.md` entry.
The gate is render-free and parses the registry directly.

**At treatment time (stage 2):** supply pre-registry overrides so the gate runs
before the registry entry is written. Must exit 0 before the treatment is marked APPROVED.

**At ship (stage 7):** `scripts/ship-gate.sh` runs `distinct.sh` automatically as
the 10th gate; inspect `out/review/<slug>/distinct/metrics.json` for the verdict.

### Blocking vs advisory enforcement

**HARD gate — ≥4 axes distinct from every prior:** A candidate that collides with
any prior entry on fewer than 4 axes cannot ship. Exit non-zero = blocked. Fix by
reworking at least (4 − differingCount) axes in the treatment, not the code.

**Advisory — convergence drift:** ≥2 entries share a known default-drift axis
(dark/tonal bg-luminance family, JetBrains Mono, blue/teal accent) → advisory
warning in `metrics.json`. Requires a named written justification; never blocks.

**SKIP mode (n < 2):** when the registry has fewer than 2 entries total, nothing
to compare — the gate exits 0 with `hardGatesPass: true` and `skip: true`. SKIP
is automatically the state for the FIRST video; adds entries to the registry for
it to fire. When `distinct=null` in `ship-metrics.mjs` (gate not run), it also
reports as graceful SKIP — re-run `ship-gate.sh` to evaluate.

**Machine signal**: `out/review/<slug>/distinct/metrics.json` is the artifact of
record — inspect `hardGatesPass`, `perPrior[].differingCount`, and `gates[]` for
advisory drift warnings. Human-readable verdict is tee'd to `report.txt`.
See `distinct.md` for threshold constants and relay+granipa calibration snapshots.

## 5. Render hygiene (final gate before "done")

- `npm run lint && npm test` green; no unregistered compositions.
- Final render plays start to finish (`npx remotion ffprobe` shows expected
  duration, 1920×1080, h264 + aac audio stream when music exists).
- `git status` clean except intended files; assets have MANIFEST entries
  (source + license + bpm).
