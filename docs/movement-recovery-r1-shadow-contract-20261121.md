# R1 — Shared recovery proposal contract and shadow-only adoption policy

Date: 2026-11-21. Builds on the merged R0 inventory and its 36 audited
route-transition call sites. **R1 is a contract and observational comparison,
NOT an enforcement or gameplay balancing release.**

## What exists

1. The **pure** module src/breach-recovery-adoption-contract.ts provides
   exhaustive RouteSource classification, proposal payload, explicit evidence,
   owner precedence, typed reason codes, and a deterministic evaluator.
2. The **opt-in** module src/breach-recovery-shadow.ts snapshots an existing
   route adoption or rejection, runs the evaluator, and emits a diagnostic
   result. It has no observer in normal gameplay and never edits an actor.
3. src/breach-route-transition.ts invokes the shadow witness *only when an
   observer has been installed*, after the original writer already selected
   its route. The original set/prepend and D3.28 recurrence event retain their
   previous sequence and ownership.
4. tests/movement-recovery-r1-shadow-contract.test.mjs exercises every
   decision family, exceptional route transition, source exhaustiveness,
   snapshot isolation, and zero-authority observer behavior.
5. scripts/verification/movement-recovery-r1-shadow-audit.mjs compares the
   actual production fixed-clock door motor with the listener OFF versus ON
   on the same deterministic outward-left four-operator door range scenario.

## Proposal contract

Each proposal has the RouteSource, operation (replace, prepend, or
observed-prepend), source family and intent, required clearance class, priority,
expected real progress class, actor/GO/order identity, physical anchor,
before/after transient routes, owner and door context, retry timestamps, failed
recovery count, blocked time, and **five separate evidence slots**:

| Evidence | Allowed states | Meaning |
| --- | --- | --- |
| eligibility | pass / fail / unknown | Specific strategy's real eligibility |
| clearance | pass / fail / unknown | True physical clearance for that profile |
| cooldown | pass / fail / unknown | Actual cold search/retry budget |
| recurrence | pass / fail / unknown | Cross-source same-anchor loop status |
| progress | pass / fail / unknown | Specific physical progress test is credible |

The shadow witness intentionally initializes all five slots to **unknown**:
the route assignment point does not know which branch-specific sweeps and
claims already ran in its caller. It must never manufacture evidence from
the mere fact a route was adopted. R2 can carry explicit verified evidence
from strategy selectors, without reimplementing collision.

## Evaluator rules and what a difference means

The evaluator reports one of:

- **exempt:** non-recovery transitions (initial acquisition, order sequencing,
  passage retreat, or diagnostics), and the special empty-route clear
  performed after a REAL door-overlap escape.
- **would-reject:** empty/NaN recovery path, stale authored order, explicit
  ineligibility, or explicitly blocked physical clearance.
- **would-defer:** a higher-priority active owner, explicit cooling-down,
  repeated stalled route, or explicitly ineffective physical progress.
- **requires-evidence:** no definitive failure, but not all five independent
  facts have been supplied. This is the normal expected R1 result.
- **would-adopt:** all five explicit proofs pass and no active owner forbids
  switching. Even this result is *advisory*, never permission to move.

Every actual route adoption emits an optional
RecoveryShadowRecord(actual='adopted'); a passage in-place prepend emits
actual='observed-prepend' and does **not** write the path twice; a diagnostic
door-handoff rejection emits actual='rejection-witness'. The compare field
differsFromActual only marks explicit hypothetical would-reject/defer
against an actually adopted route. It is **not** a failure in R1 because
the contract is still provisional and may lack caller-specific exemptions.

Classification of a shared source such as lane-cycle-world is conservative;
it can be emitted in door or STACK situations. R2 must refine the contextual
precedence before allowing any policy to block gameplay. A door-managed
prefix may legitimately finish at the next operable door rather than the
player's far GO, and a squeeze route must not be judged by full-body
clearance. The desired architecture retains the existing motor and all
door/stack/passage/collision authorities.

## Shadow parity and verification commands

    node scripts/verification/movement-recovery-r0-audit.mjs --check
    node --experimental-strip-types --test tests/movement-recovery-r0-inventory.test.mjs
    node --experimental-strip-types --test tests/movement-recovery-r1-shadow-contract.test.mjs
    node --experimental-strip-types scripts/verification/movement-recovery-r1-shadow-audit.mjs --check
    node --experimental-strip-types --test tests/door-traversal-d2d3-four-operator.test.mjs
    npm run build

The R1 real-motor audit returns event counts by verdict, rejection reason,
and recovery family, plus hypothetical disagreement counts. It fails if
actual positions, navigation, authored/remaining orders, door fraction,
physical blockage or actor state differ between two otherwise identical
runs. It is a read-only observer A/B, not a selector-performance benchmark.

No new broad workflows, release jobs, world-state fields, A* calls or
per-frame evaluation are introduced. Existing fixed-clock regression and
all R0 frozen seeds remain unchanged.

## Exit criteria / next stage

R1 is complete when:
- every RouteSource has a reviewed typed descriptor;
- reason codes are deterministic and explicit missing evidence is not
  interpreted as a pass;
- existing route adoption and special invalidation/observer mechanics are
  unchanged;
- errors in a diagnostic listener cannot prevent the motor from assigning a
  route;
- an actual deterministic session shows parity between shadow off/on;
- production check and release readiness pass.

**R2** will start migrating ordinary obstruction recovery **callers** to
supply verified evidence before a real policy ever enforces an adoption
decision. Preserve R0 call-site inventory; do not erase order ownership or
change actual movement as part of R1.

## Release

Merge only once targeted tests and CI pass and the prior exact-build Pages
deployment is verified. Pages is triggered by the normal main merge; do not
manually queue a duplicate deployment or claim its public visibility before
the production release workflow and served build stamp are confirmed.
