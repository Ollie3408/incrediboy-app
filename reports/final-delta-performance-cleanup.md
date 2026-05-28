# Final Delta Performance Cleanup Report

**Branch**: `recovery-audio-stability`  
**Date**: 2026-05-27  
**Status**: Build passing · All changes applied

---

## Processes Audited

At the time of investigation no runaway `ffmpeg`, `ffprobe`, or extra Node processes were
found beyond the expected `vite` dev server (PID 45805) and Cursor IDE helpers.
The Charlie Pack background agent had already halted cleanly before any file analysis
or shell commands were executed — the codebase was untouched.

---

## Root Causes of Thermal Load (Found and Fixed)

### 1. Animated `filter: blur()` in `@keyframes char-glow-pulse` — CRITICAL

**File**: `src/App.css`

The `char-glow-pulse` keyframe animated `filter: blur(15px → 18px)` alongside opacity
and transform. Animating a `filter` value forces the GPU to:

1. Recompute the full Gaussian blur kernel on every compositing frame
2. Re-execute the fragment shader across the entire element texture each frame
3. Update the compositing layer from the new blurred result

With 7 characters performing simultaneously, this meant **420 GPU blur recomputations
per second at 60 fps**. This is the primary source of MacBook thermal load during
full-stage gameplay.

**Fix applied**: Removed `filter` from the keyframe entirely. The blur is now a static
property (`filter: blur(8px)`) on the element, computed once on mount. The GPU caches
the blurred texture and only updates the opacity/transform interpolation per frame —
compositor-only operations that are hardware-accelerated without any shader recomputation.

```css
/* Before — GPU recomputes blur every frame */
@keyframes char-glow-pulse {
  0%, 100% { opacity: 0.22; transform: scaleY(0.88); filter: blur(15px); }
  50%       { opacity: 0.58; transform: scaleY(1.12); filter: blur(18px); }
}

/* After — only opacity + transform animate; blur is static */
@keyframes char-glow-pulse {
  0%, 100% { opacity: 0.22; transform: scaleY(0.88) scaleX(0.94); }
  50%       { opacity: 0.55; transform: scaleY(1.10) scaleX(1.05); }
}
```

### 2. Glow blur radius reduced: 16px → 8px

**File**: `src/App.css`

The static `filter: blur(16px)` on the glow pseudo-element was reduced to `filter: blur(8px)`.
Gaussian blur cost scales roughly quadratically with radius. Halving the radius reduces the
per-initial-mount cost by ~4×. Visual appearance is preserved — the glow is still clearly
visible at 8px.

### 3. Ground shadow `filter: blur(4px)` removed

**File**: `src/App.css`

The `character-slot-wrap::after` ground shadow had `filter: blur(4px)` applied to an
18px-tall pseudo-element. The `radial-gradient(ellipse, ...)` already looks naturally
soft without blur. Removing the blur eliminates one compositing layer per character slot,
reducing GPU memory pressure by 7 layers during full-stage play.

---

## Dead Code Removed

### 4. Phase correction constants removed

**File**: `src/App.tsx`

Five constants that existed solely to configure the disabled phase correction system
were removed:
- `PHASE_CORRECTION_INTERVAL_MS = 2_000`
- `PHASE_SOFT_THRESHOLD_MS = 40`
- `PHASE_HARD_THRESHOLD_MS = 150`
- `PHASE_BOUNDARY_GUARD_S = 0.3`
- `PHASE_SETTLE_MS = 3_000`

These were replaced with a single explanatory comment. The two remaining references in
diagnostic code (`isBoundaryRisk` check and the session-start log) were updated to use
literal values or `'disabled'` respectively.

### 5. `runPhaseCorrectionPass` body removed

**File**: `src/App.tsx`

The 150-line function body (which was already dead due to the early return added in the
recovery phase) was replaced with a minimal 1-line stub:

```typescript
const runPhaseCorrectionPass = useCallback(() => { /* disabled */ }, [])
```

This removes ~150 lines of compiled JavaScript from the production bundle and eliminates
any risk of accidentally re-activating the phase correction logic.

---

## Rendering Architecture Audit

### Character animation pipeline

Each active character slot runs:
| Element | Animation | Cost level |
|---------|-----------|------------|
| `character-figure-frame` | `perform-beat/bass/melody/voice` (transform) | ✅ very cheap — GPU transform only |
| `::before` glow | `char-glow-pulse` (opacity + transform, static blur) | ✅ cheap — no shader per frame |
| `::after` ground shadow | `ground-shadow-pulse` (transform + opacity) | ✅ cheap — no blur |
| `character-figure-inner` | None (static scale via CSS var) | ✅ free |

### `BeatDebugOverlay` tick

The `BeatDebugOverlay` component has its own `setInterval(250ms)` that fires while
the session is active. It only re-renders its own small component tree (beat/bar/bpm
display). The `tick` state is local — it does NOT propagate a re-render to the parent
`App` component. CPU cost: negligible.

### React state update frequency under normal play

| Trigger | Frequency | Scope |
|---------|-----------|-------|
| Beat overlay tick | 4 Hz (250ms) | `BeatDebugOverlay` subtree only |
| Master cycle tick | 0.1 Hz (9600ms) | No state update — ref only |
| DEV dropout watcher | 0.2 Hz (5000ms, DEV only) | `devPerfPanel` state if DEV |
| Volume slider | User-driven | RAF-throttled, no play() restart |
| Character animations | CSS-driven | Zero JS involvement |

The main App component re-renders only on user interactions (drag/drop, mute, play/pause,
pack change), not on any timer. The architecture is efficient.

---

## Summary of Changes

| File | Change | Thermal Impact |
|------|--------|----------------|
| `src/App.css` | `char-glow-pulse` no longer animates `filter` | **HIGH** — eliminates 420 GPU blur recomputations/sec at 7-pad load |
| `src/App.css` | Glow `filter: blur` 16px → 8px | **MEDIUM** — ~4× cheaper initial render per glow |
| `src/App.css` | Removed `filter: blur(4px)` from ground shadow | **LOW** — removes 7 compositing layers |
| `src/App.tsx` | Removed 5 dead phase correction constants | **CODE QUALITY** — smaller bundle, cleaner code |
| `src/App.tsx` | `runPhaseCorrectionPass` replaced with 1-line stub | **CODE QUALITY** — removes 150 lines of dead compiled JS |
| `src/App.tsx` | Fixed 2 stale constant references in diagnostics | **CORRECTNESS** |

---

## `computePlaybackRate` Status

`computePlaybackRate` was confirmed unused in `src/App.tsx` (its import was removed during
the recovery phase). It still exists in `src/musicClock.ts` as an export — this is fine
since the function definition itself has zero runtime cost until called. No pack currently
sets `allowDriftCorrection: true`, so the function is never invoked.

---

## Build Validation

```
npm run build → ✓ built in 8.82s — zero TypeScript errors
```

---

## Charlie Pack Status

Charlie Pack agent was interrupted cleanly before any files were modified. The codebase
is in the same state as before the agent was launched. Charlie Pack creation can resume
safely whenever the system has cooled.

---

## Recommendation for Charlie Pack Build

When resuming Charlie Pack creation:
1. Run file analysis **sequentially** (one `ffprobe` call at a time, not parallel)
2. Limit analysis to the specific candidates listed in the confirmed-unused list
3. Skip full waveform/transient analysis — BPM is in most filenames, duration check only
4. No preview mix generation (avoids ffmpeg heavy encoding)
5. Total analysis should complete in under 60 seconds
