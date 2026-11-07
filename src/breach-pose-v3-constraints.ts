/** Shared V3 arm validation and compact silhouette preference.
 * Hard physical viability is separate from aesthetic ranking.
 * No global elbow drop/flare threshold may reject a legitimate action pose:
 * ADS, magazine manipulation and low-ready have different valid envelopes.
 */
import type * as THREE from 'three';
import {evaluateSleeveArmorContact,type PoseClearanceEnvelope,
 type SleeveContactResult}
 from './breach-pose-clearance-envelope.ts';
import {ARM_LIMITS,type LimbSolution} from './breach-ik.ts';
import {reloadVisualContact} from './breach-reload-visual-contact.ts';

export type PoseConstraintMode='carry'|'aim'|'reload'|'interaction';
export type PoseConstraintReason='non-finite'|'unreachable'|'bone-length'|
 'joint-range'|'equipment-contact';
export type ArmConstraintInput={
 shoulder:THREE.Vector3;
 arm:LimbSolution;side:-1|1;
 envelope:PoseClearanceEnvelope;
 mode:PoseConstraintMode;
 /** Scale only structured/soft contact, never rigid material. */
 softScale?:number;
 /** Previous bend, supplied ONLY from an explicit/recorded action snapshot. */
 referenceBend?:THREE.Vector3;
 /** Original reload allowance, still isolated to reload mode. */
 allowReloadOverlap?:boolean;
 /** Additional bounded gear compression, only for rendered poses. */
 allowVisualOverlap?:boolean;
};
export type ArmConstraintReport={
 valid:boolean;reasons:PoseConstraintReason[];
 hardDepth:number;softDepth:number;
 elbowDrop:number;outwardFlare:number;
 quality:number;contactValid:boolean;
 strictContactValid:boolean;relaxedContact:boolean;
 contacts:SleeveContactResult['contacts'];
};
const preferredDrop:Record<PoseConstraintMode,number>={
 carry:5.4,aim:3.0,reload:4.2,interaction:4.0
};
const preferredFlare:Record<PoseConstraintMode,number>={
 carry:1.7,aim:2.5,reload:2.0,interaction:2.0
};
export function evaluateArmConstraint(p:ArmConstraintInput):ArmConstraintReport{
 const {shoulder,arm,side,envelope,mode}=p;
 const {joint,effector}=arm;
 const drop=shoulder.y-joint.y,flare=side*(joint.z-shoulder.z);
 const upper=shoulder.distanceTo(joint),lower=joint.distanceTo(effector);
 const reasons:PoseConstraintReason[]=[];
 const values=[...shoulder.toArray(),...joint.toArray(),...effector.toArray(),
  arm.angle,upper,lower,drop,flare];
 if(!values.every(Number.isFinite))reasons.push('non-finite');
 if(!arm.reached)reasons.push('unreachable');
 if(Math.abs(upper-10)>.15||Math.abs(lower-10)>.15)
  reasons.push('bone-length');
 if(arm.angle<ARM_LIMITS.minBend-.001||
    arm.angle>ARM_LIMITS.maxBend+.001)
  reasons.push('joint-range');
 // A real rectangular sleeve tests against fitted hard/soft equipment.
 // This is shared by idle/ADS/reload/interaction; no hidden shrinking.
 const contact=evaluateSleeveArmorContact(
  shoulder,joint,effector,envelope,p.softScale??1);
 const visual=p.allowVisualOverlap===true&&
  (mode==='carry'||mode==='aim'||mode==='reload');
 const reloadContact=reloadVisualContact(contact,
  visual||mode==='reload'&&p.allowReloadOverlap===true,
  mode==='reload'?'reload':mode==='aim'?'aim':'carry',
  side===1?'firing':'support');
 if(!reloadContact.valid)reasons.push('equipment-contact');
 const bendContinuity=p.referenceBend?
  Math.max(0,1-arm.bendPlane.dot(p.referenceBend))*.16:0;
 const firing=side===1&&(mode==='carry'||mode==='aim');
 const idealDrop=firing?preferredDrop[mode]+(mode==='carry'?.85:.45):
  preferredDrop[mode];
 const idealFlare=firing?Math.max(.55,preferredFlare[mode]-.90):
  preferredFlare[mode];
 const quality=
  Math.abs(drop-idealDrop)*.24+
  Math.max(0,flare-idealFlare)*(firing?.73:.56)+
  Math.max(0,-flare-1.2)*.22+
  Math.max(0,-drop)*.48+
  Math.max(0,arm.angle-2.0)*.25+
  contact.quality*.09+bendContinuity;
 return {valid:reasons.length===0,reasons,
  hardDepth:contact.hardDepth,softDepth:contact.softDepth,
  elbowDrop:drop,outwardFlare:flare,quality,
  contactValid:reloadContact.valid,
  strictContactValid:contact.valid,
  relaxedContact:reloadContact.valid&&!contact.valid,
  contacts:contact.contacts};
}
/** Physical validity always outranks beauty. A failed pose cannot win just
 * because it happens to look less winged; candidates must first be valid.
 */
export function pickViableArm<T extends {report:ArmConstraintReport}>(
 candidates:readonly T[]):T|null{
 let best:T|null=null;
 for(const c of candidates){
  if(!c.report.valid)continue;
  if(!best||c.report.quality<best.report.quality)best=c;
 }
 return best;
}
