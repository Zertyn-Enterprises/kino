import { Composition } from "remotion";
import {
  ContactSheet,
  calculateContactSheetMetadata,
} from "./review/ContactSheet";
import { LibCheck, libCheckTimeline } from "./smoke/LibCheck";
import { DesignLock } from "./videos/granipa/DesignLock";
import {
  GranipaFrame,
  calculateGranipaFrameMetadata,
} from "./videos/granipa/Frame";
import { GranipaLaunch } from "./videos/granipa/Main";
import { granipaTimeline } from "./videos/granipa/timeline";
import { RelayLaunch } from "./videos/relay/Main";
import { relayTimeline } from "./videos/relay/timeline";
import { AmbientCheck } from "./smoke/AmbientCheck";
import { SmokeClip } from "./smoke/SmokeClip";
import { SmokeTest } from "./smoke/SmokeTest";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GranipaLaunch"
        component={GranipaLaunch}
        durationInFrames={granipaTimeline.totalDurationInFrames}
        fps={granipaTimeline.fps}
        width={1920}
        height={1080}
        defaultProps={{ debug: false }}
      />
      <Composition
        id="GranipaFrame"
        component={GranipaFrame}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ scene: "reveal", frame: 0, moment: 0, strip: false }}
        calculateMetadata={calculateGranipaFrameMetadata}
      />
      <Composition
        id="GranipaDesignLock"
        component={DesignLock}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RelayLaunch"
        component={RelayLaunch}
        durationInFrames={relayTimeline.totalDurationInFrames}
        fps={relayTimeline.fps}
        width={1920}
        height={1080}
        defaultProps={{ debug: false }}
      />
      <Composition
        id="LibCheck"
        component={LibCheck}
        durationInFrames={libCheckTimeline.totalDurationInFrames}
        fps={libCheckTimeline.fps}
        width={1920}
        height={1080}
        defaultProps={{ debug: false }}
      />
      <Composition
        id="ContactSheet"
        component={ContactSheet}
        durationInFrames={1}
        fps={1}
        width={2880}
        height={1480}
        defaultProps={{ folder: "review-tmp/LibCheck", frames: [], files: [] }}
        calculateMetadata={calculateContactSheetMetadata}
      />
      <Composition
        id="SmokeTest"
        component={SmokeTest}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SmokeClip"
        component={SmokeClip}
        durationInFrames={300}
        fps={30}
        width={640}
        height={360}
      />
      <Composition
        id="AmbientCheck"
        component={AmbientCheck}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
