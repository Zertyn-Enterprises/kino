# Retention patterns — buildable craft layer for the #2 lever

Distilled from `direction.md` §2 (v1/v2/v3) and `retention.md`. Each pattern
is a complete buildable spec for how visual energy distributes across the arc.
Pick ONE structural shape and execute it hard — multiple structural patterns
fight each other. Apply patterns 6, 7, and 9 as base obligations on every video.

> To MEASURE retention (not build it), run `scripts/retention.sh` and read
> `retention.md`. This catalog is the build-side complement; that file is the
> gate. Cross-link: each pattern's Gate mapping table names the exact flag to
> pass when asserting the gate.

## Gate reference

Machine-asserted gates (🤖) from `retention.md §1`:

| # | Gate | Hard / Advisory | Threshold | Flag |
|---|------|-----------------|-----------|------|
| 1 | Dead-air 🤖 | **HARD** | `longestStaticSec ≤ 1.0s`; per-pair `meanAbsDelta ≥ 0.05` | `--holds=S:E,...` excludes declared holds |
| 2 | Energy build-to-climax 🤖 | advisory | Smoothed energy peak at or after boundary; `resolveRatio < 0.75` | `--climax=F` shifts the boundary from heuristic to your narrative climax |
| 3 | Re-hook cadence 🤖 | advisory | `longestFlatSec ≤ 8s` (no body stretch without an energy spike above 2.0) | `--rehook=N` overrides the 8s default |
| 4 | Full-video loop seam 🤖 | advisory | Frame 0 vs final frame `meanAbsDelta < 60.0` (`LOOP_SEAM_THRESHOLD`); `loopable:false` is an opportunity flag — deliberate CTA-card endings legitimately do not loop | _(no flag — compose for loop by design; see pattern 8)_ |
| 5 | Ending hold / no-limp-tail 🤖 | advisory | Final ~1.5s (`ENDING_WINDOW_SEC`): either held (`endingMeanEnergy < 1.5`) or accented (any ending pair `> 2.0`); limp tail is the fail | _(no flag — design the ending mode deliberately; see pattern 9)_ |

**Critical flag usage:** without `--climax=F`, gate 2 uses a first-third-boundary
heuristic. It **fails any edit whose smoothed energy peak lands before that boundary**
— including edits with a back-half narrative climax whose front-loaded transitions
still dominate the pixel delta (see pattern 1 worked example: RelayLaunch,
GranipaLaunch). Supply `--climax=<climaxFrame>` to replace the heuristic with an
explicit assertion of your narrative climax frame.

Pattern-to-gate mapping:

| Pattern | Gate 1 Dead-air | Gate 2 Energy-build | Gate 3 Re-hook | Primary flag |
|---------|----------------|---------------------|----------------|--------------|
| 1. Back-loaded climax | base | **primary** — designed to pass | supported | `--climax=<climaxStartFrame>` |
| 2. Mid-point re-hook punch | base | neutral | **primary** — punch IS the anchor | `--rehook=<N>` |
| 3. Open loop + late payoff | base | **primary** — reveal IS the peak | supported | `--climax=<revealFrame>` |
| 4. Pattern interrupt | base | neutral | **primary** — interrupt IS an anchor | `--rehook=<N>` |
| 5. Payoff seeding | base | **primary** — climax seed is the peak | **primary** — seeds are anchors | `--climax=<climaxFrame>` |
| 6. Dead-air elimination | **primary** — three-layer budget | neutral | neutral | `--holds=<S:E,...>` |
| 7. CTA tension/resolve | base | supported (resolveRatio) | neutral | `--climax=<tensionFrame>` |

Ending-pattern gate mapping (Gates 4 and 5 — patterns that address the final frames):

| Pattern | Gate 4 Loop seam | Gate 5 Ending hold |
|---------|------------------|--------------------|
| 8. Loop-back ending | **primary** — rhyme to opening makes loopSeamDelta < 60.0 | neutral |
| 9. Final-accent landing | neutral | **primary** — held/accented ending makes endingMode ≠ limp |

*(All arc fractions and beat counts below are relative — derive frame numbers from your
video's `timeline.ts` via `beatsToFrames(beat, bpm, fps)`. Never hardcode frames in
scene code.)*

---

## Pattern 1: Back-loaded climax / escalation

**Psychological lever:** Momentum payoff. Visual energy builds from low at the
opening to peak at the climax — the narrative grows through the arc, not despite
it. The viewer who feels a rising tide at minute 0:15 stays to see where it
crests. Directly addresses the front-loading anti-pattern documented for
RelayLaunch and GranipaLaunch (see worked example below).

**Structural spec**

```
Arc fraction:  [0%── hook ──10%] [10%── opening ──25%] [25%──── body ────65%] [65%─pre─85%] [85%─CLIMAX─95%] [95%─CTA─100%]
Energy level:   medium            low → rising           rising                 high           PEAK             settle
AmbientField:   energy={0.6}     energy={0.4→0.6}       energy={0.6→0.9}       energy={1.0}   energy={1.2}     energy={0.5}
Motion layers:  1 + ambient      1 + ambient             2–3 + ambient          3–4            all firing        1 + ambient
```

The climax is the most visually intense moment — the scene with the highest pixel
delta — by design, not accident. Every act's motion budget is set one rung below
the next. Opening scenes animate one element at a time; body scenes layer two or
three concurrently; the climax fires every prepared element simultaneously. Opening
energy is deliberately restrained — not low enough to fail gate 1 (AmbientField
prevents that), but low enough that the climax reads as a genuine peak.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | PASS by design | AmbientField in every scene maintains delta > 0.05 even in restrained opening acts |
| 2 Energy-build-to-climax | **PASS by design** | Climax pixel delta exceeds opening delta by construction; supply `--climax=<climaxStartFrame>` |
| 3 Re-hook cadence | PASS — verify | Scene-cut energy spikes are anchors; confirm `longestFlatSec ≤ 8s` through body act |

