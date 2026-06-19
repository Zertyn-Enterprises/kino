import { TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, staticFile } from "remotion";
import { MusicBed, Sfx } from "../../lib/audio";
import { DebugGrid } from "../../lib/DebugGrid";
import { Grain, Vignette } from "../../lib/Grain";
import { ThemeProvider } from "../../lib/theme";
import { granipaTheme } from "./theme";
import { MUSIC_TRIM_FRAMES, granipaTimeline } from "./timeline";
import { Architecture, BLOOM } from "./scenes/Architecture";
import { Cta, URL_POP } from "./scenes/Cta";
import { Features, FEATURE_POPS } from "./scenes/Features";
import { Gutpunch } from "./scenes/Gutpunch";
import { Hook, ICON_BLINKS, PUNCH_AT } from "./scenes/Hook";
import { Indict, INDICT_BEATS } from "./scenes/Indict";
import { Kicker, KICK_SLAM } from "./scenes/Kicker";
import { Reveal } from "./scenes/Reveal";
import { Sovereignty, DELETE_AT, SOV_BEATS } from "./scenes/Sovereignty";

const tl = granipaTimeline;
const sc = tl.scenes;
const kit = (name: string) => staticFile(`granipa/sfx/${name}.mp3`);

// Audio is NOT bundled in this open-source repo: the original music + SFX were
// ElevenLabs-generated and aren't redistributable. Drop your own files at the
// public/granipa/ paths referenced below (or regenerate via scripts/gen-music.mjs
// and scripts/gen-sfx.mjs with your own ELEVENLABS_API_KEY) and flip this to true.
const AUDIO_BUNDLED: boolean = false;

// Sound design — v3.1, on the windowed generation-v2 track (122bpm, head
// trimmed 193f so its 16.25s drop lands ON the reveal cut and its 39.25s
// accent ON the $0 slam). Per-video dry palette in public/granipa/sfx/.
// Mix hierarchy: music > impacts > foley.
const SFX_CUES: { src: string; at: number; volume: number; rate?: number }[] = [
  // hook: the track itself is the audio hook; punch whoosh + icon ticks
  { src: kit("whoosh-tight"), at: sc.hook.from + PUNCH_AT, volume: 0.22 },
  ...ICON_BLINKS.map((f) => ({
    src: kit("tick"),
    at: sc.hook.from + f,
    volume: 0.1,
  })),
  // indict: whoosh pre-rolls each charge, the STAMP lands on the beat
  ...INDICT_BEATS.flatMap((f) => [
    { src: kit("whoosh-tight"), at: sc.indict.from + f - 6, volume: 0.16 },
    { src: kit("stamp"), at: sc.indict.from + f, volume: 0.32 },
  ]),
  // gutpunch: line 2 on a sub boom; then silence does the work
  { src: kit("sub-boom"), at: sc.gutpunch.from + 8, volume: 0.4 },
  // reveal: riser into the track's real drop; layered hit ON it
  { src: kit("riser-snap"), at: sc.reveal.from - 24, volume: 0.45 },
  { src: kit("drop-hit"), at: sc.reveal.from, volume: 0.6 },
  { src: kit("sub-boom"), at: sc.reveal.from, volume: 0.42 },
  { src: kit("glow"), at: sc.reveal.from + 6, volume: 0.3 },
  // features: one pop per pane switch
  ...FEATURE_POPS.map((f) => ({
    src: kit("pop"),
    at: sc.features.from + f,
    volume: 0.18,
  })),
  // architecture: boundary draw, node ticks, the beam hit
  { src: kit("whoosh-tight"), at: sc.architecture.from + 6, volume: 0.14 },
  { src: kit("tick"), at: sc.architecture.from + 15, volume: 0.12 },
  { src: kit("tick"), at: sc.architecture.from + 30, volume: 0.12 },
  { src: kit("tick"), at: sc.architecture.from + 45, volume: 0.12 },
  { src: kit("drop-hit"), at: sc.architecture.from + BLOOM, volume: 0.35 },
  { src: kit("sub-boom"), at: sc.architecture.from + BLOOM, volume: 0.25 },
  { src: kit("pop"), at: sc.architecture.from + BLOOM + 14, volume: 0.15 },
  // sovereignty: rows tick in; rm TYPES; the folder dissolves
  ...SOV_BEATS.map((f) => ({
    src: kit("tick"),
    at: sc.sovereignty.from + f,
    volume: 0.12,
  })),
  { src: kit("tick"), at: sc.sovereignty.from + 52, volume: 0.1 },
  { src: kit("type-burst"), at: sc.sovereignty.from + DELETE_AT, volume: 0.3 },
  {
    src: kit("whoosh-tight"),
    at: sc.sovereignty.from + DELETE_AT + 14,
    volume: 0.25,
  },
  // kicker: pencil strikes, riser, the $0 slam on the track accent
  { src: kit("strike"), at: sc.kicker.from + 8, volume: 0.18 },
  { src: kit("strike"), at: sc.kicker.from + 18, volume: 0.18 },
  { src: kit("strike"), at: sc.kicker.from + 28, volume: 0.18 },
  { src: kit("strike"), at: sc.kicker.from + 38, volume: 0.18 },
  {
    src: kit("riser-snap"),
    at: sc.kicker.from + KICK_SLAM - 30,
    volume: 0.45,
  },
  { src: kit("drop-hit"), at: sc.kicker.from + KICK_SLAM, volume: 0.65 },
  { src: kit("sub-boom"), at: sc.kicker.from + KICK_SLAM, volume: 0.5 },
  // cta: soft glow close — the URL chip is the last sound
  { src: kit("glow"), at: sc.cta.from + 8, volume: 0.15 },
  { src: kit("pop"), at: sc.cta.from + URL_POP, volume: 0.18 },
  { src: kit("chime-end"), at: sc.cta.from + URL_POP + 2, volume: 0.2 },
];

export const GranipaLaunch: React.FC<{ debug?: boolean }> = ({
  debug = false,
}) => {
  return (
    <ThemeProvider value={granipaTheme}>
      <AbsoluteFill style={{ background: granipaTheme.palette.bg }}>
        <TransitionSeries>
          <TransitionSeries.Sequence
            durationInFrames={sc.hook.durationInFrames}
          >
            <Hook />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.indict.durationInFrames}
          >
            <Indict />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.gutpunch.durationInFrames}
          >
            <Gutpunch />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.reveal.durationInFrames}
          >
            <Reveal />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.features.durationInFrames}
          >
            <Features />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.architecture.durationInFrames}
          >
            <Architecture />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.sovereignty.durationInFrames}
          >
            <Sovereignty />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence
            durationInFrames={sc.kicker.durationInFrames}
          >
            <Kicker />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence durationInFrames={sc.cta.durationInFrames}>
            <Cta />
          </TransitionSeries.Sequence>
        </TransitionSeries>

        {AUDIO_BUNDLED && (
          <>
            <MusicBed
              src={staticFile("granipa/music.mp3")}
              volume={0.5}
              fadeInFrames={0}
              fadeOutFrames={50}
              trimBeforeFrames={MUSIC_TRIM_FRAMES}
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

        <Grain opacity={granipaTheme.texture.grainOpacity} />
        <Vignette strength={granipaTheme.texture.vignette} />
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
