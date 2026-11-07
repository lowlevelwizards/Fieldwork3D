/** Arsenal 2.0 Stage 5 — unified, reversible part editing.
 * Standalone inspection/draft context. No Campaign or Quick Play writes.
 */
import {ARSENAL_CATEGORIES,arsenalPart,arsenalPartsForSlot,
 type ArsenalCategory,type ArsenalSlot,type ArsenalReference}
 from './catalog.ts';
import {FAMILY_PARTS,type FamilyPartSlot} from '../equipment-weapon-families.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe,type ArsenalAccessorySlot,
 type ArsenalRecipeV2} from './recipes.ts';
import {type ArsenalSavedBuild,loadArsenalBuildLibrary,persistArsenalBuildLibrary,
 createSavedArsenalBuild,overwriteSavedArsenalBuild} from './saved-builds.ts';
import {proposeArsenalPartChange,arsenalReferenceIdentity,
 type ArsenalEditProposal} from './compatibility.ts';
import {createArsenalDraft,commitArsenalProposal,undoArsenalDraft,redoArsenalDraft,
 arsenalDraftDirty} from './editor-state.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {ArsenalViewport} from './viewport.ts';
import {proposeArsenalRecipeLoad,acceptArsenalRecipeLoad,arsenalRecipeDifferenceLabel,
 type ArsenalRecipeLoadProposal} from './recipe-loading.ts';
import {ARSENAL_PLATFORMS,type ArsenalPlatformId} from './catalog.ts';
import {arsenalFactoryChoices} from './factory-recipes.ts';
import {arsenalFitFeedback} from './fit-feedback.ts';
import {arsenalApplyMessage,type ArsenalApplyQuote} from './apply-guidance.ts';
import {arsenalFinishFamily,arsenalFinishOption,arsenalPhysicalPartId}
 from './finishes.ts';
import './arsenal.css';
/** Game context is an explicit commit callback; the Workbench owns no inventory. */
export interface ArsenalWorkbenchApplyContext{
 mode:'campaign'|'quick';
 applyLabel:string;
 quote?:(recipe:ArsenalRecipeV2)=>ArsenalApplyQuote;
 onApply:(recipe:ArsenalRecipeV2)=>{ok:boolean;message?:string};
}

const BODY_SLOTS:readonly FamilyPartSlot[]=
 ['receiver','barrel','handguard','stock','grip','magazine'];