Supply `--climax` pointing at the frame where your climax scene begins. Without
it, the first-third heuristic fails a correctly back-loaded video every time
(see RelayLaunch and GranipaLaunch snapshots in `retention.md`).

**Build recipe**

```tsx
// In timeline.ts: declare acts as arc-fraction-derived beat counts
// beatsToFrames(beat, bpm, fps) is the only frame-number source
export const ACTS = buildTimeline({
  bpm,
  firstDownbeatSec,
  scenes: [
    { id: 'hook',       beats: Math.floor(totalBeats * 0.10) },
    { id: 'opening',    beats: Math.floor(totalBeats * 0.15) },
    { id: 'body',       beats: Math.floor(totalBeats * 0.40) },
    { id: 'pre_climax', beats: Math.floor(totalBeats * 0.10) },
    { id: 'climax',     beats: Math.floor(totalBeats * 0.10) },
    { id: 'cta',        beats: Math.floor(totalBeats * 0.15) },
  ],
});
```

```tsx
// In body scene component: look up boundaries from timeline, not literal frames
const { startFrame, durationInFrames } = useScene('body', timeline);
const bodyProgress = (frame - startFrame) / durationInFrames; // 0 → 1

// AmbientField energy ramps across the body act
const ambientEnergy = interpolate(bodyProgress, [0, 1], [0.4, 0.9], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

// Introduce new layers only at body-progress thresholds — never at a hardcoded frame
const showSecondLayer = bodyProgress > 0.35;
const showThirdLayer  = bodyProgress > 0.70;
```

```tsx
// In climax scene: all prepared elements fire simultaneously
const ctaProgress = makeSpring(frame - climaxStartFrame, theme.spring.snappy);
// Flash peak at climax frame 0 (src/lib/fx.tsx)
const flashOpacity = frame - climaxStartFrame < 3 ? theme.flashPeak : 0;
```

Theme tokens that carry the escalation ladder:
- `theme.spring.gentle` → `theme.spring.brisk` → `theme.spring.snappy` — opening → body → climax arrival ease
- `theme.accentDim` → `theme.accent` → `theme.fg` — color temperature shift through the arc
- AmbientField `energy` prop: `0.4` (opening) → `0.9` (body peak) → `1.2` (climax) → `0.5` (CTA)
- `theme.flashPeak` — climax flash opacity (set in theme.ts, not a number literal in scene code)

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=back-loaded-climax`

**Arc fit:**
- **A (demo-first)**: impressive cold demo at measured energy; proof montage escalates; differentiator climax is the peak. Canonical match for A arcs.
- **B (problem-first)**: low-energy pain → medium-energy revelation → high-energy proof climax. The "there's another way" turn IS the energy inflection.
- **E (feature symphony)**: each feature beat steps one rung higher on the energy ladder; the final feature reveal is the climax. Gate 2 passes as long as the last feature is the biggest.

**When NOT to use:** When the product's most impressive moment is the initial
demo — i.e. when the cold open IS the reveal. In that case, the back-loaded
structure would bury the lead. Use open loop + late payoff (pattern 3) instead:
flash the peak at the opening, back-load the proof, pay off at 75%+.

---

### Worked example — anti-pattern: RelayLaunch + GranipaLaunch gate-2 front-loading (2026-06-22)

Both shipped reference videos FAIL gate 2 (advisory) because visual intensity
is concentrated in the opening third.

**RelayLaunch** — Full cut: 955 frames (31.83s), step=5, 192 samples.

| Gate | Measured | Pass? |
|------|----------|-------|
| Dead-air 🤖 | `longestStaticSec=0.17s` @frames 480–485 | ✓ |
| Energy build-to-climax 🤖 | `smoothedPeakFrame=280`, `boundary=318` (first-third heuristic), `peakAfterBoundary=false`, `resolveRatio=0.194` | ✗ |
| Re-hook cadence 🤖 | `longestFlatSec=5.00s` @frame0 | ✓ |

**GranipaLaunch** — Full cut: 1120 frames (37.33s), step=5, 225 samples.

| Gate | Measured | Pass? |
|------|----------|-------|
| Dead-air 🤖 | `longestStaticSec=0.00s` | ✓ |
| Energy build-to-climax 🤖 | `smoothedPeakFrame=305`, `boundary=373` (first-third heuristic), `peakAfterBoundary=false`, `resolveRatio=0.12` | ✗ |
| Re-hook cadence 🤖 | `longestFlatSec=7.67s` @frame390 | ✓ |

**Root cause:** Both edits concentrate visual intensity (scene transitions, animated
reveals, icon stamp-ins) in the opening 30%. The narrative climax — the "runner
eliminated" payoff for RelayLaunch, the sovereignty reveal for GranipaLaunch —
has LOWER pixel delta than the opening because it lands on a comparatively settled,
high-design composition. Front-loaded transitions produce high luminance delta;
a single settled reveal does not.

**What back-loaded-climax changes:**

1. **Opening energy budget reduced**: 1 animated element at a time, AmbientField at
   `energy={0.4}`, slow springs (`theme.spring.gentle`). The hook stays alive but
   does NOT spike. All opening scene cuts shifted to dissolves or slow reveals to
   suppress per-pair delta.
2. **Body energy grows**: new layers introduced at `bodyProgress > 0.35` and
   `bodyProgress > 0.70`. Proof beats accumulate visual density; no single proof
   beat is as intense as the climax.
3. **Climax redesigned as the energy peak**: all elements fire simultaneously,
   AmbientField at `energy={1.2}`, `Flash` peak at climax frame 0, tight spring.
   Pixel delta here must exceed the opening sequence's measured `smoothedPeakFrame`
   value (280 for Relay, 305 for Granipa).
4. **Supply `--climax=<climaxStartFrame>`**: the gate measures against the actual
   narrative climax frame. `peakAfterBoundary=true` by construction.

After these changes: `smoothedPeakFrame` lands in the climax scene, which lies
at or after `boundaryFrame`, so `peakAfterBoundary=true`. The CTA settle gives
`resolveRatio < 0.75`. Gate 2 passes by construction.

---

## Pattern 2: Mid-point re-hook punch

**Psychological lever:** Attention reset. Viewer attention dips at the midpoint
(~40–60% through) — they've invested but not committed. A deliberate energy spike
resets the scroll impulse before it reasserts. Strongest when the punch introduces
something the viewer hasn't seen yet: a new data layer, an on-screen stat, a
second persona, or a sudden mode shift.

**Structural spec**

```
Arc fraction:  [0%─── hook + opening ─── 30%] [30%─── body ─── ~50%] [PUNCH: 1–2 beats] [~50%─── body ─── 80%] [80%─CTA─100%]
Energy level:   medium → rising                 rising                   spike               resuming elevated           settle
AmbientField:   varies by pattern               energy={0.7}             energy={1.0}         energy={0.8}                 settle
```

The punch is ONE deliberate beat: a hard cut to a new visual mode, a stat that
stamps in with `Shake`, or a second element activating alongside the first.
Duration: 1–2 beats maximum. Then resume with elevated energy.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | PASS — base requirement | Frames before the punch maintain AmbientField floor; punch itself is high-energy |
| 2 Energy-build-to-climax | neutral | Punch creates a body spike; if it's the global peak, supply `--climax=<punchFrame>` to prevent a false fail |
| 3 Re-hook cadence | **PASS by design** | Punch IS the mid-body anchor; ensures no body stretch exceeds `rehookSec` |

Use `--rehook=<N>` if your arc has tight pacing (e.g. `--rehook=6` for a 20s
video). The default 8s threshold is calibrated for 30–40s runtimes.

**Build recipe**

```tsx
// In timeline.ts: declare the punch as a named, arc-fraction-derived beat
export const MID_PUNCH_BEAT  = Math.floor(timeline.totalBeats * 0.50);
export const MID_PUNCH_FRAME = beatsToFrames(MID_PUNCH_BEAT, timeline.bpm, fps);
```

```tsx
// In the scene spanning the midpoint: reference timeline constants, not literals
const isPunchActive = frame >= MID_PUNCH_FRAME && frame < MID_PUNCH_FRAME + framesPerBeat;

