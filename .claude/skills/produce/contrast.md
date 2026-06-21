# Contrast gate — design-system lock

Run `scripts/contrast.sh <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..]`
with the director-resolved palette hex values to produce:
- `out/review/<slug>/contrast/metrics.json` — machine-readable verdict (source of truth)
- `out/review/<slug>/contrast/metrics.txt` — human-readable table (tee'd output)

This gate runs at **design-system lock (quality.md stage B)** — before any scene
code is written. An illegible palette is caught here, not at rough cut.

## 0. Anti-rubber-stamp

Contrast is computable from hex; there is no subjective element. Either every
HARD pair passes the threshold or the palette must change. Assert each pair
explicitly with its measured ratio. "Looks readable" is not a review.

## 1. Contrast gates

| Pair | Hard? | Floor |
|---|---|---|
| `text` on `bg` | **HARD** | >=7:1 (body copy floor) |
| `text` on `surface` | **HARD** | >=7:1 (body copy floor) |
| `textDim` on `bg` | **HARD** | >=4.5:1 (secondary / large-text floor) |
| `textDim` on `surface` | **HARD** | >=4.5:1 (secondary / large-text floor) |
| `accent` on `bg` | advisory | >=4.5:1 (graphical / large; never blocks) |
| `accentAlt` on `bg` | advisory | >=4.5:1 (graphical / large; never blocks) |

**HARD gate** — a non-zero `contrast.sh` exit code blocks all scene work at
design-system lock. Fix the palette before writing any scene code.

**Advisory gates** — failing requires a named, written justification (e.g.
accent color is only used at display sizes, never body). Unjustified advisory
failures are not acceptable.

## 2. Captured metrics

`scripts/contrast.sh` writes `metrics.json` and `metrics.txt` to
`out/review/<slug>/contrast/` on every run — these are the source of truth.
No manual transcription needed.

```
cat out/review/<slug>/contrast/metrics.json   # machine verdict (hardGatesPass, per-pair)
cat out/review/<slug>/contrast/metrics.txt    # human-readable table
```

`contrast.sh` exits non-zero on HARD FAIL and prints `HARD GATES: PASS` or
`HARD GATES: FAIL` — consumable by automated loops and QA pipelines.

---

**Recorded snapshot — 2026-06-21. Do not hand-edit; re-run
`scripts/contrast.sh <slug> ...` with the resolved palette to update.**

### RelayLaunch

Palette: bg `#0A0E0B` · surface `#131A14` · text `#F2F5F0` · textDim `#8FA098` · accent `#B6F22E` · accentAlt `#E5484D`

| Pair | Ratio | Floor | Pass? |
|---|---|---|---|
| text-on-bg 🤖 | 17.67:1 | 7:1 | ✓ |
| text-on-surface 🤖 | 16.11:1 | 7:1 | ✓ |
| textDim-on-bg 🤖 | 7.08:1 | 4.5:1 | ✓ |
| textDim-on-surface 🤖 | 6.45:1 | 4.5:1 | ✓ |
| accent-on-bg 🤖 | 14.56:1 | 4.5:1 | ✓ (advisory) |
| accentAlt-on-bg 🤖 | 4.97:1 | 4.5:1 | ✓ (advisory) |

`hardGatesPass: true` — all HARD pairs clear their floors.

### GranipaLaunch

Palette: bg `#0A0B0E` · surface `#14161D` · text `#F1F2F6` · textDim `#8E93A3` · accent `#3D8BFF` · accentAlt `#F4604C`

| Pair | Ratio | Floor | Pass? |
|---|---|---|---|
| text-on-bg 🤖 | 17.59:1 | 7:1 | ✓ |
| text-on-surface 🤖 | 16.15:1 | 7:1 | ✓ |
| textDim-on-bg 🤖 | 6.42:1 | 4.5:1 | ✓ |
| textDim-on-surface 🤖 | 5.90:1 | 4.5:1 | ✓ |
| accent-on-bg 🤖 | 5.94:1 | 4.5:1 | ✓ (advisory) |
| accentAlt-on-bg 🤖 | 6.21:1 | 4.5:1 | ✓ (advisory) |

`hardGatesPass: true` — all HARD pairs clear their floors.
