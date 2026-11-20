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

## F.1 — visual transport parity (feature branch, validated pending)
- One pure `downedTransportPresentation` projection reads only the physically
  reciprocal downed TeamActor/carrier link. This policy does not move, heal,
  secure or disclose another actor.
- Successful GO pickup records an optional actor `transportMode` = drag/carry.
  Stop/replan, carrier down, explicit RELEASE, recovery and delivery clear
  that field with the reciprocal link. Older replay frames default missing
  transport mode to low dragging rather than inheriting a future carry.
- Floor Plan distinguishes the lower dragging body from the broad
  across-shoulder carry silhouette; draws a modest connection to the actual
  carrier only for a disclosed real carried actor; does not paint a new
  moving blood stain every frame.
- Tactical 3D shares the same interpretation and keeps the *real*
  interpolated target world position. Carried body elevation matches
  the existing civilian shared-character renderer (carry +10, drag +2);
  the pose solver's local fall offset and IK are preserved and the
  recorded carrier supplies visual heading.
- Focused tests cover true GO timing, both elevations/headings, invalid
  orphan/one-way links, pre-pickup rewind, legacy missing mode, and 2D/3D
  binding of the exact shared projection. No new simulation or film schema.

### Visual acceptance still requires real rendered inspection
- Inspect downed hostile in drag/carry from both sides and both contexts
  (Door Lab doorway and open floor), including carried feet/hand alignment.
- Inspect replay reverse seek over pickup, stop and RELEASE at 2D and 3D.
- If carrier grip remains visibly detached from lifted body, add an explicit
  carrier arm/grip pose in a follow-up instead of claiming this visual pass
  is perfect. This gate is not proven by TypeScript alone.

### CI discipline
- The isolated D15.5F validator runs D15 GO/replay, B6 operator pose,
  EQA3 NPC pose, M3/M4 movement, tactical Pages preflight and build.
- The unrelated old `breach-156.test.mjs` currently asserts a former
  surrender knee threshold and a `ctxFlash` switch inside `breach-main.ts`
  (already factored into its own controller). Both stale assumptions were
  excluded from this narrowly scoped gate; the underlying new tests remain.
