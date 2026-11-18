# Weapon grip and shoulder contact — W1–W6

## Player-facing visual issue
In Operator Studio and the live rig, some transferred rifle low-ready carries put a true buttstock inside the front upper torso. A stockless MP5K intentionally has no buttplate to seat. Several families' fallback support-hand targets were on the handguard's side rather than centered below it, most notably G36: its H3 polymer floor is near Y -1.8, but the old support-hand center was at -1.35.

## Implementation
- W1: one **shared real geometry contact region** supplies unmounted fore-end hand-centre Y/Z for AR, AK, HK, FAL, FNC, G36. Family-specific small underhand drops from authoritative supportY, and a centered support-side -1.60 Z, keep contact below the polymer and nearer its underside. Real vertical foregrips/handstops retain their authored separate grips; no fictitious side clamp.
- W2: preserve the literal M4A1 user-authored high/low carry. During the *cached* transfer from that authoring reference to another equipped family, ensure its rear buttplate is at least X=5.50/Z=5.45 in the shoulder pocket, shifting the whole rigid carried gun and both wrist/elbow targets together, **not** a fake independent hand/stock offset. Intentionally exclude folded/stockless MP5K and short-stock/underarm.
- W3: normal ready, point and ADS shoulder pockets move slightly forward/outboard for natural butt seating with/without body armor. Preserve armor material push and use the same fit for visible weapon and firing muzzle.
- W4: add moderate family-specific relaxed low-ready configurations for G36/FNC (already present for AR/AK/HK/FAL). This keeps the support palm underneath instead of riding the side at relaxed posture; retains per-weapon handguard reach limits.
- W5/W6: focused side-view-oriented geometry checks across all factory presets, exact G36 four variants, stockless handling, normal/aim/short states and armor, while preserving exact authored original M4 reference and no new physics exemptions.

## Constraints
No model edits, new equipment options, magazine/ballistic profile migrations, operator arm scaling, per-frame model traversal, additional renderer materials or draw calls. All adjustment uses a shared deterministic rigid weapon transform, cached transferred carry data, real grip anchor Y and the existing arm reach/clearance validation. No independent stock or detached wrist authority. Assess broad pose and mobile smoke checks before merge; report any remaining fit cases rather than inventing a universal fake contact.
