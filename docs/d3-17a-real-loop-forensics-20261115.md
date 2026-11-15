# D3.17A — real-motor movement-loop forensics (2026-11-15)

## Scope and provenance

Verified on the D3.16-era **tenth frozen 22-site cohort** (every map in both
authored and generated-entry modes, four real friendly operators, 2700
fixed 1/60-second physics steps / 45 seconds). The release archive was
independently re-analyzed and the new source-level route observer run
**43741149828** reproduced the exact corpus totals with no game-motor
changes or physical safety violations.

- 133/176 actual physical arrivals and 26/44 physically completed squads
- 23 **flagged five-second windows**, not 23 separate operators or maps
- 37 windows classified `movement-loop`, 23 suspicious
- **Six consecutive-loop episodes, five distinct seed/mode/operator cases**
- All five affected operators still held a MOVE at the 45-second cutoff
- 32 separate suspicious `physical-obstruction` windows, not to be
  incorrectly merged with movement-loop episodes
- Summed `travel - net displacement` across the six episodes: **5930.34
  world units**. This is a diagnostic of low efficiency in those windows,
  **not** validated avoidable path cost or a guaranteed improvement size

## Reproducible priorities

| Priority | Seed / building / mode | Actor | Flagged 5 s windows | Travel minus sum-window-net | Route provenance (full run) |
| --- | --- | --- | --- | --- | --- |
| 1 | 14462973, standard utility, authored | Ash | 6 | 1676.30 | 16 `initial-intel`, 16 `door-rehearsal`; actual COURT-1 traversal episode |
| 2 | 14136777, small motel, entry | Ash | 7 | 1640.62 | 58 `full-body-lane`, 1 `lane-cycle-world`, 3 `blocked-leg-connector` |
| 3 | 14354241, standard garage, entry | Vale | 6 | 1494.79 | 18 `initial-intel`, 16 `door-rehearsal`; FRONT traversal episode |
| 4 | 14435790, standard motel, entry | Rook | 1 | 438.60 | 34 `full-body-lane`, 4 `initial-intel` |
| 5a | 13919313, small house, entry | Ash | 2 | 407.83 | 33 `blocked-leg-connector`, 3 `initial-intel` |
| 5b | same small house | Ash | 1 | 272.20 | Second separated episode with same operator/GO |

The three main incidents account for **19/23 flagged windows**, persist
for 30–40 simulated seconds, and retain active movement orders. During
the worst loops the real motor logs **zero final blocked time, zero
recovery attempts and no sustained door-opening or passage waits**.
The operators are physically moving roughly 200–240 units per 5-second
window and returning near their starting positions. Existing
immobility-only recovery will not address this.

## Causal triage, not premature fixes

1. **D3.17B1 — repeated door/route ownership (utility Ash and garage Vale).**
   The data shows alternating route-authoring sources:
   `initial-intel` and `door-rehearsal` each write ~16 times. The
   door episode remains in `approach/direct` by the 45-second cutoff.
   Confirm time-ordered source transitions and physical leaf/portal
   geometry **before** changing priority or invalidation rules.
2. **D3.17B2 — repeated full-body lane recovery (motel Ash and Rook).**
   A bounded `lane-cycle-world` was attempted once in the worst motel;
   repeated `full-body-lane` selections still occurred. Check whether
   a physically clear candidate is being discarded, loop history is
   reset by route ownership, or genuinely no legal alternative exists.
3. **D3.17B3 — blocked-leg connector recurrence (house Ash).**
   Investigate 33 repeatedly adopted `blocked-leg-connector` paths
   before considering changes to its cooldown or waypoint authority.

Route source counts above are **case-wide correlations**, not proof that
a particular transition caused each five-second loop. Next perform
targeted single-case `--route-transitions --trace-actor` captures with
timestamped physical positions, previous route and new route. Avoid
new generic global watchdogs or an additional movement controller.

## D3.17A acceptance

- Read-only `scripts/lib/d3-17a-loop-incidents.mjs`, called by
  `scripts/report-d3-17a-loop-forensics.mjs`
- Case grouping keys: exact seed + archetype + scale + authored/entry
  mode + actor; adjacent movement-loop windows combine into episodes
- A solitary suspicious window is marked ambiguous rather than falsely
  called two consecutive loop windows
- Distinguish intentional WAIT/SYNC, door-opening, real physical hold
  and ordinary productive detours
- All 23 previously flagged windows must be accounted for exactly once
- Zero main-thread per-frame instrumentation in production, no physics,
  route, authored GO, collision, order semantics, or visibility change
- Strict release gate: existing 133/176 and 26/44 physical arrival
  counts, no positional or order corruption, no new 60 Hz violations

**Release policy:** A-stage is a diagnostic feature branch; retain
`main` as-is until a specific B-stage fix beats the same cases and
unchanged independent holdouts. Group compatible stages at a checkpoint,
rather than releasing every diagnostic commit.
