/**
 * Gate-pass fixture for EmberRise. Engineered to satisfy the hook
 * background-activity gate (gate 4: active≥2, separated=true) and the
 * frame-0 liveness gate (gate 5: cells≥2, rows≥2) — smoke proof for the
 * EmberRise ambient-motif component. density=160 ensures sufficient per-cell
 * ember coverage for gate-4 activity (≥2 separated cells with Δlum>5).
 *
 * Run: scripts/hook.sh EmberRiseCheck
 */

import { AbsoluteFill } from "remotion";
import { EmberRise } from "../lib/fx";

export const EmberRiseCheck: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12" }}>
    <EmberRise
      color="#ff9a3c"
      colorDim="#a0520f"
      density={160}
      energy={1.5}
      seed="erc"
    />
  </AbsoluteFill>
);
