# Fieldwork Breach — V0–V3 visibility release

## V0 authoritative baseline (audited before gameplay changes)

- Scale: **20 world units per meter** (environment art contract).
- Legacy ground sight, fog polygon and live actor acquisition: **240 units / 12 m**.
- Ground cone: 1.15 radians each side (about 132 degrees).
- Actor target gate: 0.94 radians each side (about 108 degrees).
- Civilian witnessed-threat scan: 175 units (8.75 m).
- Ground memory: 20-unit fine, 10-unit micro cells, repeated every >=0.14 simulation seconds for living friendly observers; each ray ultimately checks physical obstruction.
- Enemy model disclosure: confirmed acquisition only, not early silhouette; confirmed visual progress accumulates in 60 Hz simulation.
- Weapon accuracy already has physical angular spread; sight-acquisition time does not scale continuously with range.

## Scope & invariants

**V1**: Physical ground sight and fog extend to actual site bounds. Keep the near high-detail memory pass, schedule far fine cells across deterministic simulation buckets instead of multiplying 10-unit LOS queries. LOS, doors, posture, fog/replay provenance remain authoritative. No 3D renderer gives knowledge.

**V2**: Detect a visible person before full recognition. Draw an unidentified silhouette without prematurely granting hostile knowledge, AI contact, red target markers, or fire permission. AI only receives bounded curiosity at detection, and confirmed contact at ID. Preserve historical playback evidence semantics.

**V3**: Maintain separate sight and firing clocks. Distance penalizes aim preparation and physical angular accuracy, moderated by the existing optic profile. No invisible chance-to-hit roll and no range-based projectile deletion.

## Release gates

- Targeted ground FOV, fog/occlusion, actor sight, AI evidence, firearm and replay checks.
- CI: Ground Zero checks + other critical workflows if affected.
- Cost comparison: baseline 240 radius vs site-bound radial candidate counts, far LOS probes per 0.14 s <= budget, unchanged 10/20-unit near sampling; no per-render-frame intelligence pass.
- North/south/east/west open frontage, window and door obstruction, long corridor, crouch cover, briefly visible moving target, long-range AI vs player response and rewind.
- Keep commits on this feature branch. Merge one compatible release batch only after critical checks and previous Pages deployment are green; verify served commit after deploy.

## Explicit non-goals

No new tactical geometry, new pathfinder, raycast every renderer frame, target omniscience, contact ID by faction color, new procedural weather/light systems, weapon rebalance across all presets, or legacy replay data migration.
