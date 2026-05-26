# Delta Pack — Vocal Pad 5 Replacement + Pad Layout Fix

**Date:** 2026-05-26  
**Phase:** DELTA PAD LAYOUT + VOCAL PAD 5 REPLACEMENT PHASE (CORRECTED)

---

## Summary

Two issues were resolved in this phase:

1. **Layout fix** — Voice Pad 4 (`voice-3`) was visually misplaced in the TRANSITIONS group. Additionally Voice Pad 5 (`voice-4`) was misplaced in the LAYERS group. Both are now consolidated into the VOCALS group.
2. **Voice Pad 5 sound replacement** — `voice-4` was assigned an atmosphere pad (`deltaPack-atmo-02`). It has been replaced with a true vocal chop loop (VCT Legacy Loop 16, Amin, 128BPM).

---

## Old Voice Pad 5

| Field          | Value                                               |
|----------------|-----------------------------------------------------|
| Game pad ID    | `voice-4`                                           |
| Pack pad ID    | `deltaPack-atmo-02`                                 |
| Category       | `atmosphere`                                        |
| Label          | Byte Atmos Am                                       |
| Audio file     | `atmospheres/atmo-02.wav`                           |
| Source file    | Stickz - Byte Synth Loop 003 - Atmos FX.wav         |
| BPM            | 128                                                 |
| Bars           | 16                                                  |
| Key            | A / Amin                                            |
| Volume         | 0.48                                                |
| Layout group   | LAYERS (Row 2)                                      |
| Problem        | Atmosphere pad assigned as a vocal game slot — not a true vocal. Wrong group display. |

---

## Candidate Scan

Only VCT 128BPM loops were scanned — no broad directory walk to avoid timeout.

