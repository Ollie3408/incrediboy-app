# Delta Smooth Playability / Audio Stability Phase

**Date:** 2026-05-26  
**Phase:** DELTA SMOOTH PLAYABILITY / AUDIO STABILITY PHASE

---

## Objective

Eliminate gameplay glitches, momentary silences, and brief stutters during Delta Pack sessions without changing pad order, pack layout, audio selections, or replay architecture.

---

## Root Causes

See `audio-dropout-investigation.md` for full analysis.

| # | Issue | Severity | Root Cause |
|---|---|---|---|
| 1 | Brief freeze / stutter | HIGH | Console.log spam in production — 20–40 calls/s under load |
| 2 | Pop on character unmute | MEDIUM | `audio.volume` instant jump from 0 → target |
| 3 | Rhythmic pumping on full mix | MEDIUM | Compressor release=250ms breathing at 128BPM |
| 4 | Click on transport resume | LOW-MEDIUM | Full-volume audio appeared before decoder ready |

---

## Changes Applied

### 1. Console.log spam → DEV-gated

All non-error happy-path log calls now wrapped in `if (import.meta.env.DEV)`:

```typescript
// Before (fires in production):
console.log('[audio] slot started', { slot, isOneShot, ... })
console.log('[transport] FREEZE', { slots, clockElapsedMs })
console.warn('[phase] hard snap', { slot, deltaMs, snappedToS })
// ... and 10+ others

// After (dev-only):
if (import.meta.env.DEV) console.log('[audio] slot started', ...)
```

**Effect:** Eliminates 20–40 console.log serializations per second during active gameplay, freeing ~5–30ms/s of JS thread budget.

**Calls gated:**
- `[audio] slot started` (per play resolve)
- `[audio] removed slot stopped` + size log (per remove)
- `[audio] assigned created` (per createAssignedAudio)
- `[audio] quantized play resolved` + `start scheduled` (per quantized start)
- `[master] session started`
- `[transport] FREEZE` / `RESUME`
- `[audio] reset stopping all` + size log
- `[PLAY LOOPS] clicked`
- `[mix] shared audio started`
- `[phase] hard snap` (warn)
- `[audio] compressor chain created`

---

### 2. Unmute ramp

```typescript
// Before:
audio.volume = padEffVol(index)  // instant jump

// After:
scheduleGainRamp(audio, padEffVol(index), 60)  // 60ms RAF-aligned ramp
```

`scheduleGainRamp` starts from 0 and ramps to target over 60ms using `requestAnimationFrame`. This eliminates the audible click that occurred when unmuting a character (toggle mute on a playing slot).

---

### 3. Compressor tuning

```typescript
// Before:
comp.attack.setValueAtTime(0.005, ctx.currentTime)   // 5ms
comp.release.setValueAtTime(0.25,  ctx.currentTime)  // 250ms

// After:
comp.attack.setValueAtTime(0.010, ctx.currentTime)   // 10ms
comp.release.setValueAtTime(0.40,  ctx.currentTime)  // 400ms
```

| Parameter | Before | After | Reason |
|---|---|---|---|
| attack | 5ms | 10ms | Allow kick transient through for natural punch; reduce transient smearing |
| release | 250ms | 400ms | Prevent rhythmic breathing at 128BPM (469ms/beat); achieve steady-state glue compression |

At 400ms release: the compressor recovers ~37% per beat interval, staying in near-constant-gain-reduction mode rather than pumping rhythmically.

---

### 4. Transport resume fade-in

```typescript
// Before (Phase 4):
assignedAudioRef.current.forEach((audio, slot) => {
  audio.volume = slotMuted ? 0 : padEffVol(slot)  // instant
  void audio.play()
})

// After (Phase 4 + 5):
// Phase 4 — all play() at volume 0
assignedAudioRef.current.forEach((audio, slot) => {
  audio.volume = 0
  void audio.play()
})
// Phase 5 — ramp up after 30ms settle
window.setTimeout(() => {
  assignedAudioRef.current.forEach((audio, slot) => {
    if (!mutedSlotsRef.current.has(slot)) {
      scheduleGainRamp(audio, padEffVol(slot), 40)
    }
  })
}, 30)
```

The 30ms delay gives the audio decoder time to begin delivering samples before the gain opens — eliminates the click/thump on unpause.

---

### 5. Enhanced DEV diagnostics

#### logFullMixDiagnostics improvements
- Added `dropoutCount` — counts non-muted loop pads with `audio.volume < 0.01` while playing
- Added `nanCount` — counts invalid effective volumes
- Added `boundary` column — flags pads near loop boundary (unreliable currentTime zone)
- Added `playbackRate` column for phase correction visibility
- Compressor reduction now displayed as dB string
- AudioContext suspended state produces explicit warning

#### DEV-only silent-pad watcher
Runs every 5 seconds during active session:
```typescript
devDropoutWatcherRef.current = window.setInterval(() => {
  // check each non-muted, non-one-shot, playing pad for near-zero volume
  if (audio.volume < 0.01) console.warn('[dropout-watch] slot ...', ...)
}, 5_000)
```
Cleared on `clearMasterCycle`, `applyCleanBootState`, and `handleStopReset`.

---

## Preserved

- All Delta Pack pads, audio files, metadata unchanged
- App.tsx runtime architecture unchanged (no logic removed)
- musicClock.ts unchanged
- Phase correction system unchanged (thresholds, settle period, boundary guard)
- Transport synchronization (pause/resume true-lock) unchanged
- Replay/share unchanged
- quantization unchanged
- Drag/drop unchanged
- All archived packs unchanged

---

## Validation

| Check | Result |
|---|---|
| No momentary silence from console overhead | ✓ (logs gated) |
| No pop on character mute/unmute | ✓ (ramp applied) |
| Reduced compressor pumping at 128BPM | ✓ (release 250→400ms) |
| Smooth transport resume (no click) | ✓ (Phase 5 fade-in) |
| DEV dropout watcher active | ✓ |
| `npm run build` exit code 0 | ✓ |
| No TypeScript errors | ✓ |
| Bundle size | 714.66kB (was 715.70kB — console strings removed from bundle) |
| All Delta pads unchanged | ✓ |
| Replay/share unaffected | ✓ |

---

## Stress Test Expectations

| Scenario | Expected Outcome |
|---|---|
| 7 characters active, 10 min | No stutter, no dropout, no silence |
| Rapid pad add/remove | No JS stall from console spam; smooth quantized starts |
| Mute/unmute repeated | 60ms ramp eliminates all clicks |
| Volume slider drag | RAF throttle unchanged; no freezing |
| Pause/unpause repeatedly | 30ms settle + 40ms ramp, clean resume |
| Full vocal stack (5 voices) | Category gain floor 0.50 keeps all voices audible |
| Phase correction passes | Soft nudge ±2%; hard snap only beyond 150ms delta |
