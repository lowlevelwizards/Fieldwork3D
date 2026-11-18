# D3.28A — last verified 45-second physical loop in Motel generated entry

Date: 2026-11-18. **Evidence only; no gameplay implementation yet.**

## Released physical baseline

- D3.27 merged to `main` as **561fb5ac1fcdbd853b2ff20b364c943414e17870**, publicly served via verified GitHub Pages build `561fb5ac1fcd-mwmbwyhs`.
- Independent 22-map × 2-mode frozen corpus, 45 seconds at 60Hz: **161/176 physically arrived**, **37/44 all-four squads complete**, **1 suspected movement loop**, 15 terminal cancellations, no pending physical non-arrivals, zero reported invalid positions/physics-step/plan corruption.

## Exact last suspected loop

- Generated **Motel**, standard frozen scenario index 8, **small**, seed **19143269**, **ENTRY** at FRONT, actor **Ash**, original generated goal **(283,585)**.
- Ash **does physically arrive** at **(286.791,582.770)** with remaining 4.4 units and zero failed or active orders. This is inefficiency, not a non-arrival or unauthorized plan completion.
- Real motor total travel **958.94 world units** despite net displacement **194.28**; **162 direction reversals**.
- Five-second witness:
  - 5–10 s: **171.69 units traveled** vs **8 units net**, negligible or negative goal reduction; one movement-loop classification (not yet sustained).
  - 10–15 s: **208.38 traveled** vs **2.56 net**, goal reduction **–1.83**, sustained movement-loop confirmation.
  - 15–20 s: still **95 units traveled** vs **11.72 net** before eventual recovery and physical arrival.
- Route source progression:
  - `initial-intel` at 0.02 s from (481,588) toward (424,592)
  - `full-body-lane` at 0.87, 1.78 s, repeated ~0.8–1.15 s intervals afterward
  - one `lane-cycle-world` at 2.57 s; followed by renewed `blocked-leg-connector` at 3.58, 4.72 s, `cold-micro-departure` at 5.87 s, then further repeats
  - source reissues at approximately 6.58, 7.48, 9.38, 10.23, 11.02, 11.82, 13.67, 14.52, 15.30 s, often from `(456.0–456.5,601–607)` to the *same next route node* `(464,592)`. The source changes but the feet revisit one furniture-edge anchor without productive movement.
  - None of these first 15s cases are active actual door-traversal episodes; the FRONT leaf episode appears after ~20 s as Ash finally breaks free.
- The original authored and generated order timings are not to be modified for this forensic stage.

## Working hypothesis and bounded roadmap

The next improvement should be **source-independent repetitive detour suppression** at this one measured furniture-adjacent local anchor, NOT changing aiming, door physics, occupancy or entry targets.

1. **D3.28B (selector evidence):** Source-tagged route/motor observation at same original GO and near-same physical anchor, repeated first transient node, low net GO progress, within a bounded time window. Distinguish ordinary small corner corrections from a real 2×5s stationary movement loop.
2. **D3.28C (physical alternative):** After authentic repeated failed departures and before an active door episode, select a *different* full-body microstride-verified lane or original-goal corridor. Do not reissue the same first node. An eligibility claim has a hard per-order cap and reopens on genuine progress. No ghosting furniture or unlicensed window/door traversal.
3. **D3.28D (acceptance):** Exact seed 19143269 entry Ash remains physically arrived with fewer reversals and no sustained movement-loop windows. Fresh 22-map acceptance must keep **>=161/176 arrivals**, **>=37/44 complete squads**, **<=1 suspected loop** (target 0), no integrity violations. Report actual travel distance and direction reversals, not only arrival.
4. **Release:** Commit stages to D3.28 branch, only merge at a separately tested checkpoint after verifying D3.27 Pages success. Do not start extra production releases for diagnostic-only changes.

## Source of truth

- Exact GitHub workflow D3.28 entry witness run [44346495858](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44346495858), success, 45-second seeded full 60Hz stepping, route-quality and transient source tracking, audit JSON artifact.
- `scripts/report-d3-28-motel-loop.mjs` prints `D328_FROZEN_MOTEL` with five-second windows, route source decisions and direction reversals.