function formatSlot(slot:ArsenalSlot):string{
 return slot==='opticMount'?'Mount':slot==='foregrip'?'Foregrip':
  slot==='handguard'?'Handguard':slot.charAt(0).toUpperCase()+slot.slice(1);
}
export function openArsenalWorkbench(
 source:ArsenalReference|ArsenalSavedBuild,
 onLibraryChange?:(savedId:string)=>void,
 context?:ArsenalWorkbenchApplyContext
):void{
 const loadedRecipe='recipe' in source?readArsenalRecipe(source.recipe):
  arsenalRecipeFromLegacy(selectWeaponFamilyPreset(
   initialWeaponConfiguration(source.legacy.weapon),source.id));
 if(!loadedRecipe)return;
 let draft=createArsenalDraft(loadedRecipe);
 let savedId:string|null='recipe' in source&&/^arsenal-[1-9][0-9]*$/.test(source.id)?
  source.id:null;
 let activeCategory:ArsenalCategory=ARSENAL_CATEGORIES[0];
 let activeSlot:ArsenalSlot='receiver';
 let showIncompatible=false;
 let pending:ArsenalEditProposal|null=null;
 const priorBodyOverflow=document.body.style.overflow;
 const overlay=document.createElement('section');overlay.className='arsenal-wb-screen';
 overlay.setAttribute('aria-label','Weapon workbench');
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 const head=document.createElement('header');head.className='arsenal-wb-head';
 const back=document.createElement('button');back.className='arsenal-wb-action';
 back.type='button';back.textContent=context?'BACK TO EQUIPMENT':'BACK TO ARSENAL';
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
 const load=document.createElement('button');load.type='button';
 load.className='arsenal-wb-action';load.textContent='LOAD BUILD';
 const chooseModel=document.createElement('button');chooseModel.type='button';
 chooseModel.className='arsenal-wb-action arsenal-wb-choose-model';
 chooseModel.textContent='CHOOSE MODEL';
 const apply=document.createElement('button');apply.type='button';
 apply.className='arsenal-wb-action arsenal-wb-apply';
 apply.textContent=context?.applyLabel??'APPLY';apply.hidden=!context;
 back.classList.add('arsenal-wb-back');
 const primaryActions=document.createElement('div');
 primaryActions.className='arsenal-wb-primary-actions';
 primaryActions.append(chooseModel,load,save,apply);
 const utilityActions=document.createElement('div');
 utilityActions.className='arsenal-wb-utility-actions';
 utilityActions.append(undo,redo,saveCopy,fit,side);
 actions.append(primaryActions,utilityActions);
 head.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const viewportHost=document.createElement('div');viewportHost.className='arsenal-wb-viewport';
 const nav=document.createElement('nav');nav.className='arsenal-wb-nav';
 nav.setAttribute('aria-label','Weapon component categories');
 const panel=document.createElement('section');panel.className='arsenal-wb-panel';
 const panelTitle=document.createElement('h3');
 const slotRow=document.createElement('div');slotRow.className='arsenal-wb-slots';
 const activeLabel=document.createElement('p');activeLabel.className='arsenal-wb-current';
 const finishSection=document.createElement('section');
 finishSection.className='arsenal-wb-finish-section';finishSection.hidden=true;
 const finishHeading=document.createElement('strong');finishHeading.textContent='FINISH / MATERIAL';
 const finishOptions=document.createElement('div');finishOptions.className='arsenal-wb-finish-options';
 const finishHelp=document.createElement('p');finishHelp.className='arsenal-wb-finish-help';
 finishHelp.hidden=true;finishHelp.setAttribute('role','status');
 finishSection.append(finishHeading,finishOptions,finishHelp);
 const optionsHeader=document.createElement('div');optionsHeader.className='arsenal-wb-options-head';
 const optionsLabel=document.createElement('strong');optionsLabel.textContent='COMPATIBLE PARTS';
 const showAll=document.createElement('button');showAll.type='button';showAll.className='arsenal-wb-show-all';
 showAll.textContent='SHOW ALL';
 optionsHeader.append(optionsLabel,showAll);
 const fitExplanation=document.createElement('p');
 fitExplanation.className='arsenal-wb-fit-explanation';
 fitExplanation.setAttribute('role','status');
 fitExplanation.hidden=true;
 const choiceList=document.createElement('div');choiceList.className='arsenal-wb-option-list';
 const pendingHost=document.createElement('div');pendingHost.className='arsenal-wb-pending-host';
 const hint=document.createElement('p');hint.className='arsenal-wb-hint';
 hint.textContent=context?.mode==='campaign'?
  'Preview changes freely. Credits and stock change only after Equip.':
  context?.mode==='quick'?
  'Preview changes freely. Apply updates this Quick Play operator only.':
  'Edits are a reversible preview. No equipment is purchased or equipped here.';
 const applyQuote=document.createElement('p');applyQuote.className='arsenal-wb-apply-quote';
 applyQuote.setAttribute('role','status');
 panel.append(panelTitle,slotRow,activeLabel,finishSection,optionsHeader,fitExplanation,choiceList,
  pendingHost,applyQuote,hint);
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
 function renderFinishes(){
  finishOptions.replaceChildren();finishHelp.hidden=true;finishHelp.textContent='';
  const current=currentPartId(activeSlot);
  const family=arsenalFinishFamily(current);
  finishSection.hidden=!family||family.slot!==activeSlot;
  if(!family||family.slot!==activeSlot)return;
  for(const item of family.options){
   const proposal=proposeArsenalPartChange(draft.working,activeSlot,item.partId);
   const selected=item.partId===current;
   const choice=document.createElement('button');choice.type='button';
   choice.className='arsenal-wb-finish-choice';
   choice.setAttribute('aria-pressed',String(selected));
   choice.dataset.fit=selected?'equipped':proposal.valid?'fits':'incompatible';
   const swatch=document.createElement('span');swatch.className='arsenal-wb-finish-swatch';
   swatch.style.backgroundColor='#'+item.hex;
   const label=document.createElement('span');label.textContent=item.label;
   choice.append(swatch,label);
   choice.addEventListener('click',()=>{
    if(selected)return;
    if(!proposal.valid){
     finishHelp.hidden=false;
     finishHelp.textContent=item.label+' · '+arsenalFitFeedback(proposal).explanation;
     return;
    }
    finishHelp.hidden=true;pending=null;
    if(proposal.requiresConfirmation){pending=proposal;renderPending();return;}
    draft=commitArsenalProposal(draft,proposal);
    viewer.setRecipe(draft.working);renderSelection();
   });
   finishOptions.append(choice);
  }
 }
 function renderChoices(){
  choiceList.replaceChildren();
  const receiver=FAMILY_PARTS[draft.working.parts.receiver];
  let displayed=0;
  for(const part of arsenalPartsForSlot(activeSlot)){
   if(part.kind==='family'&&FAMILY_PARTS[part.id]?.family!==receiver.family)
    continue;
   // Only one choice per silhouette. Finish-only part IDs live in swatches.
   if(arsenalPhysicalPartId(part.id)!==part.id)continue;
   const proposal=proposeArsenalPartChange(draft.working,activeSlot,part.id);
   const equipped=arsenalPhysicalPartId(currentPartId(activeSlot))===part.id;
   if(!equipped&&!proposal.valid&&!showIncompatible)continue;
   const feedback=arsenalFitFeedback(proposal,equipped);
   const option=document.createElement('button');option.type='button';
   option.className='arsenal-wb-option';
   option.dataset.fit=feedback.state;
   option.setAttribute('aria-pressed',String(equipped));
   // This button explains a restriction; it is not a disabled control.
   option.title=part.detail;
   const name=document.createElement('strong');
   name.textContent=arsenalFinishFamily(part.id)?.name??part.name;
   const status=document.createElement('small');status.textContent=feedback.label;
   option.append(name,status);
   option.addEventListener('click',()=>{
    if(!proposal.valid){
     fitExplanation.hidden=false;
     fitExplanation.textContent=part.name+' · '+feedback.explanation;
     // Put the reason beside the tapped option too. On a phone the shared
     // status above a long grid can otherwise be outside the viewport.
     for(const old of choiceList.querySelectorAll('.arsenal-wb-fit-inline'))old.remove();
     const detail=document.createElement('span');
     detail.className='arsenal-wb-fit-inline';
     detail.textContent=feedback.explanation;
     option.append(detail);
     return;
    }
    if(equipped)return;
    fitExplanation.hidden=true;fitExplanation.textContent='';
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
   empty.textContent='No direct replacements. Show unavailable parts for fitment details, or Choose Model to start from another platform.';
   choiceList.append(empty);
  }
 }
 function renderSelection(){
  fitExplanation.hidden=true;fitExplanation.textContent='';
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
  const current=currentPartId(activeSlot),family=arsenalFinishFamily(current);
  activeLabel.textContent='CURRENT · '+(family?
   family.name+' · '+(arsenalFinishOption(current)?.label??'Standard'):
   (arsenalPart(current)?.name??current));
  renderFinishes();
  title.textContent=arsenalReferenceIdentity(draft.working).name;
  dirtyStatus.textContent=arsenalDraftDirty(draft)?'UNSAVED CHANGES':
   savedId?'SAVED BUILD':'FACTORY CONFIGURATION';
  save.textContent=savedId?'SAVE':'SAVE BUILD';
  saveCopy.hidden=!savedId;
  if(context){
   const quote=context.quote?.(draft.working);
   apply.disabled=quote!==undefined&&(!quote.valid||quote.canCommit===false);
   applyQuote.textContent=quote?arsenalApplyMessage(quote):'';
  }
  undo.disabled=draft.undo.length===0;redo.disabled=draft.redo.length===0;
  showAll.textContent=showIncompatible?'HIDE UNAVAILABLE':'SHOW UNAVAILABLE';
  viewer.setSelectedSlot(activeSlot);
  renderChoices();renderPending();
 }
 const loadDialog=document.createElement('dialog');
 loadDialog.className='arsenal-wb-load-dialog';
 loadDialog.setAttribute('aria-label','Load a saved weapon build');
 const loadHeading=document.createElement('h3');loadHeading.textContent='LOAD SAVED BUILD';
 const loadNote=document.createElement('p');loadNote.className='arsenal-wb-hint';
 loadNote.textContent='Replace the working draft. No weapon is purchased or equipped yet.';
 const modelControls=document.createElement('div');modelControls.className='arsenal-wb-model-controls';
 const modelPlatform=document.createElement('select');
 modelPlatform.setAttribute('aria-label','Filter factory weapon platform');
 modelPlatform.add(new Option('ALL PLATFORMS','all'));
 for(const platform of ARSENAL_PLATFORMS)
  modelPlatform.add(new Option(platform.name,platform.id));
 const modelSearch=document.createElement('input');modelSearch.type='search';
 modelSearch.placeholder='Find a model';modelSearch.setAttribute('aria-label','Search factory weapon models');
 modelControls.append(modelPlatform,modelSearch);
 const loadChoices=document.createElement('div');loadChoices.className='arsenal-wb-load-choices';
 const loadChanges=document.createElement('div');loadChanges.className='arsenal-wb-load-changes';
 loadChanges.setAttribute('role','status');
 const loadActions=document.createElement('div');loadActions.className='arsenal-wb-save-actions';
 const loadConfirm=document.createElement('button');loadConfirm.type='button';
 loadConfirm.className='arsenal-wb-accept';loadConfirm.textContent='LOAD INTO EDITOR';
 loadConfirm.disabled=true;
 const loadCancel=document.createElement('button');loadCancel.type='button';
 loadCancel.className='arsenal-wb-action';loadCancel.textContent='CANCEL';
 loadActions.append(loadConfirm,loadCancel);
 loadDialog.append(loadHeading,loadNote,modelControls,loadChoices,loadChanges,loadActions);
 overlay.append(loadDialog);
 let selectedRecipeLoad:ArsenalRecipeLoadProposal|null=null;
 let loadMode:'saved'|'model'='saved';
 function showLoadChoices(){
  loadChoices.replaceChildren();
  loadChanges.replaceChildren();selectedRecipeLoad=null;loadConfirm.disabled=true;
  const choices=loadMode==='model'?
   arsenalFactoryChoices(modelPlatform.value as ArsenalPlatformId|'all',modelSearch.value):
   loadArsenalBuildLibrary().builds;
  if(!choices.length){
   const empty=document.createElement('p');empty.className='arsenal-wb-hint';
   empty.textContent=loadMode==='model'?'No matching models. Try another platform or name.':
    'No saved builds yet. Save a build in the Workbench first.';
   loadChoices.append(empty);return;
  }
  const header=document.createElement('p');header.className='arsenal-wb-hint';
  header.textContent=choices.length+(loadMode==='model'?
   ' FACTORY MODELS · select a complete starting configuration':
   ' PERSONAL BUILDS · select one to review changes');
  loadChanges.append(header);
  for(const build of choices){
   const proposal=proposeArsenalRecipeLoad(draft.working,build.recipe);
   const option=document.createElement('button');option.type='button';
   option.className='arsenal-wb-load-option';
   option.setAttribute('aria-pressed','false');
   option.disabled=!proposal.valid;
   const name=document.createElement('strong');name.textContent=build.name;
   const sub=document.createElement('small');
   const platform=ARSENAL_PLATFORMS.find(p=>p.id===build.recipe.platformId);
   sub.textContent=(platform?.name??build.recipe.platformId)+' · '+
    build.recipe.weapon.toUpperCase()+' · '+proposal.changes.length+' CHANGES';
   option.append(name,sub);
   option.addEventListener('click',()=>{
    selectedRecipeLoad=proposal;loadConfirm.disabled=!proposal.valid;
    for(const button of loadChoices.querySelectorAll('button'))
     button.setAttribute('aria-pressed',String(button===option));
    loadChanges.replaceChildren();
    const summary=document.createElement('strong');
    summary.textContent=proposal.changes.length?
     'REPLACE '+proposal.changes.length+' COMPONENTS / PROPERTIES':'ALREADY MATCHES';
    loadChanges.append(summary);
    if(proposal.changes.length){
     const list=document.createElement('ul');
     for(const change of proposal.changes){
      const item=document.createElement('li');
      item.textContent=arsenalRecipeDifferenceLabel(change);list.append(item);
     }
     loadChanges.append(list);
    }
    const quote=context?.quote?.(build.recipe);
    if(quote&&(!quote.valid||quote.canCommit===false||
      quote.cost||quote.changesClass)){
     const warning=document.createElement('p');warning.className='arsenal-wb-load-warning';
     warning.textContent=arsenalApplyMessage(quote);
     loadChanges.append(warning);
    }
   });
   loadChoices.append(option);
  }
 }
 function openRecipePicker(mode:'saved'|'model'){
  pending=null;renderPending();loadMode=mode;
  modelControls.hidden=mode!=='model';modelSearch.value='';modelPlatform.value='all';
  loadHeading.textContent=mode==='model'?'CHOOSE FACTORY MODEL':'LOAD SAVED BUILD';
  loadDialog.setAttribute('aria-label',loadHeading.textContent);
  loadNote.textContent=mode==='model'?
   'Factory models are starting points. Changing model replaces the whole draft; nothing is purchased or equipped until Apply.':
   'Replace the working draft. No weapon is purchased or equipped yet.';
  loadConfirm.textContent=mode==='model'?'USE AS STARTING POINT':'LOAD INTO EDITOR';
  showLoadChoices();loadDialog.showModal();
 }
 load.addEventListener('click',()=>openRecipePicker('saved'));
 chooseModel.addEventListener('click',()=>openRecipePicker('model'));
 modelPlatform.addEventListener('change',showLoadChoices);
 modelSearch.addEventListener('input',showLoadChoices);
 loadCancel.addEventListener('click',()=>loadDialog.close());
 loadConfirm.addEventListener('click',()=>{
  if(!selectedRecipeLoad?.valid)return;
  const changed=acceptArsenalRecipeLoad(draft,selectedRecipeLoad);
  if(changed===draft){loadDialog.close();return;}
  if(!viewer.setRecipe(changed.working)){
   saveFeedback.textContent='Unable to render this build; nothing changed';return;
  }
  draft=changed;pending=null;
  // Loading a recipe must never silently redirect SAVE to someone else's
  // named recipe. Use Save Build (new) or Apply to equip this draft instead.
  savedId=null;loadDialog.close();renderSelection();
  saveFeedback.textContent=loadMode==='model'?
   'FACTORY MODEL SELECTED · NOT EQUIPPED':'SAVED RECIPE LOADED · NOT EQUIPPED';
 });
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
 apply.addEventListener('click',()=>{
  if(!context||apply.disabled)return;
  if(pending){saveFeedback.textContent='Confirm or cancel pending part changes first';return;}
  const checked=context.quote?.(draft.working);
  if(checked&&(!checked.valid||checked.canCommit===false)){
   saveFeedback.textContent=checked.reason??'This build cannot be equipped';return;
  }
  if(checked?.changesClass&&
   !window.confirm('Switch weapon class? This replaces the loaded and spare magazines.'))return;
  try{
   const result=context.onApply(draft.working);
   if(!result.ok){saveFeedback.textContent=result.message??'Unable to equip build';return;}
   draft=createArsenalDraft(draft.working);
   close();
  }catch{saveFeedback.textContent='Equipment update failed. Draft preserved.';}
 });
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
  if(loadDialog.open){loadDialog.close();return;}
  if(saveDialog.open){saveDialog.close();return;}
  if(arsenalDraftDirty(draft)&&
   !window.confirm('Discard unsaved changes to this weapon draft?'))return;
  viewer.dispose();overlay.remove();window.removeEventListener('keydown',keys);
  document.body.style.overflow=priorBodyOverflow;
 };
 const keys=(e:KeyboardEvent)=>{
  if(e.key!=='Escape')return;
  e.preventDefault();
  if(loadDialog.open)loadDialog.close();
  else if(saveDialog.open)saveDialog.close();
  else if(pending){pending=null;renderPending();}
  else close();
 };
 back.addEventListener('click',close);
 window.addEventListener('keydown',keys);
 document.body.style.overflow='hidden';
 back.focus();
}
