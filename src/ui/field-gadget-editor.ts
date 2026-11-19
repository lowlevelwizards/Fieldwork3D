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
import {quoteOneMagazineMove} from '../equipment-magazine-transfer.ts';
import './loadout-prep.css';

export type FieldGadgetEditorOptions={
 loadout:EquipmentLoadout;magazines:readonly MagazineItem[];
 onCommit:(inventory:FieldInventory,focusLabel?:string)=>void;
 /** Optional preview-only feedback; never authorizes or changes equipment. */
 onInspectLocation?:(location:FieldCarryLocation)=>void;
 onMoveMagazine?:(magazineId:string,to:FieldCarryLocation,focusLabel?:string)=>void;
 locked?:boolean;
 maxFlash?:number;
 copyTargets?:readonly {id:string;name:string;loadout:EquipmentLoadout;
  magazines:readonly MagazineItem[]}[];
 onCopy?: (targetId:string,inventory:FieldInventory)=>void;
 onUndo?:()=>void;
 canUndo?:boolean;
};
const text=(tag:'div'|'span'|'strong'|'small'|'p'|'li',className:string,value:string)=>{
 const el=document.createElement(tag);el.className=className;el.textContent=value;
 return el;
};
const btn=(label:string,action:()=>void)=>{
 const element=document.createElement('button');element.type='button';
 element.textContent=label;element.addEventListener('click',action);return element;
};
type PhysicalChoice=
 |{kind:'field';id:FieldItemId;from:FieldCarryLocation}
 |{kind:'magazine';id:string;from:FieldCarryLocation};
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
 let selected:PhysicalChoice|null=null;
 const selections:{button:HTMLButtonElement;choice:PhysicalChoice}[]=[];
 const destinations:{button:HTMLButtonElement;location:FieldCarryLocation}[]=[];
 const refreshSelection=()=>{
  for(const entry of selections)entry.button.setAttribute('aria-pressed',
   String(!!selected&&entry.choice.kind===selected.kind&&
    entry.choice.id===selected.id&&entry.choice.from===selected.from));
  for(const entry of destinations){
   const active=!!selected&&entry.location!==selected.from;
   entry.button.hidden=!active;
   const parent=entry.button.closest<HTMLElement>('.fw-field-inventory-slot');
   if(!active||!selected){
    entry.button.disabled=true;
    if(parent)delete parent.dataset.placeStatus;
    continue;
   }
   const quote=selected.kind==='field'?
    quoteSingleFieldTransfer(loadout,magazines,inventory,
     selected.id,selected.from,entry.location):
    quoteOneMagazineMove(loadout,magazines,selected.id,entry.location,inventory);
   const allowed=quote.ok&&quote.changed;
   entry.button.disabled=!!options.locked||!allowed;
   entry.button.textContent=allowed?'PLACE ONE HERE':'CANNOT FIT HERE';
   entry.button.title=quote.ok?'Move one item here':quote.reason;
   if(parent)parent.dataset.placeStatus=allowed?'ready':'blocked';
  }
  cancelSelection.hidden=!selected;
 };
 const placeOne=(choice:PhysicalChoice,to:FieldCarryLocation)=>{
  if(options.locked)return;
  if(choice.kind==='magazine'){
   const quote=quoteOneMagazineMove(loadout,magazines,choice.id,to,inventory);
   if(!quote.ok){feedback('CANNOT PLACE · '+quote.reason);return;}
   if(!quote.changed){feedback('ALREADY STORED HERE');return;}
   options.onInspectLocation?.(to);
   options.onMoveMagazine?.(choice.id,to,'Select magazine '+choice.id+
    ' from '+to.toUpperCase());
   return;
  }
  const quote=quoteSingleFieldTransfer(loadout,magazines,inventory,
   choice.id,choice.from,to);
  if(!quote.ok){feedback('CANNOT PLACE · '+quote.reason);return;}
  if(!quote.changed){feedback('ALREADY STORED HERE');return;}
  options.onInspectLocation?.(to);
  onCommit(quote.inventory,'Select one '+FIELD_ITEMS[choice.id].name+
   ' from '+to.toUpperCase());
 };
 // One drag implementation for individually identified magazines and
 // physical field pieces; touch scrolling remains free outside the grip.
 const bindPhysicalDrag=(select:HTMLButtonElement,choice:PhysicalChoice,label:string)=>{
  const grip=document.createElement('span');
  grip.className='fw-field-inventory-drag-grip';
  grip.setAttribute('aria-hidden','true');
  grip.title='Drag one '+(choice.kind==='magazine'?'magazine':'item')+
   ' to another carrying location';
  grip.textContent='⠿';
  let start:{pointer:number;x:number;y:number}|null=null;
  let ghost:HTMLElement|null=null,dragged=false,suppressClick=false;
  const cleanup=()=>{
   ghost?.remove();ghost=null;
   capacity.querySelectorAll<HTMLElement>('[data-drag-target]').forEach(
    node=>delete node.dataset.dragTarget);
   start=null;dragged=false;
  };
  select.addEventListener('pointerdown',event=>{
   if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;
   if(event.pointerType==='touch'&&!(event.target instanceof Element&&
    event.target.closest('.fw-field-inventory-drag-grip')))return;
   start={pointer:event.pointerId,x:event.clientX,y:event.clientY};
   dragged=false;try{select.setPointerCapture(event.pointerId)}catch{/* optional */}
  });
  select.addEventListener('pointermove',event=>{
   if(!start||event.pointerId!==start.pointer)return;
   if(!dragged&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<10)return;
   if(!dragged){
    dragged=true;
    ghost=document.createElement('div');
    ghost.className='fw-field-inventory-drag-ghost';
    ghost.textContent='1 × '+label.toUpperCase();
    ghost.setAttribute('aria-hidden','true');
    document.body.append(ghost);
   }
   if(ghost){
    ghost.style.left=(event.clientX+12)+'px';
    ghost.style.top=(event.clientY+12)+'px';
   }
   capacity.querySelectorAll<HTMLElement>('[data-drag-target]').forEach(
    node=>delete node.dataset.dragTarget);
   const hit=document.elementFromPoint(event.clientX,event.clientY);
   const zone=hit?.closest<HTMLElement>('.fw-field-inventory-slot[data-location]');
   if(zone&&zone.dataset.location!==choice.from)zone.dataset.dragTarget='true';
  });
  select.addEventListener('pointerup',event=>{
   if(!start||event.pointerId!==start.pointer)return;
   const wasDragging=dragged;
   const hit=wasDragging?document.elementFromPoint(event.clientX,event.clientY):null;
   const destination=hit?.closest<HTMLElement>('.fw-field-inventory-slot[data-location]')
    ?.dataset.location as FieldCarryLocation|undefined;
   cleanup();
   if(!wasDragging)return;
   suppressClick=true;
   window.setTimeout(()=>{suppressClick=false;},0);
   if(destination)placeOne(choice,destination);
   else feedback('PLACEMENT CANCELLED · NO KIT CHANGES');
  });
  select.addEventListener('pointercancel',cleanup);
  select.addEventListener('lostpointercapture',cleanup);
  return {grip,consumeClick:()=>{
   if(!suppressClick)return false;
   suppressClick=false;return true;
  }};
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
  slot.dataset.location=loc;
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
   if(tile.magazineId){
    li.dataset.magazineId=tile.magazineId;
    li.title='Individual spare magazine · '+tile.label+
     ' · '+(tile.accessSeconds??0).toFixed(2)+'s carry access';
   }
   const silhouette=document.createElement('span');
   silhouette.className='fw-field-inventory-item-silhouette';
   silhouette.setAttribute('aria-hidden','true');
   const itemName=text('span','fw-field-inventory-item-name',tile.label);
   const quantity=text('strong','fw-field-inventory-item-count',
    tile.quantity>1?'×'+tile.quantity:'');
   if(tile.kind==='field'&&tile.itemId){
    const id=tile.itemId,choice:PhysicalChoice={kind:'field',id,from:loc};
    let consumeClick=()=>false;
    const select=btn('',()=>{
     if(consumeClick()||options.locked)return;
     selected=selected?.kind==='field'&&selected.id===id&&selected.from===loc?
      null:choice;
     if(selected)options.onInspectLocation?.(loc);
     refreshSelection();
     feedback(selected?'SELECTED ONE '+tile.label.toUpperCase()+
      ' · CHOOSE A GREEN DESTINATION OR CANCEL':'SELECTION CLEARED');
    });
    select.className='fw-field-inventory-select-item';
    const drag=bindPhysicalDrag(select,choice,tile.label);
    consumeClick=drag.consumeClick;
    select.setAttribute('aria-label','Select one '+tile.label+' from '+loc.toUpperCase());
    select.setAttribute('aria-pressed','false');
    select.disabled=!!options.locked;
    select.append(silhouette,itemName,quantity,drag.grip);li.append(select);
    selections.push({button:select,choice});
   }else if(tile.kind==='magazine'&&tile.magazineId&&options.onMoveMagazine){
    const id=tile.magazineId,choice:PhysicalChoice={kind:'magazine',id,from:loc};
    let consumeClick=()=>false;
    const select=btn('',()=>{
     if(consumeClick()||options.locked)return;
     selected=selected?.kind==='magazine'&&selected.id===id&&
      selected.from===loc?null:choice;
     if(selected)options.onInspectLocation?.(loc);
     refreshSelection();
     feedback(selected?'SELECTED '+tile.label.toUpperCase()+
      ' · CHOOSE A GREEN DESTINATION OR CANCEL':'SELECTION CLEARED');
    });
    select.className='fw-field-inventory-select-item fw-field-inventory-select-magazine';
    const drag=bindPhysicalDrag(select,choice,tile.label);
    consumeClick=drag.consumeClick;
    select.setAttribute('aria-label','Select magazine '+id+' from '+loc.toUpperCase());
    select.setAttribute('aria-pressed','false');
    select.disabled=!!options.locked;
    select.append(silhouette,itemName,quantity,drag.grip);li.append(select);
    selections.push({button:select,choice});
   }else if(tile.kind==='medical'||tile.kind==='utility'){
    // These are existing physical kit records, not countable gadgets.
    // Inspection is read-only; no movement command has been authorized.
    const spaces=tile.spaces+' '+(tile.spaces===1?'SPACE':'SPACES');
    const access=tile.accessSeconds;
    const detail=spaces+(typeof access==='number'?
     ' · '+access.toFixed(2)+'s ACCESS':'');
    li.dataset.inspectionOnly='true';
    const inspectLabel='Inspect '+tile.label+' in '+loc.toUpperCase();
    if(options.onInspectLocation){
     const inspect=btn('',()=>{
      options.onInspectLocation?.(loc);
      feedback(tile.label.toUpperCase()+' · '+detail+' · LOCATION FIXED');
     });
     inspect.className='fw-field-inventory-inspect-fixed';
     inspect.setAttribute('aria-label',inspectLabel);
     const copy=text('span','fw-field-inventory-fixed-copy','');
     copy.append(itemName,text('small','fw-field-inventory-fixed-meta',detail));
     inspect.append(silhouette,copy);
     li.append(inspect);
    }else{
     const copy=text('span','fw-field-inventory-fixed-copy','');
     copy.append(itemName,text('small','fw-field-inventory-fixed-meta',detail));
     li.append(silhouette,copy);
    }
   }else li.append(silhouette,itemName,quantity);
   items.append(li);
  }
  if(!zone.items.length){
   const empty=text('li','fw-field-inventory-empty','EMPTY');
   items.append(empty);
  }
  slot.append(items);
  const place=btn('PLACE ONE HERE',()=>{
   if(selected)placeOne(selected,loc);
  });
  place.className='fw-field-inventory-place';
  place.setAttribute('aria-label','Place selected item in '+loc.toUpperCase());
  place.hidden=true;place.disabled=true;
  destinations.push({button:place,location:loc});slot.append(place);
  capacity.append(slot);
 }
 root.append(capacity);
 const cancelSelection=btn('CANCEL PLACEMENT',()=>{
  selected=null;refreshSelection();feedback('PLACEMENT CANCELLED · NO KIT CHANGES');
 });
 cancelSelection.className='fw-field-inventory-cancel';
 cancelSelection.setAttribute('aria-label','Cancel selected item placement');
 cancelSelection.hidden=true;root.append(cancelSelection);
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
