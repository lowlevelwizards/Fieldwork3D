/** WR5: analytic, bounded suspension response. Motion is sampled from
 * existing locomotion facts, not a render-time clock or accumulated physics. */
import type {SlingArtProfile} from './operator-sling-profile.ts';
import type {SlingKind} from './breach-weapon-retention.ts';
export type SuspensionMotion=Readonly<{
 stride:number;speed:number;acceleration?:number;turning?:number;
 massKg:number;inertia:number;
 momentum?:Readonly<{drive:number;brake:number}>;
 profile?:SlingArtProfile;
 posture?:'stand'|'crouch';gait?:'walk'|'run'|'pie'|'squeeze';
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
 const freedom=sling==='none'?0:m.profile?.kind===sling?m.profile.freedom:
  sling==='single'?1:.32;
 const stance=(m.posture==='crouch'?.68:1)*
  (m.gait==='pie'||m.gait==='squeeze'?.55:1);
 const k=freedom*load*stance;
 // The fixed-step/replay impulse already decays after a stop. Preserve
 // that residual energy at zero speed; don't invent a second render clock.
 const drive=clamp(finite(m.momentum?.drive),0,1);
 const brake=clamp(finite(m.momentum?.brake),0,1);
 const lag=clamp(accel*.42+drive*.75-brake*.90,-1,1);
 const strideGain=m.gait==='run'?1.25:1;
 const pace=speed*strideGain;
 return {
  pitch:k*clamp(Math.sin(phase-.55)*pace*.18-lag*.14,-.27,.27),
  yaw:k*inertia*clamp(Math.cos(phase-.7)*pace*.14+turn*.18,-.25,.25),
  roll:k*clamp(Math.sin(phase*2-.85)*pace*.085-turn*.075,-.15,.15),
  lift:k*clamp(Math.sin(phase*2-.85)*pace*1.25+brake*.55,-1.6,1.6),
  sway:k*inertia*clamp(Math.sin(phase-.9)*pace*1.35+turn*.65,-1.8,1.8),
  foreAft:k*clamp(-lag*.9+Math.cos(phase-.5)*pace*.48,-1.3,1.3),
  separation:k*clamp((1+Math.sin(phase*2-.85))*.5*pace*.65+brake*.38,0,1)
 };
}
