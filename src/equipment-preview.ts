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

export type EquipmentPreviewFocus='full'|'head'|'torso'|'weapon'|'carry'|'back'|'belt'|'legs';
const PREVIEW_FOCUS_TARGETS:Record<EquipmentPreviewFocus,readonly [number,number,number]>={
 full:[34,84,22],head:[57,66,23],torso:[38,69,22],
 weapon:[35,78,24],carry:[29,75,25],back:[38,77,26],
 belt:[25,64,19],legs:[16,85,19]
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
 private downX=0;
 private downY=0;
 private movedOnPress=false;
 private onTapSlot:((slot:LoadoutSlot)=>void)|null=null;
 private activeHotspot:LoadoutSlot|null=null;
 private readonly hotspotButtons=new Map<LoadoutSlot,HTMLButtonElement>();
 private hotspotLayer:HTMLDivElement|null=null;
 private zoomScale=1;
 private showHeldWeapon=true;
 private poseToggle:HTMLButtonElement|null=null;
 /** One projected white pip only for the actual selected visible mesh. */
 private selectedDot:HTMLDivElement|null=null;
 private dotTarget:EquipmentInspectionTarget|
  {kind:'gear';slot:LoadoutSlot;itemId:string}|null=null;
 private dotMesh:THREE.Object3D|null=null;
 private idleFrame:number|null=null;
 private idleLastPaint=0;
 private idleStarted=0;
 private idleQuietUntil=0;
 private idleBase:{headY:number;headX:number;chestZ:number;weaponX:number}|null=null;
 private readonly touchPointers=new Map<number,{x:number;y:number}>();
 private pinchDistance=0;
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
  host.setAttribute('role','group');
  host.tabIndex=0;
  host.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home');
  this.updateOrientationLabel();
  try{
   this.renderer=new THREE.WebGLRenderer({
    antialias:false,alpha:false,powerPreference:'low-power'});
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   this.renderer.setClearColor(0x1b2d2a,1);
   host.append(this.renderer.domElement);
   this.createHotspots();
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
   this.startInspectionIdle();
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
  this.fitFullOperator();
  this.refreshInspection();
  this.refreshSelectionDot();
  this.draw();
 }
 /** The same battle rig pose, used for production and read-only thumbnail
  * captures; no separate model definitions or inventory state are created. */
 private poseForThumb(weapon:WeaponId,appearanceSeed:number,equipment:EquipmentLoadout,
  weaponConfiguration?:WeaponConfiguration,magazines:readonly MagazineItem[]=[],
  wardrobe?:WardrobeOptions,forceHeldWeapon=false):void{
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
   deterministic:true,handlingOverride:'low',
   unarmedPreview:!(this.showHeldWeapon||forceHeldWeapon)},0);
  this.idleBase={
   headY:this.rig.head.rotation.y,headX:this.rig.head.rotation.x,
   chestZ:this.rig.chest.rotation.z,weaponX:this.rig.weapon.rotation.x
  };
 }

 /** Fit the visible operator instead of a fixed rig origin. */
 private fitFullOperator():void{
  const [height,radius,rise]=this.operatorFocus(this.focusArea);
  this.focusHeight=height;this.focusRadius=radius;this.focusRise=rise;
 }
 /** The field rig is ~50 model-space units tall, but garments and weapon
  * attachments vary. Anchor each equipment view to the ACTUAL posed 3D
  * bounds and the camera FOV. Never use an unrelated 57-unit head pivot
  * or an upper distance clamp that crops tall kits on phone aspect ratios. */
 private operatorFocus(area:EquipmentPreviewFocus):readonly [number,number,number]{
  if(!this.rig)return PREVIEW_FOCUS_TARGETS[area];
  this.rig.root.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(this.rig.root,true);
  if(bounds.isEmpty())return PREVIEW_FOCUS_TARGETS[area];
  const span=Math.max(1,bounds.max.y-bounds.min.y);
  const halfFov=Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5));
  const fitDistance=Math.max(78,span/(2*halfFov)*1.2);
  const heights:Record<EquipmentPreviewFocus,number>={
   full:.50,head:.78,torso:.58,weapon:.55,carry:.48,
   back:.57,belt:.38,legs:.31
  };
  const distances:Record<EquipmentPreviewFocus,number>={
   full:1,head:.89,torso:.94,weapon:1,carry:.96,
   back:.97,belt:.98,legs:1.02
  };
  return [bounds.min.y+span*heights[area],
   fitDistance*distances[area],Math.min(22,span*.35)];
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
     original.magazines,previewWardrobe,target.slot==='primary');
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
  this.clearTransientSelection();
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
  this.clearTransientSelection();
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
  // Never render a pack cue through the operator's chest.
  marker.material.depthTest=true;
  marker.material.depthWrite=false;
  marker.renderOrder=0;
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
  if(this.hotspotLayer)host.append(this.hotspotLayer);
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
 /** Selection belongs to the caller; preview never commits kit changes. */
 setOnTapSlot(callback:((slot:LoadoutSlot)=>void)|null):void{
  this.onTapSlot=callback;
  this.createHotspots();
  this.syncHotspots();
 }
 setSelectedSlot(slot:LoadoutSlot,_changePresentation=true):void{
  this.activeHotspot=slot;
  this.syncHotspots();
 }
 /** Retire stale highlight geometry on any context change. */
 clearTransientSelection():void{
  this.dotTarget=null;this.dotMesh=null;
  if(this.selectedDot)this.selectedDot.hidden=true;
  this.selectedCarryLocation=null;
  this.selectedInspection=null;
  this.inspectedMesh=null;
  this.inspectionCenter=null;
  this.inspectionSize=null;
  if(this.carryMarker)this.carryMarker.visible=false;
  if(this.inspectionBox)this.inspectionBox.visible=false;
  delete this.host.dataset.carryHighlight;
  delete this.host.dataset.inspectedItem;
  delete this.host.dataset.inspectionVisible;
  this.draw();
 }
 setWeaponPresentation(held:boolean):void{
  if(this.showHeldWeapon===held)return;
  this.showHeldWeapon=held;
  this.poseToggle?.setAttribute('aria-pressed',String(held));
  if(this.poseToggle)this.poseToggle.textContent=held?'HIDE WEAPON':'SHOW LOW READY';
  const state=this.visualSnapshot;
  if(!state)return;
  this.poseForThumb(state.weapon,state.appearanceSeed,state.equipment,
   state.weaponConfiguration,state.magazines,state.wardrobe);
  this.refreshInspection();this.refreshSelectionDot();this.draw();
 }
 zoomBy(factor:number):void{
  if(!Number.isFinite(factor)||factor<=0)return;
  this.zoomScale=THREE.MathUtils.clamp(this.zoomScale*factor,.55,1.65);
  this.draw();
 }
 resetZoom():void{this.zoomScale=1;this.draw();}
 private createHotspots():void{
  if(!this.renderer||this.hotspotLayer||!this.onTapSlot)return;
  const layer=document.createElement('div');
  layer.className='campaign-kit-hotspots';
  layer.setAttribute('aria-label','Interactive equipment positions');
  for(const [slot,label] of [
   ['head','Head'],['armor','Armor'],['rig','Chest rig'],['belt','Belt'],
   ['backpack','Backpack'],['primary','Weapon'],
   ['medical','Medical'],['utility','Tool']
  ] as const){
   const dot=document.createElement('button');
   dot.type='button';dot.className='campaign-kit-hotspot';
   dot.dataset.slot=slot;dot.textContent='•';
   dot.setAttribute('aria-label','Inspect '+label+' equipment');
   dot.title='Inspect '+label;
   dot.addEventListener('pointerdown',event=>event.stopPropagation());
   dot.addEventListener('pointerup',event=>event.stopPropagation());
   dot.addEventListener('click',event=>{
    event.stopPropagation();this.activeHotspot=slot;
    this.onTapSlot?.(slot);this.syncHotspots();
   });
   layer.append(dot);this.hotspotButtons.set(slot,dot);
  }
  const zoom=document.createElement('div');
  zoom.className='campaign-kit-zoom';
  for(const [label,factor] of [['+',.83],['−',1.2]] as const){
   const control=document.createElement('button');
   control.type='button';control.textContent=label;
   control.setAttribute('aria-label',factor<1?'Zoom into operator':'Zoom out of operator');
   control.addEventListener('pointerdown',event=>event.stopPropagation());
   control.addEventListener('click',event=>{
    event.stopPropagation();this.zoomBy(factor);
   });
   zoom.append(control);
  }
  layer.append(zoom);
  const pose=document.createElement('button');
  pose.type='button';pose.className='campaign-kit-preview-pose-toggle';
  pose.textContent=this.showHeldWeapon?'HIDE WEAPON':'SHOW LOW READY';
  pose.setAttribute('aria-pressed',String(this.showHeldWeapon));
  pose.setAttribute('aria-label','Toggle neutral equipment inspection and held weapon view');
  pose.addEventListener('pointerdown',event=>event.stopPropagation());
  pose.addEventListener('click',event=>{
   event.stopPropagation();this.setWeaponPresentation(!this.showHeldWeapon);
  });
  layer.append(pose);this.poseToggle=pose;
  const pip=document.createElement('div');
  pip.className='campaign-kit-selected-dot';pip.hidden=true;
  pip.setAttribute('aria-hidden','true');
  layer.append(pip);this.selectedDot=pip;
  this.hotspotLayer=layer;this.host.append(layer);
  this.syncHotspots();
 }
 /** Select the ACTUAL worn/carry mesh, without a bounding-box outline or
  * camera jump. No phantom marker if the option is not equipped/visible. */
 selectItemDot(target:EquipmentInspectionTarget|
  {kind:'gear';slot:LoadoutSlot;itemId:string}|null):void{
  this.dotTarget=target;this.refreshSelectionDot();
  this.idleQuietUntil=performance.now()+550;
  this.draw();
 }
 private refreshSelectionDot():void{
  if(!this.rig||!this.currentEquipment||!this.dotTarget){
   this.dotMesh=null;if(this.selectedDot)this.selectedDot.hidden=true;return;
  }
  const t=this.dotTarget;
  const selected=t.kind==='gear'?
   (this.currentEquipment.slots[t.slot]===t.itemId?
    this.previewGearMesh(t.slot,t.itemId,this.currentEquipment,
     this.visualSnapshot?.wardrobe):null):
   inspectEquipmentMesh(this.rig,this.currentEquipment,t);
  this.dotMesh=selected;
  if(!selected&&this.selectedDot)this.selectedDot.hidden=true;
 }
 private syncSelectionDot():void{
  const dot=this.selectedDot,mesh=this.dotMesh;
  if(!dot||!mesh||!this.rig){if(dot)dot.hidden=true;return;}
  const result=measureEquipmentMesh(mesh);
  if(!result.visible||!result.center){dot.hidden=true;return;}
  const center=result.center.clone(),screen=center.clone().project(this.camera);
  if(screen.z<-.9||screen.z>1||Math.abs(screen.x)>.9||Math.abs(screen.y)>.9){
   dot.hidden=true;return;
  }
  // If solid model geometry is between the camera and the selected item,
  // never draw its white marker through the operator's body.
  const direction=center.clone().sub(this.camera.position);
  const maxDistance=direction.length();
  const ray=new THREE.Raycaster(this.camera.position,
   direction.normalize(),.1,maxDistance+1);
  const closest=ray.intersectObject(this.rig.root,true)[0];
  let ancestor:THREE.Object3D|null=closest?.object??null;
  let hitsSelected=false;
  while(ancestor){if(ancestor===mesh){hitsSelected=true;break;}ancestor=ancestor.parent;}
  if(closest&&!hitsSelected&&closest.distance<maxDistance-
    Math.max(.5,(result.size?.length()??1)*.24)){
   dot.hidden=true;return;
  }
  dot.hidden=false;
  dot.style.left=((screen.x+1)*50).toFixed(2)+'%';
  dot.style.top=((1-screen.y)*50).toFixed(2)+'%';
 }
 private syncHotspots():void{
  if(!this.hotspotLayer||!this.rig||!this.renderer)return;
  this.rig.root.updateWorldMatrix(true,true);
  this.camera.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(this.rig.root);
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new THREE.Vector3());
  const height=bounds.max.y-bounds.min.y;
  const groups=this.rig.visualKit.wardrobeGear;
  const worn:Partial<Record<LoadoutSlot,THREE.Object3D[]>>={
   armor:Object.values(groups.armor),rig:Object.values(groups.rig),
   belt:Object.values(groups.belt),backpack:Object.values(groups.pack),
   primary:[this.rig.weaponBody]
  };
  const fallback:Partial<Record<LoadoutSlot,[number,number,number]>>={
   head:[0,.87,0],armor:[-.11,.69,.02],rig:[.10,.59,.06],
   belt:[-.12,.42,.02],backpack:[0,.63,-.17],
   primary:[.28,.52,.15],medical:[.18,.4,.06],utility:[-.22,.4,.06]
  };
  this.syncSelectionDot();
  for(const [slot,button] of this.hotspotButtons){
   const meshes=worn[slot]??[];
   const mesh=meshes.find(item=>item.visible&&item.parent);
   const itemBounds=mesh?new THREE.Box3().setFromObject(mesh,true):null;
   const local=fallback[slot]??[0,.5,0];
   const point=itemBounds&&!itemBounds.isEmpty()?
    itemBounds.getCenter(new THREE.Vector3()):
    new THREE.Vector3(center.x+local[0]*height,
     bounds.min.y+local[1]*height,center.z+local[2]*height);
   const projected=point.project(this.camera);
   const onScreen=projected.z>=-1&&projected.z<=1&&
    Math.abs(projected.x)<.92&&Math.abs(projected.y)<.92;
   // Three well-spaced front-side markers are legible on a phone.
   // The bottom equipment buttons remain the explicit accessible fallback
   // for armor, medical, tools and the weapon's hidden/holstered state.
   const compact=this.host.clientWidth<=620;
   const rear=Math.sin(this.azimuth)<-.15;
   const reduced=compact&&(
    slot==='armor'||slot==='medical'||slot==='utility'||
    (slot==='primary'&&!this.showHeldWeapon));
   const hiddenSide=slot==='backpack'?!rear:rear&&slot==='rig';
   // Side icons and ray-picked real meshes serve every slot on mobile.
   // Projected pips only remain available on larger inspection workspaces.
   button.hidden=compact||!onScreen||hiddenSide||reduced;
   button.style.left=((projected.x+1)*50).toFixed(2)+'%';
   button.style.top=((1-projected.y)*50).toFixed(2)+'%';
   button.setAttribute('aria-pressed',String(slot===this.activeHotspot));
  }
 }
 private tapEquipmentAt(clientX:number,clientY:number):void{
  if(!this.rig||!this.onTapSlot||!this.renderer)return;
  const rect=this.host.getBoundingClientRect();
  if(rect.width<2||rect.height<2)return;
  const xy=new THREE.Vector2(
   ((clientX-rect.left)/rect.width)*2-1,
   -((clientY-rect.top)/rect.height)*2+1
  );
  const ray=new THREE.Raycaster();
  this.rig.root.updateMatrixWorld(true);
  this.camera.updateMatrixWorld(true);
  ray.setFromCamera(xy,this.camera);
  const hit=ray.intersectObject(this.rig.root,true)[0];
  // A tap on empty stage retires transient callouts, never another category.
  if(!hit){this.clearTransientSelection();return;}
  const ancestorOf=(candidate:THREE.Object3D,parent:THREE.Object3D)=>{
   let node:THREE.Object3D|null=candidate;
   while(node){if(node===parent)return true;node=node.parent;}
   return false;
  };
  const worn=this.rig.visualKit.wardrobeGear;
  const match=(groups:Record<string,THREE.Object3D>)=>
   Object.values(groups).some(mesh=>ancestorOf(hit.object,mesh));
  let slot:LoadoutSlot;
  if(ancestorOf(hit.object,this.rig.weaponBody))slot='primary';
  else if(match(worn.pack))slot='backpack';
  else if(match(worn.belt))slot='belt';
  else if(match(worn.rig))slot='rig';
  else if(match(worn.armor))slot='armor';
  else{
   const extents=new THREE.Box3().setFromObject(this.rig.root);
   const ratio=(hit.point.y-extents.min.y)/Math.max(1,
    extents.max.y-extents.min.y);
   slot=ratio>.75?'head':ratio>.48?'armor':ratio>.26?'belt':'legs';
  }
  this.activeHotspot=slot;this.onTapSlot(slot);this.syncHotspots();
 }
 /** Keep rotation discoverable and usable without touch or a mouse. */
 private updateOrientationLabel():void{
  const degrees=((Math.round(this.azimuth*180/Math.PI)%360)+360)%360;
  const target:Record<EquipmentPreviewFocus,string>={
   full:'Full operator',head:'Head',torso:'Torso',
   weapon:'Weapon',carry:'Carried equipment',back:'Back',belt:'Belt',legs:'Legs'
  };
  this.host.setAttribute('aria-label','Rotatable, tappable 3D preview of '+
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
  this.idleQuietUntil=performance.now()+1200;
  // Ignore secondary touch contacts and non-primary mouse/pen buttons.
  // An ignored press must not capture the preview or block the next drag.
  if(event.target instanceof Element&&
   event.target.closest('.campaign-kit-hotspot'))return;
  if(event.pointerType==='touch'){
   this.touchPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
   if(this.touchPointers.size===2){
    const [a,b]=[...this.touchPointers.values()];
    this.pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);
    this.movedOnPress=true;
   }
  }
  if(this.pointerId!==null||!event.isPrimary||event.button!==0)return;
  this.pointerId=event.pointerId;this.lastX=event.clientX;
  this.downX=event.clientX;this.downY=event.clientY;
  this.movedOnPress=false;
  try{this.host.setPointerCapture(event.pointerId);}catch{/* optional */}
 };
 private pointerMove=(event:PointerEvent)=>{
  if(event.pointerType==='touch'&&this.touchPointers.has(event.pointerId)){
   this.touchPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
   if(this.touchPointers.size>=2){
    const [a,b]=[...this.touchPointers.values()];
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    if(this.pinchDistance>5)this.zoomBy(this.pinchDistance/Math.max(5,distance));
    this.pinchDistance=distance;this.movedOnPress=true;
    return;
   }
  }
  if(event.pointerId!==this.pointerId)return;
  const delta=event.clientX-this.lastX;
  if(Math.abs(event.clientX-this.downX)>7||
   Math.abs(event.clientY-this.downY)>7)this.movedOnPress=true;
  if(!delta)return;
  this.azimuth+=delta*.012;
  this.lastX=event.clientX;
  if(this.dragFrame===null)this.dragFrame=requestAnimationFrame(()=>{
   this.dragFrame=null;this.draw();
  });
 };
 private pointerUp=(event:PointerEvent)=>{
  this.touchPointers.delete(event.pointerId);
  if(this.touchPointers.size<2)this.pinchDistance=0;
  if(event.pointerId!==this.pointerId)return;
  this.pointerId=null;
  const tap=!this.movedOnPress&&
   Math.hypot(event.clientX-this.downX,event.clientY-this.downY)<9;
  if(tap&&event.type==='pointerup')this.tapEquipmentAt(event.clientX,event.clientY);
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
  const [height,radius,rise]=this.operatorFocus(area);
  const instant=!animate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Re-selecting a focus target must not restart an identical transition,
  // especially when a category and its equipment picker both request it.
  if(area===this.focusArea){
   if(!instant&&this.focusFrame!==null)return;
   if(this.focusFrame===null&&this.focusHeight===height&&
    this.focusRadius===radius&&this.focusRise===rise)return;
  }
  this.focusArea=area;this.host.dataset.previewFocus=area;
  this.idleQuietUntil=performance.now()+650;
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
 /** Gentle inspection-only activity; never writes to the simulation or
  * alters foot IK. No GPU work while hidden or with reduced motion. */
 private startInspectionIdle():void{
  if(this.idleFrame!==null||!this.renderer)return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  this.idleStarted=performance.now();
  const frame=(now:number)=>{
   this.idleFrame=null;
   if(!this.renderer||!this.host.isConnected)return;
   this.idleFrame=requestAnimationFrame(frame);
   if(now-this.idleLastPaint<48||document.hidden||
    !this.host.getClientRects().length||now<this.idleQuietUntil)return;
   this.idleLastPaint=now;
   this.applyInspectionIdle((now-this.idleStarted)/1000);
   this.draw();
  };
  this.idleFrame=requestAnimationFrame(frame);
 }
 private applyInspectionIdle(t:number):void{
  if(!this.rig||!this.idleBase)return;
  const b=this.idleBase;
  // Smooth low-amplitude breathing; slight occasional independent gaze.
  const glanceCycle=t%17,glanceWindow=Math.max(0,1-
   Math.abs(glanceCycle-8.5)/2.1);
  const glance=glanceWindow*glanceWindow*(3-2*glanceWindow);
  const weightCycle=t%13,shift=Math.sin(weightCycle/13*Math.PI*2);
  const checkCycle=t%29,check=Math.max(0,1-
   Math.abs(checkCycle-17)/2.0);
  const settle=check*check*(3-2*check);
  this.rig.head.rotation.y=b.headY+glance*.13*Math.sin(t*.41);
  this.rig.head.rotation.x=b.headX-settle*.055;
  this.rig.chest.rotation.z=b.chestZ+Math.sin(t*1.4)*.006+shift*.011;
  this.rig.weapon.rotation.x=b.weaponX+(this.showHeldWeapon?settle*.014:0);
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
  const radius=(center?Math.max(19,Math.min(48,
   (this.inspectionSize?.length()??8)*2.35)):this.focusRadius)*this.zoomScale;
  this.camera.position.set((center?.x??0)+radius*Math.cos(this.azimuth),
   center?center.y+radius*.38:this.focusHeight+this.focusRise,
   (center?.z??0)+radius*Math.sin(this.azimuth));
  this.camera.lookAt(center??new THREE.Vector3(0,this.focusHeight,0));
  if(this.inspectionBox?.visible)this.inspectionBox.updateMatrixWorld(true);
  if(this.carryMarker&&this.selectedCarryLocation==='backpack')
   this.carryMarker.visible=Math.cos(this.azimuth)<-.2;
  this.renderer.render(this.scene,this.camera);
  this.syncHotspots();
 }
 dispose(){
  if(this.idleFrame!==null)cancelAnimationFrame(this.idleFrame);
  this.idleFrame=null;
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
  this.touchPointers.clear();this.hotspotLayer?.remove();
  this.hotspotLayer=null;this.poseToggle=null;this.selectedDot=null;
  this.dotTarget=null;this.dotMesh=null;this.hotspotButtons.clear();
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
