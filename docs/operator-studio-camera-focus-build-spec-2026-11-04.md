# Operator Studio — contextual focus and zoom, 2026-11-04

## User-facing behavior
Selecting a wardrobe category automatically moves the **main 3D preview** toward the physical garment or body part and smoothly increases/decreases orthographic magnification. The camera does not change the character's appearance, equipment or gameplay state. Applies to all 14 slots, including HEAD/FACE/EYES/COMMS, TOPS, ARMOR, RIG, BELT, PACK, LEGS, FEET, HANDS, KNEES and WRIST.

## Camera acceptance spec
1. Camera target is a **3D model-space Y target** for the slot; each slot has a separate tested magnification. No DOM- or canvas-coordinate heuristics.
2. Selecting HEAD or EYES reveals face/head details without returning to full-body. LEGS and FEET focus below the waist. Wrist/gloves target hands. PACK orients toward the rear 3/4 view.
3. Changes ease over 300 ms; honor the OS reduced-motion preference (instant transitions).
4. Any manual touch orbit, pinch gesture, or mouse action cancels the automatic camera interpolation immediately; subsequent changes are user-controlled.
5. FRONT/SIDE/BACK keep the current category target and zoom. FIT resets the full operator framing and zoom without losing the selected category.
6. Responsive renderer resizes projection to mobile or desktop stage dimensions while retaining focused zoom, preserving existing pan lock and orbit controls.
7. Switching operator, material swatches, and cosmetic options must **not** reanimate/recenter the camera unless the actual category changed.
8. Focus values are deterministic, clamped and testable without a browser. No new geometry, texture assets or gameplay tests needed.
9. Release after critical production build + focused focus-profile tests + Operator Studio mobile smoke, with GitHub Pages public build-stamp verification. Hold any subsequent release while a prior one is in progress.

## Body centers and rationale
- Head/eyes/face/headset: target model Y ≈ 43–44, zoom ≈ 2.3–2.65.
- Jackets/armor/vest/pack: Y ≈ 29–31, zoom ≈ 1.5–1.7.
- Belt and hands: Y ≈ 23–26, zoom ≈ 2.
- Trousers/knees/footwear: Y ≈ 4–15, zoom ≈ 1.5–2.2.

Initial Studio entry frames the selected TOPS category. Thumbnail previews continue using their independent cameras.
