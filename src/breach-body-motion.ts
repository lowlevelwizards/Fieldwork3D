/** Build 126: contact-derived balance, not time-based whole-body bob.
 * Pure deterministic presentation; phase/velocity/facing are authoritative.
 */
import type {FootTarget} from './breach-footsteps.ts';
import {legMaximumLength,LEG_HIP_SIDE,LEG_ANKLE_HEIGHT,
  LEG_HIP_HEIGHT} from './breach-leg-geometry.ts';
export type BalanceInput={velocity:number;heading:number;travelYaw:number;
  turning:number;injury:number;posture:'stand'|'crouch';
  feet:readonly [FootTarget,FootTarget];
  position?:{x:number;y:number};
  gait?:'run'|'walk'|'pie'|'squeeze';};
export type BodyMotion={pelvisY:number;pelvisSide:number;
  torsoForward:number;torsoSide:number;torsoYaw:number;headCounter:number;
  support:number;chestLift:number;weaponYaw:number;weaponPitch:number;};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const smooth=(t:number)=>{const a=clamp(t,0,1);return a*a*(3-2*a);};
const phaseWeight=(foot:FootTarget)=>{
  const p=foot.progress??0;
  switch(foot.phase){
    case 'unloading':return 1-smooth(p);
    case 'swinging':return 0;
    case 'landing':return smooth(p);
    case 'recovering':return 1;
    default:return 1;
  }
};
export function bodyFromContacts(input:BalanceInput):BodyMotion{
  const [left,right]=input.feet;
  const a=phaseWeight(left),b=phaseWeight(right);
  const support=a+b>1e-6?(b-a)/(a+b):0;
  const moving=clamp(input.velocity/62,0,1);
  const direction=input.travelYaw-input.heading;
  const forward=Math.cos(direction),side=Math.sin(direction);
  const speed=clamp(input.velocity/72,0,1);
  const crouch=input.posture==='crouch'?.55:1;
  const wound=input.injury>=2?.68:1;
  const gaitAmp=input.gait==='run'?1.45:
    input.gait==='squeeze'?.45:input.gait==='pie'?.53:1;
  const weaponAmp=input.gait==='run'?1.65:
    input.gait==='squeeze'?.25:input.gait==='pie'?.38:1;
  const envelope=(foot:FootTarget,phase:FootTarget['phase'])=>
    foot.phase===phase?Math.sin(Math.PI*clamp(foot.progress??0,0,1)):0;
  const swinging=Math.max(envelope(left,'swinging'),
    envelope(right,'swinging'));
  const receiving=Math.max(envelope(left,'landing'),
    envelope(right,'landing'));
  const unloading=Math.max(envelope(left,'unloading'),
    envelope(right,'unloading'));
  // All envelopes reach zero at their phase boundaries. Lateral shuffles
  // change support legs often, so binary phase offsets visibly pop the hip.
  let pelvisY=(-.65*receiving+.20*unloading+.42*swinging)*
    moving*crouch*wound*gaitAmp;
  const pelvisSide=support*clamp(1.15*speed*gaitAmp,0,1.65)*crouch;
  // Physical pelvis compression comes from the support-foot reach budget,
  // not from a separate stance-radius correction in the renderer.
  if(input.position){
    const lateral={x:-Math.sin(input.heading),y:Math.cos(input.heading)};
    let hipCeiling=LEG_HIP_HEIGHT;
    for(let i=0;i<2;i++){
      const foot=input.feet[i];
      if(!foot.contact)continue;
      const side=i===0?-1:1;
      const hipX=input.position.x+
        lateral.x*(side*LEG_HIP_SIDE+pelvisSide);
      const hipZ=input.position.y+
        lateral.y*(side*LEG_HIP_SIDE+pelvisSide);
      const hx=foot.position.x-hipX,hz=foot.position.y-hipZ;
      const maxVertical=Math.sqrt(Math.max(0,
        legMaximumLength()**2-hx*hx-hz*hz));
      hipCeiling=Math.min(hipCeiling,LEG_ANKLE_HEIGHT+maxVertical);
    }
    pelvisY-=clamp(LEG_HIP_HEIGHT-hipCeiling,0,2.4);
  }
  const torsoForward=clamp(-forward*speed*.09,-.11,.08)*crouch;
  const torsoSide=clamp(side*speed*.065+support*speed*.014,
    -.095,.095)*crouch;
  // Follow the same contact/weight envelopes, rather than layering
  // unrelated sine-wave bob and sway over the animation.
  const chestLift=(-.30*receiving+.18*swinging+.10*unloading)*
    moving*gaitAmp*crouch*wound;
  const weaponYaw=clamp(support*speed*.018*weaponAmp,-.038,.038);
  const weaponPitch=(-.012*receiving+.018*unloading+.010*swinging)*
    moving*weaponAmp;
  return {pelvisY,pelvisSide,torsoForward,torsoSide,
    torsoYaw:clamp(-support*speed*.024,-.03,.03),
    headCounter:-torsoSide*.38,support,chestLift,
    weaponYaw,weaponPitch};
}
