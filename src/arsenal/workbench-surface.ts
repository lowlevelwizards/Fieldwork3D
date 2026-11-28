/** Shared surface ownership for standalone and embedded weapon editors. */
export type WorkbenchMount=Readonly<{host:HTMLElement;onClose?:()=>void}>;
export type WorkbenchHandle=Readonly<{
 requestClose:()=>boolean;
 canLeave:()=>boolean;
 dispose:()=>void;
}>;
export function attachWorkbenchSurface(overlay:HTMLElement,mount?:WorkbenchMount){
 const doc=overlay.ownerDocument;
 const previous=doc.activeElement as HTMLElement|null;
 const oldOverflow=doc.body.style.overflow;
 const host=mount?.host??doc.body;
 let disposed=false;
 let unbind:()=>void=()=>{};
 if(mount){
  overlay.classList.add('arsenal-wb-embedded');
  overlay.removeAttribute('aria-modal');
 }
 host.append(overlay);
 if(!mount)doc.body.style.overflow='hidden';
 function bindKeys(handler:(event:KeyboardEvent)=>void,standalone:EventTarget=doc){
  unbind();
  const target:EventTarget=mount?overlay:standalone;
  const listener=(event:Event)=>{
   if(disposed)return;
   const key=event as KeyboardEvent;
   if(key.defaultPrevented)return;
   handler(key);
   if(mount&&key.defaultPrevented)key.stopPropagation();
  };
  target.addEventListener('keydown',listener);
  unbind=()=>target.removeEventListener('keydown',listener);
 }
 function dispose(cleanup:()=>void,notify=false){
  if(disposed)return;
  disposed=true;unbind();
  try{cleanup();}finally{
   overlay.remove();
   if(!mount)doc.body.style.overflow=oldOverflow;
   if(notify)mount?.onClose?.();
   if(previous?.isConnected)previous.focus();
  }
 }
 return {bindKeys,dispose,get disposed(){return disposed;}};
}
