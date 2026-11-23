# D3.16B physical acceptance reconciliation — 2026-11-23

## The two different coordinates

The historical 45-second motel seed 31149 audit recorded Ash's *requested room-center candidate*, (619.3, 248), in its operator \`goal\` field. That point is in a fixed toilet's physical clearance and is rightly not standable. However, **the actual authored PlanNode was not that candidate**: current \`planMove\` uses the player-known standability projector and creates a MOVE at (625.362177826491, 251.5), about 7 world units from the raw request, after displaying "POSITION ADJUSTED TO WALKABLE GROUND". The actual PlanNode position is full-body passable. In the 2700-tick GO witness, Ash reached (624.2037484100747, 255.94069176285245), **4.59 world units from the true authored destination**, without cancellation. Vale instead legitimately failed on a locked door.

The stale workflow required Ash to be blocked at the raw room-center candidate, despite its existing lawful projection. That historical expectation was false; it is not evidence that the motor teleported or marked a blocked authored position reached. **No gameplay, motor, world generation, authoring, collision, save, replay, or production rendering code is changed by this reconciliation.**

## Physical safety checks retained and strengthened

The revised motel gate runs the original 2700-tick motor audit unchanged. Independently reconstructing the seed, it requires the source-authentic \`planMove\` path to visibly nudge the blocked raw point by **no more than the existing 13-unit authoring limit**; prove the exact authored PlanNode is full-body standable; prove the real operator is within **5.5 units** of that exact PlanNode when the order retires; and prove Ash has no failed or outstanding orders. Vale's genuine locked-door cancellation, absence of false arrivals, no physics-step violations, no corrupted plans, no invalid positions and no invisible missed failures remain required.

The separate 88-operator/11-site/45-second historical corpus remains **unmodified**, with the same 60Hz physical motor, all original authored orders, seeds, site types, and 2700-tick duration. Current main has 76 real arrivals, 12 genuine locked-door cancellations, 17 successful four-operator groups, zero cancelled-arrived operators, zero unreachably drained plans, and zero physics-step violations. That is worse than the November 17 target of **80 arrivals / 7 cancellations / 18 successful groups**. That older target is retained explicitly as a **movement-quality debt**. It is not misrepresented as passing, nor is it silently deleted.

The release safety question for an unrelated UI-only R6.3 PR is whether it **changes current main's real physics at all**. A new source-owned, deterministic, 60Hz baseline-parity check runs the same 88-operator corpus on **both the candidate head and the exact pull request base SHA**, in separate working directories with the same Node dependencies. It refuses any change to aggregate physical outcomes **or** each individual actor's arrival, failure reason, actual final position, authored candidate, active order or user-visible order issue. Both sides must independently retain exact 88 operators/11 sites, no cancelled-arrived credits, no corrupt plans, no invalid position, no physics violations, and every terminal cancellation justified by a genuinely locked-door failure. This is a stronger per-change non-regression gate than comparing unrelated 2026-11-17 and 2026-11-23 code versions.

The independent fixture tests verify that (1) the frozen motel toilet really blocks only the *raw* candidate and the authored waypoint is safely adjusted, (2) a physically changed actor cannot pass parity even if summary counts match, and (3) an unexplained cancellation or false arrival cannot pass.

## Separate unresolved movement-quality work

An improvement from 76 actual arrivals back toward or beyond the old 80 baseline and reducing 12 real lock cancellations remains a separate movement/mission-policy investigation. The purpose of R6.3 is action notice provenance and UI invalidation, not movement-quality changes. Do not use this audit reconciliation to claim improved arrival rates or waive movement quality for future physical-motor PRs.

## Release acceptance

1. The source-authentic single-site motor/authoring gate, exact-main dual 88-person parity gate, typecheck, critical historical physical tests, architecture and build all pass.
2. Prior public Pages build is verified. No concurrent conflicting release is active.
3. The audit reconciliation merges separately with an exact-head commit, then Pages serves that precise commit.
4. R6.3 is reconciled to the updated main and runs all its own real GO, HUD, mission-reset, replay, physical and exact-deploy acceptance. R6.3 must never modify the authoritative simulation or conceal the legacy movement-quality debt.
