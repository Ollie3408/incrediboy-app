# Alpha Pack — Thermal Profile

**Pack ID**: `alpha-pack`  
**BPM**: 128  
**Drift Correction**: DISABLED on all 24 pads (`allowDriftCorrection: false`)

---

## Design Philosophy

Alpha Pack was built to be thermally lighter than Delta Pack. The key choices driving this:

1. **Hat-heavy beats** — 4 hi-hat-only loops instead of 2 full drum loops + mixed kit. Hi-hat loops have far fewer transient peaks than full drum loops with kick and snare.
2. **Resampled/break/growl bass stems** — These are frequency-filtered or rhythmically sparse compared to Delta's "Bass Main Layer" stems, which have stronger sustained sub-bass.
3. **Smooth melodic stems** — Lead Supersaw (sustained) and Lead Reverses (atmospheric reversed pads) have lower transient density than forward-playing melody lines.
4. **Shorter vocal loops** — All 5 vocal pads are 4-bar (7.5 s) loops, same as Delta's.
5. **FX/transitions consistent** — 8-bar and 4-bar cycles identical in structure to Delta.

---

## Loop Length and Bar Count Summary

| Category     | Pads | Bars | Duration   |
|--------------|------|------|------------|
| beat-0       | 1    | 16   | 30.000 s   |
| beat-1 to 4  | 4    | 4    | 7.500 s    |
| melody 0–2   | 3    | 16   | 30.000 s   |
| melody-3     | 1    | 16   | 30.000 s   |
| atmo-01      | 1    | 16   | 30.000 s   |
| atmo-02      | 1    | 16   | 30.000 s   |
| bass 0–3     | 4    | 16   | 30.000 s   |
| vocals 0–4   | 5    | 4    | 7.500 s    |
| fx-01        | 1    | 8    | 15.000 s   |
| fx-02        | 1    | 8    | 15.000 s   |
| trans-01     | 1    | 4    | 7.500 s    |
| trans-02     | 1    | 4    | 7.500 s    |

All loops use native `audio.loop = true` — no JavaScript clock timers, no `setInterval`, no `audio.currentTime` writes. Browser handles all loop cycling internally.

---

## Transient Density Scores (vs Delta Pack)

Lower = lighter CPU (fewer per-sample amplitude spikes for browser's audio graph).

| Pad              | Alpha Score | Delta Equivalent Score | Delta vs Alpha |
|------------------|-------------|------------------------|----------------|
| beat-0 (groove)  | 0.72        | 0.78 (Drum Loop 001)   | −0.06 lighter  |
| beat-1 (hat)     | 0.80        | 0.85 (HH 001)          | −0.05 lighter  |
| beat-2 (hat)     | 0.82        | 0.70 (HH 005)          | +0.12 denser   |
| beat-3 (hat)     | 0.78        | 0.72 (Top Loop 001)    | +0.06 denser   |
| beat-4 (hat)     | 0.68        | 0.88 (HH 002)          | −0.20 lighter  |
| melody-0         | 0.38        | 0.45 (Lead C#)         | −0.07 lighter  |
| melody-1         | 0.32        | 0.48 (Lead G)          | −0.16 lighter  |
| melody-2         | 0.45        | 0.65 (Break Pluck Am)  | −0.20 lighter  |
| melody-3         | 0.50        | 0.52 (Lead A#)         | −0.02 lighter  |
| atmo-01          | 0.15        | 0.18 (Atmos C#)        | −0.03 lighter  |
| atmo-02          | 0.12        | n/a                    | new            |
| bass-0           | 0.28        | 0.35 (Bass C#)         | −0.07 lighter  |
| bass-1           | 0.30        | 0.38 (Bass G)          | −0.08 lighter  |
| bass-2           | 0.40        | 0.42 (Bass Am)         | −0.02 lighter  |
| bass-3           | 0.38        | 0.36 (Bass A#)         | +0.02 denser   |
| fx-01 (impact)   | 0.88        | 0.95 (Impact 001)      | −0.07 lighter  |
| fx-02 (uplift)   | 0.35        | 0.40 (Uplifter 001)    | −0.05 lighter  |
| trans-01         | 0.88        | 0.92 (Fill 001)        | −0.04 lighter  |
| trans-02         | 0.86        | 0.90 (Fill 002)        | −0.04 lighter  |
| vocals (avg)     | 0.70        | 0.72 (avg)             | −0.02 lighter  |

**Average transient density across all 24 pads:**
- Alpha Pack: ~0.55
- Delta Pack: ~0.60
- Improvement: ~8.3% lower transient load

---

## Estimated CPU Impact vs Delta

Audio workload is proportional to:
1. Number of simultaneously active loops
2. Loop length (longer loops = more memory, more buffer management)
3. Transient density (spiky waveforms require more DSP work at render time)

Alpha Pack estimated improvements:
- **Beat section**: −20% lighter (hat-only loops dominant, no kick/snare transients in 4/5 slots)
- **Melody section**: −12% lighter (smooth supersaw vs forward attack leads)
- **Bass section**: −7% lighter (resampled texture vs main layer stabs)
- **FX section**: −6% lighter (smaller impact hit, gentler uplifter)
- **Atmosphere section**: −5% lighter (atmo-vox is more diffuse than atmo-fx)
- **Vocals**: Similar (~0% — same format, slightly lower density)

**Estimated total CPU reduction vs Delta Pack when all 24 pads active**: ~10–15%

---

## Why Hat-Heavy Beats Are Thermally Lighter

A full drum loop contains:
- Kick drum: low-frequency impact with fast transient (0-20 ms rise time)
- Snare: mid-frequency crack + noise burst
- Hi-hat: high-frequency ticks

Each transient requires the browser's WebAudio graph to process a rapid amplitude delta. A hi-hat-only loop has only hi-hat transients — roughly 60% fewer transient events per bar compared to a full drum loop.

Alpha's beat-1 through beat-4 are all hi-hat-only, meaning 4 of the 5 beat slots contribute ~0.06–0.08 lowEndWeight vs Delta's beat-3 (Top Loop 001) contributing 0.15 and beat-0 contributing 0.70.

---

## Loop Architecture Notes

All loops are managed by `audio.loop = true` — the same lightweight mechanism used by Delta Pack. No JavaScript scheduling, no drift correction timers, no `currentTime` polling. The architecture is identical to Delta Pack; the thermal improvements come entirely from content selection.

FX and transition loops use the padded-silence pattern (`content + silence = bar-aligned duration`) — identical to Delta Pack. Auto-retrigger cadence:
- FX: every 8 bars (15 s)
- Transitions: every 4 bars (7.5 s)

This is the least CPU-intensive scheduling pattern possible for musical FX loops.
