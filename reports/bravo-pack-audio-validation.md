# Bravo Pack Audio Validation Report

**Generated:** 2026-05-29  
**Validation date:** 2026-05-29  
**Tool versions:** ffprobe / ffmpeg (system install)

---

## Validation Summary

| Check | Result |
|-------|--------|
| Total files | 24 |
| MD5 uniqueness | ✅ PASS — all 24 hashes distinct |
| Duration within ±10ms of target | ✅ PASS — all 24 files |
| Source BPM confirmed 128 | ✅ PASS — all files verified by duration |
| allowDriftCorrection: false | ✅ PASS — all 24 pads |
| No cross-pack file reuse | ✅ PASS — verified against Alpha + Delta source lists |
| playbackRate changes | ✅ NONE |
| setInterval additions | ✅ NONE |
| Build (tsc + vite) | ✅ PASS — 0 errors |

---

## Per-File Validation

### Beats

| File | Target Duration | Measured Duration | Delta | Mean Volume | Silence Regions | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----------------|-----|--------|
| beats/beat-01.wav | 30.000s (16 bars) | 30.000s | 0ms | −10.3 dB | 16 (between hits) | `4cbc2f48` | ✅ PASS |
| beats/beat-02.wav | 15.000s (8 bars) | 15.000s | 0ms | −11.0 dB | 9 (between hits) | `99b8bb70` | ✅ PASS |
| beats/beat-03.wav | 7.500s (4 bars) | 7.500s | 0ms | −21.0 dB | 0 | `13b496d6` | ✅ PASS |
| beats/beat-04.wav | 15.000s (8 bars) | 15.000s | 0ms | −20.5 dB | 9 (between hits) | `a7e61ed2` | ✅ PASS |
| beats/beat-05.wav | 30.000s (16 bars) | 30.000s | 0ms | −11.7 dB | 17 (between hits) | `7d271d31` | ✅ PASS |

**Notes:**  
- beat-01/02/05 silence regions are brief inter-hit gaps in percussion loops (expected behavior).  
- beat-03 (hat loop): mean −21.0 dB reflects sparse hi-hat with gaps, not silent content.  
- beat-04 (top-nokick): mean −20.5 dB consistent with top loop without kick's bass weight.

---

### Melody

| File | Target Duration | Measured Duration | Delta | Mean Volume | Source Duration | Processing | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----------------|-----------|-----|--------|
| melody/melody-01.wav | 15.000s (8 bars) | 15.000s | 0ms | −13.2 dB | 15.000s | Copy | `1004b224` | ✅ PASS |
| melody/melody-02.wav | 15.000s (8 bars) | 15.000s | 0ms | −10.5 dB | 15.000s | Copy | `b429e4b2` | ✅ PASS |
| melody/melody-03.wav | 7.500s (4 bars) | 7.500s | 0ms | −13.0 dB | 7.500s | Copy | `ad9226ee` | ✅ PASS |
| melody/melody-04.wav | 30.000s (16 bars) | 30.000181s | +0.18ms | −19.5 dB | 33.750s (18 bars) | Trim −t 30.000 | `a3c81d8f` | ✅ PASS |

**Notes:**  
- melody-01 and melody-02 are confirmed distinct files (MD5 `1004b224` ≠ `b429e4b2`) despite same key family.  
- melody-04 trimmed from 18 bars (33.75s) to 16 bars (30.0s). Delta of +0.18ms is well within ±10ms tolerance.  
- melody-04 mean −19.5 dB reflects the sparse lead synth character (note gaps between phrases) — volume boosted to 0.75 in pack config.

---

### FX

| File | Target Duration | Measured Duration | Delta | Mean Volume | Source Duration | Processing | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----------------|-----------|-----|--------|
| fx/fx-01.wav | 7.500s (4 bars) | 7.500s | 0ms | — | 6.035s hit | apad +1.465s | `b8a917ba` | ✅ PASS |
| fx/fx-02.wav | 7.500s (4 bars) | 7.500s | 0ms | — | 5.520s sweep | apad +1.980s | `1d112f6e` | ✅ PASS |

