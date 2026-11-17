# Arsenal M2.5 — physical accessory integration (feature branch)

## Integration contract
`src/weapons/geometry/mounted-accessory-layout.ts` computes one deterministic, weakly cached, immutable configuration-local plan over M2.1–M2.4 rail positions. Its entries carry exact physical contact IDs, face normal, visual center, coarse 3D body volume, optional support-palm anchor and actual flashlight lens center. No Three.js dependency, per-frame mesh generation, equipment purchases, save schema change or new ballistics.

### A–D — Rails, grips, lights, collision
- Grip and handstop meshes now use selected *actual* bottom-rail contact, while legacy class-only builds keep their previous attachment position. Vertical body, base and handstop remain the existing budgeted silhouettes and shared materials. No MP5 duplicated grip.
- Right and left lights derive actual side normal/rail Z; the deterministic default is right where supported. Both mirrorable faces remain accessible to later M2.6 persisted placement selection. Visible light clamp touches real lateral rail. The stable `weapon-light-lens` name, hidden default and runtime visibility controller are unchanged.
- Conservative local-space body envelopes and a palm allowance detect conflicting accessory volumes including adjacent top/side/bottom combinations. Structural HK claw / AK side bridge are allowed to contact their own attached optic. Four existing accessory slots are visited in stable opticMount, optic, foregrip, light order; accepted earlier components are never moved to fit a newly requested light. Alternate physical candidates are tried before returning an unresolved conflict.
- Solving happens on a configuration edit or first use; result caches by immutable configuration reference, with no DOM/renderer coupling.

### E — Support hand
- `riflePoseContacts` prefers a grip's *actual mounted hand anchor*, with different coordinates for vertical grip vs handstop. The existing V3 solver still checks shoulder-to-wrist reach and armor/wall clearance, and still chooses fallback/guard/interaction release when necessary. `weaponGrips` starts from the same weapon-local X/Y rather than an independently invented grip coordinate.
- Neither the sight line nor shot-time muzzle moves independently from the rigid weapon. Reload, door interaction and intentional release precedence remain with existing rig controllers.

### F — Weapon light parity
- `weaponLightEmitter`, and therefore the same illumination source read by 2D/3D light pathways, now project from the mounted lens's real X. World yaw, occlusion, light samples, brightness and range are unchanged; the existing class-only fallback is preserved.
- A family weapon with an old saved light on an unsupported mount still loads but cannot emit from an invisible rail. This is a deliberate runtime safety rule; Campaign ownership is not mutated.

### G — Compatibility and legacy
- New `setWeaponAttachment` selection for family builds with foregrips/lights requires an actually modeled physical Picatinny role; no imaginary AK bottom/side rail, G36 add-on rail, or FAL/FNC retrofit.
- The Arsenal proposal path checks the complete physical layout before allowing a new grip/light, so a supported rail with an occupied body or blocked support palm does not create an invalid build.
- The legacy `readWeaponConfiguration` does not discard previously paid accessories and `ArsenalRecipeV2` stays version 2. Old incompatible items appear in the read-only unresolved plan. Inventory purchase and explicit saved placement are deferred to M2.6.
- Training flashlight kits issue only to configurations with an actually modeled supported light contact, instead of manufacturing phantom rails. Historical training trial semantics are unchanged.

### H — Focused regression gate
`tests/arsenal-m2-accessory-integration.test.mjs` validates actual AR/MP5 contacts, mirrored side light normals, independent accessory conflict envelopes, grip-to-hand anchor parity, lens-to-beam X, unsupported AK/FAL/G36 mounts, old save retention, and MP5 one-grip parity.
Retain M1–M2.4 fit tests, A3 geometry, equipment 20.12/21.05 lights, L1.4 training/lighting, TS and production build. Update older tests only when they explicitly rely on an invalid phantom mount; do not remove genuine regression coverage.

### I — Browser and performance acceptance
The repository's A3 capture/audit scripts can provide actual WebGL meshes and draw-call/triangle baselines, but a headless geometry test is *not* a screenshot. Prior to releasing main, inspect the real Arsenal viewer at both sides, bottom, three-quarter and operator 3D poses. Review flashlights ON/OFF and live frame spikes. No claim of screenshot validation or performance improvement without actual capture evidence.

## Deliberately deferred
- M2.6 — persisted physical position, optional left/right rail selection, authorized Campaign purchasing and returns
- M2.7 — responsive touch-first mounting Workbench UI
- M2.8 — full browser screenshot, perf/release integration and safe GitHub Pages checkpoint
- New accessory catalog, procedural rails, custom weapon ballistics, live pose redesign

## Release policy
Work is on draft PR #1597; main is diverged. Merge only after focused CI, previous production Pages deployment completed successfully and branch integration/visual review is safe. Avoid piling releases onto an active deployment.
