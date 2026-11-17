/** Arsenal 2.0 Stage 5 — unified, reversible part editing.
 * Standalone inspection/draft context. No Campaign or Quick Play writes.
 */
import {ARSENAL_CATEGORIES,arsenalPart,arsenalPartsForSlot,
 type ArsenalCategory,type ArsenalSlot,type ArsenalReference}
 from './catalog.ts';
import {FAMILY_PARTS,type FamilyPartSlot} from '../equipment-weapon-families.ts';
import {alternateStockPosition,type WeaponStockPosition} from '../weapon-stock-position.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe,sameArsenalRecipe,type ArsenalAccessorySlot,
 type ArsenalRecipeV2} from './recipes.ts';
import {type ArsenalSavedBuild,loadArsenalBuildLibrary,persistArsenalBuildLibrary,
 createSavedArsenalBuild,overwriteSavedArsenalBuild} from './saved-builds.ts';
import {proposeArsenalPartChange,arsenalReferenceIdentity,
 type ArsenalEditProposal} from './compatibility.ts';
import {createArsenalDraft,commitArsenalProposal,undoArsenalDraft,redoArsenalDraft,
 arsenalDraftDirty,editArsenalMountPosition,editArsenalStockPosition} from './editor-state.ts';
import {mountPickerState,nearestMountChoice}
 from './mount-picker-model.ts';
