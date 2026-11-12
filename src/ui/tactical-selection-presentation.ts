/** C4: presentation-only selection reconciliation for HUD and palette.
 * A deleted waypoint and an expired active WATCH cannot stay selected.
 * Does not change plan, authoritative aiming or target arming.
 */
import type {Pt} from '../breach-core.ts';
export type TacticalUiSelection={
  selectedNode:number|null;selectedActiveWatch:boolean;
};
export function reconcileTacticalUiSelection(
  input:TacticalUiSelection,
  plan:readonly {id:number}[],
  activeWatchTarget:Pt|null
):TacticalUiSelection{
  return {
    selectedNode:input.selectedNode!==null&&
      plan.some(node=>node.id===input.selectedNode)?
      input.selectedNode:null,
    selectedActiveWatch:input.selectedActiveWatch&&!!activeWatchTarget
  };
}
/** Find the nearest already-disclosed contextual target at the actual editing
 * position, not the route endpoint. Stable tie break, no sorting allocations.
 */
export function nearestPaletteCandidate<T extends {p:Pt}>(
  source:readonly T[],at:Pt,eligible:(item:T)=>boolean,
  maxDistance=34
):T|null{
  let closest:T|null=null,best=maxDistance;
  for(const item of source){
    const d=Math.hypot(item.p.x-at.x,item.p.y-at.y);
    if(d<best&&eligible(item)){closest=item;best=d;}
  }
  return closest;
}
