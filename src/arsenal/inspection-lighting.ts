/** Stable Arsenal-only inspection presentation.
 * The Operator Studio's pale backdrop and experimental lighting controls
 * must never alter the weapon workbench or Gallery. Keep one light rig for
 * both actual weapon thumbnails and the full-screen inspection viewport.
 */
import * as THREE from 'three';

export const ARSENAL_INSPECTION_BACKGROUND=0x182824;
export function addArsenalInspectionLighting(scene:THREE.Scene):void{
 scene.background=new THREE.Color(ARSENAL_INSPECTION_BACKGROUND);
 const hemisphere=new THREE.HemisphereLight(0xf3f5eb,0x788b7e,2.65);
 const key=new THREE.DirectionalLight(0xfff0d8,3.25);
 key.position.set(30,55,70);
 const fill=new THREE.DirectionalLight(0xd5ede4,1.95);
 fill.position.set(-46,16,58);
 scene.add(hemisphere,key,fill);
}
