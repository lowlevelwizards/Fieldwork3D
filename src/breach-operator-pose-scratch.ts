/** P6.3 — A render-only scratch context owned by one operator.
 * Limb results retain stable identities; the solver overwrites them after
 * a complete pose, never while another rig is using them.
 */
import * as THREE from 'three';
import type {LimbSolution} from './breach-ik.ts';

const solution=():LimbSolution=>({
  joint:new THREE.Vector3(),
  effector:new THREE.Vector3(),
  bendPlane:new THREE.Vector3(),
  angle:0,requestedReach:0,reached:false
});
/** B3 — lower-body component results are staged without touching leg
 * scene nodes. Stable values/proxies are owned by the existing pose scratch
 * (one per rig), not by a second animation or contact-history cache.
 */
export type LegPoseValues=[
 number,number,number,number,number,number,number,
 number,number,number,number
];
export type LegPoseTransform={
 position:THREE.Vector3;quaternion:THREE.Quaternion;scale:THREE.Vector3;
 visible:boolean;
};
export type LegPoseOutputSlot={id:string;values:LegPoseValues};
export type OperatorLegPoseScratch={
 initialized:boolean;
 transforms:LegPoseTransform[];
 outputs:LegPoseOutputSlot[];
 shoeRotation:[THREE.Euler,THREE.Euler];
};
function createOperatorLegPoseScratch():OperatorLegPoseScratch{
 const transforms:LegPoseTransform[]=[],outputs:LegPoseOutputSlot[]=[];
 for(let i=0;i<2;i++)
  for(const name of ['upper','lower','shoe','ankle']){
   const visible=name!=='ankle';
   transforms.push({position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),
    scale:new THREE.Vector3(1,1,1),visible});
   outputs.push({id:'leg-'+i+'-'+name,
    values:[0,0,0,0,0,0,1,1,1,1,visible?1:0]});
  }
 return {initialized:false,transforms,outputs,
  shoeRotation:[new THREE.Euler(),new THREE.Euler()]};
}
/** B4 — upper-body direct output, parallel to B3's eight leg slots.
 * Stable component transforms preserve the previous quaternion in the
 * degenerate arm-alignment case. No parallel arm IK state or action clock.
 */
export type ArmPoseTransform=LegPoseTransform;
export type ArmPoseOutputSlot=LegPoseOutputSlot;
export type OperatorArmPoseScratch={
 initialized:boolean;
 transforms:ArmPoseTransform[];
 outputs:ArmPoseOutputSlot[];
 handEuler:[THREE.Euler,THREE.Euler];
 rockQuaternion:THREE.Quaternion;
};
function createOperatorArmPoseScratch():OperatorArmPoseScratch{
 const transforms:ArmPoseTransform[]=[],outputs:ArmPoseOutputSlot[]=[];
 for(let i=0;i<2;i++)
  for(const name of ['upper','lower','hand']){
   transforms.push({position:new THREE.Vector3(),
    quaternion:new THREE.Quaternion(),scale:new THREE.Vector3(1,1,1),
    visible:true});
   outputs.push({id:'arm-'+i+'-'+name,
    values:[0,0,0,0,0,0,1,1,1,1,1]});
  }
 return {initialized:false,transforms,outputs,
  handEuler:[new THREE.Euler(),new THREE.Euler()],
  rockQuaternion:new THREE.Quaternion()};
}
export type OperatorPoseScratch={
  legOutput:OperatorLegPoseScratch;
  armOutput:OperatorArmPoseScratch;
  bodyEuler:THREE.Euler;
  bodyInverse:THREE.Quaternion;
  legs:[LimbSolution,LimbSolution];
  arms:[LimbSolution,LimbSolution];
  armRetry:[LimbSolution,LimbSolution];
  armFallback:[LimbSolution,LimbSolution];
  hips:[THREE.Vector3,THREE.Vector3];
  targets:[THREE.Vector3,THREE.Vector3];
  relative:[THREE.Vector3,THREE.Vector3];
  legPoles:[THREE.Vector3,THREE.Vector3];
  sides:[THREE.Vector3,THREE.Vector3];
  rootPoint:THREE.Vector3;
  kickContact:THREE.Vector3;
  held:THREE.Vector3;origin:THREE.Vector3;
  orientation:THREE.Quaternion;inverse:THREE.Quaternion;
  flat:THREE.Quaternion;vertical:THREE.Vector3;
  slingDelta:THREE.Vector3;
};
export function createOperatorPoseScratch():OperatorPoseScratch{
  return {
    legOutput:createOperatorLegPoseScratch(),
    armOutput:createOperatorArmPoseScratch(),
    bodyEuler:new THREE.Euler(),bodyInverse:new THREE.Quaternion(),
    legs:[solution(),solution()],
    arms:[solution(),solution()],
    armRetry:[solution(),solution()],
    armFallback:[solution(),solution()],
    hips:[new THREE.Vector3(),new THREE.Vector3()],
    targets:[new THREE.Vector3(),new THREE.Vector3()],
    relative:[new THREE.Vector3(),new THREE.Vector3()],
    legPoles:[new THREE.Vector3(4.5,0,-1.1),
      new THREE.Vector3(4.5,0,1.1)],
    sides:[new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,1)],
    rootPoint:new THREE.Vector3(),
    kickContact:new THREE.Vector3(),
    held:new THREE.Vector3(),origin:new THREE.Vector3(),
    orientation:new THREE.Quaternion(),inverse:new THREE.Quaternion(),
    flat:new THREE.Quaternion(),vertical:new THREE.Vector3(0,1,0),
    slingDelta:new THREE.Vector3()
  };
}
