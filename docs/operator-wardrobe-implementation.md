# Tactical Wardrobe — Rolling implementation tracker

The master concept is to keep Fieldwork's *mechanical* loadout simple and
legible while providing a deep, optional, grounded wardrobe and accessory
sandbox. The same neutral library can support Verdigris or Violence of Action.

## Delivered as individually merged rolling builds (00–28)

- 00–01: helmet/cap depth cleanup, blank face default, reduced hair slabs,
  backpack contact and rear tool carrying clearance
- 02–04: versioned appearance data, compatibility against physical equipment,
  procedural headgear, face coverings, eyewear, headsets, mobile Wardrobe Lab
- 05–08: original 32-pixel camo patterns, configurable material channels,
  honest nonballistic bump helmet classification
- 09–10: upper/lower clothing, knee and wrist details, shoe and carried
  gear silhouette styles without touching existing motor/IK anatomy
- 11–12: curated role, civilian and setting-independent quick recipes
- 13–15: typed carrying mounts, non-duplicating manual physical presentation
  positions, mobile Lab advanced controls preserving authoritative ledger
- 16–18: validated, bounded outfit save/export/import, face/headset
  compatibility, sleeve material corrections
- 19–23: Campaign and Quick Play cosmetic persistence/editor integration,
  all six camo channels and three Verdigris-style presets
- 24–27: more distinct armor/rig/belt/pack geometry, optional empty cosmetic
  holders, matching selectors in Lab, Campaign, Quick Play
- 28: focused composite role/faction visual and compatibility smoke tests

## Protected contracts

- Body proportions remain chunky/stubby with zero skeletal modification.
- Foot planting, gun grips, muzzle origin, damage hitboxes, combat controls and
  action/replay timings stay authoritative in existing battle systems.
- Cosmetic style/holder items do not create magazines, charges, functional
  tools, plate protection, item ownership or gameplay statistics.
- Quick Play resets kit/ammunition/injuries; only cosmetic identity may persist.
- Campaign owned equipment remains finite and tracked independently from looks.
- Save readers are defensive; version 1 old saves use valid empty appearance.

## Future-depth backlog — not yet represented as functional gameplay

- Functional secondary-handgun/holster ownership and secondary magazines
- Unique physical ownership of grenades, grenade launchers, wall and door
  charges, new medical/breaching equipment beyond the existing tool systems
- Individual, manually placeable new carrier magazine pouches beyond the
  existing magazine ledger and choice of carrying location/order
- Additional meaningful gameplay interactions for specialist equipment
- Greater authored structural differences for every specialized style variant
- Complete iPhone in-battle performance and full visual review of every option
- User's final artistic approval; *no proportion changes without it*

The modules and their commits are implementation artifacts, not certification
that every visual combination has been manually reviewed on a device.

## Test and deployment policy

Small builds: include directly relevant deterministic Node tests.
Merge immediately. GitHub Pages workflow performs focused operator tests and
build; larger suites may run separately. Do not claim a queued or cancelled
workflow has passed. Inspect latest release action for production status.
