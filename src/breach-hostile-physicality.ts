/** EQA3.16D/G: read-only expression of EXISTING hostile decisions.
 * Acoustic directions are estimated, not current actor positions. No AI,
 * weapon, physics, or animation-authoritative state is changed here.
 * Replay owns only the optional heard point and timestamp.
 */
import type {TeamActor} from './breach-game.ts';
type Hostile=Pick<TeamActor,
 'side'|'p'|'heading'|'health'|'surrendered'|'alert'|'aim'|
 'velocity'|'reload'|'suppression'|'lastNoiseAt'|'heard'|'contact'>&{lastReportAt?:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
const ease=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export type HostilePhysicality={
 headYaw:number;headPitch:number;investigating:boolean;guarding:boolean;
};
const neutral=():HostilePhysicality=>({
 headYaw:0,headPitch:0,investigating:false,guarding:false
});

/** All rotations are additive head-only gestures applied AFTER poseOperator.
 * Combat aim, firing readiness, lower-body movement and player LOOK/WATCH
 * keep their existing authority; only genuine fixed-tick evidence may aim
 * a decorative glance. A suppressed defender can duck slightly even with
 * no acoustic direction, but cannot locate the source from that suppression.
 */
export function hostilePhysicalityAt(a:Hostile,now:number):HostilePhysicality{
 if(a.side!=='red'||a.health<=0||a.surrendered||
    a.aim>.18||a.reload>0)return neutral();
 const investigating=(a.alert==='suspicious'||a.alert==='investigating')&&
   a.velocity<=7;
 const defensive=a.alert==='cover'||a.alert==='retreat';
 const reportAge=now-(a.lastReportAt??-100);
 const communication=a.velocity<=7&&reportAge>=0&&reportAge<.85?
   Math.sin(Math.PI*reportAge/.85)*.065:0;
 if(!investigating&&!defensive)return {...neutral(),headPitch:communication};
 const guarding=defensive&&a.suppression>=.27;
 // Defensive recoil is deliberately tiny because the shared chest joint
 // also owns the rifle. A head-only inclination can't move the muzzle.
 const headPitch=clamp((guarding?clamp((a.suppression-.20)*.15,0,.115):0)+communication,0,.115);
 const age=now-a.lastNoiseAt;
 const point=a.heard;
 if(!point||a.lastNoiseAt<0||!Number.isFinite(age)||age<0||
    age>5||!Number.isFinite(point.x)||!Number.isFinite(point.y))
  return {headYaw:0,headPitch,investigating:false,guarding};
 const bearing=Math.atan2(point.y-a.p.y,point.x-a.p.x);
 const fade=ease(age/.28)*(1-ease((age-3.7)/1.3));
 // During withdrawal a body may be moving away from the sound. Preserve a
 // human-scale glance, not a magical rear-facing or swiveling rifle pose.
 const maximum=investigating?.35:.25;
 const weight=investigating?.65:.48;
 return {headYaw:clamp(wrap(bearing-a.heading),-maximum,maximum)*weight*fade,
   headPitch,investigating,guarding};
}
