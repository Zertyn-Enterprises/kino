# Hook archetypes — proven viral-launch patterns

Distilled from `direction.md` §2 (v1/v2/v3) and `references.md`. Each archetype
is a complete buildable spec. Pick ONE and commit hard — never mix patterns within
a single hook. First 75 frames (≈ 2.5s at 30fps) are the gate window.

## Gate reference

Machine-asserted gates (🤖) from `hook.md §1`:

| # | Gate | Threshold | Hard / Advisory |
|---|------|-----------|-----------------|
| 1 | Motion by frame 10 🤖 | delta > 0.1 (frame 0 vs frame 9) | **HARD** |
| 2 | Frame-0 contrast 🤖 | stddev > 5.0 across 4×4 grid | **HARD** |
| 3 | Loop seam 🤖 | delta < 60 (frame 0 vs final frame) | **HARD** |
| 4 | Background activity 🤖 | Path A: ≥ 2 spatially-separated cells (Chebyshev ≥ 2) with mean-abs-Δluminance > 5 (frame 0 vs mid-hook); OR Path B (concentrated focal): highest active-cell delta > 10. Frozen/low-motion single region (max delta 5–10) fails both. | advisory |
| 5 | Frame-0 liveness 🤖 | Path A: ≥ 2 cells AND ≥ 2 rows with luminance stddev > 10; OR Path B (concentrated focal): ≥ 2 cells with stddev > 10 AND at least one cell stddev > 20. Flat/near-solid frame-0 (all cells < 10) fails both. | advisory |
| 6 | Promise by 2.5s 🤖 | `promise.text` non-empty AND `promise.frame` ≤ round(2.5 × fps); fps derived from timeline.ts | **HARD** |
| 7 | Text density 🤖 | `promise.wordCount` ≤ 6 | **HARD** |

**Open-loop closure rule:** Gate 6 opens a curiosity gap — that gap MUST close. Declare `payoff: { text }` on the climax/CTA beat in `timeline.ts`; `scripts/payoff.sh` closure gate C1/C2 machine-asserts closure at ship time and HARD-fails when a declared promise has no matching payoff.

**Ambient-field motif palette (all satisfy gates 4 + 5):**

Four motifs ship in `src/lib/fx.tsx`. All share the `AmbientMotifProps` surface
(`color`, `colorDim?`, `density?`, `region?`, `energy?`, `seed?`). Pick via
`--ambient=<key>` in `new-video.mjs`, or let `--distinct` auto-select to diverge
from existing registry entries. Record the chosen key as `ambient-motif` in
`_registry.md`; `distinct.sh` warns when ≥2 entries share a motif.

| key | component | character | minimum recipe |
|---|---|---|---|
| `strips` | `AmbientField` | horizontal streaming strips | `density={40} energy={1}` |
| `motes` | `MoteField` | drifting luminous particles | `density={80} energy={1.5}` |
| `grid-pulse` | `GridPulse` | pulsing square grid | `density={40} energy={1}` |
| `ember-rise` | `EmberRise` | upward-floating embers | `density={80} energy={1.5}` |

`strips` example (default; also used via `itemH` tuning):

```tsx
<AmbientField
  color={theme.accent}
  colorDim={theme.accentDim}
  density={40}
  energy={1}
/>
```

Non-strips example (import alias keeps JSX unchanged in template-generated files):

```tsx
import { MoteField as AmbientField } from "../../../lib/fx";
// …then in JSX:
<AmbientField
  color={theme.accent}
  colorDim={theme.accentDim}
  density={80}
  energy={1.5}
/>
```

Distributes activity across all 4 grid rows / full frame from frame 0. Gates 4 + 5
PASS per `AmbientCheck` fixture (`src/smoke/AmbientCheck.tsx`). All archetypes
below assume this layer is composed. When omitted, gates 4 + 5 require a named
justification (see `hook.md §1` advisory protocol).

