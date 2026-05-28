# Alpha Pack — Primary Pack Switch Report

**Date**: 2026-05-28  
**Branch**: `recovery-audio-stability`  
**Previous default**: Delta Pack  
**New default**: Alpha Pack

---

## Changes Made

**File**: `src/App.tsx` — 5 targeted edits, no other files modified.

| Location | Before | After |
|----------|--------|-------|
| `useState<ActivePackId>` initial value (line ~1625) | `'delta-pack'` | `'alpha-pack'` |
| `PLAYABLE_PACK_IDS` Set order | `['delta-pack', 'alpha-pack']` | `['alpha-pack', 'delta-pack']` |
| `PACK_MENU` Curated Packs array | `['delta-pack', 'alpha-pack']` | `['alpha-pack', 'delta-pack']` |
| `toPlayablePackId` — archived pack fallback | `return 'delta-pack'` | `return 'alpha-pack'` |
| `toPlayablePackId` — unknown ID final fallback | `return 'delta-pack'` | `return 'alpha-pack'` |

---

## Resulting Behavior

### On first game load
Alpha Pack loads automatically. The `useState` initial value is `'alpha-pack'`, so the
first render uses Alpha Pack's pad layout, audio files, and metadata.

### Pack dropdown order (PACK_MENU)
```
Curated Packs
  ├── Alpha Pack    ← first / selected by default
  └── Delta Pack
```

### Shared link / replay fallback
- A URL referencing a **playable** pack (`alpha-pack`, `delta-pack`) → loads that pack exactly
- A URL referencing an **archived** pack (Cyberpunk, Core Mix, New Pack Alpha, Bravo) → redirects to Alpha Pack
- A URL referencing an **unknown** pack ID → redirects to Alpha Pack
- A URL with **no pack parameter** → Alpha Pack (from `useState` default)

### Delta Pack
- Fully playable — all assets, metadata, and pad layout unchanged
- Selectable from the pack dropdown as before
- No changes to `AUDIO_PACKS`, `CURATED_PACK_IDS`, `GROUPED_CURATED_PACK_IDS`, or `groupedPadRowsForPack`

---

## Validation

- `npm run build` → ✓ built cleanly — zero TypeScript errors
- No changes to audio engine, synchronization, musicClock.ts, replay/share, transport, or volume systems
- Delta Pack assets untouched
- Alpha Pack assets untouched (Voice 3 Amin replacement from previous phase carries through)

---

## No Git commit made.
