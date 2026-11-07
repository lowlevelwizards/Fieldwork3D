/** Operator Lab visual inventory: actual 3D rig renders, never icons or
 * mock drawings. One SHARED WebGLRenderer (the Lab renderer), one render
 * target, and one thumbnail rig at a time. No per-card WebGL contexts.
 *
 * Catalog is authoritative WARDROBE_ITEMS, so purged placeholders cannot
 * accidentally return through an old selector. Category state is UI-only.
 */
import * as THREE from 'three';
import {applyOperatorHeightLighting} from './operator-height-lighting.ts';
import {studioLightLabFromQuery,type StudioLightLabSettings}
 from './operator-studio-light-lab.ts';
import {OperatorStudioLighting,STUDIO_INSPECTION_BACKGROUND}
 from './operator-studio-lighting.ts';
import {applyOperatorStudioToon,disposeOperatorStudioToon}
 from './operator-studio-toon-lighting.ts';
import {applyStudioGraphicLighting,restoreStudioGraphicLighting,
 disposeStudioGraphicLighting} from './operator-studio-graphic-lighting.ts';
import {THUMB_LINEAR_TO_SRGB} from './operator-thumbnail-color.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {appearanceThumbnailContext,appearanceThumbnailKey,
 type AppearanceThumbnailContext} from './operator-appearance-thumbnail-context.ts';
import {bareLabEquipment} from './operator-lab-baseline.ts';
import {initialWardrobe,resolvedWardrobe,
 wardrobeItemsForSlot,WARDROBE_SLOTS,type WardrobeSlot,
 type WardrobeOptions,type WardrobeItem} from './operator-wardrobe-data.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {studioUsesVisibleFace} from './operator-studio-preview-policy.ts';
import {selectWardrobeItem} from './operator-wardrobe-unified.ts';

export const APPEARANCE_GROUP_LABELS:Readonly<Record<WardrobeSlot,string>>={
 headwear:'HEAD',facewear:'FACE',eyewear:'EYES',headset:'COMMS',
 top:'TOPS',trousers:'LEGS',footwear:'FEET',armorStyle:'ARMOR',
 rigStyle:'RIG',beltStyle:'BELT',packStyle:'PACK',
 gloves:'HANDS',knees:'KNEES',wrist:'WRIST'
};
const THUMB_SIZE=160;
type Entry={item:WardrobeItem;canvas:HTMLCanvasElement;button:HTMLButtonElement;
 caption:HTMLSpanElement;key:string;readyKey:string;
 context:AppearanceThumbnailContext};
