# Web Audio Engine Migration — Sample-Accurate Loop Transport

**Phase:** SAMPLE-ACCURATE WEB AUDIO ENGINE
**Date:** 2026-05-30
**Status:** Implemented — `tsc -b --force` clean, `npm run build` passes. Audible validation pending (see checklist in `sample-accurate-sync-validation.md`).

---

## 1. Why

The Loop Truth Audit proved every beat WAV is sample-perfect. The residual drift
therefore came entirely from the playback layer: each `HTMLAudioElement` ran on
its **own** media clock and its native `loop` seam is **not** sample-accurate, so
independent elements slowly walked apart over minutes of play.

The fix is to stop relying on `HTMLAudioElement` looping and instead loop decoded
`AudioBuffer`s with `AudioBufferSourceNode`s on **one shared `AudioContext`
clock**. All loops then advance from the same sample counter and can never drift
relative to one another.

---

## 2. What changed

### New abstraction — `BufferVoice` (module scope in `App.tsx`)
One sample-accurate loop voice per pack pad:

- Holds the decoded `AudioBuffer` and **one persistent `GainNode`** (audibility).
- `startAt(when, offset)` (re)creates a single-use `AudioBufferSourceNode`
  (`loop = true`), connects it to the voice's GainNode, and schedules it to begin
  at an absolute `AudioContext` time — so a batch of voices started at one shared
  `when` are sample-locked.
- `stop()` disposes the current source; the GainNode and buffer persist, so
  Restart Loops never re-decodes.
- Exposes a thin `HTMLAudioElement`-compatible surface
  (`volume` / `paused` / `duration` / `loop` / `src` / `currentTime` / `play` /
  `pause` / `playbackRate`) so the existing gain-ramp, mute, volume-slider,
  diagnostics, and replay call sites work unchanged. `volume` writes the GainNode,
  so `scheduleGainRamp()` ramps it directly.

### Signal graph
```
BufferVoice.source ─▶ pad GainNode ─▶ DynamicsCompressor ─▶ masterGain ─▶ destination
        (loop)          (audibility)      (glue/limit)        (pause bus)
```
- One pad GainNode per voice (per-pad volume × master slider × category gain).
- `masterGain` is a new node added in `ensureAudioCtx()` used purely as the
  **pause/resume bus** (`1` = playing, `0` = paused).

### `buildPackTransport(packId)`
Now `fetch()` + `decodeAudioData()` each pad WAV into an `AudioBuffer`, creates a
GainNode (gain 0) → compressor, and wraps them in `BufferVoice`s. Idempotent;
switching packs disposes the previous pool first. Buffers cached in
`audioBuffersRef`.

### `startGlobalTransport()`  (global transport)
Captures **one** start instant `ctx.currentTime + 0.08` and `startAt(startAt, 0)`s
every loop voice → all loops begin at bar 1 / beat 1, phase-locked on the audio
clock. Assigned, non-muted slots are then revealed with a gain ramp; one-shots
fire once on reveal.

### Assignment / removal / mute
- **Assign:** map slot → already-running pool voice, ramp its GainNode up. No
  source restart, no `currentTime` reset (`createAssignedAudio`).
- **Remove / mute:** ramp the GainNode to 0; the loop source keeps running
  silently so re-assignment is gapless and in phase (`disposeAssignedAudio`,
  `handleSlotClick`). One-shots stop their source.

### Pause / resume  (chosen option: master-gain mute, clock continues)
`toggleMasterMute()` now ramps `masterGain` `1 → 0` on pause and `0 → 1` on
resume (30 ms click-free ramp). **No source is stopped or reseeked**, so every
loop is still perfectly in phase on resume — the lowest-CPU, most stable option.
The browser is allowed to suspend the `AudioContext` while paused (the
auto-resume guard intentionally does not fire while master-muted); resume wakes
it and continues from the same sample position.

### Restart Loops
`startOrRestartLoops()` → `startGlobalTransport()`, which stops every existing
source and recreates them all at one shared start instant (bar 1 / beat 1).

### Removed reliance on
- **`HTMLAudioElement` loop timing** — the main engine no longer creates `Audio`
  elements or `MediaElementAudioSourceNode`s. (The isolated DEV "native audio
  loop" diagnostic is unrelated and untouched.)
- **`playbackRate` correction** — `BufferVoice.playbackRate` is a constant `1`.
- **Phase correction** — already disabled; remains disabled.
- **Bar-boundary resync (corrective)** — removed. With sample-accurate looping
  there is nothing to correct. The 16-bar timer is repurposed as a **DEV-only,
  observe-only drift monitor** that measures max loop drift and logs it (proof of
  ≈0 drift); it never seeks/mutes and does not run in production.

### Fallback (#6)
A failed `fetch`/`decodeAudioData` for a pad logs a loud
`[web-audio] buffer load/decode FAILED — pad will be silent` warning (DEV and
prod) with pad id, pack, url, and error. The pad is simply silent rather than
crashing the mix. If the `AudioContext` itself is unavailable, the build logs
`[web-audio] AudioContext unavailable — cannot build buffer engine`.

### Replay / share
Format unchanged. `handleReplayMix` rebuilds the buffer pool for the recorded
pack and maps slots to voices; replay event handlers (`sa/sc/sm/mm/pl/vo/bp/pk`)
drive voice gains exactly as before.

---

## 3. Removed / dead code
- `assignedAudioHasSrc`, `waitForAssignedAudioReady`, `stopAssignedAudioElement`
  (HTMLAudio-only helpers) deleted.
- `packTransportNodesRef` (MediaElementSource map), `packPauseOffsetsRef`, and
  `pauseClockElapsedRef` removed (no longer needed under the buffer engine).
- `musicClock.ts`: gain-ramp helpers (`isRampActive` / `cancelGainRamp` /
  `scheduleGainRamp`) widened from `HTMLAudioElement` to a structural
  `GainRampTarget = { volume }` so they drive both element and BufferVoice.

---

## 4. Trade-offs / notes
- **Memory:** all active-pack pads are decoded to PCM up front (~30 s stereo
  loops). This is a deliberate trade for sample-accurate, glitch-free looping;
  decode happens once per pack at load. Switching packs frees the previous
  buffers (`disposePackTransport`).
- **CPU:** looping `AudioBufferSourceNode`s at gain 0 are very cheap on the audio
  thread (no per-element media decoder, no main-thread RAF for looping). Pause
  keeps them running at `masterGain = 0`, which is cheaper than recreating nodes.
- Gain ramps still use the existing RAF `scheduleGainRamp` writing `volume`
  (→ GainNode), preserving the tuned click-free behaviour. Pause/resume uses a
  true audio-thread `linearRampToValueAtTime` on `masterGain`.

---

## 5. Build
- `npx tsc -b --force` → exit 0 (clean).
- `npm run build` → exit 0 (bundle built; pre-existing >500 kB chunk-size notice
  only).
- Dev server HMR updates cleanly.
- `npm run lint` reports only **pre-existing** `react-hooks/refs` and
  `exhaustive-deps` issues in unrelated render code (`BeatDebugOverlay`, shared-mix
  effect); none introduced by this migration. Lint is not part of the build.
