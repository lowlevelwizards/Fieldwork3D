# Arsenal M3.0C4 — guarded shared-builder rollout

## Deployment intent

M3.0C3 proved real WebGL framebuffer parity for the authored AKMS,
AKS-74U and M4A1 with standalone opt-in compression: 11, 11 and 8
actual geometry submissions removed, respectively, across three
view angles. C4 enables precisely that same static body merging in the
shared `buildWeaponSilhouette` construction path.

The allowlist checks the **complete six installed-part IDs** through
`matchingFamilyPreset`; the receiver/platform name alone never enables
the optimization. Custom, modified magazine and other authored builds,
legacy class fallbacks, and shotgun remain outside this rollout.

## Lifecycle and isolation

- Eligible geometry is rigid and compiled only when creating a weapon body
  or replacing that body, not each render frame. No game-state mutation.
- Magazine geometry remains separate, named and visible-switchable for reload
  handoff/dropped-mag rendering. No part of a magazine is compiled.
- Dynamic rail attachments, lens materials, exterior site adapters, named
  metadata or instanced teeth retain their original ownership.
- The original stock-contact art datum is read from the untouched authored
  mesh before merging, so reload/replay pose diagnostics cannot change merely
  due to vertex rebatching.
- Each compiled output mesh retains the canonical `family-{slot}-{partId}-`
  prefix required by Workbench ray picking and per-part bounds.
- The compiler has rollback and a safety floor of 5 submissions saved;
  a failed/missing candidate leaves the uncompiled weapon playable.
- The final geometries are disposed by existing `clearWeaponSilhouette`.
  No palette material is owned or disposed by the model compiler.
- Explicit diagnostic `{rigidCompilation:'disabled'}` continues to produce
  a full uncompiled weapon; it is used for C3's independent baseline proof.
- Build metadata `userData.rigidCompilation` includes the verified factory
  ID, source/compiled counts and saved submissions for inspection only.

## Release evidence

Focused real-builder tests must pass:
1. Exact 11/11/8 submission reductions, equal triangles and whole/per-part
   bounds, real mesh raycasts, Workbench anchors and stock contact.
   The factory muzzle may be hidden when a suppressor is installed, so
   the M4A1 savings are 8 with its bare muzzle and 6 with suppressor;
   count against the actual built body and the compiler report
2. Magazine mesh identity and visibility control, saved loadout preservation,
   alternative magazine and part rejection, and legacy model opt-out
3. Accessory mounting swaps including optic, grip, light and muzzle,
   replay-deserialized builds and ownership cleanup
4. Existing M3.0/C3 and M2.6 browser visual regression remains green
5. C4 Chromium **live default shared builder** versus uncompiled baseline:
   nine GPU framebuffer comparisons, equal triangles, the same draw reduction
   and no perceptible visual differences
6. TypeScript, production build, broader architecture/physical CI, and a
   clear GitHub Pages queue at the release checkpoint.

## After C4

Continue C5 incrementally to other factory profiles based on actual browser
proof and live operator/Arsenal performance measurements, not on theoretical
CPU submission estimates. Do not expand the allowlist without independent
pixel and switching evidence.
