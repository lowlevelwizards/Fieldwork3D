# WC2.3 — HK family sculptural candidates
Pinned WC2.2 render evidence: artifact 15169351598, revision 8a07f18c. First candidate pass, not approved art.

The WC2.2 review found the open PDW frame a meaningful improvement but the retractable rear contours too subtle. WC2.3 trials deliberately emphasize large exterior masses in the stylized, nonfunctional game meshes rather than microdetails. G3 gets a broader central mass and distinct early/polymer rear silhouette; HK33 keeps a leaner center and less blocky fixed rear; HK53 retains the shared center with its compact furniture and stronger rear accent; MP5 gets a squarer compact center, more substantial fixed furniture and stronger retractable visual weight. The PDW frame is unchanged. No uniform scaling, new materials, functional components, catalog changes, gameplay changes or edits to existing animation/contact authorities. The existing graphic side surfaces, rear and front landmarks, material ownership and mesh naming remain intact by design; validation is pending.

The next capture pairs all twelve variants with the successful WC2.2 artifact, including fixed-scale side, monochrome, reverse, quarter, top, front and native tiles. Review actual pixels, operator context and cost before acceptance; retain or revise on evidence. Full mission evidence, exact external reference comparisons and integration with current main remain outstanding. Keep draft; no merge/deploy.


## Rendered review — candidate 8f6dd4ae
Dedicated run 45939131526 passed; artifact 15171838558 was downloaded and inspected against WC2.2 artifact 15169351598. Reviewed shared-scale side and fitted quarter views of all twelve models, native 128 tiles and Operator Lab game-camera pairs. The latter are small presentation proxies, not a detailed contact or live mission inspection.

- G3 early and A3: more deliberate rear contour, especially the polymer version. Broad mass distinction is still modest, and the early version's total projected area is slightly reduced rather than increased.
- G3A4: stronger rear and central silhouette; still reads as a narrow rear at small size.
- HK33A2: fixed silhouette is less uniformly wedge-like. A3 remains a restrained change; the overall family identity still depends primarily on its existing proportions.
- HK53A3: rear more visible, compact silhouette retained. No evidence that whole-model differentiation is now exceptional.
- MP5A2/SD2: the more articulated fixed silhouette is visible at 128px. A3/SD3 rear is better defined, with relatively small whole-model differences. K/PDW are almost unchanged at native scale; the continuous PDW frame remains the most substantive prior improvement.
- Operator Lab pairs: no obvious large-scale pose regression at the captured scale, but changes are not consistently distinguishable and cannot be used as final art approval.

### Isolated renderer calls / triangles (before -> after)
| Variant | Calls | Triangles |
|---|---:|---:|
| G3 early | 24 -> 24 | 486 -> 490 |
| G3A3 | 24 -> 24 | 490 -> 494 |
| G3A4 | 26 -> 26 | 506 -> 506 |
| HK33A2 | 24 -> 24 | 518 -> 526 |
| HK33A3 | 26 -> 26 | 538 -> 538 |
| HK53A3 | 26 -> 26 | 542 -> 542 |
| MP5A2 | 24 -> 24 | 522 -> 526 |
| MP5A3 | 26 -> 26 | 546 -> 546 |
| MP5SD2 | 25 -> 25 | 518 -> 522 |
| MP5SD3 | 27 -> 27 | 542 -> 542 |
| MP5K | 24 -> 24 | 510 -> 510 |
| MP5K-PDW | 26 -> 26 | 562 -> 562 |

All retain draw-call counts; maximum individual increase eight triangles. These are isolated capture statistics, not live frame cost. The specialized Arsenal and physical equipment workflows passed; general verify run 45939136065 still fails unrelated R6.1 registry assertion. No new HK test regression identified.

Disposition: retain candidates provisionally for cross-catalog comparison; avoid another isolated pass of barely visible tweaks. WC2.4 AK/RPK can proceed as a separate staged art work item; HK final sign-off remains open for larger-scale comparative judgment, exact external reference verification, remaining full-angle review, live mission and human acceptance. Nothing is ready to merge solely because tests passed.
