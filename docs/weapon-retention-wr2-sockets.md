# WR2.0 — Art-envelope socket candidates
The new pure helper derives candidate exterior game-art points from the existing installed receiver, stock and fore-end bounds. The existing partVisualBounds helper in weapon-visual-anchors.ts is the intended source. Cache the result when the configured silhouette is rebuilt. The helper deliberately does not alter live artwork, attachment eligibility, strap endpoints or gameplay.
Remaining WR2: connect actual silhouette bounds, audit every preset and stock position, override seats where envelope-derived positions fall into empty geometry, add shared mount/strap ownership, validate visuals and coordinate with weapon-art changes. Use the resolved weapon assembly mass/balance/inertia instead of creating duplicate data.

WR2.1 captures root-local candidate metadata before rigid compilation, including nested stock transforms. It does not yet drive visible straps or mounts. The previous remaining checklist still applies to artwork validation.

WR2.2 transfers candidate metadata to the existing live held/drop rig groups and adds a production-catalog regression over all references and alternate stock positions. This checks finite candidate points, not exact hardware contact or visual authenticity. No render pose consumes these seats yet.
