#!/usr/bin/env node
/**
 * scripts/retention-patterns.mjs — render-free retention pattern template registry.
 *
 * Exports:
 *   RETENTION_PATTERN_KEYS  — ordered array of the 9 stable kebab slugs
 *   RETENTION_PATTERNS      — map: slug → { title, lever, arcFit, signaturePrimitive,
 *                               renderBodyScenes }
 *
 * renderBodyScenes({ themeVar, timelineVar }) returns:
 *   { sceneSrc, timelineSrc }
 *   sceneSrc     — body-scene .tsx source; retention-gate-green by construction:
 *                  AmbientField in every frame (gate 1 HARD: dead-air floor ≥ 0.05),
 *                  no hardcoded hex (all palette/font tokens from useTheme()),
 *                  "// re-derive bespoke per Hard Rule 3" header
 *   timelineSrc  — timeline.ts scene declarations with retention-gate-green roles:
 *                  role:'climax' declared in the latter 2/3 (back-loaded),
 *                  ≥1 role:'hold' declared (excludes static sections from gate 1),
 *                  rehookSeconds set in config (gate 3 calibrated)
 *
 * Templates live in scripts/ only — never src/lib/ (Hard Rule 5).
 *
 * Ported from:
 *   .claude/skills/produce/retention-patterns.md — 9 buildable retention patterns
 */

// ── Ordered key list ──────────────────────────────────────────────────────────

export const RETENTION_PATTERN_KEYS = [
  'back-loaded-climax',
  'midpoint-rehook-punch',
  'open-loop-late-payoff',
  'pattern-interrupt',
  'payoff-seeding',
  'dead-air-elimination',
  'cta-tension-resolve',
  'loop-back-ending',
  'final-accent-landing',
];

// ── Pattern registry ──────────────────────────────────────────────────────────

