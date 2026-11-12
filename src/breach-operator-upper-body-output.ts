/** Package B4 — the only upper-body transform-output adapter.
 * Existing B1 action ownership, B3 IK math and V3/V4 pose choices remain
 * authoritative. This module owns neither contacts nor a render clock.
 * Arm meshes do not change until B2 commits all six staged slots together.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPoseScratch,OperatorArmPoseScratch}
 from './breach-operator-pose-scratch.ts';
import {alignSegmentComponents} from './breach-ik.ts';

const localZ=new THREE.Vector3(0,0,1);

/** Seed once from the rig for exact degenerate-alignment compatibility.
 * Subsequent frames reuse their own component transforms; commits never
 * copy from another actor, frame, or workbench.
 */
export function beginOperatorArmPose(r:OperatorRig,
 scratch:OperatorPoseScratch):OperatorArmPoseScratch{
 const output=scratch.armOutput;
 if(output.initialized)return output;
 for(let i=0;i<2;i++){
  const source=[r.arms[i].upper,r.arms[i].lower,r.arms[i].hand];
  for(let j=0;j<3;j++){
   const node=source[j],target=output.transforms[i*3+j];
   target.position.copy(node.position);
   target.quaternion.copy(node.quaternion);
   target.scale.copy(node.scale);
   target.visible=node.visible;
  }
  output.handEuler[i].copy(r.arms[i].hand.rotation);
 }
 output.initialized=true;
 return output;
}
/** One anatomically constrained pair of arm segments, using precisely the
 * B3 shared orientation math. No hidden second elbow/shoulder search.
 */
export function setOperatorArmSegments(scratch:OperatorPoseScratch,
 index:0|1,shoulder:THREE.Vector3,elbow:THREE.Vector3,
 wrist:THREE.Vector3,side:THREE.Vector3):void{
 const arm=scratch.armOutput.transforms,base=index*3;
 const upper=arm[base],lower=arm[base+1];
 alignSegmentComponents(upper.position,upper.quaternion,upper.scale,
  shoulder,elbow,side);
 alignSegmentComponents(lower.position,lower.quaternion,lower.scale,
  elbow,wrist,side);
}
/** The same hand placement and XYZ Euler order used by the historical rig.
 * The B1 decision still chooses which interaction owns the wrist.
 */
export function setOperatorHandPose(scratch:OperatorPoseScratch,
 index:0|1,wrist:THREE.Vector3,yaw:number):void{
 const hand=scratch.armOutput.transforms[index*3+2];
 hand.position.copy(wrist);
 const euler=scratch.armOutput.handEuler[index];
 euler.set(0,yaw,0);
 hand.quaternion.setFromEuler(euler);
}
/** AK rock-in must affect the same support palm that carries the magazine,
 * and must happen exactly once after its final IK wrist is selected.
 */
export function rotateOperatorSupportHand(scratch:OperatorPoseScratch,
 radians:number):void{
 if(!radians)return;
 const output=scratch.armOutput,hand=output.transforms[2];
 output.rockQuaternion.setFromAxisAngle(localZ,radians);
 hand.quaternion.multiply(output.rockQuaternion);
 output.handEuler[0].setFromQuaternion(hand.quaternion);
}
export function operatorHandTransform(scratch:OperatorPoseScratch,
 index:0|1):{
 readonly position:THREE.Vector3;readonly quaternion:THREE.Quaternion;
 readonly rotation:THREE.Euler
}{
 const output=scratch.armOutput;
 return {position:output.transforms[index*3+2].position,
  quaternion:output.transforms[index*3+2].quaternion,
  rotation:output.handEuler[index]};
}
/** No per-frame return-value array: these six typed tuples belong to the
 * existing rig-local scratch and are consumed by the B2 direct publisher.
 */
export function finishOperatorArmPose(scratch:OperatorPoseScratch):
 readonly OperatorArmPoseScratch['outputs'][number][]{
 const output=scratch.armOutput;
 if(!output.initialized)
  throw new Error('B4 upper-body pose committed without initialization');
 for(let i=0;i<output.transforms.length;i++){
  const t=output.transforms[i],v=output.outputs[i].values;
  v[0]=t.position.x;v[1]=t.position.y;v[2]=t.position.z;
  v[3]=t.quaternion.x;v[4]=t.quaternion.y;
  v[5]=t.quaternion.z;v[6]=t.quaternion.w;
  v[7]=t.scale.x;v[8]=t.scale.y;v[9]=t.scale.z;
  v[10]=t.visible?1:0;
 }
 return output.outputs;
}
