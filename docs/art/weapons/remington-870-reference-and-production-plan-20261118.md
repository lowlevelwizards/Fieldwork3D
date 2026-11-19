# Remington Model 870 — reference lock, variant census, art and game-production roadmap
**Status:** research / implementation proposal; **no R870 art, gameplay, catalog or release is approved by this document.**  
**Date:** 2026-11-18  
**Canonical policy:** [Universal Weapon Art & Production Standard](weapon-production-standard.md).  
**Baseline:** Fieldwork3D main (2026-11-18) uses a legacy nonmodular shotgun as 20 authored boxes, compiled to two rigid meshes. Four combat classes exist, including `shotgun`; magazines are detachable for rifles but shotgun reload is a `shells` mode. Do not mistake the legacy placeholder for an 870.

## 1. Product decision and reference hierarchy
Build one outstanding 12-ga **Remington 870 Police-style 18-inch pump**, with traditional walnut stock and ribbed wood fore-end, as the master art/animation baseline; add a matched black-polymer Police/security preset once core is approved. The historical 870 Wingmaster, Express, Police, Marine Magnum, USMC Mk 1, MCS, Tac-14, Super Magnum, and 870 DM are not one freely interchangeable identity; no cosmetic-only shortcuts to special receivers or magazine systems.

**Image hierarchy:** (1) official Remington manuals and factory catalogs; (2) documented original period military/law-enforcement examples; (3) manufacturer-specific accessories; (4) clear collectible / catalog side-view photos; (5) third-party summaries with claims checked against (1–4). Side / opposite / front / top / rear-quarter evidence must be secured for approved preset. Catalog pictures establish appearance, not every fielded organization's exact configuration. Source links are for research, not embedded copyrighted assets.

