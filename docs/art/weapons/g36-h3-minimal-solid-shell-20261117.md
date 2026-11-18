# G36 H3 — simplify the live handguard to one solid six-sided shell

**User review:** November 17, 2026 mobile Arsenal views and supplied G36 handguard reference photos. The user explicitly requested: six sides, a single slanted end face at both front and rear, no inner part, optionally a darker front surface.

## One-part production implementation

- The actual factory `buildG36OriginalBlockout()` now uses `g36-h3-handguard.ts`, not the H2.1 production conversion. Archived H1 and isolated H2/H2.1 remain untouched for design comparison.
- Just **two** hexagonal sections, six perimeter points apiece. Their roofs/floors establish a solid polygon with one flat roof, two broad diagonally shouldered sides, and a broad flat floor.
- Rear end leans forward at the top: floor `x=3.75`, roof `x=4.35`. Front nose leans back at the top: floor `x=13.45`, roof `x=12.94`.
- Fixed factory contacts stay unchanged. The shell remains broadly 3.00 units wide and ~3.23 units tall, then narrows only slightly towards the muzzle end.
- **20 triangles total**, one mesh, no opening, inset throat, mount lug, internal wall, inner bevel, terminal rib, cap overlay or newly allocated geometry.
- Both ends are physically flat closed caps. The nose is subtly darker by assigning its existing face triangles one constant UV sampling point from a single reserved texel of the already shared G36 384×192 graphic atlas. **No second material or texture allocation**.
- Four high, simple dark side vent marks remain directly in the shared atlas with the same centers and size as H2.1. Neither side gains geometry.
- Stock V13, O3 integrated optic, receiver, magazine, barrel, muzzle, factory six-slot part IDs, hand/animation datums, save compatibility, firing, gameplay and all peer Arsenal weapons are unchanged.

## Source-oriented acceptance

- `tests/weapon-g36-h1-handguard.test.mjs`: true 6-sided/2-section/20-triangle geometry; rear and front tilted cap planes; front normals; one guard mesh; no H2 inset or lug; atlas-only dark front and four side vents; production adapter.
- Reconcile older P2–P6 shape tests to H3 rather than checking historical H2 topology in live factory.
- CI typecheck, relevant node tests and real rendered mobile/three-quarter snapshots still required. Aesthetic acceptance is by user's next on-device screenshots.
- Keep this source branch independent of tactical-movement and Campaign drafts; do not merge or deploy without release gate/previous Pages verification.
