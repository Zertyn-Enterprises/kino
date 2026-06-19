/**
 * Per-video visual + motion identity. The library has no default theme on
 * purpose: every video must define its own, fully. Components read tokens
 * from context and never bake in their own colors, durations, or curves.
 */

import { createContext, useContext } from "react";
import type { SpringPhysics } from "./springs";

export type FontSpec = {
  family: string;
  weight: number;
};

export type Theme = {
  name: string;
  palette: {
    bg: string;
    surface: string;
    text: string;
    textDim: string;
    accent: string;
    /** Optional second accent for palettes that earn one. */
    accentAlt?: string;
  };
  fonts: {
    display: FontSpec;
    body: FontSpec;
    mono?: FontSpec;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
  motion: {
    springs: {
      snap: SpringPhysics;
      settle: SpringPhysics;
      dramatic: SpringPhysics;
    };
    /** Typical enter animation length, in frames. */
    enterFrames: number;
    /** Delay between staggered siblings, in frames. */
    staggerFrames: number;
    /** Minimum hold after a reveal before anything else moves, in frames. */
    holdFrames: number;
  };
  texture: {
    grainOpacity: number;
    /** 0 = none, 1 = heavy edge darkening. */
    vignette: number;
  };
};

export const defineTheme = (theme: Theme): Theme => theme;

const ThemeContext = createContext<Theme | null>(null);

export const ThemeProvider = ThemeContext.Provider;

export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error(
      "useTheme must be used inside a <ThemeProvider value={...}>",
    );
  }
  return theme;
};
