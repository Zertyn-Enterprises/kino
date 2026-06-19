import { TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, staticFile } from "remotion";
import { MusicBed, Sfx } from "../../lib/audio";
import { DebugGrid } from "../../lib/DebugGrid";
import { Grain, Vignette } from "../../lib/Grain";
import { ThemeProvider } from "../../lib/theme";
import { relayTheme } from "./theme";
import { relayTimeline } from "./timeline";
import { Climax } from "./scenes/Climax";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { ProofRollback } from "./scenes/ProofRollback";
import { ProofShare } from "./scenes/ProofShare";
import { ProofUrls } from "./scenes/ProofUrls";
import { Reveal } from "./scenes/Reveal";
import { Turn } from "./scenes/Turn";

const tl = relayTimeline;
const sc = tl.scenes;

// Audio is NOT bundled in this open-source repo: the original music + SFX were
// ElevenLabs-generated and aren't redistributable. Drop your own files at the
// public/relay/ paths referenced below (or regenerate via scripts/gen-music.mjs
// and scripts/gen-sfx.mjs with your own ELEVENLABS_API_KEY) and flip this to true.
const AUDIO_BUNDLED: boolean = false;

/**
 * candidate-3 (ElevenLabs, 120.08bpm, drop at file t=8.0s). Starting the
 * bed at f30 lands the drop exactly on the reveal's zero-gap cut (f270).
 */
const MUSIC = staticFile("relay/music.mp3");
const MUSIC_START_FRAME = 30;

const sfx = {
  key: staticFile("relay/sfx/switch.wav"),
  tick: staticFile("relay/sfx/mouse-click.wav"),
  whoosh: staticFile("relay/sfx/whoosh.wav"),
  ding: staticFile("relay/sfx/ding.wav"),
};

