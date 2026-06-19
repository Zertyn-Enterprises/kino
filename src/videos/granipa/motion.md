# Grañipa v3 — motion specs (quality.md stage D)

Motion ON TOP of the approved styleframes. The styleframe is LAW: the
settled layout (positions, sizes, colors, copy) must match the approved
still (`out/review/granipa-v3/<scene>.png`) — motion decides how elements
ARRIVE, BREATHE and LEAVE, never where they sit.

## Global contract

- craft.md §1.5–1.7 and §2 apply unchanged (read them). Springs from
  `theme.motion.springs` via `src/lib/springs.ts` helpers; stagger 4f;
  **hold ≥18f after every reveal**; max 2 simultaneous movers; nothing
  pops without easing; everything deterministic (no Math.random/Date).
- Allowed motion helpers: `src/lib/fx.tsx` (Shake, Flash, useCountUp…),
  `src/lib/typing.ts` (burstSchedule/charsVisible), `src/lib/springs.ts`,
  `src/lib/text.tsx`. Design system imports stay locked (theme/system/icons).
- Scene-local frame constants below are FINAL — update each scene's
  exported constants to EXACTLY these values (Main.tsx places SFX on them).
- Scenes end HOLDING their settled frame (hard cuts do the exits).
- Keep component name + `{ moment?: number }` signature.

## Verify loop (every iteration)

```
npx tsc --noEmit            # your file clean (sibling errors: wait 20s, retry ≤3)
npx eslint src/videos/granipa/scenes/<File>
scripts/filmstrip.sh GranipaFrame 6 '{"scene":"<id>","strip":true}' GranipaFrame-<id>
# READ every sheet in out/review/granipa-v3/../out/review/GranipaFrame-<id>/strip/
npx remotion still GranipaFrame out/review/granipa-v3/<id>-settled.png \
  --props='{"scene":"<id>","frame":<SETTLED>}'
# READ it side-by-side against the approved out/review/granipa-v3/<id>.png
```

Judge the strip: entrance rhythm visible, holds present (≥3 near-identical
consecutive thumbs at step 6 after each reveal), no element collides with
another WHILE TRAVELING, settled layout == approved styleframe. Iterate ≥2.

Scene durations (locked timeline): hook 159f · indict 235f · gutpunch 78f ·
reveal 117f · features 235f · architecture 176f · sovereignty 157f ·
kicker 137f · cta 156f.

---

## S1 · hook — 159f (the track's beatless intro; SETTLED=130)

- f0–8 empty cold frame (the void breathes first).
- Question settles word-by-word from f8: per word opacity 0→1 + y 8px,
  `settle` spring, 3f stagger; line complete ≈ f50. Serif never bounces.
- Menu bar slides down from y −44 at f56 (`settle`, 12f).
- Menu icons blink alive at f70 / f82 / f94 (opacity 0.25→1, 6f each).
- Label `one ordinary tuesday` fades up f110 (10f).
- f124–159: TOTAL hold — tension into the first downbeat (the cut).

## S2 · indict — 235f (`INDICT_BEATS = [0, 78, 157]`; SETTLED=200)

- Charge rows stamp ON the beats: icon+line as one unit, scale 0.97→1 +
  opacity, `snap` 10f; the row's chip follows +8f.
- When a new charge stamps, previous charges dim to 0.55 opacity (12f).
- Right `MacWindow` enters f6 (x +40 → 0, `settle`); its document lines
  creep upward continuously (translateY −frame×0.06 — surveillance never
  sleeps).
- Three coral strings rise on loop: each travels window-top → off-frame
  over ~90f, staggered 30f apart, opacity ramps 0→1→0 at the ends.
- `uploading · third-party cloud` label pulses gently (0.85↔1, 24f period).
- Charge 3 stamps f157 → holds ≥60f to cut. Camera: none (clinical).

## S3 · gutpunch — 78f (SETTLED=40)

- Line 1 settles f0–10 (opacity only — quiet).
- f14: line 2 CUTS in — 1-frame appear + 2px y settle. Hard arrival.
- f16–78: NOTHING moves. The only motion: vignette strength eases
  0.28→0.34 across the scene (near-subliminal tightening).

## S4 · reveal — 117f (starts ON the 15.75s drop; SETTLED=70)

- f0 world is already warm (the cut did the flip). A radial glow burst
  behind the icon: scale 0.8→1.15 + opacity 0.9→ambient over 20f.
- Icon: `dramatic` spring scale 0.6→1.0, f0–14; glow 0→0.45 swell.
- Label `so i built the whole job` rises f10 (settle).
- Hero line 1 `everything` f16 (y 8px settle).
- Hero line 2 `on-device.` f26: clip-path inset wipe left→right over 10f —
  the gradient REVEALS, it doesn't fade.
- Body line f44. Hold from f58; icon glow breathes ±0.06 (60f period).

## S5 · features — 235f (`FEATURE_POPS = [8, 59, 118, 177]`; SETTLED=50)

