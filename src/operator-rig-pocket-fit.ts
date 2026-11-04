/** RIG-R6: visual-only deformation where external webbing bears on a
 * blouse. No carrier, garment-contact shell, IK bone or gameplay stat changes.
 * The unpressed pocket pose is saved once and restored exactly.
 */
import * as THREE from 'three';
import {RIG_POCKET_PRESSURE} from './operator-rig-garment-relief.ts';

type PocketRest={x:number;y:number;z:number;scaleX:number};
export function fitRigCoveredPockets(torso:THREE.Group,rig:string):void{
 const pressed=rig!=='no-rig'&&rig!=='belt-harness';
 torso.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||!object.userData.armorCompressible)
   return;
  const mesh=object;
  let rest=mesh.userData.rigPocketRest as PocketRest|undefined;
  if(!rest){
   rest={x:mesh.position.x,y:mesh.position.y,z:mesh.position.z,
    scaleX:mesh.scale.x};
   mesh.userData.rigPocketRest=rest;
  }
  if(mesh.userData.rigPocketPressed===pressed)return;
  const amount=pressed?1:0;
  mesh.position.x=rest.x-RIG_POCKET_PRESSURE.inset*amount;
  mesh.position.y=rest.y-RIG_POCKET_PRESSURE.drop*amount;
  mesh.position.z=rest.z*(1-(1-RIG_POCKET_PRESSURE.lateralScale)*amount);
  mesh.scale.x=rest.scaleX*(1-(1-RIG_POCKET_PRESSURE.depthScale)*amount);
  mesh.userData.rigPocketPressed=pressed;
 });
}
