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
export type OperatorPoseScratch={
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
