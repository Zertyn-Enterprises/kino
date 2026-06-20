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

## Hard rules

1. Never ship a scene you haven't rendered and looked at (stills + filmstrip).
2. All timing flows from the video's `timeline.ts` — no hardcoded frames in scenes.
3. Read `src/videos/_registry.md` before any new treatment; differ on ≥4 axes.
4. Two human checkpoints per video: treatment approval, rough-cut listen.
5. `src/lib/` carries no taste — colors/curves/durations come from the video's
   theme. Don't add to lib until a pattern is written twice.

30 fps, 1920×1080, 16:9 only. No audio is bundled — see the README's "Audio".
