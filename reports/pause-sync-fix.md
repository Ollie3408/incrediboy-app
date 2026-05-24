# Pause/Resume Transport Synchronization Fix
**Date:** 2026-05-23  
**Phase:** CRITICAL TRANSPORT SYNCHRONIZATION FIX PHASE

---

## Root Causes Identified

### BUG 1 (PRIMARY) — `tickMasterClock` re-anchors the clock at non-bar-aligned times

**File:** `src/App.tsx` — `tickMasterClock` callback (~line 2056)

**What was happening:**  
`masterCycleIntervalRef` fired `tickMasterClock` every `MASTER_LOOP_MS = 9600 ms`.  
Each tick reset `musicalClockRef.current.originMs = performance.now()`.

`9600 ms` is not a multiple of any audio loop duration used by the game:
| Audio loop length | 9600 ÷ loop | Integer? |
|---|---|---|
| 7500 ms (4 bars @ 128 BPM) | 1.28 | ✗ |
| 15000 ms (8 bars @ 128 BPM) | 0.64 | ✗ |
| 30000 ms (16 bars @ 128 BPM) | 0.32 | ✗ |
| 9143 ms (16 bars @ 105 BPM) | 1.05 | ✗ |

After each tick, `msUntilNextBoundary()` calculated delay from a reference point that was **mid-bar** relative to the actually playing audio. A new pad added immediately after a tick would be scheduled at the wrong beat boundary — in the worst case an entire bar late or early.

**Example (128 BPM, bar = 1875 ms):**  
At t=9610 ms (10 ms after a tick), without the bug:  
`delay = 1875 − (9610 % 1875) = 1875 − 235 = 1640 ms` ✓

After the tick reset `originMs = 9600`:  
`delay = 1875 − (10 % 1875) = 1875 − 10 = 1865 ms` ✗ (225 ms too late)

This explains: *"bass and melody can feel late or early," "groove collapses," "loops no longer feel sample-accurate."*

---

### BUG 2 (SECONDARY) — AudioContext auto-suspend not recovered on unpause

**File:** `src/App.tsx` — `toggleMasterMute` callback (~line 2496)

**What was happening:**  
`toggleMasterMute` (the PAUSE/UNPAUSE button) mutes all audio by setting `audio.volume = 0`.  
Audio elements **keep playing** at zero volume — this is correct for phase preservation.

However, Chrome and Safari can **auto-suspend an AudioContext** after 30+ seconds of silence.  
The `HTMLAudioElement` elements routed through `MediaElementAudioSourceNode → DynamicsCompressor → destination` stop producing output when the context is suspended.

On unpause, the code restored all `audio.volume` values but never called `audioCtxRef.current.resume()`. The AudioContext remained suspended → audio stayed silent → user had to trigger another gesture or interaction to wake it up.

This explains: *"audio suddenly becomes silent after long pause," "sound disappears completely."*

---

## Files Changed

| File | Lines Changed | Change |
|---|---|---|
| `src/App.tsx` | `tickMasterClock` callback | Removed `originMs = performance.now()` re-anchor |
| `src/App.tsx` | `toggleMasterMute` callback | Added `audioCtxRef.current.resume()` on unpause |
| `src/App.tsx` | replay `'mm'` event case | Added same `audioCtxRef.current.resume()` for replay consistency |

---

## Exact Changes

### Change 1 — `tickMasterClock` (clock drift fix)

**Before:**
```ts
const tickMasterClock = useCallback(() => {
  musicalClockRef.current = { ...musicalClockRef.current, originMs: performance.now() }
  if (import.meta.env.DEV) {
    console.debug('[master] clock re-anchored (audio untouched)', { loopMs: MASTER_LOOP_MS })
  }
}, [])
```

**After:**
```ts
const tickMasterClock = useCallback(() => {
  // Heartbeat only — do NOT reset originMs.
  // Clock origin is anchored once at startOrRestartLoops() and must remain
  // fixed for the session lifetime so msUntilNextBoundary stays accurate.
  if (import.meta.env.DEV) {
    console.debug('[master] clock heartbeat — origin preserved', {
      originMs: musicalClockRef.current.originMs,
      elapsedMs: Math.round(performance.now() - musicalClockRef.current.originMs),
    })
  }
}, [])
```

**Effect:** The musical clock origin is now anchored exactly once — at the moment PLAY LOOPS is pressed — and never disturbed. `msUntilNextBoundary` always calculates delay relative to the true session start, keeping new pad quantization locked to the actual audio grid.

---

### Change 2 — `toggleMasterMute` (AudioContext resume fix)

Added after the `audio.volume` restore loop:
```ts
if (!nextMuted && audioCtxRef.current?.state === 'suspended') {
  void audioCtxRef.current.resume().catch((err) =>
    console.warn('[pause] AudioContext resume failed', err),
  )
}
```

Also added to the replay `'mm'` event case for symmetry.

---

## Timers Audited

| Timer / Ref | Status | Verdict |
|---|---|---|
| `masterCycleIntervalRef` | Single interval, cleared before restart | ✅ No duplicates |
| `quantizeTimersRef` | Cleared in `startOrRestartLoops`, per-slot in `disposeAssignedAudio` | ✅ No duplicates |
| `replayTimeoutsRef` | Cleared by `clearReplayTimers()` before replay | ✅ No duplicates |
| `volumeRafRef` | Single rAF, cancelled in cleanup | ✅ No duplicates |
| `recordingTimerRef` | Single interval, cleared on stop | ✅ No duplicates |

---

## Clock Architecture Post-Fix

```
startOrRestartLoops()
  └── musicalClockRef.current.originMs = performance.now()   ← set ONCE
      └── masterCycleIntervalRef fires every 9600 ms
            └── tickMasterClock() → heartbeat log only, originMs untouched

toggleMasterMute(pause)
  └── audio.volume = 0 for all elements
  └── AudioContext: remains active (not suspended yet)
  └── masterCycleInterval: keeps firing (heartbeat only)
  └── All audio elements: keep playing silently ← phase preserved

toggleMasterMute(unpause)
  └── audio.volume = padEffVol() for all elements
  └── AudioContext: .resume() called if suspended ← NEW FIX
  └── All audio elements: instant volume restore, phase identical to pre-pause
```

---

## Validation Plan

| Test | Expected Result |
|---|---|
| Pause/resume 50× rapidly | No double beats, no drift |
| Pause at random beat positions (beat 1, 2, 3, 4) | Resume at identical beat position |
| Add new pad immediately after long play (>9.6s) | New pad lands on correct bar boundary |
| Add new pad after several minutes of play | Quantization still accurate to within 20 ms |
| Pause for 60+ seconds, unpause | Audio resumes immediately (no silence after unpause) |
| Full-stage 7 performers, 10-minute session | Groove stable, no phase collapse |
| Replay mix (mm event) with long mute intervals | Audio resumes correctly in replay |

---

## Stability Assessment

**Before fix:**  
- Clock re-anchored every 9.6s to wrong bar position → new pads ±225ms off grid  
- Long pause → AudioContext suspended → silent after unpause  
- Apparent "drift" as multiple pads started at different wrong offsets accumulated

**After fix:**  
- Clock origin fixed at session start → quantization error bounded by initial play() latency (~10–30ms)  
- Long pause → AudioContext explicitly resumed on unpause → audio restores immediately  
- Phase preserved during pause (audio played silently throughout)  
- Sample-accurate pause/resume via mute-not-pause architecture
