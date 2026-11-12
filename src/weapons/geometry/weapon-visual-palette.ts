/** Shared immutable finish palette for modular *appearance* only.
 * Each mesh remains a single solid finish. Never allocate per frame/config.
 */
import * as THREE from 'three';
import {tagVisualMaterial,type VisualMaterialRole} from '../../rendering/material-identity.ts';
const finish=(color:number,roughness=.84,metalness=.05,role:VisualMaterialRole='steel')=>
 tagVisualMaterial(new THREE.MeshStandardMaterial({
  color,roughness,metalness,flatShading:true
 }),role);
export const AR_BLACK_METAL=finish(0x414a44,.76,'steel');
export const AR_BLACK_POLYMER=finish(0x343e37,.9,'polymer');
/** Matte, very low relief molded ribs, not high-contrast glowing decals. */
export const AR_POLYMER_RIB=finish(0x2c3630,.98,'polymer');
/** Slightly lightened stamped steel STANAG; PMAG remains black polymer. */
export const AR_STANAG_METAL=finish(0x687369,.87,'steel');
/** Muted contour rib, light enough to avoid black jagged barcode marks. */
export const AR_STANAG_RIB=finish(0x526054,.96,'steel');
export const AR_MUTED_FDE=finish(0x95836b,.94,'paint');
export const AK_BLACK_METAL=finish(0x454b43,.8,'steel');
export const AK_BLACK_POLYMER=finish(0x354038,.89,'polymer');
export const AK_DARK_WOOD=finish(0x79553b,.94,'wood');
export const AK_WARM_RESIN=finish(0x8d5939,.92,'polymer');
/** Honey birch laminate, oxblood lacquer and late Soviet dark plum polyamide. */
export const AK_WOOD_AMBER=finish(0xa07842,.88,'wood');
export const AK_WOOD_RED=finish(0x915038,.88,'wood');
export const AK_PLUM_POLYMER=finish(0x4e3b4c,.92,'polymer');
/** Low-contrast curved stamped ribs on classic steel 7.62 magazines. */
export const AK_MAG_RIB=finish(0x364238,.93,'steel');

/** HK blackened steel and molded plastic are related, not the same finish.
 * These colors are appearance targets, not manufacturer paint codes.
 * Steel stays muted to match Fieldwork's chunky 8-facet miniatures.
 */
export const HK_BLACK_METAL=finish(0x3b4140,.82,.12,'steel');
export const HK_DARK_POLYMER=finish(0x303433,.95,.02,'polymer');
export const HK_OLIVE_POLYMER=finish(0x60694e,.94,.02,'polymer');
export const HK_WOOD=finish(0x896947,.95,.02,'wood');
/** Magazine steel differs by historical family; never tint it olive plastic. */
export const HK_MAG_METAL=finish(0x505757,.90,.12,'steel');
export const HK556_MAG_METAL=finish(0x414747,.91,.12,'steel');
export const HK9_MAG_METAL=finish(0x373d3d,.92,.11,'steel');
/** HK33/HK53 low-relief stamp lines must not inherit AK-green ribs. */
export const HK556_MAG_RIB=finish(0x353d39,.95,.10,'steel');
/** Integral SD can uses subdued anodized metal, not the polymer shroud. */
export const HK_SD_SUPPRESSOR_METAL=finish(0x2f3434,.80,.16,'steel');
/** Muzzle brakes/flash hiders are blackened steel, not rubber furniture. */
export const HK_MUZZLE_METAL=finish(0x2f3533,.78,.16,'steel');