// Beat-anchored sound design. Frames are absolute (scene.from + local cue).
// Turn (f150–240) is intentionally silent — the dead stop before the drop.
const SFX_CUES: { src: string; at: number; volume: number; rate?: number }[] = [
  // hook: typing bursts, then the clock's accelerating ticks
  { src: sfx.key, at: sc.hook.from + 2, volume: 0.1 },
  { src: sfx.key, at: sc.hook.from + 12, volume: 0.1 },
  { src: sfx.key, at: sc.hook.from + 22, volume: 0.1 },
  { src: sfx.key, at: sc.hook.from + 32, volume: 0.1 },
  { src: sfx.key, at: sc.hook.from + 38, volume: 0.18 },
  { src: sfx.tick, at: sc.hook.from + 75, volume: 0.07 },
  { src: sfx.tick, at: sc.hook.from + 90, volume: 0.08 },
  { src: sfx.tick, at: sc.hook.from + 103, volume: 0.09 },
  { src: sfx.tick, at: sc.hook.from + 114, volume: 0.1 },
  { src: sfx.tick, at: sc.hook.from + 123, volume: 0.1 },
  { src: sfx.tick, at: sc.hook.from + 131, volume: 0.11 },
  { src: sfx.tick, at: sc.hook.from + 138, volume: 0.12 },
  { src: sfx.tick, at: sc.hook.from + 144, volume: 0.12 },
  // reveal: fast re-type, then the zero-gap impact ON the cut
  { src: sfx.key, at: sc.reveal.from + 2, volume: 0.12 },
  { src: sfx.key, at: sc.reveal.from + 7, volume: 0.12 },
  { src: sfx.key, at: sc.reveal.from + 12, volume: 0.12 },
  { src: sfx.key, at: sc.reveal.from + 30, volume: 0.22 },
  { src: sfx.whoosh, at: sc.reveal.from + 30, volume: 0.5, rate: 0.55 },
  { src: sfx.whoosh, at: sc.reveal.from + 30, volume: 0.3 },
  { src: sfx.tick, at: sc.reveal.from + 48, volume: 0.1 },
  { src: sfx.tick, at: sc.reveal.from + 63, volume: 0.1 },
  { src: sfx.tick, at: sc.reveal.from + 78, volume: 0.1 },
  // proof-urls: pill ripple, then the flyout click
  { src: sfx.tick, at: sc.proofUrls.from + 12, volume: 0.1 },
  { src: sfx.tick, at: sc.proofUrls.from + 16, volume: 0.1 },
  { src: sfx.tick, at: sc.proofUrls.from + 20, volume: 0.1 },
  { src: sfx.tick, at: sc.proofUrls.from + 24, volume: 0.1 },
  { src: sfx.tick, at: sc.proofUrls.from + 28, volume: 0.1 },
  { src: sfx.tick, at: sc.proofUrls.from + 78, volume: 0.3 },
  // proof-share: send swoosh, pin thocks, approve click + ding
  { src: sfx.whoosh, at: sc.proofShare.from + 15, volume: 0.3, rate: 1.1 },
  { src: sfx.key, at: sc.proofShare.from + 24, volume: 0.28 },
  { src: sfx.key, at: sc.proofShare.from + 48, volume: 0.28 },
  { src: sfx.tick, at: sc.proofShare.from + 96, volume: 0.3 },
  { src: sfx.ding, at: sc.proofShare.from + 100, volume: 0.15 },
  // proof-rollback: the instant swap
  { src: sfx.tick, at: sc.proofRollback.from + 45, volume: 0.35 },
  { src: sfx.whoosh, at: sc.proofRollback.from + 45, volume: 0.4, rate: 0.6 },
  { src: sfx.tick, at: sc.proofRollback.from + 51, volume: 0.1 },
  { src: sfx.tick, at: sc.proofRollback.from + 57, volume: 0.1 },
  // climax: zoom whoosh, node ticks, unison-pulse impact
  { src: sfx.whoosh, at: sc.climax.from + 0, volume: 0.45, rate: 0.8 },
  { src: sfx.tick, at: sc.climax.from + 15, volume: 0.08 },
  { src: sfx.tick, at: sc.climax.from + 23, volume: 0.08 },
  { src: sfx.tick, at: sc.climax.from + 31, volume: 0.08 },
  { src: sfx.tick, at: sc.climax.from + 39, volume: 0.08 },
  { src: sfx.tick, at: sc.climax.from + 47, volume: 0.08 },
  { src: sfx.tick, at: sc.climax.from + 55, volume: 0.08 },
  { src: sfx.whoosh, at: sc.climax.from + 90, volume: 0.6, rate: 0.5 },
  { src: sfx.whoosh, at: sc.climax.from + 90, volume: 0.35 },
  // cta: resolve
  { src: sfx.ding, at: sc.cta.from + 12, volume: 0.18 },
];

export const RelayLaunch: React.FC<{ debug?: boolean }> = ({
  debug = false,
}) => {
  return (
    <ThemeProvider value={relayTheme}>
      <AbsoluteFill style={{ background: relayTheme.palette.bg }}>
        <TransitionSeries>
          <TransitionSeries.Sequence
            durationInFrames={sc.hook.durationInFrames}
          >
            <Hook />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.turn.durationInFrames}
          >
            <Turn />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.reveal.durationInFrames}
          >
            <Reveal />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.proofUrls.durationInFrames}
          >
            <ProofUrls />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.proofShare.durationInFrames}
          >
            <ProofShare />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.proofRollback.durationInFrames}
          >
            <ProofRollback />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.climax.durationInFrames}
          >
            <Climax />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence durationInFrames={sc.cta.durationInFrames}>
            <Cta />
          </TransitionSeries.Sequence>
        </TransitionSeries>

        {AUDIO_BUNDLED && (
          <>
            <MusicBed
              src={MUSIC}
              startAtFrame={MUSIC_START_FRAME}
              volume={0.3}
              fadeInFrames={6}
              fadeOutFrames={35}
              ducks={[{ from: 270, to: 286, level: 0.5, rampFrames: 5 }]}
            />
            {SFX_CUES.map((cue, i) => (
              <Sfx
                key={i}
                src={cue.src}
                at={cue.at}
                volume={cue.volume}
                playbackRate={cue.rate}
              />
            ))}
          </>
        )}

        <Grain opacity={relayTheme.texture.grainOpacity} />
        <Vignette strength={relayTheme.texture.vignette} />
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
