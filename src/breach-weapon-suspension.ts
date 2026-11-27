/** WR5: analytic, bounded suspension response. Motion is sampled from
 * existing locomotion facts, not a render-time clock or accumulated physics. */
import type {SlingKind} from './breach-weapon-retention.ts';
export type SuspensionMotion=Readonly<{
 stride:number;speed:number;acceleration?:number;turning?:number;
 massKg:number;inertia:number;
}>;
const finite=(v:number|undefined)=>Number.isFinite(v)?v!:0;
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
export function sampleSuspensionMotion(sling:SlingKind,m:SuspensionMotion){
 const speed=clamp(finite(m.speed)/75,0,1);
 const load=clamp(2.7/Math.max(.8,finite(m.massKg)),.55,1.15);
 const inertia=clamp(100/Math.max(40,finite(m.inertia)),.35,1);
 const phase=finite(m.stride)*Math.PI*2;
 const accel=clamp(finite(m.acceleration)/150,-1,1);
 const turn=clamp(finite(m.turning),-1,1);
 const freedom=sling==='single'?1:sling==='two'?.32:0;
 const k=freedom*load;
 return {
  pitch:k*clamp(Math.sin(phase)*speed*.12-accel*.10,-.22,.22),
  yaw:k*inertia*clamp(Math.cos(phase)*speed*.10+turn*.16,-.22,.22),
  roll:k*clamp(Math.sin(phase*2)*speed*.05-turn*.06,-.12,.12)
 };
}
