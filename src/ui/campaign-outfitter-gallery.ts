/** Outfitter R3 mobile surface.
 * ONE context gallery. This module owns no equipment, stock or magazine state.
 * It delegates each action to the existing Campaign/physical authority.
 */
import {itemDefinition} from '../equipment-catalog.ts';
import {FIELD_CARRY_LOCATIONS,initialFieldInventory,
 type FieldCarryLocation,type FieldItemId} from '../equipment-field-inventory.ts';
import {physicalCarryBoard} from '../equipment-physical-board.ts';
import {quoteSingleFieldTransfer} from '../equipment-field-transfer.ts';
import {quoteOneMagazineMove} from '../equipment-magazine-transfer.ts';
import {quoteCarryGearChange,previewCarryGearChange}
 from '../equipment-carry-gear-change.ts';
import type {EquipmentLoadout,LoadoutSlot} from '../equipment-loadouts.ts';
import type {MagazineItem} from '../breach-magazines.ts';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',label='')=>{
 const node=document.createElement(tag);
 node.className=cls;
 if(label)node.textContent=label;
 return node;
};
const action=(label:string,fn:()=>void,cls='')=>{
 const control=el('button',cls,label);
 control.type='button';
 control.addEventListener('click',fn);
 return control;
};
const SLOT_LABEL:Partial<Record<LoadoutSlot,string>>={
 primary:'Weapon',head:'Head',armor:'Armor',rig:'Chest',belt:'Belt',
 backpack:'Pack',medical:'Medical',utility:'Tools',top:'Top',legs:'Legs',
 hands:'Hands',feet:'Footwear',tactical:'Tactical'
};
const LOC_LABEL:Record<FieldCarryLocation,string>={
 rig:'Chest',belt:'Belt',pocket:'Pocket',backpack:'Pack'
};
export type OutfitterGalleryOptions={
 host:HTMLElement;
 sources:Map<LoadoutSlot,HTMLSelectElement>;
 kit:EquipmentLoadout;
 magazines:readonly MagazineItem[];
 physicalEditor:HTMLElement;
 locked:boolean;
 renderModel:(slot:LoadoutSlot,itemId:string)=>string|null;
 onEquip:(slot:LoadoutSlot,itemId:string)=>void;
 onMoveField:(id:FieldItemId,from:FieldCarryLocation,to:FieldCarryLocation)=>void;
 onMoveMagazine:(id:string,to:FieldCarryLocation)=>void;
 onArsenal:()=>void;
 arsenalDisabled?:boolean;
 onAdvanced:()=>void;
};
export function createOutfitterGallery(options:OutfitterGalleryOptions){
 const root=el('section','fw-outfitter-gallery');
 root.setAttribute('aria-label','Selected equipment and options');
 const heading=el('div','fw-outfitter-gallery-head');
 const name=el('strong','','WEAPON');
 const detail=el('span','','TAP TO EQUIP');
 heading.append(name,detail);
 const items=el('div','fw-outfitter-gallery-scroll');
 root.append(heading,items);
 options.host.append(root);
 let active:LoadoutSlot='primary';
 const inventory=options.kit.fieldInventory??initialFieldInventory(options.kit);
 const board=physicalCarryBoard(options.kit,options.magazines,inventory);
 const note=(label:string,cls='')=>el('p','fw-outfitter-gallery-note '+cls,label);
 const addSubtitle=(title:string)=>{
  items.append(el('div','fw-outfitter-gallery-subhead',title));
 };
 const addImage=(tile:HTMLElement,slot:LoadoutSlot,id:string)=>{
  const image=el('div','fw-outfitter-gallery-image');
  image.textContent=id.endsWith('-none')?'—':'';
  tile.prepend(image);
  if(id.endsWith('-none'))return;
  requestAnimationFrame(()=>{
   if(!root.isConnected||!tile.isConnected||!tile.getClientRects().length)return;
   const uri=options.renderModel(slot,id);
   if(!uri)return;
   const img=el('img');
   img.src=uri;img.alt='';img.decoding='async';
   image.replaceChildren(img);image.dataset.model='real';
  });
 };
 const addSlotChoices=(slot:LoadoutSlot)=>{
  const source=options.sources.get(slot);
  if(!source)return;
  const available=el('div','fw-outfitter-options');
  const unavailable=el('div','fw-outfitter-options');
  let blocked=0;
  for(const option of [...source.options].sort((a,b)=>
   Number(b.value===source.value)-Number(a.value===source.value))){
   const id=option.value;
   const item=itemDefinition(id);
   if(!id||!item)continue;
   const current=id===source.value;
   const carrier=slot==='rig'||slot==='belt'||slot==='backpack';
   const carryQuote=carrier&&!current?
    quoteCarryGearChange(options.kit,options.magazines,
     slot as 'rig'|'belt'|'backpack',id,inventory):null;
   const disabled=options.locked||(!current&&
    (option.disabled||(carryQuote!==null&&!carryQuote.ok)));
   const tile=action(item.name,()=>{
    if(disabled||current)return;
    options.onEquip(slot,id);
   },'fw-outfitter-option');
   tile.dataset.itemId=id;
   tile.dataset.slot=slot;
   tile.dataset.equipped=String(current);
   tile.disabled=disabled;
   tile.setAttribute('aria-label',item.name+
    (current?', equipped':disabled?', unavailable':', equip'));
   const copy=el('div','fw-outfitter-option-copy');
   const title=el('strong','',item.name);
   const delta=item.massKg-(itemDefinition(source.value)?.massKg??0);
   const mass=el('small','',current?'EQUIPPED':
    (delta>=0?'+':'')+delta.toFixed(2)+' KG');
   const text=el('small','fw-outfitter-option-summary',item.description);
   copy.append(title,mass,text);
   if(current)copy.append(el('span','fw-outfitter-current','✓ EQUIPPED'));
   if(disabled&&!current){
    const why=carryQuote&&!carryQuote.ok?carryQuote.reason:
     options.locked?'LOCKED DURING DEPLOYMENT':'NOT ISSUED / RESTRICTED';
    copy.append(el('small','fw-outfitter-reason',why));
    tile.title=why;
   }
   if(carrier&&!disabled&&!current){
    const preview=previewCarryGearChange(options.kit,options.magazines,
     slot as 'rig'|'belt'|'backpack',id,inventory);
    if(preview.requiresRepack)
     copy.append(el('small','fw-outfitter-repack','Will rearrange carried items'));
   }
   tile.replaceChildren(copy);
   addImage(tile,slot,id);
   if(disabled&&!current){unavailable.append(tile);blocked++;}
   else available.append(tile);
  }
  items.append(available);
  if(blocked){
   const more=el('details','fw-outfitter-unavailable');
   more.append(el('summary','','UNAVAILABLE · '+blocked+' OPTIONS'),unavailable);
   items.append(more);
  }
 };
 const addQuantities=()=>{
  const issue=options.physicalEditor.querySelector('.fw-field-inventory-issue');
  if(!issue)return;
  const rows=[...issue.querySelectorAll<HTMLElement>('.fw-field-inventory-item')];
  if(!rows.length)return;
  addSubtitle('CONSUMABLES · TAP − / +');
  const section=el('div','fw-outfitter-quantities');
  for(const original of rows){
   const label=original.querySelector('strong')?.textContent??'Equipment';
   const existing=original.querySelector('.fw-field-inventory-quantity');
   const value=existing?.textContent??'×0';
   const originalButtons=[...original.querySelectorAll<HTMLButtonElement>('.fw-field-inventory-controls button')];
   if(originalButtons.length!==2)continue;
   const row=el('div','fw-outfitter-quantity-row');
   const copy=el('div','fw-outfitter-quantity-copy');
   copy.append(el('strong','',label));
   const id=original.dataset.stock;
   const countInfo=el('small','',id==='0'?'Out of HQ stock':'Real carried quantity');
   copy.append(countInfo);row.append(copy);
   const controls=el('div','fw-outfitter-quantity-controls');
   const minus=action('−',()=>originalButtons[0].click());
   minus.disabled=originalButtons[0].disabled;
   minus.setAttribute('aria-label','Remove one '+label);
   const amount=el('strong','',value);
   const plus=action('+',()=>originalButtons[1].click());
   plus.disabled=originalButtons[1].disabled;
   plus.setAttribute('aria-label','Add one '+label);
   controls.append(minus,amount,plus);row.append(controls);
   const originalPlace=original.querySelector<HTMLSelectElement>('.fw-field-inventory-location');
   if(originalPlace){
    const place=el('select','fw-outfitter-place') as HTMLSelectElement;
    place.setAttribute('aria-label','Carry position for '+label);
    for(const opt of [...originalPlace.options]){
     const next=el('option','',opt.textContent??opt.value);
     next.value=opt.value;place.append(next);
    }
    place.value=originalPlace.value;place.disabled=originalPlace.disabled;
    place.addEventListener('change',()=>{
     originalPlace.value=place.value;
     originalPlace.dispatchEvent(new Event('change',{bubbles:true}));
    });
    row.append(place);
   }
   section.append(row);
  }
  items.append(section);
 };
 const addContents=(location:FieldCarryLocation)=>{
  const zone=board.zones.find(z=>z.location===location);
  if(!zone)return;
  addSubtitle('CARRIED HERE · '+zone.used+'/'+zone.capacity+' SPACES');
  const contents=el('div','fw-outfitter-contents');
  if(!zone.items.length)contents.append(note('Nothing carried here.'));
  for(const tile of zone.items){
   const row=el('div','fw-outfitter-content-row');
   const display=el('div','fw-outfitter-content-label');
   display.append(el('strong','',tile.label));
   if(tile.quantity>1)display.append(el('small','','×'+tile.quantity));
   row.append(display);
   if(tile.kind==='field'&&tile.itemId||tile.kind==='magazine'&&tile.magazineId){
    const place=el('select','fw-outfitter-place') as HTMLSelectElement;
    place.setAttribute('aria-label','Move '+tile.label+' to carry position');
    for(const loc of FIELD_CARRY_LOCATIONS){
     const quote=tile.kind==='field'&&tile.itemId?
      quoteSingleFieldTransfer(options.kit,options.magazines,inventory,
       tile.itemId,location,loc):
      quoteOneMagazineMove(options.kit,options.magazines,
       tile.magazineId!,loc,inventory);
     const item=el('option','',LOC_LABEL[loc]);
     item.value=loc;item.disabled=!quote.ok;
     place.append(item);
    }
    place.value=location;place.disabled=options.locked;
    place.addEventListener('change',()=>{
     const loc=place.value as FieldCarryLocation;
     if(tile.kind==='field'&&tile.itemId)
      options.onMoveField(tile.itemId,location,loc);
     else if(tile.magazineId)options.onMoveMagazine(tile.magazineId,loc);
    });
    row.append(place);
   }else row.append(el('small','fw-outfitter-fixed','AUTO-PLACED'));
   contents.append(row);
  }
  items.append(contents);
 };
 const addMagazines=()=>{
  const magazines=board.zones.flatMap(z=>z.items.filter(t=>t.kind==='magazine'));
  if(!magazines.length)return;
  addSubtitle('SPARE MAGAZINES · '+magazines.length);
  const group=el('div','fw-outfitter-contents');
  for(const tile of magazines){
   if(!tile.magazineId||tile.location==='overflow')continue;
   const location=tile.location as FieldCarryLocation;
   const row=el('div','fw-outfitter-content-row');
   row.append(el('strong','',tile.label));
   const select=el('select','fw-outfitter-place') as HTMLSelectElement;
   select.setAttribute('aria-label','Move '+tile.label+' to carry position');
   for(const loc of FIELD_CARRY_LOCATIONS){
    const quoted=quoteOneMagazineMove(options.kit,options.magazines,
     tile.magazineId,loc,inventory);
    const opt=el('option','',LOC_LABEL[loc]);opt.value=loc;
    opt.disabled=!quoted.ok;select.append(opt);
   }
   select.value=location;select.disabled=options.locked;
   const magId=tile.magazineId;
   select.addEventListener('change',()=>options.onMoveMagazine(magId,select.value as FieldCarryLocation));
   row.append(select);group.append(row);
  }
  items.append(group);
 };
 const addMore=()=>{
  const more=action('MORE · PRESETS / SQUAD / ADVANCED',options.onAdvanced,
   'fw-outfitter-more');
  items.append(more);
 };
 const show=(slot:LoadoutSlot)=>{
  active=slot;
  root.dataset.slot=slot;
  name.textContent=(SLOT_LABEL[slot]??slot).toUpperCase();
  detail.textContent='TAP AN OPTION TO EQUIP';
  items.replaceChildren();
  addSlotChoices(slot);
  if(slot==='rig'||slot==='belt'||slot==='backpack')
   addContents(slot);
  if(slot==='medical'||slot==='utility'){
   const equipped=options.sources.get(slot)?.value;
   const stored=board.zones.flatMap(zone=>zone.items.filter(
    tile=>tile.id===slot+':'+equipped).map(()=>LOC_LABEL[zone.location]));
   if(stored.length)items.append(note(
    'CURRENT EQUIPMENT CARRIED: '+stored.join(' / ').toUpperCase()));
  }
  if(slot==='primary'){
   addMagazines();
   const arsenal=action('OPEN ARSENAL · MODIFY WEAPON',options.onArsenal,
    'fw-outfitter-arsenal');
   arsenal.disabled=!!options.arsenalDisabled;
   items.append(arsenal);
  }
  if(slot==='utility'||slot==='tactical')addQuantities();
  addMore();
  items.scrollTop=0;
 };
 return {root,show,getActive:()=>active};
}
