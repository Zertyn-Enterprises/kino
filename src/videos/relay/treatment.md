# Treatment — Relay launch film

## Product (fictional — system demo)

**Relay** (relay.dev): every `git push` gets a live preview environment,
instantly. Audience: web developers who lose minutes to CI/deploy queues many
times a day. Posted on X, 16:9.

## Logline (the one message)

**Push. It's already live.** — the gap between writing code and seeing it
deployed is zero.

## Emotional arc

Arc **B — problem-first** (direction.md §4): recognition → relief → desire.
The pain (waiting for deploys) is universal, specific, and dramatizable with
a clock. Act emotions: weary recognition (hook) → held breath (turn) →
exhale/awe (reveal) → mounting confidence (proof ×3) → scale-awe (climax) →
calm resolve (CTA).

## Hook (first 75 frames)

Mid-action terminal: `git push` typed in realistic bursts, Enter — and then
the genre's cruelest image: `Waiting for runner…` with a queue position and a
clock that time-lapses 0:00 → 14:32. Muted viewers read the command (they
type it 20× a day) and feel the spinner in their bones. Motion from frame 1
(typing). Frame 0 thumbnail: the half-typed command, cursor block lit.

## Identity derivation

Metaphors (from "instant deploy"): **zero gap** between cause and effect ·
**ripple** outward from a point of change · **pulse** of something live ·
propagation across a mesh.

Signature moves (bespoke code, library math only):

1. **Zero-gap cut** — causes and effects collapse onto the SAME beat frame:
   Enter keypress IS the cut to the live site; a rollback click IS the
   version swap. No easing between cause and effect, ever. (The genre does
   causal latency; Relay's entire point is deleting latency.)
2. **Ripple reveal** — new things propagate radially from their origin
   (preview pills cascade outward from the newest commit; mesh nodes light
   outward from one node; the reveal floods the dark frame from the cursor).
3. **The pulse** — live things breathe: a 1-beat luminance pulse on preview
   URLs, status dots, the mesh. Accent = "alive" semantic only.

Rhythm signature: **"Dead-stop tension, then everything at once"** — the
hook drags (deliberate, agonizing), the turn stops dead, and from the reveal
onward every payoff lands ON the beat, holds shortening as energy builds to
the climax, then a long calm CTA.

## Axes (craft.md §1)

- Luminance: **dark**, green-tinted near-black (#0A0E0B) — terminal world.
- Density: **airy** — one focal element per frame, tight crops.
- Type: **Space Grotesk** display · **JetBrains Mono** terminal/data. No third family.
- Color: duotone semantics — **lime #B6F22E = live/now**, desaturated
  **red #E5484D = waiting/before**. Accent appears ONLY on live things.
- Dimensionality: soft depth (lifted surfaces, lime glow at 10–16% opacity).
- Texture: filmic — grain 5%, vignette 0.3. No light leaks (too romantic for
  a terminal product).
- Energy: kinetic after the reveal; transitions are **hard cuts only**
  (crossfades contradict "instant").

## Music direction

120bpm (assumed — final track must match or timeline re-cuts in one file),
minimal driving tech, low-key menace in the first 16 beats, **drop exactly at
beat 16** (the reveal cut), energy plateau with builds through proof beats,
biggest moment at beat 48 (climax), resolve from beat 56. SFX layer placed on
the grid now; music bed added at checkpoint 2.

## Scene list (64 beats @ 120bpm = 32.0s = 960 frames)

| # | id | beats | intent | visual one-liner |
|---|----|------:|--------|------------------|
| 1 | hook | 10 | recognition/dread | push typed → "Waiting for runner…" + clock to 14:32 |
| 2 | turn | 6 | dead stop | black; "Your code is done." / "Your deploy isn't." |
| 3 | reveal | 8 | exhale | same push — Enter IS the live site; lime floods; wordmark + pulsing URL |
| 4 | proof-urls | 8 | confidence | commit list sprouts pulsing preview pills, ripple cascade |
| 5 | proof-share | 8 | confidence | browser preview + teammate comment pins land |
| 6 | proof-rollback | 8 | confidence | one click → previous version live, zero-gap swap |
| 7 | climax | 8 | scale-awe | zoom out: one node → global mesh propagating; deploy counter ticks |
| 8 | cta | 8 | resolve | wordmark, "Push. It's already live.", relay.dev, pulse |

Loop seam: CTA ends dark with a single lime pulse — rhymes with the hook's
dark terminal frame.

## Registry diff

First entry — no priors. Anti-cliché note: avoids the genre's most-cloned
surface (purple-glow + Inter); lime/green-black + Space Grotesk + hard-cut
grammar is the differentiator set for video #1.

## Status: DRAFT

Built ahead under the demo-calibration mandate (user unavailable mid-session).
Both human checkpoints — treatment approval and rough-cut listen — are
**pending user review**; re-direction is expected and cheap (timeline +
theme are single files).
