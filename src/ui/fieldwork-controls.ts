/** Shared explicit-choice field for mobile-first workbench and squad screens. */
export type FieldworkChoice={value:string;label:string;disabled?:boolean};
export function fieldworkSelectField(
 label:string,choices:readonly FieldworkChoice[],value:string,onChange:(value:string)=>void
):HTMLLabelElement{
 const row=document.createElement('label');
 row.className='fw-choice-row';
 const name=document.createElement('span');
 name.className='fw-choice-label';name.textContent=label;
 const select=document.createElement('select');
 select.className='fw-choice-select';
 select.setAttribute('aria-label',label);
 for(const choice of choices){
  const option=document.createElement('option');
  option.value=choice.value;option.textContent=choice.label;
  option.disabled=!!choice.disabled;select.append(option);
 }
 select.value=value;
 select.addEventListener('change',()=>onChange(select.value));
 row.append(name,select);return row;
}

/** Accessible, non-blocking confirmation for destructive scene transitions. */
export function confirmFieldworkAction(options:{
 title:string;message:string;confirmLabel:string;danger?:boolean;
}):Promise<boolean>{
 return new Promise(resolve=>{
  const backdrop=document.createElement('div');
  backdrop.className='fw-confirm-backdrop';
  const dialog=document.createElement('section');
  dialog.className='fw-confirm-dialog fw-sheet';
  dialog.setAttribute('role','alertdialog');
  dialog.setAttribute('aria-modal','true');
  const title=document.createElement('h2');
  title.textContent=options.title;
  const description=document.createElement('p');
  description.textContent=options.message;
  const actions=document.createElement('div');
  actions.className='fw-confirm-actions';
  const cancel=document.createElement('button');
  cancel.type='button';cancel.className='fw-button';
  cancel.textContent='CANCEL';
  const confirm=document.createElement('button');
  confirm.type='button';confirm.className='fw-button';
  confirm.textContent=options.confirmLabel;
  if(options.danger)confirm.dataset.danger='';
  else confirm.dataset.primary='';
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const finish=(result:boolean)=>{
   backdrop.remove();
   prior?.focus({preventScroll:true});
   resolve(result);
  };
  cancel.addEventListener('click',()=>finish(false));
  confirm.addEventListener('click',()=>finish(true));
  backdrop.addEventListener('click',event=>{
   if(event.target===backdrop)finish(false);
  });
  backdrop.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();finish(false);}
   if(event.key==='Tab'){
    event.preventDefault();
    (document.activeElement===cancel?confirm:cancel).focus();
   }
  });
  actions.append(cancel,confirm);
  dialog.append(title,description,actions);
  backdrop.append(dialog);document.body.append(backdrop);
  cancel.focus({preventScroll:true});
 });
}

/** Explicit text editing that stays within Fieldwork's interface and honors Escape. */
export function promptFieldworkText(options:{
 title:string;value:string;label:string;maxLength?:number;confirmLabel?:string;
}):Promise<string|null>{
 return new Promise(resolve=>{
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const backdrop=document.createElement('div');
  backdrop.className='fw-confirm-backdrop';
  const dialog=document.createElement('section');
  dialog.className='fw-confirm-dialog fw-sheet';
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  const heading=document.createElement('h2');
  heading.textContent=options.title;
  const label=document.createElement('label');
  label.className='fw-text-prompt-label';
  label.textContent=options.label;
  const input=document.createElement('input');
  input.type='text';input.className='fw-text-prompt';
  input.maxLength=options.maxLength??64;
  input.value=options.value;
  label.append(input);
  const actions=document.createElement('div');
  actions.className='fw-confirm-actions';
  const cancel=document.createElement('button');
  cancel.className='fw-button';cancel.textContent='CANCEL';cancel.type='button';
  const accept=document.createElement('button');
  accept.className='fw-button';accept.textContent=options.confirmLabel??'SAVE';
  accept.type='button';accept.dataset.primary='';
  const finish=(value:string|null)=>{
   backdrop.remove();
   prior?.focus({preventScroll:true});
   resolve(value);
  };
  cancel.addEventListener('click',()=>finish(null));
  accept.addEventListener('click',()=>{
   const name=input.value.trim();if(name)finish(name);
   else{input.setCustomValidity('Enter a name');input.reportValidity();}
  });
  input.addEventListener('input',()=>input.setCustomValidity(''));
  backdrop.addEventListener('click',event=>{
   if(event.target===backdrop)finish(null);
  });
  backdrop.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();finish(null);}
   else if(event.key==='Enter'){event.preventDefault();accept.click();}
   else if(event.key==='Tab'){
    const focusables=[input,cancel,accept];
    const current=focusables.indexOf(document.activeElement as HTMLInputElement);
    event.preventDefault();
    focusables[(current+(event.shiftKey?2:1))%3].focus();
   }
  });
  actions.append(cancel,accept);
  dialog.append(heading,label,actions);backdrop.append(dialog);
  document.body.append(backdrop);
  input.focus({preventScroll:true});input.select();
 });
}

/** Single-action notice rather than a blocking browser alert. */
export function showFieldworkNotice(title:string,message:string):Promise<void>{
 return new Promise(resolve=>{
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const backdrop=document.createElement('div');
  backdrop.className='fw-confirm-backdrop';
  const dialog=document.createElement('section');
  dialog.className='fw-confirm-dialog fw-sheet';
  dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-modal','true');
  const h=document.createElement('h2');h.textContent=title;
  const p=document.createElement('p');p.textContent=message;
  const close=document.createElement('button');
  close.type='button';close.className='fw-button';
  close.dataset.primary='';close.textContent='OK';
  const done=()=>{backdrop.remove();prior?.focus({preventScroll:true});resolve();};
  close.addEventListener('click',done);
  backdrop.addEventListener('keydown',e=>{
   if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();done();}
  });
  dialog.append(h,p,close);backdrop.append(dialog);document.body.append(backdrop);
  close.focus({preventScroll:true});
 });
}
