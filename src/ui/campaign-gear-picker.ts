/** Campaign armory gear chooser. Display-only selection UI: actual inventory,
 * Dispatch eligibility and state transitions continue through the original select
 * change event / CampaignScreen handlers. */
import {itemDefinition} from '../equipment-catalog.ts';

export function createCampaignGearPicker(source:HTMLSelectElement,slot:string):HTMLButtonElement{
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='campaign-kit-picker-trigger';
 const label=source.getAttribute('aria-label')?.replace(/^Select /,'Choose ')||
  'Choose '+slot+' equipment';
 const selected=source.selectedOptions[0];
 const display=(value:string)=>itemDefinition(value)?.name||
  source.querySelector<HTMLOptionElement>('option[value="'+CSS.escape(value)+'"]')
   ?.textContent?.split(' · ')[0]||value;
 trigger.textContent=display(source.value);
 trigger.setAttribute('aria-label',label);
 trigger.disabled=source.disabled;
 if(trigger.disabled)trigger.title='Equipment changes locked during deployment';
 trigger.addEventListener('click',()=>{
  if(trigger.disabled)return;
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:trigger;
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
  const close=()=>{
   backdrop.remove();
   if(prior.isConnected)prior.focus({preventScroll:true});
  };
  closeButton.addEventListener('click',close);
  const header=document.createElement('header');
  header.className='campaign-gear-picker-head';header.append(heading,closeButton);
  panel.append(header);
  const list=document.createElement('div');
  list.className='campaign-gear-picker-list';
  for(const option of Array.from(source.options)){
   const def=itemDefinition(option.value);
   const chosen=option.value===source.value;
   const entry=document.createElement('button');
   entry.type='button';entry.className='campaign-gear-picker-option';
   entry.disabled=option.disabled;
   entry.setAttribute('aria-current',chosen?'true':'false');
   const name=document.createElement('strong');name.textContent=def?.name||display(option.value);
   const detail=document.createElement('small');
   detail.textContent=(def?def.massKg.toFixed(2)+' KG':'')+
    (chosen?' · EQUIPPED':option.disabled?' · UNAVAILABLE':'');
   const description=document.createElement('span');
   description.textContent=def?.description||option.textContent||'';
   entry.append(name,detail,description);
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
  const active=list.querySelector<HTMLButtonElement>('[aria-current="true"]:not(:disabled)');
  (active||closeButton).focus({preventScroll:true});
 });
 return trigger;
}
