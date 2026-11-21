# Movement recovery R4 — exceptional route acquisition, refresh and negative results

Date: 2026-11-21. Continues merged R0 (writer census), R1 (typed proposal + shadow observer), R2 (ordinary enforcing adoption), and R3 (specialist door/STACK/squeeze ownership).

## Scope and authority

R4 migrates the *remaining exceptional route acquisitions* from src/breach-motor-route.ts into a distinct typed proposal policy in src/breach-route-acquisition-adoption.ts. Existing 60 Hz motor, collision geometry, authored PlanNodes, door/contact physics, intel visibility and retry ledgers remain authoritative. This is **not** a new path planner or a collision waiver.

### Exactly what is covered

| Source | Trigger and certificate | Route semantics |
| --- | --- | --- |
| initial-intel | Current BLUE no-route attempt; normal known-intel planner | May return a valid route **or empty**; empty is an expected negative query, not movement |
| initial-enemy | Current non-BLUE cached enemy route | No BLUE authored MOVE requirement; empty result is also negative |
| fire-retreat | Existing target-lane correction with real full-body sweep | Short correction is permitted before ordinary retry backoff; no invented positional move |
| motor-cold-fine-world (motor-route only) | An established stationary failed GO, bounded D3.26 cold fine probe and full body legal route | Retains the original GO; no transfer of ordinary collision writer ownership |
| shove-stage | Only previously confirmed known-shove crossing; route to staging plus original authored GO | Staging is not permission to remotely move cover and should not require a sweep through the obstacle |
| initial-portal-recovery | After a failed normal search; known first operable door | A short prefix toward the next door is **not** completion of a remote GO |
| forced-door-shortcut | An actually broken, opened, known latch at a bounded phase plus strictly worthwhile world reroute | Existing route must exist; first body stride also must now physically clear the current leaf geometry; never automatic unlocking/opening |

Selectors retain their pre-existing expensive-query cooldown and retry claims. In particular, a failed forced-door candidate still spends the one existing opening-phase comparison so it cannot rerun an expensive A* every motor tick. Repeated failures in cold route acquisition still increment normal motor recoveryAttempts and use existing D3 negative A* cache logic. The new policy never marks an empty normal path as successful.

## Typed contract

The new contract records source, actor, original GO, order generation, proposed route, evidence certificate, real first-stride clearance (where appropriate), and whether an original transient route was absent. It returns explicit:

- adopt: candidate is authorized to replace *temporary nav only*
- no-route: valid negative initial route acquisition; preserve empty route and run normal shove/portal/backoff fallbacks
- reject: invalid source/certificate, stale order, wrong-side actor, nonfinite path/goal, wrong owner, missing full-body proof, invalid prefix shape or wrong authored destination

Unlike R2/R3 collision *recoveries*, the R4 classification is an acquisition or sequencing event. Its R1 shadow policy override records that distinction; the R1 generic evaluator intentionally does not enforce its own ordinary recurrence/progress checks on initial paths. Physical clearance is **unknown** for normal world/intel path queries; no all-route sweep is fabricated by an accepted plan. Even successful acquisitions remain provisional until the existing motor actually moves the actor.

For truly empty initial queries, the R4 adoption proof has eligibility=fail and progress=fail; it is a truthful **no-route** diagnostic, not a failure to execute the fallback algorithm. This preserves a legitimate empty setTransientRoute transition so the existing known-obstruction shoving, next-door prefix, negative probe caching and retry backoff still run.

## State and invariants

A private WeakMap acquisition witness is keyed by the actual actor and stores source, current order ID, physical selection point, GO, attempt timestamp, and whether the query returned nothing. It can optionally report: no-route / provisional / moved (>=0.3 real units) / superseded. This is **read-only** and not called every frame. No new per-actor gameplay state, claim counter, clock, loop or observer is installed by default.

The forced-door selector continues to compare the two real opening phases and consumes them at the same point before A*. R4 adds a first-full-body-stride sweptBodyClear test after the candidate's original length/route benefit check. A shortcut cannot phase through a freshly opened leaf or claim that breaking a latch crossed the door. The ordinary motor must still do every actual step.

The authored GO/queue/door/entry progression remains unchanged. A staged shove route intentionally retains the original GO after its temporary approach. A first-operable-door prefix is not required to end at the remote GO, since another door must actually be opened by normal physics. Any rejected acquisition falls back to the same existing motor process; no synthetic arrival, retry reset, or plan mutation is introduced.

## Verification

Focused unit test: tests/movement-recovery-r4-acquisition.test.mjs. Tests verify seven source/certificate pairings, absence of virtual progress, empty query fallbacks, enemy route without BLUE MOVE, fire-lane physically swept correction, forced-door stale/owner/geometry rejection, first portal incomplete prefix, cold fine original destination, source/GO/finite constraints, R0 inventory and 480-tick real motor shadow parity.

Run only critical tests and the already source-selected existing CI verification:

    node scripts/verification/movement-recovery-r0-audit.mjs --check
    node --experimental-strip-types --test tests/movement-recovery-r4-acquisition.test.mjs
    node --experimental-strip-types --test tests/movement-recovery-r0-inventory.test.mjs tests/movement-recovery-r1-shadow-contract.test.mjs tests/movement-recovery-r2-ordinary-adoption.test.mjs tests/movement-recovery-r3-specialist-adoption.test.mjs
    node --experimental-strip-types --test tests/release-d3-18b-provisional-recovery.test.mjs tests/release-d3-17e-recovery-accounting.test.mjs
    npm run build

Source census preserves all 30 primary motor/route writers and 36 extended writers. The R0 original historical anchor and R2/R3 reviewed line witnesses remain available while the R4 live route positions and only its explicit fifth-arg proof fields are re-audited. Do not add duplicate release workflows or relax the current 88-/176-body physical truth gates; do not treat historically locked doors as completed goals.

## Exit criterion

When R4 exact head passes primary CI, architecture, focused recovery, current physical-truth/locked-door release checkpoint and previous exact Pages build readiness, squash merge the coherent branch. Allow only the standard main-triggered Pages release. Verify that its public build stamp matches the precise new main SHA before calling it deployed.

R5 will consider deduplicating verified shared policy/episode bookkeeping after behavior parity, not reintroduce a second motor or erase existing cold-probe evidence.
