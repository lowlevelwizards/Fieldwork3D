/** Build 126: contact-derived balance, not time-based whole-body bob.
 * Pure deterministic presentation; phase/velocity/facing are authoritative.
 */
import type {FootTarget} from './breach-footsteps.ts';
export type BalanceInput={velocity:number;heading:number;travelYaw:number;
  turning:number;injury:number;posture:'stand'|'crouch';
  feet:readonly [FootTarget,FootTarget];};
export type BodyMotion={pelvisY:number;pelvisSide:number;
  torsoForward:number;torsoSide:number;torsoYaw:number;headCounter:number;
  support:number;};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const smooth=(t:number)=>{const a=clamp(t,0,1);return a*a*(3-2*a);};
const phaseWeight=(foot:FootTarget)=>{
  const p=foot.progress??0;
  switch(foot.phase){
    case 'unloading':return 1-.6*smooth(p);
    case 'swinging':return 0;
    case 'landing':return .25+.65*smooth(p);
    case 'recovering':return .9+.1*smooth(p);
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
  const swing=left.phase==='swinging'||right.phase==='swinging';
  const receiving=left.phase==='landing'||right.phase==='landing';
  const unloading=left.phase==='unloading'||right.phase==='unloading';
  // Compression at weight acceptance, subtle rise as the trailing leg
  // unloads, and lateral mass transfer toward the supporting foot.
  const pelvisY=(receiving?-.65:unloading?.22:swing?.42:0)*
    moving*crouch*wound;
  const pelvisSide=support*.95*speed*crouch;
  const torsoForward=clamp(-forward*speed*.09,-.11,.08)*crouch;
  const torsoSide=clamp(side*speed*.065+support*speed*.014,
    -.095,.095)*crouch;
  return {pelvisY,pelvisSide,torsoForward,torsoSide,
    torsoYaw:clamp(-support*speed*.024,-.03,.03),
    headCounter:-torsoSide*.38,support};
}
