/** Secondary Arsenal gallery: standalone weapon inspection and saved references.
 * Real operator equipment is edited through the shared Quick Play loadout UI.
 */
import * as THREE from 'three';
import {openGlockWorkbench} from './glock-workbench.ts';
import {createArsenalPreviewQueue} from './preview-job-queue.ts';
import {createArsenalSavedActionButtons,renderArsenalFilterButtons} from './gallery-browser-controls.ts';
import {type GlockCustomization} from '../weapons/geometry/glock-customization.ts';
import {factoryGlockRecipe,loadGlockLibrary,saveGlockLibrary,
 renameGlockSavedBuild,duplicateGlockSavedBuild,deleteGlockSavedBuild,
 type GlockSavedBuild} from './glock-saved-builds.ts';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {GLOCK_APPEARANCE_REFERENCES,buildGlockAppearance,clearGlockAppearance,
 type GlockAppearanceId} from '../weapons/geometry/glock-family-silhouettes.ts';

/** Unlike the rifle workbench, never impose a 27-unit minimum distance on a
 * short pistol. Frame the *actual* mesh bounds at the requested aspect ratio.
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
 render(id:GlockAppearanceId,size:'card'|'hero',
 customization?:GlockCustomization):string|undefined{
  const key=[id,size,JSON.stringify(customization??null)].join('/');
  if(this.cached.has(key))return this.cached.get(key);
  if(this.unavailable)return undefined;
  let model:THREE.Group|null=null;
  try{
   if(!this.renderer){
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
    configureGraphicRendererOutput(this.renderer);
    this.renderer.setPixelRatio(1);
   }
   const width=size==='hero'?960:420,height=size==='hero'?480:210;
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
   model=buildGlockAppearance(id,{customization});this.scene.add(model);
   model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model);
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=glockPreviewFitDistance(bounds,width,height,size==='hero'?.86:.80);
   // Factory and saved card icons share the same flat, right-facing side
   // profile used by primary Arsenal cards. Keep the hero three-quarter.
   const isCard=size==='card';
   this.camera.position.set(center.x+(isCard?0:distance*.29),
    center.y+(isCard?0:distance*.10),center.z+distance);
   this.camera.lookAt(center);this.camera.updateProjectionMatrix();
   this.renderer.render(this.scene,this.camera);
   const encoded=this.renderer.domElement.toDataURL('image/webp',.84);
   if(this.cached.size>32)this.cached.clear();
   this.cached.set(key,encoded);return encoded;
  }catch{
   this.unavailable=true;return undefined;
  }finally{
   if(model){this.scene.remove(model);clearGlockAppearance(model);}
  }
 }
 dispose(){
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer=null;this.cached.clear();
 }
}

export function mountGlockArsenalGallery():HTMLElement{
 const section=document.createElement('section');
 section.className='arsenal-layout arsenal-glock-gallery';
 section.setAttribute('aria-label','Glock family secondary weapon loadouts');
 section.innerHTML=
  '<div class="arsenal-hero arsenal-glock-feature">'+
    '<div class="arsenal-hero-media arsenal-glock-hero-visual" aria-live="polite"></div>'+
    '<div class="arsenal-hero-copy arsenal-glock-feature-copy">'+
      '<span class="arsenal-overline arsenal-glock-platform">GLOCK</span>'+
      '<h2 class="arsenal-glock-model"></h2>'+
      '<p class="hint arsenal-glock-description"></p>'+
      '<button type="button" class="arsenal-hero-open arsenal-glock-open">OPEN WORKBENCH</button>'+
      '<div class="arsenal-saved-actions arsenal-glock-saved-actions" hidden></div>'+
    '</div>'+
  '</div>'+
  '<div class="arsenal-browser arsenal-glock-browser">'+
   '<div class="arsenal-controls"><div><span class="arsenal-overline">FACTORY REFERENCES</span>'+
   '<h2 class="arsenal-control-heading">SELECT A WEAPON</h2></div>'+
   '<input class="arsenal-search arsenal-glock-search" type="search" placeholder="Find a model" aria-label="Find Glock model or saved build"></div>'+
   '<div class="arsenal-filters arsenal-glock-filters" role="group" aria-label="Secondary model filters"></div>'+
   '<p class="arsenal-count arsenal-glock-count" aria-live="polite"></p>'+
   '<div class="arsenal-grid arsenal-glock-cards" role="group" aria-label="Glock models and saved builds"></div>'+
  '</div>'+
  '';
 const feature=section.querySelector<HTMLElement>('.arsenal-glock-hero-visual')!;
 const modelLabel=section.querySelector<HTMLElement>('.arsenal-glock-model')!;
 const desc=section.querySelector<HTMLElement>('.arsenal-glock-description')!;
 const cards=section.querySelector<HTMLElement>('.arsenal-glock-cards')!;
 const search=section.querySelector<HTMLInputElement>('.arsenal-glock-search')!;
 const filters=section.querySelector<HTMLElement>('.arsenal-glock-filters')!;
 const count=section.querySelector<HTMLElement>('.arsenal-glock-count')!;
 const openWorkbench=section.querySelector<HTMLButtonElement>('.arsenal-glock-open')!;
 const savedActions=section.querySelector<HTMLElement>('.arsenal-glock-saved-actions')!;
 const renderer=new GlockGallerySnapshots();
 const previewQueue=createArsenalPreviewQueue();
 let observer:IntersectionObserver|null=null;
 let activated=false;
 let selectedSavedId:string|null=null;
 type GlockFilter='all'|'compact'|'subcompact'|'crossover'|'saved';
 const filterState:{value:GlockFilter}={value:'all'};
 const recipeForSelection=()=>{
  const saved=loadGlockLibrary().builds.find(b=>b.id===selectedSavedId);
  return saved?.recipe??factoryGlockRecipe(selected);
 };
 openWorkbench.addEventListener('click',()=>{
  openGlockWorkbench(recipeForSelection(),{
   onLibraryChange:()=>{renderFilters();renderCards();}
  });
 });
 const buttons=new Map<GlockAppearanceId,HTMLButtonElement>();
 let selected:GlockAppearanceId='glock-g19-gen3';
 const display=(host:HTMLElement,id:GlockAppearanceId,
 size:'card'|'hero',customization?:GlockCustomization)=>{
  const source=renderer.render(id,size,customization);
  if(!source){host.textContent='3D preview unavailable';return;}
  const image=document.createElement('img');
  image.src=source;image.alt='';image.decoding='async';
  host.replaceChildren(image);
 };
 const refresh=()=>{
  const reference=GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===selected)!;
  modelLabel.textContent=reference.name;
  desc.textContent=reference.description;
  const saved=loadGlockLibrary().builds.find(b=>b.id===selectedSavedId);
  // Give a just-opened tab one paint before its costly hero readback.
  // Priority replaces a prior hero request when selection changes rapidly.
  previewQueue.enqueue(feature,()=>
   display(feature,selected,'hero',saved?.recipe.customization),true);
  for(const [id,button] of buttons)
   button.setAttribute('aria-pressed',String(id===selected&&!selectedSavedId));
  for(const button of cards.querySelectorAll<HTMLButtonElement>('[data-glock-saved]'))
   button.setAttribute('aria-pressed',String(button.dataset.glockSaved===selectedSavedId));
  savedActions.hidden=!selectedSavedId;
  savedActions.replaceChildren();
  if(selectedSavedId){
   const saved=loadGlockLibrary().builds.find(b=>b.id===selectedSavedId);
   if(saved){
    const {rename,duplicate,remove}=createArsenalSavedActionButtons();
    rename.addEventListener('click',()=>{
     const next=window.prompt('Rename saved secondary build',saved.name);
     if(next===null)return;
     const changed=renameGlockSavedBuild(loadGlockLibrary(),saved.id,next);
     if(changed&&saveGlockLibrary(changed)){renderFilters();renderCards();}
    });
    duplicate.addEventListener('click',()=>{
     const copy=duplicateGlockSavedBuild(loadGlockLibrary(),saved.id);
     if(copy&&saveGlockLibrary(copy.library)){
      selectedSavedId=copy.build.id;renderFilters();renderCards();refresh();
     }
    });
    remove.addEventListener('click',()=>{
     if(!window.confirm('Delete '+saved.name+'?'))return;
     if(saveGlockLibrary(deleteGlockSavedBuild(loadGlockLibrary(),saved.id))){
      selectedSavedId=null;renderFilters();renderCards();refresh();
     }
    });
    savedActions.append(rename,duplicate,remove);
   }
  }
 };
 const filterOptions:readonly (readonly [GlockFilter,string])[]=[
  ['all','ALL'],['compact','G19'],['subcompact','G26'],
  ['crossover','G19X'],['saved','SAVED']
 ];
 const filterMatch=(id:GlockAppearanceId)=>{
  if(filterState.value==='all')return true;
  if(filterState.value==='compact')return id==='glock-g19-gen3'||id==='glock-g19-gen5-mos';
  if(filterState.value==='subcompact')return id==='glock-g26';
  if(filterState.value==='crossover')return id==='glock-g19x';
  return false;
 };
 const searchMatch=(id:GlockAppearanceId,name:string)=>{
  const q=search.value.trim().toLowerCase();
  return !q||[id,name,
   GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===id)?.description??'']
   .some(text=>text.toLowerCase().includes(q));
 };
 function renderFilters(){
  const items=filterOptions.map(([id,label])=>({
   id,name:id==='saved'?label+' · '+loadGlockLibrary().builds.length:label
  }));
  renderArsenalFilterButtons(filters,items,filterState.value,id=>{
   filterState.value=id;renderFilters();renderCards();
  });
 }
 function renderCards(){
  observer?.disconnect();observer=null;
  cards.replaceChildren();
  previewQueue.pruneDetached();
  buttons.clear();
  const deferred=new Map<Element,()=>void>();
  if('IntersectionObserver' in window){
   observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     observer?.unobserve(entry.target);
     const render=deferred.get(entry.target);
     deferred.delete(entry.target);
     if(render)previewQueue.enqueue(entry.target as HTMLElement,render);
    }
   },{rootMargin:'100px'});
  }
  const saved=loadGlockLibrary().builds;
  const shown:({kind:'factory';ref:typeof GLOCK_APPEARANCE_REFERENCES[number]}|
   {kind:'saved';build:GlockSavedBuild})[]=[];
  if(filterState.value!=='saved')for(const ref of GLOCK_APPEARANCE_REFERENCES)
   if(filterMatch(ref.id)&&searchMatch(ref.id,ref.name))
    shown.push({kind:'factory',ref});
  if(filterState.value==='saved')for(const build of saved)
   if(searchMatch(build.recipe.model,build.name))
    shown.push({kind:'saved',build});
  count.textContent=shown.length+
   (filterState.value==='saved'?' SAVED SECONDARIES':' FACTORY CONFIGURATIONS');
  if(!shown.length){
   const empty=document.createElement('p');
   empty.className='arsenal-empty';
   empty.textContent=filterState.value==='saved'?'No saved Glock builds. Use OPEN WORKBENCH to save one.':
    'No matching models. Try another search or filter.';
   cards.append(empty);return;
  }
  for(const choice of shown){
   const ref=choice.kind==='factory'?choice.ref:
    GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===choice.build.recipe.model)!;
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-card arsenal-glock-card';
   button.setAttribute('aria-pressed','false');
   button.setAttribute('aria-label','Inspect '+(choice.kind==='factory'?ref.name:choice.build.name));
   const image=document.createElement('span');
   image.className='arsenal-card-preview arsenal-glock-card-preview';
   const name=document.createElement('strong');name.className='model';
   name.textContent=choice.kind==='factory'?ref.name:choice.build.name;
   const caption=document.createElement('small');
   caption.className='platform';
   caption.textContent=choice.kind==='factory'?'GLOCK':
    'SAVED · GLOCK';
   button.append(image,name,caption);
   if(choice.kind==='saved')button.dataset.glockSaved=choice.build.id;
   button.addEventListener('click',()=>{
    selected=ref.id;
    selectedSavedId=choice.kind==='saved'?choice.build.id:null;
    refresh();
   });
   cards.append(button);
   if(choice.kind==='factory')buttons.set(ref.id,button);
   // The secondary shares primary's versioned, one-per-frame 3D image
   // scheduling. Offscreen/hidden cards do no GPU work; rapid filter
   // changes retire detached hosts before rendering their stale models.
   const paint=()=>{
    const source=renderer.render(ref.id,'card',
     choice.kind==='saved'?choice.build.recipe.customization:undefined);
    if(!source)return;
    const photo=document.createElement('img');
    photo.src=source;photo.alt='';photo.decoding='async';
    image.replaceChildren(photo);
   };
   if(observer){
    deferred.set(image,paint);observer.observe(image);
   }else previewQueue.enqueue(image,paint);
  }
  refresh();
 }
 search.addEventListener('input',()=>{if(activated)renderCards();});
 // Do not allocate a secondary renderer or paint hidden thumbnails while
 // the primary category is selected on initial Arsenal navigation.
 const activate=()=>{
  if(activated)return;
  activated=true;
  renderFilters();renderCards(); // also paints the first selected hero
 };
 window.addEventListener('pagehide',()=>{
  observer?.disconnect();previewQueue.dispose();renderer.dispose();
 },{once:true});
 return {section,activate};
}