### Canonical evidence sources / visible features
| Ref | Document | Use and caution |
| --- | --- | --- |
| R1 | [RemArms Model 870 manual](https://www.remarms.com/sites/default/files/documents/870%20Manual%20Final.pdf), drawing p.7 | Receiver/ejection port right side, continuous stock-to-receiver sweep, fore-end, barrel above magazine tube, relative silhouette; gauge/chamber variant exclusions. |
| R2 | [Remington 2018 product catalog](https://gravelagency.com/images/catalogues/2018-Remington-Catalog.pdf), 870 lines pp. 26–32 and specs | Factory synthetics, hardwood security, tactical, Magpul, Marine Magnum, DM, Tac-14. This is a historical 2018 document, not evidence of 2026 production. |
| R3 | [Remington Society 870 chronology](https://remingtonsociety.org/collecting-870-shotguns/) | Wingmaster since 1950; Mk 1; Marine Magnum 1992; Express / Police / Special Field / Small Gauge chronology. |
| R4 | [NRA Vietnam combat shotguns](https://www.americanrifleman.org/content/combat-shotguns-of-the-vietnam-war/) | Late 1960s Navy/USMC 870 service; USMC Mk 1: 21-inch barrel, rifle sights, extended magazine, bayonet mount. |
| R5 | [Remington MCS catalog transcription](https://www.scribd.com/document/501900449/RemingtonDefense-870-MCS-Collapsible) | MCS 10/14/18 barrel configurations, 3+1 / 5+1 / 6+1, specific stock and sight sets. Treat original factory catalog image as authority; verify details before claiming exact preset. |
| R6 | [2018 870 DM introduction](https://www.americanrifleman.org/content/remington-model-870-now-with-detachable-magazine/) and [870 DM differentiation](https://www.shootingillustrated.com/content/review-remington-870-dm-shotgun/) | Distinct detachable-magazine receiver/magwell, not ordinary tube magazine with box mesh overlaid. |
| R7 | [Magpul 870 SGA stock](https://magpul.com/sga-stock-remington-870.html), [MOE M-LOK fore-end](https://magpul.com/moe-m-lok-forend-remington-870.html) | Angular thumb-access grip, spacers and broad heel, hand-stop/end profile; stock and fore-end are separate unique visual parts. |
| R8 | [SureFire DSF-870](https://www.surefire.com/on-demand-5/) and [618LMG fore-end light](https://www.surefire.com/remington-forend-weaponlight-on-demand-option/) | Integrated-light pump **replaces fore-end**, not a light placed over an existing pump. |
| R9 | [Mesa Urbino 870](https://mesatactical.com/urbino-pistol-grip-stock-for-remington-870-12-ga/) and [SureShell side carrier](https://mesatactical.com/sureshell-side-mount-carrier-for-remington-870-1100-11-87-12-ga/) | Clear pistol-grip stock/comb distinction; 4/6/8 shotshell carriers, actual physical receiver side. |
| R10 | [Model 870 DM original official manual](https://www.remarms.com/sites/default/files/2026%20Revised%20Historical%20OMs/Model%20870%20DM%20%28REV%200426%29.pdf) | Receiver and detachable magazine anatomy for a **later** independent build. |
| R11 | [1979 Remington catalog](https://dspace.nplg.gov.ge/bitstream/1234/83549/1/Remington_1979.pdf) | Period field, Brushmaster and small gauge profiles; model/gauge-specific furniture rather than universal interchangeable pieces. |
| R12 | [Remington 870 Police-style wood security photograph](https://store.theshootingcentre.com/remington-870-police-shotgun-12-gauge-3-18-barrel-model-r24901/), [Wingmaster field profile](https://www.midwayusa.com/product/1020216632) | Clean full-side comparison references for the initial wood Police and deferred sporting 870. Exact provenance of catalog picture must be confirmed before labeling it an original historical issue. |

## 2. Identity lock for initial R870 Police 12-ga
**Reference configuration:** 18-inch smoothbore police/security-style full-stocked pump; right-side ejection; subdued steel finish; walnut stock and grooved wood fore-end; simple bead sight; tube magazine. Exact factory SKU/year pending provenance review. This is a **representative police-style preset** until the intended SKU / period is locked.

**Seven silhouette landmarks:**
1. Smooth, long, shallow steel receiver with rounded/tapered forward edge and characteristic large **right-only** ejection opening; no AR-like tall upper rail by default.
2. Stock-to-receiver line is an uninterrupted sporting buttstock sweep; wood comb, thin wrist, and distinguishable buttpad (not a detachable rifle pistol grip).
3. Real trigger and guard negative space below receiver; broad enough for normal-scale icon reading.
4. Fore-end is an independently sliding, ribbed short polymer/wood **sleeve** around the action area; distinguish the ribbed pump from receiver and tube.
5. Two long parallel horizontal forms at front: the barrel **over** the magazine tube; keep air/channel separation and correct distinct endpoints.
6. Short bead/front sight and minimalist top profile, without rifle-style AR muzzle devices.
7. Narrow magazine cap / clamp / extension as separate silhouette elements, avoiding a continuous impossible monolithic front block.

**Prohibited confusions:** not a Mossberg 500 (different receiver/safety/guard and fore-end cues); not the generic box legacy shotgun; not an M4/AR; not a semiautomatic Benelli M4; not an 870 DM with an ordinary box magazine or an 870 MCS breecher falsely represented as factory Police; not a hunting Wingmaster with a 26–30-inch vent-rib barrel relabeled “Police.”

**Art language:** the existing chunky / angular miniature standard, with honest shallow contours and facet depth; full-length receiver must read slender and unified, not bulky stacked boxes; explicit separation of metal, subdued wood and buttpad; avoid decorative rails, bright chrome, single-screw meshes and oversaturated walnut. Match AR/AK/G3/MP5/FAL/FNC/G36 production cameras and palettes. Use authored shape stations and connected topology, not 20-plus displaced cuboids.

## 3. Comprehensive external-part and factory-variant candidate census
Labels: **Core** = build with first release; **A** = next release; **B** = later justified platform; **Research** = known/possible but deferred; **Not interchangeable** = requires another authored receiver/feed/era branch. These are content possibilities, NOT blanket assertions that real-world parts interchange.

| Part / visual system | Candidate art identities and variants | Disposition |
| --- | --- | --- |
| Receiver | 12-ga ordinary steel right-eject Police/Express/Wingmaster cosmetic finish; left-hand historic receiver; 20-ga scaled receiver; .410/28-ga reduced receiver; Super Magnum 3½-inch receiver; DM magwell receiver; MCS service rail receiver | Core right-eject; other **B/Research**; DM and gauges are not interchangeable |
| Receiver finish / marks | polished blued Wingmaster; matte black/oxide Express; parkerized Police/Mk 1; nickel Marine Magnum; restrained proof/roll marks; tactical matte; hunting camouflage | Core parkerized/black and wood; A nickel; B blue and subtle special finishes |
| Stock | classic police walnut / plain hardwood, traditional smooth and checkered comb; full-length black synthetic; Magpul SGA; Mesa Urbino pistol-grip + optional cheekpiece; SpeedFeed stock shell compartment; fixed military synthetic pistol-grip; telescopic M4-style adapter; vintage top-/side-folder; compact/short-length/youth sporting; MCS pistol-grip-only; Tac-14 Raptor birdhead grip; Monte Carlo and English straight stock | Core wood + classic black; A SGA; B Urbino, MCS; Research older folders / sporting |
| Buttpad / cheek | standard thin hard pad, thicker rubber pad, SGA spacer stack/cheek riser; Urbino cheek riser and recoil pad | Core one; A B visible silhouette options when meaningful |
| Grip (semantic slot) | wood wrist / black synthetic wrist / integrated pistol grip / bare pistol grip; **never generic rifle vertical grip cloned onto conventional stock** | Core stock-coupled semantic grip; subsequent pistol grips gated to correct stocks |
| Pump / fore-end | grooved walnut corncob; black ribbed corncob; sporting checkered long wood; flat synthetic checkered; Magpul MOE M-LOK; SureFire 618/DSF integrated light; MCS dual-light pump; tactical rail pump; aftermarket wood; reduced sporting slim 20-ga pump | Core 2; A Magpul, B SureFire / MCS; no stacking independent fore-end with built-in light |
| Barrel front-end | 18/18.5-inch riot / police plain barrel; 20-inch rifle-sight/security; 21-inch Mk 1; 14-inch MCS CQB; 10-inch MCS compact; 26/28/30-inch vent rib sporting; 20-inch fully rifled deer/slug barrel; cantilever slug optic barrel; SuperMag field barrel | Core 18; A 20/21; B MCS and long sporting; model constraints for variants |
| Barrel surface | standard smooth barrel, sport vent rib, rifled slug barrel, fixed / removable choke external contours and front sight bases | Core smooth; B sport and slug; no tiny rifling mesh |
| Sights | bead-only; short rifle front + rear; XS/ghost ring; receiver-mounted rear sight; vent-rib bead; receiver top rail + reflex; cantilever slug sight/mount | Core bead; A rifle/ghost; B optic/cantilever; prevent redundant combined irons |
| Magazine/feed | standard short tube + cap; extended police/Mk 1/Marine full-length tube; MCS-short/medium/full profiles and clamp; DM 3-/6-round detachable boxes and magwell; assorted 12-ga shell representations | Core short tube; A extension; B DM separate architecture; tube is **non-detachable**, not a cosmetic drop-out magazine |
| Muzzle/exterior | simple bare smooth cylinder; removable choke external extension; ported tactical choke; breacher-style external muzzle standoff in authenticated late variants; fixed choke; front sight / muzzle crown | Core bare; B documented extended variants; shotgun muzzle accessories not generic rifle flash hider/suppressor slots |
| Barrel / tube accessories | clamp with sling loop, end cap, extension sleeve, rail/light mount, sling hardware, late tactical accessory bridge; Mk 1 military bayonet **adapter** | Core cap; A extension+clamp; B more; Mk 1 dedicated researched preset |
| Light | separate mounted light on supported 870 fore-end / barrel clamp / rail; integrated SureFire/MCS light in exclusive fore-end visual | A mounted if mount exists; B integral forend; only one active light placement per actual support |
| Ammo carriers | receiver-side 4-/6-/8-shell saddles; elastic side card; buttstock shell sleeve; hard stock carrier; belt/pouch stock to integrate with physical inventory | A 4/6 side saddle; B elastic/stock; exact side placement and pump travel clearances |
| Optic/mount | receiver saddle rail; tapped top rail in supported variants; reflex; ghost ring rail combo; 870 DM optics top; MCS factory rail; slug cantilever scope mount | A one receiver rail+reflex; B platform-specific; no unsupported universal rail |
| Sling | simple two-point with front cap/barrel clamp and rear swivel; sling cup/loop; hunting web strap; period military canvas sling | A period appropriate; avoid per-frame cloth complexity |
| Cosmetics | parkerized; blued; nickel; wood walnut vs hardwood; restrained black/FDE polymer; patterned hunting camo; wear / provenance markings | Modest palette-controlled variants; cosmetics should not create redundant factory presets |
| Non-core identities | Model 870 Wingmaster field and trap/skeet; Express home defense; Police Magnum; Marine Magnum; USMC Mk 1; MCS service/CQB/breacher; DM; Tac-14; Super Magnum; 20-ga compact and .410 | Prioritized separately below |

## 4. Recommended factory preset budget and rationale
**First art/release (2):**
1. `870-police-wood-18` (working ID): classic 18-inch wood Police/security-style, standard tube, bead sights. Representative until factory year/SKU verified.
2. `870-police-synthetic-18`: same receiver/barrel, black synthetic stock and ribbed synthetic pump. Reuse only truly shared art. Prefer no alternate if difference still visually insignificant at game scale.

**Next meaningful presets (3):**
3. `870-police-extended-18`: synthetic Police tactical, extended tube with supported clamp, rifle/ghost sights when verified, optional supported light.
4. `870-marine-magnum`: 1992+ documented satin-nickel receiver/barrel, synthetic furniture and extended tube. Distinct material/faction/era story.
5. `870-wingmaster-field`: wood field model with long vent-rib barrel and its own sport pump profile; adds substantial civilian/hunting campaign context.

**Later conditional historical/specialized (4):**
6. `870-usmc-mk1`: period 21-inch, rifle sights, extended tube, actual Mk 1 bayonet adapter geometry, military furniture; independent historical research gate.
7. `870-mcs-cqb`: 14-inch service CQB, appropriate stock/grip, rail, MCS tube/fore-end.
8. `870-mcs-breacher`: 10-inch original MCS compact receiver/barrel, grip-only; only if game interaction/pose supports a truly specialized tool, not a generic primary.
9. `870-dm-tactical`: distinct factory box-mag receiver and 3/6-round box, new feed UI and reload mechanism. Explicitly **not** a cosmetic combination available on ordinary 870 receiver.

**Do not make separate presets solely for:** various shell saddle counts, tiny rail length changes, pad texture, colors of the same polymer silhouette, sight paints, front cap styles, small optic changes or generic fantasy tactical assemblies. Tac-14 and Super Magnum are parked until missions justify them.

## 5. Architecture audit / required design changes
### Current baseline
- `src/breach-combat.ts`: `WeaponId='carbine'|'smg'|'rifle'|'shotgun'`, `WEAPONS.shotgun.capacity=6`, generic class stats.
- `src/breach-weapon-geometry.ts`: legacy shotgun `PARTS/DETAILS/SIGNATURES` in boxes, physical legacy fallback; 20 authored boxes compiled by `compileLegacyShotgunBody`.
- `src/equipment-weapon-families.ts`: six body slots, `WeaponFamily='ar'|'ak'|'hk'|'fal'|'fnc'|'g36'`, no shotgun platform.
- `src/arsenal/catalog.ts`: AR15/AK/G3/HK33/MP5/FAL/FNC/G36 only; no 870 browsing platform.
- `src/arsenal/live-magazine-capacity.ts`: shotgun explicitly gets class magazine capacity, no detachable magazine item inventory.
- `src/breach-reload-performance.ts`: `shell-tube` mechanism already exists; `breach-pose-v3-reload-weapon.ts` explicitly exempts shells from rifle magazine cant.
- `src/breach-weapon-contact-zones.ts`: rifle family contacts only; new moving fore-end support region is essential.
- `src/equipment-weapon-assemblies.ts`: generic magazine/muzzle/optic/accessory slots may expose inappropriate parts for shotguns; constrain to authored platform mounts.

### Integration contract
1. Add **`r870` as a new authored visual family and `remington870` Arsenal browse platform**, leaving existing `shotgun` WeaponId and saves valid. Prefer an explicit factory/default configuration resolution rather than a class-only special-case fallback.
2. Retain six slot identities for catalog architecture, but interpret `magazine` for ordinary 870 as **integral tube/feed exterior**, never as detachable box. `grip` is the stock-linked wrist/rear hold identity, not an unrestricted standalone receiver pistol grip. Model the pump in `handguard` as independently moving; add optional semantic action/kinematic pieces as children of named parts without breaking six-slot selection. 
3. Define authoritative shotgun visual landmarks, per-variant barrel art, receiver side, tube cap/extension length, pump travel bounds, primary grip, support palm, buttpad shoulder contact, sight line and shot muzzle. Neither a global X=19.5 nor AR fore-end offsets may be blindly applied.
4. Separate `tube-feed` (per-shell load, numeric chamber/tube state) and future `box-feed` (DM only, distinct ammo/mag inventory). First art milestone **does not** change ballistics or save schema. Evolve simulation with explicit migration and tests, separately.
5. Extend attachment gating: receiver rail only when supported, bead/rifle/ghost sights explicitly authored, optic requires valid receiver mount, integrated-light pump excludes redundant add-on light, no default rifle muzzle devices, proper shell saddle clearance during pump travel.
6. Replace the legacy compiled shotgun only after real gameplay, replay, dropped weapon and existing generic kit fallbacks are valid. Preserve its diagnostic comparison capture as a regression fixture if useful.
7. Part motion uses deterministic shot/reload/action timeline; no render-loop allocations. Sliding pump remains visually attached to support hand during cycle when possible; support grip release/reacquire is authored, not IK teleport.
8. Validate 870-only factory catalog ID, stable persistence and inventory. Explicitly mark exact vs representative vs proxy in faction reference and campaign issue; don't equate 870 Police with original USMC Mk 1.

## 6. Mechanical presentation and game experience
**Pump cycle:** firing pose → recoil absorption → support-hand pump pull (barrel/tube/receiver static) → visible ejection from side-correct port → forward pump and settle → reacquire aim. Audible action with separate rearward/forward mechanical beats. Avoid instantaneous pump warp, floating hands, empty-shell ejection without spent round and slide-through receiver. Animation must be deterministic for replay and seek.

**Tube reload:** individual shell appears in support hand, approaches real underside loading area, then is removed from hand as authoritative count increments; can interrupt/resume when simulation supports it. The shotgun should not visually exchange a detachable magazine. A full body pose maintains buttstock/shoulder contact as appropriate; prevent support-hand fingers from occupying pump and shell simultaneously.

**Pose and contact:** check aimed, ready, high/low ready, short-stock, walking/running, crouch, door interactions and two-handed reload. Preserve real shoulder surface and stock length; support palm beneath the actual ribbed pump; test the elbow solution across cycles and transitions to avoid backwards flipping (recent G36 issue), and normal/short-stock transitions. Stockless MCS variants need a separate pose behavior, not the full-stock rig shrunk.

**VFX/SFX:** separate 12-ga sound from rifle classes, audible substantial pump mechanical action and shell insertion, casing/hull eject, appropriate recoil/flash, limited clear identifying particles; do not create new per-frame effects for art. In-game hits and shotgun pellet/slug behavior are **separate game-balance tasks**. Door breaching is an optional authored in-game mission interaction with rules and evidence; not assumed inherent to the first R870 art milestone.

## 7. Staged rollout and stop gates
- **R870-0 References and current baseline:** this document, actual incumbent shotgun screenshots and measured production geometry, compatibility audit, period-preset source lock. **Gate:** one original side, opposite, front/top and three-quarter per first preset, silhouette difference from M500.
- **R870-1 Monochrome master geometry:** actual `addR870Family` production builder behind lab preview and safe test fallback; one receiver outline, trigger void, real curved stock, animated-ready ribbed pump shell, dual-tube front, sights. No live arsenal changes. **Gate:** 64/128 px and equal-camera G36/G3/MP5 and legacy-shotgun sheet, recognizably 870 without materials.
- **R870-2 Structural and contact audit:** credible receiver-to-stock/fore-end, tube/barrel endpoints, right-only ejection, volume/top/front, actual shoulder/underhand palm, no barrel or grip clipping. **Gate:** game-size operator pose including short-stock and elbow polarity.
- **R870-3 Materials, marks, core modularity:** restrained metal/walnut/polymer palette, one atlas only if evidence useful, six stable part names, authored wood/synthetic pump+stock presets; part compatibility/mount logic. **Gate:** measured emitted triangles/meshes/draw submissions; inspect at ordinary mobile scale; no duplicate details.
- **R870-4 Action animation and sounds:** animated pump with IK, recoil/pump/eject/hull, tube-shell reload beats and interruption-safe replay. **Gate:** first/last frames and replay seek deterministic; no reload and pump hand collisions.
- **R870-5 Catalog/kit/mission integration:** Arsenal browser, loadout editor, inventory, Quick Play, campaign/procurement, Operator Lab all-weapons, faction previews gated by actual historical evidence, dropped weapon/debrief. **Gate:** stable existing saves, default generic shotgun migration/fallback, no accidental rifle attachments.
- **R870-6 Focused acceptance/release checkpoint:** test factory/compatibility, shotgun shell/tube inventory, true shared production geometry, multi-angle browser contact sheet at desktop/mobile, build/TS and output performance budget. Human art approval required. Stage commits to an isolated feature branch, batch compatible phases; do not merge until prior Pages deployment proven successful and serving expected SHA.
- **Later branches:** R870-7 extended magazine/Police/Marine; R870-8 Wingmaster/Mk 1 historical; R870-9 MCS/DM specialized only with explicit mission/reload justification.

**Practical measured review triggers:** preserve universal rifle budget as comparative only (20–28 meshes / 400–550 triangles typical rifle; >32/>600 audit), not shotgun hard cap. Log actual `R870` meshes and emitted triangles, named movable draw objects (receiver, pump, tube etc.), extra action-pass costs and delta against the legacy 20-box pre-compile / 2-material compiled fallback. Animated pump must NEVER be merged into the rigid body compiler.

## 8. Open approval questions before R870-1
- Confirm exact first Police-style year/SKU or keep representative label.
- Approve standard walnut + polymer initial presets, with bead sight; decide whether the first modern tactical visual should instead lead with ghost ring.
- Approve the first geometry/finish set before committing to side saddle, long barrel, MCS and DM.
- Confirm whether gameplay modernization (shell chamber/tube semantics, interruptions, and door special-purpose actions) should ship with or following the art family.

## 9. Visual acceptance sheet
One real-production multi-angle sheet for initial wood and synthetic candidates; neutral clay, black silhouette, shared Arsenal lighting, correct actual receiver-side port. Match identical camera, scale, silhouette pixel resolutions and normal tactical operator distance; add front, top, opposite side; pump at rest/rear/full forward, 4 major pose transitions, empty/partial/full tube displays, shell-in-hand reload, muzzle alignment, no stock clipping. Save output with date, branch SHA, reviewer and approval state; screenshot generation alone is never sign-off.
