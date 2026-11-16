# Dispatch D6 — Policy-backed SWAT appearance depth

## D6.0: asset and state audit
The existing 2015 SWAT reference is already authored and visibly distinctive:
police-specific helmet silhouette (with raised visor), dark BDU top/trousers,
soft vest, micro-rig, gloves, black textiles, fixed SWAT marking and issued AR.
The relevant appearance system already supports three selected SWAT-compatible
solid fabric channels, glove dye, skin tone, haircut, hair color, sleeve and
trouser-hem adjustments. None require new models, inventory or materials.

Do **not** claim this recreates a real department's approved equipment issue.

## D6.1: exactly scoped choices
- Operator identity: existing skin tones, haircuts and hair tones.
- Uniform appearance: existing black, deep navy and charcoal solid colors
  for BDU top and trousers; no new camo prints, garment cuts or armor types.
- Glove appearance: existing black, navy, charcoal dye; possible gloves on/off
  style where the actual issued equipment resolves to that style.
- Sleeves: supported BDU unrolled/cuffed/rolled states; trouser hem
  unbloused/bloused/cuffed.
- Headwear/helmet cut, visor configuration, patches/markings, armor/rig,
  eyewear, medical mounts, plates, weapon and kit MUST remain unchanged.
- Existing unclassified/legacy visual properties are retained even if not
  selectable, rather than silently reset by a new clothing policy.
- Policy validates exact normalized diff, existing item IDs, actual kit
  compatibility and canonical D2 Dispatch availability. Outside Dispatch,
  no new restriction is imposed.

## D6.2: Operator Studio integration
- Open embedded Studio from real Dispatch campaign controls. Host marks
  the session as Dispatch *only* when the actual campaign rules say so.
- Studio shows a focused, limited 3D editing panel rather than offering a
  vast unsupported catalog whose values are rejected on save.
- Standalone Studio opened on a Dispatch campaign reads the same restriction.
- Batch apply validates **all** operators before changing any of them.
  An invalid edit aborts the whole batch. The campaign-state setter also
  enforces the exact same policy, so direct callers cannot bypass Studio.
- Existing Studio frame protocol remains same-origin and gameplay remains
  owner of campaign persistence, rollbacks and active-contract locks.
- No new inventory fields, squad score or weapon/armor simulation changes.

## D6.3: lifecycle and regression
- Existing squad and newly recruited operator: preview -> customize ->
  validate -> save -> reload -> deploy -> debrief -> career continuation.
- Test allowed looks, reject uniform silhouette/helmet/marking/weapon
  changes, cross-operator atomicity, active mission lock, serial ownership,
  legacy/Quick Play freedom.
- Verify that Studio and campaign UI offer only the safe subset and
  nothing runs in the tactical renderer/hotpath.
- Commit stages independently. Group compatible commits into one release
  checkpoint after CI, typecheck/build, fresh main integration and Pages
  preflight. Never merge during another queued/running deployment.

## Deferred
Helmet accessory customization, ballistic visor options, patch editing,
alternate unit looks, extra police departments, sidearms, surrender,
arrests, negotiation, police-only objectives and unrestricted wardrobe/
Arsenal editing.
