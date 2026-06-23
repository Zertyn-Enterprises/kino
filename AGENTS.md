# AGENTS.md

Instructions for any AI coding agent working in this repo — Claude Code, Gemini
CLI, OpenAI Codex CLI, Grok CLI, GLM-based CLIs, and similar. Kino is
model- and CLI-agnostic; the workflow is plain markdown any capable agent can
follow.

- **Canonical project instructions:** `CLAUDE.md`.
- **To produce a video:** follow `.claude/skills/produce/SKILL.md` — the full
  director workflow, craft rules, and review gates. (Claude Code exposes this as
  the `/produce` slash command; other agents read the file directly.)
- **Remotion API correctness:** `.claude/skills/remotion-best-practices/`.

## What this is

Each launch video is bespoke React/Remotion code with its own visual + motion
identity. The agent is the **director** — don't templatize. Read
`src/videos/_registry.md` and differ on ≥4 identity axes from every prior video.

## Commands

- `npm run dev` — Remotion Studio (preview)
- `npm run lint` — eslint + tsc (must be green)
- `npm test` — vitest (timeline math)
- `npx remotion render <CompId> out/<name>.mp4` — render
- `scripts/stills.sh <CompId> <frames...>` — full-res review stills
- `scripts/filmstrip.sh <CompId> [step] [props]` — contact sheets → out/review/<CompId>/strip/
- `scripts/hook.sh <CompId> [hookFrames=90] [step=3] [props]` — hook-window review → out/review/<CompId>/hook/
- `scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>' [..]` — rank hook variants → out/review/<CompId>/hook-tournament/
- `scripts/retention.sh <CompId> [step=5] [--slug=<slug>] [--holds=S:E,...] [--climax=F] [--rehook=N]` — full-timeline retention gate; --slug enables auto-derive of structure flags from timeline.ts (explicit flags override) → out/review/<CompId>/retention/
- `scripts/contrast.sh <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..]` — WCAG contrast gate (design-system lock) → out/review/<slug>/contrast/
- `scripts/motion.sh <CompId> [step=3] [--window=S:E]` — motion-craft gate (M1/M2/M3) → out/review/<CompId>/motion/
- `scripts/legibility.sh <CompId> [step=3] [--window=S:E]` — legibility-dwell gate (L1/L2/L3) → out/review/<CompId>/legibility/
- `scripts/code-craft.sh <CompId> <slug>` — code-craft source gate (C1-C3, no render) → out/review/<CompId>/code-craft/
- `scripts/musicsync.sh <CompId> <slug> [--climax=F]` — music-sync gate (MS1-MS4; --climax auto-derived from role:'climax' scene; SKIP when no analysis) → out/review/<CompId>/musicsync/
- `scripts/payoff.sh <CompId> [step=3] [propsJson] [--window=S:E]` — payoff/CTA gate (P1/P2 HARD, P3 advisory) → out/review/<CompId>/payoff/
- `scripts/remotion-correct.sh <CompId> <slug>` — Remotion-correctness source gate (R1/R2 HARD, R3–R5 advisory; no render required) → out/review/<CompId>/remotion-correct/
- `scripts/distinct.sh <slug> [--bg=#.. --accent=#.. --luminance=.. --arc=. --bpm=.. --grain=..]` — distinctiveness gate (≥4-axis anti-template, HARD when ≥2 registry entries; no render) → out/review/<slug>/distinct/
- `scripts/ship-gate.sh <CompId> <slug> [palette flags] [-- retention flags]` — unified ship gate (10 gates); retention/musicsync structure flags auto-derived from timeline.ts (pass after -- only to override) → out/review/<CompId>/ship/ (`report.txt §How-to-fix` + `report.json.remediations`)
- `npm run dogfood:check` — machine-assert relay+granipa ship-gate verdicts against committed golden (`scripts/dogfood.golden.json`); **run before merging any gate-spine (`scripts/*-metrics.mjs`, `ship-metrics.mjs`, `structure.mjs`) or `src/lib` change**. Not wired into PR CI (renders too heavy); run locally.

## Hard rules

1. Never ship a scene you haven't rendered and looked at (stills + filmstrip).
2. All timing flows from the video's `timeline.ts` — no hardcoded frames in scenes.
3. Read `src/videos/_registry.md` before any new treatment; differ on ≥4 axes.
4. Two human checkpoints per video: treatment approval, rough-cut listen.
5. `src/lib/` carries no taste — colors/curves/durations come from the video's
   theme. Don't add to lib until a pattern is written twice.
6. To pass the background-activity and frame-0 liveness hook gates, compose
   `AmbientField` from `src/lib/fx.tsx` as a living-background layer.
   See `src/smoke/AmbientCheck.tsx` for the reference gate-PASS fixture.

30 fps, 1920×1080, 16:9 only. No audio is bundled — see the README's "Audio".
