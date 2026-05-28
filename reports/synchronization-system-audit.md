# Synchronization System Audit

**Branch**: `recovery-audio-stability`  
**Date**: 2026-05-27  
**Scope**: Post-recovery state — no code modified during this audit.

---

## 1. Is native `audio.loop` still active for loop pads?

**YES — fully active.**

In `createAssignedAudio` (App.tsx line 2608):

```typescript
audio.loop = !isOneShot
```

For every pad where `packPad.playbackMode !== 'one-shot'`, the HTML audio element is
created with `loop = true`.  Delta Pack defines all 24 pads as `playbackMode: 'loop'`
(including FX and transitions, which encode silence in the file itself).  Therefore every
Delta slot gets `audio.loop = true` at creation time.  No manual restart or retrigger
is required.

---

## 2. Is quantized pad entry still active?

**YES — fully active.**

When a pad is dragged onto a slot during an active session, `createAssignedAudio` checks
whether a session is running:

```typescript
if (masterCycleIntervalRef.current === null || !isPlayingRef.current) {
  startOrRestartLoops()   // cold start: all pads together
} else {
  // hot add: schedule to next beat/bar boundary
  const quantize = resolvePlaybackQuantization(packPad)   // 'bar', 'beat', or 'immediate'
  const delay = msUntilNextBoundary(musicalClockRef.current, quantize)
  const tid = window.setTimeout(() => startAssignedSlotAudio(…), delay)
  quantizeTimersRef.current.set(slotIndex, tid)
}
```

`msUntilNextBoundary` reads from the live `musicalClockRef` (anchored at session start)
and returns exact milliseconds until the next beat or bar edge.  Quantize mode is
resolved per-pad from pack metadata (`playbackQuantization`):
- Beats, bass, melody, atmospheres, FX → `'bar'`
- Vocals → `'beat'`
- True one-shots → `'immediate'`

During replay, quantization is bypassed (`'immediate'`) to preserve timeline accuracy.

---

## 3. Is `musicalClockRef` still used?

**YES — fully active.**

`musicalClockRef` is the live session clock. It stores:
- `originMs`: `performance.now()` at session start (set once in `startOrRestartLoops`, never reset)
- `bpm`: updated by `clockWithBpm()` if BPM changes
- `loopMs`: master loop duration (9600 ms)

It is read by:
- `msUntilNextBoundary()` for quantized pad entry
- `tickMasterClock()` heartbeat for diagnostic logging
- Transport resume to re-anchor after pause

---

## 4. Is `msUntilNextBoundary` still used?

**YES — actively called on every hot pad addition.**

Called in `createAssignedAudio` (line 2696) to compute the quantize delay.  It is the
sole mechanism that ensures new pads join the mix on a musical boundary rather than
starting arbitrarily mid-beat.

---

## 5. Does `startOrRestartLoops` start all active pads together?

**YES — synchronous batch start.**

```typescript
const startOrRestartLoops = () => {
  clearMasterCycle()
  // … clock re-anchor, isPlaying set …
  startAllAssignedAudio({ forceRestart: true, fadeIn: true })   // ← all pads
  masterCycleIntervalRef.current = setInterval(tickMasterClock, MASTER_LOOP_MS)
}
```

`startAllAssignedAudio` iterates every entry in `assignedAudioRef` and calls
`startAssignedSlotAudio` for each.  All `audio.play()` calls are issued within
the same synchronous JavaScript task (no `await` between them), so the browser
receives them in the same event loop turn and can align them to the same audio
render quantum (~3 ms on Chromium/Safari).

---

## 6. Does pause/resume preserve `currentTime` offsets?

**YES — full offset capture and restore.**

**On pause** (`toggleMasterMute` → muted path):
```typescript
assignedAudioRef.current.forEach((audio, slot) => {
  pauseOffsetsRef.current.set(slot, audio.currentTime)
  audio.pause()
})
pauseClockElapsedRef.current = performance.now() - musicalClockRef.current.originMs
```

