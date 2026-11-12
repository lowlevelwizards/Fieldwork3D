# P2.1 — First-pose cold construction after 512px live shadows

## iPhone evidence, 2026-11-12

Both screenshots confirm `SHADOW MAP 512px` with B planning-only sight reuse.
The captures differ in mission content and cannot form a controlled A/B comparison.

- One screenshot: 209ms RAF peak, 200ms preceding JS, 188ms actor work:
  one fresh rig 30ms and five operator poses 153ms combined.
- Another screenshot: 1313ms RAF peak, 1282ms preceding JS,
  844ms actor work, four rigs 157ms and **four first poses 664ms**.
- Separate COPY captures include an idle 230ms gap with 200ms of
  between-callback wait and no simulation; this does NOT establish GPU time.

The pose time is not necessarily IK alone. Before P2.1 the first call to
`poseOperator` generates the **held AND invisible dropped firearm silhouettes**
plus two matching accessory trees, as well as wardrobe shadow atlases and IK.
Those duplicates cost cold CPU and geometry allocation even while healthy.

## Actual optimization

- Build the equipped/held weapon and accessories when the loadout changes.
- Defer building the dropped weapon and its *identical* configured accessories
  until `(down || surrender) && downProgress >= .30`, the original exact frame
  in which the dropped weapon becomes visible. This prevents any missing or
  fake dropped meshes and preserves all weapon socket geometry.
- Clear dropped geometry when weapon/loadout changes so no stale geometry
  appears on future downings. Reuse it once built while the loadout is stable.
- No changes to authoritative ballistics, handling, recoil, ammo, shot
  geometry, foot contact, animation poses, shadow resolution or materials.
- Existing held and dropped scene roots remain unchanged.

## Remaining isolation

The first-pose report now separates measured CPU spent in:
`app` (outfit, skin, camo, head/collar atlas),
`gun` (new silhouette/attachment construction) and `IK+`
(other pose evaluation: gait, arm fitting, output commit).
These are measured CPU slices only in opt-in `?perf=1` and do not
represent GPU time. Prior-frame RAF alignment remains intact.

The next same-seed iPhone report determines whether `gun` duplication was
a meaningful part of the first-pose spike or whether appearance/IK needs
separate targeted optimization. Do not interpret different-map maxima as
proven speedups.

## Tests and release gate

- Assert healthy actors have a full equipped firearm but no dropped duplicate.
- Assert real dropped silhouettes and attachments materialize on *the first*
  visible down/surrender frame, including weapon-change invalidation and reuse.
- Validate the per-phase COPY/TXT history contract.
- Run critical animation/runtime/build/mobile integration checks, then merge
  and verify Pages only after previous deployment success.
