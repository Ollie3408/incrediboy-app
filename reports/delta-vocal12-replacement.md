# Delta Pack — Voice Pad 1 + 2 Replacement

**Date:** 2026-05-26  
**Phase:** DELTA VOCAL REFINEMENT PHASE

---

## Summary

Voice Pad 1 (voice-0) and Voice Pad 2 (voice-1) were replaced with higher-quality VCT Legacy loops offering greater energy density and stronger character identity.

Voice Pads 3–5 are **unchanged**.

---

## Old Pads

| Field | Voice Pad 1 (old) | Voice Pad 2 (old) |
|---|---|---|
| Game pad ID | `voice-0` | `voice-1` |
| Pack pad ID | `deltaPack-vocal-01` | `deltaPack-vocal-02` |
| Label | VCT Chop C# | VCT Chop G |
| Source file | Stickz VCT - Vocal Chop Loop 06 - 128BPM C#min.wav | Stickz VCT - Vocal Chop Loop 08 - 128BPM Gmin.wav |
| Mean dB | -8.6 dB | -12.2 dB |
| Energy | 0.55 | 0.53 |
| transientDensity | 0.70 | 0.68 |
| mixabilityScore | 82 | 81 |
| Weakness | Short, choppy; lacked sustained vocal texture | Rhythmic stutter only; minimal character identity |

---

## Candidate Scan

**Total candidates evaluated: 6**  
Pool: VCT v1+v2 Legacy Loops (128BPM) + Vocoded Loops (128BPM, VCT2 only)  
VCT v1 and VCT2 were confirmed **identical** in content. Granular loops (100–160BPM) excluded — no 128BPM material.

| Candidate | Key | Duration | Mean dB | 1st Silence | MD5 | Notes |
|---|---|---|---|---|---|---|
| **Legacy-02-C#min** | C#min | 7.500s | -11.9 | **none** | 3a5331c3 | Zero silence at -60dB; most dense in set. SELECTED for Voice 1 |
| Legacy-05-D#min | D#min | 7.500s | -9.9 | 2.00s | 7dbc5519 | Hot; new harmonic color; runner-up for V1 |
| Vocoded-06-C#min | C#min | 7.500s | -12.2 | 1.90s | c27f2fba | Distinct timbre; less continuous than Legacy-02 |
| **Legacy-13-Gmin** | Gmin | 7.500s | -14.7 | 1.27s | bed712ea | Active from t=0; micro-gaps only (19ms, 34ms). SELECTED for Voice 2 |
| Vocoded-08-Gmin | Gmin | 7.500s | -15.2 | 0.41s | a45b9ce5 | Too sparse; early silence gap |
| Legacy-06-Emin | Emin | 7.500s | -16.3 | 0.53s | 87b8210c | Quiet; early first gap; lower energy |

---

## Scoring Table

### Voice Pad 1 Candidates (C#min zone)

| Score Criterion | Legacy-02-C#min | Legacy-05-D#min | Vocoded-06-C#min |
|---|---|---|---|
| Mixability | **9** | 8 | 8 |
| Harmonic compatibility | **9** | 7 | **9** |
| Rhythmic stability | **10** | 9 | 9 |
| Fatigue score | **8** | 7 | 8 |
| Immediate playability | **10** | 9 | 8 |
| Uniqueness vs Voice 3–5 | **9** | **9** | 8 |
| **Total** | **55/60** | 49/60 | 50/60 |

**Winner: Legacy-02-C#min** — only loop in the entire candidate set with zero silence across the full 7.5s.

### Voice Pad 2 Candidates (Gmin zone)

| Score Criterion | Legacy-13-Gmin | Vocoded-08-Gmin | Legacy-06-Emin |
|---|---|---|---|
| Mixability | **9** | 8 | 7 |
| Harmonic compatibility | **9** | 8 | 8 |
| Rhythmic stability | **9** | 8 | 8 |
| Fatigue score | **8** | 7 | 8 |
| Immediate playability | **9** | 7 | 7 |
| Uniqueness vs Voice 3–5 | **8** | **8** | **8** |
| **Total** | **52/60** | 46/60 | 46/60 |

**Winner: Legacy-13-Gmin** — most active and dense Gmin option; rhythmic micro-gaps (19ms, 34ms) are inaudible gaps in a natural chop pattern.

---

## New Pads

