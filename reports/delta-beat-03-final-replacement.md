# Delta Beat 3 — Final Replacement Report

**Date:** 2026-05-25  
**Phase:** FINAL DELTA BEAT 3 REPLACEMENT PHASE  
**Status:** Complete  

---

## Old Beat 3 — Removed

| Property      | Value                                    |
|---------------|------------------------------------------|
| File          | `beats/beat-03.wav`                      |
| Source        | Stickz – Byte Drum Loop 004 – 128BPM.wav |
| MD5 (retired) | `af8f9b9eab182490e4d6d4607535d1ca`       |
| Duration      | 30.000s (16 bars)                        |
| Backup        | `/tmp/beat-03-drumloop004-backup.wav`    |
| Failure       | Phase-correction hard snap after pause/resume produced audible double-beat |

### Why 30-second full drum loops fail as Beat 3

Previous Beat 3 iterations used full drum loops (Loop 003 and Loop 004), both 30 seconds
(16 bars).  Each failed for a compound reason:

1. **File issue (Loop 003):** Two 0.7s structural silence gaps caused a rhythmic break that
   sounded like a flam/double-beat when looped.

2. **Runtime issue (Loop 004):** The phase correction monitor
   (`runPhaseCorrectionPass`, interval 2 000 ms) could fire within the browser's
   audio startup window (~50–500 ms after `audio.play()`).  With a 30-second loop:
   - Small startup latency (e.g. 300 ms) exceeded `PHASE_HARD_THRESHOLD_MS = 150 ms`.
   - A hard snap (`audio.currentTime = expectedS`) jumped the playhead forward by
     ~300 ms, landing on or near a kick transient.
   - The user heard: kick at T, hard snap, kick again at T+300ms — **double-beat**.
   - This was especially prominent after pause/resume because all pads restarted
     simultaneously, maximising the chance of the correction interval firing early.

3. **Structural reason:** Any 30s drum loop with prominent kick/snare transients is
   extremely sensitive to phase errors because:
   - Phase error accumulates over 30 s before the loop resets.
   - Kicks are high-transient events — even a 100–200 ms positional error is clearly
     audible as flamming or double-beating.
   - The settle-period fix (`PHASE_SETTLE_MS = 3000`) prevents the worst hard snaps,
     but rhythmic perception at 128 BPM is still sensitive to soft nudges.

**Decision: Stop using 30-second full drum loops for Beat 3.  Use a 7.5-second hi-hat
loop instead, matching the successful pattern of Beat 2 (HH 001) and Beat 5 (HH 002).**

---

## Source Scan — All Candidates Evaluated

### Full Drum Loops (Byte Drum Loops, 128BPM)

| Candidate      | Duration | MD5 (first 8) | Status              |
|----------------|----------|---------------|---------------------|
| Drum Loop 001  | 15.000s  | 3844bc46      | USED — beat-01      |
| Drum Loop 002  | 30.000s  | 11765e02      | Free — 30s, rejected (long loop) |
| Drum Loop 003  | 30.000s  | f6d7c6ad      | Free — 30s, rejected (structural silence gaps) |
| Drum Loop 004  | 30.000s  | af8f9b9e      | PREV beat-03 — retired |
| Drum Loop 005  | 30.000s  | 2e7be7c2      | Free — 30s, rejected (long loop) |

### Top Loops / No-Kick Loops (128BPM)

| Candidate      | Duration | Status                        |
|----------------|----------|-------------------------------|
| Top Loop 001   | 15.000s  | USED — beat-04                |
| Top Loop 002   | 30.000s  | Rejected — leading silence at 0.000s |
| Top Loop 003   | 30.000s  | Rejected — leading silence at 0.000s, complex silences |
| Top Loop 004   | 30.000s  | Rejected — 30s, minimal silences but long loop |
| Top Loop 005   | 30.000s  | Rejected — leading silence at 0.000s |

### Hi-Hat Loops (128BPM) — **Target Category**

All Hi-Hat Loops are exactly **7.500s** (4 bars × 4 beats × 60/128 = 7.5000s), zero drift.

| Loop | MD5 (first 8) | Mean Vol  | Pre-roll | Silence gaps | Status          |
|------|---------------|-----------|----------|--------------|-----------------|
| 001  | 3425a327      | −21.0 dB  | 0 ms     | None         | USED — beat-02  |
| 002  | 5b7c35e6      | −20.4 dB  | 0 ms     | None         | USED — beat-05  |
| 003  | 71a52fb7      | n/a       | 0 ms     | 1 (7.123s)   | Rejected — tail gap at 7.1s |
| **004** | **5710a900** | **−18.3 dB** | **0 ms** | **None** | **Finalist — loudest** |
| **005** | **b2f40fe6** | **−19.7 dB** | **0 ms** | **None** | **SELECTED ✓** |
| **006** | **e8bbea47** | **−20.2 dB** | **0 ms** | **None** | **Finalist — quietest** |
| 007  | ca173b3b      | n/a       | 69 ms    | Multiple     | Rejected — broken pattern |
| 008  | 78b8204b      | n/a       | 536 ms   | Multiple     | Rejected — leading silence |
| 009  | aa406cc3      | n/a       | 26 ms    | Many tiny    | Rejected — staccato 16th grid |
| 010  | be37d6ee      | n/a       | 59 ms    | Many tiny    | Rejected — staccato 16th grid |

