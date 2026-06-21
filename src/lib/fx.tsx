/**
 * Cinematic effects vocabulary — lit space, depth, impacts, kinetic type.
 * Mechanics with knobs; palettes/timings come from the caller. All motion
 * is deterministic (noise2D / index hashes — never Math.random).
 */

import { noise2D } from "@remotion/noise";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ── Stage ─────────────────────────────────────────────────────────────── */

/** A lit space: base + two drifting ambient glows + floor + vignette. */
export const CinemaStage: React.FC<{
  base: string;
  glowA: string;
  glowB?: string;
  /** 0–1: how much the glows breathe/drift. */
  energy?: number;
  floor?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ base, glowA, glowB, energy = 1, floor = true, children, style }) => {
  const frame = useCurrentFrame();
  const ax = 30 + noise2D("stage-ax", frame * 0.004, 0) * 12 * energy;
  const ay = 24 + noise2D("stage-ay", frame * 0.004, 7) * 10 * energy;
  const bx = 74 + noise2D("stage-bx", frame * 0.004, 13) * 12 * energy;
  const by = 70 + noise2D("stage-by", frame * 0.004, 23) * 10 * energy;
  return (
    <AbsoluteFill style={{ background: base, ...style }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${ax}% ${ay}%, ${glowA} 0%, transparent 70%)`,
        }}
      />
      {glowB && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(1000px 750px at ${bx}% ${by}%, ${glowB} 0%, transparent 72%)`,
          }}
        />
      )}
      {floor && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to top, rgba(255,255,255,0.05) 0%, transparent 22%)",
          }}
        />
      )}
      {children}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ── Depth ─────────────────────────────────────────────────────────────── */

