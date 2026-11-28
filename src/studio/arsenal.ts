import {mountArsenalGallery,type ArsenalGalleryOptions} from '../arsenal/gallery-main.ts';
import {openArsenalWorkbench,type ArsenalWorkbenchApplyContext} from '../arsenal/workbench-screen.ts';
import {openGlockWorkbench} from '../arsenal/glock-workbench.ts';
import {openM9Inspector} from '../arsenal/m9-inspector.ts';
import type {WorkbenchHandle,WorkbenchMount} from '../arsenal/workbench-surface.ts';
import type {ArsenalRoute,StudioRoute} from './navigation.ts';
import type {StudioWorkspaceMount} from './shell.ts';

type Embedded=Extract<ArsenalGalleryOptions,{embedded:true}>;
type PrimaryOpen=Embedded['openPrimary'];
type SecondaryOpen=Embedded['secondaryOpen'];
export type StudioArsenalPorts=Readonly<{
 /** Mode owner supplies an authorized draft/quote adapter; absence is inspection-only. */
 primaryContext?:(route:ArsenalRoute)=>ArsenalWorkbenchApplyContext|undefined;
 onError?:(error:unknown)=>void;
}>;
type Dependencies=Readonly<{
 gallery:typeof mountArsenalGallery;
 primary:typeof openArsenalWorkbench;
 glock:typeof openGlockWorkbench;
 m9:typeof openM9Inspector;
}>;
const defaults:Dependencies={gallery:mountArsenalGallery,primary:openArsenalWorkbench,glock:openGlockWorkbench,m9:openM9Inspector};

/** The existing galleries and workbenches share one Studio workspace.
 * No gameplay authority is granted by mounting or switching a weapon tab. */
export function createStudioArsenal(ports:StudioArsenalPorts={},
 deps:Dependencies=defaults):StudioWorkspaceMount{
 return (host,initial,actions)=>{
  if(initial.workspace!=='arsenal')throw new Error('Arsenal route required');
  let route=initial,disposed=false,opening=false;
  let active:WorkbenchHandle|null=null;
  const doc=host.ownerDocument;
  const galleryHost=doc.createElement('div');galleryHost.className='fw-studio-arsenal-gallery';
  const editorHost=doc.createElement('div');editorHost.className='fw-studio-arsenal-editor';editorHost.hidden=true;
  host.append(galleryHost,editorHost);
  let gallery:ReturnType<typeof mountArsenalGallery>;
  function showGallery(){
   active=null;editorHost.hidden=true;galleryHost.hidden=false;gallery.setVisible(true);
  }
  function launch(factory:(mount:WorkbenchMount)=>WorkbenchHandle|undefined){
   if(disposed||active||opening)return;
   opening=true;
   // Keep the initiating control in the document for focus restoration.
   editorHost.hidden=false;gallery.setVisible(false);galleryHost.hidden=true;
   try{
    const handle=factory({host:editorHost,onClose:()=>{if(!disposed)showGallery();}});
    if(!handle)showGallery();
    else if(disposed)handle.dispose();else active=handle;
   }catch(error){
    if(!disposed){showGallery();ports.onError?.(error);}
   }finally{opening=false;}
  }
  const primary:PrimaryOpen=(source,refresh)=>{
   if(disposed||(route.slot!==null&&route.slot!=='primary'))return;
   const context=route.slot==='primary'&&route.operatorId?ports.primaryContext?.(route):undefined;
   launch(mount=>deps.primary(source,id=>{if(!disposed)refresh(id);},context,mount));
  };
  const secondary:SecondaryOpen={
   glock:(recipe,refresh)=>{
    if(disposed||(route.slot!==null&&route.slot!=='secondary'))return;
    launch(mount=>deps.glock(recipe,{onLibraryChange:()=>{if(!disposed)refresh();}},mount));
   },
   m9:id=>{
    if(disposed||(route.slot!==null&&route.slot!=='secondary'))return;
    launch(mount=>deps.m9(id,mount));
   }
  };
  try{
   gallery=deps.gallery(galleryHost,{embedded:true,initialCategory:route.slot??'primary',
    onSelectCategory:category=>!disposed&&!active&&!opening&&(route.slot===null||actions.openArsenal(category)),
    openPrimary:primary,secondaryOpen:secondary});
  }catch(error){galleryHost.remove();editorHost.remove();throw error;}
  function retireEditor(){
   const old=active;active=null;
   try{old?.dispose();}finally{if(!disposed)showGallery();}
  }
  return {
   canLeave:()=>!opening&&(active?.canLeave()??true),
   back(){if(!active)return false;active.requestClose();return true;},
   update(next:StudioRoute){
    if(disposed)return;if(next.workspace!=='arsenal')throw new Error('Arsenal route required');
    const changed=route.slot!==next.slot||route.operatorId!==next.operatorId;route=next;
    if(changed){retireEditor();gallery.showCategory(route.slot??'primary');}
   },
   dispose(){
    if(disposed)return;disposed=true;
    try{retireEditor();}finally{try{gallery.dispose();}finally{galleryHost.remove();editorHost.remove();}}
   }
  };
 };
}
