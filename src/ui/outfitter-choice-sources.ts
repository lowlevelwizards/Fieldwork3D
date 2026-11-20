/** Typed gallery choices shared by Quick Play and Campaign.
 * Campaign's existing HTMLSelectElement implements OutfitterChoiceSource
 * structurally; Quick Play should not create invisible DOM controls to
 * provide the same read-only information.
 * Availability is a view projection; roster/campaign mutations remain owned
 * by their existing equipment authorities.
 */
import {itemsForSlot,LOADOUT_SLOTS} from '../equipment-catalog.ts';
import type {EquipmentLoadout,LoadoutSlot} from '../equipment-loadouts.ts';

export type OutfitterChoiceOption=Readonly<{value:string;disabled:boolean}>;
export type OutfitterChoiceSource=Readonly<{
 value:string;
 options:Iterable<OutfitterChoiceOption>;
}>;

export function catalogOutfitterSources(
 kit:EquipmentLoadout
):Map<LoadoutSlot,OutfitterChoiceSource>{
 const sources=new Map<LoadoutSlot,OutfitterChoiceSource>();
 for(const slot of LOADOUT_SLOTS){
  if(slot==='tactical')continue; // Physical consumables have their own editor.
  sources.set(slot,{
   value:kit.slots[slot],
   options:itemsForSlot(slot).map(item=>({value:item.id,disabled:false}))
  });
 }
 return sources;
}
