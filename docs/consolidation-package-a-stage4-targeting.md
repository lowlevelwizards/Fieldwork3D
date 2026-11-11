# Package A — Stage A4: Consolidated tactical targeting state

**Baseline:** A3 deployed `004ab30989912eb7549972f51092e0dc45c139b9`. **Scope:** one authoritative, mutually exclusive *temporary targeting intent*, not a second command/planning system.

## Audit and corrections to the original scope

Existing temporary targeting flags are independently mutable in `breach-main.ts`:
`hudController.facing.looking/lookMode/armedOrigin`, `flashMode`,
`flashDoorId`, `pushMode`, `firePlacement`, and `evacMode`.
Different command entrypoints clear different subsets, allowing unsupported
combinations (e.g. push + evacuation, or flash + suppress). Back checks most
but **not push**, which may delete a waypoint instead of cancelling. The
Cancel control is not shown for push or casualty transport. Replay, GO and
selection changes also clear inconsistent subsets.

Selection is *orthogonal*: `selectedNode` and `selectedActiveWatch` are
editing/selection state, not armed intents. Persistent authored WATCH is part
of the operator plan and must **never** disappear when temporary WATCH arming
is cancelled. `doorFocusId` denotes visible selection; only a specifically
armed door FLASH stores the selected door ID, and no other command may inherit
it. Pointer preview and feedback are read-only; no knowledge query or geometry
snapping may occur on hover.

Existing gesture, planning and simulation modules are the authorities on
pointer arbitration and actual command acceptance. A4 does not move any of
them or change RNG, 60 Hz progression, replay historical disclosure, orders,
door physics, casualty validation, or 2D/3D map hit testing.

## A4.1 — One discriminated targeting owner

Add `src/breach-tactical-interaction-state.ts`, pure and browser-independent.
It owns exactly one active value:

- `none`
- `look` or `watch` with selected-origin `here|end`
- `flash` with optional *explicit* door ID
- `push`
- `suppress`
- `evac` with patient ID and `drag|carry`

No separate mutable command flags or alternative HUD-owned facing state.
Commands to arm a new kind **replace** the previous kind atomically;
LOOK/WATCH on the same mode toggle off on repeat; FLASH on the same toolbar
toggles off; re-arming push/suppress/transport replaces previous target data.
`cancel()` and `reset()` only clear transient intent and return whether
an intent existed; do not undo/delete routes, erase persistent watches or
modify selection. Origin and door are carried *only* in the applicable type.

**Commit rules, matching legacy gameplay:** Successful LOOK/WATCH, FLASH,
push, and suppress placement disarm; a rejected attempt remains armed for
correction. Evacuation consumes the destination prompt on the first attempt
regardless of success, preserving prior one-shot behavior. Door FLASH
remains the only mode that invokes `planDoorFlash`; normal FLASH remains
`planFlash`. Every switch clears stale door/patient context.

## A4.2 — Integrate actual input and presentation

- Main composes one shared instance and replaces all direct writes to
  `hudController.facing` and the old booleans with explicit arming,
  `cancel`, `consume` and `reset` methods.
- The HUD receives the injected owner (or creates one for standalone tests);
  `facing` is a **derived read-only compatibility view**, not a second writer.
  Guidance, target prompt and Cancel button derive from the same mode,
  including PUSH, SUPPRESS, DRAG/CARRY.
- Palette actions, toolbar FLASH, medical DRAG/CARRY, and keyboard LOOK/WATCH
  use the same arbitration. Block new arming during replay or execution.
- BACK/Cancel/Escape always cancels active targeting **before** any waypoint
  deletion or selection clearing, including PUSH. Keep the BACK button
  **enabled for any armed target or selected active WATCH even when no plan
  node exists**; preserve held WATCH selection/deselect behavior when nothing
  is armed.
- Operator changes, mission replacement, replay entry and GO/PAUSE clear
  transient targeting; no action persists accidentally to a different actor,
  session, recording or simulation phase.
- Pointer and frame feedback read the same owner via derived
  `isFacing/isArmed/flashMode/pushMode/evacMode/firePlacement`. Keep
  canvas touch/gesture controller untouched; do not move plan commands.
- The feedback layer continues to see exactly one transient mode; no
  increase in hidden-information access or per-frame geometry work.

## A4.3 — Verification and acceptance

1. Pure transition matrix: all six modes cannot coexist, repeated modes,
   origin/door/patient isolation, cancel/reset, operator changes, replay/GO,
   single-attempt evacuation and success-vs-rejection retention.
2. Real HUD tests for labels, Cancel visibility, preview, hints, and
   persistent WATCH; keyboard/Back cancellation before removing route.
3. Authored plan/physicality tests, canvas-gesture and pointer-release
   tests, 2D projected feedback, replay and mission restart acceptance,
   including existing Stage 4/Stage 7 integration.
4. Run curated critical 60 Hz/replay and architecture boundaries,
   production TypeScript/build, and real-WebGL phone/desktop tactical,
   replay and Operator Lab browser acceptance.
5. Commit on feature branch. Merge only after checks are green and prior
   Pages deployment succeeded. Verify published Pages stamp equals the
   merged commit. Physical-device verification remains separately pending.

## Explicit non-goals

No wholesale UI redesign, LOOK/WATCH semantics change, change to nearest
door logic, new aiming states, automatic target selection, plan-state
ownership migration, expanded medical mechanics, multi-input redesign,
A5 replay-options rework, or A6 main-controller extraction.

**Definition of done:** Every arming/cancellation/consumption path is backed
by one authoritative discriminated owner; target UI/pointer previews have
no competing mutable flags; existing gameplay is unchanged except fixed
mode exclusivity and correct Back/CANCEL behavior; all regression and
release gates pass; public build is verified.