*(Timing note: at 120 bpm, beat 1 = 15 frames; at 122 bpm, beat 1 ≈ 14.75 frames.
All beat counts below are relative — derive frame numbers from your video's
`timeline.ts`. Never hardcode frames in scene code.)*

---

## Archetype 1: Mid-action demo

**Psychological lever:** Curiosity-as-interruption. The product is already
mid-task; the viewer enters a story in progress and must understand what just
happened. Works muted: the visible output IS the message.

**Frame-0 / thumbnail spec**
Tight crop on the exact pixels that matter: command result, streaming output, or
in-progress UI change. Motion already underway — cursor blink, partial output,
mid-transformation. Single high-contrast focal point; bg at low luminance or
blurred to 4px.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0 | Product mid-task: partial output / cursor blink / live change already visible |
| Beat 0–1 | Primary interaction completes; state change reads in < 15 frames |
| Beat 1–3 | Consequence chain: secondary outputs, causal follow-throughs; camera push-in 2–3% on focal |
| Beat 3–5 | Promise legible on screen (≤ 6 words); satisfies "promise by 2.5s" gate (beat 5 ≈ frame 75 at 120 bpm) |

**Copy template**
`[Verb] [outcome].` or `[Verb] in [N] [unit].`
Fill slot: `____ in ____.` — ≤ 6 words, e.g. "Live in 12ms." / "Deployed. No queue."

**Motion signature + AmbientField recipe**
Primary: interaction causality chain — cursor settle → press-state → state change
with 4-frame delay (see `craft.md §1.5` grammar). Typing in real cadence: bursts
then pauses (not uniform). Camera push-in 2% on focal point across beats 1–3.
AmbientField: full-frame, `density={40}` `energy={1}`, accent at 8–12% opacity —
fills all rows behind focal layer without competing with it.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | Typing animation, cursor blink, or streaming text gives delta > 0.1 by frame 9 |
| 2 Frame-0 contrast (HARD) | PASS | UI output on dark field; stddev easily exceeds 5.0 |
| 3 Loop seam (HARD) | PASS — requires design | CTA frame must use same dark palette as hook; bright CTA on dark hook fails this gate |
| 4 Background activity (advisory) | PASS with AmbientField or strong focal motion | Single narrow focal region with cell delta > 10 passes the concentrated-focal path (RelayLaunch: active=1/16, delta=12.2 → PASS). AmbientField guarantees spread-path PASS. |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField or strong focal content | Single-row UI with max-stddev > 20 passes the concentrated-focal path (RelayLaunch: rows=1, max-stddev=23.4 → PASS). AmbientField guarantees spread-path PASS. |

