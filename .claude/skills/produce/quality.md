# Quality contract — no output may look AI-made

Written after three rejected cuts. These are the root causes of "looks
AI-made" and the binding process that prevents each one. This file
OVERRIDES convenience: skipping a stage here is shipping amateur work.

## Root causes (diagnosed, not hypothetical)

1. **Designing blind in code** — coordinates typed without seeing the
   frame; review at thumbnail granularity → collisions, dead space, no
   composition intent.
2. **Asset poverty** — emoji as icons, default-feeling fonts, hand-approx
   logo marks, invented prices/facts.
3. **Layout by magic numbers** — absolute positions colliding; no grid.
4. **Audio promoted by data, never by ear** — structure-correct but
   generic music; one-shot generated SFX as the final palette.
5. **Abstract metaphors instead of the real product** — elements without
   meaning; the product's actual surfaces and facts are the meaning.

## The production contract (stages, in order, no skipping)

### A · Brand & truth intake
Real assets ONLY: the actual logo files, palette EXTRACTED from them, the
product's real strings, real screenshots, verified facts (prices, names,
URLs — from the repo/README, never estimated). If the product's own UI
uses a distinctive type voice (e.g. serif headings), the video inherits it.
Approximating an existing brand mark is forbidden — use the file.

### B · Design-system lock (before any scene)
- **Type**: ONE display face + ONE text face, vendored locally
  (@remotion/fonts) from a professional foundry catalog (Fontshare-class:
  General Sans, Clash Display, Cabinet Grotesk, Switzer, Sentient…) or the
  brand's own faces. Define the full scale ladder (hero/h2/body/caption
  with exact sizes, leading, tracking) ONCE. Two weights max per face.
- **Icons**: vendored vector set with one stroke width (Lucide-class).
  **Emojis as UI/icons are BANNED — zero exceptions.**
- **Layout**: 12-col grid + spacing scale defined in the video's theme;
  every scene assigns elements to named regions; two elements never share
  a region. No unplanned overlaps survive review.
- **Color**: brand palette + ONE accent doing emotional work; gradient
  text at most once per video.
- **Contrast gate**: run `scripts/contrast.sh <slug> --bg=.. --surface=.. --text=.. --textDim=.. --accent=.. [--accentAlt=..]`
  with the resolved palette hex values immediately after the palette is locked.
  All HARD pairs (text ≥7:1, textDim ≥4.5:1) must pass before any scene code
  is written. Record `out/review/<slug>/contrast/metrics.json` as the artifact
  of record. See `contrast.md` for the full gate spec and ship snapshots.

