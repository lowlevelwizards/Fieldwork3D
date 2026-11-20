/** Arsenal G2.2: the exact real Glock art, properly framed for miniature review.
 * Gallery-only; no issued sidearms, gameplay classes, or saved pistol recipes.
 */
import * as THREE from 'three';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../weapons/geometry/weapon-visual-palette.ts';
import {GLOCK_APPEARANCE_REFERENCES,buildGlockAppearance,clearGlockAppearance,
 type GlockAppearanceId} from '../weapons/geometry/glock-family-silhouettes.ts';

type View='side'|'quarter'|'opposite'|'clay'|'peer';
/** Unlike the rifle workbench, never impose a 27-unit minimum distance on a
 * short pistol. Frame the *actual* mesh bounds at the requested aspect ratio.
 * In peer mode both native-art meshes receive ONE camera and NO camera tricks.
 */
export function glockPreviewFitDistance(bounds:THREE.Box3,width:number,height:number,
 fit=.84):number{
 if(bounds.isEmpty()||width<=0||height<=0)return 27;
 const size=bounds.getSize(new THREE.Vector3());
 const halfTan=Math.tan(37*Math.PI/360);
 const fill=THREE.MathUtils.clamp(fit,.68,.88);
 const horizontal=size.x/(2*halfTan*(width/height)*fill);
 const vertical=size.y/(2*halfTan*fill);
 return Math.max(17.5,horizontal,vertical)+size.z*.30;
}
class GlockGallerySnapshots{
 private renderer:THREE.WebGLRenderer|null=null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,2,.1,300);
 private readonly cached=new Map<string,string>();
 private unavailable=false;
 constructor(){addArsenalInspectionLighting(this.scene);}
 render(id:GlockAppearanceId,view:View,size:'card'|'hero'):string|undefined{
  const key=[id,view,size].join('/');
  if(this.cached.has(key))return this.cached.get(key);
  if(this.unavailable)return undefined;
  let model:THREE.Group|null=null,peer:THREE.Group|null=null;
  try{
   if(!this.renderer){
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
    configureGraphicRendererOutput(this.renderer);
    this.renderer.setPixelRatio(1);
   }
   const width=size==='hero'?960:420,height=size==='hero'?480:210;
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;
   this.camera.updateProjectionMatrix();
   model=buildGlockAppearance(id,{monochrome:view==='clay'});
   this.scene.add(model);
   if(view==='peer'){
    // A REAL, live Arsenal MP5K model, not a mocked comparison shape.
    // Shared art-unit comparison is provisional until secondary rigs exist.
    const config=selectWeaponFamilyPreset(initialWeaponConfiguration('smg'),'hk-mp5k');
    peer=buildWeaponSilhouette('smg',WEAPON_ACCESSORY_STEEL,
     WEAPON_ACCESSORY_POLYMER,config);
    peer.scale.x=weaponVisualLayout(config).longitudinalScale;
    const pistolCenter=new THREE.Box3().setFromObject(model)
     .getCenter(new THREE.Vector3());
    const peerCenter=new THREE.Box3().setFromObject(peer)
     .getCenter(new THREE.Vector3());
    model.position.set(-pistolCenter.x,7.7-pistolCenter.y,0);
    peer.position.set(-peerCenter.x,-7.7-peerCenter.y,0);
    this.scene.add(peer);
   }
   model.updateMatrixWorld(true);peer?.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model);
   if(peer)bounds.union(new THREE.Box3().setFromObject(peer));
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=glockPreviewFitDistance(bounds,width,height,
    view==='peer'?.76:size==='hero'?.86:.80);
   // Three-quarter emphasizes the chunky 3D slab; side and clay are the
   // unbiased silhouette checks; opposite uses the genuine opposite side.
   const sideOffset=view==='quarter'?.29:0;
   this.camera.position.set(center.x+distance*sideOffset,
    center.y+distance*(view==='quarter'?.10:0),
    center.z+(view==='opposite'?-distance:distance));
   this.camera.lookAt(center);this.camera.updateProjectionMatrix();
   this.renderer.render(this.scene,this.camera);
   const encoded=this.renderer.domElement.toDataURL('image/webp',.84);
   if(this.cached.size>32)this.cached.clear();
   this.cached.set(key,encoded);
   return encoded;
  }catch{
   this.unavailable=true;
   return undefined;
  }finally{
   if(model){this.scene.remove(model);clearGlockAppearance(model);}
   if(peer){this.scene.remove(peer);clearWeaponSilhouette(peer);}
  }
 }
 dispose(){
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer=null;this.cached.clear();
 }
}

