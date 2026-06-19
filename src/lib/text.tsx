/**
 * Staggered text reveals and measured text fitting — the genuinely fiddly
 * text mechanics. Taste (curves, distances, timing) comes in via props.
 *
 * For typewriter effects, use string slicing per the official
 * remotion-best-practices text-animations rule — not these components.
 */

import { fitText } from "@remotion/layout-utils";
import { Easing, interpolate, useCurrentFrame } from "remotion";

type StaggerTiming = {
  /** Frame (scene-local) at which the first unit starts entering. */
  startFrame?: number;
  /** Delay between consecutive units, in frames. */
  staggerFrames?: number;
  /** Enter duration per unit, in frames. */
  enterFrames?: number;
  easing?: (t: number) => number;
};

const defaultEasing = Easing.bezier(0.16, 1, 0.3, 1);

const useStaggerProgress = ({
  startFrame = 0,
  staggerFrames = 3,
  enterFrames = 12,
  easing = defaultEasing,
}: StaggerTiming) => {
  const frame = useCurrentFrame();
  return (index: number): number =>
    interpolate(
      frame - startFrame - index * staggerFrames,
      [0, enterFrames],
      [0, 1],
      {
        easing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
};

export type UnitRender = (
  unit: string,
  progress: number,
  index: number,
) => React.ReactNode;

const defaultRender: UnitRender = (unit, progress) => (
  <span
    style={{
      display: "inline-block",
      opacity: progress,
      transform: `translateY(${(1 - progress) * 0.35}em)`,
    }}
  >
    {unit}
  </span>
);

export const WordReveal: React.FC<
  StaggerTiming & {
    text: string;
    style?: React.CSSProperties;
    /** Override how each word maps progress → pixels. */
    renderWord?: UnitRender;
  }
> = ({ text, style, renderWord = defaultRender, ...timing }) => {
  const progressOf = useStaggerProgress(timing);
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        columnGap: "0.3em",
        ...style,
      }}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} style={{ display: "inline-block" }}>
          {renderWord(word, progressOf(i), i)}
        </span>
      ))}
    </span>
  );
};

export const CharReveal: React.FC<
  StaggerTiming & {
    text: string;
    style?: React.CSSProperties;
    renderChar?: UnitRender;
  }
> = ({ text, style, renderChar = defaultRender, ...timing }) => {
  const progressOf = useStaggerProgress(timing);
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
      {[...text].map((char, i) => (
        <span key={i} style={{ display: "inline-block", whiteSpace: "pre" }}>
          {renderChar(char, progressOf(i), i)}
        </span>
      ))}
    </span>
  );
};

/**
 * Renders text at the largest font size that fits `withinWidth`.
 * The font must already be loaded (loadFont at module top level).
 */
export const FitText: React.FC<{
  text: string;
  withinWidth: number;
  fontFamily: string;
  fontWeight?: number | string;
  letterSpacing?: string;
  maxFontSize?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  withinWidth,
  fontFamily,
  fontWeight,
  letterSpacing,
  maxFontSize,
  style,
}) => {
  const { fontSize } = fitText({
    text,
    withinWidth,
    fontFamily,
    fontWeight: fontWeight === undefined ? undefined : String(fontWeight),
    letterSpacing,
  });
  return (
    <div
      style={{
        fontFamily,
        fontWeight,
        letterSpacing,
        fontSize:
          maxFontSize === undefined
            ? fontSize
            : Math.min(fontSize, maxFontSize),
        ...style,
      }}
    >
      {text}
    </div>
  );
};
