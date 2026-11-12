/** Visual-only manual operator pose authoring. This editor bypasses the
 * automatic short-stock elbow/armor candidate stack entirely: the author's
 * shoulder, wrist and bend-guide coordinates are the sole arm inputs.
 * Nothing here touches gameplay firing, locomotion, or replay authority.
 */
import * as THREE from 'three';
import {ARM_LIMITS,solveTwoBone} from './breach-ik.ts';
import {weaponGrips} from './breach-weapon-pose.ts';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {operatorPoseScratchForRig} from './breach-operator-animation-frame.ts';
import {beginOperatorFramePose,finishOperatorFramePose}
 from './breach-operator-frame-output.ts';
import {beginOperatorArmPose,setOperatorArmSegments,setOperatorHandPose,
 finishOperatorArmPose} from './breach-operator-upper-body-output.ts';
import {beginOperatorEquipmentPose,finishOperatorEquipmentPose}
 from './breach-operator-equipment-output.ts';
import {beginOperatorPoseOutput,stageOperatorPoseOutput,
 stageDirectOperatorPoseOutput,commitOperatorPoseOutput}
 from './breach-operator-pose-output.ts';

export const WORKBENCH_TARGETS=[
 'stock','supportShoulder','firingShoulder','supportHand','firingHand',
 'supportElbow','firingElbow'
] as const;
export type WorkbenchTarget=(typeof WORKBENCH_TARGETS)[number];
export type Vec3=[number,number,number];
export type WorkbenchPose={
 version:1;weapon:WeaponId;preset:string;
 /** Operator legacy chest-local axes: +X forward, +Y up, +Z right. */
 targets:Record<WorkbenchTarget,Vec3>;
 /** Three.js Euler XYZ in DEGREES (not radians). */
 torso:Vec3;weaponRotation:Vec3;
};
export type WorkbenchArmReport={
 wristGap:number;elbowGuideGap:number;gripGap:number;
 reached:boolean;shoulder:Vec3;elbow:Vec3;hand:Vec3;
};
export type WorkbenchReport={stock:Vec3;
 support:WorkbenchArmReport;firing:WorkbenchArmReport;
 maxReachError:number;maxContactGap:number};
const vec=(a:readonly number[])=>new THREE.Vector3(a[0],a[1],a[2]);
const coords=(v:THREE.Vector3):Vec3=>[v.x,v.y,v.z];
const rads=(n:number)=>THREE.MathUtils.degToRad(n);
// JSON stores -0 as 0. A captured, shareable recipe must canonicalize
// signed zero, including after B5's direct quaternion pose publication.
const degrees=(n:number)=>{
 const result=THREE.MathUtils.radToDeg(n);
 return result===0?0:result;
};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));

/** Read the REAL displayed mesh, never derive a new pose from defaults. */
export function captureWorkbenchPose(rig:OperatorRig,weapon:WeaponId,
 preset:string,configuration?:WeaponConfiguration):WorkbenchPose{
 const armPoints=(index:number)=>{
  const arm=rig.arms[index];
  const hand=arm.hand.position.clone();
  const elbow=arm.lower.position.clone().multiplyScalar(2).sub(hand);
  const shoulder=arm.upper.position.clone().multiplyScalar(2).sub(elbow);
  return {hand:coords(hand),elbow:coords(elbow),shoulder:coords(shoulder)};
 };
 const support=armPoints(0),firing=armPoints(1);
 const grip=weaponGrips(weapon,configuration,'ready');
 const stock=new THREE.Vector3(grip.stockX*grip.lengthScale,0,0)
  .applyEuler(rig.weapon.rotation).add(rig.weapon.position);
 return {version:1,weapon,preset,targets:{
  stock:coords(stock),
  supportShoulder:support.shoulder,firingShoulder:firing.shoulder,
  supportHand:support.hand,firingHand:firing.hand,
  supportElbow:support.elbow,firingElbow:firing.elbow
 },torso:[degrees(rig.chest.rotation.x),degrees(rig.chest.rotation.y),
     degrees(rig.chest.rotation.z)],
 weaponRotation:[degrees(rig.weapon.rotation.x),degrees(rig.weapon.rotation.y),
   degrees(rig.weapon.rotation.z)]};
}
export function cloneWorkbenchPose(pose:WorkbenchPose):WorkbenchPose{
 return {version:1,weapon:pose.weapon,preset:pose.preset,
  targets:Object.fromEntries(WORKBENCH_TARGETS.map(key=>
   [key,[...pose.targets[key]]])) as WorkbenchPose['targets'],
  torso:[...pose.torso],weaponRotation:[...pose.weaponRotation]};
}
export function weaponWorkbenchContacts(pose:WorkbenchPose,
 configuration?:WeaponConfiguration){
 const grip=weaponGrips(pose.weapon,configuration,'ready');
 const rotation=new THREE.Euler(rads(pose.weaponRotation[0]),
  rads(pose.weaponRotation[1]),rads(pose.weaponRotation[2]),'XYZ');
 const stock=vec(pose.targets.stock);
 const origin=stock.clone().sub(new THREE.Vector3(
  grip.stockX*grip.lengthScale,0,0).applyEuler(rotation));
 const point=(x:number,y:number,z:number)=>
  new THREE.Vector3(x*grip.lengthScale,y,z).applyEuler(rotation).add(origin);
 return {origin,rotation,stock,
  support:point(grip.supportX,grip.supportY,-1.6),
  firing:point(grip.primaryX,grip.primaryY,1.8),
  lengthScale:grip.lengthScale};
}
/** Convenience only: users can always decouple hands from the gun and pose
 * them individually. The next sync explicitly reattaches the targets. */
