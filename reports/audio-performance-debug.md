# Audio Performance Debug Report

**Date:** 2026-05-26  
**Phase:** CRITICAL AUDIO PERFORMANCE / THERMAL DEBUG  
**Scope:** Runtime CPU, audio write paths, event handler overhead

---

## Symptoms Reported

- Sounds cut in/out during full-load gameplay
- Click/pop noises
- Momentary silence
- Intermittent audio loss
- Slight UI freezing
- Mac becomes extremely hot under full 7-character load

---

## Root Causes Identified

### Bug 1 — Ungated production `console.log` on every audio event (HIGH SEVERITY)

**File:** `src/App.tsx`, lines 2738–2740

```typescript
// BEFORE (production logging — fires on every mute/unmute per slot)
audio.onpause = () => console.log('[assigned] paused', slotIndex)
audio.onended = () => console.log('[assigned] ended', slotIndex)
audio.onerror = (event) => console.log('[assigned] error', slotIndex, event)
```

**Impact:** Every user mute/unmute triggers `audio.pause()` on up to 7 slots simultaneously, firing 7 synchronous `console.log` calls. `console.log` is not free — it serialises arguments, allocates strings, and forces a V8 deoptimisation on the calling stack. Under rapid pad interaction (add/remove, mute/unmute, pack switch) this could fire 50–100+ times per second.

Same issue existed in replay audio handlers (lines 3569–3574).

**Fix:** Gated behind `import.meta.env.DEV`. `onerror` kept as `console.warn` (legitimate error path).

---

### Bug 2 — Double audio volume write path (HIGH SEVERITY)

**File:** `src/App.tsx`, `handleVolumeChange` + `useEffect([volume])`

**Before:**
```
Slider move (mousemove, potentially 100Hz+)
  → handleVolumeChange()
    → volumeRef.current = clamped           (ref update)
    → audio.volume = eff  ×7 slots          (sync DOM write, no throttle)
    → RAF scheduled
  
RAF fires (16ms later)
  → setVolume(clamped)                      (React state update)
  → React re-renders
  → useEffect([volume]) runs
    → audio.volume = ...  ×7 slots          (DUPLICATE WRITE)
```

**At 60fps slider drag with 7 active slots:**
- Sync writes: up to `100Hz × 7 = 700 audio.volume writes/s`
- Duplicate writes: `60Hz × 7 = 420 audio.volume writes/s`  
- **Total: ~1120 audio.volume property writes/second**

Each `audio.volume = x` write on a connected `MediaElementAudioSourceNode` triggers a parameter update in the Web Audio graph, processed at the audio thread priority. At 1120/s this becomes a significant real-time audio thread interruption.

**Fix:** All DOM writes moved inside the RAF callback. `useEffect([volume])` simplified to Tone.js preview only. Writes now capped at `≤60 × 7 = 420/s` maximum (only during active slider drag), and only 1 write path active (no duplicate).

---

### Bug 3 — Beat debug overlay firing 12.5 React re-renders/second (MEDIUM)

**File:** `src/App.tsx`, line 1397

```typescript
// BEFORE
window.setInterval(() => setTick((t) => t + 1), 80)   // 12.5 Hz

// AFTER
window.setInterval(() => setTick((t) => t + 1), 250)  // 4 Hz
```

**Impact:** Every `setTick` triggers a React state update and full component tree reconciliation for the `BeatDebugOverlay`. At 12.5Hz this is 12.5 renders/second even during pure audio playback with no user interaction. React reconciliation competes with the audio thread for the main JS thread.

**Fix:** Interval changed to 250ms (4Hz). The beat overlay remains visually smooth at this rate.

**CPU reduction estimate:** Removes ~8.5 unnecessary React renders per second.

---

### Bug 4 — Phase correction iterating user-muted (silent) slots (LOW-MEDIUM)

**File:** `src/App.tsx`, `runPhaseCorrectionPass`

Phase correction ran every 2000ms on all active slots, including user-muted ones. A muted slot's `audio.volume` is 0 — the user cannot hear any drift — but the correction still read `audio.currentTime`, computed the expected position, and potentially wrote `audio.playbackRate`.

**Fix:** Added early exit for muted slots:
```typescript
if (mutedSlotsRef.current.has(slot)) { skippedCount++; return }
```

**Impact:** At worst (all 7 slots muted), skips 7 `audio.currentTime` reads and potential `audio.playbackRate` writes every 2 seconds. Minor but removes unnecessary decoder round-trips.

---

## Confirmed Safe (no change needed)

| System | Status |
|--------|--------|
| Phase correction interval (2000ms) | Already optimal — avoids false positives under load |
| `PHASE_SOFT_THRESHOLD_MS` (40ms) | Absorbs jitter under CPU pressure |
| `PHASE_HARD_THRESHOLD_MS` (150ms) | High bar prevents load-induced false snaps |
| `PHASE_SETTLE_MS` (3000ms) | Correctly skips post-play unstable window |
| `MediaElementAudioSourceNode` creation | One per slot, correct dispose on remove |
| `DynamicsCompressorNode` settings | Already tuned (attack 10ms, release 400ms) |
| Phase correction `playbackRate` guards | Already guarded by `!==` checks |
| Loop boundary guard (0.3s) | Correctly skips unreliable currentTime reads |

---

## Changes Made

| File | Change | Impact |
|------|--------|--------|
| `src/App.tsx` | `audio.onpause` + `audio.onended` gated behind `import.meta.env.DEV` (createAssignedAudio + replay) | Eliminates production log spam per mute/unmute event |
| `src/App.tsx` | All `audio.volume` writes moved into RAF callback in `handleVolumeChange` | Caps writes at ≤60/s, eliminates double-write |
| `src/App.tsx` | `useEffect([volume])` simplified to Tone.js preview only | Removes duplicate DOM write path |
| `src/App.tsx` | Beat overlay interval 80ms → 250ms | Reduces React renders from 12.5/s to 4/s |
| `src/App.tsx` | Phase correction skips user-muted slots | Eliminates silent-slot correction overhead |
| `src/App.tsx` | DEV perf panel added (activePads, nodes, corrections, ctxState) | Live visibility into runtime behaviour |

---

## DEV Performance Panel

When running in development mode with pads active, a small overlay appears in the bottom-right corner showing:

```
🎛 PERF
Pads: 7 · Nodes: 7
Soft corr/10s: 0 · Hard: 0
AudioCtx: running
```

Updates every 5 seconds via the existing dropout-watcher interval.

---

## Estimated CPU Reduction

| Source | Before | After | Reduction |
|--------|--------|-------|-----------|
| `audio.volume` writes/s (slider, 7 pads) | ~1120 | ~420 | ~62% |
| React renders from beat overlay | 12.5/s | 4/s | ~68% |
| Production console.log calls (mute/unmute) | 7 per interaction | 0 | 100% |
| Phase correction on muted pads | Up to 7 per pass | 0 | Up to 100% |

**Overall main-thread load reduction estimate: 40–65% under full-load slider interaction.**

---

## Validation Checklist

| Test | Expected Result |
|------|----------------|
| All 7 pads active, volume slider drag 0→100 | No audio interruption, no freeze |
| Rapid mute/unmute all slots | No console spam, smooth toggle |
| Pause/resume 20 times | No double beats, no drift |
| 10-minute session, 7 pads | Consistent volume, no dropouts |
| `npm run build` | Exit code 0, no TypeScript errors |
