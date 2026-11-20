/** Arsenal G2.7: actual Glock art, with common-scale family identity review.
 * S3: real Quick Play equipment choices; live draw/fire still gated to S5-S7.
 */
import * as THREE from 'three';
import {initialRoster,readRoster} from '../breach-roster.ts';
import {applyQuickPlayKitPreferences,serializeQuickPlayKitPreferences}
 from '../breach-quickplay-kit-preferences.ts';
import {BREACH_STORAGE_KEYS} from '../breach-storage-keys.ts';
import {emptySecondaryEquipment,equipFreshSecondary,moveSecondaryHolster,
 placeSecondaryMagazines,type SecondaryHolster} from '../secondary-equipment.ts';
import {secondaryCarrierSpace} from '../equipment-loadouts.ts';
import {openGlockWorkbench} from './glock-workbench.ts';
import {factoryGlockRecipe,loadGlockLibrary,saveGlockLibrary,
 renameGlockSavedBuild,duplicateGlockSavedBuild,deleteGlockSavedBuild,
 type GlockRecipe,type GlockSavedBuild} from './glock-saved-builds.ts';
import {quoteSecondaryMagazineLocation,
 secondaryCarryClaim} from '../equipment-magazine-placement.ts';

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
    '<span class="arsenal-glock-notice">ARSENAL / FACTORY & SAVED BUILDS</span>'+
  '</div>'+
  '<div class="arsenal-glock-feature">'+
    '<div class="arsenal-glock-hero-visual" aria-live="polite"></div>'+
    '<div class="arsenal-glock-feature-copy">'+
      '<span class="arsenal-overline">FIELDWORK / G2.7 IDENTITY LOCK</span>'+
      '<h3 class="arsenal-glock-model"></h3>'+
      '<p class="arsenal-glock-description"></p>'+
      '<div class="arsenal-glock-view-controls" role="group" aria-label="3D model view"></div>'+
      '<p class="arsenal-glock-view-note" role="status"></p>'+
      '<button type="button" class="arsenal-hero-open arsenal-glock-open">OPEN WORKBENCH</button>'+
      '<div class="arsenal-saved-actions arsenal-glock-saved-actions" hidden></div>'+
      '<p class="arsenal-glock-subnote">Actual Fieldwork 3D geometry and saved Quick Play sidearm presets. Live drawing and shooting remain separate.</p>'+
    '</div>'+
  '</div>'+
  '<div class="arsenal-browser arsenal-glock-browser">'+
   '<div class="arsenal-controls"><div><span class="arsenal-overline">FACTORY REFERENCES & SAVED</span>'+
   '<h2 class="arsenal-control-heading">SELECT A SECONDARY</h2></div>'+
   '<input class="arsenal-search arsenal-glock-search" type="search" placeholder="Find a model or build" aria-label="Find Glock model or saved build"></div>'+
   '<div class="arsenal-filters arsenal-glock-filters" role="group" aria-label="Secondary model filters"></div>'+
   '<p class="arsenal-count arsenal-glock-count" aria-live="polite"></p>'+
   '<div class="arsenal-grid arsenal-glock-cards" role="group" aria-label="Glock models and saved builds"></div>'+
   '</div>';
 const feature=section.querySelector<HTMLElement>('.arsenal-glock-hero-visual')!;
 const modelLabel=section.querySelector<HTMLElement>('.arsenal-glock-model')!;
 const desc=section.querySelector<HTMLElement>('.arsenal-glock-description')!;
 const note=section.querySelector<HTMLElement>('.arsenal-glock-view-note')!;
 const controls=section.querySelector<HTMLElement>('.arsenal-glock-view-controls')!;
 const cards=section.querySelector<HTMLElement>('.arsenal-glock-cards')!;
 const search=section.querySelector<HTMLInputElement>('.arsenal-glock-search')!;
 const filters=section.querySelector<HTMLElement>('.arsenal-glock-filters')!;
 const count=section.querySelector<HTMLElement>('.arsenal-glock-count')!;
 const openWorkbench=section.querySelector<HTMLButtonElement>('.arsenal-glock-open')!;
 const savedActions=section.querySelector<HTMLElement>('.arsenal-glock-saved-actions')!;
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
 const magazinePlacement=document.createElement('div');
 magazinePlacement.className='arsenal-glock-magazine-placements';
 magazinePlacement.setAttribute('aria-label','Pistol spare magazine positions');
 const equipButtons=document.createElement('div');equipButtons.className='arsenal-glock-equip-actions';
 equipButtons.append(equipAction,unequipAction);
 equipPanel.append(operatorLabel,holsterLabel,equipButtons,equipStatus,magazinePlacement);
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
   const beltless=m?.loadout.slots.belt==='belt-none';
   const report=m?secondaryCarryClaim(m.loadout):null;
   equipStatus.textContent=beltless?
    'A belt is required for a Glock holster. Equip a belt in Operator Studio.':
    equipped?
    'Selected: '+(GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===equipped)?.name??equipped)+
    ' · '+state.loadedRounds+' loaded · '+state.spareMagazines.length+
    ' spares · '+(report?.valid?'carry valid':'carry needs space')+
    ' · combat switching pending':
    'No secondary equipped for this operator.';
   equipAction.disabled=beltless||equipped===selected;
   unequipAction.disabled=!equipped;
   magazinePlacement.replaceChildren();
   if(m&&equipped)for(const [index,magazine] of state.spareMagazines.entries()){
    const label=document.createElement('label');
    label.textContent='SPARE '+(index+1);
    const input=document.createElement('select');
    input.setAttribute('aria-label','Spare '+(index+1)+' location');
    for(const [location,description] of [
     ['rig','Chest rig'],['belt','Belt'],['pocket','Pocket'],
     ['backpack','Backpack'],['overflow','Overflow']
    ] as const){
     const option=document.createElement('option');
     option.value=location;option.textContent=description;input.append(option);
    }
    input.value=magazine.location;
    input.addEventListener('change',()=>{
     try{
      const roster=readPrepared();
      const next={...roster,members:roster.members.map(member=>{
       if(member.id!==operatorPicker.value)return member;
       const quote=quoteSecondaryMagazineLocation(member.loadout,
        magazine.id,input.value as typeof magazine.location);
       if(!quote.ok)throw Error(quote.reason??'Carry space unavailable');
       return {...member,loadout:quote.kit};
      })};
      savePrepared(next);refreshEquip();
     }catch(e){
      input.value=magazine.location;
      equipStatus.textContent=e instanceof Error?e.message:'Cannot move magazine';
     }
    });
    label.append(input);magazinePlacement.append(label);
   }
  }catch{
   equipStatus.textContent='Local Quick Play equipment storage unavailable.';
   equipAction.disabled=true;unequipAction.disabled=true;
  }
 };
 const applyRecipe=(recipe:GlockRecipe):{ok:boolean;message:string}=>{
  try{
   const roster=readPrepared(),id=operatorPicker.value;
   let found=false;
   const next={...roster,members:roster.members.map(m=>{
    if(m.id!==id)return m;
    found=true;
    if(m.loadout.slots.belt==='belt-none')throw Error('Equip a belt before a Glock');
    const previous=m.loadout.secondary??emptySecondaryEquipment();
    const nextSide=moveSecondaryHolster(
     equipFreshSecondary(previous,m.id,recipe.model),recipe.holster);
    const side={...nextSide,spareMagazines:nextSide.spareMagazines.map((mag,i)=>({
     ...mag,location:recipe.spares[i]??mag.location
    }))};
    const equipment={...m.loadout,secondary:side};
    const claim=secondaryCarryClaim(equipment);
    if(!claim.valid)throw Error('No free '+claim.overflow.join(' / ')+' carry space');
    return {...m,loadout:equipment};
   })};
   if(!found)throw Error('Operator unavailable');
   savePrepared(next);
   selected=recipe.model;
   selectedSavedId=null;
   refresh();
   return {ok:true,message:'EQUIPPED · '+recipe.model+' · '+id};
  }catch(error){
   return {ok:false,message:error instanceof Error?error.message:
    'Quick Play equipment storage unavailable'};
  }
 };
 const writeEquipped=(weapon:GlockAppearanceId|null)=>{
  try{
   const roster=readPrepared(),id=operatorPicker.value;
   const next={...roster,members:roster.members.map(m=>{
    if(m.id!==id)return m;
    const previous=m.loadout.secondary??emptySecondaryEquipment();
    const chosen=equipFreshSecondary(previous,m.id,weapon);
    if(weapon&&m.loadout.slots.belt==='belt-none')
     throw Error('A belt is required for a Glock holster');
    const holster=moveSecondaryHolster(chosen,holsterPicker.value as SecondaryHolster);
    const secondary=placeSecondaryMagazines(holster,secondaryCarrierSpace(m.loadout));
    return {...m,loadout:{...m.loadout,secondary}};
   })};
   savePrepared(next);refreshEquip();
  }catch(e){equipStatus.textContent=e instanceof Error?e.message:'Unable to save secondary.';}
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
 let selectedSavedId:string|null=null;
 let filter:'all'|'compact'|'subcompact'|'crossover'|'saved'='all';
 const nameFor=(id:GlockAppearanceId)=>
  GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===id)?.name??id;
 const recipeForSelection=():GlockRecipe=>{
  const saved=loadGlockLibrary().builds.find(b=>b.id===selectedSavedId);
  if(saved)return saved.recipe;
  try{
   const member=readPrepared().members.find(m=>m.id===operatorPicker.value);
   const s=member?.loadout.secondary;
   if(s?.weapon===selected)return {version:1,model:selected,holster:s.holster,
    spares:s.spareMagazines.map(m=>m.location)};
  }catch{}
  return {...factoryGlockRecipe(selected),holster:holsterPicker.value as SecondaryHolster};
 };
 openWorkbench.addEventListener('click',()=>{
  const member=initialRoster().members.find(m=>m.id===operatorPicker.value);
  openGlockWorkbench(recipeForSelection(),{
   operatorName:member?.callsign??operatorPicker.value,
   onApply:applyRecipe,onLibraryChange:()=>{renderFilters();renderCards();refresh();}
  });
 });
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
   button.setAttribute('aria-pressed',String(id===selected&&!selectedSavedId));
  for(const button of cards.querySelectorAll<HTMLButtonElement>('[data-glock-saved]'))
   button.setAttribute('aria-pressed',String(button.dataset.glockSaved===selectedSavedId));
  savedActions.hidden=!selectedSavedId;
  savedActions.replaceChildren();
  if(selectedSavedId){
   const saved=loadGlockLibrary().builds.find(b=>b.id===selectedSavedId);
   if(saved){
    const b=()=>{const x=document.createElement('button');
     x.type='button';return x;};
    const rename=b();rename.textContent='RENAME';
    rename.addEventListener('click',()=>{
     const next=window.prompt('Rename saved secondary build',saved.name);
     if(next===null)return;
     const changed=renameGlockSavedBuild(loadGlockLibrary(),saved.id,next);
     if(changed&&saveGlockLibrary(changed)){renderFilters();renderCards();}
    });
    const duplicate=b();duplicate.textContent='DUPLICATE';
    duplicate.addEventListener('click',()=>{
     const copy=duplicateGlockSavedBuild(loadGlockLibrary(),saved.id);
     if(copy&&saveGlockLibrary(copy.library)){
      selectedSavedId=copy.build.id;renderFilters();renderCards();refresh();
     }
    });
    const remove=b();remove.textContent='DELETE';
    remove.addEventListener('click',()=>{
     if(!window.confirm('Delete '+saved.name+'?'))return;
     if(saveGlockLibrary(deleteGlockSavedBuild(loadGlockLibrary(),saved.id))){
      selectedSavedId=null;renderFilters();renderCards();refresh();
     }
    });
    savedActions.append(rename,duplicate,remove);
   }
  }
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
 const filterOptions:readonly (readonly [typeof filter,string])[]=[
  ['all','ALL'],['compact','G19'],['subcompact','G26'],
  ['crossover','G19X'],['saved','SAVED']
 ];
 const filterMatch=(id:GlockAppearanceId)=>{
  if(filter==='all')return true;
  if(filter==='compact')return id==='glock-g19-gen3'||id==='glock-g19-gen5-mos';
  if(filter==='subcompact')return id==='glock-g26';
  if(filter==='crossover')return id==='glock-g19x';
  return false;
 };
 const searchMatch=(id:GlockAppearanceId,name:string)=>{
  const q=search.value.trim().toLowerCase();
  return !q||[id,name,
   GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===id)?.description??'']
   .some(text=>text.toLowerCase().includes(q));
 };
 function renderFilters(){
  filters.replaceChildren();
  for(const [id,label] of filterOptions){
   const button=document.createElement('button');
   button.type='button';button.className='arsenal-filter';
   button.textContent=id==='saved'?label+' · '+loadGlockLibrary().builds.length:label;
   button.setAttribute('aria-pressed',String(filter===id));
   button.addEventListener('click',()=>{
    filter=id;renderFilters();renderCards();
   });
   filters.append(button);
  }
 }
 function renderCards(){
  cards.replaceChildren();
  buttons.clear();images.clear();
  const saved=loadGlockLibrary().builds;
  const shown:({kind:'factory';ref:typeof GLOCK_APPEARANCE_REFERENCES[number]}|
   {kind:'saved';build:GlockSavedBuild})[]=[];
  if(filter!=='saved')for(const ref of GLOCK_APPEARANCE_REFERENCES)
   if(filterMatch(ref.id)&&searchMatch(ref.id,ref.name))
    shown.push({kind:'factory',ref});
  if(filter==='saved')for(const build of saved)
   if(searchMatch(build.recipe.model,build.name))
    shown.push({kind:'saved',build});
  count.textContent=shown.length+
   (filter==='saved'?' SAVED SECONDARIES':' FACTORY CONFIGURATIONS');
  if(!shown.length){
   const empty=document.createElement('p');
   empty.className='arsenal-empty';
   empty.textContent=filter==='saved'?'No saved Glock builds. Use OPEN WORKBENCH to save one.':
    'No matching models. Try another search or filter.';
   cards.append(empty);return;
  }
  for(const choice of shown){
   const ref=choice.kind==='factory'?choice.ref:
    GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===choice.build.recipe.model)!;
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-card arsenal-glock-card';
   button.setAttribute('aria-label','Inspect '+(choice.kind==='factory'?ref.name:choice.build.name));
   const image=document.createElement('span');
   image.className='arsenal-card-preview arsenal-glock-card-preview';
   const name=document.createElement('strong');name.className='model';
   name.textContent=choice.kind==='factory'?ref.name:choice.build.name;
   const caption=document.createElement('small');
   caption.className='platform';
   caption.textContent=choice.kind==='factory'?ref.description:
    'SAVED · '+ref.name;
   button.append(image,name,caption);
   if(choice.kind==='saved')button.dataset.glockSaved=choice.build.id;
   button.addEventListener('click',()=>{
    selected=ref.id;
    selectedSavedId=choice.kind==='saved'?choice.build.id:null;
    refresh();
   });
   cards.append(button);
   if(choice.kind==='factory')buttons.set(ref.id,button);
   // Workbench uses one WebGL context; saved and factory thumbnails share
   // the same source mesh and cache, never generate secondary replicas.
   const source=renderer.render(ref.id,'quarter','card');
   if(source){const photo=document.createElement('img');
    photo.src=source;photo.alt='';image.append(photo);}
  }
  refresh();
 }
 search.addEventListener('input',renderCards);
 renderFilters();renderCards();
 // One shared WebGL context, bounded on-demand snapshot work.
 requestAnimationFrame(()=>{
  if(!section.isConnected)return;
  refresh();
  // Factory and saved cards are rendered and cached on selection.
 });
 window.addEventListener('pagehide',()=>renderer.dispose(),{once:true});
 return section;
}
