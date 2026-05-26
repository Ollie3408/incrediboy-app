# Audio Overload Fix

**Phase:** Critical Full-Mix Stability Phase  
**Date:** 2026-05-25

---

## Overload Vector Analysis

With Delta Pack running at 128 BPM and up to 24 simultaneous pads, five independent
vectors combined to create intermittent audio dropouts and volume collapses.

---

## Fix 1 — Phase Correction De-Throttled

**File:** `src/App.tsx` — constants + `runPhaseCorrectionPass`

### What changed

```
PHASE_CORRECTION_INTERVAL_MS  200  → 2 000  ms
PHASE_SOFT_THRESHOLD_MS        25  →    40  ms
PHASE_HARD_THRESHOLD_MS        80  →   150  ms
PHASE_BOUNDARY_GUARD_S         —   →   0.3   s  (new)
```

### New boundary guard

Skips any audio element whose `currentTime < 0.3s` or `currentTime > duration - 0.3s`.
Browser-native loop seeks make `currentTime` unreliable within 300ms of either boundary.

### Drift-correction skip

Elements whose `playbackRate` is set to a value other than `1.0`, `1.02`, or `0.98`
are assumed to be under deliberate `allowDriftCorrection` adjustment and are skipped
so phase correction does not fight the drift-correction rate.

### DEV logging

Phase passes only log when corrections occur (`softCount > 0 || hardCount > 0`).
Previously logged on every pass, generating ~5 log entries/sec during 24-pad sessions.

---

## Fix 2 — AudioContext Suspension Proofing

**File:** `src/App.tsx` — `ensureAudioCtx`, `tickMasterClock`

### Primary guard — `ctx.onstatechange`

```ts
ctx.onstatechange = () => {
  if (ctx.state === 'suspended' && isPlayingRef.current && !masterMutedRef.current) {
    void ctx.resume()
  }
}
```

Fires within one browser event loop of any state change.  Zero polling overhead.

### Backup guard — `tickMasterClock` (every 9.6s)

```ts
if (ctx.state === 'suspended' && isPlayingRef.current && !masterMutedRef.current) {
  void ctx.resume()
}
```

Catches rare cases where `onstatechange` does not fire (browser-specific behaviour).

---

## Fix 3 — `scheduleGainRamp` Timer Cleanup

**File:** `src/musicClock.ts`

### Before

```ts
// 5 concurrent setInterval timers per pad start, firing at 4ms intervals
const id = window.setInterval(() => { ... }, durationMs / steps)
```

With 7 pads starting simultaneously: **35 active 4ms timers** competing on the main
thread.

### After

```ts
// Single requestAnimationFrame chain per pad — browser-coalesced, frame-aligned
const tick = () => {
  const progress = Math.min(1, (performance.now() - startMs) / durationMs)
  audio.volume = targetVol * progress
  if (progress < 1) requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
```

RAF callbacks for multiple simultaneously-starting pads are coalesced into a single
frame by the browser scheduler, eliminating the 4ms polling contention entirely.
Ramp duration extended from 20ms to 40ms for a smoother micro-fade.

---

## Fix 4 — Immediate Category Gain Flush

**File:** `src/App.tsx` — category gain `useEffect`

### Before

Category gains were recalculated into `categoryGainRef` but NOT applied to active
`audio.volume` until the next explicit volume event.

### After

Immediately after recalculation, all playing audio elements receive their updated
effective volume:

```ts
if (isPlayingRef.current && !masterMutedRef.current) {
  const master = normalizedVolume(volumeRef.current)
  assignedAudioRef.current.forEach((audio, slot) => {
    if (mutedSlotsRef.current.has(slot)) return
    const padVol    = padVolumeRef.current.get(slot) ?? 1.0
    const catGain   = categoryGainRef.current.get(slot) ?? 1.0
    const eff       = Math.max(0, Math.min(0.95, master * padVol * catGain))
    if (isFinite(eff)) audio.volume = eff
  })
}
```

---

## Fix 5 — Compressor Safety-Net Profile

**File:** `src/App.tsx` — `ensureAudioCtx`

| Parameter | Old | New | Effect |
|---|---|---|---|
| threshold | -18 dBFS | -12 dBFS | Compressor stays inactive on most content |
| knee | 20 | 30 | Gradual onset — no hard clamping |
| ratio | 2.5:1 | 2.0:1 | ~2 dB max GR instead of ~4 dB |
| attack | 10ms | 5ms | Still catches fast kick transients |
| release | 200ms | 250ms | Slightly slower — reduces breathing |

The compressor now acts as a **safety net** (only engages on true peaks) rather than
as an active mix-bus processor.  Pre-gain staging via `computeEnhancedCategoryGains`
+ the 0.95 soft ceiling handles the mix balance before the signal reaches the compressor.

---

## Gain Chain Flow (Final)

```
Audio file
  → HTMLAudioElement.volume (0.95 ceiling)
      = normalizedVolume(masterVol)     [0..1]
      × padVolumeRef[slot]              [pad config: 0.42..0.90]
      × categoryGainRef[slot]           [computeEnhancedCategoryGains: 0.50..1.0]
      × Math.min(0.95, ...)             [soft ceiling]
  → MediaElementAudioSourceNode
  → DynamicsCompressorNode (safety net, -12dBFS threshold)
  → AudioContext.destination
```

---

## Load Reduction Summary

| Operation | Before | After | Reduction |
|---|---|---|---|
| Phase correction iterations/sec (24 pads) | 120 | 12 | 90% |
| Possible hard snaps/sec | up to 120 | max 12 | 90% |
| Timer callbacks at session start (7 pads) | 35 × 4ms | coalesced RAF | ~100% |
| AudioContext unguarded suspension events | unlimited | 0 (auto-resume) | 100% |
| Volume inconsistency window after pad add | until next slider move | immediate | 100% |
