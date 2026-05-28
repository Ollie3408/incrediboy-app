# Alpha Pack — Build Report

**Pack ID**: `alpha-pack`  
**BPM Spine**: 128  
**Total Pads**: 24  
**Build Date**: 2026-05-27  
**Branch**: `recovery-audio-stability`

---

## Summary

Alpha Pack is a curated 128 BPM pack sourced from Stickz Byte (stems + full mixes) and Stickz VCT Legacy Loops. It is designed to be cleaner, smoother, and lower fatigue than Delta Pack — hat-heavy beats, resampled/break bass stems, smooth sustained melodies, atmospheric pads, and fresh-key vocals across 5 harmonic identities not present in Delta.

All 24 audio files are bar-aligned within ±0.010s of their expected durations. `allowDriftCorrection: false` on every pad.

---

## Pad Selection Table

| Index | Game Pad    | File             | Source File                                          | BPM | Bars | Key   | Duration  | Processing       | Volume |
|-------|-------------|------------------|------------------------------------------------------|-----|------|-------|-----------|------------------|--------|
| 0     | beat-0      | beats/beat-01.wav | Stickz - Byte Drum Loop 002 - 128BPM.wav            | 128 | 16   | —     | 30.000 s  | Direct copy      | 0.87   |
| 1     | beat-1      | beats/beat-02.wav | Stickz - Byte Hi-Hat Loop 003 - 128BPM.wav          | 128 | 4    | —     | 7.500 s   | Direct copy      | 0.85   |
| 2     | beat-2      | beats/beat-03.wav | Stickz - Byte Hi-Hat Loop 004 - 128BPM.wav          | 128 | 4    | —     | 7.500 s   | Direct copy      | 0.83   |
| 3     | beat-3      | beats/beat-04.wav | Stickz - Byte Hi-Hat Loop 006 - 128BPM.wav          | 128 | 4    | —     | 7.500 s   | Direct copy      | 0.82   |
| 4     | beat-4      | beats/beat-05.wav | Stickz - Byte Hi-Hat Loop 007 - 128BPM.wav          | 128 | 4    | —     | 7.500 s   | Direct copy      | 0.82   |
| 5     | melody-0    | melody/melody-01.wav | Stickz - Byte Synth Loop 003 - Lead Supersaw.wav | 128 | 16   | Amin  | 30.000 s  | Trimmed from 35.625 s (19 bars) | 0.72 |
| 6     | melody-1    | melody/melody-02.wav | Stickz - Byte Synth Loop 002 - Lead Reverses.wav | 128 | 16   | Gmin  | 30.000 s  | Trimmed from 33.750 s (18 bars) | 0.70 |
| 7     | melody-2    | melody/melody-03.wav | Stickz - Byte Synth Loop 004 - Lead Response.wav | 128 | 16   | A#min | 30.000 s  | Trimmed from 31.875 s (17 bars) | 0.74 |
| 8     | effect-0    | fx/fx-01.wav      | Stickz - Byte Impact 002.wav                         | 128 | 8    | —     | 15.000 s  | Padded from 4.346 s (apad) | 0.52 |
| 9     | effect-1    | fx/fx-02.wav      | Stickz - Byte Uplifter 002.wav                       | 128 | 8    | —     | 15.000 s  | Padded from 8.250 s (apad) | 0.50 |
| 10    | effect-2    | transitions/trans-01.wav | Stickz - Byte Fill 003 - 128BPM.wav           | 128 | 4    | —     | 7.500 s   | Padded from 1.875 s (apad) | 0.52 |
| 11    | effect-3    | transitions/trans-02.wav | Stickz - Byte Fill 004 - 128BPM.wav           | 128 | 4    | —     | 7.500 s   | Padded from 1.875 s (apad) | 0.50 |
| 12    | melody-3    | melody/melody-04.wav | Stickz - Byte Synth Loop 001 - 128BPM C#min.wav | 128 | 16   | C#min | 30.000 s  | Trimmed from 31.875 s (17 bars) | 0.68 |
| 13    | melody-4    | atmospheres/atmo-01.wav | Stickz - Byte Synth Loop 003 - Atmos FX.wav  | 128 | 16   | Amin  | 30.000 s  | Trimmed from 35.625 s (19 bars) | 0.48 |
| 14    | percussion-0 | bass/bass-01.wav | Stickz - Byte Synth Loop 001 - Bass Resampled.wav   | 128 | 16   | C#min | 30.000 s  | Trimmed from 31.875 s (17 bars) | 0.65 |
| 15    | percussion-1 | bass/bass-02.wav | Stickz - Byte Synth Loop 002 - Resampled Bass.wav   | 128 | 16   | Gmin  | 30.000 s  | Trimmed from 33.750 s (18 bars) | 0.66 |
| 16    | percussion-2 | bass/bass-03.wav | Stickz - Byte Synth Loop 003 - Break Bass.wav       | 128 | 16   | Amin  | 30.000 s  | Trimmed from 35.625 s (19 bars) | 0.64 |
| 17    | percussion-3 | bass/bass-04.wav | Stickz - Byte Synth Loop 004 - Bass Growl Layers.wav | 128 | 16  | A#min | 30.000 s  | Trimmed from 31.875 s (17 bars) | 0.65 |
| 18    | percussion-4 | atmospheres/atmo-02.wav | Stickz - Byte Synth Loop 003 - Atmos Vox.wav | 128 | 16   | Amin  | 30.000 s  | Trimmed from 35.625 s (19 bars) | 0.46 |
| 19    | voice-0     | vocals/vocal-01.wav | Stickz VCT - Legacy Vocal Chop Loop 01 - 128BPM C#min.wav | 128 | 4 | C#min | 7.500 s | Direct copy | 0.58 |
| 20    | voice-1     | vocals/vocal-02.wav | Stickz VCT - Legacy Vocal Chop Loop 06 - 128BPM Emin.wav  | 128 | 4 | Emin  | 7.500 s | Direct copy | 0.55 |
| 21    | voice-2     | vocals/vocal-03.wav | Stickz VCT - Legacy Vocal Chop Loop 08 - 128BPM Fmin.wav  | 128 | 4 | Fmin  | 7.500 s | Direct copy | 0.55 |
| 22    | voice-3     | vocals/vocal-04.wav | Stickz VCT - Legacy Vocal Chop Loop 12 - 128BPM Gmin.wav  | 128 | 4 | Gmin  | 7.500 s | Direct copy | 0.52 |
| 23    | voice-4     | vocals/vocal-05.wav | Stickz VCT - Legacy Vocal Chop Loop 19 - 128BPM Bmin.wav  | 128 | 4 | Bmin  | 7.500 s | Direct copy | 0.52 |

