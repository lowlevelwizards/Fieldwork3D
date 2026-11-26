/** Shared immutable authored weapon finishes for appearance only.
 * All exported aliases are existing MeshStandardMaterial instances, allocated once
 * through the exact-spec cache. Safe for rig, Arsenal, thumbnail and replay.
 * Never dispose these globally owned materials with a weapon mesh.
 */
import {weaponFinish} from './weapon-material-registry.ts';
export const AR_BLACK_METAL=weaponFinish('ar-steel');
export const AR_BLACK_POLYMER=weaponFinish('ar-polymer');
export const AR_WA6_STEEL=weaponFinish('ar-wa6-steel');
export const AR_WA6_POLYMER=weaponFinish('ar-wa6-polymer');
export const AR_POLYMER_RIB=weaponFinish('ar-polymer-rib');
export const AR_STANAG_METAL=weaponFinish('ar-stanag');
export const AR_STANAG_RIB=weaponFinish('ar-stanag-rib');
export const AR_MUTED_FDE=weaponFinish('ar-fde');
export const AK_BLACK_METAL=weaponFinish('ak-steel');
export const AK_BLACK_POLYMER=weaponFinish('ak-polymer');
export const AK_DARK_WOOD=weaponFinish('ak-wood-dark');
export const AK_WARM_RESIN=weaponFinish('ak-resin');
export const AK_WOOD_AMBER=weaponFinish('ak-wood-amber');
export const AK_WOOD_RED=weaponFinish('ak-wood-red');
export const AK_PLUM_POLYMER=weaponFinish('ak-plum-polymer');
export const AK_MAG_RIB=weaponFinish('ak-mag-rib');
export const AK_COVER_STAMP_METAL=weaponFinish('ak-cover-stamp');
export const HK_BLACK_METAL=weaponFinish('hk-steel');
export const HK_DARK_POLYMER=weaponFinish('hk-polymer');
export const HK_OLIVE_POLYMER=weaponFinish('hk-olive-polymer');
export const HK_WOOD=weaponFinish('hk-wood');
export const R870_WALNUT_GROOVE=weaponFinish('r870-walnut-groove');
export const HK_MAG_METAL=weaponFinish('hk-mag-steel');
export const HK556_MAG_METAL=weaponFinish('hk556-mag-steel');
export const HK9_MAG_METAL=weaponFinish('hk9-mag-steel');
export const HK556_MAG_RIB=weaponFinish('hk556-mag-rib');
export const HK_SD_SUPPRESSOR_METAL=weaponFinish('hk-sd-metal');
export const HK_MUZZLE_METAL=weaponFinish('hk-muzzle-metal');
/** G36 O3: scoped factory poly/rim/lens/rubber finish hierarchy.
 * Other HK families intentionally keep their existing shared colors.
 */
export const G36_CALIBRATED_STEEL=weaponFinish('g36-steel');
export const G36_DARK_POLYMER=weaponFinish('g36-polymer');
export const G36_OPTIC_RIM=weaponFinish('g36-optic-rim');
export const G36_LENS_BLACK=weaponFinish('g36-lens');
export const G36_RUBBER=weaponFinish('g36-rubber');
/** G36 FT1.9D0 shared opaque smoky-polymer magazine; no transparency sorting. */
export const G36_SMOKED_MAGAZINE=weaponFinish('g36-smoked-mag');
/** WA4 calibrated FNC-specific finish aliases; HK remains unchanged. */
export const FNC_BLACK_METAL=weaponFinish('fnc-steel');
export const FNC_DARK_POLYMER=weaponFinish('fnc-polymer');
export const FAL_BLACK_METAL=weaponFinish('fal-steel');
export const FAL_FNC_CALIBRATED_LOWER_METAL=weaponFinish('fal-fnc-calibrated-lower-steel');
export const FAL_LOWER_METAL=weaponFinish('fal-lower-steel');
export const FAL_DARK_POLYMER=weaponFinish('fal-polymer');
export const FAL_WOOD=HK_WOOD;
export const FAL_MAG_METAL=HK_MAG_METAL;
export const FAL_VENT_SHADOW=weaponFinish('fal-vent-shadow');
export const FAL_MAG_RIB=weaponFinish('fal-mag-rib');
export const FAL_TRANSITION_METAL=weaponFinish('fal-transition-steel');
export const FAL_MUZZLE_METAL=HK_MUZZLE_METAL;
export const FAL_MUZZLE_SLOT=weaponFinish('fal-muzzle-slot');
export const GLOCK_COYOTE_SLIDE=weaponFinish('glock-coyote-slide');
export const GLOCK_PORT_SHADOW=weaponFinish('glock-port-shadow');
export const WEAPON_ACCESSORY_STEEL=weaponFinish('accessory-steel');
export const WEAPON_ACCESSORY_POLYMER=weaponFinish('accessory-polymer');