The pane cycles the four tools ON the pops; sidebar pill + bottom dock
highlight follow the active tool in sync (8f spring slide / color swap).
Pane switch = 6f crossfade; each pane's content staggers in 4f. Every pane
holds ≥45f fully legible. **Each pane is a mini-styleframe: render a still
mid-pane (f50 / f100 / f160 / f215) and judge each as a poster.**

- Window enters f0–12: scale 0.985→1 + opacity (`settle`).
- Pane 1 NOTES (f8): the approved styleframe state — transcript lines type
  word-by-word (use `typing.ts` burst rhythm), timestamps appear with their
  line, live-pill dot pulses (16f), caret blinks on the open line. The
  f50 settled still must match the approved styleframe.
- Pane 2 CLIPBOARD (f59): history list, 5 rows staggered in: redacted
  `sk-••••••••` · `meeting notes — 14:02` · `https://granipa.dev/docs` ·
  `#3D8BFF` · `.env — DATABASE_URL=••••`; `⌥⇧V` Kbd hint top-right.
- Pane 3 SCREEN OCR (f118): a dim screenshot-like region; a marquee
  rectangle DRAWS (stroke, 12f) around a text block; extracted lines
  appear to its right (4f stagger); `⌥⇧T` hint.
- Pane 4 SNAPPING (f177): mini desktop, two window rects snap into left /
  right halves (`snap` spring, 10f, one then the other); `⌃⌥←` hint.

## S6 · architecture — 176f (`BLOOM = 118`; node beats f20/f39/f59; SETTLED=150)

- h2 settles f0–12.
- Boundary rect draws f8–40 (stroke-dashoffset around the perimeter);
  `your mac` tab fades f36.
- Nodes light at f20 / f39 / f59: card opacity 0.4→1 + icon `ink.dim`→
  `ink.text`, `snap`. Connector fills L→R (8f wipe) after each node.
- f59–118: hold; the only life = a 3px dot traveling the connectors every
  30f (deterministic loop).
- f118 BLOOM (rides the track's real 31s bloom): the beam extends
  boundary→terminal over 10f (scaleX, origin left), terminal card pops
  (`snap`), boundary glow 0.45→0.7, ambient warms.
- Caption f134; `your account · your rules` chip f146. Hold from f150.

## S7 · sovereignty — 157f (`SOV_BEATS = [20, 39, 59]`, `DELETE_AT = 98`; SETTLED=80)

- h2 f0–12; `delete it — it's gone.` f14.
- Folder card enters f6 (x −30 → 0, `settle`).
- File rows tick in on SOV_BEATS (+ footer f70): opacity + x −12, `snap`.
- f98: `$ rm -rf ~/Grañipa` TYPES (≈12f, mono caret visible).
- f114–128: the folder card dissolves UP — y −40, opacity→0, blur 0→2px.
- f128–157: h2 + delete line hold ALONE (the point lands in stillness).

## S8 · kicker — 137f (`KICK_SLAM = 59`; SETTLED=100)

- Chips enter f0–8 (4f stagger, `settle`) — NOT yet struck.
- Strikes at f12 / f24 / f36 / f48: line-through draws across the chip
  (8f wipe) + chip dims to 0.65.
- Label `oh, and it's free.` f40 (setup before payoff).
- Caption `≈ $40/mo, every month` f52.
- f59 SLAM: `$0` drops in scale 1.3→1.0 `dramatic` 8f + screen shake
  ≤4px decaying over 10f (fx Shake, deterministic).
- Body `open source. local is also cheaper.` f74. Hold from f86.

## S9 · cta — 156f (URL pop f78; SETTLED=120)

- Lockup: icon scale 0.92→1 + wordmark opacity f0–14 (`settle`, calm).
- `open source · on-device · free` f24.
- URL chip pops f78 (`snap`, scale 1.04→1) — beat-aligned.
- Rec seam fades up f100; waveform bars move gently (per-bar sin phase,
  deterministic, amplitudes 8–24px).
- f120–156: full hold (thumbnail-stable end card; music fades out over it).

---

## Post-audit amendments (2026-06-12, engagement audit on the full cut)

1. **hook REDESIGNED**: frame 0 = full question + menu bar composed (the
   thumbnail law; no fade-from-black). Copy trimmed to the treatment's
   distilled `what your mac tools see in a day:` (open colon). Dead air
   f40–159 replaced by a camera punch into the menu-bar cluster (f56→,
   scale 1.7, origin at the icon cluster) while the icons blink alive on
   the existing f70/82/94 SFX ticks. The `one ordinary tuesday` label was
   dropped (its job is done by the punch).
2. **reveal**: world-flip luminance raised — full-frame warm wash (0.14)
   decaying with the burst + hotter burst alphas (0.5/0.3).
3. **features**: dock enters f30+ (4f stagger) after window+pane settle;
   transcript row 3 is now Spanish (`cerramos el deck mañana…`) — shows
   "any language" instead of stating it.
4. **architecture**: caption trimmed to `only what you choose to send.
   no api keys.` and lands at f126 (just after BLOOM).
5. **kicker**: re-sequenced strikes 8/18/28/38 → total (now `type.body`,
   `ink.text`) f42 → label f50 → slam 59. Main.tsx tick cues updated.
