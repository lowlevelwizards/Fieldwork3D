/** Shared presentation contract for committed intermediate material hits.
 * Does not add shots, traces, muzzle flashes or gameplay consequences. */
import type {MaterialImpactCue,ShotEvent} from './breach-game.ts';
export const MAX_MATERIAL_CUES=4;
export function isIntermediateMaterialCue(shot:ShotEvent,cue:MaterialImpactCue):boolean{
 return !(shot.surface===cue.surface&&Math.hypot(shot.end.x-cue.p.x,shot.end.y-cue.p.y)<.05&&
  Math.abs((shot.impactHeight??cue.height)-cue.height)<.05);
}
