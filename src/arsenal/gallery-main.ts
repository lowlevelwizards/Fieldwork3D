/** Stage 3 standalone Arsenal gallery. No live inventory or loadout mutations.
 * Stage 4 will attach the unified full-screen Workbench to this same shell.
 */
import {ARSENAL_PLATFORMS,ARSENAL_REFERENCES,
 type ArsenalPlatformId,type ArsenalReference} from './catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {ArsenalThumbnailer} from './thumbnailer.ts';
import {createArsenalPreviewQueue} from './preview-job-queue.ts';
import {createArsenalSavedActionButtons,renderArsenalFilterButtons} from './gallery-browser-controls.ts';
import {createArsenalGalleryChrome} from './gallery-chrome.ts';
import {mountGlockArsenalGallery} from './glock-gallery.ts';
import {openArsenalWorkbench} from './workbench-screen.ts';
import {type ArsenalSavedBuild,loadArsenalBuildLibrary,persistArsenalBuildLibrary,
 renameSavedArsenalBuild,deleteSavedArsenalBuild,duplicateSavedArsenalBuild}
 from './saved-builds.ts';

const root=document.getElementById('arsenalRoot');
if(!root)throw new Error('Missing Arsenal root');
const shell=document.createElement('div');shell.className='arsenal-shell';
const heading=document.createElement('header');heading.className='arsenal-top';
const brand=document.createElement('div');brand.className='brand';
const kicker=document.createElement('span');kicker.className='arsenal-overline';kicker.textContent='FIELDWORK / BREACH';
const title=document.createElement('h1');title.textContent='ARSENAL';brand.append(kicker,title);
const exit=document.createElement('a');exit.href='./index.html';exit.className='arsenal-back';exit.textContent='BACK TO BREACH';
heading.append(brand,exit);
const {layout,heroCopy,heroMedia,heroPlatform,heroTitle,openWorkbench,
 savedControls,search,filters,count,grid}=createArsenalGalleryChrome('primary');
openWorkbench.addEventListener('click',()=>{
 const ref=selectedSaved??ARSENAL_REFERENCES.find(r=>r.id===selectedId);
 if(ref)openArsenalWorkbench(ref,id=>refreshLibrary(id));
});
const {rename,duplicate,remove}=createArsenalSavedActionButtons();
savedControls.append(rename,duplicate,remove);savedControls.hidden=true;
 const renameBox=document.createElement('div');renameBox.className='arsenal-rename-box';renameBox.hidden=true;
 const renameInput=document.createElement('input');renameInput.type='text';renameInput.maxLength=32;
 renameInput.setAttribute('aria-label','New saved build name');
 const renameSave=document.createElement('button');renameSave.type='button';renameSave.textContent='SAVE NAME';
 const renameCancel=document.createElement('button');renameCancel.type='button';renameCancel.textContent='CANCEL';
 renameBox.append(renameInput,renameSave,renameCancel);
 const savedFeedback=document.createElement('p');savedFeedback.className='arsenal-saved-feedback';
 savedFeedback.setAttribute('role','status');
heroCopy.append(renameBox,savedFeedback);
const categoryNav=document.createElement('nav');
categoryNav.className='arsenal-weapon-categories';
categoryNav.setAttribute('aria-label','Arsenal weapon categories');
const primaryTab=document.createElement('button');
primaryTab.type='button';primaryTab.textContent='PRIMARY WEAPONS';
const secondaryTab=document.createElement('button');
secondaryTab.type='button';secondaryTab.textContent='SECONDARIES · GLOCK';
categoryNav.append(primaryTab,secondaryTab);
const secondaryGallery=mountGlockArsenalGallery();
const glockGallery=secondaryGallery.section;
const showCategory=(category:'primary'|'secondary')=>{
 const secondary=category==='secondary';
 layout.hidden=secondary;glockGallery.hidden=!secondary;
 primaryTab.setAttribute('aria-pressed',String(!secondary));
 secondaryTab.setAttribute('aria-pressed',String(secondary));
 if(secondary)secondaryGallery.activate();
};
primaryTab.addEventListener('click',()=>showCategory('primary'));
secondaryTab.addEventListener('click',()=>showCategory('secondary'));
shell.append(heading,categoryNav,layout,glockGallery);root.append(shell);
showCategory('primary');

