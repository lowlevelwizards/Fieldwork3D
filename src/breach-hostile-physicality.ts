/** EQA3.16D: read-only expression of a hostile's EXISTING auditory
 * investigation. Does not select targets, change AI timing, rotate the
 * weapon or influence combat. A stale sound is never a current target.
 * Replay owns the optional heard/contact samples and their timestamps.
 */
import type {TeamActor} from './breach-game.ts';
type Hostile=Pick<TeamActor,
 'side'|'p'|'heading'|'health'|'surrendered'|'alert'|'aim'|
 'velocity'|'reload'|'lastNoiseAt'|'heard'|'contact'>;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
const ease=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};

export function hostilePhysicalityAt(a:Hostile,now:number):{
 headYaw:number;investigating:boolean;
}{
 if(a.side!=='red'||a.health<=0||a.surrendered||
    a.aim>.18||a.velocity>7||a.reload>0||
    (a.alert!=='suspicious'&&a.alert!=='investigating'))
  return {headYaw:0,investigating:false};
 const age=now-a.lastNoiseAt;
 // A heard point is acoustically estimated, not a pin to the current
 // hidden source. Contact memory is NOT used as fresh acoustic evidence.
 const point=a.heard;
 if(!point||a.lastNoiseAt<0||!Number.isFinite(age)||age<0||
    age>5||!Number.isFinite(point.x)||!Number.isFinite(point.y))
  return {headYaw:0,investigating:false};
 const bearing=Math.atan2(point.y-a.p.y,point.x-a.p.x);
 const fade=ease(age/.28)*(1-ease((age-3.7)/1.3));
 return {headYaw:clamp(wrap(bearing-a.heading),-.35,.35)*.65*fade,
   investigating:true};
}
