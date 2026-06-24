/**
 * Gate-pass fixture for GridPulse. Engineered to satisfy the hook
 * background-activity gate (gate 4: active≥2, separated=true) and the
 * frame-0 liveness gate (gate 5: cells≥2, rows≥2) — smoke proof for the
 * GridPulse ambient-motif component.
 *
 * Run: scripts/hook.sh GridPulseCheck
 */

import { AbsoluteFill } from "remotion";
import { GridPulse } from "../lib/fx";

export const GridPulseCheck: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12" }}>
    <GridPulse
      color="#7effc9"
      colorDim="#2a8a60"
      density={40}
      energy={1.5}
      seed="gpc"
    />
  </AbsoluteFill>
);
