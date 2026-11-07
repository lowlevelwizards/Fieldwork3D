/** Arsenal 2.0 Stage 5 — unified, reversible part editing.
 * Standalone inspection/draft context. No Campaign or Quick Play writes.
 */
import {ARSENAL_CATEGORIES,arsenalPart,arsenalPartsForSlot,
 type ArsenalCategory,type ArsenalSlot,type ArsenalReference}
 from './catalog.ts';
import {FAMILY_PARTS,type FamilyPartSlot} from '../equipment-weapon-families.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe,type ArsenalAccessorySlot} from './recipes.ts';
import {type ArsenalSavedBuild,loadArsenalBuildLibrary,persistArsenalBuildLibrary,
 createSavedArsenalBuild,overwriteSavedArsenalBuild} from './saved-builds.ts';
import {proposeArsenalPartChange,arsenalReferenceIdentity,
 type ArsenalEditProposal} from './compatibility.ts';
import {createArsenalDraft,commitArsenalProposal,undoArsenalDraft,redoArsenalDraft,
 arsenalDraftDirty} from './editor-state.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {ArsenalViewport} from './viewport.ts';

const BODY_SLOTS:readonly FamilyPartSlot[]=
 ['receiver','barrel','handguard','stock','grip','magazine'];
function formatSlot(slot:ArsenalSlot):string{
 return slot==='opticMount'?'Mount':slot==='foregrip'?'Foregrip':
  slot==='handguard'?'Handguard':slot.charAt(0).toUpperCase()+slot.slice(1);
}
export function openArsenalWorkbench(
 source:ArsenalReference|ArsenalSavedBuild,
 onLibraryChange?:(savedId:string)=>void
):void{
 const loadedRecipe='recipe' in source?readArsenalRecipe(source.recipe):
  arsenalRecipeFromLegacy(selectWeaponFamilyPreset(
   initialWeaponConfiguration(source.legacy.weapon),source.id));
 if(!loadedRecipe)return;
 let draft=createArsenalDraft(loadedRecipe);
 let savedId:string|null='recipe' in source?source.id:null;
 let activeCategory:ArsenalCategory=ARSENAL_CATEGORIES[0];
 let activeSlot:ArsenalSlot='receiver';
 let showIncompatible=false;
 let pending:ArsenalEditProposal|null=null;
 const overlay=document.createElement('section');overlay.className='arsenal-wb-screen';
 overlay.setAttribute('aria-label','Weapon workbench');
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 const head=document.createElement('header');head.className='arsenal-wb-head';
 const back=document.createElement('button');back.className='arsenal-wb-action';
 back.type='button';back.textContent='BACK TO ARSENAL';
 const identity=document.createElement('div');identity.className='arsenal-wb-identity';
 const kicker=document.createElement('span');kicker.className='arsenal-overline';
 kicker.textContent='WEAPON WORKBENCH';
 const title=document.createElement('h2');
 const dirtyStatus=document.createElement('small');dirtyStatus.className='arsenal-wb-dirty';
 const saveFeedback=document.createElement('small');
 saveFeedback.className='arsenal-wb-save-feedback';saveFeedback.setAttribute('role','status');
 identity.append(kicker,title,dirtyStatus,saveFeedback);
 const actions=document.createElement('div');actions.className='arsenal-wb-actions';
 const undo=document.createElement('button');undo.type='button';undo.className='arsenal-wb-action';undo.textContent='UNDO';
 const redo=document.createElement('button');redo.type='button';redo.className='arsenal-wb-action';redo.textContent='REDO';
 const fit=document.createElement('button');fit.type='button';fit.className='arsenal-wb-action';fit.textContent='FIT';
 const side=document.createElement('button');side.type='button';side.className='arsenal-wb-action';side.textContent='SIDE';
 const save=document.createElement('button');save.type='button';
 save.className='arsenal-wb-action arsenal-wb-save';save.textContent='SAVE BUILD';
 const saveCopy=document.createElement('button');saveCopy.type='button';
 saveCopy.className='arsenal-wb-action';saveCopy.textContent='SAVE COPY';
 actions.append(undo,redo,save,saveCopy,fit,side);head.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const viewportHost=document.createElement('div');viewportHost.className='arsenal-wb-viewport';
 const nav=document.createElement('nav');nav.className='arsenal-wb-nav';
 nav.setAttribute('aria-label','Weapon component categories');
 const panel=document.createElement('section');panel.className='arsenal-wb-panel';
 const panelTitle=document.createElement('h3');
 const slotRow=document.createElement('div');slotRow.className='arsenal-wb-slots';
 const activeLabel=document.createElement('p');activeLabel.className='arsenal-wb-current';
 const optionsHeader=document.createElement('div');optionsHeader.className='arsenal-wb-options-head';
 const optionsLabel=document.createElement('strong');optionsLabel.textContent='COMPATIBLE PARTS';
 const showAll=document.createElement('button');showAll.type='button';showAll.className='arsenal-wb-show-all';
 showAll.textContent='SHOW ALL';
 optionsHeader.append(optionsLabel,showAll);
 const choiceList=document.createElement('div');choiceList.className='arsenal-wb-option-list';
 const pendingHost=document.createElement('div');pendingHost.className='arsenal-wb-pending-host';
 const hint=document.createElement('p');hint.className='arsenal-wb-hint';
 hint.textContent='Edits are a reversible preview. Nothing is purchased or equipped from this standalone Arsenal.';
 panel.append(panelTitle,slotRow,activeLabel,optionsHeader,choiceList,pendingHost,hint);
 main.append(viewportHost,nav,panel);
 overlay.append(head,main);document.body.append(overlay);
 const viewer=new ArsenalViewport(viewportHost,draft.working,slot=>{
  const category=ARSENAL_CATEGORIES.find(c=>c.slots.includes(slot));
  if(category){activeCategory=category;activeSlot=slot;pending=null;renderSelection();}
 });
 function currentPartId(slot:ArsenalSlot):string{
  return BODY_SLOTS.includes(slot as FamilyPartSlot)?
   draft.working.parts[slot as FamilyPartSlot]:
   draft.working.accessories[slot as ArsenalAccessorySlot];
 }
 function renderPending(){
  pendingHost.replaceChildren();
  if(!pending||!pending.nextRecipe)return;
  const box=document.createElement('div');box.className='arsenal-wb-pending';
  const label=document.createElement('strong');label.textContent='REQUIRED CHANGES';
  const desc=document.createElement('p');
  desc.textContent=pending.changes.map(change=>
   formatSlot(change.slot)+': '+(arsenalPart(change.from)?.name??change.from)+
   ' → '+(arsenalPart(change.to)?.name??change.to)).join(' · ');
  const buttons=document.createElement('div');buttons.className='arsenal-wb-pending-actions';
  const confirm=document.createElement('button');confirm.type='button';
  confirm.className='arsenal-wb-accept';confirm.textContent='APPLY CHANGES';
  const cancel=document.createElement('button');cancel.type='button';
  cancel.className='arsenal-wb-action';cancel.textContent='CANCEL';
  const proposal=pending;
  confirm.addEventListener('click',()=>{
   draft=commitArsenalProposal(draft,proposal,true);
   pending=null;viewer.setRecipe(draft.working);renderSelection();
  });
  cancel.addEventListener('click',()=>{pending=null;renderPending();});
  buttons.append(confirm,cancel);box.append(label,desc,buttons);pendingHost.append(box);
 }
 function renderChoices(){
  choiceList.replaceChildren();
  const receiver=FAMILY_PARTS[draft.working.parts.receiver];
  let displayed=0;
  for(const part of arsenalPartsForSlot(activeSlot)){
   if(part.kind==='family'&&FAMILY_PARTS[part.id]?.family!==receiver.family)
    continue;
   const proposal=proposeArsenalPartChange(draft.working,activeSlot,part.id);
   const equipped=currentPartId(activeSlot)===part.id;
   if(!equipped&&!proposal.valid&&!showIncompatible)continue;
   const option=document.createElement('button');option.type='button';
   option.className='arsenal-wb-option';option.disabled=!proposal.valid;
   option.setAttribute('aria-pressed',String(equipped));
   option.title=part.detail;
   const name=document.createElement('strong');name.textContent=part.name;
   const status=document.createElement('small');
   status.textContent=equipped?'EQUIPPED':
    !proposal.valid?proposal.reasons.join(' · '):
    proposal.requiresConfirmation?'REQUIRES CHANGES':'FITS';
   option.append(name,status);
   if(proposal.valid&&!equipped)option.addEventListener('click',()=>{
    pending=null;
    if(proposal.requiresConfirmation){
     pending=proposal;renderPending();return;
    }
    draft=commitArsenalProposal(draft,proposal);
    viewer.setRecipe(draft.working);renderSelection();
   });
   choiceList.append(option);displayed++;
  }
  if(!displayed){
   const empty=document.createElement('p');empty.className='arsenal-wb-hint';
   empty.textContent='No compatible alternatives for this component.';
   choiceList.append(empty);
  }
 }
 function renderSelection(){
  nav.replaceChildren();
  for(const category of ARSENAL_CATEGORIES){
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-wb-category';button.textContent=category.name;
   button.setAttribute('aria-pressed',String(activeCategory.id===category.id));
   button.addEventListener('click',()=>{
    activeCategory=category;activeSlot=category.slots[0];pending=null;
    renderSelection();
   });nav.append(button);
  }
  panelTitle.textContent=activeCategory.name.toUpperCase();
  slotRow.replaceChildren();
  if(activeCategory.slots.length>1)for(const slot of activeCategory.slots){
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-wb-subslot';button.textContent=formatSlot(slot);
   button.setAttribute('aria-pressed',String(activeSlot===slot));
   button.addEventListener('click',()=>{
    activeSlot=slot;pending=null;renderSelection();
   });slotRow.append(button);
  }
  activeLabel.textContent='CURRENT · '+
   (arsenalPart(currentPartId(activeSlot))?.name??currentPartId(activeSlot));
  title.textContent=arsenalReferenceIdentity(draft.working).name;
  dirtyStatus.textContent=arsenalDraftDirty(draft)?'UNSAVED CHANGES':
   savedId?'SAVED BUILD':'FACTORY CONFIGURATION';
  save.textContent=savedId?'SAVE':'SAVE BUILD';
  saveCopy.hidden=!savedId;
  undo.disabled=draft.undo.length===0;redo.disabled=draft.redo.length===0;
  showAll.textContent=showIncompatible?'HIDE INCOMPATIBLE':'SHOW ALL';
  viewer.setSelectedSlot(activeSlot);
  renderChoices();renderPending();
 }
 const saveDialog=document.createElement('dialog');saveDialog.className='arsenal-wb-save-dialog';
 const saveHeading=document.createElement('h3');saveHeading.textContent='SAVE WEAPON BUILD';
 const saveLabel=document.createElement('label');saveLabel.textContent='BUILD NAME';
 const saveName=document.createElement('input');saveName.type='text';saveName.maxLength=32;
 saveName.autocomplete='off';saveName.setAttribute('aria-label','Build name');
 const saveActions=document.createElement('div');saveActions.className='arsenal-wb-save-actions';
 const saveConfirm=document.createElement('button');saveConfirm.type='button';
 saveConfirm.className='arsenal-wb-accept';saveConfirm.textContent='SAVE';
 const saveCancel=document.createElement('button');saveCancel.type='button';
 saveCancel.className='arsenal-wb-action';saveCancel.textContent='CANCEL';
 saveActions.append(saveConfirm,saveCancel);
 saveLabel.append(saveName);
 saveDialog.append(saveHeading,saveLabel,saveActions);overlay.append(saveDialog);
 const defaultName=()=>arsenalReferenceIdentity(draft.working).name
  .replace(/ · (Modified|Custom)$/,'')+' Build';
 const openSaveDialog=(name:string)=>{
  saveFeedback.textContent='';saveName.value=name.slice(0,32);
  saveDialog.showModal();saveName.focus();saveName.select();
 };
 const saveNew=()=>{
  const lib=loadArsenalBuildLibrary();
  const result=createSavedArsenalBuild(lib,draft.working,saveName.value);
  if(!result){saveFeedback.textContent='Name required or saved-build limit reached';return;}
  if(!persistArsenalBuildLibrary(result.library)){
   saveFeedback.textContent='Storage unavailable; the build was not saved';return;
  }
  savedId=result.build.id;draft=createArsenalDraft(draft.working);
  saveDialog.close();renderSelection();
  saveFeedback.textContent='SAVED · '+result.build.name;
  onLibraryChange?.(savedId);
 };
 saveConfirm.addEventListener('click',saveNew);
 saveCancel.addEventListener('click',()=>saveDialog.close());
 saveName.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveNew();}});
 save.addEventListener('click',()=>{
  if(!savedId){openSaveDialog(defaultName());return;}
  const lib=loadArsenalBuildLibrary();
  const next=overwriteSavedArsenalBuild(lib,savedId,draft.working);
  if(!next){saveFeedback.textContent='Saved build not found; use Save Copy';return;}
  if(!persistArsenalBuildLibrary(next)){
   saveFeedback.textContent='Storage unavailable; the build was not saved';return;
  }
  draft=createArsenalDraft(draft.working);renderSelection();
  saveFeedback.textContent='BUILD SAVED';onLibraryChange?.(savedId);
 });
 saveCopy.addEventListener('click',()=>{
  const current=loadArsenalBuildLibrary().builds.find(x=>x.id===savedId);
  openSaveDialog((current?.name??defaultName())+' Copy');
 });
 renderSelection();
 fit.addEventListener('click',()=>viewer.fit());
 side.addEventListener('click',()=>viewer.sideView());
 showAll.addEventListener('click',()=>{
  showIncompatible=!showIncompatible;pending=null;renderSelection();
 });
 undo.addEventListener('click',()=>{
  draft=undoArsenalDraft(draft);pending=null;
  viewer.setRecipe(draft.working);renderSelection();
 });
 redo.addEventListener('click',()=>{
  draft=redoArsenalDraft(draft);pending=null;
  viewer.setRecipe(draft.working);renderSelection();
 });
 const close=()=>{
  if(saveDialog.open){saveDialog.close();return;}
  if(arsenalDraftDirty(draft)&&
   !window.confirm('Discard unsaved changes to this weapon draft?'))return;
  viewer.dispose();overlay.remove();window.removeEventListener('keydown',keys);
  document.body.style.removeProperty('overflow');
 };
 const keys=(e:KeyboardEvent)=>{
  if(e.key!=='Escape')return;
  e.preventDefault();
  if(saveDialog.open)saveDialog.close();
  else if(pending){pending=null;renderPending();}
  else close();
 };
 back.addEventListener('click',close);
 window.addEventListener('keydown',keys);
 document.body.style.overflow='hidden';
 back.focus();
}
