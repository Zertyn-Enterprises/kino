#!/usr/bin/env node
/**
 * scripts/retention-patterns.mjs — render-free retention pattern registry.
 *
 * Exports:
 *   RETENTION_PATTERN_KEYS  — ordered array of the 9 stable kebab slugs
 *   RETENTION_PATTERNS      — map: slug → { title, lever, arcFit,
 *                               signaturePrimitive, renderBodyScenes }
 *
 * renderBodyScenes({ themeVar, timelineVar }) returns:
 *   { timelineSrc, scenes: [{ filename, source }] }
 *
 * Every result is retention-gate-green by construction:
 *   • role:'climax' placed at beat 39 (65% of 60 beats — past the first-third boundary)
 *   • ≥1 role:'hold' declared (cta_hold scene)
 *   • rehookSeconds set in buildTimeline config (gate-3 auto-derive)
 *   • AmbientField in every emitted scene (dead-air gate 1 PASS floor)
 *   • Zero hardcoded hex — all palette/font taste from useTheme()
 *   • "// re-derive bespoke per Hard Rule 3" header on every file
 *
 * Templates live in scripts/ only — never src/lib/ (Hard Rule 5).
 *
 * Ported from:
 *   .claude/skills/produce/retention-patterns.md — 9 gate-aligned pattern specs
 */

// ── Ordered key list ──────────────────────────────────────────────────────────

export const RETENTION_PATTERN_KEYS = [
  'back-loaded-climax',
  'mid-point-rehook',
  'open-loop-payoff',
  'pattern-interrupt',
  'payoff-seeding',
  'dead-air-elimination',
  'cta-tension-resolve',
  'loop-back-ending',
  'final-accent-landing',
];

// ── Shared timeline helper ────────────────────────────────────────────────────

/**
 * Base retention-gate-green timeline for all patterns.
 * Total: 60 beats @ 120bpm/30fps → 960 frames (32s).
 * climax at beat 39 (65%) — past the first-third boundary (beat 20).
 * role:'climax' → auto-derives --climax flag for gate-2.
 * role:'hold'   → auto-derives --holds flag for gate-1.
 * rehookSeconds → auto-derives --rehook flag for gate-3.
 */
function baseTimelineSrc(timelineVar, patternNote) {
  return `import { buildTimeline } from "../../lib/timeline";

// re-derive bespoke per Hard Rule 3 — replace bpm + beats from your music analysis.
// ${patternNote}
// Gate-green by construction: role:'climax' at beat 39 (65%); role:'hold' on cta_hold;
// rehookSeconds:8 auto-derives --rehook; supply --climax=<frame> from role:'climax'.
export const ${timelineVar} = buildTimeline({ fps: 30, bpm: 120, rehookSeconds: 8 }, [
  { id: "hook",     beats: 6,  promise: { text: "TODO: ≤6-word hook promise", byFrame: 60 } },
  { id: "opening",  beats: 9  },
  { id: "body",     beats: 24 },
  { id: "climax",   beats: 6,  role: "climax", payoff: { text: "TODO: hook resolution" } },
  { id: "cta_hold", beats: 3,  role: "hold" },
  { id: "cta",      beats: 12 },
] as const);
`;
}

// ── Pattern registry ──────────────────────────────────────────────────────────