let activePlatform:ArsenalPlatformId|'all'|'saved'='all';
let selectedId='ar-m4a1';
let selectedSaved:ArsenalSavedBuild|null=null;
const thumbnails=new ArsenalThumbnailer();
const previewQueue=createArsenalPreviewQueue();
const enqueuePreview=(host:HTMLElement,task:()=>void,hero=false)=>
 previewQueue.enqueue(host,task,hero);
const recipes=new Map<string,ArsenalRecipeV2>();
function recipeFor(ref:ArsenalReference):ArsenalRecipeV2|undefined{
 const existing=recipes.get(ref.id);if(existing)return existing;
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
 const recipe=arsenalRecipeFromLegacy(config);
 if(recipe)recipes.set(ref.id,recipe);
 return recipe;
}
function platformName(id:ArsenalPlatformId):string{
 return ARSENAL_PLATFORMS.find(p=>p.id===id)?.name??id;
}
function attachImage(host:HTMLElement,ref:ArsenalReference|ArsenalSavedBuild,size:'hero'|'card'){
 const recipe='recipe' in ref?ref.recipe:recipeFor(ref);if(!recipe)return;
 const image=document.createElement('img');image.alt='';
 const placeholder=document.createElement('span');
 placeholder.className='arsenal-hero-placeholder';placeholder.textContent=ref.name;
 host.replaceChildren(placeholder);
 enqueuePreview(host,()=>{
  const source=thumbnails.render(recipe,size);
  if(!source)return;
  image.src=source;host.replaceChildren(image);
 },size==='hero');
}
function showSelected(ref:ArsenalReference|ArsenalSavedBuild){
 selectedId=ref.id;selectedSaved='recipe' in ref?ref:null;
 heroPlatform.textContent=platformName('recipe' in ref?ref.recipe.platformId:ref.platformId);
 heroTitle.textContent=ref.name;attachImage(heroMedia,ref,'hero');
 savedControls.hidden=!selectedSaved;renameBox.hidden=true;savedFeedback.textContent='';
 for(const button of grid.querySelectorAll<HTMLButtonElement>('[data-arsenal-reference]'))
  button.setAttribute('aria-pressed',String(button.dataset.arsenalReference===ref.id));
}
function renderFilters(){
 const tabs:{id:ArsenalPlatformId|'all'|'saved';name:string}[]=[
  {id:'all',name:'All'},...ARSENAL_PLATFORMS,
  {id:'saved',name:'Saved · '+loadArsenalBuildLibrary().builds.length}];
 renderArsenalFilterButtons(filters,tabs,activePlatform,id=>{
  activePlatform=id;
  renderFilters();renderCards();
 });
}
let observer:IntersectionObserver|null=null;
function renderCards(){
 observer?.disconnect();observer=null;
 grid.replaceChildren();
 // Filter changes detach the previous tiles. Prune their expensive pending
 // 3D renders immediately; otherwise they occupy one RAF slot each and make
 // the new visible thumbnails appear several frames late.
 previewQueue.pruneDetached();
 const term=search.value.trim().toLowerCase();
 const saved=loadArsenalBuildLibrary().builds;
 const visible:(ArsenalReference|ArsenalSavedBuild)[]=activePlatform==='saved'?
  saved.filter(ref=>!term||ref.name.toLowerCase().includes(term)||
   platformName(ref.recipe.platformId).toLowerCase().includes(term)):
  ARSENAL_REFERENCES.filter(ref=>
   (activePlatform==='all'||ref.platformId===activePlatform)&&
   (!term||ref.name.toLowerCase().includes(term)||
    platformName(ref.platformId).toLowerCase().includes(term)));
 count.textContent=visible.length+
  (activePlatform==='saved'?' SAVED BUILDS':' FACTORY CONFIGURATIONS');
 if(!visible.length){
  const empty=document.createElement('p');empty.className='arsenal-empty';
  empty.textContent='No matching weapons. Try another model or platform.';
  grid.append(empty);return;
 }
 if('IntersectionObserver' in window){
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    observer?.unobserve(entry.target);
    const element=entry.target as HTMLElement;
    const ref=saved.find(r=>r.id===element.dataset.referencePreview)??
     ARSENAL_REFERENCES.find(r=>r.id===element.dataset.referencePreview);
    if(ref)attachImage(element,ref,'card');
   }
  },{rootMargin:'100px'});
 }
 for(const ref of visible){
  const card=document.createElement('button');card.type='button';
  card.className='arsenal-card';card.dataset.arsenalReference=ref.id;
  card.setAttribute('aria-pressed',String(selectedId===ref.id));
  card.setAttribute('aria-label','Select '+ref.name);
  const photo=document.createElement('div');photo.className='arsenal-card-preview';
  photo.dataset.referencePreview=ref.id;
  const model=document.createElement('strong');model.className='model';model.textContent=ref.name;
  const platform=document.createElement('span');platform.className='platform';
  platform.textContent=platformName('recipe' in ref?ref.recipe.platformId:ref.platformId);
  card.append(photo,model,platform);
  card.addEventListener('click',()=>showSelected(ref));
  grid.append(card);
  if(observer)observer.observe(photo);else attachImage(photo,ref,'card');
 }
}
function refreshLibrary(id?:string){
 activePlatform='saved';renderFilters();renderCards();
 const saves=loadArsenalBuildLibrary().builds;
 const selected=saves.find(x=>x.id===id)??saves[saves.length-1];
 if(selected)showSelected(selected);
 else{selectedSaved=null;savedControls.hidden=true;renameBox.hidden=true;}
}
rename.addEventListener('click',()=>{
 if(!selectedSaved)return;
 renameInput.value=selectedSaved.name;renameBox.hidden=false;renameInput.focus();
});
renameCancel.addEventListener('click',()=>{renameBox.hidden=true;});
renameSave.addEventListener('click',()=>{
 if(!selectedSaved)return;
 const updated=renameSavedArsenalBuild(loadArsenalBuildLibrary(),selectedSaved.id,renameInput.value);
 if(!updated){savedFeedback.textContent='Enter a valid name';return;}
 if(!persistArsenalBuildLibrary(updated)){
  savedFeedback.textContent='Storage unavailable; name not changed';return;
 }
 refreshLibrary(selectedSaved.id);
});
duplicate.addEventListener('click',()=>{
 if(!selectedSaved)return;
 const copy=duplicateSavedArsenalBuild(loadArsenalBuildLibrary(),selectedSaved.id);
 if(!copy){savedFeedback.textContent='Saved-build limit reached';return;}
 if(!persistArsenalBuildLibrary(copy.library)){
  savedFeedback.textContent='Storage unavailable; build not duplicated';return;
 }
 refreshLibrary(copy.build.id);
});
remove.addEventListener('click',()=>{
 if(!selectedSaved||!window.confirm('Delete the saved build "'+selectedSaved.name+'"?'))return;
 const after=deleteSavedArsenalBuild(loadArsenalBuildLibrary(),selectedSaved.id);
 if(!persistArsenalBuildLibrary(after)){
  savedFeedback.textContent='Storage unavailable; build not deleted';return;
 }
 refreshLibrary();
});

search.addEventListener('input',renderCards);
renderFilters();renderCards();
const first=ARSENAL_REFERENCES.find(ref=>ref.id===selectedId)??ARSENAL_REFERENCES[0];
if(first)showSelected(first);
window.addEventListener('pagehide',()=>{observer?.disconnect();previewQueue.dispose();thumbnails.dispose()},{once:true});
