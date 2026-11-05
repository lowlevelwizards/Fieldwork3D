# Camouflage 8G — Norwegian M98 garment-scale correction

**Scope:** M98 ONLY, 54-registry unchanged. Frozen JGSDF Type II and Soldier 2000 are byte-identical to the approved 8F release. Continue from release `0e66e86`.

## Reference findings

The actual Norwegian M98 print has large rounded, flowing three-color islands, often with hooks, not hard M90 facets or a digital micro-pattern. The print's scale varies across manufactured clothing and textile cuts. Visual research:
- [Joint Forces, Norwegian Army M98 Pattern](https://www.joint-forces.com/kit-camo/33505-norwegian-army-m98-pattern), Bob Morrison, June 2020 — verified authentic uniforms and fabric.
- [1990s M/98 jacket photograph](https://www.american-classics.net/?pid=98488332) — reference jacket silhouette and printed chest/pocket behavior.
- [M98 trouser photograph](https://eaglebase.thebase.in/items/95637238) — reference balanced colors and smoothly connected knee/thigh lobes.

User 8F mobile screenshots show solid olive and tan regions on large parts of two thighs. Existing exhaustive 12×18 64px tile crop limit (less than 98.5% monochrome) was inadequate.

## Implementation specification

### 8G-A · M98 master composition

Retain the 8F seamless, cached and strictly three-ink indexed 64×64 organic field algorithm, but adjust its octave composition to:

| Periodic cycle frequency | Weight | Role |
|---|---:|---|
| 8 | 0.35 | Coherent broad rounded arms |
| 14 | 0.55 | Medium lobes and interlocking hook shapes |
| 20 | 0.10 | Gentle edge corrections, not pixel flecks |

Preserve the 8F random seeds; no runtime noise, added palette entries, canvas re-render or dynamic texture allocations.

Before replacing, the same exact hash-based generator was evaluated offline for 8F and eight multi-scale variants, with full toroidal crop sweeps. The chosen 8G candidate:
- 8F baseline worst 12×18 index crop: **96.8%** one color; roughly **10.4%** of all positions exceeded 80% one color.
- 8G candidate worst 12×18 crop: **82.9%** one color; roughly **0.4%** of positions exceeded 80% one color; no positions exceeded 90%.
- Index coverage: about **34.5% olive, 37.2% forest, 28.3% tan**, with edge complexity 1289 vs 825 previously.

Art must remain readable as **large, rounded, three-ink disruptive camouflage**, not tiny digital pixel chips. Compare the photo reference against both tile and actual operator.

### 8G-B · Three physically rendered repeat candidates

Freeze the RGB palette and atlas. Capture same BDU top and trousers, seed, lighting, camera and operator in detail/gameplay zoom, front/side/rear, at three isolated, lab-only cloth densities:

| Density | 64px world repeat |
|---|---:|
| 2.55 (8F) | 25.10 |
| **3.0 (8G selected trial)** | **21.33** |
| 3.4 (high-frequency alternative) | 18.82 |

The smallest sufficient increase should win. **3.0 is the initial selected candidate** to reduce near-solid thigh areas without turning M98 into dense generic Woodland. The actual WebGL screenshot gate remains decisive.

A guarded `?camo=norwegian-m98&m98Scale=2.55|3.0|3.4` opt-in parameter in the independent Armor/Rig Lab sets only the page-local preview repeat before materials are made. No player path, saved look, UV packing, texture atlas, or other pattern is modified.

### 8G-C · Frozen print and material guarantees

S2000 8E/8F RGBA SHA-256 remains
`4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9`.
JGSDF 8F RGBA SHA-256 remains
`05c026d4979bd4941a94e9f3415d16ca59e9fd706c42dbdb828ac0071d8871e7`.

Retain all original 54 IDs, full 64px headgear/fabric RGBA masters, five fixed cutting seeds, NearestFilter, unique operator placement and campaign save identities. Modify historical tests that explicitly locked now-obsolete M98 density (2.55) but preserve their identity/three-color/coverage assertions.

### 8G-QA · Focused release gate

1. Exhaustively sweep all 4096 toroidal 12×18 crop positions; require worst one-color coverage **<86%**, no crop >90%, <1.5% above 80%.
2. Verify M98 still has exactly 3 colors, RGB unchanged, global coverage 27–40% each, and edge complexity between 1150 and 1450.
3. Require exact frozen JGSDF/S2000 RGBA hashes, all 54 IDs and seed/material contract.
4. Run focused 8G through 7C camouflage compatibility checks, R9 density, TypeScript and Vite production build.
5. Reuse the one existing Mobile Print Review GitHub workflow for **18 actual phone WebGL frames** of 2.55, 3.0 and 3.4 M98 at all three angles and both zoom levels. Save the raw master PNG and per-density world repeat metrics.
6. Gate merge on previous production Pages success and public served SHA. Avoid overlapping Pages releases; merge once, verify the new release's public SHA.

**Visual follow-up:** The user's actual 8G screenshots may determine a later controlled tweak. Numerical tests are guardrails, not evidence of exact historical replication.
