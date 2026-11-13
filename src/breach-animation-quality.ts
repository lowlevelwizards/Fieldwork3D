/** A0 observational animation QA. No gameplay writes, clocks, smoothing or
 * runtime import from the tactical renderer. Read only a committed pose. */
import type {OperatorRig} from './breach-operator-rig.ts';
import {inspectOperatorPoseOutput} from './breach-operator-pose-output.ts';
export type AnimationQualityFrame={
  time:number;slotCount:number;invalidSlots:number;
  gripError:number;stockError:number;eyeError:number;
  ankleGap:number;unreachableArms:number;unreachableLegs:number;
  /** Local-space registered output, not a gameplay/ballistic transform. */
  slots:Readonly<Record<string,readonly number[]>>;
};
export function captureAnimationQuality(r:OperatorRig,time:number):
 AnimationQualityFrame{
 const output=inspectOperatorPoseOutput(r);
 if(!output?.valid)throw Error('A0: pose has not been committed');
 const slots:Record<string,number[]>={};
 let invalidSlots=0;
 for(const slot of output.slots){
   const values=Array.from(slot.values);
   if(values.some(value=>!Number.isFinite(value)))invalidSlots++;
   slots[slot.id]=values;
 }
 return {time,slotCount:output.slotCount,invalidSlots,slots,
  gripError:r.gripError,stockError:r.stockError,eyeError:r.eyeError,
  ankleGap:Math.max(...r.legGap),
  unreachableArms:r.arms.filter(a=>a.outOfReach).length,
  unreachableLegs:r.feet.filter(f=>f.outOfReach).length};
}
export type AnimationContinuity={
 repeatedTime:boolean;
 /** Includes changes to invisible attachment transforms for diagnostics. */
 maxTranslation:number;maxRotationRadians:number;changedSlots:number;
 /** Only displayed geometry affects perceived animation or freeze parity. */
 maxVisibleTranslation:number;maxVisibleRotationRadians:number;
 changedVisibleSlots:number;changedHiddenSlots:number;
 frozenDrift:boolean;
};
export function compareAnimationFrames(a:AnimationQualityFrame,
 b:AnimationQualityFrame):AnimationContinuity{
 if(a.slotCount!==b.slotCount)throw Error('A0: incompatible slot counts');
 let maxTranslation=0,maxRotationRadians=0,changedSlots=0;
 let maxVisibleTranslation=0,maxVisibleRotationRadians=0;
 let changedVisibleSlots=0,changedHiddenSlots=0;
 for(const [id,v] of Object.entries(a.slots)){
  const w=b.slots[id];
  if(!w||w.length!==11)throw Error('A0: missing output slot '+id);
  const translation=Math.hypot(v[0]-w[0],v[1]-w[1],v[2]-w[2]);
  // Unit quaternions can be sign-equivalent: abs(dot) avoids false jumps.
  const dot=Math.abs(v[3]*w[3]+v[4]*w[4]+v[5]*w[5]+v[6]*w[6]);
  const rotation=2*Math.acos(Math.min(1,Math.max(-1,dot)));
  const changed=translation>1e-6||rotation>1e-5||
   v.slice(7).some((value,i)=>Math.abs(value-w[i+7])>1e-6);
  maxTranslation=Math.max(maxTranslation,translation);
  maxRotationRadians=Math.max(maxRotationRadians,rotation);
  if(changed)changedSlots++;
  // Retained transforms for mutually invisible scene attachments are not
  // observable motion (e.g. a hidden detached magazine after rewind).
  // Keep them in the full diagnostics above, but don't reject a visual
  // freeze unless the object was visible on either sampled frame.
  if(v[10]===1||w[10]===1){
   maxVisibleTranslation=Math.max(maxVisibleTranslation,translation);
   maxVisibleRotationRadians=Math.max(maxVisibleRotationRadians,rotation);
   if(changed)changedVisibleSlots++;
  }else if(changed)changedHiddenSlots++;
 }
 const repeatedTime=Math.abs(a.time-b.time)<1e-8;
 return {repeatedTime,maxTranslation,maxRotationRadians,changedSlots,
  maxVisibleTranslation,maxVisibleRotationRadians,changedVisibleSlots,
  changedHiddenSlots,
  frozenDrift:repeatedTime&&(maxVisibleTranslation>1e-4||
   maxVisibleRotationRadians>1e-4||changedVisibleSlots>0)};
}
export const ANIMATION_QA_SCENARIOS=[
 'idle','walk','run','strafe','reverse','pivot','crouch','ads',
 'short-stock','reload','throw','door-reach','kick','injured',
 'down','surrender'
] as const;
export type AnimationScenario=typeof ANIMATION_QA_SCENARIOS[number];
