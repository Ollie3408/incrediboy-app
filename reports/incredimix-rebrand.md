# IncrediMix Rebrand Report

**Date**: 2026-05-28  
**Branch**: `recovery-audio-stability`  
**Scope**: Player-visible UI branding only

---

## Files Changed

### 1. `src/IntroScreen.tsx`

| Location | Before | After |
|----------|--------|-------|
| Eyebrow text | `Incredibox-style loop lab` | `Loop lab` |
| Logo title | `INCredi<span>BOY</span>` | `INCREDI<span>MIX</span>` |

The two-tone logo structure is preserved — `INCREDI` renders in white with pink/cyan glow, `MIX` renders in `--intro-neon-pink` via `.intro-screen__title-accent`. Same character count (10) as the old title — no layout shift.

### 2. `src/App.tsx`

| Location | Before | After |
|----------|--------|-------|
| Gameplay header `<h1>` | `INCrediBOY` | `INCREDIMIX` |

The `.control-bar__logo` CSS uses `white-space: nowrap` and `clamp(1.25rem, 2.8vw, 1.85rem)` — identical character count means zero overflow risk.

### 3. `index.html`

| Location | Before | After |
|----------|--------|-------|
| `<title>` (browser tab) | `my-first-app` | `IncrediMix` |

---

## Branding Locations Updated

| Screen | Element | Updated |
|--------|---------|---------|
| Start / intro screen | Eyebrow tagline | ✓ |
| Start / intro screen | Logo `<h1>` | ✓ |
| Gameplay screen | Header `<h1>` logo | ✓ |
| Browser tab | `<title>` | ✓ |

---

## Internal Identifiers Intentionally Unchanged

These are not player-visible and changing them would require CSS refactoring with no user-facing benefit:

| Identifier | Location | Reason kept |
|------------|----------|-------------|
| `.incrediboy` | `App.css`, `App.tsx` | CSS class — internal layout identifier |
| `.incrediboy__main` | `App.css`, `App.tsx` | CSS class |
| `.incrediboy__hint` | `App.css`, `App.tsx` | CSS class |
| `.incrediboy--stage-visible` | `App.css`, `App.tsx` | CSS modifier class |
| `/* IncrediBoy */` comments | `App.css`, `index.css`, `musicClock.ts` | Developer comments, not player-visible |
| `IncrediBoy` in pack/template comments | `types.ts`, `defaultDeltaTemplate.ts` | Internal developer docs |
| Package name in `package.json` | `package.json` | npm internal identifier |

---

## Build Result

```
npm run build → ✓ built cleanly — zero TypeScript errors
```

---

## No Git commit made.
