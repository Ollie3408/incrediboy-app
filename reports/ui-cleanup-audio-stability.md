# UI Cleanup + Audio Stability Report

**Date:** 2026-05-26  
**Phase:** UI CLEANUP + AUDIO DROPOUT FIX

---

## Task A — UI Cleanup

### 1. DEV Performance Overlay Removed from Stage

The green floating `🎛 PERF` overlay that appeared in the bottom-right corner during gameplay has been removed from the main stage view.

The perf stats are still available inside the DEV diagnostics drawer (open via the DEV button in the control bar), where they are shown at the top of the drawer panel alongside the `PackCompatibilityPanel`.

**Files changed:**
- `src/App.tsx` — removed `position:fixed` overlay block; moved panel inside `<DevDiagnosticsDrawer>`

---

### 2. Black Top Navigation Bar Removed

The black `APP / DEMO / MODS / ALBUMS / SHOP` navigation bar has been removed entirely from the game UI.

**What was removed:**
- `<header className="top-nav">` JSX block (~45 lines) including: nav links, social icon buttons, flag and language selectors, boot-mode badge
- All `.top-nav*` CSS rules (~90 lines) in `App.css`
- Responsive overrides for `.top-nav` in tablet/mobile breakpoints

**Files changed:**
- `src/App.tsx` — entire `<header className="top-nav">` block removed
- `src/App.css` — entire `.top-nav { … }` section and its responsive overrides removed

---

### 3. Layout After Nav Removal — No Empty Gap

The `incrediboy__main` layout was a CSS grid with three rows:
```
grid-template-rows: var(--nav-h) minmax(var(--bar-h), auto) minmax(0, 1fr)
```
Row 1 was the 32px nav height. With the nav removed, the grid is now:
```
grid-template-rows: minmax(var(--bar-h), auto) minmax(0, 1fr)
```
The control bar now occupies the first row (no gap above it).

**Additional CSS fixes:**
- `--nav-h` reset to `0px` (was `32px`) — any remaining `var(--nav-h)` references now contribute 0
- `--stage-inner-h` formula updated: removed `- var(--nav-h)` term, so stage height is now `100dvh - var(--bar-h) - var(--panel-h)`
- `.incrediboy__hint` `top` position updated from `calc(var(--nav-h) + var(--bar-h) + 6px)` to `calc(var(--bar-h) + 6px)`

---

## Task B — Audio Dropout / Click Fix

See `reports/audio-dropout-click-investigation.md` for full analysis.

### Summary of Audio Fixes Applied

| Fix | File | Impact |
|-----|------|--------|
| `scheduleGainRamp` cancellation mechanism | `src/musicClock.ts` | Eliminates concurrent ramp fights |
| Ramp starts from current volume | `src/musicClock.ts` | No more hard volume-to-0 reset |
| `cancelGainRamp` on pad dispose | `src/App.tsx` | Stops zombie ramps on removed pads |
| `isRampActive` guard in volume RAF | `src/App.tsx` | Prevents volume writes during ramps |
| `isRampActive` guard in category-gain effect | `src/App.tsx` | Prevents category-gain writes during ramps |

---

## Validation

| Check | Result |
|-------|--------|
| DEV perf overlay not visible during gameplay | ✓ removed from stage |
| DEV perf data still accessible | ✓ inside DEV drawer |
| Black top nav bar gone | ✓ removed |
| No empty black gap above control bar | ✓ grid fixed |
| Stage fills correctly to top of viewport | ✓ |
| `npm run build` | ✓ exit code 0 |
| No TypeScript errors | ✓ |
| No linter errors | ✓ |
