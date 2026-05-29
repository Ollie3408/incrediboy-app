# Bravo Pack — Primary Pack Switch Report

**Date**: 2026-05-29  
**Branch**: `recovery-audio-stability`  
**Previous default**: Alpha Pack  
**New default**: Bravo Pack

---

## Changes Made

**File**: `src/App.tsx` — 4 targeted edits only.

| Location | Before | After |
|----------|--------|-------|
| `useState<ActivePackId>` initial value | `'alpha-pack'` | `'bravo-pack'` |
| `PLAYABLE_PACK_IDS` Set order | `['alpha-pack', 'delta-pack', 'bravo-pack']` | `['bravo-pack', 'alpha-pack', 'delta-pack']` |
| `PACK_MENU` Curated Packs array | `['alpha-pack', 'delta-pack', 'bravo-pack']` | `['bravo-pack', 'alpha-pack', 'delta-pack']` |
| `toPlayablePackId` archived + unknown fallbacks | `return 'alpha-pack'` (×2) | `return 'bravo-pack'` (×2) |

---

## Resulting Behavior

### On first game load
Bravo Pack loads automatically. `useState` initial value is `'bravo-pack'`.

### Pack dropdown order (PACK_MENU)
```
Curated Packs
  ├── Bravo Pack    ← first / selected by default
  ├── Alpha Pack
  └── Delta Pack
```

### Shared link / replay fallback
- Playable pack in URL → loads that pack exactly
- Archived pack in URL → redirects to Bravo Pack
- Unknown ID in URL → redirects to Bravo Pack
- No pack parameter → Bravo Pack (from `useState` default)

### Alpha and Delta
- Fully playable, selectable from dropdown
- No asset or metadata changes

---

## Validation

- `npm run build` → ✓ built in 7.42 s — zero TypeScript errors

---

## No Git commit made.
