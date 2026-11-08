/** Deterministic miniature idle-life overlay, never a simulation update.
 * Shared by armed Studio, friendly operators, enemies and paused planning.
 * No drift, hidden RNG, foot movement or weapon muzzle displacement.
 */
import type {EncounterActivity} from './worldgen/encounter-types.ts';
/** Render-only nuance for armed actors; no new behavior or weapon state. */
export type PrecontactStyle='watch'|'observe'|'relaxed';
export type IdleLifeState={
 speed:number;aiming?:boolean;firing?:boolean;reloading?:boolean;
 down?:boolean;surrender?:boolean;interacting?:boolean;
 precontact?:PrecontactStyle;
};
/** Never depict an armed guard as unarmed, asleep, occupied with a tool,
 * or seated while the live simulation keeps their rifle fully available.
 * Historical film has a recorded alert and static encounter activity; when
 * either is absent return undefined and retain the existing neutral pose.
 */
export function armedPrecontactStyle(input:{
 side:'blue'|'red';activity?:EncounterActivity;
 alert:string;velocity:number;aim:number;health:number;
 surrendered?:boolean;reloading?:boolean;interacting?:boolean;
}):PrecontactStyle|undefined{
 if(input.side!=='red'||input.alert!=='idle'||
    input.health<=0||input.surrendered||input.velocity>2||
    input.aim>.16||input.reloading||input.interacting)return undefined;
 if(input.activity==='watching')return 'watch';
 if(input.activity==='working'||input.activity==='inspecting')return 'observe';
 if(input.activity==='resting'||input.activity==='seated'||
    input.activity==='talking')return 'relaxed';
 return undefined;
}
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
export function idleLifeAt(seconds:number,seed:number,state:IdleLifeState){
 const quiet=clamp01(1-Math.max(0,state.speed)/10)*
  (state.aiming||state.firing||state.reloading||state.down||
   state.surrender||state.interacting?0:1);
 if(quiet===0)return {breathe:0,glance:0,sway:0,weight:0,headDip:0};
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
 const phase=(seed>>>0)*.000193;
 // Micro-motion only. This is independent of the tactical timeline so
 // when paused the planning view can breathe without advancing any actors.
 // Use the SAME idle clock and upper-body rig already present. The
 // observer holds their gaze steady; a relaxed actor is marginally looser;
 // an inspecting actor only looks down a little while still holding a gun.
 // No hand work, weapon holster, sit-down or autonomous look orders.
 const mode=state.precontact;
 const glanceScale=mode==='watch'?.42:mode==='observe'?.65:
   mode==='relaxed'?1.22:1;
 const swayScale=mode==='watch'?.48:mode==='relaxed'?1.15:1;
 return {
  breathe:Math.sin(t*1.5+phase)*.092*quiet,
  glance:Math.sin(t*.21+phase*.73)*.026*quiet*glanceScale,
  sway:Math.sin(t*.47+phase*.43)*.008*quiet*swayScale,
  weight:quiet,
  headDip:mode==='observe'?.048*quiet:0
 };
}
