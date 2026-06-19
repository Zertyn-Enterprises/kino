# Grañipa v3 — styleframe specs (quality.md stage C)

Static poster frames FIRST. No motion code in this stage — every element at
its settled, key-moment state. Each frame must survive being judged as a
poster someone would frame.

## Global contract (binding for every scene)

**Imports** — the design system is locked; use ONLY:

- `theme.ts`: `ink`, `brand`, `type`, `grid`, `space`, `granipaTheme`
- `scenes/ui/system.tsx`: `LogoTile`, `MacWindow`, `ReceiptChip`, `Kbd`, `GradientText`
- `scenes/ui/icons.tsx`: `Icon` (Lucide names, camelCase), `GithubMark`
- The v2 kit (`scenes/ui/kit.tsx`) is DEAD — remove every import of it.

**Rules**

1. Text styles come from the `type` ladder verbatim (`style={{...type.h2, color}}`).
   Never set a fontSize/family/weight outside the ladder. Spreads may override
   only `color`, `opacity`, `transform`, `maxWidth`, margins.
2. Layout on the 12-col grid: x positions from `grid.x(col)`, widths from
   `grid.w(span)`. Gaps/paddings from `space`. No magic x/y except vertical
   bands stated in the spec. Two elements NEVER overlap unless the spec says so.
3. **Emojis are banned.** Icons = `<Icon name=... />` only, one strokeWidth
   (default 1.8). The logo = `<LogoTile />` (the real file) — never drawn.
4. Coral (`brand.coral`) appears ONLY where the spec marks danger/leak.
   The full gradient only where the spec says. Cold scenes (S1–S3) use
   `ink.coldBg`; warm scenes (S4–S9) use `ink.warmBg`.
5. `ReceiptChip` content must not wrap: keep `whiteSpace: "nowrap"` via style.
6. Diegetic UI content must be plausible-realistic (no lorem, no "John Doe");
   secrets always REDACTED (`sk-••••••••`). Facts/prices only those in specs.
