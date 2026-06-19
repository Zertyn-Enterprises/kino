import { loadFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const { fontFamily } = loadFont("normal", { weights: ["700"] });

export const SmokeTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 200 } });
  const videoOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0b0d12 0%, #1a1040 100%)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Audio src={staticFile("smoke/tone.wav")} volume={0.2} />
      <h1
        style={{
          fontFamily,
          fontSize: 120,
          color: "#f5f7fa",
          transform: `scale(${titleScale})`,
          margin: 0,
        }}
      >
        Smoke test
      </h1>
      <p style={{ fontFamily, fontSize: 40, color: "#8b93a7" }}>
        frame {frame} / {durationInFrames}
      </p>
      <OffthreadVideo
        src={staticFile("smoke/clip.mp4")}
        style={{
          position: "absolute",
          right: 80,
          bottom: 80,
          width: 320,
          borderRadius: 16,
          opacity: videoOpacity,
        }}
        muted
      />
    </AbsoluteFill>
  );
};
