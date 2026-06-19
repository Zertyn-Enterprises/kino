import { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/**
 * Animated film grain. Re-seeds the noise every frame so it shimmers like
 * real grain instead of looking like a static texture.
 */
export const Grain: React.FC<{
  opacity?: number;
  blend?: React.CSSProperties["mixBlendMode"];
  animated?: boolean;
}> = ({ opacity = 0.05, blend = "overlay", animated = true }) => {
  const frame = useCurrentFrame();
  const filterId = useId();
  const seed = animated ? (frame % 997) + 1 : 1;
  if (opacity <= 0) {
    return null;
  }
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", mixBlendMode: blend, opacity }}
    >
      <svg width="100%" height="100%">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Soft edge darkening. Strength 0–1 from the theme's texture tokens. */
export const Vignette: React.FC<{ strength?: number }> = ({
  strength = 0.3,
}) => {
  if (strength <= 0) {
    return null;
  }
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
};
