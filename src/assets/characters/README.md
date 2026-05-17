# Character images

Place PNG (or WebP/JPG/SVG) files here. The app also checks `public/characters/` at runtime.

## Required files

| File | When shown |
|------|------------|
| `empty-character.png` | Empty slot — human characters (slots 6–7) |
| `empty-cat.png` | Empty slot — cat characters (slots 1–5) |
| `beat-1.png` … `beat-5.png` | Beat pads 1–5 (human slots) |
| `cat-beat-1.png` … `cat-voice-5.png` | Assigned cat slots: `cat-{category}-{number}.png` |
| `melody-1.png` … `melody-5.png` | Melody pads 1–5 |
| `effect-1.png` … `effect-4.png` | Effect pads 1–4 |
| `percussion-1.png` … `percussion-5.png` | Percussion pads 1–5 |
| `voice-1.png` … `voice-5.png` | Voice pads 1–5 |

Naming: `{category}-{number}.png` where number is **1-based** (matches pad label “Beat 1”, etc.).

Recommended size: tall portrait, ~400×600px or similar, transparent background.
