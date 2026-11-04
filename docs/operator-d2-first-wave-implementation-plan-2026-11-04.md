# D2 — First-Wave Facewear and Eyewear: Implementation Specification
**Date:** November 4, 2026
**Target:** Fieldwork3D / Fieldwork Breach; Operator Studio and gameplay operator rigs
**Scope:** Exactly 19 core models, grouped into six fabric facewear, six protective masks, four spectacles/sunglasses, and three goggles; plus sensible per-model variants
**Status:** implementation plan only; no geometry/code integration implied by this document
**Branch:** feature/operator-visual-details-2026-11-04
**Release strategy:** staged feature commits; compatibility-focused checkpoints; no deployment until prior Pages release is verified

## 0. Definition of success

Build an intentional, coherent catalog of recognizable head and face accessories in Fieldwork's approved chunky, blocky, miniaturized visual language.

An item earns a separate model only if it has a different **dominant silhouette**, **opening arrangement**, **construction** or **physical projection** visible in front, three-quarter and side views at normal gameplay zoom. Do not count colors, very small frame differences, different surface patterns, lens tint or simply a raised/lowered state as additional models.

**Hard art rules**
- Few big, confident shapes; consistent minimum voxel/pixel step; no little tubes, eyelashes, realistic fabric wrinkles or bolt forests.
- Give each mask its correct apertures, rim/strap shapes, front-to-back form and at least one defining profile cue. A slab floating in front of a face is not acceptable.
- Rounded real-world goggles may be built from intentionally stepped/angular low-poly rings, not literal cylinders with dense subdivisions.
- A distinct model must still read at game camera distance and on mobile. Add detail only where it reinforces that read.
- Wear and camo textures are a separate restrained pass; no noisy procedural grime on lenses.
- Skin must remain visible through actual fabric openings. Never fake an exposed eye hole by filling it with a skin-colored plate.
- Every visible strap, ear temple, head covering or collar should connect to plausible contact surfaces and move with the head.
- Fit against approved seven headwear families (bare, patrol cap, beanie, boonie, steel pot, PASGT, ACH, high-cut = bare + seven headwear styles) and headset variants, considering front, sides and rear.
- No modification to IK, skull hitbox, head joint, aiming, FoW/line of sight, damage, weapon grip, carrying logic, equipment protection, inventory, or simulation costs. All D2 gear is purely visible.

### Catalog count: 19 selectable models, plus None choices
| Group | Count | IDs / approved Studio labels |
|---|---:|---|
| Fabric facewear | 6 | balaclava-one — One-hole balaclava; balaclava-three — Three-hole balaclava; balaclava-open — Open-face balaclava; gaiter — Neck gaiter; shemagh — Shemagh / field scarf; bandana — Bandana |
| Masks | 6 | half-mask — Tactical half-mask; respirator-half — Half-face respirator; gas-gp5 — Hood gas mask; gas-m17 — Cheek-filter gas mask; gas-m40 — Canister gas mask; gas-m50 — Panoramic gas mask |
| Glasses | 4 | glasses-standard — Standard glasses; glasses-aviator — Aviators; glasses-wrap — Wraparound tactical glasses; glasses-shield — Ballistic eyeshield |
| Goggles | 3 | goggles-low — Low-profile goggles; goggles-field — Bulky field goggles; goggles-retro — Vintage round goggles |
| Empty options | 0 | face-none / eyes-none — None, not counted as models |

Two-hole balaclava is a three-hole model with a closed-mouth option. Plain narrow field scarves are a lightweight shemagh drape/wrap option, not a separate model. Different safety glasses, prescription frames and sunglasses tints live within the four glasses models. Cold-weather/sand variants live in the heavy goggle family unless the silhouette truly justifies a future candidate.

## 1. Existing code and required architecture

The repository already uses:
- src/operator-wardrobe-data.ts for WARDROBE_SLOTS, WARDROBE_ITEMS, version-1 wardrobe parsing, resolvedWardrobe and wardrobeConflicts.
- src/operator-wardrobe-head-visuals.ts for the four head layer registries and basic facewear/eyewear models.
- src/operator-visual-kit.ts for model application, headwear and hairstyle visibility.
- src/operator-axis-convention.ts for the canonical -Z-facing adapter.
- src/operator-headwear-silhouettes.ts for approved coherent helmet and hat geometry.
- src/operator-studio.ts and src/operator-appearance-grid.ts for selectors, color controls and real 3D thumbnails.
- Tests for wardrobe registration, persistence, visual kit and Studio behavior.

**Current gap:** the approved headwear was authored in canonical -Z space while older facewear, eyewear and headset props were attached in legacy +X space. Existing head coverings are mostly flat boxes, and separate goggles-up / goggles-down currently occupy different catalog items. The migration/fit work is not optional.

### 1.1 New, small internal modules (suggested)

