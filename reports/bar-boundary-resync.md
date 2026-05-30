# Bar-Boundary Resync — Implementation Report

**Phase:** BAR-BOUNDARY RESYNC
**File touched:** `src/App.tsx` (runtime only)
**Build:** `npm run build` → exit 0, zero TypeScript errors, no lint errors
**Scope respected:** No pack audio, layouts, visuals, or `musicClock.ts` changed. No continuous phase-correction monitor, no `playbackRate` nudges, no hard `currentTime` snapping during audible playback, no high-frequency polling.

---

## Problem

The global transport starts all loops in sync, but over minutes individual `HTMLAudioElement`s free-run at minutely different real rates, so beats gradually drift and **stay** drifted. *Restart Loops* fixes it by re-aligning to bar 1 / beat 1 — proof that a periodic re-alignment is all that's needed.

## Solution — scheduled phrase-boundary resync

Once per **16-bar phrase** (≈30 s @ 128 BPM) every running pool loop is snapped back to its exact expected musical position in **one synchronous batch**. It is not continuous correction: it fires ~twice a minute, only touches pads that have drifted past threshold, and only when some loop has crossed the trigger.

### Why 16 bars
At a 16-bar boundary the expected position of any loop whose length divides 16 bars (the 4 / 8 / 16-bar loops in Bravo/Alpha/Delta) is **≈ 0** — the loop-start zero-crossing. Seeking there is the cleanest, most inaudible correction point, and it coincides with where native looping would wrap anyway.

## How it works

### Scheduling (`scheduleResync`)
```
barMs    = (60 / bpm) * 4 * 1000          // 128 BPM → 1875 ms
resyncMs = barMs * 16                       // → 30000 ms
```
- BPM is read from the active pack's pads (fallback 128), so non-128 packs self-adjust.
- The **first** tick is aligned to the next 16-bar boundary from the transport origin (`resyncMs − (elapsed % resyncMs)`), then a `setInterval(resyncMs)` repeats. No high-frequency polling.
- Clears any existing timers first → never duplicates across restart / pause / resume.

### Correction (`runBarBoundaryResync`)
```
elapsedMs = now − origin
for each running pool loop:
    loopMs   = duration * 1000
    expected = (elapsedMs % loopMs) / 1000
    drift    = circular_distance(currentTime, expected)   // handles wrap-around
    track maxDrift; queue pad if drift > 12 ms
if maxDrift < 20 ms or nothing queued → no-op (just log in DEV)
else (batch, one synchronous pass):
    queued pad → volume = 0; currentTime = expected
    after 12 ms → ramp previously-audible pads back to their captured volume over 35 ms
```

### Thresholds (per the spec)
| Constant | Value | Meaning |
| --- | --- | --- |
| `RESYNC_IGNORE_MS` | 12 ms | drift below this is never touched |
| `RESYNC_TRIGGER_MS` | 20 ms | batch only runs if some loop exceeds this (in the 18–25 ms band) |
| `RESYNC_BARS` | 16 | phrase length |

### Click avoidance
Corrected audible pads are muted instantly (going *to* silence doesn't click), seeked while silent, then ramped back up over 35 ms after a 12 ms settle. Silent pads (unrevealed / muted, `prevVol ≈ 0`) are seeked with no ramp — free and inaudible. Because this happens at a phrase boundary at the loop-start zero-crossing, it is effectively inaudible.

## Pause / resume
- **Freeze:** resync timers are cleared (no ticks while paused; no duplicates on resume).
- **Resume:** after the clock origin is re-anchored, `scheduleResync()` is re-armed from the resumed timeline, re-aligned to the next phrase boundary.

## Restart Loops
Unchanged behaviour (`startOrRestartLoops` → every loop back to bar 1 / beat 1). It now also re-arms the resync schedule. With automatic resync running, it should rarely be needed.

## State added
| Ref | Purpose |
| --- | --- |
| `resyncTimeoutRef` | first-aligned-boundary `setTimeout` handle |
| `resyncIntervalRef` | repeating `setInterval` handle |
| `scheduleResyncRef` | indirection so the early-declared `startOrRestartLoops` can re-arm |
| `resyncStatsRef` | DEV telemetry: last/next time, last max drift, corrected count, total resyncs |

Cleared in `clearMasterCycle` (stop / reset / pack switch) and on pause.

## DEV diagnostics (production-silent)
`⚡ PERF` panel now shows:
- **Resync in: Ns** — countdown to next resync
- **last drift: Nms** — max drift measured at the last boundary
- **Corrected: N** — pads corrected at the last boundary
- **total resyncs: N** — corrections this session

Plus DEV console lines at each boundary (`[resync] …`). No logs in production.

## Risks / notes
- Loops whose length does **not** divide 16 bars (rare in current packs) resync to a mid-loop `expected`; the gain dip masks it but it's marginally more audible than a divisor loop. All Bravo/Alpha/Delta loops are 4/8/16-bar.
- `setTimeout`/`setInterval` jitter means a tick can land a few ms past the true boundary; `expected` is computed live so the target stays correct, just a few ms past loop start (still inaudible).
- The fix reduces *accumulated* drift; it does not eliminate the few-ms intra-phrase drift between resyncs (well under the 18–25 ms audibility band by design).
