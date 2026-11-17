/** E6.19.B: wall depth state must track actual alpha, even if its
 * transparent-pass membership was already true for exterior-known fog.
 */
import type * as THREE from 'three';

export function setWallMaterialPassFlags(
 material:THREE.MeshStandardMaterial,
 transparent:boolean,
 depthWrite:boolean
):void{
 if(material.transparent!==transparent){
  material.transparent=transparent;
  material.needsUpdate=true;
 }
 if(material.depthWrite!==depthWrite)material.depthWrite=depthWrite;
}
