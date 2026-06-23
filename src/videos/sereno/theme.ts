import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/DMSans";
import { SPRING } from "../../lib/springs";
import { defineTheme } from "../../lib/theme";

const display = loadDisplay("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const body = loadBody("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

export const serenoTheme = defineTheme({
  name: "sereno",
  palette: {
    bg: "#F7F5F0",
    surface: "#EDEAE2",
    text: "#1C1917",
    textDim: "#625E5B",
    accent: "#3F6D50",
  },
  fonts: {
    display: { family: display.fontFamily, weight: 700 },
    body: { family: body.fontFamily, weight: 400 },
  },
  radius: { sm: 4, md: 8, lg: 16 },
  motion: {
    springs: {
      snap: SPRING.snap,
      settle: SPRING.settle,
      dramatic: SPRING.heavy,
    },
    enterFrames: 24,
    staggerFrames: 8,
    holdFrames: 18,
  },
  texture: { grainOpacity: 0, vignette: 0 },
});
