/** Arsenal V2 Stage 4: standalone, on-demand weapon inspection viewport.
 * No socket dots, duplicated part UI, inventory writes, or continuous animation.
 */
import * as THREE from 'three';
import {applyStudioGraphicLighting,disposeStudioGraphicLighting}
 from '../operator-studio-graphic-lighting.ts';
import {effectiveStudioLightLab,DEFAULT_STUDIO_LIGHT_LAB,
 type StudioLightLabSettings} from '../operator-studio-light-lab.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {partVisualBounds} from '../weapons/geometry/weapon-visual-anchors.ts';
import {workbenchFitDistance} from '../weapons/geometry/weapon-workbench-camera-fit.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {remapArsenalZoom} from './camera-state.ts';
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
 private readonly keyLight=new THREE.DirectionalLight(0xf8d8a8,2.6);
 private readonly hemisphere=new THREE.HemisphereLight(0xe2e9d9,0x253c36,2.3);
 private lighting:StudioLightLabSettings={...DEFAULT_STUDIO_LIGHT_LAB};
 private compareOriginal=true;
 private readonly steel=new THREE.MeshStandardMaterial({color:0x707875,roughness:.78,flatShading:true});
 private readonly dark=new THREE.MeshStandardMaterial({color:0x303a38,roughness:.84,flatShading:true});
 private readonly resizeObserver:ResizeObserver;
 private readonly pointers=new Map<number,{x:number;y:number}>();
 private readonly origins=new Map<number,{x:number;y:number}>();
 private readonly onSelect:(slot:ArsenalSlot)=>void;
 private body:THREE.Group|null=null;
 private attachments:THREE.Group|null=null;
 private highlight:THREE.Box3Helper|null=null;
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
  host.append(this.canvas);
  this.scene.background=new THREE.Color(0x162723);
  this.keyLight.position.set(30,55,70);
  this.scene.add(this.hemisphere,this.keyLight,this.model);
  // The Arsenal uses the same real authored weapon parts as gameplay; every
  // opaque piece can audition the Studio weapon material without recoloring.
  this.model.userData.fieldworkWeaponPresentation=true;
  let renderer:THREE.WebGLRenderer|null=null;
  try{
   renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:false,
    powerPreference:'low-power'});
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
  // Return source materials before disposing weapon geometry and caches.
  disposeStudioGraphicLighting(this.model);
  if(this.highlight){this.scene.remove(this.highlight);
   this.highlight.geometry.dispose();
   for(const material of Array.isArray(this.highlight.material)?this.highlight.material:[this.highlight.material])material.dispose();
   this.highlight=null;}
  if(this.body){this.model.remove(this.body);clearWeaponSilhouette(this.body);
   this.body=null;}
  if(this.attachments){
   this.model.remove(this.attachments);
   this.attachments.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
   this.attachments.clear();this.attachments=null;
  }
 }
 setRecipe(recipe:ArsenalRecipeV2,preserveView=true):boolean{
  const config=arsenalRecipeToLegacy(recipe);if(!config)return false;
  this.clearParts();
  this.body=buildWeaponSilhouette(config.weapon,this.steel,this.dark,config);
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
  this.setSelectedSlot(this.selected);
  this.applyLightingPreview();this.invalidate();
  return true;
 }
 /** Preview-only lighting, never stored in build recipes or inventory. */
 setLighting(settings:StudioLightLabSettings,compareOriginal=false){
  this.lighting=effectiveStudioLightLab(settings);
  this.compareOriginal=compareOriginal;
  this.applyLightingPreview();
  this.invalidate();
 }
 private applyLightingPreview(){
  const active=!this.compareOriginal&&
   (this.lighting.toon!==0||this.lighting.rim!=='off'||
    this.lighting.gradient!=='current');
  const settings=active?this.lighting:effectiveStudioLightLab(this.lighting,true);
  if(active){
   this.keyLight.color.setHex(0xfff2d6);
   this.keyLight.intensity=2.35;
   this.hemisphere.color.setHex(0xffffff);
   this.hemisphere.groundColor.setHex(
    settings.shadow==='plum-plus'?0x5b466c:0x798a7f);
   this.hemisphere.intensity=1.20;
   const a=THREE.MathUtils.degToRad(settings.lightAzimuth);
   this.keyLight.position.set(.46,.88,.07).normalize()
    .applyAxisAngle(new THREE.Vector3(0,1,0),a)
    .multiplyScalar(90);
  }else{
   this.keyLight.color.setHex(0xf8d8a8);
   this.keyLight.intensity=2.6;
   this.keyLight.position.set(30,55,70);
   this.hemisphere.color.setHex(0xe2e9d9);
   this.hemisphere.groundColor.setHex(0x253c36);
   this.hemisphere.intensity=2.3;
  }
  applyStudioGraphicLighting(this.model,settings);
 }
 setSelectedSlot(slot:ArsenalSlot){
  this.selected=slot;
  if(this.highlight){this.scene.remove(this.highlight);
   this.highlight.geometry.dispose();
   for(const material of Array.isArray(this.highlight.material)?this.highlight.material:[this.highlight.material])material.dispose();this.highlight=null;}
  if(this.body&&FAMILY_SLOTS.includes(slot as FamilyPartSlot)){
   const bounds=partVisualBounds(this.body,slot as FamilyPartSlot);
   if(bounds){
    this.body.updateMatrixWorld(true);
    bounds.applyMatrix4(this.body.matrixWorld);
    this.highlight=new THREE.Box3Helper(bounds,0x9fccc4);
    for(const material of Array.isArray(this.highlight.material)?this.highlight.material:[this.highlight.material]){
     material.transparent=true;material.opacity=.43;material.depthTest=true;
    }
    this.scene.add(this.highlight);
   }
  }
  this.invalidate();
 }
 fit(){
  this.distance=this.fitDistance;this.yaw=.12;this.pitch=.12;
  this.invalidate();
 }
 sideView(){this.yaw=0;this.pitch=0;this.invalidate();}
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
  if(this.pointers.size>1){this.multiTouch=true;this.pinch=0;}
 };
 private move=(e:PointerEvent)=>{
  const old=this.pointers.get(e.pointerId);if(!old)return;
  const dx=e.clientX-old.x,dy=e.clientY-old.y;
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const start=this.origins.get(e.pointerId);
  if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>7)
   this.gestureMoved=true;
  if(this.pointers.size===1){
   this.yaw+=dx*.009;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.007,-.65,.85);
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
  if(!this.pointers.size){this.gestureMoved=false;this.multiTouch=false;}
 };
 private wheel=(e:WheelEvent)=>{
  if(!this.renderer)return;
  e.preventDefault();
  this.distance=THREE.MathUtils.clamp(
   this.distance*Math.exp(e.deltaY*.001),18,210);
  this.invalidate();
 };
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.resizeObserver.disconnect();
  cancelAnimationFrame(this.frame);
  this.canvas.removeEventListener('pointerdown',this.down);
  this.canvas.removeEventListener('pointermove',this.move);
  this.canvas.removeEventListener('pointerup',this.up);
  this.canvas.removeEventListener('pointercancel',this.up);
  this.canvas.removeEventListener('wheel',this.wheel);
  this.clearParts();this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.steel.dispose();this.dark.dispose();
 }
}
