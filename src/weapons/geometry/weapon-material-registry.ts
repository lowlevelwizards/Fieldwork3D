/** A2: single authored weapon finish vocabulary; no per-weapon allocations.
 * A finish is an exact physical visual spec, NOT a save/configuration ID.
 * Similar colors may intentionally remain different when their materials do.
 */
import * as THREE from 'three';
import {tagVisualMaterial,type VisualMaterialRole}
 from '../../rendering/material-identity.ts';

type Finish=Readonly<{color:number;roughness:number;metalness:number;role:VisualMaterialRole}>;
/** Typed source of truth for AR, AK, HK, FAL, FNC and mounted accessories.
 * Existing artwork aliases are exported from weapon-visual-palette.ts.
 * Revisions here affect every appearance context using shared weapon builders.
 */
export const WEAPON_FINISH_SPECS={
 'ar-steel':{color:0x414a44,roughness:.76,metalness:.12,role:'steel'},
 'ar-polymer':{color:0x343e37,roughness:.90,metalness:.015,role:'polymer'},
 'ar-polymer-rib':{color:0x2c3630,roughness:.98,metalness:.015,role:'polymer'},
 'ar-stanag':{color:0x657067,roughness:.87,metalness:.12,role:'steel'},
 'ar-stanag-rib':{color:0x526054,roughness:.96,metalness:.10,role:'steel'},
 'ar-fde':{color:0x95836b,roughness:.94,metalness:.015,role:'paint'},
 'ak-steel':{color:0x424942,roughness:.80,metalness:.12,role:'steel'},
 'ak-polymer':{color:0x343c37,roughness:.90,metalness:.015,role:'polymer'},
 'ak-wood-dark':{color:0x79553b,roughness:.94,metalness:0,role:'wood'},
 'ak-resin':{color:0x895c40,roughness:.92,metalness:.015,role:'polymer'},
 'ak-wood-amber':{color:0xa07842,roughness:.88,metalness:0,role:'wood'},
 'ak-wood-red':{color:0x915038,roughness:.88,metalness:0,role:'wood'},
 'ak-plum-polymer':{color:0x4e3b4c,roughness:.92,metalness:.015,role:'polymer'},
 'ak-mag-rib':{color:0x364238,roughness:.93,metalness:.12,role:'steel'},
 'ak-cover-stamp':{color:0x728077,roughness:.85,metalness:.12,role:'steel'},
 'hk-steel':{color:0x3e4441,roughness:.82,metalness:.12,role:'steel'},
 'hk-polymer':{color:0x313735,roughness:.95,metalness:.015,role:'polymer'},
 'hk-olive-polymer':{color:0x60694e,roughness:.94,metalness:.015,role:'polymer'},
 'hk-wood':{color:0x896947,roughness:.95,metalness:0,role:'wood'},
 'hk-mag-steel':{color:0x505757,roughness:.90,metalness:.12,role:'steel'},
 'hk556-mag-steel':{color:0x414747,roughness:.91,metalness:.12,role:'steel'},
 'hk9-mag-steel':{color:0x373d3d,roughness:.92,metalness:.11,role:'steel'},
 'hk556-mag-rib':{color:0x353d39,roughness:.95,metalness:.10,role:'steel'},
 'hk-sd-metal':{color:0x2f3434,roughness:.80,metalness:.16,role:'steel'},
 'hk-muzzle-metal':{color:0x2f3533,roughness:.78,metalness:.16,role:'steel'},
 // G36 O3 color audit: G36-only opaque and pooled finishes. Do not recolor
 // G3/HK33/MP5/FAL by editing the shared HK material signatures.
 'g36-polymer':{color:0x3b423e,roughness:.96,metalness:.012,role:'polymer'},
 'g36-optic-rim':{color:0x303832,roughness:.96,metalness:.012,role:'polymer'},
 'g36-lens':{color:0x141c18,roughness:.99,metalness:0,role:'polymer'},
 'g36-rubber':{color:0x252d29,roughness:.99,metalness:.005,role:'polymer'},
 // Smoked magazine remains opaque; one quiet body-tone contrast, no alpha sort.
 'g36-smoked-mag':{color:0x525f59,roughness:.95,metalness:.008,role:'polymer'},
 'fal-steel':{color:0x414845,roughness:.82,metalness:.12,role:'steel'},
 'fal-lower-steel':{color:0x363d3a,roughness:.87,metalness:.10,role:'steel'},
 'fal-polymer':{color:0x343d39,roughness:.93,metalness:.015,role:'polymer'},
 'fal-vent-shadow':{color:0x232c28,roughness:.98,metalness:.015,role:'polymer'},
 'fal-mag-rib':{color:0x404847,roughness:.94,metalness:.10,role:'steel'},
 'fal-transition-steel':{color:0x2a312e,roughness:.86,metalness:.13,role:'steel'},
 'fal-muzzle-slot':{color:0x202624,roughness:.98,metalness:.06,role:'steel'},
 'accessory-steel':{color:0x47514b,roughness:.82,metalness:.12,role:'steel'},
 'accessory-polymer':{color:0x343c38,roughness:.94,metalness:.015,role:'polymer'}
} as const satisfies Record<string,Finish>;
export type WeaponFinishId=keyof typeof WEAPON_FINISH_SPECS;
const sharedBySignature=new Map<string,THREE.MeshStandardMaterial>();
const sharedById=new Map<WeaponFinishId,THREE.MeshStandardMaterial>();
export function weaponFinish(id:WeaponFinishId):THREE.MeshStandardMaterial{
 const existing=sharedById.get(id);
 if(existing)return existing;
 const spec:Finish=WEAPON_FINISH_SPECS[id];
 // Signature deduplication is exact: never conflate related but
 // materially different black finishes or steel/polymer substrates.
 const key=[spec.role,spec.color,spec.roughness,spec.metalness].join(':');
 let material=sharedBySignature.get(key);
 if(!material){
  material=tagVisualMaterial(new THREE.MeshStandardMaterial({
   color:spec.color,roughness:spec.roughness,metalness:spec.metalness,
   flatShading:true
  }),spec.role);
  sharedBySignature.set(key,material);
 }
 sharedById.set(id,material);
 return material;
}
export function weaponMaterialCacheSize():number{return sharedBySignature.size;}