import type {MountableSlot} from '../weapons/geometry/weapon-mount-selections.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {ArsenalViewport} from './viewport.ts';
import {arsenalHandlingStats,arsenalStatDeltas} from './handling-stats.ts';
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
 let lastStatsRecipe:ArsenalRecipeV2=draft.working;
 let previousStatsRecipe:ArsenalRecipeV2|null=null;
 let savedId:string|null='recipe' in source&&/^arsenal-[1-9][0-9]*$/.test(source.id)?
  source.id:null;
 let activeCategory:ArsenalCategory=ARSENAL_CATEGORIES[0];
 let activeSlot:ArsenalSlot='receiver';
 let showIncompatible=false;
 let pending:ArsenalEditProposal|null=null;
 let previewProposal:ArsenalEditProposal|null=null;
 const priorBodyOverflow=document.body.style.overflow;
 const overlay=document.createElement('section');overlay.className='arsenal-wb-screen';
 if(context)overlay.classList.add('arsenal-wb-has-apply');
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
 const commitHint=document.createElement('p');commitHint.className='arsenal-wb-commit-hint';
 commitHint.setAttribute('role','status');
 const utilityActions=document.createElement('div');
 utilityActions.className='arsenal-wb-utility-actions';
 utilityActions.append(undo,redo,saveCopy,fit,side);
 actions.append(primaryActions,utilityActions);
 head.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const viewportHost=document.createElement('div');viewportHost.className='arsenal-wb-viewport';
 // Read-only gameplay comparisons stay beside the model, above the parts list.
 const stage=document.createElement('div');stage.className='arsenal-wb-stage';
 const stats=document.createElement('section');stats.className='arsenal-wb-stats';
 stats.setAttribute('aria-label','Weapon handling and comparison statistics');
 const statsHeading=document.createElement('div');statsHeading.className='arsenal-wb-stats-head';
 const statsTitle=document.createElement('strong');statsTitle.textContent='WEAPON PERFORMANCE';
 const statsComparison=document.createElement('small');
 statsComparison.className='arsenal-wb-stats-comparison';
 statsHeading.append(statsTitle,statsComparison);
 const statsBody=document.createElement('div');statsBody.className='arsenal-wb-stats-grid';
 const statsNote=document.createElement('p');statsNote.className='arsenal-wb-stats-note';
 statsNote.textContent='Relative handling · higher is better · not damage or hit chance';
 stats.append(statsHeading,statsBody,statsNote);
 stage.append(viewportHost,stats);
 const nav=document.createElement('nav');nav.className='arsenal-wb-nav';
 nav.setAttribute('aria-label','Weapon component categories');
 const panel=document.createElement('section');panel.className='arsenal-wb-panel';
 panel.id='arsenal-wb-active-part';
 panel.setAttribute('aria-label','Selected weapon component and compatible replacements');
 const panelTitle=document.createElement('h3');
 const slotRow=document.createElement('div');slotRow.className='arsenal-wb-slots';
 const activeLabel=document.createElement('p');activeLabel.className='arsenal-wb-current';
 activeLabel.setAttribute('aria-live','polite');
 // M2.7: one compact rail picker attached to the selected fitted accessory.
 // The range only selects authored physical candidates, never arbitrary mesh X.
 const stockPositionSection=document.createElement('section');
 stockPositionSection.className='arsenal-wb-stock-position';
 stockPositionSection.hidden=true;
 stockPositionSection.setAttribute('aria-label','Physical stock position');
 const stockPositionHeading=document.createElement('strong');
 stockPositionHeading.textContent='STOCK POSITION';
 const stockPositionChoices=document.createElement('div');
 stockPositionChoices.className='arsenal-wb-stock-position-buttons';
 const stockPositionNote=document.createElement('p');
 stockPositionNote.className='arsenal-wb-hint';
 stockPositionNote.textContent='Changes the actual stock geometry, shoulder fit and handling. Undo is available.';
 stockPositionSection.append(stockPositionHeading,stockPositionChoices,stockPositionNote);
 const mounting=document.createElement('section');mounting.className='arsenal-wb-mounting';
 mounting.setAttribute('aria-label','Accessory mounting position');
 mounting.hidden=true;
 const mountingHeader=document.createElement('div');mountingHeader.className='arsenal-wb-mount-head';
 const mountingTitle=document.createElement('strong');mountingTitle.textContent='MOUNT POSITION';
 const mountingMode=document.createElement('small');
 mountingHeader.append(mountingTitle,mountingMode);
 const mountingStatus=document.createElement('p');mountingStatus.className='arsenal-wb-mount-status';
 mountingStatus.setAttribute('role','status');
 const mountingRails=document.createElement('div');mountingRails.className='arsenal-wb-mount-rails';
 mountingRails.setAttribute('role','group');mountingRails.setAttribute('aria-label','Physical rail and side');
 const mountingPosition=document.createElement('div');mountingPosition.className='arsenal-wb-mount-position';
 const mountingPositionHeader=document.createElement('div');
 mountingPositionHeader.className='arsenal-wb-mount-position-head';
 const mountingPositionLabel=document.createElement('label');
 const mountingPositionValue=document.createElement('span');
 const mountingSlider=document.createElement('input');mountingSlider.type='range';
 mountingSlider.className='arsenal-wb-mount-slider';mountingSlider.min='0';mountingSlider.step='1';
 mountingSlider.setAttribute('aria-label','Position along mounted rail, rear to front');
 mountingPositionHeader.append(mountingPositionLabel,mountingPositionValue);
 const mountingStepper=document.createElement('div');mountingStepper.className='arsenal-wb-mount-stepper';
 const mountingRear=document.createElement('button');mountingRear.type='button';
 mountingRear.textContent='◀ REAR';
 const mountingFront=document.createElement('button');mountingFront.type='button';
 mountingFront.textContent='FRONT ▶';
 mountingStepper.append(mountingRear,mountingSlider,mountingFront);
 mountingPosition.append(mountingPositionHeader,mountingStepper);
 const mountingTools=document.createElement('div');mountingTools.className='arsenal-wb-mount-tools';
 const mountingAutomatic=document.createElement('button');mountingAutomatic.type='button';
 mountingAutomatic.textContent='AUTO POSITION';
 const mountingView=document.createElement('button');mountingView.type='button';
 mountingView.textContent='VIEW MOUNT';
 mountingTools.append(mountingAutomatic,mountingView);
 mounting.append(mountingHeader,mountingStatus,mountingRails,mountingPosition,mountingTools);
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
 const previewHost=document.createElement('div');previewHost.className='arsenal-wb-proposal-host';
 previewHost.setAttribute('role','status');
 const hint=document.createElement('p');hint.className='arsenal-wb-hint';
 hint.textContent=context?.mode==='campaign'?
  'Preview changes freely. Credits and stock change only after Equip.':
  context?.mode==='quick'?
  'Preview changes freely. Apply updates this Quick Play operator only.':
  'Edits are a reversible preview. No equipment is purchased or equipped here.';
 const applyQuote=document.createElement('p');applyQuote.className='arsenal-wb-apply-quote';
 applyQuote.setAttribute('role','status');
 panel.append(panelTitle,slotRow,activeLabel,stockPositionSection,mounting,finishSection,optionsHeader,
  fitExplanation,previewHost,choiceList,pendingHost,applyQuote,hint);
 main.append(stage,nav,panel);
 overlay.append(head,main);
 if(context)overlay.append(commitHint);
 document.body.append(overlay);
 const viewer=new ArsenalViewport(viewportHost,draft.working,slot=>{
  const category=ARSENAL_CATEGORIES.find(c=>c.slots.includes(slot));
  if(category){
   activeCategory=category;activeSlot=slot;pending=null;renderSelection();
   // A tap on the physical weapon reveals its matching part controls.
   panel.scrollIntoView({
    behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?
     'instant':'smooth',block:'start'
   });
  }
 });
 function currentPartId(slot:ArsenalSlot):string{
  return BODY_SLOTS.includes(slot as FamilyPartSlot)?
   draft.working.parts[slot as FamilyPartSlot]:
   draft.working.accessories[slot as ArsenalAccessorySlot];
 }
 function renderPreviewProposal(){
  previewHost.replaceChildren();
  const candidate=previewProposal;
  if(!candidate?.valid||!candidate.nextRecipe)return;
  const wrap=document.createElement('div');wrap.className='arsenal-wb-proposal';
  const caption=document.createElement('strong');
  caption.textContent='PREVIEW · NOT INSTALLED';
  const name=document.createElement('p');
  name.textContent=(arsenalPart(candidate.requestedPartId)?.name??candidate.requestedPartId)+
   (candidate.requiresConfirmation?' · includes required dependent changes':'');
  const controls=document.createElement('div');controls.className='arsenal-wb-pending-actions';
  const accept=document.createElement('button');accept.type='button';
  accept.className='arsenal-wb-accept';accept.textContent='APPLY PART';
  const cancel=document.createElement('button');cancel.type='button';
  cancel.className='arsenal-wb-action';cancel.textContent='CANCEL PREVIEW';
  accept.addEventListener('click',()=>{
   if(previewProposal!==candidate)return;
   const changed=commitArsenalProposal(draft,candidate,true);
   if(changed===draft)return;
   draft=changed;previewProposal=null;pending=null;
   viewer.setRecipe(draft.working);renderSelection();
  });
  cancel.addEventListener('click',()=>{
   previewProposal=null;renderPreviewProposal();renderPerformance();
  });
  controls.append(accept,cancel);wrap.append(caption,name,controls);
  previewHost.append(wrap);
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
 // E2.A2: finish swatches are authored choices, not disposable DOM.
 const finishButtons=new Map<string,HTMLButtonElement>();
 function renderFinishes(){
  finishHelp.hidden=true;finishHelp.textContent='';
  const current=currentPartId(activeSlot);
  const family=arsenalFinishFamily(current);
  finishSection.hidden=!family||family.slot!==activeSlot;
  const desired:HTMLButtonElement[]=[];
  if(family&&family.slot===activeSlot)for(const item of family.options){
   const key=activeSlot+':'+item.partId;
   let choice=finishButtons.get(key);
   if(!choice){
    choice=document.createElement('button');choice.type='button';
    choice.className='arsenal-wb-finish-choice';
    const swatch=document.createElement('span');swatch.className='arsenal-wb-finish-swatch';
    swatch.style.backgroundColor='#'+item.hex;
    const label=document.createElement('span');label.textContent=item.label;
    choice.append(swatch,label);
    choice.addEventListener('click',()=>{
     const live=proposeArsenalPartChange(draft.working,activeSlot,item.partId);
     if(item.partId===currentPartId(activeSlot))return;
     if(!live.valid){
      finishHelp.hidden=false;
      finishHelp.textContent=item.label+' · '+arsenalFitFeedback(live).explanation;
      return;
     }
     finishHelp.hidden=true;pending=null;
     if(live.requiresConfirmation){pending=live;renderPending();return;}
     draft=commitArsenalProposal(draft,live);
     viewer.setRecipe(draft.working);renderSelection();
    });
    finishButtons.set(key,choice);
   }
   const proposal=proposeArsenalPartChange(draft.working,activeSlot,item.partId);
   const selected=item.partId===current;
   const pressed=String(selected);
   if(choice.getAttribute('aria-pressed')!==pressed)
    choice.setAttribute('aria-pressed',pressed);
   const fit=selected?'equipped':proposal.valid?'fits':'incompatible';
   if(choice.dataset.fit!==fit)choice.dataset.fit=fit;
   desired.push(choice);
  }
  const visible=new Set<Node>(desired);
  for(const child of Array.from(finishOptions.children))
   if(!visible.has(child))child.remove();
  for(let index=0;index<desired.length;index++)
   if(finishOptions.children[index]!==desired[index])
    finishOptions.insertBefore(desired[index],finishOptions.children[index]??null);
 }
 // Reuse physical part controls for the lifetime of this Workbench.
 // Refresh fit and selection without closing focus or remounting stable rows.
 const choiceButtons=new Map<string,{option:HTMLButtonElement;status:HTMLElement}>();
 const emptyChoice=document.createElement('p');
 emptyChoice.className='arsenal-wb-hint';
 emptyChoice.textContent='No direct replacements. Show unavailable parts for fitment details, or Choose Model to start from another platform.';
 function renderChoices(){
  const receiver=FAMILY_PARTS[draft.working.parts.receiver];
  const desired:HTMLElement[]=[];
  for(const part of arsenalPartsForSlot(activeSlot)){
   const partFamily=part.kind==='family'?FAMILY_PARTS[part.id]?.family:undefined;
   const sharedStanag=activeSlot==='magazine'&&receiver.family==='fnc'&&
    partFamily==='ar';
   if(part.kind==='family'&&partFamily!==receiver.family&&!sharedStanag)
    continue;
   // Legacy saved FNC magazine stays valid, but isn't a duplicate choice.
   if(part.id==='fnc-mag30'&&currentPartId(activeSlot)!=='fnc-mag30')
    continue;
   if(arsenalPhysicalPartId(part.id)!==part.id)continue;
   const proposal=proposeArsenalPartChange(draft.working,activeSlot,part.id);
   const equipped=arsenalPhysicalPartId(currentPartId(activeSlot))===part.id;
   if(!equipped&&!proposal.valid&&!showIncompatible)continue;
   const feedback=arsenalFitFeedback(proposal,equipped);
   const key=activeSlot+':'+part.id;
   let entry=choiceButtons.get(key);
   if(!entry){
    const option=document.createElement('button');option.type='button';
    option.className='arsenal-wb-option';option.title=part.detail;
    const name=document.createElement('strong');
    name.textContent=arsenalFinishFamily(part.id)?.name??part.name;
    const status=document.createElement('small');option.append(name,status);
    // The proposal changes after undo, recipe loads or part selections.
    // Resolve it at activation time, never capture a stale proposal.
    option.addEventListener('click',()=>{
     const live=proposeArsenalPartChange(draft.working,activeSlot,part.id);
     const selected=arsenalPhysicalPartId(currentPartId(activeSlot))===part.id;
     if(!live.valid){
      const reason=arsenalFitFeedback(live,selected).explanation;
      fitExplanation.hidden=false;
      fitExplanation.textContent=part.name+' · '+reason;
      for(const old of choiceList.querySelectorAll('.arsenal-wb-fit-inline'))old.remove();
      const detail=document.createElement('span');
      detail.className='arsenal-wb-fit-inline';detail.textContent=reason;
      option.append(detail);
      return;
     }
     if(selected)return;
     fitExplanation.hidden=true;fitExplanation.textContent='';
     pending=null;
     // Choosing a component is now non-destructive. Apply Part is the
     // explicit second step on touch, mouse, and keyboard alike.
     previewProposal=live;renderPreviewProposal();renderPerformance();
    });
    entry={option,status};choiceButtons.set(key,entry);
   }
   const {option,status}=entry;
   if(option.dataset.fit!==feedback.state)option.dataset.fit=feedback.state;
   const pressed=String(equipped);
   if(option.getAttribute('aria-pressed')!==pressed)
    option.setAttribute('aria-pressed',pressed);
   if(status.textContent!==feedback.label)status.textContent=feedback.label;
   option.querySelector('.arsenal-wb-fit-inline')?.remove();
   desired.push(option);
  }
  if(!desired.length)desired.push(emptyChoice);
  const visible=new Set<Node>(desired);
  for(const child of Array.from(choiceList.children))
   if(!visible.has(child))child.remove();
  for(let index=0;index<desired.length;index++)
   if(choiceList.children[index]!==desired[index])
    choiceList.insertBefore(desired[index],choiceList.children[index]??null);
 }
 // M2.7A–C: mount selection is an ordinary preview edit, never a purchase.
 // Recompute candidates only on actual editor changes, not during render RAF.
 const mountable=(slot:ArsenalSlot):slot is MountableSlot=>
  slot==='optic'||slot==='foregrip'||slot==='light';
 let mountingChoices:ReturnType<typeof mountPickerState>|null=null;
 let mountingActiveRail:ReturnType<typeof mountPickerState>['rails'][number]|undefined;
 const mountUpdate=(slot:MountableSlot,
  choice:Parameters<typeof editArsenalMountPosition>[2])=>{
  if(pending){mountingStatus.textContent='Resolve required part changes first.';return false;}
  const updated=editArsenalMountPosition(draft,slot,choice);
  if(updated===draft){mountingStatus.textContent='This position conflicts with other mounted equipment.';return false;}
  draft=updated;
  viewer.setRecipe(draft.working);renderSelection();
  return true;
 };
 const positionText=(index:number,total:number)=>{
  if(total<=1)return 'ONE CONTACT';
  return 'CONTACT '+(index+1)+' / '+total+' · REAR → FRONT';
 };
 function renderMounting(){
  const slot=activeSlot;
  mounting.hidden=!mountable(slot)||pending!==null;
  if(mounting.hidden||!mountable(slot))return;
  const state=mountPickerState(draft.working,slot);
  mountingChoices=state;
  mountingMode.textContent=state.automatic?'AUTOMATIC · FREE':'CUSTOM · FREE';
  mountingRails.replaceChildren();
  if(state.reason){
   mountingStatus.textContent=state.reason;
   mountingPosition.hidden=true;mountingTools.hidden=true;
   return;
  }
  mountingPosition.hidden=false;mountingTools.hidden=false;
  const active=state.rails.find(r=>r.key===state.selectedKey)??state.rails[0];
  mountingActiveRail=active;
  mountingStatus.textContent=!state.automatic&&!state.selectedKey?
   'Saved mount no longer fits. Choose a real rail or reset to Automatic.':
   state.automatic?
   'Auto chooses a clear rail. Choose a side or position to pin it.':
   'Saved to this draft · Undo restores the previous position.';
  for(const rail of state.rails){
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-wb-mount-rail';
   const face=rail.face.toUpperCase();
   const owner=arsenalPart(rail.ownerPartId)?.name??
    rail.ownerPartId.replace(/^(ar-|hk-|ak-)/,'').replace(/-/g,' ');
   button.textContent=face+' · '+owner;
   button.dataset.rail=rail.key;
   // A stale saved mount has no active rail, even when the picker offers
   // repair candidates. Do not falsely highlight the first fallback rail.
   button.setAttribute('aria-pressed',String(!!state.selectedKey&&active.key===rail.key));
   button.setAttribute('aria-label','Mount on '+rail.face+' of '+owner);
   button.addEventListener('click',()=>{
    if(mountUpdate(slot,nearestMountChoice(rail,state.selectedX))){
     mountingRails.querySelector<HTMLButtonElement>('[data-rail="'+rail.key+'"]')?.focus();
     viewer.viewMount(slot);
    }
   });
   mountingRails.append(button);
  }
  mountingPositionLabel.textContent=active.face.toUpperCase()+' RAIL · POSITION';
  mountingSlider.max=String(active.choices.length-1);
  mountingSlider.value=String(state.selectedIndex);
  mountingSlider.disabled=active.choices.length<2;
  mountingPositionValue.textContent=positionText(state.selectedIndex,active.choices.length);
  mountingRear.disabled=state.selectedIndex<=0;
  mountingFront.disabled=state.selectedIndex>=active.choices.length-1;
  mountingAutomatic.disabled=state.automatic;
 }
 // Slider input is visual preview text only; one release/change is one
 // undo step and one model rebuild, even after many iOS pointer movements.
 mountingSlider.addEventListener('input',()=>{
  const choices=mountingActiveRail?.choices??[];
  const index=Math.min(choices.length-1,Math.max(0,Number(mountingSlider.value)));
  mountingPositionValue.textContent=positionText(index,choices.length);
 });
 mountingSlider.addEventListener('change',()=>{
  if(!mountingChoices||!mountingActiveRail)return;
  const slot=mountingChoices.slot;
  const next=mountingActiveRail.choices[Number(mountingSlider.value)];
  if(next&&mountUpdate(slot,next))mountingSlider.focus();
 });
 const stepPosition=(direction:-1|1)=>{
  if(!mountingActiveRail||!mountingChoices)return;
  const choices=mountingActiveRail.choices;
  const index=Math.max(0,Math.min(choices.length-1,
   Number(mountingSlider.value)+direction));
  const next=choices[index];
  if(next&&mountUpdate(mountingChoices.slot,next)){
   (direction===-1?mountingRear:mountingFront).focus();
  }
 };
 mountingRear.addEventListener('click',()=>stepPosition(-1));
 mountingFront.addEventListener('click',()=>stepPosition(1));
 mountingAutomatic.addEventListener('click',()=>{
  if(mountable(activeSlot)&&mountUpdate(activeSlot,null))mountingAutomatic.focus();
 });
 mountingView.addEventListener('click',()=>{
  if(mountable(activeSlot))viewer.viewMount(activeSlot);
 });
 // Persistent navigation: recipe/finish changes do not need to allocate
 // category or slot buttons again, and keyboard focus stays on its control.
 const categoryButtons=new Map<ArsenalCategory['id'],HTMLButtonElement>();
 const slotButtons=new Map<ArsenalSlot,HTMLButtonElement>();
 let mountedSlotCategory:ArsenalCategory['id']|null=null;
 function syncNavigation(){
  if(!categoryButtons.size){
   for(const category of ARSENAL_CATEGORIES){
    const button=document.createElement('button');button.type='button';
    button.className='arsenal-wb-category';button.textContent=category.name;
    button.addEventListener('click',()=>{
     activeCategory=category;activeSlot=category.slots[0];pending=null;
     renderSelection();
    });
    categoryButtons.set(category.id,button);nav.append(button);
   }
  }
  for(const [id,button] of categoryButtons){
   const pressed=String(activeCategory.id===id);
   if(button.getAttribute('aria-pressed')!==pressed)
    button.setAttribute('aria-pressed',pressed);
  }
  if(mountedSlotCategory!==activeCategory.id){
   mountedSlotCategory=activeCategory.id;
   slotButtons.clear();
   slotRow.replaceChildren();
   if(activeCategory.slots.length>1)for(const slot of activeCategory.slots){
    const button=document.createElement('button');button.type='button';
    button.className='arsenal-wb-subslot';button.textContent=formatSlot(slot);
    button.addEventListener('click',()=>{
     activeSlot=slot;pending=null;renderSelection();
    });
    slotButtons.set(slot,button);slotRow.append(button);
   }
  }
  for(const [slot,button] of slotButtons){
   const pressed=String(activeSlot===slot);
   if(button.getAttribute('aria-pressed')!==pressed)
    button.setAttribute('aria-pressed',pressed);
  }
 }
 /** Compare only accepted editor changes, not category browsing or pending edits. */
 function renderPerformance(){
  if(!sameArsenalRecipe(lastStatsRecipe,draft.working)){
   previousStatsRecipe=lastStatsRecipe;
   lastStatsRecipe=draft.working;
   previewProposal=null;
  }
  const projected=previewProposal?.valid?previewProposal.nextRecipe:null;
  const current=arsenalHandlingStats(projected??draft.working);
  const previous=projected?arsenalHandlingStats(draft.working):
   previousStatsRecipe?arsenalHandlingStats(previousStatsRecipe):null;
  statsComparison.textContent=projected?'PROPOSED VS EQUIPPED':
   previous?'VS PREVIOUS BUILD':'CURRENT BUILD';
  if(!current){statsBody.textContent='Handling data unavailable for this build.';return;}
  const deltas=arsenalStatDeltas(current,previous);
  const oldScores=new Map<string,number>(previous?.map(item=>
   [item.id,item.score] as const)??[]);
  const nodes=document.createDocumentFragment();
  for(const stat of current){
   const row=document.createElement('div');row.className='arsenal-wb-stat';
   row.title=stat.explanation;
   const heading=document.createElement('div');heading.className='arsenal-wb-stat-heading';
   const name=document.createElement('strong');name.textContent=stat.label;
   const value=document.createElement('span');value.className='arsenal-wb-stat-value';
   value.textContent=String(stat.score);
   const delta=deltas.get(stat.id)??0;
   if(previous&&delta!==0){
    const change=document.createElement('small');
    change.className='arsenal-wb-stat-change';
    change.dataset.direction=delta>0?'up':'down';
    change.textContent=(delta>0?'▲ +':'▼ ')+String(delta);
    value.append(' ',change);
   }
   heading.append(name,value);
   const track=document.createElement('div');track.className='arsenal-wb-stat-track';
   track.setAttribute('role','meter');
   track.setAttribute('aria-label',stat.label);
   track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax','100');
   track.setAttribute('aria-valuenow',String(stat.score));
   track.setAttribute('aria-valuetext',stat.score+' out of 100 relative score'+
    (previous&&delta!==0?', changed '+delta+' points since previous build':''));
   const fill=document.createElement('span');fill.className='arsenal-wb-stat-fill';
   fill.style.width=stat.score+'%';track.append(fill);
   const old=oldScores.get(stat.id);
   if(old!==undefined&&old!==stat.score){
    const marker=document.createElement('span');
    marker.className='arsenal-wb-stat-previous';
    marker.style.left=old+'%';track.append(marker);
   }
   const detail=document.createElement('small');detail.className='arsenal-wb-stat-detail';
   detail.textContent=stat.detail;
   row.append(heading,track,detail);nodes.append(row);
  }
  statsBody.replaceChildren(nodes);
 }
 function renderStockPosition(){
  const allowed=alternateStockPosition(draft.working.parts.stock);
  stockPositionSection.hidden=activeSlot!=='stock'||!allowed;
  if(stockPositionSection.hidden||!allowed)return;
  stockPositionChoices.replaceChildren();
  for(const position of ['deployed',allowed] as WeaponStockPosition[]){
   const control=document.createElement('button');
   control.type='button';control.className='arsenal-wb-stock-position-button';
   control.textContent=position.toUpperCase();
   control.setAttribute('aria-pressed',String(
    (draft.working.stockPosition??'deployed')===position));
   control.addEventListener('click',()=>{
    const next=editArsenalStockPosition(draft,position);
    if(next===draft)return;
    draft=next;previewProposal=null;pending=null;
    viewer.setRecipe(draft.working);renderSelection();
   });
   stockPositionChoices.append(control);
  }
 }
 function renderSelection(){
  fitExplanation.hidden=true;fitExplanation.textContent='';
  syncNavigation();
  panelTitle.textContent=activeCategory.name.toUpperCase();
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
   commitHint.textContent=quote&&(!quote.valid||quote.canCommit===false)?
    'CANNOT EQUIP · '+(quote.reason??'Configuration unavailable'):
    arsenalDraftDirty(draft)?
     'PREVIEW ONLY · APPLY TO EQUIP CHANGES':
     'PREVIEW READY · APPLY TO EQUIP';
  }
  undo.disabled=draft.undo.length===0;redo.disabled=draft.redo.length===0;
  showAll.textContent=showIncompatible?'HIDE UNAVAILABLE':'SHOW UNAVAILABLE';
  viewer.setVisibleSlots(activeCategory.slots);
  viewer.setSelectedSlot(activeSlot);
  renderStockPosition();renderPerformance();renderChoices();renderPreviewProposal();renderPending();renderMounting();
 }
 const loadDialog=document.createElement('dialog');
 loadDialog.className='arsenal-wb-load-dialog';
 loadDialog.setAttribute('aria-label','Load a saved weapon build');
 const loadHeading=document.createElement('h3');loadHeading.textContent='LOAD SAVED BUILD';
 const loadNote=document.createElement('p');loadNote.className='arsenal-wb-hint';
 loadNote.textContent='Replace the working draft. No weapon is purchased or equipped yet.';
 const modelControls=document.createElement('div');modelControls.className='arsenal-wb-model-controls';
 const platformChips=document.createElement('div');platformChips.className='arsenal-wb-platform-chips';
 platformChips.setAttribute('role','group');
 platformChips.setAttribute('aria-label','Factory weapon platforms');
 const modelPlatform=document.createElement('select');
 modelPlatform.setAttribute('aria-label','Filter factory weapon platform');
 modelPlatform.add(new Option('ALL PLATFORMS','all'));
 for(const platform of ARSENAL_PLATFORMS)
  modelPlatform.add(new Option(platform.name,platform.id));
 const modelSearch=document.createElement('input');modelSearch.type='search';
 modelSearch.placeholder='Find a model';modelSearch.setAttribute('aria-label','Search factory weapon models');
 modelControls.append(modelPlatform,modelSearch);
 for(const platform of [{id:'all',name:'ALL'},...ARSENAL_PLATFORMS]){
  const chip=document.createElement('button');chip.type='button';
  chip.className='arsenal-wb-platform-chip';
  chip.dataset.platform=platform.id;chip.textContent=platform.name;
  chip.addEventListener('click',()=>{
   modelPlatform.value=platform.id;
   showLoadChoices();
  });
  platformChips.append(chip);
 }
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
 loadDialog.append(loadHeading,loadNote,modelControls,platformChips,loadChoices,loadChanges,loadActions);
 overlay.append(loadDialog);
 let selectedRecipeLoad:ArsenalRecipeLoadProposal|null=null;
 let loadMode:'saved'|'model'='saved';
 function showLoadChoices(){
  loadChoices.replaceChildren();
  loadChanges.replaceChildren();selectedRecipeLoad=null;loadConfirm.disabled=true;
  for(const chip of platformChips.querySelectorAll<HTMLButtonElement>('button'))
   chip.setAttribute('aria-pressed',String(chip.dataset.platform===modelPlatform.value));
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
    build.recipe.weapon.toUpperCase()+' · '+
    (proposal.changes.length?proposal.changes.length+' CHANGES':'ALREADY MATCHES');
   const status=document.createElement('span');status.className='arsenal-wb-model-status';
   status.textContent=!proposal.valid?'CANNOT PREVIEW':
    proposal.changes.length?'STARTING POINT':'CURRENT CONFIGURATION';
   option.append(name,sub,status);
   option.addEventListener('click',()=>{
    selectedRecipeLoad=proposal;loadConfirm.disabled=!proposal.valid;
    for(const button of loadChoices.querySelectorAll('button'))
     button.setAttribute('aria-pressed',String(button===option));
    loadChanges.replaceChildren();
    const summary=document.createElement('strong');
    summary.textContent=build.name.toUpperCase()+' · '+
     (proposal.changes.length?
      'REVIEW '+proposal.changes.length+' CHANGES':'ALREADY MATCHES');
    loadChanges.append(summary);
    // Choose a model and see the projected handling consequences before
    // committing a new draft or spending any Campaign resources.
    if(proposal.nextRecipe){
     const proposed=arsenalHandlingStats(proposal.nextRecipe);
     const baseline=arsenalHandlingStats(draft.working);
     if(proposed&&baseline){
      const changes=arsenalStatDeltas(proposed,baseline);
      const statPreview=document.createElement('div');
      statPreview.className='arsenal-wb-load-stats';
      const heading=document.createElement('strong');
      heading.textContent='HANDLING VS CURRENT BUILD';
      const statChips=document.createElement('div');
      statChips.className='arsenal-wb-load-stat-chips';
      let differences=0;
      for(const row of proposed){
       const delta=changes.get(row.id)??0;
       if(delta===0)continue;
       differences++;
       const chip=document.createElement('span');
       chip.className='arsenal-wb-load-stat-chip';
       chip.dataset.direction=delta>0?'up':'down';
       chip.textContent=row.label+' '+(delta>0?'▲ +':'▼ ')+delta;
       statChips.append(chip);
      }
      if(!differences)statChips.textContent='No handling difference';
      statPreview.append(heading,statChips);loadChanges.append(statPreview);
     }
    }
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
  modelControls.hidden=mode!=='model';platformChips.hidden=mode!=='model';
  modelSearch.value='';
  modelPlatform.value=mode==='model'?draft.working.platformId:'all';
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
