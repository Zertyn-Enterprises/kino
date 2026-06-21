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
| Final frame | CTA legible, loop-friendly vs frame 0 (CTA scene only) |

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

Run `scripts/retention.sh <Comp>` first and record the verdict before
reading the filmstrip:

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

## 5. Render hygiene (final gate before "done")

- `npm run lint && npm test` green; no unregistered compositions.
- Final render plays start to finish (`npx remotion ffprobe` shows expected
  duration, 1920×1080, h264 + aac audio stream when music exists).
- `git status` clean except intended files; assets have MANIFEST entries
  (source + license + bpm).
