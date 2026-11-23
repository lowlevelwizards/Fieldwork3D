/** Procedural door action contact envelopes at fixed simulation timestamps. */
export const KICK_DURATION=.76;
export function kickMotion(age:number){
 const t=Math.max(0,Math.min(1,age/KICK_DURATION));
 const smooth=(x:number)=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
 // Fixed-tick door impulse occurs exactly at .53. Approach the leaf,
 // briefly touch it, then extend independently as it starts swinging.
 const chamber=smooth((t-.11)/.22);
 const strike=smooth((t-.30)/.23);
 const followThrough=smooth((t-.53)/.11);
 const retract=smooth((t-.64)/.30);
 // The opposite foot bears weight before lift-off and remains planted
 // through the impulse. Weight returns only during the actual replant.
 const brace=smooth((t-.06)/.25)*(1-smooth((t-.72)/.21));
 const recover=smooth((t-.70)/.26);
 const extension=(chamber*.22+strike*.70+followThrough*.08)*
  (1-retract);
 return {progress:t,chamber,strike,followThrough,retract,
  extension,contact:t>=.53&&t<.57,
  lift:8.8*extension,reach:11.7*extension,
  torsoLean:extension*.13,brace:brace*1.25,recover,
  complete:t>=1};
}
export const doorActionLabel=(method:'open'|'close'|'kick'|'hold',swing:-1|1)=>
 method==='kick'?'KICK':method==='hold'?'HOLD':method==='close'?'CLOSE':
 'OPEN '+(swing>0?'↷':'↶');