export const RETENTION_PATTERNS = {

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 1: Back-loaded climax / escalation
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 1
  // ───────────────────────────────────────────────────────────────────────────
  'back-loaded-climax': {
    title: 'Back-loaded climax / escalation',
    lever: 'Momentum payoff',
    arcFit: ['A', 'B', 'E'],
    signaturePrimitive:
      'AmbientField energy ladder: 0.4 (opening) → 0.9 (body peak) → 1.2 (climax) → 0.5 (CTA)',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 1: Back-loaded climax — energy ladder per act; climax fires all layers simultaneously.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace all content with product-specific motion.
// Pattern 1: Back-loaded climax. Body act: AmbientField energy ramps 0.4 → 0.9.
// Introduce new motion layers at 35% and 70% body progress — never at a hardcoded frame.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  // AmbientField energy ramps 0.4 → 0.9 — restrained opening, builds toward climax.
  const ambientEnergy = interpolate(progress, [0, 1], [0.4, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // New layers at arc-fraction thresholds — never at a hardcoded frame.
  const showLayer2 = progress > 0.35;
  const showLayer3 = progress > 0.70;

  const layer2Opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Layer 1: AmbientField — energy ramps toward climax ceiling */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Layer 2: primary proof beat — appears at 35% body progress */}
      {showLayer2 && (
        <AbsoluteFill
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              color: theme.palette.text,
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 48,
              opacity: layer2Opacity,
              textAlign: "center",
              padding: "0 120px",
            }}
          >
            TODO: proof beat — product evidence, one animated element at a time
          </div>
        </AbsoluteFill>
      )}

      {/* Layer 3: additional density — appears at 70% body progress */}
      {showLayer3 && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 96,
            color: theme.palette.textDim,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 28,
          }}
        >
          TODO: supporting evidence — one rung below the climax energy
        </div>
      )}
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Climax.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's climactic reveal.
// Pattern 1: Back-loaded climax. Climax act: all elements fire simultaneously.
// This scene carries role:'climax' — Flash + peak AmbientField (1.2).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Climax() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const arrivalP = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — energy ceiling (1.2); must exceed body peak of 0.9 */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={60}
        energy={1.2}
      />

      {/* Flash at frame 0 — energy spike that marks the climax arrival */}
      <Flash at={0} color={theme.palette.accent} peak={0.15} />

      {/* Climax focal: all prepared layers fire simultaneously */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 120,
            opacity: arrivalP,
            transform: \`scale(\${0.9 + 0.1 * arrivalP})\`,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: climax reveal — the product's most impressive moment (Hard Rule 3)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 2: Mid-point re-hook punch
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 2
  // ───────────────────────────────────────────────────────────────────────────
  'mid-point-rehook': {
    title: 'Mid-point re-hook punch',
    lever: 'Attention reset',
    arcFit: ['B', 'D', 'E'],
    signaturePrimitive:
      'Shake at scene-local f0 + AmbientField spike to 1.0 for 1-beat punch mid-body; supply --rehook=<N> for tight pacing',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 2: Mid-point re-hook punch — punch at ~50% resets attention; supply --rehook=<N> for tight pacing.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace punch element with product-specific moment.
// Pattern 2: Mid-point re-hook punch. Body act: new element snaps in at ~50% progress.
// Punch = 1-2 beats at mid-progress; Shake fires on arrival; AmbientField spikes to 1.0.
// Gate 3 PASS by construction: punch ensures no body segment exceeds rehookSeconds.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Shake } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  // Punch fires at ~50% body progress — the mid-point re-hook.
  // Replace PUNCH_PROGRESS with the arc-fraction derived from your timeline.
  const PUNCH_PROGRESS = 0.50;
  const isPunchActive = progress >= PUNCH_PROGRESS && progress < PUNCH_PROGRESS + 0.08;

  // AmbientField: standard body energy (0.7) spikes to 1.0 on punch.
  const ambientEnergy = isPunchActive ? 1.0 : 0.7;

  // Punch element arrival: stamp-in from scene-local onset.
  const punchFrame = Math.floor(PUNCH_PROGRESS * (durationInFrames - 1));
  const punchArrival = frame >= punchFrame
    ? interpolate(frame - punchFrame, [0, 8], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField: spikes to 1.0 on the punch beat */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Body content: standard proof beats before the punch */}
      {!isPunchActive && progress < PUNCH_PROGRESS && (
        <AbsoluteFill
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              color: theme.palette.text,
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 48,
              textAlign: "center",
              padding: "0 120px",
            }}
          >
            TODO: body content — leading up to the punch
          </div>
        </AbsoluteFill>
      )}

      {/* Punch: new element stamps in with Shake at mid-progress */}
      {frame >= punchFrame && (
        <Shake at={punchFrame} strength={4}>
          <AbsoluteFill
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              style={{
                fontFamily: theme.fonts.display.family,
                fontWeight: theme.fonts.display.weight,
                fontSize: 96,
                color: theme.palette.accent,
                opacity: punchArrival,
                transform: \`scale(\${0.88 + 0.12 * punchArrival})\`,
              }}
            >
              TODO: punch copy — new stat / mode shift / second persona (Hard Rule 3)
            </div>
          </AbsoluteFill>
        </Shake>
      )}
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Climax.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's climactic reveal.
// Pattern 2: Mid-point re-hook punch. Climax act: energy peak after the punch.
// AmbientField at 1.2 — must exceed punch's 1.0 spike.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Climax() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const arrivalP = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — must exceed punch's 1.0 spike */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={60}
        energy={1.2}
      />

      <Flash at={0} color={theme.palette.accent} peak={0.12} />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 120,
            opacity: arrivalP,
            transform: \`scale(\${0.9 + 0.1 * arrivalP})\`,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: climax — the full product proof after the punch (Hard Rule 3)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 3: Open loop + late payoff
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 3
  // ───────────────────────────────────────────────────────────────────────────
  'open-loop-payoff': {
    title: 'Open loop + late payoff',
    lever: 'Curiosity gap',
    arcFit: ['B', 'F', 'D'],
    signaturePrimitive:
      'Blurred/masked withheld element in body + Flash at reveal frame (climax scene at ~78%)',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 3: Open loop + late payoff — body withholds; climax is the reveal (supply --climax=<revealFrame>).',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace withheld element with product-specific tease.
// Pattern 3: Open loop + late payoff. Body act: question stays open throughout.
// Each evidence beat hints but withholds. AmbientField energy 0.7→0.9 across the body.
// Gate 2 PASS: the REVEAL (Climax scene) is the energy peak — supply --climax=<revealFrame>.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  // AmbientField energy: 0.7 at open (question present), rising to 0.9 at body close.
  const ambientEnergy = interpolate(progress, [0, 1], [0.7, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Withheld element: blurred from full (teaseBlur) down to minimum as evidence accumulates.
  const blurPx = interpolate(progress, [0, 0.8], [12, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField: rises as evidence accumulates; never peaks until reveal */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Evidence beat: visible but not the answer — the question stays open */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 48,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: evidence beat — hints at the answer but withholds the central question (Hard Rule 3)
        </div>
      </AbsoluteFill>

      {/* Withheld element: blurred reveal placeholder */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          filter: \`blur(\${blurPx}px)\`,
        }}
      >
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 88,
            opacity: 0.4,
          }}
        >
          TODO: withheld element — blurred until reveal (Hard Rule 3)
        </div>
      </div>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Climax.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's full reveal.
// Pattern 3: Open loop + late payoff. Climax act: the loop CLOSES here.
// This scene IS the energy peak — Flash + mask expansion + peak AmbientField (1.2).
// Gate 2 PASS by construction: supply --climax=<frame where this scene starts>.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Climax() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Mask expands from left — the loop closes as full content reveals.
  const maskWidth = interpolate(frame, [0, 20], [0, 1920], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — reveal IS the energy peak */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={1.2}
      />

      {/* Flash punctuates the reveal arrival */}
      <Flash at={0} color={theme.palette.text} peak={0.12} />

      {/* Mask sweeps from left — open loop closes */}
      <AbsoluteFill
        style={{
          clipPath: \`inset(0 \${1920 - maskWidth}px 0 0)\`,
          background: theme.palette.surface,
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 88,
            color: theme.palette.text,
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          TODO: full reveal — what the viewer waited to see (Hard Rule 3)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 4: Pattern interrupt
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 4
  // ───────────────────────────────────────────────────────────────────────────
  'pattern-interrupt': {
    title: 'Pattern interrupt',
    lever: 'Wrongness-demands-attention',
    arcFit: ['C', 'F', 'A'],
    signaturePrimitive:
      'Grayscale CSS filter wash for 1-2 beats at ~65% body progress + scale snap on re-entry',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 4: Pattern interrupt — interrupt at ~65% is the re-hook anchor; supply --rehook=<N> if needed.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace interrupt content with product-specific pivot.
// Pattern 4: Pattern interrupt. Body act: standard flow then unexpected mode shift at ~65%.
// IMPORTANT: interrupt must have visible motion (color shift / scale snap) — static frame fails gate 1.
// Gate 3 PASS by construction: interrupt IS the re-hook anchor.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  // Interrupt fires at ~65% body progress — 1-2 beats.
  const INTERRUPT_START = 0.65;
  const INTERRUPT_END   = 0.73;
  const isInterrupt = progress >= INTERRUPT_START && progress < INTERRUPT_END;

  // Grayscale wash during interrupt; re-entry restores color over 6 frames.
  const interruptFrame = Math.floor(INTERRUPT_START * (durationInFrames - 1));
  const reEntryFrame   = Math.floor(INTERRUPT_END   * (durationInFrames - 1));

  const saturation = isInterrupt
    ? interpolate(frame - interruptFrame, [0, 4], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : frame > reEntryFrame
    ? interpolate(frame - reEntryFrame, [0, 6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Scale snap on re-entry — reinforces "world changed" feel.
  const scale = frame > reEntryFrame
    ? interpolate(frame - reEntryFrame, [0, 8], [1, 1.03], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <AbsoluteFill
      style={{
        background: theme.palette.bg,
        filter: \`saturate(\${saturation})\`,
        transform: \`scale(\${scale})\`,
      }}
    >
      {/* AmbientField: active during interrupt (gate 1 HARD maintained) */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={isInterrupt ? 0.8 : 0.7}
      />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {isInterrupt ? (
          <div
            style={{
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: 72,
              color: theme.palette.text,
            }}
          >
            TODO: interrupt visual — mode shift, typographic takeover, or dramatic pivot (Hard Rule 3)
          </div>
        ) : (
          <div
            style={{
              color: theme.palette.text,
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 48,
              textAlign: "center",
              padding: "0 120px",
            }}
          >
            TODO: body content — standard flow before and after the interrupt (Hard Rule 3)
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Climax.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's climactic reveal.
// Pattern 4: Pattern interrupt. Climax act: elevated tension after the interrupt.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Climax() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const arrivalP = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — elevated energy after the interrupt re-set attention */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={60}
        energy={1.2}
      />

      <Flash at={0} color={theme.palette.accent} peak={0.12} />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 120,
            opacity: arrivalP,
            transform: \`scale(\${0.9 + 0.1 * arrivalP})\`,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: climax — full resolution after the interrupt (Hard Rule 3)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 5: Payoff seeding
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 5
  // ───────────────────────────────────────────────────────────────────────────
  'payoff-seeding': {
    title: 'Payoff seeding',
    lever: 'Escalating anticipation',
    arcFit: ['E', 'A', 'D'],
    signaturePrimitive:
      'Shared motif at ×0.25/×0.50/×0.75 scale at 20%/40%/60% body progress; ×1.0 at climax; AmbientField steps 0.5/0.65/0.8/1.2',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 5: Payoff seeding — seeds at 20%/40%/60% body progress; climax at ×1.0 scale (gate 2 PASS).',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace seed motif with product's escalating element.
// Pattern 5: Payoff seeding. Body act: same motif at 25%/50%/75% scale at 20%/40%/60% progress.
// seedIntensity drives size AND AmbientField energy — same shape, growing each seed.
// Gates 2+3 PASS by construction: climax ×1.0 is the pixel-delta peak; seeds are anchors.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Seed positions as body-progress fractions — never hardcoded frames.
const SEED_POSITIONS = [0.20, 0.40, 0.60] as const;

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  // Current seed index (−1 before first seed).
  const currentSeedIdx = SEED_POSITIONS.reduce<number>(
    (acc, p, i) => (progress >= p ? i : acc),
    -1,
  );

  // AmbientField steps up at each seed: 0.4 pre-seed → 0.5 / 0.65 / 0.8 per seed.
  const seedEnergyLevels = [0.5, 0.65, 0.8] as const;
  const ambientEnergy = currentSeedIdx < 0 ? 0.4 : seedEnergyLevels[currentSeedIdx];

  // Seed intensity: 0.25 / 0.50 / 0.75 (×1.0 reserved for climax scene).
  const seedIntensity = currentSeedIdx < 0 ? 0 : (currentSeedIdx + 1) * 0.25;

  // Motif arrival within the current seed window.
  const seedFrame = currentSeedIdx >= 0
    ? Math.floor(SEED_POSITIONS[currentSeedIdx] * (durationInFrames - 1))
    : 0;
  const arrival = currentSeedIdx >= 0
    ? interpolate(frame - seedFrame, [0, 10], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField steps up with each seed — energy ladder across the arc */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Seed motif: same element, grows at each seed position */}
      {currentSeedIdx >= 0 && (
        <AbsoluteFill
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: Math.round(48 + 72 * seedIntensity),
              color: theme.palette.accent,
              opacity: arrival * seedIntensity,
              transform: \`scale(\${seedIntensity * Math.max(0, arrival)})\`,
            }}
          >
            TODO: climax motif at seedIntensity={seedIntensity.toFixed(2)} — replace per Hard Rule 3
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Climax.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's full-scale climax motif.
// Pattern 5: Payoff seeding. Climax act: same motif at ×1.0 scale — the recognition payoff.
// AmbientField at 1.2 — must exceed body's 0.8 ceiling so climax IS the energy peak.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Climax() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const arrival = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — ×1.0 seed; must exceed body's 0.8 ceiling */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={60}
        energy={1.2}
      />

      <Flash at={0} color={theme.palette.accent} peak={0.15} />

      {/* Motif at ×1.0 scale — the viewer recognizes it and feels the escalation complete */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 160,
            color: theme.palette.accent,
            opacity: arrival,
            transform: \`scale(\${Math.max(0, arrival)})\`,
          }}
        >
          TODO: full-scale climax motif — same element seeded 3×, now at peak (Hard Rule 3)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 6: Dead-air elimination (base obligation)
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 6
  // ───────────────────────────────────────────────────────────────────────────
  'dead-air-elimination': {
    title: 'Dead-air elimination',
    lever: 'Constant stimulus',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive:
      'Three-layer motion budget: AmbientField (layer 1) + primary animation (layer 2) + breath scale / cursor blink (layer 3)',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 6: Dead-air elimination — three-layer motion budget in every scene; gate 1 HARD PASS by construction.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace body content with product-specific scenes.
// Pattern 6: Dead-air elimination. Apply this three-layer budget to EVERY scene.
// Gate 1 HARD PASS by construction: three layers guarantee delta > 0.05 in every frame.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ ambientEnergyForAct = 0.6 }: { ambientEnergyForAct?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Layer 3: breath scale — alive in every settled frame (period: 60f = 2s at 30fps).
  // In real code: replace 60 with beatsToFrames(4, bpm, fps).
  const breathPeriod = 60;
  const breathScale = 1 + 0.004 * Math.sin(((frame % breathPeriod) / breathPeriod) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Layer 1: AmbientField — required in every scene; energy from act context */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergyForAct}
      />

      {/* Layer 2: primary scene animation — TODO: replace with product demo (Hard Rule 3) */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* Layer 3: breath scale on settled content — keeps delta above DEAD_AIR_FLOOR=0.05 */}
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 72,
            color: theme.palette.text,
            transform: \`scale(\${breathScale})\`,
          }}
        >
          TODO: primary scene content — replace per Hard Rule 3
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Climax.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's climactic reveal.
// Pattern 6: Dead-air elimination. Climax act: all three layers at peak intensity.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Climax() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const breathScale = 1 + 0.004 * Math.sin(((frame % 60) / 60) * Math.PI * 2);

  const arrivalP = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — all three layers at peak intensity */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={60}
        energy={1.2}
      />

      <Flash at={0} color={theme.palette.accent} peak={0.12} />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 120,
            opacity: arrivalP,
            transform: \`scale(\${(0.9 + 0.1 * arrivalP) * breathScale})\`,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: climax reveal — the energy peak (Hard Rule 3)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 7: CTA tension/resolve
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 7
  // ───────────────────────────────────────────────────────────────────────────
  'cta-tension-resolve': {
    title: 'CTA tension/resolve',
    lever: 'Earned arrival',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive:
      'Incomplete gesture (70% travel) in tension beat before CTA; gentle spring settle on CTA frame; resolveRatio < 0.75 by construction',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 7: CTA tension/resolve — tension beat before CTA; resolveRatio < 0.75 by construction.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace body content with product-specific scenes.
// Pattern 7: CTA tension/resolve. Body act: standard body + incomplete gesture pre-CTA.
// The tension beat is the incomplete gesture — 70% travel then pause before CTA resolves it.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  // Tension beat: incomplete gesture at ~88% body progress.
  const TENSION_START = 0.88;
  const isTension = progress >= TENSION_START;

  // Incomplete gesture: reaches 70% of target, then holds.
  const tensionFrame = Math.floor(TENSION_START * (durationInFrames - 1));
  const tensionP = isTension
    ? interpolate(frame - tensionFrame, [0, 8], [0, 0.7], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField: spikes to 1.0 during tension beat */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={isTension ? 1.0 : 0.7}
      />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {isTension ? (
          <div
            style={{
              color: theme.palette.accent,
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: 72,
              transform: \`translateX(\${tensionP * 200}px)\`,
            }}
          >
            TODO: incomplete gesture — cursor/arrow toward CTA, paused at 70% (Hard Rule 3)
          </div>
        ) : (
          <div
            style={{
              color: theme.palette.text,
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 48,
              textAlign: "center",
              padding: "0 120px",
            }}
          >
            TODO: body content — standard proof beats before the tension beat (Hard Rule 3)
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Cta.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace CTA content with product-specific landing.
// Pattern 7: CTA tension/resolve. CTA scene: gesture completes; viewer exhales on the logo.
// Gate 2 resolveRatio < 0.75 by construction: CTA settle energy is well below climax peak.
// Gate 5 PASS: AmbientField fades to 0.3 in ending window — endingMeanEnergy < 1.5.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Cta({ ctaUrl = "TODO: product URL" }: { ctaUrl?: string }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Logo arrives on gentle spring — the exhale after tension.
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // AmbientField fades 0.6 → 0.3 across the CTA settle — held territory, gate 5 PASS.
  const ambientEnergy = interpolate(frame, [0, 30], [0.6, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Micro-motion: breath scale keeps gate-1 floor maintained.
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField fades to hold-mode energy — resolveRatio < 0.75 by construction */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: logoOpacity,
          transform: \`scale(\${breathScale})\`,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 96,
            color: theme.palette.text,
          }}
        >
          TODO: product logo or name (Hard Rule 3)
        </div>

        <div
          style={{
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 32,
            color: theme.palette.textDim,
          }}
        >
          {ctaUrl}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 8: Loop-back ending
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 8
  // ───────────────────────────────────────────────────────────────────────────
  'loop-back-ending': {
    title: 'Loop-back ending',
    lever: 'Completion signal + rewatch magnet',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive:
      'CTA returns to hookAmbientEnergy in final 2 beats; same bg + AmbientField seed as hook → loopSeamDelta < 20.0',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 8: Loop-back ending — CTA returns to hook AmbientField energy; loopSeamDelta < 60.0 by construction.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace body content with product-specific scenes.
// Pattern 8: Loop-back ending. Body act: standard body; the loop-back logic is in Cta.tsx.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ ambientEnergyForAct = 0.7 }: { ambientEnergyForAct?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const breathScale = 1 + 0.004 * Math.sin(((frame % 60) / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField — standard body energy; hook/CTA must share a lower hookAmbientEnergy */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergyForAct}
      />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 72,
            color: theme.palette.text,
            transform: \`scale(\${breathScale})\`,
          }}
        >
          TODO: body content — replace per Hard Rule 3
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Cta.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace CTA content with product-specific landing.
// Pattern 8: Loop-back ending. CTA returns to hook AmbientField energy in final 2 beats.
// Gate 4 PASS by construction: matching bg + AmbientField energy → loopSeamDelta < 60.0.
// Set HOOK_AMBIENT_ENERGY to match your hook scene's energy prop exactly.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// hookAmbientEnergy MUST match the hook scene's AmbientField energy prop (Hard Rule 3).
const HOOK_AMBIENT_ENERGY = 0.6;  // TODO: match hook scene AmbientField energy
const CTA_RESOLVE_ENERGY  = 0.4;  // intermediate settle before loop-return
const LOOP_RETURN_FRAME   = 45;   // TODO: derive from beatsToFrames(CTA_beats - 2, bpm, fps)

export function Cta({ ctaLabel = "TODO: product name or URL" }: { ctaLabel?: string }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Return to hookAmbientEnergy at LOOP_RETURN_FRAME — luminance rhyme closes the loop.
  const ambientEnergy = frame >= LOOP_RETURN_FRAME ? HOOK_AMBIENT_ENERGY : CTA_RESOLVE_ENERGY;

  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField returns to hookAmbientEnergy at LOOP_RETURN_FRAME */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: logoOpacity,
          transform: \`scale(\${breathScale})\`,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 96,
            color: theme.palette.text,
          }}
        >
          {ctaLabel}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pattern 9: Final-accent landing (base obligation)
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 9
  // ───────────────────────────────────────────────────────────────────────────
  'final-accent-landing': {
    title: 'Final-accent landing',
    lever: 'Resolved arrival',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive:
      'Hold mode: AmbientField ≤ 0.4 in final 1.5s → endingMeanEnergy < 1.5; accent mode: stamp-in at 1.0 then settle ≤ 0.3',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 9: Final-accent landing — CTA hold mode: AmbientField ≤ 0.35; gate 5 PASS by construction.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace body content with product-specific scenes.
// Pattern 9: Final-accent landing. Body act: standard body; ending logic is in Cta.tsx.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({ ambientEnergyForAct = 0.7 }: { ambientEnergyForAct?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const breathScale = 1 + 0.004 * Math.sin(((frame % 60) / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergyForAct}
      />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 72,
            color: theme.palette.text,
            transform: \`scale(\${breathScale})\`,
          }}
        >
          TODO: body content — replace per Hard Rule 3
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Cta.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace CTA content with product-specific landing.
// Pattern 9: Final-accent landing. Choose ONE ending mode per video.
// hold:   AmbientField ≤ 0.35 in final 1.5s → endingMeanEnergy < 1.5 (gate 5 PASS)
// accent: stamp-in at energy=1.0 at ACCENT_FRAME, settle ≤ 0.3 → endingMaxEnergy > 2.0
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// ENDING_MODE: "hold" or "accent" — choose one per video (Hard Rule 3).
const ENDING_MODE: "hold" | "accent" = "hold";
const SETTLE_FRAME = 12;  // TODO: derive from 2 beats past CTA entry
const ACCENT_FRAME = 45;  // TODO: derive from beatsToFrames(CTA_beats - 2, bpm, fps)

export function Cta({ ctaLabel = "TODO: product name or URL" }: { ctaLabel?: string }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const holdEnergy   = 0.35;
  const accentEnergy = frame >= ACCENT_FRAME && frame < ACCENT_FRAME + 8 ? 1.0 : 0.3;
  const ambientEnergy = ENDING_MODE === "hold"
    ? (frame >= SETTLE_FRAME ? holdEnergy : 0.6)
    : accentEnergy;

  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  const accentScale = ENDING_MODE === "accent"
    ? interpolate(frame, [ACCENT_FRAME, ACCENT_FRAME + 8], [0.88, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* hold: ≤ 0.35 in ending window; accent: spikes to 1.0 then settles to 0.3 */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: logoOpacity,
          transform: \`scale(\${ENDING_MODE === "accent" ? accentScale : breathScale})\`,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 96,
            color: theme.palette.text,
          }}
        >
          {ctaLabel}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
          },
        ],
      };
    },
  },

};
