# L1.4 — Flashlight usability, fixed equipment eligibility and training kit
Fieldwork Breach · implementation scope and release acceptance · 2026-11-16

## Outcome
A real compatible weapon-mounted light remains controllable at all mission phases that permit it, and the player sees an immediate, physically bounded, coherent result in Floor Plan, ISO, and the shared acquisition sampling. Low-light unscored training can issue a compatible practice light without changing a Campaign weapon or historical K1 scored rules. This is not NVG or additional sight authority.

## Code/behavior audit
- `breach-tactical-control-commands.ts` already owns live toggle and light revision; previously permitted incapacitated operators.
- `equipment-weapon-light-ui.ts` relied on `slots.light` alone and showed ON for a downed operator, while the emitter excluded them. This was contradictory.
- `equipment-portable-light-sources.ts` previously called `weaponClearance` without the site walls and moved cover passed by the 2D renderer. The source could differ physically from visual beams.
- `breach-2d-world-renderer.ts` already had a pooled footprint, but missed shoulder-side offset and its cache key. `breach-3d.ts` had beam geometry pooling but did not account for same-tick door aperture changes while rewinding replay.
- `ui/tactical-hud-controller.ts` put the light control in a modal site-settings sheet, adding unnecessary friction during GO. Existing main keyboard shortcut routing is the correct shared entry point.
- `training/training-trials.ts` stores immutable version-1 trial definitions/record semantics. Do not change `blackout` version 1 to deliver practice lights.

## Implementation
### A — Eligibility and command authority (P0)
Use `equipment-weapon-light-operations.ts` to validate physical `light-compact` fit through weapon configuration, actual compatible family/platform, living operator and phase. Authoritative live toggle remains `toggleWeaponLight` and increments the existing illumination revision exactly once on success. No control mutation on failed operation. Presentation and gameplay consume the same eligibility.

### B — Single world-correct beam origin (P0)
Use the existing weapon clearance and mounted rail emitter. Supply actual session wall/cover blockers to gameplay light source generation; keep the legacy two-argument source API for existing consumers and tests. Retain the exact light range, cone, 11-point fan, intensity and fixed-step sight integration. Physical LOS remains authoritative; illumination alone grants no visibility or shots.

### C — 2D/ISO coherence and lifecycle (P0/P1)
Both renderers filter emitting lights through the common predicate. Floor Plan resamples when shoulder-side offset changes and uses moved cover. ISO uses the same world walls and current cover, invalidates polygons when door aperture/shattering changes in the same bucket (including replay seeks), and reuses the existing per-actor BufferGeometry. No per-frame new lights or shadow maps. Site-swap teardown still clears beam caches.

### D — One prominent control (P1)
Place a small light button in the tactical squad/GO row, only when compatible. Status reflects selected operator ON/OFF (or disabled for incapacitated/replay); keyboard F activates the same button, subject to ordinary input/dialog/replay/photo guards. Click and keyboard share the same successful-action audio cue; no false clicks on failed operations. Accessible aria pressed state/title and mobile minimum touch area.

### E — Optional unscored training kit (P1)
Add explicit **WEAPON LIGHTS: KEEP CURRENT KIT / ISSUE COMPATIBLE LIGHTS (START OFF)** to unscored killhouse setup. On training creation, install a light only on compatible real weapon configurations, never changing the gun or saved roster. Start switched off deliberately. The same selected kit is restored on Retry. Scored K1 version-1 trial loadouts and records are untouched. If a roster has no eligible rail, do not invent an attachment or grant light through a cosmetic accessory.

### F — Acceptance and release (P0/P2)
Test fitted-only, forged unsupported config, down/dead, phase, replay, same-bucket light revision, physical source transform, moved blockers, shoulder offset, stale same-tick door geometry, unscored kit and scored historical trial contract. Run critical equipment/light controls, L1 baseline/power, 2D shared light tests plus TypeScript/build. No new AI or fog authority, no new batteries, no NVGs, no additional GPU lights. Merge only after green CI and successful current production Pages; verify merged SHA public-serving build before claiming deployment.

## Risks and deferrals
The optional practice kit cannot attach to a genuinely incompatible weapon; leave it unchanged rather than silently replacing that weapon. Low-light scored NVG-only/flashlight-only challenge design, equipment prerequisite handling, full replay/event auditing and night signature balance remain L1.5–L1.9. Browser screenshots, physical iPhone touch/thermal acceptance and GPU measurements remain separate from deterministic Node tests.
