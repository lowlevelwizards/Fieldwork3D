# Stage 1K — Anatomically fitted headgear remakes

## Why remake instead of scaling

Stages 1F–1J formed most soft hats from broad **solid boxes** at Y5.5–Y8.8, meaning they had to stay far above the eyebrows to avoid blocking the face. The old SSh-40 silhouette was three **full rectangular slabs**, while the PASGT was a fuller ACH without a sufficiently distinctive older-style brow and skirt.

Stage 1K changes the construction itself. A cap top closes the skull **above** its actual crown; four joined walls envelop the head perimeter and leave the lower face and center of the head OPEN. Brims and cuffs follow those actual fitted lower edges. Visible forms remain large and deliberately simple even where multiple source cuboids are necessary to make a hollow ring.

The unchanged head reference remains: top Y7, brow Y4.3, upper ear Y4.0, ear center Y2.6, nape Y2.2, front -Z4, side X±4. These are visual fitting coordinates, not new anatomy. No changes to gameplay physics or combat stats.

## Per-family target

| Wardrobe ID | Visible design intent | Current fitting target |
|---|---|---|
| patrol-cap | Integrated flat crown and one decisive anchored bill; four sidewalls read as ONE cap body | crown Y8.22, temple Y4.70, bill forward Z−7.335 |
| boonie | Deep fitted fabric crown and ONE continuous open-center all-around brim, not a solid platform | crown Y8.18, side/brim lower Y4.54, brim extends X±6.69 |
| beanie | Snug fitted head sleeve, ONE broad folded cuff; ears partly covered | crown Y8.18, cuff bottom Y3.77 |
| pasgt | Original US PASGT: short projecting brow at eyebrow, deep ear/nape skirts, broad domed shoulder | peak Z−6.08, brow Y3.98, ear/nape Y1.79 |
| soviet-steel | Soviet SSh-40: upper dome broadens into hollow bell and flared structural lower perimeter | dome Y8.86, front flare Y4.01, side flare Y3.605, rear drop Y3.55 |

**Protected assets:** `ach` and `high-cut` cuboid source arrays and their Stage 1E fit targets are unchanged.

## Historical reference decisions

- PASGT design: original PASGT style, **not** simply an inflated ACH. U.S. Army fitting guidance explicitly places its brim at the eyebrow and its lower side coverage below the corresponding ACH fit. See the PASGT and ACH visual fit diagrams in [U.S. Army safety guidance](https://safety.army.mil/Portals/0/Documents/MEDIA/MEDIAARCHIVE/MAGAZINES/COUNTERMEASURE/Standard/CM2005.pdf) and the [PASGT side-profile collector photograph](https://www.foxholemilitaria.com/product-page/u-s-army-pasgt-l-8-kevlar-helmet-cold-war).
- Steel helmet design: **Soviet SSh-40**, not SSh-68, M1 or Stahlhelm. The SSh-40 has a comparatively hemispherical dome and a wider lower flare than the more conical SSh-68. See [SSh family identification reference](https://internationalmilitaria.wordpress.com/2021/01/11/guide-on-identifying-soviet-russian-ssh40-ssh60-and-ssh68/) and [worn SSh-40 side profile](https://www.imcsmilitaria.com/shop.php?code=64818&photo=3).

## Construction acceptance

- At head-center coordinate (0,5.1,0) soft-hat shells remain **empty**; their sidewalls and crowns provide the visible form instead of face-covering solids.
- At X4.4,Z0 the soft headgear wraps the actual upper-forehead / upper-ear region, not just hairline Y5.7 or above.
- PASGT forehead, ear and nape coverage all extend distinctly lower than ACH, with an actual projecting brow.
- SSh-40 flared sides extend substantially beyond its bell walls while leaving the face unobstructed.
- Every model is emitted as a single exterior mesh via `unionCuboids`; all authored volumes overlap with a real margin.
- No materials, chin straps, camo, buttons, rails, stitching or secondary detailing in this stage.
- Front, side, rear, three-quarter and normal gameplay-distance snapshots are still subject to **user visual approval**; numerical shape tests are not an artistic sign-off.

## Release checklist

1. Focused unit tests: geometry topology, actual spatial occupancy, anatomical perimeter, five family distinctions and protected ACH/high-cut regressions.
2. Production typecheck and build.
3. Confirm GitHub PR gates, then merge.
4. Confirm Pages deployment when status visibility permits and verify build stamp on iPhone.
