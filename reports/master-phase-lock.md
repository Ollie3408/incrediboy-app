# Master Phase Lock — Implementation Report
**Date:** 2026-05-24  
**Phase:** MASTER PHASE LOCK CORRECTION

---

## Root Cause

### Why independent free-running loops drift

`HTMLAudioElement` with `audio.loop = true` runs on the browser's native audio rendering thread. Each element maintains its own internal playback clock, which is driven by the OS audio subsystem. Even when all elements are started simultaneously via a synchronous batch `play()`:

1. **Scheduler jitter** — the browser's audio scheduler aligns play requests to the next render quantum (~2.9ms at 44.1kHz/128 frames). With 7 elements, they may land on different quanta, creating an initial spread of up to 2.9ms per element.

2. **Loop-point timing** — at every loop wrap, the browser must seek from `audio.duration` back to `0`. The precision of this seek varies between browser versions and audio formats. Each wrap can introduce a sub-millisecond error. After 100 loops, these accumulate.

3. **Audio clock drift** — the OS audio clock and the JavaScript `performance.now()` clock are independent. Over minutes of playback, the ratio of audio frames rendered to wall-clock time can drift by up to ~100 ppm (0.01%), producing ~6ms of drift per minute — 60ms after 10 minutes.

4. **Resume misalignment** — even after the true-transport-lock resume (synchronous batch `play()` from stored `audio.currentTime`), the batch-start precision is ~3ms. For a kick drum with a sharp 10ms transient, this is audible as a "flamming" effect.

**These are native browser behaviors, not bugs in the application code.** They cannot be fully eliminated without switching to `AudioBufferSourceNode` (decoded PCM). The master phase lock monitor is the correct corrective layer on top of native looping.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Added 3 new constants: `PHASE_CORRECTION_INTERVAL_MS`, `PHASE_SOFT_THRESHOLD_MS`, `PHASE_HARD_THRESHOLD_MS` |
| `src/App.tsx` | Added `phaseCorrectionIntervalRef` |
| `src/App.tsx` | Updated `applyCleanBootState` to clear phase correction interval |
| `src/App.tsx` | Updated `clearMasterCycle` to clear both intervals (removed early-return guard) |
| `src/App.tsx` | Added `runPhaseCorrectionPass` callback |
| `src/App.tsx` | Updated `startOrRestartLoops` to start the phase correction monitor |

---

## New Constants

```ts
const PHASE_CORRECTION_INTERVAL_MS = 200   // monitor fires every 200ms
const PHASE_SOFT_THRESHOLD_MS = 25         // < 25ms: within tolerance
const PHASE_HARD_THRESHOLD_MS = 80         // > 80ms: hard snap
```

---

## Architecture

### Monitor lifecycle

```
startOrRestartLoops()
  ├── masterCycleIntervalRef = setInterval(tickMasterClock, 9600)    ← heartbeat
  └── phaseCorrectionIntervalRef = setInterval(runPhaseCorrectionPass, 200)  ← NEW

clearMasterCycle()  [called by stop, reset, replay-stop, pack-change, unmount]
  ├── clearInterval(masterCycleIntervalRef)
  └── clearInterval(phaseCorrectionIntervalRef)   ← NEW

applyCleanBootState()  [called on boot / intro]
  ├── clearInterval(masterCycleIntervalRef)
  └── clearInterval(phaseCorrectionIntervalRef)   ← NEW
```

### Per-pass algorithm

Every 200ms, for each slot in `assignedAudioRef`:

```
Skip if: padOneShotRef.get(slot) === true    ← one-shots exempt
Skip if: audio.paused                         ← true-transport pause / mid-resume
Skip if: !isFinite(audio.duration) || < 0.1  ← not yet loaded

elapsedMs    = performance.now() - musicalClockRef.current.originMs
expectedS    = (elapsedMs % loopDurationMs) / 1000
actualS      = audio.currentTime

delta        = expectedS - actualS
// Unwrap boundary:
if delta >  loopDuration/2  →  delta -= loopDuration
if delta < -loopDuration/2  →  delta += loopDuration

absDeltaMs = |delta| × 1000

absDeltaMs < 25ms   → within tolerance
                      if playbackRate ≠ 1: restore to 1
                      
25 ≤ absDeltaMs ≤ 80ms → SOFT CORRECTION
                      playbackRate = delta > 0 ? 1.02 : 0.98
                      
absDeltaMs > 80ms   → HARD SNAP
                      audio.currentTime = expectedS
                      audio.playbackRate = 1.0
```

---

## Threshold Rationale

### PHASE_SOFT_THRESHOLD_MS = 25ms

- Human JND (just-noticeable difference) for rhythmic asynchrony: ~10–20ms for trained listeners, ~30ms for general audiences
- 25ms ensures correction begins before the drift is perceptible
- Below 25ms: no correction needed; restoring playbackRate=1 if it was nudged

### PHASE_HARD_THRESHOLD_MS = 80ms

At 128 BPM, one beat = 468.75ms. A drift of 80ms = 17% of a beat.  
- Soft correction at +2% rate closes 80ms gap in: 80ms × (1/0.02) × ... ≈ 4 seconds — too slow for beat-critical audio
- Hard snap is near-instantaneous for buffered audio (< 2ms seek for in-memory files)
- At >80ms, the hard snap eliminates the drift in a single correction cycle

### Soft correction: playbackRate ±2%

- 0.34 semitones pitch shift — below the typical ~1-semitone detection threshold for musical context
- At 2% speed-up with 50ms deficit: closes at 1ms per 50ms = 50 correction frames = ~10 seconds
- Actual correction is faster: monitor runs every 200ms, so it re-evaluates every cycle and may escalate to hard snap if not converging

---

## One-Shot Exemption

One-shots (`padOneShotRef.get(slot) === true`) are completely excluded from phase correction. They have no repeating cycle to lock to, and seeking their `currentTime` mid-play would corrupt their intended single-fire behavior. All Delta Pack pads are currently loops (`padOneShotRef = false` for all), so this exemption affects no active pad in the current build.

---

## Interaction with True Transport Lock

After a true-pause resume (`toggleMasterMute` in resume path):
1. Musical clock re-anchored: `originMs = now − pauseClockElapsed`
2. All `audio.currentTime` set to stored positions
3. Batch `audio.play()` called

When the next phase correction pass fires (within 200ms):
- `elapsedMs = now - newOriginMs ≈ pauseClockElapsed + time_since_resume`
- `expectedS ≈ storedTime + time_since_resume`
- `audio.currentTime ≈ storedTime + time_since_resume` (audio advancing normally)
- `delta ≈ 0ms` → no correction needed ✅

The phase correction monitor and the true transport lock are architecturally aligned.

---

## Build Verification

```
npm run build
✓ 1446 modules transformed
✓ 0 TypeScript errors  
✓ 0 lint warnings
✓ built in 13.04s
```
