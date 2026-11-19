# R870 P09 — Police wood iconic-form identity lock
**Scope:** Art-only production geometry. No change to shotgun simulation, pump/reload animation, stock/muzzle rig datum, inventory, factory recipe, or historical factory labeling.

**Design goal:** The plain classic 870 should be distinguishable from future pump-action families by a *combination* of authentic receiver, wrist, fore-end and magazine relationships rather than accessories or artificial decoration. Recognizability at normal Fieldwork/Arsenal scale takes precedence over dimension-perfect reproduction. The real 870 and Mossberg 500 are closely related in overall external layout and will not always be distinguishable in a 64-pixel pure silhouette: do not invent difference where none exists.

## Visual identity / reference hierarchy
1. Original 870 reference and nomenclature: [Remington Model 870 manual, major parts diagram](https://www.rem870.com/remington_model_870_manual.pdf).
2. [870 Police walnut short-tube exemplar, Model R24901](https://store.theshootingcentre.com/remington-870-police-shotgun-12-gauge-3-18-barrel-model-r24901/) — useful side proportion/photo, but exact match of period/SKU is *not* claimed in Fieldwork.
3. [Police old-stock wood stock / corncob fore-end reference](https://www.ebay.com/itm/335923903034) — broad comb/wrist, rounded fore-end taper/ribs. Marketplace listing is appearance evidence, not authority for manufacturer part compatibility.
4. [US justice reference, Remington 870 part nomenclature](https://www.ojp.gov/pdffiles1/Digitization/43417NCJRS.pdf) — steel receiver, side loading/ejection, double action bars, magazine tube cap; no reason to add a fake rail or generic rifle grip.
5. [Traditional police trade-in front-end detail](https://www.sportsmansoutdoorsuperstore.com/products2.cfm/ID/246974/870pmused69/remington-870-police-magnum-12-gauge-police-trade-in-shotguns-with-wood-stock) — actual short capped tube under significantly longer plain barrel.

## P09 production rules
- **Stock / integrated grip:** broad flat shoulder heel and subtly raised comb, full wooden belly and a rounded, shallow grip wrist. The `stock` and `grip` UI slots have a mathematically shared join profile, equal material and depth. No hook, no rifle pistol grip, no free-floating wrist, no tiny screws.
- **Receiver:** rounded rear crown / slightly arcing top, 12-station polygon max, tapered nose and lowered front edge. Avoid tall angular top rail / receiver mass. Build a shallow central steel core and one thin actual side skin per side.
- **Right opening:** the +Z outer steel side has a physically **open profile-frame hole**, with recessed dark backing and smaller bolt face behind it. The -Z steel skin remains unbroken. The port is larger than P08 and has softened/chamfered corners, but is still subordinate to receiver mass.
- **Pump:** six longitudinal profiles connected by eight-sided cross-sections, width bulges in the middle and narrows at both ends. Four deliberately oversized vertical channels per visible side conform to the local outer surface. Keep all nine pump-marked objects individually addressable for later synchronized pump animation; currently static in operator/Arsenal.
- **Barrel / feed tube:** same six faces as other family weapons, but with larger radii for legibility and subtle facet roll; barrel visibly longer than lower magazine tube. Magazine cap is now a **six-sided rounded profile**, not a square dangling piece. No box-mag or muzzle device. Fixed-feed logic remains unmodified.
- **Render/cost:** preserve the shared builder, six selectable body identities, same shared materials and asset cache, no new texture/atlas, geometry created on configuration changes only. Avoid per-frame creation.
- **Pose:** stockX=-15.78, muzzleX=19.20, muzzleY=.94 unchanged. Update only pump fore-end extent [2.65,11.50] and preserve the existing under-fore-end support-hand contact window.

## Comparison/acceptance
Review same-camera plain 870 right-side, left-side and three-quarter views (using `arsenal-r870-p07-capture.html` but labeled P09), alongside P08 screenshots. Check: side port opens ONLY on right; back of stock is not hooked; pump is truly swollen from front/side views; no detached fore-end or square tube cap; barrel six-facet termination visible; no new rail, trigger guard, modern muzzle device or box magazine; legacy shotgun and six-slot saves still work. Afterwards test operator shoulder and under-pump grip, short stock and reload separately before approving action animation.

**Status:** P09 feature branch art; final approval requires browser screenshot and operator visual review. This document does not claim the model is already deployed.