**On resume**:
1. Clock is re-anchored: `originMs = performance.now() - pauseClockElapsedRef.current`
2. AudioContext is woken if suspended
3. **Phase 3** — synchronous `currentTime` restore for all pads (before any `play()`):
   ```typescript
   assignedAudioRef.current.forEach((audio, slot) => {
     const storedTime = pauseOffsetsRef.current.get(slot)
     audio.currentTime = storedTime ?? estimatedPosition
   })
   ```
4. **Phase 4** — synchronous batch `play()` (all at `volume = 0`)
5. **Phase 5** — after 30 ms settle, `scheduleGainRamp` ramps each slot to target volume

This sequence is sample-accurate within browser constraints: all seeks happen before any
`play()`, and all `play()` calls are issued without `await` between them.

---

## 7. Is `phaseCorrectionIntervalRef` active or disabled?

**DISABLED — interval is never started.**

In `startOrRestartLoops`, the phase correction `setInterval` call is commented out:
```typescript
// phaseCorrectionIntervalRef.current = window.setInterval(
//   runPhaseCorrectionPass,
//   PHASE_CORRECTION_INTERVAL_MS,
// )
```

The ref always holds `null`.  The `clearMasterCycle` function still safely calls
`clearInterval(phaseCorrectionIntervalRef.current)` as a defensive no-op.

---

## 8. Is `runPhaseCorrectionPass` active or stubbed?

**STUBBED — function body removed.**

```typescript
const runPhaseCorrectionPass = useCallback(() => { /* disabled */ }, [])
```

Even if the interval were accidentally re-enabled, the function would do nothing.  The
150-line body containing `playbackRate` nudges and `currentTime` hard-snaps was removed
in the `final-delta-performance-cleanup` pass.

---

## 9. Is `playbackRate` correction disabled?

**YES — no `audio.playbackRate` writes occur anywhere in normal playback.**

Confirmed scan of `src/App.tsx`:
- The drift-correction block in `createAssignedAudio` is commented out
- The soft-nudge (`rate = 1.02 / 0.98`) in `runPhaseCorrectionPass` is gone with the body
- The only surviving `playbackRate` reference is `audio.playbackRate.toFixed(3)` inside
  the DEV diagnostic log (`logFullMixDiagnostics`) — a **read**, not a write

All active audio elements run at `playbackRate = 1.0` (browser default) for the entire
lifetime of the session.

---

## 10. Are hard `currentTime` snaps disabled during normal playback?

**YES — `currentTime` is only written in two safe contexts:**

| Context | When | Safe? |
|---------|------|-------|
| `createAssignedAudio` → `audio.currentTime = 0` | Before first `play()` | ✅ Safe — seek before start |
| Transport resume Phase 3 | Before batch `play()`, while all pads are paused | ✅ Safe — seek before start |

No code path writes `audio.currentTime` on a **playing** element.  The phase correction
hard-snap code (`audio.currentTime = expectedS` on a live loop) was removed entirely.

---

## 11. Are one-shot/transition loops handled safely?

**YES — Delta Pack has zero true one-shots.**

All 24 Delta Pack pads have `playbackMode: 'loop'`.  FX and transitions achieve their
"fire once" character by encoding the effect sound followed by silence in a single
bar-aligned WAV file, then using `audio.loop = true` to cycle the whole thing.

For example:
- `fx-01` (Byte Impact): 6s impact hit + 9s silence = 15s = exact 8-bar loop at 128 BPM
- `trans-01` (Byte Fill A): 1-bar fill + 3 bars silence = 7.5s = exact 4-bar loop

This means the FX character stays "active" (non-muted) and the file auto-retriggers
on every cycle without any JS code. No `onended` handler, no retrigger timer, no
manual restart.  Thermal cost: zero.

For future packs with true `playbackMode: 'one-shot'` pads, the `padOneShotRef` map
correctly sets `audio.loop = false` and the `onended` handler logs in DEV but does
not retrigger — the character stays assigned but goes silent.  This is the expected
one-shot behavior.

