# WC2.2 — HK stock candidate review
Review of the fictional game meshes, 2026-11-26. Before: 0da93e2cbd500773c4496117337584c94df5abc1, run 45861004835, artifact 15139255483. After: 8a07f18c8eae2de08a7478ffe025a0ed70545609, run 45932711594, artifact 15169351598. Both archives were downloaded and inspected. This is a comparative game-art review, not exact external-reference validation or human art sign-off.

## Actual observations
The side-shared panels use the same cohort camera scale. Fitted quarter views are close-inspection evidence only. Operator Lab game camera captures are a presentation proxy, not actual mission footage. Side and quarter panels for all six affected models, all eight PDW comparison panels, and game-camera context pairs for all six were inspected. No obvious large pose or silhouette regression appeared at that distance, but the rear geometry is too small or obscured there for definitive contact or artwork approval.

| Candidate | Rendered observation | Disposition |
| --- | --- | --- |
| MP5K-PDW | The old lower brace has a visibly disconnected end; the new uninterrupted outline and triangular opening read as a single sculpted miniature. Both sides and the monochrome panel confirm the gap is no longer an accidental break. The 128px panel still reads more clearly. | Retain the continuous-frame direction as the WC2.3 working candidate; no final art sign-off. |
| MP5A3 / SD3 | Curved rear accent is distinguishable in the fitted quarter views; at shared scale it remains a small change. The rear still reads as a long thin line and tiny pad. | Provisional only; reconsider relative mass and graphic emphasis with the whole model. |
| G3A4 | Almost indistinguishable from the old version at shared scale; the dominant receiver/fore-end relationship is unchanged. | Do not score as an artistic improvement yet. |
| HK33A3 | Similar to G3A4; the revised rear contour is a minor close-up difference. | Do not score as an artistic improvement yet. |
| HK53A3 | Slightly stronger hooked rear in the quarter view, but at native scale the distinction is weak. | Carry forward as a provisional candidate, not accepted art. |

## Measured isolated WebGL cost
Same capture renderer and shared side views, calls / triangles, before -> after:
- G3A4: 26 / 506 -> 26 / 506
- HK33A3: 26 / 538 -> 26 / 538
- HK53A3: 26 / 538 -> 26 / 542
- MP5A3: 26 / 542 -> 26 / 546
- MP5SD3: 27 / 538 -> 27 / 542
- MP5K-PDW: 27 / 558 -> 26 / 562

PDW achieves clearer shape with one fewer draw call and four additional triangles. These are isolated render counts, not live mission profiling. Dedicated WC2 workflow passed all steps including focused HK tests and both capture sets. General PR verification is blocked by an unrelated R6.1 interaction registry assertion (run 45932718093); no movement/action change in this art branch.

## WC2.3 next working scope
Use the six improved/pending candidates and six neighboring HK models together rather than iterating invisible details in isolation. Start with monochrome dominant-mass studies at a common scale. Evaluate relative rear, center, and front visual weight; retain distinct compact/full-size character and avoid uniformly scaling every part. Test broad planar transitions and purposeful negative space; no detail or material additions merely to disguise weak silhouette. Revisit the thin rear silhouettes in that context. Compare actual production art in both side directions, quarter, top/front, at 64/128px and in Operator Lab. Evaluate live mission presentation separately when available. Preserve all existing runtime behavior, saved appearance IDs, contact semantics, and part ownership. Do not introduce functional mechanisms or real-world dimensions.

WC2.2 focused technical validation is complete. Comparative review supports the PDW direction, not final acceptance of the retractable silhouettes. Exact variant external-photo comparisons, remaining full-angle inspection for the five retractable models, live mission presentation, human review, current-main integration, and release gates remain open. No release authorized at this checkpoint.
