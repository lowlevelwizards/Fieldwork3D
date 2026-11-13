# Release A — active baseline and staged stabilization record

Base: `765af29e1a9182696a67f15972a57eead7b443fc` (2026-11-13). Feature branch: `release-a/stability-simplification-20261113`.
This is a rolling development document, **not evidence that unexecuted tests passed**.

## Protected implementation contracts
- One fixed-step authoritative simulation; authored plans, Q0–Q4 sequence and physical collision are never replaced by presentation shortcuts.
- Session-owned world/geometry remains authoritative; global legacy world adapters are compatibility only.
- Fire permission requires real, current line of sight and all wall/friendly/civilian vetoes.
- Fog display cannot grant or mutate knowledge; 2D/3D/replay maintain disclosure parity.
- Roster/campaign persistence belongs to the host, not the embedded Studio iframe.
- P0–P8 performance work on main is protected; never land the two stale P9 branches wholesale.
- No release merge while an earlier Pages deployment is pending/failed/stale; validate the live build stamp at each checkpoint.

## Existing Q5 baseline
Main: `docs/passage-q5-approach-matrix.md`: 70/70 defined outcomes, including 55 passable and 15 correct blocked cases. Core 20-case fourth-body crossing p90 ≤14.5 simulated seconds, worst ≤16.0, worst all-orders ≤19.5. Evidence is prior CI and documentation, not a newly run Release A suite.

## Initial open PR disposition
| PR | Action | Safety |
| --- | --- | --- |
| #1305 Q5 alternative formation corpus | Reconcile *onto current main*, do not merge old branch | 581 commits divergence at audit |
| #1286 P2.12 static-wall index | Hold for post-P0–P8 profiling and candidate oracle | Preserve exact collision |
| #1161 replay controller tests | Salvage focused tests if not superseded | No old lifecycle assumptions |
| #1145 & #1144 P9 alternatives | Supersede after unique-line parity inspection | Avoid overwriting recent render work |
| #1119 LOOK/WATCH targeting | Port only relevant fix to current input contract | Never leak hidden world knowledge |
| #1025 verification | Salvage dependency/release principles, not wholesale 65-file merge | Existing CI already has changed-source tests |
| #994 replay R3 | Defer to separate long-recording release | Experimental and incomplete |

## Stage ledger
- A0: Baseline/ownership, scope and PR decisions (this document).
- A1: Correct affected-domain regression classification, scoped critical checks and release publication safety.
- A2: Reconcile Q5 formation corpus, both doorway faces and honest blocked-case accounting.
- A3: Targeted close-stack and urgent-fire regression checks.
- A4: Fog bounds, occlusion, knowledge/render parity checks.
- A5: Studio navigation/persistence and resource lifecycle smoke.
- A6: Normal-play long-round perf, replay/batch/resource regression gates.
- A7: Only demonstrated safe legacy-adapter and renderer lifetime cleanup.
- A8: Exact-head integration, critical browser checks and production release gate.

## Verification evidence rule
Every stage must record tested head and exact command/run URL. A green workflow on an older PR does not qualify a different integrated head. Node simulated seconds are not hardware mobile FPS. Retired code must have a verified zero-consumer audit; old saved data/replays and working Labs are protected.

## A2 Q5 work in progress
A2.1 adds six north/south formation fixtures to the current main-owned real Session benchmark without swapping the motor. A2.2 exposes the mirrored approach selector and 48/168-case Door Lab. A2.3 wires a Release A-only 168-case hard gate in the existing Q5 workflow, preserving the 70-case historical performance oracle. **No success assertion** until the exact-head CI completes; novel south-side cases are expected to expose real issues to diagnose.
