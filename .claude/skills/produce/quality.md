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
- **X-virality production audit** (from 2025-2026 top launches): Hook unmissable in first 1-3s (contrarian claim + live parallel demo with constant background activity)? Frame feels alive with things happening / micro-updates in every shot (no static/slow)? Fast pacing + re-hooks every 5-8s? Professional native chrome + dynamic layered motion? Muted-first (strong visuals + big text)? If any fail, fix before motion pass.
- Minimum two polish rounds per scene. "Compiles and renders" is not a
  bar; "would a motion designer sign this?" is. Would it stop a muted X scroller and hold through the full video?

### G · Ship gate

**Hook gate prerequisite**: before the visual comparison below, confirm that
`metrics.json` (`out/review/<CompId>/hook/metrics.json`) shows
`hardGatesPass: true` and `hook.sh` exited 0. Hard gates 1–3 (motion / frame-0
contrast / loop seam) must be green. Advisory gates 4–5 (background activity /
frame-0 liveness) failing are acceptable only if each has a written, named
justification already recorded in the review. A video with an unjustified
hard-gate failure does not ship.

**Retention gate prerequisite**: confirm that
`metrics.json` (`out/review/<CompId>/retention/metrics.json`) shows
`hardGatesPass: true` and `retention.sh` exited 0. Gate 1 (dead-air) is a
hard block. Advisory gates 2–3 (energy build-to-climax / re-hook cadence)
failing are acceptable only with a named, written justification. Run
`scripts/retention.sh <CompId>` (with `--holds`, `--climax`, `--rehook` as
needed) before the visual comparison. A video with an unjustified hard-gate
failure does not ship.

Side-by-side: our best 3 frames vs 3 frames of the reference class
(Apple/Linear/Vercel-grade). If ours is visibly the weaker poster, do not
ship — return to C with named gaps. The reference is a BAR, never a
template to copy.
