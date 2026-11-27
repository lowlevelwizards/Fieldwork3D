/** WR7: read the existing action/contact window, not an independent clock.
 * One-hand retention never claims the support hand from its action. */
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {resolveOperatorActionState} from './breach-pose-action-state.ts';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
const window=(age:number,duration:number)=>ease(age/.14)*ease((duration-age)/.18);
export function oneHandRetentionWeight(p:OperatorPose,
 a:ReturnType<typeof resolveOperatorActionState>):number{
 if(p.down||p.surrender||p.unarmedPreview||p.firing||p.reload>0||
    p.treatmentActive||p.lockpickActive||(p.secondarySwitch?.fraction??0)>0||
    a.handOwners.right!=='weapon'||a.handOwners.left==='weapon')return 0;
 if(a.equipmentActive&&p.equipmentInteraction){
  if(p.equipmentInteraction.item==='zip-tie')return 0;
  return ease(p.equipmentInteraction.elapsed/.14)*ease((1-p.equipmentInteraction.progress)/.12);
 }
 if(a.throwActive)return window(a.throwAge,.70);
 if(a.doorActive)return Math.max(clamp(a.gripWeight),window(a.doorAge,1.12));
 if(a.physicalContact)return clamp(a.gripWeight);
 return 0;
}

/** SR14: a settled stow releases both hands, but an actual action owns
 * only the limbs it needs. Keep the existing two-hand treatment, lockpick
 * and restraint gestures; do not invent a second support contact. */
export function retainedActionHands(p:OperatorPose,
 a:ReturnType<typeof resolveOperatorActionState>):readonly [boolean,boolean]{
 if(p.down||p.surrender)return [true,true];
 if(a.treatmentActive||p.lockpickActive&&a.doorActive||
  a.equipmentActive&&p.equipmentInteraction?.item==='zip-tie')return [true,true];
 return [a.handOwners.left!=='weapon',a.handOwners.right!=='weapon'];
}
