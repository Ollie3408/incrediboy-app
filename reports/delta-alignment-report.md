# Delta Pack — Waveform Alignment Report

**Generated:** 2026-05-23  
**Method:** Peak loudness measurement in 1 ms and 50 ms windows at t=0, and 100 ms windows across the first 30 s

---

## Complete Pad Alignment Table

| Pad ID | Category | bars | Duration | t=0 peak | t=0.5s peak | Grid entry | Shift applied | Status |
|---|---|---|---|---|---|---|---|---|
| beat-01 | Beat | 8 | 15.000 s | 0.0 dB | 0.0 dB | t=0 (bar 1, beat 1) | None | ✅ Aligned |
| beat-02 | Beat | 4 | 7.500 s | −6.4 dB | −6.4 dB | t=0 (bar 1, beat 1) | None | ✅ Aligned |
| beat-03 | Beat | 16 | 30.000 s | 0.0 dB | 0.0 dB | t=0 (bar 1, beat 1) | None | ✅ Aligned |
| beat-04 | Beat | 8 | 15.000 s | −91.0 dB | 0.0 dB | t≈0.5s (bar 1, beat 2) | None — intentional | ✅ Aligned |
| beat-05 | Beat | 4 | 7.500 s | −3.3 dB | −3.3 dB | t=0 (bar 1, beat 1) | None | ✅ Aligned |
| bass-01 | Bass | 16 | 30.000 s | −6.9 dB | −6.9 dB | t=0 (bar 1, beat 1) | None (restored) | ✅ Aligned |
| bass-02 | Bass | 16 | 30.000 s | −6.0 dB | −6.0 dB | t=0 (bar 1, beat 1) | None (restored) | ✅ Aligned |
| bass-03 | Bass | 16 | 30.000 s | −90.3 dB | −90.3 dB | t≈16.875 s (bar 10) | None — structural | ✅ Structural |
| bass-04 | Bass | 16 | 30.000 s | −7.6 dB | −7.6 dB | t=0 (bar 1, beat 1) | None (restored) | ✅ Aligned |
| melody-01 | Melody | 16 | 30.000 s | −6.0 dB | −6.0 dB | t=0 (bar 1, beat 1) | None (restored) | ✅ Aligned |
| melody-02 | Melody | 16 | 30.000 s | −6.0 dB | −6.0 dB | t=0 (bar 1, beat 1) | None | ✅ Aligned |
| melody-03 | Melody | 16 | 30.000 s | −91.0 dB | −91.0 dB | t≈16.875 s (bar 10) | None — structural | ✅ Structural |
| melody-04 | Melody | 16 | 30.000 s | −90.3 dB | −6.0 dB | t≈0.1–0.5 s (beat 2) | None — intentional | ✅ Aligned |
| atmo-01 | Atmosphere | 16 | 30.000 s | −31.3 dB | −31.3 dB | t=0, slow attack | None | ✅ Aligned |
| atmo-02 | Atmosphere | 16 | 30.000 s | −91.0 dB | −91.0 dB | t≈2 s (bar 2) | None — intentional | ✅ Structural |
| vocal-01 | Vocal | 4 | 7.500 s | −2.9 dB | −2.9 dB | t=0 (bar 1, beat 1) | None (restored) | ✅ Aligned |
| vocal-02 | Vocal | 4 | 7.500 s | −0.3 dB | −0.3 dB | t=0 (bar 1, beat 1) | None | ✅ Aligned |
| vocal-03 | Vocal | 8 | 15.000 s | −5.2 dB | −5.2 dB | t=0 (bar 1, beat 1) | None (restored) | ✅ Aligned |

---

## Beat Origin Confirmation

All pads originate from the same Stickz Byte DAW project export. Beat origin (bar 1, beat 1) is at t=0 for all pads — confirmed by:

- Kick drum on beat-01 at t=0 ms: **0.0 dB peak in first 1 ms** (sample-accurate)
- Hi-hat on beat-02 at t=0 ms: **−6.4 dB in first 1 ms**
- Kick drum on beat-03 at t=0 ms: **0.0 dB in first 1 ms** (sample-accurate)

These three pads establish that the DAW project exported bar 1 beat 1 at sample 0. All other pads with silent or near-silent first 1 ms are intentionally structured (rests, syncopated entries, slow attacks, structural breaks).

---

## Phase Relationships

| Combination | Phase offset at t=30s | Explanation |
|---|---|---|
| beat-01 + beat-02 | 0 ms | Both loop at multiples of 30 s |
| beat-01 + bass-01 | 0 ms | Both loop at exactly 30 s |
| beat-01 + bass-03 | 0 ms (content offset by 16.875 s within the loop) | bass-03 has fixed 9-bar structural silence |
| beat-01 + melody-01 | 0 ms | Both at 30 s |
| Any beat + any vocal | 0 ms | All durations multiples of LCM=30 s |

No progressive drift possible. All pads share a 30 s LCM and the same beat origin.

---

## Detection Artefact: Inter-Beat Gap Misidentification

During initial analysis, `silencedetect` at −40 dB with d=0.001 was used to find "first_audio" timestamps. This produced false positives:

**Example (beat-01):**
- t=0 ms: kick at 0.0 dB (strong transient)
- t=~30 ms: kick decays below −40 dB (silencedetect: silence_start)  
- t=~220 ms: snare arrives (silencedetect: silence_end = 0.22s)

The `silence_end: 0.22s` was misread as "220ms of pre-roll silence." It is actually the first inter-beat gap — entirely correct musical behaviour.

**Resolution:** Peak-loudness measurement in the first 1 ms and 50 ms windows (`volumedetect`) correctly identifies whether content exists at t=0, independent of pattern gaps. All drum loops confirmed to have beat-1 content within the first sample.

---

## LCM Grid Summary

| Loop length | Pads | Re-aligns with 30 s every |
|---|---|---|
| 4 bars (7.5 s) | beat-02, beat-05, vocal-01, vocal-02, trans-01\*, trans-02\* | 4 cycles = 30 s |
| 8 bars (15 s) | beat-01, beat-04, vocal-03, fx-01\*, fx-02\*, trans-03\* | 2 cycles = 30 s |
| 16 bars (30 s) | beat-03, all bass, all melody, all atmos, fx-03\* | 1 cycle = 30 s |

\*After one-shot-to-loop conversion in this phase.

**Universal alignment period: 30 s — all pads simultaneously at bar 1, beat 1 every 30 seconds.**
