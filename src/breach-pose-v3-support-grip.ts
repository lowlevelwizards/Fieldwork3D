/** V3 preview: find a real support grip along the authored fore-end / magwell.
 * NEVER move, rotate or rescale the firearm; only slide the support palm to
 * an available contact region. Rejected candidates preserve the original fit.
 */
import * as THREE from 'three';
import type {WeaponFit} from './breach-weapon-pose.ts';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {riflePoseContacts,supportContactAt}
 from './breach-weapon-contact-zones.ts';
import type {PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import type {PoseConstraintMode} from './breach-pose-v3-constraints.ts';
import {solveV3DynamicArm} from './breach-pose-v3-dynamic-arm.ts';
export const V3_SUPPORT_GRIP_FRACTIONS=[1,.80,.60,.40,.20,0] as const;
export type SupportGripRequest={
 weapon:WeaponId;configuration:WeaponConfiguration;
 fit:WeaponFit;shoulder:THREE.Vector3;
 firingShoulder:THREE.Vector3;
 envelope:PoseClearanceEnvelope;
 mode:PoseConstraintMode;
};
export type SupportGripChoice={
 fit:WeaponFit;selected:boolean;fraction:number|null;
 quality:number|null;candidates:number;
 reason:'valid'|'no-contact-region'|'unresolved';
};
export function chooseV3SupportGrip(req:SupportGripRequest):SupportGripChoice{
 const contact=riflePoseContacts(req.weapon,req.configuration);
 if(!contact)return {fit:req.fit,selected:false,fraction:null,
  quality:null,candidates:0,reason:'no-contact-region'};
 let best:THREE.Vector3|null=null,bestQuality=Infinity,bestFraction=0;
 let checked=0;
 for(const fraction of V3_SUPPORT_GRIP_FRACTIONS){
  checked++;
  const local=supportContactAt(contact.support,fraction);
  const wrist=new THREE.Vector3(local.x*contact.scale,local.y,local.z)
   .applyEuler(req.fit.rotation).add(req.fit.origin);
  if(wrist.distanceTo(req.shoulder)>19.92)continue;
  const candidate=solveV3DynamicArm({
   shoulder:req.shoulder,wrist,side:-1,mode:req.mode,
   envelope:req.envelope,preferredPole:new THREE.Vector3(3,-9,-1.5)
  });
  if(!candidate.solution)continue;
  // Prefer a sustainable grip forward on the furniture. Never let a
  // cosmetic preference override actual 10+10 reach or rigid armor limits.
  const quality=candidate.report.quality+
   wrist.distanceTo(req.fit.support)*.08+
   Math.abs(fraction-contact.support.preferredFraction)*1.45;
  if(quality<bestQuality){
   best=wrist;bestQuality=quality;bestFraction=fraction;
  }
 }
 if(!best)return {fit:req.fit,selected:false,fraction:null,
  quality:null,candidates:checked,reason:'unresolved'};
 const primaryGap=Math.max(0,req.fit.primary.distanceTo(
  req.firingShoulder)-19.92);
 const supportGap=Math.max(0,best.distanceTo(req.shoulder)-19.92);
 return {fit:{...req.fit,support:best,
  contactError:primaryGap+supportGap,
  twoHanded:primaryGap===0&&supportGap===0},
  selected:true,fraction:bestFraction,quality:bestQuality,
  candidates:checked,reason:'valid'};
}
