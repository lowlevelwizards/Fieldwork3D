/** Phase A A3: shot evidence, not selected-target intent, drives danger.
 * This is evaluated once for a real authoritative projectile after firing,
 * never once per AI tick. The simulator supplies the already-truncated
 * projectile segment (muzzle to hit/impact), plus its own wall/door check.
 * Material cover may transmit a nearby impact to someone behind it;
 * opaque walls/doors must not transmit flyby evidence.
 */
import type {Pt} from './breach-core.ts';
export type ShotPressure='hit'|'near'|'none';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function shotPressureAtActor(from:Pt,end:Pt,body:Pt,
 actualHit:boolean,unobstructed:(from:Pt,to:Pt)=>boolean,
 radius=24):ShotPressure{
 if(actualHit)return 'hit';
 const dx=end.x-from.x,dy=end.y-from.y;
 const span=dx*dx+dy*dy;
 if(!Number.isFinite(span)||span<1e-5||radius<=0||
    !Number.isFinite(radius)||!Number.isFinite(body.x)||
    !Number.isFinite(body.y))return 'none';
 const t=Math.max(0,Math.min(1,
   ((body.x-from.x)*dx+(body.y-from.y)*dy)/span));
 const closest={x:from.x+dx*t,y:from.y+dy*t};
 if(dist(body,closest)>radius)return 'none';
 return unobstructed(closest,body)?'near':'none';
}
/** Hits retain the existing pressure. Validated nearby misses are softer;
 * a genuinely distant or occluded miss does not change suppression.
 * No automatic player posture, movement or WATCH change is authorized here.
 */
export function shotPressureAmount(evidence:ShotPressure):number{
 return evidence==='hit'?.31:evidence==='near'?.16:0;
}
