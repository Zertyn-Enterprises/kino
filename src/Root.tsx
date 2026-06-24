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
import { MoteCheck } from "./smoke/MoteCheck";
import { GridPulseCheck } from "./smoke/GridPulseCheck";
import { EmberRiseCheck } from "./smoke/EmberRiseCheck";
import { Hook01MidActionDemo } from "./smoke/hooks/Hook01MidActionDemo";
import { Hook02BoldClaim } from "./smoke/hooks/Hook02BoldClaim";
import { Hook04PatternInterrupt } from "./smoke/hooks/Hook04PatternInterrupt";
import { Hook05NumberCounting } from "./smoke/hooks/Hook05NumberCounting";
import { Hook06PayoffFlashForward } from "./smoke/hooks/Hook06PayoffFlashForward";
import { Hook08MultiLayerLiveDemo } from "./smoke/hooks/Hook08MultiLayerLiveDemo";
import { SmokeClip } from "./smoke/SmokeClip";
import { SmokeTest } from "./smoke/SmokeTest";

import { SerenoLaunch } from "./videos/sereno/Main";
import { serenoTimeline } from "./videos/sereno/timeline";

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
      <Composition
        id="MoteCheck"
        component={MoteCheck}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="GridPulseCheck"
        component={GridPulseCheck}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EmberRiseCheck"
        component={EmberRiseCheck}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Hook01MidActionDemo"
        component={Hook01MidActionDemo}
        durationInFrames={75}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Hook02BoldClaim"
        component={Hook02BoldClaim}
        durationInFrames={75}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Hook04PatternInterrupt"
        component={Hook04PatternInterrupt}
        durationInFrames={75}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Hook05NumberCounting"
        component={Hook05NumberCounting}
        durationInFrames={75}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Hook06PayoffFlashForward"
        component={Hook06PayoffFlashForward}
        durationInFrames={75}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Hook08MultiLayerLiveDemo"
        component={Hook08MultiLayerLiveDemo}
        durationInFrames={75}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SerenoLaunch"
        component={SerenoLaunch}
        durationInFrames={serenoTimeline.totalDurationInFrames}
        fps={serenoTimeline.fps}
        width={1920}
        height={1080}
        defaultProps={{ debug: false }}
      />
    </>
  );
};
