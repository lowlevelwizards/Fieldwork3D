/** Fieldwork R4 select: consistent touch/keyboard popup instead of iOS picker.
 * Anchors to the trigger but mounts to document.body so clipped galleries
 * cannot cut off the menu. No native select appears in the primary UI.
 */
export type FieldworkChoice={value:string;label:string;disabled?:boolean;hint?:string;swatch?:string};
export function fieldworkSelect(args:{
 label:string;value:string;choices:readonly FieldworkChoice[];
 onChange:(value:string)=>void;
 compact?:boolean;
}):HTMLButtonElement{
 const trigger=document.createElement('button');
 trigger.type='button';
 trigger.className='fw-select-trigger';
 trigger.setAttribute('aria-label',args.label);
 trigger.setAttribute('aria-haspopup','listbox');
 trigger.setAttribute('aria-expanded','false');
 const selected=args.choices.find(c=>c.value===args.value);
 trigger.textContent=selected?.label??args.label;
 if(args.compact)trigger.classList.add('is-compact');
 let menu:HTMLDivElement|null=null,restoreFocus=false;
 const cleanup=()=>{
  if(!menu)return;
  document.removeEventListener('pointerdown',outside,true);
  window.removeEventListener('resize',reposition);
  document.removeEventListener('keydown',onKeydown,true);
  window.removeEventListener('scroll',reposition,true);
  menu.remove();menu=null;
  trigger.setAttribute('aria-expanded','false');
  if(restoreFocus&&trigger.isConnected)trigger.focus({preventScroll:true});
  restoreFocus=false;
 };
 const reposition=()=>{
  if(!menu)return;
  if(!trigger.isConnected){cleanup();return;}
  const r=trigger.getBoundingClientRect(),gap=5;
  const vw=window.innerWidth,vh=window.innerHeight;
  const width=Math.min(270,Math.max(172,r.width));
  menu.style.width=width+'px';
  menu.style.left=Math.min(vw-width-6,Math.max(6,r.right-width))+'px';
  const below=vh-r.bottom-gap,above=r.top-gap;
  const down=below>=Math.min(188,above);
  menu.style.maxHeight=Math.max(90,Math.min(260,down?below:above))+'px';
  menu.style.top=down?r.bottom+gap+'px':'auto';
  menu.style.bottom=down?'auto':vh-r.top+gap+'px';
 };
 const outside=(event:PointerEvent)=>{
  if(menu&&!menu.contains(event.target as Node)&&
   !trigger.contains(event.target as Node))cleanup();
 };
 const onKeydown=(event:KeyboardEvent)=>{
  if(!menu)return;
  if(event.key==='Escape'){
   event.preventDefault();restoreFocus=true;cleanup();return;
  }
  const entries=[...menu.querySelectorAll<HTMLButtonElement>(
   '.fw-select-choice:not(:disabled)')];
  if(!entries.length)return;
  const current=entries.indexOf(document.activeElement as HTMLButtonElement);
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();
   entries[(current+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length]
    .focus({preventScroll:true});
  }
  if(event.key==='Home'||event.key==='End'){
   event.preventDefault();
   entries[event.key==='Home'?0:entries.length-1].focus({preventScroll:true});
  }
 };
 trigger.addEventListener('click',()=>{
  if(menu){cleanup();return;}
  menu=document.createElement('div');
  menu.className='fw-select-menu';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label',args.label);
  for(const entry of args.choices){
   const option=document.createElement('button');
   option.type='button';option.className='fw-select-choice';
   option.setAttribute('role','option');
   option.setAttribute('aria-selected',String(entry.value===args.value));
   if(entry.swatch){
    const chip=document.createElement('span');
    chip.className='fw-select-color-chip';
    chip.style.backgroundColor=entry.swatch;
    option.append(chip);
   }
   const title=document.createElement('strong');title.textContent=entry.label;
   option.append(title);
   if(entry.hint){
    const hint=document.createElement('small');hint.textContent=entry.hint;
    option.append(hint);
   }
   option.disabled=!!entry.disabled;
   if(entry.value===args.value)option.classList.add('is-selected');
   option.addEventListener('click',()=>{
    if(option.disabled)return;
    trigger.textContent=entry.label;
    restoreFocus=true;cleanup();
    if(entry.value!==args.value)args.onChange(entry.value);
   });
   menu.append(option);
  }
  document.body.append(menu);
  trigger.setAttribute('aria-expanded','true');
  reposition();
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('keydown',onKeydown,true);
  window.addEventListener('resize',reposition);
  window.addEventListener('scroll',reposition,true);
  const current=menu.querySelector<HTMLButtonElement>('.is-selected:not(:disabled)');
  (current??menu.querySelector<HTMLButtonElement>('button:not(:disabled)'))
   ?.focus({preventScroll:true});
 });
 return trigger;
}
