/** Operator Lab visual inventory: actual 3D rig renders, never icons or
 * mock drawings. One SHARED WebGLRenderer (the Lab renderer), one render
 * target, and one thumbnail rig at a time. No per-card WebGL contexts.
 *
 * Catalog is authoritative WARDROBE_ITEMS, so purged placeholders cannot
 * accidentally return through an old selector. Category state is UI-only.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {appearanceThumbnailContext,appearanceThumbnailKey,
 type AppearanceThumbnailContext} from './operator-appearance-thumbnail-context.ts';
import {bareLabEquipment} from './operator-lab-baseline.ts';
import {initialWardrobe,resolvedWardrobe,
 wardrobeItemsForSlot,WARDROBE_SLOTS,type WardrobeSlot,
 type WardrobeOptions,type WardrobeItem} from './operator-wardrobe-data.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {studioUsesVisibleFace} from './operator-studio-preview-policy.ts';

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
 if(['headwear','facewear','eyewear','headset'].includes(slot))
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
 private selected:WardrobeSlot='top';
 private token=0;
 private queue:Entry[]=[];
 private kit:EquipmentLoadout=bareLabEquipment();
 private wardrobe:WardrobeOptions=initialWardrobe();
 private readonly onSelect:OnSelect;
 private readonly canEquip?: (slot:WardrobeSlot,id:string)=>boolean;
 private readonly liveContext:boolean;
 private previewIdentity='rook';
 private readonly renderer:THREE.WebGLRenderer;
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
  this.scene.background=new THREE.Color(0x23352e);
  this.scene.add(new THREE.AmbientLight(0xffffff,1.5));
  const key=new THREE.DirectionalLight(0xffeed4,2.0);
  key.position.set(22,66,-44);this.scene.add(key);
  const fill=new THREE.DirectionalLight(0xa5bdc8,.8);
  fill.position.set(-40,30,22);this.scene.add(fill);
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
 private scheduleThumb(){
  if(this.scheduled||!this.queue.length)return;
  this.scheduled=true;
  requestAnimationFrame(()=>{
   this.scheduled=false;
   if(!this.grid.isConnected)return;
   const entry=this.queue.shift();
   if(entry&&this.cards.get(entry.item.id)===entry&&
      entry.readyKey!==entry.key){
    const started=performance.now();
    this.renderThumbnail(entry);
    this.grid.dataset.lastThumbnailMs=String(Math.round(performance.now()-started));
   }
   if(this.queue.length)this.scheduleThumb();
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
   const cached=this.cache.get(key);
   if(cached){
    entry.canvas.getContext('2d')?.putImageData(cached,0,0);
    entry.readyKey=key;
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
   this.thumbnailRig.dispose();
  }
  this.thumbnailRig=createOperatorRig(id,'blue');
  this.rigIdentity=id;
  return this.thumbnailRig;
 }
 private renderThumbnail(entry:Entry){
  const {item,key,canvas}=entry;
  const {kit,wardrobe:w}=entry.context;
  const rig=this.thumbnailRigFor(this.liveContext?this.previewIdentity:'rook');
  const oldTarget=this.renderer.getRenderTarget();
  const oldClear=this.renderer.getClearColor(new THREE.Color()).clone();
  const oldAlpha=this.renderer.getClearAlpha();
  try{
   poseOperator(rig,{
    x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
    lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
    aiming:false,firing:false,turning:0,deterministic:true,
    faceStyle:studioUsesVisibleFace(item.slot)?'quiet':'blank',
    unarmedPreview:true,equipment:kit,wardrobe:w
   },0);
   rig.root.position.set(0,0,0);
   this.scene.add(rig.root);
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
   this.renderer.setClearColor(0x23352e,1);
   this.renderer.clear(true,true,true);
   this.renderer.render(this.scene,this.camera);
   this.renderer.readRenderTargetPixels(this.target,0,0,THUMB_SIZE,
    THUMB_SIZE,this.pixels);
   const context=canvas.getContext('2d');
   if(context){
    const image=context.createImageData(THUMB_SIZE,THUMB_SIZE);
    // WebGL framebuffer origin is bottom-left; Canvas is top-left.
    for(let y=0;y<THUMB_SIZE;y++){
     const from=(THUMB_SIZE-1-y)*THUMB_SIZE*4,to=y*THUMB_SIZE*4;
     image.data.set(this.pixels.subarray(from,from+THUMB_SIZE*4),to);
    }
    context.putImageData(image,0,0);
    // Bounded thumbnail cache: only a couple of active categories retained.
    if(this.cache.size>=90)this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key,image);
    entry.readyKey=key;
    canvas.dataset.previewError='false';
   }
  }catch{
   canvas.dataset.previewError='true';
  }finally{
   this.scene.remove(rig.root);
   this.renderer.setRenderTarget(oldTarget);
   this.renderer.setClearColor(oldClear,oldAlpha);
   // Reuse the fully authored geometry and GPU resources for the next
   // card. Disposal is reserved for operator identity changes/unmount.
  }
 }
 dispose(){
  this.token++;this.queue=[];this.cache.clear();
  this.observer?.disconnect();this.pending.clear();this.cards.clear();
  if(this.thumbnailRig){
   this.scene.remove(this.thumbnailRig.root);
   this.thumbnailRig.dispose();this.thumbnailRig=null;
  }
  this.target.dispose();
  this.nav.replaceChildren();this.grid.replaceChildren();
 }
}