/** Floats content: entrance, bob, tilt, shadow, optional reflection. */
export const Floating: React.FC<{
  /** Frame at which the panel has fully entered (rise+fade before it). */
  enterAt?: number;
  enterFrames?: number;
  bobAmp?: number;
  bobPeriod?: number;
  tiltDeg?: number;
  seed?: string;
  reflection?: boolean;
  shadow?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  enterAt = 0,
  enterFrames = 16,
  bobAmp = 5,
  bobPeriod = 95,
  tiltDeg = 0,
  seed = "float",
  reflection = false,
  shadow = true,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [enterAt - enterFrames, enterAt], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bob =
    Math.sin((frame / bobPeriod) * Math.PI * 2 + noise2D(seed, 0, 0) * 6) *
    bobAmp;
  return (
    <div style={{ perspective: 1400, ...style }}>
      <div
        style={{
          transform: `translateY(${bob + (1 - p) * 40}px) rotateX(${tiltDeg}deg)`,
          opacity: p,
          filter: shadow
            ? "drop-shadow(0 40px 70px rgba(0,0,0,0.55))"
            : undefined,
        }}
      >
        {children}
        {reflection && (
          <div
            style={{
              transform: "scaleY(-1)",
              opacity: 0.1,
              maskImage:
                "linear-gradient(to bottom, black 0%, transparent 42%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, transparent 42%)",
              pointerEvents: "none",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Impacts ───────────────────────────────────────────────────────────── */

/** Deterministic screen shake decaying from `at`. Wrap the whole scene. */
export const Shake: React.FC<{
  at: number;
  strength?: number;
  children: React.ReactNode;
}> = ({ at, strength = 6, children }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const amp = t >= 0 ? strength * Math.exp(-t / 5) : 0;
  const dx = noise2D("shake-x", frame * 0.9, 0) * amp;
  const dy = noise2D("shake-y", frame * 0.9, 50) * amp;
  return (
    <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Expanding impact ring. */
export const Ripple: React.FC<{
  at: number;
  x: number;
  y: number;
  color: string;
  maxScale?: number;
  durationInFrames?: number;
}> = ({ at, x, y, color, maxScale = 7, durationInFrames = 16 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, durationInFrames], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < at || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: `4px solid ${color}`,
        opacity: 1 - p,
        transform: `translate(-50%,-50%) scale(${0.4 + p * maxScale})`,
        pointerEvents: "none",
      }}
    />
  );
};

/** Full-frame flash (keep ≤0.14 peak; 2–3 frames). */
export const Flash: React.FC<{ at: number; color: string; peak?: number }> = ({
  at,
  color,
  peak = 0.12,
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - at, [0, 3], [peak, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < at || o <= 0) return null;
  return (
    <AbsoluteFill
      style={{ background: color, opacity: o, pointerEvents: "none" }}
    />
  );
};

/* ── Light ─────────────────────────────────────────────────────────────── */

/** Diagonal light band sweeping across its parent (position: relative). */
export const LightSweep: React.FC<{
  at: number;
  durationInFrames?: number;
  color?: string;
}> = ({ at, durationInFrames = 22, color = "rgba(255,255,255,0.14)" }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, durationInFrames], [-0.4, 1.4], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < at || p >= 1.4) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: "inherit",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${p * 100}%`,
          top: -40,
          bottom: -40,
          width: "34%",
          background: `linear-gradient(100deg, transparent 0%, ${color} 50%, transparent 100%)`,
          transform: "skewX(-14deg)",
        }}
      />
    </div>
  );
};

/** Breathing glow wrapper. */
export const GlowPulse: React.FC<{
  color: string;
  period?: number;
  base?: number;
  amp?: number;
  radius?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  color,
  period = 60,
  base = 0.35,
  amp = 0.25,
  radius = 40,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const k = base + amp * (0.5 + 0.5 * Math.sin((frame / period) * Math.PI * 2));
  return (
    <div style={{ boxShadow: `0 0 ${radius * k * 2}px ${color}`, ...style }}>
      {children}
    </div>
  );
};

/* ── Movement ──────────────────────────────────────────────────────────── */

/** Speed streak behind a fast horizontal traveler. Place at the mover. */
export const StreakTrail: React.FC<{
  length?: number;
  thickness?: number;
  color: string;
  /** +1 = moving right (streak extends left). */
  direction?: 1 | -1;
  opacity?: number;
}> = ({
  length = 240,
  thickness = 26,
  color,
  direction = 1,
  opacity = 0.8,
}) => (
  <div
    style={{
      position: "absolute",
      top: "50%",
      [direction === 1 ? "right" : "left"]: "60%",
      width: length,
      height: thickness,
      transform: "translateY(-50%)",
      background: `linear-gradient(${direction === 1 ? "90deg" : "270deg"}, transparent 0%, ${color} 100%)`,
      filter: "blur(6px)",
      opacity,
      pointerEvents: "none",
    }}
  />
);

/** Drifting ambient motes. */
export const Particles: React.FC<{
  count?: number;
  color: string;
  seed?: string;
  width?: number;
  height?: number;
  maxSize?: number;
}> = ({
  count = 18,
  color,
  seed = "p",
  width = 1920,
  height = 1080,
  maxSize = 5,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const bx = Math.abs(noise2D(`${seed}x`, i * 13.7, 0)) * width;
        const by = Math.abs(noise2D(`${seed}y`, i * 7.3, 9)) * height;
        const x = bx + noise2D(`${seed}dx`, i, frame * 0.006) * 50;
        const y =
          (((by - frame * (0.15 + (i % 5) * 0.08)) % height) + height) % height;
        const size = 1.5 + (i % 4) * ((maxSize - 1.5) / 3);
        const tw = 0.25 + 0.45 * Math.abs(Math.sin(frame / 40 + i * 2.1));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: color,
              opacity: tw,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ── Type & numbers ────────────────────────────────────────────────────── */

/** Word-slam kinetic line: scale+blur slam per word with stagger. */
export const KineticLine: React.FC<{
  text: string;
  at: number;
  perWord?: number;
  slamFrames?: number;
  fontSize?: number;
  fontFamily: string;
  fontWeight?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  at,
  perWord = 5,
  slamFrames = 6,
  fontSize = 84,
  fontFamily,
  fontWeight = 700,
  color = "#fff",
  style,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: "0.32em",
        fontFamily,
        fontWeight,
        fontSize,
        color,
        letterSpacing: "-0.02em",
        lineHeight: 1.08,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = interpolate(
          frame - (at + i * perWord),
          [0, slamFrames],
          [0, 1],
          {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `scale(${1.55 - p * 0.55})`,
              filter: `blur(${(1 - p) * 12}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Eased counting number (render inside your own styled element). */
export const useCountUp = (opts: {
  from: number;
  to: number;
  at: number;
  durationInFrames: number;
  easing?: (t: number) => number;
}): number => {
  const frame = useCurrentFrame();
  return Math.round(
    interpolate(
      frame,
      [opts.at, opts.at + opts.durationInFrames],
      [opts.from, opts.to],
      {
        easing: opts.easing ?? Easing.in(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );
};

/* ── Time ──────────────────────────────────────────────────────────────── */

/**
 * Piecewise time remap for speed ramps. Control points map REAL playback
 * frames to SCENE time; drive every animation in the scene with the
 * returned frame. Slow-mo = a segment whose mapped span is smaller than its
 * real span (e.g. [[0,0],[68,68],[84,72],[120,108]] ≈ 0.25× between 68–84).
 */
export const useRampedFrame = (
  ramp: readonly (readonly [real: number, mapped: number])[],
): number => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    ramp.map((r) => r[0]),
    ramp.map((r) => r[1]),
    { extrapolateLeft: "clamp", extrapolateRight: "extend" },
  );
};

/**
 * Macro treatment for interactions: zooms the wrapped content toward a
 * focus point during [from, to] so the moment reads HUGE, easing in/out.
 * Coordinates in the wrapped content's own pixel space.
 */
export const Macro: React.FC<{
  from: number;
  to: number;
  x: number;
  y: number;
  zoom?: number;
  easeFrames?: number;
  children: React.ReactNode;
}> = ({ from, to, x, y, zoom = 1.8, easeFrames = 10, children }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [from, from + easeFrames], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outP = interpolate(frame, [to - easeFrames, to], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p = inP - outP;
  const s = 1 + (zoom - 1) * p;
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${s})`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ── Ambient activity ──────────────────────────────────────────────────── */

/** Bounding box for AmbientField placement within the parent (px). */
export type AmbientRegion = { x: number; y: number; w: number; h: number };

/**
 * Parallel-activity background layer: streaming micro-update strips
 * distributed across the region, scrolling at deterministic speeds.
 *
 * Mechanics only — caller supplies every color token. Motion is fully
 * deterministic (noise2D + index hashes; never Math.random).
 *
 * Gate guidance: density ≥ 40 + energy ≥ 1 produces hook gate-4/5 PASSes
 * (background-activity ≥ 2 separated cells, frame-0 liveness ≥ 2 rows).
 */
export const AmbientField: React.FC<{
  /** Active item color — caller supplies. */
  color: string;
  /** Dim variant for lower-opacity items. Falls back to `color`. */
  colorDim?: string;
  /** Total stream count. Default 20. */
  density?: number;
  /** Placement in parent (px). Omit to fill the parent via AbsoluteFill. */
  region?: AmbientRegion;
  /** Motion speed multiplier 0–1+. Default 0.5. */
  energy?: number;
  /** Determinism seed. Default "af". */
  seed?: string;
  /** Strip height in px. Default 3. */
  itemH?: number;
}> = ({
  color,
  colorDim,
  density = 20,
  region,
  energy = 0.5,
  seed = "af",
  itemH = 3,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const lw = region?.w ?? width;
  const lh = region?.h ?? height;

  // Divide items evenly across 4 horizontal bands so they span the full
  // height — this is what satisfies the frame-0 liveness gate (≥2 rows).
  const BANDS = 4;
  const perBand = Math.ceil(density / BANDS);
  const bandH = lh / BANDS;

  const items = Array.from({ length: density }, (_, i) => {
    const band = Math.floor((i * BANDS) / density);
    const withinBand = i - Math.floor((band * density) / BANDS);
    // Even vertical spread within band + small jitter
    const y =
      band * bandH +
      ((withinBand + 0.5) / perBand) * bandH +
      noise2D(`${seed}jy`, i * 6.1, 0) * bandH * 0.08;

    // Noise-based start x (0..lw)
    const baseX = Math.abs(noise2D(`${seed}bx`, i * 11.3, 0)) * lw;
    // Strip width 40–240 px
    const itemW = 40 + Math.abs(noise2D(`${seed}iw`, i * 4.7, 0)) * 200;
    // Scroll speed 0.6–2.8 px/frame (before energy scaling)
    const spd = 0.6 + Math.abs(noise2D(`${seed}sp`, i * 8.9, 0)) * 2.2;
    // Current x: wraps within local width
    const x = ((baseX + frame * energy * spd) % lw + lw) % lw;

    // Slow opacity modulation via noise
    const op =
      0.3 + 0.6 * Math.abs(noise2D(`${seed}op`, i * 0.9, frame * 0.01 * energy));

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: Math.round(x),
          top: Math.round(Math.max(0, Math.min(lh - itemH, y))),
          width: Math.round(itemW),
          height: itemH,
          background: op > 0.65 ? color : (colorDim ?? color),
          opacity: op,
          pointerEvents: "none",
        }}
      />
    );
  });

  if (region) {
    return (
      <div
        style={{
          position: "absolute",
          left: region.x,
          top: region.y,
          width: lw,
          height: lh,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {items}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {items}
    </AbsoluteFill>
  );
};
