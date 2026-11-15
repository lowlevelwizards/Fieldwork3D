# D3.14C2 — Coordinated FRONT physical-lane recovery release

Date: 2026-11-15. Sole main-targeted integration owner: PR #1450. Consolidates read-only FRONT feasibility PR #1449 with C2 gameplay stage; do not merge both separately.

## What the 60 Hz actual-motor evidence proved

Frozen small townhouse authored MOVE, seed 5386234, Rook starts a recurring source-level `full-body-lane` loop near the already opened FRONT hinge. The motor had selected essentially the same path (460,500) → (496,512) → (496,464) around 20 times; Rook traveled about 1,697 units but ended 399.02 from the original authored GO at (133.3,339.5). Repeated 5-second windows covered over 240 units of travel with negligible net displacement; no collision exception, no blocked-time accumulation. That is *not* progress through a large map.

Read-only C1 feasibility showed a world-true full-body route exists at the *actual final position*, as well as at three frozen recurrent circle anchors. All legs pass the existing full-body swept check, and the route terminates at the original GO. The known-intel route had one currently illegal physical leg; the first-future-operable-door recovery offered no useful path. There was no justification for ghosting a wall, weakening oriented clearance or retargeting player MOVE.

C2 responds only after **three distinct real repeated physical local-lane choices** for the same actor, same PlanNode, same door and near the same anchor, with no meaningful GO-distance reduction. A monotonic fixed-clock witness avoids counting repeated same-tick callbacks as independent cycles. Only one cold attempt probes two deterministic opposite-side near-body departure points and obtains existing world-truth A* tails; it accepts a candidate only if the full capsule sweep validates each stage and route leg, total length remains bounded and last waypoint is the original GO. One short actor-scoped temporary ownership lease prevents immediate local-lane replacement; ordinary full-body collision, actual hinge opening, WATCH and authored plan execution remain authoritative. No teleport, remote OPEN, special physics radius, synthetic arrival or per-frame A*.

## Fixed 45-second targeted and historical physical outcomes

| Measure | Released B2 | D3.14C2 |
|---|---:|---:|
| FRONT Rook distance to unchanged authored GO | 399.02 | **4.64** |
| FRONT Rook full-body lane replacements | 20 | **3** |
| Physically accepted anti-cycle replacement | 0 | **1** |
| Historical frozen 11-site physical arrivals | 80/88 | **80/88** |
| Fully physically arrived historical squads | 18/22 | **18/22** |
| Logical historical full squads | 21/22 | **21/22** |
| Historical stalls / retries | 8 / 5 | **8 / 5** |
| Historical suspected loops / sustained still | 0 / 0 | **0 / 0** |
| Historical world A* searches | 2,611 | **2,611** |
| Physics/invalid-body/corrupted-plan errors | 0 | **0** |

The previously repaired D3.14B2 generated-entry D9 squeeze (Vale) and H4 standard/small motel cases remain passing. Targeted + 88-operator Actions run: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43686911651 . Independent known-incident replay: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43687065309 .

## Seventh NEW blind 22-map paired acceptance

Frozen **before** candidate comparison, `scripts/lib/d3-14c-seventh-blind22.mjs`: 11 building archetypes each small and standard, two movement-order modes, four real actors and 2700 physical 60Hz ticks per mode. Identical generator, maps, orders, clock and harness on released B2 SHA fdc0a3f5c744e4a745885ca4739d99c45d5db883 and C2.

| Measure | Released B2 | D3.14C2 |
|---|---:|---:|
| Physical arrivals | 146/176 | **146/176** |
| Physically full squads | 31/44 | **31/44** |
| Logically full squads | 33/44 | **33/44** |
| Stall episodes / recovery retries | 14 / 115 | **14 / 115** |
| Suspected loops / sustained still | 16 / 0 | **16 / 0** |
| A* searches | 65,172 | **65,172** |
| Expanded nodes | 11,166,609 | **11,166,609** |
| Physics, invalid positions or corrupted authored GO | 0 | **0** |

No individual squad lost a physical arrival, and no unseen map improved: C2 is a **targeted, traceable** repair, not a global loop cure. Both runs plus per-squad comparison archived at https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43687065117 .

## Integration / operations

- PR #1450 is the sole main-targeted owner; read-only parent #1449 remains unmerged and must not trigger its own main release.
- Extended audit, known incidents, historical and seventh independent 22-map workflows have completed with immutable artifacts and are retained as **manual workflow_dispatch** for economical future verification.
- Require main-targeted D3 physical 88-operator checkpoint, affected-domain fixed-clock regression, TypeScript, Pages build, Ground Zero, and D5/D6 integration success. No merge while another production Pages deploy is queued/running. After merge check public Pages serves **exact merged build stamp** before claiming release.
- B2 and C2 must preserve original plan/watch/collision ownership. Do not reintroduce rejected D3.13E remote OPEN reach gates or world-global A* inside the 60Hz collision hot loop.
- Remaining roadmap: D3.14D retail authored Rook, seed 5412896, repeated `outside-leaf` rehearsal; other unresolved 16 suspected loops from the seventh blind cohort. As with C2, distinguish true sustained nonproductive travel from transient, physically productive queue footwork before writing another fix.
