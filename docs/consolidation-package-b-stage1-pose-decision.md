# Consolidation Package B — Stage B1: authoritative pose decision contract

**Depends on:** B0 audit branch `refactor/consolidation-b0-pose-baseline`, head `a04173c8c7e54495287ce71c486cf199dbccd363`. Do not merge or deploy B1 before B0's final-head checks, merge and exact served Pages release all succeed.  
**Status:** implementation in a dedicated feature branch, pending validation.  
**Release policy:** one isolated B1 PR and production checkpoint; no concurrent Pages deployments or merge while another build is queued.

## Goal

Replace scattered *decision assembly* inside the 1,183-line `breach-operator-animation-controller.ts` with a **single immutable-by-contract presentation decision**, using the already authoritative pure director, action/hand owner reader, locomotion sampler, weapon handling and transition policy. This is the **B1 read-only policy stage**, not B2 staged transform outputs, B3 new lower-body solver, B4 gun/hand rewrite or B6 removal of working-rig mutations.

The current code has a pure `directOperatorPose` and `planUpperBodyStrategy` but calculates locomotion in a different module, short-stock/manual Lab precedence in the controller, and upper-body strategy much later. B1 centralizes *those existing choices* without calling `sampleHandlingTransition` more than once and without mutating its `OperatorRig` history, motor, `OperatorPose` inputs, recorded foot targets or output buffers.

### Complete implementation scope

**B1.1 — Input/authority contract**
- Use the existing `OperatorPose` and `PoseDirectorContext` types. Preserve all optional flags and fallbacks (Lab V3, strict contact, V4 reload, weapon configuration, low/high/ready/point/ADS/short, moving, crouch, injury, down, surrender and action timing).
- Introduce a compact `breach-pose-decision.ts` pure policy composer, **not a controller, cache, clock, solver, state store or new render scene**.
- Expose an explicit two-phase interface for the unavoidable existing temporal handshake: `prepareOperatorPoseDecision(p,context)` produces a *read-only seed* containing locomotion, action/hand ownership and selected handling; the one existing `sampleHandlingTransition(r,p,handling)` remains the rig-scoped history owner; `resolveOperatorPoseDecision(p,seed,sample)` produces the one final typed `OperatorPoseDecision`.
- The final result is presentation-only: pose mode, physical speed/travel/crouch, action priority, left/right hand ownership, short-stock owner/progress, sampled transition and profile, and eligible upper-body strategies. It owns **no bone transforms**, and does not advance simulation or foot scheduling.

**B1.2 — Preserve exact policy and precedence**
- In treatment, legacy low handling wins over Lab manual handling; down/surrender/reload/throw/door/push/wound hand owners continue using the existing action reader.
- A firing/live obstruction chooses existing short stock with the same local/physical clearance source. Manual authoring, auto proximity, and history transitions cannot simultaneously control the same short-stock progress.
- `manualShort` stays disallowed during down, surrender, reload, treatment, throw, door, empty/preview arms or already claimed hands. `nearingWall` is based on actual explicit `shortCompression`, not a guessed proximity.
- Explicit Lab switch accepts an authored transition only under existing `poseV3Preview`, down/reload and handling-override guards. In deterministic replay, passive history remains ignored and no render-frame dt reassigns a target.
- Keep `planUpperBodyStrategy` as the one eligibility policy and preserve the low-ready, modular-build, transition, peek and interaction gates. It must consume the final short-stock transition decision, not calculate a second one.
- `poseWeight` stays exactly governed by existing Lab override/down/surrender rules; no pose silhouette or contact easing is retuned.

**B1.3 — Rewire only the entrypoint's decisions**
- `breach-operator-animation-controller.ts` calls the pure preparation once, samples foot contacts through the unchanged scheduler, calls existing transition sampler **exactly once**, resolves the final decision once, and consumes its named members.
- Keep the original stage ordering, single final `commitOperatorPoseOutput`, rig-owned `r.handlingProfile`, creation/disposal, procedural working transforms, muzzle/shot and collision, all weapon and magazine choreography unchanged.
- No new allocations in the physics clock; decision structs are render-only and bounded. No second animation controller or renderer-owned authoritative action state.
- Do not move or merge `breach-operator-pose-output.ts` (B2/B6 successor).

**B1.4 — Focused tests and parity**
- New B1 pure policy matrix for handling: low, high/door, ADS/engage, blocked short, manual short, recoil/aim, travel/crouch, warning/treatment, throw, door, reload, down, surrender, injury and retained previous-handling dwell.
- Explicit source/action invariants: one action owner sample, one transition sample per evaluator, one upper-body strategy evaluation, only one final pose commit and no new simulation clock.
- Golden compatibility assertions compare B1 output to *the prior pure policies*: raw `directOperatorPose`, `resolvePoseLocomotionFrame`, `planUpperBodyStrategy`, `blendedHandlingProfile` and `sampleHandlingTransition` for equivalent inputs.
- Keep the existing physical pose regression matrix: Stage 11, Closeout Stage 4, all-weapons short-stock, V3/V4 reload, deterministic seek, pose stability, motion 22, muzzle/hand/stock fit and Lab/Studio operations.
- Run the B0 census on B1 sources; require updates to ownership documentation only for intentional change.

**B1.5 — Tests and release checkpoints**
- Maintain B0's read-only census and store B1 parity test evidence as CI artifacts. Add B1 new module/test to the Package B path-scoped workflow, without replacing or weakening B0's admission criteria.
- Primary CI, architecture, dedicated animation, real WebGL phone/desktop tactical/replay/Operator Lab, and TypeScript/Vite build must pass.
- If B0 is still queued, complete B1 on its branch but **do not** merge or deploy. Once B0 is released, rebase/merge onto B0's exact main merge SHA, retest final head, check previous production release, merge once and verify new public Pages stamp.

### Definition of done

1. All B1.1–B1.4 scope implemented, with pure decision/seed types, no new operator runtime clock or pose-output owner.
2. Entry-point consumes the decision, no copied duplicate manual short-stock/transition gates or upper-body eligibility assembly left in the controller.
3. 10+ domain-specific matrices and existing physical/pose replay tests green.
4. No rewrites to authoritative game simulation, recording, visual muzzle, all-faction/equipment appearance, movement/clearance, or Campaign persistence.
5. B0 precedes B1 in `main`, release is independently verified, production Pages matches B1 merge SHA.
6. Any deferred anatomy, IK, grip, magazine, footstep, workbench, V3/V4 retirement and visual tuning explicitly handed to B2–B8.

## B1 intended decision shape

```ts
type OperatorPoseDecision = {
  locomotion: PoseLocomotionFrame;
  handling: Handling;
  action: ReturnType<typeof resolveOperatorActionState>;
  shortStock: { manual: boolean; proximityControlled: boolean; rawProgress?: number };
  transition: { active?: HandlingTransition; authoredLabSwitch: boolean };
  profile: HandlingProfile;
  upperBody: UpperBodyStrategy;
  poseWeight: number;
};
```

**Successor guidance:** B2 uses the typed decision and existing bounded output slots to replace *intermediate transform mutation* in small, golden-parity steps. B1 deliberately leaves current coupled weapon, hand, lower-body and reload transforms alone.
