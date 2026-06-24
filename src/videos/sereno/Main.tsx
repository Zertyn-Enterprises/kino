import { AbsoluteFill, Sequence } from "remotion";
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { serenoTheme } from "./theme";
import { serenoTimeline } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Feature1 } from "./scenes/Feature1";
import { Feature2 } from "./scenes/Feature2";
import { Cta } from "./scenes/Cta";

const sc = serenoTimeline.scenes;

export const SerenoLaunch: React.FC<{ debug?: boolean }> = ({ debug = false }) => {
  return (
    <ThemeProvider value={serenoTheme}>
      <AbsoluteFill style={{ background: serenoTheme.palette.bg }}>
        <Sequence from={sc.hook.from} durationInFrames={sc.hook.durationInFrames}>
          <Hook />
        </Sequence>
        <Sequence from={sc.feature1.from} durationInFrames={sc.feature1.durationInFrames}>
          <Feature1 />
        </Sequence>
        <Sequence from={sc.feature2.from} durationInFrames={sc.feature2.durationInFrames}>
          <Feature2 />
        </Sequence>
        <Sequence from={sc.cta.from} durationInFrames={sc.cta.durationInFrames}>
          <Cta />
        </Sequence>
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