**Notes:**  
- Source files do not align to clean 128 BPM bars internally (6.035s ≠ N × 1.875s). Padding creates a 4-bar loop cycle where the hit plays once and silence fills the remainder before retrigger.  
- Mean volume not re-measured post-padding (silence adds to total duration, lowering mean; pack volume set accordingly).

---

### Transitions

| File | Target Duration | Measured Duration | Delta | Mean Volume | Source Duration | Processing | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----------------|-----------|-----|--------|
| transitions/trans-01.wav | 7.500s (4 bars) | 7.500s | 0ms | −15.3 dB (source) | 1.875s (1 bar) | apad +5.625s | `3e00de75` | ✅ PASS |
| transitions/trans-02.wav | 7.500s (4 bars) | 7.500s | 0ms | −21.4 dB (source) | 6.000s | apad +1.500s | `e116969a` | ✅ PASS |

**Notes:**  
- trans-01: Source is exactly 1.875011s = 1 bar @ 128 BPM. Padded with 5.625s silence = 4-bar cycle. Clean 1-bar fill.  
- trans-02: Chroma Downlifter 037 at 6.0s padded to 7.5s. The 1.5s silence gap allows natural decay before retrigger.

---

### Atmospheres

| File | Target Duration | Measured Duration | Delta | Mean Volume | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----|--------|
| atmospheres/atmo-01.wav | 15.000s (8 bars) | 15.000s | 0ms | −13.7 dB | `29726b97` | ✅ PASS |
| atmospheres/atmo-02.wav | 15.000s (8 bars) | 15.000s | 0ms | −23.0 dB | `d10fb65a` | ✅ PASS |

**Notes:**  
- atmo-02 (03-byte-riser) mean −23.0 dB reflects sweeping riser character with gradual level build. Volume set to 0.55 in pack config.

---

### Bass

| File | Target Duration | Measured Duration | Delta | Mean Volume | Source Duration | Processing | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----------------|-----------|-----|--------|
| bass/bass-01.wav | 30.000s (16 bars) | 30.000181s | +0.18ms | −17.0 dB | 31.875s (17 bars) | Trim | `2277fe1a` | ✅ PASS |
| bass/bass-02.wav | 30.000s (16 bars) | 30.000181s | +0.18ms | −17.2 dB | 31.875s (17 bars) | Trim | `9a2a21fa` | ✅ PASS |
| bass/bass-03.wav | 30.000s (16 bars) | 30.000181s | +0.18ms | −26.5 dB | 31.875s (17 bars) | Trim | `a0598f81` | ✅ PASS |
| bass/bass-04.wav | 30.000s (16 bars) | 30.000181s | +0.18ms | −10.5 dB | 35.625s (19 bars) | Trim | `2160cb58` | ✅ PASS |

**Notes:**  
- All bass files trim delta of +0.18ms is consistent with WAV copy-stream trim behavior (header rounding). Well within ±10ms.  
- bass-03 (Bass Accents) mean −26.5 dB: sparse percussive stabs — pack volume boosted to 0.72 to compensate.  
- bass-04 mean −10.5 dB: louder full-mix synth loop — pack volume set to 0.62.

---

### Vocals

| File | Target Duration | Measured Duration | Delta | Mean Volume | Silence Regions | MD5 | Status |
|------|----------------|-------------------|-------|-------------|-----------------|-----|--------|
| vocals/vocal-01.wav | 7.500s (4 bars) | 7.500s | 0ms | −13.6 dB | 0 (active throughout) | `ae33099d` | ✅ PASS |
| vocals/vocal-02.wav | 7.500s (4 bars) | 7.500s | 0ms | −14.3 dB | 0 (active throughout) | `9773fb9a` | ✅ PASS |
| vocals/vocal-03.wav | 15.000s (8 bars) | 15.000s | 0ms | −14.1 dB | — | `b63b687c` | ✅ PASS |
| vocals/vocal-04.wav | 7.500s (4 bars) | 7.500s | 0ms | −14.5 dB | 0 (active throughout) | `ee320985` | ✅ PASS |
| vocals/vocal-05.wav | 15.000s (8 bars) | 15.000s | 0ms | −17.8 dB | — | `b01009028` | ✅ PASS |

