/** Secondary Arsenal interactive 3D inspector.
 * Same genuine Glock meshes as the gallery and operator holster.
 * Demand-render only: pointer orbit and resize never create a RAF loop.
 */
import * as THREE from 'three';
import {configureGraphicRendererOutput}
 from '../rendering/graphic-lighting-profile.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {inspectOrbitYaw,inspectOrbitPitch,positionInspectCamera} from './orbit-math.ts';
import {buildSidearmPreview,clearSidearmPreview,
 type SidearmPreviewId} from '../weapons/geometry/sidearm-preview.ts';
import type {GlockCustomization}
 from '../weapons/geometry/glock-customization.ts';
export class GlockViewport{
 readonly element:HTMLDivElement;
 private renderer:THREE.WebGLRenderer|null=null;
 private scene=new THREE.Scene();
 private camera=new THREE.PerspectiveCamera(37,1,.1,300);
 private model:THREE.Group|null=null;
 private currentId:SidearmPreviewId|null=null;
 private currentClay=false;
 private customizationKey='';
 private observer:ResizeObserver;
 private yaw=0;
 private pitch=0;
 private radius=34;
 private fitMultiplier=1;
 private tightArt=false;
 private target=new THREE.Vector3();
 private pointers=new Map<number,{x:number;y:number}>();
 private previousPinch=0;
 private disposed=false;
 private frameId:number|null=null;
 private renderedWidth=0;
 private renderedHeight=0;
 private onFrame=()=>{
  if(this.disposed||!this.renderer)return;
  const width=Math.max(1,this.element.clientWidth);
  const height=Math.max(1,this.element.clientHeight);
  if(width!==this.renderedWidth||height!==this.renderedHeight){
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
   this.renderedWidth=width;this.renderedHeight=height;
  }
  positionInspectCamera(this.camera,this.target,this.radius,this.yaw,this.pitch);
  this.renderer.render(this.scene,this.camera);
 };
 constructor(host:HTMLElement,id:SidearmPreviewId){
  this.element=document.createElement('div');
  this.element.className='glock-wb-canvas';
  this.element.setAttribute('aria-label','3D secondary model · drag to rotate · pinch or wheel to zoom');
  this.element.style.touchAction='none';host.append(this.element);
  this.scene.background=new THREE.Color(0x1a2a25);
  addArsenalInspectionLighting(this.scene);
  try{
   this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});
   configureGraphicRendererOutput(this.renderer);this.renderer.setPixelRatio(1);
   this.element.append(this.renderer.domElement);
   this.renderer.domElement.style.width='100%';
   this.renderer.domElement.style.height='100%';
  }catch{
   this.element.textContent='3D inspection unavailable on this device';
  }
  this.observer=new ResizeObserver(()=>{
   if(this.tightArt)this.fit();
   this.draw();
  });
  this.observer.observe(this.element);
  this.element.addEventListener('pointerdown',this.onDown);
  this.element.addEventListener('pointermove',this.onMove);
  this.element.addEventListener('pointerup',this.onUp);
  this.element.addEventListener('pointercancel',this.onUp);
  this.element.addEventListener('wheel',this.onWheel,{passive:false});
  this.setModel(id);
 }
 private onDown=(event:PointerEvent)=>{
  this.element.setPointerCapture(event.pointerId);
  this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(this.pointers.size===2)this.previousPinch=this.pinchDistance();
 };
 private pinchDistance(){
  const [a,b]=Array.from(this.pointers.values());
  return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;
 }
 private onMove=(event:PointerEvent)=>{
  const previous=this.pointers.get(event.pointerId);
  if(!previous)return;
  this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(this.pointers.size===2){
   const distance=this.pinchDistance();
   if(distance&&this.previousPinch)this.radius=THREE.MathUtils.clamp(
    this.radius*this.previousPinch/distance,14,120);
   this.previousPinch=distance;
  }else{
   // Match the primary Workbench's camera orbit sign and pivot convention.
   this.yaw=inspectOrbitYaw(this.yaw,event.clientX-previous.x);
   this.pitch=inspectOrbitPitch(this.pitch,event.clientY-previous.y,
    .008,-.85,.85);
  }
  this.draw();
 };
 private onUp=(event:PointerEvent)=>{
  this.pointers.delete(event.pointerId);this.previousPinch=0;
  if(this.element.hasPointerCapture(event.pointerId))
   this.element.releasePointerCapture(event.pointerId);
 };
 private onWheel=(event:WheelEvent)=>{
  event.preventDefault();
  this.radius=THREE.MathUtils.clamp(this.radius*Math.exp(event.deltaY*.001),14,120);
  this.draw();
 };
 private fit(){
  if(!this.model)return;
  const box=new THREE.Box3().setFromObject(this.model);
  const size=box.getSize(new THREE.Vector3());
  box.getCenter(this.target);
  const aspect=Math.max(.5,this.element.clientWidth/Math.max(1,this.element.clientHeight));
  const height=Math.max(size.y,size.x/aspect,size.z);
  // D4: portrait needs a readable miniature; landscape needs additional
  // horizontal breathing room for the long Beretta upper and muzzle.
  // This condition only applies after opting into Beretta art framing.
  const multiplier=this.tightArt&&aspect>=1.15?1.18:this.fitMultiplier;
  this.radius=THREE.MathUtils.clamp(height/(2*Math.tan(37*Math.PI/360)*.76)*
   multiplier,14,120);
 }
 setModel(id:SidearmPreviewId,clay=false,customization?:GlockCustomization){
  // Only actual part changes trigger a mesh rebuild. Keep orbit and
  // zoom through magazine placement and editor panel navigation.
  const key=JSON.stringify(customization??null);
  if(this.model&&this.currentId===id&&this.currentClay===clay&&
   this.customizationKey===key)return;
  if(this.model&&this.currentId){this.scene.remove(this.model);
   clearSidearmPreview(this.currentId,this.model);}
  this.currentId=id;this.currentClay=clay;this.customizationKey=key;
  this.model=buildSidearmPreview(id,{monochrome:clay,customization});
  this.scene.add(this.model);this.fit();this.draw();
 }
 side(){this.yaw=0;this.pitch=0;this.draw();}
 opposite(){this.yaw=Math.PI;this.pitch=0;this.draw();}
 top(){this.yaw=0;this.pitch=1.38;this.draw();}
 /** Scoped Beretta art-only framing; default Glock editor remains unchanged. */
 useTightArtFraming(){
  this.tightArt=true;this.fitMultiplier=.89;this.fit();this.draw();
 }
 quarter(){
  this.yaw=.52;this.pitch=.23;this.fit();this.draw();
 }
 reset(){this.yaw=0;this.pitch=0;this.fit();this.draw();}
 // Coalesce touch/mouse orbit updates into the display cadence.
 private draw(){
  if(this.disposed||this.frameId!==null)return;
  this.frameId=requestAnimationFrame(()=>{
   this.frameId=null;
   if(!this.disposed)this.onFrame();
  });
 }
 dispose(){
  this.disposed=true;
  if(this.frameId!==null)cancelAnimationFrame(this.frameId);
  this.frameId=null;this.observer.disconnect();
  this.element.removeEventListener('pointerdown',this.onDown);
  this.element.removeEventListener('pointermove',this.onMove);
  this.element.removeEventListener('pointerup',this.onUp);
  this.element.removeEventListener('pointercancel',this.onUp);
  this.element.removeEventListener('wheel',this.onWheel);
  if(this.model&&this.currentId){this.scene.remove(this.model);
   clearSidearmPreview(this.currentId,this.model);}
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.element.replaceChildren();
 }
}
