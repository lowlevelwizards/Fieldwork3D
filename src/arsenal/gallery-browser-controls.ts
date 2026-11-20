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

/** A shared card shell, not a shared selection or weapon renderer. The
 * primary and secondary owners still assign dataset IDs, click handlers and
 * all preview scheduling independently.
 */
export function createArsenalGalleryCard(options:{
 kind:'primary'|'secondary';
 name:string;
 subtitle:string;
 ariaLabel:string;
 selected:boolean;
}):{button:HTMLButtonElement;preview:HTMLElement}{
 const secondary=options.kind==='secondary';
 const button=document.createElement('button');
 button.type='button';
 button.className=secondary?'arsenal-card arsenal-glock-card':'arsenal-card';
 button.setAttribute('aria-pressed',String(options.selected));
 button.setAttribute('aria-label',options.ariaLabel);
 const preview=document.createElement(secondary?'span':'div');
 preview.className=secondary?
  'arsenal-card-preview arsenal-glock-card-preview':'arsenal-card-preview';
 const model=document.createElement('strong');
 model.className='model';
 model.textContent=options.name;
 const subtitle=document.createElement(secondary?'small':'span');
 subtitle.className='platform';
 subtitle.textContent=options.subtitle;
 button.append(preview,model,subtitle);
 return {button,preview};
}
