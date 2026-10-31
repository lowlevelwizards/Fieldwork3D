/** Bounded 60Hz simulation work per displayed frame.
 * Under sustained overload simulation slows rather than skipping
 * combat events, moving a soldier without feet, or running unbounded
 * catch-up loops on an already overloaded phone. */
export const FIXED_DT=1/60;
export function fixedStepBudget(previous:number,dt:number,maxSteps=3){
 const pending=Math.max(0,Math.min(.20,previous+Math.max(0,dt)));
 const steps=Math.min(maxSteps,Math.floor((pending+1e-9)/FIXED_DT));
 return {steps,remaining:Math.max(0,pending-steps*FIXED_DT),
   overloaded:pending>=.20||steps===maxSteps&&pending>=
     (maxSteps+1)*FIXED_DT};
}
