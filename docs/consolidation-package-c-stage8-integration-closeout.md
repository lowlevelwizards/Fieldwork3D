# Consolidation Package C — C8 Integration, Regression Verification & Closeout

**Feature branch:** `refactor/consolidation-c8-integration-closeout`, stacked on validated C7 at `600eb9695243826fee368c9781ab5d1a76d59c15`.
**Release baseline:** C6 merge `dced6648` plus non-overlapping P1.5 on `main` at `04b90827`.
**Release policy:** One combined C7+C8 checkpoint when prior Pages serves its exact build stamp; no concurrent deployments and no new source extraction without evidence.

## Goals

Prove that C0–C7 contracts coexist for physical mission Sessions, 3D scene ownership, 2D physical interpretation, cross-view fog, tactical UI, replay/Director, procedural world contracts and mission/faction semantics. C8 is not a rendering upgrade, gameplay rebalance, new world layer or additional application controller. Only remove unused compatibility glue if its removal is demonstrably safe; intentionally retained legacy fixed studies, scene/lab renderers, and replay adapters are not dead code merely because static scans find multiple paths.

## C8-A: Final ownership and subtraction audit

- Reuse C0's 19-owner census; add no new runtime owner.
- Read the nine C0–C8 stage docs and tests, inspect cross-owner source anchors, and produce deterministic JSON/Markdown SHA-256 evidence via `package-c8-integration-audit.mjs`.
- Protect existing scene lifecycle, 3D/2D actor disclosure, physical pane geometry, replay manifest, encounter mission selection and actual briefing population truth.
- Preserve scoped Studio and Operator Lab renderers. Do not delete any compat path based solely on call-site text counts.

## C8-B: Real cross-contract scenarios

Add `package-c8-integration-closeout.test.mjs`:
- Generated seeded CAPTURE, INTEL and RESCUE missions: exact window geometry, hostile group contract, initialized armed/civilian forces, actual briefing counts, mission identities and recorded replay manifest.
- Build background replay Session while live Session owns presentation; it cannot steal live map/cover and changing visual identity cannot alter health or side.
- Restart reconstructs a separate world with the same physical site, target and selected contract.
- Explicit INTEL override on a saved map preserves the original encounter plan while the gameplay/film reports the chosen mission.
- Audit is read-only and fails closed on missing stage documentation or required ownership boundaries.

## C8-C: Inherited regression matrix and mobile/performance limits

Extend the existing Package C workflow; run C0–C8 tests, core A8 Session geometry, mission/restart, replay personal knowledge and C7 semantic tests. Retain inherited Architecture critical build/typecheck, browser tactical-flow and Replay/Operator Lab real-WebGL jobs. Keep the P1.5 measurement HUD and C6 window/barrier surfaces unchanged. Headless CI is not actual iPhone Safari FPS, thermal or screenshot approval; these remain manual acceptance.

## C8-D: Release closeout

1. All required PR jobs on the exact final C8 head must be successful. Skipped optional workflows are not a passing test but may be intentionally excluded by path conditions.
2. Recheck compatibility with the then-current main. Resolve conflicting P1/UX work in the branch and rerun critical CI.
3. Verify previous Pages Actions success **and the actual served build SHA** before a merge. GitHub Actions success alone is insufficient.
4. Merge C7+C8 as one logical release batch, not two simultaneous Pages runs; reconcile or close superseded C7 PR with explicit provenance.
5. Check new Pages run succeeded for the exact integration merge SHA and the publicly served build stamp matches. Only then declare **Package C closed**.

## Implementation ledger

- [x] Final scope identified as integration, regression and closeout, not a new presentation subsystem.
- [x] C7/C6 and current main release compatibility examined.
- [x] Cross-contract tests, deterministic source audit and CI evidence handoff added.
- [ ] Exact final C8 PR checks green on feature head.
- [ ] Prior public Pages stamp verified before merge.
- [ ] C7+C8 consolidated release merge and exact deployed stamp verified.
- [ ] Package C officially closed after production acceptance.

**Explicit non-goals:** change worldgen seed/topology, physical collision, AI/firearms, campaign schemas, 2D/3D disclosure permissions, replay historical data, lighting/shaders, weapon/pose rigs or on-tick validation.
