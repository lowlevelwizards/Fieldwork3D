/** Physical target orders are bounded by the currently active site.
 * LOOK/WATCH markers are sightline directions, not destinations, so do not
 * reject them merely because ground projection falls outside that envelope.
 * No geometry/fog query is necessary, so hidden state cannot leak.
 */
import type {Pt} from '../breach-core.ts';
export type TargetBounds={minX:number;minY:number;maxX:number;maxY:number};
export function targetPlacementAllowed(
 target:Pt|null,kind:'aim'|'physical',bounds:TargetBounds,
):target is Pt{
 if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))
   return false;
 if(kind==='aim')return true;
 return target.x>=bounds.minX&&target.x<=bounds.maxX&&
   target.y>=bounds.minY&&target.y<=bounds.maxY;
}
