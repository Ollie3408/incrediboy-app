# Long-Play Sync Validation — Bar-Boundary Resync

**Build:** `npm run build` → exit 0 (tsc + vite), zero errors, no lint findings.

## What to verify (by ear + DEV panel, in the browser)

The resync runs every **16 bars (~30 s @ 128 BPM)**. Open the DEV `⚡ PERF` panel to watch:
`Resync in: Ns · last drift: Nms` and `Corrected: N · total resyncs: N`.

### Test matrix

| Test | Steps | Expected |
| --- | --- | --- |
| All beats, 10 min | Assign all beat pads, leave playing 10 min. | Beats stay locked; `last drift` stays small and does **not** trend upward; corrections happen silently at boundaries. |
| Full 7-character mix | Fill all 7 slots, play 10 min. | No progressive drift, no double beats, no dropouts. |
| Pause / unpause | Pause at random points, resume (incl. long pauses). | Same groove on resume; resync countdown restarts; no duplicate timers (one `Resync in` countdown). |
| Mute / unmute | Toggle slots repeatedly. | Gapless; resync still fires on schedule; muted pads stay aligned silently. |
| Restart Loops | Press the button mid-session. | Everything snaps to bar 1/beat 1; countdown resets; should rarely be necessary now. |
| Switch packs | Bravo → Alpha → Delta, play each. | Clean rebuild; resync re-derives interval from the new pack BPM; no orphaned timers. |
| Drift watch | Watch `last drift` over 10 min. | Stays in single/low-double-digit ms; spikes are corrected at the next boundary and drop back. |

## Success criteria mapping

| Requirement | Delivered by |
| --- | --- |
| ✓ beats stay locked | 16-bar batch re-alignment to expected position |
| ✓ no long-term drift | periodic resync prevents accumulation |
| ✓ no double beats | seek to expected (single element per pad, no re-`play()`) |
| ✓ no clicking | instant mute → seek at zero-crossing → 35 ms ramp back, at a phrase boundary |
| ✓ no audio dropout | only drifted pads touched; ≤47 ms gain dip on audible ones only |
| ✓ no overheating spike | ~2 timer ticks/min; no polling, no `playbackRate` DSP, no per-frame work |
| ✓ build passes | `npm run build` exit 0 |

## Guardrails confirmed in code

- No continuous phase-correction monitor (still stubbed/disabled).
- No `playbackRate` nudges anywhere.
- Hard `currentTime` set only at: PLAY/Restart (volume 0), pause-resume restore, and the 16-bar resync (gain-dipped) — **never** an un-masked mid-bar snap during audible playback.
- Resync cadence is `setTimeout` + `setInterval` aligned to phrase boundaries — no high-frequency polling.
- DEV-only telemetry; production builds log nothing.

## If drift is still audible after this

Tighten in `src/App.tsx`:
- Lower `RESYNC_BARS` to `8` (resync every ~15 s) for tighter lock at slightly higher correction frequency.
- Lower `RESYNC_TRIGGER_MS` toward `15` to intervene sooner.
Both are single-constant changes; no architectural change required.