---

## Selection Reasoning

### Beats (5 pads)
Chose 1 full drum loop + 4 hi-hat-only loops. This is a deliberate departure from Delta's mixed approach (2 full grooves + 2 hi-hats + 1 top-loop). The result: much lower transient density in the beat section, ideal for a "lighter feel" pack.

- **beat-01** (Drum Loop 002): Fullest groove, serves as the foundational kit. 16 bars provides extended loop variety.
- **beat-02 to beat-05** (Hi-Hat Loops 003, 004, 006, 007): All exclusively hi-hat content — no kick, no snare. Freely layerable without low-end clash. Each has a distinct open/closed/accent pattern.

### Melody (4 pads)
All drawn from stems or full-mix loops untouched by Delta.

- **melody-01** (Lead Supersaw, Amin): Smoothest, most sustained — ideal anchor melody.
- **melody-02** (Lead Reverses, Gmin): Reversed phrases add atmospheric smoothness, lower fatigue than forward-playing melodies.
- **melody-03** (Lead Response, A#min): Designed as the answer phrase to Delta's "Lead Call" — complementary across packs.
- **melody-04** (Full Mix Loop 001, C#min): Complete layered mix including bass, leads, and atmosphere FX — creates a rich, self-contained melodic texture.

### Atmosphere (2 pads)
Both drawn from Loop 003 Amin stems not used by Delta.

- **atmo-01** (Atmos FX, Amin): Digital shimmer texture, zero low-end weight.
- **atmo-02** (Atmos Vox, Amin): Breathy, airy vocal atmosphere — adds a human texture absent from Delta's C#min atmosphere.

### Bass (4 pads)
Used resampled/break/growl stems — all lighter than Delta's "Main Layer" stems.

- **bass-01** (Bass Resampled, C#min): Filtered resampled bass — less aggressive low-end than Main Layer.
- **bass-02** (Resampled Bass, Gmin): Warm texture, shorter phrase cycles.
- **bass-03** (Break Bass, Amin): Staccato break-pattern bass — lower sustained low-end weight.
- **bass-04** (Bass Growl Layers, A#min): Layered growl — slightly more aggressive but distinct character.

### Vocals (5 pads)
All 5 are VCT Legacy 128 BPM loops with zero detectable silence at -50 dB. All are unused by Delta.

Harmonic spread: C#min, Emin, Fmin, Gmin, Bmin — 5 entirely distinct tonal identities.

Delta's vocals for reference: Fmin (09), Gmin (13), Fmin (Chop 07), Amin (16).
Alpha reuses Fmin and Gmin families (loops 08 and 12 respectively) but uses distinct chop recordings.

### FX (2 pads)
Lighter than Delta's equivalents.

- **fx-01** (Impact 002): 4.3 s hit vs Delta's 6 s hit — punchier, less overpowering.
- **fx-02** (Uplifter 002): Different sweep character from Uplifter 001.

Both padded with silent tail to exact 8-bar (15.000 s) duration using `ffmpeg -af apad`.

### Transitions (2 pads)
Fresh fills from the Byte Fills set.

- **trans-01** (Fill 003): 1-bar fill padded to 4-bar cycle (7.500 s).
- **trans-02** (Fill 004): 1-bar fill padded to 4-bar cycle (7.500 s).

Delta used Fill 001 and Fill 002 — these are entirely distinct takes.

---

## Processing Applied

| File(s)                  | Method                         | Notes                              |
|--------------------------|--------------------------------|------------------------------------|
| melody-01 to 04          | `ffmpeg -t 30.0`              | Trim trailing bars to 16 bars       |
| bass-01 to 04            | `ffmpeg -t 30.0`              | Trim trailing bars to 16 bars       |
| atmo-01, atmo-02         | `ffmpeg -t 30.0`              | Trim trailing bars to 16 bars       |
| fx-01 (Impact 002)       | `ffmpeg -af apad -t 15`       | Pad 4.346 s → 15.000 s (8 bars)    |
| fx-02 (Uplifter 002)     | `ffmpeg -af apad -t 15`       | Pad 8.250 s → 15.000 s (8 bars)    |
| trans-01 (Fill 003)      | `ffmpeg -af apad -t 7.5`      | Pad 1.875 s → 7.500 s (4 bars)     |
| trans-02 (Fill 004)      | `ffmpeg -af apad -t 7.5`      | Pad 1.875 s → 7.500 s (4 bars)     |
| All beats and vocals     | Direct copy                   | Native durations already exact      |

No leading silence was detected (≥50 ms at -50 dB) on any file. No silence trimming required.

---

## Duration Verification

All 24 files measured by `ffprobe` after copying:

```
beats/beat-01.wav:        30.000000 s  (16 bars ✓)
beats/beat-02.wav:         7.500000 s  ( 4 bars ✓)
beats/beat-03.wav:         7.500000 s  ( 4 bars ✓)
beats/beat-04.wav:         7.500000 s  ( 4 bars ✓)
beats/beat-05.wav:         7.500000 s  ( 4 bars ✓)
melody/melody-01.wav:     30.000000 s  (16 bars ✓)
melody/melody-02.wav:     30.000000 s  (16 bars ✓)
melody/melody-03.wav:     30.000000 s  (16 bars ✓)
melody/melody-04.wav:     30.000000 s  (16 bars ✓)
atmospheres/atmo-01.wav:  30.000000 s  (16 bars ✓)
atmospheres/atmo-02.wav:  30.000000 s  (16 bars ✓)
bass/bass-01.wav:         30.000000 s  (16 bars ✓)
bass/bass-02.wav:         30.000000 s  (16 bars ✓)
bass/bass-03.wav:         30.000000 s  (16 bars ✓)
bass/bass-04.wav:         30.000000 s  (16 bars ✓)
vocals/vocal-01.wav:       7.500000 s  ( 4 bars ✓)
vocals/vocal-02.wav:       7.500000 s  ( 4 bars ✓)
vocals/vocal-03.wav:       7.500000 s  ( 4 bars ✓)
vocals/vocal-04.wav:       7.500000 s  ( 4 bars ✓)
vocals/vocal-05.wav:       7.500000 s  ( 4 bars ✓)
fx/fx-01.wav:             15.000000 s  ( 8 bars ✓)
fx/fx-02.wav:             15.000000 s  ( 8 bars ✓)
transitions/trans-01.wav:  7.500000 s  ( 4 bars ✓)
transitions/trans-02.wav:  7.500000 s  ( 4 bars ✓)
```

All within ±0.000 s of expected. Build confirmed clean.
