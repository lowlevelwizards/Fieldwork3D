/** Equipment 05: lightweight 3D personnel inspection.
 * Shares the battle operator rig and procedural materials; no second mannequin
 * implementation or recurring animation loop. Render only when visible/dragged.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';

export class CampaignKitPreview{
 private readonly host:HTMLElement;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(34,1,.1,700);
 private renderer:THREE.WebGLRenderer|null=null;
 private rig:OperatorRig|null=null;
 private observer:ResizeObserver|null=null;
 private azimuth=.72;
 private pointerId:number|null=null;
 private lastX=0;
 constructor(host:HTMLElement,id:string,weapon:WeaponId,
  appearanceSeed:number,equipment:EquipmentLoadout,
  weaponConfiguration?:WeaponConfiguration){
  this.host=host;
  host.classList.add('campaign-kit-preview');
  host.setAttribute('role','img');
  host.setAttribute('aria-label','Rotatable 3D preview of '+id+' with equipped gear');
  try{
   this.renderer=new THREE.WebGLRenderer({
    antialias:false,alpha:false,powerPreference:'low-power'});
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   this.renderer.setClearColor(0x1b2d2a,1);
   host.append(this.renderer.domElement);
   const ambient=new THREE.HemisphereLight(0xe0e6ce,0x1a2927,2.6);
   const key=new THREE.DirectionalLight(0xf2d6ac,2.3);
   key.position.set(60,100,55);
   this.scene.add(ambient,key);
   this.rig=createOperatorRig(id,'blue');
   this.scene.add(this.rig.root);
   poseOperator(this.rig,{x:0,z:0,heading:0,velocity:0,seconds:0,
    stride:0,posture:'stand',injury:0,weapon,
    reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,
    down:false,surrender:false,aiming:false,firing:false,turning:0,
    appearanceSeed,equipment,weaponConfiguration,
    flashCharges:equipment.slots.tactical==='tactical-flash'?1:0,
    deterministic:true},0);
   host.addEventListener('pointerdown',this.pointerDown);
   host.addEventListener('pointermove',this.pointerMove);
   host.addEventListener('pointerup',this.pointerUp);
   host.addEventListener('pointercancel',this.pointerUp);
   this.observer=new ResizeObserver(()=>this.draw());
   this.observer.observe(host);
   this.draw();
  }catch{
   // WebGL may be unavailable or its context limit already reached.
   this.dispose();
   const note=document.createElement('p');
   note.className='campaign-note';
   note.textContent='3D preview is unavailable on this device. Kit editing remains available.';
   host.append(note);
  }
 }
 private pointerDown=(event:PointerEvent)=>{
  if(this.pointerId!==null)return;
  this.pointerId=event.pointerId;this.lastX=event.clientX;
  try{this.host.setPointerCapture(event.pointerId);}catch{/* optional */}
 };
 private pointerMove=(event:PointerEvent)=>{
  if(event.pointerId!==this.pointerId)return;
  this.azimuth+=(event.clientX-this.lastX)*.012;
  this.lastX=event.clientX;
  this.draw();
 };
 private pointerUp=(event:PointerEvent)=>{
  if(event.pointerId!==this.pointerId)return;
  this.pointerId=null;
  try{this.host.releasePointerCapture(event.pointerId);}catch{/* optional */}
 };
 private draw(){
  if(!this.renderer)return;
  const width=Math.max(160,this.host.clientWidth);
  const height=Math.max(180,this.host.clientHeight);
  this.renderer.setSize(width,height,false);
  this.camera.aspect=width/height;
  this.camera.updateProjectionMatrix();
  this.camera.position.set(110*Math.cos(this.azimuth),
   61,110*Math.sin(this.azimuth));
  this.camera.lookAt(0,26,0);
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){
  this.observer?.disconnect();this.observer=null;
  this.host.removeEventListener('pointerdown',this.pointerDown);
  this.host.removeEventListener('pointermove',this.pointerMove);
  this.host.removeEventListener('pointerup',this.pointerUp);
  this.host.removeEventListener('pointercancel',this.pointerUp);
  if(this.rig){this.scene.remove(this.rig.root);this.rig.dispose();this.rig=null;}
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer?.domElement.remove();this.renderer=null;
  this.pointerId=null;
 }
}
