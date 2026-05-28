# Audio Dropout & Click Investigation Report

**Date:** 2026-05-26  
**Phase:** UI CLEANUP + AUDIO DROPOUT FIX — Task B

---

## Symptoms

- Sounds cut out / stop during gameplay
- Audible click or pop noises
- Momentary silence between character actions
- Instability when all 7 characters are active

---

## Root Cause: `scheduleGainRamp` Concurrent Ramp Conflict

The primary cause of clicks, pops, and momentary silence was a design flaw in `scheduleGainRamp` (`src/musicClock.ts`).

### The Bug

**Original implementation:**
```typescript
export function scheduleGainRamp(audio, targetVol, durationMs = 40) {
  if (targetVol <= 0) { audio.volume = 0; return }
  audio.volume = 0          // ← Hard reset to 0 every call
  const startMs = performance.now()
  const tick = () => {
    const progress = Math.min(1, (performance.now() - startMs) / durationMs)
    audio.volume = targetVol * progress
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
```

**Two compounding problems:**

#### Problem 1 — Hard volume reset to 0 with no cancellation

Every call to `scheduleGainRamp` immediately set `audio.volume = 0` and started a new RAF loop. If a second call arrived before the first completed (e.g., from the `handleVolumeChange` RAF or the category-gain `useEffect`), there were now **two concurrent RAF loops writing to the same `audio.volume`** on alternating frames:

```
Frame N:   Ramp A writes 0.32  (40% of 0.80 target, was cancelled by user action but still running)
Frame N+1: Ramp B writes 0.08  (10% of 0.80, just started after reset)
Frame N+2: Ramp A writes 0.40  (50% — still running, not cancelled)
Frame N+3: Ramp B writes 0.16
```

This produces rapid alternating low values — perceived as a click, pop, or dropout.

#### Problem 2 — Direct `audio.volume` writes competing with running ramps

Two code paths wrote `audio.volume` directly without checking if a ramp was in flight:

**Path A — `handleVolumeChange` RAF:**
```typescript
assignedAudioRef.current.forEach((audio, slot) => {
  audio.volume = eff   // Writes final target immediately
})
```

**Path B — Category-gain `useEffect` (fires on pad add/remove):**
```typescript
assignedAudioRef.current.forEach((audio, slot) => {
  if (isFinite(eff)) audio.volume = eff  // Also writes immediately
})
```

When these fired during an active ramp (e.g., slider move during the 40ms after transport resume), the direct write set the element to `targetVol`, and then the ramp's next tick wrote a **lower** value (since it was still ramping from 0). This produced a backwards volume dip — heard as a click.

---

## Timeline of a Typical Click Event

```
t=0ms:   User presses RESUME
t=0ms:   audio.volume = 0  (Phase 4 of transport resume)
t=0ms:   audio.play()
t=30ms:  scheduleGainRamp(audio, 0.65, 40)  — Ramp A starts
t=30ms:  audio.volume = 0  (startVol capture: 0)
t=33ms:  Ramp A tick: audio.volume = 0.065  (10%)
t=38ms:  user moves slider → handleVolumeChange RAF fires
t=38ms:  audio.volume = 0.65  ← Direct write, overrides ramp
t=46ms:  Ramp A tick: audio.volume = 0.26   ← BACKWARDS DIP (ramp still going)
t=54ms:  Ramp A tick: audio.volume = 0.39
t=70ms:  Ramp A tick: audio.volume = 0.65   (100%) — finally correct
```

The 0.65→0.26 drop at t=46ms is the audible click.

---

## Fix Applied

### 1. `scheduleGainRamp` redesigned with cancellation token (`src/musicClock.ts`)

```typescript
const _activeRamps = new WeakMap<HTMLAudioElement, { cancelled: boolean }>()

export function cancelGainRamp(audio: HTMLAudioElement): void {
  const handle = _activeRamps.get(audio)
  if (handle) { handle.cancelled = true; _activeRamps.delete(audio) }
}

export function isRampActive(audio: HTMLAudioElement): boolean {
  return _activeRamps.has(audio)
}

export function scheduleGainRamp(audio, targetVol, durationMs = 40) {
  cancelGainRamp(audio)           // Always cancel previous ramp for this element
  if (targetVol <= 0) { audio.volume = 0; return }

  const handle = { cancelled: false }
  _activeRamps.set(audio, handle)

  const startVol = audio.volume   // Start from current, not from 0
  const startMs = performance.now()

  const tick = () => {
    if (handle.cancelled) return  // Abort if superseded
    const progress = Math.min(1, (performance.now() - startMs) / durationMs)
    audio.volume = startVol + (targetVol - startVol) * progress
    if (progress < 1) requestAnimationFrame(tick)
    else _activeRamps.delete(audio)
  }
  requestAnimationFrame(tick)
}
```

**Key changes:**
- Auto-cancels any previous ramp on the same element → no concurrent RAF loops
- Starts from `audio.volume` (current) not from 0 → no silent dip even if called mid-ramp
- Callers that want 0→target must set `audio.volume = 0` before calling (all existing call sites already do this)

### 2. `handleVolumeChange` RAF skips ramp-active elements (`src/App.tsx`)

```typescript
assignedAudioRef.current.forEach((audio, slot) => {
  if (isPlayingRef.current && !masterMutedRef.current && !mutedSlotsRef.current.has(slot)) {
    if (!isRampActive(audio)) {           // ← NEW guard
      audio.volume = Math.max(0, Math.min(0.95, master * padVol * categoryGain))
    }
  }
})
```

### 3. Category-gain `useEffect` skips ramp-active elements (`src/App.tsx`)

```typescript
assignedAudioRef.current.forEach((audio, slot) => {
  if (mutedSlotsRef.current.has(slot)) return
  if (isRampActive(audio)) return        // ← NEW guard
  if (isFinite(eff)) audio.volume = eff
})
```

### 4. `cancelGainRamp` called on pad dispose (`src/App.tsx`)

```typescript
const disposeAssignedAudio = useCallback((slotIndex) => {
  const audio = assignedAudioRef.current.get(slotIndex)
  if (!audio) return
  cancelGainRamp(audio)   // ← Stop zombie ramp before disposal
  // ... rest of dispose
})
```

This prevents a ramp RAF from writing to a disposed audio element's volume, which could briefly affect the WeakMap bucket or cause a stale closure write.

---

## Other Factors Investigated (Not Changed)

| Factor | Assessment |
|--------|-----------|
| Phase correction hard snaps | Already guarded: 3s settle, 0.3s boundary guard, 150ms threshold — unlikely to cause clicks under normal use |
| Compressor pumping | Attack 10ms / release 400ms — stable at 128 BPM, no changes needed |
| Loop boundary clicks | Delta Pack is PCM WAV — no codec-boundary artifacts expected |
| `audio.currentTime` seeks on resume | Already handled by Phase 4/5 in `toggleMasterMute` — correct |
| Source node leaks | `disposeAssignedAudio` disconnects `MediaElementAudioSourceNode` correctly |

---

## Validation Checklist

| Test | Expected |
|------|---------|
| Transport resume (pause → play) | Smooth fade-in, no click |
| Rapid mute/unmute | No dip, no click |
| Volume slider drag during playback | No backwards volume dip |
| New pad dragged in during session | Clean fade-in, no pop |
| All 7 pads active, 10 minutes | No dropouts, no silence |
| `npm run build` | ✓ exit code 0 |
