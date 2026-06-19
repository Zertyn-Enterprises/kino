# Capture — real product pixels, directable

How real app screens become video material. The capture RIG varies per
platform; everything downstream is identical: named assets + coordinate
metadata in `public/<slug>/screens/` → the tier ladder → `src/lib/screen.tsx`
overlay mechanics → the normal review loop.

> **OSS release note:** the capture *rig* — `scripts/capture/` (Playwright recon
> + per-video scripts) and several advanced overlay components (`SwapOnBeat`,
> `TypeInto`, `Spotlight`, `TapIndicator`, `MacWindowStage`, `PhoneFrame`) — is
> **not bundled** in this open-source release. What ships is `src/lib/screen.tsx`:
> `ScreenStage`, `PointerCursor`, `LowerThird`. For a real-app video, bring your
> own capture script and rebuild hero UI in code (tier 1). Treat the sections
> below as methodology, adapted to your stack.

## 0. Hard rules

- **Never capture real customer data.** QA/demo workspace only, seeded with
  plausible, dense, realistic content (realism rules in direction.md §6
  apply to the seed data — it is the movie set). Mask anything personal
  that sneaks in (URL bar tokens, emails).
- Credentials live in `.env` (`<PREFIX>_URL/_QA_EMAIL/_QA_PASSWORD`);
  Playwright sessions in `scripts/capture/.auth/` (both gitignored).
- The capture script is part of the video's source — product changed or
  storyboard re-cut ⇒ re-run, everything regenerates coherently.

## 1. The tier ladder — REVISED after an early real-app lesson

**The lesson:** a static capture
with a moving camera reads as a SLIDESHOW, no matter how good the camera
work is. The genre's bar is UI that is ALIVE — elements entering,
responding, glowing. For hero beats, rebuilt live UI is not the escape
hatch; it is the DEFAULT.

1. **Rebuilt live UI (hero beats — the default).** Recreate the product's
   key surfaces as animated components (a per-video `scenes/ui/kit.tsx`),
   styled pixel-faithfully FROM the captures. Every element can enter,
   respond, glow, and sit in a lit space (`src/lib/fx.tsx`). Captures are
   the fidelity reference and the realism source — not the canvas.
2. **Capture still as context** — a real screenshot earns screen time only
   as a brief establishing/context shot, graded and inside a staged space,
   never as a scene's main canvas.
3. **Scripted recording** — for irreducibly continuous real motion (scroll
   inertia, live data). Embed graded, short, with camera work.
4. **Capture + overlay choreography** — bbox-coordinated overlays on a
   still (cursor, swaps). Only for quick secondary beats; if the beat
   matters, use tier 1.

## 2. Web rig (Playwright)

- **Recon first** (`scripts/capture/recon.mjs <slug>`): login, save session,
  walk the nav, screenshot every section at 1× → the director READS the
  product before writing the treatment (location scouting).
- **Per-video capture script** (`scripts/capture/<slug>.mjs`): viewport
  1600×1000 @ `deviceScaleFactor: 2`, then per storyboard shot: navigate,
  fix state, capture `<shot>.png`, before/after pairs around interactions,
  and `<shot>.bbox.json` from `locator.boundingBox()` for every element the
  overlays will touch (multiply by the scale factor for image coords).
- **Determinism toolkit** (apply in every script): `page.clock.setFixedTime`
  (kills "2m ago" drift), inject CSS to hide scrollbars and disable
  animations/carousels (`prefers-reduced-motion`), wait for fonts + network
  idle, dismiss toasts, fixed seed data.
- Auth walls/SSO the script can't pass: the human captures manually at 2×
  (PNG drop-in keeps working — you lose bbox metadata, measure from the
  image instead).

## 3. macOS apps

- **Stills**: `screencapture -l <windowID>` for clean per-window captures
  (Retina = 2× natively; `-o` to drop the shadow — prefer compositing our
  own shadow for theme consistency). Window IDs via `osascript`/GetWindowID.
- **State pairs**: drive the app between captures with AppleScript/System
  Events (or `cliclick`); same before/after grammar as web. Requires
  one-time Screen Recording + Accessibility permissions.
- **Electron/Tauri apps**: Playwright can drive Electron directly
  (`_electron.launch`) — full web rig applies, including bboxes. Always ask
  what the app is built with before choosing the rig.
- **Continuous motion**: human-recorded (QuickTime/Screen Studio) as the
  pragmatic Tier 3 — mac UI automation is brittle; don't over-invest.
- **Staging**: captured windows float on a themed backdrop (gradient/brand
  surface, generous shadow, parallax) — `MacWindowStage`. A literal desktop
  wallpaper + menu bar is optional flavor, not default.

## 4. iOS apps

- **Simulator is the rig**: exact device resolution, and full status-bar
  control — always run
  `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4`
  before capturing (the canonical marketing status bar).
  Stills: `simctl io booted screenshot`. Video: `simctl io booted recordVideo`.
- Interactions: scripted via XCUITest if the project has it; manually driven
  while recording otherwise (the status-bar + resolution discipline is what
  matters most). Real-device QuickTime USB recording = fallback for
  haptic-true feel.
- **Staging**: `PhoneFrame` (CSS-drawn iPhone body + dynamic island — crisp
  at any zoom, no licensing strings). Portrait device on a 16:9 canvas is a
  layout gift: device one side, claims the other. Tap indicators (ripple at
  coords) replace the cursor; subtle 3D float/rotation on the device.

## 5. Library mechanics this feeds (`src/lib/screen.tsx`)

Shipped in this release: `ScreenStage` (mounts a capture, camera driven by
focus points in image coords, converts bboxes), `PointerCursor` (web/mac),
`LowerThird`. The richer overlay set this section once described (`SwapOnBeat`,
`TypeInto`, `Spotlight`, `TapIndicator`, `MacWindowStage`, `PhoneFrame`) is part
of the maintainer's internal rig and is not bundled — build the equivalents you
need. Mechanics only — all timing/colors from the theme.

## 6. Workflow insertion (into /produce)

Intake asks: platform(s), stack (Electron? RN?), QA workspace + creds,
seed-data state. → **Recon before treatment** (scout the set). → Storyboard
annotates each beat with tier + shot list. → Capture script written/run →
director Reads every capture (quality + realism gate) before scenes are
built. Captures that fail realism (sparse data, lorem, broken states) block
production — fix the seed data first.
