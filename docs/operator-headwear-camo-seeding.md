# Headwear camo placement — seeded fabric cuts

## Goal
Keep the approved 32x32 canonical print, existing UV1 construction, structural
64px atlas and physical finish unchanged. Give each operator's headgear a stable
cut from the same printed fabric instead of sharing a fixed blotch.

## Contracts
- Stable input: `createOperatorRig(id)` supplies the personnel identity;
  selection derives a 32-texel toroidal offset from identity, slot, pattern and
  persisted `headwearCamoRoll` (integer 0..4095, default 0).
- The 128x128 panel atlas and UV1 stay unchanged: 1 texel/model unit for
  M81 and DCU; 2 for Tiger Stripe, UCP and MultiCam. No rotations or mirroring.
- Crown, band, brim and sidewall share the same phase, sampled modulo 32.
  Structural detail and roughness retain their own original atlas.
- A reroll only changes print placement. The Lab button and a second tap of
  the selected camo both increment the saved roll. Changing patterns resets
  the roll; selecting a solid preserves the data until another camo selection.
- Each rendered atlas caches by model, pattern and 2D phase (not by person).
  Repeated pose frames reuse the same GPU texture.
- M81's last oversized brown polygon is removed, preserving its green-forward
  proportions. A deterministic phase selector examines a forward 8x10 cloth
  sample and chooses a phase with at most 34% brown, when possible.
- Existing headwear eligibility and the five canonical preview patterns remain.
  Campaign/look serialization validates and preserves the roll.
- Preview-only controls do not affect shooting, collision, locomotion or kit truth.

## Acceptance
Six distinct operator identities should sample at least four distinct phases
per pattern. Rerolls survive `readWardrobe` and outfit serialization. The same
operator/slot/camo/roll must reproduce the same look on reload. Materials retain
nearest-neighbor print, UV1, physical roughness, and solid-color fallback.
M81 never presents a large, unbroken brown front under the controlled sample.