export function mountGlockArsenalGallery():HTMLElement{
 const section=document.createElement('section');
 section.className='arsenal-glock-gallery';
 section.setAttribute('aria-label','Glock family 3D appearance references');
 section.innerHTML=
  '<div class="arsenal-glock-header">'+
    '<div><span class="arsenal-overline">SIDEARMS / ART REFERENCE</span>'+
    '<h2>GLOCK FAMILY</h2></div>'+
    '<span class="arsenal-glock-notice">VISUAL PREVIEW · NOT YET EQUIPPABLE</span>'+
  '</div>'+
  '<div class="arsenal-glock-feature">'+
    '<div class="arsenal-glock-hero-visual" aria-live="polite"></div>'+
    '<div class="arsenal-glock-feature-copy">'+
      '<span class="arsenal-overline">FIELDWORK / G2.6 ICONIC FORMS</span>'+
      '<h3 class="arsenal-glock-model"></h3>'+
      '<p class="arsenal-glock-description"></p>'+
      '<div class="arsenal-glock-view-controls" role="group" aria-label="3D model view"></div>'+
      '<p class="arsenal-glock-view-note" role="status"></p>'+
      '<p class="arsenal-glock-subnote">Real shared low-poly geometry, native Arsenal lighting. Art previews only; functional secondaries remain separate.</p>'+
    '</div>'+
  '</div>'+
  '<div class="arsenal-glock-cards" role="group" aria-label="Glock family variants"></div>';
 const feature=section.querySelector<HTMLElement>('.arsenal-glock-hero-visual')!;
 const modelLabel=section.querySelector<HTMLElement>('.arsenal-glock-model')!;
 const desc=section.querySelector<HTMLElement>('.arsenal-glock-description')!;
 const note=section.querySelector<HTMLElement>('.arsenal-glock-view-note')!;
 const controls=section.querySelector<HTMLElement>('.arsenal-glock-view-controls')!;
 const cards=section.querySelector<HTMLElement>('.arsenal-glock-cards')!;
 const renderer=new GlockGallerySnapshots();
 const images=new Map<GlockAppearanceId,HTMLElement>();
 const buttons=new Map<GlockAppearanceId,HTMLButtonElement>();
 let selected:GlockAppearanceId='glock-g19-gen3';
 let view:View='quarter';
 const views:readonly [View,string][]= [
  ['side','SIDE'],['quarter','THREE-QUARTER'],
  ['opposite','OPPOSITE'],['clay','CLAY'],
  ['peer','MP5K PEER']];
 const viewNotes:Record<View,string>={
  side:'Orthographic-feeling side profile · silhouette first',
  quarter:'Enlarged three-quarter view · check thickness and connected shapes',
  opposite:'Opposite side · check that surfaces are not simply mirrored',
  clay:'One material · no markings · judge the pure shape',
  peer:'Glock ABOVE real MP5K BELOW · common art units, provisional until a live sidearm rig exists'
 };
 const display=(host:HTMLElement,id:GlockAppearanceId,angle:View,size:'card'|'hero')=>{
  const source=renderer.render(id,angle,size);
  if(!source){host.textContent='3D preview unavailable';return;}
  const image=document.createElement('img');
  image.src=source;image.alt='';
  image.decoding='async';host.replaceChildren(image);
 };
 const refresh=()=>{
  const reference=GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===selected)!;
  modelLabel.textContent=reference.name;
  desc.textContent=reference.description;
  note.textContent=viewNotes[view];
  display(feature,selected,view,'hero');
  for(const [id,button] of buttons)
   button.setAttribute('aria-pressed',String(id===selected));
  for(const button of controls.querySelectorAll<HTMLButtonElement>('button'))
   button.setAttribute('aria-pressed',String(button.dataset.view===view));
 };
 for(const [id,name] of views){
  const button=document.createElement('button');
  button.type='button';button.textContent=name;
  button.dataset.view=id;button.className='arsenal-glock-view';
  button.addEventListener('click',()=>{view=id;refresh();});
  controls.append(button);
 }
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const button=document.createElement('button');button.type='button';
  button.className='arsenal-glock-card';
  button.setAttribute('aria-label','Inspect '+ref.name);
  const image=document.createElement('span');image.className='arsenal-glock-card-preview';
  const name=document.createElement('strong');name.textContent=ref.name;
  const caption=document.createElement('small');caption.textContent=ref.description;
  button.append(image,name,caption);
  button.addEventListener('click',()=>{selected=ref.id;refresh();});
  cards.append(button);buttons.set(ref.id,button);images.set(ref.id,image);
 }
 // One shared WebGL context, bounded on-demand snapshot work.
 requestAnimationFrame(()=>{
  if(!section.isConnected)return;
  refresh();
  const sequence=[...GLOCK_APPEARANCE_REFERENCES];
  const pump=(index:number)=>{
   if(index>=sequence.length||!section.isConnected)return;
   const ref=sequence[index];
   const host=images.get(ref.id);
   if(host)display(host,ref.id,'quarter','card');
   if(index+1<sequence.length)requestAnimationFrame(()=>pump(index+1));
  };
  requestAnimationFrame(()=>pump(0));
 });
 window.addEventListener('pagehide',()=>renderer.dispose(),{once:true});
 return section;
}
