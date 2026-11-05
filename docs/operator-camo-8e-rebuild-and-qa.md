# Camouflage 8E — two rebuilds, one restrained polish

## 8D release baseline
8D's Soldier 2000 was recognizable, but too pale/pixel-busy; M98 looked like near-monochrome tan fields when mapped onto actual cloth; JGSDF resembled broad reddish-green woodland rather than a dot-cluster pattern.

This is a **same-ID artwork replacement** for only:
`norwegian-m98`, `jgsdf-type2`, `south-african-s2000`.
Other 51 registry IDs, garment eligibility, density, save/load, seeded cutting and all gameplay are out of scope.

## Stage A — M98 composition rebuild
- Replace the old `NORWAY` primary shapes, three auxiliary medium lobes and two-pass single-pixel smoothing with `NORWAY_8E`: a deliberately layered three-color master with **27 authored, asymmetrically rounded polygons**.
- Long trunks, warm tan inlets, olive negative-space sweeps with two final dark medium lobes and two olive inlets break oversized single-color panels.
- Fixed-color index master 64×64, exactly inks 0,1,2. Palette stays unchanged; density remains **2.55** (64/2.55≈25.10 world units).
- Independently computed pre-integration canvas geometry coverage: **~32% olive, 32% forest, 36% tan**. All 32×32 sectors have all three inks; no quadrant over ~59% one color.

## Stage B — JGSDF Type II generator rebuild
- Replace 8D's 22 fixed large parent spots entirely with **100 jittered 10×10 family centers**; no renderer or UV changes.
- Each center yields a 5–8px authored medium fleck plus two or three overlapping small lobes and an occasional attached 1–3px chip.
- Per-cell seeded roles favor dark green; red/khaki/charcoal are smaller accents. Some satellite skips expose leafy green channels.
- Render only motif bounding boxes using existing `paintOnto`. The 64px master is immutable/cached after its first build, no per-frame work.
- Keep existing five-color palette on first review to isolate geometry improvement.

## Stage C — Soldier 2000 subtle refinement
- Preserve the entire 8D primary polygon structure and maximum 56px optional green island growth.
- Only reduce auxiliary pin mark frequency (acceptance threshold 0.63→0.68; roughly 14% fewer candidates in that pass), and change pale sage index 3 from RGB `183,198,171` to `167,184,159`.
- All other inks and artwork remain 8D. Ground remains above 38%.

## Stage D — rendered fabric review
- Keep the established M98 2.55 and JGSDF 3.2 repeats unless fixed-light captures demonstrate a specific error.
- Extend the **read-only Operator Armor/Rig Lab** with opt-in `camoBoth=1` to print an identical master on BDU jacket and trousers. No player save, normal lab or production Quick Play behavior is affected.
- `capture-operator-camo-8e.mjs` records **3 raw master PNGs** and **18 WebGL mobile captures** (3 patterns × front/side/back × detail/gameplay, same viewport, camera/light/pose), using a dedicated PR workflow.
- Production photos in the user feedback serve as the 8D visual baseline. These fixed-light 8E captures are the reproducible after-state.

## Focused QA and release
- `tests/operator-camo-batch8e.test.mjs`: 54 IDs; M98 three-ink palette, 28–41% coverage and 32px crop variety; JGSDF five-color balance, 16px locality and smaller motif complexity than M98; Soldier 2000 brown threshold, pale-sage palette; 5 seeded cuts and shared cloth texture/nearest filter.
- Continue compatibility checks from 8D, 8C, 8B, 8A and 7C where meaningful. Verify PenCott↔GreenZone and Typhon↔Highlander frozen masks.
- No full game suite per PR; production build runs TypeScript + Vite. Art visual workflow runs only mobile camo captures.
- Commit each independent stage on feature branch; merge once only when focused CI and browser capture pass, current Pages build stamp is verified, and no deployment is queued/running. Then verify new public build stamp and deployed commit.

## Visual review caveat
Image artifacts can demonstrate how 8E maps to the operator, but automated color coverage alone cannot prove historical accuracy. No claims about reference-perfect reproduction until human comparison of the rendered 8E files is completed.