// New element snaps in at punch frame
const punchArrival = interpolate(
  frame,
  [MID_PUNCH_FRAME, MID_PUNCH_FRAME + 6],
  [0, 1],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) },
);
const punchOpacity = frame >= MID_PUNCH_FRAME ? punchArrival : 0;

// Shake on the new element at punch arrival (src/lib/fx.tsx Shake component)
// strength from theme.ts, not a literal
const shakeActive = frame - MID_PUNCH_FRAME < framesPerBeat * 0.5;
```

Theme tokens:
- `theme.spring.snappy` — punch arrival easing; must contrast with the body spring
- `theme.accent` — the new element's color; visually distinct from body content
- `theme.punchShakeStrength` — pixel magnitude of arrival shake; calibrate in theme.ts

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=mid-point-rehook`

**Arc fit:**
- **B (problem-first)**: punch is the "there's another way" turn — canonical placement for this arc
- **D (transformation)**: punch is the crossing — the signature move at its decisive moment
- **E (feature symphony)**: each feature beat at 8–15% intervals serves as a punch; verify no gap exceeds `rehookSec`

**When NOT to use:** When the narrative requires the midpoint to breathe — e.g.
manifesto arc (C) where philosophical escalation demands gradual build. A blunt
punch disrupts the conceptual cadence. Use payoff seeding (pattern 5) instead.

---

## Pattern 3: Open loop + late payoff

**Psychological lever:** Curiosity gap. A question or partial reveal in the
opening that the viewer knows will be answered, but not when. The unresolved
tension is the retention mechanism: the viewer stays to close the loop. Payoff
at 75–85% of runtime maximizes satisfaction — long enough to feel earned, not so
long that they scroll away first.

**Structural spec**

```
Arc fraction:  [0%── LOOP OPENS ──25%] [25%─── evidence (no close) ─── 75%] [75%─ LOOP CLOSES ─85%] [85%─CTA─100%]
Scene role:     Partial reveal + tease    Proof accumulates; question open         Full reveal (peak)     settle
AmbientField:   energy={0.7}             energy={0.7→0.9}                         energy={1.2}           energy={0.5}
```

The loop opens with a deliberate partial reveal: a number without its label, a
blurred UI state, a headline without proof, a "what if" question. The body
accumulates evidence WITHOUT closing the central question — every evidence beat
hints but withholds. The loop closes at ~78% with the full reveal. This reveal IS
the energy peak, and where `--climax` points.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | PASS — base requirement | Body evidence beats maintain foreground motion; AmbientField holds the floor |
| 2 Energy-build-to-climax | **PASS by design** | Reveal is the energy peak by construction; supply `--climax=<REVEAL_FRAME>` |
| 3 Re-hook cadence | PASS — verify | Each "new evidence" beat must spike above `ENERGY_SPIKE_FLOOR=2.0`; add stat stamps or hard cuts if body is flat |

**Build recipe**

```tsx
// In timeline.ts: declare REVEAL_BEAT as an arc fraction
export const REVEAL_BEAT  = Math.floor(timeline.totalBeats * 0.78);
export const REVEAL_FRAME = beatsToFrames(REVEAL_BEAT, timeline.bpm, fps);

// Pass to retention.sh when asserting:
// scripts/retention.sh <CompId> 5 --climax=<REVEAL_FRAME>
```

```tsx
// Opening scene: withheld element — blurred or cropped until reveal
const isBeforeReveal = frame < REVEAL_FRAME; // derived from timeline constant

const blurAmount = isBeforeReveal
  ? interpolate(
      frame,
      [0, beatsToFrames(2, timeline.bpm, fps)],
      [theme.teaseBlur, theme.teaseBlurMin],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    )
  : 0;

// Reveal scene: mask expands at REVEAL_FRAME
const revealSpring = makeSpring(frame - REVEAL_FRAME, theme.spring.snappy);
const maskWidth    = revealSpring < 0 ? 0 : interpolate(revealSpring, [0, 1], [0, 1920]);
```

