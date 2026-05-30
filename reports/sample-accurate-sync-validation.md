# Sample-Accurate Sync — Validation Checklist

**Phase:** SAMPLE-ACCURATE WEB AUDIO ENGINE
**Date:** 2026-05-30
**Engine:** `AudioBufferSourceNode` (loop) on one shared `AudioContext` clock.

This document is the manual validation plan. Static verification (build + types)
is complete; **audible** checks must be run in the browser (dev server at
`http://localhost:5173/`) since drift, clicks, and dropouts cannot be detected
statically.

---

## Automated / static — DONE
| Check | Result |
| --- | --- |
| `npx tsc -b --force` | ✅ exit 0, clean |
| `npm run build` | ✅ exit 0 |
| Dev server HMR | ✅ no errors |
| No `HTMLAudioElement` looping in main engine | ✅ (grep: only the isolated DEV native-audio diagnostic remains) |
| No `playbackRate` / phase-correction / corrective resync | ✅ removed/disabled |

---

## DEV instrumentation to watch during the audible runs
Open the console; the engine logs:
- `[web-audio] buffer pool built { voices, buffers }` on pack load.
- `[drift-monitor] phrase boundary { maxDriftMs, elapsedMs }` every 16 bars.
  **Expected: `maxDriftMs` stays ≈ 0 indefinitely** (single-digit ms is just the
  RAF read jitter of the observer, not real drift). Any growing trend = failure.
- The DEV perf panel `lastDriftMs` / `nextResyncS` mirror the monitor.
- `[transport] PAUSE/RESUME (master gain → 0/1, clock continues)`.

---

## Audible checklist (run in browser)

### A. Single-pack long-play drift — 10 min each
- [ ] **Bravo** — assign all beats, play 10 min. Beats stay phase-locked; no seam drift; `[drift-monitor]` maxDrift ≈ 0.
- [ ] **Alpha** — same, 10 min.
- [ ] **Delta** — same, 10 min.

Pass = no audible separation/flam between loops at minute 10 vs minute 0.

### B. Full 7-character mix
- [ ] Assign 7 characters across categories, play several minutes.
- [ ] No double beats / flamming, no clicking at loop seams, no dropouts.
- [ ] Compressor not pumping (existing glue settings unchanged).

### C. Pause / unpause
- [ ] Pause mid-phrase → instant silence, no click.
- [ ] Wait 10–30 s (context may suspend) → unpause → audio returns click-free and **all loops still mutually in phase**.
- [ ] Repeat rapidly several times → no stuck-silent voice, no doubled audio.

### D. Mute / unmute (per slot)
- [ ] Mute a loop slot → it goes silent but (per design) keeps running; unmute → returns gapless and in phase.
- [ ] Mute/unmute rapidly → no click, no phase jump.

### E. Restart Loops
- [ ] Press Restart Loops during playback → every loop snaps to bar 1 / beat 1 together, no click, no straggler.

### F. Assignment during playback
- [ ] Add a character while others play → it fades in already in phase (no restart of the others, no audible reset).
- [ ] Remove a character → fades out; others unaffected.

### G. Replay / share
- [ ] Record a mix, replay it → slots, mutes, volume, pause events reproduce; audio in phase.
- [ ] Load a shared mix → Start Shared Mix plays in phase.

### H. Thermals / CPU
- [ ] Activity Monitor during 10-min full mix: no sustained CPU spike, no fan ramp / overheating.
- [ ] Idle pool (stage emptied) → sources stopped (`pausePackTransport`), CPU returns to baseline.

---

## Success criteria
- [ ] ✓ no beat drift
- [ ] ✓ no loop seam drift
- [ ] ✓ no double beats
- [ ] ✓ no clicking
- [ ] ✓ no audio dropout
- [ ] ✓ no overheating spike
- [x] ✓ build passes

---

## Fallback / failure handling verified by design
- Per-pad decode failure → loud `[web-audio] … FAILED — pad will be silent`
  warning; rest of the mix unaffected.
- `AudioContext` unavailable → `[web-audio] AudioContext unavailable` warning;
  no crash.
