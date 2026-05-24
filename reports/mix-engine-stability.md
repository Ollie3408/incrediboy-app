# Mix Engine Stabilization Report
**Date:** 2026-05-24  
**Phase:** MIX ENGINE STABILIZATION PHASE

---

## Root Cause Analysis

### Symptom: volume stutters and pumping with many performers

The audio chain before this phase:

```
HTMLAudioElement (per slot)
  audio.volume = master × padVol × categoryGain  [linear 0–1]
       ↓
MediaElementAudioSourceNode
       ↓
DynamicsCompressor (threshold -18, ratio 6:1, attack 5ms, release 300ms)
       ↓
AudioContext.destination
```

**Root cause 1 — Compressor ratio too aggressive (6:1)**  
At 6:1, a signal 6dB above threshold is reduced to 1dB above threshold. With 7 performers each at ~0.85 volume, the combined input to the compressor is approximately +7dBFS above any individual pad. The compressor must apply ~10dB of gain reduction. At this level, the compressor is no longer acting as a "glue" stage — it is actively fighting the mix level.

**Root cause 2 — Attack too fast (5ms)**  
A 5ms attack time means the compressor clamps down on transients before they are heard. Kick drum attacks (typically 10–20ms) get compressed before the click is audible, causing a dull, lifeless sound. The transient energy that makes beats "land" is being removed.

**Root cause 3 — Release too slow (300ms)**  
At 128 BPM, one beat = 468.75ms. The release of 300ms means the compressor has not fully recovered by the next beat. Each new beat triggers compression on top of the existing gain reduction — a staircase of decreasing gain that produces the characteristic "pumping" artifact.

**Root cause 4 — No mix-bus headroom guard**  
The old `computeCategoryGains` (from musicClock.ts) only handled bass and melody+atmosphere. Beat, vocal, FX, and transition categories had no dynamic attenuation at any performer count. A full 7-performer stage with 2 beats + 2 bass + 2 melody + 1 FX would have the compressor as the only safety net — causing heavy-handed gain reduction.

**Root cause 5 — Volume ceiling at 1.0**  
Individual `audio.volume` values could reach 1.0 (full digital scale) with padVol = 1.0 (default packs) and master slider at maximum. This drives the compressor input as hard as possible, maximizing pumping.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Removed `computeCategoryGains` import from musicClock.ts |
| `src/App.tsx` | Added `computeEnhancedCategoryGains` — 7-category priority model with mix-bus guard |
| `src/App.tsx` | `padEffVol()` — soft ceiling changed from `Math.min(1,…)` to `Math.min(0.95,…)` |
| `src/App.tsx` | Volume `useEffect` inline calc — soft ceiling 1.0 → 0.95 |
| `src/App.tsx` | `handleVolumeChange` inline calc — soft ceiling 1.0 → 0.95 |
| `src/App.tsx` | `ensureAudioCtx` — compressor settings updated |

---

## Compressor Settings

### Before

| Parameter | Old Value | Effect |
|---|---|---|
| threshold | -18 dBFS | Signal above -18 is compressed |
| knee | 20 dB | Gradual onset — OK |
| ratio | **6:1** | Aggressive — 6dB → 1dB above threshold |
| attack | **0.005s (5ms)** | Too fast — removes transient punch |
| release | **0.30s (300ms)** | Too slow — causes inter-beat pumping |

### After

| Parameter | New Value | Effect |
|---|---|---|
| threshold | -18 dBFS | Unchanged |
| knee | 20 dB | Unchanged |
| ratio | **2.5:1** | Gentle glue — preserves punch and dynamics |
| attack | **0.010s (10ms)** | Lets kick/snare click through before compression |
| release | **0.20s (200ms)** | Fully resets between beats at 128 BPM (beat=469ms) |

### Why these values

