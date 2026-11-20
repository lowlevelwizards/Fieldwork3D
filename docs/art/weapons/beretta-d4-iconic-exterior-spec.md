# Fieldwork Beretta D4 — iconic exterior identity: exact implementation contract

**Scope:** Existing art-only `beretta-m9` and `beretta-m9a3` Three.js factory previews. No changes to ammunition, live secondary IDs, equipment, rig, saved Glock recipes, or firing mechanics. Shared style authority: [Universal Weapon Art & Production Standard](weapon-production-standard.md), with same-scale actual Glock G2 geometry as the peer.

**Sources inspected:** the user's four real mobile side/top/rear-quarter captures of D3 (2026-11-20), the supplied Beretta M9 reference side photograph, live `src/weapons/geometry/beretta-m9-silhouettes.ts`, the canonical production standard, `profile-primitives.ts`, the Glock builder, the Beretta Arsenal inspector, and `tests/weapon-beretta-m9-art.test.mjs`. Exact real-world measurements, internal mechanisms, and unverified opposite-side fine details are not claimed. These are **symbolic art coordinates**.

## Art thesis / priorities
Make a Beretta *miniature caricature*, not a generic long Glock with a roof cutout. Prioritize (1) long rear tang + slanted hammer zone, (2) a narrow upper rear block overlapping a broad lower slide, (3) a thick exposed 6-sided barrel framed by a true open-top front U-wrap, (4) graceful but chunky 3D trigger guard and swept grip, and (5) only the largest red safety / decocker identifiers. At phone/128px size, the upper, frame, barrel, guard, and grip must read before serrations or color. No tiny screws, labels, engraved lettering, modeled springs, bevel ladders or ornamental meshes.

## Exact D4 target datums (local XY art units, +X muzzle, +Y up, +Z right)
| Feature | D3 | D4 target |
|---|---:|---:|
| Classic M9 front slide nose | +9.23 | +9.23 (unchanged) |
| Classic M9 visible barrel end | +9.36 | +9.64 (projects 0.41 beyond wrap) |
| M9A3 front slide nose | +9.32 | +9.32 (unchanged) |
| M9A3 barrel end | +10.02 | +10.16 (projects 0.84; threaded visual cue) |
| Exposed six-facet barrel radius | 0.88 | 1.02 (about 16% thicker) |
| Exposed barrel center Y | +2.46 | +2.48 |
| Upper rear block front X | -2.69 | ~-1.22; ends roughly above trigger rear |
| Upper rear block depth Z | 3.03 | 2.42 (narrower) |
| Lower slide skirt / forward side rail outer depth | 3.03 | 3.03 |
| Uppermost rear slide Y | +3.17 | +3.17 |
| Rear wall at slide bottom/top X | -8.82/-8.47 | ~-8.91/-8.15 (leans forward) |
| Classic beavertail rear X | -9.88 | <=-11.10, integrated into frame |
| Guard upper void Y | -1.27 | approximately -1.30 |
| Curved guard lower rim | ~-3.59 | ~-3.83 (rounded three-point sweep) |
| Grip panel top Y | ~-3.7 | -1.48 to -1.64, near guard roof |
| Magazine plate | flat cuboid at heel | sloped quadrilateral touching/overlapping butt across width |
| Serrations | almost full-height Y.405–3.125 | shorter Y~1.30–2.82; 4 wide forward-raked marks/side |
| Safety | small lever, no red dot | enlarged broad paddle, 1 distinct red dot per visible side |
| Sight profile | chunky standalone blocks | low compact block rooted into slide/front wrap |

## Region specifications / 3D topology
1. **Rear / frame:** Re-author the one continuous lower frame outline to extend the tang rearward and sweep smoothly from beavertail into the arched M9 grip. No separate floating beavertail wedge. Keep M9A3's Vertec backstrap distinctly straighter. Lean rear slide upper wall forward, and keep the hammer visibly exposed, hooked and still low-facet.
2. **Rear upper architecture:** Move the rear upper termination to approximately X -1.22, while widening the lower rear slide shoulder and narrowing the upper to Z~2.42. A single lower shoulder under the upper may overlap without exterior coplanar seams. Rear serrations are on the narrower upper side faces, moved forward and angled forward at the top; leave an obvious clean margin before the slide roof.
3. **Open front:** Keep both full-length side rails, but substitute the bulky rectangular nose bridge with one short 3D **U-shaped cross-section** near the muzzle: two elevated side cheek walls and a lower cross-piece, physically open at the top, surrounding the chunky barrel without covering it. The round barrel extends past this wrap. The front sight intersects the top of the wrap. Inspect from top, front and both 3/4 angles; never make a painted fake void.
4. **Guard:** Preserve the real through-Z opening. The lower guard exterior dips in a broad stepped arc and the front curls back toward the grip at its lower edge. No dangling extra guard ring. Validate both negative space and frame-to-guard continuity with rays and real screenshots.
5. **Grip panel and magazine:** Extend both shallow panels near the guard roof, match each variant's true rake, and embed them with meaningful overlap. Author a single sloping magazine base plate whose top face penetrates the entire inclined heel slightly, rather than letting one side float with a flat horizontal cube. Keep its physical base datum synchronized with `m9ArtSockets`.
6. **Controls/material:** Enlarge one decocker/safety paddle on each slide face; add ONE stable, batched iconic red indicator (two dots in one mesh) without micro-machining. Pooled, once-constructed red matte material; no per-frame allocations. Preserve black M9 and restrained coyote M9A3 shared palette.
7. **Perf/lifecycle:** Reuse `profile-primitives.ts`, existing `GlockViewport`, gallery previews and cleanup; all geometry built at configuration change only, native part names `family-{slot}-...`. Count **actual emitted triangles**, meshes and disposed buffers. Aim <=420 triangles / <=18 meshes; if the genuinely essential muzzle U-wrap exceeds this by a small margin, document the delta instead of blindly discarding Beretta identity.

## Stage and stop gates
- **D4.0** Reference and art datums locked; no new variants.
- **D4.1** Main mass correction: beavertail, angled rear slide, upper/lower depth, barrel and muzzle U-wrap. Test real negative spaces.
- **D4.2** Guard, grip-panel, attached floorplate, controls, short angled serrations, red safety accent. Confirm both side faces and variant separation.
- **D4.3** Focused geometry/ray/sockets/part budget tests, Glock parity, TypeScript/build, existing Chromium iPhone-sized (390px) and desktop side/quarter/top screenshots for M9 + M9A3, plus opposite/front if possible. **Actual in-game visual evidence determines acceptance**, not source tests alone.
- **D4.4** Draft PR, review captured renders, correct only evidenced blockers. Merge to main only after green exact-head checks, GitHub Pages serving prior main and no active Pages deployment. Validate new public Pages build-stamp after publishing; diagnose a failed deployment instead of stacking releases.

## Hard no-go conditions
No floating floorplate or front sight; no barrel hidden by a long square beam; no upper sliding assembly as one uniform-depth slab; no serrations running all the way to the top; no safety indicator placed on barrel; no guard void filled; no required detail missing in clay when silhouette-critical; no geometry/per-frame churn; no misrepresentation as an issued live Beretta.
