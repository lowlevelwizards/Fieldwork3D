/** Operator Lab visual inventory: actual 3D rig renders, never icons or
 * mock drawings. One SHARED WebGLRenderer (the Lab renderer), one render
 * target, and one thumbnail rig at a time. No per-card WebGL contexts.
 *
 * Catalog is authoritative WARDROBE_ITEMS, so purged placeholders cannot
 * accidentally return through an old selector. Category state is UI-only.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from './breach-operator-rig.ts';
import {bareLabEquipment} from './operator-lab-baseline.ts';
import {initialWardrobe,setWardrobeFabricCamo,resolvedWardrobe,
 wardrobeItemsForSlot,WARDROBE_SLOTS,type WardrobeSlot,
 type WardrobeOptions,type WardrobeItem} from './operator-wardrobe-data.ts';
import {selectWardrobeItem} from './operator-wardrobe-unified.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';

export const APPEARANCE_GROUP_LABELS:Readonly<Record<WardrobeSlot,string>>={
 headwear:'HEAD',facewear:'FACE',eyewear:'EYES',headset:'COMMS',
 top:'TOPS',trousers:'LEGS',footwear:'FEET',armorStyle:'ARMOR',
 rigStyle:'RIG',beltStyle:'BELT',packStyle:'PACK',
 gloves:'HANDS',knees:'KNEES',wrist:'WRIST'
};
const THUMB_SIZE=160;
type Entry={item:WardrobeItem;canvas:HTMLCanvasElement;button:HTMLButtonElement;
 key:string};
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
 private selected:WardrobeSlot='top';
 private token=0;
 private queue:Entry[]=[];
 private kit:EquipmentLoadout=bareLabEquipment();
 private wardrobe:WardrobeOptions=initialWardrobe();
 private readonly onSelect:OnSelect;
 private readonly canEquip?: (slot:WardrobeSlot,id:string)=>boolean;
 private readonly renderer:THREE.WebGLRenderer;
 constructor(root:HTMLElement,renderer:THREE.WebGLRenderer,onSelect:OnSelect,
  canEquip?: (slot:WardrobeSlot,id:string)=>boolean){
  this.renderer=renderer;this.onSelect=onSelect;this.canEquip=canEquip;
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
 refresh(kit:EquipmentLoadout,wardrobe:WardrobeOptions){
  this.kit=kit;this.wardrobe=wardrobe;
  this.paint();
 }
 setCategory(slot:WardrobeSlot){
  if(this.selected===slot)return;
  this.selected=slot;this.paint();
 }
 private paint(){
  this.token++;
  const token=this.token;
  this.queue=[];
  this.grid.replaceChildren();
  for(const element of this.nav.children){
   const button=element as HTMLButtonElement;
   const active=button.dataset.appearanceTab===this.selected;
   button.setAttribute('aria-selected',String(active));
   button.tabIndex=active?0:-1;
  }
  const items=activeAppearanceItems(this.selected);
  const chosen=resolvedWardrobe(this.wardrobe,this.kit)[this.selected];
  this.summary.textContent=APPEARANCE_GROUP_LABELS[this.selected]+' · '+items.length+
   ' ACTUAL 3D ITEMS · TAP TO EQUIP';
  for(const item of items){
   const button=document.createElement('button');button.type='button';
   button.className='appearance-item-card';
   const active=chosen===item.id;
   const available=this.canEquip?this.canEquip(item.slot,item.id):
    appearanceItemAvailable(this.kit,this.wardrobe,item.slot,item.id);
   button.dataset.appearanceItem=item.id;
   button.dataset.appearanceSlot=item.slot;
   button.setAttribute('aria-pressed',String(active));
   button.setAttribute('aria-label','Equip '+item.name+
    (!available?' (unavailable for current kit)':''));
   button.disabled=!available;
   const thumb=document.createElement('canvas');
   thumb.width=thumb.height=THUMB_SIZE;
   thumb.className='appearance-item-thumbnail';
   thumb.setAttribute('aria-hidden','true');
   const text=document.createElement('span');
   text.className='appearance-item-name';text.textContent=item.name;
   const caption=document.createElement('span');
   caption.className='appearance-item-tag';
   caption.textContent=active?'EQUIPPED':!available?'NOT AVAILABLE':
    item.slot==='top'?'APPROVED CUT':item.name.includes('foundation')?
     'FOUNDATION':'3D MODEL';
   button.append(thumb,text,caption);
   button.addEventListener('click',()=>this.onSelect(item.slot,item.id));
   this.grid.append(button);
   const key=item.slot+':'+item.id;
   const cached=this.cache.get(key);
   if(cached)thumb.getContext('2d')?.putImageData(cached,0,0);
   else this.queue.push({item,canvas:thumb,button,key});
  }
  // Render one item per display frame. Rapid category changes cancel stale
  // work; this cannot block the live operator's animation frame.
  const next=()=>{
   if(this.token!==token||!this.grid.isConnected)return;
   const entry=this.queue.shift();
   if(!entry)return;
   this.renderThumbnail(entry);
   if(this.queue.length)requestAnimationFrame(next);
  };
  if(this.queue.length)requestAnimationFrame(next);
 }
 private renderThumbnail(entry:Entry){
  const {item,key,canvas}=entry;
  let kit=bareLabEquipment();
  let w=initialWardrobe();
  // Dress a neutral mannequin in a real baseline uniform, not a hollow
  // isolated prop. The selected item's own equipment class always wins.
  for(const [slot,id] of [
   ['top','bdu-shirt'],['trousers','bdu-trousers'],
   ['footwear','field-boots'],['headwear','bare']
  ] as const){
   const next=selectWardrobeItem(kit,w,slot,id);kit=next.kit;w=next.wardrobe;
  }
  // Pair matching structural families in thumbnails, so the new pants
  // show honestly instead of beneath an unrelated uniform blouse.
  if(item.slot==='top'&&(item.id==='bdu-shirt'||item.id==='acu-shirt'||item.id==='gorka-jacket')){
   const t=item.id==='bdu-shirt'?'bdu-trousers':
    item.id==='gorka-jacket'?'gorka-trousers':'acu-trousers';
   const next=selectWardrobeItem(kit,w,'trousers',t);
   kit=next.kit;w=next.wardrobe;
  }
  if(item.slot==='trousers'&&(item.id==='bdu-trousers'||item.id==='acu-trousers'||item.id==='gorka-trousers')){
   const top=item.id==='bdu-trousers'?'bdu-shirt':
    item.id==='gorka-trousers'?'gorka-jacket':'acu-shirt';
   const next=selectWardrobeItem(kit,w,'top',top);
   kit=next.kit;w=next.wardrobe;
  }
  const choice=selectWardrobeItem(kit,w,item.slot,item.id);
  kit=choice.kit;w=choice.wardrobe;
  if(item.slot==='top'){
   const print=item.id==='bdu-shirt'?'m81-woodland':
    item.id==='acu-shirt'?'scorpion-w2':
     item.id==='combat-shirt'?'multicam':
     item.id==='smock-jacket'?'woodland-dpm':null;
   if(print)w=setWardrobeFabricCamo(w,'top',print,resolvedWardrobe(w,kit));
  }
  const rig=createOperatorRig('rook','blue');
  const oldTarget=this.renderer.getRenderTarget();
  const oldClear=this.renderer.getClearColor(new THREE.Color()).clone();
  const oldAlpha=this.renderer.getClearAlpha();
  try{
   poseOperator(rig,{
    x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
    lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
    aiming:false,firing:false,turning:0,deterministic:true,
    unarmedPreview:true,equipment:kit,wardrobe:w
   },0);
   rig.root.position.set(0,0,0);
   this.scene.add(rig.root);
   const view=focus(item.slot),span=view.span;
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
   }
  }catch{
   canvas.dataset.previewError='true';
  }finally{
   this.scene.remove(rig.root);
   this.renderer.setRenderTarget(oldTarget);
   this.renderer.setClearColor(oldClear,oldAlpha);
   rig.dispose();
  }
 }
 dispose(){
  this.token++;this.queue=[];this.cache.clear();
  this.target.dispose();
  this.nav.replaceChildren();this.grid.replaceChildren();
 }
}