**Reference fixture:** `src/smoke/hooks/Hook01MidActionDemo.tsx` — gate-PASS proof; run `scripts/hook.sh Hook01MidActionDemo`.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=mid-action-demo`

**Best-fit arcs:** A (demo-first), B (problem-first after pain intro)

**When NOT to use:** When the impressive action requires domain context to read —
e.g. an abstract API call, a config diff, a log line whose significance isn't
obvious. The viewer must recognize the output as good, fast, or impossible from
the frame alone without narration.

---

## Archetype 2: Bold / contrast claim

**Psychological lever:** Provocation-pick-a-fight. Large typography makes a claim
the viewer is likely to disagree with — the tension forces them to watch the proof.
Works muted: the claim IS the visual; no product required in frame 0.

**Frame-0 / thumbnail spec**
Display-weight type fills 60–80% of frame width, 1–3 words visible, entering
word-by-word with blur-settle. Dark field (or strong tonal contrast). No product
UI in frame 0 — the claim must stand alone and earn a reaction from the first
word.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0–0.5 | First word slams in (blur → crisp, scale 1.55 → 1.0 via `KineticLine`) |
| Beat 0.5–2 | Remaining words slam in sequentially; full claim legible by beat 2 |
| Beat 2–4 | Product visual or live demo cuts in as visual proof witness |
| Beat 4–5 | Product action completes; claim + evidence together on screen |

**Copy template**
`[Your X] is [doing bad thing].` or `[Outcome] no [tool] can.`
Fill slot: `[Subject] [verb] [claim].` — ≤ 6 words that pick a fight, e.g.
"Your CI is lying." / "Runs local. Stays private."

**Motion signature + AmbientField recipe**
Primary: `KineticLine` (from `src/lib/fx.tsx`) — word-slam with 5-frame per-word
stagger, `slamFrames={6}`. Hard cut to live product demo at beat 2 — no dissolve.
AmbientField: full-frame behind text, `density={40}` `energy={0.8}`, accent at
5% opacity — subtle so text is the dominant focal; strips recede behind the claim.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | KineticLine word-slam begins at frame 0; delta > 0.1 by frame 9 guaranteed |
| 2 Frame-0 contrast (HARD) | PASS | High-contrast display type on dark field; stddev well above 5.0 |
| 3 Loop seam (HARD) | PASS — requires design | CTA frame and hook share same dark tonal field; palette whiplash fails this gate |
| 4 Background activity (advisory) | PASS with AmbientField | Text-only motion is single-region (central text band); AmbientField adds ≥ 2 separated cells outside it |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField | First word at frame 0 may occupy a single grid row; AmbientField spans ≥ 2 rows |

**Reference fixture:** `src/smoke/hooks/Hook02BoldClaim.tsx` — gate-PASS proof; run `scripts/hook.sh Hook02BoldClaim`.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=bold-claim`

**Best-fit arcs:** C (manifesto, type-led), F (indictment — if the claim is an
accusation about incumbents)

**When NOT to use:** When the claim cannot be proven within the video's runtime.
The hook opens an explicit loop — if the reveal doesn't close it, it's clickbait.
Also avoid when the product is unknown: a bold claim without brand credibility
reads as bluster to a cold audience.

---

## Archetype 3: Dramatized pain

**Psychological lever:** Recognition-before-relief. 1–2s of the specific ugly
familiar thing (error wall, blinking spinner, the 23rd browser tab) triggers
"I know this pain" — the strongest silent emotion — then cuts to the solution.
Works muted: the viewer has lived this screen.

**Frame-0 / thumbnail spec**
The pain state, already present and live: error message legible, spinner stalled,
browser tabs overflowing, dead clock ticking. Mid-action — the situation is
worsening, not paused. High contrast on the pain element. Red or muted error
accent is appropriate; avoid a static screenshot with a camera move.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0 | Pain state live and mid-deterioration — timer counting, spinner moving, error on screen |
| Beat 0–2 | Pain escalates: timer accelerates, error compounds, the wait grows visible |
| Beat 2–3 | Tension number on screen — the cost or scale of the problem (e.g. "14:32 elapsed") |
| Beat 3+ | Interrupt: hard cut to product; pain sequence ends, solution begins |

*(For arc B/F, the tension number satisfies the "promise by 2.5s" gate: it
represents the problem's cost and closes the pain-scale question. See `hook.md §1`
gate 9 — arc B/F justification.)*

**Copy template**
`[N] [unit] [waiting / failing].` or `[Broken thing.] Again.`
Fill slot: `____ [elapsed / queued / waiting].` — ≤ 6 words, e.g.
"14:32 elapsed." / "Runner unavailable. Again."

**Motion signature + AmbientField recipe**
Primary: deterioration is kinetic — `useCountUp` for the pain timer/counter
(easing=cubic-in so it accelerates), typewriter for accumulating errors, opacity
pulse on a stalled spinner. Red or muted error-state accent color.
AmbientField: `density={30}` `energy={0.6}`, dim error-tinted strips — lower
energy reinforces "broken" mood while satisfying the advisory gate; upgrade to
`density={40}` `energy={1}` after the interrupt cut to product.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | Counter ticking, spinner moving, or timer running gives delta > 0.1 by frame 9 |
| 2 Frame-0 contrast (HARD) | PASS | Error state typically has strong contrast — red on dark, white error text on near-black |
| 3 Loop seam (HARD) | PASS — requires design | CTA frame (resolved state) must share luminance with hook frame 0; use same darkness level for the seam |
| 4 Background activity (advisory) | PASS with AmbientField | Without it: timer or spinner may be a single-cell region; AmbientField adds ≥ 2 separated cells |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField | Error content may be confined to one grid row; AmbientField distributes to ≥ 2 rows |