export const RETENTION_PATTERNS = {

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 1: Back-loaded climax / escalation
  // Ref: retention-patterns.md §Pattern 1
  // ─────────────────────────────────────────────────────────────────────────────
  'back-loaded-climax': {
    title: 'Back-loaded climax / escalation',
    lever: 'Momentum payoff — energy builds from low at opening to peak at climax',
    arcFit: ['A', 'B', 'E'],
    signaturePrimitive: 'AmbientField energy ramping 0.4→0.9→1.2 + two-layer progressive unlock at 35%/70% body progress',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace body content with product-specific scenes.
// Pattern 1: Back-loaded climax. Ref: retention-patterns.md §Pattern 1
// Energy ladder: opening={0.4} → body={0.4→0.9} → climax={1.2}
// Gate 2 PASS by construction: supply --climax=<climaxStartFrame> when running retention.sh.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({
  sceneProgress = 0,
}: {
  sceneProgress?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Energy ramps 0.4→0.9 across the body act; climax scene pushes to 1.2.
  const ambientEnergy = interpolate(sceneProgress, [0, 1], [0.4, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Layer 3 micro-motion: breath scale keeps every settled frame above dead-air floor.
  const breathScale = 1 + 0.004 * Math.sin((frame / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* Layer 1: AmbientField — energy ramps toward the climax scene */}
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
        }}
      >
        {/* Layer 2: primary body content — TODO: replace with product demo per Hard Rule 3 */}
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 72,
            color: theme.palette.text,
            transform: \`scale(\${breathScale})\`,
          }}
        >
          TODO: body scene content — one animated element at a time
        </div>
        {/* Second proof layer unlocks at 35% body progress */}
        {sceneProgress > 0.35 && (
          <div
            style={{
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 32,
              color: theme.palette.textDim,
              opacity: interpolate(sceneProgress, [0.35, 0.50], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            TODO: proof beat 1 — replace per Hard Rule 3 (35% body progress)
          </div>
        )}
        {/* Third proof layer unlocks at 70% — visual density grows toward climax */}
        {sceneProgress > 0.70 && (
          <div
            style={{
              fontFamily: theme.fonts.body.family,
              fontWeight: theme.fonts.body.weight,
              fontSize: 32,
              color: theme.palette.accent,
              opacity: interpolate(sceneProgress, [0.70, 0.85], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            TODO: proof beat 2 — replace per Hard Rule 3 (70% body progress)
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 1: Back-loaded climax — gate-green by construction.
// Climax scene is the pixel-delta peak; every prior scene stays one rung below.
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",       beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "opening",    beats: 12 },
    { id: "body",       beats: 24 },
    { id: "pre_climax", beats: 8  },
    { id: "climax",     beats: 10, role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "cta",        beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 2: Mid-point re-hook punch
  // Ref: retention-patterns.md §Pattern 2
  // ─────────────────────────────────────────────────────────────────────────────
  'midpoint-rehook-punch': {
    title: 'Mid-point re-hook punch',
    lever: 'Attention reset — single-beat spike at ~50% resets scroll impulse before it reasserts',
    arcFit: ['B', 'D', 'E'],
    signaturePrimitive: 'Shake at scene-local frame 0 + AmbientField spike to energy=1.0 for 1-beat punch scene',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace punch content with product-specific moment.
// Pattern 2: Mid-point re-hook punch. Ref: retention-patterns.md §Pattern 2
// Place this Punch scene at ~50% of total runtime in your timeline.ts.
// Gate 3 PASS by construction: punch ensures no body segment exceeds rehookSeconds.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Shake } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Punch({
  punchLabel = "TODO: punch copy — new stat / mode shift / second persona",
}: {
  punchLabel?: string;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Punch fires at scene-local frame 0 — this scene IS the punch.
  // arrival: 0→1 in the first 8 frames of the scene (the stamp-in moment).
  const arrival = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField spikes to energy=1.0 on the punch beat — elevated vs body (0.7) */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={1.0}
      />
      {/* Shake wraps the punch element; fires at scene-local f0 (strength decays in ~5 frames) */}
      <Shake at={0} strength={4}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: theme.fonts.display.family,
              fontWeight: theme.fonts.display.weight,
              fontSize: 96,
              color: theme.palette.accent,
              opacity: arrival,
              transform: \`scale(\${0.88 + 0.12 * arrival})\`,
            }}
          >
            {punchLabel}
          </div>
        </AbsoluteFill>
      </Shake>
    </AbsoluteFill>
  );
}
`,
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 2: Mid-point re-hook punch — gate-green by construction.
// Punch scene at ~50% ensures no body segment exceeds rehookSeconds (gate 3).
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 6 },
  [
    { id: "hook",      beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "pre_body",  beats: 20 },
    { id: "punch",     beats: 4  },
    { id: "post_body", beats: 16 },
    { id: "climax",    beats: 10, role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "cta",       beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 3: Open loop + late payoff
  // Ref: retention-patterns.md §Pattern 3
  // ─────────────────────────────────────────────────────────────────────────────
  'open-loop-late-payoff': {
    title: 'Open loop + late payoff',
    lever: 'Curiosity gap — partial reveal opens a question at 25%; full reveal at 75-85% closes it',
    arcFit: ['B', 'F', 'D'],
    signaturePrimitive: 'blurred/masked withheld element in opening + Flash at reveal frame (78% runtime) + mask expansion',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace reveal content with product-specific unveil.
// Pattern 3: Open loop + late payoff. Ref: retention-patterns.md §Pattern 3
// This is the REVEAL scene — place at ~78% of total runtime (role: "climax").
// Gate 2 PASS by construction: reveal IS the energy peak; supply --climax=<revealStartFrame>.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Reveal({
  payoffText = "TODO: payoff — what the viewer waited to see",
}: {
  payoffText?: string;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Mask expands from left at scene-local f0 — the loop closes here.
  const maskWidth = interpolate(frame, [0, 20], [0, 1920], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Payoff text fades in slightly after the mask completes.
  const textOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField peaks at energy=1.2 — the reveal IS the video's highest-energy moment */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={1.2}
      />
      {/* Flash fires at scene-local f0 — punctuates the reveal arrival */}
      <Flash at={0} color={theme.palette.text} peak={0.12} />
      {/* Mask: expand from left to close the open loop */}
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
          {payoffText}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 3: Open loop + late payoff — gate-green by construction.
// Reveal scene at ~78% is the energy peak; supply --climax=<revealStartFrame>.
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",     beats: 10, promise: { text: "TODO: ≤6-word partial tease", byFrame: 60 } },
    { id: "opening",  beats: 10 },
    { id: "evidence", beats: 28 },
    { id: "reveal",   beats: 12, role: "climax", payoff: { text: "TODO: full reveal payoff" } },
    { id: "cta",      beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 4: Pattern interrupt
  // Ref: retention-patterns.md §Pattern 4
  // ─────────────────────────────────────────────────────────────────────────────
  'pattern-interrupt': {
    title: 'Pattern interrupt',
    lever: 'Wrongness-demands-attention — unexpected visual shift mid-body forces re-engagement',
    arcFit: ['C', 'F', 'A'],
    signaturePrimitive: 'grayscale CSS filter wash for 1-2 beats + scale snap on re-entry (theme.spring.snappy)',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace interrupt content with product-specific pivot.
// Pattern 4: Pattern interrupt. Ref: retention-patterns.md §Pattern 4
// This is the INTERRUPT scene — place at ~65% of total runtime.
// Gate 3 PASS by construction: interrupt IS the re-hook anchor before climax.
// IMPORTANT: interrupt must have visible motion (color shift / scale snap) — static blank fails gate 1.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Interrupt() {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Grayscale wash enters over 4 frames then fades back to color after 1 beat.
  // Replace with your product's mode-shift visual (Hard Rule 3).
  const INTERRUPT_FRAMES = 8; // 1 beat at 30fps/beat (adjust to your bpm)
  const saturation = interpolate(frame, [0, 4, INTERRUPT_FRAMES, INTERRUPT_FRAMES + 6], [1, 0, 0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scale snap on re-entry — reinforces "world changed" feel.
  const scale = interpolate(frame, [INTERRUPT_FRAMES, INTERRUPT_FRAMES + 8], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.palette.bg,
        filter: \`saturate(\${saturation})\`,
        transform: \`scale(\${scale})\`,
      }}
    >
      {/* AmbientField remains active during interrupt — gate 1 HARD maintained */}
      <AmbientField
        color={theme.palette.accent}
        colorDim={theme.palette.textDim}
        density={40}
        energy={0.8}
      />
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 72,
            color: theme.palette.text,
          }}
        >
          TODO: interrupt visual — mode shift, typographic takeover, or dramatic pivot
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 4: Pattern interrupt — gate-green by construction.
// Interrupt scene at ~65% is the re-hook anchor (gate 3); supply --climax=<climaxStartFrame>.
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 7 },
  [
    { id: "hook",      beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "body_a",    beats: 18 },
    { id: "interrupt", beats: 4  },
    { id: "body_b",    beats: 16 },
    { id: "climax",    beats: 10, role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "cta",       beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 5: Payoff seeding
  // Ref: retention-patterns.md §Pattern 5
  // ─────────────────────────────────────────────────────────────────────────────
  'payoff-seeding': {
    title: 'Payoff seeding',
    lever: 'Escalating anticipation — 3-4 small payoffs at regular intervals ratchet expectation toward the climax motif at full scale',
    arcFit: ['E', 'A', 'D'],
    signaturePrimitive: 'shared ClimaticMotif at intensity ×0.25/×0.50/×0.75 in seed scenes; ×1.0 at climax; AmbientField steps 0.5/0.65/0.8/1.2',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace seed content with product's escalating motif.
// Pattern 5: Payoff seeding. Ref: retention-patterns.md §Pattern 5
// This is a SEED scene — instantiate 3 times (seed1/seed2/seed3) at 20%/40%/60% runtime.
// seedIntensity: 0.25 / 0.50 / 0.75 for seeds 1-3; 1.0 in the climax scene.
// Gates 2+3 PASS by construction: climax seed at ×1.0 is the pixel-delta peak.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Seed({
  seedIntensity = 0.25,
  motifLabel = "TODO: climax motif label — replace per Hard Rule 3",
}: {
  seedIntensity?: number;
  motifLabel?: string;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Motif arrives on scene-local f0; seed energy level drives AmbientField.
  const arrival = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // AmbientField energy steps per seed: 0.5 / 0.65 / 0.8 / 1.2 (at climax).
  const seedEnergyMap: Record<number, number> = { 0.25: 0.5, 0.50: 0.65, 0.75: 0.8, 1.0: 1.2 };
  const ambientEnergy = seedEnergyMap[seedIntensity] ?? 0.5 + seedIntensity * 0.7;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField steps up with each seed — energy ladder across the arc */}
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
        }}
      >
        {/* Motif renders at seedIntensity scale — same visual element, grows each seed */}
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
          {motifLabel}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`,
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 5: Payoff seeding — gate-green by construction.
// Seeds at 20%/40%/60% runtime; climax at 80% is the motif at full scale (gate 2 PASS).
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",   beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "seed1",  beats: 10 },
    { id: "seed2",  beats: 10 },
    { id: "seed3",  beats: 10 },
    { id: "climax", beats: 12, role: "climax", payoff: { text: "TODO: full motif payoff" } },
    { id: "cta",    beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 6: Dead-air elimination
  // Ref: retention-patterns.md §Pattern 6
  // ─────────────────────────────────────────────────────────────────────────────
  'dead-air-elimination': {
    title: 'Dead-air elimination',
    lever: 'Constant stimulus — three-layer motion budget ensures no frame drops below dead-air floor',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive: 'AmbientField (layer 1) + primary scene animation (layer 2) + micro-motion breath scale or cursor blink (layer 3)',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace body content with product-specific scenes.
// Pattern 6: Dead-air elimination. Ref: retention-patterns.md §Pattern 6
// Applied globally — use this three-layer budget as the base for EVERY scene.
// Gate 1 HARD PASS by construction: three layers guarantee delta > 0.05 in every frame.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Body({
  ambientEnergyForAct = 0.6,
}: {
  ambientEnergyForAct?: number;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Layer 3: breath scale micro-motion — alive in every settled frame.
  // Period: 60 frames (2s at 30fps). Replace with beatsToFrames(4, bpm, fps) in real code.
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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
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
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 6: Dead-air elimination — gate-green by construction.
// Base obligation: apply AmbientField + micro-motion to EVERY scene in this timeline.
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",    beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "opening", beats: 12 },
    { id: "body",    beats: 24 },
    { id: "climax",  beats: 10, role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "cta",     beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 7: CTA tension/resolve
  // Ref: retention-patterns.md §Pattern 7
  // ─────────────────────────────────────────────────────────────────────────────
  'cta-tension-resolve': {
    title: 'CTA tension/resolve',
    lever: 'Earned arrival — incomplete pre-CTA gesture resolves into calm on the first CTA frame; viewer exhales on the logo',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive: 'incomplete gesture (70% travel) in tension scene + gentle spring settle on CTA frame; resolveRatio < 0.75 by construction',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace CTA content with product-specific landing.
// Pattern 7: CTA tension/resolve. Ref: retention-patterns.md §Pattern 7
// This is the CTA scene (role: "hold"). Pre-CTA tension scene is declared in timeline.ts.
// Gate 2 resolveRatio < 0.75 by construction: CTA settle energy is well below climax peak.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Cta({
  ctaUrl = "TODO: product URL",
}: {
  ctaUrl?: string;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Logo arrives on gentle spring — the exhale after tension.
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // AmbientField fades 0.6→0.3 across the CTA resolve — held territory, gate 5 PASS.
  const ambientEnergy = interpolate(frame, [0, 30], [0.6, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Micro-motion: breath scale keeps final frames above dead-air floor while remaining held.
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
        {/* Logo / brand mark — TODO: replace with product logo per Hard Rule 3 */}
        <div
          style={{
            fontFamily: theme.fonts.display.family,
            fontWeight: theme.fonts.display.weight,
            fontSize: 96,
            color: theme.palette.text,
          }}
        >
          TODO: product logo or name
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
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 7: CTA tension/resolve — gate-green by construction.
// Tension beat before CTA produces resolveRatio < 0.75 (gate 2); supply --climax=<climaxFrame>.
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",       beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "body",       beats: 24 },
    { id: "pre_climax", beats: 8  },
    { id: "climax",     beats: 8,  role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "tension",    beats: 4  },
    { id: "cta",        beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 8: Loop-back ending
  // Ref: retention-patterns.md §Pattern 8
  // ─────────────────────────────────────────────────────────────────────────────
  'loop-back-ending': {
    title: 'Loop-back ending',
    lever: 'Completion signal + rewatch magnet — final frame rhymes with frame 0; loopSeamDelta < 60.0 by construction',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive: 'CTA scene returns to hookAmbientEnergy in final 2 beats; same bg + AmbientField seed as hook (loopSeamDelta target < 20.0)',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace CTA content with product-specific landing.
// Pattern 8: Loop-back ending. Ref: retention-patterns.md §Pattern 8
// CTA scene returns to hook AmbientField energy in the final 2 beats — loopSeamDelta < 60.0.
// Gate 4 PASS by construction: matching bg + AmbientField energy makes seam invisible.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// Set these to match your hook scene's AmbientField recipe (Hard Rule 3).
// hookAmbientEnergy must match the hook scene's energy prop exactly for loopSeamDelta < 20.0.
const HOOK_AMBIENT_ENERGY = 0.6; // TODO: match hook scene AmbientField energy
const CTA_RESOLVE_ENERGY  = 0.4; // intermediate CTA settle before loop-return
const LOOP_RETURN_FRAME   = 45;  // TODO: derive from beatsToFrames(CTA_beats - 2, bpm, fps)

export function Cta({
  ctaLabel = "TODO: product name or URL",
}: {
  ctaLabel?: string;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // CTA settles to ctaResolveEnergy, then returns to hookAmbientEnergy at LOOP_RETURN_FRAME.
  const ambientEnergy = frame >= LOOP_RETURN_FRAME ? HOOK_AMBIENT_ENERGY : CTA_RESOLVE_ENERGY;

  // Logo fades in on CTA entry.
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Micro-motion: breath keeps gate-1 floor maintained throughout.
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField returns to hookAmbientEnergy at LOOP_RETURN_FRAME — matching luminance */}
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
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 8: Loop-back ending — gate-green by construction.
// CTA scene returns to hook AmbientField energy 2 beats before the end (loopSeamDelta < 60.0).
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",   beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "body",   beats: 24 },
    { id: "climax", beats: 12, role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "cta",    beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern 9: Final-accent landing
  // Ref: retention-patterns.md §Pattern 9
  // ─────────────────────────────────────────────────────────────────────────────
  'final-accent-landing': {
    title: 'Final-accent landing',
    lever: 'Resolved arrival — CTA holds in a legible settled end-state (hold mode) or fires a deliberate final punch (accent mode)',
    arcFit: ['A', 'B', 'C', 'D', 'E', 'F'],
    signaturePrimitive: 'hold mode: AmbientField ≤ 0.4 in final 1.5s (endingMeanEnergy < 1.5); accent mode: stamp-in at energy=1.0 then settle ≤ 0.3',

    renderBodyScenes({ themeVar: _themeVar, timelineVar }) {
      return {
        sceneSrc: `\
// re-derive bespoke per Hard Rule 3 — replace CTA content with product-specific landing.
// Pattern 9: Final-accent landing. Ref: retention-patterns.md §Pattern 9
// Gate 5 PASS by construction: hold mode endingMeanEnergy < 1.5; accent mode endingMaxEnergy > 2.0.
// Choose ONE ending mode per video — see ENDING_MODE below (Hard Rule 3).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

// ENDING_MODE: "hold" or "accent" — choose one per video (Hard Rule 3).
// hold:   AmbientField ≤ 0.4 in final 1.5s → endingMeanEnergy < 1.5 (gate 5 PASS)
// accent: stamp-in at energy=1.0 at ACCENT_FRAME, settle ≤ 0.3 after → endingMaxEnergy > 2.0
const ENDING_MODE  = "hold" as const;
const SETTLE_FRAME = 12; // TODO: derive from 2 beats past CTA entry
const ACCENT_FRAME = 45; // TODO: derive from beatsToFrames(CTA_beats - 2, bpm, fps)

export function Cta({
  ctaLabel = "TODO: product name or URL",
}: {
  ctaLabel?: string;
}) {
  const theme = useTheme();
  const frame = useCurrentFrame();

  // Hold mode: AmbientField drops to 0.35 after settle; accent mode: spike at ACCENT_FRAME.
  const holdEnergy   = 0.35;
  const accentEnergy = frame >= ACCENT_FRAME && frame < ACCENT_FRAME + 8 ? 1.0 : 0.3;
  const ambientEnergy = ENDING_MODE === "hold"
    ? (frame >= SETTLE_FRAME ? holdEnergy : 0.6)
    : accentEnergy;

  // Logo fades in on CTA entry; micro-motion breath scale keeps gate-1 floor maintained.
  const logoOpacity  = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathScale = 1 + 0.003 * Math.sin((frame / 60) * Math.PI * 2);

  // Accent mode stamp-in: hard arrival at ACCENT_FRAME.
  const accentScale = ENDING_MODE === "accent"
    ? interpolate(frame, [ACCENT_FRAME, ACCENT_FRAME + 8], [0.88, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  return (
    <AbsoluteFill style={{ background: theme.palette.bg }}>
      {/* AmbientField: hold mode ≤ 0.35; accent mode spikes to 1.0 then settles to 0.3 */}
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
        timelineSrc: `\
import { buildTimeline } from "../../lib/timeline";

// Pattern 9: Final-accent landing — gate-green by construction.
// CTA scene with role:'hold' declares the ending window for gate 5; AmbientField ≤ 0.4 there.
// TODO: update bpm + beat counts to match your treatment and music track.
export const ${timelineVar} = buildTimeline(
  { fps: 30, bpm: 120, rehookSeconds: 8 },
  [
    { id: "hook",   beats: 10, promise: { text: "TODO: ≤6-word promise", byFrame: 60 } },
    { id: "body",   beats: 24 },
    { id: "climax", beats: 12, role: "climax", payoff: { text: "TODO: hook resolution" } },
    { id: "cta",    beats: 8,  role: "hold" },
  ] as const,
);
`,
      };
    },
  },

};
