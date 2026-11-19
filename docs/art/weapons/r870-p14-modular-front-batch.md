# R870 P14 — modular 870 release batch
## Stage A — front hardware, true shell capacities and tactical length
- One shared pure data contract in `r870-front-p14.ts`: 18in (x19.20) or 14in (x15.36) barrel, and 6/4/8-shell standard/compact/extended fixed tubes. These are **Fieldwork art units**, not instructions for real firearm modifications.
- Preserve old factory part IDs, save recipes, and shot-time data. All visual barrel tips and assembly muzzleX now use the same selected keyed barrel.
- Standard tube/18in and extended tube/18in are compatible; 14in must use short tube and compact polymer pump. Arsenal proposes dependent changes together, rejecting physically inconsistent combinations.
- Extended tube has one large barrel/tube clamp: no decorative bolts or tiny mounting geometry. Compact tube cap clears the short pump.
- `liveMagazineCapacity` is authoritative for 870 capacity. Reducing a loaded tube from six to four shells returns overflow to the reserve pool; never silently destroys ammunition.
- Underhand support reach ends on the selected moving pump, not in empty space.

## Stage B — recognizable stock/pump furniture
- Black synthetic Police uses the exact approved P13 Police silhouette with pooled black-polymer finish; it is a finish/preset, not gratuitous new geometry.
- SGA-style rear uses a **new eleven-point grip and eight-point stock** with pronounced angular shoulder/heel, original paired-part architecture and no exposed seam. It is not a recolored Police stock.
- Police ribbed pump, compact black pump and angular M-LOK fore-end use the shared low-poly six-sided sleeve architecture. M-LOK has prominent oversized end stops and three paired side marks; all move with the fore-end.
- Presets: Police Wood (unchanged), Police Extended, TAC-14 style, Police Synthetic, Tactical Magpul style. No fabricated unique receiver/caliber.
- No new accessories, fictional internals, ammunition damage changes or weapon classes.

## Release gates
1. Focused P07–P14 model, complete factory, fitting compatibility and 4/6/8 shell tests.
2. TypeScript and production build, Ground Zero smoke, three-view WebGL as required.
3. Group A+B into ONE merge checkpoint; check last Pages build succeeded and public build stamp matches current main. If another Pages run is in flight, develop on the feature branch rather than merge.
4. After merge, confirm deployed commit SHA and public GitHub Pages served build ID.
