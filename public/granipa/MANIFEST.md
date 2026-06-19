# Assets — granipa

## brand/icon.png

The Grañipa app icon — the owner's own brand mark for their own product
(Grañipa is already public). This is the only permitted rendering of the mark
(quality.md stage A: never approximate a brand mark). Brand palette is
extracted from it: coral #F4604C · violet #A05BF0 · blue #3D8BFF (see
`src/videos/granipa/theme.ts`).

## ref/home.png

App screenshot of the owner's own Grañipa product, no third-party data.
Reference for the rebuilt-UI scenes (native dark chrome, sidebar, serif
headings).

## Audio — not bundled

The original music + SFX for this video were ElevenLabs-generated and are not
redistributable, so they are **not included** in this open-source repo. The
video code references them at `public/granipa/music.mp3` and
`public/granipa/sfx/*.mp3`; rendering with sound requires you to supply your
own audio at those paths (or regenerate via `scripts/gen-music.mjs` /
`scripts/gen-sfx.mjs` with your own `ELEVENLABS_API_KEY`) and flip the
`AUDIO_BUNDLED` flag in `src/videos/granipa/Main.tsx`. The example renders
silently as shipped.

## Captures

None by design — meeting-tool surfaces contain private data. Hero UI beats
are rebuilt live UI (capture.md tier 1) referenced to `ref/home.png`.
