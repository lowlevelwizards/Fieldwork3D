/** Build 126: contact-derived balance, not time-based whole-body bob.
 * Pure deterministic presentation; phase/velocity/facing are authoritative.
 */
import type {FootTarget} from './breach-footsteps.ts';
import {contactBalance} from './breach-contact-balance.ts';
import {directionalBodyCue} from './breach-directional-gait.ts';
import {motionFromTransitions,type MomentumEnvelope} from './breach-motion-transitions.ts';
import {legMaximumLength,LEG_HIP_SIDE,LEG_ANKLE_HEIGHT,
  LEG_HIP_HEIGHT,legRestRise} from './breach-leg-geometry.ts';
export type BalanceInput={velocity:number;heading:number;travelYaw:number;
  turning:number;injury:number;posture:'stand'|'crouch';
  feet:readonly [FootTarget,FootTarget];
  position?:{x:number;y:number};
  gait?:'run'|'walk'|'pie'|'squeeze';
  /** Lab candidate: use actual weighted shoe positions for load transfer. */
  hybridSupport?:boolean;acceleration?:number;weaponWeight?:number;
  motionImpulse?:MomentumEnvelope;blocked?:boolean;
  tacticalTension?:number;seconds?:number;
  personalPhase?:number;personalLooseness?:number;
  down?:boolean;surrender?:boolean;};
export type BodyMotion={pelvisY:number;pelvisSide:number;
  torsoForward:number;torsoSide:number;torsoYaw:number;headCounter:number;
  support:number;chestLift:number;weaponYaw:number;weaponPitch:number;
  breath:number;headPitchCounter:number;};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
// All stance load and contact support are calculated by the pure A2.1
// kernel. This file remains the single writer of body presentation.
export function bodyFromContacts(input:BalanceInput):BodyMotion{
  const load=contactBalance(input.feet,input.position,input.heading);
  const {support}=load;
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
  const {swinging,receiving,unloading}=load;
  const directional=directionalBodyCue(speed,forward,side,crouch,
    tension,input.gait);
  const transient=motionFromTransitions({
    velocity:input.velocity,acceleration:input.acceleration,
    travelYaw:input.travelYaw,heading:input.heading,feet:input.feet,
    impulse:input.motionImpulse,gait:input.gait,posture:input.posture,
    injury:input.injury,blocked:input.blocked,down:input.down,
    surrender:input.surrender,tacticalTension:tension
  });
  // All envelopes reach zero at their phase boundaries. Lateral shuffles
  // change support legs often, so binary phase offsets visibly pop the hip.
  // A2.1: continuous load transfer. The pelvis follows the world-space
  // *bearing shoe*, not a free-running sway oscillator. The slight
  // phase-specific compression is bounded and vanishes exactly at
  // phase boundaries so gait transitions do not pop.
  let pelvisY=(-.87*receiving+.33*unloading+.43*swinging)*
    moving*crouch*wound*gaitAmp;
  const bearing=input.position?load.bearingSide*.225+
    support*.10:support*1.15;
  const lateralGain=input.hybridSupport?1.055:1;
  const pelvisSide=clamp(bearing*lateralGain,-1.65,1.65)*
    moving*crouch*clamp(.9+gaitAmp*.1,.92,1.12);
  // Only receiving weight can compress the pelvis; airborne frames must
  // not invent an additional grounded contact.
  pelvisY-=receiving*load.singleSupport*.14*
    moving*crouch*wound;
  pelvisY+=transient.pelvisY-directional.stanceDrop;
  // Physical pelvis compression comes from the support-foot reach budget,
  // not from a separate stance-radius correction in the renderer.
  if(input.position){
    const lateral={x:-Math.sin(input.heading),y:Math.cos(input.heading)};
    // Reach-limiting uses the very same neutral hip height as the rig.
    const restHip=LEG_HIP_HEIGHT-(input.posture==='crouch'?8:0)+
      legRestRise(input.velocity,input.posture,
        input.down,input.surrender);
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
  const torsoForward=clamp(-forward*speed*.09+
    (.038*unloading-.022*receiving)*moving-
    load.bearingForward*.002*speed+transient.torsoForward,
    -.13,.09)*crouch;
  // Counterbalance travels with the same bearing foot as the pelvis.
  // Aiming/pie tension keeps the chest quieter without moving the feet.
  const torsoSide=clamp(side*speed*.072+
    support*speed*.014+pelvisSide*.014+
    transient.torsoSide,-.11,.11)*
    crouch*(1-.20*tension);
  // Follow the same contact/weight envelopes, rather than layering
  // unrelated sine-wave bob and sway over the animation.
  pelvisY-=Math.max(0,-accel)*.17*moving*crouch;
  const chestLift=(-.35*receiving+.18*swinging+.16*unloading)*
    moving*gaitAmp*crouch*wound+transient.chestLift;
  // Small contact/acceleration response is a *requested* weapon fit sway;
  // actual stock, hands and barrel remain one authoritative rigid transform.
  const weaponMass=clamp(input.weaponWeight??1,.7,1.4);
  const weaponYaw=clamp((support*speed*.018-
    accel*.012+Math.sign(side)*clamp(input.turning/6,0,1)*.008)*
    weaponAmp*weaponMass,-.047,.047);
  const idleBlend=clamp(1-input.velocity/12,0,1)*(1-tension);
  const breath=Math.sin((input.seconds??0)*1.9+
    (input.personalPhase??0))*.11*idleBlend;
  const weaponPitch=clamp((-.012*receiving+.018*unloading+
    .010*swinging)*moving*weaponAmp-accel*.009*weaponMass,
    -.046,.046);
  return {pelvisY,pelvisSide,torsoForward,torsoSide,
    torsoYaw:clamp(-support*speed*.032*
      (input.personalLooseness??1)+directional.torsoYaw,-.038,.038),
    headCounter:-torsoSide*.62,support,chestLift,
    weaponYaw,weaponPitch,breath,
    headPitchCounter:transient.headPitchCounter};
}
