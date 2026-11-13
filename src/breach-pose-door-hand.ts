/** D4 pure, replay-seekable reach/hold/release envelope.
 * No animation history, collision authority or alternate arm solver.
 */
import {DOOR_HAND_REACH_DURATION,DOOR_HAND_RELEASE_DURATION}
 from './breach-door-grip-constants.ts';
export type DoorGripPose={
 point:{x:number;y:number};
 mode:'handle'|'panel';
 startedAt:number;releasedAt:number|null;
};
export const DOOR_GRIP_RETURN_SECONDS=DOOR_HAND_RELEASE_DURATION;
const smooth=(x:number)=>{
 const v=Math.max(0,Math.min(1,x));
 return v*v*(3-2*v);
};
export function doorGripWeight(p:DoorGripPose|null|undefined,now:number):number{
 if(!p||!Number.isFinite(now))return 0;
 const reach=smooth((now-p.startedAt)/DOOR_HAND_REACH_DURATION);
 return reach*(p.releasedAt===null?1:
   1-smooth((now-p.releasedAt)/DOOR_HAND_RELEASE_DURATION));
}
