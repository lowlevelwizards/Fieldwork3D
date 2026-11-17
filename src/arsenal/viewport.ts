/** Arsenal V2: on-demand 3D inspection, with minimal projected part sockets.
 * No gameplay writes, duplicated models, continuous loops, or experimental lab.
 */
import * as THREE from 'three';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER} from '../weapons/geometry/weapon-visual-palette.ts';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {partVisualBounds,workbenchVisualAnchors}
 from '../weapons/geometry/weapon-visual-anchors.ts';
import type {WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {workbenchFitDistance} from '../weapons/geometry/weapon-workbench-camera-fit.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {mountedAccessorySeat}
 from '../weapons/geometry/mounted-accessory-layout.ts';
import type {MountableSlot}
 from '../weapons/geometry/weapon-mount-selections.ts';
import {remapArsenalZoom} from './camera-state.ts';
import {ArsenalWeaponGeometryPool} from './weapon-geometry-pool.ts';
import {compileArsenalRigidPartSiblings} from './weapon-part-batching.ts';
import type {FamilyPartSlot} from '../equipment-weapon-families.ts';
import type {ArsenalSlot} from './catalog.ts';
const FAMILY_SLOTS:readonly FamilyPartSlot[]=
 ['receiver','barrel','handguard','stock','grip','magazine'];
export class ArsenalViewport{
 readonly canvas:HTMLCanvasElement;
 private readonly renderer:THREE.WebGLRenderer|null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,1,.1,400);
 private readonly model=new THREE.Group();
 // Rigid geometry pooling leaves mount sockets and selectable parts intact.
 private readonly geometryPool=new ArsenalWeaponGeometryPool();
 private readonly bakeParts=new URLSearchParams(location.search)
  .get('e627PartBake')==='1';
 private readonly poolEnabled=this.bakeParts||
  new URLSearchParams(location.search).get('e626Weapon')==='1';
 private readonly socketLayer:HTMLDivElement;
 private readonly socketButtons=new Map<ArsenalSlot,HTMLButtonElement>();
 private readonly socketLocal=new Map<ArsenalSlot,THREE.Vector3>();
 private readonly socketScratch=new THREE.Vector3();
 private activeExtraSlots:readonly ArsenalSlot[]=[];
 private dotsRestoreTimer:ReturnType<typeof setTimeout>|null=null;
 private inspecting=false;
 private config:WeaponConfiguration|null=null;
 private readonly steel=WEAPON_ACCESSORY_STEEL;
 private readonly dark=WEAPON_ACCESSORY_POLYMER;
 private readonly resizeObserver:ResizeObserver;
 private readonly pointers=new Map<number,{x:number;y:number}>();
 private readonly origins=new Map<number,{x:number;y:number}>();
 private readonly onSelect:(slot:ArsenalSlot)=>void;
 private body:THREE.Group|null=null;
 private attachments:THREE.Group|null=null;
 private selected:ArsenalSlot='receiver';
 private target=new THREE.Vector3();
 private fitDistance=55;
 private distance=55;
 private yaw=.12;
 private pitch=.12;
 private pinch=0;
 private gestureMoved=false;
 private multiTouch=false;
 private frame=0;
 private lastWidth=0;
 private lastHeight=0;
 private queued=false;
 private disposed=false;
 constructor(host:HTMLElement,recipe:ArsenalRecipeV2,
  onSelect:(slot:ArsenalSlot)=>void){
  this.onSelect=onSelect;
  this.canvas=document.createElement('canvas');
  this.canvas.className='arsenal-wb-canvas';
  this.canvas.setAttribute('aria-label','3D weapon inspection; drag to orbit, pinch to zoom');
  this.canvas.style.touchAction='none';
  this.socketLayer=document.createElement('div');
  this.socketLayer.className='arsenal-wb-sockets';
  this.socketLayer.setAttribute('aria-label','Select weapon part');
  host.append(this.canvas,this.socketLayer);
  addArsenalInspectionLighting(this.scene);
  this.scene.add(this.model);
  let renderer:THREE.WebGLRenderer|null=null;
  try{
   renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:false,
    powerPreference:'low-power'});
   configureGraphicRendererOutput(renderer);
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  }catch{
   host.dataset.webglUnavailable='true';
   const fallback=document.createElement('p');
   fallback.className='arsenal-wb-fallback';
   fallback.textContent='3D preview unavailable on this device. Use the component categories to inspect your build.';
   host.append(fallback);
  }
  this.renderer=renderer;
  this.canvas.addEventListener('pointerdown',this.down);
  this.canvas.addEventListener('pointermove',this.move);
  this.canvas.addEventListener('pointerup',this.up);
  this.canvas.addEventListener('pointercancel',this.up);
  this.canvas.addEventListener('wheel',this.wheel,{passive:false});
  this.resizeObserver=new ResizeObserver(()=>this.invalidate());
  this.resizeObserver.observe(host);
  this.setRecipe(recipe,false);
 }
 private clearParts(){
  this.clearSocketDots();
  if(this.body){this.model.remove(this.body);
   if(this.poolEnabled)this.geometryPool.release(this.body);
   else clearWeaponSilhouette(this.body);
   this.body=null;}
  if(this.attachments){
   this.model.remove(this.attachments);
   this.attachments.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
   this.attachments.clear();this.attachments=null;
  }
 }
 setRecipe(recipe:ArsenalRecipeV2,preserveView=true):boolean{
  const config=arsenalRecipeToLegacy(recipe);if(!config)return false;
  this.clearParts();this.config=config;
  this.body=buildWeaponSilhouette(config.weapon,this.steel,this.dark,config);
  if(this.poolEnabled){
   const stats=this.geometryPool.adopt(this.body);
   this.canvas.dataset.e626Hits=String(stats.hits);
   this.canvas.dataset.e626Geometries=String(stats.geometries);
  }
  if(this.bakeParts){
   const baked=compileArsenalRigidPartSiblings(this.body);
   this.canvas.dataset.e627Avoided=String(baked.avoidedDraws);
   this.canvas.dataset.e627Compiled=String(baked.renderMeshes);
  }
  this.attachments=buildWeaponAccessories(config,this.steel,this.dark);
  this.model.add(this.body,this.attachments);
  this.model.scale.set(weaponVisualLayout(config).longitudinalScale,1,1);
  this.model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(this.model);
  this.target=box.getCenter(new THREE.Vector3());
  const rect=this.canvas.getBoundingClientRect();
  const oldFit=this.fitDistance;
  this.fitDistance=workbenchFitDistance(box,Math.max(100,rect.width),
   Math.max(100,rect.height),37,.72,
   config.build?.parts.receiver==='hk-mp5k-stockless');
  if(!preserveView){this.distance=this.fitDistance;this.yaw=.12;this.pitch=.12;}
  else this.distance=remapArsenalZoom(oldFit,this.distance,this.fitDistance);
  this.rebuildSocketDots();
  this.setSelectedSlot(this.selected);
  return true;
 }
 /** Keep six body sockets available; show relevant accessory sockets on demand. */
 setVisibleSlots(slots:readonly ArsenalSlot[]){
  const extras=slots.filter(s=>!FAMILY_SLOTS.includes(s as FamilyPartSlot));
  if(extras.length===this.activeExtraSlots.length&&
   extras.every((slot,i)=>slot===this.activeExtraSlots[i]))return;
  this.activeExtraSlots=extras;
  this.rebuildSocketDots();
 }
 setSelectedSlot(slot:ArsenalSlot){
  this.selected=slot;
  for(const [id,button] of this.socketButtons){
   button.setAttribute('aria-pressed',String(id===slot));
  }
  this.invalidate();
 }
 private clearSocketDots(){
  this.socketButtons.clear();
  this.socketLocal.clear();
  this.socketLayer.replaceChildren();
 }
 private rebuildSocketDots(){
  this.clearSocketDots();
  if(!this.renderer||!this.body||!this.config)return;
  const sockets:ArsenalSlot[]=[...FAMILY_SLOTS,...this.activeExtraSlots];
  const accessory=workbenchVisualAnchors(this.config,this.body,'attachments');
  for(const slot of sockets){
   let point:THREE.Vector3|undefined;
   if(FAMILY_SLOTS.includes(slot as FamilyPartSlot)){
    const b=partVisualBounds(this.body,slot as FamilyPartSlot);
    if(b&&!b.isEmpty()){
     point=b.getCenter(new THREE.Vector3());
     point.z=b.max.z+.25;
    }
   }else{
    const mount=accessory.find(a=>a.slot===slot);
    if(mount)point=new THREE.Vector3(mount.x,mount.y,mount.z);
   }
   if(!point)continue;
   const button=document.createElement('button');
   button.type='button';
   button.className='arsenal-wb-socket';
   button.setAttribute('aria-label','Select '+slot.replace(/([A-Z])/g,' $1').toLowerCase());
   button.setAttribute('aria-pressed',String(slot===this.selected));
   button.title='Select '+slot;
   const dot=document.createElement('span');
   dot.className='arsenal-wb-socket-dot';dot.setAttribute('aria-hidden','true');
   button.append(dot);
   button.addEventListener('click',()=>{if(!this.inspecting)this.onSelect(slot);});
   this.socketButtons.set(slot,button);
   this.socketLocal.set(slot,point);
   this.socketLayer.append(button);
  }
  this.invalidate();
 }
 /** Reproject tiny HTML hit targets only on existing on-demand render frames. */
 private positionSocketDots(width:number,height:number){
  if(!this.body)return;
  this.body.updateWorldMatrix(true,false);
  const front=Math.cos(this.yaw)>=0;
  for(const [slot,button] of this.socketButtons){
   const local=this.socketLocal.get(slot);
   if(!local)continue;
   const point=this.socketScratch.copy(local);
   // Place on whichever side of the mesh the player is currently viewing.
   point.z=front?Math.abs(point.z):-Math.abs(point.z);
   point.applyMatrix4(this.body.matrixWorld).project(this.camera);
   const x=(point.x+1)*width*.5,y=(1-point.y)*height*.5;
   const visible=point.z>=-1&&point.z<=1&&x>=8&&x<=width-8&&
    y>=8&&y<=height-8;
   button.hidden=!visible;
   if(visible)button.style.transform=
    'translate(-50%,-50%) translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';
  }
 }
 private hideDotsDuringInspection(){
  if(this.dotsRestoreTimer!==null){
   clearTimeout(this.dotsRestoreTimer);this.dotsRestoreTimer=null;
  }
  this.inspecting=true;
  this.socketLayer.classList.add('is-inspecting');
 }
 private finishInspection(){
  if(this.pointers.size>0)return;
  if(this.dotsRestoreTimer!==null)clearTimeout(this.dotsRestoreTimer);
  this.dotsRestoreTimer=setTimeout(()=>{
   this.dotsRestoreTimer=null;
   this.inspecting=false;
   this.socketLayer.classList.remove('is-inspecting');
  },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);
 }
 fit(){
  this.distance=this.fitDistance;this.yaw=.12;this.pitch=.12;
  this.invalidate();
 }
 sideView(){this.yaw=0;this.pitch=0;this.invalidate();}
 /** M2.7: inspect the selected rail face without altering mount geometry.
  * Deliberately on-demand, no new continuous animation or render loop.
  */
 viewMount(slot:MountableSlot){
  if(!this.config)return;
  const mounted=mountedAccessorySeat(this.config,slot);
  if(!mounted)return;
  this.yaw=mounted.placement.face==='left'?Math.PI:0;
  this.pitch=mounted.placement.face==='top'?.46:
   mounted.placement.face==='bottom'?-0.35:0.07;
  this.invalidate();
 }

 private invalidate(){
  if(this.queued||this.disposed)return;
  this.queued=true;this.frame=requestAnimationFrame(()=>{
   this.queued=false;this.render();
  });
 }
 private render(){
  if(!this.renderer||this.disposed)return;
  const rect=this.canvas.getBoundingClientRect();
  const w=Math.max(1,Math.floor(rect.width)),h=Math.max(1,Math.floor(rect.height));
  // Don't reallocate the WebGL drawing buffer when only orbiting or
  // switching parts. Resize is driven by the host ResizeObserver.
  if(w!==this.lastWidth||h!==this.lastHeight){
   this.renderer.setSize(w,h,false);
   this.lastWidth=w;this.lastHeight=h;
  }
  this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  const cos=Math.cos(this.pitch);
  this.camera.position.set(this.target.x+this.distance*Math.sin(this.yaw)*cos,
   this.target.y+this.distance*Math.sin(this.pitch),
   this.target.z+this.distance*Math.cos(this.yaw)*cos);
  this.camera.lookAt(this.target);
  this.renderer.render(this.scene,this.camera);
  this.positionSocketDots(w,h);
 }
 private pick(clientX:number,clientY:number){
  if(!this.body)return;
  const rect=this.canvas.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return;
  const p=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,
   -(clientY-rect.top)/rect.height*2+1);
  const caster=new THREE.Raycaster();caster.setFromCamera(p,this.camera);
  const hits=caster.intersectObject(this.body,true);
  for(const hit of hits){
   let o:THREE.Object3D|null=hit.object;
   while(o&&o!==this.model){
    const matched=/^family-(receiver|barrel|handguard|stock|grip|magazine)(?:-|$)/.exec(o.name);
    if(matched){
     this.onSelect(matched[1] as FamilyPartSlot);
     return;
    }
    o=o.parent;
   }
  }
 }
 private down=(e:PointerEvent)=>{
  if(!this.renderer)return;
  this.canvas.setPointerCapture(e.pointerId);
  if(!this.pointers.size){this.gestureMoved=false;this.multiTouch=false;}
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  this.origins.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pointers.size>1){this.multiTouch=true;this.pinch=0;
   this.hideDotsDuringInspection();}
 };
 private move=(e:PointerEvent)=>{
  const old=this.pointers.get(e.pointerId);if(!old)return;
  const dx=e.clientX-old.x,dy=e.clientY-old.y;
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const start=this.origins.get(e.pointerId);
  if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>7){
   this.gestureMoved=true;this.hideDotsDuringInspection();
  }
  if(this.pointers.size===1){
   this.yaw-=dx*.009;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.007,-.65,.85);
  }else if(this.pointers.size===2){
   const points=[...this.pointers.values()];
   const span=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
   if(this.pinch>0)this.distance=THREE.MathUtils.clamp(
    this.distance*this.pinch/Math.max(1,span),18,210);
   this.pinch=span;
   // Two-finger translation pans the inspection target, not the weapon geometry.
   this.target.x-=dx*.026;this.target.y+=dy*.026;
  }
  this.invalidate();
 };
 private up=(e:PointerEvent)=>{
  const wasSingle=this.pointers.size===1;
  if(wasSingle&&!this.gestureMoved&&!this.multiTouch&&e.type==='pointerup')
   this.pick(e.clientX,e.clientY);
  this.pointers.delete(e.pointerId);this.origins.delete(e.pointerId);
  this.pinch=0;
  if(!this.pointers.size){this.gestureMoved=false;this.multiTouch=false;
   this.finishInspection();}
 };
 private wheel=(e:WheelEvent)=>{
  if(!this.renderer)return;
  e.preventDefault();this.hideDotsDuringInspection();
  this.distance=THREE.MathUtils.clamp(
   this.distance*Math.exp(e.deltaY*.001),18,210);
  this.invalidate();this.finishInspection();
 };
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.resizeObserver.disconnect();
  cancelAnimationFrame(this.frame);
  if(this.dotsRestoreTimer!==null)clearTimeout(this.dotsRestoreTimer);
  this.canvas.removeEventListener('pointerdown',this.down);
  this.canvas.removeEventListener('pointermove',this.move);
  this.canvas.removeEventListener('pointerup',this.up);
  this.canvas.removeEventListener('pointercancel',this.up);
  this.canvas.removeEventListener('wheel',this.wheel);
  this.clearParts();this.geometryPool.clear();this.socketLayer.remove();
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  // Shared registry-owned materials persist across viewer lifecycles.
 }
}
