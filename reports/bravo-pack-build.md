# Bravo Pack Build Report

**Generated:** 2026-05-29  
**BPM Spine:** 128  
**Total Pads:** 24  
**Build Status:** ✅ PASS (npm run build — 0 TypeScript errors)

---

## Pack Summary

Bravo Pack is guitar-forward with synth bass textures and a fresh 5-key vocal roster. All 24 files are MD5-unique, all loop pads confirm exact 128 BPM bar durations (within ±10ms), and `allowDriftCorrection: false` on every pad.

**Architecture changes vs legacy bravo-pack:**
- BPM spine upgraded from 120 → 128
- All `allowDriftCorrection` set to `false` (was `true` on several pads)
- All `one-shot` playback modes replaced with `loop` + silence-padded files
- Pad count: 24 (was 22 pads in legacy version)
- 5-beat layout (was 4-beat legacy layout)

---

## Pad-by-Pad Build Record

### BEATS (Indices 0–4)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----------|
| 0 | bravoPack-beat-01 | beats/beat-01.wav | 03-byte-full.wav | 128 | 16 | 30.000s | 0.87 | Direct copy |
| 1 | bravoPack-beat-02 | beats/beat-02.wav | 01-byte-groove.wav | 128 | 8 | 15.000s | 0.86 | Direct copy |
| 2 | bravoPack-beat-03 | beats/beat-03.wav | 02-byte-hat.wav | 128 | 4 | 7.500s | 0.85 | Direct copy |
| 3 | bravoPack-beat-04 | beats/beat-04.wav | 04-byte-top-nokick.wav | 128 | 8 | 15.000s | 0.84 | Direct copy |
| 4 | bravoPack-beat-05 | beats/beat-05.wav | Stickz - Byte Drum Loop 005 - 128BPM.wav | 128 | 16 | 30.000s | 0.84 | Direct copy |

**Beat selection reasoning:**  
- `beat-01` (03-byte-full): Full drum groove with kick+snare+hat — primary groove anchor. 16-bar phrase confirms 128 BPM.  
- `beat-02` (01-byte-groove): Lighter 8-bar groove variant, layers naturally over beat-01.  
- `beat-03` (02-byte-hat): Sparse hi-hat 4-bar loop, rhythmic texture without kick competition.  
- `beat-04` (04-byte-top-nokick): Top loop without kick, 8 bars — adds density to percussion section.  
- `beat-05` (Drum Loop 005): Second full-mix Byte drum pattern, 16 bars — distinct from Loop 001 (Delta) and 002 (Alpha).

---

### MELODY (Indices 5–7, 12)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Key | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----|-----------|
| 5 | bravoPack-melody-01 | melody/melody-01.wav | Stickz - Hearts Guitar Loop 023 - 128BPM Emin.wav | 128 | 8 | 15.000s | Emin | 0.70 | Direct copy |
| 6 | bravoPack-melody-02 | melody/melody-02.wav | Stickz - Hearts Guitar Loop 026 - 128BPM Bmin.wav | 128 | 8 | 15.000s | Bmin | 0.65 | Direct copy |
| 7 | bravoPack-melody-03 | melody/melody-03.wav | Stickz - Hearts Legacy Loop 003 - 128BPM Gmaj.wav | 128 | 4 | 7.500s | Gmaj | 0.70 | Direct copy |
| 12 | bravoPack-melody-04 | melody/melody-04.wav | 02-byte-lead-gmin.wav | 128 | 16 | 30.000s | Gmin | 0.75 | Trim 18→16 bars (-t 30.000) |

**Melody selection reasoning:**  
- Guitar 023 (Emin) and 026 (Bmin) confirmed distinct MD5s despite same duration. Guitar-forward character distinguishes Bravo from Alpha/Delta's synth-dominant melodies.  
- Hearts Legacy 003 (Gmaj) provides a 4-bar major-key contrast to the two minor-key guitar loops.  
- 02-byte-lead-gmin (Gmin, 18→16 bars trimmed) adds a synth texture that complements the guitar palette without duplicating it.  
- Off-BPM guitar loops (90/100/140/155 BPM) skipped entirely.

---

### FX (Indices 8–9)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----------|
| 8 | bravoPack-fx-01 | fx/fx-01.wav | 01-byte-impact.wav | 128 | 4 | 7.500s | 0.55 | apad to 7.5s (6.035s + 1.465s silence) |
| 9 | bravoPack-fx-02 | fx/fx-02.wav | 02-byte-uplift.wav | 128 | 4 | 7.500s | 0.52 | apad to 7.5s (5.520s + 1.980s silence) |

**FX selection reasoning:**  
- Pre-processed Byte impact and uplift shots confirmed as 128 BPM ecosystem files by directory context. Neither aligns to a clean 128 BPM bar internally, so padded to exactly 4 bars (7.5s) for the loop cycle. The silence padding ensures the hit plays once per 4-bar cycle with natural decay.

---

### TRANSITIONS (Indices 10–11)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----------|
| 10 | bravoPack-trans-01 | transitions/trans-01.wav | 01-byte-fill-a.wav | 128 | 4 | 7.500s | 0.50 | apad to 7.5s (1.875s fill + 5.625s silence) |
| 11 | bravoPack-trans-02 | transitions/trans-02.wav | Stickz - Chroma Downlifter 037.wav | 128 | 4 | 7.500s | 0.52 | apad to 7.5s (6.0s + 1.5s silence) |