**Reference fixture:** `src/videos/relay/scenes/Hook.tsx` (embedded in `RelayLaunch`) — see worked example below.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=dramatized-pain`

**Best-fit arcs:** B (problem-first — canonical match; pain IS the arc's opening
act), F (indictment — if the pain implicates a named incumbent)

**When NOT to use:** When the audience doesn't recognize the pain. This archetype
requires the viewer to have lived the specific screen — don't use for new product
categories with no established pain, or when the target audience is non-technical
and wouldn't read a CI spinner as a known frustration.

**Worked example — RelayLaunch (2026-06-22)**

`git push` typed mid-action → runner enqueued → red elapsed timer counting up.
Pain state (CI wait) live from frame 0; tension number (`0:00 elapsed`) appears at
f75, satisfying the arc-B "promise by 2.5s" gate as a wait-cost counter.

| Gate | Measured | Pass? |
|---|---|---|
| 1 Motion by frame 10 🤖 | delta=0.29 (typing animation) | ✓ |
| 2 Frame-0 contrast 🤖 | stddev=7.45 | ✓ |
| 3 Loop seam 🤖 | delta=6.56 | ✓ |
| 4 Background activity 🤖 | active=1/16, separated=false, max-delta=12.2 | ✓ (focal path: max-delta=12.2 > 10.0) |
| 5 Frame-0 liveness 🤖 | cells=2/16, rows=1, max-stddev=23.4 | ✓ (focal path: max-stddev=23.4 > 20.0) |

`hardGatesPass: true` — all 5 gates PASS. Ship verdict: READY.

---

## Archetype 4: Pattern interrupt

**Psychological lever:** Wrongness-demands-explanation. Something visually
impossible forces the viewer to stop scrolling and ask "how did that happen?"
Works muted: the impossibility is visual, not verbal. Highest-risk, highest-reward
of all archetypes.

**Frame-0 / thumbnail spec**
The impossible thing already present and complete: UI in mid-physics-break, type
defying layout, a product state that shouldn't exist. Must read as "wrong" within
0.5s at thumbnail size. High contrast around the impossible element; bg should
be recognizable enough for the wrongness to register against it.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0 | Impossible state fully visible — the "wrong" is already complete, not forming |
| Beat 0–1 | Brief hold (≤ 18 frames) — let the viewer register the impossibility before it moves |
| Beat 1–2 | Element or camera move emphasizes the wrongness; product brand glimpse |
| Beat 2–4 | Cut to "how": product in context; promise on screen |

**Copy template**
`[Impossible action] by [agent].` or a single provocative fragment.
Fill slot: the impossibility IS the copy — ≤ 6 words, e.g.
"Shipped before you pushed." / "Memory: 0 bytes."

**Motion signature + AmbientField recipe**
Primary: the impossible element moves with wrong physics — floats against gravity,
types backwards, expands when it should shrink — then a hard cut. The cut is the
motion anchor.
AmbientField: full-frame, `density={40}` `energy={1.2}` — slightly elevated
energy so the impossible scene feels alive, not a static oddity; strips reinforce
that the world is slightly wrong.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | The impossible element is in motion from frame 0; strong delta guaranteed |
| 2 Frame-0 contrast (HARD) | PASS | High contrast on the impossible element is a design requirement — it must POP |
| 3 Loop seam (HARD) | PASS — requires design | The impossible scene may land at a different visual register from CTA; rhyme via shared darkness level |
| 4 Background activity (advisory) | PASS with AmbientField | Impossible element alone may be a single-region focal; AmbientField adds separated cells |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField | Impossible element may occupy a single grid row; AmbientField ensures ≥ 2 rows |

**Reference fixture:** `src/smoke/hooks/Hook04PatternInterrupt.tsx` — gate-PASS proof; run `scripts/hook.sh Hook04PatternInterrupt`.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=pattern-interrupt`

