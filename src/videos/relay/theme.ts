import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { SPRING } from "../../lib/springs";
import { defineTheme } from "../../lib/theme";

const display = loadDisplay("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});
const mono = loadMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

/**
 * Relay — terminal world. Lime = live/now (scarce, semantic), red = the
 * waiting world. Hard-cut grammar; filmic grain.
 */
export const relayTheme = defineTheme({
  name: "relay",
  palette: {
    bg: "#0A0E0B",
    surface: "#131A14",
    text: "#F2F5F0",
    textDim: "#8FA098",
    accent: "#B6F22E",
    accentAlt: "#E5484D",
  },
  fonts: {
    display: { family: display.fontFamily, weight: 700 },
    body: { family: display.fontFamily, weight: 500 },
    mono: { family: mono.fontFamily, weight: 400 },
  },
  radius: { sm: 6, md: 10, lg: 16 },
  motion: {
    springs: {
      snap: SPRING.snap,
      settle: SPRING.settle,
      dramatic: SPRING.heavy,
    },
    enterFrames: 12,
    staggerFrames: 4,
    holdFrames: 14,
  },
  texture: { grainOpacity: 0.05, vignette: 0.3 },
});

/** Norra — the fictional product being previewed. Its own brand, not Relay's. */
export const norra = {
  paper: "#F5F1E8",
  paperAlt: "#DCE5DA",
  ink: "#1E1B16",
  inkSoft: "#6B645A",
  terracotta: "#C26D4B",
};
