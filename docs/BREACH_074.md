# Fieldwork Breach — Camera Controls 074

This camera fix is intentionally isolated from combat, movement, routes and fog of war. It changes only how players see and navigate the existing 3D station.

## Mobile

- **Default mode:** One-finger tap/drag plans or edits orders. Camera gestures do **not** silently consume plan taps.
- **PAN:** Tap PAN, then drag with one finger to slide the map. Tap PAN again to return to normal ordering.
- **ORBIT:** Tap ORBIT, then drag left/right to rotate around the current map focus; drag up/down to tilt the view between approximately 35° and overhead. Tap ORBIT again to return to orders.
- **Two fingers:** Pan by dragging the fingers together; pinch apart/together to zoom around the gesture midpoint. A two-finger twist only rotates after a deliberate ~10° threshold.
- **+ / −:** Zoom in or out around the screen center.
- **FIT:** Reframe the full map and reset rotation without changing the soldiers or their orders.
- **ISO / TOP / 2D:** View presets or legacy reference view; ISO and TOP retain the same world-space map focus.

## Desktop

- **Right drag:** Orbit yaw and tilt.
- **Middle drag** or **Shift-drag:** Pan.
- **Mouse wheel:** Zoom toward the cursor, not toward the map center.
- **Q / E:** Incremental yaw rotation.
- **C / P:** Toggle Orbit / Pan tools.
- **0:** Fit map; V switches ISO ↔ TOP.

## Guarantees

- The **map focus**, not the selected soldier, is the pivot of rotation.
- Top-down camera has a stable explicit up vector, avoiding singular camera flips near vertical.
- Panning and pinch/scroll zooming use world-space ground intersections, so the point under the touch or cursor stays anchored.
- World-space simulation and visibility are unchanged by camera inputs; the plan projection is recalculated for each camera state.
- Zoom spans 0.65×–6× of a rotation-stable world fit. No unexplained zoom pulses while turning the camera.
- Accidental single-order creation from a two-finger gesture is prevented; the remaining finger cannot accidentally place an order when the other finger lifts first.

## Verification

`scripts/capture-breach.mjs` asserts orbit changes yaw/pitch without moving the map focus, pan moves the focus without rotating, zoom buttons are inverse, FIT recovers the center, two-finger pinch changes zoom without accidental yaw, plus desktop right-drag, middle-drag, and cursor-wheel interactions. All prior tactical mission controls remain part of the same browser audit.

**Still worth hands-on iPhone review:** camera drag sensitivity, UI crowding in landscape, and whether the initial framing shows enough of the building.
