# Assets — relay

Relay is a fully fictional demo product. All of its visuals are generated in
code (no bundled images or brand marks).

## Audio — not bundled

The original music + SFX for this video were ElevenLabs-generated and are not
redistributable, so they are **not included** in this open-source repo. The
video code references them at `public/relay/music.mp3` and
`public/relay/sfx/*.wav`; rendering with sound requires you to supply your own
audio at those paths (or regenerate via `scripts/gen-music.mjs` /
`scripts/gen-sfx.mjs` with your own `ELEVENLABS_API_KEY`) and flip the
`AUDIO_BUNDLED` flag in `src/videos/relay/Main.tsx`. The example renders
silently as shipped.

SFX mapping (for when you re-add audio) lives in `Main.tsx`:
keycaps = switch · ticks = mouse-click · impacts = whoosh @ low playbackRate ·
resolve = ding. Risers are intentionally absent — that's the music's job.