**Best-fit arcs:** C (manifesto — product as category-creator doing the
impossible), A (demo-first — if the impossibility IS the demo)

**When NOT to use:** When the wrongness requires domain expertise to recognize.
The impossibility must read as "wrong" to a non-expert muted viewer in 0.5s at
thumbnail size. Also avoid in professional B2B contexts where visual tricks read
as gimmicky and erode trust with the skeptical technical audience.

---

## Archetype 5: Number-counting

**Psychological lever:** Scale-made-visceral. A number growing toward an
impossible value makes an abstract metric real at video speed. Works muted:
numbers are universal. Strongest when the final value is absurd enough to earn
a reaction — the counter is the protagonist.

**Frame-0 / thumbnail spec**
Counter already mid-count — not zero, not at peak. The viewer enters a race
already running. Large display type (≥ 120px), tabular-nums to prevent jitter,
one accent color on the number. No other elements in frame 0; the number IS
the frame.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0 | Counter mid-count — non-zero, non-final value visible from frame 0 |
| Beat 0–3 | Count accelerates toward peak; easing drives momentum (`useCountUp` with `Easing.in(Easing.cubic)`) |
| Beat 3–4 | Counter reaches peak; context label fades in (≤ 4 words) |
| Beat 4–5 | Product shown: the system doing the thing the number represents |

**Copy template**
`[N] [noun] [in N time].` or `[N] → [N]. [Context.]`
Fill slot: `____ ____s [in / today / live].` — ≤ 6 words, e.g.
"14,000 deploys today." / "0 → 1M users."

**Motion signature + AmbientField recipe**
Primary: `useCountUp` from `src/lib/fx.tsx`, `easing={Easing.in(Easing.cubic)}`,
with `Shake` at peak arrival (`strength={4}`) and `Ripple` expanding from the
number center on land. Tabular-nums prevents layout jitter during count.
AmbientField: full-frame, `density={40}` `energy={1}` — strips behind the large
number give it depth and prevent the frame reading as a static title card.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | Counter changes between frame 0 and frame 9; delta > 0.1 guaranteed with any visible tick |
| 2 Frame-0 contrast (HARD) | PASS | Large high-contrast number on dark field; stddev well above 5.0 |
| 3 Loop seam (HARD) | PASS — requires design | CTA frame and hook share dark field; a sudden bright CTA after a dark counting number fails this gate |
| 4 Background activity (advisory) | PASS with AmbientField | Without it: large central number is a single-region blob; AmbientField spreads activity across the frame |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField | Central number may occupy rows 1–2 of 4×4 grid; AmbientField fills rows 0 and 3 |

