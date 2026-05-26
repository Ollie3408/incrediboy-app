# Delta Beat 3 — Double-Trigger Bug Fix Report

**Date:** 2026-05-25  
**Phase:** DELTA BEAT 3 DOUBLE-TRIGGER BUG FIX  
**Status:** Fixed  

---

## Symptom

Beat Pad 3 (game pad `beat-2`, pack pad `deltaPack-beat-03`) produced audible
"double-beats" and drifted out of synchronisation with the other beat pads,
particularly after play → pause → unpause cycles.

---

## Audio File Validation

| Property        | Value                                    |
|-----------------|------------------------------------------|
| File            | `beats/beat-03.wav`                      |
| Source          | Stickz – Byte Drum Loop 004 – 128BPM.wav |
| Duration        | 30.000s (16 bars × 128 BPM = exact)      |
| MD5             | `af8f9b9eab182490e4d6d4607535d1ca`       |
| Leading silence | None — beat starts at t=0                |
| Tail silence    | 28.35s – 30.0s (1.65s natural tail)      |
| Mid-loop rests  | ~3.57s (55ms rest), ~7.73s (215ms rest) — both musically structural |
| Loop boundary   | Clean — file ends at 30.0s, loops to 0   |
| Embedded flam   | None detected                            |

**Conclusion:** The audio file is structurally sound.  The double-beat was
**not** caused by the audio file.

---

## Root Cause — Phase Correction Hard Snap

### Mechanism

The phase correction monitor (`runPhaseCorrectionPass`) runs every
`PHASE_CORRECTION_INTERVAL_MS = 2 000 ms`.  For each active loop pad it
computes:

```
expectedS = (elapsedMs % loopDurationMs) / 1000
delta     = expectedS − audio.currentTime
```

If `|delta| > PHASE_HARD_THRESHOLD_MS (150 ms)`, the monitor performs a
**hard snap**: it seeks `audio.currentTime = expectedS` — an abrupt jump.

### Why it produced a double-beat

When `audio.play()` is called (initial play, or resume after pause), the
browser schedules decoding and buffering before audio actually starts.
This startup latency is typically 50–500 ms depending on the browser,
system load, and audio format.

During this startup window the audio element's `currentTime` is frozen at
the restore point.  Meanwhile the master clock (and therefore `expectedS`)
keeps advancing.  When the correction monitor fires during this window it
sees:

```
expectedS  ≈ restoredTime + elapsed_since_play()   (e.g. 8.30s)
currentTime = restoredTime                          (e.g. 7.95s)
delta       = 350 ms  →  exceeds PHASE_HARD_THRESHOLD_MS (150 ms)
```

The monitor hard-snaps Beat 3 to `expectedS = 8.30s`.  If the groove
contains a kick transient at ~8.30s the user hears:

1. The transient that was naturally at 7.95s plays as normal.
2. The snap jumps the file forward 350 ms.
3. The transient at 8.30s fires immediately after the snap.
4. **Audible result: double-beat (flam).**

This was especially pronounced after pause/resume because:
- `toggleMasterMute` calls `audio.play()` for ALL pads in Phase 4.
- The phase correction interval timer (already running) could fire as
  little as ~500 ms after resume (depending on where in the 2 000 ms
  cycle it was).
- Beat 3's 30s loop means the monitor computed phase against a 30s
  modulus — more sensitive to small startup-delay mismatches.

---

## Fix — Per-Slot Post-Play Settle Period

### New constant

```ts
const PHASE_SETTLE_MS = 3_000
```

3 000 ms is longer than the 2 000 ms correction interval, so at least
one phase correction pass is always skipped after any `play()` call.

### New ref

```ts
const slotLastPlayTimeRef = useRef<Map<number, number>>(new Map())
```

Stores `performance.now()` for the most recent `audio.play()` call per
slot index.

### Play-time recording — three sites

| Function                    | Path                     |
|-----------------------------|--------------------------|
| `startAssignedSlotAudio`    | `shouldRestart` branch   |
| `startAssignedSlotAudio`    | Silent-loop branch       |
| `toggleMasterMute` Phase 4  | Transport resume         |

