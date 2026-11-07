/** Observational V3 pose diagnostics. No pose mutation or solver decisions.
 * Reconstruct endpoints from rendered arm segment midpoints, not solver flags.
 * All values are chest-local in the canonical +X-forward legacy rig.
 */
import * as THREE from 'three';
import {evaluateTwoArmClearance,type PoseClearanceEnvelope}
 from './breach-pose-clearance-envelope.ts';
type Arm={upper:THREE.Object3D;lower:THREE.Object3D;hand:THREE.Object3D};
export type PoseProbeRig={arms:Arm[];weapon:THREE.Object3D;
 gripError:number;stockError:number;eyeError:number};
export type PoseProbeArm={shoulder:[number,number,number];
 elbow:[number,number,number];wrist:[number,number,number];
 upperLength:number;lowerLength:number;
 elbowDrop:number;outwardFlare:number;flexionDegrees:number};
export type PoseProbe={label:string;arms:[PoseProbeArm,PoseProbeArm];
 weaponOrigin:[number,number,number];gripError:number;
 stockError:number;eyeError:number;
 hardContact:number;softContact:number;
 equipmentValid:boolean;finite:boolean;warnings:string[]};
const tuple=(v:THREE.Vector3):[number,number,number]=>[v.x,v.y,v.z];
const round=(n:number)=>Math.round(n*1000)/1000;
export function probeRenderedPose(rig:PoseProbeRig,label:string,
 envelope?:PoseClearanceEnvelope):PoseProbe{
 const arms=rig.arms.map((a,i)=>{
  const wrist=a.hand.position.clone();
  const elbow=a.lower.position.clone().multiplyScalar(2).sub(wrist);
  const shoulder=a.upper.position.clone().multiplyScalar(2).sub(elbow);
  const u=elbow.clone().sub(shoulder),l=wrist.clone().sub(elbow);
  const cos=u.lengthSq()>1e-8&&l.lengthSq()>1e-8?
   THREE.MathUtils.clamp(u.clone().normalize().dot(l.clone().normalize()),-1,1):1;
  return {shoulder,elbow,wrist,stats:{
   shoulder:tuple(shoulder),elbow:tuple(elbow),wrist:tuple(wrist),
   upperLength:round(u.length()),lowerLength:round(l.length()),
   elbowDrop:round(shoulder.y-elbow.y),
   outwardFlare:round((i===0?-1:1)*(elbow.z-shoulder.z)),
   flexionDegrees:round(Math.acos(cos)*180/Math.PI)
  } as PoseProbeArm};
 });
 if(arms.length!==2)throw Error('Pose probe expects two rendered arms');
 const [left,right]=arms;
 const clearance=envelope?evaluateTwoArmClearance(
  [left.shoulder,right.shoulder],[left.elbow,right.elbow],
  [left.wrist,right.wrist],envelope):null;
 const resultArms:[PoseProbeArm,PoseProbeArm]=[left.stats,right.stats];
 const values=[...rig.weapon.position.toArray(),rig.gripError,rig.stockError,
  rig.eyeError,...resultArms.flatMap(a=>[...a.shoulder,...a.elbow,...a.wrist,
   a.upperLength,a.lowerLength,a.elbowDrop,a.outwardFlare,a.flexionDegrees])];
 const finite=values.every(Number.isFinite);
 const warnings:string[]=[];
 if(!finite)warnings.push('non-finite');
 for(const [i,a] of resultArms.entries()){
  if(Math.abs(a.upperLength-10)>.15||Math.abs(a.lowerLength-10)>.15)
   warnings.push('arm-'+i+'-length');
  if(a.elbowDrop<.35)warnings.push('arm-'+i+'-raised');
  if(a.outwardFlare>5.5)warnings.push('arm-'+i+'-winged');
 }
 if(clearance&&!clearance.valid)warnings.push('equipment-contact');
 return {label,arms:resultArms,weaponOrigin:tuple(rig.weapon.position),
  gripError:round(rig.gripError),stockError:round(rig.stockError),
  eyeError:round(rig.eyeError),hardContact:round(clearance?.hardDepth??0),
  softContact:round(clearance?.softDepth??0),
  equipmentValid:clearance?.valid??true,finite,warnings};
}
