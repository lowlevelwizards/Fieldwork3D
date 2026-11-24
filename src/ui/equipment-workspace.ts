/** R7.3 — shared *presentation* lifecycle, one instance per equipment view.
 * Committed equipment and callbacks are supplied by the mode owner. This
 * module has no authority to buy, issue, save or mutate kit/roster state.
 */
import {CampaignKitPreview} from '../equipment-preview.ts';
import {createOutfitterGallery,type OutfitterGalleryOptions}
 from './campaign-outfitter-gallery.ts';
type PreviewArgs=ConstructorParameters<typeof CampaignKitPreview>;
type PreviewMember={
 id:PreviewArgs[1];weapon:PreviewArgs[2];appearanceSeed:PreviewArgs[3];
 loadout:PreviewArgs[4];weaponConfiguration?:PreviewArgs[5];
 magazines?:PreviewArgs[6];wardrobe?:PreviewArgs[7];
};
type Gallery=ReturnType<typeof createOutfitterGallery>;
type GalleryMemory={selectedItems:Map<string,string>;scrollPositions:Map<string,number>};
type WorkspacePorts={
 createPreview?:(...args:PreviewArgs)=>CampaignKitPreview;
 createGallery?:(options:OutfitterGalleryOptions)=>Gallery;
 requestFrame?:(callback:FrameRequestCallback)=>number;
 cancelFrame?:(id:number)=>void;
};
export function createEquipmentWorkspace(ports:WorkspacePorts={}){
 const createPreview=ports.createPreview??((...args:PreviewArgs)=>new CampaignKitPreview(...args));
 const createGallery=ports.createGallery??createOutfitterGallery;
 const requestFrame=ports.requestFrame??(callback=>requestAnimationFrame(callback));
 const cancelFrame=ports.cancelFrame??(id=>cancelAnimationFrame(id));
 const memories=new Map<string,GalleryMemory>();
 let preview:CampaignKitPreview|null=null;
 let gallery:Gallery|null=null;
 let galleryGeneration=0,frameGeneration=0;
 let pendingFrame:number|null=null;
 function memoryFor(id:string):GalleryMemory{
  let memory=memories.get(id);
  if(!memory){
   memory={selectedItems:new Map(),scrollPositions:new Map()};
   memories.set(id,memory);
  }
  return memory;
 }
 function retireGallery():void{
  galleryGeneration++;
  const previous=gallery;gallery=null;previous?.dispose();
 }
 function cancelDeferredMount():void{
  frameGeneration++;
  if(pendingFrame!==null)cancelFrame(pendingFrame);
  pendingFrame=null;
 }
 /** Before a host rebuild: cancel old frame and thumbnail work first. */
 function beginRender():void{cancelDeferredMount();retireGallery();}
 function mountGallery(id:string,options:Omit<OutfitterGalleryOptions,
  'selectedItems'|'scrollPositions'>):Gallery{
  retireGallery();
  const generation=galleryGeneration;
  const current=()=>generation===galleryGeneration;
  gallery=createGallery({...options,...memoryFor(id),
   renderModel:(slot,itemId)=>current()?options.renderModel(slot,itemId):null,
   onEquip:(slot,itemId)=>{if(current())options.onEquip(slot,itemId);},
   onArsenal:()=>{if(current())options.onArsenal();},
   onAutoPack:options.onAutoPack?()=>{if(current())options.onAutoPack?.();}:undefined,
   onInspect:(slot,itemId)=>{if(current())options.onInspect?.(slot,itemId);},
   onSelectCategory:slot=>{if(current())options.onSelectCategory?.(slot);},
   onAdvanced:()=>{if(current())options.onAdvanced();}
  });
  return gallery;
 }
 function releasePreview():void{
  cancelDeferredMount();
  const previous=preview;preview=null;
  previous?.setOnTapSlot(null);previous?.dispose();
 }
 function mountPreview(host:HTMLElement,member:PreviewMember,
  initialFocus?:PreviewArgs[8],initialAzimuth?:PreviewArgs[9]):CampaignKitPreview{
  if(preview&&!preview.isReady())releasePreview();
  if(!preview){
   preview=createPreview(host,member.id,member.weapon,member.appearanceSeed,
    member.loadout,member.weaponConfiguration,member.magazines,member.wardrobe,
    initialFocus,initialAzimuth);
  }else{
   preview.setOperatorId(member.id);
   preview.attachHost(host,false);
   preview.updateEquipment(member.weapon,member.appearanceSeed,member.loadout,
    member.weaponConfiguration,member.magazines,member.wardrobe);
  }
  return preview;
 }
 /** Existing one-shot post-mount RAF; even a late canceled callback is inert. */
 function deferPreviewMount(isVisible:()=>boolean, mount:()=>void):void{
  cancelDeferredMount();
  const generation=frameGeneration;
  pendingFrame=requestFrame(()=>{
   if(generation!==frameGeneration)return;
   pendingFrame=null;
   if(isVisible())mount();
  });
 }
 function dispose():void{beginRender();releasePreview();}
 return {get preview(){return preview;},memoryFor,beginRender,mountGallery,
  mountPreview,deferPreviewMount,retireGallery,releasePreview,dispose};
}
