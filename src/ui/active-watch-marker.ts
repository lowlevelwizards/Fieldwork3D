/** A WATCH order survives its source waypoint as an active operator aim.
 * Keep its visual marker derived from authoritative aim state, not from the
 * transient route queue. Never show an expired/released WATCH as active.
 */
import type {Pt} from '../breach-core.ts';
import type {AimInstruction} from '../breach-plan.ts';

export type WatchMarkerSource={
  health:number;
  pace:'walk'|'run';
  aimInstruction:AimInstruction|null;
};
export function activeWatchTarget(actor:WatchMarkerSource):Pt|null{
  const instruction=actor.aimInstruction;
  if(actor.health<=0||actor.pace==='run'||
     instruction?.mode!=='track'||!instruction.point)return null;
  const {x,y}=instruction.point;
  return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
}
