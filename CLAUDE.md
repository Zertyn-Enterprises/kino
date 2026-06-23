# Kino

Claude-directed product-launch video system. Each video is bespoke
React/Remotion code with its own visual + motion identity; Claude is the
director. To produce a video, use the **/produce** skill
(`.claude/skills/produce/SKILL.md`) — it owns the workflow, craft rules, and
review gates. Remotion API correctness: `remotion-best-practices` skill.

## Commands

```bash
npm run dev                                  # Remotion Studio (preview)
npm run lint                                 # eslint + tsc + agents-sync gate (must be green)
npm run check:agents                         # AGENTS.md/CLAUDE.md CLI-parity sync gate (wired into lint)
npm test                                     # vitest (timeline math)
npx remotion render <CompId> out/<name>.mp4  # render (--crf=16 for final)
scripts/stills.sh <CompId> <frames...> --props='{"debug":true}'   # review stills
scripts/filmstrip.sh <CompId> [step] [props] # contact sheets → out/review/<CompId>/strip/
scripts/hook.sh <CompId> [hookFrames=90] [step=3] [props]        # hook-window review → out/review/<CompId>/hook/
scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>' [..]  # rank hook variants → out/review/<CompId>/hook-tournament/
scripts/retention.sh <CompId> [step=5] [props] [--slug=<slug>] [--holds=S:E,...] [--climax=F] [--rehook=N]  # retention metrics; --slug enables auto-derive of structure flags from timeline.ts (explicit flags override) → out/review/<CompId>/retention/
scripts/contrast.sh <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..]  # contrast gate → out/review/<slug>/contrast/
scripts/motion.sh <CompId> [step=3] [props] [--window=S:E]               # motion-craft gate → out/review/<CompId>/motion/
scripts/legibility.sh <CompId> [step=3] [props] [--window=S:E]           # legibility-dwell gate → out/review/<CompId>/legibility/
scripts/code-craft.sh <CompId> <slug>                                    # code-craft source gate (no render) → out/review/<CompId>/code-craft/
scripts/musicsync.sh <CompId> <slug> [--climax=F]                        # music-sync gate (MS1-MS4; --climax auto-derived from role:'climax' scene; SKIP when no analysis) → out/review/<CompId>/musicsync/
scripts/payoff.sh <CompId> [step=3] [propsJson] [--window=S:E]           # payoff/CTA gate (P1/P2 HARD, P3 advisory) + closure gate (C1/C2 HARD, C3 advisory) → out/review/<CompId>/payoff/
scripts/remotion-correct.sh <CompId> <slug>                              # Remotion-correctness source gate (R1/R2 HARD, R3-R5 advisory, no render) → out/review/<CompId>/remotion-correct/
scripts/distinct.sh <slug> [--bg=#.. --accent=#.. --luminance=.. --arc=. --bpm=.. --grain=..]  # distinctiveness gate (registry-completeness + ≥4-axis anti-template + registry-axis-drift; axes auto-derived from theme.ts; no render) → out/review/<slug>/distinct/
scripts/ship-gate.sh <CompId> <slug> [palette flags] [-- retention flags]  # unified ship gate; retention flags auto-derived from timeline.ts (pass after -- only to override) → out/review/<CompId>/ship/
scripts/preflight.sh <CompId> <slug>                                         # structural-integrity gate (no render; P1/P2 HARD, P3/P4/P5/P6 advisory) → out/review/<CompId>/preflight/
node scripts/new-video.mjs <slug> <CompId>                                   # scaffold new video skeleton (P1/P2-passing by construction)
npm run dogfood:check                                                        # machine-assert relay+granipa ship verdicts vs golden — run before merging gate-spine or src/lib changes
node scripts/gen-music.mjs <slug> "<brief>" --n=1 --seconds=34    # ElevenLabs music bed
node scripts/analyze-music.mjs <slug> [--file=...]  # bpm/downbeat/energy → .analysis.json
```

## Structure

```
src/lib/        spine: timeline (beats→frames), theme, springs, text, audio,
                Grain/Vignette, DeviceFrame, DebugGrid, fx (AmbientField) — mechanics, no taste
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
6. Hook design: pick an archetype from `.claude/skills/produce/hooks.md` — eight gate-aligned, buildable specs; do not invent hook patterns ad-hoc.
7. To pass the background-activity and frame-0 liveness hook gates, compose
   `AmbientField` from `src/lib/fx.tsx` as a living-background layer.
   See `src/smoke/AmbientCheck.tsx` for the reference gate-PASS fixture.

30fps, 1920×1080, 16:9 only. WebGL effects need the angle backend (already in
`remotion.config.ts`). Remotion is free ≤3 employees; larger needs a company
license (remotion.pro).
