# Armor R8 — iconic default appearance

A default is the source of visual identity **only when the selected armor
has no compatible, explicitly chosen solid color or camouflage**. It does not
modify protection, ballistic behavior, save format, rig/pack colors or the
uniform materials. "No armor" has no default because there is no visible shell.

| Selectable armor | Starting appearance | Visual fantasy |
|---|---|---|
| Concealable Soft Armor (`soft-slick`) | **Khaki** | Light concealed fabric worn under the uniform |
| External Police / Tactical Vest (`soft-vest`) | **Black** | Classic police/SWAT external ballistic vest |
| Traditional Fragmentation Vest (`soft-flak`) | **Olive Drab** | Thick vintage green flak canvas |
| Slick plate carrier (`plate-slick`) | **Ranger Green** | Minimal commercial low-profile carrier |
| Light / Skeletonized Plate Carrier (`plate-jpc`) | **MultiCam** | Modern Crye-inspired skeletonized tactical vest |
| Standard Plate Carrier (`plate-standard`) | **Coyote Brown** | General-purpose modern modular nylon carrier |
| Heavy Assault Plate Carrier (`plate-heavy`) | **Black** | Dark, imposing heavy assault silhouette |
| Legacy Full-Coverage Military Armor (`plate-legacy`) | **M81 Woodland** | Early Interceptor-era overt protective shell |

Nonselectable legacy alias `soft-paca` inherits **Khaki**. The `armor-bare`
sentinel does not instantiate armor textiles.

## Source context
- [Crye JPC 2.0 official](https://www.cryeprecision.com/JPC-2-0): MultiCam and several modern solid options; the game's JPC is an abstracted family, not a product replica.
- [U.S. Army — equipment camouflage transition](https://www.army.mil/article/73762/central_issue_facilities_equip_soldiers_for_the_battlefield): OD, woodland, desert, UCP and later transitional fabrics in issue inventories.
- [Smithsonian — Interceptor armor](https://americanhistory.si.edu/collections/object/nmah_1803527): historical basis for broad Interceptor-era protective carrier forms.

The set is intentionally symbolic. Modern heavy/standard styles are composites
rather than literal catalog products. Manual approved armor material selections
take precedence. On switching back to Iconic Default, stored manual values for
the armor channel are cleared; other channels are untouched.

Regression coverage: `tests/operator-armor-r8-default-color.test.mjs` tests
each of eight visible armor styles, visual color and print material, switchback,
and manual overrides including previously saved incompatible choices.
