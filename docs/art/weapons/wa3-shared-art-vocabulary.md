# WA3 — Shared artwork vocabulary
## Scope
Turn WA2 into reusable exterior game-art techniques. Do not remodel families, alter saved finishes, update game behavior, or promote experimental palettes before actual family review. Keep original production render output identical for infrastructure consolidation; intentional future art changes must record before/after evidence.
## WA3.1 Geometry and graphic details
- Canonical exterior contour/extrusion shared by existing outline and genuine frame helpers, retaining exact options and winding.
- Integrated atlas infrastructure shared by FNC and G36: deterministic RGBA8 tile generation, padded UVs and source-material caching. Family motifs, texture sizes, face policies, swatch overrides and material compatibility remain local. Original transparent unused texels preserved for parity; only authored neutral regions may be sampled.
- Existing surface overlay helper retained for justified separate graphic marks; future family work should choose integrated atlas where it removes unnecessary overlays, not blanket convert. No new geometry for marks or permanent extra textures.
## WA3.2 Finish semantics
- Existing registry remains sole production palette; semantic labels distinguish resin, rubber, lens and smoked polymer without changing underlying shared world roles. Exact registered finish matching also recognizes mapped material clones. Unregistered or ambiguous materials remain explicit.
- Provisional darker-neutral palette study separates steel and polymer subtly while preserving distinctive wood, resin, paint and special finishes. It is opt-in dev-only and applies temporary cloned materials on actual existing builders; never mutates shared cache.
## WA3.3 Evidence and acceptance
- Run focused existing atlas/material regression tests, typecheck, and SHA256 comparison of every 101 reference/sample case against pinned WA2 ea2d4dde28258cb3c86ff6152ca2c37284025f4e. Hash vertex attributes, index, instance transforms, material settings, texture data and scene transforms. This is structural/render-input parity, not full pixel or gameplay parity.
- Actual WebGL swatches and same-model current/candidate pairs at 480 and 128px under studio, mirrored, and gameplay-inspired key. Ten calibration references. Verify matched framing and equal isolated render triangle/call counts. Review actual artifacts before adopting colors. No claim that diagnostic key reproduces tactical shader; real mission and operator color review remains required during WA4+.
- Future work: review unregistered local finishes, evaluate atlas minification where necessary, migrate older family surface marks intentionally during WA6–9, calibrate actual game lighting and validate candidate finishes family by family.
Status: implementation committed; parity and WebGL verification pending. No merge/deploy or production palette promotion.
