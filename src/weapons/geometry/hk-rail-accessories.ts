/** Chunky cosmetic HK claw-to-top-rail mount and rail-mounted vertical grip.
 * Fixed meshes are built only on a configuration change, never each frame.
 */
import * as THREE from 'three';
import {HK_BLACK_METAL,HK_DARK_POLYMER} from './weapon-visual-palette.ts';
export function addHKClawRail(root:THREE.Group):void{
 const block=(x:number,y:number,z:number,w:number,h:number,d:number,name:string)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),HK_BLACK_METAL);
  m.position.set(x,y,z);m.name='family-art-hk-claw-'+name;
  m.userData.hkClawMount=name;
  m.castShadow=true;m.receiveShadow=true;root.add(m);
 };
 // Four big receiver claws, one raised single top bar; rear diopter stays
 // exposed below the rail. Deliberately no tiny hardware or micro-teeth.
 for(const x of [-4.90,1.60])for(const z of [-1.39,1.39])
  block(x,2.62,z,.74,1.66,.58,'foot');
 block(-1.65,4.06,0,7.62,.46,1.94,'rail');
 for(const x of [-3.60,-1.55,.45])
  block(x,4.36,0,.40,.17,1.99,'rib');
}
export function addHKRailVerticalGrip(root:THREE.Group):void{
 const grip=new THREE.Mesh(new THREE.BoxGeometry(1.48,3.70,1.52),HK_DARK_POLYMER);
 grip.position.set(7.00,-3.46,0);
 grip.name='family-art-hk-trirail-vertical-grip';
 grip.userData.hkTriRailVerticalGrip=true;
 grip.castShadow=true;grip.receiveShadow=true;root.add(grip);
}
