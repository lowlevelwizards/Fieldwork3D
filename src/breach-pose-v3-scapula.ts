/** B21: small anatomical support-shoulder auditions. The shoulder socket
 * can protract/retract under soft sleeve fabric, but may NOT translate the
 * torso core, extend the bone, or change any ballistic / firearm contact.
 * Only an explicitly chosen V3 Lab preset can exercise these shifts.
 */
import * as THREE from 'three';
export type V3ScapulaPreset='neutral'|'forward'|'outboard'|
 'raised'|'lowered'|'protract';
const OFFSETS:Record<V3ScapulaPreset,readonly [number,number,number]>={
 neutral:[0,0,0],forward:[.60,.05,-.45],
 outboard:[.24,.05,-.95],raised:[.25,.50,-.60],
 lowered:[.35,-.42,-.70],protract:[.85,.15,-.70],
};
export function v3ScapulaOffset(preset:V3ScapulaPreset):THREE.Vector3{
 const [x,y,z]=OFFSETS[preset];
 return new THREE.Vector3(x,y,z);
}
