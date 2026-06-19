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
| Contrast | Body ≥7:1, display ≥4.5:1 vs actual local bg (compute from hex; gradients at worst point) |
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

Read the whole filmstrip start to finish and answer in writing:

1. Where does the eye go in each second, and is that where the story is?
2. Does energy build toward the climax, or plateau? (Tile-to-tile change
   should generally INCREASE until the climax, then resolve.)
3. Could a muted viewer state the one message after one viewing?
4. Which 2 seconds would you cut? (There are always 2 seconds. Cut them in
   `timeline.ts`.)
5. Side-by-side with the most similar prior video's filmstrip
   (`src/videos/_registry.md` → `out/review/<that>/strip/`): would a viewer
   suspect the same template? Must be NO on structure/rhythm, not just colors.

## 4. What you cannot review (route to humans)

- **Audio**: mix levels, whether the drop lands, music taste. Place by grid
  math; checkpoint 2 (rough-cut listen) owns the verdict. Say so explicitly.
- **Brand taste**: "feels like us" is the user's call at treatment + rough cut.
- **Smoothness at full framerate**: filmstrips sample; if displacement math
  says a move is fast (>40px/frame) ensure motion blur regardless of how the
  tiles look.

## 5. Render hygiene (final gate before "done")

- `npm run lint && npm test` green; no unregistered compositions.
- Final render plays start to finish (`npx remotion ffprobe` shows expected
  duration, 1920×1080, h264 + aac audio stream when music exists).
- `git status` clean except intended files; assets have MANIFEST entries
  (source + license + bpm).
