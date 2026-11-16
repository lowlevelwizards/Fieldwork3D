# Dispatch D4 — SWAT pilot depth, not content expansion

Four narrowly scoped stages over the existing D3 Dispatch pilot, preserving
all existing Sandbox, Operations, Quick Play and legacy Campaign rules.

## D4.0 — Correctly issued SWAT recruitment
- Reuse the exact existing 2015 SWAT reference, `issueWeaponPreset`, existing
  magazine and armor/supply authorities for initial recruits as well as the
  original squad; do not clone another operator's callsign, skills, medical
  history, or serial number.
- Recruitment continues to cost 450 CR and obeys the existing active-contract,
  roster, and 8-active-operator capacity limitations.
- New members start as reserves and can be assigned via the existing squad
  picker. Their equipment and 3D appearance are real, not placeholder arms.
- Existing legacy/Sandbox recruitment still uses its former mixed-weapon paths.

## D4.1 — Functional curated equipment without a giant arsenal whitelist
- Explicitly classify the already-existing baseline uniform/medical/footwear
  kit slots for the one playable 2015 SWAT appearance.
- Allow a few reasonable existing alternatives: medical, hands, utility,
  belt, tactical items and unrigged/light configurations.
- Saved kit presets may be applied only when the complete saved loadout
  passes **every** active Dispatch slot policy and the weapon platform/build
  remains the operator's current one. The entire transaction fails closed
  if any part is unclassified or unsupported; no partial equipping, spending,
  losing inventory or equipment replacement.
- Keep custom Arsenal parts, arbitrary wardrobes and specialist-only choices
  restricted until their authoritative ownership and policy rules exist.
- For non-Dispatch modes, prior equipment and saved-kit behavior remains intact.

## D4.2 — Police-relevant incident presentation, existing gameplay only
- Five small Dispatch-specific labels map 1:1 to existing clear, intel,
  rescue, hold and capture objective types.
- Available-contract cards, predeployment preview, continuing-contract
  identity and post-operation chronicle use the same deterministic title.
- Persist the ORIGINAL contract data and display its unmodified region,
  risk, deadlines, rewards and mission intel. Never rewrite save data,
  objectives, maps, civilian behavior, ROE or simulation.
- No claim that evidence collection, arrests, nonlethal enforcement or
  police incidents have been mechanically implemented.

## D4.3 — Lifecycle acceptance
- Dedicated tests run recruit -> equip -> save a kit -> change/load a kit ->
  serialize -> accept a real existing contract -> settle outcome ->
  persist -> reload, plus duplicate settlement and weapon serial invariants.
- Test Dispatch incident titles and confirm legacy Campaign titles remain
  untouched. Keep D3 save, Studio, Arsenal and Quick Play protections.
- Run targeted affected-domain regressions and production typecheck/build.
  Stage commits stay on this branch; merge only at an integration checkpoint
  when latest main and Pages deploy-state checks are green.

## Explicitly deferred
New agency kits, sidearm handling, surrender/arrest/ROE, hostage negotiation,
police-only mission objectives, bespoke SWAT maps, tactical scripts,
kit inventory ownership migrations and unrestricted modular weapon editing.