1. src/operator-head-fit.ts: canonical local skull landmarks and surface-fit queries, based on *the actual current rig proportions*, with named brow, nose, cheek, jaw, chin, temple, ear, crown, nape and collar contacts. Headwear clearance profiles must derive from the approved silhouette geometry/bounds, not unverified generic helmet dimensions.
2. src/operator-facewear-catalog.ts: exact 12 facewear model descriptors (six fabric, six mask), wear option lists, reference tags, material channel support, compatible modifiers, defaults and validation.
3. src/operator-eyewear-catalog.ts: exact seven eyewear descriptors, permitted frame variants, lens tints, frame colors, wear positions and validation.
4. src/operator-head-assembly-policy.ts: a pure resolver taking wardrobe + selected headwear + headset and returning an immutable effective assembly plus compatibility explanation. Crucially, it must not edit real equipment or destructively erase saved choices.
5. src/operator-facewear-visuals.ts and src/operator-eyewear-visuals.ts: build-time model constructors with reusable geometry helpers. Existing src/operator-wardrobe-head-visuals.ts remains the single interface between visual kit and family groups; do not build parallel runtime visual systems.
6. src/operator-head-accessory-materials.ts: reusable material channels and tinted lens constructors; no new materials allocated in pose loops.

Names are proposals, not a reason to fragment modules unnecessarily. Prefer a short cohesive file for each well-defined responsibility.

### 1.2 Head coordinate and fit contract (D2-00)
- All **new** geometry is authored canonical: +Y up, -Z forward (face), +X wearer's right. Use createCanonicalAttachment to mount it; the historical rig still owns the legacy solver.
- Measure current head bounds and landmarks by inspecting the actual head meshes and the approved helmet volume profiles. One head-local coordinate frame, shared by fabric, visor and headset anchors.
- Define stable anchor sets: eye-left/right, nose-bridge, upper-cheek, jaw-front, chin, temple-left/right, ear-left/right, forehead, crown, occiput/nape, front-neck and upper-collar.
- Profile headwear clearances for bare, patrol cap, boonie, beanie, steel pot, PASGT, ACH, high-cut. Account for over-ear headsets, boom microphone and helmet-ear devices. Avoid modifying skull or helmet silhouette to force accessory fit.
- Fit is not a uniform scale up/down: change strap routing and offset where appropriate, maintain consistent material thickness and visibly connected edges.
- Use central depth separation for skin, fabric, rim, lens, gasket, strap and filter. No coplanar overlapping quads and no transparent lens surface doubled with another opaque slab.
- Introduce a small debug harness that shows fit landmarks, bounds and per-layer occupied zones in a head-only 3D reference view. Diagnostic overlays must never ship enabled.
- Build geometry once per operator type/variant and use visibility or static transform changes on wardrobe updates; no dynamically rebuilding 3D parts every animation frame.

### 1.3 Materials and style settings
**Facewear material families:** cloth knit, woven textile, elastic/strap, molded hard plastic/mesh, elastomer/rubber, cartridge, grille, hardware. Solids should include black, charcoal, OD, ranger/foliage green, coyote/tan, brown, off-white and winter-white where appropriate. Reuse approved fabric camouflage masters for suitable textile areas (balaclavas, gaiters, wraps, bandanas), with fixed coherent pixel scale and seed. Do not apply textile camouflage to glass, hard rubber or respirator filters.

**Eyewear:** frame solid separate from lens (clear, smoke, dark smoke, amber/yellow, optional muted mirrored). Tint/material is a reusable material choice, not a unique mesh family. Maintain readable face visibility through clear lenses; for dark lenses, use restrained opaque/tinted surfaces where real transparency would introduce unstable sorting.

**Distinct variation is applied only to appropriate styles:** balaclava mouth aperture, fabric wearing mode, scarf drape configuration, half respirator cartridge arrangement, standard glasses frame subtype and goggle location. UI should not show nonsensical options such as fabric camouflage on gas-mask visor or a three-hole option on a shemagh.

## 2. Model-by-model build sheets: fabric facewear (6)

### F01 — One-hole balaclava (balaclava-one)
**Must read as:** close fitting full scalp + sides + chin covering, ONE continuous horizontal eye opening.
- Build contoured but stepped hood around existing skull, with front brow band, cheek-side bands, solid lower face fabric and neck collar continuous to back.
- Eye window exposes underlying skin/eye markings. Opening runs continuously across both eyes and nose bridge; frame has distinct top and bottom edges.
- Strong rear silhouette and nape connection; no hair poking through; keep ear/headset zone shallow.
- Mode: default one-hole; optional slim vs thick fabric **material/bulk preset** only if discernible, do not create new catalog entry.
- Acceptance: recognizable without sunglasses; camera sees an actual open eye strip; helmet can seat without balaclava surfaces bursting through the shell.

### F02 — Three-hole balaclava (balaclava-three)
**Must read as:** two distinct eye holes, separate mouth aperture.
- Single connected hood shell with stepped oval/square eye apertures and a mouth ring separated by meaningful fabric bridges.
- Sub-option: **mouth covered = two-hole balaclava**. This is a toggled hole-fill topology/variant, not a second catalog card.
- Distinct from F01 even at gameplay zoom: two separate black-bordered eye sockets and a visible fabric nose bridge.
- Acceptance: holes remain aligned with underlying face under head turns; opening fill correctly reflects skin and chosen complexion; no coplanar cheek plates.

