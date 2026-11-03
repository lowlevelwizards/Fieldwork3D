# Camouflage 5A — 12 international patterns + a 30-print mobile catalog

## Release goal
Increase the approved library from **18 to 30 recognizable, named patterns** in
one batch, without flattening countries' distinctive textile designs into one
generic color palette. Pattern identity (shape, scale, orientation, density and
relative color balance) takes priority over deliberately making every option
look maximally unlike its related families.

All new pixel layouts are original, deterministic stylizations developed for
Fieldwork's chunky/pixel aesthetic. They are **not scanned, traced, exported or
manufacturing-equivalent reproductions** of protected modern uniform prints.

## Artwork specifications and physical sampling

| Pattern | Native / physical | Recognizable silhouette | Palette |
|---|---|---|---|
| Belgian Jigsaw (M90) | 64px / 1× | Giant looping/interlocking puzzle shapes, thin dark nicks | New ochre, muted brick-red, turquoise-green; old charcoal family |
| East German Strichtarn | 32px / 2× | Hundreds of narrow predominantly vertical brown rain-dashes on quiet khaki-gray | New subdued gray-taupe, warm brown ink |
| US Mitchell Leaf | 64px / 1× | Overlapping lobed leaves and black branchlets, light olive/tan gaps | Borrow historic greens where useful, new leaf-tan |
| German Splittertarn 31 | 64px / 2× | Hard shard-like angular green/brown macro shapes plus delicate vertical gray-green rain straits | Period khaki, muted reddish-brown and olive |
| Australian DPCU/Auscam | 64px / 2× | Uneven round orange-brown, green and charcoal jellybeans on very pale yellow khaki | New warm Australian sand/brown, moss, gray-olive |
| Italian Vegetato | 64px / 2× | Broken nested brown, ochre, olive and near-black leaf fringes, NOT MARPAT pixels | Warm Italian russet/olive contrasts |
| US Army OCP/Scorpion W2 | 64px / 2× | Long predominantly horizontal sage/umber bands, large fields, few dark flecks and *no* MultiCam vertical twiglet treatment | Related to MultiCam but more muted sage/bark |
| Russian EMR/Digital Flora | 32px / 3× | Pale foliage green field with thousands of small green, red-brown, dark pixels (smaller and lighter than CADPAT) | Distinct Tsifra pale green and dark ink |
| PLA Xingkong/Starry Sky | 64px / 3× | Extremely fine starry flecks over subdued taupe-green/dark organic fields | New neutral olive/taupe/green-gray |
| CADPAT Temperate Woodland | 64px / 2× | Very dark evergreen/black macro masses fragmented by highly visible bright green squares, darker/greener than MARPAT | Distinct Canadian bright/dark forest |
| British MTP | 64px / 2× | MultiCam-family muted pale ground interrupted by distinctive swept DPM-derived hooked/pterodactyl ink shapes | Related tan/sage family; distinct cream and darkest ink |
| Indian Army 2022 digital | 64px / 2× | Olive and earthen multi-terrain stepped blobs of different scale, not CADPAT/MARPAT fractal noise | New warm buff, olive, earth-brown |

**Mitchell reversible cover:** First shipped side is the leaf print. A cloud
reverse can be introduced as an explicitly selectable variation later, with
the same family grouping and its own persistent variant key rather than
silently modifying saved outfits. Do not mislabel the leaf side as its reverse.

## Browser (mobile-first)
- Default **Woodland** tab avoids thirty swatches in one scroll; choose All 30,
  Arid/Desert, Multi-Terrain or Universal to change the first filter.
- Secondary style (Organic, Brushstroke, Fleck, Digital, Geometric, Raindrop),
  origin and search filters. Each item has one primary environment and one
  style, so it appears once rather than duplicated across lists.
- Compatible-only is enabled initially; the global comparison can still show
  unavailable patterns disabled, with their correct metadata.
- Favorites and last five recently used patterns are saved in local storage
  (with safe failure in private/locked-down browsing). Unavailable favorites
  are visible only if compatibility is unchecked.
- Keep actual rendered swatch thumbnail, selected outline, seeded reroll,
  material/roughness details, persistence, Lab pose/camera/lighting.
- 30-pattern raw/tiled comparison gallery is lazy-loaded only when expanded,
  reducing unnecessary canvases on iPhone.

## Headgear and release checks
- Patrol cap and boonie: all 30.
- ACH: 12 new styles supported.
- High-cut: modern technical/camouflage fabrics and Auscam/Vegetato, not
  historical cloth-only patterns.
- PASGT: appropriate historical prints and CADPAT; keep 'solid only'
  models untouched.
- Test all 30 for unique canonical RGBA, observed vs authored color
  coverage, stable seeded variations, correct source scaling on the UV1 atlas,
  correct saved headwear ID, compatible display, and pure taxonomy filtering.
- Build/typecheck + focused headwear test + existing critical gates. Merge
  and deploy after those checks pass.

## Reference and naming caveats
- OCP/Scorpion W2, MultiCam and British MTP have legitimate shared lineage.
  OCP has broader predominantly horizontal fields; MTP has DPM-derived hooks.
  This is intentional resemblance, not three arbitrary unrelated colors.
- CADPAT TW is the earlier green-rich Canadian pattern and must not be confused
  with the new CADPAT MT standard.
- Russian EMR (Digital Flora) differs from older VSR-98 Flora's horizontal bands.
- The Indian government's 2022 camouflage artwork is protected: our original
  pixel art uses only its *general olive/earth and digital* design family,
  never proprietary print artwork, exact mapped shapes or an official insignia.
- US Mitchell and Splittertarn are historical names, not claims of current
  standard issue.

### Public reference checks
- https://camopedia.org/index.php/Puzzle
- https://camopedia.org/index.php/Splinter
- https://camopedia.org/index.php/Russia
- https://camopedia.org/index.php/Canada
- https://www.joint-forces.com/kit-camo/27127-know-your-multicam-oefp-or-ocp
- https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1873430
- https://www.armyandoutdoors.com.au/products/australian-army-dpcu-field-shirt
