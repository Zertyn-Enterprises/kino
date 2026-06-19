# Third-Party Notices

This project depends on and bundles third-party software and assets. Their
licenses are summarized and linked below. The MIT license in `LICENSE` covers
only this repository's own code.

## Runtime framework

### Remotion (`remotion`, `@remotion/*`)

Source-available — **not** OSI open-source. Free for individuals, non-profits,
and for-profit organizations with **3 or fewer employees**; larger for-profit
entities require a paid company license from [remotion.pro](https://remotion.pro).

No Remotion source code is redistributed in this repository — it is installed
from npm at `node_modules/` (gitignored). Anyone cloning this repo installs
Remotion themselves under Remotion's own terms.

License: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md

## Fonts (`public/fonts/`)

| Font | License | Source |
|---|---|---|
| JetBrains Mono | SIL Open Font License 1.1 | https://github.com/JetBrains/JetBrainsMono |
| Sentient | ITF Free Font License | https://www.fontshare.com/fonts/sentient |
| Switzer | ITF Free Font License | https://www.fontshare.com/fonts/switzer |

The Indian Type Foundry (ITF) Free Font License permits free commercial use and
bundling these fonts within a project; it does not permit reselling the font
files as standalone goods.

## Icons (vendored into source as path data)

- **Lucide** — ISC License — https://lucide.dev — vendored as SVG path data by
  `scripts/vendor-icons.mjs` into per-video `icon-paths.ts`.
- **Primer Octicons** — MIT License — https://primer.style/octicons — the GitHub
  mark only.

The GitHub logo is a trademark of GitHub, Inc., used here only to reference
GitHub and not to imply endorsement.

## Audio

No audio assets are bundled in this repository. The example videos' original
music and sound effects were ElevenLabs-generated and are not redistributable;
they have been removed. See each video's `public/<slug>/MANIFEST.md` and the
README's "Audio" section.