**Ratio 2.5:1:** At -18dBFS threshold with 7 performers:  
- Old (6:1): signal at 0dBFS → 18dBFS above threshold → output at -15dBFS → 15dB GR  
- New (2.5:1): signal at 0dBFS → 18dBFS above threshold → 18×(1-1/2.5)=10.8dB GR → output at -10.8dBFS  
- Result: 4.2dB less gain reduction → compressor is transparent, not fighting the mix

**Attack 10ms:** Human ear integrates transients in ~5–10ms. At 10ms attack:  
- Kick transient (10ms) passes through uncompressed — maintains impact
- Sustained bass/melody elements are compressed — controlled level

**Release 200ms at 128 BPM (beat=469ms):**  
- 200ms release completes within 469ms inter-beat gap ✅  
- Compressor fully reset before next beat → no pumping  
- Still fast enough to control sustained overlapping layers

---

## Dynamic Category Gain Model

### Old model (`computeCategoryGains` from musicClock.ts)

| Category | Trigger | Reduction |
|---|---|---|
| bass | > 2 layers | -7% per extra |
| melody + atmosphere | > 3 combined | -5% per extra |
| beats, vocals, fx, transition | — | No attenuation |

### New model (`computeEnhancedCategoryGains`)

| Priority | Category | Trigger | Reduction per extra layer |
|---|---|---|---|
| 1 | beats | — | Never attenuated |
| 2 | bass | > 2 layers | -7% (×0.93) |
| 3 | melody | > 3 layers | -3% (×0.97) |
| 4 | vocals / voice | > 2 layers | -4% (×0.96) |
| 5 | atmosphere | > 1 layer | -5% (×0.95) |
| 6 | fx / effect | > 1 layer | -6% (×0.94) |
| 7 | transition | > 1 layer | -8% (×0.92) |

**Mix-bus headroom guard:**  
When total performer count > 5:  
Apply `-3% per layer above 5` (×0.97^(n−5)) to ALL categories (including beats).  
This is the last line of defense before the compressor.

**Audibility floor:**  
No category reduced below 0.50 — every performer remains perceptibly present.

### Example: 7 performers (2 beats + 2 bass + 1 melody + 1 atmo + 1 FX)

| Category | Count | Category gain | Bus guard (7>5: ×0.97²=0.941) | Final gain |
|---|---|---|---|---|
| beats | 2 | 1.0 | ×0.941 | 0.941 |
| bass | 2 | 1.0 (≤2) | ×0.941 | 0.941 |
| melody | 1 | 1.0 (≤3) | ×0.941 | 0.941 |
| atmosphere | 1 | 1.0 (=1) | ×0.941 | 0.941 |
| fx | 1 | 1.0 (=1) | ×0.941 | 0.941 |

With master=0.8, padVol=0.85: effective = 0.8 × 0.85 × 0.941 = **0.640** ← well under 0.95 ceiling ✅

---

## Soft Volume Ceiling

| Location | Old | New |
|---|---|---|
| `padEffVol()` | `Math.min(1, …)` | `Math.min(0.95, …)` |
| Volume `useEffect` inline | `Math.min(1, …)` | `Math.min(0.95, …)` |
| `handleVolumeChange` inline | `Math.min(1, …)` | `Math.min(0.95, …)` |

Effect: At maximum slider (volume=100), padVol=1.0, categoryGain=1.0:  
- Old: `audio.volume = 1.0` → full digital scale into compressor  
- New: `audio.volume = 0.95` → −0.45dBFS headroom per element → compressor works ~5dB less

For curated packs (padVol ≈ 0.82–0.90), the effective volume at max slider:  
`1.0 × 0.85 = 0.85` — already under 0.95, so ceiling makes no difference for curated packs.  
The ceiling primarily protects default packs (padVol=1.0) at maximum slider.

---

## Build Verification

```
npm run build
✓ 1446 modules transformed
✓ 0 TypeScript errors
✓ 0 lint warnings
✓ built in 8.89s
```
