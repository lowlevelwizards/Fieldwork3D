/** Stage 3 standalone Arsenal gallery. No live inventory or loadout mutations.
 * Stage 4 will attach the unified full-screen Workbench to this same shell.
 */
import {ARSENAL_PLATFORMS,ARSENAL_REFERENCES,
 type ArsenalPlatformId,type ArsenalReference} from './catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {ArsenalThumbnailer} from './thumbnailer.ts';
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
const layout=document.createElement('div');layout.className='arsenal-layout';
const hero=document.createElement('section');hero.className='arsenal-hero';hero.setAttribute('aria-label','Selected weapon');
const heroMedia=document.createElement('div');heroMedia.className='arsenal-hero-media';
const heroCopy=document.createElement('div');heroCopy.className='arsenal-hero-copy';
const heroPlatform=document.createElement('span');heroPlatform.className='arsenal-overline';
const heroTitle=document.createElement('h2');
const heroHint=document.createElement('p');heroHint.className='hint';
heroHint.textContent='Explore real factory configurations in the full-screen Workbench.';
const openWorkbench=document.createElement('button');openWorkbench.type='button';
openWorkbench.className='arsenal-hero-open';openWorkbench.textContent='OPEN WORKBENCH';
openWorkbench.addEventListener('click',()=>{
 const ref=selectedSaved??ARSENAL_REFERENCES.find(r=>r.id===selectedId);
 if(ref)openArsenalWorkbench(ref,id=>refreshLibrary(id));
});
const savedControls=document.createElement('div');savedControls.className='arsenal-saved-actions';
 const rename=document.createElement('button');rename.type='button';rename.textContent='RENAME';
 const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='DUPLICATE';
 const remove=document.createElement('button');remove.type='button';remove.textContent='DELETE';
 savedControls.append(rename,duplicate,remove);savedControls.hidden=true;
 const renameBox=document.createElement('div');renameBox.className='arsenal-rename-box';renameBox.hidden=true;
 const renameInput=document.createElement('input');renameInput.type='text';renameInput.maxLength=32;
 renameInput.setAttribute('aria-label','New saved build name');
 const renameSave=document.createElement('button');renameSave.type='button';renameSave.textContent='SAVE NAME';
 const renameCancel=document.createElement('button');renameCancel.type='button';renameCancel.textContent='CANCEL';
 renameBox.append(renameInput,renameSave,renameCancel);
 const savedFeedback=document.createElement('p');savedFeedback.className='arsenal-saved-feedback';
 savedFeedback.setAttribute('role','status');
 heroCopy.append(heroPlatform,heroTitle,heroHint,openWorkbench,savedControls,renameBox,savedFeedback);
hero.append(heroMedia,heroCopy);
const browser=document.createElement('section');browser.className='arsenal-browser';
const controls=document.createElement('div');controls.className='arsenal-controls';
const controlHeading=document.createElement('div');
const overline=document.createElement('span');overline.className='arsenal-overline';
overline.textContent='FACTORY REFERENCES';
const subTitle=document.createElement('h2');subTitle.className='arsenal-control-heading';subTitle.textContent='SELECT A WEAPON';
controlHeading.append(overline,subTitle);
const search=document.createElement('input');search.className='arsenal-search';search.type='search';
search.placeholder='Find a model';search.setAttribute('aria-label','Find weapon model');
controls.append(controlHeading,search);
const filters=document.createElement('div');filters.className='arsenal-filters';
filters.setAttribute('role','group');filters.setAttribute('aria-label','Weapon platforms');
const count=document.createElement('p');count.className='arsenal-count';count.setAttribute('aria-live','polite');
const grid=document.createElement('div');grid.className='arsenal-grid';
browser.append(controls,filters,count,grid);layout.append(hero,browser);
shell.append(heading,layout);root.append(shell);

let activePlatform:ArsenalPlatformId|'all'|'saved'='all';
let selectedId='ar-m4a1';
let selectedSaved:ArsenalSavedBuild|null=null;
const thumbnails=new ArsenalThumbnailer();
const previewQueue:(()=>void)[]=[];
let renderScheduled=false;
function enqueuePreview(task:()=>void){
 previewQueue.push(task);
 if(renderScheduled)return;
 renderScheduled=true;
 const pump=()=>{
  const work=previewQueue.shift();if(work)work();
  if(previewQueue.length)requestAnimationFrame(pump);
  else renderScheduled=false;
 };
 requestAnimationFrame(pump);
}
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
 enqueuePreview(()=>{
  if(!host.isConnected)return;
  const source=thumbnails.render(recipe,size);
  if(!source)return;
  image.src=source;host.replaceChildren(image);
 });
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
 filters.replaceChildren();
 const tabs:{id:ArsenalPlatformId|'all'|'saved';name:string}[]=[
  {id:'all',name:'All'},...ARSENAL_PLATFORMS,
  {id:'saved',name:'Saved · '+loadArsenalBuildLibrary().builds.length}];
 for(const item of tabs){
  const button=document.createElement('button');button.type='button';
  button.className='arsenal-filter';button.textContent=item.name;
  button.setAttribute('aria-pressed',String(activePlatform===item.id));
  button.addEventListener('click',()=>{
   activePlatform=item.id;
   renderFilters();renderCards();
  });
  filters.append(button);
 }
}
let observer:IntersectionObserver|null=null;
function renderCards(){
 observer?.disconnect();observer=null;
 grid.replaceChildren();
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
window.addEventListener('pagehide',()=>{observer?.disconnect();thumbnails.dispose()},{once:true});