### C · Styleframes before motion (the biggest unlock)
For each scene, build the STATIC frame at its most important moment first.
Render at FULL resolution. Judge it as a poster: composition, hierarchy,
type quality, spacing rhythm, intent of every element ("why is this here,
this size, now?"). Iterate until someone would frame it. ONLY then
animate. A scene whose styleframe is weak is redesigned, not animated.

### D · Motion under the laws
craft.md §1.5–1.7 + §2 apply unchanged. Motion serves the styleframe.

### E · Audio with human ears
- Music: generate ONE track (standing user direction 2026-06-12 — never a
  candidate menu). The director vets its structure against the arc; the
  human's ears gate is the rough-cut listen, and a rejected track means
  ONE regeneration with a corrected brief. For hero launches a licensed
  human track (Artlist-class) still beats generation.
- SFX: a curated palette the human approved once; generated one-shots are
  drafts, not finals. Every motion sounded, mixed per craft §5 hierarchy.

### F · Review at professional fidelity
- Every key frame of every scene at FULL res (not thumbnails) + step-5
  filmstrips on hero scenes.
- **The AI-tells checklist** — all must come back clean:
  emojis · default-stack fonts · everything-centered compositions ·
  perfectly even spacing everywhere · elements with no narrative purpose ·
  gradient/glow overuse · invented data or placeholder copy · two claims
  on screen at once · colliding/clipped elements · captions glued to
  corners · cursor/caret artifacts.
- **Motion AI-tells 🤖 (M1–M3):** stutter/jank · robotic/linear easing ·
  dead background — now machine-checked. Run `scripts/motion.sh <CompId>`
  and assert `hardGatesPass: true` in `out/review/<CompId>/motion/metrics.json`.
  M1 (stutter/jank) is HARD; M2 (easing presence) and M3 (sustained life)
  are advisory. See `review.md §8`.
- **Legibility AI-tells 🤖 (L1–L3):** text-flash too short to read · wall-of-text
  (reading budget > 60% of runtime) · unstable detail during text holds — now
  machine-checked. Run `scripts/legibility.sh <CompId>` and assert
  `hardGatesPass: true` in `out/review/<CompId>/legibility/metrics.json`.
  L1 (text-flash floor) is HARD; L2 (reading-budget share) and L3 (detail
  stability) are advisory. See `review.md §9`.
- **Code-craft source AI-tells 🤖 (C1–C3):** emojis in on-screen copy · system /
  default-stack / Inter as primary font · raw non-theme hex in scene files ·
  linear/absent easing in `interpolate()` calls — now machine-checked (no render
  required). Run `scripts/code-craft.sh <CompId> <slug>` and assert
  `hardGatesPass: true` in `out/review/<CompId>/code-craft/metrics.json`.
  All four sub-gates are advisory (calibrated against relay+granipa). See `review.md §10`.
- **X-virality production audit** (from 2025-2026 top launches): Hook unmissable in first 1-3s (contrarian claim + live parallel demo with constant background activity)? Frame feels alive with things happening / micro-updates in every shot (no static/slow)? Fast pacing + re-hooks every 5-8s? Professional native chrome + dynamic layered motion? Muted-first (strong visuals + big text)? If any fail, fix before motion pass.
- Minimum two polish rounds per scene. "Compiles and renders" is not a
  bar; "would a motion designer sign this?" is. Would it stop a muted X scroller and hold through the full video?

### G · Ship gate

Run the unified ship gate before committing the render as final:

```bash
scripts/ship-gate.sh <CompId> <slug> \
  --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..] \
  [-- --holds=S:E,... --climax=F --rehook=N]
```

This runs `hook.sh`, `retention.sh`, `contrast.sh`, `motion.sh`, `legibility.sh`,
and `code-craft.sh` in sequence, writes `out/review/<CompId>/ship/report.json`
(machine source of truth) and `report.txt` (human-readable table), and prints `SHIP: READY` or
`SHIP: BLOCKED`. A missing gate metrics.json is a hard blocker. See `ship.md`
for the full report shape, re-run command, and recorded snapshots.

**Per-gate semantics (preserved):**

- **Hook hard gates 1–3** (Motion by frame 10 / Frame-0 contrast / Loop seam)
  are BLOCKING. Advisory gates 4–5 (Background activity / Frame-0 liveness)
  failing require a named, written justification before continuing.
- **Retention gate 1 — Dead-air** is HARD BLOCKING. Advisory gates 2–3
  (Energy build-to-climax / Re-hook cadence) failing require a named, written
  justification. Supply `--holds`, `--climax`, `--rehook` (after `--`) as needed.
- **Contrast HARD pairs** (text ≥7:1 on bg+surface; textDim ≥4.5:1 on
  bg+surface) are BLOCKING. Confirm the palette was not changed since the
  design-system lock run at stage B. Advisory pairs failing require a named
  justification.
- **Motion gate M1 — Stutter/jank** is HARD BLOCKING. Advisory gates M2
  (Easing presence) and M3 (Sustained life) failing require a named, written
  justification. Motion gate runs automatically via `motion.sh` (default step=3;
  no extra flags needed for standard productions).
- **Legibility gate L1 — Text-flash floor** is HARD BLOCKING. Advisory gates L2
  (Reading-budget share) and L3 (Detail stability) failing require a named, written
  justification. Common justified L2 fail: typing-animation or icon-animation content
  where the algorithm classifies motion pauses as held-text intervals. Legibility gate
  runs automatically via `legibility.sh` (default step=3; no extra flags needed for
  standard productions).
- **Code-craft gates C1–C3** are all ADVISORY — `hardGatesPass` is always `true`
  when source files are found. Advisory failures (emoji in copy, system font as primary,
  raw hex in scenes, linear/absent easing) must be reviewed; each must either be fixed
  or receive a named, written justification before ship. Common justified fails: relay's
  social-proof emoji UGC mock (C1-emoji), NorraSite system-font browser simulation
  (C1-font), terminal traffic lights and browser chrome raw hex (C2-hex), CLAMP-only
  options in micro-transition `interpolate()` calls (C3-easing). Code-craft gate runs
  automatically via `code-craft.sh` (no render required; runs before pixel gates).

**Named-justification rule:** advisory failures are acceptable only with a
named, written justification recorded in the review (mirrors the "Named
defects" practice in `hook.md` / `retention.md` / `contrast.md`). A video with
any unjustified hard-gate failure does not ship.

Side-by-side: our best 3 frames vs 3 frames of the reference class
(Apple/Linear/Vercel-grade). If ours is visibly the weaker poster, do not
ship — return to C with named gaps. The reference is a BAR, never a
template to copy.
