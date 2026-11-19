/** L2.2 — one touch-first physical field inventory editor for Quick Play
 * and Campaign. Rendering never owns supply, stock or mission authority.
 */
import type {EquipmentLoadout} from '../equipment-loadouts.ts';
import type {MagazineItem} from '../breach-magazines.ts';
import {FIELD_ITEMS,FIELD_ITEM_IDS,FIELD_CARRY_LOCATIONS,fieldQuantity,initialFieldInventory,
 replaceFieldQuantity,moveFieldStack,fieldCarryReport,autoPackFieldInventory,quoteFieldInventoryCopy,
 type FieldInventory,type FieldItemId,type FieldCarryLocation}
 from '../equipment-field-inventory.ts';
import {physicalCarryBoard} from '../equipment-physical-board.ts';
import {quoteSingleFieldTransfer} from '../equipment-field-transfer.ts';
import './loadout-prep.css';

export type FieldGadgetEditorOptions={
 loadout:EquipmentLoadout;magazines:readonly MagazineItem[];
 onCommit:(inventory:FieldInventory)=>void;
 locked?:boolean;
 maxFlash?:number;
 copyTargets?:readonly {id:string;name:string;loadout:EquipmentLoadout;
  magazines:readonly MagazineItem[]}[];
 onCopy?: (targetId:string,inventory:FieldInventory)=>void;
 onUndo?:()=>void;
 canUndo?:boolean;
};
const text=(tag:'div'|'span'|'strong'|'small'|'p',className:string,value:string)=>{
 const el=document.createElement(tag);el.className=className;el.textContent=value;
 return el;
};
const btn=(label:string,action:()=>void)=>{
 const element=document.createElement('button');element.type='button';
 element.textContent=label;element.addEventListener('click',action);return element;
};
export function createFieldGadgetEditor(options:FieldGadgetEditorOptions):HTMLElement{
 const {loadout,magazines,onCommit}=options;
 const inventory=loadout.fieldInventory??initialFieldInventory(loadout);
 const root=document.createElement('section');
 root.className='fw-field-inventory';
 root.setAttribute('aria-label','Physical field inventory');
 const header=text('div','fw-field-inventory-heading','');
 header.append(text('strong','','FIELD EQUIPMENT'),
  text('small','','PHYSICAL QUANTITIES · ACCESS & CAPACITY'));
 root.append(header);
 const report=fieldCarryReport(loadout,magazines,inventory);
 const board=physicalCarryBoard(loadout,magazines,inventory);
 // L2.10A: read-only physical carrying-slot gauges. A gauge is a
 // presentation of the authoritative capacity report, not a second ledger.
 // Selected item is transient UI state, not an inventory or campaign draft.
 let selected:{id:FieldItemId;from:FieldCarryLocation}|null=null;
 const selections:{button:HTMLButtonElement;id:FieldItemId;from:FieldCarryLocation}[]=[];
 const destinations:{button:HTMLButtonElement;location:FieldCarryLocation}[]=[];
 const refreshSelection=()=>{
  for(const entry of selections)entry.button.setAttribute('aria-pressed',
   String(!!selected&&entry.id===selected.id&&entry.from===selected.from));
  for(const entry of destinations){
   const active=!!selected&&entry.location!==selected.from;
   entry.button.hidden=!active;
   if(!active||!selected){entry.button.disabled=true;continue;}
   const quote=quoteSingleFieldTransfer(loadout,magazines,inventory,
    selected.id,selected.from,entry.location);
   entry.button.disabled=!!options.locked||!quote.ok||!quote.changed;
   entry.button.title=quote.ok?'Move one item here':quote.reason;
  }
 };
 const capacity=document.createElement('div');
 capacity.className='fw-field-inventory-capacity';
 capacity.setAttribute('aria-label','Carrying capacity by location');
 // L2.11B: the same four capacity gauges now show their actual carried
 // objects, including magazines, medical and utility gear. Read-only.
 for(const zone of board.zones){
  const loc=zone.location,used=zone.used,limit=zone.capacity;
  const slot=document.createElement('div');
  slot.className='fw-field-inventory-slot';
  if(used>limit)slot.dataset.overfilled='true';
  const title=text('span','fw-field-inventory-slot-name',loc.toUpperCase());
  const count=text('strong','fw-field-inventory-slot-count',used+'/'+limit);
  const gauge=document.createElement('div');
  gauge.className='fw-field-inventory-gauge';
  gauge.setAttribute('role','meter');
  gauge.setAttribute('aria-label',loc.toUpperCase()+' occupied carrying spaces');
  gauge.setAttribute('aria-valuemin','0');
  gauge.setAttribute('aria-valuemax',String(Math.max(1,limit)));
  gauge.setAttribute('aria-valuenow',String(Math.min(Math.max(0,used),Math.max(1,limit))));
  gauge.setAttribute('aria-valuetext',used+' of '+limit+' spaces occupied');
  const fill=document.createElement('span');
  fill.className='fw-field-inventory-gauge-fill';
  fill.style.width=(limit>0?Math.min(100,used/limit*100):used>0?100:0)+'%';
  gauge.append(fill);slot.append(title,count,gauge);
  const items=document.createElement('ul');
  items.className='fw-field-inventory-slot-items';
  items.setAttribute('aria-label',loc.toUpperCase()+' carried equipment');
  for(const tile of zone.items){
   const li=document.createElement('li');
   li.className='fw-field-inventory-carry-tile';
   li.dataset.kind=tile.kind;
   if(tile.itemId)li.dataset.itemId=tile.itemId;
   const silhouette=document.createElement('span');
   silhouette.className='fw-field-inventory-item-silhouette';
   silhouette.setAttribute('aria-hidden','true');
   const itemName=text('span','fw-field-inventory-item-name',tile.label);
   const quantity=text('strong','fw-field-inventory-item-count',
    tile.quantity>1?'×'+tile.quantity:'');
   if(tile.kind==='field'&&tile.itemId){
    const id=tile.itemId;
    const select=btn('',()=>{
     if(options.locked)return;
     selected=selected?.id===id&&selected.from===loc?null:{id,from:loc};
     refreshSelection();
     feedback(selected?'SELECTED ONE '+tile.label.toUpperCase()+
      ' · CHOOSE A HIGHLIGHTED CARRY LOCATION':'SELECTION CLEARED');
    });
    select.className='fw-field-inventory-select-item';
    select.setAttribute('aria-label','Select one '+tile.label+' from '+loc.toUpperCase());
    select.setAttribute('aria-pressed','false');
    select.disabled=!!options.locked;
    select.append(silhouette,itemName,quantity);li.append(select);
    selections.push({button:select,id,from:loc});
   }else li.append(silhouette,itemName,quantity);
   items.append(li);
  }
  if(!zone.items.length){
   const empty=text('li','fw-field-inventory-empty','EMPTY');
   items.append(empty);
  }
  slot.append(items);
  const place=btn('PLACE ONE HERE',()=>{
   if(!selected||options.locked)return;
   const quote=quoteSingleFieldTransfer(loadout,magazines,inventory,
    selected.id,selected.from,loc);
   if(!quote.ok){feedback('CANNOT PLACE · '+quote.reason);return;}
   if(!quote.changed){feedback('ALREADY STORED HERE');return;}
   onCommit(quote.inventory);
  });
  place.className='fw-field-inventory-place';
  place.setAttribute('aria-label','Place selected item in '+loc.toUpperCase());
  place.hidden=true;place.disabled=true;
  destinations.push({button:place,location:loc});slot.append(place);
  capacity.append(slot);
 }
 root.append(capacity);
 if(board.unplaced.length){
  const unplaced=text('div','fw-field-inventory-unplaced',
   'UNFITTED EQUIPMENT · '+board.unplaced.map(t=>t.label).join(' · '));
  root.append(unplaced);
 }
 const message=text('p','fw-field-inventory-feedback',report.valid?
  'Equipment is assigned to real carrying positions.':'CARRY CONFLICT · '+report.conflicts.join(' · '));
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 root.append(message);
 const feedback=(value:string)=>{message.textContent=value;};
 const attempt=(candidate:FieldInventory)=>{
  const checked=fieldCarryReport(loadout,magazines,candidate);
  if(checked.valid){onCommit(candidate);return;}
  const repacked=autoPackFieldInventory(loadout,magazines,candidate);
  if(repacked&&fieldCarryReport(loadout,magazines,repacked).valid){
   onCommit(repacked);return;
  }
  feedback('NO AVAILABLE SPACE · '+checked.conflicts.join(' · '));
 };
 for(const id of ['flashbang','wedge','smoke','frag','door-charge','chem-light'] as FieldItemId[]){
  const item=FIELD_ITEMS[id];
  const enabled=item.usable&&(id!=='wedge'||loadout.slots.utility==='utility-wedge');
  const disabled=!!options.locked||!enabled;
  const current=fieldQuantity(inventory,id);
  const stockCap=id==='flashbang'?Math.max(0,options.maxFlash??item.maxPerOperator):
   item.maxPerOperator;
  const max=Math.min(item.maxPerOperator,stockCap);
  const row=document.createElement('div');row.className='fw-field-inventory-item';
  if(!enabled)row.dataset.unavailable='true';
  const copy=document.createElement('div');copy.className='fw-field-inventory-copy';
  copy.append(text('strong','',item.name),
   text('small','',enabled?item.massKg.toFixed(2)+' kg each · '+item.description:
    id==='wedge'?'Equip Door Wedges in Utility to carry physical wedges':
    'FUTURE EQUIPMENT · NOT YET OPERATIONAL'));
  row.append(copy);
  const controls=document.createElement('div');
  controls.className='fw-field-inventory-controls';
  const down=btn('−',()=>attempt(replaceFieldQuantity(inventory,id,current-1,
   id==='wedge'?'belt':'rig')));
  down.setAttribute('aria-label','Remove one '+item.name);
  down.disabled=disabled||current===0;
  const amount=text('span','fw-field-inventory-quantity','×'+current);
  amount.setAttribute('aria-label',current+' '+item.name+' carried');
  const up=btn('+',()=>attempt(replaceFieldQuantity(inventory,id,current+1,
   id==='wedge'?'belt':'rig')));
  up.setAttribute('aria-label','Add one '+item.name);
  up.disabled=disabled||current>=max;
  controls.append(down,amount,up);row.append(controls);
  if(current&&enabled){
   const placement=document.createElement('select');
   placement.className='fw-field-inventory-location';
   placement.setAttribute('aria-label','Move '+item.name+' to carrying location');
   const unique=new Set(inventory.stacks.filter(s=>s.itemId===id).map(s=>s.location));
   const selected=unique.size===1?[...unique][0]:null;
   if(!selected){
    const option=document.createElement('option');
    option.value='';option.textContent='MIXED PLACEMENT';placement.append(option);
   }
   for(const loc of FIELD_CARRY_LOCATIONS){
    if(!item.locations.includes(loc))continue;
    const option=document.createElement('option');option.value=loc;
    option.textContent=loc.toUpperCase();placement.append(option);
   }
   placement.value=selected??'';
   placement.disabled=!!options.locked;
   placement.addEventListener('change',()=>{
    const to=placement.value as FieldCarryLocation;
    let next=inventory;
    for(const location of FIELD_CARRY_LOCATIONS)
     if(location!==to)next=moveFieldStack(next,id,location,to);
    // Explicit placement never silently repacks to another location.
    const status=fieldCarryReport(loadout,magazines,next);
    if(status.valid)onCommit(next);
    else {placement.value=selected??'';feedback(status.conflicts.join(' · '));}
   });
   row.append(placement);
  }
  root.append(row);
 }
 const actions=document.createElement('div');actions.className='fw-field-inventory-actions';
 const autopack=btn('AUTO PACK',()=>{
  const packed=autoPackFieldInventory(loadout,magazines,inventory);
  if(!packed){
   feedback('AUTO PACK UNAVAILABLE · ADJUST LOAD OR CARRYING EQUIPMENT');
   return;
  }
  // L2.10B: no meaningless mutation, undo entry, stock re-quote or view
  // rebuild when all physical stacks already occupy the preferred slots.
  const same=FIELD_CARRY_LOCATIONS.every(location=>
   FIELD_ITEM_IDS.every(id=>
    inventory.stacks.filter(s=>s.itemId===id&&s.location===location)
     .reduce((total,s)=>total+s.quantity,0)===
    packed.stacks.filter(s=>s.itemId===id&&s.location===location)
     .reduce((total,s)=>total+s.quantity,0)));
  if(same){feedback('ALREADY PACKED · NO CHANGES NEEDED');return;}
  onCommit(packed);
 });
 autopack.disabled=!!options.locked;
 actions.append(autopack);
 if(options.onUndo){
  const undo=btn('UNDO',options.onUndo);
  undo.setAttribute('aria-label','Undo last gadget change');
  undo.disabled=!!options.locked||!options.canUndo;
  actions.append(undo);
 }
 if(options.onCopy&&options.copyTargets?.length){
  const copyArea=document.createElement('div');
  copyArea.className='fw-field-inventory-copy-area';
  const picker=document.createElement('select');
  picker.className='fw-field-inventory-location';
  picker.setAttribute('aria-label','Operator to copy gadgets to');
  const placeholder=document.createElement('option');
  placeholder.value='';placeholder.textContent='COPY GADGETS TO…';picker.append(placeholder);
  for(const target of options.copyTargets){
   const option=document.createElement('option');
   option.value=target.id;option.textContent=target.name.toUpperCase();
   picker.append(option);
  }
  const copyButton=btn('COPY',()=>{
   const target=options.copyTargets?.find(entry=>entry.id===picker.value);
   if(!target)return;
   const quote=quoteFieldInventoryCopy(inventory,target.loadout,target.magazines);
   if(!quote.ok){feedback('CANNOT COPY · '+quote.reason);return;}
   options.onCopy?.(target.id,quote.inventory);
  });
  copyButton.setAttribute('aria-label','Copy carried gadgets to selected operator');
  copyButton.disabled=!!options.locked;
  picker.disabled=!!options.locked;
  copyArea.append(picker,copyButton);root.append(copyArea);
 }
 root.append(actions);
 return root;
}
