/**
 * Real-capture staging mechanics (see capture.md): camera over screenshot
 * pixels, pointer, and a theme-driven lower-third. Coordinates are in the
 * CAPTURE's pixel space (typically 2×) — pass `pixelScale` to map to canvas.
 */

import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Img } from "remotion";
import { useTheme } from "./theme";

export type CameraKeyframe = {
  frame: number;
  /** Focus point in capture pixels — lands at the stage center. */
  x: number;
  y: number;
  /** Zoom relative to the natural displayed size. */
  zoom: number;
};

/**
 * Mounts a capture and drives a camera between focus keyframes.
 * The stage fills its parent; place inside a sized container.
 */
export const ScreenStage: React.FC<{
  src: string;
  /** Natural capture size in pixels (e.g. 3200×2000 for 1600×1000@2x). */
  imgWidth: number;
  imgHeight: number;
  /** Canvas pixels per capture pixel at zoom 1 (0.5 for 2× captures). */
  pixelScale?: number;
  camera: readonly CameraKeyframe[];
  /** Stage size — defaults to the full 1920×1080 frame. */
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({
  src,
  imgWidth,
  imgHeight,
  pixelScale = 0.5,
  camera,
  width = 1920,
  height = 1080,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.45, 0, 0.25, 1);
  const frames = camera.map((k) => k.frame);
  const at = (sel: (k: CameraKeyframe) => number) =>
    camera.length === 1
      ? sel(camera[0]!)
      : interpolate(frame, frames, camera.map(sel), {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const fx = at((k) => k.x);
  const fy = at((k) => k.y);
  const zoom = at((k) => k.zoom);
  const s = zoom * pixelScale;

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          transform: `translate(${width / 2 - fx * s}px, ${height / 2 - fy * s}px) scale(${s})`,
          transformOrigin: "0 0",
        }}
      >
        <Img
          src={src}
          style={{ width: imgWidth, height: imgHeight, display: "block" }}
        />
        {/* Overlays positioned in capture pixel space ride the same camera. */}
        {children}
      </div>
    </div>
  );
};

/** Small mouse cursor gliding between waypoints with press states. */
export const PointerCursor: React.FC<{
  /** [frame, x, y] keyframes in the coordinate space of its parent. */
  path: readonly (readonly [number, number, number])[];
  pressAt?: readonly number[];
  /** Scale multiplier (use 2 inside 2× capture space). */
  size?: number;
}> = ({ path, pressAt = [], size = 1 }) => {
  const frame = useCurrentFrame();
  const frames = path.map((p) => p[0]);
  const ease = Easing.bezier(0.45, 0, 0.25, 1);
  const x = interpolate(
    frame,
    frames,
    path.map((p) => p[1]),
    {
      easing: ease,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const y = interpolate(
    frame,
    frames,
    path.map((p) => p[2]),
    {
      easing: ease,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  let press = 1;
  for (const pf of pressAt) {
    if (frame >= pf && frame <= pf + 8) {
      press = frame <= pf + 3 ? 0.82 : 0.82 + ((frame - pf - 3) / 5) * 0.18;
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${press * size})`,
        transformOrigin: "top left",
        zIndex: 40,
      }}
    >
      <svg width="30" height="34" viewBox="0 0 30 34">
        <path
          d="M3 1 L3 25 L9.5 19.5 L13.5 29 L17.5 27.2 L13.6 18 L22 17.5 Z"
          fill="#FFFFFF"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1.6"
        />
      </svg>
    </div>
  );
};

/** Scene claim, lower-third, on a scrim pill. Colors/fonts from the theme. */
export const LowerThird: React.FC<{
  text: string;
  startFrame?: number;
}> = ({ text, startFrame = 6 }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, 14], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        bottom: 84,
        overflow: "hidden",
        paddingBottom: 6,
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontFamily: t.fonts.display.family,
          fontWeight: t.fonts.display.weight,
          fontSize: 44,
          letterSpacing: "-0.015em",
          color: t.palette.text,
          background: "rgba(8, 11, 22, 0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          padding: "12px 26px",
          transform: `translateY(${(1 - p) * 110}%)`,
          opacity: p,
        }}
      >
        {text}
      </div>
    </div>
  );
};
