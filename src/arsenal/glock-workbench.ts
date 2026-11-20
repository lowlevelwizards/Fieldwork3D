/** Secondary Arsenal Workbench: real 3D, reversible weapon edits and saved builds.
 * Loadout placement and equipping belong to the shared equipment screen.
 * No invented compatibility sockets, ammunition, recoil or gameplay guns.
 */
import {GLOCK_APPEARANCE_REFERENCES}
 from '../weapons/geometry/glock-family-silhouettes.ts';
import {SECONDARY_CAPACITY,SECONDARY_MASS_KG}
 from '../secondary-equipment.ts';
import {GlockViewport} from './glock-viewport.ts';
import {glockHasAccessoryRail,glockHasOpticMount,
 glockAccessoryMassKg,normalizeGlockCustomization}
 from '../weapons/geometry/glock-customization.ts';
import {loadGlockLibrary,saveGlockLibrary,
 createGlockSavedBuild,type GlockRecipe,type GlockSavedBuild}
 from './glock-saved-builds.ts';
export type GlockWorkbenchContext=Readonly<{onLibraryChange?:()=>void}>;
const action=(label:string,cls='arsenal-wb-action')=>{
 const b=document.createElement('button');b.type='button';
 b.className=cls;b.textContent=label;return b;
};
export function openGlockWorkbench(start:GlockRecipe,context:GlockWorkbenchContext){
 const original=start;
 let working=start;
 const undoStack:GlockRecipe[]=[],redoStack:GlockRecipe[]=[];
 type WorkPanel='models'|'sights'|'accessories'|'finish'|'saved';
 let panel:WorkPanel='models';
 const activeBefore=document.activeElement as HTMLElement|null;
 const oldOverflow=document.body.style.overflow;
 const overlay=document.createElement('section');
 overlay.className='arsenal-wb-screen arsenal-glock-workbench';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Secondary weapon workbench');
 const head=document.createElement('header');head.className='arsenal-wb-head';
 const back=action('BACK TO ARSENAL');back.classList.add('arsenal-wb-back');
 const identity=document.createElement('div');identity.className='arsenal-wb-identity';
 const kicker=document.createElement('span');kicker.className='arsenal-overline';
 kicker.textContent='SECONDARY WEAPON WORKBENCH';
 const title=document.createElement('h2');
 const dirty=document.createElement('small');dirty.className='arsenal-wb-dirty';
 const status=document.createElement('small');
 status.className='arsenal-wb-save-feedback';status.setAttribute('role','status');
 identity.append(kicker,title,dirty,status);
 const actions=document.createElement('div');actions.className='arsenal-wb-actions';
 const primary=document.createElement('div');primary.className='arsenal-wb-primary-actions';
 const modelButton=action('CHOOSE MODEL');
 const loadButton=action('LOAD BUILD');
 const saveButton=action('SAVE BUILD','arsenal-wb-action arsenal-wb-save');
 primary.append(modelButton,loadButton,saveButton);
 const utility=document.createElement('div');utility.className='arsenal-wb-utility-actions';
 const undoButton=action('UNDO'),redoButton=action('REDO');
 const fitButton=action('FIT');
 utility.append(undoButton,redoButton,fitButton);
 actions.append(primary,utility);head.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const stage=document.createElement('div');stage.className='arsenal-wb-stage';
 const viewportHost=document.createElement('div');
 viewportHost.className='arsenal-wb-viewport glock-wb-viewport';
 const stats=document.createElement('section');stats.className='arsenal-wb-stats';
 stats.setAttribute('aria-label','Real sidearm capacity and unloaded mass');
 const statsHead=document.createElement('div');statsHead.className='arsenal-wb-stats-head';
 const statsHeader=document.createElement('strong');statsHeader.textContent='WEAPON SPECIFICATIONS';
 const statsToggle=action('SHOW STATS','arsenal-wb-stats-toggle');
 const narrowStats=window.matchMedia('(max-width:760px)').matches;
 stats.classList.toggle('is-collapsed',narrowStats);
 statsToggle.setAttribute('aria-expanded',String(!narrowStats));
 statsToggle.textContent=narrowStats?'SHOW STATS':'HIDE STATS';
 statsToggle.addEventListener('click',()=>{
  const collapsed=stats.classList.toggle('is-collapsed');
  statsToggle.setAttribute('aria-expanded',String(!collapsed));
  statsToggle.textContent=collapsed?'SHOW STATS':'HIDE STATS';
 });
 statsHead.append(statsHeader,statsToggle);
 const statsLine=document.createElement('div');
 statsLine.className='arsenal-wb-stats-grid glock-wb-stats-grid';
 statsLine.id='glock-wb-specifications';
 statsToggle.setAttribute('aria-controls',statsLine.id);
 stats.append(statsHead,statsLine);stage.append(viewportHost,stats);
 const tabs=document.createElement('nav');tabs.className='arsenal-wb-nav glock-wb-tabs';
 tabs.setAttribute('aria-label','Secondary Workbench sections');
 const modelTab=action('MODEL','arsenal-wb-category'),
  sightsTab=action('SIGHTS','arsenal-wb-category');
 const accessoriesTab=action('ACCESSORIES','arsenal-wb-category'),
  finishTab=action('FINISH','arsenal-wb-category');
 const savedTab=action('SAVED BUILDS','arsenal-wb-category');
 tabs.append(modelTab,sightsTab,accessoriesTab,finishTab,savedTab);
 const choices=document.createElement('section');choices.className='arsenal-wb-panel glock-wb-panel';
 const subtitle=document.createElement('h3');const grid=document.createElement('div');
 grid.className='arsenal-wb-option-list glock-wb-options';
 const editBar=document.createElement('div');editBar.className='glock-wb-save-entry';
 editBar.hidden=true;
 const nameInput=document.createElement('input');nameInput.type='text';
 nameInput.maxLength=32;nameInput.placeholder='Build name';
 nameInput.setAttribute('aria-label','Secondary saved build name');
 const confirmSave=action('SAVE NAME'),cancelSave=action('CANCEL');
 editBar.append(nameInput,confirmSave,cancelSave);
 const footer=document.createElement('p');footer.className='glock-wb-note';
 footer.textContent='Factory compatibility and mounted parts are previewed here. Assign sidearms, holsters and spare magazines in Quick Play equipment.';
 choices.append(subtitle,grid,editBar,footer);
 main.append(stage,tabs,choices);
 overlay.append(head,main);
 // Mount before WebGL camera fitting: a detached mobile viewport has zero
 // CSS width and would mistakenly zoom every Glock several steps too far.
 document.body.append(overlay);document.body.style.overflow='hidden';
 const viewport=new GlockViewport(viewportHost,working.model);
 let closed=false;
 const close=()=>{
  if(closed)return;closed=true;
  document.removeEventListener('keydown',onKeys);
  viewport.dispose();overlay.remove();document.body.style.overflow=oldOverflow;
  activeBefore?.focus();
 };
 const onKeys=(event:KeyboardEvent)=>{
  if(event.key==='Escape'){event.preventDefault();close();}
 };
 document.addEventListener('keydown',onKeys);
 back.addEventListener('click',close);
 function put(next:GlockRecipe){
  if(JSON.stringify(next)===JSON.stringify(working))return;
  undoStack.push(working);
  if(undoStack.length>40)undoStack.shift();
  redoStack.length=0;working=next;update();
 }
 function setPanel(next:typeof panel){panel=next;update();}
 modelButton.addEventListener('click',()=>setPanel('models'));
 loadButton.addEventListener('click',()=>setPanel('saved'));
 modelTab.addEventListener('click',()=>setPanel('models'));
 sightsTab.addEventListener('click',()=>setPanel('sights'));
 accessoriesTab.addEventListener('click',()=>setPanel('accessories'));
 finishTab.addEventListener('click',()=>setPanel('finish'));
 savedTab.addEventListener('click',()=>setPanel('saved'));
 fitButton.addEventListener('click',()=>viewport.reset());
 undoButton.addEventListener('click',()=>{
  const prior=undoStack.pop();if(!prior)return;
  redoStack.push(working);working=prior;update();
 });
 redoButton.addEventListener('click',()=>{
  const next=redoStack.pop();if(!next)return;
  undoStack.push(working);working=next;update();
 });
 saveButton.addEventListener('click',()=>{
  editBar.hidden=false;
  nameInput.value=GLOCK_APPEARANCE_REFERENCES.find(x=>x.id===working.model)?.name??'Glock';
  nameInput.focus();nameInput.select();
 });
 cancelSave.addEventListener('click',()=>{editBar.hidden=true;});
 confirmSave.addEventListener('click',()=>{
  const created=createGlockSavedBuild(loadGlockLibrary(),working,nameInput.value);
  if(!created){status.textContent='Enter a name (saved-build limit: 48).';return;}
  if(!saveGlockLibrary(created.library)){
   status.textContent='Storage unavailable; build not saved';return;
  }
  editBar.hidden=true;status.textContent='SAVED · '+created.build.name;
  context.onLibraryChange?.();
 });
 const createChoice=(label:string,selected:boolean,callback:()=>void,detail?:string)=>{
  const b=action(label,'arsenal-wb-option glock-wb-choice');
  b.setAttribute('aria-pressed',String(selected));
  if(detail){const small=document.createElement('small');
   small.textContent=detail;b.append(small);}
  b.addEventListener('click',callback);grid.append(b);
 };
 function applySaved(saved:GlockSavedBuild){
  put(saved.recipe);panel='models';update();
  status.textContent='LOADED · '+saved.name+' · PREVIEW ONLY';
 }
 function update(){
  const ref=GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===working.model)!;
  title.textContent=ref.name;
  dirty.textContent=JSON.stringify(working)===JSON.stringify(original)?
   'FACTORY / ORIGINAL':'UNSAVED CHANGES';
  undoButton.disabled=!undoStack.length;redoButton.disabled=!redoStack.length;
  for(const [btn,id] of [
   [modelTab,'models'],[sightsTab,'sights'],[accessoriesTab,'accessories'],
   [finishTab,'finish'],[savedTab,'saved']] as const)
   btn.setAttribute('aria-pressed',String(panel===id));
  viewport.setModel(working.model,false,working.customization);
  const installedMass=SECONDARY_MASS_KG[working.model]+
   glockAccessoryMassKg(working.customization);
  const baseline=SECONDARY_MASS_KG[original.model]+
   glockAccessoryMassKg(original.customization);
  const delta=installedMass-baseline;
  statsLine.replaceChildren();
  for(const [label,value] of [
   ['CAPACITY',SECONDARY_CAPACITY[working.model]+' ROUNDS / MAG'],
   ['UNLOADED',installedMass.toFixed(2)+' KG'],
   ['MASS Δ',(delta>=0?'+':'')+delta.toFixed(2)+' KG'],
   ['PLATFORM','GLOCK']
  ]){
   const stat=document.createElement('div');stat.className='arsenal-wb-stat';
   const heading=document.createElement('strong');heading.textContent=label;
   const data=document.createElement('span');data.className='arsenal-wb-stat-value';
   data.textContent=value;stat.append(heading,data);statsLine.append(stat);
  }
  grid.replaceChildren();
  if(panel==='models'){
   subtitle.textContent='FACTORY MODELS';
   for(const model of GLOCK_APPEARANCE_REFERENCES){
    createChoice(model.name,model.id===working.model,()=>{
     put({...working,model:model.id,
      customization:normalizeGlockCustomization(model.id,working.customization)});
    },model.description);
   }
  }else if(panel==='sights'){
   subtitle.textContent='SIGHT SYSTEM';
   createChoice('FACTORY IRON SIGHTS',working.customization.optic==='none',
    ()=>put({...working,customization:{...working.customization,optic:'none'}}),
    'Simple, chunky existing iron silhouettes');
   if(glockHasOpticMount(working.model))
    createChoice('MICRO RED DOT',working.customization.optic==='micro',
     ()=>put({...working,customization:{...working.customization,optic:'micro'}}),
     'Real mounted low-poly optic · MOS slide only');
   else{
    const text=document.createElement('p');text.className='glock-wb-description';
    text.textContent='This factory slide is not optic-ready. Choose the Gen 5 MOS for the supported micro optic.';
    grid.append(text);
   }
  }else if(panel==='accessories'){
   subtitle.textContent='RAIL ACCESSORIES';
   createChoice('NO WEAPON LIGHT',working.customization.light==='none',
    ()=>put({...working,customization:{...working.customization,light:'none'}}));
   if(glockHasAccessoryRail(working.model))
    createChoice('COMPACT WEAPON LIGHT',working.customization.light==='compact',
     ()=>put({...working,customization:{...working.customization,light:'compact'}}),
     'Two block under-frame lamp · light-output gameplay pending');
   else{
    const text=document.createElement('p');text.className='glock-wb-description';
    text.textContent='The G26 profile has no compatible accessory rail.';
    grid.append(text);
   }
  }else if(panel==='finish'){
   subtitle.textContent='MATERIAL FINISH';
   for(const [id,name] of [
    ['factory','FACTORY FINISH'],['black','ALL BLACK'],['coyote','COYOTE']
   ] as const)
    createChoice(name,working.customization.finish===id,
     ()=>put({...working,customization:{...working.customization,finish:id}}),
     'Actual slide and polymer palette, not an image filter');
  }else{
   subtitle.textContent='SAVED SECONDARY BUILDS';
   const saved=loadGlockLibrary().builds;
   for(const build of saved){
    createChoice(build.name,false,()=>applySaved(build),
     GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===build.recipe.model)?.name);
   }
   if(!saved.length){const empty=document.createElement('p');
    empty.textContent='No saved Glock builds yet. Use SAVE BUILD above.';
    grid.append(empty);}
  }
 }
 update();back.focus();
}
