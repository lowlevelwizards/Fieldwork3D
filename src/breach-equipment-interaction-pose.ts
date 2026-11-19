/** F6.1 — read-only, fixed-step-observed physical equipment gesture.
 *
 * Uses an already-authorized authored order and the SAME actionTimer and
 * deployed stock quote used by GO. No animation timer, gameplay event,
 * alternative inventory, or predicted expenditure is introduced.
 */
import type {TeamActor} from './breach-game.ts';
import {quoteDeployedFieldUse,type LiveFieldItem}
 from './equipment-deployed-field-use.ts';
import {FIELD_ITEMS,type FieldCarryLocation} from './equipment-field-inventory.ts';

export type EquipmentInteractionPose={
 readonly item:LiveFieldItem;
 readonly location:FieldCarryLocation;
 /** Actual elapsed fixed-step order time; recorded in the film, not animated. */
 readonly elapsed:number;
 readonly duration:number;
 readonly progress:number;
};
type Observation=Pick<TeamActor,'plan'|'actionTimer'|'equipment'|
 'spareMagazines'|'flashCharges'|'wedgeRemaining'|'restraintRemaining'>;
/** No effects for hypothetical, failed, or zero-time planned actions.
 * In F6.1–2 the flash order is the only supported active gesture. This is
 * deliberately narrow; wedge/RESTAIN will be added once door/civilian hand
 * arbitration is verified in their own release stages.
 */
export function readEquipmentInteraction(
 actor:Observation):EquipmentInteractionPose|null{
 const order=actor.plan[0];
 if(order?.kind!=='flash'||!order.aimPoint||!(actor.actionTimer>0)||
  !Number.isFinite(actor.actionTimer))return null;
 const quote=quoteDeployedFieldUse(actor,'flashbang');
 if(!quote.available||!quote.location||
  !FIELD_ITEMS.flashbang.locations.includes(quote.location)||
  !Number.isFinite(quote.accessSeconds))
  return null;
 const duration=.3+quote.accessSeconds;
 return {item:'flashbang',location:quote.location,elapsed:actor.actionTimer,
  duration,progress:Math.max(0,Math.min(1,actor.actionTimer/duration))};
}
export type EquipmentGesture={
 /** Ease into the real source socket, then lift to a compact throw prep. */
 readonly reach:number;
 readonly lift:number;
 /** One physical hand-held prop, withheld before contact and on GO success. */
 readonly inHand:boolean;
};
/** Pure and seek-invariant: no previous-frame state or counter writes. */
export function sampleEquipmentGesture(p:EquipmentInteractionPose):EquipmentGesture{
 const t=Math.max(0,Math.min(1,p.progress));
 const ease=(a:number,b:number)=>{
  const n=Math.max(0,Math.min(1,(t-a)/(b-a)));
  return n*n*(3-2*n);
 };
 return {reach:ease(0,.42),lift:ease(.42,.78),
  inHand:t>=.42&&t<1};
}