export function snapWorkbenchHandsToGun(pose:WorkbenchPose,
 configuration?:WeaponConfiguration):void{
 const c=weaponWorkbenchContacts(pose,configuration);
 pose.targets.supportHand=coords(c.support);
 pose.targets.firingHand=coords(c.firing);
}
/** Offline authoring has no tactical/action clock. This immutable fallback
 * is used only when an editor is handed an unposed rig; normal Workbench
 * initialization poses one neutral ready frame first. The B2 publisher
 * consumes its timestamp, never the motor or the footstep scheduler.
 */
const WORKBENCH_OUTPUT_INPUT:OperatorPose={
 x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,deterministic:true
};
/** At most two forward-kinematic 10+10 arm solves per frame, with no armor
 * re-ranking or multi-candidate IK. Requested elbows are bend POLES:
 * the small solved-elbow marker shows the achievable joint if the target
 * is geometrically impossible. No joint stretch or hidden wrist teleport.
 */
export function applyWorkbenchPose(rig:OperatorRig,pose:WorkbenchPose,
 configuration?:WeaponConfiguration):WorkbenchReport{
 const gun=weaponWorkbenchContacts(pose,configuration);
 // B7: use the SAME rig-local B3-B6 scratch and B2 six-stage publisher as
 // gameplay, replay, Studio and Operator Lab. Manual targets remain the
 // only authoring inputs: no tactical action solver or new clock is run.
 const scratch=operatorPoseScratchForRig(rig);
 const frame=beginOperatorFramePose(rig,scratch);
 beginOperatorArmPose(rig,scratch);
 const equipment=beginOperatorEquipmentPose(rig,scratch);
 const held=equipment.weapons[0];
 frame.chest.rotation.set(rads(pose.torso[0]),
  rads(pose.torso[1]),rads(pose.torso[2]),'XYZ');
 held.position.copy(gun.origin);
 held.quaternion.setFromEuler(gun.rotation);
 held.scale.set(gun.lengthScale,1,1);
 const solve=(index:0|1):WorkbenchArmReport=>{
  const suffix=index===0?'support':'firing';
  const arm=rig.arms[index];
  const shoulder=vec(pose.targets[
    (suffix+'Shoulder') as WorkbenchTarget]);
  const wrist=vec(pose.targets[(suffix+'Hand') as WorkbenchTarget]);
  const pole=vec(pose.targets[(suffix+'Elbow') as WorkbenchTarget])
    .sub(shoulder);
  const solution=solveTwoBone(shoulder,wrist,10,10,pole,ARM_LIMITS);
  const side=new THREE.Vector3(0,0,index===0?-1:1);
  setOperatorArmSegments(scratch,index,shoulder,solution.joint,
   solution.effector,side);
  setOperatorHandPose(scratch,index,solution.effector,gun.rotation.y);
  arm.bend.copy(solution.bendPlane);
  arm.outOfReach=!solution.reached;
  rig.elbowSpread[index]=Math.max(0,(index===0?-1:1)*
    (solution.joint.z-shoulder.z));
  return {
   wristGap:solution.effector.distanceTo(wrist),
   elbowGuideGap:solution.joint.distanceTo(
    vec(pose.targets[(suffix+'Elbow') as WorkbenchTarget])),
   gripGap:solution.effector.distanceTo(index===0?gun.support:gun.firing),
   reached:solution.reached,
   shoulder:coords(shoulder),elbow:coords(solution.joint),
   hand:coords(solution.effector)
  };
 };
 const support=solve(0),firing=solve(1);
 const outputInput=rig.lastPose??WORKBENCH_OUTPUT_INPUT;
 beginOperatorPoseOutput(rig,outputInput);
 // Unedited real foot targets are only *read* from the rig; Workbench
 // never schedules steps, moves a foot, or recomputes the tactical gait.
 stageOperatorPoseOutput(rig,outputInput,'lower-body');
 stageDirectOperatorPoseOutput(rig,outputInput,'upper-body',
  finishOperatorArmPose(scratch));
 const body=finishOperatorFramePose(frame);
 stageDirectOperatorPoseOutput(rig,outputInput,'frame',body.frameOutputs);
 stageDirectOperatorPoseOutput(rig,outputInput,'body',body.bodyOutputs);
 const weapons=finishOperatorEquipmentPose(scratch);
 stageDirectOperatorPoseOutput(rig,outputInput,'weapon',weapons.weaponOutputs);
 stageDirectOperatorPoseOutput(rig,outputInput,'attachments',
  weapons.attachmentOutputs);
 // The single B2 commit is the FIRST display write to authored bones,
 // chest and firearm. No partial frame or background preview publisher.
 commitOperatorPoseOutput(rig,outputInput);
 return {stock:coords(gun.stock),support,firing,
  maxReachError:Math.max(support.wristGap,firing.wristGap),
  maxContactGap:Math.max(support.gripGap,firing.gripGap)};
}
function lerpAngle(a:number,b:number,t:number){
 const delta=((b-a+540)%360)-180;
 return a+delta*t;
}
export function interpolateWorkbenchPose(a:WorkbenchPose,b:WorkbenchPose,
 phase:number):WorkbenchPose{
 const t=clamp(phase,0,1);
 if(t===0)return cloneWorkbenchPose(a);
 if(t===1)return cloneWorkbenchPose(b);
 const eased=t*t*(3-2*t);
 const mix=(left:Vec3,right:Vec3,angle=false):Vec3=>
   [0,1,2].map(i=>angle?lerpAngle(left[i],right[i],eased):
     left[i]+(right[i]-left[i])*eased) as Vec3;
 return {version:1,weapon:b.weapon,preset:b.preset,
  targets:Object.fromEntries(WORKBENCH_TARGETS.map(key=>
   [key,mix(a.targets[key],b.targets[key])])) as WorkbenchPose['targets'],
  torso:mix(a.torso,b.torso,true),
  weaponRotation:mix(a.weaponRotation,b.weaponRotation,true)};
}
/** Strict import boundary for a shareable, reproducible pose recipe. */
export function readWorkbenchPose(source:string):WorkbenchPose{
 if(source.length>16000)throw Error('Pose JSON is too large');
 const raw:unknown=JSON.parse(source);
 if(!raw||typeof raw!=='object')throw Error('Expected a pose object');
 const data=raw as Record<string,unknown>;
 if(data.version!==1)throw Error('Unsupported pose format');
 if(!['carbine','rifle','smg','shotgun'].includes(String(data.weapon)))
  throw Error('Unknown weapon family');
 const array=(v:unknown,name:string,limit:number):Vec3=>{
  if(!Array.isArray(v)||v.length!==3||
     !v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=limit))
   throw Error('Invalid '+name+' XYZ values');
  return [v[0],v[1],v[2]];
 };
 if(!data.targets||typeof data.targets!=='object')
  throw Error('Missing pose targets');
 const target=data.targets as Record<string,unknown>;
 return {version:1,weapon:data.weapon as WeaponId,
  preset:typeof data.preset==='string'?data.preset.slice(0,80):'',
  targets:Object.fromEntries(WORKBENCH_TARGETS.map(key=>
   [key,array(target[key],key,80)])) as WorkbenchPose['targets'],
  torso:array(data.torso,'torso',180),
  weaponRotation:array(data.weaponRotation,'weapon rotation',180)};
}
