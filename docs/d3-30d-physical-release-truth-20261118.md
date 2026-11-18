# D3.30D — historical lock truth acceptance, 18 November 2026

Base PR #1738, feature branch `feature/d3-30-interrupted-entry-recovery-20261118`. D3.29F/G and H/I establish the lock-respecting frozen 22-map truth **154/176 physical arrivals, 35/44 full squads, 22 witnessed terminal locked-door non-arrivals, zero sustained loops**. The prior 161/37 count credited seven illegal locked-door crossings and must not be restored by test threshold changes.

The existing 11-map, 45-second mainline workflow failed despite valid physics. Its captured fixed-seed result was 75/88 physical arrivals, 16/22 complete squads, 13 terminal locked cancellations, 0 false arrivals, 0 loops, 7 stalls, 2 retries and 2,427 route searches. The old gate required 79/88 and 18/22 based on invalid earlier crossing behavior.

This stage changes **validation only**. `scripts/lib/d3-30-physical-gate.mjs` checks real per-operator non-arrivals against their terminal failure reason and *selected physical door evidence at cancellation*; it rejects missing evidence, illegal locked-leaf movement, fabricated arrival credit, nonlock cancellations, movement loops, plan corruption, and cost regression. The exact 11-site/2700-tick corpus and conservative existing cost limits remain frozen. It does not weaken physical collision or modify authored orders.

**Release behavior:** The focused D3.30 stage workflow runs just TypeScript and critical tests on branch pushes. The 11-map and 22-map physical acceptance runs at release checkpoints, not after every tiny commit. Historical workflows with stale D3.25 thresholds should be treated as legacy diagnostics rather than overriding this physically audited D3.29/D3.30 gate.
