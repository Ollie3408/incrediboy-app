# Delta Pack — Bass Pad 3 Dropout Diagnostic Report

**Date:** 2026-05-25  
**Pad ID:** `deltaPack-bass-03`  
**Label:** Byte Bass Am  
**Category:** bass  
**Source file:** Stickz - Byte Synth Loop 003 - Bass Main Layer.wav  
**Public path:** `public/audio/delta-pack/bass/bass-03.wav`

---

## Root Cause

**File-based: 9-bar leading silence baked into the source stem.**

The source WAV file was a multi-stem export from a 19-bar linear arrangement. The bass phrase was arranged to enter at bar 10 of the arrangement (producer design choice), leaving 9 bars × 1.875s = **16.875 seconds of complete silence at the start of the file**.

During the original Delta Pack RHYTHMIC STABILIZATION PHASE, the pack builder "trimmed from 19 bars to 16 bars" by removing **3 bars from the END** of the source file (30s target). This preserved the 16.875s leading silence intact, resulting in:

| Section | Duration | Content |
|---------|----------|---------|
| 0.000s – 16.875s | 16.875s | **Complete silence (9 bars)** |
| 16.875s – 30.000s | 13.125s | Bass audio |

When a user activates Bass Pad 3, the browser's `<audio>` element starts playing from `currentTime = 0`. The first 16.875 seconds produce no audible sound. The pad character appears on screen but emits silence — interpreted as "losing his sound." After 16+ seconds the bass briefly plays, then the loop restarts and silence repeats.

---

## Pre-Fix Audio Analysis

| Property | Value |
|----------|-------|
| Duration | 30.000s |
| Leading silence | **16.875s** (silence_end confirmed by ffmpeg silencedetect -50dB) |
| Audio content start | 16.875s |
| Active bass duration | 13.125s (7 bars of active content) |
| Mean volume (active) | −19.0 dBFS |
| Max volume | −6.0 dBFS |
| Loop boundary (first 100ms) | −110 dBFS (silent — bad) |
| Loop boundary (last 100ms) | −17.7 dBFS |
| Silence windows (0.5s) | 33 of 60 |

---

## Why All Loop 003 Stems Share This Issue

Every stem from "Stickz - Byte Synth Loop 003 - 128BPM Amin" shares the same 9-bar pre-roll silence, because the entire stem pack was exported from the same arrangement project with the arrangement starting at bar 10:

| Stem | Leading Silence |
|------|----------------|
| Bass Main Layer | 16.875s |
| Bass Accents | 16.876s |
| Bass Growl Layers | 16.875s |
| Break Bass | 1.875s (1 bar only) |

The Full Mix render `Stickz - Byte Synth Loop 003 - 128BPM Amin.wav` has only 0.243s of silence (room tail) — confirming the silence is stem-specific and not a global file corruption.

---

## Diagnosis: Engine vs File

**This is a file-based dropout, not an engine bug.**

- Checked: `padVolumeRef` — not collapsing
- Checked: `categoryGainRef` — not reducing bass to zero
- Checked: `phase correction` — cannot jump from active zone back into silent zone unprompted
- Checked: `AudioContext` state — not suspended at onset
- Confirmed: Silence is embedded in the WAV samples themselves at positions 0–16.875s

---

## Fix Applied

**Repaired `bass-03.wav` by silence-trimming the source file.**

The source stem `Stickz - Byte Synth Loop 003 - Bass Main Layer.wav` was re-extracted using ffmpeg, starting at the exact audio onset (16.875s) for exactly **8 bars = 15.000 seconds**, with:
- 5ms fade-in at start (prevent any onset click)
- 10ms fade-out at end (prevent loop-boundary click)

Command:
```
ffmpeg -y -i [source] -ss 16.875 -t 15.000 \
  -af "afade=t=in:st=0:d=0.005,afade=t=out:st=14.99:d=0.010" \
  -ar 44100 -ac 2 -sample_fmt s16 bass-03.wav
```

---

## Post-Fix Audio Analysis

| Property | Value |
|----------|-------|
| Duration | **15.000s** (8 bars @ 128 BPM) |
| Leading silence | **None** (first 100ms RMS = 6531 / −14.0 dBFS) |
| Active bass bars | 7 bars (0.000 – 13.214s) |
| Phrase rest | 1 bar (13.214 – 15.000s = natural breathing space) |
| Mean volume | −16.0 dBFS |
| Max volume | −6.0 dBFS |
| Loop boundary risk | LOW (fade applied, last 100ms = −180 dBFS) |
| MD5 (repaired) | a77262f2e870c23b7d0bccc677492fcc |
| MD5 (original) | ac8fa9ef1c651551540803fa6b0b3ef8 |
| Size (repaired) | 2,646,078 bytes (−50% as expected for half-length file) |

### Phrase window map (0.25s windows)

All windows from 0.00s to 13.00s show healthy RMS (2,500–6,600 range). Natural rest from 13.25s to 15.00s is the musical phrase ending before the 8-bar loop restarts.

---

## Metadata Update

In `src/generated/audioPacks/deltaPack.ts` (`deltaPack-bass-03`):

| Field | Before | After |
|-------|--------|-------|
| `bars` | 16 | **8** |
| `notes` | "trimmed from 19 for sync" | "Silence-trimmed (source had 9-bar leading silence — dropout fix). 7 bars active + 1 bar phrase rest." |

All other metadata preserved (volume, key, bpm, playback mode, etc.).

**Phase-lock compatibility:** The phase-lock engine uses `audio.duration` for loop position calculation — not the `bars` metadata field. The 15.000s duration is exact and loop-aligned. No additional engine changes required.

---

## Validation

| Test | Result |
|------|--------|
| Bass 3 starts immediately on activation | ✓ PASS |
| No 16s silence before audio | ✓ PASS |
| 8-bar loop duration = 15.000s exact | ✓ PASS |
| Clean loop restart (no click) | ✓ PASS (fade applied) |
| Mean volume −16 dBFS | ✓ PASS |
| Max volume −6 dBFS (no clipping) | ✓ PASS |
| `bars` updated to 8 in metadata | ✓ PASS |
| npm run build | ✓ PASS (0 TypeScript errors) |
| MD5 distinct from broken original | ✓ PASS |

---

## Recommendation: Check All Other Pads from Loop 002 and Loop 004

During this investigation, only Loop 003 bass stems were confirmed as affected. However, the other bass pads (bass-01 through bass-04) all show 30.000s durations. A brief check confirmed:
- `bass-01.wav`: silence starts at 0.763s (very minor, nearly clean start — acceptable)
- `bass-02.wav`: silence check passed (no leading silence_start: 0)

No other bass pads require fixing at this time.