---

## Selection: Hi-Hat Loop 005

### Why Hi-Hat Loop 005 over 004 and 006

| Criterion             | HH 004      | **HH 005 (Selected)** | HH 006      |
|-----------------------|-------------|------------------------|-------------|
| Mean volume           | −18.3 dB    | **−19.7 dB**           | −20.2 dB    |
| Volume match to beats | Hot (+2.7dB)| **Good (+0.7dB vs B5)**| Best match  |
| Pattern density       | Dense       | **Moderate**           | Similar     |
| MD5 unique            | ✓           | **✓**                  | ✓           |
| Leading pre-roll      | 0 ms        | **0 ms**               | 0 ms        |
| Duration drift        | 0 ms        | **0 ms**               | 0 ms        |

HH 005 sits between the existing hat loops in volume (-19.7 dB vs -21.0 and -20.4 dB)
and provides a moderate-density hi-hat pattern that is distinct from both HH 001 and
HH 002, without being too dense (HH 004) or too quiet (HH 006).

---

## Processing Applied

**No processing required.**  The source file is already:
- 24-bit PCM stereo WAV (matches pack format)
- 44 100 Hz sample rate
- Exactly 7.500000 s (4 bars @ 128 BPM, zero drift)
- Grid-aligned: first audio transient at 0.000 ms
- Continuous content: no silence gaps throughout the loop body

Direct copy: `cp "Stickz - Byte Hi-Hat Loop 005 - 128BPM.wav" beat-03.wav`  
MD5 preserved: `b2f40fe6bb02f7ecc0f96891c29f1100`

---

## New Beat 3 Metadata

```ts
{
  id: 'deltaPack-beat-03', category: 'beat',
  label: 'Byte Hat B',
  audioFile: 'beats/beat-03.wav',
  sourceFile: 'Stickz - Byte Hi-Hat Loop 005 - 128BPM.wav',
  bpm: 128, bars: 4, key: null,
  volume: 0.82,
  playbackMode: 'loop', playbackQuantization: 'bar',
  allowDriftCorrection: false,
  energy: 0.62,
  transientDensity: 0.70,
  lowEndWeight: 0.10,
  mixabilityScore: 96,
}
```

`allowDriftCorrection: false` — exact 7.5s duration needs no correction.

---

## Beat Structure After Replacement

| Pad      | Pack Pad           | Source               | Duration | Category      |
|----------|--------------------|----------------------|----------|---------------|
| Beat 1   | deltaPack-beat-01  | Drum Loop 001        | 15.000s  | Full groove   |
| Beat 2   | deltaPack-beat-02  | Hi-Hat Loop 001      | 7.500s   | Hat only      |
| **Beat 3** | **deltaPack-beat-03** | **Hi-Hat Loop 005** | **7.500s** | **Hat only** |
| Beat 4   | deltaPack-beat-04  | Top Loop 001 (No Kick) | 15.000s | Top/snare   |
| Beat 5   | deltaPack-beat-05  | Hi-Hat Loop 002      | 7.500s   | Hat only      |

**Why this structure works:**
- Beat 1 provides the kick/snare spine (15s, 8-bar loop).
- Beats 2, 3, 5 provide three distinct hi-hat textures (all 7.5s, 4-bar loops — half
  the length of Beat 1, so they reset twice per Beat 1 cycle, staying naturally phase-locked).
- Beat 4 provides the no-kick top percussion layer (15s, shares Beat 1's loop length).
- 7.5s loops have 4× less phase accumulation than 30s loops — phase correction rarely
  needs to act, and when it does, hi-hat transients are far less sensitive to 100ms
  positional shifts than kick transients.

---

## Validation Results

| Test                               | Result  |
|------------------------------------|---------|
| MD5 unique vs all other beats      | ✓ Pass  |
| Duration = expected (7.500s)       | ✓ Pass  |
| Leading pre-roll = 0ms             | ✓ Pass  |
| No silence gaps in loop body       | ✓ Pass  |
| No clipping (max vol = −0.0 dBFS)  | ✓ Pass  |
| Format match (pcm_s24le, 44100Hz)  | ✓ Pass  |
| `npm run build`                    | ✓ Exit 0, 0 TypeScript errors |

---

## Files Changed

| File                                               | Change                                      |
|----------------------------------------------------|---------------------------------------------|
| `public/audio/delta-pack/beats/beat-03.wav`        | Replaced Drum Loop 004 with Hi-Hat Loop 005 |
| `src/generated/audioPacks/deltaPack.ts`            | Updated Beat 3: label, sourceFile, bars (16→4), volume (0.87→0.82), energy, transientDensity, lowEndWeight, mixabilityScore, notes |

No App.tsx changes. No runtime changes. No other pack changes.
