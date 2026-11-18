# D3.30I — final deterministic physical integration gate

**Status:** staged after D3.30H on its separate stacked feature branch; no main merge or production deployment.

The dedicated workflow runs the critical Stage H–I tests, TypeScript, deployable build, exact independent 22-map 45-second physical replay and 11-map historical parity. It reuses D3.29's real locked-door cancellation classifier and D3.30D's 88-operator evidence gate rather than loosening physical standards. It rejects missing physical witnesses, illegal locked-leaf movement, false completion/arrival, loops and physical integrity failures. Both frozen corpora preserve their original seeds and 2700 fixed 60Hz ticks.

Baselines: 154/176 physical arrivals, 35/44 complete squads and 22 witnessed locked non-arrivals on frozen22; 75/88, 16/22 and 13 witnessed locked non-arrivals on historical11. Successful explicit retries must be reported in intervention-specific audits rather than credited to the frozen no-intervention results.

Full JSON evidence is uploaded even on failure. Do not merge until the A–G production checkpoint is deployed and verified, H–I acceptance is green, latest main is reconciled and no production release is pending.
