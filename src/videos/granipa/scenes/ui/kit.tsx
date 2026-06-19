/**
 * Grañipa v2 kit — indictment & sanctuary. Cold surveillance props (tool
 * cards, siphon streams, leak items) and warm on-device props (the rainbow
 * spiral mark, mac frame, feature chips, receipts). Canvas-space sizing.
 */

import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../../lib/theme";
import { cold, spiral } from "../../theme";

/* ── Evidence ──────────────────────────────────────────────────────────── */

/** Mono evidence chip ("e.g. Granola", "$40/mo") — stamps like a receipt. */
export const ReceiptChip: React.FC<{
  text: string;
  stampAt: number;
  tone?: "cold" | "warm" | "leak";
  fontSize?: number;
}> = ({ text, stampAt, tone = "cold", fontSize = 22 }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  if (frame < stampAt) return null;
  const p = interpolate(frame - stampAt, [0, 6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const colors =
    tone === "leak"
      ? {
          border: "rgba(229,72,77,0.55)",
          text: cold.leak,
          bg: "rgba(229,72,77,0.08)",
        }
      : tone === "warm"
        ? {
            border: "rgba(245,158,11,0.5)",
            text: "#F4C674",
            bg: "rgba(245,158,11,0.08)",
          }
        : { border: cold.border, text: cold.dim, bg: "rgba(255,255,255,0.04)" };
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: t.fonts.mono?.family,
        fontSize,
        color: colors.text,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "7px 16px",
        transform: `scale(${1.25 - p * 0.25}) rotate(${(1 - p) * -3}deg)`,
        opacity: p,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
};

/* ── Surveillance world ────────────────────────────────────────────────── */

/** Minimal line glyphs for the accused tools. */
export const ToolGlyph: React.FC<{
  kind: "mic" | "clipboard" | "eye";
  size?: number;
  color?: string;
}> = ({ kind, size = 64, color = cold.text }) => {
  const s = size;
  if (kind === "mic") {
    return (
      <svg width={s} height={s} viewBox="0 0 64 64">
        <rect
          x="24"
          y="8"
          width="16"
          height="30"
          rx="8"
          fill="none"
          stroke={color}
          strokeWidth="4"
        />
        <path
          d="M14 32 a18 18 0 0 0 36 0 M32 50 v8 M22 58 h20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "clipboard") {
    return (
      <svg width={s} height={s} viewBox="0 0 64 64">
        <rect
          x="14"
          y="10"
          width="36"
          height="46"
          rx="6"
          fill="none"
          stroke={color}
          strokeWidth="4"
        />
        <rect
          x="24"
          y="4"
          width="16"
          height="10"
          rx="3"
          fill="none"
          stroke={color}
          strokeWidth="4"
        />
        <path
          d="M22 28 h20 M22 38 h20 M22 48 h12"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path
        d="M4 32 C 16 14 48 14 60 32 C 48 50 16 50 4 32 Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
      />
      <circle
        cx="32"
        cy="32"
        r="9"
        fill="none"
        stroke={color}
        strokeWidth="4"
      />
    </svg>
  );
};

/**
 * The siphon: mono items rising from a source point toward off-frame
 * (the leak). Deterministic per-item timing; items fade as they ascend.
 */
export const SiphonStream: React.FC<{
  items: readonly string[];
  x: number;
  y: number;
  startAt: number;
  rise?: number;
  spread?: number;
  color?: string;
  fontSize?: number;
  period?: number;
}> = ({
  items,
  x,
  y,
  startAt,
  rise = 460,
  spread = 120,
  color = cold.leak,
  fontSize = 21,
  period = 26,
}) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  return (
    <div
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      {items.map((item, i) => {
        const begin = startAt + i * period;
        const p = interpolate(frame - begin, [0, 56], [0, 1], {
          easing: Easing.in(Easing.quad),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (frame < begin || p >= 1) return null;
        const dx = Math.sin(i * 2.4) * spread * p;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dx,
              top: y - p * rise,
              fontFamily: t.fonts.mono?.family,
              fontSize,
              color,
              opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
              whiteSpace: "nowrap",
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
};

/* ── Sanctuary world ───────────────────────────────────────────────────── */

/** The icon's rainbow spiral, drawing itself. */
export const SpiralMark: React.FC<{
  drawAt: number;
  size?: number;
  durationInFrames?: number;
  glow?: number;
}> = ({ drawAt, size = 160, durationInFrames = 28, glow = 0 }) => {
  const frame = useCurrentFrame();
  const LEN = 420;
  const p = interpolate(frame - drawAt, [0, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < drawAt) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      style={{
        filter:
          glow > 0.03
            ? `drop-shadow(0 0 ${glow * 26}px rgba(245,158,11,0.7))`
            : undefined,
      }}
    >
      <defs>
        <linearGradient id="granipa-spiral" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={spiral.a} />
          <stop offset="50%" stopColor={spiral.b} />
          <stop offset="100%" stopColor={spiral.c} />
        </linearGradient>
      </defs>
      <path
        d="M 86 30 C 118 38 132 66 124 92 C 116 118 88 130 64 122 C 40 114 30 88 38 66 C 46 44 68 36 84 44 C 100 52 106 70 98 84 C 90 98 72 100 64 90"
        fill="none"
        stroke="url(#granipa-spiral)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={LEN}
        strokeDashoffset={(1 - p) * LEN}
      />
    </svg>
  );
};

/** Rounded Mac display silhouette; children render on its screen. */
export const MacFrame: React.FC<{
  width?: number;
  children?: React.ReactNode;
  glow?: number;
}> = ({ width = 980, children, glow = 0 }) => {
  const h = width * 0.64;
  return (
    <div style={{ width, position: "relative" }}>
      <div
        style={{
          width,
          height: h,
          borderRadius: 22,
          background: "#0C0A07",
          border: "2px solid rgba(244,240,230,0.16)",
          overflow: "hidden",
          boxShadow: `0 40px 90px rgba(0,0,0,0.6), 0 0 ${glow * 70}px rgba(245,158,11,${glow * 0.35})`,
          position: "relative",
        }}
      >
        {children}
      </div>
      <div
        style={{
          width: width * 0.12,
          height: 14,
          margin: "0 auto",
          background: "#0C0A07",
          borderRadius: "0 0 8px 8px",
        }}
      />
    </div>
  );
};

export const FeatureChip: React.FC<{
  icon: string;
  label: string;
  sub?: string;
  popAt: number;
  width?: number;
}> = ({ icon, label, sub, popAt, width = 430 }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  if (frame < popAt) return null;
  const p = interpolate(frame - popAt, [0, 8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flare = Math.exp(-(frame - popAt) / 9);
  return (
    <div
      style={{
        width,
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: "#1D1913",
        border: `1px solid rgba(245,158,11,${0.18 + flare * 0.4})`,
        borderRadius: 16,
        padding: "20px 24px",
        transform: `scale(${0.92 + p * 0.08}) translateY(${(1 - p) * 18}px)`,
        opacity: p,
        boxShadow: `0 18px 44px rgba(0,0,0,0.45), 0 0 ${flare * 34}px rgba(245,158,11,${flare * 0.3})`,
      }}
    >
      <span style={{ fontSize: 36 }}>{icon}</span>
      <div>
        <div
          style={{
            fontFamily: t.fonts.body.family,
            fontWeight: 700,
            fontSize: 27,
            color: t.palette.text,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: t.fonts.mono?.family,
              fontSize: 17,
              color: t.palette.textDim,
              marginTop: 4,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

/** A folder card for the sovereignty beat. */
export const FolderCard: React.FC<{
  label: string;
  sub: string;
  glow?: number;
}> = ({ label, sub, glow = 0 }) => {
  const t = useTheme();
  return (
    <div style={{ position: "relative", width: 460 }}>
      <svg width="460" height="320" viewBox="0 0 460 320">
        <path
          d="M16 60 Q16 44 32 44 L150 44 L178 72 L428 72 Q444 72 444 88 L444 288 Q444 304 428 304 L32 304 Q16 304 16 288 Z"
          fill="#1D1913"
          stroke={`rgba(245,158,11,${0.25 + glow * 0.5})`}
          strokeWidth="2.5"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          paddingTop: 30,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.body.family,
            fontWeight: 700,
            fontSize: 34,
            color: t.palette.text,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: t.fonts.mono?.family,
            fontSize: 21,
            color: t.palette.textDim,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
};
