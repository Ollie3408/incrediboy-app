# Delta Pack — One-Shot Cycle Behaviour Report

**Generated:** 2026-05-23  
**Phase:** Beat-Grid Lock — One-Shot Retrigger Implementation

---

## Problem Statement

All six FX and transition pads were previously configured as `playbackMode: 'one-shot'`. This caused:
- Sound plays once when character is dragged
- Character freezes as "dead" (animation stops, pad appears inactive)
- No automatic retriggering
- User must manually drag the character off and back on to replay

In Incredibox-style gameplay, performers stay active for the entire session. One-shots in that model are **cyclically retriggered** — they fire, rest, and fire again automatically on each loop boundary.

---

## Solution: Silence-Padded Loop Cycles

Each one-shot audio file was padded with silence to the nearest standard grid length. The `playbackMode` was changed to `'loop'` and `playbackQuantization` updated to `'bar'`. The character now stays active continuously, with the sound firing naturally at the start of each loop cycle.

### Implementation Rule

```
cycle_length = nearest grid multiple >= audio_duration
padded_file = audio_content + silence_pad(cycle_length - audio_duration)
playbackMode = 'loop'
playbackQuantization = 'bar'
bars = cycle_length / 1.875
```

All silence padding was added AFTER the audio content. A short fade-out (30–60 ms) was applied at the end of audio content to prevent click artefacts at the loop restart point.

---

## One-Shot Conversion Table

| Pad ID | Label | Original mode | Audio duration | Grid target | Cycle length | Rest duration | New mode | bars | Retrigger period |
|---|---|---|---|---|---|---|---|---|---|
| fx-01 | Byte Impact | one-shot | 6.035 s | 8 bars | 15.000 s | 8.965 s | **loop** | 8 | Every 15 s |
| fx-02 | Byte Uplift | one-shot | 5.521 s | 8 bars | 15.000 s | 9.479 s | **loop** | 8 | Every 15 s |
| fx-03 | Byte Riser | one-shot | 15.000 s | 16 bars | 30.000 s | 15.000 s | **loop** | 16 | Every 30 s |
| trans-01 | Byte Fill A | one-shot | 1.875 s | 4 bars | 7.500 s | 5.625 s | **loop** | 4 | Every 7.5 s |
| trans-02 | Byte Fill B | one-shot | 1.875 s | 4 bars | 7.500 s | 5.625 s | **loop** | 4 | Every 7.5 s |
| trans-03 | Byte Drop | one-shot | 9.214 s | 8 bars | 15.000 s | 5.786 s | **loop** | 8 | Every 15 s |

---

## Gameplay Behaviour After Conversion

### fx-01 (Byte Impact) — 8-bar cycle
```
t= 0.000 s  → Impact fires (6 s cinematic hit)
t= 6.035 s  → Silence begins (character stays active)
t=15.000 s  → Loop restarts — Impact fires again
t=30.000 s  → Loop restarts — Impact fires again
...
```
Character remains animated throughout. Impact creates a rhythmic punctuation every 15 s (2 full cycles per 30 s).

### fx-02 (Byte Uplift) — 8-bar cycle
```
t= 0.000 s  → Sweep begins (5.5 s rise)
t= 5.521 s  → Silence begins
t=15.000 s  → Sweep begins again
```
Natural energy-building rhythm every 15 s — creates escalating tension during long mixing sessions.

### fx-03 (Byte Riser) — 16-bar cycle
```
t= 0.000 s  → Riser begins (15 s BPM-synced build)
t=15.000 s  → Silence begins (15 s rest)
t=30.000 s  → Riser begins again
```
One full 16-bar dramatic build every 30 s. Aligns with the master loop boundary — the riser always ends at bar 8 and the silence gives a breath before re-firing.

### trans-01 (Byte Fill A) — 4-bar cycle
```
t= 0.000 s  → 1-bar drum fill
t= 1.875 s  → Silence (5.625 s, 3 bars)
t= 7.500 s  → Fill fires again
```
Drum fill marks every 4-bar boundary — fires 4 times per 30 s master cycle. Creates strong section markers during playback.

### trans-02 (Byte Fill B) — 4-bar cycle
```
t= 0.000 s  → 1-bar drum fill (variant pattern)
t= 1.875 s  → Silence (5.625 s)
t= 7.500 s  → Fill fires again
```
Complementary to trans-01. Can be used simultaneously for alternating fill patterns, or as a replacement.

### trans-03 (Byte Drop) — 8-bar cycle
```
t= 0.000 s  → Downlifter begins (9.2 s sweep)
t= 9.214 s  → Silence begins (5.786 s)
t=15.000 s  → Downlifter fires again
```
Drop signal repeats every 15 s. Creates a periodic tension-release cycle — the downlifter signals a section end, the silence gives recovery space, then it fires again on the next beat.

---

## Grid Alignment of Cycle Lengths

All six converted pads now have cycle lengths that are clean multiples of the master 30 s LCM:

| Cycle | LCM with 30 s | Re-aligns every |
|---|---|---|
| 7.5 s (4 bars) | 7.5 s | Every 4th bar |
| 15 s (8 bars) | 15 s | Every 8th bar |
| 30 s (16 bars) | 30 s | Every 16th bar |

All one-shot cycles fire at predictable grid positions relative to the beat pads. No drift possible.

---

## Metadata Changes in deltaPack.ts

| Pad | Old playbackMode | New playbackMode | Old bars | New bars | Old quantization | New quantization |
|---|---|---|---|---|---|---|
| fx-01 | one-shot | loop | null | 8 | immediate | bar |
| fx-02 | one-shot | loop | null | 8 | immediate | bar |
| fx-03 | one-shot | loop | 8 | 16 | immediate | bar |
| trans-01 | one-shot | loop | 1 | 4 | beat | bar |
| trans-02 | one-shot | loop | 1 | 4 | beat | bar |
| trans-03 | one-shot | loop | null | 8 | beat | bar |

`allowDriftCorrection: false` retained for all six pads.

---

## Expected Validation Results

After these changes, test each converted pad in the game:

| Test | Expected behaviour |
|---|---|
| Drag fx-01 character | Impact fires immediately; character stays active |
| Wait 15 s | Impact fires automatically again |
| Drag trans-01 character | Fill fires at next bar boundary; character stays active |
| Every 7.5 s | Fill fires automatically |
| Drag fx-03 character | 15 s riser builds; 15 s silence; riser fires again at 30 s |
| Drag trans-03 character | Downlifter fires; character stays active; retriggers at 15 s |
| All 24 pads active, 10 min | No dead characters; all retrigger correctly |

**Build status:** ✅ Clean — `npm run build` passed with no TypeScript errors.
