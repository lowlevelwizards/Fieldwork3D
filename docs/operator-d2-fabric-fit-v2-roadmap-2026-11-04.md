# D2 Fabric Fit V2 — Reference and implementation gates

Date: 2026-11-04 · Source: user's ten iPhone Studio captures of first-wave facewear, production build `aea95c9`.

## Visual target
Preserve the approved chunky, stubby, rectilinear Fieldwork aesthetic and the existing 8×8×8 skull. Replace conspicuously solid floating cubes with physically connected, **hollow, exterior-only** textile geometry. Apertures must be true holes exposing the character's unchanged face. Material scale must remain 1 operator world unit per pixel; avoid curves, hard plastic plate appearance, double surfaces, microdetail, and disconnected folds. Facewear must be cosmetic: never alter protection, loadout, IK or enemy vision.

## Screenshot audit and reference constraints

| First-wave model | Capture defect | V2 acceptance |
|---|---|---|
| One-opening balaclava | Helmet-like square body; huge eye window | Snug skull shell, controlled single stepped eye slit, continuous chin/neck |
| Three-hole balaclava | Square windows, oversized mouth, detached bands | Two distinct eye holes, smaller mouth, joined nose bridge; eyes-only remains a wear option |
| Open-face balaclava | Empty rigid box/cutout with no facial definition | Close-fitting side/brow rims, real exposed face and connected throat |
| Gaiter — lowered | Rigid floating oversized neck collar | Gathered shorter neck tube, two large folds |
| Gaiter — mouth | Flat rigid slab on mouth | Cheek-fitted upper rim under nose; tapered neck below |
| Gaiter — nose | Almost same as mouth | Higher upper edge and central nose projection |
| Shemagh — draped | Cloth drape cropped; collar reads as a box | Full layered triangular chest bib and asymmetric tail; looser camera framing |
| Shemagh — face wrapped | Face nearly bare; floating face strips | Connected nose/mouth panel joined around cheek/back with hanging drape |
| Shemagh — head wrapped | Bare head with narrow bands | Full crown, side and brow wrap above real open eye band |
| Bandana — raised/lowered | Disconnected straight horizontal strips | Narrowing stepped triangular front, fitted side ties and attached rear knot |

## Five release stages

- **F0** — Main portrait and item cards use the same clothes-only presentation for FACE. Exposed face uses subtle eye marks in both.
- **F1** — Establish consistent hollow fitted head/neck cloth contact using exterior cuboid union geometry and actual apertures; no double surface.
- **F2** — Three balaclava silhouettes rebuilt on the shared surface. Two-hole option stays within one three-hole family. Run front-ray and saved-mode tests.
- **F3** — Three gaiter wear states rebuilt as gathered/taut variations with a narrow neck, single nose ridge and no free slab. Test progression in upper-edge height.
- **F4** — Shemagh and bandana have physical drapes / triangles / ties. All wear modes remain saved, stable, mutually exclusive, and geometry is constructed only once per rig.
- **F5** — Mode-aware Studio framing (scarf chest stays visible), screen-card parity, face geometry tests, color/save/kit regressions, mobile studio smoke, and gameplay-distance comparison.

## Release discipline
Maintain work on `feature/d2-fabric-fit-v2-20261104`. Commit each coherent stage, build and run focused tests on PRs. Split release checkpoints: **R1 = F0/F1/F2**, **R2 = F3/F4/F5** when independently verified. Do not merge or queue R2 until R1 Pages build stamp verification reports success. If the Pages API stalls with blank status, investigate or make a fresh documentation-only release run; don't mutate working geometry merely to re-trigger the backend.

## Hard invariants
- unchanged root/head orientation `-Z-forward,+X-right,+Y-up`;
- real openings verified by front raycasts; no box covering a cutout;
- geometry/material state toggles preallocated; no re-meshing on each render;
- wardrobe v1 saves and separate equipped kit remain authoritative;
- facewear palette only colors facewear, never helmet or armor;
- thumbnails and large preview show the same visible layers;
- glasses, goggles, masks, weapons and gameplay collision unaffected.
