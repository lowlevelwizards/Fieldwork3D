import {createEquipmentWorkspace} from '../ui/equipment-workspace.ts';
import {OUTFITTER_ZONE_LABELS,previewFocusForOutfitterSlot} from '../ui/outfitter-zone-nav.ts';
import type {EquipmentThumbnailTarget} from '../equipment-preview.ts';
import type {LoadoutSlot} from '../equipment-loadouts.ts';
import type {StudioRoute} from './navigation.ts';
import type {StudioWorkspaceActions,StudioWorkspaceMount} from './shell.ts';

type Workspace=ReturnType<typeof createEquipmentWorkspace>;
type Member=Parameters<Workspace['mountPreview']>[1];
type Sources=Parameters<Workspace['mountGallery']>[1]['sources'];
export type StudioEquipmentSnapshot=Readonly<{
 member:Member;sources:Sources;locked:boolean;arsenalDisabled?:boolean;
 thumbnailTarget:(slot:LoadoutSlot,id:string)=>EquipmentThumbnailTarget;
}>;
export type StudioEquipmentPorts=Readonly<{
 readOperator:(id:string)=>StudioEquipmentSnapshot|null;
 equip:(id:string,slot:LoadoutSlot,itemId:string)=>boolean;
 onAdvanced:(id:string)=>void;
 onAutoPack?:(id:string)=>boolean;
}>;

/** One factory per Studio session. Actual R7.3 preview and gallery are reused;
 * the caller supplies authorized snapshots and domain mutation callbacks. */
export function createStudioOperatorEquipment(ports:StudioEquipmentPorts,
 createWorkspace:()=>Workspace=createEquipmentWorkspace):StudioWorkspaceMount{
 const workspace=createWorkspace();
 const azimuths=new Map<string,number>();
 let mounted=false;
 return (host,initial,actions:StudioWorkspaceActions)=>{
  if(initial.workspace!=='operators')throw new Error('Operator route required');
  if(mounted)throw new Error('Equipment workspace already mounted');
  mounted=true;
  const doc=host.ownerDocument;
  const root=doc.createElement('section');root.className='fw-studio-equipment';
  const rail=doc.createElement('nav');rail.className='fw-studio-equipment-zones';rail.setAttribute('aria-label','Equipment categories');
  const previewHost=doc.createElement('div');previewHost.className='fw-studio-equipment-preview';
  const drawer=doc.createElement('div');drawer.className='fw-studio-equipment-drawer';
  const note=doc.createElement('p');note.setAttribute('role','status');note.hidden=true;
  root.append(rail,previewHost,drawer,note);host.append(root);
  let route=initial,snapshot:StudioEquipmentSnapshot|null=null,disposed=false;
  let activeId:string|null=null,selected:LoadoutSlot|null=null;
  let gallery:ReturnType<Workspace['mountGallery']>|null=null,railGeneration=0;
  const controls=new Map<LoadoutSlot,HTMLButtonElement>();
  const rememberOrbit=()=>{if(activeId&&workspace.preview?.isReady())azimuths.set(activeId,workspace.preview.getAzimuth());};
  function select(slot:LoadoutSlot){if(!disposed&&snapshot?.sources.has(slot))actions.selectCategory(route.category===slot?null:slot);}
  function setNote(message:string){note.textContent=message;note.hidden=!message;}
  function showCategory(){
   if(!snapshot)return;
   const next=route.category as LoadoutSlot|null;
   selected=next&&snapshot.sources.has(next)?next:null;
   for(const [slot,button] of controls)button.setAttribute('aria-pressed',String(selected===slot));
   const preview=workspace.preview;
   preview?.clearTransientSelection();
   if(!selected){drawer.hidden=true;gallery=null;workspace.retireGallery();preview?.focusOn('full');return;}
   drawer.hidden=false;preview?.setSelectedSlot(selected);preview?.focusOn(previewFocusForOutfitterSlot(selected));
   const current=snapshot,id=current.member.id;
   gallery??=workspace.mountGallery(id,{
    host:drawer,sources:current.sources,kit:current.member.loadout,magazines:current.member.magazines??[],locked:current.locked,
    arsenalDisabled:current.arsenalDisabled||current.locked,
    renderModel:(slot,itemId)=>workspace.preview?.renderModelThumbnailAsync(current.thumbnailTarget(slot,itemId))??null,
    onEquip:(slot,itemId)=>{
     if(disposed||current.locked)return;
     const changed=ports.equip(id,slot,itemId);
     if(!changed)workspace.memoryFor(id).selectedItems.delete(slot);
     refresh();if(!changed)setNote('Equipment change unavailable.');
    },
    onArsenal:()=>{if(!current.locked&&!current.arsenalDisabled)actions.openArsenal('primary');},
    onAutoPack:ports.onAutoPack?()=>{if(!current.locked){ports.onAutoPack?.(id);refresh();}}:undefined,
    onInspect:(slot,itemId)=>workspace.preview?.selectItemDot(itemId?{kind:'gear',slot,itemId:slot==='primary'?current.member.loadout.slots.primary:itemId}:null),
    onSelectCategory:slot=>{if(!disposed)actions.selectCategory(slot);},
    onAdvanced:()=>{if(!current.locked)ports.onAdvanced(id);}
   });
   gallery.show(selected);
  }
  function refresh(){
   if(disposed)return;
   rememberOrbit();gallery=null;workspace.beginRender();railGeneration++;
   const next=route.operatorId?ports.readOperator(route.operatorId):null;
   snapshot=next?.member.id===route.operatorId?next:null;
   rail.replaceChildren();controls.clear();setNote('');
   if(!snapshot){activeId=null;workspace.releasePreview();drawer.hidden=true;setNote('Select an available operator.');return;}
   const id=snapshot.member.id,changed=id!==activeId;
   const preview=workspace.mountPreview(previewHost,snapshot.member,'full',azimuths.get(id));
   if(changed&&azimuths.has(id))preview.setAzimuth(azimuths.get(id)!);
   activeId=id;preview.setOnTapSlot(select);
   for(const [slot,label] of OUTFITTER_ZONE_LABELS){
    if(!snapshot.sources.has(slot))continue;
    const button=doc.createElement('button');button.type='button';button.textContent=label;button.dataset.slot=slot;
    const generation=railGeneration;
    button.addEventListener('click',()=>{if(generation===railGeneration)select(slot);});rail.append(button);controls.set(slot,button);
   }
   showCategory();
  }
  function dispose(){if(disposed)return;disposed=true;try{rememberOrbit();workspace.dispose();}finally{root.remove();mounted=false;}}
  try{refresh();}catch(error){dispose();throw error;}
  return {update(next:StudioRoute){
   if(disposed)return;if(next.workspace!=='operators')throw new Error('Operator route required');
   const changed=next.operatorId!==route.operatorId;route=next;
   if(changed)refresh();else showCategory();
  },dispose};
 };
}
