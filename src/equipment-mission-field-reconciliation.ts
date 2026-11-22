/** L2.12F3: reconcile a finished Campaign's carried non-HQ field items.
 * Campaign state remains the ONLY persistent owner. Tactical equipment is
 * a detached GO-time manifest and the report is evidence, not new stock.
 *
 * Flashbangs are deliberately excluded: Campaign's existing flashUsed
 * transaction debits SHARED HQ supply exactly once, while the saved flash
 * layout is a requested issue for the next operation, not free ammunition.
 */
import type {MagazineItem} from './breach-magazines.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {FIELD_ITEM_IDS,FIELD_ITEMS,fieldQuantity,fieldCarryReport,
 initialFieldInventory,readFieldInventory,
 type FieldInventory,type FieldItemId} from './equipment-field-inventory.ts';

const SETTLED_ITEMS:readonly FieldItemId[]=['wedge'];
/** Return null when a report is malformed, implies extra stock, or does
 * not fit the existing carrier. Never partially settle an inconsistent kit.
 * Omitted reports are handled by the caller as legacy no-change reports.
 */
export function reconcileCampaignFieldInventory(
 saved:EquipmentLoadout,magazines:readonly MagazineItem[],
 raw:unknown):FieldInventory|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const claim=raw as Partial<FieldInventory>;
 if(claim.version!==1||!Array.isArray(claim.stacks)||
    claim.stacks.length>64)return null;
 // Don't let the tolerant save migration silently turn corrupt mission
 // evidence into a smaller or otherwise different authoritative claim.
 for(const row of claim.stacks){
  if(!row||typeof row!=='object'||!FIELD_ITEM_IDS.includes(row.itemId)||
     !FIELD_ITEMS[row.itemId].usable||
     !FIELD_ITEMS[row.itemId].locations.includes(row.location)||
     !Number.isInteger(row.quantity)||row.quantity<=0)return null;
 }
 const normalized=readFieldInventory(claim,saved);
 for(const id of FIELD_ITEM_IDS)
  if(fieldQuantity(normalized,id)!==fieldQuantity(claim as FieldInventory,id))
   return null;
 const previous=saved.fieldInventory??initialFieldInventory(saved);
 for(const id of SETTLED_ITEMS)
  if(fieldQuantity(normalized,id)>fieldQuantity(previous,id))return null;
 // The requested HQ flash issue remains unchanged, irrespective of how
 // many were thrown or allocated in this particular mission.
 const stacks=normalized.stacks.filter(row=>row.itemId!=='flashbang')
  .map(row=>({...row}));
 for(const row of previous.stacks.filter(row=>row.itemId==='flashbang'))
  stacks.push({...row});
 const settled:FieldInventory={version:1,stacks};
 if(!fieldCarryReport(saved,magazines,settled).valid)return null;
 return settled;
}
/** A compact immutable-in-intent report snapshot for one deployed operator;
 * report capture never leaks live mutability into history/persistence. */
export function captureMissionFieldInventory(
 equipment:EquipmentLoadout|undefined):FieldInventory|undefined{
 if(!equipment)return undefined;
 const inventory=equipment.fieldInventory??initialFieldInventory(equipment);
 return {version:1,stacks:inventory.stacks.map(row=>({...row}))};
}
