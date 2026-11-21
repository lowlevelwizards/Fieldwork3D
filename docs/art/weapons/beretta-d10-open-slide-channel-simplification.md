# Beretta D10 — one open slide, stronger miniature proportions

**2026-11-21 | M9 / 92FS and M9A3 | ART ONLY**

**Visual evidence:** user-provided seven live iPhone views of the D9 M9/92FS, including rear/upper obliques, underside, muzzle and side. Original defects: front nose looked like a collection of faceted rings; rear top had a stepped/diagonal artifact; grip panels too small; trigger guard overly long; hammer too delicate; barrel apparently exposed from beneath. The higher-priority [universal weapon production standard](weapon-production-standard.md) applies.

## Target visual identity and architecture

- One **strong exposed six-facet barrel from above** (authentic Beretta silhouette); **never** a see-through slide *underside*. Side rails and their actual U-shaped floor must belong to a single authored low-poly part, not two separate ribbons. Do **not** close the open upper channel.
- The nose is one shorter U casting with a flat mouth (no stacked rings, 12-step cheek bevels or faceted decorative towers). The single short central sight bridge is set **behind** the mouth, integrated with the *same* mesh and fully rooted in the cheeks. The barrel still projects forward visibly on both variants.
- Rebuild the breech rear boundary as a simple square-shouldered body and one large top bevel, removing the old diagonal wedge and oddly stepped rear surface. Retain broad lower skirt, front transition, materials and 14% roof taper.
- Hammer is one strong **eight-station** blunt hooked profile, depth **1.37 art units** instead of 1.05; physical contact at the rear slide root, not a separate floating cap.
- Grip panels remain a single **two-sided six-point batched planar mesh** but are wider (top >2.65 units; heel >3.15), taller (top Y−1.98; heel Y≤−8.23) and inset in the real silhouette for both classic and Vertec.
- Trigger guard outer pillar moves rearward; negative-space opening shortens in X but remains genuinely open. Test material on front/top web and no material in opening.
- Art-only previews remain unissued, not loadout items. No change to `M9_ART` external identity, barrel endpoints, `m9ArtSockets`, serialization, other weapons, equipment, ammo, tactical systems, or shared inspector camera.
- No new independent render mesh/material. In fact the two previous rail meshes are deleted in favor of **one** channel. Maintain current palette and deterministic build/disposal lifecycle.

## Source-anchored stages

| Stage | Code | Change | Evidence |
| --- | --- | --- | --- |
| A | `m9OpenSlideChannelGeometry` + former `sideRail` block | One eight-station U-channel from rear lower skirt through muzzle-root; low real floor, open top, integrated sides | Physically raycast floor from below, clear upper sight ray, seam overlap |
| B | `m9UnifiedFrontShell` | Flat ten-station nose with deeper larger cast planes; shorten X extent 1.35→1.07 and move sight bridge rearward; no decorative front ring | Front mouth unobstructed, barrel protrudes, normal side and quarter views |
| C | `breech` and `hammer` | Square rear with one shoulder; bigger broad eight-point hook in thicker Z | Rear oblique, real hammer/upper overlap |
| D | `outer` / `opening` / `gripPanel` | Narrower guard with true hole and continuous post; much larger and swept factory panels | Per-contour panel raycasts, guard negative-space tests |
| E | `tests/weapon-beretta-m9-art.test.mjs` | Existing historical art contracts reconciled to new real structure; new D10 rays, proportions and budget | Focused tests, TypeScript, production build, phone and desktop browser visual acceptance |
| F | PR / main / Pages | Exact-head checks; only one squash merge after safe production-lane preflight; verify public Pages build stamp | Successful published deploy |

## Acceptance and blockers

Compare side, opposite, front 3/4, rear/top oblique, and close front and underside on a real 390px browser viewport, plus desktop. Reject if barrel wraps in stacked rings, weird rear geometry survives, hammer appears unconnected, panel clips grip edge, guard post has a gap, underside remains see-through, top barrel is obscured, anything crops at default preset, or visual style still appears more complicated than D9.

Keep **≤13 meshes for M9 / ≤14 for M9A3** (one fewer than D9); do not exceed prior actual triangle totals (**364 M9 / 388 M9A3**), then record actual D10 budget from CI. Only targeted art/geometry, core Arsenal/secondary, critical gameplay regressions and production build/browser checks are authorized. Do not pile unrelated runs or trigger production deployments during another release. No claim of final art approval solely from automated tests.
