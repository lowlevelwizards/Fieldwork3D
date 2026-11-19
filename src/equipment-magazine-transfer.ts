/** L2.12A: quote a single physical magazine move without changing rounds,
 * identity, loaded-magazine state, or campaign/roster ownership.
 * Exact placement must never repack another magazine behind the player's back.
 */
import type {MagazineItem} from './breach-magazines.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {stageMagazines,type MagazineLocation} from './equipment-magazine-placement.ts';
import {fieldCarryReport,initialFieldInventory,type FieldInventory}
 from './equipment-field-inventory.ts';
export type MagazineMoveQuote=
 |{ok:true;changed:boolean;magazines:MagazineItem[]}
 |{ok:false;reason:string};
export function quoteOneMagazineMove(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[],magazineId:string,
 destination:Exclude<MagazineLocation,'overflow'>,
 inventory:FieldInventory=kit.fieldInventory??initialFieldInventory(kit)
):MagazineMoveQuote{
 if(!['rig','belt','pocket','backpack'].includes(destination))
  return {ok:false,reason:'INVALID CARRYING POSITION'};
 const placed=stageMagazines(magazines,kit);
 const picked=placed.find(m=>m.id===magazineId);
 if(!picked)return {ok:false,reason:'MAGAZINE NOT IN THIS OPERATOR KIT'};
 if(picked.location===destination)
  return {ok:true,changed:false,magazines:[...magazines]};
 // Resolve legacy/implicit locations first. Updating only one magazine ID
 // must not allow stageMagazines to silently restage another spare.
 const proposed=placed.map(m=>m.id===magazineId?
  {...m,location:destination}:{...m});
 const actual=stageMagazines(proposed,kit);
 if(actual.some(m=>m.id!==magazineId&&
    m.location!==placed.find(old=>old.id===m.id)?.location))
  return {ok:false,reason:'DESTINATION WOULD MOVE ANOTHER MAGAZINE'};
 if(actual.find(m=>m.id===magazineId)?.location!==destination)
  return {ok:false,reason:'NO AVAILABLE MAGAZINE SPACE AT '+destination.toUpperCase()};
 const fit=fieldCarryReport(kit,actual,inventory);
 if(!fit.valid)return {ok:false,reason:fit.conflicts.join(' · ')};
 return {ok:true,changed:true,magazines:actual};
}
