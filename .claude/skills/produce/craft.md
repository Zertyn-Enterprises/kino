# Craft — motion, type, color, audio

Execution numbers. Everything here is a RANGE or an AXIS: the treatment picks
a position per video and `theme.ts` encodes it. A value repeated identically
across videos because "the playbook said so" is a bug in your direction.

## 1. Identity axes (treatment must pick a position on each)

- **Luminance**: deep dark (#06–#10 bg) ↔ paper light (#F4–#FC bg). Dark is
  the genre default — which is exactly why a light video stands out.
- **Density**: airy (one element, vast negative space) ↔ dense (bento grids,
  layered panels).
- **Type voice**: neo-grotesk (Inter/Geist family) ↔ editorial serif accents ↔
  mono/technical. Display + body pairing; never more than 2 families + mono.
- **Color temperament**: monochrome+1 accent ↔ duotone ↔ saturated multi
  (rare, earns itself only for consumer/creative tools).
- **Dimensionality**: flat ↔ soft depth (shadows, glass, glow) ↔ spatial
  (parallax layers, perspective).
- **Texture**: clinical clean ↔ filmic (grain 3–7%, vignette 0.2–0.45,
  light leaks).
- **Energy**: calm/assured (slower, longer holds) ↔ kinetic/aggressive
  (fast cuts, hard snaps) ↔ **orchestrated velocity / X-viral** (fast cuts + constant parallel micro-updates + background elements always happening; no static frames, relentless but clean motion to keep engagement high on feeds).

**X-virality note (2025-2026 research):** For maximum scroll-stopping on X, bias toward "orchestrated velocity" with **constant background activity** (data streams, tool panels ticking, text resolving/popping in parallel layers, subtle parallax on secondary elements). The frame must feel alive in every shot — things happening everywhere (main action + active background) prevents swipe. Re-hook with new layer every 5-8s. High dynamic range (whips, overlaps, live updates) + professional native chrome. See references.md for the X-viral pattern breakdown.

## 1.5 The five laws of scene construction (from production lessons + X-viral research)

1. **UI is alive, not photographed** — hero product moments are rebuilt
   live components (capture.md tier 1), never static screenshots with
   camera moves. **Constant parallel micro-updates and background activity** (data streams flowing, tool panels ticking, text resolving/popping, secondary windows/layers always animating even during main action) so the frame never feels static or slow — critical for X retention.
2. **Space, not flatness** — scenes live in a lit stage (ambient glows,
   floor, vignette; `CinemaStage`); panels float with shadow/reflection;
   ≥2 depth planes at different rates. Background layers have subtle parallax and live updating.
3. **Type is a protagonist** — claims are full kinetic beats (word-slams,
   72–110px, center stage), not corner captions. Large, high-contrast text for muted virality.
4. **Impacts have grammar** — every hit lands as ≤3f of flash (≤12%) +
   ring + shake + glow bloom; fast moves (>30px/f) carry streaks or motion
   blur. Live resolves/pops/ripples on key moments (names, outputs, handoffs).
5. **Dynamic range in motion** — whips are fast (6–12f, hard-eased,
   blurred); holds are truly still except ambient breath. Middle-speed
   everything = mush. **For X-viral: orchestrated velocity with overlapping parallel actions + constant background elements** (no long static; re-hook with new layer/action every 5-8s).

## 1.6 Comprehension laws (v3 — from an engagement audit)

A muted stranger must FOLLOW the story, not just admire frames. These
override spectacle:

- **One new thing per beat.** Never introduce two panels/labels/ideas in
  the same window. Reveal complex surfaces progressively (e.g. pipeline
  nodes light up as the traveler reaches them, never all six at once).
- **Parse time before motion.** Any new panel or text gets ≥18f (0.6s) of
  stillness before the next motion starts; a panel must be parsed BEFORE
  anything inside it is interacted with (≥24f).
- **THE click grammar (canonical, identical every time):** cursor travels
  on a decelerating bezier and magnetically settles → 3f hover glow →
  press-state (element depresses) → ring centered ON the element → state
  change reads as unmistakable before→after with the element ≥35% of
  frame. Rings/zooms/slow-mo are RESERVED for real interactions — one
  decorative ring teaches viewers that rings mean nothing.
- **Macro + speed ramp on hero interactions:** zoom so the element is
  35–60% of frame (`Macro`), ramp time to 0.2–0.4× for 9–15f around the
  press (`useRampedFrame`), snap back ≤3f after. The money frame is slow.
- **Payoffs must be HUGE.** The number/state that proves the claim (the
  counter hitting 0, the 8/8, the published post) is a hero element (≥80px
  type or ≥35% frame), pulsed on change — never a corner chip.
- **Ownership labels.** When showing user content (their idea, their
  notes), label whose it is the moment it appears ("your idea →") — an
  unattributed sentence reads as the video's own claim.
- **Continuity of objects.** An object transforms ON SCREEN (morph/shrink/
  settle); it never vanishes and reappears elsewhere — and the source it
  came from stays visible (dimmed), or the viewer reads deletion/glitch.
- **Hierarchy on landings.** The instant a headline lands, competing
  content drops to ≤35% opacity. Text never fights UI text.
- **Show every claim.** If the tagline says "published everywhere", a
  published post must be SEEN. No claim without its picture.

## 1.7 Editing & camera techniques (v3)

- **Speed ramps**: 0.2–0.4× held 9–15f at impact, snap to 1× within 3f;
  place cuts at the speed apex so the ramp doubles as a transition.
- **Shot-length arc**: open 1.5–3s shots, compress toward 0.5–1s as energy
  builds; titles and reveals ON beats, connective shots may float.
- **Match cuts**: cut mid-movement preserving trajectory and screen
  position; match shape/scale/color across the cut.
- **Zoom-through mask**: push into an element until it fills frame, use its
  silhouette as the wipe; exit the next scene already mid-pull-back.
- **Eye-trace**: keep the focal point in the same screen region across
  cuts; when moving it, lead with motion + a direction-matched whoosh.
- **Luminance reveal**: dip near-black before a premium reveal, then sweep
  light across the subject as it lands.
- **One camera intent per shot**: push-in = intensity, pull-back = scale,
  pan = context, tilt = hierarchy. Never two at once.

## 2. Motion grammar

Defaults that make motion feel expensive. Deviate deliberately, never lazily.

- **Curves**: springs or strong ease-out (`bezier(0.16,1,0.3,1)` family) for
  enters; `Easing.in` for exits; linear ONLY for constant-rate drifts
  (camera, marquee, progress). Nothing animates linearly into a stop.
- **Durations @30fps**: micro (press, tick) 6–10f · standard enter 10–18f ·
  hero reveal 18–30f · transitions 12–24f · camera moves 20–45f.
- **Exits ~60–70% of enter duration.** Things leave with gravity.
- **Stagger**: siblings 2–4f apart; reading-order direction. A 5-item list
  enters over ~20f total, not 5×15f.
- **One dominant mover per moment.** Supporting motion is smaller, staggered,
  or both. If two things demand attention simultaneously, you've made two
  scenes — split them.
- **Hold ≥12f after every reveal** before the next motion (≥0.4s for text the
  viewer must read — see direction.md §5). Stillness is what makes motion legible.
- **Scale discipline**: UI/body enters 0.94–0.97→1, y-offset 16–32px;
  overshoot ≤3%. ONE hero moment per video may break this (0→1, big
  overshoot, slow-mo settle) — that's what makes it the hero moment.
- **The camera never sleeps**: every scene has a 1–3%-per-scene scale or
  position drift (linear). Static frames read as slideware.
- **Pan-zoom over UI**: move between focus points with ease-in-out beziers
  (`bezier(0.45,0,0.25,1)`), 20–45f per move; wrap fast moves (>40px/f) in
  `<CameraMotionBlur>`. Zoom in for detail, out for context — and out for
  the punchline pullback.
- **Causality timing**: cursor arrives → 3–6f pause → press (4–8f down-up,
  element responds 0.96 scale) → result appears 3–8f later. UI that responds
  instantly-everywhere reads as fake.
- **Blur as depth**: enter blur 6–10px→0 paired with opacity (premium feel,
  use on hero text); background layers at 2–6px when foreground must own
  focus.
- **Axis grammar**: pick the video's motion axes (e.g. "new things rise,
  context slides left") and never violate them — coherent direction is most
  of what "polished" means.

## 3. Typography & layout @1920×1080

- Scale: hero 96–168px · section heads 56–88 · UI-adjacent captions 32–44 ·
  micro-labels 22–28 (hard floor 22). Two sizes per scene, max three.
- Display: line-height 0.95–1.1, tracking −1%–−3.5%, weight 600–800.
  Body/captions: line-height 1.3–1.45, weight 400–500. ALL-CAPS micro-labels:
  +4–10% tracking, 500–600.
- Safe margins 5% all sides (DebugGrid shows them). Focal hierarchy: a viewer
  must find the focal point in <0.5s from any frame — check stills at
  thumbnail size.
- Whitespace is pacing: density should breathe WITH the music's energy.
- Numbers: tabular figures when counting (`fontVariantNumeric: "tabular-nums"`)
  or digits jitter.

## 4. Color

- Backgrounds never #000 (lift 3–8%); text never #FFF (92–97% white, or
  equivalent dark on light).
