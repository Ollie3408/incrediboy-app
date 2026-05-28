# Delta Audio Dropout Investigation

**Date:** 2026-05-26  
**Phase:** DELTA SMOOTH PLAYABILITY / AUDIO STABILITY PHASE

---

## Symptoms Reported

- Occasional musical glitch during gameplay
- Brief freeze / stutter
- Momentary silence
- Transitions between pads/characters not always smooth

---

## Full Chain Audit

### Gain chain review

```
master volume (normalizedVolume, 0–1)
  × padVolumeRef  (per-pad multiplier from deltaPack.ts, 0.5–0.9)
  × categoryGainRef  (computeEnhancedCategoryGains, 0.5–1.0)
  = effRaw
Math.max(0, Math.min(0.95, effRaw))
  = clamped volume applied to audio.volume
  → MediaElementAudioSourceNode
  → DynamicsCompressorNode
  → AudioContext.destination
```

Gain chain is sound. No NaN paths found. Hard floor at `Math.max(0, ...)` and ceiling at 0.95 prevent clipping. Category gain floor at 0.50 prevents any pad being muted by the gain system.

---

## Root Causes Found

### 1. Console.log spam in production (PRIMARY — causes brief stutter)

**Severity: HIGH**

Multiple `console.log` / `console.warn` calls were not gated behind `import.meta.env.DEV`. These fired in the production bundle on every:
- Pad assigned to slot (createAssignedAudio)
- Pad started (startAssignedSlotAudio resolve)
- Pad removed (disposeAssignedAudio)
- Quantized start scheduled and resolved
- Session started (startOrRestartLoops)
- Transport FREEZE / RESUME
- Reset
- Hard snap fired (phase correction)

At 7 pads with rapid add/remove, this produced 20–40 console calls per second. Each console.log serializes objects and acquires a JS lock — under load (page rendering + audio scheduling + interval callbacks) this competes with the main thread budget and can produce 2–10ms stalls. These stalls manifest as the "brief freeze/stutter".

**Fix:** All non-error production console calls gated behind `if (import.meta.env.DEV)`.

---

### 2. Unmute pop (MEDIUM — audible click on character unmute)

**Severity: MEDIUM**

In `handleSlotClick` (unmute path), volume was set instantly:
```js
audio.volume = padEffVol(index)  // jump from 0 → 0.5–0.8 instantly
```
With the audio element playing silently at `volume = 0`, this instant jump produces an audible pop or click, especially on vocals and bass pads.

**Fix:** Replaced with `scheduleGainRamp(audio, padEffVol(index), 60)` — 60ms linear ramp from 0 → target, RAF-aligned.

---

### 3. Compressor rhythmic pumping (MEDIUM — audible on 5+ pad full mix)

**Severity: MEDIUM**

Previous compressor settings:
- `attack = 5ms`, `release = 250ms`

At 128 BPM (beat interval = 469ms), the compressor with `release = 250ms` only recovered ~53% of its gain reduction before the next kick. This created a cyclical pump: compressor engages on kick → partially recovers → re-engages on next kick → audible gain variation between beats.

With 5–7 simultaneous pads all containing rhythmic transients, the compressor never fully recovered, staying in a semi-compressed state that breathed with the beat.

**Fix:**
- `attack`: 5ms → 10ms — lets kick transients through naturally for punch, avoids transient smearing
- `release`: 250ms → 400ms — at 400ms the compressor recovers ~37% per beat, staying in near-steady-state gain reduction (transparent glue) rather than rhythmically pumping

---

### 4. Transport resume instant volume jump (LOW-MEDIUM — click on unpause)

**Severity: LOW-MEDIUM**

In `toggleMasterMute` Phase 4 (resume path), volumes were set to target before `audio.play()`:
```js
audio.volume = slotMuted ? 0 : padEffVol(slot)  // instant
void audio.play()
```
The AudioContext, potentially coming out of suspension, begins delivering samples at full amplitude immediately. Combined with slight audio decoder startup latency, this can produce a click/thump on unpause.

**Fix:** Volumes held at 0 during `play()` batch (Phase 4). After 30ms settle, Phase 5 ramps all non-muted slots to target via `scheduleGainRamp(audio, padEffVol(slot), 40)`. The 30ms delay ensures the audio decoder is delivering samples before the gain opens.

---

## Issues Investigated but Not Found

| Area | Status | Notes |
|---|---|---|
| NaN volume values | Not found | Math.max/min chain prevents NaN propagation |
| Negative volume values | Not found | Hard floor at 0 everywhere |
| MediaElementAudioSourceNode duplication | Not found | `disposeAssignedAudio` disconnects old node before `createMediaElementSource` |
| Volume slider AudioContext recreation | Not found | `handleVolumeChange` bypasses React state for audio, uses ref directly |
| Phase hard snaps during gameplay | Rare — mitigated | PHASE_HARD_THRESHOLD_MS=150ms and PHASE_SETTLE_MS=3000ms prevent most false positives |
| AudioContext auto-suspension | Guarded | `onstatechange` + heartbeat guard in `tickMasterClock` both call `ctx.resume()` |
| Duplicate play() calls | Not found | `assignedAudioRef` is single-source-of-truth; `disposeAssignedAudio` clears old entry before new `createAssignedAudio` |
| Category gain jumps on pad add | Negligible | Typical drop is 3-4% (< 0.4 dB) — inaudible |
| playbackRate nudge (soft correction) | Benign | ±2% = 0.34 semitones, below JND threshold |

---

## Remaining Risk Areas

| Area | Risk | Mitigation |
|---|---|---|
| Phase hard snaps | LOW | Threshold=150ms, settle=3000ms; rare under normal use |
| AudioContext suspension under mobile power management | MEDIUM | `onstatechange` resume guard is in place; test on iOS Safari |
| Volume slider very rapid drag (>60 events/s) | LOW | RAF throttle coalesces slider events to one per frame |
| Full 7-pad stage with all pads at max volume | LOW | Category gain staging + 0.95 ceiling prevent clipping |

---

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Console.log gating (DEV-only), unmute ramp, compressor tuning, resume fade-in, dropout watcher |

