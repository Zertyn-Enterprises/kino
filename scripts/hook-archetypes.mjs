#!/usr/bin/env node
/**
 * scripts/hook-archetypes.mjs — render-free hook archetype template registry.
 *
 * Exports:
 *   HOOK_ARCHETYPE_KEYS  — ordered array of the 8 stable kebab slugs
 *   HOOK_ARCHETYPES      — map: slug → { title, signaturePrimitive,
 *                            ambientRecipe, arcFit, renderHookScene }
 *
 * renderHookScene({ themeVar, timelineVar }) returns a complete Hook.tsx source
 * string that is hook-gate-green by construction:
 *   • Reads all palette/font taste from useTheme() — zero hardcoded hex tokens
 *   • AmbientField living-background present (gates 4+5 PASS)
 *   • Motion-by-frame-10 primitive present (gate 1 PASS)
 *   • Frame-0 focal element with contrast (gate 2 PASS)
 *   • promise/byFrame props consumed from timeline.ts (gate 6/7 PASS)
 *   • "// re-derive bespoke per Hard Rule 3" header on every emitted file
 *
 * Templates live in scripts/ only — never src/lib/ (Hard Rule 5).
 *
 * Ported from:
 *   src/smoke/hooks/Hook0{1,2,4,5,6,8}.tsx  (archetypes 1,2,4,5,6,8)
 *   src/videos/relay/scenes/Hook.tsx         (archetype 3 — dramatized pain)
 *   src/videos/granipa/scenes/Hook.tsx       (archetype 7 — open question)
 */

// ── Ordered key list ──────────────────────────────────────────────────────────

export const HOOK_ARCHETYPE_KEYS = [
  'mid-action-demo',
  'bold-claim',
  'dramatized-pain',
  'pattern-interrupt',
  'number-counting',
  'payoff-flash-forward',
  'open-question',
  'multi-layer-live-demo',
];

// ── Archetype registry ────────────────────────────────────────────────────────

