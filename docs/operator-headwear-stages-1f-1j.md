# Fieldwork Headgear Stages 1F–1J

Design standard: deliberate, readable massing; no thin strips, incidental steps, ornamental side prongs or micro-cuboids in the silhouette pass. All five shapes use the same cuboid union mesher as ACH/MICH and high-cut. The existing 8×8×8 skull, its anatomical landmarks, the canonical head node, animations, gameplay collision and equipment stock remain unchanged.

| Stage | Wardrobe ID | Authoring principle | Joined cuboids |
|---|---|---|---:|
| 1F | `patrol-cap` | Single flat crown, meaningful folded wrap, anchored projecting bill | 3 |
| 1G | `boonie` | Wide circumferential fabric brim with only one broad front droop | 4 |
| 1H | `beanie` | Fitted main crown and one thick rolled cuff | 2 |
| 1I | `pasgt` | Heavier, deeper coverage than ACH; authored brow, temple, ear and nape | 7 |
| 1J | `soviet-steel` | Single broad projecting rim beneath an angular two-mass steel-pot dome | 3 |

All five already exist in the saved wardrobe item catalog; **no new inventory category** is introduced. The two previously approved ACH and high-cut shells are unchanged. Every one of the seven current silhouettes can be selected in the existing Operator Lab headwear review; existing outfit selections load the corresponding updated mesh automatically.

### QA and approval

- Confirm no unintended geometry changes to ACH/high-cut and no competing legacy cap/helmet mesh drawn under the selected headgear.
- Inspect each in frontal, side, three-quarter and gameplay-distance views. Every meaningful transition must explain the item.
- Validate main crown height and lower coverage against the unchanged model head, with clean overlap between parts and only one exterior mesh per family.
- Test neutral, aiming, crouched, running and replay views for rig attachment stability. No material, camouflage, rails, straps, badges or fabric detail is in scope.
- Targeted tests and the production build are release gates; broader suites are optional unless a regression suggests them.

Approval is a **visual** decision after deployment. All measurements are intended as working proportions, not claims that the view has already been approved.
