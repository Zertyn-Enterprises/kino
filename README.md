<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/kino-logo-dark.png">
    <img src="assets/kino-logo.png" alt="Kino logo" width="128" height="128">
  </picture>
</p>

<h1 align="center">Kino</h1>

<p align="center"><em>Point your coding agent at a brief; get a bespoke launch video.</em></p>

Kino turns a product brief into a finished launch video. You describe your
product to your **AI coding agent**; the agent acts as **director** and writes
bespoke React / [Remotion](https://remotion.dev) code for your video — its own
treatment, design system, storyboard, motion, and scenes. No templates, no
timeline editor: you direct with words.

Kino is **model- and CLI-agnostic**. The director workflow is a craft
methodology written in plain markdown (the `/produce` skill + `CLAUDE.md`), so
any capable agentic coding CLI can run it:

- **[Claude Code](https://claude.com/claude-code)** (Anthropic) — exposes it as
  the native **`/produce`** slash command.
- **Gemini CLI** (Google), **OpenAI Codex CLI**, **Grok CLI** (xAI),
  **GLM-based CLIs** (e.g. GLM 5.2), and similar — point the agent at the
  methodology (see below) and ask it to produce a video.

> Built on Remotion plus the methodology in `.claude/skills/produce/` and
> `CLAUDE.md` (mirrored as `AGENTS.md` for non-Claude tools). Two finished videos
> ship as output samples — see [Sample output](#sample-output).

## Make your own video

This is how you use Kino.

```bash
git clone https://github.com/Zertyn-Enterprises/kino.git
cd kino
npm install
```

Then, in your AI coding agent of choice:

1. **Claude Code:** open the repo and run **`/produce`**.
   **Other CLIs (Gemini / Codex / Grok / GLM / …):** open the repo and tell the
   agent to *"produce a launch video following `.claude/skills/produce/SKILL.md`"*.
   Many CLIs auto-read `AGENTS.md` or `CLAUDE.md`; if yours doesn't, point it at
   those files explicitly.
2. Describe your product and the launch you want.
3. The agent directs the full pipeline — treatment → design lock → storyboard →
   bespoke scenes → score → self-review → render — pausing at **two human
   checkpoints**: treatment approval, and the rough-cut listen.
4. Your video lands in `src/videos/<slug>/`, registered in `src/Root.tsx`, and
   renders to `out/`. Preview it live anytime with `npm run dev`.

You direct with words; the agent writes the video.

### Requirements

- An **agentic coding CLI** + access to a capable model — Claude Code, Gemini
  CLI, OpenAI Codex CLI, Grok CLI, a GLM-based CLI, etc. (this drives `/produce`)
- Node.js 18+ and npm
- Remotion renders via headless Chromium (auto-downloaded on first render)
- *(optional)* an ElevenLabs API key on a **paid Music plan** — only to generate
  music/SFX

### Editing what the agent writes

Everything the agent produces is plain React/Remotion you can edit by hand. The
reusable spine lives in `src/lib/` (timeline math, theme, springs, text, audio,
grain/vignette, device frames) — mechanics with no taste; each video's entire
look lives in its own folder's `theme.ts` and `timeline.ts`. The methodology is
in `.claude/skills/produce/` (start with `SKILL.md`) and `CLAUDE.md` /
`AGENTS.md`. All videos are 30 fps, 1920×1080, 16:9.

> **Not bundled in this release:** some `/produce` paths are tuned for the
> maintainer's setup — the multi-agent build path (needs an agent that can
> dispatch parallel subagents) and the real-app screen-capture rig
> (`scripts/capture/`, advanced overlay components). The portable defaults — a
> solo scene-by-scene build loop and rebuilding UI in code — are the documented
> fallback. See `.claude/skills/produce/capture.md`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Remotion Studio (live preview) |
| `npm run lint` | `eslint src && tsc` — must be green |
| `npm test` | `vitest` — timeline math |
| `npm run build` | bundle the project |
| `npx remotion render <CompId> out/<name>.mp4` | render a composition |
| `scripts/stills.sh <CompId> <frames...>` | full-res review stills → `out/review/<CompId>/` |
| `scripts/filmstrip.sh <CompId> [step] [props]` | contact sheets → `out/review/<CompId>/strip/` |
| `scripts/hook.sh <CompId> [hookFrames=90] [step=3] [props]` | hook-window review → `out/review/<CompId>/hook/` |
| `scripts/retention.sh <CompId> [step=5] [--holds=S:E,...] [--climax=F] [--rehook=N]` | full-timeline retention gate → `out/review/<CompId>/retention/` |
| `scripts/contrast.sh <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..]` | WCAG contrast gate (design-system lock) → `out/review/<slug>/contrast/` |
| `scripts/motion.sh <CompId> [step=3] [--window=S:E]` | motion-craft gate (M1/M2/M3) → `out/review/<CompId>/motion/` |
| `scripts/legibility.sh <CompId> [step=3] [--window=S:E]` | legibility-dwell gate (L1/L2/L3) → `out/review/<CompId>/legibility/` |
| `scripts/code-craft.sh <CompId> <slug>` | code-craft source gate (C1-C3, no render) → `out/review/<CompId>/code-craft/` |
| `scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]` | unified ship gate: hook + retention + contrast + motion + legibility + code-craft → `out/review/<CompId>/ship/` |
| `scripts/preflight.sh <CompId> <slug>` | structural-integrity gate (no render; P1/P2 HARD, P3/P4 advisory) → `out/review/<CompId>/preflight/` |
| `node scripts/new-video.mjs <slug> <CompId> [--hook=<key>] [--body=<key>]` | scaffold a new video skeleton (P1/P2-passing by construction); `--hook=<key>` instantiates a gate-PASS archetype Hook.tsx; `--body=<key>` instantiates retention-gate-green Body/Climax\|Cta scenes |
| `npm run dogfood:check` | machine-assert relay+granipa ship-gate verdicts vs golden — run before merging gate-spine or `src/lib` changes |

More helpers (music generation, analysis) live in `scripts/` and are documented in `CLAUDE.md`.

## Project structure

```
src/lib/        spine: timeline (beats→frames), theme, springs, text, audio,
                Grain/Vignette, DeviceFrame, DebugGrid — mechanics, no taste
src/videos/     one folder per video (treatment.md, storyboard.md, theme.ts,
                timeline.ts, Main.tsx, scenes/) + _registry.md identity ledger
src/review/     ContactSheet composition (used by scripts/filmstrip.sh)
src/smoke/      environment checks (SmokeTest) + lib integration (LibCheck)
public/<slug>/  per-video assets (each documented in a MANIFEST.md)
```

## Sample output

Two finished videos ship as **proof of the output bar** — they are quality
references, not a tutorial. To make your own, use `/produce` above.

- **`RelayLaunch`** — a fully fictional product, drawn entirely in code.
- **`GranipaLaunch`** — a launch film for a real, already-public Mac app.

To see the bar, render or preview them: `npm run dev` (Studio), or
`npx remotion render RelayLaunch out/relay.mp4`. They render **silently** —
bundled audio was removed (see [Audio](#audio)).

## Audio

No audio ships in this repo: the originals were ElevenLabs-generated and aren't
redistributable. Videos render silently. To add sound to a video:

1. Provide your own audio at the paths it references
   (`public/<slug>/music.mp3` and `public/<slug>/sfx/*`), or regenerate with
   `scripts/gen-music.mjs` / `scripts/gen-sfx.mjs` and your own
   `ELEVENLABS_API_KEY` (a **paid** ElevenLabs Music plan is required).
2. Flip `const AUDIO_BUNDLED = false` to `true` in that video's `Main.tsx`.

## Troubleshooting

- **First render is slow / "downloading browser"** — Remotion fetches a headless
  Chromium on first use. Normal; later renders are fast.
- **A video has no sound** — expected; no audio ships (see [Audio](#audio)).
- **`SmokeTest` / `LibCheck` fail on missing media** — they need test media: run
  `scripts/gen-smoke-media.sh` once.
- **WebGL / 3D effects look wrong** — Remotion uses the `angle` backend (already
  set in `remotion.config.ts`).
- **Music generation errors** — `scripts/gen-music.mjs` needs an
  `ELEVENLABS_API_KEY` on a paid ElevenLabs Music plan.

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Run
`npm run lint` and `npm test` (both green) before opening a PR.

## License

This repository's own code is licensed under the [MIT License](LICENSE).

It depends on **Remotion**, which is *source-available, not OSI open-source*:
free for individuals, non-profits, and for-profit organizations with **3 or
fewer employees**; larger for-profit entities need a paid company license from
[remotion.pro](https://remotion.pro). See the
[Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

Bundled fonts and icons carry their own licenses — see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