export const HOOK_ARCHETYPES = {

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 1: Mid-action demo
  // Ref fixture: src/smoke/hooks/Hook01MidActionDemo.tsx
  // ───────────────────────────────────────────────────────────────────────────
  'mid-action-demo': {
    title: 'Mid-action demo',
    signaturePrimitive: 'typewriter causality chain + 2% camera push-in on focal',
    ambientRecipe: { density: 40, energy: 1, opacity: 0.10 },
    arcFit: ['A', 'B'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace LINES and copy with product-specific content.
// Archetype 1: Mid-action demo. Ref: src/smoke/hooks/Hook01MidActionDemo.tsx
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your product's terminal output sequence (Hard Rule 3).
const LINES: { text: string; startAt: number; dur: number }[] = [
  { text: "$ [your-command] --flag",  startAt: 0,  dur: 0 },
  { text: "→ [output line 1]",        startAt: 0,  dur: 8 },
  { text: "→ [output line 2]",        startAt: 10, dur: 8 },
  { text: "→ [output line 3]",        startAt: 20, dur: 8 },
  { text: "→ [done message]",         startAt: 30, dur: 8 },
];

export function Hook({
  promise = "TODO: ≤6-word outcome",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Camera push-in 2% on focal point across beats 1–3 (f15–f45) per archetype spec.
  const scale = interpolate(frame, [15, 45], [1.0, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Promise text appears as the final terminal line near byFrame.
  const allLines = [
    ...LINES,
    { text: promise, startAt: Math.max(0, byFrame - 15), dur: 8 },
  ];

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 1 AmbientField recipe: density=40 energy=1, full-frame behind focal. */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={1}
      />

      {/* Focal: terminal panel with causality-chain typewriter + push-in scale */}
      <AbsoluteFill
        style={{ transform: \`scale(\${scale})\`, transformOrigin: "56% 50%" }}
      >
        <div
          style={{
            position: "absolute",
            left: "44%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: theme.fonts.mono?.family ?? theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 30,
            lineHeight: 1.75,
            color: theme.palette.text,
            background: theme.palette.surface,
            padding: "32px 48px",
            borderRadius: 10,
            minWidth: 480,
          }}
        >
          {allLines.map(({ text, startAt, dur }, i) => {
            if (frame < startAt) return null;
            const elapsed = frame - startAt;
            const chars =
              dur === 0
                ? text.length
                : Math.min(
                    text.length,
                    Math.floor(
                      interpolate(elapsed, [0, dur], [0, text.length], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.inOut(Easing.quad),
                      }),
                    ),
                  );
            const isLast = i === allLines.length - 1;
            const cursorOn = chars < text.length && Math.floor(frame / 6) % 2 === 0;
            return (
              <div
                key={i}
                style={{
                  color: isLast ? theme.palette.accent : theme.palette.text,
                  whiteSpace: "nowrap",
                }}
              >
                {text.slice(0, chars)}
                {cursorOn && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 26,
                      background: theme.palette.accent,
                      marginLeft: 2,
                      verticalAlign: "middle",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 2: Bold / contrast claim
  // Ref fixture: src/smoke/hooks/Hook02BoldClaim.tsx
  // ───────────────────────────────────────────────────────────────────────────
  'bold-claim': {
    title: 'Bold / contrast claim',
    signaturePrimitive: 'KineticLine word-slam from frame 0, 5-frame per-word stagger',
    ambientRecipe: { density: 40, energy: 0.8, opacity: 0.05 },
    arcFit: ['C', 'F'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace SUBCLAIM with product-specific copy.
// Archetype 2: Bold / contrast claim. Ref: src/smoke/hooks/Hook02BoldClaim.tsx
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, KineticLine } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your product's bespoke sub-claim (Hard Rule 3).
// The main claim comes from the timeline promise — ≤6 bold words.
const SUBCLAIM = "TODO: sub-claim or evidence label";

export function Hook({
  promise = "TODO: bold claim",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Sub-claim and kicker fade in after the main claim lands.
  const subP = interpolate(frame, [byFrame - 20, byFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 2 AmbientField recipe: density=40 energy=0.8, subtle behind text. */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={0.8}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {/* Main claim: word-slam from frame 0 — "Your CI is lying." gate-1 delta. */}
        <KineticLine
          text={promise}
          at={0}
          perWord={5}
          slamFrames={6}
          fontSize={140}
          fontFamily={theme.fonts.display.family}
          fontWeight={theme.fonts.display.weight}
          color={theme.palette.text}
          style={{ maxWidth: "80%", textAlign: "center" }}
        />

        {/* Sub-claim fades in at byFrame — visual proof / kicker. */}
        <div
          style={{
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 36,
            color: theme.palette.textDim,
            opacity: subP,
            transform: \`translateY(\${(1 - subP) * 18}px)\`,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {SUBCLAIM}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 3: Dramatized pain
  // Ref fixture: src/videos/relay/scenes/Hook.tsx (embedded, archetype 3)
  // ───────────────────────────────────────────────────────────────────────────
  'dramatized-pain': {
    title: 'Dramatized pain',
    signaturePrimitive: 'accelerating elapsed counter (useCountUp, Easing.in) + mid-action command',
    ambientRecipe: { density: 30, energy: 0.6, opacity: 0.08 },
    arcFit: ['B', 'F'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace CMD and WAIT_COPY with product-specific copy.
// Archetype 3: Dramatized pain. Ref: src/videos/relay/scenes/Hook.tsx
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, useCountUp } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your product's pain-state command and context (Hard Rule 3).
const CMD = "$ [your-command] [args]"; // already typed at frame 0 (mid-action)
const WAIT_COPY = "waiting for [thing]"; // the painful waiting state
const pad = (n: number) => String(n).padStart(2, "0");

export function Hook({
  promise = "TODO: pain cost counter",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Elapsed counter accelerates toward byFrame — pain escalating.
  // Drives from 0 seconds to a large value; replace peak with your pain's max.
  const PEAK_SECONDS = 872; // e.g. 14:32 elapsed — replace with product's worst case
  const elapsed = useCountUp({
    from: 0,
    to: PEAK_SECONDS,
    at: 40,
    durationInFrames: byFrame - 40,
    easing: Easing.in(Easing.quad),
  });

  // Waiting indicator pulses at 2-beat period — slower than product's live pulse.
  const dotPulse = 0.62 + 0.26 * Math.sin((frame / 60) * Math.PI * 2);

  // Drift: slow camera pull that reinforces "stuck" feeling.
  const drift = 1 + (frame / 150) * 0.02;

  // Caption fades in at frame 90 — "every push, every day" context line.
  const captionP = interpolate(frame, [90, 104], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 3 AmbientField recipe: density=30 energy=0.6, dim strips for "broken" mood. */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={30}
        energy={0.6}
      />

      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            transform: \`scale(\${drift})\`,
            background: theme.palette.surface,
            padding: "32px 48px",
            borderRadius: 10,
            minWidth: 600,
            fontFamily: theme.fonts.mono?.family ?? theme.fonts.body.family,
            fontSize: 28,
            lineHeight: 1.8,
          }}
        >
          {/* Command already mid-action at frame 0 — product in painful state */}
          <div style={{ color: theme.palette.textDim }}>{CMD}</div>

          {frame >= 20 && (
            <div style={{ color: theme.palette.textDim, fontSize: 24 }}>
              [output line — objects written, pack received…]
            </div>
          )}

          {/* Waiting indicator with pulsing dot from frame 40 */}
          {frame >= 40 && (
            <div style={{ marginTop: 16, color: theme.palette.text }}>
              <span
                style={{
                  color: theme.palette.accent,
                  opacity: dotPulse,
                }}
              >
                ●{" "}
              </span>
              {WAIT_COPY}
            </div>
          )}

          {/* Elapsed counter: the pain metric, appears at frame 60 and accelerates */}
          {frame >= 60 && (
            <div
              style={{
                marginTop: 16,
                fontSize: 58,
                fontWeight: 700,
                color: theme.palette.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.floor(elapsed / 60)}:{pad(elapsed % 60)}
              <span
                style={{
                  fontSize: 24,
                  color: theme.palette.textDim,
                  fontWeight: 400,
                }}
              >
                {"  "}{promise}
              </span>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Caption: context label appears at f90 — "every push, every day" */}
      <div
        style={{
          position: "absolute",
          left: 96,
          bottom: 84,
          fontFamily: theme.fonts.body.family,
          fontWeight: theme.fonts.body.weight,
          fontSize: 34,
          color: theme.palette.textDim,
          opacity: captionP,
          transform: \`translateY(\${(1 - captionP) * 18}px)\`,
        }}
      >
        TODO: context label — "every push, every day"
      </div>
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 4: Pattern interrupt
  // Ref fixture: src/smoke/hooks/Hook04PatternInterrupt.tsx
  // ───────────────────────────────────────────────────────────────────────────
  'pattern-interrupt': {
    title: 'Pattern interrupt',
    signaturePrimitive: 'impossible element with wrong physics (backwards counter/progress)',
    ambientRecipe: { density: 40, energy: 1.2, opacity: 0.10 },
    arcFit: ['C', 'A'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace the impossible element with your product's visual.
// Archetype 4: Pattern interrupt. Ref: src/smoke/hooks/Hook04PatternInterrupt.tsx
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// The impossible element: a counter/bar that moves in the WRONG direction.
// Replace IMPOSSIBLE_LABEL with bespoke copy that makes the wrongness legible (Hard Rule 3).
const IMPOSSIBLE_LABEL = "Loaded."; // past-tense impossible state label
const MAX_PCT = 74; // counter descends from this value → 0

export function Hook({
  promise = "TODO: ≤6-word impossibility",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Impossible element: counter descends from MAX_PCT → 0 (wrong direction for a loader).
  const pct = Math.max(
    0,
    Math.round(
      interpolate(frame, [0, MAX_PCT], [MAX_PCT, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      }),
    ),
  );

  // Brief hold (f0–f18) then slide left to emphasize wrongness (beat 1–2).
  const slideX = interpolate(frame, [18, 45], [0, -32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Promise text fades in mid-hook (the "how did that happen?" reveal).
  const promiseOpacity = interpolate(frame, [byFrame - 15, byFrame], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 4 AmbientField recipe: density=40 energy=1.2, elevated — world is "slightly wrong". */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={1.2}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          transform: \`translateX(\${slideX}px)\`,
        }}
      >
        {/* Status label — impossible past-tense at frame 0 */}
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 38,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.65,
          }}
        >
          {IMPOSSIBLE_LABEL}
        </div>

        {/* Large descending counter — the impossible focal element */}
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 190,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            minWidth: 360,
            textAlign: "center",
          }}
        >
          {pct}%
        </div>

        {/* Progress bar: filled portion anchored to RIGHT edge (backwards) */}
        <div
          style={{
            width: 640,
            height: 8,
            background: theme.palette.surface,
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: \`\${pct}%\`,
              background: theme.palette.accent,
              borderRadius: 4,
            }}
          />
        </div>

        {/* Promise copy — the "how did that happen?" punchline */}
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 26,
            letterSpacing: "0.04em",
            opacity: promiseOpacity,
          }}
        >
          {promise}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 5: Number-counting
  // Ref fixture: src/smoke/hooks/Hook05NumberCounting.tsx
  // ───────────────────────────────────────────────────────────────────────────
  'number-counting': {
    title: 'Number-counting',
    signaturePrimitive: 'useCountUp (Easing.in cubic) + Shake + Ripple at peak',
    ambientRecipe: { density: 40, energy: 1, opacity: 0.10 },
    arcFit: ['A', 'E'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace FROM/TO/PEAK_FRAME and context label.
// Archetype 5: Number-counting. Ref: src/smoke/hooks/Hook05NumberCounting.tsx
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Ripple, Shake, useCountUp } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your metric's start, peak, and peak frame (Hard Rule 3).
// Counter starts MID-COUNT at frame 0 — not at zero, not at peak.
const FROM = 4_000;     // non-zero mid-count start visible at frame 0
const TO = 14_000;      // peak value (must be impressively large)
const PEAK_FRAME = 60;  // frame at which counter reaches TO and Shake fires

export function Hook({
  promise = "TODO: ≤4-word context label",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const count = useCountUp({
    from: FROM,
    to: TO,
    at: 0,
    durationInFrames: PEAK_FRAME,
    easing: Easing.in(Easing.cubic),
  });

  // Context label fades in at byFrame (≤4 words per archetype spec).
  const labelOpacity = interpolate(frame, [byFrame - 15, byFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 5 AmbientField recipe: density=40 energy=1, gives depth to large number. */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={1}
      />

      {/* Impact ring expanding from counter center at peak */}
      <Ripple
        at={PEAK_FRAME}
        x={960}
        y={480}
        color={theme.palette.accent}
        maxScale={8}
        durationInFrames={20}
      />

      {/* Shake wraps the counter — activates at peak per archetype spec */}
      <Shake at={PEAK_FRAME} strength={4}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          {/* Large display number — protagonist; tabular-nums prevents jitter */}
          <div
            style={{
              color: theme.palette.accent,
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: 220,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {new Intl.NumberFormat("en-US").format(count)}
          </div>

          {/* Context label — fades in at byFrame; ≤4 words per archetype spec */}
          <div
            style={{
              color: theme.palette.text,
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 44,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              opacity: labelOpacity,
            }}
          >
            {promise}
          </div>
        </AbsoluteFill>
      </Shake>
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 6: Payoff flash-forward
  // Ref fixture: src/smoke/hooks/Hook06PayoffFlashForward.tsx
  // ───────────────────────────────────────────────────────────────────────────
  'payoff-flash-forward': {
    title: 'Payoff flash-forward',
    signaturePrimitive: 'Flash component + hard cut at FLASH_END, AmbientField energy toggles 1↔0.4',
    ambientRecipe: { density: 40, energy: 1, opacity: 0.10 },
    arcFit: ['B', 'D'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace LINES with your product's finished-state output.
// Archetype 6: Payoff flash-forward. Ref: src/smoke/hooks/Hook06PayoffFlashForward.tsx
// CRITICAL: frame 0 shows the END STATE — the only archetype where f0 is the destination.
// No copy during the flash per archetype spec; first text appears after the hard cut.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your product's desirable finished-state (Hard Rule 3).
// All lines are fully visible in the flash state (f0..FLASH_END); they
// typewriter back into existence after the cut to "present state."
const FLASH_END = 12; // hard-cut frame — flash window = f0..f11 (≈0.4s)

export function Hook({
  promise = "TODO: finished-state label",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const isFlash = frame < FLASH_END;

  // AmbientField energy: 1 in flash ("desirable, alive"), 0.4 after cut ("not there yet").
  const ambientEnergy = isFlash ? 1 : 0.4;

  // Terminal lines to show in both flash and cut-back states.
  // Replace with your product's output sequence (Hard Rule 3).
  const lines: { text: string; dur: number }[] = [
    { text: "$ [deploy / build / run]",  dur: 0 },
    { text: "→ [step 1 complete]",        dur: 8 },
    { text: "→ [step 2 complete]",        dur: 8 },
    { text: promise,                      dur: 8 },
  ];

  // Present-state: each line typewriters in after the cut.
  const presentStart = (i: number) => FLASH_END + 1 + i * 16;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 6 AmbientField recipe: energy toggles 1 (flash) ↔ 0.4 (present) */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Top glow spans full width in flash state — gate 4 path A separated cells */}
      {isFlash && (
        <AbsoluteFill
          style={{
            background: \`linear-gradient(to bottom, \${theme.palette.accent}44 0%, transparent 22%)\`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Flash exclamation fires just before the hard cut */}
      <Flash at={10} color={theme.palette.text} peak={0.12} />

      {/* Terminal panel */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            fontFamily: theme.fonts.mono?.family ?? theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 46,
            lineHeight: 1.6,
            background: theme.palette.surface,
            padding: "32px 48px",
            borderRadius: 10,
            minWidth: 620,
          }}
        >
          {lines.map(({ text, dur }, i) => {
            const isLast = i === lines.length - 1;
            if (isFlash) {
              return (
                <div key={i} style={{ color: isLast ? theme.palette.accent : theme.palette.text, whiteSpace: "nowrap" }}>
                  {text}
                </div>
              );
            }
            const start = presentStart(i);
            if (frame < start) return null;
            const chars =
              dur === 0
                ? text.length
                : Math.min(
                    text.length,
                    Math.floor(
                      interpolate(frame - start, [0, dur], [0, text.length], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.inOut(Easing.quad),
                      }),
                    ),
                  );
            return (
              <div key={i} style={{ color: isLast ? theme.palette.accent : theme.palette.text, whiteSpace: "nowrap" }}>
                {text.slice(0, chars)}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 7: Open question / indictment
  // Ref fixture: src/videos/granipa/scenes/Hook.tsx (embedded, archetype 7)
  // ───────────────────────────────────────────────────────────────────────────
  'open-question': {
    title: 'Open question / indictment',
    signaturePrimitive: 'micro-settle f0–f8 (translateY 3→0, opacity 0.85→1) + evidence stamps at 20-frame intervals',
    ambientRecipe: { density: 30, energy: 0.5, opacity: 0.06 },
    arcFit: ['F', 'C'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace QUESTION and EVIDENCE with product-specific copy.
// Archetype 7: Open question / indictment. Ref: src/videos/granipa/scenes/Hook.tsx
// Arc F intentionally withholds positive promise — byFrame gate-6 timing is advisory for arc F.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your product's indictment and evidence labels (Hard Rule 3).
const QUESTION = "what [your tool] does to you:"; // ominous open colon — answer imminent
const EVIDENCE = [
  "TODO: evidence item 1",
  "TODO: evidence item 2",
  "TODO: evidence item 3",
] as const;

// Each evidence item stamps in at this interval after the previous one.
const STAMP_INTERVAL = 20;
const FIRST_STAMP_AT = 38;

export function Hook({
  promise = "TODO: indictment label (arc F: positive deferred)",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Whole-line micro-settle: present from frame 0 (thumbnail law), tiny breath.
  // Gate 1 PASS: delta > 0.1 from this opacity+translate animation.
  const lineIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Each evidence item stamps in with a scale+opacity interpolate.
  const stampIn = (i: number) => {
    const at = FIRST_STAMP_AT + i * STAMP_INTERVAL;
    return interpolate(frame, [at, at + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  };

  // Confirmation label (arc F positive payoff deferred; shown at byFrame for other arcs).
  const confirmOpacity = interpolate(frame, [byFrame, byFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 7 AmbientField recipe: density=30 energy=0.5, dim ominous strips. */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={30}
        energy={0.5}
      />

      {/* Question / indictment — full line from frame 0 (thumbnail law) */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 400,
          width: 1728,
          opacity: 0.85 + 0.15 * lineIn,
          transform: \`translateY(\${3 * (1 - lineIn)}px)\`,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 88,
            color: theme.palette.text,
            lineHeight: 1.1,
          }}
        >
          {QUESTION}
        </div>
      </div>

      {/* Evidence items stamp in sequentially — one per beat */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 640,
          display: "flex",
          gap: 48,
        }}
      >
        {EVIDENCE.map((label, i) => {
          const p = stampIn(i);
          return (
            <div
              key={label}
              style={{
                fontFamily: theme.fonts.body.family,
                fontWeight: theme.fonts.body.weight,
                fontSize: 32,
                color: theme.palette.textDim,
                opacity: 0.2 + 0.8 * p,
                transform: \`scale(\${0.92 + 0.08 * p})\`,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Arc F: positive payoff deferred to kicker scene — shown at byFrame for other arcs */}
      {frame >= byFrame && (
        <div
          style={{
            position: "absolute",
            left: 96,
            bottom: 120,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 30,
            color: theme.palette.accent,
            opacity: confirmOpacity,
          }}
        >
          {promise}
        </div>
      )}
    </AbsoluteFill>
  );
}
`;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Archetype 8: Multi-layer live demo
  // Ref fixture: src/smoke/hooks/Hook08MultiLayerLiveDemo.tsx
  // ───────────────────────────────────────────────────────────────────────────
  'multi-layer-live-demo': {
    title: 'Multi-layer live demo',
    signaturePrimitive: 'three independent panels with offset starts — NO sync between panels',
    ambientRecipe: { density: 50, energy: 1.2, opacity: 0.12 },
    arcFit: ['A', 'E'],

    renderHookScene({ themeVar: _themeVar, timelineVar: _timelineVar }) {
      return `\
// re-derive bespoke per Hard Rule 3 — replace all panel content with product-specific output.
// Archetype 8: Multi-layer live demo. Ref: src/smoke/hooks/Hook08MultiLayerLiveDemo.tsx
// CRITICAL: each panel MUST have an independent timeline (offset starts). Synchronized
// panels read as fake to technical audiences — every agent/stream has its own start frame.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, useCountUp } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Replace with your product's parallel processes (Hard Rule 3).
// Three independent panels: main process (left), metric counter (top-right), status (bottom-right).
const MAIN_LINES: { text: string; startAt: number; dur: number }[] = [
  { text: "$ [command] --[flag]",    startAt: 0,  dur: 0 },
  { text: "[agent 1]: initializing", startAt: 2,  dur: 8 },
  { text: "[agent 2]: initializing", startAt: 12, dur: 8 },
  { text: "[agent 3]: ready.",       startAt: 22, dur: 8 },
  { text: "→ [processing batch…]",   startAt: 35, dur: 8 },
  { text: "✓ [batch complete]",       startAt: 52, dur: 8 },
];

// Counter panel: offset by 3 frames from main panel.
const COUNTER_AT = 3;
const COUNTER_DUR = 57;
const COUNTER_FROM = 8_500;
const COUNTER_TO = 14_000;

// Status items: offset starts — item 3 spawns at f35 (new process joining mid-run).
const STATUS_ITEMS: { label: string; showAt: number; doneAt: number }[] = [
  { label: "AGENT 01", showAt: 0,  doneAt: 28 },
  { label: "AGENT 02", showAt: 0,  doneAt: 46 },
  { label: "AGENT 03", showAt: 35, doneAt: 65 },
];

export function Hook({
  promise = "TODO: parallel-scale metric",
  byFrame = 60,
}: {
  promise?: string;
  byFrame?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Counter panel: independent timeline, starts 3 frames after main terminal.
  const count = useCountUp({
    from: COUNTER_FROM,
    to: COUNTER_TO,
    at: COUNTER_AT,
    durationInFrames: COUNTER_DUR,
    easing: Easing.in(Easing.cubic),
  });

  // Promise label fades in at byFrame — the metric that proves scale.
  const promiseOpacity = interpolate(frame, [byFrame - 8, byFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Archetype 8 AmbientField recipe: density=50 energy=1.2 — elevated, "many things happening". */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={50}
        energy={1.2}
      />

      {/* ── Main process panel (left) — starts at f0, independent timeline ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 160,
          width: 720,
          fontFamily: theme.fonts.mono?.family ?? theme.fonts.body.family,
          fontWeight: theme.fonts.body.weight,
          fontSize: 28,
          lineHeight: 1.8,
          background: theme.palette.surface,
          padding: "28px 40px",
          borderRadius: 10,
        }}
      >
        {MAIN_LINES.map(({ text, startAt, dur }, i) => {
          if (frame < startAt) return null;
          const isLast = i === MAIN_LINES.length - 1;
          const chars =
            dur === 0
              ? text.length
              : Math.min(
                  text.length,
                  Math.floor(
                    interpolate(frame - startAt, [0, dur], [0, text.length], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.inOut(Easing.quad),
                    }),
                  ),
                );
          return (
            <div key={i} style={{ color: isLast ? theme.palette.accent : theme.palette.text, whiteSpace: "nowrap" }}>
              {text.slice(0, chars)}
            </div>
          );
        })}
      </div>

      {/* ── Counter panel (top-right) — starts at f3, independent timeline ── */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 160,
          width: 580,
          background: theme.palette.surface,
          padding: "28px 36px",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            color: theme.palette.textDim,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 18,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          TODO: counter label
        </div>
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 96,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {new Intl.NumberFormat("en-US").format(count)}
        </div>
        {/* Promise label appears at byFrame — the scale proof */}
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 22,
            marginTop: 12,
            opacity: promiseOpacity,
          }}
        >
          {promise}
        </div>
      </div>

      {/* ── Status panel (bottom-right) — independent timeline, item 3 spawns at f35 ── */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 480,
          width: 580,
          background: theme.palette.surface,
          padding: "28px 36px",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            color: theme.palette.textDim,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 18,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          TODO: status panel label
        </div>
        {STATUS_ITEMS.map(({ label, showAt, doneAt }) => {
          if (frame < showAt) return null;
          const isDone = frame >= doneAt;
          const fadeIn = interpolate(frame - showAt, [0, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: fadeIn,
              }}
            >
              <span
                style={{
                  color: theme.palette.text,
                  fontFamily: theme.fonts.mono?.family ?? theme.fonts.body.family,
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  color: isDone ? theme.palette.accent : theme.palette.textDim,
                  fontFamily: theme.fonts.mono?.family ?? theme.fonts.body.family,
                  fontSize: 22,
                  letterSpacing: "0.06em",
                }}
              >
                {isDone ? "DONE" : "RUNNING"}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
`;
    },
  },

};
