# D15.5E — Incapacitated CAPTURE target physical transport

Baseline: verified, merged living-captive R2A `418053c5012ee9b3a89fedfe7a955b4eaead4c37`.
Release safety: D15.5E remains DRAFT until exact-head critical CI and visual gates pass.
Do not confuse an incapacitated actor (legacy `health <= 0`) with a medically confirmed living prisoner; outcome adjudication belongs to D15.7.

## E.1 — real target authority (implemented)
- Only the mission-designated red downed TeamActor can be authorized across allegiances.
- The carrier must be a living blue operator not holding another casualty. Reciprocal ownership is exclusive.
- This is a read-only GO-time preflight; no body transfer, health change, side swap or teleport.

## E.2 — actual GO transport (implemented)
- Existing EVACUATE plan + timed physical pickup and rechecked observed reach.
- Contextual DRAG CAPTURE TARGET / CARRY CAPTURE TARGET, and explicit RELEASE CAPTURE TARGET while currently carrying.
- Both drag and carry advance the physical TeamActor in bounded swept steps using the existing casualty corridor, live door geometry, and other stationary bodies.
- A carried TeamActor now participates in the shared carrier/body motion rollback, just like the already implemented civilian coupled-transport pipeline.
- Plan cancellation, carrier death, unexpected patient recovery, and GO-time RELEASE detach the exact reciprocal links; no off-screen repositioning.
- The target remains red and never acquires a generated blue player order.

## E.3 — extraction authority (implemented)
- A downed target must actually be in extraction with an actual carrier or verified same-zone physical contact. The operator alone cannot resolve CAPTURE remotely.
- Living restrained/surrendered target escort still follows R2A's separate extraction contract.
- A health-nonpositive body being physically present is **not** itself proof the prisoner is alive.

## E.4 — targeted acceptance (running)
- `tests/dispatch-d15-capture-transport-eligibility.test.mjs`
- `tests/dispatch-d15-capture-transport-go.test.mjs` now covers: drag/carry 60Hz bounded movement, remote-win rejection, observed pickup, replay carrier links, closed-threshold sweep denial, stationary-body denial, two-body arbitration rollback, explicit GO release, cancellation, carrier casualty, and patient status change.
- Branch-scoped D15.5E validator additionally runs civilian transport, D9/D15 escort, M3/M4 doorway/queue, exact Pages tactical preflight, TypeScript and Vite production build.
- Validator branch only; intermediate feature commits use `[skip ci]` to avoid the broad production Actions fan-out.

## Remaining before E public release
1. Verify exact-head targeted CI is green; correct failures on the feature branch, revalidate.
2. Review 2D and 3D carried-vs-dragged hostile depiction and replay at doorway and stationary-body contact, including no floating/sliding. No unverified visual assertions.
3. Reconcile main (including Beretta D4) without losing source changes; verify previous public Pages commit and idle deployment queue before merge.
4. D15.6 conditional escape/rearm/actual secondary remains a separate, unimplemented stage. D15.7 medical outcome and debrief semantics are not implied by D15.5E.