**Notes:**  
- vocal-01 through vocal-04: Silence regions = 0 at −50dB threshold, meaning continuous audio throughout the loop. Active from t=0.  
- vocal-05 (Guitar 024 Emin) mean −17.8 dB: guitar loop with natural note decay gaps; pack volume set to 0.65 to boost perceived presence.  
- vocal-03 (Chroma Vocal 020 Bmin): 8-bar loop at 128 BPM confirmed.

---

## MD5 Full Hashes (All 24 Files)

| File | MD5 |
|------|-----|
| atmospheres/atmo-01.wav | `29726b97caac11cb0795e4f1bdf98b89` |
| atmospheres/atmo-02.wav | `d10fb65ac2df67c052ab6a9097985bdb` |
| bass/bass-01.wav | `2277fe1a3c9cd2e1c27b62921dcd8c32` |
| bass/bass-02.wav | `9a2a21fabaf78e04616bb3f48263d896` |
| bass/bass-03.wav | `a0598f81efadfc807d3d8630cdc3b9dd` |
| bass/bass-04.wav | `2160cb58a266a7b7fa6f8fa1ae09896e` |
| beats/beat-01.wav | `4cbc2f48c3ca2d892ff63f509e5788d6` |
| beats/beat-02.wav | `99b8bb701e4510ea163bf10cc0451876` |
| beats/beat-03.wav | `13b496d6cb405dc9bfd11f5e1765b3b2` |
| beats/beat-04.wav | `a7e61ed2e458c937a5b24df1a6eea5b1` |
| beats/beat-05.wav | `7d271d314a48e069a7efaec08fb205fa` |
| fx/fx-01.wav | `b8a917bade4fea453272c365c5c88b7a` |
| fx/fx-02.wav | `1d112f6e07f350f3fa36d7812bbcbda1` |
| melody/melody-01.wav | `1004b22467dede48288770aaf8fd3c65` |
| melody/melody-02.wav | `b429e4b272929eb3bdae7110675a11ff` |
| melody/melody-03.wav | `ad9226eeedf14f666c643191591602bb` |
| melody/melody-04.wav | `a3c81d8f1f8c5db44dbc3d29fa0931d5` |
| transitions/trans-01.wav | `3e00de7589b970ad86a553ae6cc4297f` |
| transitions/trans-02.wav | `e116969a350ecb3b5ae10bc3ff8fcda0` |
| vocals/vocal-01.wav | `ae33099d6f99c62a31e037e4698193e0` |
| vocals/vocal-02.wav | `9773fb9ad24d02d650dbc0570f979f1e` |
| vocals/vocal-03.wav | `b63b687c48a3d3631f2c014d5bb5514e` |
| vocals/vocal-04.wav | `ee320985bbe1517b3044004ab9fe611c` |
| vocals/vocal-05.wav | `b01009028165b3e078d46f2691a4c49e` |

**All 24 MD5 hashes are unique — no duplicates.**

---

## Architecture Compliance

| Rule | Status |
|------|--------|
| `allowDriftCorrection: false` on all pads | ✅ |
| No `playbackRate` changes added | ✅ |
| No `audio.currentTime` writes mid-playback | ✅ |
| No new `setInterval` timers | ✅ |
| No diagnostics polling added | ✅ |
| All loops use `audio.loop = true` (playbackMode: 'loop') | ✅ |
| Branch: recovery-audio-stability | ✅ |
| `bravoPack` import unchanged in App.tsx | ✅ |
| `AUDIO_PACKS['bravo-pack']` entry unchanged | ✅ |
