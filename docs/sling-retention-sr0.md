# SR0 — Sling and retention refinement baseline

Base: 82d0b234a4b783b627b48be4c52e3f7ad9babd80. Production Actions run 45944526147 completed successfully; supplied phone captures show build 82d0b23. Capture evidence: front roll, detached side/back silhouettes, elbow inversion, buried webbing and slider/status mismatch. Do not treat old WR numerical tests as visual approval.

## Owners
- WR pose/transition/clearance/suspension modules: preserve simulation custody, action gates and replay format.
- Shared arm solver: use the existing anatomical and equipment-aware pipeline instead of the retention-only pole.
- Garment contact, fitted armor, rig contact frame and pose envelope: reuse authored dimensions; distinguish visible exterior surfaces from arm-clearance proxies.
- Sling render: fixed-capacity dynamic ribbon, stable normal and sockets, no new physics or per-frame mesh allocations.
- Lab: retain compatibility and add live preview diagnostics.

## Release batches
SR1–4 surfaces and routing; SR5–8 fitted resting geometry; SR9–11 anatomy and continuity; SR12–15 secondary motion and actions; SR16–19 diagnostics, performance and visual/replay review. Commit each stage separately. Run focused regression and build before release; do not merge if visual or production gate is unresolved.

Initial visual baseline is the five user captures, not a newly executed browser recording. Critical checks: actual strap coverage, stable width, finite geometry, no inversion, close body fit, elbow continuity, deterministic replay, no custody changes. Preserve old equipment and weapon IDs.
