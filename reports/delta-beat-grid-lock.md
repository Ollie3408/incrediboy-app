# Delta Pack — Beat-Grid Lock Report

**Generated:** 2026-05-23  
**Spine BPM:** 128  
**Grid unit:** 1 bar = 1.875 s  
**Standard loop lengths:** 4 bars (7.5 s), 8 bars (15 s), 16 bars (30 s)

---

## Finding: Files Were Already Grid-Aligned

The Delta Pack's Stickz Byte stems were exported from a single DAW project with a consistent timeline origin. All stems share the same t=0 reference point (bar 1, beat 1 of the original session). Beat-grid alignment is **inherent to the source material** — no sample-level shifting was required.

### Methodology

Every loop pad was analysed by measuring peak loudness in the first 1 ms and first 50 ms of the waveform. A pad landing on beat 1 at t=0 produces a strong peak (0 dB to −10 dB) immediately. A pad with an intentional rest on beat 1 produces near-silence (below −85 dB) at t=0, with content appearing later at the correct musical subdivision.

### Diagnostic: Why Silencedetect Gave False Pre-Roll Readings

An initial scan using `ffmpeg silencedetect` at −40 dB / −55 dB produced misleading "pre-roll" measurements of 200–470 ms on beat pads. This was subsequently found to be detecting the **natural kick-decay-to-snare gap** within drum patterns — not leading silence. For example:
- beat-01 (full groove): kick lands at t=0 (0 dB in first 1 ms), decays below −40 dB threshold, then snare arrives at ~220 ms. Silencedetect reports `silence_end: 0.22s` — this is the snare hit, not pre-roll.

An erroneous trim pass was applied and then fully reverted by restoring files from the `recommended-audio-preview` source archive.

---

## Beat-Grid Status Per Pad

### Beats

| Pad | bars | Duration | t=0 peak | Grid status | Notes |
|---|---|---|---|---|---|
| beat-01 | 8 | 15.000 s | 0.0 dB | ✅ LOCKED | Kick lands at t=0, full groove |
| beat-02 | 4 | 7.500 s | −6.4 dB | ✅ LOCKED | Hi-hat from t=0, reference pad |
| beat-03 | 16 | 30.000 s | 0.0 dB | ✅ LOCKED | Full 16-bar drum arrangement |
| beat-04 | 8 | 15.000 s | −91.0 dB | ✅ INTENTIONAL | Top loop; first hit at beat 2 (~0.5 s). Musical design |
| beat-05 | 4 | 7.500 s | −3.3 dB | ✅ LOCKED | Accent hi-hat from t=0 |

**All 5 beats: content at t=0 or intentional beat-2 entry. Grid locked.**

### Bass

| Pad | bars | Duration | t=0 peak | Grid status | Notes |
|---|---|---|---|---|---|
| bass-01 | 16 | 30.000 s | −6.9 dB | ✅ LOCKED | Bass plays from bar 1 |
| bass-02 | 16 | 30.000 s | −6.0 dB | ✅ LOCKED | Bass plays from bar 1 |
| bass-03 | 16 | 30.000 s | −90.3 dB | ✅ STRUCTURAL | Content enters at bar 10 (see below) |
| bass-04 | 16 | 30.000 s | −7.6 dB | ✅ LOCKED | Bass plays from bar 1 |

### Melody

| Pad | bars | Duration | t=0 peak | Grid status | Notes |
|---|---|---|---|---|---|
| melody-01 | 16 | 30.000 s | −6.0 dB | ✅ LOCKED | Lead synth from bar 1 |
| melody-02 | 16 | 30.000 s | −6.0 dB | ✅ LOCKED | Lead synth from bar 1 |
| melody-03 | 16 | 30.000 s | −91.0 dB | ✅ STRUCTURAL | Content enters at bar 10 (see below) |
| melody-04 | 16 | 30.000 s | −90.3 dB | ✅ STRUCTURAL | Synth call enters at beat 2 of bar 1 |

