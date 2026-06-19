import type { CalculateMetadataFunction } from "remotion";
import { AbsoluteFill, Sequence } from "remotion";
import { Grain, Vignette } from "../../lib/Grain";
import { ThemeProvider } from "../../lib/theme";
import { granipaTheme } from "./theme";
import { granipaTimeline } from "./timeline";
import { Architecture } from "./scenes/Architecture";
import { Cta } from "./scenes/Cta";
import { Features } from "./scenes/Features";
import { Gutpunch } from "./scenes/Gutpunch";
import { Hook } from "./scenes/Hook";
import { Indict } from "./scenes/Indict";
import { Kicker } from "./scenes/Kicker";
import { Reveal } from "./scenes/Reveal";
import { Sovereignty } from "./scenes/Sovereignty";

type SceneProps = { moment?: number };

const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: Hook,
  indict: Indict,
  gutpunch: Gutpunch,
  reveal: Reveal,
  features: Features,
  architecture: Architecture,
  sovereignty: Sovereignty,
  kicker: Kicker,
  cta: Cta,
};

export type GranipaFrameProps = {
  scene: string;
  frame?: number;
  moment?: number;
  /** true → comp duration = the scene's timeline duration (filmstrip-able). */
  strip?: boolean;
};

const sceneDuration = (scene: string): number => {
  const timing =
    granipaTimeline.scenes[scene as keyof typeof granipaTimeline.scenes];
  return timing ? timing.durationInFrames : 1;
};

export const calculateGranipaFrameMetadata: CalculateMetadataFunction<
  GranipaFrameProps
> = ({ props }) => ({
  durationInFrames: props.strip ? sceneDuration(props.scene) : 1,
});

/**
 * Review harness: mounts ONE scene without transitions or siblings.
 *   Frozen still:  --props='{"scene":"reveal","frame":90}'
 *   Motion strip:  --props='{"scene":"reveal","strip":true}' (use with
 *   scripts/filmstrip.sh GranipaFrame <step> <props> <outName>)
 */
export const GranipaFrame: React.FC<GranipaFrameProps> = ({
  scene,
  frame = 0,
  moment,
  strip = false,
}) => {
  const SceneComp = SCENES[scene];
  if (!SceneComp) {
    throw new Error(
      `Unknown scene "${scene}" — one of: ${Object.keys(SCENES).join(", ")}`,
    );
  }
  return (
    <ThemeProvider value={granipaTheme}>
      <AbsoluteFill style={{ background: granipaTheme.palette.bg }}>
        {strip ? (
          <SceneComp moment={moment} />
        ) : (
          <Sequence from={-frame} layout="none">
            <SceneComp moment={moment} />
          </Sequence>
        )}
        <Grain opacity={granipaTheme.texture.grainOpacity} />
        <Vignette strength={granipaTheme.texture.vignette} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
