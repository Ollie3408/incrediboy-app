# Delta Pack — Melody Pad 3 Replacement Report

**Date:** 2026-05-25  
**Pad ID:** `deltaPack-melody-03`  
**Old Label:** Byte Lead Am  
**New Label:** Byte Pluck Am  
**Category:** melody

---

## Problem with Old Melody Pad 3

| Issue | Detail |
|-------|--------|
| **Leading silence** | 16.875s (9 bars) of complete silence at start of WAV — same root cause as bass-03 dropout |
| **Root cause** | Source stem `Stickz - Byte Synth Loop 003 - Lead Main.wav` was exported from a 19-bar arrangement where the melody entered at bar 10. The pack builder trimmed from the END (19→16 bars = 30s), preserving the 9-bar silence at the START |
| **User experience** | Pad activates, character appears, silence plays for 16.875s before first note, then melody briefly plays, then loops back to silence — perceived as broken/dead pad |
| **Content suitability** | Even without the silence, `Lead Main` is described as "Expressively varied" — too many note changes, high cognitive load, elevated listener fatigue risk, over-complex melody for a layered gameplay context |
| **Overlap** | Amin key with many fast melodic runs risked clashing with atmo-02 (Amin texture) and bass-03 (Amin bass) |

**Pre-fix file profile:**
- Duration: 30.000s (silent 0–16.875s, active 16.875–30.000s)
- Active content: 13.125s (7 bars only)
- Mean volume: −22.4 dBFS | Max: −6.0 dBFS
- MD5 (old): 3d9fc11e500ce7139e254c8271d2d894

---

## Candidate Search

All available lead/melody stems from the Stickz - Byte Sample Pack were evaluated:

| Candidate | Key | Leading Silence | Active Content | Mean Vol | Decision |
|-----------|-----|-----------------|---------------|----------|----------|
| Loop003 Lead Main *(old)* | Amin | 16.875s (9 bars) | 13.1s / 7 bars | −22.4 dBFS | REJECTED — silence + complex |
| **Loop003 Break Pluck** | **Amin** | **0.506s (<1 beat)** | **15.7s / 8.4 bars** | **−27.6 dBFS** | **✓ SELECTED** |
| Loop003 Lead Supersaw | Amin | 17.346s (9.3 bars) | 14.1s / 7.5 bars | −28.9 dBFS | Backup — needs large trim |
| Loop003 Chord Hit | Amin | 23.907s (12.8 bars) | 11.7s / 6.2 bars | −39.3 dBFS | REJECTED — too quiet, massive silence |
| Loop002 Lead Reverses | Gmin | 1.772s (0.9 bars) | 32.0s / 17 bars | −35.2 dBFS | REJECTED — too quiet, Gmin overlaps melody-02 |
| Loop002 Synth Accent | Gmin | 15.000s (8 bars) | 18.75s / 10 bars | −47.2 dBFS | REJECTED — very quiet, silence padding |
| Loop004 Lead Response | A#min | 2.109s (1.1 bars) | 11.0s then 4s gap | −24.4 dBFS | REJECTED — 4-second internal silence gap |
| Loop004 Lead Reverses | A#min | 1.447s (0.8 bars) | 30.4s / 16 bars | −36.2 dBFS | REJECTED — too quiet |

---

## Selected Replacement: Break Pluck (Loop003 Amin)

**Source file:** `Stickz - Byte Synth Loop 003 - Break Pluck.wav`  
**Source path:** `Stickz - Byte/Byte Synth Loops/STEMS/Stickz - Byte Synth Loop 003 - 128BPM Amin/`

### Why Break Pluck wins

