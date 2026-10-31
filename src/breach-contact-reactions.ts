/** Build 154: a brief physical recoil/weight transfer for point-blank
 * contact. Authoritative combat decides who pushes whom; this is pure pose
 * presentation, sampled from simulation time (never frame time).
 */
export type BashRole='push'|'receive'|null;
export type ContactReaction={active:boolean;weight:number;
  lean:number;reach:number;head:number;brace:number};
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export function contactReaction(age:number,role:BashRole,
  blocked=false):ContactReaction{
  const progress=clamp(age/.53,0,1);
  const active=role!==null&&age>=0&&age<.53;
  const weight=active?Math.sin(Math.PI*progress):0;
  return {active,weight,
    lean:active?weight*(role==='push'?-.14:.19):0,
    reach:role==='push'?weight*4.8:0,
    head:weight*(role==='push'?.05:-.10),
    brace:blocked?.35:0};
}
