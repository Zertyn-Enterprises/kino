import { CameraMotionBlur } from "@remotion/motion-blur";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useTheme } from "../../../lib/theme";
import { norra } from "../theme";

const CX = 960;
const CY = 520;
const MESH_AT = 15;
const PULSE_AT = 90;

type Node = { x: number; y: number; ring: number };

const GOLDEN = 2.39996;
const RINGS = [
  { count: 6, r: 195 },
  { count: 9, r: 360 },
  { count: 12, r: 540 },
];

const NODES: Node[] = [{ x: CX, y: CY, ring: 0 }];
RINGS.forEach((ring, k) => {
  for (let i = 0; i < ring.count; i++) {
    const a = i * GOLDEN + k * 0.9;
    const wobble = 1 + 0.16 * Math.sin(i * 2.7 + k);
    NODES.push({
      x: CX + Math.cos(a) * ring.r * wobble * 1.45,
      y: CY + Math.sin(a) * ring.r * wobble * 0.82,
      ring: k + 1,
    });
  }
});

// Each node connects to the nearest node of the inner ring.
const EDGES = NODES.slice(1).map((n, idx) => {
  const inner = NODES.filter((m) => m.ring === n.ring - 1);
  let best = inner[0]!;
  let bestD = Infinity;
  for (const m of inner) {
    const d = (m.x - n.x) ** 2 + (m.y - n.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return { from: best, to: n, idx: idx + 1 };
});

const lightAt = (n: Node, idx: number) =>
  MESH_AT + (n.ring - 1) * 16 + (idx % 5) * 3;

/** One push becomes the whole network. The hero moment. */
export const Climax: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoom = interpolate(frame, [0, MESH_AT], [1, 0.022], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridIn = interpolate(frame, [5, 18], [0, 0.13], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const count = Math.floor(
    interpolate(frame, [MESH_AT, PULSE_AT], [0, 14203], {
      easing: Easing.in(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const counterIn = interpolate(frame, [MESH_AT, MESH_AT + 12], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = frame >= PULSE_AT ? Math.exp(-(frame - PULSE_AT) / 6) : 0;
  const settleDim = interpolate(frame, [104, 118], [1, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: gridIn,
          backgroundImage:
            "radial-gradient(circle, rgba(182,242,46,0.55) 1.1px, transparent 1.4px)",
          backgroundSize: "72px 72px",
          backgroundPosition: "center",
        }}
      />

      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        {EDGES.map(({ from, to, idx }) => {
          const start = lightAt(to, idx);
          const len = Math.hypot(to.x - from.x, to.y - from.y);
          const p = interpolate(frame, [start - 10, start], [0, 1], {
            easing: Easing.out(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (p <= 0) {
            return null;
          }
          return (
            <line
              key={idx}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={t.palette.accent}
              strokeWidth={1.6}
              strokeDasharray={len}
              strokeDashoffset={(1 - p) * len}
              opacity={(0.22 + pulse * 0.5) * settleDim}
            />
          );
        })}
      </svg>

      {NODES.map((n, i) => {
        const start = i === 0 ? MESH_AT : lightAt(n, i);
        const pop = spring({
          frame: frame - start,
          fps,
          config: t.motion.springs.snap,
          durationInFrames: 14,
        });
        if (frame < start) {
          return null;
        }
        const isOrigin = i === 0;
        const size = isOrigin ? 22 : 12;
        const glow = (isOrigin ? 0.9 : 0.5) + pulse * 1.2;
        const dim = isOrigin ? 1 : settleDim;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: n.x,
              top: n.y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: t.palette.accent,
              transform: `translate(-50%,-50%) scale(${pop * (1 + pulse * 0.35)})`,
              boxShadow: `0 0 ${14 + glow * 22}px rgba(182,242,46,${0.5 * glow * dim})`,
              opacity: dim,
            }}
          />
        );
      })}

      {frame < MESH_AT && (
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <CameraMotionBlur shutterAngle={220} samples={6}>
            <AbsoluteFill
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <div style={{ transform: `scale(${zoom})` }}>
                <div
                  style={{
                    width: 900,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ height: 38, background: "#101511" }} />
                  <div
                    style={{
                      height: 470,
                      background: norra.paperAlt,
                      padding: 40,
                    }}
                  >
                    <div
                      style={{
                        width: 300,
                        height: 44,
                        background: norra.ink,
                        borderRadius: 8,
                      }}
                    />
                    <div
                      style={{
                        width: 200,
                        height: 40,
                        background: norra.terracotta,
                        borderRadius: 8,
                        marginTop: 24,
                      }}
                    />
                  </div>
                </div>
              </div>
            </AbsoluteFill>
          </CameraMotionBlur>
        </AbsoluteFill>
      )}

      <div
        style={{
          position: "absolute",
          right: 96,
          top: 84,
          textAlign: "right",
          opacity: counterIn,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.mono?.family,
            fontSize: 22,
            letterSpacing: "0.12em",
            color: t.palette.textDim,
          }}
        >
          DEPLOYS TODAY
        </div>
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: 700,
            fontSize: 96,
            color: t.palette.accent,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.05,
            textShadow: `0 0 ${30 + pulse * 50}px rgba(182,242,46,${0.3 + pulse * 0.4})`,
          }}
        >
          {count.toLocaleString("en-US")}
        </div>
      </div>

      {pulse > 0.01 && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              width: 100,
              height: 100,
              borderRadius: "50%",
              transform: `translate(-50%,-50%) scale(${(1 - pulse) * 38 + 4})`,
              background:
                "radial-gradient(circle, rgba(182,242,46,0.35) 0%, rgba(182,242,46,0) 65%)",
              opacity: pulse,
              mixBlendMode: "screen",
            }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