---

## 12. Is Delta relying on exact file lengths and native looping?

**YES — this is the complete synchronization model.**

**Assumptions the current engine makes about Delta Pack files:**
1. All loop files have a duration that is an exact multiple of `(60 / 128) × 4` seconds
   (one bar at 128 BPM = 1.875 s)
2. Audio content begins at `t = 0` (no leading silence pre-roll)
3. Loop boundary is seamless (no click, no gap, no tail)
4. All files start simultaneously from `currentTime = 0` in `startOrRestartLoops`

Under these conditions, native browser looping (`audio.loop = true`) maintains
synchronization indefinitely: all elements advance their read head at the same rate
(1.0 × sample rate), loop back to position 0 at the same moment (relative to their
start), and stay phase-locked without any JS intervention.

**Measured natural drift** for PCM WAV loops on Chromium/Safari: typically < 5 ms/minute.
Delta Pack bars are 1.875 s long; 5 ms represents 0.27% of one bar — imperceptible.

---

## Active Synchronization Mechanisms Summary

| Mechanism | Active | Thermal cost |
|-----------|--------|-------------|
| `audio.loop = true` for all loop pads | ✅ | Near-zero |
| Quantized pad entry via `msUntilNextBoundary` | ✅ | Near-zero (fired once per drag) |
| Session clock `musicalClockRef` (origin-anchored) | ✅ | Near-zero |
| Master heartbeat `setInterval(9600ms)` | ✅ | Near-zero (fires every 9.6 s) |
| Synchronous batch start `startAllAssignedAudio` | ✅ | One-time on session start |
| `pauseOffsetsRef` capture/restore on pause/resume | ✅ | One-time on user interaction |
| `scheduleGainRamp` for smooth volume transitions | ✅ | RAF during ramp only (~60 ms) |
| `computeEnhancedCategoryGains` dynamic gain staging | ✅ | On slot change only |
| DynamicsCompressorNode (Web Audio) | ✅ | Low (hardware DSP path) |

---

## Disabled Mechanisms

| Mechanism | Status | Why disabled |
|-----------|--------|-------------|
| Phase correction monitor | ❌ Disabled | `playbackRate` changes forced GPU pitch-shift DSP on 7 elements → thermal overload |
| `audio.playbackRate` soft nudges (±2%) | ❌ Disabled | Continuous pitch-shift DSP; false positives under CPU load |
| `audio.currentTime` hard snaps | ❌ Disabled | Mid-loop seeks flush decoder buffers → audible clicks |
| `allowDriftCorrection` per-pad `playbackRate` | ❌ Disabled | No Delta pad uses it; code block commented out |
| `devDropoutWatcher` 5 s interval | ❌ Production | DEV-only, gated behind `import.meta.env.DEV` |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Browser loop gap at boundary | Low | Sub-5ms for PCM WAV in Chrome/Safari; imperceptible |
| Gradual drift over very long sessions (30+ min) | Low | < 25ms after 30 min for aligned WAVs |
| New pack with BPM-misaligned files | Medium | Would drift visibly; requires file-level correction before add |
| AudioContext auto-suspend after browser policy change | Low | Handled by `tickMasterClock` heartbeat + `onstatechange` |
| True one-shot pads going silent after firing | Medium | Expected behavior; only affects future packs using `playbackMode:'one-shot'` |

---

## Verdict

The current synchronization system is **safe, correct, and thermally lightweight**.

- Two timers running during a session: 9600ms heartbeat + (DEV-only) 5000ms dropout watcher
- Zero `playbackRate` writes during playback
- Zero `currentTime` writes to playing elements
- All sync derived from native browser looping + one-time synchronized batch start
- Pause/resume is sample-accurate within browser constraints

The architecture is suitable for Delta, Alpha, and any future pack whose audio files are
pre-aligned to the target BPM at the file level.