type OnSelect=(slot:WardrobeSlot,id:string)=>void;
const focus=(slot:WardrobeSlot)=>{
 if(slot==='facewear')
  return {height:43,span:13.3,angle:[52,21,-15] as const};
 if(['headwear','eyewear','headset'].includes(slot))
  return {height:43,span:15,angle:[27,25,-43] as const};
 if(['top','armorStyle','rigStyle','beltStyle','gloves','wrist'].includes(slot))
  return {height:30,span:24,angle:[43,33,-52] as const};
 if(['trousers','footwear','knees'].includes(slot))
  return {height:14,span:23,angle:[40,34,-49] as const};
 if(slot==='packStyle')
  return {height:31,span:27,angle:[46,37,54] as const};
 return {height:26,span:33,angle:[46,43,-54] as const};
};
export function activeAppearanceItems(slot:WardrobeSlot):readonly WardrobeItem[]{
 return wardrobeItemsForSlot(slot);
}
export function appearanceItemAvailable(kit:EquipmentLoadout,w:WardrobeOptions,
 slot:WardrobeSlot,id:string):boolean{
 const selected=selectWardrobeItem(kit,w,slot,id);
 return resolvedWardrobe(selected.wardrobe,selected.kit)[slot]===id;
}
export class OperatorAppearanceGrid{
 private readonly nav:HTMLElement;
 private readonly grid:HTMLElement;
 private readonly summary:HTMLElement;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.OrthographicCamera(-24,24,24,-24,.1,220);
 private readonly target=new THREE.WebGLRenderTarget(THUMB_SIZE,THUMB_SIZE,{
  depthBuffer:true,stencilBuffer:false});
 private readonly pixels=new Uint8Array(THUMB_SIZE*THUMB_SIZE*4);
 private readonly cache=new Map<string,ImageData>();
 /** Cards survive option changes; only changing category resets their DOM. */
 private readonly cards=new Map<string,Entry>();
 private renderedCategory:WardrobeSlot|null=null;
 /** One rig is reused across a whole item catalog and color changes. */
 private thumbnailRig:OperatorRig|null=null;
 private rigIdentity='';
 private readonly pending=new Map<HTMLCanvasElement,Entry>();
 private readonly observer:IntersectionObserver|null;
 private scheduled=false;
 /** One WebGL render target and byte buffer means one in-flight GPU readback.
  * Never render a second item into the target until the first has resolved. */
 private reading=false;
 /** Stop queued GPU thumbnail work when the Studio iframe is hidden. */
 private suspended=false;
 private selected:WardrobeSlot='top';
 private lightingSettings=studioLightLabFromQuery(window.location.search);
 private token=0;
 private queue:Entry[]=[];
 private kit:EquipmentLoadout=bareLabEquipment();
 private wardrobe:WardrobeOptions=initialWardrobe();
 private readonly onSelect:OnSelect;
 private readonly canEquip?: (slot:WardrobeSlot,id:string)=>boolean;
 private readonly liveContext:boolean;
 private previewIdentity='rook';
 private readonly renderer:THREE.WebGLRenderer;
 private readonly lighting:OperatorStudioLighting;
 constructor(root:HTMLElement,renderer:THREE.WebGLRenderer,onSelect:OnSelect,
  canEquip?: (slot:WardrobeSlot,id:string)=>boolean,
  liveContext=false){
  this.renderer=renderer;this.onSelect=onSelect;this.canEquip=canEquip;
  // Avoid compiling/posing/reading off-screen cards on a small phone.
  this.observer=typeof IntersectionObserver==='undefined'?null:
   new IntersectionObserver(events=>{
    for(const event of events){
     if(!event.isIntersecting)continue;
     const canvas=event.target as HTMLCanvasElement;
     const entry=this.pending.get(canvas);
     if(!entry)continue;
     this.pending.delete(canvas);
     this.observer?.unobserve(canvas);
     this.queue.push(entry);
    }
    if(this.queue.length)this.scheduleThumb();
   },{rootMargin:'240px 0px'});
  this.liveContext=liveContext;
  // Exact same inspection lighting and backdrop as the full-size Studio.
  // A smaller shadow map is visually sufficient for 160px cards.
  this.scene.background=new THREE.Color(STUDIO_INSPECTION_BACKGROUND);
  this.lighting=new OperatorStudioLighting(this.scene,this.renderer,
   window.location.search,512);
  this.nav=document.createElement('div');this.nav.className='appearance-item-tabs';
  this.nav.setAttribute('role','tablist');
  this.nav.setAttribute('aria-label','Operator appearance item categories');
  this.grid=document.createElement('div');this.grid.className='appearance-item-grid';
  this.grid.setAttribute('role','tabpanel');
  this.summary=document.createElement('p');this.summary.className='appearance-item-count';
  root.replaceChildren(this.nav,this.summary,this.grid);
  for(const slot of WARDROBE_SLOTS){
   const button=document.createElement('button');button.type='button';
   button.className='appearance-item-tab';button.dataset.appearanceTab=slot;
   button.textContent=APPEARANCE_GROUP_LABELS[slot];
   button.setAttribute('role','tab');
   button.addEventListener('click',()=>{
    if(this.selected===slot)return;
    this.selected=slot;
    this.paint();
   });
   this.nav.append(button);
  }
 }
 refresh(kit:EquipmentLoadout,wardrobe:WardrobeOptions,
  previewIdentity='rook'){
  this.kit=kit;this.wardrobe=wardrobe;
  this.previewIdentity=previewIdentity;
  this.paint();
 }
 setCategory(slot:WardrobeSlot,deferPaint=false){
  if(this.selected===slot)return;
  this.selected=slot;
  if(!deferPaint)this.paint();
 }
 setSuspended(suspended:boolean){
  if(this.suspended===suspended)return;
  this.suspended=suspended;
  if(!suspended)this.scheduleThumb();
 }
 /** Live lighting audition: invalidate cards without destroying the rig,
  * WebGL context, scroll position or any saved wardrobe selections. */
 setLightingSettings(settings:StudioLightLabSettings){
  const previous=this.lightingSettings;
  if(previous.toon===settings.toon&&previous.rim===settings.rim&&
     previous.gradient===settings.gradient&&
     previous.shadow===settings.shadow&&
     previous.celProfile===settings.celProfile&&
     previous.celLow===settings.celLow&&
     previous.celHigh===settings.celHigh&&
     previous.allSurfaces===settings.allSurfaces)return;
  this.lightingSettings={...settings};
  this.lighting.setShadowColor(settings.shadow);
  this.cache.clear();
  for(const card of this.cards.values())card.readyKey='';
  this.paint();
 }
 private scheduleThumb(){
  if(this.suspended||this.scheduled||this.reading||!this.queue.length)return;
  this.scheduled=true;
  const token=this.token;
  requestAnimationFrame(()=>{
   this.scheduled=false;
   if(this.suspended)return;
   if(this.token!==token){
    // A category change replaced the queue while a frame was pending.
    this.scheduleThumb();return;
   }
   if(!this.grid.isConnected)return;
   const entry=this.queue.shift();
   if(entry&&this.cards.get(entry.item.id)===entry&&
      entry.readyKey!==entry.key){
    this.reading=true;
    const started=performance.now();
    void this.renderThumbnail(entry,token).finally(()=>{
     this.reading=false;
     this.grid.dataset.lastThumbnailMs=
      String(Math.round(performance.now()-started));
     this.scheduleThumb();
    });
   }else this.scheduleThumb();
  });
 }
 private paint(){
  this.token++;
  this.queue=[];
  this.pending.clear();
  this.observer?.disconnect();
  const items=activeAppearanceItems(this.selected);
  const reuse=this.renderedCategory===this.selected&&
   this.cards.size===items.length&&items.every(item=>this.cards.has(item.id));
  if(!reuse){
   this.grid.replaceChildren();
   this.cards.clear();
   this.renderedCategory=this.selected;
  }
  for(const element of this.nav.children){
   const button=element as HTMLButtonElement;
   const active=button.dataset.appearanceTab===this.selected;
   button.setAttribute('aria-selected',String(active));
   button.tabIndex=active?0:-1;
  }
  const chosen=resolvedWardrobe(this.wardrobe,this.kit)[this.selected];
  this.summary.textContent=APPEARANCE_GROUP_LABELS[this.selected]+' · '+items.length+
   ' ACTUAL 3D ITEMS · TAP TO EQUIP';
  for(const item of items){
   let entry=this.cards.get(item.id);
   if(!entry){
    const button=document.createElement('button');button.type='button';
    button.className='appearance-item-card';
    button.dataset.appearanceItem=item.id;
    button.dataset.appearanceSlot=item.slot;
    button.setAttribute('aria-label','Equip '+item.name);
    const thumb=document.createElement('canvas');
    thumb.width=thumb.height=THUMB_SIZE;
    thumb.className='appearance-item-thumbnail';
    thumb.setAttribute('aria-hidden','true');
    const title=document.createElement('span');
    title.className='appearance-item-name';title.textContent=item.name;
    const caption=document.createElement('span');
    caption.className='appearance-item-tag';
    button.append(thumb,title,caption);
    button.addEventListener('click',()=>this.onSelect(item.slot,item.id));
    this.grid.append(button);
    entry={item,canvas:thumb,button,caption,key:'',readyKey:'',
      context:appearanceThumbnailContext(this.kit,this.wardrobe,item.slot,item.id,this.liveContext)};
    this.cards.set(item.id,entry);
   }
   const active=chosen===item.id;
   const available=this.canEquip?this.canEquip(item.slot,item.id):
    appearanceItemAvailable(this.kit,this.wardrobe,item.slot,item.id);
   entry.button.setAttribute('aria-pressed',String(active));
   entry.button.setAttribute('aria-label','Equip '+item.name+
    (!available?' (unavailable for current kit)':''));
   entry.button.disabled=!available;
   entry.caption.textContent=active?'EQUIPPED':!available?'NOT AVAILABLE':
    item.slot==='top'?'APPROVED CUT':item.name.includes('foundation')?
     'FOUNDATION':'3D MODEL';
   const context=appearanceThumbnailContext(this.kit,this.wardrobe,
    item.slot,item.id,this.liveContext);
   const key=appearanceThumbnailKey(context,item.slot,item.id,
    this.previewIdentity,this.liveContext);
   entry.context=context;
   entry.key=key;
   // A different selected item does NOT require new renders of the
   // entire inventory. The existing canvas and scroll position survive.
   if(entry.readyKey===key)continue;
   entry.canvas.dataset.thumbnailReady='false';
   const cached=this.cache.get(key);
   if(cached){
    entry.canvas.getContext('2d')?.putImageData(cached,0,0);
    entry.readyKey=key;
    entry.canvas.dataset.thumbnailReady='true';
   }else if(this.observer){
    this.pending.set(entry.canvas,entry);
    this.observer.observe(entry.canvas);
   }else this.queue.push(entry);
  }
  if(this.queue.length)this.scheduleThumb();
 }
 private thumbnailRigFor(id:string):OperatorRig{
  if(this.thumbnailRig&&this.rigIdentity===id)return this.thumbnailRig;
  if(this.thumbnailRig){
   this.scene.remove(this.thumbnailRig.root);
   disposeStudioGraphicLighting(this.thumbnailRig.root);
   disposeOperatorStudioToon(this.thumbnailRig.root);
   this.thumbnailRig.dispose();
  }
  this.thumbnailRig=createOperatorRig(id,'blue');
  this.grid.dataset.thumbnailRigBuilds=String(
   Number(this.grid.dataset.thumbnailRigBuilds||0)+1);
  this.rigIdentity=id;
  return this.thumbnailRig;
 }
 private async renderThumbnail(entry:Entry,token:number):Promise<void>{
  const {item,key,canvas}=entry;
  const {kit,wardrobe:w}=entry.context;
  const rig=this.thumbnailRigFor(this.liveContext?this.previewIdentity:'rook');
  const oldTarget=this.renderer.getRenderTarget();
  const oldClear=this.renderer.getClearColor(new THREE.Color()).clone();
  const oldAlpha=this.renderer.getClearAlpha();
  const oldSceneBackground=this.scene.background;
  // Three.js declares the readback as a generic TypedArray. The supplied
  // Uint8Array is the authoritative byte destination for every pixel.
  let readback:Promise<unknown>|null=null;
  let readbackStart=0;
  try{
   // Let animated Standard material sources receive updated outfit colors;
   // reattach the selected toon variants only after that source update.
   restoreStudioGraphicLighting(rig.root);
   applyOperatorStudioToon(rig.root,0);
   rig.root.userData.fieldworkHeightProfile=this.lightingSettings.gradient;
   poseOperator(rig,{
    x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
    lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
    aiming:false,firing:false,turning:0,deterministic:true,
    faceStyle:studioUsesVisibleFace(item.slot)?'quiet':'blank',
    unarmedPreview:true,equipment:kit,wardrobe:w
   },0);
   rig.root.position.set(0,0,0);
   const profile=this.lightingSettings.gradient;
   if(!String(rig.root.userData.fieldworkHeightRootKey??'')
      .startsWith(profile+':'))
    applyOperatorHeightLighting(rig.root,
     String(rig.root.userData.fieldworkLightingAppearanceKey??'thumbnail'),
     profile);
   const light=this.lightingSettings;
   const converted=applyStudioGraphicLighting(rig.root,light);
   this.grid.dataset.operatorToonBands=String(light.toon);
   this.grid.dataset.operatorToonMeshes=String(converted.meshes);
   this.grid.dataset.operatorWeaponMeshes=String(converted.weapons);
   this.grid.dataset.operatorRimMode=light.rim;
   this.grid.dataset.operatorGradient=profile;
   this.grid.dataset.operatorShadowColor=light.shadow;
   this.scene.add(rig.root);
   this.lighting.invalidateGeometry();
   this.lighting.beforeRender(rig.root);
   const clothingMode=w.d2FaceMode;
   const view=item.slot==='facewear'&&item.id==='shemagh'?
    (clothingMode==='head-wrap'?
     {height:41.9,span:18,angle:[27,25,-43] as const}:
     clothingMode==='face-wrap'?
     {height:40.7,span:21,angle:[27,25,-43] as const}:
     {height:38.7,span:25,angle:[27,25,-43] as const}):
    item.slot==='facewear'&&item.id==='bandana'&&clothingMode==='lowered'?
     {height:40.4,span:19,angle:[27,25,-43] as const}:focus(item.slot);
   const span=view.span;
   this.camera.left=-span;this.camera.right=span;
   this.camera.top=span;this.camera.bottom=-span;
   this.camera.position.set(view.angle[0],view.angle[1],view.angle[2]);
   this.camera.position.y+=view.height;
   this.camera.lookAt(0,view.height,0);
   this.camera.updateProjectionMatrix();
   this.renderer.setRenderTarget(this.target);
   this.scene.background=new THREE.Color(STUDIO_INSPECTION_BACKGROUND);
   this.renderer.setClearColor(STUDIO_INSPECTION_BACKGROUND,1);
   this.renderer.clear(true,true,true);
   this.renderer.render(this.scene,this.camera);
   readbackStart=performance.now();
   // Stage the GPU -> CPU readback before restoring renderer state, but
   // do NOT await while the shared WebGL context is left on our FBO.
   if(new URLSearchParams(window.location.search).get('thumbnailReadback')!== 'sync'&&
      typeof this.renderer.readRenderTargetPixelsAsync==='function'){
    this.grid.dataset.readbackMode='async';
    readback=this.renderer.readRenderTargetPixelsAsync(
     this.target,0,0,THUMB_SIZE,THUMB_SIZE,this.pixels);
   }else{
    // Older renderer fallback. Never add a new WebGL context.
    this.grid.dataset.readbackMode='sync-fallback';
    this.renderer.readRenderTargetPixels(this.target,0,0,THUMB_SIZE,
     THUMB_SIZE,this.pixels);
    readback=Promise.resolve(this.pixels);
   }
  }catch{
   if(token===this.token){
    canvas.dataset.previewError='true';
    canvas.dataset.thumbnailReady='false';
   }
   return;
  }finally{
   this.scene.remove(rig.root);
   this.scene.background=oldSceneBackground;
   this.renderer.setRenderTarget(oldTarget);
   this.renderer.setClearColor(oldClear,oldAlpha);
   // Keep the shared renderer consistent for the main operator immediately.
  }
  try{
   if(!readback)return;
   await readback;
   this.grid.dataset.lastReadbackMs=
    String(Math.round((performance.now()-readbackStart)*10)/10);
   // A slow device may change category/kit before a GPU fence resolves.
   // Never paint an obsolete card, nor begin another render while pending.
   if(token!==this.token||this.suspended||!this.grid.isConnected||
      this.cards.get(item.id)!==entry||entry.key!==key)return;
   const context=canvas.getContext('2d');
   if(!context)return;
   const image=context.createImageData(THUMB_SIZE,THUMB_SIZE);
   for(let y=0;y<THUMB_SIZE;y++){
    const from=(THUMB_SIZE-1-y)*THUMB_SIZE*4,to=y*THUMB_SIZE*4;
    for(let x=0;x<THUMB_SIZE;x++){
     const src=from+x*4,dst=to+x*4;
     image.data[dst]=THUMB_LINEAR_TO_SRGB[this.pixels[src]];
     image.data[dst+1]=THUMB_LINEAR_TO_SRGB[this.pixels[src+1]];
     image.data[dst+2]=THUMB_LINEAR_TO_SRGB[this.pixels[src+2]];
     image.data[dst+3]=this.pixels[src+3];
    }
   }
   context.putImageData(image,0,0);
   if(this.cache.size>=90)this.cache.delete(this.cache.keys().next().value!);
   this.cache.set(key,image);
   this.grid.dataset.thumbnailRenders=String(
    Number(this.grid.dataset.thumbnailRenders||0)+1);
   entry.readyKey=key;
   canvas.dataset.previewError='false';
   canvas.dataset.thumbnailReady='true';
  }catch{
   if(token===this.token){
    canvas.dataset.previewError='true';
    canvas.dataset.thumbnailReady='false';
   }
  }
 }
 dispose(){
  this.token++;this.queue=[];this.cache.clear();
  this.observer?.disconnect();this.pending.clear();this.cards.clear();
  if(this.thumbnailRig){
   this.scene.remove(this.thumbnailRig.root);
   disposeStudioGraphicLighting(this.thumbnailRig.root);
   disposeOperatorStudioToon(this.thumbnailRig.root);
   this.thumbnailRig.dispose();this.thumbnailRig=null;
  }
  this.target.dispose();
  this.nav.replaceChildren();this.grid.replaceChildren();
 }
}
