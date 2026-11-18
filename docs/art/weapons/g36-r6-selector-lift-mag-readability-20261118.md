# G36 R6 — selector lift and magazine legibility

**Review request:** User agreed to two tightly scoped follow-ups from their November 18 R5 side-on mobile capture: move the SEF control up around 0.25–0.35 units, tighten its S/E/F arc roughly 10% while staying on the trigger housing, and make the five curved smoked-magazine impressions around 75% thicker and 10–15% more contrasty. No additional gun geometry.

## Stage A — proper selector relationship, without buried type

- Both existing ambidextrous physical SEF selectors move from pivot **(-5.20,-1.96)** to **(-5.20,-1.68)**: +0.28 vertical. Same existing six-sided hub and broad angled lever, same left/right placements and identical factory part naming.
- The three existing letter quads on both receiver sides tighten horizontally on the *actual flat lower housing plane* at z=±1.185:
  - S white moves **(-3.87,-1.86)** → **(-3.94,-1.84)**;
  - E red moves **(-6.03,-2.00)** → **(-5.97,-1.98)**;
  - F red moves **(-6.03,-1.66)** → **(-5.97,-1.66)**.
- Important structural constraint: G36 upper receiver side extends to y=-1.49 at depth 1.25; the flat lower trigger-housing face extends only over approximately -2.18..-1.49 at depth1.14. **Do not move all three letters +0.28**: that would hide F under the upper receiver again, recreating R4's bug. Instead raise the lever, nudge letter centers while preserving full glyph footprints between y=-2.18 and -1.49, and leave F/E/S projected on one flat plane. Their nearest visible edge clears the 0.55-radius pivot. The compact glyphs still represent correct HK F upper-left, E lower-left, S right.
- Change only existing placement values and visual tag `r6-raised-indexed-sef`; no new meshes, geometry, texture, selector mechanism, animation or stat changes.

## Stage B — five bold, curved, not stripey, smoke-polymer marks

- Preserve R5's local magazine coordinates **t,u** from `arMagazineSample(G36_MAG30_CURVE,t)`, five stations, staggered tapered shapes, five line placements and two molded coupler points.
- Increase stroke half-width in magazine-length fraction from **.015 → .02625** exactly **+75%**. Each painted mark now spans roughly two 96px atlas pixels in its central part, readable at mobile Arsenal views.
- Contrast increase measured relative to the existing white 255 atlas texel: main cartridge gray values from **230 → 227** (darkness 25→28, +12%) and **234 → 231** (darkness 21→24, +14.3%). Soft boundary gray from **244 → 243** to retain taper. Existing two coupling values 220/246 remain unchanged.
- A slightly wider .60 center-area fraction (was .52) keeps the stronger central stroke visible; no regular full-width fake ribs, no new magazine polygons, no actual transparency. Only one cached 384×192 atlas used for both magazine side tiles.
- Preserve physical magazine and genuine R3 5.56 magwell, R3 muzzle, R5 SEF authenticity, H3 handguard, V13 stock, O3 optic identity. Factory sound/range/reload/attachment stats unchanged.

## Acceptance and integration

- Exactly **476 triangles and 23 meshes** live and in blockout. SEF quads remain 12 triangles in 1 mesh. No additional GPU resources, material clones or draw calls.
- All 6 S/E/F letter quads above trigger guard, below upper side and not inside physical pivot; 2 selector hubs move together +.28; both magazine face tiles equivalent and alpha 255.
- Darkened magazine strokes should now decorate about 850–1100 out of 9216 pixels per side; rest of magazine base unpainted.
- Add dedicated R6 tests; rebaseline legacy R1/R3/R4/R5 selectors and old magazine swatch values. Run focused G36 tests, TypeScript/build, exact-head real WebGL side/quarter/mobile/64px/128px capture plus Arsenal and Ground Zero critical integration.
- Commit to feature branch, hold merge for review until user requests release. GitHub Pages production should not be queued without explicit approval.
