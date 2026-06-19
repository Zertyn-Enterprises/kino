# Treatment v2 — Grañipa launch film (THE REAL PRODUCT)

## Correction

v1 mistook Grañipa for Granola. **Grañipa is the user's own app**: open
source, fully on-device — meeting transcription (any language, no bot),
clipboard history, screen OCR, window snapping — replacing a ~$40/mo stack
of cloud tools (Granola, Raycast clipboard, TextSniper). Audio never leaves
the Mac; transcription runs locally; the only thing that ever goes out is
the transcript the user explicitly sends to their OWN Claude/Gemini
subscription for polished notes. Everything lives in one folder
(sqlite + files); delete it, it's gone. Free.

## Copy-first: the founder's launch text is the script

Arc **F — Indictment** (new in direction.md §4). On-screen beats distilled
from the copy, founder's voice preserved:

1. "what your mac tools see in a day:" (question-hook, open colon)
2. "your notetaker hears every meeting." → their cloud (e.g. Granola)
3. "your clipboard sees every API key." every password. every .env (e.g. Raycast)
4. "your OCR reads everything on screen." contracts. dashboards. DMs (e.g. TextSniper)
5. "you signed up for notes." / "you handed over everything."
6. "so I built the whole job — on-device." + Grañipa mark (founder reveal)
7. transcription (no bot, any language) · clipboard history · screen OCR · window snapping
8. "audio never leaves your mac." → "only what YOU send goes out — to your
   own claude or gemini." → "your account. your rules."
9. "everything lives in one folder." sqlite + files → "delete it — it's gone."
10. "oh, and it's free." — the stack it replaces: $40/mo → $0
11. CTA: Grañipa · open source · on-device (+ repo URL — CONFIRM with user)

## Identity

Two worlds in one video — they are the real icon's own two panels
(charcoal | blue window), crossed by ONE spiral gradient coral→violet→blue:
- **Indictment world** (S1–S3): charcoal near-black `#0A0B0E`, clinical;
  the gradient's CORAL end (#F4604C) is the only danger color, used only
  for leaks; data siphons UP and away in thin coral mono strings.
- **Sanctuary world** (S4–S9): the blue-window world `#0C0F17`; the
  violet→blue end (#A05BF0 → #3D8BFF) is home/safe; the FULL gradient
  appears only on/around the real logo + at most one gradient-text moment.
- Type (v3 design lock, vendored): **Sentient serif display** (inherits
  the app's own serif-heading voice) + **Switzer** text + **JetBrains
  Mono** for diegetic terminal/receipts. Exact ladder in `theme.ts`.
  (Registry diff ✓: serif-led dual-world, arc F indictment, founder
  first-person voice, coral/blue split accent, receipt-chip motif.)
- Music: v2 track rejected with the cut. 4 new ElevenLabs candidates
  generated 2026-06-12 (two-act brief: beatless cold open → bloom) —
  **the user's ears pick** (quality.md stage E), then `timeline.ts`
  re-locks to the pick's bpm + firstBeat.

Signature moves: **the siphon** (thin item-streams flowing up/off-frame in
the indictment; reversed and orbiting INWARD in the sanctuary) · **the
spiral** (the icon's spiral as recurring motif: draws as the reveal, orbits
as the architecture, seals the folder) · **receipt chips** (mono chips —
"e.g. Granola", "$40/mo", "sqlite + files" — stamped like evidence).

## Ground truth (from the real Grañipa app repo — overrides all estimates)

- Real icon: `public/granipa/brand/icon.png` (3D dark tile, red→purple→blue
  spiral G). USE THE FILE — never an approximation.
- Real URL: **https://github.com/Zertyn-Enterprises/granipa**
- Real receipts: Granola **$14/month** · Raycast clipboard history ·
  TextSniper · **Rectangle**. "No accounts. No cloud. No subscriptions."
- Killer detail for the architecture beat: enhancement "shells out to the
  `claude`, `codex`, `gemini`, or `grok` CLI you already pay for — no API
  keys, no per-token billing."
- Tech with personality: Core Audio process tap (two clean channels),
  Apple SpeechAnalyzer (macOS 26) streaming word-by-word, CoreML speaker
  diarization that infers real names, clipboard `⌥⇧V`, OCR `⌥⇧T`,
  Rectangle-compatible `⌃⌥` shortcuts, local REST API on 127.0.0.1:7799.
- The app's real UI (docs/home.png): native macOS dark, sidebar, SERIF
  display headings — the video's type direction inherits this serif voice.
- This video IS the v1.0 launch asset the README promises.

## Status: v2 cut REJECTED on quality (typography, icons/emojis, overlaps,
audio, intent). Production restarts under quality.md contract: brand-truth
intake done (this section) → design-system lock → styleframes → motion →
ears-on audio → AI-tells review → ship gate.
