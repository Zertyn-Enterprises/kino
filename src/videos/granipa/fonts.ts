// Vendored faces (quality.md stage B). Sentient + Switzer from Fontshare
// (ITF Free Font License), JetBrains Mono (OFL-1.1). loadFont blocks the
// render internally via delayRender — module-level calls are the pattern.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const DISPLAY = "Sentient";
export const TEXT = "Switzer";
export const MONO = "JetBrains Mono";

void loadFont({
  family: DISPLAY,
  url: staticFile("fonts/Sentient-Medium.woff2"),
  weight: "500",
});
void loadFont({
  family: DISPLAY,
  url: staticFile("fonts/Sentient-Bold.woff2"),
  weight: "700",
});
void loadFont({
  family: TEXT,
  url: staticFile("fonts/Switzer-Regular.woff2"),
  weight: "400",
});
void loadFont({
  family: TEXT,
  url: staticFile("fonts/Switzer-Semibold.woff2"),
  weight: "600",
});
void loadFont({
  family: MONO,
  url: staticFile("fonts/JetBrainsMono-Regular.woff2"),
  weight: "400",
});
