/**
 * Spring physics vocabulary. Themes pick from these (or define their own) —
 * components must never hardcode one.
 */

export type SpringPhysics = {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
};

export const SPRING = {
  /** Fast, no overshoot. UI elements snapping into place. */
  snap: { damping: 200 },
  /** Quick with a small overshoot. Emphasis pops. */
  pop: { damping: 14, stiffness: 160, mass: 0.6 },
  /** Calm settle with a hint of overshoot. Editorial reveals. */
  settle: { damping: 26, stiffness: 80 },
  /** Slow and weighty. Hero moments. */
  heavy: { damping: 34, stiffness: 50, mass: 1.4 },
} satisfies Record<string, SpringPhysics>;
