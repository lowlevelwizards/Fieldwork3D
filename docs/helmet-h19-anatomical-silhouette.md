# H19 — Anatomical Low-Poly Ballistic Helmet Cut Spec

## Intent

Fieldwork remains chunky, iconic, flat-topped, oversized and low-poly. H19 is **not** a smooth/round/realism pass. The three helmet cuts must be readable by negative space and protective coverage alone. Keep Full-Cut and Mid-Cut at their approved H18 outlines; fix only canonical High-Cut (`mich-2001`).

## Existing head cube, canonical coordinates

The actual head bone and its 8×8×8 mesh are **not modified**. +Y is up, -Z forward, +X operator right. Head is centered Y3, bounds Y-1..7, X/Z -4..4.

These are artistic landmarks projected onto the existing block, **not** additional facial geometry:

| Feature | Canonical local reference | Visual role |
|---|---:|---|
| Top of head | Y7.0 | Crown is above this and wraps the sides |
| Hairline | Y5.7 | High-Cut lower edge should sit below this |
| Brow | Y4.3 | Short frontal brow and solid temple |
| Eyes | Y3.65 | Exposed face, below the helmet rim |
| Ear top | Y4.0 | High-Cut should expose the ear, not float two units above it |
| Ear center | Y2.6, Z+.5 | Place ear opening slightly behind middle of head |
| Nose base | Y1.85 | Face landmark |
| Ear bottom | Y1.35 | Full-Cut protects substantially more than High-Cut |
| Mouth | Y+.65 | Face landmark |
| Nape | Y2.2 | Deeper Full/Mid rear protection |
| Chin | Y-.65 | Chin retention webbing, no added head faces |

## Visual acceptance

1. **High-Cut over-ear:** opening bottom around Y4.78 (0.78 above ear top), not Y6.155. Forehead/brow at Y4.55, rear at Y4.12. This establishes a short front shelf, one shallow angular rise to clear the upper ear, broad flat ear opening, and one rear drop.
2. **One continuous shell:** same flat crown, single top chamfer, and one contour-driven side mesh as Full/Mid. Six ordered hem stations per side; 29 exterior quads/58 triangles per shell.
3. **Edge binding:** follow exactly the same hem, height .42 for High-Cut, with no stepped spikes and at most .095 units outboard. Full/Mid binding remains .52.
4. **Cover:** use the same hem and binding height. No open corners or shell-colored protrusions from overlapping side boxes.
5. **Hardware:** screws are close to the actual side contour; upper accessory station remains independent of the lower opening to avoid rails falling down with the new ear cut.
6. **Preserve:** silhouette IDs/wardrobe migration, color/camo customization, straps, approved Full/Mid, no simulation or frame-by-frame geometry changes.

## H19 exact right-side hem (mirror for left)

\`\`\`text
front (Z-5.71,Y4.55) -- temple (Z-3.28,Y4.55)
                      / ear rise to (Z-2.32,Y4.78)
                      -- ear clearance to (Z1.42,Y4.78)
                      \\ rear return to (Z3.14,Y4.12)
                      -- rear nape (Z5.66,Y4.12)
X = 5.015 at all stations
\`\`\`

## Perf and regressions

- One cached/built-on-selection shell BufferGeometry, one mesh, 58 triangles, no new runtime physics.
- Geometry source and rubber/cover profiles use a shared immutable six-point array.
- Test side-on, front, back, 3/4, with fabric cover toggled, straps toggled, comms/rails active.
- Verify in actual iPhone viewport and at small live gameplay scale. Pass CI + Operator Studio mobile smoke before merge.
- No production deployment or main merge without an explicit release checkpoint.
