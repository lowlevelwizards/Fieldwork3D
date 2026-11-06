/** Low-cost, deterministic, presentation-only Studio animation.
 * Reuses the real rig's IK and reload motion, not a duplicate mannequin.
 * Reload once a minute; no timers, firing authority or inventory changes. */
export const STUDIO_IDLE_RELOAD_PERIOD=60;
export const STUDIO_IDLE_RELOAD_DURATION=2.2;
export function studioArmedIdleAt(seconds:number,appearanceSeed=0){
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
 const phase=appearanceSeed*.173;
 const cycle=t%STUDIO_IDLE_RELOAD_PERIOD;
 const reloading=cycle>STUDIO_IDLE_RELOAD_PERIOD-STUDIO_IDLE_RELOAD_DURATION;
 const remaining=reloading?STUDIO_IDLE_RELOAD_PERIOD-cycle:0;
 const progress=reloading?1-remaining/STUDIO_IDLE_RELOAD_DURATION:0;
 // A subtle planted-weight shift and occasional glance, no simulated walking.
 return {
  heading:Math.sin(t*.24+phase)*.018,
  turning:Math.cos(t*.24+phase)*.007,
  reload:remaining,
  reloadDuration:reloading?STUDIO_IDLE_RELOAD_DURATION:0,
  reloadMode:'emergency' as const,
  reloadRemoved:reloading&&progress>.29&&progress<.82,
  reloadInserted:reloading&&progress>=.82,
  glance:Math.sin(t*.19+phase)*.045,
  breathe:Math.sin(t*1.35+phase)*.025
 };
}