```tsx
// Reveal scene: highest-energy moment in the video
// Flash peak at reveal entry (src/lib/fx.tsx)
const flashOpacity    = frame - REVEAL_FRAME < 3 ? theme.flashPeak : 0;
const revealAmbient   = 1.2; // AmbientField jumps to peak at reveal
```

Theme tokens:
- `theme.teaseBlur` / `theme.teaseBlurMin` — max and min blur on the withheld element; set in theme.ts
- `theme.spring.snappy` — reveal spring (hard arrival; contrasts with body springs)
- `theme.flashPeak` — flash peak opacity at reveal frame; calibrate in theme.ts

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=open-loop-payoff`

**Arc fit:**
- **B (problem-first)**: loop opens with "what if pain didn't have to work like this?"; evidence = proof beats; reveal = full product demo
- **F (indictment)**: loop opens with "what IS this alternative I built?"; close at founder reveal + architecture moment
- **D (transformation)**: loop opens with a flash of the "after"; body earns it; reveal IS the full after

**When NOT to use:** When the withheld element is not legible as desirable in a
1s partial reveal. If the tease requires too much context to create desire, it
reads as confusion. Also avoid for arc A (demo-first) where the cold open IS the
reveal — don't withhold what the hook is already delivering.

---

## Pattern 4: Pattern interrupt

**Psychological lever:** Wrongness-demands-attention. An unexpected visual shift
mid-video — not the hook's impossibility, but a deliberate mode switch during the
body — forces re-engagement. The brain cannot let unresolved dissonance pass. After
the interrupt, the viewer is more attentive, not less.

**Structural spec**

```
Arc fraction:  [0%─── hook + body ─── 60%] [INTERRUPT: 1–2 beats] [60%─── body resumes ─── 85%] [CTA]
Scene role:     Standard body flow              Unexpected mode shift    Resumed with elevated tension   settle
AmbientField:   energy={0.7}                   shifted hue / reduced    energy={0.9}                    settle
```

The interrupt is brief (1–2 beats) and unexpected: a grayscale wash then back to
color, a typographic takeover mid-demo, a dramatic scale snap, a sudden cut to a
contrasting visual mode. It must be visually motivated — a non-sequitur is jarring,
a deliberate contradiction to what just happened is compelling.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | PASS — requires care | The interrupt MUST have motion — color shift, scale change, or type entry give delta > 0.05; a blank static frame fails gate 1 |
| 2 Energy-build-to-climax | neutral | Interrupt spike is a mid-body peak; if it exceeds the climax, supply `--climax=<climaxFrame>` to shift the boundary |
| 3 Re-hook cadence | **PASS by design** | The interrupt IS a re-hook anchor; ensures no body segment before it exceeds `rehookSec` |

**Build recipe**

```tsx
// In timeline.ts: expose the interrupt beat as an arc-fraction-derived constant
export const INTERRUPT_BEAT     = Math.floor(timeline.totalBeats * 0.65);
export const INTERRUPT_FRAME    = beatsToFrames(INTERRUPT_BEAT, timeline.bpm, fps);
export const INTERRUPT_DURATION = beatsToFrames(2, timeline.bpm, fps); // 2 beats
```

```tsx
// In the scene spanning the interrupt:
const interruptActive  = frame >= INTERRUPT_FRAME && frame < INTERRUPT_FRAME + INTERRUPT_DURATION;
const reEntryFrame     = INTERRUPT_FRAME + INTERRUPT_DURATION;

