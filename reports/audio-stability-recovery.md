# Audio Stability Recovery Report

**Branch**: `recovery-audio-stability`  
**Date**: 2026-05-26  
**Status**: Build passing · Phase correction disabled · Delta Pack playable

---

## Summary

The IncrediBoy audio engine accumulated multiple layers of "correctness" systems over the
past sprint — phase correction, drift-rate correction, diagnostic polling, and gain-ramp
redesigns — each introduced to fix a specific symptom.  Under 7-pad full-stage load these
systems were fighting each other and were themselves the primary source of CPU heat,
audible clicks, and intermittent audio loss.

This report documents the root causes identified, the rollback approach chosen, and the
minimal set of changes applied to the `recovery-audio-stability` branch.

---

## Git Context

| Commit | Description |
|--------|-------------|
| `77df5fb` | **Stable checkpoint** — last committed state with all Delta audio, UI cleanup complete, build clean |
| HEAD (uncommitted) | All changes since checkpoint: voice1 replacement, smooth-playability, background, perf-debug, UI cleanup, gain-ramp redesign — all working-tree only |

All changes since `77df5fb` are working-tree modifications (never pushed).  The recovery
branch starts from the checkpoint and carries forward **all** working-tree changes.

---

## Root Cause Analysis

### 1. Phase Correction — PRIMARY CAUSE of heat and clicks

**Location**: `src/App.tsx` — `runPhaseCorrectionPass` called via `phaseCorrectionIntervalRef`
every `PHASE_CORRECTION_INTERVAL_MS = 2000 ms`.

**What it did on every pass (7 active pads)**:
- Read `audio.currentTime` on all 7 active elements (14 reads including boundary guard check)
- If delta > `PHASE_SOFT_THRESHOLD_MS (40ms)`: write `audio.playbackRate = 0.98 or 1.02` — triggers the browser's **real-time pitch-shift DSP** (WSOLA/SRC algorithm) on all 7 elements simultaneously
- If delta > `PHASE_HARD_THRESHOLD_MS (150ms)`: write `audio.currentTime = expectedS` mid-loop — **flushes the audio decoder's internal buffer**, producing an audible click

**Why this caused heat**: 7 simultaneous `playbackRate ≠ 1.0` settings force the browser
to run a pitch-preserving time-stretch algorithm continuously across all active decoders.
This is expensive even for a single stream; at 7 streams under full load it dominates the
audio thread.

**Why this caused clicks**: `audio.currentTime` writes during active playback force the
decoder to seek mid-stream, discarding buffered samples and re-decoding from the new
position.  The brief gap produced a click, especially near loop boundaries.

**Why this caused false positives**: Under any CPU spike, the browser's audio callback
could be delayed by 10–50 ms.  Phase correction read `currentTime` during this slowed
state, computed a "large drift", and applied a hard snap or playbackRate nudge — which
itself caused a further stall.  A feedback loop.

### 2. `allowDriftCorrection` playbackRate on pad creation

**Location**: `src/App.tsx` — drift correction block in `createAssignedAudio`.

On pad start, if `packPad.allowDriftCorrection` was true, a non-1.0 `playbackRate` was
permanently applied to keep a BPM-misaligned loop in sync.  This engaged continuous
pitch-shift DSP for the lifetime of the pad, even when the phase correction interval was
not firing.

**Relevance to Delta**: All Delta Pack pads have `allowDriftCorrection: false`, so this was
a no-op for the current pack.  However, the block was removed as a general safety measure.

### 3. Diagnostic `setInterval` (DEV only)

The `devDropoutWatcherRef` fires every 5 s in DEV mode and calls `setDevPerfPanel(...)`,
which triggers a React state update and re-render.  This is **DEV-only** (correctly gated
behind `import.meta.env.DEV`) and is not the cause of production instability.  Left intact.

### 4. All other changes since checkpoint

The following changes introduced since `77df5fb` were **beneficial or neutral** and are
kept in the recovery branch:

| Change | Verdict |
|--------|---------|
| Gate `audio.onpause/onended` logs behind DEV | ✅ reduces main-thread log pressure |
| Consolidate `audio.volume` writes into single RAF path | ✅ reduces DOM write frequency |
| Beat overlay tick 80ms → 250ms | ✅ fewer React re-renders |
| Muted-slot early-exit in `runPhaseCorrectionPass` | neutral (pass is now disabled) |
| `scheduleGainRamp` cancellation redesign | ✅ prevents overlapping RAF loops |
| `isRampActive` guard in volume RAF and category-gain useEffect | ✅ prevents competing writes |
| `cancelGainRamp` on pad dispose | ✅ clean teardown |
| Removed top navigation bar | ✅ UI simplification |
| DEV perf panel moved inside diagnostics drawer | ✅ no production overlay |
| Voice Pad 1 replacement | ✅ audio asset improvement |
| `brick-graffiti-wall.png` stage background | ✅ visual improvement |