- One accent doing all emotional work (+ optional second for semantic
  contrast: error/before vs success/after). Accent earns saturation by being
  scarce — if everything glows, nothing does.
- Contrast: body ≥7:1, large display ≥4.5:1 against its actual local
  background (gradients: check the worst point).
- Dark themes: surfaces are layered lifts (+4–6% per level), not borders;
  glow = accent at 8–20% opacity in large soft shadows, not literal
  drop-shadow rings.
- Gradients: 2 hues max, adjacent on the wheel, or luminance-only. Subtle
  animated gradient drift (noise-driven) beats static fills for hero
  backgrounds.

## 5. Audio (v3 — sound carries half the video)

**A shared SFX palette:** keep a small reusable kit under `public/sfx-kit/` —
e.g. 3 whooshes (soft/hard/reverse), 2 risers (1.2s/2.8s), sub-drop, 2 impacts
(soft/hard), tick-ui, pop-ui, shimmer, ding-success — with per-video extras in
`public/<slug>/sfx/`. No audio ships with this repo: generate your own via
`scripts/gen-sfx.mjs` (needs an ElevenLabs key) or source CC0 SFX (freesound
CC0 / Kenney / OpenGameArt).

**Per-scene sound budget (minimums):** every significant motion has a sound
(whoosh matched to direction and speed); every transition is a riser+impact
PAIR (never a bare hit, never an unresolved riser); UI micro-events get
tick/pop at low volume; one scene texture (shimmer/ambience) where magic
happens.

