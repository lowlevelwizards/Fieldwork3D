/** Shared player-facing visibility decision for neutral models.
 * Historical film uses actual recorded sightings; replay omniscience
 * is an explicit user choice. Live tactical logic ignores this field. */
import type {CivilianActor} from './breach-civilian-types.ts';
export function civilianPresentationVisible(
 c:Pick<CivilianActor,'replayVisible'>,
 replay:boolean,omniscient:boolean,visibleNow:boolean):boolean{
 if(omniscient)return true;
 if(replay&&typeof c.replayVisible==='boolean')
   return c.replayVisible;
 return visibleNow;
}
