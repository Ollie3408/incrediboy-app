# Sync Architecture Validation — Global Transport

**Build:** `npm run build` → exit 0 (tsc + vite), zero errors, no lint findings.

## Active synchronization mechanisms (after this phase)

| Mechanism | Status | Notes |
| --- | --- | --- |
| One shared timeline origin | ✅ active | `musicalClockRef.originMs` anchored once at `startOrRestartLoops`. |
| All loops started together | ✅ active | `startGlobalTransport` resets `currentTime=0` + `play()` for every pool pad in one synchronous batch. |
| Native `audio.loop` repetition | ✅ active | No manual cycle restart; loops repeat seamlessly. |
| Assignment = gain reveal only | ✅ active | No `play()`-from-zero, no `currentTime` reset on assign. |
| Removal / mute = gain only | ✅ active | Loop keeps running silently, phase preserved. |
| Pause = freeze whole pool | ✅ active | Snapshot `currentTime` per pad, pause all; resume restores all + batch `play()`. |
| Restart Loops = synchronized batch | ✅ active | `startGlobalTransport` returns every loop to bar 1 / beat 1 together. |

## Explicitly NOT present (kept disabled, per phase rules)

| Mechanism | Status |
| --- | --- |
| Phase-correction monitor interval | ❌ disabled (stub) |
| `playbackRate` drift correction | ❌ removed |
| Hard `currentTime` snapping during playback | ❌ none (only on PLAY reset & pause-resume restore) |
| High-frequency polling / diagnostics | ❌ none (DEV report runs at 5 s) |
| Per-assignment quantize timers | ❌ removed (no longer needed) |
| JS one-shot retrigger timers | ❌ none |

## DEV master transport diagnostics (`logGlobalTransportDiagnostics`, every 5 s while playing)

Reports, observe-only (no automatic correction):

- active pack id
- loaded pad count (pool size)
- running loop count
- assigned slot count
- muted slot count
- master-paused flag
- clock elapsed (ms)
- per-pad table: `currentTime`, expected loop position `(elapsed % duration)`, and **drift = |actual − expected|** in ms

## Manual validation checklist (verify by ear in the browser)

> All playable packs (Bravo / Alpha / Delta) are 100% loop pads, so every pad participates in the always-running pool.

- [ ] All beats together — kicks/snares land together, no flam.
- [ ] All bass together — locked, no late entries.
- [ ] All vocals together — rhythmic entries aligned.
- [ ] Full 7-character stage for 10 min — no progressive drift, no dropouts.
- [ ] Assign / remove characters while playing — revealed loops are already in time; no restart, no double beat.
- [ ] Mute / unmute rapidly while playing — gapless, no click, no restart.
- [ ] Pause / unpause (incl. long pauses, 50×) — same groove and beat position on resume; no doubled beats.
- [ ] Restart Loops — everything snaps back to bar 1 / beat 1 together.
- [ ] Switch packs → play → switch back — clean rebuild, no orphaned audio.
- [ ] Replay a recorded mix — identical playback; `sa`/`sc`/mute/volume events reveal/hide correctly.
- [ ] Watch the DEV console drift table — drift should stay near 0 ms for native-loop pads and never trend upward.

## Success criteria mapping

| Requirement | Mechanism delivering it |
| --- | --- |
| ✓ all music starts from same bar/beat | shared origin + batch start in `startGlobalTransport` |
| ✓ no double beats | single element per pad, never re-`play()`'d while running |
| ✓ no pads restart out of time | assignment reveals via gain; no quantized restart |
| ✓ no drift during normal play | native loop + shared origin, no per-element free-start |
| ✓ no sound cutting out | removal/mute only fades gain; loop stays alive |
| ✓ no clicking | gain ramps on reveal/hide/resume; no hard mid-playback seeks |
| ✓ no overheating spike | plain PCM decode; pause freezes pool; empty-stage parks pool |
| ✓ build passes | `npm run build` exit 0 |
