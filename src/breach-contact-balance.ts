/** A2.1 fixed-time, zero-history anatomical support measurement.
 * Sole inputs are recorded/gameplay foot targets and the authoritative
 * world root. Never advances contacts, schedules footsteps or edits feet.
 * No Three.js, random values, hidden action clock or rig ownership.
 */
import type {FootTarget} from './breach-footsteps.ts';
export type ContactLoad={
 /** Positive means bearing right shoe, negative bearing left shoe. */
 support:number;
 /** Bearing shoe position relative to the operator, body-side axis. */
 bearingSide:number;
 /** Bearing shoe longitudinal offset relative to authoritative root. */
 bearingForward:number;
 singleSupport:number;
 unloading:number;swinging:number;receiving:number;
};
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const phaseEase=(n:number)=>{
 const t=clamp(n,0,1);return t*t*(3-2*t);
};
export const footBearing=(foot:FootTarget):number=>{
 const t=foot.progress??0;
 switch(foot.phase){
  case 'unloading':return 1-phaseEase(t);
  case 'swinging':return 0;
  case 'landing':return phaseEase(t);
  case 'recovering':return 1;
  default:return foot.contact?1:0;
 }
};
export function contactBalance(feet:readonly [FootTarget,FootTarget],
 root:{x:number;y:number}|undefined,heading:number):ContactLoad{
 const a=footBearing(feet[0]),b=footBearing(feet[1]);
 const total=a+b;
 const support=total>1e-6?(b-a)/total:0;
 const envelope=(foot:FootTarget,phase:FootTarget['phase'])=>
  foot.phase===phase?
   Math.sin(Math.PI*clamp(foot.progress??0,0,1)):0;
 const unloading=Math.max(envelope(feet[0],'unloading'),
  envelope(feet[1],'unloading'));
 const swinging=Math.max(envelope(feet[0],'swinging'),
  envelope(feet[1],'swinging'));
 const receiving=Math.max(envelope(feet[0],'landing'),
  envelope(feet[1],'landing'));
 let bearingSide=0,bearingForward=0;
 if(root&&total>1e-6){
  const acrossX=-Math.sin(heading),acrossY=Math.cos(heading);
  const forwardX=Math.cos(heading),forwardY=Math.sin(heading);
  const left=feet[0].position,right=feet[1].position;
  const dx=(left.x-root.x)*a+(right.x-root.x)*b;
  const dy=(left.y-root.y)*a+(right.y-root.y)*b;
  bearingSide=clamp((dx*acrossX+dy*acrossY)/total,-8,8);
  bearingForward=clamp((dx*forwardX+dy*forwardY)/total,-12,12);
 }
 return {support,bearingSide,bearingForward,
  singleSupport:Math.abs(support),unloading,swinging,receiving};
}