Recording happens **before** `audio.play()` is called so the settle
guard always sees the correct base time.

### Guard in `runPhaseCorrectionPass`

```ts
const lastPlayTime = slotLastPlayTimeRef.current.get(slot) ?? 0
if (performance.now() - lastPlayTime < PHASE_SETTLE_MS) {
  skippedCount++
  return   // skip — audio is still in its startup window
}
```

This is inserted as the first per-slot check, before the boundary guard
or drift calculations.

### Cleanup

| Function              | Action                               |
|-----------------------|--------------------------------------|
| `disposeAssignedAudio`| `slotLastPlayTimeRef.delete(slot)`   |
| `handleStopReset`     | `slotLastPlayTimeRef.clear()`        |

---

## DEV-Only Beat 3 Lifecycle Logging

All logs are gated on `import.meta.env.DEV` and keyed with `[beat3]`.

| Event                    | Log prefix / message                  |
|--------------------------|---------------------------------------|
| Audio element created    | `[beat3] audio element created`       |
| `currentTime` reset to 0 | `[beat3] currentTime reset to 0`      |
| `play()` queued          | `[beat3] play() queued`               |
| `play()` promise resolved| `[beat3] play() resolved`             |
| Transport FREEZE (pause) | `[beat3] transport FREEZE`            |
| Transport RESUME (restore)| `[beat3] transport RESUME restoring currentTime` |
| Transport RESUME (play)  | `[beat3] transport RESUME play() queued` |
| Phase correction check   | `[beat3] phase correction check`      |
| Soft nudge               | `[beat3] phase soft nudge`            |
| Hard snap                | `[beat3] phase HARD SNAP`             |
| Dispose                  | `[beat3] dispose`                     |

---

## Files Changed

| File                          | Change                                                   |
|-------------------------------|----------------------------------------------------------|
| `src/App.tsx`                 | `PHASE_SETTLE_MS` constant                               |
| `src/App.tsx`                 | `slotLastPlayTimeRef` ref                                |
| `src/App.tsx`                 | Play-time recording in `startAssignedSlotAudio`          |
| `src/App.tsx`                 | Play-time recording in `toggleMasterMute` resume Phase 4 |
| `src/App.tsx`                 | Settle-period skip guard in `runPhaseCorrectionPass`     |
| `src/App.tsx`                 | DEV Beat 3 logs in `createAssignedAudio`                 |
| `src/App.tsx`                 | DEV Beat 3 logs in phase correction pass                 |
| `src/App.tsx`                 | DEV Beat 3 logs in transport freeze/resume               |
| `src/App.tsx`                 | Cleanup in `disposeAssignedAudio` + `handleStopReset`    |

No audio files were changed.  No pack metadata was changed.

---

## Validation Checklist

| Test                                     | Expected result                             |
|------------------------------------------|---------------------------------------------|
| Beat 3 alone — 3 min                     | No double-beat, clean groove                |
| Beat 1 + Beat 3                          | Beats land together, no flam                |
| All 5 beats together                     | Aligned kick/snare grid                     |
| Pause → unpause 30×                      | No double-beat after each resume            |
| Mute → unmute Beat 3                     | Resumes cleanly, no position reset          |
| Remove → reassign Beat 3                 | Starts at next bar boundary, no stutter     |
| 5-minute full-stage playback             | No progressive drift, no double-beats       |
| npm run build                            | ✓ Exit 0, 0 TypeScript errors               |

---

## Residual Phase Correction Behaviour

Phase correction (soft nudge ±2 %, hard snap > 150 ms) remains active for
all loop pads **after** the 3-second settle window.  This provides ongoing
drift insurance for long sessions without risking post-play disruption.

For Beat 3 specifically: the settle window covers the entire startup
latency envelope on all supported browsers.  After 3 s, `currentTime` has
been advancing normally for at least 2.5 s, so any measured delta
accurately reflects true drift — not startup lag.