### F03 — Open-face balaclava (balaclava-open)
**Must read as:** hood enclosing scalp, temples, ears and neck; large central face fully exposed.
- Broad stepped U-shaped opening around forehead, both cheeks and under chin; strong hood/cowl neck silhouette.
- Differentiation versus F01: *the whole central face* is open rather than a slit.
- Optional subdued color/fabric only; this is not a future "full loose hood" SKU.
- Acceptance: visible face center; face markings retained; neck band correctly fits shirt collars and under headwear.

### F04 — Neck gaiter (gaiter)
**Must read as:** continuous tube of fabric around neck and/or lower face, no head covering.
- Three wear states: **lowered** around neck; **mouth** to upper lip/nose base; **nose-and-mouth** to nose bridge. Each has its own prebuilt outline, not a scaled box squishing into the skull.
- Strong edge seam/fold, front nose wedge in raised state, back/side stretch and small lower collar overlap.
- One model covers plain tube and short tactical styles; heavy fleece deferred unless a clearly separate silhouette is warranted.
- Acceptance: exposed hair unaffected; forehead and ears remain clear; no front collar floating; realistic passage under armor/rig collar.

### F05 — Shemagh / field scarf (shemagh)
**Must read as:** visibly layered loose folds, asymmetry and side/rear tails unlike a thin gaiter.
- Three wear states: **draped at neck** with triangular chest panel; **wrapped around lower face** with folded fabric up to nose; **head wrap** around scalp and face, only if helmet/hat compatibility can be achieved without intersections.
- Use 3–5 decisive large stepped drape planes with controlled depth, not piles of tiny wrinkle voxels. One recognizable folded tail at shoulder.
- "Plain field scarf" is a color/material/more compact drape option, not another model.
- Allow textile camouflage only when plausible. Chest flap goes over uniform but must not cut through armor collars/rig straps; set tuck/overlay presets against large armor styles.
- Acceptance: obviously bulkier and more layered than gaiter; asymmetrical side and rear read; no chest/rig z-fighting or headgear penetration.

### F06 — Bandana (bandana)
**Must read as:** tied triangular cloth panel with down-pointing nose-to-chin front, visible side ties/knot.
- Two wear states: raised over nose/mouth and lowered around neck. Proper angular side triangles, short rear knot, no giant scarf volume.
- Fabric solids and selected textile prints. Keep knot in clearance of helmet strap/headset band.
- Acceptance: distinguishable from raised gaiter by triangular apex and tied rear; no bow-like oversize knot.

## 3. Model-by-model build sheets: eyewear (4)

### E01 — Standard glasses (glasses-standard)
**Must read as:** two framed clear prescription lenses, bridge and thin temples.
- Default rectangular-ish frame. Optional **round** and **heavy-square** frame shapes within one Studio card, not separate inventory entries.
- Real lens openings with slim low-poly perimeter, shaped nose bridge and two temple arms terminating near ears.
- Frame solids; clear/smoke lenses can be supported but clear is default. Under headset ear cups, visually terminate/route arms rather than letting rods protrude through ear housing.
- Acceptance: distinct visible bridge and pair of lenses; does not resemble a wide protective eyeshield.

### E02 — Aviators (glasses-aviator)
**Must read as:** oversized separate tapered/teardrop dark lenses, slim double/arched bridge and narrow arms.
- Large, softly stepped polygon lens silhouettes; avoid hundreds of facets. Thin metal brow/nose bridge and two side arms.
- Clear/smoke/amber/bronze variants; no need to create additional retro sunglasses families.
- Acceptance: iconic lower taper in front view, not merely standard glasses tinted black.

### E03 — Wraparound tactical glasses (glasses-wrap)
**Must read as:** angular close-fitting pair of broad dark/clear lenses swept around temples, strong side silhouette.
- Single unified sport frame with two angular lens lobes or near-continuous brow shape, thick temples and bent side protection.
- Do not use large goggle gaskets or an elastic head strap; keep conventional glasses arms.
- Lens tint and body color separated. Preserve side clearance under helmet and earmuffs.
- Acceptance: distinctive swept side line even at low zoom; does not read as aviator or goggle.

### E04 — Ballistic eyeshield (glasses-shield)
**Must read as:** one continuous full-width protective shield spanning both eyes and nose, minimal angular upper/lower frame and narrow temples.
- One stepped transparent/colored eye plate with appropriate nose relief, supporting brow/side tips.
- Clear and smoke primary options; consistent low-poly transparency with no second solid rectangle occupying same plane.
- Acceptance: front view has clearly one lens, unlike wraparound split lenses.

## 4. Model-by-model build sheets: goggles (3)

