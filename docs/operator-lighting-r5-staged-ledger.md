# Operator Lighting R5 – staged implementation ledger

Branch: `feature/operator-lighting-r5-hybrid-20261105`
Base: `0cf8a9f1737b1327cbb15c11b4f30e718cd73b98`

## R5.1 Studio proof (implemented)
- One real directional shadow light for the full-size operator preview.
- Fixed operator-local key direction (.46,.88,.07), explicitly fitted 3D shadow frustum.
- 1024 px default, 512 px query option; Basic hard shadows, low bias.
- Reduced hemisphere/fill, with fully reversible `?operatorLighting=legacy` preset.
- `?operatorLighting=live` diagnostic preset alongside default hybrid.
- Shadow invalidation only on outfit/geometry update, not camera/orbit.
- Shared thumbnail renderer still owns its one pooled offscreen scene.
- Focused tests and a dedicated conditional PR CI gate.

## Not yet accepted for release
- Physical iPhone screenshots comparing R4/hybrid/live.
- Dynamic shadows in gameplay (existing game scheduler remains unchanged).
- Per-piece bake architecture and a top-to-bottom gradient rework.
- No merge or Pages deploy permitted solely from this feature branch.
