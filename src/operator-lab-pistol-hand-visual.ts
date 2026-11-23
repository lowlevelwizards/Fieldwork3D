/** Minimal one-finger silhouettes for Lab-only pistol handling.
 * The core rig intentionally uses broad mitt-like hand blocks. These two
 * chunky extensions make the index reach the visible trigger guard and the
 * off-hand wrap the foregrip rather than simply overlap the receiver.
 * No individual finger IK, live combat authority or global art changes.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';

const FINGER='operator-lab-trigger-index';
const SUPPORT='operator-lab-support-thumb';
const create=(hand:THREE.Mesh,name:string,w:number,h:number,d:number,
 x:number,y:number,z:number):THREE.Mesh=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),hand.material);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;
 hand.add(mesh);
 return mesh;
};
export function presentLabPistolHandShapes(rig:OperatorRig,
 active:boolean,retention:boolean,reloading:boolean):void{
 const primary=rig.arms[1].hand;
 const support=rig.arms[0].hand;
 let index=primary.getObjectByName(FINGER) as THREE.Mesh|undefined;
 let thumb=support.getObjectByName(SUPPORT) as THREE.Mesh|undefined;
 if(active){
  // Cuboid index terminates adjacent to the authored trigger opening.
  // Geometry is created once per Lab operator and follows wrist transforms.
  index??=create(primary,FINGER,2.2,.7,.7,2.1,.56,1.3);
  // The opposite thumb/hand wraps the grip from ahead and left.
  thumb??=create(support,SUPPORT,1.7,.85,.85,1.55,.25,1.0);
 }
 if(index)index.visible=active;
 if(thumb)thumb.visible=active&&!retention&&!reloading;
}
