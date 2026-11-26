/** Campaign armory gear chooser. Display-only selection UI: actual inventory,
 * Dispatch eligibility and state transitions continue through the original select
 * change event / CampaignScreen handlers. */
import {itemDefinition} from '../equipment-catalog.ts';

export function createCampaignGearPicker(source:HTMLSelectElement,slot:string,
 renderModel?:(itemId:string)=>string|null):HTMLButtonElement{
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='campaign-kit-picker-trigger';
 const label=source.getAttribute('aria-label')?.replace(/^Select /,'Choose ')||
  'Choose '+slot+' equipment';
 const display=(value:string)=>source.querySelector<HTMLOptionElement>('option[value="'+CSS.escape(value)+'"]')?.dataset.catalogName||itemDefinition(value)?.name||
  source.querySelector<HTMLOptionElement>('option[value="'+CSS.escape(value)+'"]')
   ?.textContent?.split(' · ')[0]||value;
 trigger.textContent=display(source.value);
 trigger.dataset.modelItem=source.value;
 if(renderModel&&['primary','head','armor','rig','belt','backpack','medical','utility']
  .includes(slot)&&!source.value.endsWith('-none')){
  trigger.classList.add('campaign-kit-visual-trigger');
  const visual=document.createElement('span');
  visual.className='campaign-kit-selected-model';
  visual.setAttribute('aria-hidden','true');
  const label=document.createElement('span');
  label.className='campaign-kit-selected-model-label';
  label.textContent=display(source.value);
  trigger.replaceChildren(visual,label);
  requestAnimationFrame(()=>{
   if(!trigger.isConnected)return;
   const fetch=()=>{
    if(!trigger.isConnected)return;
    const uri=renderModel(source.value);
    if(!uri){visual.dataset.model='unavailable';return;}
    const img=document.createElement('img');
    img.src=uri;img.alt='';img.decoding='async';
    visual.replaceChildren(img);visual.dataset.model='real';
   };
   // The selected row lives in a bounded scrolling drawer. On phones its
   // WebGL thumbnail must be ready even before an IntersectionObserver
   // considers the nested scroller visible; all inactive rows remain lazy.
   const mobile=window.matchMedia?.(
    '(max-width:620px), (max-width:920px) and (max-height:620px)').matches;
   if(typeof IntersectionObserver==='undefined'||
    (mobile&&!trigger.closest<HTMLElement>('.campaign-kit-choice')?.hidden)){
    fetch();return;
   }
   const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();fetch();
   },{rootMargin:'100px'});
   observer.observe(trigger);
  });
 }
 trigger.setAttribute('aria-label',label);
 trigger.disabled=source.disabled;
 if(trigger.disabled)trigger.title='Equipment changes locked during deployment';
 trigger.addEventListener('click',()=>{
  if(trigger.disabled)return;
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:trigger;
  // On phones keep the equipment shelf inside the selected slot.
  // Unlike a modal this preserves the operator viewport, scrolling
  // context, and allows immediate visual comparison while outfitting.
  const shelf=window.matchMedia?.(
   '(max-width:620px), (max-width:920px) and (max-height:620px)').matches?
   trigger.closest<HTMLElement>('.campaign-kit-choice'):null;
  const inline=!!shelf;
  const scroller=trigger.closest<HTMLElement>('.campaign-screen');
  const originalScrollerOverflow=scroller?.style.overflow??'';
  const originalBodyOverflow=document.body.style.overflow;
  if(!inline){
   if(scroller)scroller.style.overflow='hidden';
   document.body.style.overflow='hidden';
  }
  const originalItem=itemDefinition(source.value);
  const backdrop=document.createElement('div');
  backdrop.className=inline?'campaign-gear-picker-inline':
   'campaign-gear-picker-backdrop';
  const panel=document.createElement('section');
  panel.className='campaign-gear-picker-panel';
  panel.setAttribute('role',inline?'region':'dialog');
  if(!inline)panel.setAttribute('aria-modal','true');
  const heading=document.createElement('h2');
  heading.textContent='CHOOSE '+slot.toUpperCase();
  heading.id='campaign-gear-picker-title';
  panel.setAttribute('aria-labelledby',heading.id);
  const closeButton=document.createElement('button');
  closeButton.type='button';closeButton.className='campaign-gear-picker-close';
  closeButton.textContent='CLOSE';
  let closed=false;
  const close=()=>{
   if(closed)return;
   closed=true;backdrop.remove();
   trigger.setAttribute('aria-expanded','false');
   if(!inline){
    if(scroller)scroller.style.overflow=originalScrollerOverflow;
    document.body.style.overflow=originalBodyOverflow;
   }
   // The equip callback may rebuild the entire equipment page synchronously.
   // Restore focus to its new corresponding slot, never a detached button.
   const target=prior.isConnected?prior:
    Array.from(document.querySelectorAll<HTMLButtonElement>('.campaign-kit-picker-trigger'))
     .find(button=>button.getAttribute('aria-label')===label);
   target?.focus({preventScroll:true});
  };
  closeButton.addEventListener('click',close);
  const header=document.createElement('header');
  header.className='campaign-gear-picker-head';header.append(heading,closeButton);
  panel.append(header);
  const scroll=document.createElement('div');
  scroll.className='campaign-gear-picker-scroll';
  const list=document.createElement('div');
  list.className='campaign-gear-picker-list';
  // One compact comparison row per item: no huge uneven two-column cards.
  const gallery=false;
  list.dataset.layout=gallery?'gallery':'rows';
  const unavailableList=document.createElement('div');
  unavailableList.className='campaign-gear-picker-list';
  unavailableList.dataset.layout='rows';
  const thumbnails:{id:string;el:HTMLElement}[]=[];
  const seen=new Set<HTMLElement>();
  for(const option of Array.from(source.options)){
   const def=itemDefinition(option.value);
   const chosen=option.value===source.value;
   const entry=document.createElement('button');
   entry.type='button';entry.className='campaign-gear-picker-option';
   entry.disabled=option.disabled;
   entry.setAttribute('aria-current',chosen?'true':'false');
   const name=document.createElement('strong');name.textContent=option.dataset.catalogName||def?.name||display(option.value);
   const detail=document.createElement('small');
   const difference=def&&originalItem?def.massKg-originalItem.massKg:null;
   const weightDelta=difference!==null&&!chosen&&Math.abs(difference)>.005?
    ' · '+(difference>0?'+':'')+difference.toFixed(2)+' KG ITEM MASS':'';
   detail.textContent=(option.dataset.catalogDetail??(def?'ITEM '+def.massKg.toFixed(2)+' KG':''))+
    weightDelta+(chosen?' · EQUIPPED':option.disabled?' · UNAVAILABLE':'');
   const description=document.createElement('span');
   description.className='campaign-gear-picker-description';
   description.textContent=def?.description||option.textContent||'';
   const visual=document.createElement('span');
   visual.className='campaign-gear-picker-model';
   visual.setAttribute('aria-hidden','true');
   visual.textContent=option.value.endsWith('-none')?'EMPTY':'3D';
   // A single intrinsic-height text column replaces four implicit grid
   // rows (which previously overlapped in tall Utility options on iPhone).
   const copy=document.createElement('span');
   copy.className='campaign-gear-picker-copy';
   copy.append(name,detail,description);
   entry.append(visual,copy);
   entry.title=def?.description||'';
   entry.dataset.optionId=option.value;
   entry.dataset.available=String(!option.disabled);
   if(chosen)entry.dataset.equipped='true';
   if(renderModel&&!option.value.endsWith('-none'))
    thumbnails.push({id:option.value,el:visual});
   if(option.disabled){
    const warning=document.createElement('em');
    warning.textContent=option.textContent||'Not available in this campaign';
    copy.append(warning);
   }
   entry.addEventListener('click',()=>{
    if(entry.disabled)return;
    if(source.value!==option.value){
     source.value=option.value;
     source.dispatchEvent(new Event('change',{bubbles:true}));
    }
    close();
   });
   (option.disabled&&!chosen?unavailableList:list).append(entry);
  }
  scroll.append(list);
  if(unavailableList.childElementCount){
   const unissued=document.createElement('details');
   unissued.className='campaign-gear-picker-unissued';
   const summary=document.createElement('summary');
   summary.textContent='NOT ISSUED / RESTRICTED · '+
    unavailableList.childElementCount+' OPTIONS';
   unissued.append(summary,unavailableList);
   scroll.append(unissued);
  }
  panel.append(scroll);backdrop.append(panel);
  backdrop.addEventListener('click',event=>{
   if(event.target===backdrop)close();
  });
  backdrop.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close();return;}
   if(inline||event.key!=='Tab')return;
   const focusable=Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
   const first=focusable[0],last=focusable[focusable.length-1];
   if(!first||!last)return;
   if(event.shiftKey&&document.activeElement===first){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();first.focus();
   }
  });
  // At most one inline shelf is open. Switching slots closes the old
  // shelf, without locking the page or covering the operator.
  if(inline){
   document.querySelectorAll<HTMLElement>('.campaign-gear-picker-inline')
    .forEach(open=>open.remove());
   shelf!.append(backdrop);
   trigger.setAttribute('aria-expanded','true');
   backdrop.addEventListener('focusout',()=>{});
  }else document.body.append(backdrop);
  // Render only items that enter the visible scroller. A separate drawer
  // of unavailable gear stays collapsed; no costly images until inspected.
  const renderThumb=(item:{id:string;el:HTMLElement})=>{
   if(closed||seen.has(item.el)||!item.el.isConnected)return;
   seen.add(item.el);
   const uri=renderModel?.(item.id);
   if(uri){
    const img=document.createElement('img');
    img.src=uri;img.alt='';img.decoding='async';
    item.el.replaceChildren(img);
    item.el.dataset.model='real';
   }else{
    item.el.textContent='NOT VISIBLE';
    item.el.dataset.model='unavailable';
   }
  };
  requestAnimationFrame(()=>{
   if(closed||!backdrop.isConnected)return;
   if(typeof IntersectionObserver==='undefined'){
    for(const item of thumbnails)renderThumb(item);
    return;
   }
   const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     const match=thumbnails.find(item=>item.el===entry.target);
     if(match)renderThumb(match);
     observer.unobserve(entry.target);
    }
    if(closed)observer.disconnect();
   },{root:scroll,rootMargin:'160px'});
   for(const item of thumbnails)observer.observe(item.el);
  });
  const active=list.querySelector<HTMLButtonElement>('[aria-current="true"]:not(:disabled)');
  (active||closeButton).focus({preventScroll:true});
 });
 return trigger;
}
