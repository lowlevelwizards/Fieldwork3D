/** LOOK and WATCH only need a non-degenerate 2D direction.
 * A minimum world-space distance of two units made near-but-distinct finger
 * targets fail silently even though there is no movement/range requirement.
 * Keep only a sub-unit numerical guard so exact overlap does not create an
 * undefined heading; do not require the target to be passable or in bounds.
 */
import type {Pt} from './breach-core.ts';
export const MIN_AIM_DIRECTION_DISTANCE=0.15;
export function aimTargetHasDirection(origin:Pt,target:Pt):boolean{
 return Number.isFinite(origin.x)&&Number.isFinite(origin.y)&&
   Number.isFinite(target.x)&&Number.isFinite(target.y)&&
   Math.hypot(target.x-origin.x,target.y-origin.y)>=MIN_AIM_DIRECTION_DISTANCE;
}
