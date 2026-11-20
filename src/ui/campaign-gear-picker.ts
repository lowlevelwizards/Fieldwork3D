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
 const display=(value:string)=>itemDefinition(value)?.name||
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
   if(typeof IntersectionObserver==='undefined'){fetch();return;}
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
  const scroller=trigger.closest<HTMLElement>('.campaign-screen');
  const originalScrollerOverflow=scroller?.style.overflow??'';
  const originalBodyOverflow=document.body.style.overflow;
  if(scroller)scroller.style.overflow='hidden';
  document.body.style.overflow='hidden';
  const originalItem=itemDefinition(source.value);
  const backdrop=document.createElement('div');
  backdrop.className='campaign-gear-picker-backdrop';
  const panel=document.createElement('section');
  panel.className='campaign-gear-picker-panel';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
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
   if(scroller)scroller.style.overflow=originalScrollerOverflow;
   document.body.style.overflow=originalBodyOverflow;
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
  const list=document.createElement('div');
  list.className='campaign-gear-picker-list';
  const thumbnails:{id:string;el:HTMLElement}[]=[];
  for(const option of Array.from(source.options)){
   const def=itemDefinition(option.value);
   const chosen=option.value===source.value;
   const entry=document.createElement('button');
   entry.type='button';entry.className='campaign-gear-picker-option';
   entry.disabled=option.disabled;
   entry.setAttribute('aria-current',chosen?'true':'false');
   const name=document.createElement('strong');name.textContent=def?.name||display(option.value);
   const detail=document.createElement('small');
   const difference=def&&originalItem?def.massKg-originalItem.massKg:null;
   const weightDelta=difference!==null&&!chosen&&Math.abs(difference)>.005?
    ' · '+(difference>0?'+':'')+difference.toFixed(2)+' KG ITEM MASS':'';
   detail.textContent=(def?'ITEM '+def.massKg.toFixed(2)+' KG':'')+
    weightDelta+(chosen?' · EQUIPPED':option.disabled?' · UNAVAILABLE':'');
   const description=document.createElement('span');
   description.textContent=def?.description||option.textContent||'';
   const visual=document.createElement('span');
   visual.className='campaign-gear-picker-model';
   visual.setAttribute('aria-hidden','true');
   visual.textContent=option.value.endsWith('-none')?'EMPTY':'3D';
   entry.append(visual,name,detail,description);
   if(renderModel&&!option.value.endsWith('-none'))
    thumbnails.push({id:option.value,el:visual});
   if(option.disabled){
    const warning=document.createElement('em');
    warning.textContent=option.textContent||'Not available in this campaign';
    entry.append(warning);
   }
   entry.addEventListener('click',()=>{
    if(entry.disabled)return;
    if(source.value!==option.value){
     source.value=option.value;
     source.dispatchEvent(new Event('change',{bubbles:true}));
    }
    close();
   });
   list.append(entry);
  }
  panel.append(list);backdrop.append(panel);
  backdrop.addEventListener('click',event=>{
   if(event.target===backdrop)close();
  });
  backdrop.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close();return;}
   if(event.key!=='Tab')return;
   const focusable=Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
   const first=focusable[0],last=focusable[focusable.length-1];
   if(!first||!last)return;
   if(event.shiftKey&&document.activeElement===first){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();first.focus();
   }
  });
  document.body.append(backdrop);
  // Progressive visual rendering: one card per frame, from the same live
  // operator geometry and WebGL context. Never a second canvas per option.
  let cursor=0;
  const populate=()=>{
   if(closed||!backdrop.isConnected||cursor>=thumbnails.length)return;
   const item=thumbnails[cursor++];
   const source=renderModel?.(item.id);
   if(source){
    const img=document.createElement('img');
    img.src=source;img.alt='';img.loading='lazy';
    item.el.replaceChildren(img);
    item.el.dataset.model='real';
   }else{
    item.el.textContent='NO MODEL';
    item.el.dataset.model='unavailable';
   }
   if(cursor<thumbnails.length)requestAnimationFrame(populate);
  };
  if(thumbnails.length)requestAnimationFrame(populate);
  const active=list.querySelector<HTMLButtonElement>('[aria-current="true"]:not(:disabled)');
  (active||closeButton).focus({preventScroll:true});
 });
 return trigger;
}
