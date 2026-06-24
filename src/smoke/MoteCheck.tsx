/**
 * Gate-pass fixture for MoteField. Engineered to satisfy the hook
 * background-activity gate (gate 4: active≥2, separated=true) and the
 * frame-0 liveness gate (gate 5: cells≥2, rows≥2) — smoke proof for the
 * MoteField ambient-motif component. density=160 ensures enough per-cell
 * mote coverage for gate-4 activity (≥2 separated cells with Δlum>5).
 *
 * Run: scripts/hook.sh MoteCheck
 */

import { AbsoluteFill } from "remotion";
import { MoteField } from "../lib/fx";

export const MoteCheck: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12" }}>
    <MoteField
      color="#7effc9"
      colorDim="#2a8a60"
      density={160}
      energy={1.5}
      seed="mc"
    />
  </AbsoluteFill>
);
