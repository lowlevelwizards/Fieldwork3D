/** Stable, restrained physical signatures from operator identity.
 * These modify posture only, not simulation, steps, muzzle or weapon aim.
 * Same id always yields the same traits on live and replay.
 */
export type OperatorTraits={postureLean:number;headBias:number;
  breathingRate:number;gearResponse:number};
const hash=(id:string)=>{
 let n=2166136261;
 for(let i=0;i<id.length;i++)n=Math.imul(n^id.charCodeAt(i),16777619);
 return n>>>0;
};
const centered=(n:number)=>((n/255)*2-1);
export function operatorTraits(id:string):OperatorTraits{
 const a=hash(id||'operator');
 return {postureLean:centered(a&255)*.009,
   headBias:centered((a>>>8)&255)*.014,
   breathingRate:1+centered((a>>>16)&255)*.075,
   gearResponse:1+centered((a>>>24)&255)*.085};
}
