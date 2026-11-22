/** L2.2 — one touch-first physical field inventory editor for Quick Play
 * and Campaign. Rendering never owns supply, stock or mission authority.
 */
import type {EquipmentLoadout} from '../equipment-loadouts.ts';
import type {MagazineItem} from '../breach-magazines.ts';
import {FIELD_ITEMS,FIELD_ITEM_IDS,FIELD_CARRY_LOCATIONS,fieldQuantity,initialFieldInventory,readFieldInventory,
 replaceFieldQuantity,moveFieldStack,fieldCarryReport,autoPackFieldInventory,quoteFieldInventoryCopy,
 type FieldInventory,type FieldItemId,type FieldCarryLocation}
 from '../equipment-field-inventory.ts';
import {physicalCarryBoard} from '../equipment-physical-board.ts';
import type {EquipmentInspectionTarget} from '../equipment-visual-inspection.ts';
import {quoteSingleFieldTransfer} from '../equipment-field-transfer.ts';
import {quoteOneMagazineMove} from '../equipment-magazine-transfer.ts';
import {quoteCarryLayoutCopy} from '../equipment-carry-layout-copy.ts';
import './loadout-prep.css';

export type FieldGadgetEditorOptions={
 loadout:EquipmentLoadout;magazines:readonly MagazineItem[];
 onCommit:(inventory:FieldInventory,focusLabel?:string)=>void;
 /** Optional preview-only feedback; never authorizes or changes equipment. */
 onInspectLocation?:(location:FieldCarryLocation)=>void;
 /** Select the REAL visible item mesh; concealed inventory has no proxy. */
 onInspectItem?:(item:EquipmentInspectionTarget)=>void;
 /** Real model thumbnail supplied by shared 3D preview; never stock authority. */
 onModelThumbnail?:(item:EquipmentInspectionTarget)=>string|null;
 onMoveMagazine?:(magazineId:string,to:FieldCarryLocation,focusLabel?:string)=>void;
 locked?:boolean;
 maxFlash?:number;
 /** HQ reserves constrain the number of newly carried items. The already
  * carried pieces are not debited again merely for moving/inspecting them. */
 maxWedges?:number;maxCuffs?:number;
 copyTargets?:readonly {id:string;name:string;loadout:EquipmentLoadout;
  magazines:readonly MagazineItem[]}[];
 onCopy?: (targetId:string,inventory:FieldInventory)=>void;
 /** Copy placements only; source cannot issue destination stock or ammo. */
 onCopyLayout?:(targetId:string)=>void;
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
 const inventory=readFieldInventory(loadout.fieldInventory,loadout);
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
 const previewRequests:{host:HTMLElement;target:EquipmentInspectionTarget}[]=[];
 const destinations:{button:HTMLButtonElement;location:FieldCarryLocation;reason:HTMLElement}[]=[];
 const moveTray=document.createElement('section');
 moveTray.className='fw-field-inventory-move-tray';
 moveTray.setAttribute('aria-label','Selected item and carrying destination');
 moveTray.hidden=true;
 const moveTitle=text('strong','fw-field-inventory-move-title','');
 const moveChoices=document.createElement('div');
 moveChoices.className='fw-field-inventory-move-choices';
 const quickDestinations:{button:HTMLButtonElement;location:FieldCarryLocation}[]=[];
 const paperDestinations:{button:HTMLButtonElement;location:FieldCarryLocation}[]=[];
 moveTray.append(moveTitle,moveChoices);
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
    entry.reason.hidden=true;
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
   entry.reason.textContent=quote.ok?'':quote.reason;
   entry.reason.hidden=allowed||quote.ok;
   if(parent)parent.dataset.placeStatus=allowed?'ready':'blocked';
  }
  cancelSelection.hidden=!selected;
  moveTray.hidden=!selected;
  if(selected){
   moveTitle.textContent='MOVE '+(selected.kind==='field'?
    FIELD_ITEMS[selected.id].name.toUpperCase():'SELECTED MAGAZINE')+
    ' · '+selected.from.toUpperCase()+' →';
  }
  for(const entry of paperDestinations){
   const choice=selected,active=!!choice&&choice.from!==entry.location;
   const quote=!active||!choice?null:choice.kind==='field'?
    quoteSingleFieldTransfer(loadout,magazines,inventory,
     choice.id,choice.from,entry.location):
    quoteOneMagazineMove(loadout,magazines,choice.id,entry.location,inventory);
   const valid=!!quote?.ok&&!!quote.changed&&!options.locked;
   entry.button.dataset.fit=!choice?'idle':valid?'yes':'no';
   entry.button.title=!choice?'Inspect '+entry.location+' carry location':
    valid?'Place selected item on '+entry.location:
    quote&&!quote.ok?quote.reason:'Already carrying here';
  }
  for(const entry of quickDestinations){
   const choice=selected;
   const active=!!choice&&choice.from!==entry.location;
   const quote=!active||!choice?null:choice.kind==='field'?
    quoteSingleFieldTransfer(loadout,magazines,inventory,
     choice.id,choice.from,entry.location):
    quoteOneMagazineMove(loadout,magazines,choice.id,entry.location,inventory);
   const valid=!!quote?.ok&&!!quote.changed;
   entry.button.disabled=!!options.locked||!valid;
   entry.button.dataset.fit=valid?'yes':'no';
   entry.button.textContent=entry.location.toUpperCase();
   entry.button.title=quote&&!quote.ok?quote.reason:
    valid?'Move one item to '+entry.location:active?'Not available':'Current location';
  }
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
 for(const location of FIELD_CARRY_LOCATIONS){
  const control=btn(location.toUpperCase(),()=>{
   if(selected)placeOne(selected,location);
  });
  control.className='fw-field-inventory-move-destination';
  control.disabled=true;
  moveChoices.append(control);
  quickDestinations.push({button:control,location});
 }
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
   root.querySelectorAll<HTMLElement>('[data-drag-target]').forEach(
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
   root.querySelectorAll<HTMLElement>('[data-drag-target]').forEach(
    node=>delete node.dataset.dragTarget);
   const hit=document.elementFromPoint(event.clientX,event.clientY);
   const zone=hit?.closest<HTMLElement>('.fw-field-inventory-slot[data-location], .fw-carry-bodymap-zone[data-location]');
   if(zone&&zone.dataset.location!==choice.from)zone.dataset.dragTarget='true';
  });
  select.addEventListener('pointerup',event=>{
   if(!start||event.pointerId!==start.pointer)return;
   const wasDragging=dragged;
   const hit=wasDragging?document.elementFromPoint(event.clientX,event.clientY):null;
   const destination=hit?.closest<HTMLElement>('.fw-field-inventory-slot[data-location], .fw-carry-bodymap-zone[data-location]')
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
 root.dataset.activeLocation=board.zones[0]?.location??'rig';
 const locationNav=document.createElement('nav');
 locationNav.className='fw-field-inventory-zones';
 locationNav.setAttribute('aria-label','Inspect equipment carrying locations');
 for(const zone of board.zones){
  const jump=btn(zone.location.toUpperCase()+' · '+zone.used+'/'+zone.capacity,()=>{
   root.dataset.activeLocation=zone.location;
   for(const button of locationNav.querySelectorAll<HTMLButtonElement>('button'))
    button.setAttribute('aria-current',String(button.dataset.location===zone.location));
   options.onInspectLocation?.(zone.location);
  });
  jump.className='fw-field-inventory-zone-jump';
  jump.dataset.location=zone.location;
  jump.setAttribute('aria-current',String(zone.location===root.dataset.activeLocation));
  locationNav.append(jump);
 }
 // Body-map and slot list are two views of the SAME capacity and transfer
 // authority. No additional inventory state, phantom slots or auto-repacking.
 const map=document.createElement('details');
 map.className='fw-carry-bodymap';
 const mapDisclosure=document.createElement('summary');
 mapDisclosure.className='fw-carry-bodymap-toggle';
 mapDisclosure.textContent='OPTIONAL · PRECISE BODY MAP';
 map.append(mapDisclosure);
 map.setAttribute('aria-label','Interactive front and back carrying map');
 map.dataset.view='front';
 const mapHeader=document.createElement('div');
 mapHeader.className='fw-carry-bodymap-header';
 const mapTitle=text('strong','','CARRY MAP');
 const mapHint=text('small','','SELECT AN ITEM, THEN TAP A HIGHLIGHTED LOCATION');
 const mapView=document.createElement('div');
 mapView.className='fw-carry-bodymap-views';
 for(const side of ['front','back'] as const){
  const flip=btn(side.toUpperCase(),()=>{
   map.dataset.view=side;
   for(const control of mapView.querySelectorAll<HTMLButtonElement>('button'))
    control.setAttribute('aria-pressed',String(control.dataset.view===side));
   options.onInspectLocation?.(side==='back'?'backpack':'rig');
  });
  flip.dataset.view=side;
  flip.setAttribute('aria-pressed',String(side==='front'));
  flip.setAttribute('aria-label','Show '+side+' carry positions');
  mapView.append(flip);
 }
 mapHeader.append(mapTitle,mapHint,mapView);
 map.append(mapHeader);
 const figure=document.createElement('div');
 figure.className='fw-carry-bodymap-figure';
 const silhouette=document.createElementNS('http://www.w3.org/2000/svg','svg');
 silhouette.setAttribute('viewBox','0 0 170 235');
 silhouette.setAttribute('aria-hidden','true');
 silhouette.classList.add('fw-carry-bodymap-silhouette');
 const body=document.createElementNS('http://www.w3.org/2000/svg','path');
 body.setAttribute('d','M70 13 Q85 1 100 13 L103 33 L94 44 L108 50 L128 63 L145 128 L130 134 L107 94 L106 139 L101 224 L82 224 L84 147 L77 147 L73 224 L54 224 L51 139 L52 94 L29 134 L15 128 L32 63 L62 44 L67 33 Z');
 body.setAttribute('fill','#354a3e');
 body.setAttribute('stroke','#95ad9b');
 body.setAttribute('stroke-width','2');
 silhouette.append(body);figure.append(silhouette);
 for(const zone of board.zones){
  const location=zone.location;
  const place=btn('',()=>{
   if(selected&&selected.from!==location){
    const quote=selected.kind==='field'?
     quoteSingleFieldTransfer(loadout,magazines,inventory,
      selected.id,selected.from,location):
     quoteOneMagazineMove(loadout,magazines,selected.id,location,inventory);
    if(quote.ok&&quote.changed&&!options.locked){placeOne(selected,location);return;}
    feedback(quote.ok?'ALREADY STORED HERE':'CANNOT PLACE · '+quote.reason);
    return;
   }
   locationNav.querySelector<HTMLButtonElement>(
    '[data-location="'+location+'"]')?.click();
  });
  place.className='fw-carry-bodymap-zone';
  place.dataset.location=location;
  place.dataset.side=location==='backpack'?'back':'front';
  const label=document.createElement('strong');
  label.textContent=location.toUpperCase()+' · '+zone.used+'/'+zone.capacity;
  const icons=document.createElement('span');
  icons.className='fw-carry-bodymap-icons';
  const symbol=(kind:string)=>kind==='magazine'?'▥':
   kind==='medical'?'✚':kind==='utility'?'⚙':'✦';
  icons.textContent=zone.items.length?
   zone.items.slice(0,5).map(item=>symbol(item.kind)).join(' '):'EMPTY';
  place.append(label,icons);
  place.setAttribute('aria-label',location.toUpperCase()+', '+zone.used+
   ' of '+zone.capacity+' spaces used. Tap to inspect or place selected item');
  place.title=location+' carrying position';
  figure.append(place);paperDestinations.push({button:place,location});
 }
 map.append(figure);
 // The body diagram is OPTIONAL, not an extra mandatory page. The real
 // location tabs and selected item/destination choices are the fast path.
 root.append(locationNav,moveTray);
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
  const inspectTile=(kind:'field'|'magazine'|'medical'|'utility',
   id:string,location:FieldCarryLocation,index=0)=>{
   if(options.onInspectItem)options.onInspectItem({kind,id,location,index});
   else options.onInspectLocation?.(location);
  };
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
   const model=document.createElement('span');
   model.className='fw-field-inventory-model';
   model.setAttribute('aria-hidden','true');
   model.append(silhouette);
   const target:EquipmentInspectionTarget={
    kind:tile.kind,id:tile.itemId??tile.id,location:loc,
    index:zone.items.filter(item=>item.kind===tile.kind)
     .findIndex(item=>item.id===tile.id)
   };
   if(options.onModelThumbnail)previewRequests.push({host:model,target});
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
     if(selected)inspectTile('field',id,loc);
     refreshSelection();
     // The selected item is already in the visible drawer; never scroll
     // the entire screen or expand the secondary body map automatically.
     feedback(selected?'SELECTED ONE '+tile.label.toUpperCase()+
      ' · CHOOSE A GREEN DESTINATION OR CANCEL':'SELECTION CLEARED');
    });
    select.className='fw-field-inventory-select-item';
    const drag=bindPhysicalDrag(select,choice,tile.label);
    consumeClick=drag.consumeClick;
    select.setAttribute('aria-label','Select one '+tile.label+' from '+loc.toUpperCase());
    select.setAttribute('aria-pressed','false');
    select.disabled=!!options.locked;
    select.append(model,itemName,quantity,drag.grip);li.append(select);
    selections.push({button:select,choice});
   }else if(tile.kind==='magazine'&&tile.magazineId&&options.onMoveMagazine){
    const id=tile.magazineId,choice:PhysicalChoice={kind:'magazine',id,from:loc};
    let consumeClick=()=>false;
    const select=btn('',()=>{
     if(consumeClick()||options.locked)return;
     selected=selected?.kind==='magazine'&&selected.id===id&&
      selected.from===loc?null:choice;
     if(selected)inspectTile('magazine',id,loc,
      zone.items.filter(t=>t.kind==='magazine').findIndex(t=>t.magazineId===id));
     refreshSelection();
     // Native list stays in place; destination rail becomes the action.
     feedback(selected?'SELECTED '+tile.label.toUpperCase()+
      ' · CHOOSE A GREEN DESTINATION OR CANCEL':'SELECTION CLEARED');
    });
    select.className='fw-field-inventory-select-item fw-field-inventory-select-magazine';
    const drag=bindPhysicalDrag(select,choice,tile.label);
    consumeClick=drag.consumeClick;
    select.setAttribute('aria-label','Select magazine '+id+' from '+loc.toUpperCase());
    select.setAttribute('aria-pressed','false');
    select.disabled=!!options.locked;
    select.append(model,itemName,quantity,drag.grip);li.append(select);
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
    if(options.onInspectLocation||options.onInspectItem){
     const inspect=btn('',()=>{
      inspectTile(tile.kind,tile.id,loc);
      feedback(tile.label.toUpperCase()+' · '+detail+' · LOCATION FIXED');
     });
     inspect.className='fw-field-inventory-inspect-fixed';
     inspect.setAttribute('aria-label',inspectLabel);
     const copy=text('span','fw-field-inventory-fixed-copy','');
     copy.append(itemName,text('small','fw-field-inventory-fixed-meta',detail));
     inspect.append(model,copy);
     li.append(inspect);
    }else{
     const copy=text('span','fw-field-inventory-fixed-copy','');
     copy.append(itemName,text('small','fw-field-inventory-fixed-meta',detail));
     li.append(model,copy);
    }
   }else li.append(model,itemName,quantity);
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
  const reason=text('small','fw-field-inventory-blocker','');
  reason.hidden=true;
  destinations.push({button:place,location:loc,reason});
  slot.append(place,reason);
  capacity.append(slot);
 }
 root.append(capacity,map);
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
 const issue=document.createElement('details');
 issue.className='fw-field-inventory-issue';
 const issueLabel=document.createElement('summary');
 issueLabel.textContent='ISSUE / RETURN CONSUMABLES';
 issue.append(issueLabel);root.append(issue);
 // Show actually usable items; inactive catalog futures live in one disclosure,
 // never compete for equal-size controls or create false inventory actions.
 for(const id of FIELD_ITEM_IDS.filter(id=>FIELD_ITEMS[id].usable)){
  const item=FIELD_ITEMS[id];
  const enabled=item.usable&&(id!=='wedge'||loadout.slots.utility==='utility-wedge');
  const disabled=!!options.locked||!enabled;
  const current=fieldQuantity(inventory,id);
  const stockCap=id==='flashbang'?Math.max(0,options.maxFlash??item.maxPerOperator):
   id==='wedge'?current+Math.max(0,options.maxWedges??item.maxPerOperator):
   id==='zip-tie'?current+Math.max(0,options.maxCuffs??item.maxPerOperator):
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
  if(id==='wedge'||id==='zip-tie'){
   const available=id==='wedge'?options.maxWedges:options.maxCuffs;
   up.title=available===0?'OUT OF HQ STOCK · PURCHASE IN LOGISTICS':
    available===undefined?'CAMPAIGN STOCK UNKNOWN':
    available+' HQ '+(id==='wedge'?'WEDGES':'FLEX CUFFS')+' AVAILABLE';
   row.dataset.stock=String(available??0);
  }
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
  issue.append(row);
 }
 const advanced=document.createElement('details');
 advanced.className='fw-field-inventory-advanced';
 const advancedLabel=document.createElement('summary');
 advancedLabel.textContent='AUTO PACK / UNDO / SQUAD TOOLS';
 advanced.append(advancedLabel);root.append(advanced);
 const future=document.createElement('details');
 future.className='fw-field-inventory-future';
 const futureItems=FIELD_ITEM_IDS.filter(id=>!FIELD_ITEMS[id].usable&&
  id!=='zip-tie');
 const futureHeading=document.createElement('summary');
 futureHeading.textContent='FUTURE EQUIPMENT · '+futureItems.length+' NOT YET AVAILABLE';
 future.append(futureHeading);
 for(const id of futureItems){
  const item=FIELD_ITEMS[id];
  const note=text('p','',item.name+' · '+item.description);
  future.append(note);
 }
 if(futureItems.length)advanced.append(future);
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
 if((options.onCopy||options.onCopyLayout)&&options.copyTargets?.length){
  const copyArea=document.createElement('details');
  copyArea.className='fw-field-inventory-copy-area';
  const copyHeading=document.createElement('summary');
  copyHeading.textContent='SQUAD COPY · GADGETS & CARRY LAYOUT';
  copyArea.append(copyHeading);
  const copyInner=document.createElement('div');
  copyInner.className='fw-field-inventory-copy-inner';
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
  if(options.onCopy){
   const copyButton=btn('COPY GADGETS',()=>{
    const target=options.copyTargets?.find(entry=>entry.id===picker.value);
    if(!target)return;
    const quote=quoteFieldInventoryCopy(inventory,target.loadout,target.magazines);
    if(!quote.ok){feedback('CANNOT COPY · '+quote.reason);return;}
    options.onCopy?.(target.id,quote.inventory);
   });
   copyButton.setAttribute('aria-label','Copy carried gadgets to selected operator');
   copyButton.disabled=!!options.locked;
   copyInner.append(copyButton);
  }
  if(options.onCopyLayout){
   const inspect=btn('PREVIEW CARRY LAYOUT',()=>{
    const target=options.copyTargets?.find(entry=>entry.id===picker.value);
    if(!target){feedback('SELECT A TARGET OPERATOR FIRST');return;}
    const quote=quoteCarryLayoutCopy(loadout,magazines,target.loadout,target.magazines);
    detail.hidden=false;
    confirm.hidden=true;
    if(!quote.ok){
     detail.textContent='CANNOT COPY LAYOUT · '+quote.reason;
     return;
    }
    if(!quote.changed){
     detail.textContent='ALREADY MATCHES · NO CARRY MOVES NEEDED';
     return;
    }
    detail.textContent='COPY POSITIONS ONLY TO '+target.name.toUpperCase()+
     ' · '+quote.moves.map(move=>move.quantity+' × '+move.label+
      ' '+move.from.toUpperCase()+' → '+move.to.toUpperCase()).join(' · ')+
     ' · MAGAZINE IDENTITIES, ROUNDS AND STOCK WILL NOT CHANGE';
    confirm.hidden=false;
    pendingTarget=target.id;
   });
   inspect.setAttribute('aria-label','Preview carrying layout copy to selected operator');
   inspect.disabled=!!options.locked;
   let pendingTarget:string|null=null;
   const detail=text('p','fw-field-inventory-layout-preview','');
   detail.hidden=true;detail.setAttribute('role','status');
   const confirm=btn('APPLY LAYOUT COPY',()=>{
    const target=options.copyTargets?.find(entry=>
     entry.id===pendingTarget&&entry.id===picker.value);
    if(!target){detail.textContent='TARGET CHANGED · PREVIEW AGAIN';confirm.hidden=true;return;}
    const quote=quoteCarryLayoutCopy(loadout,magazines,target.loadout,target.magazines);
    if(!quote.ok||!quote.changed){
     detail.textContent=quote.ok?'LAYOUT ALREADY MATCHES':'CANNOT COPY · '+quote.reason;
     confirm.hidden=true;return;
    }
    confirm.hidden=true;options.onCopyLayout?.(target.id);
   });
   confirm.setAttribute('aria-label','Apply carrying layout copy to selected operator');
   confirm.hidden=true;confirm.disabled=!!options.locked;
   picker.addEventListener('change',()=>{
    pendingTarget=null;detail.hidden=true;confirm.hidden=true;
   });
   copyInner.append(inspect,detail,confirm);
  }
  picker.disabled=!!options.locked;
  copyInner.prepend(picker);copyArea.append(copyInner);advanced.append(copyArea);
 }
 advanced.append(actions);
 // The item model is rendered only when its row enters the viewport. One
 // shared preview/renderer services all tiles, with no extra WebGL contexts.
 // Offscreen items don't trigger expensive GPU captures during initial prep.
 if(options.onModelThumbnail&&previewRequests.length){
  const render=({host,target}:{host:HTMLElement;target:EquipmentInspectionTarget})=>{
   if(!root.isConnected||!host.isConnected)return;
   const source=options.onModelThumbnail?.(target);
   if(source){
    const picture=document.createElement('img');
    picture.src=source;picture.alt='';picture.decoding='async';
    host.replaceChildren(picture);
    host.dataset.model='real';
   }else host.dataset.model='unavailable';
  };
  requestAnimationFrame(()=>{
   if(!root.isConnected)return;
   if(typeof IntersectionObserver==='undefined'){
    for(const target of previewRequests)render(target);
    return;
   }
   const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     const record=previewRequests.find(record=>record.host===entry.target);
     if(record)render(record);
     observer.unobserve(entry.target);
    }
    if(!root.isConnected)observer.disconnect();
   },{rootMargin:'140px'});
   for(const {host} of previewRequests)observer.observe(host);
  });
 }
 return root;
}
