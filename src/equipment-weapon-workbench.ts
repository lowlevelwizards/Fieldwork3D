/** Equipment 21.01: separate on-demand weapon-only workbench.
 * No duplicated procedural gun meshes, continuous animation or second operator rig.
 * 3D rotates on drag; fixed-side 2D only zooms. Small accessible socket dots
 * open a line-linked replacement panel without obscuring the model.
 */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {workbenchMounts,type WorkbenchMode,type WorkbenchSocket}
 from './equipment-weapon-workbench-layout.ts';
import {FAMILY_PARTS,type FamilyPartSlot} from './equipment-weapon-families.ts';

export class WeaponWorkbenchPreview{
 private renderer:THREE.WebGLRenderer|null=null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,1,.1,300);
 private readonly model=new THREE.Group();
 private readonly pointerPositions=new Map<number,{x:number;y:number}>();
 private readonly steel=new THREE.MeshStandardMaterial({color:0x707875,roughness:.78,flatShading:true});
 private readonly dark=new THREE.MeshStandardMaterial({color:0x303a38,roughness:.84,flatShading:true});
 private readonly host:HTMLElement;
 private readonly canvasHost:HTMLDivElement;
 private readonly caption:HTMLParagraphElement;
 private readonly toolbar:HTMLDivElement;
 private readonly viewToggle:HTMLButtonElement;
 private readonly socketButtons=new Map<WorkbenchSocket,HTMLButtonElement>();
 private readonly leader:SVGSVGElement;
 private readonly leaderPath:SVGPathElement;
 private readonly choicePanel:HTMLDivElement;
 private readonly choiceTitle:HTMLElement;
 private readonly choiceSubtitle:HTMLParagraphElement;
 private readonly choiceGrid:HTMLDivElement;
 private fallbackCanvas:HTMLCanvasElement|null=null;
 private in2D=false;
 private revealed=false;
 private mode:WorkbenchMode='attachments';
 private readonly onSelect:(slot:WorkbenchSocket)=>void;
 private readonly resizeObserver:ResizeObserver;
 private yaw=.15;
 private pitch=.17;
 private distance=62;
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
  this.caption.style.cssText='margin:8px 0 4px;min-height:1em;font-size:11px;opacity:.72';
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
  this.viewToggle=backup;
  backup.type='button';backup.textContent='2D VIEW';
  backup.setAttribute('aria-label','Switch to simplified 2D weapon preview');
  backup.style.cssText='min-height:43px;padding:8px 10px;border:1px solid #728e80;'+
   'border-radius:7px;background:#263c34;color:#d4e1d8';
  backup.addEventListener('click',()=>this.switchView());
  this.toolbar.append(backup);
  this.leader=document.createElementNS('http://www.w3.org/2000/svg','svg');
  this.leader.setAttribute('aria-hidden','true');
  this.leader.style.cssText='position:absolute;inset:0;width:100%;height:100%;'+
   'z-index:2;overflow:visible;pointer-events:none';
  this.leaderPath=document.createElementNS('http://www.w3.org/2000/svg','path');
  this.leaderPath.setAttribute('fill','none');
  this.leaderPath.setAttribute('stroke','#f4f9f0');
  this.leaderPath.setAttribute('stroke-opacity','0.76');
  this.leaderPath.setAttribute('stroke-width','1.4');
  this.leaderPath.setAttribute('vector-effect','non-scaling-stroke');
  this.leader.append(this.leaderPath);
  this.canvasHost.append(this.leader);
  this.choicePanel=document.createElement('div');
  this.choicePanel.className='weapon-workbench-choices';
  this.choicePanel.style.cssText='margin:0;padding:11px 8px 8px;'+
   'border:1px solid #596f62;border-top:none;border-radius:0 0 9px 9px;'+
   'background:#21362f;min-width:0;max-width:100%';
  this.choiceTitle=document.createElement('strong');
  this.choiceTitle.style.cssText='display:block;color:#f1f5e7;'+
   'font:800 14px/1.25 sans-serif;letter-spacing:.05em';
  this.choiceSubtitle=document.createElement('p');
  this.choiceSubtitle.style.cssText='font:500 11px/1.4 sans-serif;'+
   'color:#c0d3c7;margin:4px 0 8px';
  this.choiceGrid=document.createElement('div');
  this.choiceGrid.className='weapon-workbench-options';
  this.choiceGrid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));'+
   'gap:7px;min-width:0';
  this.choicePanel.append(this.choiceTitle,this.choiceSubtitle,this.choiceGrid);
  this.choiceTitle.textContent='SELECT AN ATTACHMENT SOCKET';
  this.choiceSubtitle.textContent='Tap a white dot on the weapon to see replacement options.';
  host.append(this.toolbar,this.canvasHost,this.choicePanel,this.caption);
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
  this.revealed=false;
  this.choiceTitle.textContent='SELECT AN ATTACHMENT SOCKET';
  this.choiceSubtitle.textContent='Tap a white dot on the weapon to see replacement options.';
  this.choiceGrid.replaceChildren();
  this.setActiveSlot(this.active,false);
 }
 private clearMounts(){
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
   const button=document.createElement('button');
   button.type='button';
   button.className='weapon-workbench-socket';
   button.setAttribute('aria-label','Edit '+anchor.name);
   button.title=anchor.name;
   // A generous invisible hit region, with only a tiny translucent dot visible.
   button.style.cssText='position:absolute;z-index:3;transform:translate(-50%,-50%);'+
    'width:44px;height:44px;padding:0;display:flex;align-items:center;'+
    'justify-content:center;border:0;background:transparent;'+
    'touch-action:manipulation;cursor:pointer;overflow:visible';
   const dot=document.createElement('span');
   dot.className='weapon-workbench-dot';
   dot.setAttribute('aria-hidden','true');
   dot.style.cssText='width:8px;height:8px;border-radius:50%;'+
    'background:#f7fbf6ad;border:1px solid #ffffff80;'+
    'box-shadow:0 0 0 1px #0a1b19aa,0 0 4px #effff34d;'+
    'pointer-events:none;transition:background .12s,transform .12s';
   button.append(dot);
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
   this.revealed=false;
   this.choiceTitle.textContent='SELECT A '+(mode==='body'?'BODY':'MOUNT')+' SOCKET';
   this.choiceSubtitle.textContent='Tap a white dot to see compatible replacements.';
   this.choiceGrid.replaceChildren();
  }
  this.setActiveSlot(mode==='body'?'body-receiver':'optic');
 }
 setActiveSlot(slot:WorkbenchSocket,reveal=true){
  const bodySlot=slot.startsWith('body-');
  if(bodySlot&&!this.config.build)return;
  const mode:WorkbenchMode=bodySlot?'body':'attachments';
  if(mode!==this.mode){this.mode=mode;this.rebuildMounts();}
  this.active=slot;
  this.revealed=reveal;
  for(const [id,button] of this.socketButtons){
   const selected=id===slot&&reveal;
   button.setAttribute('aria-pressed',String(selected));
   const dot=button.firstElementChild as HTMLElement|null;
   if(dot){
    dot.style.background=selected?'#ffffff':'#f7fbf6ad';
    dot.style.transform=selected?'scale(1.25)':'scale(1)';
    dot.style.boxShadow=selected?
     '0 0 0 4px #ffffff3b,0 0 7px #ffffffcc':
     '0 0 0 1px #0a1b19aa,0 0 4px #effff34d';
   }
  }
  const a=resolveWeaponAssembly(this.config);
  this.caption.textContent=a.massKg.toFixed(2)+' KG · '+
   (this.in2D?'2D FIXED SIDE VIEW · PINCH TO ZOOM':
    '3D · DRAG TO ROTATE · PINCH TO ZOOM');
  this.renderModeControls();
  this.draw();
 }
 /** Use the existing authoritative select; changes still flow through
  * Campaign purchases/validation or Quick Play's roster-save path.
  */
 showSocketChoices(slot:WorkbenchSocket,select:HTMLSelectElement){
  this.setActiveSlot(slot);
  this.choiceTitle.textContent=slot.replace('body-','').replace(/-/g,' ').toUpperCase();
  const selected=select.selectedOptions[0];
  this.choiceSubtitle.textContent=selected?
   'EQUIPPED · '+selected.textContent:
   'Choose a compatible replacement';
  this.choiceGrid.replaceChildren();
  for(const option of Array.from(select.options)){
   if(!option.value)continue;
   const button=document.createElement('button');
   button.type='button';
   const equipped=option.value===select.value;
   button.textContent=option.textContent??option.value;
   button.setAttribute('aria-pressed',String(equipped));
   button.disabled=select.disabled||option.disabled;
   button.style.cssText='min-width:0;min-height:44px;padding:9px 7px;'+
    'border-radius:7px;border:1px solid '+
    (equipped?'#e5e9c5':'#748e7d')+';'+
    'background:'+(equipped?'#b8c9af':'#29463c')+';'+
    'color:'+(equipped?'#14231c':'#ebf0e3')+';'+
    'font:650 12px/1.25 sans-serif;overflow-wrap:anywhere;'+
    'touch-action:manipulation';
   button.addEventListener('click',()=>{
    if(button.disabled||select.value===option.value)return;
    select.value=option.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
   });
   this.choiceGrid.append(button);
  }
  if(!this.choiceGrid.childElementCount){
   this.choiceSubtitle.textContent='No compatible replacement options';
  }
 }
 private down=(e:PointerEvent)=>{
  // Socket labels are real touch buttons: never steal their pointer capture.
  if(e.target instanceof Element&&e.target.closest('button.weapon-workbench-socket'))return;
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
