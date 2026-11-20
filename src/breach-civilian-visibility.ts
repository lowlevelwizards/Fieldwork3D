/** Shared player-facing visibility decision for neutral models.
 * Historical film uses actual recorded sightings; replay omniscience
 * is an explicit user choice. Live tactical logic ignores this field. */
import type {CivilianActor} from './breach-civilian-types.ts';
/** An active, living follower remains disclosed even off the current cone.
 * Uses the current (or historically restored) civilian custody state only. */
export function escortedCivilianVisible(
 c:Partial<Pick<CivilianActor,'state'|'following'|'health'>>):boolean{
 return c.health!==undefined&&c.health>0&&
   c.state==='escorted'&&!!c.following;
}
export function civilianPresentationVisible(
 c:Pick<CivilianActor,'replayVisible'> &
    Partial<Pick<CivilianActor,'state'|'following'|'health'>>, 
 replay:boolean,omniscient:boolean,visibleNow:boolean):boolean{
 if(omniscient||escortedCivilianVisible(c))return true;
 if(replay&&typeof c.replayVisible==='boolean')
   return c.replayVisible;
 return visibleNow;
}
