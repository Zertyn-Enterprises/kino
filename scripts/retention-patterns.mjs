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
 *   • role:'climax' placed at ≥65% of total beats (past the first-third boundary)
 *   • ≥1 role:'hold' declared (CTA settle scene)
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
 * Total: 60 beats @ 120bpm = 60s × (120/60) × (30fps/fps) → 960 frames @ 30fps.
 * climax starts at beat 39 (65% position) — past the first-third boundary (beat 20).
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
  { id: "climax",   beats: 6,  role: "climax" },
  { id: "cta_hold", beats: 3,  role: "hold" },
  { id: "cta",      beats: 12, payoff: { text: "TODO: payoff resolution" } },
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

  // AmbientField energy ramps across the body act — deliberately restrained opening.
  const ambientEnergy = interpolate(progress, [0, 1], [0.4, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // New layers enter at arc-fraction thresholds — do not promote to hardcoded frames.
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

      {/* Layer 3: additional density label — appears at 70% body progress */}
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
          TODO: supporting evidence — step one rung below the climax energy
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
// This scene carries role:'climax' in timeline.ts — Flash + peak AmbientField (1.2).
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

      {/* Flash at frame 0 — the energy spike that marks the climax arrival */}
      <Flash at={0} color={theme.palette.accent} peak={0.15} />

      {/* Climax focal: all prepared layers fire simultaneously at arrivalP */}
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
      'Hard cut to new visual mode at ~50% arc; Shake on new element; AmbientField spikes to 1.0',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 2: Mid-point re-hook punch — punch at 50% resets attention; supply --rehook=<N> for tight pacing.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace punch element with product-specific content.
// Pattern 2: Mid-point re-hook punch. Body act: new element snaps in at ~50% progress.
// Punch = 1-2 beats; Shake fires on arrival; AmbientField spikes to 1.0.
// Supply --rehook=<N> in timeline.ts if your arc has tighter pacing than 8s default.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Shake } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Punch frame: ~50% of body act. Replace with beatsToFrames-derived value (Hard Rule 3).
const PUNCH_AT = 360; // TODO: replace with timeline-derived mid-body frame

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const isPunchWindow = frame >= PUNCH_AT && frame < PUNCH_AT + 18;
  const ambientEnergy = isPunchWindow ? 1.0 : 0.7;

  const punchArrival = interpolate(frame, [PUNCH_AT, PUNCH_AT + 8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const punchOpacity = frame >= PUNCH_AT ? punchArrival : 0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField spikes to 1.0 during punch window */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Pre-punch body content: standard proof beat */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 44,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: body proof content — product evidence leading to the punch
        </div>
      </AbsoluteFill>

      {/* Mid-point punch: new element snaps in with Shake at PUNCH_AT */}
      <Shake at={PUNCH_AT} strength={4}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: \`translate(-50%, -50%) scale(\${0.85 + 0.15 * punchOpacity})\`,
            opacity: punchOpacity,
            color: theme.palette.accent,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 80,
            textAlign: "center",
          }}
        >
          TODO: punch element — new stat, new persona, or visual mode shift (Hard Rule 3)
        </div>
      </Shake>
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
      'Blurred/partial reveal in opening; Flash + mask expansion at REVEAL_FRAME (~78%)',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 3: Open loop + late payoff — reveal at ~78% is the energy peak; supply --climax=<REVEAL_FRAME>.',
        ),
        scenes: [
          {
            filename: 'Opening.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's withheld element.
// Pattern 3: Open loop + late payoff. Opening: partial/blurred reveal creates curiosity gap.
// The withheld element must be legible as DESIRABLE in 1s without full context.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Opening() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Blur fades slightly over the opening but never fully resolves — loop stays open.
  const blurAmount = interpolate(frame, [0, 60], [12, 8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Micro-settle: present from frame 0 (thumbnail law), tiny breath.
  const settleP = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={30}
        energy={0.7}
      />

      {/* Withheld element: blurred/cropped; never resolves in this scene */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 96,
            filter: \`blur(\${blurAmount}px)\`,
            opacity: 0.85 + 0.15 * settleP,
            transform: \`translateY(\${3 * (1 - settleP)}px)\`,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: withheld element — the desirable outcome, deliberately obscured
        </div>
      </AbsoluteFill>

      {/* Loop-open question: teaser copy that names the gap */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 96,
          color: theme.palette.textDim,
          fontFamily: theme.fonts.body.family,
          fontWeight: theme.fonts.body.weight,
          fontSize: 32,
          opacity: settleP,
        }}
      >
        TODO: tease copy — "what if [desirable outcome] were instant?"
      </div>
    </AbsoluteFill>
  );
}
`,
          },
          {
            filename: 'Reveal.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace with your product's full reveal.
// Pattern 3: Open loop + late payoff. Climax: loop closes here — Flash + mask expansion.
// This scene corresponds to role:'climax' in timeline.ts. Supply --climax=<frame> when running gates.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Reveal() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Mask expands from left: full reveal by frame 20.
  const maskWidth = interpolate(frame, [0, 20], [0, 1920], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contentOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Peak AmbientField — reveal IS the energy peak; exceeds body energy */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={50}
        energy={1.2}
      />

      {/* Flash at frame 0 marks the loop closure */}
      <Flash at={0} color={theme.palette.accent} peak={0.15} />

      {/* Expanding mask reveals the withheld element */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: maskWidth, height: 1080, overflow: "hidden" }}>
          <AbsoluteFill
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              style={{
                color: theme.palette.accent,
                fontFamily: theme.fonts.display.family,
                fontWeight: theme.fonts.display.weight,
                fontSize: 96,
                opacity: contentOpacity,
                textAlign: "center",
                padding: "0 120px",
                width: 1920,
              }}
            >
              TODO: full reveal — the withheld element, unobscured (Hard Rule 3)
            </div>
          </AbsoluteFill>
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
      'Grayscale wash + scale snap at ~65% arc; re-entry via theme.spring.snappy',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 4: Pattern interrupt — deliberate mode switch at ~65%; re-hook anchor for gate-3.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace interrupt motivation with product-specific copy.
// Pattern 4: Pattern interrupt. Body act: grayscale wash then re-entry at ~65% progress.
// The interrupt MUST have visible motion (color shift + scale) — a blank frame fails gate-1.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Interrupt frame: ~65% of body act. Replace with timeline-derived constant (Hard Rule 3).
const INTERRUPT_AT = 468; // TODO: replace with beatsToFrames-derived value
const INTERRUPT_DUR = 18; // 2 beats at 120bpm @ 30fps = 18 frames
const RE_ENTRY_AT = INTERRUPT_AT + INTERRUPT_DUR;

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Void to suppress unused-var lint on durationInFrames when scene does not use it.
  void durationInFrames;

  const isInterrupt = frame >= INTERRUPT_AT && frame < RE_ENTRY_AT;

  // Grayscale during interrupt — CSS filter applied on wrapper.
  const colorSat = isInterrupt
    ? interpolate(frame, [INTERRUPT_AT, INTERRUPT_AT + 4], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : interpolate(frame, [RE_ENTRY_AT, RE_ENTRY_AT + 6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // Re-entry scale snap: brief overshoot then settle.
  const reEntryScale = frame >= RE_ENTRY_AT
    ? interpolate(frame, [RE_ENTRY_AT, RE_ENTRY_AT + 8], [1.04, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  // AmbientField: reduced during interrupt (unsettled), elevated after.
  const ambientEnergy = isInterrupt ? 0.5 : frame >= RE_ENTRY_AT ? 0.9 : 0.7;

  return (
    <AbsoluteFill
      style={{
        background: theme.palette.bg,
        filter: \`saturate(\${colorSat})\`,
        transform: \`scale(\${reEntryScale})\`,
      }}
    >
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: isInterrupt ? theme.palette.textDim : theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 48,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          {isInterrupt
            ? "TODO: interrupt copy — the unexpected, visually motivated mode shift"
            : "TODO: body content — standard proof flow before and after interrupt"}
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
      'Shared ClimaticMotif at 0.25/0.50/0.75/1.0 scale at 20/40/60/80% arc fractions',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 5: Payoff seeding — 4 seeds at 20/40/60/80% positions; climax delivers motif at full scale.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace MOTIF_LABEL and seed positions with product-specific values.
// Pattern 5: Payoff seeding. Body act: shared motif at 0.25/0.50/0.75/1.0 scale per seed index.
// Seeds provide gate-3 anchors every ~6–8s in a 30s video.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Seed positions in frames — replace with timeline.beatsToFrames-derived values (Hard Rule 3).
// These represent 20%, 40%, 60%, 80% of total arc length.
const SEED_FRAMES = [144, 288, 432, 576] as const; // TODO: derive from beatsToFrames
const SEED_INTENSITIES = [0.25, 0.50, 0.75, 1.0] as const;

// AmbientField energy steps up at each seed.
const SEED_ENERGIES = [0.5, 0.65, 0.8, 1.2] as const;

export function Body({ durationInFrames = 720 }: { durationInFrames?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  void durationInFrames;

  // Current seed index: last seed whose frame we have passed.
  const currentSeedIdx = SEED_FRAMES.reduce(
    (acc: number, f: number, i: number) => (frame >= f ? i : acc),
    -1,
  );
  const ambientEnergy = currentSeedIdx < 0 ? 0.4 : SEED_ENERGIES[currentSeedIdx] ?? 0.4;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={ambientEnergy}
      />

      {/* Render each seed motif that has arrived */}
      {SEED_FRAMES.map((seedFrame, i) => {
        if (frame < seedFrame) return null;
        const intensity = SEED_INTENSITIES[i] ?? 0.25;
        const arrivalP = interpolate(frame, [seedFrame, seedFrame + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: \`translate(-50%, -50%) scale(\${intensity * Math.max(0, arrivalP)})\`,
              opacity: Math.max(0, arrivalP),
              color: theme.palette.accent,
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: 160,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            TODO: ClimaticMotif — same visual at reduced scale (seed {i + 1} of 4) (Hard Rule 3)
          </div>
        );
      })}
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
  // Pattern 6: Dead-air elimination
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 6
  // ───────────────────────────────────────────────────────────────────────────
  'dead-air-elimination': {
    title: 'Dead-air elimination',
    lever: 'Constant stimulus',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive:
      'Three-layer motion budget per scene: AmbientField + primary animation + micro-motion (breath/blink/tick)',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 6: Dead-air elimination — base obligation; three-layer motion budget in every scene.',
        ),
        scenes: [
          {
            filename: 'Body.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace primary content with product-specific animation.
// Pattern 6: Dead-air elimination. Three-layer motion budget per scene:
//   Layer 1: AmbientField (always on)
//   Layer 2: Primary scene animation (product demo, type reveal, stat, etc.)
//   Layer 3: Micro-motion on any settled state (breath scale / cursor blink / counter tick)
// For deliberate static holds, declare them via role:'hold' in timeline.ts (not fake motion).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Breath period: 4 beats at 120bpm @ 30fps = 60 frames.
// Replace with beatsToFrames(4, bpm, fps) from your timeline (Hard Rule 3).
const BREATH_PERIOD = 60; // TODO: derive from timeline.beatsToFrames(4)

export function Body() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Layer 3: breath scale — micro-motion that prevents dead-air on settled state.
  // < 0.5% scale oscillation — alive but invisible to casual viewers.
  const breathPhase = (frame % BREATH_PERIOD) / BREATH_PERIOD;
  const breathScale = 1 + 0.004 * Math.sin(breathPhase * Math.PI * 2);

  // Layer 2: primary animation fade-in.
  const primaryOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Layer 1: AmbientField — required in every scene; energy from theme/act context */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={0.7}
      />

      {/* Layer 2: primary scene content */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 48,
            opacity: primaryOpacity,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          TODO: primary scene content — product demo, type reveal, or stat (Hard Rule 3)
        </div>
      </AbsoluteFill>

      {/* Layer 3: breath scale on settled focal element — micro-motion floor */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: \`translate(-50%, 0) scale(\${breathScale})\`,
          color: theme.palette.textDim,
          fontFamily: theme.fonts.body.family,
          fontWeight: theme.fonts.body.weight,
          fontSize: 24,
        }}
      >
        TODO: micro-motion element — cursor blink / counter tick / breath scale anchor
      </div>
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
      'Incomplete gesture at 88–92% arc (arrow/cursor halts at 70% travel); CTA completes + resolves',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 7: CTA tension/resolve — incomplete gesture before CTA; resolves into settled hold.',
        ),
        scenes: [
          {
            filename: 'Cta.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace URL and gesture with product-specific CTA.
// Pattern 7: CTA tension/resolve. CTA scene: incomplete gesture resolves into settled CTA.
// The tension beat lands 1-2 beats before CTA start; CTA scene completes the gesture.
// AmbientField fades to ≤0.4 in ending window so gate-5 endingMode=held.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// CTA settle frame: 2 beats in from scene start at 120bpm @ 30fps.
// Replace with beatsToFrames(2, bpm, fps) from your timeline (Hard Rule 3).
const CTA_SETTLE_AT = 36; // TODO: derive from timeline.beatsToFrames(2)

export function Cta() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Gesture completion: arrow/cursor travels to final position.
  const gestureP = interpolate(frame, [0, 18], [0.7, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo and URL arrive as gesture completes.
  const logoP = interpolate(frame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL types in over 2 beats.
  const urlP = interpolate(frame, [18, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const URL_TEXT = "TODO: your.product.url";
  const urlChars = Math.round(urlP * URL_TEXT.length);

  // AmbientField: settle toward hold-mode energy after primary animation.
  const isSettled = frame >= CTA_SETTLE_AT;
  const ambientEnergy = isSettled ? 0.35 : 0.6;

  // Breath scale on logo: micro-motion while settled (gate-1 + gate-5 hold).
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField fades to ≤0.4 in ending window: endingMeanEnergy < 1.5 (gate-5 held) */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={30}
        energy={ambientEnergy}
      />

      {/* Gesture completion: arrow reaches 100% of travel */}
      <div
        style={{
          position: "absolute",
          left: \`\${gestureP * 60}%\`,
          top: "50%",
          transform: "translateY(-50%)",
          color: theme.palette.accent,
          fontFamily: theme.fonts.body.family,
          fontWeight: theme.fonts.body.weight,
          fontSize: 36,
        }}
      >
        →
      </div>

      {/* Logo + URL: arrive as gesture completes, breath scale on settled state */}
      <AbsoluteFill
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}
      >
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 80,
            opacity: logoP,
            transform: \`scale(\${(0.95 + 0.05 * logoP) * breathScale})\`,
          }}
        >
          TODO: logo / product name (Hard Rule 3)
        </div>

        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 32,
            letterSpacing: "0.06em",
            opacity: logoP,
          }}
        >
          {URL_TEXT.slice(0, urlChars)}
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
      'CTA final 2 beats return to hookAmbientEnergy; background luminance matches frame 0',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 8: Loop-back ending — final beats return to hook ambient energy; loopSeamDelta < 60.',
        ),
        scenes: [
          {
            filename: 'Cta.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — replace URL and logo with product-specific CTA.
// Pattern 8: Loop-back ending. CTA scene: settle normally, then return to hook energy.
// Final 2 beats (LOOP_RETURN_AT) raise AmbientField to hookAmbientEnergy — matching frame 0.
// Gate-4: loopSeamDelta = meanAbsDelta(lum(frame0), lum(finalFrame)) < 60.0.
// Background must stay theme.bg throughout — no alternate CTA accent background.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Hook ambient energy — must match the Hook scene's AmbientField energy (Hard Rule 3).
// Declare in theme.ts as a token so Hook.tsx and Cta.tsx both reference the same value.
const HOOK_AMBIENT_ENERGY = 0.6; // TODO: move to theme.ts as hookAmbientEnergy
const CTA_RESOLVE_ENERGY = 0.4;

// Loop-return onset: 2 beats before video end. Replace with timeline-derived frame.
const LOOP_RETURN_AT = 324; // TODO: derive from timeline — 2 beats before totalDurationInFrames
const CTA_SETTLE_AT = 36;

export function Cta() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const isLoopReturn = frame >= LOOP_RETURN_AT;
  const ambientEnergy = isLoopReturn ? HOOK_AMBIENT_ENERGY : CTA_RESOLVE_ENERGY;

  // Logo arrives on a gentle spring (the exhale after the climax).
  const logoP = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isSettled = frame >= CTA_SETTLE_AT;
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  // Focal element eases back to hook position in the loop-return window.
  const focalY = isLoopReturn
    ? interpolate(frame, [LOOP_RETURN_AT, LOOP_RETURN_AT + 18], [0, -30], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  void isSettled;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField: resolve energy → hook energy in loop-return window */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={30}
        energy={ambientEnergy}
      />

      <AbsoluteFill
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}
      >
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 80,
            opacity: logoP,
            transform: \`translateY(\${focalY}px) scale(\${(0.95 + 0.05 * logoP) * breathScale})\`,
          }}
        >
          TODO: logo / product name — same composition weight as frame 0 (Hard Rule 3)
        </div>

        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 32,
            letterSpacing: "0.06em",
            opacity: logoP,
          }}
        >
          TODO: your.product.url
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
  // Pattern 9: Final-accent landing
  // Ref: .claude/skills/produce/retention-patterns.md §Pattern 9
  // ───────────────────────────────────────────────────────────────────────────
  'final-accent-landing': {
    title: 'Final-accent landing',
    lever: 'Resolved arrival',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive:
      'Hold mode: AmbientField ≤ 0.4 in ending window (endingMode=held). Or Accent mode: stamp-in at 97% (endingMode=accented).',

    renderBodyScenes({ themeVar: _t, timelineVar }) {
      return {
        timelineSrc: baseTimelineSrc(
          timelineVar,
          'Pattern 9: Final-accent landing — choose hold or accent mode; limp tail (endingMode=limp) is the failure.',
        ),
        scenes: [
          {
            filename: 'Cta.tsx',
            source: `\
// re-derive bespoke per Hard Rule 3 — choose hold mode or accent mode for your video.
// Pattern 9: Final-accent landing. Two ending modes; choose ONE per video:
//
//   HOLD mode:   AmbientField ≤ 0.4 in ending window → endingMeanEnergy < 1.5 (gate-5 PASS).
//                Use when the brand's closing image IS the message (most Kino videos).
//
//   ACCENT mode: Stamp-in at ENDING_ACCENT_AT → endingMaxEnergy > 2.0 (gate-5 PASS).
//                Use when the closing beat needs a punctuation mark, not a fade.
//
// Limp zone to AVOID: AmbientField energy = 0.7 in ending window → endingMode=limp → FAIL.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// TODO: choose hold or accent mode and delete the other (Hard Rule 3).
const ENDING_MODE: "hold" | "accent" = "hold";

// Accent mode only: stamp-in frame. Replace with timeline-derived value.
const ENDING_ACCENT_AT = 324; // TODO: 1-2 beats before totalDurationInFrames

const CTA_SETTLE_AT = 36;

export function Cta() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const isSettled = frame >= CTA_SETTLE_AT;
  const isAccentWindow = ENDING_MODE === "accent" && frame >= ENDING_ACCENT_AT;

  // HOLD MODE: energy ≤ 0.4 in ending window → endingMeanEnergy < 1.5.
  // ACCENT MODE: energy=1.0 at accent → endingMaxEnergy > 2.0; then drop to 0.3.
  const ambientEnergy = isAccentWindow
    ? frame < ENDING_ACCENT_AT + 6 ? 1.0 : 0.3
    : isSettled
    ? 0.35
    : 0.6;

  // Breath scale: micro-motion while settled (gate-1 floor; below gate-5 hold threshold).
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  const logoP = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent mode: stamp-in arrival.
  const accentP = isAccentWindow
    ? interpolate(frame, [ENDING_ACCENT_AT, ENDING_ACCENT_AT + 8], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={30}
        energy={ambientEnergy}
      />

      <AbsoluteFill
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}
      >
        {/* Logo: gentle spring arrival (the exhale) */}
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 80,
            opacity: logoP,
            transform: \`scale(\${(0.95 + 0.05 * logoP) * breathScale})\`,
          }}
        >
          TODO: logo / product name (Hard Rule 3)
        </div>

        <div
          style={{
            color: theme.palette.accent,
            fontFamily: theme.fonts.body.family,
            fontWeight: theme.fonts.body.weight,
            fontSize: 32,
            letterSpacing: "0.06em",
            opacity: logoP,
          }}
        >
          TODO: your.product.url
        </div>

        {/* ACCENT MODE ONLY: stamp-in at ENDING_ACCENT_AT */}
        {ENDING_MODE === "accent" && isAccentWindow && (
          <div
            style={{
              color: theme.palette.accent,
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: 48,
              opacity: accentP,
              transform: \`scale(\${0.8 + 0.2 * accentP})\`,
            }}
          >
            TODO: accent element — logo re-arrival or product sting (Hard Rule 3)
          </div>
        )}
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
