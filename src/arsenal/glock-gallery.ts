/** Arsenal G2.7: actual Glock art, with common-scale family identity review.
 * S3: real Quick Play equipment choices; live draw/fire still gated to S5-S7.
 */
import * as THREE from 'three';
import {initialRoster,readRoster} from '../breach-roster.ts';
import {applyQuickPlayKitPreferences,serializeQuickPlayKitPreferences}
 from '../breach-quickplay-kit-preferences.ts';
import {BREACH_STORAGE_KEYS} from '../breach-storage-keys.ts';
import {emptySecondaryEquipment,equipFreshSecondary,moveSecondaryHolster,
 type SecondaryHolster} from '../secondary-equipment.ts';

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

type View='side'|'quarter'|'opposite'|'clay'|'peer'|'family';
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
  const family:THREE.Group[]=[];
  try{
   if(!this.renderer){
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
    configureGraphicRendererOutput(this.renderer);
    this.renderer.setPixelRatio(1);
   }
   const width=size==='hero'?960:420;
   const height=size==='hero'&&view==='family'?720:size==='hero'?480:210;
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;
   this.camera.updateProjectionMatrix();
   if(view==='family'){
    // Fixed offsets and ONE camera for all four genuine models: no
    // per-card camera fit or scaling disguising the subcompact's short grip.
    const positions:readonly (readonly [number,number])[]=[
     [-10.4,8.3],[10.4,8.3],[-10.4,-8.3],[10.4,-8.3]];
    GLOCK_APPEARANCE_REFERENCES.forEach((ref,i)=>{
     const item=buildGlockAppearance(ref.id);
     item.position.set(positions[i][0],positions[i][1],0);
     this.scene.add(item);family.push(item);
    });
   }else{
    model=buildGlockAppearance(id,{monochrome:view==='clay'});
    this.scene.add(model);
   }
   if(view==='peer'&&model){
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
   model?.updateMatrixWorld(true);peer?.updateMatrixWorld(true);
   const bounds=new THREE.Box3();
   if(model)bounds.expandByObject(model);
   for(const item of family){item.updateMatrixWorld(true);bounds.expandByObject(item);}
   if(peer)bounds.expandByObject(peer);
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=glockPreviewFitDistance(bounds,width,height,
    view==='peer'?.76:view==='family'?.78:size==='hero'?.86:.80);
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
   for(const item of family){this.scene.remove(item);clearGlockAppearance(item);}
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
 section.setAttribute('aria-label','Glock family secondary weapon loadouts');
 section.innerHTML=
  '<div class="arsenal-glock-header">'+
    '<div><span class="arsenal-overline">ARSENAL / SECONDARY WEAPONS</span>'+
    '<h2>GLOCK FAMILY</h2></div>'+
    '<span class="arsenal-glock-notice">QUICK PLAY EQUIPMENT · LIVE USE COMING S5–S7</span>'+
  '</div>'+
  '<div class="arsenal-glock-feature">'+
    '<div class="arsenal-glock-hero-visual" aria-live="polite"></div>'+
    '<div class="arsenal-glock-feature-copy">'+
      '<span class="arsenal-overline">FIELDWORK / G2.7 IDENTITY LOCK</span>'+
      '<h3 class="arsenal-glock-model"></h3>'+
      '<p class="arsenal-glock-description"></p>'+
      '<div class="arsenal-glock-view-controls" role="group" aria-label="3D model view"></div>'+
      '<p class="arsenal-glock-view-note" role="status"></p>'+
      '<p class="arsenal-glock-subnote">Real shared low-poly geometry, native Arsenal lighting. Models now share an operator loadout selection. Live drawing and shooting arrive in S5–S7.</p>'+
    '</div>'+
  '</div>'+
  '<div class="arsenal-glock-cards" role="group" aria-label="Glock family variants"></div>';
 const feature=section.querySelector<HTMLElement>('.arsenal-glock-hero-visual')!;
 const modelLabel=section.querySelector<HTMLElement>('.arsenal-glock-model')!;
 const desc=section.querySelector<HTMLElement>('.arsenal-glock-description')!;
 const note=section.querySelector<HTMLElement>('.arsenal-glock-view-note')!;
 const controls=section.querySelector<HTMLElement>('.arsenal-glock-view-controls')!;
 const cards=section.querySelector<HTMLElement>('.arsenal-glock-cards')!;
 // S3: loadout preparation shares Quick Play's existing persistent kit
 // preference file. This does not allocate Campaign stock or create a gun
 // inside a live Session before S5/S7 weapon-switch and ballistics authority.
 const equipPanel=document.createElement('div');
 equipPanel.className='arsenal-glock-equip';
 const operatorLabel=document.createElement('label');operatorLabel.textContent='OPERATOR';
 const operatorPicker=document.createElement('select');
 operatorPicker.setAttribute('aria-label','Quick Play operator');
 for(const member of initialRoster().members){
  const option=document.createElement('option');
  option.value=member.id;option.textContent=member.callsign;
  operatorPicker.append(option);
 }
 operatorLabel.append(operatorPicker);
 const holsterLabel=document.createElement('label');holsterLabel.textContent='HOLSTER';
 const holsterPicker=document.createElement('select');
 holsterPicker.setAttribute('aria-label','Secondary holster side');
 for(const [value,label] of [['belt-right','Right hip'],['belt-left','Left hip']] as const){
  const option=document.createElement('option');option.value=value;
  option.textContent=label;holsterPicker.append(option);
 }
 holsterLabel.append(holsterPicker);
 const equipAction=document.createElement('button');
 equipAction.type='button';equipAction.textContent='EQUIP GLOCK';
 const unequipAction=document.createElement('button');
 unequipAction.type='button';unequipAction.textContent='UNEQUIP';
 const equipStatus=document.createElement('p');
 equipStatus.className='arsenal-glock-equip-status';equipStatus.setAttribute('role','status');
 const equipButtons=document.createElement('div');equipButtons.className='arsenal-glock-equip-actions';
 equipButtons.append(equipAction,unequipAction);
 equipPanel.append(operatorLabel,holsterLabel,equipButtons,equipStatus);
 section.querySelector('.arsenal-glock-feature-copy')!.append(equipPanel);
 const readPrepared=()=>applyQuickPlayKitPreferences(
  readRoster(localStorage.getItem(BREACH_STORAGE_KEYS.quickCosmetics)),
  localStorage.getItem(BREACH_STORAGE_KEYS.quickKitPreferences));
 const savePrepared=(next:ReturnType<typeof readPrepared>)=>{
  localStorage.setItem(BREACH_STORAGE_KEYS.quickKitPreferences,
   serializeQuickPlayKitPreferences(next));
 };
 const refreshEquip=()=>{
  try{
   const m=readPrepared().members.find(x=>x.id===operatorPicker.value);
   const state=m?.loadout.secondary??emptySecondaryEquipment();
   holsterPicker.value=state.holster;
   const equipped=state.weapon;
   equipStatus.textContent=equipped?
    'Selected: '+(GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===equipped)?.name??equipped)+
    ' · '+state.loadedRounds+' loaded · '+state.spareMagazines.length+
    ' spare magazines · loadout only (live combat pending)':
    'No secondary equipped for this operator.';
   equipAction.disabled=equipped===selected;
   unequipAction.disabled=!equipped;
  }catch{
   equipStatus.textContent='Local Quick Play equipment storage unavailable.';
   equipAction.disabled=true;unequipAction.disabled=true;
  }
 };
 const writeEquipped=(weapon:GlockAppearanceId|null)=>{
  try{
   const roster=readPrepared(),id=operatorPicker.value;
   const next={...roster,members:roster.members.map(m=>{
    if(m.id!==id)return m;
    const previous=m.loadout.secondary??emptySecondaryEquipment();
    const chosen=equipFreshSecondary(previous,m.id,weapon);
    const holster=moveSecondaryHolster(chosen,holsterPicker.value as SecondaryHolster);
    return {...m,loadout:{...m.loadout,secondary:holster}};
   })};
   savePrepared(next);refreshEquip();
  }catch{equipStatus.textContent='Unable to save secondary to Quick Play equipment.';}
 };
 equipAction.addEventListener('click',()=>writeEquipped(selected));
 unequipAction.addEventListener('click',()=>writeEquipped(null));
 operatorPicker.addEventListener('change',refreshEquip);
 holsterPicker.addEventListener('change',()=>{
  try{
   const roster=readPrepared(),id=operatorPicker.value;
   const next={...roster,members:roster.members.map(m=>m.id!==id?m:{
    ...m,loadout:{...m.loadout,secondary:moveSecondaryHolster(
     m.loadout.secondary??emptySecondaryEquipment(),
     holsterPicker.value as SecondaryHolster)}})};
   savePrepared(next);refreshEquip();
  }catch{equipStatus.textContent='Unable to save holster location.';}
 });

 const renderer=new GlockGallerySnapshots();
 const images=new Map<GlockAppearanceId,HTMLElement>();
 const buttons=new Map<GlockAppearanceId,HTMLButtonElement>();
 let selected:GlockAppearanceId='glock-g19-gen3';
 let view:View='quarter';
 const views:readonly [View,string][]= [
  ['side','SIDE'],['quarter','THREE-QUARTER'],
  ['opposite','OPPOSITE'],['clay','CLAY'],
  ['family','FAMILY SCALE'],['peer','MP5K PEER']];
 const viewNotes:Record<View,string>={
  side:'Orthographic-feeling side profile · silhouette first',
  quarter:'Enlarged three-quarter view · check thickness and connected shapes',
  opposite:'Opposite side · check that surfaces are not simply mirrored',
  clay:'One material · no markings · judge the pure shape',
  family:'ONE CAMERA · top: G19 / G26 · bottom: G19X / Gen5 MOS · same art units and zoom',
  peer:'Glock ABOVE real MP5K BELOW · common art units, provisional until a live sidearm rig exists'
 };
 const display=(host:HTMLElement,id:GlockAppearanceId,angle:View,size:'card'|'hero')=>{
  const source=renderer.render(id,angle,size);
  if(!source){host.textContent='3D preview unavailable';return;}
  const image=document.createElement('img');
  image.src=source;
  image.alt=angle==='family'?'Four Glock variants side-by-side at identical 3D camera scale':'';
  image.decoding='async';host.dataset.view=angle;
  if(angle==='family'&&size==='hero'){
   const labels=document.createElement('div');
   labels.className='arsenal-glock-family-labels';
   for(const ref of GLOCK_APPEARANCE_REFERENCES){
    const tag=document.createElement('span');
    tag.textContent=ref.name;labels.append(tag);
   }
   host.replaceChildren(image,labels);
  }else host.replaceChildren(image);
 };
 const refresh=()=>{
  const reference=GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===selected)!;
  modelLabel.textContent=reference.name;
  desc.textContent=reference.description;
  note.textContent=viewNotes[view];
  refreshEquip();
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
