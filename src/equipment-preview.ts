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
import type {FieldCarryLocation} from './equipment-field-inventory.ts';
import {previewCarryFocus} from './equipment-preview-carry-focus.ts';
import {inspectEquipmentMesh,measureEquipmentMesh,
 type EquipmentInspectionTarget} from './equipment-visual-inspection.ts';
import {equippedFlashCharges} from './equipment-loadouts.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {releaseOperatorPreviewRig} from './operator-preview-rig-lifecycle.ts';
import {setEquipmentChoice,type LoadoutSlot} from './equipment-loadouts.ts';
import {resolvedWardrobe} from './operator-wardrobe-data.ts';
import {frameArmoryObject,type ArmoryShotCategory}
 from './equipment-thumbnail-camera.ts';
import {copyLinearRgbaToSrgbFlipped} from './equipment-thumbnail-color.ts';

export type EquipmentPreviewFocus='full'|'head'|'torso'|'weapon'|'carry';
const PREVIEW_FOCUS_TARGETS:Record<EquipmentPreviewFocus,readonly [number,number,number]>={
 full:[26,110,35],head:[57,72,26],torso:[38,82,31],
 weapon:[35,90,31],carry:[29,91,32]
};
export class CampaignKitPreview{
 private host:HTMLElement;
 private readonly operatorId:string;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(34,1,.1,700);
 private renderer:THREE.WebGLRenderer|null=null;
 private rig:OperatorRig|null=null;
 private carryMarker:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>|null=null;
 private selectedCarryLocation:FieldCarryLocation|null=null;
 private selectedInspection:EquipmentInspectionTarget|null=null;
 private inspectedMesh:THREE.Object3D|null=null;
 private readonly inspectionBounds=new THREE.Box3();
 private inspectionBox:THREE.Box3Helper|null=null;
 private inspectionCenter:THREE.Vector3|null=null;
 private inspectionSize:THREE.Vector3|null=null;
 private currentEquipment:EquipmentLoadout|null=null;
 private visualSnapshot:{
  weapon:WeaponId;appearanceSeed:number;equipment:EquipmentLoadout;
  weaponConfiguration?:WeaponConfiguration;magazines:readonly MagazineItem[];
  wardrobe?:WardrobeOptions
 }|null=null;
 private readonly modelThumbCache=new Map<string,string>();
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
  magazines:readonly MagazineItem[]=[],wardrobe?:WardrobeOptions,
  initialFocus:EquipmentPreviewFocus='full',initialAzimuth=.72){
  this.host=host;this.operatorId=id;
  // Restored operator angles also apply before the first paint, never as a
  // second frame after WebGL and procedural rig initialization.
  this.azimuth=Number.isFinite(initialAzimuth)?initialAzimuth:.72;
  // Apply the selected category framing before the first WebGL paint.
  // Setting it after construction would submit an unnecessary full-body frame.
  const [height,radius,rise]=PREVIEW_FOCUS_TARGETS[initialFocus];
  this.focusArea=initialFocus;
  this.focusHeight=height;this.focusRadius=radius;this.focusRise=rise;
  host.dataset.previewFocus=initialFocus;
  host.classList.add('campaign-kit-preview');
  host.setAttribute('role','img');
  host.tabIndex=0;
  host.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home');
  this.updateOrientationLabel();
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
   host.addEventListener('lostpointercapture',this.pointerUp);
   host.addEventListener('keydown',this.keyDown);
   this.observer=new ResizeObserver(()=>this.scheduleResize());
   this.observer.observe(host);
   // updateEquipment already painted the initial pose. Subsequent resize
   // notifications redraw only when dimensions actually change.
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
  this.currentEquipment=equipment;
  this.visualSnapshot={weapon,appearanceSeed,equipment,weaponConfiguration,magazines,wardrobe};
  this.modelThumbCache.clear();
  this.poseForThumb(weapon,appearanceSeed,equipment,weaponConfiguration,magazines,wardrobe);
  this.refreshInspection();
  this.draw();
 }
 /** The same battle rig pose, used for production and read-only thumbnail
  * captures; no separate model definitions or inventory state are created. */
 private poseForThumb(weapon:WeaponId,appearanceSeed:number,equipment:EquipmentLoadout,
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
   flashCharges:equippedFlashCharges(equipment),
   deterministic:true},0);
 }

 /** Render an equipped item's actual procedural 3D mesh in isolation, using
  * the EXISTING WebGL renderer (no second context, no icon substitutes).
  * A missing/unmounted model returns null and is labeled accordingly.
  * Caller may request alternate gear options; the active operator pose is
  * restored in finally before any presentation draw. */
 renderModelThumbnail(target:EquipmentInspectionTarget|
  {kind:'gear';slot:LoadoutSlot;itemId:string}):string|null{
  if(!this.renderer||!this.rig||!this.visualSnapshot)return null;
  const key=JSON.stringify(target);
  const previous=this.modelThumbCache.get(key);
  if(previous)return previous;
  const original=this.visualSnapshot;
  try{
   // An explicitly chosen cosmetic helmet does not override the catalog
   // preview for a DIFFERENT head item. Remove only that cosmetic override
   // during the temporary capture, then restore the real wardrobe below.
   const previewWardrobe=target.kind==='gear'&&target.slot==='head'&&
     target.itemId!==original.equipment.slots.head&&original.wardrobe?
    {...original.wardrobe,styles:{
      ...original.wardrobe.styles,headwear:undefined
    }}:original.wardrobe;
   const previewKit=target.kind==='gear'?
    setEquipmentChoice(original.equipment,target.slot,target.itemId):
    original.equipment;
   if(target.kind==='gear'){
    const weapon=target.slot==='primary'&&target.itemId.startsWith('primary-')?
     target.itemId.slice(8) as WeaponId:original.weapon;
    this.poseForThumb(weapon,original.appearanceSeed,previewKit,
     weapon===original.weapon?original.weaponConfiguration:undefined,
     original.magazines,previewWardrobe);
   }
   const selected=target.kind==='gear'?
    this.previewGearMesh(target.slot,target.itemId,previewKit,previewWardrobe):
    inspectEquipmentMesh(this.rig,original.equipment,target);
   if(!selected)return null;
   selected.updateWorldMatrix(true,true);
   const isolated=selected.clone(true);
   isolated.matrixAutoUpdate=false;
   isolated.matrix.copy(selected.matrixWorld);
   // Preserve per-subpart visibility (hidden cap/rails are not real gear).
   const modelScene=new THREE.Scene();
   modelScene.background=new THREE.Color(0x1b2d2a);
   modelScene.add(isolated);
   const bounds=new THREE.Box3().setFromObject(isolated,true);
   if(bounds.isEmpty())return null;
   const center=bounds.getCenter(new THREE.Vector3());
   const category:ArmoryShotCategory=target.kind==='gear'?
    target.slot==='primary'?'weapon':
    target.slot==='head'?'head':
    target.slot==='armor'?'armor':target.slot==='rig'?'rig':
    target.slot==='belt'?'belt':target.slot==='backpack'?'backpack':'small':
    target.kind==='armor'?'armor':target.kind==='rig'?'rig':
    target.kind==='belt'?'belt':target.kind==='backpack'?'backpack':'small';
   const shot=frameArmoryObject(bounds,category);
   const camera=new THREE.PerspectiveCamera(34,
    shot.width/shot.height,.1,1200);
   camera.position.copy(shot.position);
   camera.lookAt(shot.center);
   modelScene.add(new THREE.HemisphereLight(0xe1e9d8,0x293634,3.1));
   const light=new THREE.DirectionalLight(0xf2dbb8,2.4);
   light.position.set(center.x+40,center.y+65,center.z+55);
   modelScene.add(light);
   // Render at the ITEM'S aspect ratio, never the operator viewport ratio.
   // One temporary offscreen target on the existing WebGL context; a 2D
   // readback canvas encodes a thumbnail without another WebGL renderer.
   const targetBuffer=new THREE.WebGLRenderTarget(shot.width,shot.height,{
    depthBuffer:true,stencilBuffer:false});
   const previousTarget=this.renderer.getRenderTarget();
   let data:string|null=null;
   try{
    this.renderer.setRenderTarget(targetBuffer);
    this.renderer.render(modelScene,camera);
    const pixels=new Uint8Array(shot.width*shot.height*4);
    this.renderer.readRenderTargetPixels(targetBuffer,0,0,
     shot.width,shot.height,pixels);
    const canvas=document.createElement('canvas');
    canvas.width=shot.width;canvas.height=shot.height;
    const context=canvas.getContext('2d');
    if(!context)return null;
    const image=context.createImageData(shot.width,shot.height);
    image.data.set(copyLinearRgbaToSrgbFlipped(pixels,shot.width,shot.height));
    context.putImageData(image,0,0);
    data=canvas.toDataURL('image/png');
   }finally{
    this.renderer.setRenderTarget(previousTarget);
    targetBuffer.dispose();
   }
   if(!data||data.length<128)return null;
   this.modelThumbCache.set(key,data);
   return data;
  }catch{return null;}
  finally{
   this.poseForThumb(original.weapon,original.appearanceSeed,
    original.equipment,original.weaponConfiguration,
    original.magazines,original.wardrobe);
   this.refreshInspection();
   this.draw();
  }
 }
 private previewGearMesh(slot:LoadoutSlot,itemId:string,
  equipment:EquipmentLoadout,wardrobe?:WardrobeOptions):THREE.Object3D|null{
  if(!this.rig||itemId.endsWith('-none'))return null;
  const visual=this.rig.visualKit;
  const looks=resolvedWardrobe(wardrobe,equipment);
  // Wardrobe-authored equipment REPLACES the old generic shells. Query the
  // actual worn variant, or the picker previously reported NO MODEL while
  // a real armor/rig mesh was visibly attached to the operator.
  if(slot==='head')return visual.wardrobeHead.headwear[looks.headwear]??null;
  if(slot==='armor')
   return visual.wardrobeGear.armor[looks.armorStyle]??null;
  if(slot==='rig')return visual.wardrobeGear.rig[looks.rigStyle]??null;
  if(slot==='belt')return visual.wardrobeGear.belt[looks.beltStyle]??null;
  if(slot==='backpack')return visual.wardrobeGear.pack[looks.packStyle]??null;
  if(slot==='primary')return this.rig.weaponBody;
  if(slot==='medical'||slot==='utility')
   return inspectEquipmentMesh(this.rig,equipment,{kind:slot});
  return null;
 }

 /** Resolve the actual visible mesh for one carried object. No proxy gear
  * or inventory mutation; closed-pack contents explicitly remain concealed. */
 inspectCarryItem(target:EquipmentInspectionTarget|null):void{
  this.selectedInspection=target;
  this.selectedCarryLocation=null;
  if(this.carryMarker)this.carryMarker.visible=false;
  delete this.host.dataset.carryHighlight;
  this.refreshInspection();
  if(target&&this.inspectedMesh)this.focusOn('carry',false);
  this.draw();
 }
 private refreshInspection():void{
  if(!this.rig||!this.currentEquipment)return;
  this.inspectedMesh=this.selectedInspection?
   inspectEquipmentMesh(this.rig,this.currentEquipment,this.selectedInspection):null;
  const result=measureEquipmentMesh(this.inspectedMesh);
  this.host.dataset.inspectedItem=this.selectedInspection?
   (this.selectedInspection.id??this.selectedInspection.kind):'';
  this.host.dataset.inspectionVisible=String(result.visible);
  this.inspectionCenter=result.center??null;
  this.inspectionSize=result.size??null;
  if(result.center&&result.size){
   this.inspectionBounds.setFromCenterAndSize(result.center,result.size);
   if(!this.inspectionBox){
    this.inspectionBox=new THREE.Box3Helper(this.inspectionBounds,0xc8efaf);
    this.inspectionBox.name='preview-only-real-mesh-outline';
    this.inspectionBox.renderOrder=1000;
    this.scene.add(this.inspectionBox);
   }
   this.inspectionBox.visible=true;
  }else if(this.inspectionBox)this.inspectionBox.visible=false;
 }
 /** Highlight the actual operator carrying position; no new renderer, stock
  * write, item mesh, physics or perpetual animation loop is created. */
 highlightCarryLocation(location:FieldCarryLocation|null):void{
  if(!this.rig||!this.renderer)return;
  this.selectedInspection=null;this.inspectedMesh=null;
  this.inspectionCenter=null;this.inspectionSize=null;
  if(this.inspectionBox)this.inspectionBox.visible=false;
  delete this.host.dataset.inspectedItem;
  if(!location){
   this.selectedCarryLocation=null;
   if(this.carryMarker){this.carryMarker.visible=false;this.draw();}
   delete this.host.dataset.carryHighlight;
   return;
  }
  if(location===this.selectedCarryLocation&&this.carryMarker?.visible)return;
  this.selectedCarryLocation=location;
  if(!this.carryMarker){
   const material=new THREE.MeshBasicMaterial({
    color:0xc8efaf,transparent:true,opacity:.88,depthTest:false,
    side:THREE.DoubleSide});
   this.carryMarker=new THREE.Mesh(new THREE.RingGeometry(5.5,6.2,24),material);
   this.carryMarker.name='preview-only-carry-zone-marker';
   this.carryMarker.renderOrder=1000;
  }
  const marker=this.carryMarker,socket=previewCarryFocus(location);
  const bone=this.rig[socket.bone];
  if(marker.parent!==bone)bone.add(marker);
  marker.position.set(socket.x,socket.y,socket.z);
  marker.rotation.set(0,Math.PI/2,0);
  marker.scale.setScalar(socket.radius/6.2);
  marker.visible=true;
  this.host.dataset.carryHighlight=location;
  this.focusOn('carry');
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
  this.host.removeEventListener('lostpointercapture',this.pointerUp);
  this.host.removeEventListener('keydown',this.keyDown);
  if(this.dragFrame!==null)cancelAnimationFrame(this.dragFrame);
  this.dragFrame=null;this.pointerId=null;this.host=host;
  host.dataset.previewFocus=this.focusArea;
  if(this.selectedCarryLocation)host.dataset.carryHighlight=this.selectedCarryLocation;
  if(this.selectedInspection)host.dataset.inspectedItem=
   this.selectedInspection.id??this.selectedInspection.kind;
  else delete host.dataset.carryHighlight;
  host.classList.add('campaign-kit-preview');
  host.setAttribute('role','img');
  host.tabIndex=0;
  host.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home');
  this.updateOrientationLabel();
  if(this.renderer)host.append(this.renderer.domElement);
  host.addEventListener('pointerdown',this.pointerDown);
  host.addEventListener('pointermove',this.pointerMove);
  host.addEventListener('pointerup',this.pointerUp);
  host.addEventListener('pointercancel',this.pointerUp);
  host.addEventListener('lostpointercapture',this.pointerUp);
  host.addEventListener('keydown',this.keyDown);
  this.observer?.observe(host);
  // Campaign updates the rig immediately after a host swap; avoid a stale
  // pre-update render while preserving the default standalone behavior.
  if(drawImmediately)this.draw();
 }
 isReady():boolean{return this.renderer!==null&&this.rig!==null;}
 /** Keep rotation discoverable and usable without touch or a mouse. */
 private updateOrientationLabel():void{
  const degrees=((Math.round(this.azimuth*180/Math.PI)%360)+360)%360;
  const target:Record<EquipmentPreviewFocus,string>={
   full:'Full operator',head:'Head',torso:'Torso',
   weapon:'Weapon',carry:'Carried equipment'
  };
  this.host.setAttribute('aria-label','Rotatable 3D preview of '+
   this.operatorId+' with equipped gear. '+target[this.focusArea]+
   ' view. View angle '+degrees+
   ' degrees. Use Left and Right arrow keys to rotate; Home resets the angle.');
 }
 private keyDown=(event:KeyboardEvent)=>{
  if(!this.renderer||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
  event.preventDefault();
  if(this.dragFrame!==null)cancelAnimationFrame(this.dragFrame);
  this.dragFrame=null;
  // The same idempotent camera path powers buttons and keyboard. Home
  // restores the original angle but never discards the active kit focus.
  if(event.key==='Home'){this.resetOrientation();return;}
  this.rotateBy((event.key==='ArrowRight'?1:-1)*(event.shiftKey?15:5));
 };
 private pointerDown=(event:PointerEvent)=>{
  // Ignore secondary touch contacts and non-primary mouse/pen buttons.
  // An ignored press must not capture the preview or block the next drag.
  if(this.pointerId!==null||!event.isPrimary||event.button!==0)return;
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
  // One announcement per completed gesture, not on every high-frequency move.
  this.updateOrientationLabel();
  try{this.host.releasePointerCapture(event.pointerId);}catch{/* optional */}
 };
 /** One 220 ms context transition, with no recurring animation while idle. */
 focusOn(area:EquipmentPreviewFocus,animate=true):void{
  const [height,radius,rise]=PREVIEW_FOCUS_TARGETS[area];
  const instant=!animate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Re-selecting a focus target must not restart an identical transition,
  // especially when a category and its equipment picker both request it.
  if(area===this.focusArea){
   if(!instant&&this.focusFrame!==null)return;
   if(this.focusFrame===null&&this.focusHeight===height&&
    this.focusRadius===radius&&this.focusRise===rise)return;
  }
  this.focusArea=area;this.host.dataset.previewFocus=area;
  // Announce category changes once, not during the 220 ms interpolation.
  this.updateOrientationLabel();
  if(this.focusFrame!==null){
   cancelAnimationFrame(this.focusFrame);this.focusFrame=null;
  }
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
 /** Discrete, touch-accessible orbit controls share keyboard/drag camera state. */
 rotateBy(degrees:number):void{
  if(Number.isFinite(degrees))this.setAzimuth(this.azimuth+degrees*Math.PI/180);
 }
 /** Reset rotation only; retain the equipment category's current focus. */
 resetOrientation():void{this.setAzimuth(.72);}
 setAzimuth(value:number){
  if(!Number.isFinite(value)||Math.abs(this.azimuth-value)<1e-7)return;
  this.azimuth=value;
  this.updateOrientationLabel();
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
  // Selected mesh, not a nearby carrier zone, becomes the orbit target.
  const center=this.inspectionCenter;
  const radius=center?Math.max(19,Math.min(48,
   (this.inspectionSize?.length()??8)*2.35)):this.focusRadius;
  this.camera.position.set((center?.x??0)+radius*Math.cos(this.azimuth),
   center?center.y+radius*.38:this.focusHeight+this.focusRise,
   (center?.z??0)+radius*Math.sin(this.azimuth));
  this.camera.lookAt(center??new THREE.Vector3(0,this.focusHeight,0));
  if(this.inspectionBox?.visible)this.inspectionBox.updateMatrixWorld(true);
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
  this.host.removeEventListener('lostpointercapture',this.pointerUp);
  this.host.removeEventListener('keydown',this.keyDown);
  if(this.carryMarker){
   this.carryMarker.removeFromParent();this.carryMarker.geometry.dispose();
   this.carryMarker.material.dispose();this.carryMarker=null;
  }
  this.selectedCarryLocation=null;
  this.selectedInspection=null;this.inspectedMesh=null;
  this.currentEquipment=null;
  if(this.inspectionBox){
   this.inspectionBox.removeFromParent();
   this.inspectionBox.geometry.dispose();
   (this.inspectionBox.material as THREE.Material).dispose();
   this.inspectionBox=null;
  }
  if(this.rig){releaseOperatorPreviewRig(this.scene,this.rig);this.rig=null;}
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer?.domElement.remove();this.renderer=null;
  this.pointerId=null;
 }
}
