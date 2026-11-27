# BT3R — screenshot-driven readability correction

Reviewed deployed build 54831c0 from user screenshots. Main issues: coplanar edge strips, overly small generic holders, low mounting positions and cargo-pocket intersections. The canonical material art scale is ART_PIXEL=1 world unit (same source as gear and weapon UVs).

- Replace overlapping belt section boxes with a continuous 64-triangle ring. Retain only large real buckle volumes.
- Replace seams, webbing/padding lines, pouch retention marks and medical marking meshes with nearest-filtered metric detail textures on existing geometry. The secondary UV modulation preserves the original fabric/camo map and palette; actual strength still needs rendering review.
- Increase attachment footprints without altering mechanical inventory counts. Raise mount origin toward the belt upper edge and bias side locations forward. This is static clearance improvement, not animated garment collision proof.
- Use existing carried AR magazine artwork and the existing Glock appearance in Lab previews; compact/standard/expanded remain generic artwork sizes, not comprehensive family-specific fit validation.
- Broader individual shell spacing and contrasting contents; simplify closed pouch geometry. Keep hollow openings and holder/contents separation.
- Regression tests for ring triangle count/winding, texture density, and larger/high mounting contracts.

No live inventory/animation changes; BT4–BT7 remain future integration. Compare in Operator Lab at normal gameplay zoom and across moving BDU/ACU/Gorka fits before approval.
