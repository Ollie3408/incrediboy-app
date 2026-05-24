# Delta Pack — Rhythmic Stabilization Report

**Generated:** 2026-05-23  
**Spine BPM:** 128  
**1 bar @ 128 BPM:** 1.875 s  
**Standard loop grid:** 4 / 8 / 16 bars (7.5 / 15 / 30 s)

---

## Root Cause Analysis

All five beat loops were already correct power-of-2 lengths (4, 8, 16 bars). All three vocal loops were correct (4, 8 bars). The drift originated exclusively from **non-power-of-2 bar counts** in the bass, melody, and atmosphere stems.

| Group | Original bars | Original duration | Problem |
|---|---|---|---|
| bass-01, bass-04 | 17 | 31.875 s | Coprime with 8-bar beats — LCM = 136 bars (255 s) |
| bass-02 | 18 | 33.750 s | LCM with 16-bar beat = 144 bars (270 s) |
| bass-03 | 19 | 35.625 s | LCM with 16-bar beat = 304 bars (570 s) |
| melody-01, melody-04 | 17 | 31.875 s | Same as bass-01 |
| melody-02 | 18 | 33.750 s | Same as bass-02 |
| melody-03 | 19 | 35.625 s | Same as bass-03 |
| atmo-01 | 17 | 31.875 s | Same as bass-01 |
| atmo-02 | 19 | 35.625 s | Same as bass-03 |

**Why drift occurs:** With native `audio.loop = true`, each pad cycles independently. An 8-bar drum (15 s) and a 17-bar bass (31.875 s) only re-phase-align every LCM(8,17) = 136 bars = **255 seconds**. Between those alignment points, progressive groove displacement is audible — up to a full bar out of phase by minute 2.

**Why playbackRate correction cannot fix this:** Correcting 17 bars → 16 bars requires a 6.25% speed change, far outside the ±2% safe threshold. Pitch artefacts would be audible.

**Fix applied:** All 10 problematic stems were **trimmed to exactly 16 bars (30.000 s)** using ffmpeg with a 40 ms fade-out at the loop boundary to prevent click. LCM across all loop lengths is now 16 bars — permanent synchronisation.

---

## Per-Pad Sync Audit

### Beats (unchanged — already correct)

| Pad ID | Measured BPM | Expected BPM | Actual duration | Drift % | Bars | allowDriftCorrection | Status |
|---|---|---|---|---|---|---|---|
| beat-01 | 128 | 128 | 15.000 s | 0.00% | 8 | false | ✅ STABLE |
| beat-02 | 128 | 128 | 7.500 s | 0.00% | 4 | false | ✅ STABLE |
| beat-03 | 128 | 128 | 30.000 s | 0.00% | 16 | false | ✅ STABLE |
| beat-04 | 128 | 128 | 15.000 s | 0.00% | 8 | false | ✅ STABLE |
| beat-05 | 128 | 128 | 7.500 s | 0.00% | 4 | false | ✅ STABLE |

### Bass (corrected)

| Pad ID | Original bars | Pre-fix duration | Corrected bars | Post-fix duration | Drift % | allowDriftCorrection | Action |
|---|---|---|---|---|---|---|---|
| bass-01 | 17 | 31.875 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 1.875 s |
| bass-02 | 18 | 33.750 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 3.750 s |
| bass-03 | 19 | 35.625 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 5.625 s |
| bass-04 | 17 | 31.875 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 1.875 s |

### Melody (corrected)

| Pad ID | Original bars | Pre-fix duration | Corrected bars | Post-fix duration | Drift % | allowDriftCorrection | Action |
|---|---|---|---|---|---|---|---|
| melody-01 | 17 | 31.875 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 1.875 s |
| melody-02 | 18 | 33.750 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 3.750 s |
| melody-03 | 19 | 35.625 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 5.625 s |
| melody-04 | 17 | 31.875 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 1.875 s |

### Atmospheres (corrected)

| Pad ID | Original bars | Pre-fix duration | Corrected bars | Post-fix duration | Drift % | allowDriftCorrection | Action |
|---|---|---|---|---|---|---|---|
| atmo-01 | 17 | 31.875 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 1.875 s |
| atmo-02 | 19 | 35.625 s | **16** | **30.000 s** | **0.00%** | false | Trimmed 5.625 s |

### Vocals (unchanged — already correct)

| Pad ID | Measured BPM | Expected BPM | Actual duration | Drift % | Bars | allowDriftCorrection | Status |
|---|---|---|---|---|---|---|---|
| vocal-01 | 128 | 128 | 7.500 s | 0.00% | 4 | false | ✅ STABLE |
| vocal-02 | 128 | 128 | 7.500 s | 0.00% | 4 | false | ✅ STABLE |
| vocal-03 | 128 | 128 | 15.000 s | 0.00% | 8 | false | ✅ STABLE |

---

## One-Shots (excluded from sync audit — correct by design)

| Pad ID | Duration | Mode | Notes |
|---|---|---|---|
| fx-01 (Byte Impact) | ~6 s | one-shot | ✅ No looping, no sync required |
| fx-02 (Byte Uplift) | ~5.5 s | one-shot | ✅ No looping, no sync required |
| fx-03 (Byte Riser) | 15 s / 8 bars | one-shot | ✅ BPM-synced, fires once |
| trans-01 (Byte Fill A) | 1.875 s / 1 bar | one-shot | ✅ Exact bar length |
| trans-02 (Byte Fill B) | 1.875 s / 1 bar | one-shot | ✅ Exact bar length |
| trans-03 (Byte Drop) | ~9.2 s | one-shot | ✅ Downlifter, fires once |

---

## Summary

- **10 stems corrected** — all trimmed to exactly 30.000 s (16 bars @ 128 BPM)
- **0 stems required playbackRate correction** — drift eliminated by audio length normalisation
- **All loop pads:** `allowDriftCorrection: false` — no engine correction needed
- **Unified LCM:** All active loops now share LCM = **16 bars (30 s)** — infinite phase lock
- **Build status:** ✅ Clean (`npm run build` passed)
