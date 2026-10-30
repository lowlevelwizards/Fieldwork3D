/** Procedural door action contact envelopes at fixed simulation timestamps. */
export const KICK_DURATION=.76;
export function kickMotion(age:number){
 const t=Math.max(0,Math.min(1,age/KICK_DURATION));
 const smooth=(x:number)=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
 const chamber=smooth((t-.11)/.22);
 const extend=smooth((t-.33)/.22);
 const retract=smooth((t-.58)/.32);
 const extension=Math.max(0,chamber*.35+extend*.65-retract);
 return {progress:t,extension,contact:t>=.53&&t<.65,
  lift:8.8*extension,reach:11.7*extension,
  torsoLean:extension*.13,complete:t>=1};
}
export const doorActionLabel=(method:'open'|'kick'|'hold',swing:-1|1)=>
 method==='kick'?'KICK':method==='hold'?'HOLD':
 'OPEN '+(swing>0?'↷':'↶');
