/** One selectable fixed-step gait authority for actual battles and replay.
 * Flip the mode to 'legacy' to roll back without altering the film player.
 * Renderer never calls this module when recorded contacts are available.
 */
import {advanceFootsteps,createFootstepScheduler,
  type FootstepScheduler,type FootstepInput,type FootTarget}
  from './breach-footsteps.ts';
import {advanceDistanceGait,createDistanceGait,
  type DistanceGaitState} from './breach-distance-gait.ts';
export const LIVE_GAIT_MODE:'hybrid'|'legacy'='hybrid';
export type LiveGaitState=FootstepScheduler|DistanceGaitState;
export function createLiveGait():LiveGaitState{
 return LIVE_GAIT_MODE==='hybrid'?createDistanceGait():createFootstepScheduler();
}
export function advanceLiveGait(s:LiveGaitState,input:FootstepInput):
 [FootTarget,FootTarget]{
 return 'accumulated' in s?advanceDistanceGait(s,input):
   advanceFootsteps(s,input);
}
