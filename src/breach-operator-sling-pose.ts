/** Post-IK sling geometry: a final presentation phase.
 * Same solved weapon and hand geometry in live/replay/lab; a strap never
 * changes authoritative muzzle, ammunition, pose or collision.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
const P=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export function updateOperatorSlingPose(
 r:Pick<OperatorRig,'slingStraps'|'droppedGun'|'weapon'|'root'|'chest'>,
 p:Pick<OperatorPose,'weaponConfiguration'|'surrender'|'stride'>,
 physicalSpeed:number,vertical:THREE.Vector3,slingDelta:THREE.Vector3
):void{
  const slingEquipped=p.weaponConfiguration?.slots.sling==='sling-two-point'&&
   !p.surrender;
  for(const mesh of r.slingStraps)mesh.visible=!!slingEquipped;
  if(slingEquipped){
   const gun=r.droppedGun.visible?r.droppedGun:r.weapon;
   const scale=r.weapon.scale.x;
   let rear:THREE.Vector3,front:THREE.Vector3;
   if(r.droppedGun.visible){
    r.root.updateMatrixWorld(true);
    rear=r.chest.worldToLocal(gun.localToWorld(P(-9,-.4,3)));
    front=r.chest.worldToLocal(gun.localToWorld(P(10,-.4,3)));
   }else{
    rear=P(-9*scale,-.4,3).applyEuler(gun.rotation).add(gun.position);
    front=P(10*scale,-.4,3).applyEuler(gun.rotation).add(gun.position);
   }
   const sway=Math.sin(p.stride*Math.PI*2)*Math.min(1,physicalSpeed/80)*.6;
   const points=[rear,P(-2.5,4.5,10.1),P(1.5+sway,-5.8,11.5),front];
   for(let i=0;i<r.slingStraps.length;i++){
    const start=points[i],end=points[i+1];
    const delta=slingDelta.copy(end).sub(start),length=delta.length();
    const mesh=r.slingStraps[i];
    mesh.position.copy(start).addScaledVector(delta,.5);
    mesh.scale.set(1,Math.max(.1,length),1);
    mesh.quaternion.setFromUnitVectors(vertical,delta.normalize());
   }
  }
}