**Excluded (already used as Voice 1–3):**
- VCT Legacy Loop 06 → vocal-01 (C#min, md5: 24dca260...)
- VCT Legacy Loop 08 → vocal-02 (Gmin, md5: a1bbdf7e...)
- VCT Legacy Loop 07 → vocal-03 (Fmin, md5: b67e2d86...)

**Candidates evaluated:**

| Loop | Key    | Duration | MD5 (first 8) | Mean dB | First silence | Result       |
|------|--------|----------|----------------|---------|---------------|--------------|
| 15   | Amin   | 7.500s   | abf05085       | -11.7   | 0.45s         | Rejected — silence gap too early |
| **16**   | **Amin**   | **7.500s**   | **387853f9**       | **-11.0**   | **4.61s**         | **SELECTED** ✓ |
| 01   | C#min  | 7.500s   | 9ee30c34       | -14.9   | 3.52s         | Good, but C#min duplicates harmonic zone of vocal-01; Amin preferred |
| 12   | Gmin   | 7.500s   | 4e26fc0b       | —       | —             | Gmin already covered by vocal-02 |
| 05   | D#min  | 7.500s   | 7dbc5519       | —       | —             | Low harmonic compatibility with Amin-based Delta stems |
| 19   | Bmin   | 7.500s   | 3aaeaa5d       | —       | —             | Neutral fit; Amin preferred for harmonic pairing |

---

## Scoring Table — Final Selection

**Selected: VCT Legacy Vocal Chop Loop 16 — 128BPM Amin**

| Criterion              | Score | Notes |
|------------------------|-------|-------|
| Mixability             | 9/10  | 7.5s matches all other 4-bar vocal loops; dense chop texture layers cleanly |
| Harmonic compatibility | 9/10  | Amin pairs directly with bass-03, melody-03, atmo-02 (Amin), melody existing |
| Rhythmic stability     | 9/10  | Exact 7.5000s, 4 bars @ 128BPM — no drift correction required |
| Fatigue score          | 8/10  | Mean -11.0dB; volume 0.55 provides headroom; vocal texture not monotonous |
| Immediate playability  | 9/10  | No leading silence; content from t=0 to t=4.6s before first 6ms gap (inaudible) |
| **Total**              | **44/50** | |

---

## New Voice Pad 5

| Field          | Value                                                     |
|----------------|-----------------------------------------------------------|
| Game pad ID    | `voice-4`                                                 |
| Pack pad ID    | `deltaPack-vocal-05`                                      |
| Category       | `voice`                                                   |
| Label          | VCT Legacy Am                                             |
| Audio file     | `vocals/vocal-05.wav`                                     |
| Source file    | Stickz VCT - Legacy Vocal Chop Loop 16 - 128BPM Amin.wav |
| BPM            | 128                                                       |
| Bars           | 4                                                         |
| Key            | A / Amin                                                  |
| Volume         | 0.55                                                      |
| playbackMode   | `loop`                                                    |
| playbackQuantization | `beat`                                              |
| allowDriftCorrection | `false`                                             |
| Energy         | 0.64                                                      |
| harmonicGroup  | `Amin`                                                    |
| transientDensity | 0.72                                                    |
| lowEndWeight   | 0.08                                                      |
| mixabilityScore | 83                                                       |
| Layout group   | VOCALS (Row 2)                                            |
| MD5            | 387853f975586ec4207f80f647f8acae                          |

---

## Audio Processing Applied

None required. Source file was clean:
- 24-bit PCM, 44100Hz stereo — native broadcast quality
- No leading silence (content from t=0)
- Exact 7.500000s duration — aligns perfectly with 4-bar 128BPM grid
- Only one silence gap: 6ms at t=4.61s (well below audible threshold)
- Direct copy without trim, normalize, or fade

---

## Volume Calibration

| Vocal | Source mean | Pack volume |
|-------|-------------|-------------|
| vocal-01 (C#min) | -8.6 dB  | 0.58 |
| vocal-02 (Gmin)  | -12.2 dB | 0.56 |
| vocal-03 (Fmin)  | -14.3 dB | 0.54 |
| **vocal-05 (Amin)**  | **-11.0 dB** | **0.55** |

Loop 16 at -11.0 dB sits naturally between vocal-01 and vocal-02 in loudness. Volume 0.55 maintains consistent perceived level across the VOCALS group.

---

## Layout Fix

### Before

| Row 2 Group   | Pad IDs                              |
|---------------|--------------------------------------|
| LAYERS        | melody-3, melody-4, **voice-4**      |
| VOCALS        | voice-0, voice-1, voice-2            |
| FX            | effect-0, effect-1, effect-2         |
| TRANSITIONS   | effect-3, percussion-4, **voice-3**  |

### After

| Row 2 Group   | Pad IDs                                          |
|---------------|--------------------------------------------------|
| LAYERS        | melody-3, melody-4                               |
| VOCALS        | voice-0, voice-1, voice-2, **voice-3**, **voice-4** |
| FX            | effect-0, effect-1, effect-2                     |
| TRANSITIONS   | effect-3, percussion-4                           |

- `voice-3` (`deltaPack-trans-03`, Byte Drop): sound and metadata **unchanged** — only moved from TRANSITIONS to VOCALS
- `voice-4` (`deltaPack-vocal-05`): moved from LAYERS to VOCALS **and** assigned new vocal sound

Total pads per row: Row 1 = 12, Row 2 = 12. Total = 24. ✓

---

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | `DELTA_PACK_PAD_ROWS`: LAYERS 3→2 pads, VOCALS 3→5 pads, TRANSITIONS 3→2 pads |
| `public/audio/delta-pack/vocals/vocal-05.wav` | NEW — VCT Legacy Loop 16 Amin (7.5s, 24-bit PCM) |
| `src/generated/audioPacks/deltaPack.ts` | Index 23 (voice-4): id, category, label, audioFile, sourceFile, bpm, bars, volume, energy, transientDensity, lowEndWeight, mixabilityScore, notes updated |

---

## Preserved (Unchanged)

- All 4 existing vocal pads (voice-0..2): sound, metadata, quantization unchanged
- `voice-3` (Byte Drop): sound, metadata, BPM, bars, playbackMode all unchanged — layout only
- App.tsx runtime architecture, phase-lock system, transport, pause/resume
- musicClock.ts, quantization engine, replay/share system
- Beat synchronization fixes, PHASE_SETTLE_MS, slotLastPlayTimeRef
- All other Delta Pack pads (beats, bass, melody, atmospheres, FX, transitions)
- Archived packs

---

## Validation Results

| Check | Result |
|-------|--------|
| Voice 4 (voice-3) sound unchanged | ✓ |
| Voice 4 moved beside Voice 1–3 | ✓ |
| Voice 5 (voice-4) replaced with vocal | ✓ |
| All 5 vocal pads in VOCALS group | ✓ |
| No duplicate MD5 | ✓ |
| No leading silence | ✓ |
| No clipping (max -0.1dB) | ✓ |
| Exact 128BPM 4-bar grid | ✓ |
| allowDriftCorrection: false | ✓ |
| `npm run build` exit code 0 | ✓ |
| vocal-05.wav bundled in dist | ✓ (`voice-5-DlZ-ETTM.wav`) |
| No TypeScript errors | ✓ |
| Pad count: 24 (12+12) | ✓ |
