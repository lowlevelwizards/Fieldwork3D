/** WA3 semantics layered on the existing exact finish registry. Do not
 * rewrite world material roles, saved finish IDs or cached production colors. */
import type * as THREE from 'three';
import {WEAPON_FINISH_SPECS,type WeaponFinishId} from './weapon-material-registry.ts';
import {visualMaterialRole} from '../../rendering/material-identity.ts';
export type WeaponArtSubstrate='steel'|'polymer'|'wood'|'resin'|'rubber'|'lens'|'smoked-polymer'|'paint'|'unclassified';
const special:Partial<Record<WeaponFinishId,WeaponArtSubstrate>>={
 'ak-resin':'resin','ak-plum-polymer':'polymer','g36-rubber':'rubber','g36-lens':'lens',
 'g36-smoked-mag':'smoked-polymer','ar-fde':'paint'
};
export function weaponFinishSubstrate(id:WeaponFinishId):WeaponArtSubstrate{
 const role=WEAPON_FINISH_SPECS[id].role;
 return special[id]??(role==='steel'||role==='polymer'||role==='wood'||role==='paint'?role:'unclassified');
}
const ids=Object.keys(WEAPON_FINISH_SPECS) as WeaponFinishId[];
/** Atlas material clones retain exact color/response/role. Match these values
 * rather than object identity; disclose ambiguous or unregistered matches. */
export function describeWeaponArtMaterial(m:THREE.Material){
 const role=visualMaterialRole(m),standard=m as THREE.MeshStandardMaterial;
 const matches=standard.isMeshStandardMaterial?ids.filter(id=>{
  const s=WEAPON_FINISH_SPECS[id];
  return s.role===role&&s.color===standard.color.getHex()&&s.roughness===standard.roughness&&s.metalness===standard.metalness;
 }):[];
 const types=[...new Set(matches.map(weaponFinishSubstrate))];
 const substrate:WeaponArtSubstrate=types.length===1?types[0]:types.length>1?'unclassified':
  role==='steel'||role==='polymer'||role==='wood'||role==='paint'?role:'unclassified';
 return {substrate,matches,confidence:types.length>1?'ambiguous':matches.length?'registered':substrate==='unclassified'?'unknown':'role-only'} as const;
}
/** Deliberately provisional art-study swatches, never production defaults.
 * Target modest value/hue separation for dark neutral finishes only.
 * Historical colors, painted finishes, wood and special materials stay put. */
export const WA3_DARK_STUDY:Readonly<Partial<Record<WeaponFinishId,number>>>={
 'ar-steel':0x4b5154,'ar-polymer':0x343d33,
 'ak-steel':0x4a5051,'ak-polymer':0x343b32,
 'hk-steel':0x474e50,'hk-polymer':0x303831,
 'fal-steel':0x495052,'fal-lower-steel':0x3e4545,'fal-polymer':0x343d32,
 'g36-polymer':0x3c443a,'accessory-steel':0x4d5556,'accessory-polymer':0x343c32
};
export function weaponArtStudyColor(m:THREE.Material):number|undefined{
 const {matches}=describeWeaponArtMaterial(m);
 if(!matches.length)return undefined;
 const colors=new Set(matches.map(id=>WA3_DARK_STUDY[id]));
 return colors.size===1?[...colors][0]:undefined;
}