| Field | Voice Pad 1 (new) | Voice Pad 2 (new) |
|---|---|---|
| Game pad ID | `voice-0` | `voice-1` |
| Pack pad ID | `deltaPack-vocal-01` | `deltaPack-vocal-02` |
| Label | VCT Legacy C# | VCT Legacy Gm |
| Source file | Stickz VCT - Legacy Vocal Chop Loop 02 - 128BPM C#min.wav | Stickz VCT - Legacy Vocal Chop Loop 13 - 128BPM Gmin.wav |
| Audio file | `vocals/vocal-01.wav` | `vocals/vocal-02.wav` |
| BPM | 128 | 128 |
| Bars | 4 | 4 |
| Key | C# / C#min | G / Gmin |
| Codec | pcm_s24le, 44100Hz, stereo | pcm_s24le, 44100Hz, stereo |
| Duration | 7.500000s | 7.500000s |
| Mean dB | -11.9 dB | -14.7 dB |
| Max dB | -0.0 dB | -0.0 dB |
| First silence | none | 1.27s (19ms micro-gap) |
| Volume (pack) | 0.56 | 0.54 |
| playbackMode | `loop` | `loop` |
| playbackQuantization | `beat` | `beat` |
| allowDriftCorrection | `false` | `false` |
| Energy | 0.70 | 0.62 |
| transientDensity | 0.78 | 0.72 |
| harmonicGroup | `C#min` | `Gmin` |
| mixabilityScore | 86 | 84 |
| MD5 | 3a5331c3... | bed712ea... |

---

## Audio Processing Applied

**Both files: direct copy, no processing.**

- Loop 02 C#min: 24-bit PCM clean throughout; no leading silence; no trimming required
- Loop 13 Gmin: 24-bit PCM; active from t=0; micro-gaps are natural chop pattern, not dead space

---

## Volume Calibration

| Vocal | Source mean | Pack volume | Notes |
|---|---|---|---|
| vocal-01 new (C#min L02) | -11.9 dB | 0.56 | Down from 0.58 — source is slightly quieter than old Loop 06 (-8.6dB) |
| vocal-02 new (Gmin L13) | -14.7 dB | 0.54 | Matches old volume — same relative level as before |
| vocal-03 (Fmin, unchanged) | -14.3 dB | 0.54 | Reference |
| vocal-05 (Amin, unchanged) | -11.0 dB | 0.55 | Reference |

---

## Unchanged Pads

| Pad | Game ID | Source | Status |
|---|---|---|---|
| Voice 3 | voice-2 | VCT Vocal Chop Loop 07 Fmin | ✓ Unchanged |
| Voice 4 | voice-3 | Byte Drop (trans-03.wav) | ✓ Unchanged |
| Voice 5 | voice-4 | VCT Legacy Loop 16 Amin | ✓ Unchanged |

---

## Files Changed

| File | Change |
|---|---|
| `public/audio/delta-pack/vocals/vocal-01.wav` | Replaced: Legacy Loop 02 C#min (7.5s, 24-bit) |
| `public/audio/delta-pack/vocals/vocal-02.wav` | Replaced: Legacy Loop 13 Gmin (7.5s, 24-bit) |
| `src/generated/audioPacks/deltaPack.ts` | Index 19 (voice-0): label, sourceFile, volume, energy, transientDensity, mixabilityScore, notes updated |
| `src/generated/audioPacks/deltaPack.ts` | Index 20 (voice-1): label, sourceFile, volume, energy, transientDensity, mixabilityScore, notes updated |

---

## Preserved

- Voice Pads 3, 4, 5: sound, metadata, quantization, all unchanged
- App.tsx runtime architecture, phase-lock, transport, pause/resume
- musicClock.ts, quantization engine, replay/share
- Beat synchronization fixes, PHASE_SETTLE_MS, slotLastPlayTimeRef
- All other Delta Pack pads (beats, bass, melody, atmospheres, FX, transitions)
- Archived packs

---

## Validation Results

| Check | Result |
|---|---|
| Voice 1 replaced with Legacy Loop 02 C#min | ✓ |
| Voice 2 replaced with Legacy Loop 13 Gmin | ✓ |
| Voice 3–5 unchanged | ✓ |
| No duplicate MD5 vs existing vocals | ✓ |
| No leading silence (Voice 1) | ✓ |
| No leading silence (Voice 2) | ✓ |
| No clipping (max -0.0dB) | ✓ |
| Exact 128BPM 4-bar grid | ✓ |
| allowDriftCorrection: false | ✓ |
| `npm run build` exit code 0 | ✓ |
| No TypeScript errors | ✓ |
| Pad count: 24 unchanged | ✓ |