**Reference fixture:** `src/smoke/hooks/Hook05NumberCounting.tsx` — gate-PASS proof; run `scripts/hook.sh Hook05NumberCounting`.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=number-counting`

**Best-fit arcs:** A (demo-first — number proves the demo's scale), E (feature
symphony — one beat = one number metric)

**When NOT to use:** When the number isn't inherently impressive to a cold viewer.
Avoid vanity metrics with a skeptical dev audience (user counts, star counts) —
use a latency, accuracy, or throughput number instead. The value must be
impossible enough to earn disbelief.

---

## Archetype 6: Payoff flash-forward

**Psychological lever:** Glimpse-and-withhold. A 9–15 frame flash of the
finished, desirable result at frame 0 — dashboard lit, product live, output
beautiful — then a hard cut back to the "before." The viewer now WANTS to see
how we get there. Strongest retention pattern of all archetypes per direction.md v2.

**Frame-0 / thumbnail spec**
The finished, desirable state: UI lit and populated, product live, output
complete. Beautiful at thumbnail size; the value is immediately apparent. Hold
≤ 15 frames, then hard cut back. The thumbnail IS the destination, not the
journey — this is the only archetype where frame 0 shows the video's END STATE.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0–0.5 | Flash of finished result (9–15 frames): desirable final state, no copy overlay |
| Beat 0.5 | Hard cut back to present — empty state, in-progress work, or pain; jump cut, no fade |
| Beat 0.5–3 | Present state builds: the problem, the blank canvas, the wait — earn the destination |
| Beat 3–5 | Product action begins; journey toward the flashed result starts |

*(No copy during the flash — the image must carry itself. First text appears on
the cut-back in the present-state scene.)*

**Copy template**
First text appears AFTER the flash, describing the present state:
`[Starting state].` or `[Problem].`
Fill slot: the present-state label ≤ 6 words — e.g. "Empty repo." / "Zero config."

**Motion signature + AmbientField recipe**
Primary: the hard cut IS the motion. No tweening between flash and present. Use
`Flash` component (`src/lib/fx.tsx`) over the finished-state frame — peak ≤ 0.14,
2–3 frames — as the visual exclamation point before the cut.
AmbientField (in the flash frame): `density={40}` `energy={1}` — the desirable
final state must feel ALIVE from frame 0. After the cut-back: reduce to
`energy={0.4}` to reinforce "not there yet" mood; restore to `energy={1}` at
the product reveal.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | Flash frame contains live content from frame 0; hard cut at frame ~12 gives strong delta |
| 2 Frame-0 contrast (HARD) | PASS | Finished desirable state is populated and high-luminance; contrast inherent |
| 3 Loop seam (HARD) | PASS — CAREFUL | Hook opens with the finished state; CTA must also show this state — same palette, rhyming composition so the loop feels like a promise fulfilled |
| 4 Background activity (advisory) | PASS with AmbientField | Flash frame with AmbientField ensures ≥ 2 separated cells before the cut |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField | Finished-state UI content may still concentrate in one grid band; AmbientField ensures ≥ 2 rows |

**Reference fixture:** `src/smoke/hooks/Hook06PayoffFlashForward.tsx` — gate-PASS proof; run `scripts/hook.sh Hook06PayoffFlashForward`.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=payoff-flash-forward`

**Best-fit arcs:** B (problem-first — flash the solution, cut back to pain, earn
it), D (transformation — flash the "after", spend the video getting there)

**When NOT to use:** When the final state isn't visually desirable at thumbnail
size — if the "finished" product looks the same as an empty state, the flash
carries no weight. Also avoid when the value depends on animation context the
muted viewer won't have in a 15-frame silent glimpse.

---

## Archetype 7: Open question / indictment

**Psychological lever:** Uncomfortable-truth-naming. A direct question or
accusation about what the viewer's current tools are doing to them. Recognition
+ guilt + curiosity = must-watch. Arc F's native hook. Works muted: the question
IS the discomfort; the colon promises the answer is coming.

**Frame-0 / thumbnail spec**
Serif or editorial display text — the question or accusation — filling 60–80% of
frame width. Legible at thumbnail. Dark, slightly ominous field. No product, no
UI, no logo in frame 0. Punctuation matters: an open colon or em dash implies
the answer is imminent.

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0 | Question / accusation already composed on screen — it has been here |
| Beat 0–0.5 | Micro-settle: 3–5px translateY, opacity 0.85 → 1.0, over 8 frames — gives gate-1 delta |
| Beat 1–3 | Secondary elements stamp in: evidence icons, data points, labels (each with own settle) |
| Beat 3–5 | Secondary layer fully established; tension maximum before product enters |

*(Arc F intentionally withholds the positive promise from the hook — no product
number before the reveal. The "promise by 2.5s" gate is N/A for arc F; record
this in the hook review.)*

