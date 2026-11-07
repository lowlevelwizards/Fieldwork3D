/** Shared immutable finish palette for modular *appearance* only.
 * Each mesh remains a single solid finish. Never allocate per frame/config.
 */
import * as THREE from 'three';
const finish=(color:number,roughness=.84)=>
 new THREE.MeshStandardMaterial({color,roughness,metalness:.05,flatShading:true});
export const AR_BLACK_METAL=finish(0x414a44,.76);
export const AR_BLACK_POLYMER=finish(0x343e37,.9);
/** Matte, very low relief molded ribs, not high-contrast glowing decals. */
export const AR_POLYMER_RIB=finish(0x2c3630,.98);
/** Slightly lightened stamped steel STANAG; PMAG remains black polymer. */
export const AR_STANAG_METAL=finish(0x687369,.87);
/** Muted contour rib, light enough to avoid black jagged barcode marks. */
export const AR_STANAG_RIB=finish(0x526054,.96);
export const AR_MUTED_FDE=finish(0x95836b,.94);
export const AK_BLACK_METAL=finish(0x454b43,.8);
export const AK_BLACK_POLYMER=finish(0x354038,.89);
export const AK_DARK_WOOD=finish(0x79553b,.94);
export const AK_WARM_RESIN=finish(0x8d5939,.92);
/** Honey birch laminate, oxblood lacquer and late Soviet dark plum polyamide. */
export const AK_WOOD_AMBER=finish(0xa07842,.88);
export const AK_WOOD_RED=finish(0x915038,.88);
export const AK_PLUM_POLYMER=finish(0x4e3b4c,.92);
/** Low-contrast curved stamped ribs on classic steel 7.62 magazines. */
export const AK_MAG_RIB=finish(0x364238,.93);

/** HK service finishes use the same low-specular Fieldwork art language. */
export const HK_BLACK_METAL=finish(0x454b43,.8);
export const HK_DARK_POLYMER=finish(0x343d36,.93);
export const HK_OLIVE_POLYMER=finish(0x606950,.94);
export const HK_WOOD=finish(0x95714a,.95);
export const HK_MAG_METAL=finish(0x5e6960,.88);
/** Darker HK33/HK53 stamped steel: G3's established 7.62 finish is unchanged. */
export const HK556_MAG_METAL=finish(0x515b53,.90);
/** Ribbon ribs deliberately reuse the AK's proven stamped-metal finish. */
export const HK556_MAG_RIB=AK_MAG_RIB;