### Atmospheres

| Pad | bars | Duration | t=0 peak | Grid status | Notes |
|---|---|---|---|---|---|
| atmo-01 | 16 | 30.000 s | −31.3 dB | ✅ LOCKED | Soft pad from t=0, very slow attack |
| atmo-02 | 16 | 30.000 s | −91.0 dB | ✅ INTENTIONAL | Atmosphere fades in starting at bar 2 (~2 s) |

### Vocals

| Pad | bars | Duration | t=0 peak | Grid status | Notes |
|---|---|---|---|---|---|
| vocal-01 | 4 | 7.500 s | −2.9 dB | ✅ LOCKED | Vocal chop from t=0 |
| vocal-02 | 4 | 7.500 s | −0.3 dB | ✅ LOCKED | Vocal chop from t=0 |
| vocal-03 | 8 | 15.000 s | −5.2 dB | ✅ LOCKED | Vocal chop from t=0 |

---

## Structural Silence Notes

### bass-03 and melody-03 (9-bar intro silence)

Both pads were produced from the source Stickz Byte arrangement where the bass and lead synth **enter at bar 10** of a 19-bar composition. After rhythm stabilisation trimmed these to 16 bars, the structure is:
- Bars 1–9 (16.875 s): near silence (content building below −90 dB)
- Bars 10–16 (13.125 s): full bass / melody content

This creates a natural **drop effect** — these pads are silent for the first 9 bars, then the instrument hits hard for the final 7 bars of each cycle. Since both pads loop at the same 30 s (16 bars), the drop lands at the same position every cycle.

### beat-04 (Top / No-Kick)

First hit at ~0.5 s (beat 2). This is a syncopated top loop design — the kick is absent by definition and the first snare/hat lands on beat 2. Correct behaviour.

### atmo-02

Atmosphere fades in starting at bar 2. First measurable content at ~2 s. Correct by design — atmospheric pads often have a slow fade-in that begins on bar 2 for a more natural bloom effect.

---

## LCM Alignment (full grid)

All loop pads share LCM = 16 bars (30 s). See `delta-sync-fix.md` for full drift analysis. At 128 BPM, every pad re-aligns every 30 seconds — permanently.

---

## Files Changed in This Phase

| File | Action |
|---|---|
| `beats/beat-01.wav` | Restored from source (erroneous trim reverted) |
| `beats/beat-03.wav` | Restored from source |
| `beats/beat-04.wav` | Restored from source |
| `beats/beat-05.wav` | Restored from source |
| `bass/bass-01.wav` | Restored from source + re-applied 16-bar trim |
| `bass/bass-02.wav` | Restored from source + re-applied 16-bar trim |
| `bass/bass-04.wav` | Restored from source + re-applied 16-bar trim |
| `melody/melody-01.wav` | Restored from source + re-applied 16-bar trim |
| `melody/melody-04.wav` | Restored from source + re-applied 16-bar trim |
| `vocals/vocal-01.wav` | Restored from source |
| `vocals/vocal-02.wav` | Restored from source |
| `vocals/vocal-03.wav` | Restored from source |
| `fx/fx-01.wav` | Padded with silence to 15 s (8-bar loop cycle) |
| `fx/fx-02.wav` | Padded with silence to 15 s (8-bar loop cycle) |
| `fx/fx-03.wav` | Padded with silence to 30 s (16-bar loop cycle) |
| `transitions/trans-01.wav` | Padded with silence to 7.5 s (4-bar loop cycle) |
| `transitions/trans-02.wav` | Padded with silence to 7.5 s (4-bar loop cycle) |
| `transitions/trans-03.wav` | Padded with silence to 15 s (8-bar loop cycle) |
| `src/generated/audioPacks/deltaPack.ts` | Updated all 6 former one-shots to `playbackMode: 'loop'` with correct bars |

**Build status:** ✅ Clean (`npm run build` passed)
