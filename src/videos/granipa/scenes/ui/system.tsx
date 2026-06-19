import { Img, staticFile } from "remotion";
import { brand, ink, type } from "../../theme";

/**
 * v3 system kit — the shared, brand-true building blocks every scene uses.
 * Replaces the v2 kit (emoji chips, SVG logo approximation) entirely.
 */

/** The REAL app icon file. Never approximate the mark. */
export const LogoTile: React.FC<{
  size: number;
  glow?: number;
  style?: React.CSSProperties;
}> = ({ size, glow = 0, style }) => (
  <Img
    src={staticFile("granipa/brand/icon.png")}
    style={{
      width: size,
      height: size,
      filter: glow
        ? `drop-shadow(0 0 ${Math.round(size * 0.3)}px rgba(160,91,240,${glow}))`
        : undefined,
      ...style,
    }}
  />
);

/** Rebuilt native macOS window chrome, matched to the app's real UI. */
export const MacWindow: React.FC<{
  title?: string;
  width: number;
  height: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title, width, height, children, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 16,
      background: "rgba(24,25,31,0.97)",
      border: `1px solid ${ink.border}`,
      boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    <div
      style={{
        height: 52,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 9,
        borderBottom: `1px solid ${ink.border}`,
        background: "rgba(255,255,255,0.025)",
      }}
    >
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <div
          key={c}
          style={{ width: 13, height: 13, borderRadius: 7, background: c }}
        />
      ))}
      {title ? (
        <div
          style={{
            ...type.caption,
            color: ink.dim,
            marginLeft: 12,
          }}
        >
          {title}
        </div>
      ) : null}
    </div>
    <div style={{ flex: 1, position: "relative" }}>{children}</div>
  </div>
);

/** Mono evidence chip — receipts ("granola — $14/mo", "sqlite + files"). */
export const ReceiptChip: React.FC<{
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ children, accent, style }) => (
  <div
    style={{
      ...type.mono,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      color: accent ?? ink.dim,
      background: ink.surface,
      border: `1px solid ${accent ? `${accent}55` : ink.border}`,
      borderRadius: 10,
      padding: "10px 18px",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Keyboard keycap for the app's real shortcuts (⌥⇧V, ⌥⇧T, ⌃⌥←). */
export const Kbd: React.FC<{
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 26, style }) => (
  <span
    style={{
      fontFamily: type.mono.fontFamily,
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1,
      color: ink.text,
      background: ink.surfaceUp,
      border: `1px solid ${ink.border}`,
      borderBottom: "2.5px solid rgba(255,255,255,0.14)",
      borderRadius: 9,
      padding: `${Math.round(size * 0.38)}px ${Math.round(size * 0.5)}px`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </span>
);

/** The one place the full brand gradient may color text (once per video). */
export const GradientText: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <span
    style={{
      background: brand.gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);
