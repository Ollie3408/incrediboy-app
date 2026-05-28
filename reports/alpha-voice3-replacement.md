# Alpha Pack — Voice Pad 3 Replacement Report

**Date**: 2026-05-28  
**Branch**: `recovery-audio-stability`  
**Scope**: Alpha Pack Voice Pad 3 (Index 21 / game pad `voice-2`) only

---

## Old Voice Pad 3

| Field | Value |
|-------|-------|
| Pad ID | `alphaPack-vocal-03` |
| Label | VCT Legacy Fm |
| Source file | `Stickz VCT - Legacy Vocal Chop Loop 08 - 128BPM Fmin.wav` |
| Public path | `public/audio/alpha-pack/vocals/vocal-03.wav` |
| BPM | 128 |
| Bars | 4 |
| Duration | 7.500 s |
| Key | Fmin |
| MD5 | `e7236ea6e270f9acec851996d8a80018` |
| Reason for replacement | Key (Fmin) was a sibling of Delta Pack Loop 09 (also Fmin) — harmonic duplication across packs, and a weaker fit for Alpha's Amin melodic spine |

---

## Candidate Analysis

All candidates: native 128 BPM, 4-bar loops (7.500 s), from `~/Documents/sticks/`.  
Already-used keys excluded: C#min (V1), Emin (V2), Fmin (old V3), Gmin (V4), Bmin (V5).

| Loop | Key | Duration | Mean Vol | Silence Regions | MD5 | Rank |
|------|-----|----------|----------|-----------------|-----|------|
| Loop 15 | **Amin** | 7.500s ✓ | -11.7 dB | **0** | `abf050...` | **#1 — SELECTED** |
| Loop 10 | Fmaj | 7.500s ✓ | -12.3 dB | 0 | `7babc8...` | #2 |
| Loop 02 | C#min | 7.500s ✓ | -11.9 dB | 0 | `3a5331...` | #3 |
| Loop 05 | D#min | 7.500s ✓ | -9.9 dB | 2 | `7dbc55...` | #4 |
| Loop 17 | Amaj | 7.500s ✓ | -14.5 dB | 0 | `a3f844...` | #5 |
| Loop 14 | Gmaj | 7.500s ✓ | -11.7 dB | 6 | `2b6ef8...` | #6 |
| Loop 18 | A#maj | 7.500s ✓ | -13.8 dB | 6 | `d2dabac...` | #7 |

### Selection reasoning

**Loop 15 (Amin) chosen** for the following reasons:
1. **Harmonic compatibility**: Amin is the core key of Alpha Pack — both atmospheres (atmo-01, atmo-02) are Amin, the primary melody (melody-01, Supersaw Amin) is Amin, and bass-03 (Break Bass) is also Amin. Loop 15 immediately feels at home in the mix.
2. **Zero silence**: No silence regions detected at -50dB threshold across the full 7.5 s — continuous chop energy throughout.
3. **Healthy level**: Mean -11.7 dB — consistent with other Alpha vocals (−11.5 to −13 dB range).
4. **Exact bar alignment**: 7.500 s = exactly 4 bars at 128 BPM — no trimming required.
5. **Unique MD5**: Confirmed not used anywhere else in the deployed audio library.
6. **Distinct key**: Fresh harmonic identity vs the old Fmin — breaks the Delta/Alpha key overlap.

**Loop 10 (Fmaj) rejected** despite strong metrics: F major introduces a major key that may feel slightly dissonant against Alpha's minor-dominated texture.  
**Loop 02 (C#min) rejected**: key clash with Voice 1 (also C#min).  
**Loop 05 (D#min) rejected**: 2 silence regions (likely rhythmic gaps — acceptable but Loop 15 is gapless).  
**Loops 14, 18 rejected**: 6 silence regions each — too many dead sections.

---

## New Voice Pad 3

| Field | Value |
|-------|-------|
| Pad ID | `alphaPack-vocal-03` (unchanged) |
| Label | VCT Legacy Am |
| Source file | `Stickz VCT - Legacy Vocal Chop Loop 15 - 128BPM Amin.wav` |
| Public path | `public/audio/alpha-pack/vocals/vocal-03.wav` |
| BPM | 128 |
| Bars | 4 |
| Duration | 7.500 s |
| Key | Amin |
| MD5 (deployed) | `abf0508586e1e18a4682c0eae7617c8e` |
| Processing | None — source file copied directly, exact 7.500 s |
| Volume | 0.55 |
| mixabilityScore | 91 (up from 84) |

---

## Alpha Vocal Group — Post-Replacement

| Pad | Label | Key | Loop | Notes |
|-----|-------|-----|------|-------|
| Voice 1 | VCT Legacy C# | C#min | 01 | Unchanged |
| Voice 2 | VCT Legacy Em | Emin | 06 | Unchanged |
| **Voice 3** | **VCT Legacy Am** | **Amin** | **15** | **Replaced** |
| Voice 4 | VCT Legacy Gm | Gmin | 12 | Unchanged |
| Voice 5 | VCT Legacy Bm | Bmin | 19 | Unchanged |

Harmonic spread: C#min / Emin / **Amin** / Gmin / Bmin — all 5 keys distinct, strong coverage of Alpha's harmonic palette.

---

## Files Changed

| File | Change |
|------|--------|
| `public/audio/alpha-pack/vocals/vocal-03.wav` | Replaced with Loop 15 Amin |
| `src/generated/audioPacks/alphaPack.ts` | Index 21 metadata updated (label, sourceFile, key, notes, harmonicGroup, mixabilityScore) |
| `src/generated/audioPacks/alphaPack.ts` | Index comment updated |

---

## Validation

- Duration: 7.500 s ✓ (exact 4-bar grid alignment)
- MD5 unique: confirmed across full `public/audio/` tree ✓
- Zero silence regions across full file ✓
- `npm run build` → ✓ built in 5.29 s — zero TypeScript errors ✓
- No processing applied (copy only) ✓
- No changes to beats, bass, melody, FX, transitions, atmospheres ✓
- No changes to App.tsx, musicClock.ts, or any runtime system ✓
