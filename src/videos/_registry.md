# Video identity registry

Append one entry per produced video. Before writing any new treatment, read
every entry here: the new video must differ on **≥4 axes** from each prior
entry (see `.claude/skills/produce/direction.md` §3). This file is the
mechanical guard against template convergence — without it, defaults drift
back to dark-bg / teal-accent / Inter by video three.

The two entries below are the **example videos** shipped with this open-source
repo (see `README.md`). They are intentional showcases, not stray drafts.

Axes per entry:

| field           | meaning                           |
| --------------- | --------------------------------- |
| slug / comp     | folder + composition id           |
| product         | what was launched                 |
| arc             | A–E from direction.md §4          |
| rhythm          | the one-sentence rhythm signature |
| luminance       | dark / light / tonal              |
| palette         | bg + accent hexes                 |
| type            | display family / body family      |
| signature moves | the 2–3 bespoke motion behaviors  |
| texture         | clean / filmic (grain %, leaks)   |
| transitions     | dominant transition vocabulary    |
| music           | bpm + character                   |

---

## 1 · relay / RelayLaunch (2026-06-11)

| field           | value                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| product         | Relay — instant preview deploys for every git push (fictional demo product)                                     |
| arc             | B · problem-first                                                                                                |
| rhythm          | dead-stop tension, then everything at once; holds shorten toward climax                                          |
| luminance       | dark (green-tinted near-black #0A0E0B)                                                                           |
| palette         | bg #0A0E0B · accent lime #B6F22E (live-only semantic) · alt red #E5484D (waiting)                                |
| type            | Space Grotesk display+body / JetBrains Mono terminal+data                                                        |
| signature moves | zero-gap cut (cause IS effect, same beat) · ripple-from-origin reveals · live-pulse heartbeat on accent elements |
| texture         | filmic — grain 5%, vignette 0.3, no light leaks                                                                  |
| transitions     | hard cuts only, all on downbeats                                                                                 |
| music           | 120bpm character (audio not bundled — see `public/relay/MANIFEST.md`); drop at beat 16, biggest hit beat 48     |

## 2 · granipa / GranipaLaunch (2026-06-16)

| field           | value                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| product         | Grañipa — on-device Mac memory layer (local transcription, clipboard history, screen OCR, window snapping). Free, one deletable folder. (Owner's own product; already public — used here as an example.)                        |
| arc             | A · demo-first cold open                                                                                                                                                                                                         |
| rhythm          | one confident take — the product performing live inside a single developing window, micro-punctuation on the beat, one satisfying wide resolve at the end                                                                        |
| luminance       | dark (#0A0B0E near-black with subtle blue cast)                                                                                                                                                                                  |
| palette         | bg #0A0B0E · accent blue #3D8BFF (alive) · violet #A05BF0 (depth) · coral #F4604C scarce for trusted-local                                                                                                                       |
| type            | Sentient display / Switzer body / JetBrains Mono                                                                                                                                                                                 |
| signature moves | live ink (text writes itself in real time inside the window) · converge & seal (features lock into one MacWindow chrome with seal) · sovereign drift + pullback (slow camera life + one deliberate wide reveal of the container) |
| texture         | filmic — grain 4%, vignette 0.28, almost no leaks                                                                                                                                                                                |
| transitions     | contained internal motions + one wide pullback at the sovereignty moment                                                                                                                                                         |
| music           | warm assured modern, ~98–122bpm character (audio not bundled — see `public/granipa/MANIFEST.md`); home bloom aligned to the reveal                                                                                              |

## 3 · sereno / SerenoLaunch (2026-06-23) — calibration fixture (not a shipped sample)

> **Internal calibration fixture.** Proves divergent-shape gate calibration end-to-end on axes
> that differ from relay+granipa: light-luminance, music-less, arc-C, restrained-motion,
> serif display type, no grain. Not listed in README sample set.

| field           | value                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| product         | Sereno — mindfulness focus tool (fictional; internal calibration fixture only)           |
| arc             | C · ambient / no climax                                                                  |
| rhythm          | slow breath — each scene settles before the next; no energy punches, no dead stops       |
| luminance       | light (#F7F5F0 warm off-white)                                                           |
| palette         | bg #F7F5F0 · accent sage #3F6D50                                                         |
| type            | Playfair Display display / DM Sans body                                                  |
| signature moves | opacity fade-in reveal · staggered list entrance · stat counter hold                    |
| texture         | clean — grain 0%, vignette 0%                                                            |
| transitions     | hard cuts only, unaccented                                                               |
| music           | no music — ambient nature sound only                                                     |
