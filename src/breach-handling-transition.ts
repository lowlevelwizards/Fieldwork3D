/** Pure time-sampled handling transitions. No render-dt accumulation:
 * deterministic scrubbing/replay and mid-transition retargeting are possible. */
import type {Handling} from './breach-weapon-pose.ts';
import {handlingProfile,type HandlingProfile} from './breach-handling-profiles.ts';
import type {WeaponId} from './breach-combat.ts';
export type HandlingTransition={from:Handling;to:Handling;alpha:number};
export const smoothHandling=(x:number)=>{
 const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);
};
export function blendedHandlingProfile(from:Handling,to:Handling,
 alpha:number,weapon:WeaponId):HandlingProfile{
 const a=handlingProfile(from,weapon),b=handlingProfile(to,weapon),
   t=smoothHandling(alpha);
 const result={...b};
 for(const key of Object.keys(b) as (keyof HandlingProfile)[])
   result[key]=a[key]+(b[key]-a[key])*t;
 return result;
}
export function timedHandling(from:Handling,to:Handling,
 seconds:number,start:number,duration:number):HandlingTransition{
 return {from,to,alpha:smoothHandling((seconds-start)/
   Math.max(.0001,duration))};
}
