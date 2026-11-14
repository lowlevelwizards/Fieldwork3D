# D3.10A — 45-second generated ENTRY landing validity and movement parity

Date: November 14, 2026. Feature branch: `feature/d3-9-clean-single-opener-20261114`. Base D3.9C baseline: `697dba61f1926f9a277fc18df31e311b56ab129f`. Validated gameplay head: `9bd173e877c6d78a6b9908b748aeb606016f9420`. Draft PR #1403; not merged or deployed.

## Audit / design scope

Priority 0: fix **known-unsafe GENERATED ENTRY landing coordinates** without altering player-authored MOVE, unseen map evidence, or leaf/body physics. Previous `planSquadEntry` used `SQUEEZE_RADIUS=3.8` for final goal positions although normal standing requires `OPERATOR_RADIUS=8`. It could select a template that route planning could squeeze toward but could not physically finish. Later attempts at exclusively full-body lane generation chose far gallery positions in retail 31084, creating a new persistent Vale travel loop; a compact alternate template caused terminal friendly crowding at Rook/Ash. These were independently traced and rejected.

Priority 0 solution: **preserve D3.9's standard template**, where narrow routes may be appropriate, and repair only a known-unsafe generated destination at authoring time. `settleKnownEntryLandings` tries the original lane first, then deterministic 3/5/8/11/14 unit local candidates on the same interior side of the selected threshold. Every accepted destination must clear the full operator radius against **known** walls and cover, the actual currently known door leaf, and a known-geometry route; it must remain at least 23 units from other generated destinations and their unassigned anchors. Apply the same small displacement to its look vector. If no small legal correction exists, fall back to the existing full-size lane generator. Never change player-authored moves or disclose hidden geometry. Only physical execution may discover unseen blocking props, and the existing bounded recovery/explicit impossibility policy remains unchanged.

Priority 1: prevent destination repair itself from becoming a performance problem. This runs only when the player explicitly authors ENTRY, not every simulation frame. Reuse a per-plan candidate-route cache across candidate lane checks and local repair. Eliminate avoidable `.bind()` method objects in frequent known-geometry grid passability checks, retaining the same spatial-index queries and collision predicates. No speculative changes to the 60 Hz motor, door ownership, stagger, queue or swept collision.

Priority 1: run **45 seconds (2700 × 60 Hz)** for the frozen 11-site × authored/ENTRY corpus. Differentiate physical arrival and logical order completion; arrival count is advisory, not a fixed long-map deadline. Compare the same seeds and duration to the frozen pre-D3.10A commit. Keep five-second progress obstruction windows, operator histories, per-door flip counts and physical safety gates. Supplement with focused actual retail 31084 squad traces.

Out of scope / follow-ups: long-distance route quality for authored multiroom paths, player-authored furniture-obstructed target feedback, performance profiling on actual iPhone Safari, combat/civilian interaction. No change to locked-door, wedged-door, opening, opposing traffic or authored-plan semantics.

## Tests and 45s results

Full paired run: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43641171716
Focused retail formation: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43641171830

| Observed measure | Frozen D3.9C at 45s | D3.10A at 45s |
|---|---:|---:|
| Generated site/mode cases | 22 | 22 |
| Accepted four-operator plans | 22 | 22 |
| Physical arrivals (within survey radius) | 71 / 88 | **79 / 88** |
| Entire four-person physically arrived | 16 / 22 | **18 / 22** |
| Logical four-operator plans complete | 19 / 22 | **21 / 22** |
| Stall episodes (audit counter) | 13 | **9** |
| Route recovery retries | 32 | **17** |
| Suspicious 5-second windows | 10 | **8** |
| Sustained-still suspicious windows | 0 | **0** |
| Recurrent loop suspicious windows | 1 | **1** |
| Invalid positions / overlarge physics steps / corrupted plans | 0 / 0 / 0 | **0 / 0 / 0** |

- All 11 generated full-view ENTRY templates were accepted with distinct, known/full-operator-safe standing destinations. Four focused D3.10A test cases pass, including local single-slot correction without displacing the other three. TypeScript/Vite production build pass.
- Retail 31084 ENTRY: D3.9 baseline safe movement recovered; in the final focused trace all four operators finished their generated entry orders by 12 seconds. Previously rejected experimental far-gallery Vale and centerline Ash/Rook stall alternatives were not retained.
- Garage 31110 ENTRY: four additional arrivals versus baseline. Restaurant 31136 ENTRY: four additional arrivals versus baseline. No prior physical arrival was lost in the final paired results. The remaining 9 unarrived at 45s are not automatically stalls.
- Persistent motel 31149 **player-authored** Ash target overlaps toilet furnishing and remains a transparently physical obstruction/retry, not an ENTRY template failure. Utility 31162 authored Rook shows one isolated five-second loop window; no sustained-still evidence. Handle future explicit authored-goal feedback separately rather than silently moving the destination.
- Door flips 82 to 85 and passage wait 8.73 to 14.55 seconds across all operators in the longer shared 45s test. These aggregate differences come with changed arrival/destination behavior and do not by themselves demonstrate door ping-pong or performance gains; scrutinize if future captures show actual regressions.
- This is deterministic Node fixed-step simulation evidence, **not a measured phone FPS or JavaScript RAF improvement**. Do not claim mobile performance gains without device captures.

## Acceptance / integration

The local target fix, regression tests, paired 45-second workflow and focused retail witness are committed to the existing D3.9 feature branch. Verify the latest tested source head and critical CI before merge. Draft PR #1403 remains unmerged and not deployed. The parent D3.2–D3.8 PR #1395 remains draft, so coordinate dependency merges before production release.
