/** Build 154: a brief physical recoil/weight transfer for point-blank
 * contact. Authoritative combat decides who pushes whom; this is pure pose
 * presentation, sampled from simulation time (never frame time).
 */
export type BashRole='push'|'receive'|'glass'|null;
export type GlassBashContact={x:number;y:number;height:number};
export const GLASS_BASH_IMPACT=.28;
export const GLASS_BASH_DURATION=.62;
export type ContactReaction={active:boolean;weight:number;
  lean:number;reach:number;head:number;brace:number};
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const ease=(x:number)=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
export function glassBashMotion(age:number){
 const windup=ease(age/.14)*(1-ease((age-.14)/.14));
 const strike=ease((age-.14)/(GLASS_BASH_IMPACT-.14))*
  (1-ease((age-GLASS_BASH_IMPACT)/(GLASS_BASH_DURATION-GLASS_BASH_IMPACT)));
 return {windup,strike};
}
export function contactReaction(age:number,role:BashRole,
  blocked=false):ContactReaction{
  if(role==='glass'){
    const {windup,strike}=glassBashMotion(age);
    const active=age>=0&&age<GLASS_BASH_DURATION;
    return {active,weight:Math.max(windup,strike),lean:.11*windup-.21*strike,
      reach:5.2*strike,head:.08*strike,brace:blocked?.35:0};
  }
  const progress=clamp(age/.53,0,1);
  const active=role!==null&&age>=0&&age<.53;
  const weight=active?Math.sin(Math.PI*progress):0;
  return {active,weight,
    lean:active?weight*(role==='push'?-.14:.19):0,
    reach:role==='push'?weight*4.8:0,
    head:weight*(role==='push'?.05:-.10),
    brace:blocked?.35:0};
}
