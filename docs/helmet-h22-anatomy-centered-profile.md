# H22 · Anatomy-centered helmet silhouettes

The approved stylized block-head crown stays unchanged. This is a **proportional silhouette edit**, not a realistic mesh redesign or a conversion of real helmet millimeters into game units.

## Why

H21 Full/Mid/High ear transitions began too far toward the front of the helmet, around one quarter of its total side length. On the existing block head, the implied ears sit slightly behind center (Z +0.5), so the ear section needs a longer forward temple and should visually cover the middle of the head. The Full-Cut rear rose too sharply from the ear, while the Mid/High rears could retain slightly more nape protection.

## Exact H22 changes (head-local XYZ)

| Cut | Brow slope start Z | Ear start Z | Ear end Z | Nape return Z | Ear bottom Y | Nape Y |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Full-Cut ACH / MICH 2000 | −2.05 | −1.10 | +2.10 | +3.55 | 2.04 unchanged | **2.35**, from 2.72 |
| Mid-Cut MICH 2002 | −2.05 | −1.10 | +2.10 | +3.55 | 3.06 unchanged | **2.62**, from 2.92 |
| High-Cut MICH 2001 | −2.10 | −1.10 | +2.10 | +3.75 | 5.30 unchanged | **2.85**, from 3.12 |

All ear sections center at **Z +0.5**, exactly the implied ear center. Each retains six ordered side stations, a flat chamfered crown and a single shell mesh (29 quads / 58 triangles). Full-Cut's ear-to-nape difference shrinks from 0.68 to 0.31 units. Mid remains partly cut, High remains fully open above the ear, while all three retain a deep protected rear.

## Trim, covers and hardware

The shell remains the authority for the six hem points. The shell-colored rim and fabric cover use that same hem. The rim's terminal front/rear segments previously projected in Z while side strips projected only in X, leaving small disconnected corner tabs. The H22 rim uses a shared *outboard corner point* for both segments, retaining its 12 segments, thickness and number of faces. Rear fastening studs shift to the nape run with clearance above the rubber lip; the rest of the four-point strap assembly stays unchanged.

## Debug-only anatomical landmarks

Append `?helmetAnatomy=1` to **standalone** `operator-studio.html` to see two simple cyan ear envelopes on the unchanged head cube. The guides are attached in the Studio-only rig's canonical head frame on demand, outside the live game's collision/rendering paths. They are never serialized and not drawn in ordinary play or Studio. This is a temporary diagnostic aid for reviewing future silhouette choices, not a permanent facial detail.

## Release gate

Run essential silhouette, binding/corner/cover/retention tests, Ground Zero critical regressions, the production typecheck/build and the Operator Studio mobile smoke. No changes to PASGT/FAST shells, animation, physics or per-frame code. Merge and deploy only after all checks succeed and the previous production release is verified.
