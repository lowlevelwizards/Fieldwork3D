/** Secondary Arsenal interactive 3D inspector.
 * Same genuine Glock meshes as the gallery and operator holster.
 * Demand-render only: pointer orbit and resize never create a RAF loop.
 */
import * as THREE from 'three';
import {configureGraphicRendererOutput}
 from '../rendering/graphic-lighting-profile.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {buildGlockAppearance,clearGlockAppearance,
 type GlockAppearanceId} from '../weapons/geometry/glock-family-silhouettes.ts';
import type {GlockCustomization}
 from '../weapons/geometry/glock-customization.ts';
export class GlockViewport{
 readonly element:HTMLDivElement;
 private renderer:THREE.WebGLRenderer|null=null;
 private scene=new THREE.Scene();
 private camera=new THREE.PerspectiveCamera(37,1,.1,300);
 private model:THREE.Group|null=null;
 private currentId:GlockAppearanceId|null=null;
 private currentClay=false;
 private customizationKey='';
 private observer:ResizeObserver;
 private yaw=.27;
 private pitch=.13;
 private radius=34;
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
  this.camera.position.set(this.target.x+this.radius*Math.sin(this.yaw)*Math.cos(this.pitch),
   this.target.y+this.radius*Math.sin(this.pitch),
   this.target.z+this.radius*Math.cos(this.yaw)*Math.cos(this.pitch));
  this.camera.lookAt(this.target);this.renderer.render(this.scene,this.camera);
 };
 constructor(host:HTMLElement,id:GlockAppearanceId){
  this.element=document.createElement('div');
  this.element.className='glock-wb-canvas';
  this.element.setAttribute('aria-label','3D Glock model · drag to rotate · pinch or wheel to zoom');
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
  this.observer=new ResizeObserver(()=>this.draw());
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
   // Match the primary Workbench: dragging right rotates the model right.
   this.yaw-=(event.clientX-previous.x)*.009;
   this.pitch=THREE.MathUtils.clamp(this.pitch+
    (event.clientY-previous.y)*.008,-.85,.85);
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
  this.radius=THREE.MathUtils.clamp(height/(2*Math.tan(37*Math.PI/360)*.76),14,120);
 }
 setModel(id:GlockAppearanceId,clay=false,customization?:GlockCustomization){
  // Only actual part changes trigger a mesh rebuild. Keep orbit and
  // zoom through magazine placement and editor panel navigation.
  const key=JSON.stringify(customization??null);
  if(this.model&&this.currentId===id&&this.currentClay===clay&&
   this.customizationKey===key)return;
  if(this.model){this.scene.remove(this.model);clearGlockAppearance(this.model);}
  this.currentId=id;this.currentClay=clay;this.customizationKey=key;
  this.model=buildGlockAppearance(id,{monochrome:clay,customization});
  this.scene.add(this.model);this.fit();this.draw();
 }
 side(){this.yaw=0;this.pitch=0;this.draw();}
 opposite(){this.yaw=Math.PI;this.pitch=0;this.draw();}
 reset(){this.yaw=.27;this.pitch=.13;this.fit();this.draw();}
 // Pointer streams can outpace the display refresh. Render the final orbit
 // pose at most once per RAF; resize no longer reallocates the backing canvas
 // unless its actual dimensions changed.
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
  if(this.model){this.scene.remove(this.model);clearGlockAppearance(this.model);}
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.element.replaceChildren();
 }
}