### G01 — Low-profile tactical goggles (goggles-low)
**Must read as:** slim sealed lens band tight to eyes with compact gasket and flat elastic strap.
- Single broad lens bordered by a shallow frame; small side strap attachments, not large armor blocks.
- Wear states: **on-eyes**, **raised** onto forehead or compatible helmet rim, **neck** only if positioning remains plausible.
- Separate strap routing presets for bare scalp, brim hats, helmet/rail situations; no strap through the helmet shell.
- Acceptance: visibly less deep and less bulky than G02 at normal zoom.

### G02 — Bulky field/dust goggles (goggles-field)
**Must read as:** deep projecting frame with thick perimeter seal and robust strap.
- Broad thick rim, large central lens, sizeable brow/nose relief and pronounced side gasket. Dust/sand/winter colors are material/padding variations, not different models.
- Same wearing positions, but helmet-resting position has larger stand-off. Strap must wrap existing shell and clear headset earcup.
- Acceptance: substantially chunkier than G01 from 3/4 and side views.

### G03 — Vintage round goggles (goggles-retro)
**Must read as:** TWO isolated circular/oval eyecups with obvious bridge and strap.
- Two low-poly stepped eyecup rings, separate inset glass, short connector and continuous headband.
- Position states on-eyes / raised / neck when compatible. Do not repurpose bulky goggle lens mesh with a line painted through the middle.
- Acceptance: instantly recognizable pair of round eyepieces at gameplay zoom; retained rear strap silhouette.

### Eye placement rules
- **eyes** default for glasses and goggles; glasses generally do not get arbitrary "raised" or "around-neck" variants.
- **forehead** only for goggle shapes and uncluttered bare/soft headwear profiles if physically viable.
- **helmet** only when enough shell/brim clearance exists. Define helmet-specific rested mounting transforms; a rail mounting option should require a genuine helmet rail style and supported goggle family.
- **neck** only for goggles, with actual frame facing orientation and strap around rear nape, clearing jacket and armor collar.
- The UI presents **Raised / stowed** while the resolver picks the appropriate forehead/helmet anchor, transparently reporting the effective placement. No invented universal helmet attachment.
- Choosing a gas mask keeps the user's eyewear selection in save data but suppresses visible eyewear and offers an explanatory message; removing mask restores previous choice.

## 5. Model-by-model build sheets: protective masks (6)

### M01 — Tactical half-mask (half-mask; retains legacy ID)
**Must read as:** hard lower-face shield, notably not fabric.
- Compact angular curved/stepped shell covering nose/mouth/lower cheeks, with two large side attachment points and short connected straps.
- Vent impression via one broad dark recessed panel or 2–3 oversized slots, not dozens of pixel holes.
- Small hard shell/rubber material choice, muted solids. Optional mesh-faced treatment without separate card.
- Acceptance: remains distinct from a balaclava, gaiter and filter respirator; straps make physical contact; eyewear compatible where bridge clearance allows.

### M02 — Half-face respirator (respirator-half)
**Must read as:** fitted nose-and-mouth seal plus clearly recognizable filtration hardware.
- Faceted triangular rubber facepiece with nasal peak, lower valve, rear harness and filter port(s).
- Two visually meaningful sub-options: **side/twin cartridge** and **compact single/front or cheek filter**, subject to chosen reference family. Not two separate cards in wave one.
- Filter geometry projects enough to read in side/3/4 profile, while avoiding muzzle, boom microphone and weapon contact near face.
- Acceptance: obvious filter assembly, not just a half-mask with a painted vent; straps and filter housing connect to mask.

### M03 — GP-5-inspired hood gas mask (gas-gp5)
**Must read as:** full tight elastomer head hood, two small round eye windows, giant central/downward projecting front canister.
- Continuous crown/head/nape rubber skin, two inset stepped eye rings, front snout/valve and projecting central filter.
- No generic rear harness over the rubber hood; it is a hood-type mask.
- Hair hidden; consider helmet compatibility using actual skull + hood thickness. Reject/adjust fit rather than crush hood with shell.
- Acceptance: full skull-to-neck hood silhouette, distinct center filter visible in side view; not confused with M40.

### M04 — M17-inspired cheek-filter gas mask (gas-m17)
**Must read as:** separate rubber facepiece with two cheek-side filter pouches integrated into mask, NOT prominent dangling canisters.
- Two round eye windows, broad/angular cheek panels, center exhale/speech plate, head harness to rear skull.
- Filters integrated into left/right cheek areas, creating a wide lower-face shape. No external giant cartridge option.
- Harness must avoid headsets and helmet straps. Ear/cheek filter location must survive 3/4 inspection.
- Acceptance: side silhouette has shallow integrated pouches, unlike M40; no canisters erroneously added.

