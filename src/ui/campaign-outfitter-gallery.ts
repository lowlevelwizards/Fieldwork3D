/** Outfitter R4 — one horizontal gallery + one contextual detail area.
 * Read-only presentation: all equipment/stock/magazine changes still go
 * through the existing campaign and physical-carry handlers/quotes.
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
import {fieldworkSelect} from './fieldwork-select.ts';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',label='')=>{
 const node=document.createElement(tag);node.className=cls;
 if(label)node.textContent=label;return node;
};
const action=(label:string,fn:()=>void,cls='')=>{
 const control=el('button',cls,label);control.type='button';
 control.addEventListener('click',fn);return control;
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
 renderField?:(id:FieldItemId)=>string|null;
 onEquip:(slot:LoadoutSlot,itemId:string)=>void;
 onMoveField:(id:FieldItemId,from:FieldCarryLocation,to:FieldCarryLocation)=>void;
 onMoveMagazine:(id:string,to:FieldCarryLocation)=>void;
 onArsenal:()=>void;
 arsenalDisabled?:boolean;
 selectedItems?:Map<string,string>;
 scrollPositions?:Map<string,number>;
 onInspect?:(slot:LoadoutSlot,id:string,kind:'gear'|'field'|'magazine')=>void;
 onAdvanced:()=>void;
};
type Choice={id:string;label:string;mass:string;kind:'gear'|'field'|'magazine';
 issued:boolean;equipped:boolean;reason?:string;
 row?:HTMLElement;fieldId?:FieldItemId};
export function createOutfitterGallery(options:OutfitterGalleryOptions){
 const root=el('section','fw-outfitter-gallery');
 root.setAttribute('aria-label','Selected equipment and options');
 const heading=el('div','fw-outfitter-gallery-head');
 const name=el('strong','','WEAPON');
 const detail=el('span','','SWIPE TO BROWSE');
 heading.append(name,detail);
 const viewport=el('div','fw-outfitter-gallery-scroll');
 const rail=el('div','fw-outfitter-options');
 rail.setAttribute('role','group');
 rail.setAttribute('aria-label','Horizontal equipment choices');
 viewport.append(rail);
 const context=el('div','fw-outfitter-context');
 context.setAttribute('aria-live','polite');
 root.append(heading,viewport,context);
 options.host.append(root);
 const remembered=options.selectedItems??new Map<string,string>();
 const positions=options.scrollPositions??new Map<string,number>();
 const inventory=options.kit.fieldInventory??initialFieldInventory(options.kit);
 const board=physicalCarryBoard(options.kit,options.magazines,inventory);
 let active:LoadoutSlot='primary';
 let choices:Choice[]=[];
 const addImage=(tile:HTMLElement,choice:Choice,slot:LoadoutSlot)=>{
  const frame=el('div','fw-outfitter-gallery-image');
  frame.textContent=choice.id.endsWith('-none')?'—':'';
  tile.prepend(frame);
  if(choice.id.endsWith('-none'))return;
  requestAnimationFrame(()=>{
   if(!root.isConnected||!tile.isConnected)return;
   const url=choice.kind==='field'?
    options.renderField?.(choice.fieldId??'flashbang'): 
    choice.kind==='gear'?options.renderModel(slot,choice.id):null;
   if(!url)return;
   const img=el('img');img.src=url;img.alt='';img.decoding='async';
   frame.replaceChildren(img);
  });
 };
 const equipmentChoices=(slot:LoadoutSlot)=>{
  const source=options.sources.get(slot);
  if(!source)return [] as Choice[];
  const result:Choice[]=[];
  for(const option of [...source.options]){
   const id=option.value,item=itemDefinition(id);
   if(!id||!item)continue;
   const current=id===source.value;
   const carrier=slot==='rig'||slot==='belt'||slot==='backpack';
   const quote=carrier&&!current?quoteCarryGearChange(
    options.kit,options.magazines,slot as 'rig'|'belt'|'backpack',
    id,inventory):null;
   const unavailable=options.locked||(!current&&
    (option.disabled||(quote!==null&&!quote.ok)));
   const delta=item.massKg-(itemDefinition(source.value)?.massKg??0);
   result.push({id,label:item.name,mass:current?'EQUIPPED':
    (delta>=0?'+':'')+delta.toFixed(2)+' KG',
    kind:'gear',equipped:current,issued:!unavailable,
    reason:quote&&!quote.ok?quote.reason:options.locked?
     'LOCKED DURING DEPLOYMENT':'NOT ISSUED / RESTRICTED'});
  }
  return result;
 };
 const fieldRows=()=>[...options.physicalEditor.querySelectorAll<HTMLElement>(
  '.fw-field-inventory-issue .fw-field-inventory-item')];
 const fieldChoices=()=>{
  const result:Choice[]=[];
  for(const [i,row] of fieldRows().entries()){
   const title=row.querySelector('strong')?.textContent??'Consumable';
   const fieldId=(title.toLowerCase().includes('flash')?'flashbang':
    title.toLowerCase().includes('wedge')?'wedge':'zip-tie') as FieldItemId;
   const count=row.querySelector('.fw-field-inventory-quantity')?.textContent??'×0';
   result.push({id:'field-'+fieldId,label:title,mass:count,
    kind:'field',fieldId,row,issued:true,equipped:count!=='×0'});
  }
  return result;
 };
 const magazineChoices=()=>{
  const result:Choice[]=[];
  let index=0;
  for(const zone of board.zones){
   for(const tile of zone.items){
    if(tile.kind!=='magazine'||!tile.magazineId)continue;
    index++;
    result.push({id:tile.magazineId,label:'MAG '+String(index).padStart(2,'0'),
     mass:tile.label.replace(/^.*?·/,'').trim(),kind:'magazine',
     issued:true,equipped:true});
   }
  }
  return result;
 };
 const createPlace=(label:string,value:FieldCarryLocation,
  available:(location:FieldCarryLocation)=>{ok:boolean;reason?:string},
  onChange:(location:FieldCarryLocation)=>void)=>{
  const choices=FIELD_CARRY_LOCATIONS.map(loc=>{
   const quote=available(loc);
   return {value:loc,label:LOC_LABEL[loc],disabled:!quote.ok,
    hint:quote.ok?'':quote.reason??'Full or incompatible'};
  });
  return fieldworkSelect({label,value,choices,
   onChange:loc=>onChange(loc as FieldCarryLocation),compact:true});
 };
 const detailSection=(title:string,info?:string)=>{
  const section=el('div','fw-outfitter-detail-copy');
  section.append(el('strong','',title));
  if(info)section.append(el('small','',info));
  context.append(section);return section;
 };
 const showDetail=(choice:Choice)=>{
  context.replaceChildren();
  const title=detailSection(choice.label,choice.mass);
  if(choice.kind==='gear'){
   if(!choice.issued&&!choice.equipped){
    title.append(el('small','fw-outfitter-disabled-note',choice.reason??'UNAVAILABLE'));
    return;
   }
   if(choice.equipped){
    title.append(el('span','fw-outfitter-current','✓ EQUIPPED'));
   }else{
    title.append(el('small','','Tap the card to equip'));
   }
   if(active==='primary'){
    const button=action('ARSENAL',options.onArsenal,'fw-outfitter-context-action');
    button.disabled=!!options.arsenalDisabled;
    context.append(button);
   }
   if(['rig','belt','backpack'].includes(active)){
    const loc=active==='rig'?'rig':active==='belt'?'belt':'backpack';
    const zone=board.zones.find(z=>z.location===loc);
    context.append(el('span','fw-outfitter-detail-capacity',
     (zone?.used??0)+' / '+(zone?.capacity??0)+' SLOTS'));
   }
  }else if(choice.kind==='field'&&choice.row){
   const buttons=[...choice.row.querySelectorAll<HTMLButtonElement>(
    '.fw-field-inventory-controls button')];
   const qty=choice.row.querySelector('.fw-field-inventory-quantity');
   const controls=el('div','fw-outfitter-quantity-controls');
   const minus=action('−',()=>buttons[0]?.click());
   minus.disabled=options.locked||!!buttons[0]?.disabled;
   minus.setAttribute('aria-label','Remove one '+choice.label);
   const amount=el('strong','',qty?.textContent??'×0');
   const plus=action('+',()=>buttons[1]?.click());
   plus.disabled=options.locked||!!buttons[1]?.disabled;
   plus.setAttribute('aria-label','Add one '+choice.label);
   controls.append(minus,amount,plus);context.append(controls);
   const select=choice.row.querySelector<HTMLSelectElement>(
    '.fw-field-inventory-location');
   if(select){
    const dropdown=fieldworkSelect({label:'Carry '+choice.label,
     value:select.value,choices:[...select.options].map(o=>({
      value:o.value,label:o.textContent??o.value,disabled:o.disabled})),
     compact:true,onChange:value=>{
      select.value=value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
     }});
    context.append(dropdown);
   }
  }else if(choice.kind==='magazine'){
   let location:FieldCarryLocation|null=null;
   for(const zone of board.zones)
    if(zone.items.some(item=>item.magazineId===choice.id))location=zone.location;
   if(location){
    const start=location;
    context.append(createPlace('Magazine carry',start,
     loc=>quoteOneMagazineMove(options.kit,options.magazines,
      choice.id,loc,inventory),
     loc=>options.onMoveMagazine(choice.id,loc)));
   }
  }
 };
 const selectChoice=(choice:Choice,fromClick:boolean)=>{
  remembered.set(active,choice.id);
  for(const card of rail.querySelectorAll<HTMLElement>('.fw-outfitter-option')){
   const selected=card.dataset.itemId===choice.id;
   card.dataset.selected=String(selected);
   card.setAttribute('aria-pressed',String(selected));
  }
  if(fromClick&&choice.kind==='gear'&&choice.issued&&!choice.equipped){
   options.onEquip(active,choice.id);return;
  }
  if(choice.kind==='gear'&&choice.equipped||
     choice.kind==='field'&&choice.equipped||
     choice.kind==='magazine')
   options.onInspect?.(active,choice.kind==='field'?
    choice.fieldId??choice.id:choice.id,choice.kind);
  else options.onInspect?.(active,'','gear');
  showDetail(choice);
 };
 const show=(slot:LoadoutSlot)=>{
  active=slot;root.dataset.slot=slot;
  name.textContent=(SLOT_LABEL[slot]??slot).toUpperCase();
  context.replaceChildren();
  const base=equipmentChoices(slot);
  if(slot==='utility'||slot==='tactical')base.push(...fieldChoices());
  if(slot==='primary')base.push(...magazineChoices());
  choices=base;
  rail.replaceChildren();
  for(const choice of choices){
   const tile=action(choice.label,()=>selectChoice(choice,true),
    'fw-outfitter-option');
   tile.dataset.itemId=choice.id;
   tile.dataset.kind=choice.kind;
   tile.dataset.equipped=String(choice.equipped);
   tile.dataset.available=String(choice.issued);
   tile.setAttribute('aria-label',choice.label+
    (!choice.issued?' · '+choice.reason:choice.equipped?' · equipped':' · equip'));
   const copy=el('div','fw-outfitter-option-copy');
   copy.append(el('strong','',choice.label),
    el('small','',choice.issued?choice.mass:choice.reason??'UNAVAILABLE'));
   tile.replaceChildren(copy);
   addImage(tile,choice,slot);
   rail.append(tile);
  }
  if(!choices.length)context.append(el('p','fw-outfitter-gallery-note','Nothing issued.'));
  const selected=choices.find(c=>c.id===remembered.get(slot))??
   choices.find(c=>c.equipped&&c.kind==='gear')??choices[0];
  if(selected)selectChoice(selected,false);
  requestAnimationFrame(()=>{
   if(!root.isConnected)return;
   viewport.scrollLeft=positions.get(slot)??0;
  });
 };
 viewport.addEventListener('scroll',()=>{positions.set(active,viewport.scrollLeft);},
  {passive:true});
 return {root,show,getActive:()=>active};
}
