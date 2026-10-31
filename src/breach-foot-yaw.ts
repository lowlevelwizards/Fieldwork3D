/** Anatomical, world-space boot yaw constraints. Pure fixed-step planning. */
export const BOOT_MAX_STEP_YAW=.52;
export const BOOT_REPLANT_ERROR=.36;
export const angleDifference=(from:number,to:number)=>
 Math.atan2(Math.sin(to-from),Math.cos(to-from));
export function plannedBootYaw(current:number,wanted:number,
 limit=BOOT_MAX_STEP_YAW){
 return current+Math.max(-limit,Math.min(limit,
   angleDifference(current,wanted)));
}
