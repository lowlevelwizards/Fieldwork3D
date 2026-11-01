/** Semantic outdoor condition by visual slider; independent of occupancy.
 * At pristine, damaged grass and grime overlays cannot leak from old labels.
 */
import type {Site} from '../breach-site.ts';
import {effectiveCondition} from './condition-visual.ts';
export type OutdoorCondition='occupied'|'busy'|'neglected'|'disturbed';
export function outdoorVisualCondition(site:Site):OutdoorCondition|Site['condition']{
 if(site.conditionLevel===undefined)return site.condition;
 const t=effectiveCondition(site);
 return t>=76?'neglected':t>=56?'disturbed':t>=34?'busy':'occupied';
}
