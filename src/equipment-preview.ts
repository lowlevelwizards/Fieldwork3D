/** Equipment 05: lightweight 3D personnel inspection.
 * Shares the battle operator rig and procedural materials; no second mannequin
 * implementation or recurring animation loop. Render only when visible/dragged.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {releaseOperatorPreviewRig} from './operator-preview-rig-lifecycle.ts';

export type EquipmentPreviewFocus='full'|'head'|'torso'|'weapon'|'carry';
export class CampaignKitPreview{
 private host:HTMLElement;
 private readonly operatorId:string;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(34,1,.1,700);
 private renderer:THREE.WebGLRenderer|null=null;
 private rig:OperatorRig|null=null;
 private observer:ResizeObserver|null=null;
 private azimuth=.72;
 private pointerId:number|null=null;
 private lastX=0;
 private focusArea:EquipmentPreviewFocus='full';
 private focusHeight=26;
 private focusRadius=110;
 private focusRise=35;
 private focusFrame:number|null=null;
 /** The camera projection and WebGL backing surface change only on resize. */
 private renderedWidth=0;
 private renderedHeight=0;
 /** Coalesce bursty pointermove events to one render per display frame. */
 private dragFrame:number|null=null;
 /** ResizeObserver can fire several times while the armory layout settles. */
 private resizeFrame:number|null=null;
 constructor(host:HTMLElement,id:string,weapon:WeaponId,
  appearanceSeed:number,equipment:EquipmentLoadout,
  weaponConfiguration?:WeaponConfiguration,
  magazines:readonly MagazineItem[]=[],wardrobe?:WardrobeOptions){
  this.host=host;this.operatorId=id;
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
   this.updateEquipment(weapon,appearanceSeed,equipment,weaponConfiguration,
    magazines,wardrobe);
   host.addEventListener('pointerdown',this.pointerDown);
   host.addEventListener('pointermove',this.pointerMove);
   host.addEventListener('pointerup',this.pointerUp);
   host.addEventListener('pointercancel',this.pointerUp);
   this.observer=new ResizeObserver(()=>this.scheduleResize());
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
 /** A kit change updates the existing rig, without creating another WebGL context. */
 updateEquipment(weapon:WeaponId,appearanceSeed:number,equipment:EquipmentLoadout,
  weaponConfiguration?:WeaponConfiguration,magazines:readonly MagazineItem[]=[],
  wardrobe?:WardrobeOptions):void{
  if(!this.rig)return;
  const placements=carryPlacementLedger(equipment,magazines);
  poseOperator(this.rig,{x:0,z:0,heading:0,velocity:0,seconds:0,
   stride:0,posture:'stand',injury:0,weapon,
   reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   appearanceSeed,equipment,weaponConfiguration,wardrobe,
   magazineCarryLocations:placements.filter(item=>item.kind==='magazine')
    .map(item=>item.location),
   medicalCarryLocation:placements.find(item=>item.kind==='medical')?.location,
   utilityCarryLocation:placements.find(item=>item.kind==='utility')?.location,
   flashCharges:equipment.slots.tactical==='tactical-flash'?1:0,
   deterministic:true},0);
  this.draw();
 }
 /** Move one canvas between rebuilt HTML hosts while maintaining its view state. */
 attachHost(host:HTMLElement,drawImmediately=true):void{
  if(host===this.host)return;
  this.observer?.disconnect();
  if(this.resizeFrame!==null)cancelAnimationFrame(this.resizeFrame);
  this.resizeFrame=null;
  this.host.removeEventListener('pointerdown',this.pointerDown);
  this.host.removeEventListener('pointermove',this.pointerMove);
  this.host.removeEventListener('pointerup',this.pointerUp);
  this.host.removeEventListener('pointercancel',this.pointerUp);
  if(this.dragFrame!==null)cancelAnimationFrame(this.dragFrame);
  this.dragFrame=null;this.pointerId=null;this.host=host;
  host.dataset.previewFocus=this.focusArea;
  host.classList.add('campaign-kit-preview');
  host.setAttribute('role','img');
  host.setAttribute('aria-label','Rotatable 3D preview of '+
   this.operatorId+' with equipped gear');
  if(this.renderer)host.append(this.renderer.domElement);
  host.addEventListener('pointerdown',this.pointerDown);
  host.addEventListener('pointermove',this.pointerMove);
  host.addEventListener('pointerup',this.pointerUp);
  host.addEventListener('pointercancel',this.pointerUp);
  this.observer?.observe(host);
  // Campaign updates the rig immediately after a host swap; avoid a stale
  // pre-update render while preserving the default standalone behavior.
  if(drawImmediately)this.draw();
 }
 isReady():boolean{return this.renderer!==null&&this.rig!==null;}
 private pointerDown=(event:PointerEvent)=>{
  if(this.pointerId!==null)return;
  this.pointerId=event.pointerId;this.lastX=event.clientX;
  try{this.host.setPointerCapture(event.pointerId);}catch{/* optional */}
 };
 private pointerMove=(event:PointerEvent)=>{
  if(event.pointerId!==this.pointerId)return;
  const delta=event.clientX-this.lastX;
  if(!delta)return;
  this.azimuth+=delta*.012;
  this.lastX=event.clientX;
  if(this.dragFrame===null)this.dragFrame=requestAnimationFrame(()=>{
   this.dragFrame=null;this.draw();
  });
 };
 private pointerUp=(event:PointerEvent)=>{
  if(event.pointerId!==this.pointerId)return;
  this.pointerId=null;
  // Commit any final rotation immediately, including before a quick release.
  if(this.dragFrame!==null){
   cancelAnimationFrame(this.dragFrame);this.dragFrame=null;this.draw();
  }
  try{this.host.releasePointerCapture(event.pointerId);}catch{/* optional */}
 };
 /** One 220 ms context transition, with no recurring animation while idle. */
 focusOn(area:EquipmentPreviewFocus,animate=true):void{
  const targets:Record<EquipmentPreviewFocus,[number,number,number]>={
   full:[26,110,35],head:[57,72,26],torso:[38,82,31],
   weapon:[35,90,31],carry:[29,91,32]
  };
  const [height,radius,rise]=targets[area];
  this.focusArea=area;this.host.dataset.previewFocus=area;
  if(this.focusFrame!==null){
   cancelAnimationFrame(this.focusFrame);this.focusFrame=null;
  }
  const instant=!animate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(instant){
   this.focusHeight=height;this.focusRadius=radius;this.focusRise=rise;
   this.draw();return;
  }
  const from=[this.focusHeight,this.focusRadius,this.focusRise];
  const start=performance.now(),duration=220;
  const animateFrame=(time:number)=>{
   this.focusFrame=null;
   const t=Math.max(0,Math.min(1,(time-start)/duration));
   const eased=t*t*(3-2*t);
   this.focusHeight=from[0]+(height-from[0])*eased;
   this.focusRadius=from[1]+(radius-from[1])*eased;
   this.focusRise=from[2]+(rise-from[2])*eased;
   this.draw();
   if(t<1)this.focusFrame=requestAnimationFrame(animateFrame);
  };
  this.focusFrame=requestAnimationFrame(animateFrame);
 }
 /** Collapse same-frame resize notifications; projection stays stable on drags. */
 private scheduleResize():void{
  if(!this.renderer||!this.host.isConnected)return;
  const width=Math.max(160,this.host.clientWidth);
  const height=Math.max(180,this.host.clientHeight);
  if(width===this.renderedWidth&&height===this.renderedHeight)return;
  if(this.resizeFrame!==null)return;
  this.resizeFrame=requestAnimationFrame(()=>{
   this.resizeFrame=null;
   if(this.renderer&&this.host.isConnected)this.draw();
  });
 }
 getAzimuth(){return this.azimuth;}
 setAzimuth(value:number){
  if(!Number.isFinite(value))return;
  this.azimuth=value;
  this.draw();
 }
 private draw(){
  if(!this.renderer)return;
  const width=Math.max(160,this.host.clientWidth);
  const height=Math.max(180,this.host.clientHeight);
  if(width!==this.renderedWidth||height!==this.renderedHeight){
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;
   this.camera.updateProjectionMatrix();
   this.renderedWidth=width;this.renderedHeight=height;
  }
  this.camera.position.set(this.focusRadius*Math.cos(this.azimuth),
   this.focusHeight+this.focusRise,this.focusRadius*Math.sin(this.azimuth));
  this.camera.lookAt(0,this.focusHeight,0);
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){
  if(this.resizeFrame!==null)cancelAnimationFrame(this.resizeFrame);
  this.resizeFrame=null;
  if(this.dragFrame!==null)cancelAnimationFrame(this.dragFrame);
  this.dragFrame=null;
  if(this.focusFrame!==null)cancelAnimationFrame(this.focusFrame);
  this.focusFrame=null;
  this.observer?.disconnect();this.observer=null;
  this.host.removeEventListener('pointerdown',this.pointerDown);
  this.host.removeEventListener('pointermove',this.pointerMove);
  this.host.removeEventListener('pointerup',this.pointerUp);
  this.host.removeEventListener('pointercancel',this.pointerUp);
  if(this.rig){releaseOperatorPreviewRig(this.scene,this.rig);this.rig=null;}
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer?.domElement.remove();this.renderer=null;
  this.pointerId=null;
 }
}
