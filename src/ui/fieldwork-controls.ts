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
