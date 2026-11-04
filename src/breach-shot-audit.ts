/** Deterministic, read-only shot audit. Physical hit, origin, shot yaw,
 * target and impact remain authoritative in the fixed-step ShotEvent.
 * Never creates post-hoc accuracy rolls or alters rendering.
 */
import type {ShotEvent} from './breach-game.ts';
export type ShotAuditRow={
 id:number;at:number;shooter:string;target:string|null;
 muzzleX:number;muzzleY:number;muzzleHeight:number;
 yaw:number;distance:number;hit:boolean;down:boolean;
 surface:string;mode:string;
};
export function auditShots(shots:readonly ShotEvent[]):ShotAuditRow[]{
 return shots.map(shot=>({
  id:shot.id,at:shot.firedAt,shooter:shot.shooterId,
  target:shot.targetId??null,
  muzzleX:shot.start.x,muzzleY:shot.start.y,
  muzzleHeight:shot.muzzleHeight??0,yaw:shot.shotYaw,
  distance:Math.hypot(shot.end.x-shot.start.x,shot.end.y-shot.start.y),
  hit:shot.hit,down:!!shot.down,
  surface:shot.surface??'dust',mode:shot.mode
 }));
}
export function summarizeShots(rows:readonly ShotAuditRow[]){
 const uniqueShots=new Set(rows.map(r=>r.id)).size;
 const hits=rows.filter(r=>r.hit).length;
 return {shots:rows.length,uniqueShots,hits,misses:rows.length-hits,
  hitRate:rows.length?hits/rows.length:0,
  blockedOrInvalid:rows.filter(r=>!Number.isFinite(r.yaw)||
   !Number.isFinite(r.muzzleX)||!Number.isFinite(r.muzzleY)||
   r.distance<0).length};
}
