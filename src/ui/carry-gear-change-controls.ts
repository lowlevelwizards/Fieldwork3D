/** L2.12C3: one preview-first control for the existing native and modal
 * rig/belt/pack choices. No inventory mutation until the host commits.
 */
import type {MagazineItem} from '../breach-magazines.ts';
import type {EquipmentLoadout} from '../equipment-loadouts.ts';
import {itemDefinition} from '../equipment-catalog.ts';
import {quoteCarryGearChange,previewCarryGearChange,type CarryGearSlot}
 from '../equipment-carry-gear-change.ts';
import {FIELD_CARRY_LOCATIONS,initialFieldInventory,
 type FieldCarryLocation} from '../equipment-field-inventory.ts';
import './loadout-prep.css';
export type CarryGearChoiceOptions={
 select:HTMLSelectElement;host:HTMLElement;slot:CarryGearSlot;
 kit:EquipmentLoadout;magazines:readonly MagazineItem[];
 onApply:(itemId:string)=>void;
 onInspect?:(where:FieldCarryLocation)=>void;
};
const message=(parent:HTMLElement,text:string)=>{
 const p=document.createElement('p');p.textContent=text;parent.append(p);
};
export function attachCarryGearChangePreview(options:CarryGearChoiceOptions){
 const {select,host,slot,kit,magazines}=options;
 const inventory=kit.fieldInventory??initialFieldInventory(kit);
 const panel=document.createElement('section');panel.className='fw-carry-change-preview';
 panel.hidden=true;panel.setAttribute('aria-label','Carry gear change preview');
 const status=document.createElement('div');status.setAttribute('role','status');
 status.className='fw-carry-change-preview-status';
 const details=document.createElement('div');details.className='fw-carry-change-preview-details';
 const actions=document.createElement('div');actions.className='fw-carry-change-preview-actions';
 const apply=document.createElement('button');apply.type='button';
 apply.textContent='APPLY GEAR CHANGE';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='KEEP CURRENT GEAR';
 actions.append(cancel,apply);panel.append(status,details,actions);host.append(panel);
 let candidate:string|null=null;
 const reset=()=>{candidate=null;panel.hidden=true;select.value=kit.slots[slot];};
 cancel.addEventListener('click',()=>{reset();select.focus({preventScroll:true});});
 select.addEventListener('change',()=>{
  const next=select.value;
  // A native select (or Campaign's modal chooser) is only a request.
  // Always leave the saved selection unchanged until APPLY is pressed.
  select.value=kit.slots[slot];
  candidate=next===kit.slots[slot]?null:next;
  if(!candidate){reset();return;}
  const preview=previewCarryGearChange(kit,magazines,slot,candidate,inventory);
  const quote=quoteCarryGearChange(kit,magazines,slot,candidate,inventory);
  panel.hidden=false;details.replaceChildren();
  panel.dataset.fits=String(quote.ok);
  const selectedName=itemDefinition(candidate)?.name??candidate;
  status.textContent=(quote.ok?'READY TO EQUIP: ':'CANNOT EQUIP: ')+selectedName;
  const deltas=FIELD_CARRY_LOCATIONS.map(loc=>{
   const diff=preview.capacityDelta[loc];
   return loc.toUpperCase()+' '+preview.after.used[loc]+'/'+preview.after.capacity[loc]+
    ' SPACES'+(diff?' ('+(diff>0?'+':'')+diff+')':'');
  });
  message(details,'CARRY CAPACITY · '+deltas.join(' · '));
  if(preview.magazineMoves.length)
   message(details,'MAGAZINES · '+preview.magazineMoves.map(x=>
    x.id+' '+x.from.toUpperCase()+' → '+x.to.toUpperCase()).join(' · '));
  if(preview.itemMoves.length)
   message(details,'FIELD ITEMS · '+preview.itemMoves.map(x=>x.quantity+' × '+x.id+
    ' '+x.from.toUpperCase()+' → '+x.to.toUpperCase()).join(' · '));
  if(preview.equipmentMoves.length)
   message(details,'MEDICAL / TOOLS · '+preview.equipmentMoves.map(x=>
    x.id+' '+x.from.toUpperCase()+' → '+x.to.toUpperCase()).join(' · '));
  if(preview.requiresRepack&&quote.ok)
   message(details,'APPLY will reposition the listed equipment as one transaction.');
  if(!quote.ok)message(details,quote.reason);
  else if(!preview.requiresRepack&&!preview.magazineMoves.length&&
   !preview.equipmentMoves.length)
   message(details,'All existing equipment stays in its current carrying location.');
  apply.disabled=!quote.ok;
  options.onInspect?.(slot==='rig'?'rig':slot==='belt'?'belt':'backpack');
 });
 apply.addEventListener('click',()=>{
  if(!candidate)return;
  // Requote from this immutable snapshot; authoritative owner recomputes
  // against current save state before committing.
  if(!quoteCarryGearChange(kit,magazines,slot,candidate,inventory).ok)return;
  const chosen=candidate;
  reset();
  options.onApply(chosen);
 });
 return {reset,panel};
}
