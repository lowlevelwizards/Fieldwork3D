/** Pure, bounded reactions to real combat evidence.
 * Never change authored orders, spawn intel, teleport, or waive firing safety.
 */
import type {Pt} from './breach-core.ts';
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
/** The hit yaw is projectile travel direction: reverse to face the source.
 * A brief reaction can override gaze, not route ownership or fire policy.
 */
export function incomingHitFacing(heading:number,hitYaw:number,
 age:number,{busy=false}:Readonly<{busy?:boolean}>={}):number|null{
 if(busy||age<.16||age>1.20)return null;
 const toward=wrap(hitYaw+Math.PI);
 return Math.abs(wrap(toward-heading))>.20?toward:null;
}
/** Try small BACKWARD steps first. No sidestepping around unseen geometry:
 * both candidate motion and the complete resulting muzzle lane must pass
 * caller-supplied authoritative collision and fire-safety checks.
 */
export function chooseMuzzleRecoveryStep(p:Pt,aimYaw:number,
 canMove:(next:Pt)=>boolean,canShoot:(next:Pt)=>boolean):Pt|null{
 for(const delta of [0,-.30,.30]){
  const yaw=aimYaw+Math.PI+delta;
  for(const length of [14,22,30]){
   const next={x:p.x+Math.cos(yaw)*length,
     y:p.y+Math.sin(yaw)*length};
   if(canMove(next)&&canShoot(next))return next;
  }
 }
 return null;
}

/** A teammate obscuring the target is a reason to move *ourselves*, never
 * the teammate or a reason to skip friendly-fire protection. Compare short
 * lateral steps on either side of the muzzle axis, nearest first, and only
 * accept a candidate whose entire motor sweep and firing lane are safe.
 * All candidate iteration is deterministic for replay.
 */
export function chooseFriendlyLaneStep(p:Pt,aimYaw:number,
 canMove:(next:Pt)=>boolean,canShoot:(next:Pt)=>boolean):Pt|null{
 const left={x:-Math.sin(aimYaw),y:Math.cos(aimYaw)};
 for(const length of [12,20,28]){
  for(const side of [-1,1]){
   const next={x:p.x+left.x*length*side,
     y:p.y+left.y*length*side};
   if(canMove(next)&&canShoot(next))return next;
  }
 }
 return null;
}
