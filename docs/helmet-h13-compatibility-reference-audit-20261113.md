# H13 · ACH/MICH accessory fit, compatibility and reference audit

## Reference baseline
- Ops-Core ACH ARC product specification and user manual: https://shop.gentexcorp.com/content/Ops-Core-ACH-ARCs.pdf ; https://shop.gentexcorp.com/content/Ops-Core_Arcs_ACH_User_Manual.pdf
- ARC rails mount through existing helmet chinstrap attachment holes; light/camera/visor interfaces and adapter plates are standard rail uses.
- Optional NVG bungees have hooks and a forward pull. Stylized representation is appropriate, but a hard corner-cutting cord is not.
- Tactical goggles may be stowed above the eye line with the helmet strap around the assembly. With an NVG shroud, forward offset and upward tilt are preferable to burying the goggle shell in its receiver.

## H13 implemented
| Accessory | Structural prerequisite | Occupied region / interaction | UI decision |
|---|---|---|---|
| NVG shroud | ACH/MICH shell | Upper center front | Independent toggle |
| ARC rails | ACH/MICH shell | Side mounting holes | Independent toggle, PASGT unavailable |
| NVG retention bungees | **Rails + shroud** | Runs outside side-to-front corner | Disabled until both mount components |
| Camera | **Rails** | One selected front-side ARC slot | On same side as light: other side auto-selected |
| Helmet light | **Rails** | One selected front-side ARC slot | On same side as camera: other side auto-selected |
| Goggles | No modern rail prerequisite | Eyes, forehead, or rear | Front stow tilted/forward; strap outside ARC/shroud envelope |
| Goggle fabric sleeve | Goggles front/rear | Covers matching housing | No standalone model when eyes-worn |
| IR strobe | Crown marker carrier | Competes with rear top chemlight | Keep stored selection; effective hide |
| Top rear chemlight | Crown carrier | Competes with IR strobe | Keep stored selection; effective hide |
| Battery pack | Rear carrier | Counterweight and rear-stowed goggles | Effective suppress when blocked |
| Counterweight | Rear carrier | Battery and rear-stowed goggles | Effective suppress when blocked |
| Patch / identifier | Cover or Velcro panel | Shell marking | On bare shell, requires Velcro |
| Concealment | Cover for scrim/foliage | Fabric slit/net | Saved choice persists when temporarily bare |
| PASGT | Historical bracket / goggles | No modern rails, bungees, battery, camera or dedicated task light | Modern controls visible but disabled |

Data policy: save raw field preferences; compute a non-destructive *effective* configuration. Studio presents prerequisites and any suppressed selection. No new per-frame raycasts, simulated devices, or collision bodies.

## Follow-on customization candidates (not part of H13)
1. **ARC accessory adapter types** (plain rail, Wing-Loc, short Picatinny), with the existing camera/light sharing these mounts. Strongest low-cost next step.
2. **Rail-mounted ear-protection headset arms**, including folded/up position. Requires a headset equipment dependency audit first; avoid duplicating the existing communications headset model.
3. **Visor and mandible rail interfaces**. A strong visible silhouette, but requires explicit fit restrictions with masks, goggles and headsets.
4. **Bungee hook/keeper variant** (slim cord, tensioned dual line). Keep cosmetic and reuse existing route geometry.
5. **Marker identification** (rear cat-eyes or slim reflective side tabs), with camouflage-specific constraints.

Do not add all five by default. Keep the established stylized low-poly distance silhouette, stable four-corner geometry, and cover-aware fit as the baseline. Target gameplay readability before face count.
