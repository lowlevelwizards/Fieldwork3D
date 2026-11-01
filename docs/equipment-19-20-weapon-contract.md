# Equipment 19/20 — authoritative weapon contract (stage 00)

## Existing authorities audited
- `breach-combat.ts`: canonical four weapon IDs, magazine capacities, firing interval, acquisition, damage, penetration, noise. Keep authoritative.
- `breach-ballistics.ts`: fixed-step shot spread, yaw, recoil impulses, recovery, angular tracking. Effects must be deterministic and never depend on render delta.
- `breach-weapon-pose.ts`: fixed receiver-local stock/primary/support grip contact, rigid weapon transform, short-stock and ADS. Preserve both-hand reach and the stock pocket.
- `breach-handling-profiles.ts`: six authored silhouettes; do not substitute a generic fallback.
- `breach-muzzle.ts`: shot-time physical muzzle, originating at x=19.5 times GRIPS lengthScale through fitWeaponPose. Render muzzle must match it.
- `breach-weapon-clearance.ts`: non-blocking muzzle retraction via assessFireLane and shared weapon fit; never change operator collision capsule to fit a gun.
- `breach-operator-rig.ts`: visible weapon is chest-child, scaled by GRIPS.lengthScale, rigidly matches fitWeaponPose. Magazine and dropped-gun geometry are presently separate. Rig is also used by CampaignKitPreview.
- `equipment-loadouts.ts`, `campaign-state.ts`, `breach-roster.ts`: ownership and snapshots; one normalized weapon configuration per operator with legacy defaults, weapon swap validation, no ammunition mutation.
- `breach-replay.ts`: snapshot the chosen weapon configuration and state if it ever influences firing; avoid reading mutable live loadout during replay.

## Stage sequence
1. Pure authored platform and attachment metadata with schema, compatibility, physical anchors, deterministic normalized resolver.
2. Distinct base meshes + modular parts (no combat changes until actual shot-time muzzle and visible tip agree).
3. Persistence and editor for campaign/quick play, then shot/render propagation.
4. Grip/stock/sight, handling, recoil, clearance and AI sound integrations.
5. Lights/slings, ownership, focused regressions and mobile perf.

## Invariants
- The same resolved geometry drives visible barrel tip, shot-time muzzle and clearance.
- No attachment changes base weapon calibre, magazine ID, reserve ammunition, or armor.
- All runtime per-frame/per-tick calculations use cached numeric derivations; Three.js is only needed for transform and render.
- Missing/malformed persisted configurations normalize safely; incompatible options never become equipped.
- Sprint prevents shooting; short-stock clearance never displaces the operator.
- Avoid per-frame geometry creation and unbounded materials.
- Keep core four weapons balanced and reversible; unmodified weapons remain baseline until simulation is explicitly activated.
