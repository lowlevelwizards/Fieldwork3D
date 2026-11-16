# Dispatch D7 scope adjustment — retire separate police helmet

The agency-neutral 2015 SWAT pilot now issues the **existing MICH-2001 high-cut ballistic helmet in black**. We do not maintain a separate generic police helmet or visor assembly.

- 1995 SWAT and 2002 OMON visual references use an existing black PASGT-style ballistic helmet as an approximate period proxy, without claiming agency-specific issuance.
- No new weapon, protection value, inventory item, visual effect or mission mechanic.
- `police-helmet` is removed from active wardrobe choices, helmet silhouette geometry, material/color registry, head assembler, shadow shapes and Studio controls. The dedicated visor renderer is removed.
- Previously saved `police-helmet` wardrobe values normalize to the MICH-2001 shell when loaded, retaining black color and any existing legacy cosmetics as inert read-only metadata. No save schema migration, deletion or hard reset.
- Police-visor reference coverage is now deliberately **missing**, never marked approximate on the strength of a black helmet.
- Police visor compatibility metadata can remain to decode old version-1 wardrobe fields. It creates no live model or actionable equipment.
- New SWAT starters and D4 recruits continue to use the same reference resolver; D6 bounded appearance editing remains unchanged. Old campaigns use their existing equipment class, operator records, weapons and ownership.
- Review tests for references, outfit import, color fidelity, retirement/non-selection and no visual renderer; keep critical typecheck/build and relevant Studio and helmet regression checks green before any merge.
- Development stays on feature branch. Merge only at a grouped release gate after verifying the preceding Pages build; verify new public build stamp before calling production complete.
