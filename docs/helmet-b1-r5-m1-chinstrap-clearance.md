# B1 R5 — M1 chinstrap head-clearance repair
The M1 shell, shape, rim, cover, and all materials are unchanged.

## Root cause
M1 fastened webbing routed through `[±3.85, .72, -3.68]`, *inside* the 8×8 head cube, and placed its buckle against the face at approximately `Y -.43, Z -4.08`. That explains clipped, hidden lower strap sections in deployed mobile Studio screenshots.

## Known-safe coordinates reused directly
- **PASGT:** upper temple station `[±4.99, 3.30, -1.12]`.
- **ACH/MICH:** cheek turn `[±4.46, .65, -4.36]` and low chin `[±2.34, -1.08, -4.34]`, validated in `achMichRetentionPaths` with a clear exterior walk around head side/front.
- **ACH/MICH released:** outboard hanging route `[±5.06, 1.43, -1.58]` to `[±5.26, -1.17, -1.82]`.
- **M1:** keep its historical shell anchor `[±5.34, 5.05, -.87]` so the strap enters under its correctly pitched rim, and bring the two ends together at `[±.18, -1.18, -4.47]`, beneath the jaw.
- Buckle and geometry move below the jaw, not to the front face. Historical two-piece simplicity remains, without modern four-point harness or PASGT chin cup.

## Tests / release
Verify actual paths against approved ACH data, inspect every ribbon vertex and interpolated route against a conservative head proxy, preserve M1 chinstrap save and bulky-facewear suppression, and capture 44 Studio frames: 36 existing family/cover views + 8 for both strap states.
Commit on a feature branch; no change to head hitboxes, other helmets or shell material. Do not merge or publish until CI and visual acceptance pass.
