/** One low-poly shared casing mesh; per-instance proportions/finish. */
import * as THREE from 'three';
import type {EjectedCasing} from '../breach-effects.ts';
export function createCasingGeometry():THREE.BufferGeometry{
 // Four facets rather than six; closed cap, no hollow interior or rim mesh.
 const g=new THREE.CylinderGeometry(.53,.65,2.18,4,1,false);
 return g;
}
export function casingVisualProfile(c:Pick<EjectedCasing,'weapon'|'secondaryWeapon'>){
 // Overall length ~30% smaller than the former scaled cylinder.
 if(c.weapon==='shotgun')return {width:1.12,length:1.40,color:0xa57858};
 if(c.secondaryWeapon||c.weapon==='smg')return {width:.72,length:.65,color:0xb38d59};
 if(c.weapon==='rifle')return {width:.77,length:1.21,color:0xb38d59};
 return {width:.72,length:1.05,color:0xb38d59};
}