### M05 — M40-inspired side-canister gas mask (gas-m40)
**Must read as:** heavy military mask, pair of rigid eye lenses, prominent single external filter canister extending from a cheek port.
- Faceted close facepiece with twin eyepieces, nose/exhale module, single cylindrical/blocky side cartridge and rear harness.
- Reference-consistent left or right filter side may be offered if actually supported by selected visual archetype. At minimum use one correct side and do not mirror blindly.
- Keep canister clearance from headset, rifle sight line and collar. No gameplay vision penalty in D2.
- Acceptance: prominent asymmetric cheek filter and two lenses make it unmistakable versus M17 or M50.

### M06 — M50-inspired panoramic mask (gas-m50)
**Must read as:** wide ONE-piece wraparound visor, two close-to-face low-profile cheek filters and modern lower exhale module.
- Broad continuous face visor with angular soft outer frame, compact twin conformal filter cassettes embedded near cheeks, strong center lower-face module, rear harness.
- Do not let optional modern mask looks replace twin filters with a huge single filter and still call it the same M50-inspired model.
- Muted visor tint only; avoid mirror-shiny face panel hiding the form. C50/FM53 remain future candidates if later judged truly different at game scale.
- Acceptance: continuous panoramic window and symmetric low filters clearly distinguish it from M40 and M17 at close and normal zoom.

**Special note:** visual reference accuracy is about masks' form. Cosmetic models do not confer certified respiratory protection or any in-game environmental protection.

## 6. Head assembly compatibility

### 6.1 Pure resolver instead of arbitrary invisibility
Make a head assembly resolution function with inputs: selected headwear, facewear, facewear mode, eyewear, eyewear position, headset and source rig/helmet profile. It returns:
- effective facewear topology and fabric state,
- effective eyewear position (or suppressed, with reason),
- effective headset/boom position (or suppressed, with reason),
- hair-occlusion and skin-exposure regions,
- a small set of visible components/anchors, never a mutated loadout.

Preserve all user selections even when physically hidden. Restoring a compatible setup should restore prior saved lens and wear settings automatically. Studio shows an intelligible explanation for unsupported combinations, not a silently substituted style and not a disabled entire head category without context.

### 6.2 Intended compatibility behavior
| Combination | Expected behavior |
|---|---|
| Balaclava + glasses/goggles | Layer eye protection over fabric, apertures remain clear; route straps over/around hood as appropriate |
| Open-face balaclava + glasses | Preserve temples and exposed face; hair underneath hidden |
| Gaiter/bandana + glasses | Usually compatible; eye region uncovered and nose bridge clear |
| Wrapped shemagh + goggles | Fit over wrap with adjusted cheek and strap clearance; if impossible, offer draped wear or explain conflict |
| Half-mask + eyewear | Compatible only if rigid nose bridge and goggle seal do not intersect |
| Half-face respirator + glasses | Usually possible; goggles need specifically tested clearance |
| Full-face gas mask + glasses/goggles | Hide external eyewear; optional internal prescription assembly is outside D2 scope |
| GP-5 hood + headwear | Use hood thickness and actual headwear profile; support where viable, otherwise require a compatible look and explain |
| Gas mask + conventional boom mic | Reposition only if supported by deliberate mask communications design; otherwise hide boom or mark conflict, without changing radio stats |
| Helmet-mounted ear protection + headwear | Respect preexisting compatibility policy and new helmet rail/edge geometry |
| Goggles raised + brimmed soft hat | Prefer compatible forehead placement or decline raised mode if brim intersection is unavoidable |
| Neck-stowed goggles + armor/collar | Check physical overlap with BDU, ACU, combat shirt, smock/Gorka and existing armor styles |

**Runtime caution:** preview style suppression is not a real equipment change. Never allow outfit edits to change the actual in-game head item, inventory, helmet class or communication mechanics.

### 6.3 Occlusion/hair policy
- Full-head balaclavas and GP-5 hood hide scalp hair, not skin revealed inside openings.
- Open-face balaclava hides hair while leaving forehead/cheeks visible.
- Gaiters and bandanas do not hide hair.
- Headgear already hides hair according to existing policy; avoid D2 accidentally revealing hair through shells after style switch.
- Gas masks can hide facial ink beneath opaque facepieces but show appropriate skin behind transparent lenses where actually visible.
- Avoid global "hair off whenever facewear != None" shortcuts.

## 7. Exact data contract and migration

### 7.1 Keep current slots; add validated optional config
The 19 items populate only existing WardrobeSlot values facewear and eyewear. Keep other appearance slots unchanged.

Recommended optional metadata in WardrobeOptions (exact interfaces decided while coding):
- facewearConfig: wear state, material/color, approved fabric camo ID and deterministic roll, mouth opening variant, respirator filter option.
- eyewearConfig: frame subtype, frame color, lens tint, placement state.
- Values are validated per selected model by catalog-specific option tables. The reader must discard unknown/invalid enum values and clamp out-of-range integers without discarding valid unrelated wardrobe state.
- Initial absent config resolves to a stable default. D2 must read existing version:1 saves; keep version 1 while fields are additive if possible. Migrate explicitly if a version bump becomes unavoidable.
- A cached preference for a category can remain stored when not presently visible; never rewrite or erase it because the selected headwear temporarily conflicts.
- Only selection/edit events update wardrobe; pose should not mutate persisted state.

