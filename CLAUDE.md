# Kino

Claude-directed product-launch video system. Each video is bespoke
React/Remotion code with its own visual + motion identity; Claude is the
director. To produce a video, use the **/produce** skill
(`.claude/skills/produce/SKILL.md`) — it owns the workflow, craft rules, and
review gates. Remotion API correctness: `remotion-best-practices` skill.

## Commands

```bash
npm run dev                                  # Remotion Studio (preview)
npm run lint                                 # eslint + tsc (must be green)
npm test                                     # vitest (timeline math)
npx remotion render <CompId> out/<name>.mp4  # render (--crf=16 for final)
scripts/stills.sh <CompId> <frames...> --props='{"debug":true}'   # review stills
scripts/filmstrip.sh <CompId> [step] [props] # contact sheets → out/review/<CompId>/strip/
scripts/hook.sh <CompId> [hookFrames=90] [step=3] [props]        # hook-window review → out/review/<CompId>/hook/
scripts/retention.sh <CompId> [step=5] [props] [--holds=S:E,...] [--climax=F] [--rehook=N]  # retention metrics → out/review/<CompId>/retention/
node scripts/gen-music.mjs <slug> "<brief>" --n=1 --seconds=34    # ElevenLabs music bed
node scripts/analyze-music.mjs <slug> [--file=...]  # bpm/downbeat/energy → .analysis.json
```

## Structure

```
src/lib/        spine: timeline (beats→frames), theme, springs, text, audio,
                Grain/Vignette, DeviceFrame, DebugGrid — mechanics, no taste
src/videos/     one folder per video (treatment.md, storyboard.md, theme.ts,
                timeline.ts, Main.tsx, scenes/) + _registry.md identity ledger
src/review/     ContactSheet comp (used by filmstrip.sh)
src/smoke/      environment checks (SmokeTest) + lib integration (LibCheck)
public/<slug>/  per-video assets — every asset needs a MANIFEST.md entry
                (source, license, bpm + first-downbeat for music)
```

## Hard rules

1. Never ship a scene you haven't rendered and looked at (stills + filmstrip).
2. All timing flows from the video's `timeline.ts` — no hardcoded frames in scenes.
3. Read `src/videos/_registry.md` before any new treatment; differ on ≥4 axes.
4. Two human checkpoints per video: treatment approval, rough-cut listen.
5. Components in `src/lib/` carry no taste — colors/curves/durations come from
   the video's theme. Don't add to lib until a pattern is written twice.

30fps, 1920×1080, 16:9 only. WebGL effects need the angle backend (already in
`remotion.config.ts`). Remotion is free ≤3 employees; larger needs a company
license (remotion.pro).
