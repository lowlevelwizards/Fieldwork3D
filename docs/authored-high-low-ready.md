# User-authored M4A1 high/low carries — replacement scope

First supplied Workbench export = **high**, second = **low**. Both are held verbatim in `src/breach-authored-ready-carries.ts` including shoulders, independent hands/elbow poles, stock, torso, and XYZ weapon rotation. Neither overwrites the previously authored M4A1/AKM **short-stock** endpoints.

## Authoritative integration
- Use the exact M4A1 stock and rigid weapon rotation in the central `fitWeaponPose` writer, shared by both visible firearm and shot-time muzzle.
- Transfer to all AR/AK/HK modular builds and the classic rifle/carbine/SMG/shotgun using the **existing grip-aware pose transfer**, cached by immutable build; never scale an AR pose blindly or separate the wrists from a different weapon's grip.
- The rig uses the two authored arm shoulder/wrist/elbow guides whenever a normal two-hand high/low hold is selected. Respect the same 10+10 two-bone constraints as the Workbench and preserve independent actions, reload, door grip and hand-owner priority. Lab vs live must use the same weapon target; no old low-ready solver overriding it.
- Preserve the A2.4 distance-controlled ready → low → short clearance and shared aiming/safety. New carries must feed both branches and not alter the motor, shot approval, foot contacts or replay clocks.
- Tests: verbatim M4 endpoints, every family transfer finite and repeatable, muzzle parity, arm reach/contacts, transitions, all prior A0/A1/A2 and targeted low-ready regressions, real mobile/desktop WebGL gallery for high/low on M4/AK/G3/MP5. No claims of perfect hand contact where author wrist targets do not lie on rigid metal; report the gap.

## Exclusions
No edits to full short-stock endpoints, weapon mesh geometry, or ballistics. No invented physical collision guarantees.
