/** Runtime-ready short-stock templates, with zero dependency on the editor.
 * M4A1 and AKM are the two exact user-authored endpoints. Everything else
 * is derived deterministically from its weapon's actual ready grip sockets.
 * The generator never runs an IK candidate search, and is cached by the
 * weapon fitter so it does not allocate each animation frame.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WorkbenchPose} from './operator-pose-workbench.ts';
import type {WeaponGrip} from './breach-weapon-pose.ts';
import {M4A1_AUTHORED_SHORT} from './breach-authored-m4a1-short-stock.ts';

export const AKM_AUTHORED_SHORT:Readonly<WorkbenchPose>={
 version:1,weapon:'rifle',preset:'ak-akm',
 targets:{
  stock:[-6.3,-3.8,8.8],
  supportShoulder:[4.8,3.6,-6.5],
  firingShoulder:[1.120000000000001,3.94,6.899999999999999],
  supportHand:[13.778785492332526,-10.614421882537883,
    6.303289452161966],
  firingHand:[0.4996208344622355,-10.33299085695294,
    9.383907501678461],
  supportElbow:[11.3,-6,-3.690078005608802],
  firingElbow:[-6.8,-3.9832426172006907,12.294615103017726]
 },
 torso:[0,0.8021409131831525,-0.7091446901966934],
 weaponRotation:[13,-2,-16]
};
export function shortStockReference(weapon:WeaponId,
 config?:WeaponConfiguration):Readonly<WorkbenchPose>{
 const family=config?.build?.family;
 return family==='ak'||family==='hk'&&weapon==='rifle'||
   (!family&&(weapon==='rifle'||weapon==='shotgun'))?
   AKM_AUTHORED_SHORT:M4A1_AUTHORED_SHORT;
}
export const sameAuthoredReferenceBuild=(pose:Readonly<WorkbenchPose>,
 config?:WeaponConfiguration):boolean=>{
 const parts=config?.build?.parts;
 if(pose.preset==='ar-m4a1')
  return !!parts&&config?.weapon==='carbine'&&
   parts.receiver==='ar-flat'&&parts.stock==='ar-stock-m4'&&
   parts.handguard==='ar-quad'&&parts.barrel==='ar-145-gov';
 return !!parts&&config?.weapon==='rifle'&&
  parts.receiver==='akm'&&parts.stock==='ak-wood'&&
  parts.handguard==='ak-wood-long'&&parts.barrel==='ak-long';
};
const vec=(p:readonly number[])=>new THREE.Vector3(p[0],p[1],p[2]);
const xyz=(v:THREE.Vector3):[number,number,number]=>
 [v.x,v.y,v.z];
const clamp=(v:number,max:number)=>Math.max(-max,Math.min(max,v));
function contacts(p:Readonly<WorkbenchPose>,g:WeaponGrip){
 const angles=p.weaponRotation;
 const euler=new THREE.Euler(...angles.map(THREE.MathUtils.degToRad) as
  [number,number,number],'XYZ');
 const stock=vec(p.targets.stock);
 const origin=stock.clone().sub(new THREE.Vector3(
  g.stockX*g.lengthScale,0,0).applyEuler(euler));
 const point=(x:number,y:number,z:number)=>new THREE.Vector3(
  x*g.lengthScale,y,z).applyEuler(euler).add(origin);
 return {firing:point(g.primaryX,g.primaryY,1.8),
  support:point(g.supportX,g.supportY,-1.6)};
}
/** Match the authoring workbench's grip-aware transfer. The stock aligns
 * the pistol grip, then each wrist retains at most 3 units of authored
 * offset from its true weapon socket; elbow poles follow the wrist by 46%.
 * This transfers the *pose*, never the old elbow clearance rules.
 */
export function transferShortStockPose(source:Readonly<WorkbenchPose>,
 sourceGrip:WeaponGrip,targetGrip:WeaponGrip,
 weapon:WeaponId,preset:string):WorkbenchPose{
 const next:WorkbenchPose={
  version:1,weapon,preset,
  targets:Object.fromEntries(Object.entries(source.targets).map(
   ([key,value])=>[key,[...value]])) as WorkbenchPose['targets'],
  torso:[...source.torso],weaponRotation:[...source.weaponRotation]
 };
 const from=contacts(source,sourceGrip),to=contacts(next,targetGrip);
 const shift=from.firing.clone().sub(to.firing);
 shift.set(clamp(shift.x,7),clamp(shift.y,5),clamp(shift.z,5));
 next.targets.stock=xyz(vec(next.targets.stock).add(shift));
 const destination=contacts(next,targetGrip);
 for(const side of ['firing','support'] as const){
  const wristKey=side==='firing'?'firingHand':'supportHand';
  const elbowKey=side==='firing'?'firingElbow':'supportElbow';
  const original=vec(source.targets[wristKey]);
  const residual=original.clone().sub(from[side]);
  if(residual.length()>3)residual.setLength(3);
  const target=destination[side].clone().add(residual);
  next.targets[wristKey]=xyz(target);
  next.targets[elbowKey]=xyz(vec(source.targets[elbowKey]).addScaledVector(
   target.sub(original),.46));
 }
 return next;
}
