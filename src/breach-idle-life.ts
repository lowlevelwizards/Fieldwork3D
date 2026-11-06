/** Deterministic miniature idle-life overlay, never a simulation update.
 * Shared by armed Studio, friendly operators, enemies and paused planning.
 * No drift, hidden RNG, foot movement or weapon muzzle displacement.
 */
export type IdleLifeState={
 speed:number;aiming?:boolean;firing?:boolean;reloading?:boolean;
 down?:boolean;surrender?:boolean;interacting?:boolean;
};
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
export function idleLifeAt(seconds:number,seed:number,state:IdleLifeState){
 const quiet=clamp01(1-Math.max(0,state.speed)/10)*
  (state.aiming||state.firing||state.reloading||state.down||
   state.surrender||state.interacting?0:1);
 if(quiet===0)return {breathe:0,glance:0,sway:0,weight:0};
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
 const phase=(seed>>>0)*.000193;
 // Micro-motion only. This is independent of the tactical timeline so
 // when paused the planning view can breathe without advancing any actors.
 return {
  breathe:Math.sin(t*1.5+phase)*.092*quiet,
  glance:Math.sin(t*.21+phase*.73)*.026*quiet,
  sway:Math.sin(t*.47+phase*.43)*.008*quiet,
  weight:quiet
 };
}
