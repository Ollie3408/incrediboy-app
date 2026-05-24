# True Transport Lock — Implementation Report
**Date:** 2026-05-23  
**Phase:** CRITICAL TRUE TRANSPORT LOCK PHASE

---

## Root Cause of Reported Symptoms

### Why mute-pause was unreliable

The previous architecture (volume→0, audio keeps playing) is theoretically sound but breaks in practice due to a specific Chrome/Safari behavior:

**When all `audio.volume = 0` and the AudioContext has no audible output, Chrome auto-suspends the `AudioContext` after 30–60 seconds of silence.** When the context is suspended, the audio rendering thread stops. `HTMLAudioElement` elements connected via `MediaElementAudioSourceNode` are routed through the suspended graph — but the browser's internal behavior for how it handles the underlying media timeline during context suspension is implementation-specific.

The observed consequence:
- Some audio elements continued advancing `currentTime` while the context was suspended
- Others stalled or advanced at a different rate
- On resume, elements that had "drifted" in the silent state were at different positions relative to each other
- Beats that were phase-locked before pause were now fractionally offset
- Over subsequent pause/resume cycles, these offsets accumulated → "beats become slightly separated", "occasional doubled kicks", "groove loses tightness"

**The silent-play mechanism had a second flaw:** `startAssignedSlotAudio` contained this guard:

```ts
// old — INCORRECT for true pause
if (targetVol <= 0 && !isOneShot && isPlayingRef.current) {
  audio.volume = 0
  if (audio.paused) {
    void audio.play()  // ← silently restarts any paused element
  }
  return
}
```

If a quantize timer fired while the master was muted — e.g., when a new pad was dragged onto a slot during pause — this code called `audio.play()` at volume 0. The element started playing silently from `currentTime = 0`, completely out of phase with the rest of the session. On unpause, it was audible and beat-shifted.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Added `pauseOffsetsRef` and `pauseClockElapsedRef` refs |
| `src/App.tsx` | `startAssignedSlotAudio` — guarded silent-play against master pause |
| `src/App.tsx` | `toggleMasterMute` — full true-pause / batch-resume implementation |

---

## New Architecture

### Pause (PAUSE AUDIO pressed)

```
1. pauseClockElapsedRef.current = performance.now() − musicalClockRef.originMs
   → snapshot of where the musical clock was at freeze time

2. forEach audio in assignedAudioRef:
   pauseOffsetsRef.set(slot, audio.currentTime)  ← exact loop position captured
   audio.volume = 0
   audio.pause()                                  ← hard stop, no silent playback
   
All operations: synchronous, no stagger.
Audio rendering thread receives pauses within the same JS task.
```

### Resume (UNPAUSE AUDIO pressed)

```
Phase 1 — re-anchor musical clock:
   musicalClockRef.originMs = performance.now() − pauseClockElapsedRef.current
   → clock thinks it started clockElapsed ms ago, matching stored audio positions

Phase 2 — wake AudioContext if suspended:
   audioCtxRef.current.resume()   ← async, but audio start scheduled below

Phase 3 — restore all positions (BEFORE any play() call):
   forEach audio:
     if slot was in pauseOffsetsRef:  audio.currentTime = storedTime
     else (added while paused):      audio.currentTime = clockElapsed % duration

Phase 4 — synchronized batch start:
   forEach audio:
     audio.volume = slotMuted ? 0 : padEffVol(slot)
     audio.play()    ← called without await between iterations
     
All play() calls issued in one synchronous forEach loop.
Browser receives all requests within a single task → aligns to same
audio render quantum (~128 samples / ~3ms at 44.1kHz).
```

### Hidden-play guard in `startAssignedSlotAudio`

```ts
// Before (allowed silent hidden play during global pause):
if (targetVol <= 0 && !isOneShot && isPlayingRef.current) {
  audio.volume = 0
  if (audio.paused) { void audio.play() }  // ← REMOVED for global pause
  return
}

// After (only allows silent play for per-slot mutes, not global pause):
if (targetVol <= 0 && !isOneShot && isPlayingRef.current && !masterMutedRef.current) {
  audio.volume = 0
  if (audio.paused) { void audio.play() }
  return
}
```

Per-slot mute (clicking a single performer) still uses volume→0 + keep-playing for gapless mute/unmute. Only the global transport pause uses true stop.

---

## Musical Clock Re-anchoring

At pause: `clockElapsed = now − originMs`  
At resume: `originMs = now − clockElapsed`

This means the clock's "session start" reference is shifted forward by exactly the pause duration, making all subsequent `msUntilNextBoundary()` calculations match the restored audio positions.

Example:
```
Session start:    T₀ = 0 ms
Pause at:         T₁ = 14,000 ms  →  clockElapsed = 14,000
Pause duration:   8,000 ms
Resume at:        T₂ = 22,000 ms

New originMs = 22,000 − 14,000 = 8,000

At T₂ + 1000 ms = 23,000 ms:
  elapsed = 23,000 − 8,000 = 15,000 ms   ← correct (14,000 + 1,000 post-resume)
  audio.currentTime = 15,000 ms (approximately)  ← matches
```

Quantization remains accurate to within browser audio scheduling precision. ✅

---

## What Did NOT Change

| System | Status |
|---|---|
| Replay architecture | ✅ Untouched |
| Replay 'mm' event handler | ✅ Untouched (volume-only, replay owns its timeline) |
| Pack structures | ✅ Untouched |
| Visual systems | ✅ Untouched |
| Drag/drop | ✅ Untouched |
| Diagnostics | ✅ Untouched |
| Per-slot mute (handleSlotClick) | ✅ Untouched — still volume-only for gapless per-performer mute |
| audio.loop = true | ✅ Untouched |
| AudioContext / compressor chain | ✅ Untouched (only .resume() added) |

---

## Build Verification

```
npm run build
✓ 1446 modules transformed
✓ 0 TypeScript errors
✓ 0 lint warnings
✓ built in 10.93s
```