### 7.2 Legacy ID mapping (required)
| Stored ID | New effective ID | Migration detail |
|---|---|---|
| face-none | face-none | unchanged |
| balaclava-one | balaclava-one | new geometry, current default slit |
| balaclava-three | balaclava-three | default mouth-open topology |
| gaiter | gaiter | choose default raised/lowered consistent with old preview after visual audit |
| shemagh | shemagh | default loose/draped scarf |
| scarf | shemagh | compact/draped scarf variant, not a seventh fabric model |
| half-mask | half-mask | retain ID, redesigned rigid lower-face mask |
| gas-mask | gas-m40 | intentional legacy military gas-mask fallback; document as an approximate visual conversion |
| eyes-none | eyes-none | unchanged |
| clear-glasses | glasses-standard | clear lens |
| sunglasses | glasses-wrap | smoke lens; style migration explicit |
| safety-glasses | glasses-shield | clear lens |
| goggles-down | goggles-field | on-eyes position |
| goggles-up | goggles-field | raised position |

Important: old goggles-down/up migration needs to update both base style and new eyewear placement; do not let older saved data silently turn all goggles into on-eyes. Some old model appearances are very approximate, so the conversion must be disclosed as a visual upgrade not bit-for-bit matching geometry.

### 7.3 History, presets, serialization
- Undo/redo in Studio includes accessory variant changes and remains bounded by current history mechanism.
- Quick Play remains per-round/nonpersistent for health and equipment; Campaign persistence is preserved. Cosmetic changes use the existing accepted Studio save flow and do not create new cross-round equipment carry-over.
- Presets and loadout changes should not clear optional wardrobe accessor configs.
- Saved operators render identically after closing/reopening Studio, gameplay reload and roster switch.

## 8. Studio UI and thumbnail behavior

**Head group stays:** HEAD > headwear / facewear / eyewear / headset. No new top-level section or extra clutter. Retain identity complexion and haircut controls currently shown under facewear; regroup them visually if needed but do not drop them.

Selecting a model exposes *only relevant options*:
- F01/F03: fabric swatch / print.
- F02: mouth aperture toggle + fabric swatch / print.
- F04: lowered / mouth / nose-and-mouth, fabric color/print.
- F05: draped / face-wrapped / head-wrapped (availability by headgear) + fabric color/print.
- F06: raised / lowered + fabric color/print.
- M01: shell color and mesh/plated finish if visually substantial.
- M02: filter arrangement and rubber/shell color.
- M03–M06: mask rubber color, limited appropriate lens treatments; no nonsensical arbitrary canister configurations.
- E01: rectangular / round / heavy-square, frame color and lens.
- E02–E04: appropriate frame/color and lens.
- G01–G03: lens color, frame color, eyes / raised / neck placement when compatible.
- Under any suppressed eyewear show "Hidden while full-face mask is equipped" and leave saved selection intact.

**3D catalog cards:** each of the 19 models gets a dedicated actual-rig thumbnail. Keep existing incremental per-frame thumbnail queue and avoid exploding its cache by building every color/position permutation. A card shows the model's canonical distinguishing pose; the big live operator preview shows the current user's selected variant and colors. For facewear/eyewear cards, temporarily select a useful compatible neutral headwear context, without writing those demonstration changes into the real operator's saved appearance. Ensure active catalog cards still reflect skin/hair when relevant.

**Mobile:** short names, compact segmented wear controls, tap-sized swatches, no second horizontal scrolling area buried inside the grid. Clear "model" versus "how worn" affordance. Reload current operator preview without rebuilding unrelated 3D geometry.

## 9. Rolling stage plan / deliverables / checkpoints

Each stage ends with (a) source commit on the feature branch, (b) a compact test run or approved visual capture, (c) a status note with exactly which models and variants work, and (d) a no-merge decision unless at a release checkpoint.

### D2-00 — Baseline, migration scaffolding and fit foundation
**Tasks**
1. Establish representative baseline images for current facewear/eye placeholders and four head angles (front, 3/4, side, back) at close and game zoom.
2. Record actual skull and headwear bounds, canonical adapter, available materials and headset contact positions.
3. Implement fit/anchor and material contract, pure compatibility resolver and catalog ID descriptors.
4. Write migration tests for all listed legacy IDs, especially goggles-up/down and scarf/gas-mask mappings.
5. Put a temporary debug geometry/collision coverage overlay in a lab, not in the shipped UI.
6. Preserve old visible defaults until the first new family can replace them together.

**Exit:** all 19 descriptors defined, geometry helper stable, migrations round-trip without changing equipment stats or other wardrobe slots; typecheck passes.

### D2-A1 — Balaclavas (F01–F03)
**Tasks:** replace 1-hole, 3-hole and open-face with properly enclosed hood/neck meshes; add two-hole aperture option on F02; hide hair by region; verify glass overlay and helmet crown fit.
**Exit:** 3 clearly different silhouettes, correct actual holes, rear head covered, unchanged eye/face identity and head hitboxes.

