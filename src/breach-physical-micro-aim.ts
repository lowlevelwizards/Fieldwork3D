/** A3.2: bounded, deterministic least-disruptive lateral weapon accommodation.
 * Does not alter actor position or permit fire. The actual muzzle/weapon
 * and full friend/civilian/cover checks belong to evaluate() at the caller.
 */
export const MICRO_AIM_CANDIDATES=Object.freeze([0,-1.2,1.2,-2.4,2.4,-3.2,3.2]);
export type MicroAimChoice={
 offset:number;attempts:number;reason:'retained'|'selected'|'blocked'};
export function chooseMicroAimOffset(
 current:number,evaluate:(offset:number)=>boolean):MicroAimChoice{
 let checks=0;
 const legal=(offset:number)=>{checks++;return evaluate(offset);};
 // Keep the present solution when still legal: avoid left-right oscillation.
 if(Math.abs(current)>.01&&legal(current))
  return {offset:current,attempts:checks,reason:'retained'};
 // Select smallest displacement; deterministic negative/positive tie break.
 for(const offset of MICRO_AIM_CANDIDATES)
  if(legal(offset))
   return {offset,attempts:checks,reason:'selected'};
 return {offset:0,attempts:checks,reason:'blocked'};
}
/** Advance physical weapon offset on simulation time, never RAF time.
 * A short, interrupted movement may be unsafe until complete; all shots
 * still revalidate the *actual intermediate* barrel at ignition.
 */
export function approachMicroAimOffset(current:number,target:number,
 dt:number):number{
 const step=Math.max(0,dt)*21;
 if(!Number.isFinite(current)||!Number.isFinite(target))return 0;
 const delta=Math.max(-step,Math.min(step,target-current));
 return Math.abs(target-current)<=step?target:current+delta;
}
/** Only voluntary, stationary safe tactical handling may request a new
 * correction. Running, reloading, door work, authored HOLD etc stay intact.
 */
export function allowMicroAim(facts:{
 moving:number;busy:boolean;fireAllowed:boolean;
 aiming:boolean;activeTarget:boolean}):boolean{
 return facts.moving<10&&!facts.busy&&facts.fireAllowed&&
  facts.aiming&&facts.activeTarget;
}