**Copy template**
`What [tool] [does] [to you].` or `[Tool] [sees / owns] your [noun].`
Fill slot: `____ [sees / does] ____.` — ≤ 6 words, e.g.
"What Chrome sees daily:" / "Slack owns your work."

*(Note: if the full accusation requires more than 6 words for arc F copy-first
hooks, name it as a defect in the hook review and justify why shortening breaks
the rhetorical setup — see `hook.md §1` GranipaLaunch gate-3 named defect.)*

**Motion signature + AmbientField recipe**
Primary: micro-settle on text (f0–f8, 3px translateY, opacity 0.85→1.0);
secondary evidence elements stamp in at 20-frame intervals, each with own settle.
Red or muted accusation accent color for secondary elements.
AmbientField: full-frame, `density={30}` `energy={0.5}`, dim strips in muted
charcoal — lower energy reinforces ominous mood while satisfying gate 4 with
separated cells.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | Micro-settle gives delta > 0.1 by frame 8; AmbientField scrolling adds additional delta |
| 2 Frame-0 contrast (HARD) | PASS | High-contrast editorial text on dark field (see GranipaLaunch gate-2: stddev=20.64) |
| 3 Loop seam (HARD) | PASS | Dark hook frame rhymes with dark CTA; ominous→resolved energy shift is deliberate |
| 4 Background activity (advisory) | PASS with AmbientField | Micro-settle residual delta + AmbientField gives ≥ 2 separated cells; GranipaLaunch passes gate 4 via settle + stamp-in spanning cols 0–2 |
| 5 Frame-0 liveness (advisory) | PASS with AmbientField or strong focal text | Text spans single row — passes via concentrated-focal path when text stddev > 20 (GranipaLaunch: rows=1, max-stddev=49.3 → PASS). AmbientField additionally guarantees spread-path PASS. |

