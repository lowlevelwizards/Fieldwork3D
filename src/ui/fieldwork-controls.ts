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