**Transition selection reasoning:**  
- 01-byte-fill-a is exactly 1 bar (1.875011s = 1 × 1.875s @ 128 BPM) — a clean 1-bar drum fill padded to a 4-bar cycle.  
- Chroma Downlifter 037 (6.0s) is a sweeping downward transition sound; padded to 4 bars gives a natural decay gap before retrigger.  
- Both confirmed distinct MD5.

---

### ATMOSPHERE (Indices 13, 18)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----------|
| 13 | bravoPack-atmo-01 | atmospheres/atmo-01.wav | Stickz - Chroma Long Fill 019 - 128BPM.wav | 128 | 8 | 15.000s | 0.50 | Direct copy |
| 18 | bravoPack-atmo-02 | atmospheres/atmo-02.wav | 03-byte-riser.wav | 128 | 8 | 15.000s | 0.55 | Direct copy |

**Atmosphere selection reasoning:**  
- Chroma Long Fill 019 (8 bars, 128 BPM) provides rhythmic textural atmosphere.  
- 03-byte-riser (8 bars, confirmed 128 BPM from duration) provides a slow-build rising sweep — low transient density, atmospheric energy.

---

### BASS (Indices 14–17)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Key | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----|-----------|
| 14 | bravoPack-bass-01 | bass/bass-01.wav | 01-byte-bass-csharp.wav | 128 | 16 | 30.000s | C# | 0.68 | Trim 17→16 bars (-t 30.000) |
| 15 | bravoPack-bass-02 | bass/bass-02.wav | 04-byte-bass-asharp.wav | 128 | 16 | 30.000s | A# | 0.68 | Trim 17→16 bars (-t 30.000) |
| 16 | bravoPack-bass-03 | bass/bass-03.wav | Stickz - Byte Synth Loop 001 - Bass Accents.wav | 128 | 16 | 30.000s | — | 0.72 | Trim 17→16 bars (-t 30.000) |
| 17 | bravoPack-bass-04 | bass/bass-04.wav | Stickz - Byte Synth Loop 003 - 128BPM Amin.wav | 128 | 16 | 30.000s | Amin | 0.62 | Trim 19→16 bars (-t 30.000) |

**Bass selection reasoning:**  
- 01-byte-bass-csharp and 04-byte-bass-asharp: Pre-processed Byte bass lines. Duration 31.875s = 17 bars @ 128 BPM — trimmed to 16 bars. Key inferred from filenames.  
- Bass Accents (Synth Loop 001): Sparse rhythmic stabs — mean -26.5 dB due to gaps. Volume boosted to 0.72 to compensate. Distinct from Delta's Bass Main Layer.  
- Synth Loop 003 Amin: Full-mix synth in Amin, 19 bars trimmed to 16. Richer, more layered bass texture. Not used by Alpha or Delta.

---

### VOCALS (Indices 19–23)

| Idx | Pad ID | File | Source | BPM | Bars | Duration | Key | Vol | Processing |
|-----|--------|------|--------|-----|------|----------|-----|-----|-----------|
| 19 | bravoPack-vocal-01 | vocals/vocal-01.wav | Stickz VCT - Legacy Vocal Chop Loop 04 - 128BPM Dmaj.wav | 128 | 4 | 7.500s | Dmaj | 0.58 | Direct copy |
| 20 | bravoPack-vocal-02 | vocals/vocal-02.wav | Stickz VCT - Legacy Vocal Chop Loop 11 - 128BPM F#maj.wav | 128 | 4 | 7.500s | F#maj | 0.58 | Direct copy |
| 21 | bravoPack-vocal-03 | vocals/vocal-03.wav | Stickz - Chroma Vocal Chop Loop 020 - 128BPM Bmin.wav | 128 | 8 | 15.000s | Bmin | 0.60 | Direct copy |
| 22 | bravoPack-vocal-04 | vocals/vocal-04.wav | Stickz VCT - Vocoded Loop Layer 06 - 128BPM C#min.wav | 128 | 4 | 7.500s | C#min | 0.58 | Direct copy |
| 23 | bravoPack-vocal-05 | vocals/vocal-05.wav | Stickz - Hearts Guitar Loop 024 - 128BPM Emin.wav | 128 | 8 | 15.000s | Emin | 0.65 | Direct copy |

**Vocal selection reasoning:**  
- VCT Legacy 04 (Dmaj), VCT Legacy 11 (F#maj): Both fresh 128 BPM keys not used in Alpha or Delta.  
- Chroma Vocal 020 (Bmin): 8-bar phrase, distinct Chroma library character.  
- Vocoded Layer 06 (C#min): Processed vocal texture — synth-vocal timbre adds palette variety.  
- Hearts Guitar 024 (Emin): Used as melodic voice layer in voice-4 slot. Confirmed distinct MD5 from Guitar 023 (same key, different phrase). No 150 BPM VCT files trimmed to exact 128 BPM bars (150/128 ratio is 75:64, non-integer) — guitar loop used instead.

---

## Audio Files Confirmed No Overlaps

| Category | Bravo | Alpha (banned) | Delta (banned) |
|----------|-------|----------------|----------------|
| Drum Loop | 005 | 002 | 001 |
| Top Loop | — (uses pre-proc) | 002 | 001 |
| Hat/Hi-Hat | pre-proc (02-byte-hat) | 003, 004, 006, 007 | 001, 002, 005 |
| Bass | pre-proc C#/A#, Loop 001 Accents, Loop 003 Amin | Loop 001 Resampled/C#/Bass | Loop 001–004 Main Layers |
| VCT Vocal | Loop 04, 11; Chroma 020; Vocoded 06 | Loop 01, 06, 08, 12, 15, 19 | Loop 09, 13, 16, 19; VCT 07 |

No cross-pack file reuse detected.