// Grayscale wash during interrupt (applied via CSS filter on AbsoluteFill wrapper)
const colorSaturation = interruptActive
  ? interpolate(frame, [INTERRUPT_FRAME, INTERRUPT_FRAME + 4], [1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  : interpolate(frame, [reEntryFrame, reEntryFrame + 6], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

// Scale snap on re-entry (theme-derived spring; never a hardcoded damping/stiffness pair here)
const reEntryProgress = makeSpring(frame - reEntryFrame, theme.spring.snappy);
const scale = 1.0 + Math.max(0, reEntryProgress) * 0.03;
```

Theme tokens:
- `theme.spring.snappy` — re-entry snap easing after the interrupt
- `theme.bgAlt` — alternate background field during the interrupt (set in theme.ts)
- `theme.accent` — re-entry element highlight color; signals return to normal

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=pattern-interrupt`

**Arc fit:**
- **C (manifesto)**: interrupt is the philosophical pivot — the claim that shifts the argument's ground
- **F (indictment)**: interrupt is the gut-punch beat ("you signed up for X, you handed over everything")
- **A (demo-first)**: interrupt is the "stop and reconsider" beat mid-proof montage — the challenger moment

**When NOT to use:** When the arc's pacing is narrative (arcs B and D) and the
interrupt breaks emotional continuity. In problem-first or transformation arcs,
use a mid-point re-hook punch instead — it preserves the emotional thread while
resetting attention.

---

## Pattern 5: Payoff seeding

**Psychological lever:** Escalating anticipation. Plant 3–4 small payoffs at
regular intervals through the body, each one bigger than the last. The viewer's
expectation ratchets up without being fully satisfied until the climax. Works
because the brain recognizes an escalating pattern and wants to see it completed.

**Structural spec**

```
Arc fraction:  [0%] [20% seed 1] [40% seed 2] [60% seed 3] [80% CLIMAX seed] [95% CTA]
Motif scale:    —    0.25 size    0.50 size    0.75 size    1.0 FULL SIZE       settle
AmbientField:   0.4  0.5          0.65         0.8          1.2                 0.5
```

Each seed uses the same MOTIF as the climax — the same visual element, the same
motion shape — but at reduced scale and intensity. The climax delivers the motif
at full scale. A viewer who has seen it three times at reduced size RECOGNIZES
the climax when it arrives at full scale and a higher energy register.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | PASS — base requirement | Seeds must produce real motion (not opacity fades alone); AmbientField holds the floor between seeds |
| 2 Energy-build-to-climax | **PASS by design** | Climax seed at `×1.0` scale produces the highest pixel delta; supply `--climax=<climaxFrame>` |
| 3 Re-hook cadence | **PASS by design** | Seeds at 20%-interval positions give anchors every ~6–8s in a 30s video; verify no gap exceeds `rehookSec` |

**Build recipe**

```tsx
// In timeline.ts: seed beats derived from arc fractions, not hardcoded values
const SEED_POSITIONS = [0.20, 0.40, 0.60, 0.80] as const;
export const SEED_BEATS  = SEED_POSITIONS.map(p => Math.floor(timeline.totalBeats * p));
export const SEED_FRAMES = SEED_BEATS.map(b => beatsToFrames(b, timeline.bpm, fps));
```

```tsx
// Shared seed component: intensity is the only variable between instances
function SeedPayoff({ seedIndex, frame, timeline, theme }) {
  const totalSeeds    = SEED_FRAMES.length; // 4
  const seedIntensity = (seedIndex + 1) / totalSeeds; // 0.25 / 0.50 / 0.75 / 1.0

  const seedFrame    = SEED_FRAMES[seedIndex];
  const arrival      = makeSpring(frame - seedFrame, theme.spring.brisk);
  const motifScale   = seedIntensity; // drives size of the shared motif element

  return (
    <div style={{ transform: `scale(${motifScale * Math.max(0, arrival)})`, opacity: Math.max(0, arrival) }}>
      <ClimaticMotif intensity={seedIntensity} theme={theme} />
    </div>
  );
}
```

```tsx
// AmbientField energy steps up at each seed frame (derived from SEED_FRAMES)
const seedEnergyLevels = [0.5, 0.65, 0.8, 1.2] as const;
const currentSeedIdx   = SEED_FRAMES.reduce((acc, f, i) => frame >= f ? i : acc, -1);
const ambientEnergy    = currentSeedIdx < 0 ? 0.4 : seedEnergyLevels[currentSeedIdx];
```

Theme tokens:
- `theme.spring.gentle` → `theme.spring.brisk` → `theme.spring.snappy` — arrival ease for seeds 1 → 2/3 → 4 (climax)
- AmbientField `energy` props: `0.4` pre-seed → `0.5 / 0.65 / 0.8 / 1.2` per seed index
- `theme.climaxMotif.*` — the shared visual element (scale, color, shape); declared in theme.ts so all seeds reference the same design token

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=payoff-seeding`

**Arc fit:**
- **E (feature symphony)**: each feature beat IS a seed; the final feature reveal IS the climax. Canonical match.
- **A (demo-first)**: proof beats escalate toward the differentiator climax; each proof beat is a seed.
- **D (transformation)**: seeds chart the before-to-after journey; the full "after" reveal is the climax.

**When NOT to use:** When the motif is complex enough that three rehearsal seeds
create fatigue before the payoff. If each seed reads as a smaller version of
something the viewer is WAITING to see rather than an escalation they FEEL, the
pattern falls flat. In that case, use open loop + late payoff (pattern 3): tease
once, withhold through the body, pay off big.

---

## Pattern 6: Dead-air elimination

**Psychological lever:** Constant stimulus. No gap in the motion signal gives
the viewer no moment to disengage. Even "slow" scenes — a settled typography
reveal, a product at rest — maintain micro-motion at the background layer.

**Structural spec**

Applied globally, not to a specific arc position. Every frame has at least one
active animation layer. Three-layer motion budget per scene:

```
Every frame:
  Layer 1 (background):  AmbientField — always scrolling, density and energy from theme
  Layer 2 (foreground):  Scene's primary animation — varies per scene
  Layer 3 (micro):       Cursor blink / text ticker / breath scale / counter tick
```

Micro-layer activates wherever the foreground has finished its main animation —
the "settled state" that otherwise produces zero delta. A breath scale, cursor
blink, or background counter tick is enough to stay above `DEAD_AIR_FLOOR=0.05`.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | **PASS by design** | Three-layer budget ensures at least one layer produces delta > 0.05 in every non-hold frame |
| 2 Energy-build-to-climax | neutral | Dead-air elimination sets the floor; back-loaded-climax sets the shape |
| 3 Re-hook cadence | neutral | Eliminating dead air is necessary but not sufficient for gate 3; combine with patterns 2 / 4 / 5 for anchors |

For declared static holds (freeze-frames, credits cards, deliberate pauses),
declare them via `--holds=<S:E,...>` so gate 1 skips those pairs rather than
requiring fake motion.

**Build recipe**

```tsx
// Layer 1: AmbientField — required in every scene
<AmbientField
  color={theme.accent}
  colorDim={theme.accentDim}
  density={40}
  energy={ambientEnergyForAct} // derived from act context in timeline; never a literal
/>

// Layer 2: Primary scene animation (product demo, type reveal, stat count, etc.)
<PrimarySceneContent frame={frame} theme={theme} timeline={timeline} />

// Layer 3: Micro-motion on any settled state — pick one per scene:

// Option A: Breath scale on logo or product frame (tempo-locked, never a hardcoded period)
const breathPeriod = beatsToFrames(4, timeline.bpm, fps);
const breathPhase  = (frame % breathPeriod) / breathPeriod;
const breathScale  = 1 + 0.004 * Math.sin(breathPhase * Math.PI * 2);

// Option B: Cursor blink at a settled input or terminal
// Option C: Counter tick on a settled stat (useCountUp from src/lib/fx.tsx)
// Option D: Background data ticker (streaming text, live-update label)
```

For declared holds — note in `storyboard.md` then pass to the script:
```bash
scripts/retention.sh <CompId> 5 --holds=<startFrame>:<endFrame>
```

Theme tokens:
- `theme.accentDim` — AmbientField dim color; must not compete with foreground luminance
- Breath period: `beatsToFrames(4, timeline.bpm, fps)` — tempo-locked; do not hardcode the frame count

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=dead-air-elimination`

**Arc fit:** Universal — applies as a base layer obligation to ALL arcs (A through F).
The arc shape determines WHAT animates per act; dead-air elimination ensures
SOMETHING animates in every frame.

**When NOT to use:** Never eliminate a DELIBERATE creative pause — a 0.5s black
frame as a hard cut, an emotional silence. Declare it as a hold (`--holds=S:E`)
instead of adding fake motion. Micro-motion added to an intentional pause
undercuts the creative intention and reads as jitter, not craft.

---

## Pattern 7: CTA tension/resolve

**Psychological lever:** Earned arrival. The CTA is the emotional destination,
not an afterthought. A brief tension spike immediately before the CTA resolves
into calm on the first CTA frame — the viewer EXHALES on the logo. This produces
the post-peak resolve evidence that gate 2 measures: `resolveRatio < 0.75`
(post-peak mean energy below 75% of peak).

**Structural spec**

```
Arc fraction:  [─── main content ─── 88%] [88%──TENSION──92%] [92%────CTA RESOLVE────100%]
Scene role:     Body / pre-climax           Pre-CTA spike         Logo + URL + music settle
AmbientField:   varies by pattern           energy={1.0}           energy={0.5→0.3}
Duration:        —                           1–2 beats              ≥ 3 beats (direction.md CTA rule)
```

The tension beat is an incomplete gesture: a cursor that moves toward the CTA
button but pauses, a URL that begins typing then waits, an arrow that enters but
doesn't reach its destination. The CTA scene completes the gesture and resolves
the energy. Direction.md CTA rule applies: the CTA hold is ≥ 3 beats.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 1 Dead-air (HARD) | PASS — requires care | Tension beat must have visible motion; CTA scene maintains AmbientField floor and logo breath scale |
| 2 Energy-build-to-climax | supported | Tension spike → CTA settle produces `resolveRatio = ctaMeanEnergy / tensionPeakEnergy`; supply `--climax=<TENSION_FRAME>` if tension is the last energy peak |
| 3 Re-hook cadence | neutral | Gate 3 measures the body; the CTA is the endpoint, not a body stretch |

Supply `--climax` pointing at the tension frame (or the climax before it) so
gate 2 measures post-peak resolve correctly. Without it, the heuristic may
target the wrong boundary.

**Build recipe**

```tsx
// In timeline.ts: tension beat is 1–2 beats before CTA start
const CTA_BEAT      = timeline.scenes.find(s => s.id === 'cta').startBeat;
export const TENSION_BEAT  = CTA_BEAT - 2;
export const TENSION_FRAME = beatsToFrames(TENSION_BEAT, timeline.bpm, fps);
export const CTA_FRAME     = beatsToFrames(CTA_BEAT, timeline.bpm, fps);
```

```tsx
// Pre-CTA scene: incomplete gesture — reaches 70% of destination, then stops
const tensionProgress = interpolate(
  frame,
  [TENSION_FRAME, TENSION_FRAME + framesPerBeat],
  [0, 0.7],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) },
);
// Arrow/cursor travel — target from theme.ts, not a pixel literal
const arrowX = tensionProgress * theme.ctaArrowTargetX;
```

```tsx
// CTA scene: complete the gesture + settle
// Logo arrives on a gentle spring (calmer than body springs — this is the exhale)
const ctaProgress  = makeSpring(frame - CTA_FRAME, theme.spring.gentle);
const logoOpacity  = Math.max(0, ctaProgress);
const logoScale    = 0.95 + 0.05 * Math.max(0, ctaProgress);

// URL typing duration in frames derived from timeline, not a literal
const urlFrames    = beatsToFrames(2, timeline.bpm, fps);
const urlProgress  = Math.min(1, (frame - CTA_FRAME) / urlFrames);

// AmbientField fades toward rest during CTA resolve
const ctaAmbient   = interpolate(Math.max(0, ctaProgress), [0, 1], [0.6, 0.3], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
```

Theme tokens:
- `theme.spring.gentle` — CTA settle easing; calmer than body springs (the exhale)
- `theme.accentDim` — CTA background color; recedes so logo reads clearly
- `theme.ctaArrowTargetX` — full travel distance of the tension gesture; set in theme.ts

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=cta-tension-resolve`

**Arc fit:**
- **All arcs**: the CTA act is shared across A–F; this pattern applies universally.
- **B (problem-first)**: tension = "so what do I do about this?"; CTA = "go here."
- **F (indictment)**: tension sets up the price/license kicker; CTA is the invitation to sanctuary.

**When NOT to use:** When the video is ≤ 20s and a two-beat tension run costs
too much of the runtime. In very short videos, let the climax scene carry
directly into the CTA without a separate tension beat.

---

## Pattern 8: Loop-back ending

**Psychological lever:** Completion signal + rewatch magnet. When the final frame's
composition rhymes with frame 0 — same background brightness, same palette weight, same
AmbientField energy level — the video feels resolved and loops without a visible seam.
On platforms that auto-replay (X, Instagram, TikTok), a clean loop restarts without the
viewer choosing to rewatch; the seam disappears and they watch a second time by default.
Gate 4 measures this: `loopSeamDelta = meanAbsDelta(lum(frame0), lum(finalFrame))` must
be below `LOOP_SEAM_THRESHOLD (60.0)`. Reference: RelayLaunch 6.53, GranipaLaunch 9.49 —
both pass by design because hook and CTA share the same dark brand background.

**When to use:** Video is destined for a looping social context (X, Instagram, TikTok).
The opening visual is strong enough to read as both an entrance and a resolution. Skip
when the video deliberately ends on a visually distinct CTA card — `loopable:false` is an
advisory opportunity flag (not a failure) and a justified non-loop is acceptable; but
designing for the loop is the stronger choice when it fits.

**Structural spec**

```
Arc fraction:  [0%──── hook ────10%] [10%─── body ───90%] [90%──── CTA + loop-return ────100%]
Composition:   opening motif         evolving              ← rhyme with 0% →
Background:    theme.bg              theme.bg              theme.bg (identical)
AmbientField:  hookEnergy            varies                hookEnergy (matched to hook)
```

The rhyme is compositional, not identical: the same background brightness, similar element
positions, the same AmbientField energy texture. The emotional context is different (the
viewer has earned this ending), but the luminance signature is familiar.

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 4 Full-video loop seam | **PASS by design** | Matching background + AmbientField energy makes loopSeamDelta < 60.0; verify with `scripts/retention.sh` |
| 1 Dead-air (HARD) | neutral | AmbientField continues in the loop-return window; unaffected |
| 5 Ending hold / no-limp-tail | neutral | Gate 5 passes independently via Pattern 9; loop-return and ending-mode are orthogonal |

**Build recipe**

```tsx
// In timeline.ts: expose the loop-return onset — 2 beats from the video end
const CTA_SCENE           = timeline.scenes.find(s => s.id === 'cta');
export const LOOP_RETURN_BEAT  = CTA_SCENE.startBeat + CTA_SCENE.beats - 2;
export const LOOP_RETURN_FRAME = beatsToFrames(LOOP_RETURN_BEAT, timeline.bpm, fps);
```

```tsx
// In theme.ts: single source of truth for the hook's AmbientField energy —
// referenced in BOTH the hook scene AND the CTA scene's loop-return phase
export const theme = defineTheme({
  // ... other tokens
  hookAmbientEnergy: 0.6,   // hook scene and loop-return beat — must match
  ctaResolveEnergy:  0.4,   // CTA settle body (between hook and loop-return)
});
```

```tsx
// In the CTA scene: settle normally, then return to hook energy in the final beats
const isLoopReturn  = frame >= LOOP_RETURN_FRAME;
const ambientEnergy = isLoopReturn ? theme.hookAmbientEnergy : theme.ctaResolveEnergy;

// Background must be theme.bg throughout — not a custom CTA accent color —
// so frame 0 and the final frame share identical background luminance.

// If the CTA scene moved the focal element, ease it back to the hook position:
const focalX = interpolate(
  frame,
  [LOOP_RETURN_FRAME, LOOP_RETURN_FRAME + framesPerBeat * 2],
  [ctaFocalX, hookFocalX],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) },
);
```

Gate 4 test: `scripts/retention.sh <CompId>` reports `loopSeamDelta` and `loopable`.
Target `loopSeamDelta < 20.0` on the first pass — gives headroom for render-time variance.
If `loopSeamDelta ≥ 60.0`, inspect which element differs between frame 0 and the final
frame in the filmstrip; adjust the loop-return composition to match that element's position
or remove it from the final window.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=loop-back-ending`

**Arc fit:**
- **All arcs**: applies to the ending only, composing on top of any structural pattern (1 / 3 / 5).
- **A (demo-first)**: hook opens on the product at rest; loop-return closes on the product at rest — same static-hero composition closes the loop.
- **B (problem-first)**: the hook's pain image returns as the closing frame — the viewer arrives back at the opening setup having seen the solution; the loop is emotionally resonant.

**When NOT to use:** When the CTA card is a strong brand/logo moment that must be
visually distinct from the hook. Accept `loopable:false` and document the justification.
Gate 4 is advisory — a deliberate non-loop with a justified artistic reason is acceptable.

---

## Pattern 9: Final-accent landing

**Psychological lever:** Resolved arrival. An ending that drifts — energy decaying toward
zero without landing on a clear compositional frame — reads as "nothing happened here."
Gate 5 measures the final `ENDING_WINDOW_SEC (1.5s)`: PASS when the ending is either (a)
a stable held end-state (`endingMeanEnergy < HOLD_ENERGY_THRESHOLD=1.5`) or (b) contains
at least one final energy accent (any ending pair `> ENERGY_SPIKE_FLOOR=2.0`). The limp
tail fail is `endingMode=limp` — moderate energy (1.0–2.0) with neither a clear hold nor
a deliberate punch. Reference: RelayLaunch endingMode=held, mean=0.09; GranipaLaunch
endingMode=held, mean=0.17 — both pass because AmbientField is at low energy on their
CTA cards. The limp zone to avoid: CTA AmbientField at energy=0.7 → per-pair delta ~1.0–1.5,
above HOLD_ENERGY_THRESHOLD but below ENERGY_SPIKE_FLOOR → `endingMode=limp`.

**When to use:** Every video — this is a base obligation. Choose one ending mode per video:

- **Hold mode**: the ending resolves into a legible, settled end-state (CTA card, logo hold,
  final stat) with micro-motion only. Choose when the brand's closing image IS the message.
- **Accent mode**: a deliberate final beat punch in the ending window (stamp-in, hard logo
  arrival, music-locked sting). Choose when the video needs a punctuation mark, not a fade.

**Structural spec — Hold mode**

```
Arc fraction:  [─── content ─── 90%] [90%────── CTA HOLD ──────100%]
AmbientField:  varies                  energy ≤ 0.4 → mean < 1.5 per pair (held)
Motion:        scene content           micro-motion only: breath scale + cursor blink
```

**Structural spec — Accent mode**

```
Arc fraction:  [─── content ─── 90%] [90%── CTA settle ──97%] [ACCENT: 1 beat] [──settle──100%]
AmbientField:  varies                  energy ≤ 0.5              energy={1.0}      energy ≤ 0.4
Motion:        scene content           settling                   stamp-in/snap     settled hold
```

**Gate mapping**

| Gate | Verdict | Basis |
|------|---------|-------|
| 5 Ending hold / no-limp-tail | **PASS by design** | Hold: AmbientField ≤ 0.4 in ending window → mean < 1.5. Accent: stamp-in → max > 2.0 |
| 1 Dead-air (HARD) | PASS — requires care | Ending window must still produce delta ≥ 0.05; AmbientField at energy=0.3–0.4 maintains this |
| 2 Energy-build-to-climax | supported | Low ending energy is what produces `resolveRatio < 0.75` (post-peak mean well below peak); hold mode makes this pass by construction |

**Build recipe — Hold mode**

```tsx
// In timeline.ts: confirm the CTA scene has enough beats that its settled portion
// spans ≥ ENDING_WINDOW_SEC (1.5s = 45 frames at 30fps) before the video ends.
const CTA_SCENE          = timeline.scenes.find(s => s.id === 'cta');
export const CTA_SETTLE_BEAT  = CTA_SCENE.startBeat + 2; // 2 beats in — primary animation done
export const CTA_SETTLE_FRAME = beatsToFrames(CTA_SETTLE_BEAT, timeline.bpm, fps);
```

```tsx
// In the CTA scene: after primary animation, reduce AmbientField to hold-mode level
const isSettled     = frame >= CTA_SETTLE_FRAME;
const ambientEnergy = isSettled ? 0.35 : theme.ctaResolveEnergy;
// 0.35 → per-pair mean ≈ 0.15 in practice (well below HOLD_ENERGY_THRESHOLD=1.5)

// Micro-motion: prevents dead-air (gate 1) while remaining in held territory (gate 5)
const breathPeriod  = beatsToFrames(4, timeline.bpm, fps);
const breathPhase   = (frame % breathPeriod) / breathPeriod;
const breathScale   = 1 + 0.003 * Math.sin(breathPhase * Math.PI * 2); // < 0.5% — alive but invisible
```

**Build recipe — Accent mode**

```tsx
// In timeline.ts: accent beat is 1–2 beats before the final frame
const CTA_SCENE            = timeline.scenes.find(s => s.id === 'cta');
export const ENDING_ACCENT_BEAT  = CTA_SCENE.startBeat + CTA_SCENE.beats - 2;
export const ENDING_ACCENT_FRAME = beatsToFrames(ENDING_ACCENT_BEAT, timeline.bpm, fps);
```

```tsx
// In the CTA scene: stamp in the accent (logo re-arrival or sting) at the accent beat
const isAccentWindow  = frame >= ENDING_ACCENT_FRAME;
const accentArrival   = makeSpring(frame - ENDING_ACCENT_FRAME, theme.spring.snappy);

// Hard arrival at the accent beat — produces max > ENERGY_SPIKE_FLOOR (2.0)
const accentScale   = isAccentWindow ? 0.9 + 0.1 * Math.max(0, accentArrival) : 0;
const accentOpacity = isAccentWindow ? Math.max(0, accentArrival) : 0;

// After the accent, drop to hold-mode energy so the video ends settled
const postAccent    = frame > ENDING_ACCENT_FRAME + framesPerBeat;
const ambientEnergy = isAccentWindow && !postAccent ? 1.0 : (postAccent ? 0.3 : theme.ctaResolveEnergy);
```

Gate 5 test: `scripts/retention.sh <CompId>` reports `endingMode`, `endingMeanEnergy`,
`endingMaxEnergy`. Targets: `endingMode=held` with `endingMeanEnergy < 0.5` (hold mode),
or `endingMode=accented` with `endingMaxEnergy > 3.0` (accent mode). Values 0.5–1.5 in
hold mode indicate AmbientField energy is too high in the ending window — reduce it.

**Scaffold:** `node scripts/new-video.mjs <slug> <CompId> --body=final-accent-landing`

**Arc fit:**
- **Hold mode**: all arcs (A–F). Any video ending on a legible CTA card benefits from hold mode — this is the default for most Kino videos.
- **Accent mode**: arcs where the closing beat is a statement (product reveal, founder signature). The accent is an exclamation point, not a fade.

**When NOT to use — hold mode:** When the narrative calls for a punched ending. Use accent
mode and let the stamp be the final beat.
**When NOT to use — accent mode:** When the CTA card IS the resolution — the logo and URL
are the final statement. Adding a snappy arrival after the resolve undercuts the brand
moment. Use hold mode instead.

---

## Selection guide

| If your arc has… | Use pattern |
|---|---|
| Visual intensity front-loaded; gate 2 failing | 1 Back-loaded climax |
| Attention dip at the midpoint (~50%) | 2 Mid-point re-hook punch |
| A reveal that pays off a setup | 3 Open loop + late payoff |
| An emotional pivot mid-body (C or F arcs) | 4 Pattern interrupt |
| Multiple escalating proof beats (E arc) | 5 Payoff seeding |
| Dead-air gate at risk; settled or hold scenes | 6 Dead-air elimination (always) |
| Gate 2 resolveRatio failing; CTA needs weight | 7 CTA tension/resolve (always) |
| Looping social context (X/Instagram/TikTok auto-replay) | 8 Loop-back ending |
| Gate 5 failing `endingMode=limp`; ending feels unresolved | 9 Final-accent landing (always) |

Cross-reference the arc menu (`direction.md §4`) and pick retention patterns
that reinforce, not fight, the arc's emotional shape. Pattern 1 (back-loaded
climax) is the structural default for arcs A, B, and E — it describes how to
DISTRIBUTE energy across the arc to arrive at the climax at the right energy
level, not how to design the climax scene itself.

**Stacking rule:** apply at most two patterns — one structural (1 / 3 / 5) and
one cadence (2 / 4). Patterns 6, 7, and 9 are base obligations: apply them to
every video regardless of which structural pattern is chosen. Pattern 8 is
optional — add it when targeting a looping social context. Stacking structural
patterns produces contradictory energy curves; stacking a structural pattern with
a cadence pattern is the natural composition (e.g. back-loaded climax + mid-point
re-hook punch means energy builds toward the climax AND has one deliberate spike
at 50% to prevent a flat body).

---

*(Worked example appears inline under Pattern 1 above: RelayLaunch + GranipaLaunch
gate-2 front-loading anti-pattern and how back-loaded-climax fixes it. All measured
values from `scripts/retention.sh` runs on 2026-06-22.)*
