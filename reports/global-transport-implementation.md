# Global Always-Running Transport — Implementation Report

**Phase:** GLOBAL ALWAYS-RUNNING TRANSPORT
**File touched:** `src/App.tsx` (runtime engine only)
**Build:** `npm run build` → exit 0, zero TypeScript errors, no lint errors
**Scope respected:** No pack audio, pack layout, visuals, or `musicClock.ts` changed. No phase-correction monitor, no `playbackRate` drift correction, no hard `currentTime` snapping, no high-frequency polling re-introduced.

---

## 1. Core idea

Previously each **character slot** lazily created its **own** `HTMLAudioElement` on assignment, and a newly-assigned pad was started with `currentTime = 0` + a quantized `play()`. That per-slot start-from-zero is exactly what let loops fall out of phase.

Now there is a single **pack transport pool**: one persistent `HTMLAudioElement` per pack pad, keyed by pad id. When the transport starts, **every loop pad is reset to bar 1 / beat 1 and `play()`'d together at volume 0**, sharing one timeline origin, and is **never restarted while playing**. Character slots merely hold *references* into the pool, so assigning / removing / muting only changes **gain**.

```
PLAY ──▶ buildPackTransport(pack)  ──▶ 24 elements preloaded
      └▶ startGlobalTransport()    ──▶ all loops: currentTime=0, play(), volume 0  (one synchronous batch)
                                    └▶ assigned + unmuted slots ramped up

assign  ──▶ slot → pool element, gain ramp up      (no play() from zero, no seek)
remove  ──▶ gain ramp to 0, loop keeps running silently
mute    ──▶ gain to 0 (loop keeps running)
unmute  ──▶ gain ramp to target (no restart)
pause   ──▶ freeze whole pool (snapshot currentTime, pause all)
resume  ──▶ restore all currentTime, batch play(), reveal assigned
restart ──▶ startGlobalTransport() again → every loop back to bar 1 beat 1, batch start
```

## 2. New state (refs)

| Ref | Purpose |
| --- | --- |
| `packTransportRef: Map<padId, HTMLAudioElement>` | The always-running pool — one element per pack pad. |
| `packTransportNodesRef: Map<padId, MediaElementAudioSourceNode>` | Compressor routing node per pool element. |
| `packTransportPackIdRef: ActivePackId \| null` | Which pack the pool currently holds (drives rebuild on pack switch). |
| `packTransportBuildRef: Promise \| null` | In-flight build promise so concurrent callers await one load pass. |
| `packPauseOffsetsRef: Map<padId, number>` | `currentTime` snapshot per pool pad at PAUSE. |
| `startGlobalTransportRef` | Indirection so the earlier-declared `startOrRestartLoops` can call the pool starter (which must be declared after `ensureAudioCtx`). |

Removed: `sourceNodesRef` (per-slot nodes) and the slot-keyed `pauseOffsetsRef` — both superseded by the pool equivalents.

## 3. New functions

- **`buildPackTransport(packId)`** — idempotent; disposes a previous pack's pool, then creates + routes + preloads one element per pad of `packId` and awaits all loads. Concurrent callers await the same promise.
- **`disposePackTransport()`** — stops/detaches every pooled element and disconnects its node.
- **`pausePackTransport()`** — pauses (but keeps loaded) every pooled element; used when the stage empties so silent decoders stop.
- **`startGlobalTransport()`** — batch reset + `play()` of all loop pads at volume 0, then reveals assigned/unmuted slots. One-shots (archived packs only) stay parked and fire only on reveal.
- **`logGlobalTransportDiagnostics()`** — DEV-only sync report (see report 2).

## 4. Functions changed

| Function | Old behaviour | New behaviour |
| --- | --- | --- |
| `createAssignedAudio` | Created a new element, routed it, awaited load, then quantized `currentTime=0` + `play()`. | Builds/reuses the pool, **maps** the slot to the pad's already-running element, **ramps gain** (no element creation, no seek, no quantized restart). One-shots fire once on reveal. |
| `disposeAssignedAudio` | Stopped + tore down the element + node. | **Hides**: cancels ramp, fades loop to 0, keeps it running in the pool, drops slot mapping + slot metadata. One-shots paused. |
| `startOrRestartLoops` | `startAllAssignedAudio({forceRestart})` (restarted each assigned element). | `startGlobalTransportRef.current()` — batch-starts the whole pool at a shared origin. |
| `toggleMasterMute` (pause/resume) | Froze/restored only **assigned** slots. | Freezes/restores the **whole pool** (keyed by pad id) so silent loops stay phase-locked and their decoders stop while paused. |
| `handleStopReset` | Tore down assigned elements. | Also `disposePackTransport()` — full stop frees the pool. |
| `removeFromSlot` (empty stage) | Just cleared the cycle. | Also `pausePackTransport()` — parks silent decoders; next start replays from bar 1. |
| `handleReplayMix` | Created fresh per-slot elements for the recorded pack. | Builds the pool for the recorded pack and **maps** initial slots to pooled elements (explicit pack id, no stale closure). |
| Reset/unmount cleanup | Tore down assigned elements. | Also tears down the pool. |

## 5. Code removed (old behaviour deleted)

- `startAssignedSlotAudio` — per-slot `currentTime = 0` + `play()` starter (the drift source on assign).
- `startAllAssignedAudio` — per-slot batch starter.
- `resolvePlaybackQuantization` + the quantized `setTimeout` start path in `createAssignedAudio`.
- `msUntilNextBoundary` import (now unused).
- Per-slot `sourceNodesRef` and slot-keyed `pauseOffsetsRef`.

> Quantization on **assignment** is no longer needed: the loop a character reveals is already running in phase, so it lands on the grid by construction. The musical clock, `currentBeatInBar`, `currentBarInLoop` and the bar/beat overlay are untouched.

## 6. Replay / share compatibility

The replay timeline (`sa` / `sc` / `sm` / `mm` / `pl` / `vo` / `pk`) is unchanged in shape. `sa` → maps + reveals via the pool; `sc` → hides; mute/volume/pack events operate on the pooled references exactly as before. `handleReplayMix` now builds the pool for the recorded pack instead of creating throwaway elements.

## 7. Risks / notes

- **Idle decode under load:** all loop pads (≈24) decode continuously while the transport runs, vs. the old max of 7. Plain PCM-WAV decode is far cheaper than the previously-removed pitch-shift DSP / animated blur that caused overheating, and **pause freezes the whole pool** and **empty-stage parks it**, so idle cost is bounded. Worth watching on the target MacBook under a long full-stage session.
- **First-start latency:** the first PLAY / first assignment awaits the whole pool loading once (local WAVs). Subsequent assigns are instant reveals.
- **Replay start:** the pool rebuilds at replay start; on a cold load the first event may wait for the one-time load. Negligible for local assets.
- **Audible validation** (no double beats / no drift / no clicks) must be confirmed by ear in the browser — see `sync-architecture-validation.md` for the checklist.