**Reference fixture:** `src/videos/granipa/scenes/Hook.tsx` (embedded in `GranipaLaunch`) — see worked example below.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=open-question`

**Best-fit arcs:** F (indictment — canonical match), C (manifesto — if the
question sets up a world-view argument)

**When NOT to use:** When the accusation is not factually true or cannot be proven
within the video. Also avoid for arc A/E (feature-positive) products where an
ominous opening sets wrong expectations and creates cognitive dissonance when the
tone shifts. The question must have a satisfying answer the product delivers.

**Worked example — GranipaLaunch (2026-06-22)**

"what your mac tools see in a day:" — ominous open colon sustained through f73;
secondary icon stamps at f38/f46/f54 add the evidence layer. Arc F defers the
positive number ("$0") to the kicker scene; no promise in the hook is intentional.

| Gate | Measured | Pass? |
|---|---|---|
| 1 Motion by frame 10 🤖 | delta=1.40 (micro-settle f0–f8, opacity 0.85→1.0 + 3px translateY) | ✓ |
| 2 Frame-0 contrast 🤖 | stddev=20.64 | ✓ |
| 3 Loop seam 🤖 | delta=9.46 | ✓ |
| 4 Background activity 🤖 | active=3/16, separated=true (settle residual spans cols 0–2 in row 1) | ✓ |
| 5 Frame-0 liveness 🤖 | cells=3/16, rows=1, max-stddev=49.3 | ✓ (focal path: max-stddev=49.3 > 20.0) |

`hardGatesPass: true` — all 5 gates PASS. Ship verdict: READY.

---

## Archetype 8: Multi-layer live demo

**Psychological lever:** Abundance-of-proof. Multiple parallel processes running
simultaneously — agents, streams, resolves, handoffs — make the product feel
categorically bigger than any competitor. The viewer can't track everything:
that's the point. Works muted: the sheer volume of live activity reads as power.

**Frame-0 / thumbnail spec**
Multiple active elements simultaneously: main process mid-operation + ≥ 2
supporting panels with live updates + streaming text or data counters — all
visible and in motion from frame 0. Dense but purposeful; high contrast between
the dominant focal element and the parallel supporting elements. Direction.md v2
calls this pattern explicitly: "Product already 'on' and doing the magic."

**0–3s timing template**

| Beat range | Action |
|------------|--------|
| Beat 0 | All layers active: main panel mid-process + ≥ 2 supporting panels with independent live updates |
| Beat 0–2 | Main process completes one step; side panels continue updating autonomously |
| Beat 2–3 | New parallel process spawns or second agent activates — a visible new layer joins |
| Beat 3–5 | Key output or metric visible; promise legible before beat 5 |

**Copy template**
`[N] [agents / streams / tasks] at once.` or `Parallel. Always.`
Fill slot: `____ ____s [running / live / now].` — ≤ 6 words, e.g.
"5 agents, one click." / "All at once."

**Motion signature + AmbientField recipe**
Primary: each parallel element has its own animation timeline with offset starts
— they do NOT sync. Main panel: causality chain with click grammar. Side panels:
independent continuous micro-updates (`useCountUp`, typewriter, color-state
flips). Offset starts are required — synchronized panels read as fake.
AmbientField: full-frame, `density={50}` `energy={1.2}` — elevated density to
reinforce "many things happening" at the background layer too. Use the accent
color of the dominant process; background strips in secondary accent variant.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Motion by frame 10 (HARD) | PASS | Multiple layers in motion from frame 0; aggregate delta well above 0.1 |
| 2 Frame-0 contrast (HARD) | PASS | Dense multi-element composition has inherent contrast from multiple luminance zones |
| 3 Loop seam (HARD) | PASS — requires design | Dense hook must pair with a resolved-but-still-active CTA; avoid hard luminance jump from dark dense to bright minimal |
| 4 Background activity (advisory) | PASS — inherent + AmbientField | Multiple active panels on their own produce ≥ 2 separated cells; AmbientField reinforces to exceed threshold comfortably |
| 5 Frame-0 liveness (advisory) | PASS — inherent + AmbientField | Multiple panels distributed across the frame span ≥ 2 rows naturally |

**Reference fixture:** `src/smoke/hooks/Hook08MultiLayerLiveDemo.tsx` — gate-PASS proof; run `scripts/hook.sh Hook08MultiLayerLiveDemo`.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --hook=multi-layer-live-demo`

**Best-fit arcs:** A (demo-first — the multi-layer demo IS the argument), E
(feature symphony — each beat reveals another parallel layer)

**When NOT to use:** When the product is a single-action tool without actual
parallel operations — a CLI with one command, a single-step converter. Fake
parallel activity (animated decoration that doesn't represent real product
behavior) undermines trust with technical audiences who will notice in one frame.
Every stream must represent something the product actually does.

---

## Selection guide

| If your product… | Use archetype |
|---|---|
| Has one impressive live action the viewer can't explain | 1 Mid-action demo |
| Makes a category-defining contrarian claim | 2 Bold / contrast claim |
| Replaces a specific universally-hated experience | 3 Dramatized pain |
| Does something that shouldn't be possible | 4 Pattern interrupt |
| Has a headline metric that's viscerally large | 5 Number-counting |
| Has a visually desirable final state | 6 Payoff flash-forward |
| Implicates what the viewer's current tools are doing to them | 7 Open question / indictment |
| Runs multiple genuine parallel processes simultaneously | 8 Multi-layer live demo |

Cross-reference the arc menu (`direction.md §4`) before selecting: archetypes
have strong arc affinities and will fight the structure if mismatched. Check
`src/videos/_registry.md` — if the last video used an archetype, prefer a
different one to avoid repeating the same hook shape.

---

*(Worked examples appear inline under their matching archetypes: RelayLaunch → Archetype 3 Dramatized pain; GranipaLaunch → Archetype 7 Open question / indictment. All gate values are from `scripts/hook.sh` runs on 2026-06-22.)*
