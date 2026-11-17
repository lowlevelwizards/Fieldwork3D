# E6.18a — identify actual non-shadow draw-source families

## Why this stage
E6.17's four real-browser 90-live-frame Chromium SwiftShader runs show
1082/1237 non-shadow p95 draws (seed 23/97), with about 367/430 unique
materials. Of the submitted draws, named environment owners account
for 52,194/64,978 over 90 callbacks and operators 43,708/43,456.
Transparent draws are ~451/503 per frame. These are **draw submissions**,
not GPU timestamp measurements or iPhone performance.

The E6.17 top material IDs (for example, 368 and 369) are per-process
Three IDs, not source file or mesh identities. Arbitrarily merging materials,
changing transparent render order or reducing moving shadow fidelity here
would risk visual, disclosure and replay regressions.

## E6.18a implementation
Under the preexisting explicit ?coldBench=1 main-pass capture only:
- Group actual non-shadow renderBufferDirect draw deltas by render owner,
  nearest named mesh/parent (or explicit fieldworkDrawFamily), geometry
  type, material type and opaque/alpha-test/transparent classification.
- Use '[unnamed]' instead of inventing origin labels. No global mesh
  scans, raycasts or UUID-based cross-run reconciliation.
- Preserve actual E6.16/E6.17 shadow and main-pass draw reconciliation.
- Store only the top 16 families **per frame**, then pool observed
  draws for the top 16 in the bounded 90-live-frame export. Aggregate
  values are sampled lower bounds, not full totals. Existing E6.17
  material and owner counts remain full and unchanged.
- Do not mutate materials, geometries, transforms, cutaways, shadows,
  fog, simulation, the tactical camera, RAF cadence or rendering.

## Acceptance
Run E6.18a/E6.17/E6.16 unit tests and production typecheck/Vite bundle.
Existing E6.17 four-run live-browser workflow checks 90 real execution
callbacks, no browser errors and 360/360 draw reconciliation. A follow-on
consolidation stage must select a **named, static, visually equivalent**
source family and show per-seed draw deltas and screenshot parity before
any change to the render graph.

No claim of faster hardware rendering or fewer draws is made by this
instrumentation stage. Merge only at the user's release checkpoint, after
all critical gates and the prior Pages exact-SHA deployment are verified.
