# FIELDWORK — D2 Batch C reference-based build specification
**Checkpoint:** D2-C first-wave masks / operator wardrobe · **2026-11-04**

## Goal and visual language
Deliver six unmistakable tactical/protective facewear families with a small number of deliberately authored meshes—not a combinatorial SKU library. Silhouettes must read from the Studio close-up and gameplay distance in the established chunky, stubby, low-poly Fieldwork style. No tiny floating panel details, procedural noise, overlapping duplicate shells, or inaccurate generic rectangles. All measurements are *stylized model units*, not historical dimensional claims.

**Canonical head space:** forward `-Z`, right `+X`, up `+Y`; integrate with the existing operator rig without changing head shape, collision, combat, equipment protections, sounds or vision.

## Reference matrix and must-read silhouette cues

| Model / saved wardrobe ID | Visual reference basis | Hard silhouette / geometry requirements | Never confuse with |
|---|---|---|---|
| Tactical half mask `half-mask` | Rigid lower-face tactical masks | Compact nose-and-mouth shell, exposed eyes/forehead, attached cheek straps; **solid** vs **mesh** front modes share one model | Industrial cartridge respirator |
| Half respirator `respirator-half` | Industrial half-face cartridge respirators | Sealed nose bridge and triangular lower mask, twin projecting side filters; **compact-front-filter** as alternate mode | Full-face gas mask |
| GP-5 `gas-gp5` | Soviet GP-5 design: hood enclosing head, two round eyepieces, chin/central threaded canister | Continuous scalp/ear/neck hood and two separate octagonal/round eyes; external central filter with unmistakable vertical drop; no normal multi-strap harness | M17's strap-on mask |
| M17 `gas-m17` | US M17 series: filter elements fit inside left and right cheek pouches | Full facepiece, pair of eyepieces, broad cheek-contained filter pouches, speech/exhale region, conventional harness; no projecting canister | M40 side canister |
| M40 `gas-m40` | US M40/M42 series: binocular rigid eyepieces + side-mounted single canister (often either cheek) | Enlarged two-pane spectacle area, prominent central voice/exhale zone, **single projecting cheek canister**, conventional rear harness | M17 integral cheek filters or M50 twin filters |
| M50 `gas-m50` | Avon JSGPM: flexible panoramic visor + twin low-profile conformal filters | One continuous wraparound visor, sculptural nose/center exhale, mirrored left/right shallow conformal cheek filters | M40 and other round-eyepiece masks |

**Primary visual references:**
- GP-5 hood / circular eyepieces / central canister: https://5drops.ru/product/protivogaz_gp_5_s_sumkoy_s_khraneniya/
- M17 original manual (Army Field Manual 21-40): https://www.govinfo.gov/content/pkg/GOVPUB-D101-PURL-gpo125255/pdf/GOVPUB-D101-PURL-gpo125255.pdf
- M17 cheek-mounted replaceable filter arrangement (US Army training): https://mcoecbamcoepwprd01.blob.core.usgovcloudapi.net/library/ArmyPubs/fm%207-11b10-11b20_1978_infantryman%20soldiers%20manual_skills1and2_jul_1978.pdf
- M40 side canister, rigid two-eyepiece system: https://man.fas.org/dod-101/sys/land/m40m42.htm
- M50 manufacturer brochure: https://www.avon-protection.com/media/embdjwnr/avon-protection_m50-respirator_product-brochure_en.pdf
- M50 official US military product presentation: https://www.af.mil/News/Article-Display/Article/118535/ramstein-airmen-improve-training-effectiveness-with-new-m-50-mask/

These references establish visual form factors only. This is not a mask-functionality, filtration or safety certification project.

## Implementation stages and acceptance

### C1 — Two lower-face families
- Build `half-mask` and `respirator-half` in `src/operator-d2-mask-visuals.ts`. Wear modes must be mutually exclusive prebuilt groups; toggling must never reallocate geometry.
- Independent shell and filter materials; parent rig materials must remain unchanged when recoloring facewear.
- Runtime/save readers validate and preserve mode/color; changing the selected face model must not reset unrelated wardrobe state.
- Critical test: topology presence, mode names, independent materials, stable geometry identity.

### C2 — GP-5 hood and M17
- GP-5 has no helmet-shaped floating top and no conventional head harness. Round eyes and central filter must read from 3/4 view.
- M17 cheeks house their filters; filters may not become protruding M40 canisters. Exposed hardware must attach to the actual mask.
- Critical test: each family contains exclusive visual landmarks; no duplicate facepiece rendered below another family.

### C3 — M40 / M50
- M40 preserves a single asymmetric side canister (one per mask, not one per cheek). Eyepiece system reads differently from round-eye GP-5.
- M50 uses one continuous large visor and a pair of shallow low-profile filters. The filter silhouette must read at Studio distance.
- Legacy `gas-mask` should migrate to `gas-m40`; saved custom eyewear and communications preferences must not be silently deleted when mask visuals suppress them.
- Critical test: one M40 projecting canister, exactly one M50 visor and two cheek filters, 12 facewear + 7 eyewear core IDs.

### C4 — Studio fitting / compatibility / quality
- `readWardrobe` retains version 1, respects cosmetic vs actual equipment boundaries; only mask visual state changes.
- Temporarily suppress conflicting goggles and headset meshes **non-destructively**; restore saved choices when facewear changes.
- Hide hair under the GP-5 hood; audit intersections with caps/helmets, shoulders, eyewear and neck from FRONT, 3/4 and SIDE, plus gameplay-distance rendering.
- Show construction modes and muted material swatches only for applicable mask models.
- Model complexity: confident silhouettes and coherent contact surfaces, not extra tiny boxes. Never introduce frame-rate-sensitive mesh allocation.
- Critical gates: `npm run build`/TypeScript, D2 mask + existing eyewear/wardrobe regressions, Operator Studio mobile smoke. No exhaustive suite required.
- **Release discipline:** commit stages on feature branch, merge one compatible Batch C release only after prior Pages run reports success *and* public `fieldwork-build.json` is verified. If Pages stalls, hold subsequent merges.

## Camera and review companion (separate release)
Studio camera should smoothly move its `OrbitControls.target` to the selected category (head, torso, hips, legs, knees, boots, hands/wrist or pack), adjust orthographic zoom, preserve gestures/orbit unless a specific view is selected, and support FIT for an immediate complete-operator view. The camera change must not affect rig pose, equipment choices, look saving or thumbnail rendering. Test focus targets, clamp zoom, category transitions and view-button behavior independently of cosmetic model changes.

## Completion definition
D2 first-wave is eligible for sign-off only when all 19 underlying model IDs are available, saved selections round-trip, incompatible overlays are render-only suppressed, Stage C builds/tests pass, and GitHub Pages serves the expected release artifact. Any remaining art-level clipping should be enumerated as follow-up polish rather than represented as mechanically correct protective equipment.