**The pre-drop silence:** cut riser to near-silence 6–15f (200–500ms)
BEFORE the impact — the void doubles the hit. Use `MusicBed` ducks.

**Stopdowns:** 2–3× per video, music+SFX dead for ~1 beat to spotlight a
key line or number, then slam back with an impact.

**Layered impacts:** pair sub-drop (bottom) + impact (body) + tick (top
transient) at the same frame with staggered volumes for the big hits.

**Mix levels (relative to music bed 0.30–0.35):** whooshes 0.25–0.4,
impacts 0.4–0.6 (hero ≤0.7), ticks/pops 0.08–0.18, risers 0.35–0.5.
Dynamic range over loudness: the 1–2s before every impact stays quiet.

**Music briefs (quality bar):** write like a music supervisor — name
instrumentation, drum character, harmonic mood, ARRANGEMENT MAP with
second-marks aligned to the storyboard ("sparse felt piano 0–7s, drums+bass
enter hard at 7s, add layers every 8 bars, biggest section 24–31s, strip to
piano for outro"), and "polished modern production, clean low end". Always
≥3 candidates; pick via analyze-music data + ear.

- Music selection (user supplies; you direct): instrumental, clear transient
  beat, an energy map that matches the arc — verse for proof beats, drop or
  impact for the reveal/climax, resolve for CTA. 85–105bpm calm/confident,
  110–135 kinetic. Avoid melodies that fight the message.
- Everything cuts on the grid: scene cuts on downbeats, micro-events on
  half/quarter beats (`timeline.ts` provides both; never place by eye).
- The reveal/climax lands ON the track's biggest moment; place it in the
  treatment FIRST and let scene durations flow backward from it.
- SFX palette (sparingly — max ~1 per beat, silence is contrast): whoosh for
  large moves (start 2–5f BEFORE visual contact), soft click/thock for UI
  interactions, low impact for reveal, riser (0.5–2s) into climax, subtle
  tick for counters. Volumes 0.3–0.6 relative to music 0.15–0.35.
- Duck music to 30–50% under reveal impacts (rampFrames 4–8); restore over
  8–15f. Fade music in ≤15f at open; fade out 20–40f ending exactly ON the
  final frame.
- Music source: ElevenLabs Music via `scripts/gen-music.mjs` (see SKILL.md
  §2.5). Prompt by attributes only — naming artists, songs, albums, labels,
  or quoting lyrics breaches the Eleven Music terms. Generated output is
  non-exclusive; for maximum-stakes launches consider a licensed unique
  track. Prohibited end-industries: weapons, tobacco, prescription pharma,
  adult, religious orgs, political campaigns.
- `scripts/analyze-music.mjs` turns any track into data you CAN read: bpm,
  first-beat offset, energy curve, biggest energy jumps. Cut to the
  detected grid, never to the assumed one; land the climax on a real jump.
- remotion.media hosts CC0 starter SFX (whoosh, whip, switch, mouse-click,
  ding); soundcn on GitHub has more. ElevenLabs SFX generation (if the API
  key has the scope) covers gaps like risers. Download into
  `public/<slug>/sfx/`, record source+license in MANIFEST.md.
- You cannot hear. Place by math, flag every audio decision in the rough-cut
  checkpoint for human ears, and never claim the mix "sounds good" — say
  "placed per grid; verify by ear".
