# FNC STANAG unification — shared AR art and editor choices

The FNC used a unique, undersized equipped mag (width2.32, depth1.40, length4.68, sweep.72) while the AR uses width3.38, depth1.83, length5.30, sweep.80. Its carried mag used yet another width2.55 / depth1.49 profile. This produced an inconsistent visual scale beside the heavily stylized P18 receiver.

## Final scope
- FNC factory magazine part ID is now canonical `ar-mag30`. The same `ar-mag20` and `ar-magpoly` IDs are selectable in Arsenal, Campaign and Quick Play. Existing `fnc-mag30` save records remain valid as an *alias* for AR 30 steel geometry and are hidden from fresh selection as a redundant option.
- FNC receiver and legacy magazine report standard `stanag` feed, with cross-family compatibility limited **only** to AR STANAG magazine parts on an FNC receiver. ARs do not accept the legacy FNC ID, and neither family can share stocks/receivers/furniture or incompatible HK/AK magazines.
- Both weapons use `arMagazineCurve`, `arMagazineOutline`, AR metal ribs, and AR polymer taper/baseplate. The FNC retains a local receiver-centered insertion datum at X1.05, Y−2.81 so the AR-width top fits behind the FNC's front face X2.75. The receiver's integrated magwell rear is reshaped locally to receive this wider shared top, with no new slab. Barrel/muzzle/stock/grip/operator hand coordinates remain untouched.
- The FNC's direct stage1 art, assembled factory and alternate builds, operator/Workbench meshes and legacy carried-magazine all follow these common profiles. A single source determines dimensions; no per-frame work.
- Nominal capacity follows canonical ID (20 steel, 30 steel/polymer); saved legacy FNC records stay 30, no arbitrary ammo inventory migration.
- Tests assert exact AR curve dimensions, save and Arsenal recipe roundtrips, feed exclusions, factory and alternate meshes, polymer base, physical capacity, carried legacy parity, unchanged muzzle and geometry budget.

Release only after focused test, TS/build and browser rendering, main release checkpoint and verified Pages build stamp.
