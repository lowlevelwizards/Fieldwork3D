/** Equipment 21.01: separate on-demand weapon-only workbench.
 * No duplicated procedural gun meshes, continuous animation or second operator rig.
 * On mobile, a drag rotates, pinch/wheel zooms, tap picks a physical mount.
 */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {workbenchMounts} from './equipment-weapon-workbench-layout.ts';

export class WeaponWorkbenchPreview{
 private renderer:THREE.WebGLRenderer|null=null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,1,.1,300);
 private readonly model=new THREE.Group();
 private readonly pointerPositions=new Map<number,{x:number;y:number}>();
 private readonly raycaster=new THREE.Raycaster();
 private readonly steel=new THREE.MeshStandardMaterial({color:0x707875,roughness:.78,flatShading:true});
 private readonly dark=new THREE.MeshStandardMaterial({color:0x303a38,roughness:.84,flatShading:true});
 private readonly selectedMaterial=new THREE.MeshBasicMaterial({color:0xe9c88c});
 private readonly markerMaterial=new THREE.MeshBasicMaterial({color:0x82baae});
 private readonly markerGeometry=new THREE.OctahedronGeometry(1.65);
 private readonly host:HTMLElement;
 private readonly canvasHost:HTMLDivElement;
 private readonly caption:HTMLParagraphElement;
 private readonly onSelect:(slot:WeaponAttachmentSlot)=>void;
 private readonly resizeObserver:ResizeObserver;
 private yaw=.15;
 private pitch=.17;
 private distance=77;
 private dragDistance=0;
 private pinchDistance=0;
 private active:WeaponAttachmentSlot='optic';
 private config:WeaponConfiguration;
 constructor(host:HTMLElement,config:WeaponConfiguration,
  onSelect:(slot:WeaponAttachmentSlot)=>void){
  this.host=host;this.config=config;this.onSelect=onSelect;
  this.canvasHost=document.createElement('div');
  this.canvasHost.className='weapon-workbench-viewport';
  this.canvasHost.style.cssText='position:relative;min-height:220px;height:250px;'+
   'background:#162723;border:1px solid #566e61;border-radius:10px;'+
   'touch-action:none;overflow:hidden';
  this.caption=document.createElement('p');this.caption.className='campaign-note';
  this.caption.style.cssText='margin:8px 0 4px;min-height:2em';
  host.classList.add('weapon-workbench');
  host.append(this.canvasHost,this.caption);
  this.scene.background=new THREE.Color(0x162723);
  this.scene.add(new THREE.HemisphereLight(0xe2e9d9,0x253c36,2.3));
  const light=new THREE.DirectionalLight(0xf8d8a8,2.6);
  light.position.set(30,55,70);this.scene.add(light);
  this.scene.add(this.model);
  try{
   this.renderer=new THREE.WebGLRenderer({
    antialias:false,powerPreference:'low-power'});
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   this.canvasHost.append(this.renderer.domElement);
   this.canvasHost.addEventListener('pointerdown',this.down);
   this.canvasHost.addEventListener('pointermove',this.move);
   this.canvasHost.addEventListener('pointerup',this.up);
   this.canvasHost.addEventListener('pointercancel',this.up);
   this.canvasHost.addEventListener('wheel',this.wheel,{passive:false});
  }catch{
   this.renderer?.dispose();this.renderer=null;
   this.caption.textContent='3D inspection unavailable. Attachment selectors remain usable.';
  }
  this.resizeObserver=new ResizeObserver(()=>this.draw());
  this.resizeObserver.observe(this.canvasHost);
  this.setConfiguration(config);
 }
 setConfiguration(config:WeaponConfiguration){
  this.config=config;
  clearWeaponSilhouette(this.model);
  const body=buildWeaponSilhouette(config.weapon,this.steel,this.dark,config);
  const accessories=buildWeaponAccessories(config,this.steel,this.dark);
  this.model.add(body,accessories);
  for(const anchor of workbenchMounts(config)){
   const marker=new THREE.Mesh(this.markerGeometry,this.markerMaterial);
   marker.position.set(anchor.x,anchor.y,anchor.z);
   marker.userData.slot=anchor.slot;
   marker.name='mount-'+anchor.slot;
   marker.scale.setScalar(1.25);
   this.model.add(marker);
  }
  this.setActiveSlot(this.active);
 }
 setActiveSlot(slot:WeaponAttachmentSlot){
  this.active=slot;
  for(const child of this.model.children){
   if(child.name.startsWith('mount-')&&child instanceof THREE.Mesh){
    const selected=child.userData.slot===slot;
    child.material=selected?this.selectedMaterial:this.markerMaterial;
    child.scale.setScalar(selected?1.8:1.25);
   }
  }
  const a=resolveWeaponAssembly(this.config);
  this.caption.textContent=slot.toUpperCase()+' · '+
   WEAPON_ATTACHMENTS[this.config.slots[slot]].name+
   '   |   '+a.massKg.toFixed(2)+' KG   |   DRAG TO ROTATE · PINCH TO ZOOM';
  this.draw();
 }
 private down=(e:PointerEvent)=>{
  this.pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pointerPositions.size===1)this.dragDistance=0;
  if(this.pointerPositions.size===2)this.pinchDistance=0;
  try{this.canvasHost.setPointerCapture(e.pointerId);}catch{/* optional */}
 };
 private move=(e:PointerEvent)=>{
  const previous=this.pointerPositions.get(e.pointerId);
  if(!previous)return;
  const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
  this.pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pointerPositions.size===2){
   const [a,b]=[...this.pointerPositions.values()];
   const d=Math.hypot(a.x-b.x,a.y-b.y);
   if(this.pinchDistance>0)this.distance=Math.max(49,Math.min(120,
    this.distance*this.pinchDistance/d));
   this.pinchDistance=d;this.dragDistance=30;
  }else if(this.pointerPositions.size===1){
   this.dragDistance+=Math.hypot(dx,dy);
   this.yaw+=dx*.010;this.pitch=Math.max(-.55,Math.min(.8,this.pitch+dy*.008));
  }
  this.draw();
 };
 private up=(e:PointerEvent)=>{
  if(!this.pointerPositions.has(e.pointerId))return;
  if(this.dragDistance<9&&this.pointerPositions.size===1&&this.renderer){
   const rect=this.canvasHost.getBoundingClientRect();
   const mouse=new THREE.Vector2(
    (e.clientX-rect.left)/Math.max(1,rect.width)*2-1,
    -((e.clientY-rect.top)/Math.max(1,rect.height)*2-1));
   this.raycaster.setFromCamera(mouse,this.camera);
   const hit=this.raycaster.intersectObjects(this.model.children,true)
    .find(hit=>typeof hit.object.userData.slot==='string');
   const slot=hit?.object.userData.slot as WeaponAttachmentSlot|undefined;
   if(slot){this.setActiveSlot(slot);this.onSelect(slot);}
  }
  this.pointerPositions.delete(e.pointerId);
  if(this.pointerPositions.size<2)this.pinchDistance=0;
  try{this.canvasHost.releasePointerCapture(e.pointerId);}catch{/* optional */}
 };
 private wheel=(e:WheelEvent)=>{
  e.preventDefault();
  this.distance=Math.max(49,Math.min(120,this.distance+e.deltaY*.08));
  this.draw();
 };
 private draw(){
  if(!this.renderer)return;
  const w=Math.max(180,this.canvasHost.clientWidth),h=Math.max(190,this.canvasHost.clientHeight);
  this.renderer.setSize(w,h,false);
  this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  this.model.rotation.set(this.pitch,this.yaw,0);
  this.camera.position.set(2,16,this.distance);
  this.camera.lookAt(2,0,0);
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){
  this.resizeObserver.disconnect();
  this.canvasHost.removeEventListener('pointerdown',this.down);
  this.canvasHost.removeEventListener('pointermove',this.move);
  this.canvasHost.removeEventListener('pointerup',this.up);
  this.canvasHost.removeEventListener('pointercancel',this.up);
  this.canvasHost.removeEventListener('wheel',this.wheel);
  this.pointerPositions.clear();
  clearWeaponSilhouette(this.model);
  this.steel.dispose();this.dark.dispose();this.selectedMaterial.dispose();
  this.markerMaterial.dispose();this.markerGeometry.dispose();
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer?.domElement.remove();this.renderer=null;
  this.host.replaceChildren();
 }
}
