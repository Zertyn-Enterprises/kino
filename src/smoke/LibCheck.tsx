/**
 * Integration check for the spine library: timeline-driven TransitionSeries,
 * theme context, text reveals, music ducking, beat-anchored SFX, grain,
 * device frame, and light leak — all in 12 seconds. Also the demo target for
 * scripts/filmstrip.sh.
 */

import { loadFont } from "@remotion/google-fonts/Inter";
import { LightLeak } from "@remotion/light-leaks";
import { Video } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { MusicBed, Sfx } from "../lib/audio";
import { DebugGrid } from "../lib/DebugGrid";
import { DeviceFrame } from "../lib/DeviceFrame";
import { Grain, Vignette } from "../lib/Grain";
import { SPRING } from "../lib/springs";
import { CharReveal, FitText, WordReveal } from "../lib/text";
import { defineTheme, ThemeProvider, useTheme } from "../lib/theme";
import { buildTimeline } from "../lib/timeline";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const libCheckTimeline = buildTimeline({ fps: 30, bpm: 120 }, [
  { id: "intro", beats: 8, transitionAfterBeats: 1 },
  { id: "demo", beats: 8, transitionAfterBeats: 1 },
  { id: "outro", beats: 8 },
] as const);

const theme = defineTheme({
  name: "libcheck",
  palette: {
    bg: "#0b0d12",
    surface: "#151823",
    text: "#f2f4f8",
    textDim: "#8b93a7",
    accent: "#5eead4",
  },
  fonts: {
    display: { family: fontFamily, weight: 700 },
    body: { family: fontFamily, weight: 400 },
  },
  radius: { sm: 8, md: 14, lg: 24 },
  motion: {
    springs: {
      snap: SPRING.snap,
      settle: SPRING.settle,
      dramatic: SPRING.heavy,
    },
    enterFrames: 12,
    staggerFrames: 3,
    holdFrames: 12,
  },
  texture: { grainOpacity: 0.06, vignette: 0.35 },
});

const Intro: React.FC = () => {
  const t = useTheme();
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 1300 }}>
        <WordReveal
          text="Every system needs a spine."
          startFrame={4}
          staggerFrames={t.motion.staggerFrames}
          enterFrames={t.motion.enterFrames}
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 108,
            color: t.palette.text,
            justifyContent: "center",
          }}
        />
        <div style={{ marginTop: 30 }}>
          <CharReveal
            text="timeline · theme · text · audio"
            startFrame={28}
            staggerFrames={1}
            enterFrames={10}
            style={{
              fontFamily: t.fonts.body.family,
              fontSize: 36,
              color: t.palette.textDim,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Demo: React.FC = () => {
  const local = useCurrentFrame();
  const scale = 1 + local * 0.0008;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${scale})` }}>
        <DeviceFrame label="app.libcheck.dev" width={1100} chrome="dark">
          <Video
            src={staticFile("smoke/clip.mp4")}
            style={{ width: "100%", display: "block" }}
            muted
          />
        </DeviceFrame>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const t = useTheme();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <FitText
        text="LibCheck passed"
        withinWidth={900}
        fontFamily={t.fonts.display.family}
        fontWeight={t.fonts.display.weight}
        style={{ color: t.palette.accent }}
      />
      <LightLeak durationInFrames={60} seed={3} hueShift={160} />
    </AbsoluteFill>
  );
};

export const LibCheck: React.FC<{ debug?: boolean }> = ({ debug = false }) => {
  const tl = libCheckTimeline;
  return (
    <ThemeProvider value={theme}>
      <AbsoluteFill style={{ background: theme.palette.bg }}>
        <TransitionSeries>
          <TransitionSeries.Sequence
            durationInFrames={tl.scenes.intro.durationInFrames}
          >
            <Intro />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({
              durationInFrames: tl.scenes.intro.transitionAfterFrames,
            })}
          />
          <TransitionSeries.Sequence
            durationInFrames={tl.scenes.demo.durationInFrames}
          >
            <Demo />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({
              durationInFrames: tl.scenes.demo.transitionAfterFrames,
            })}
          />
          <TransitionSeries.Sequence
            durationInFrames={tl.scenes.outro.durationInFrames}
          >
            <Outro />
          </TransitionSeries.Sequence>
        </TransitionSeries>
        <MusicBed
          src={staticFile("smoke/tone.wav")}
          volume={0.18}
          fadeInFrames={10}
          fadeOutFrames={30}
          ducks={[
            {
              from: tl.scenes.demo.from,
              to: tl.scenes.demo.cutFrame,
              level: 0.4,
            },
          ]}
        />
        <Sfx
          src="https://remotion.media/whoosh.wav"
          at={tl.scenes.intro.cutFrame - 4}
          volume={0.5}
        />
        <Sfx
          src="https://remotion.media/whoosh.wav"
          at={tl.scenes.demo.cutFrame - 4}
          volume={0.5}
        />
        <Grain opacity={theme.texture.grainOpacity} />
        <Vignette strength={theme.texture.vignette} />
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
