# Loop Truth Audit — Beat Loops (Bravo / Alpha / Delta)

**Mode:** Audit only. No code changed, no files changed.
**Method:** `ffprobe` (exact stream sample counts + sample rate) and `ffmpeg silencedetect` (leading-silence / off-grid transient scan) on the actual shipped WAVs in `public/audio/*/beats/`.
**Question:** Is the remaining in-session drift caused by (A) transport architecture or (B) source file timing?

## Headline result

**Every beat loop in all three packs is sample-perfect. File-caused drift = 0 samples / 0 ms at 10, 20 and 30 minutes.**
The remaining drift is therefore **100% transport architecture**, not the audio files.

---

## Reference math (128 BPM, 44.1 kHz, all files 24-bit stereo PCM)

```
1 beat  = 60 / 128            = 0.468750 s
1 bar   = (60/128) * 4        = 1.875000 s
samples/bar = 1.875 * 44100   = 82 687.5 samples   ← NOT an integer
```

Because a single bar is 82 687.5 samples, only **even-bar** loops land on an exact integer sample count at 44.1 kHz:

| Bars | Expected seconds | Expected samples | Integer? |
| --- | --- | --- | --- |
| 4 | 7.5 | 330 750 | ✅ exact |
| 8 | 15.0 | 661 500 | ✅ exact |
| 16 | 30.0 | 1 323 000 | ✅ exact |

All audited beats are 4 / 8 / 16-bar → all land exactly. (Caution for future packs: an **odd-bar** loop, e.g. 1 or 3 bars, would carry a 0.5-sample rounding at 44.1 kHz. None present here.)

---

## Bravo Pack — beats

| Pad | Bars | Expected samples | Actual samples | Sample error | ms error | Lead silence | Drift @10m | Drift @20m | Drift @30m | Rank |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beat-01 (Byte Full 03) | 16 | 1 323 000 | 1 323 000 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-02 (Byte Groove 01) | 8 | 661 500 | 661 500 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-03 (Byte Hat 02) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-04 (Byte Top NoKick) | 8 | 661 500 | 661 500 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-05 (Byte Drum 005) | 16 | 1 323 000 | 1 323 000 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |

## Alpha Pack — beats

| Pad | Bars | Expected samples | Actual samples | Sample error | ms error | Lead silence | Drift @10m | Drift @20m | Drift @30m | Rank |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beat-01 (Byte Drum 002) | 16 | 1 323 000 | 1 323 000 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-02 (Byte Hi-Hat 003) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-03 (Byte Hi-Hat 004) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-04 (Byte Hi-Hat 006) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-05 (Byte Hi-Hat 007) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |

## Delta Pack — beats

| Pad | Bars | Expected samples | Actual samples | Sample error | ms error | Lead silence | Drift @10m | Drift @20m | Drift @30m | Rank |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beat-01 (Byte Drum 001) | 8 | 661 500 | 661 500 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-02 (Byte Hi-Hat 001) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-03 (Byte Hi-Hat 005) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-04 (Byte Top 001) | 8 | 661 500 | 661 500 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |
| beat-05 (Byte Hi-Hat 002) | 4 | 330 750 | 330 750 | **0** | 0.000 | none | 0 ms | 0 ms | 0 ms | SAFE |

---

## Detection results

| Check | Result |
| --- | --- |
| Sample rate consistency | ✅ All 15 files 44 100 Hz, 24-bit, stereo, `pcm_s24le` |
| Duration = bars × (60/BPM) × 4 | ✅ Exact for all 15 (0 sample error) |
| Hidden silence padding (length) | ✅ None — total length is the exact musical length |
| Leading silence / off-grid first transient | ✅ None — first transient at t = 0 on every beat |
| Hidden tails / fade tails extending length | ✅ None — no extra samples beyond the musical length |
| Tempo drift within file | ✅ None implied — exact integer length at a constant grid |
| Loop boundary mismatch | ✅ None — end sample = exact loop point |

Ranking summary: **15 / 15 SAFE. 0 SOFT WARNING. 0 HIGH RISK.**

---

## Cumulative phase drift caused solely by file length

Because every beat's duration error is exactly **0 samples**, the drift contributed by file timing is **0 ms regardless of elapsed time**:

| Horizon | File-caused drift (any beat, any pack) |
| --- | --- |
| 10 minutes | 0.000 ms |
| 20 minutes | 0.000 ms |
| 30 minutes | 0.000 ms |

(If a file had been off by even 1 sample = 0.0227 ms, then over 30 min a 7.5 s loop wraps 240×, a 30 s loop 60× — so a 1-sample error would accumulate only ~5.4 ms / ~1.4 ms respectively. The observed real-world drift is far larger than any sub-sample file error could explain, which independently points away from files.)

---

## Most likely source of remaining drift

### TRANSPORT — not file timing.

The files are mathematically perfect loops, so the drift is introduced at runtime by **`HTMLAudioElement` native looping (`audio.loop = true`)**:

1. **Loop seams are not sample-accurate.** When a media element wraps, the browser reschedules playback on the media/main thread, inserting a small, *variable* gap (typically a few ms, decoder/-browser dependent) at every wrap. A 7.5 s loop wraps 240× in 10 min; a handful of ms of seam jitter per wrap accumulates.
2. **Each element runs on its own clock.** The pool uses one independent `HTMLAudioElement` per pad. They are *started* together, but their loop-seam timing diverges independently → loops that began locked spread apart and stay apart. This exactly matches the reported symptom ("start synced, drift apart, stay drifted").
3. **This is a known Web Audio limitation.** Sample-accurate looping is a property of `AudioBufferSourceNode` (scheduled on the audio hardware clock), *not* of `HTMLMediaElement`.

### Verdict

| Candidate | Contribution |
| --- | --- |
| File timing (B) | **0 ms** — ruled out. Loops are sample-exact, no silence, transient at t=0. |
| Transport architecture (A) | **All of it** — `HTMLAudioElement` loop-seam jitter + independent per-element clocks. |

**Source of remaining drift: TRANSPORT.**

### Implication (for a future, separate change — not done here)

The bar-boundary resync already added is the correct *mitigation* for this transport limitation. A more permanent fix, if desired later, would be to play loops through **`AudioBufferSourceNode` with `loop = true`** (decode each pad into an `AudioBuffer`, schedule on `AudioContext.currentTime`), which loops with sample accuracy and removes seam-jitter drift at the source. That is an architecture change and is **out of scope for this audit.**
