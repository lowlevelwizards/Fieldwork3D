/** Shared DOM-only Arsenal browser controls.
 * Primary rifles and Glock secondaries retain their own filter semantics,
 * saved-build validation, workbench and storage authorities.
 */
export function renderArsenalFilterButtons<Id extends string>(
 host:HTMLElement,items:readonly {id:Id;name:string}[],
 selected:Id,onChoose:(id:Id)=>void
):void{
 host.replaceChildren();
 for(const item of items){
  const button=document.createElement('button');
  button.type='button';
  button.className='arsenal-filter';
  button.textContent=item.name;
  button.setAttribute('aria-pressed',String(selected===item.id));
  button.addEventListener('click',()=>onChoose(item.id));
  host.append(button);
 }
}

export function createArsenalSavedActionButtons():{
 rename:HTMLButtonElement;
 duplicate:HTMLButtonElement;
 remove:HTMLButtonElement;
}{
 const make=(label:string)=>{
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  return button;
 };
 return {rename:make('RENAME'),duplicate:make('DUPLICATE'),remove:make('DELETE')};
}
