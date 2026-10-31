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
  gait?:'run'|'walk'|'pie'|'squeeze';
  /** Lab candidate: use actual weighted shoe positions for load transfer. */
  hybridSupport?:boolean;acceleration?:number;weaponWeight?:number;
  tacticalTension?:number;seconds?:number;};
export type BodyMotion={pelvisY:number;pelvisSide:number;
  torsoForward:number;torsoSide:number;torsoYaw:number;headCounter:number;
  support:number;chestLift:number;weaponYaw:number;weaponPitch:number;
  breath:number;};
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
  const tension=clamp(input.tacticalTension??0,0,1);
  const weaponAmp=(input.gait==='run'?1.65:
    input.gait==='squeeze'?.25:input.gait==='pie'?.38:1)*
    (1-.48*tension);
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
  let pelvisY=(-.76*receiving+.28*unloading+.42*swinging)*
    moving*crouch*wound*gaitAmp;
  // Experimental contact support follows the actual bearing shoe, not a
  // disconnected lateral oscillator. Retain legacy output by default.
  let pelvisSide=support*clamp(1.15*speed*gaitAmp,0,1.65)*crouch;
  if(input.hybridSupport&&input.position){
    const axis={x:-Math.sin(input.heading),y:Math.cos(input.heading)};
    const leftSide=(left.position.x-input.position.x)*axis.x+
      (left.position.y-input.position.y)*axis.y;
    const rightSide=(right.position.x-input.position.x)*axis.x+
      (right.position.y-input.position.y)*axis.y;
    const weight=a+b>1e-6?(leftSide*a+rightSide*b)/(a+b):0;
    pelvisSide=clamp(weight*.24,-1.65,1.65)*moving*crouch;
  }
  // Physical pelvis compression comes from the support-foot reach budget,
  // not from a separate stance-radius correction in the renderer.
  if(input.position){
    const lateral={x:-Math.sin(input.heading),y:Math.cos(input.heading)};
    const restHip=LEG_HIP_HEIGHT-(input.posture==='crouch'?8:0);
    let hipCeiling=restHip;
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
    pelvisY-=clamp(restHip-hipCeiling,0,2.4);
  }
  // Heel propulsion and accepting support transmit through the torso,
  // without an independent time-based bob oscillator.
  const accel=clamp((input.acceleration??0)/180,-1,1);
  const torsoForward=clamp(-forward*speed*.09-accel*.04+
    (.028*unloading-.014*receiving)*moving,-.13,.09)*crouch;
  const torsoSide=clamp(side*speed*.078+support*speed*.021,
    -.11,.11)*crouch*(1-.20*tension);
  // Follow the same contact/weight envelopes, rather than layering
  // unrelated sine-wave bob and sway over the animation.
  pelvisY-=Math.max(0,-accel)*.17*moving*crouch;
  const chestLift=(-.35*receiving+.18*swinging+.16*unloading)*
    moving*gaitAmp*crouch*wound;
  // Small contact/acceleration response is a *requested* weapon fit sway;
  // actual stock, hands and barrel remain one authoritative rigid transform.
  const weaponMass=clamp(input.weaponWeight??1,.7,1.4);
  const weaponYaw=clamp((support*speed*.018-
    accel*.012+Math.sign(side)*clamp(input.turning/6,0,1)*.008)*
    weaponAmp*weaponMass,-.047,.047);
  const idleBlend=clamp(1-input.velocity/12,0,1)*(1-tension);
  const breath=Math.sin((input.seconds??0)*1.9)*.11*idleBlend;
  const weaponPitch=clamp((-.012*receiving+.018*unloading+
    .010*swinging)*moving*weaponAmp-accel*.009*weaponMass,
    -.046,.046);
  return {pelvisY,pelvisSide,torsoForward,torsoSide,
    torsoYaw:clamp(-support*speed*.032,-.038,.038),
    headCounter:-torsoSide*.52,support,chestLift,
    weaponYaw,weaponPitch,breath};
}
