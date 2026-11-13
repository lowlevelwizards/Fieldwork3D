/** D4 pure, replay-seekable hand-to-door reach envelope.
 * No rig history, hidden animation clock, collision, or new Three objects.
 * Simulation chooses the contact; pose only blends a real recorded target.
 */
import type {DoorHandContact} from './breach-door-hand-contact.ts';
import {DOOR_HAND_RELEASE_DURATION} from './breach-door-hand-contact.ts';
export type DoorGripPose=Pick<DoorHandContact,
 'point'|'mode'|'startedAt'|'releasedAt'>;
const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const v=clamp01(x);return v*v*(3-2*v)};
export const DOOR_HAND_REACH_DURATION=.20;
export function doorGripWeight(p:DoorGripPose|null|undefined,now:number):number{
 if(!p||!Number.isFinite(now))return 0;
 const reaching=smooth((now-p.startedAt)/DOOR_HAND_REACH_DURATION);
 const release=p.releasedAt===null?1:
   1-smooth((now-p.releasedAt)/DOOR_HAND_RELEASE_DURATION);
 return reaching*release;
}
