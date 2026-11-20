/** Secondary full-screen Workbench: real 3D, reversible model/carry edits,
 * vetted saved presets, and explicit GO-time kit application.
 * No invented compatibility sockets, ammunition, recoil or gameplay guns.
 */
import {GLOCK_APPEARANCE_REFERENCES}
 from '../weapons/geometry/glock-family-silhouettes.ts';
import {SECONDARY_CAPACITY,SECONDARY_MASS_KG,type SecondaryMagazineLocation}
 from '../secondary-equipment.ts';
import {GlockViewport} from './glock-viewport.ts';
import {loadGlockLibrary,saveGlockLibrary,
 createGlockSavedBuild,type GlockRecipe,type GlockSavedBuild}
 from './glock-saved-builds.ts';
export type GlockWorkbenchContext=Readonly<{
 operatorName:string;
 onApply:(recipe:GlockRecipe)=>{ok:boolean;message:string};
 onLibraryChange?:()=>void;
}>;
const action=(label:string,cls='arsenal-wb-action')=>{
 const b=document.createElement('button');b.type='button';
 b.className=cls;b.textContent=label;return b;
};
const CARRY_PLACES:readonly (readonly [SecondaryMagazineLocation,string])[]=[
 ['rig','CHEST RIG'],['belt','BELT'],['pocket','POCKET'],
 ['backpack','BACKPACK'],['overflow','OVERFLOW']
];
export function openGlockWorkbench(start:GlockRecipe,context:GlockWorkbenchContext){
 const original=start;
 let working=start;
 const undoStack:GlockRecipe[]=[],redoStack:GlockRecipe[]=[];
 let clay=false;
 let panel:'models'|'carry'|'saved'='models';
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
 const applyButton=action('EQUIP TO '+context.operatorName.toUpperCase(),
  'arsenal-wb-action arsenal-wb-apply');
 primary.append(modelButton,loadButton,saveButton,applyButton);
 const utility=document.createElement('div');utility.className='arsenal-wb-utility-actions';
 const undoButton=action('UNDO'),redoButton=action('REDO');
 const fitButton=action('FIT'),sideButton=action('SIDE');
 const oppositeButton=action('OPPOSITE'),clayButton=action('CLAY');
 utility.append(undoButton,redoButton,fitButton,sideButton,oppositeButton,clayButton);
 actions.append(primary,utility);head.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const stage=document.createElement('div');stage.className='arsenal-wb-stage';
 const viewportHost=document.createElement('div');
 viewportHost.className='arsenal-wb-viewport glock-wb-viewport';
 const stats=document.createElement('section');stats.className='arsenal-wb-stats';
 stats.setAttribute('aria-label','Real sidearm capacity and unloaded mass');
 const statsHeader=document.createElement('strong');statsHeader.textContent='WEAPON SPECIFICATIONS';
 const statsLine=document.createElement('div');statsLine.className='glock-wb-stats';
 stats.append(statsHeader,statsLine);stage.append(viewportHost,stats);
 const tabs=document.createElement('nav');tabs.className='arsenal-wb-nav glock-wb-tabs';
 tabs.setAttribute('aria-label','Secondary Workbench sections');
 const modelTab=action('MODEL'),carryTab=action('CARRY'),savedTab=action('SAVED BUILDS');
 tabs.append(modelTab,carryTab,savedTab);
 const choices=document.createElement('section');choices.className='arsenal-wb-panel glock-wb-panel';
 const subtitle=document.createElement('h3');const grid=document.createElement('div');
 grid.className='glock-wb-options';
 const editBar=document.createElement('div');editBar.className='glock-wb-save-entry';
 editBar.hidden=true;
 const nameInput=document.createElement('input');nameInput.type='text';
 nameInput.maxLength=32;nameInput.placeholder='Build name';
 nameInput.setAttribute('aria-label','Secondary saved build name');
 const confirmSave=action('SAVE NAME'),cancelSave=action('CANCEL');
 editBar.append(nameInput,confirmSave,cancelSave);
 const footer=document.createElement('p');footer.className='glock-wb-note';
 footer.textContent='Factory geometry and honest carry positions. No live pistol firing or unsupported attachments are implied.';
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
 carryTab.addEventListener('click',()=>setPanel('carry'));
 savedTab.addEventListener('click',()=>setPanel('saved'));
 fitButton.addEventListener('click',()=>viewport.reset());
 sideButton.addEventListener('click',()=>viewport.side());
 oppositeButton.addEventListener('click',()=>viewport.opposite());
 clayButton.addEventListener('click',()=>{
  clay=!clay;viewport.setModel(working.model,clay);
  clayButton.setAttribute('aria-pressed',String(clay));
 });
 undoButton.addEventListener('click',()=>{
  const prior=undoStack.pop();if(!prior)return;
  redoStack.push(working);working=prior;update();
 });
 redoButton.addEventListener('click',()=>{
  const next=redoStack.pop();if(!next)return;
  undoStack.push(working);working=next;update();
 });
 applyButton.addEventListener('click',()=>{
  const result=context.onApply(working);
  status.textContent=result.message;
  if(result.ok){dirty.textContent='EQUIPPED TO '+context.operatorName.toUpperCase();
   context.onLibraryChange?.();}
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
  const b=action(label,'glock-wb-choice');
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
  for(const [btn,id] of [[modelTab,'models'],[carryTab,'carry'],[savedTab,'saved']] as const)
   btn.setAttribute('aria-pressed',String(panel===id));
  viewport.setModel(working.model,clay);
  statsLine.textContent='CAPACITY '+SECONDARY_CAPACITY[working.model]+' ROUNDS / MAG'+
   ' · UNLOADED '+SECONDARY_MASS_KG[working.model].toFixed(2)+' KG'+
   ' · '+working.spares.length+' SPARE PLACEMENTS';
  grid.replaceChildren();
  if(panel==='models'){
   subtitle.textContent='FACTORY MODELS';
   for(const model of GLOCK_APPEARANCE_REFERENCES){
    createChoice(model.name,model.id===working.model,()=>{
     put({...working,model:model.id});
    },model.description);
   }
  }else if(panel==='carry'){
   subtitle.textContent='HOLSTER & MAGAZINES';
   for(const [side,label] of [['belt-left','LEFT HIP'],['belt-right','RIGHT HIP']] as const)
    createChoice(label,working.holster===side,()=>{
     put({...working,holster:side});
    });
   for(let i=0;i<working.spares.length;i++){
    const row=document.createElement('label');
    row.className='glock-wb-location';
    row.textContent='SPARE '+(i+1);
    const select=document.createElement('select');
    select.setAttribute('aria-label','Spare '+(i+1)+' location');
    for(const [id,label] of CARRY_PLACES){
     const option=document.createElement('option');
     option.value=id;option.textContent=label;select.append(option);
    }
    select.value=working.spares[i];
    select.addEventListener('change',()=>{
     const spares=[...working.spares];
     spares[i]=select.value as SecondaryMagazineLocation;
     put({...working,spares});
    });
    row.append(select);grid.append(row);
   }
   const description=document.createElement('p');
   description.className='glock-wb-description';
   description.textContent='Carrier limits are checked against the selected operator when you equip; no ammunition or additional magazines are created by saved builds.';
   grid.append(description);
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
