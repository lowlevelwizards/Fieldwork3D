# Operator Studio — customization interaction performance sweep

Date: 2026-11-04 · Mobile target: iPhone Safari / WebGL · No visual fidelity changes

## Confirmed high-cost paths in source

1. **Cache invalidation:** `OperatorAppearanceGrid.paint()` keyed every card by the *unmodified* current wardrobe, equipment and operator. Selecting one face covering changed the raw saved slot across all cards, invalidating thumbnails that would render identical after their own `selectWardrobeItem` override.
2. **Per-card 3D rebuild:** `renderThumbnail` called `createOperatorRig()` and `rig.dispose()` for every uncached item. Each operator rig authors the whole outfit/armor/helmet library, including `unionCuboids` geometry, and transfers it to WebGL.
3. **Synchronous GPU readback:** every thumbnail invokes `readRenderTargetPixels`; that stalls the GPU/CPU path on mobile. This is only justified for thumbnails likely to be visible.
4. **DOM and scroll churn:** `paint()` called `grid.replaceChildren()` for every wardrobe update, recreating buttons and 160×160 canvases even when just the EQUIPPED state changed.
5. **Duplicate painting:** Studio `refresh()` called `setCategory()` and `refresh()` on the thumbnail browser; category changes rendered twice before updated controls were visible.

These are code-path findings; do not claim a measured speedup without browser timings.

## P1 — cache correctness
Normalize each item preview with `selectWardrobeItem` and the same clothes-only kit suppression used in Studio **before** calculating its cache key. Include actual visible materials, equipment and operator identity. This keeps all card thumbnails cached when only the selected item changes, yet invalidates them when color, fabric, attachment or kit actually changes. Unit tests confirm cache invariants.

## P2 — reuse resources and card elements
One reusable thumbnail rig per operator identity, disposed only on identity change/grid unmount, not per card. Retain card DOM and canvas when category hasn't changed; update selected/disabled state in place. Preserve scroll, user-selected item and old styling. Use a bounded 90-preview cache, one shared WebGL renderer and render target.

## P3 — frame budgeting and tracing
Use an `IntersectionObserver` with a small lookahead margin so off-screen cards don't invoke geometry or GPU readbacks. Keep one card per animation frame. Generation token cancels stale frames on category changes. Fall back to the existing queue if the observer is unavailable. Expose non-UI diagnostic counters: `data-thumbnail-renders`, `data-thumbnail-rig-builds`, and `data-last-thumbnail-ms` on the card grid.

## Release gates
- `npm run build` (TypeScript, Vite and Pages stamp)
- Focused thumbnail normalization/cache semantics test
- Existing appearance-grid gallery regression (real 3D cards, bounded cache, one shared renderer)
- One phone viewport Studio smoke: selecting an alternate garment, changing a swatch, comparing, saving and changing operator
- Smoke additionally asserts that selecting an alternate FACE card doesn't reset its canvas, and its rendering does not create a new rig for the same operator identity.
- Merge in one checkpoint only if the previous Pages deployment succeeded and the public `fieldwork-build.json` serves its expected build. After merge verify the new live build stamp before proceeding.

## Explicit non-goals
Do not delete or reduce garment variants, downgrade textures, change the 19 D2 accessory identities, alter gameplay rendering, change saved appearance format, or change kit authority. Review future mesh triangle/geometry batching only if the above eliminates unnecessary rerenders but switching options remains expensive on a real device.
