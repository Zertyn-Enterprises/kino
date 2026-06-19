# Contributing to Kino

Thanks for your interest. Kino is a Remotion harness + a video-craft methodology;
contributions that improve the spine, the example videos, the docs, or the
`/produce` skill are all welcome.

## Setup

```bash
npm install
npm run dev     # Remotion Studio
```

See the [README](README.md) for the full setup and the two usage modes.

## Before opening a PR

Both gates must be green:

```bash
npm run lint    # eslint + tsc
npm test        # vitest (timeline math)
```

- Keep changes scoped; one logical change per PR.
- Match the existing code style (Prettier config in `.prettierrc`).
- New top-level dependencies need a one-line justification in the PR.
- Don't commit secrets, rendered media (`out/`), or generated audio. `.env` is
  gitignored — document any new env var in `.env.example` (names only).

## Adding a video

Follow the structure in `src/videos/<slug>/` (treatment, storyboard, theme,
timeline, Main, scenes) and register the composition in `src/Root.tsx`. Read
`src/videos/_registry.md` first — a new video should differ on ≥4 identity axes
from every existing entry. The `/produce` skill (`.claude/skills/produce/`)
documents the full workflow.

## Assets & licensing

Every asset under `public/` needs a `MANIFEST.md` entry (source + license). Only
add assets that are redistributable in a public MIT repo. Audio is intentionally
not bundled (see the README's Audio section).

## Reporting issues

Open a GitHub issue with repro steps, your Node version, and the composition id.
For anything security-sensitive, see [SECURITY.md](SECURITY.md) if present, or
contact the maintainer privately rather than filing a public issue.