### D2-A2 — Gaiter, shemagh and bandana (F04–F06)
**Tasks:** three gaiter heights, three shemagh arrangements, bandana raised/lowered, collar/headset/armor clearance, material-specific camo placement and deterministic roll.
**Exit:** all six cloth models and key wearing states read distinctly at gameplay zoom; no intersections with five uniform top styles and representative armor classes.

### D2-A3 — Cloth integration and checkpoint A
**Tasks:** Studio contextual controls and thumbnails; visual matrix, save/undo and mobile audit; cleanup old unused fabric slab assemblies; run targeted tests and one core Studio smoke.
**Exit:** 6 fabric models usable in game and Studio without regression. Release A only if prior production Pages deployment is fully green and serving expected commit; otherwise keep work on branch.

### D2-B1 — Glasses (E01–E04)
**Tasks:** four genuinely different frame/bridge/lens structures; standard frame shapes as suboptions; stable transparent/smoke lenses; frame colors; temple/headset geometry.
**Exit:** users can distinguish four model families in standard thumbnail sizes; no blank-eye fake lens surfaces or sorting artifacts.

### D2-B2 — Goggles and placement (G01–G03)
**Tasks:** low-profile, bulky, double-round frames; headband/buckle attachment; eyes/forehead/helmet/neck transforms with actual fitting and supported-state rules; separate tint/frame.
**Exit:** three silhouettes distinct, no clips with helmet brim, no invisible back straps, neck mode clears collar.

### D2-B3 — Eyewear polish and checkpoint B
**Tasks:** catalog & mode controls, thumb cache discipline, legacy raised-goggle migration, lens transparency & shadow quality, representative headset pairings and mobile performance check.
**Exit:** 7 eyewear families, correct lens options, restore after gas-mask suppression, save/reopen; release B if release gate green, else stay on feature branch.

### D2-C1 — Half-mask and half respirator (M01–M02)
**Tasks:** rigid lower-face shell and side straps, respirator valve and prominent filter arrangements, compatible goggles/eyewear, microphone clearance, nuanced solid color channels.
**Exit:** both visually distinct from cloth, straps connected, correct side profile, no fake protection behavior.

### D2-C2 — Historical gas masks (M03–M04)
**Tasks:** GP-5 hood / front filter; M17 integrated cheek filters; round eyepiece apertures, appropriate neck/harness, low-poly lens/canister geometry; fit with at least bare and representative helmet.
**Exit:** strongly differentiated hood versus strapped facepiece and integrated versus external filtration; no single shared generic slab.

### D2-C3 — Canister and panoramic gas masks (M05–M06)
**Tasks:** M40 asymmetric side canister and twin eyes; M50 wide single visor and close twin conformal cheek filters; appropriate harness and chin/neck detail; mask communication compatibility.
**Exit:** four gas mask archetypes are separately identifiable at game zoom and obey filter-side design intent.

### D2-C4 — Full face compatibility and checkpoint C
**Tasks:** resolve eyewear suppression, headset/boom conflicts, hood/headwear fit profiles, lens behavior, hair/face occlusion, disabled-mode explanations, migration and persistence. Remove superseded legacy gas-mask mesh.
**Exit:** full catalog 19/19 visible and selectable; conflicts are explicit and reversible; head-assembly nonclipping proof and tests pass. Release C only after prior Pages release verification.

### D2-D — Post-integration polish / final acceptance
**Tasks:** comprehensive curated screenshot contact sheet, performance and memory audit, all wardrobe variants rendering in gameplay and Lab, mobile UI test, short status/release notes and approved snapshot. Address fit regressions rather than broadening catalog.
**Exit:** D2 complete, future expansion catalog remains optional. No forced extra production deployment if checkpoints already cover the completed batch.

## 10. Required targeted tests

### Unit tests
- Catalog contains exactly 12 facewear + 7 eyewear options (excluding None); no duplicate IDs and no invalid option descriptors.
- All legacy style IDs parse into the intended new style/mode; unknown options safely discarded.
- Valid wear/lens/filter/print combinations survive read > edit > serialize > read; invalid combinations normalize without losing unrelated wardrobe choices.
- Eye suppression behind full masks is non-destructive: selection persists and returns when mask removed.
- Material palettes limited by applicable physical material channel.
- Pure compatibility resolver deterministic for same selection, headwear and headset.
- All changes strictly cosmetic; no equipment loadout, kit weight, armor protection or carried magazine ownership changes.

### Geometry and render checks
- Each of the 19 designs constructs a nonempty visual group attached to canonical head, not legacy +X front; named bounds and mask apertures align.
- For every eye covering: lens/eye hole geometry does not occlude exposed face with a skin-colored cuboid.
- For each goggle type: eyes/raised/neck anchor and strap continuity physically checked; unsupported placements do not crash or clip.
- Back and side views show complete fabric hood seams, straps, canister mounts and goggle bands.
- No material draw-order bleed or z-fighting with head, helmet, goggles and mask visors.
- No memory growth after repeated operators opening Studio, cycling variants or playing rounds; avoid per-frame new meshes/materials and unbounded thumbnail caches.
- Idle, walk/run, crouch, aim/turn, reload, downed and replay poses retain visual attachment; no head axis changes and no IK drift.