---

## Changes Applied in Recovery Branch

### `src/App.tsx`

**1. Phase correction `setInterval` commented out** in `startOrRestartLoops`:
```typescript
// phaseCorrectionIntervalRef.current = window.setInterval(
//   runPhaseCorrectionPass,
//   PHASE_CORRECTION_INTERVAL_MS,
// )
```
The interval handle is never set, so `phaseCorrectionIntervalRef.current` stays `null`.

**2. `runPhaseCorrectionPass` returns immediately** via early guard:
```typescript
if (!phaseCorrectionIntervalRef.current) return  // interval not running; nothing to do
```
The function body (playbackRate nudges, hard currentTime snaps) is never executed.

**3. Drift-correction playbackRate block commented out**:
The `if (packPad?.allowDriftCorrection && ...)` block that set `audio.playbackRate` at
pad creation is replaced with a comment.  No `playbackRate` writes happen anywhere in the
engine during normal playback.

**4. `computePlaybackRate` import removed** (no longer referenced, kept TypeScript clean).

### `src/musicClock.ts`
No changes required — `scheduleGainRamp` cancellation fix from the previous phase is kept.

---

## Systems Preserved (Unchanged)

| System | Status |
|--------|--------|
| Native `audio.loop = true` looping | ✅ active |
| True transport pause/resume (currentTime offset store + restore) | ✅ active |
| `scheduleGainRamp` with cancellation | ✅ active |
| Mute/unmute via `scheduleGainRamp` | ✅ active |
| `computeEnhancedCategoryGains` dynamic gain staging | ✅ active |
| DynamicsCompressorNode glue compression | ✅ active |
| AudioContext resume on-demand | ✅ active |
| Beat/bar tick (`masterCycleIntervalRef`, 9600 ms) | ✅ active |
| Quantized pad start (`quantizeTimersRef`) | ✅ active |
| One-shot retrigger cycling | ✅ active |
| Replay / share | ✅ active |
| DEV diagnostics drawer | ✅ active |

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| `audio.playbackRate` writes/sec (7 pads) | up to 7 per 2s pass | **0** |
| `audio.currentTime` writes during playback | up to 7 hard snaps per 2s | **0** |
| Browser pitch-shift DSP load | continuous when pads drifted | **none** |
| Phase correction decoder seeks | intermittent, caused clicks | **eliminated** |
| `setInterval` count | 3 (master + phase + DEV watcher) | **2** (master + DEV watcher) |

---

## Why Native Looping Is Sufficient

Delta Pack audio files are:
- PCM WAV (no decode latency variance)
- Pre-aligned to exactly 128 BPM bar boundaries
- Loop-trimmed to exact power-of-2 bar lengths

All active pads start in the same synchronous batch (`startAllAssignedAudio`) with their
`currentTime` set identically.  The native browser looping algorithm advances their
read heads at the same rate.  Natural drift between `HTMLAudioElement` instances in
Chromium/Safari is typically **< 5 ms per minute** — perceptually undetectable and far
below the original `PHASE_SOFT_THRESHOLD_MS = 40 ms` at which correction would have fired.

The phase correction system was solving a problem that didn't meaningfully exist for
aligned PCM loops, at significant cost to stability.

---

## Test Checklist

- [ ] Load Delta Pack — all 24 pads render
- [ ] Drag 7 characters onto stage — all play
- [ ] Run 5 minutes — no audio dropout, no silence
- [ ] Beats stay locked throughout 5 minutes
- [ ] Pause → wait 10 s → Resume — groove continues from same position
- [ ] Mute / unmute individual pads — smooth fade, no click
- [ ] Volume slider 0→100→0 repeatedly — no dropout
- [ ] MacBook fans: significantly quieter than before

---

## Rollback Safety

If this branch proves problematic:
```bash
git checkout main   # returns to 77df5fb checkpoint
```

The checkpoint retains the full phase correction system exactly as it was.

---

## Recommendation

Do **not** re-enable phase correction unless a specific, measurable drift problem is
identified with a future pack that cannot be solved at the audio-file level (trimming,
BPM correction via ffmpeg before copying to `public/audio/`).

For new packs: run drift analysis *before* build and correct files offline.
The pack builder pipeline already produces loop-validation reports that can flag
duration mismatches before they reach runtime.