1. **Cleanest start** — only 0.506s of natural pickup silence (less than 1 beat), versus 16.875s for Lead Main
2. **Full 8+ bars of content** — 15.7s active content with no internal gaps
3. **Amin key** — preserves the Amin harmonic slot, perfectly paired with bass-03 and atmo-02
4. **Completely distinct character** — plucky, rhythmic articulation is entirely different from all other melody pads (01 = sustained lead/C#min, 02 = sustained lead/Gmin, 04 = call lead/A#min)
5. **Low fatigue** — staccato pluck texture is less cognitively tiring than a complex, expressively varied lead line
6. **Gameplay feel** — rhythmic pluck melodies are a staple of Incredibox-style games; addictive, bouncy, and mutable
7. **Harmonic simplicity** — pluck texture sits above bass without clashing, doesn't occupy the complex mid-frequency space of a sustained lead

### Extraction

- Start: `0.000s` (natural timing preserved — first pluck hit at ~0.51s = beat 2 of bar 1)
- Duration: `15.000s` (exactly 8 bars at 128 BPM)
- Fade-in: 5ms (onset smoothing)
- Fade-out: 10ms (loop-boundary click prevention)

```
ffmpeg -y -i [source] -t 15.000 -ar 44100 -ac 2 -sample_fmt s16 raw.wav
ffmpeg -y -i raw.wav -af "afade=t=in:st=0:d=0.005,afade=t=out:st=14.99:d=0.010" melody-03.wav
```

---

## Post-Replacement Audio Analysis

| Property | Value |
|----------|-------|
| Duration | **15.000s** (8 bars @ 128 BPM) |
| Leading silence | 0.506s (under 1 beat — natural pickup) |
| Active content | 0.5s – 15.0s (continuous pluck pattern) |
| Mean volume | −27.6 dBFS |
| Max volume | −9.3 dBFS |
| Loop boundary (first 100ms) | Audible content |
| Loop boundary (last 100ms) | Fade-out applied |
| MD5 (new) | 346697d07c2e4a81e2619a8eb911403d |
| Size | 2,646,078 bytes |

---

## Metadata Changes

In `src/generated/audioPacks/deltaPack.ts` (`deltaPack-melody-03`):

| Field | Before | After |
|-------|--------|-------|
| `label` | `'Byte Lead Am'` | `'Byte Pluck Am'` |
| `sourceFile` | `'Stickz - Byte Synth Loop 003 - Lead Main.wav'` | `'Stickz - Byte Synth Loop 003 - Break Pluck.wav'` |
| `bars` | `16` | `8` |
| `volume` | `0.71` | `0.78` (compensates for −9.3 dBFS max vs typical −6.0) |
| `energy` | `0.70` | `0.62` (pluck is lower sustained energy) |
| `transientDensity` | `0.50` | `0.65` (pluck has higher transient density) |
| `lowEndWeight` | `0.25` | `0.18` (pluck sits higher in the frequency range) |
| `mixabilityScore` | `82` | `86` (better mix compatibility — simpler, lower fatigue) |
| `notes` | "Expressively varied…" | Updated to explain replacement and pluck character |

---

## Ranking Summary

| Rank | Candidate | Key | Start | Content | Verdict |
|------|-----------|-----|-------|---------|---------|
| 1 | **Break Pluck** | Amin | 0.506s | 15.7s | ✓ SELECTED |
| 2 | Lead Supersaw | Amin | 17.35s | 14.1s | Backup (needs large trim) |
| 3 | Lead Response | A#min | 2.1s | 11s+gap | 4s internal gap — rejected |
| 4 | Lead Reverses (002) | Gmin | 1.8s | 32s | Too quiet −35 dBFS |
| 5 | Lead Reverses (004) | A#min | 1.4s | 30s | Too quiet −36 dBFS |

---

## Validation

| Test | Result |
|------|--------|
| melody-03 starts with pluck content (no 16s silence) | ✓ PASS |
| Duration = 15.000s (8 bars @ 128 BPM) | ✓ PASS |
| Clean loop boundary (no click) | ✓ PASS (fade applied) |
| Max volume −9.3 dBFS (no clipping) | ✓ PASS |
| MD5 unique (not duplicate of melody-01/02/04) | ✓ PASS |
| Amin key — compatible with bass-03, atmo-02 | ✓ PASS |
| npm run build | ✓ PASS (0 TypeScript errors) |

---

## Notes on Old File

Original `melody-03.wav` backed up to `/tmp/melody-03-backup-original.wav` (MD5: 3d9fc11e500ce7139e254c8271d2d894). Not committed to repo.