7. Keep the scene's existing exported timing constants and component name +
   signature EXACTLY (Main.tsx imports them): `INDICT_BEATS`, `FEATURE_POPS`,
   `BLOOM`, `SOV_BEATS`, `DELETE_AT`, `KICK_SLAM`. Scene components may accept
   `{ moment?: number }` (default to the spec's key moment).
8. Static = no `useCurrentFrame`/`spring`/`interpolate`. Delete v2 animation
   code; this file becomes the styleframe (motion returns in stage D on top
   of the approved layout).

**Verify protocol (every iteration)**

```
npx tsc --noEmit   # your file must be clean
npx remotion still GranipaFrame out/review/granipa-v3/<scene>.png \
  --props='{"scene":"<scene>","frame":0}'        # add "moment" if multi-moment
```

READ the PNG at full attention. Judge: composition intent, ladder discipline,
spacing rhythm, collisions, the AI-tells list (quality.md §F). Iterate at
least twice before reporting. If the render fails on a SIBLING scene's
compile error, wait 20s and retry (≤3×) — only your own file is your bug.

**Copy is law** — the strings below are the founder's launch text. Lowercase
styling is intentional (the serif carries it). Never paraphrase, never add
marketing words ("powerful", "seamless", "blazing").

---

## S1 · hook — `scenes/Hook.tsx`

**Intent**: a muted scroller stops because a calm, serious question indicts
their own machine. Cold, clinical, almost empty.

- bg `ink.coldBg`.
- Region A (cols 0–7, vertical center band, baseline ≈ y 480): h2,
  `ink.text`: `think about what your mac tools see in a day.`
  The period sits there deliberately. Max width `grid.w(8)`.
- Region B (top edge, full width, y 0–44): a rebuilt macOS MENU BAR fragment —
  right-aligned cluster: `Icon mic` · `Icon clipboard` · `Icon eye` at 22px
  `ink.dim`, then `9:41` in `type.caption` `ink.dim`. Thin bottom border
  `ink.border`, bg `rgba(255,255,255,0.02)`. This is the product truth:
  these tools live in the menu bar, always on.
- Region C (cols 0–3, y ≈ 880): `type.label` `ink.faint`:
  `one ordinary tuesday`
- Poster bar: the question + the recognizable menu bar = "they're talking
  about MY mac." Nothing else competes.

## S2 · indict — `scenes/Indict.tsx` (exports `INDICT_BEATS = [0, 78, 156]`)

**Intent**: three accusations stacked like charges; on the right, the
evidence — a window being read while thin coral strings leave the frame.
Key moment: all three charges landed (the third just arrived).

- bg `ink.coldBg`.
- Region A (cols 0–5, y band 200–880): three charge rows, `space[7]` (64)
  apart. Each row: `Icon` (`mic` / `clipboard` / `scanText`) 34px `ink.dim` +
  `type.statement` `ink.text` line + below it a `ReceiptChip`:
  1. `your notetaker hears every meeting.` → chip `granola — $14/mo · cloud`
  2. `your clipboard sees every api key.` → chip `raycast · synced`
  3. `your ocr reads everything on screen.` → chip `textsniper`
  Row 3 is the active charge: its icon and chip use `brand.coral` accent.
- Region B (cols 7–11, y band 160–920): a `MacWindow` (≈ `grid.w(5)` × 600,
  title `Q3 board deck — Preview`) showing a document of dim text lines
  (plausible: agenda lines, a table hint). Over it, three thin CORAL
  extraction strings rising up and off-frame (top-cropped), `type.mono`
  `brand.coral`, redacted: `sk-••••••••••••`, `DATABASE_URL=postgres://••••`,
  `payroll_q3.xlsx — 2.4 MB`. The strings TILT 90°? No — they float as
  horizontal mono lines at increasing heights, opacity fading with altitude.
- Region C (col 7, above window, y ≈ 110): `type.label` `brand.coral`:
  `uploading · third-party cloud`
- Poster bar: charges read like a court filing; the coral strings are the
  only color — the eye goes leak-first, then reads the charges.

## S3 · gutpunch — `scenes/Gutpunch.tsx`

**Intent**: the emptiest frame of the film. Two lines, a long void.

- bg `ink.coldBg`.
- Region A (cols 1–10, two lines stacked at vertical center, `space[5]` gap):
  - `type.statement` `ink.dim`: `you signed up for notes.`
  - `type.h2` `ink.text`: `you handed over everything.` — the word
    `everything` in `brand.coral`.
- Nothing else. No chips, no icons, no decoration. The void IS the design.
- Poster bar: silence after the indictment; the only coral word in a dark sea.

## S4 · reveal — `scenes/Reveal.tsx`

**Intent**: THE frame of the video — the one that gets screenshotted. World
flips to the sanctuary. Founder voice turns warm and confident.

- bg `ink.warmBg`, with a soft radial ambient glow behind the logo
  (`rgba(61,139,255,0.10)` outer, violet hint inner — subtle, not a lens flare).
- Region A (cols 1–4): `LogoTile size={360} glow={0.45}` vertically centered.
- Region B (cols 5–11, vertically centered text block, `space[4]` gaps):
  - `type.label` `ink.dim`: `so i built the whole job`
  - `type.hero`, two lines: line 1 `ink.text`: `everything` — line 2:
    `<GradientText>on-device.</GradientText>` ← the video's ONE gradient text.
  - `type.body` `ink.dim`: `one open-source app. no accounts. no cloud. no subscriptions.`
- Poster bar: real mark + serif hero + the single gradient moment = identity
  in one frame. If this can't be a poster, nothing can.

## S5 · features — `scenes/Features.tsx` (exports `FEATURE_POPS = [10, 59, 108, 157]`)

**Intent**: replace the rejected emoji-chip screen with the PRODUCT ITSELF —
a rebuilt Grañipa window doing live transcription, the other three features
as a clean dock of labeled tools below. Show, don't list.

- bg `ink.warmBg`.
- Region A (cols 1–11 top, y 60): `type.label` `brand.blue`:
  `what it does — all of it on-device`
- Region B (centered, cols 1–11, y band 130–820): `MacWindow`
  (1460 × 690, title `Grañipa`) — content split:
  - left sidebar 280px (border-right `ink.border`): nav rows w/ `Icon` 24px +
    `type.caption`: `mic` Notes (active row, `rgba(61,139,255,0.12)` pill),
    `clipboard` Clipboard, `scanText` Screen OCR, `layoutGrid` Snapping.
  - main pane (padding `space[6]`): serif heading (`type.statement`, 38px is
    NOT allowed — use ladder: `type.statement` as-is) `Weekly sync` …actually:
    title row: `type.statement` `ink.text`: `weekly sync` + right-aligned
    live pill: dot + `type.mono` `brand.blue`: `● transcribing — locally`.
    Below, transcript rows (speaker diarization is a REAL feature):
    - `type.mono` `ink.faint` timestamp `00:14` + `type.body` line:
      **Maya** (name in `ink.text`, 600 via type.label? no — name inline,
      same body style, just `ink.text`; text `ink.dim`): `let's ship the
      beta on friday.`
    - `00:15` **Jon**: `i'll cut the build tonight.`
    - `00:16` **Maya**: `last meeting we said the demo video blocks v1.`
    - A partially-typed row: `Jon: on it` + a 2px caret block `brand.blue`.
  - bottom strip of the pane: `ReceiptChip` `any language · no bot in the call`.
- Region C (cols 1–11, y ≈ 900, row of 4, `space[5]` gaps, evenly placed on
  grid cols 1/4/7/10 — NOT auto-centered): each = `Icon` 30px `ink.dim` +
  `type.caption` `ink.text` name + `Kbd` (where real):
  `mic` transcription · `clipboard` clipboard `⌥⇧V` · `scanText` screen ocr
  `⌥⇧T` · `layoutGrid` snapping `⌃⌥←`
- Key moment (`moment=0`): transcript mid-flow as above. (Stage D will cycle
  the pane through the four tools; the dock is persistent.)
- Poster bar: a real, dense, alive product window — the frame proves the
  product exists and works, with real shortcuts as receipts.

## S6 · architecture — `scenes/Architecture.tsx` (exports `BLOOM = 38`)

**Intent**: the trust diagram — truthful, minimal, no cloud-crossed-out
cliché. The Mac is a lit boundary; exactly one beam leaves it, and it goes
to YOUR OWN subscription via the CLI.

- bg `ink.warmBg`.
- Region A (cols 0–6, y 130): `type.h2` `ink.text`:
  `audio never leaves your mac.`
- Region B (cols 0–7, y band 320–820): the boundary — a rounded rect
  (`grid.w(7)` × 460, border `1.5px solid rgba(61,139,255,0.45)`, bg
  `rgba(61,139,255,0.04)`, radius 22) with `type.label` `brand.blue` tab on
  its top edge: `your mac`. Inside, a horizontal pipeline of three nodes
  joined by thin `ink.border` connectors, each node = surface card
  (`ink.surface`, radius 14, padding `space[4]`) with `Icon` 28px +
  name in `type.caption` `ink.text`, detail line in `type.caption` `ink.dim`:
  1. `audioLines` — `core audio tap` / `two clean channels`
  2. `sparkles` — `speechanalyzer` / `word-by-word, on-device`
  3. `fileText` — `transcript` / `+ speaker names`
- Region C (cols 8–11, y band ~480–700): the ONE exit — a thin beam line
  from node 3 crossing the boundary edge to a terminal card: `ink.surfaceUp`
  card, radius 14, `Icon terminal` 26px + `type.mono` `ink.text`:
  `$ claude` (second line `type.mono` `ink.dim`: `· codex · gemini · grok`).
  Below it `type.caption` `ink.dim`, max `grid.w(4)`:
  `only what you choose to send — to the subscription you already pay for.
  no api keys.`
- Region D (cols 0–5, y ≈ 880): `ReceiptChip accent={brand.blue}`:
  `your account · your rules`
- Poster bar: one glowing boundary, one beam out. The diagram answers the
  indictment scene's siphon — many coral streams up vs ONE blue beam you
  chose.

## S7 · sovereignty — `scenes/Sovereignty.tsx` (exports `SOV_BEATS = [14, 26, 38]`, `DELETE_AT = 112`)

**Intent**: ownership made physical — your data is a folder you can see,
and deleting it is the end of the story. Key moment: folder intact,
sentence landed (pre-delete).

- bg `ink.warmBg`.
- Region A (cols 6–11, vertically centered block):
  - `type.h2` `ink.text`: `everything lives in one folder.`
  - `type.body` `ink.dim` below: `delete it — it's gone.`
- Region B (cols 1–5): a folder card (`ink.surface`, radius 22, ≈ 560 × 420,
  padding `space[6]`): header row `Icon folder` 36px `brand.blue` +
  `type.mono` `ink.text`: `~/Grañipa` + right `type.mono` `ink.dim` `412 MB`.
  Divider. File rows (`type.mono` `ink.dim`, `space[3]` apart, each with
  `Icon` 22px `ink.faint`): `database` `granipa.db` · `fileText`
  `transcripts/` · `clipboard` `clips.db` · `eye` `ocr/`. Footer row:
  `Icon hardDrive` 22px + `type.caption` `ink.faint`: `local disk — nothing
  synced`.
- Region C (cols 6–11, y ≈ 760, under Region A): `Icon trash2` 26px
  `ink.faint` + `type.mono` `ink.faint`: `$ rm -rf ~/Grañipa`
- Poster bar: sqlite + files as a thing you could touch. The mono path makes
  it real; the trash command makes "delete it" literal.

## S8 · kicker — `scenes/Kicker.tsx` (exports `KICK_SLAM = 60`)

**Intent**: the price slam. The replaced stack struck out on the left, a
giant $0 on the right. Key moment: slam landed.

- bg `ink.warmBg`.
- Region A (cols 0–4, vertical stack centered, `space[4]` gaps): four
  `ReceiptChip`s, each struck through (a 1.5px `ink.dim` line-through via
  `textDecoration: "line-through"` on the chip text, chip opacity 0.65):
  `granola — $14/mo` · `raycast pro` · `textsniper` · `rectangle pro`
  Under the stack, `type.caption` `ink.dim`: `≈ $40/mo, every month`
- Region B (cols 6–11): `type.label` `ink.dim` top: `oh, and it's free.`
  then `type.xl` `ink.text`: `$0` (the ladder's xl — first of its two
  allowed uses). Below, `type.body` `ink.dim`, max `grid.w(5)`:
  `open source. local is also cheaper.`
- Poster bar: the asymmetry IS the argument — a tired list vs one huge
  serif numeral.

## S9 · cta — `scenes/Cta.tsx`

**Intent**: the calm end card. Lockup, claim, address. (End cards may
center — the one exception to off-center composition.)

- bg `ink.warmBg`, faint ambient glow behind the lockup (blue, 0.08).
- Region A (horizontal lockup, centered, y ≈ 400): `LogoTile size={190}
  glow={0.4}` + `space[6]` + `type.hero` `ink.text`: `Grañipa`
- Region B (centered under A, `space[5]`): `type.body` `ink.dim`:
  `open source · on-device · free`
- Region C (centered, `space[6]` below B): `ReceiptChip` with
  `GithubMark size={26}` inside + `type.mono` `ink.text`:
  `github.com/Zertyn-Enterprises/granipa`
- Region D (bottom seam, centered, y ≈ 980): `type.mono` `ink.faint`
  `● rec — local` + a 14-bar static waveform (4px bars, `brand.blue` at
  0.55 opacity, heights varied 8–24px, deterministic — no Math.random).
- Poster bar: the real mark earns the closing frame; the URL is the only
  ask. Quiet confidence.
