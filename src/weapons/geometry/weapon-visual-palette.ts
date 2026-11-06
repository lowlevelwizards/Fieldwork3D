/** Shared immutable finish palette for modular *appearance* only.
 * Each mesh remains a single solid finish. Never allocate per frame/config.
 */
import * as THREE from 'three';
const finish=(color:number,roughness=.84)=>
 new THREE.MeshStandardMaterial({color,roughness,metalness:.05,flatShading:true});
export const AR_BLACK_METAL=finish(0x414a44,.76);
export const AR_BLACK_POLYMER=finish(0x343e37,.9);
/** Slightly lightened stamped steel STANAG; PMAG remains black polymer. */
export const AR_STANAG_METAL=finish(0x687369,.76);
export const AR_MUTED_FDE=finish(0x95836b,.94);
export const AK_BLACK_METAL=finish(0x454b43,.8);
export const AK_BLACK_POLYMER=finish(0x354038,.89);
export const AK_DARK_WOOD=finish(0x79553b,.94);
export const AK_WARM_RESIN=finish(0x8d5939,.92);
