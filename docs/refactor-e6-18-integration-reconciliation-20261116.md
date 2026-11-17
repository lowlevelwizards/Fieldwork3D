# E6.18 unified reconciliation / release checkpoint

Both E6.18 feature branches were compared to current main at
`8cea6fb099fdd291a88d66840e55e4af8384b4ad`. PR #1608 adds opt-in per-draw source-family attribution;
PR #1610 adds owner-scoped residual static merging. They modify no
common source paths and remain independently reversible.

## Verified source evidence and conflict resolution

PR #1610 succeeded on seed 23: **1082 -> 1081** p95 non-shadow
draw calls, 90 real executing frames; seed 97: **1237 -> 1231**.
It preserved shadow submissions and had 0 browser JS errors.
Its original 40 scoped Node tests and production build passed.
The improvement is real but small: **one to six draws per frame**,
not an FPS improvement or a reason to compromise aesthetics.

PR #1608 was blocked by one unit-test fixture lacking the required
`sceneBreakdown` for `PostReadyRuntimeCapture`. The integration
fills in that fixture, without changing the runtime capture contract,
and requires source families be present in the E6.18 browser evidence.

The integrated workflow checks both sets of unit tests, static
resource-lifetime exclusions, production build, and fixed-seed A/B.
The unchanged E6.17 workflow also runs on the integrated provenance
files. Live testing must prove main-pass/shadow reconciliation.

## Invariants

No geometry changes to moving doors, operator rigs, furniture with
dynamic state, shadows, fog-of-war, LOS, simulation, transparency or
site material identity. The static optimizer runs after old cross-owner
instancing; decoration and fixed-frame batch visibility stays owned
by each original parent. E6.18 provenance instrumentation only runs
when explicitly `?coldBench=1`. Both changes are auditable, and
the `?e618Batch=0` diagnostic escape hatch remains.

Before merging: check integration test statuses, current main HEAD,
successful previous exact-build Pages verification, and no ongoing
deployment. Release as **one** merge and verify its own public build
stamp. Close superseded PRs #1608 and #1610 only after the integrated
release is safely merged.
