/** L2.11C — quote an exact-one-item transfer without changing stock.
 * A user-chosen destination is atomic; unlike Auto Pack, it never silently
 * redirects to another carrier. Roster/Campaign adapters remain the commit
 * authority and revalidate supply/phase at the final handoff.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {FIELD_ITEMS,fieldCarryReport,type FieldInventory,
 type FieldCarryLocation,type FieldItemId} from './equipment-field-inventory.ts';

export type FieldTransferResult=
 |{ok:true;inventory:FieldInventory;changed:boolean}
 |{ok:false;reason:string};
export function quoteSingleFieldTransfer(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[],inventory:FieldInventory,
 id:FieldItemId,from:FieldCarryLocation,to:FieldCarryLocation
):FieldTransferResult{
 const item=FIELD_ITEMS[id];
 if(!item?.usable)return {ok:false,reason:'EQUIPMENT NOT OPERATIONAL'};
 if(!item.locations.includes(from)||!item.locations.includes(to))
  return {ok:false,reason:'INVALID CARRY LOCATION FOR '+item.name.toUpperCase()};
 if(id==='wedge'&&kit.slots.utility!=='utility-wedge')
  return {ok:false,reason:'WEDGES REQUIRE THE WEDGE UTILITY'};
 const source=inventory.stacks.find(s=>s.itemId===id&&s.location===from&&s.quantity>0);
 if(!source)return {ok:false,reason:'NO '+item.name.toUpperCase()+' IN '+from.toUpperCase()};
 if(from===to)return {ok:true,inventory,changed:false};
 const stacks=inventory.stacks.map(row=>({...row}));
 const picked=stacks.find(row=>row.itemId===id&&row.location===from)!;
 picked.quantity--;
 if(picked.quantity===0)stacks.splice(stacks.indexOf(picked),1);
 const destination=stacks.find(row=>row.itemId===id&&row.location===to);
 if(destination)destination.quantity++;
 else stacks.push({itemId:id,quantity:1,location:to});
 const candidate:FieldInventory={version:1,stacks};
 const report=fieldCarryReport(kit,magazines,candidate);
 if(!report.valid)return {ok:false,reason:report.conflicts.join(' · ')};
 return {ok:true,inventory:candidate,changed:true};
}
