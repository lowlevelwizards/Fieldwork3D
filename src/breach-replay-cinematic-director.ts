/** Shared R8 replay camera types.
 * The original R5 competing cinematic shot selector and easing helper
 * have been retired. Editorial decisions now live exclusively in
 * breach-replay-director-edit.ts; physical/track behavior is separated.
 */
import type {ReplayCameraActor,ReplayCameraPoint}
  from './breach-replay-director.ts';
export type DirectorActor=ReplayCameraActor&{
  heading?:number;velocity?:number
};
export type DirectorRoom={id?:string;x:number;y:number;w:number;h:number};
export type DirectorWall={a:ReplayCameraPoint;b:ReplayCameraPoint};
export type CinematicShot={
  focus:ReplayCameraPoint;zoom:number;yaw:number;pitch:number;
  roomId:string|null;actorsFramed:number;kind:'squad'|'action'
};
