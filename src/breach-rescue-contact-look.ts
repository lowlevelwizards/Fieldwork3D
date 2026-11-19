/** EQA3.9: point the operator at a rescue location they already know.
 * This is a LOOK affordance, not a contact permission or sight reveal.
 * No civilian state/position is consulted; the normal GO-time observation,
 * contact and mission checks remain authoritative.
 */
import type {Pt} from './breach-core.ts';
import {objectiveLocationKnown,type ObjectiveKnowledge}
 from './breach-objective-intel.ts';

export function canOfferKnownRescueLook(
 state:{missionType:string;mission:string;objectiveIntel?:ObjectiveKnowledge;
   scenario:{objective:Pt}},
 at:Pt,currentlyVisible:boolean,physicallyClear:boolean
):boolean{
 if(state.missionType!=='rescue'||state.mission!=='secure'||
    !objectiveLocationKnown(state)||currentlyVisible||!physicallyClear)
   return false;
 const dx=at.x-state.scenario.objective.x;
 const dy=at.y-state.scenario.objective.y;
 return dx*dx+dy*dy<34*34;
}