### Curated visual matrix (avoid full combinatorial explosion)
- **Headwear:** bare + seven approved hats/helmets; separately test legacy bump-helmet asset only for backward compatibility, not as a new approved Studio card.
- **Facewear:** 1-hole + three-hole + open-face + raised gaiter + wrapped shemagh + bandana + tactical half-mask + half respirator + all four gas masks.
- **Eyewear:** all four glasses + three goggles at eyes and representative raised/neck positions.
- **Comms:** none, earpiece, over-ear/boom, helmet-ear where compatible.
- **Uniform / armor:** bare neckline, BDU, ACU, combat shirt, smock, Gorka, soft vest, plate carrier; front, 3/4, side, back.
- **Zoom:** head Lab, full-body operator preview, actual mobile gameplay tactical view.
- **Skin/hair:** at least light/mid/dark complexions and short/long/voluminous hair, checking real apertures and hair hiding.
- Prefer pairwise high-risk configurations + all individual models, rather than a large expensive Cartesian-product screenshot run.

### Critical CI only
- npm run build (TypeScript) and targeted Node unit tests for data, migration, fitting/geometry and persistence.
- One representative Studio/mobile smoke check and existing essential animation/motion regression gate at release checkpoints.
- No 19 separate GitHub Actions releases, no full browser test suite for every individual model commit.
- The current draft PR should not merge until checks pass and merge conflicts (if branch is behind main) are reconciled. Follow project deployment queue/Pages rules.

## 11. Visual acceptance checklist (applies to all nineteen)
- [ ] Item recognizable as its intended family without relying on the label.
- [ ] At 3/4 and side angles, accessory has correct projection and volume.
- [ ] No missing back or floating straps; no geometry intersections with face, headwear or adjacent layer.
- [ ] Readable at normal gameplay zoom on mobile.
- [ ] Color and print look correct for specific material; no accidental global clothing/rig tint.
- [ ] All selected wearing states have independent valid transforms/topologies.
- [ ] Face holes expose actual skin/eye area, no generic flesh-colored inserts.
- [ ] All relevant helmet and headset assembly conflicts handled consistently.
- [ ] Operator identity and appearance remain stable during animation and camera motion.
- [ ] Appearance saves, restores and undoes properly; legacy choices migrate.
- [ ] Performance remains within current mobile budget and no permanent render objects are allocated per frame.
- [ ] Gameplay stats and actual loadout remain unchanged.

## 12. Deliberately out of scope for D2
- The originally proposed 58-candidate expansion catalog beyond these 19.
- Additional near-identical modern gas masks, multiple manufacturing-specific goggle SKUs, heavy winter duplicates, disposable medical masks, side-shield mountaineering glasses and granular respirator brands.
- Animated pulling the gaiter or goggles up/down **during a live mission**: D2 is an editable appearance/wearing configuration, not an in-round equipment interaction. An interactive gear-state system can be planned separately.
- Real PPE certifications, genuine gas/smoke filtration, eye injury mitigation, NVG vision benefits, AI recognition consequences or lens-based night-vision mechanics.
- Helmet redesign, new headset families, boots, gloves, belts or changes to the head skeleton.

## 13. Verified visual reference leads
- Avon Protection FM50: https://www.avon-protection.com/products/fm50/ — twin close-fitting filters and wide single visor.
- Revision Desert Locust: https://revisionmilitary.com/goggles/desert-locust — deep ballistic frame, replaceable clear/smoke lens and head strap.
- U.S. Army approved Desert Locust eyewear: https://cpeground.army.mil/Equipment/Approved-Eyewear-QPL/Revision-Desert-Locust/
- U.S. Army historical M17 documentation: https://mcoecbamcoepwprd01.blob.core.usgovcloudapi.net/library/ArmyPubs/fm%207-11b10-11b20_1978_infantryman%20soldiers%20manual_skills1and2_jul_1978.pdf — cheek-integrated filter arrangement.
- Additional front/side/rear reference photographs should be visually audited before committing the exact proportions of GP-5, M40 and older goggle families.

## 14. Definition of done and release discipline
D2 is finished when **all 19** core models and their deliberately grouped suboptions are in Operator Studio, visible on the actual runtime operator, save safely, have clear material controls, fit around approved helmets/headsets with explainable conflicts, pass critical tests, and look recognizably different in a low-poly mobile tactical view.

Commit each stage to the feature branch. Group compatible work into release A, B and C checkpoints, not one deployment per model. If production is queued/running, remain on the branch. Before merging any release, verify prior production deployment succeeded and GitHub Pages serves its expected build. If check, integration or deployment fails, fix that blocker and verify; never queue overlapping production merges.
