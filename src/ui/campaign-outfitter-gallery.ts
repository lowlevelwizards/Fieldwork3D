/** Outfitter R4 — one horizontal gallery + one contextual detail area.
 * Read-only presentation: all equipment/stock/magazine changes still go
 * through the existing campaign and physical-carry handlers/quotes.
 */
import {itemDefinition} from '../equipment-catalog.ts';
import {initialFieldInventory} from '../equipment-field-inventory.ts';
import type {OutfitterChoiceSource} from './outfitter-choice-sources.ts';
import {physicalCarryBoard} from '../equipment-physical-board.ts';
import {quoteCarryGearChange}
 from '../equipment-carry-gear-change.ts';
import type {EquipmentLoadout,LoadoutSlot} from '../equipment-loadouts.ts';
import type {MagazineItem} from '../breach-magazines.ts';

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
export type OutfitterGalleryOptions={
 host:HTMLElement;
 sources:ReadonlyMap<LoadoutSlot,OutfitterChoiceSource>;
 kit:EquipmentLoadout;
 magazines:readonly MagazineItem[];
 locked:boolean;
 renderModel:(slot:LoadoutSlot,itemId:string)=>string|null;
 onEquip:(slot:LoadoutSlot,itemId:string)=>void;
 onArsenal:()=>void;
 onAutoPack?:()=>void;
 arsenalDisabled?:boolean;
 selectedItems?:Map<string,string>;
 scrollPositions?:Map<string,number>;
 onInspect?:(slot:LoadoutSlot,id:string)=>void;
 onSelectCategory?:(slot:LoadoutSlot)=>void;
 onAdvanced:()=>void;
};
type Choice={id:string;label:string;mass:string;kind:'gear';
 issued:boolean;equipped:boolean;reason?:string;};
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
 const inventory=options.kit.fieldInventory??initialFieldInventory(options.kit);
 const board=physicalCarryBoard(options.kit,options.magazines,inventory);
 const remembered=options.selectedItems??new Map<string,string>();
 const positions=options.scrollPositions??new Map<string,number>();
 let active:LoadoutSlot='primary';
 let choices:Choice[]=[];
 // Render only thumbnails that approach the visible rail. Rendering every
 // procedural model in one RAF was a major phone navigation hitch.
 const queued:{tile:HTMLElement;frame:HTMLElement;choice:Choice;slot:LoadoutSlot}[]=[];
 let thumbnailFrame=0;
 const paintNext=()=>{
  thumbnailFrame=0;
  const pending=queued.shift();
  if(!pending)return;
  const {tile,frame,choice,slot}=pending;
  if(root.isConnected&&tile.isConnected&&tile.dataset.thumbReady!=='true'){
   tile.dataset.thumbReady='true';
   const url=options.renderModel(slot,choice.id);
   if(url){
    const img=el('img');img.src=url;img.alt='';img.decoding='async';
    frame.replaceChildren(img);
   }
  }
  if(queued.length)thumbnailFrame=requestAnimationFrame(paintNext);
 };
 const scheduleThumb=(tile:HTMLElement,frame:HTMLElement,choice:Choice,slot:LoadoutSlot)=>{
  if(tile.dataset.thumbReady||queued.some(job=>job.tile===tile))return;
  queued.push({tile,frame,choice,slot});
  if(!thumbnailFrame)thumbnailFrame=requestAnimationFrame(paintNext);
 };
 const thumbTargets=new Map<HTMLElement,{frame:HTMLElement;choice:Choice;slot:LoadoutSlot}>();
 const observer:IntersectionObserver|null=typeof IntersectionObserver!=='undefined'?
  new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const tile=entry.target as HTMLElement;
    const data=thumbTargets.get(tile);
    if(data){scheduleThumb(tile,data.frame,data.choice,data.slot);observer?.unobserve(tile);}
   }
  },{root:viewport,rootMargin:'60px'}):null;
 const addImage=(tile:HTMLElement,choice:Choice,slot:LoadoutSlot)=>{
  const frame=el('div','fw-outfitter-gallery-image');
  frame.textContent=choice.id.endsWith('-none')?'—':'';
  tile.prepend(frame);
  if(choice.id.endsWith('-none')||!choice.issued)return;
  if(observer){thumbTargets.set(tile,{frame,choice,slot});observer.observe(tile);}
  else scheduleThumb(tile,frame,choice,slot);
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
   const unavailable=!current&&(options.locked||
    option.disabled||(quote!==null&&!quote.ok));
   const delta=item.massKg-(itemDefinition(source.value)?.massKg??0);
   result.push({id,label:item.name,mass:current?'EQUIPPED':
    (delta>=0?'+':'')+delta.toFixed(2)+' KG',
    kind:'gear',equipped:current,issued:!unavailable,
    reason:quote&&!quote.ok?quote.reason:options.locked?
     'LOCKED DURING DEPLOYMENT':'NOT ISSUED / RESTRICTED'});
  }
  return result.filter(choice=>choice.issued).concat(result.filter(choice=>!choice.issued));
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
  {
   if(!choice.issued&&!choice.equipped){
    title.append(el('small','fw-outfitter-disabled-note',choice.reason??'UNAVAILABLE'));
    return;
   }
   if(choice.equipped){
    title.append(el('span','fw-outfitter-current','✓ EQUIPPED'));
   }else{
    title.append(el('small','','Tap the card to equip'));
   }
   if(active==='primary'&&!options.arsenalDisabled){
    const button=action('ARSENAL',options.onArsenal,'fw-outfitter-context-action');
    button.disabled=!!options.arsenalDisabled;
    context.append(button);
   }
   if(['rig','belt','backpack'].includes(active)){
    const loc=active==='rig'?'rig':active==='belt'?'belt':'backpack';
    const zone=board.zones.find(z=>z.location===loc);
    context.append(el('span','fw-outfitter-detail-capacity',
     (zone?.used??0)+' / '+(zone?.capacity??0)+' SLOTS'));
    if(options.onAutoPack&&zone&&zone.capacity>0&&zone.used>=zone.capacity){
     const pack=action('AUTO PACK',options.onAutoPack,'fw-outfitter-context-action');
     pack.disabled=options.locked;context.append(pack);
    }
   }
  }
  if(['primary','rig','belt','backpack','utility','tactical'].includes(active)){
   const carry=action('ARRANGE MAGAZINES & TOOLS',options.onAdvanced,
    'fw-outfitter-context-action fw-outfitter-carry-action');
   carry.disabled=options.locked;context.append(carry);
  }
 };
 const selectChoice=(choice:Choice,fromClick:boolean)=>{
  if(!choice.issued)return;
  remembered.set(active,choice.id);
  for(const card of rail.querySelectorAll<HTMLElement>('.fw-outfitter-option')){
   const selected=card.dataset.itemId===choice.id;
   card.dataset.selected=String(selected);
   card.setAttribute('aria-pressed',String(selected));
  }
  if(fromClick&&choice.issued&&!choice.equipped){
   options.onEquip(active,choice.id);return;
  }
  if(choice.equipped)options.onInspect?.(active,choice.id);
  else options.onInspect?.(active,'');
  showDetail(choice);
 };
 const show=(slot:LoadoutSlot)=>{
  active=slot;root.dataset.slot=slot;
  name.textContent=(SLOT_LABEL[slot]??slot).toUpperCase();
  heading.replaceChildren(name);
  if(['top','legs','hands','feet'].includes(slot)){
   const clothing=el('div','fw-outfitter-clothing-nav');
   for(const [key,label] of [
    ['top','TOP'],['legs','LEGS'],['hands','HANDS'],['feet','FEET']
   ] as const){
    const control=action(label,()=>options.onSelectCategory?.(key));
    control.setAttribute('aria-label','Inspect '+label.toLowerCase()+' clothing');
    control.setAttribute('aria-current',String(slot===key));
    clothing.append(control);
   }
   heading.append(clothing);
  }else heading.append(detail);
  context.replaceChildren();
  // Equipment options only. Ammunition and consumables use the existing
  // validated carry editor, reached via the contextual ARRANGE action.
  choices=equipmentChoices(slot);
  observer?.disconnect();queued.length=0;
  thumbTargets.clear();
  rail.replaceChildren();
  for(const choice of choices){
   const tile=action(choice.label,()=>selectChoice(choice,true),
    'fw-outfitter-option');
   tile.dataset.itemId=choice.id;
   tile.dataset.kind=choice.kind;
   tile.dataset.equipped=String(choice.equipped);
   tile.dataset.available=String(choice.issued);
   tile.disabled=!choice.issued;
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
  else if(!choices.some(choice=>choice.issued))
   context.append(el('p','fw-outfitter-gallery-note','No available options.'));
  const selected=choices.find(c=>c.issued&&c.id===remembered.get(slot))??
   choices.find(c=>c.issued&&c.equipped)??choices.find(c=>c.issued);
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
