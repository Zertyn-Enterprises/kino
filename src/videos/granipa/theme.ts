import { SPRING } from "../../lib/springs";
import { defineTheme } from "../../lib/theme";
import { DISPLAY, MONO, TEXT } from "./fonts";

/**
 * Grañipa v3 — design lock (quality.md stage B).
 *
 * Everything flows from the REAL icon (public/granipa/brand/icon.png): a
 * dark tile split into a charcoal panel and a blue window, crossed by ONE
 * spiral gradient coral → violet → blue. The video's two worlds are the
 * icon's two panels: the indictment lives in the charcoal world and may
 * only use the gradient's coral end as danger; the sanctuary lives in the
 * blue-window world with the violet→blue end as home. The full gradient
 * appears only on/around the logo, and as gradient text at most once.
 */

// ---- color (extracted from the icon file — never invented) ----
export const ink = {
  coldBg: "#0A0B0E",
  warmBg: "#0C0F17",
  surface: "#14161D",
  surfaceUp: "#1B1E27",
  border: "rgba(255,255,255,0.08)",
  text: "#F1F2F6",
  dim: "#8E93A3",
  faint: "#5A5F6E",
} as const;

export const brand = {
  coral: "#F4604C",
  violet: "#A05BF0",
  blue: "#3D8BFF",
  gradient: "linear-gradient(115deg, #F4604C 0%, #A05BF0 48%, #3D8BFF 100%)",
} as const;

// ---- type ladder (the ONLY text styles allowed in any scene) ----
export const type = {
  /** Display blowup — numerals/wordmark moments only, max twice per video. */
  xl: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 210,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  hero: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 112,
    lineHeight: 1.04,
    letterSpacing: "-0.015em",
  },
  h2: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 76,
    lineHeight: 1.06,
    letterSpacing: "-0.012em",
  },
  statement: {
    fontFamily: DISPLAY,
    fontWeight: 500,
    fontSize: 54,
    lineHeight: 1.16,
    letterSpacing: "-0.008em",
  },
  body: {
    fontFamily: TEXT,
    fontWeight: 400,
    fontSize: 34,
    lineHeight: 1.35,
    letterSpacing: "0em",
  },
  label: {
    fontFamily: TEXT,
    fontWeight: 600,
    fontSize: 23,
    lineHeight: 1.2,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
  },
  caption: {
    fontFamily: TEXT,
    fontWeight: 400,
    fontSize: 24,
    lineHeight: 1.3,
    letterSpacing: "0.01em",
  },
  mono: {
    fontFamily: MONO,
    fontWeight: 400,
    fontSize: 24,
    lineHeight: 1.45,
    letterSpacing: "0em",
  },
} as const;

// ---- 12-col grid (1920×1080) ----
const MARGIN = 120;
const GUTTER = 24;
const COL_W = (1920 - MARGIN * 2 - GUTTER * 11) / 12; // 118

export const grid = {
  margin: MARGIN,
  gutter: GUTTER,
  cols: 12,
  colW: COL_W,
  /** Left edge of a 0-based column index. */
  x: (col: number) => MARGIN + col * (COL_W + GUTTER),
  /** Pixel width of a span of n columns. */
  w: (span: number) => span * COL_W + (span - 1) * GUTTER,
  safeTop: 90,
  safeBottom: 90,
} as const;

/** Spacing scale — the only gaps/paddings allowed. */
export const space = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;

export const granipaTheme = defineTheme({
  name: "granipa-v3",
  palette: {
    bg: ink.coldBg,
    surface: ink.surface,
    text: ink.text,
    textDim: ink.dim,
    accent: brand.blue,
    accentAlt: brand.coral,
  },
  fonts: {
    display: { family: DISPLAY, weight: 700 },
    body: { family: TEXT, weight: 400 },
    mono: { family: MONO, weight: 400 },
  },
  radius: { sm: 10, md: 14, lg: 22 },
  motion: {
    springs: {
      snap: SPRING.snap,
      settle: SPRING.settle,
      dramatic: SPRING.heavy,
    },
    enterFrames: 14,
    staggerFrames: 4,
    holdFrames: 18,
  },
  texture: { grainOpacity: 0.04, vignette: 0.28 },
});

// ---- v2 compatibility (DELETE when the last v2 scene is rebuilt) ----
export const cold = {
  bg: ink.coldBg,
  surface: ink.surface,
  text: ink.text,
  dim: ink.dim,
  leak: brand.coral,
  border: ink.border,
};
export const spiral = {
  a: brand.coral,
  b: brand.violet,
  c: brand.blue,
  gradient: brand.gradient,
};
