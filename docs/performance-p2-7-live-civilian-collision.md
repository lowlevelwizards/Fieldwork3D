# P2.7 — Live-frame civilian and collision recovery

## Device evidence (seed 20, iPhone, November 12)
837 live callbacks; 197 >=33ms; 11 >=67ms; worst 340ms.
- RAF 340ms, previous JS 333ms / SIM 319ms: civilian-motion 317ms.
- RAF 218ms, previous JS 212ms / SIM 198ms: Vale motor-collision 197ms.
- A separate RAF 155ms was UI/audio 116ms; 251ms RAF included 208ms callback wait (unconfirmed).
These are prior-frame CPU costs, not measured GPU execution times.

## Changes
1. Civilian refuge selection: compute the expensive LOS-based score exactly once per eligible candidate before sorting; preserve the exact old score, stable sorting, x/y ties, six route attempts, safety constraints and deterministic decisions.
2. Operator collision recovery: up to 13 full-body lane probes may each repeat thousands of identical passability checks. Memoize the exact point/radius boolean only inside that single synchronous call. The memo never survives a door swing, furniture revision, tick, mission or replay. Full physical sweep clearance and every candidate remain unchanged.
3. Under ?perf=1, split civilian-motion CPU into response, step and shared physical authority, including per-person detail. Nested measurements are observational and not additive; compact COPY shows the three largest children when the parent is hot.

## Release gates
- Compare new refuge result with legacy oracle and verify fewer LOS queries.
- Compare recovery waypoint arrays with the original algorithm and verify no extra passability calls.
- Confirm fixed-step simulation, civilian, actor, event and replay parity with/without CPU probes.
- Run targeted civilian/doorway regressions, runtime/mobile acceptance and production build.
- Merge only when checks and previous Pages release are green; verify exact new served commit.

## Follow-up
Use seed 20 with civilians enabled and actual contact/movement. Capture live RAF >=33/67 rates and new detailed SIM attribution. 512px shadows and normal rendering cadence remain unchanged. First-load CPU does not count as success.
