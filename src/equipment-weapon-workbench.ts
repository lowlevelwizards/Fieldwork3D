/** Equipment 21.01: separate on-demand weapon-only workbench.
 * No duplicated procedural gun meshes, continuous animation or second operator rig.
 * On mobile, a drag rotates, pinch/wheel zooms, tap picks a physical mount.
 */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {workbenchMounts,type WorkbenchMode,type WorkbenchSocket}
 from './equipment-weapon-workbench-layout.ts';
import {FAMILY_PARTS} from './equipment-weapon-families.ts';

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
 private readonly toolbar:HTMLDivElement;
 private readonly socketButtons=new Map<WorkbenchSocket,HTMLButtonElement>();
 private fallbackCanvas:HTMLCanvasElement|null=null;
 private mode:WorkbenchMode='attachments';
 private readonly onSelect:(slot:WorkbenchSocket)=>void;
 private readonly resizeObserver:ResizeObserver;
 private yaw=.15;
 private pitch=.17;
 private distance=77;
 private dragDistance=0;
 private pinchDistance=0;
 private active:WorkbenchSocket='optic';
 private config:WeaponConfiguration;
 constructor(host:HTMLElement,config:WeaponConfiguration,
  onSelect:(slot:WorkbenchSocket)=>void){
  this.host=host;this.config=config;this.onSelect=onSelect;
  this.canvasHost=document.createElement('div');
  this.canvasHost.className='weapon-workbench-viewport';
  this.canvasHost.style.cssText='position:relative;display:block;min-width:0;'+
   'width:100%;height:240px;max-width:100%;'+
   'background:#162723;border:1px solid #566e61;border-radius:10px;'+
   'touch-action:none;overflow:hidden';
  this.caption=document.createElement('p');this.caption.className='campaign-note';
  this.caption.style.cssText='margin:8px 0 4px;min-height:2em';
  host.classList.add('weapon-workbench');
  host.style.cssText='display:block;width:100%;min-width:0;max-width:100%;overflow:hidden';
  this.toolbar=document.createElement('div');
  this.toolbar.style.cssText='display:flex;flex-wrap:wrap;gap:7px;margin:5px 0 9px';
  for(const mode of ['body','attachments'] as const){
   const button=document.createElement('button');
   button.type='button';button.dataset.workbenchMode=mode;
   button.textContent=mode==='body'?'BODY PARTS':'ACCESSORY MOUNTS';
   button.style.cssText='min-height:43px;flex:1 1 auto;padding:8px;'+
    'border:1px solid #728e80;border-radius:7px;background:#263c34;'+
    'font:700 12px sans-serif;color:#e6ead9;touch-action:manipulation';
   button.addEventListener('click',()=>{
    this.setMode(mode);this.onSelect(this.active);
   });
   this.toolbar.append(button);
  }
  const backup=document.createElement('button');
  backup.type='button';backup.textContent='2D VIEW';
  backup.setAttribute('aria-label','Switch to simplified 2D weapon preview');
  backup.style.cssText='min-height:43px;padding:8px 10px;border:1px solid #728e80;'+
   'border-radius:7px;background:#263c34;color:#d4e1d8';
  backup.addEventListener('click',()=>{this.enableFallback();this.draw();});
  this.toolbar.append(backup);
  host.append(this.toolbar,this.canvasHost,this.caption);
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
   this.renderer.domElement.style.cssText='display:block;width:100%;height:100%';
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{
    e.preventDefault();this.enableFallback();this.draw();
   });
   this.canvasHost.addEventListener('pointerdown',this.down);
   this.canvasHost.addEventListener('pointermove',this.move);
   this.canvasHost.addEventListener('pointerup',this.up);
   this.canvasHost.addEventListener('pointercancel',this.up);
   this.canvasHost.addEventListener('wheel',this.wheel,{passive:false});
  }catch{
   this.enableFallback();
  }
  this.resizeObserver=new ResizeObserver(()=>this.draw());
  this.resizeObserver.observe(this.canvasHost);
  this.setConfiguration(config);
 }
 setConfiguration(config:WeaponConfiguration){
  this.config=config;
  // The workbench never reuses a stale gun or a previous operator's sockets.
  this.clearMounts();
  clearWeaponSilhouette(this.model);
  const body=buildWeaponSilhouette(config.weapon,this.steel,this.dark,config);
  const accessories=buildWeaponAccessories(config,this.steel,this.dark);
  this.model.add(body,accessories);
  this.mode=config.build?'body':'attachments';
  this.active=config.build?'body-receiver':'optic';
  this.rebuildMounts();
  this.setActiveSlot(this.active);
 }
 private clearMounts(){
  for(const child of [...this.model.children])
   if(child.name.startsWith('mount-'))this.model.remove(child);
  for(const button of this.socketButtons.values())button.remove();
  this.socketButtons.clear();
 }
 private renderModeControls(){
  for(const button of this.toolbar.querySelectorAll<HTMLButtonElement>(
   '[data-workbench-mode]')){
   const mode=button.dataset.workbenchMode as WorkbenchMode;
   button.hidden=mode==='body'&&!this.config.build;
   button.setAttribute('aria-pressed',String(mode===this.mode));
   button.style.background=mode===this.mode?'#6e8975':'#263c34';
   button.style.color=mode===this.mode?'#101f1b':'#e6ead9';
  }
 }
 private rebuildMounts(){
  this.clearMounts();
  for(const anchor of workbenchMounts(this.config,this.mode)){
   const marker=new THREE.Mesh(this.markerGeometry,this.markerMaterial);
   marker.position.set(anchor.x,anchor.y,anchor.z);
   marker.userData.slot=anchor.slot;
   marker.name='mount-'+anchor.slot;
   marker.scale.setScalar(1.05);
   this.model.add(marker);
   const button=document.createElement('button');
   button.type='button';
   button.className='weapon-workbench-socket';
   button.textContent=anchor.slot.replace('body-','').toUpperCase();
   button.setAttribute('aria-label','Edit '+anchor.name);
   button.style.cssText='position:absolute;z-index:3;transform:translate(-50%,-50%);'+
    'padding:5px 7px;min-width:43px;min-height:32px;max-width:95px;'+
    'border-radius:16px;border:1px solid #b0cfac;background:#223b32eb;'+
    'font:700 10px/1.1 sans-serif;color:#ecf6e4;'+
    'touch-action:manipulation;white-space:normal;overflow-wrap:anywhere';
   button.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    this.setActiveSlot(anchor.slot);this.onSelect(anchor.slot);
   });
   this.socketButtons.set(anchor.slot,button);
   this.canvasHost.append(button);
  }
  this.renderModeControls();
 }
 setMode(mode:WorkbenchMode){
  if(mode==='body'&&!this.config.build)return;
  if(mode!==this.mode){
   this.mode=mode;
   this.rebuildMounts();
  }
  this.setActiveSlot(mode==='body'?'body-receiver':'optic');
 }
 setActiveSlot(slot:WorkbenchSocket){
  const bodySlot=slot.startsWith('body-');
  if(bodySlot&&!this.config.build)return;
  const mode:WorkbenchMode=bodySlot?'body':'attachments';
  if(mode!==this.mode){this.mode=mode;this.rebuildMounts();}
  this.active=slot;
  for(const child of this.model.children){
   if(child.name.startsWith('mount-')&&child instanceof THREE.Mesh){
    const selected=child.userData.slot===slot;
    child.material=selected?this.selectedMaterial:this.markerMaterial;
    child.scale.setScalar(selected?1.55:1.05);
   }
  }
  for(const [id,button] of this.socketButtons){
   const selected=id===slot;
   button.setAttribute('aria-pressed',String(selected));
   button.style.background=selected?'#e7c68e':'#223b32eb';
   button.style.color=selected?'#18241b':'#ecf6e4';
  }
  const a=resolveWeaponAssembly(this.config);
  const chosen=bodySlot?
   FAMILY_PARTS[this.config.build!.parts[slot.slice(5) as
    keyof typeof this.config.build.parts]]?.name:
   WEAPON_ATTACHMENTS[this.config.slots[slot as WeaponAttachmentSlot]]?.name;
  this.caption.textContent=slot.replace('body-','').toUpperCase()+' · '+
   (chosen??'FACTORY PART')+' · '+a.massKg.toFixed(2)+' KG'+
   (this.fallbackCanvas?' · 2D COMPATIBILITY VIEW':
    ' · DRAG TO ROTATE / PINCH TO ZOOM');
  this.renderModeControls();
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
   const slot=hit?.object.userData.slot as WorkbenchSocket|undefined;
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
 private enableFallback(){
  if(this.fallbackCanvas)return;
  const previous=this.renderer;
  this.renderer=null;
  previous?.domElement.remove();
  try{previous?.dispose();}catch{/* context may already be lost */}
  const canvas=document.createElement('canvas');
  canvas.style.cssText='display:block;width:100%;height:100%';
  this.fallbackCanvas=canvas;
  this.canvasHost.prepend(canvas);
 }
 private drawFallback(w:number,h:number){
  const canvas=this.fallbackCanvas,ctx=canvas?.getContext('2d');
  if(!canvas||!ctx)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#162723';ctx.fillRect(0,0,w,h);
  // Side-oriented shaded silhouette derived from the same meshes as the 3D rig.
  const rectangles:{x:number;y:number;width:number;height:number;z:number;dark:boolean}[]=[];
  this.model.traverse(object=>{
   if(!(object instanceof THREE.Mesh)||object.name.startsWith('mount-'))return;
   const geom=object.geometry;
   if(!geom.boundingBox)geom.computeBoundingBox();
   const box=geom.boundingBox;
   if(!box)return;
   const min=box.min,max=box.max;
   let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,z=0;
   for(const x of [min.x,max.x])for(const y of [min.y,max.y])
    for(const zz of [min.z,max.z]){
     const v=new THREE.Vector3(x,y,zz).applyMatrix4(object.matrixWorld)
      .project(this.camera);
     const sx=(v.x+1)*w/2,sy=(1-v.y)*h/2;
     left=Math.min(left,sx);right=Math.max(right,sx);
     top=Math.min(top,sy);bottom=Math.max(bottom,sy);z+=v.z/8;
    }
   if(Number.isFinite(left)&&right-left>.2&&bottom-top>.2)
    rectangles.push({x:left,y:top,width:right-left,height:bottom-top,z,
     dark:object.material===this.dark});
  });
  rectangles.sort((a,b)=>b.z-a.z);
  for(const shape of rectangles){
   ctx.fillStyle=shape.dark?'#34423d':'#96a49a';
   ctx.fillRect(shape.x,shape.y,shape.width,shape.height);
   ctx.strokeStyle='#142520';ctx.lineWidth=.7;
   ctx.strokeRect(shape.x,shape.y,shape.width,shape.height);
  }
 }
 private draw(){
  const w=this.canvasHost.clientWidth,h=this.canvasHost.clientHeight;
  if(w<2||h<2)return; // Do not size a renderer while an accordion is hidden.
  this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  this.model.rotation.set(this.pitch,this.yaw,0);
  this.camera.position.set(2,16,this.distance);
  this.camera.lookAt(2,0,0);
  this.camera.updateMatrixWorld(true);
  this.model.updateMatrixWorld(true);
  if(this.renderer){
   try{this.renderer.setSize(w,h,false);
    this.renderer.render(this.scene,this.camera);
   }catch{this.enableFallback();}
  }
  if(this.fallbackCanvas)this.drawFallback(w,h);
  // DOM sockets have a reliable 44-ish-pixel touch target on iOS and work in 2D.
  for(const anchor of workbenchMounts(this.config,this.mode)){
   const button=this.socketButtons.get(anchor.slot);
   if(!button)continue;
   const v=new THREE.Vector3(anchor.x,anchor.y,anchor.z)
    .applyMatrix4(this.model.matrixWorld).project(this.camera);
   button.hidden=v.z>1||v.z< -1;
   button.style.left=Math.max(10,Math.min(90,(v.x+1)*50))+'%';
   button.style.top=Math.max(13,Math.min(87,(1-v.y)*50))+'%';
  }
 }
 dispose(){
  this.resizeObserver.disconnect();
  this.canvasHost.removeEventListener('pointerdown',this.down);
  this.canvasHost.removeEventListener('pointermove',this.move);
  this.canvasHost.removeEventListener('pointerup',this.up);
  this.canvasHost.removeEventListener('pointercancel',this.up);
  this.canvasHost.removeEventListener('wheel',this.wheel);
  this.pointerPositions.clear();
  this.clearMounts();
  clearWeaponSilhouette(this.model);
  this.steel.dispose();this.dark.dispose();this.selectedMaterial.dispose();
  this.markerMaterial.dispose();this.markerGeometry.dispose();
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer?.domElement.remove();this.renderer=null;
  this.host.replaceChildren();
 }
}
