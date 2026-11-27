/** Stage 10e: Quick Play squad board & equipment presentation.
 * No separate roster/mission persistence is held by this UI controller.
 */
import type {CampaignMode} from './breach-app-mode.ts';
import type {Session} from './breach-game.ts';
import {resupplyRoster,equipRosterCatalogPreset,equipRosterGear,equipRosterCarryGear,undoRosterCarryGear,copyRosterCarryLayout,equipRosterFieldInventory,moveRosterMagazine,
 configureRosterWeapon,configureRosterWeaponBodyPart,
 renameRosterMember,type RosterState} from './breach-roster.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 weaponAttachmentAllowed} from './equipment-weapon-assemblies.ts';
import {FAMILY_PART_SLOTS,FAMILY_PARTS,matchingFamilyPreset,compatibleFamilyPart,
 familyPreset,proposeFamilyPartChange,type FamilyPartSlot}
 from './equipment-weapon-families.ts';
import {createWeaponPresetBrowser} from './ui/weapon-preset-browser.ts';
import {catalogOutfitterSources,catalogOutfitterThumbnailTarget,rosterCatalogName} from './ui/outfitter-choice-sources.ts';
import {createOutfitterZoneNav,previewFocusForOutfitterSlot} from './ui/outfitter-zone-nav.ts';
import {carryCapacityReport} from './equipment-carry-placement.ts';
import {stageMagazines,magazineSpace,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {WeaponWorkbenchPreview,type WeaponWorkbenchViewState}
 from './equipment-weapon-workbench.ts';
import type {WorkbenchSocket} from './equipment-weapon-workbench-layout.ts';
import {buildQuickLoadoutGroups,
 type QuickLoadoutGroup} from './ui/quick-loadout-groups.ts';
import {confirmFieldworkAction,promptFieldworkText} from './ui/fieldwork-controls.ts';
import {showFieldworkActionFeedback} from './ui/fieldwork-action-toast.ts';
import {createFieldGadgetEditor} from './ui/field-gadget-editor.ts';
import {initialFieldInventory,type FieldInventory} from './equipment-field-inventory.ts';
import {FieldInventoryUndoHistory} from './equipment-field-undo.ts';
import {CarryKitUndoHistory,captureCarryUndo} from './equipment-carry-undo.ts';
import {createLoadoutSquadRail} from './ui/loadout-squad-rail.ts';
import {createEquipmentWorkspace} from './ui/equipment-workspace.ts';
import type {LoadoutSlot} from './equipment-loadouts.ts';
import './ui/campaign-outfitter-gallery.css';
import './ui/ux-r1-sheets.css';
import type {OperationRecord} from './breach-operations.ts';

export type OperationsBoardHooks={
 carryMode?:'unified';
 board:HTMLElement;toggleButton:HTMLButtonElement;
 getSession:()=>Session;getRoster:()=>RosterState;setRoster:(value:RosterState)=>void;
 getMode:()=>CampaignMode;isReplaying:()=>boolean;
 saveRoster:()=>boolean;applyRoster:()=>void;refreshHud:()=>void;
 syncSheets:()=>void;history:()=>OperationRecord[];
 enterTrainingRange:()=>void;openStudio:(id:string)=>void;
 openArsenal:(id:string)=>void;showHelp:(message:string,duration:number)=>void;
};
export function createBreachOperationsBoardController(config:OperationsBoardHooks){
// One operator expanded at a time in the mobile preparation sheet.
let expandedQuickOperator:string|null=null;
let expandedQuickKit:string|null=null;
let expandedQuickLoadoutGroup:QuickLoadoutGroup='carry';
let quickBenchSlot:LoadoutSlot='primary';
let quickKitView:'equipment'|'carry'|'advanced'='equipment';
const equipmentWorkspace=createEquipmentWorkspace();
let expandedQuickWeapon:string|null=null;
/** Keep the intentional classic fallback open across part/weapon rerenders. */
const expandedClassicWeaponControls=new Set<string>();
let quickWorkbench:WeaponWorkbenchPreview|null=null;
let quickWorkbenchId:string|null=null;
let quickWorkbenchConfigKey:string|null=null;
let scrollToSelected=false;
const fieldUndo=new FieldInventoryUndoHistory();
const carryUndo=new CarryKitUndoHistory();
const selectedQuickWeaponSockets=new Map<string,WorkbenchSocket>();
const savedQuickWorkbenchViews=new Map<string,WeaponWorkbenchViewState>();
const resetQuickWorkbenchViews=new Set<string>();
function rememberQuickWorkbenchView(){
 if(!quickWorkbench||!quickWorkbenchId||
  resetQuickWorkbenchViews.has(quickWorkbenchId))return;
 const pose=quickWorkbench.getViewState();
 if(pose)savedQuickWorkbenchViews.set(quickWorkbenchId,pose);
}

function renderOperationsBoard(){
 equipmentWorkspace.beginRender();
 if(config.board.hidden){dispose();return;}
 let mountedKit=false;
 const priorScroll=scrollToSelected?0:config.board.scrollTop;
 scrollToSelected=false;
 // Rebuild HTML without throwing away the expensive weapon WebGL context.
 // syncWorkbench remounts it if the same operator keeps the bench open.
 rememberQuickWorkbenchView();
 config.board.replaceChildren();
 const heading=document.createElement('div');
 heading.className='fw-squad-sheet-header';
 const title=document.createElement('strong');
 title.textContent='SQUAD';heading.append(title);
 const close=document.createElement('button');
 close.type='button';close.textContent='CLOSE';
 close.addEventListener('click',()=>{
 config.board.hidden=true;dispose();config.syncSheets();config.toggleButton.focus();
});
 heading.append(close);
 const more=document.createElement('details');more.className='fw-squad-more';
 const moreLabel=document.createElement('summary');moreLabel.textContent='MORE';
 more.append(moreLabel);
 const range=document.createElement('button');range.type='button';
 range.textContent='TEST RANGE';range.title='Nonpersistent equipment range';
 range.addEventListener('click',()=>{
  if(config.getSession().phase!=='planning'||config.isReplaying())return;
  config.board.hidden=true;dispose();config.syncSheets();
  config.enterTrainingRange();
 });
 more.append(range);heading.append(more);config.board.append(heading);
 const history=config.history();
 const intro=document.createElement('p');
 intro.className='fw-squad-intro';
 intro.textContent=config.getRoster().members.length+' OPERATORS · FRESH GEAR EACH ROUND'+
  (history.length?' · LAST '+(history.at(-1)?.grade??'—'):'');
 config.board.append(intro);
 const members=config.getRoster().members;
 const selected=members.find(m=>m.id===expandedQuickOperator)??members[0];
 if(selected){
  expandedQuickOperator=selected.id;
  config.board.append(createLoadoutSquadRail(members.map(m=>({
   id:m.id,name:m.callsign.toUpperCase(),
   detail:rosterCatalogName(m.weaponConfiguration),
   status:m.id===selected.id?'SELECTED · '+rosterCatalogName(m.weaponConfiguration):
    rosterCatalogName(m.weaponConfiguration)
  })),selected.id,id=>{
   if(id===expandedQuickOperator)return;
   expandedQuickOperator=id;expandedQuickKit=id;quickKitView='equipment';
   expandedQuickWeapon=id;scrollToSelected=true;renderOperationsBoard();
  }));
 }
 for(const member of selected?[selected]:[]){
  const card=document.createElement('details');
  card.dataset.squadCard=member.id;
  card.className='fw-squad-card';
  card.dataset.operatorId=member.id;
  card.open=expandedQuickOperator===member.id;
  card.addEventListener('toggle',()=>{
   if(!card.isConnected||config.board.hidden)return;
   if(card.open){
    const wasSelected=expandedQuickOperator===member.id;
    expandedQuickOperator=member.id;
    if(!wasSelected){renderOperationsBoard();return;}
    for(const other of config.board.querySelectorAll<HTMLDetailsElement>(
     'details[data-squad-card]')){
     if(other!==card&&other.open)other.open=false;
    }
   }else if(expandedQuickOperator===member.id){
    expandedQuickOperator=null;dispose();
   }
  });
  const name=document.createElement('summary');
  const identity=document.createElement('strong');identity.textContent=member.callsign.toUpperCase();
  const status=document.createElement('small');status.textContent=rosterCatalogName(member.weaponConfiguration)+' · READY';
  name.append(identity,status);card.append(name);
  const details=document.createElement('p');
  details.className='fw-squad-summary';
  details.textContent=member.magazine+' / '+member.reserve+' RDS · '+
   member.magazines.length+' SPARE MAGS · FULL HEALTH';
  card.append(details);
  const actions=document.createElement('div');

  actions.className='fw-squad-actions';
  const loadoutAction=document.createElement('button');
  loadoutAction.type='button';loadoutAction.textContent='EQUIPMENT';
  loadoutAction.setAttribute('aria-label','Edit equipment for '+member.callsign);
  const toggleKit=()=>{
   const opening=expandedQuickKit!==member.id;
   expandedQuickKit=opening?member.id:null;
   if(opening)quickKitView='equipment';
   else{
    // Closing the bench frees its WebGL context rather than leaving an idle
    // renderer attached to a detached operator preview.
    equipmentWorkspace.releasePreview();
   }
   renderOperationsBoard();
  };
  loadoutAction.addEventListener('click',toggleKit);
  const look=document.createElement('button');
  look.type='button';look.textContent='APPEARANCE';
  look.setAttribute('aria-label','Customize '+member.callsign+' in Operator Studio');
  look.addEventListener('click',()=>{
   config.board.hidden=true;dispose();config.syncSheets();
   config.openStudio(member.id);
  });
  const rename=document.createElement('button');
  rename.type='button';rename.textContent='CALLSIGN';
  rename.addEventListener('click',async()=>{
   if(config.getSession().phase!=='planning'||config.isReplaying())return;
   const next=await promptFieldworkText({
    title:'EDIT CALLSIGN',value:member.callsign,
    label:'CALLSIGN',maxLength:24,confirmLabel:'SAVE NAME'});
   if(next===null||config.getSession().phase!=='planning'||config.isReplaying())return;
   config.setRoster(renameRosterMember(config.getRoster(),member.id,next));
   const saved=config.saveRoster();config.applyRoster();
   if(saved)showFieldworkActionFeedback('CALLSIGN UPDATED · '+next.toUpperCase());
   renderOperationsBoard();config.refreshHud();
  });
  actions.append(loadoutAction,look,rename);
  card.append(actions);
  const kit=document.createElement('details');
  kit.open=expandedQuickKit===member.id;
  kit.addEventListener('toggle',()=>{if(!kit.isConnected||config.board.hidden)return;
   if(kit.open)expandedQuickKit=member.id;
   else if(expandedQuickKit===member.id)expandedQuickKit=null;});
  const kitTitle=document.createElement('summary');
  kitTitle.textContent='LOADOUT · '+rosterCatalogName(member.weaponConfiguration);
  kitTitle.addEventListener('click',event=>{event.preventDefault();toggleKit();});
  kit.append(kitTitle);
  // Keep closed kit lightweight: only mount the shared editor on demand.
  if(!kit.open){card.append(kit);config.board.append(card);continue;}
  mountedKit=true;
  const previewHost=document.createElement('div');
  previewHost.className='fw-prep-operator-viewer';
  previewHost.hidden=false;
  previewHost.setAttribute('aria-label','Rotatable 3D operator and carried equipment');
  const modelStage=document.createElement('div');
  modelStage.className='fw-quick-board-model-stage';
  modelStage.append(previewHost);kit.append(modelStage);
  const renderKitPreview=()=>equipmentWorkspace.mountPreview(previewHost,member);
  // The shared bench explicitly initializes its one preview after mounting.
  const advancedPanel=document.createElement('details');
  advancedPanel.className='fw-quick-board-advanced';
  advancedPanel.open=quickKitView==='advanced';
  const advancedTitle=document.createElement('summary');
  advancedTitle.textContent='ADVANCED · WEAPON WORKBENCH & DIAGNOSTICS';
  const legacyHost=document.createElement('div');
  legacyHost.className='fw-quick-board-legacy';
  advancedPanel.append(advancedTitle,legacyHost);kit.append(advancedPanel);
  const loadout=buildQuickLoadoutGroups(legacyHost,expandedQuickLoadoutGroup,group=>{
   expandedQuickLoadoutGroup=group;
  });
  // Arsenal is the primary builder. Direct factory and socket controls remain
  // behind one accessible fallback for class-only or unsupported weapons.
  const modelHint=document.createElement('small');
  modelHint.className='fw-weapon-section-label';
  modelHint.textContent='WEAPON · ARSENAL';
  loadout.field('weapon').append(modelHint);
  const arsenalAction=document.createElement('button');arsenalAction.type='button';
  arsenalAction.className='fw-button fw-arsenal-open';
  arsenalAction.textContent='OPEN ARSENAL · FULL WORKBENCH';
  arsenalAction.disabled=config.getSession().phase!=='planning'||config.isReplaying()||
   !member.weaponConfiguration.build;
  arsenalAction.addEventListener('click',()=>{void config.openArsenal(member.id);});
  loadout.field('weapon').append(arsenalAction);
  const legacyControls=document.createElement('details');
  legacyControls.className='fw-legacy-weapon-controls';
  legacyControls.open=!member.weaponConfiguration.build||
   expandedClassicWeaponControls.has(member.id);
  const legacyTitle=document.createElement('summary');
  legacyTitle.textContent='ADVANCED · CLASSIC WEAPON CONTROLS';
  const legacyNote=document.createElement('p');legacyNote.className='fw-weapon-helper';
  legacyNote.textContent='Direct factory and socket options for unsupported builds or troubleshooting.';
  legacyControls.append(legacyTitle,legacyNote);
  const activePreset=member.weaponConfiguration.build?
   matchingFamilyPreset(member.weaponConfiguration.build):undefined;
  const factoryLabel=document.createElement('strong');
  factoryLabel.className='fw-weapon-section-label';
  factoryLabel.textContent='3D WEAPON MODEL';
  const factoryBrowser=createWeaponPresetBrowser({
   selectedId:activePreset?.id,
   selectedFamily:member.weaponConfiguration.build?.family,
   onSelect:presetId=>{
    if(config.getSession().phase!=='planning'||config.isReplaying())return;
    const preset=familyPreset(presetId);if(!preset)return;
    const next=equipRosterCatalogPreset(config.getRoster(),member.id,presetId);
    const selected=next.members.find(m=>m.id===member.id);
    if(!selected?.weaponConfiguration.build)return;
    config.setRoster(next);
    selectedQuickWeaponSockets.delete(member.id);
    savedQuickWorkbenchViews.delete(member.id);resetQuickWorkbenchViews.add(member.id);
    config.saveRoster();config.applyRoster();
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    expandedQuickLoadoutGroup='weapon';renderOperationsBoard();config.refreshHud();
   }
  });
  legacyControls.append(factoryLabel,factoryBrowser);
  const resupply=document.createElement('button');resupply.type='button';
  resupply.className='fw-squad-resupply';resupply.textContent='RESUPPLY';
  resupply.addEventListener('click',()=>{
   if(config.getSession().phase!=='planning'||config.isReplaying())return;
   config.setRoster(resupplyRoster(config.getRoster(),member.id));
   config.saveRoster();config.applyRoster();
   expandedQuickKit=member.id;expandedQuickLoadoutGroup='weapon';
   renderOperationsBoard();config.refreshHud();
  });
  loadout.field('weapon').append(resupply);
  const carryUndoButton=document.createElement('button');
  carryUndoButton.type='button';carryUndoButton.className='fw-carry-undo-action';
  carryUndoButton.textContent='UNDO LAST CARRY MOVE';
  carryUndoButton.setAttribute('aria-label','Undo last physical carry move');
  const canUndoCarry=(operator:typeof member)=>{
   const quote=carryUndo.peek(operator.id,
    captureCarryUndo(operator.loadout,operator.magazines),config.carryMode==='unified'?operator:undefined);
   return quote.ok;
  };
  carryUndoButton.disabled=!canUndoCarry(member)||
   config.getSession().phase!=='planning'||config.isReplaying();
  carryUndoButton.addEventListener('click',()=>{
   if(config.getSession().phase!=='planning'||config.isReplaying())return;
   const old=config.getRoster();
   const current=old.members.find(m=>m.id===member.id);
   if(!current)return;
   const expected=captureCarryUndo(current.loadout,current.magazines);
   const undo=carryUndo.peek(member.id,expected,config.carryMode==='unified'?current:undefined);
   if(!undo.ok){showFieldworkActionFeedback(undo.reason);return;}
   const restored=undoRosterCarryGear(old,member.id,expected,undo.restore,config.carryMode);
   if(restored===old){showFieldworkActionFeedback('CARRY UNDO REJECTED · KIT CHANGED');return;}
   carryUndo.clear(member.id);
   config.setRoster(restored);config.saveRoster();config.applyRoster();
   expandedQuickKit=member.id;renderOperationsBoard();config.refreshHud();
   showFieldworkActionFeedback('LAST PHYSICAL CARRY MOVE UNDONE');
  });
  const carryPanel=document.createElement('section');
  carryPanel.className='fw-quick-board-carry';
  carryPanel.hidden=quickKitView!=='carry';
  const carryBack=document.createElement('button');
  carryBack.type='button';carryBack.className='fw-quick-board-return';
  carryBack.textContent='‹ BACK TO EQUIPMENT';
  carryBack.addEventListener('click',()=>{
   quickKitView='equipment';carryPanel.hidden=true;galleryHost.hidden=false;
  });
  carryPanel.append(carryBack,carryUndoButton);kit.append(carryPanel);
  const fieldHost=carryPanel;
  const renderField=(current:typeof member)=>{
   const commitField=(inventory:FieldInventory,undo=false,preferredFocus?:string)=>{
    const previousFocus=preferredFocus??(document.activeElement instanceof HTMLElement?
     document.activeElement.getAttribute('aria-label'):null);
    const prior=config.getRoster();
    const next=equipRosterFieldInventory(prior,current.id,inventory,config.carryMode);
    if(next===prior)return;
    const before=prior.members.find(m=>m.id===current.id);
    const changed=next.members.find(m=>m.id===current.id);
    if(before&&changed){
     if(undo)fieldUndo.clear(current.id);
     else fieldUndo.record(current.id,
      before.loadout.fieldInventory??initialFieldInventory(before.loadout),
      changed.loadout.fieldInventory??initialFieldInventory(changed.loadout));
    }
    config.setRoster(next);
    carryUndoButton.disabled=true;
    config.saveRoster();config.applyRoster();
    if(changed){
     renderField(changed);
     equipmentWorkspace.preview?.updateEquipment(changed.weapon,changed.appearanceSeed,
      changed.loadout,changed.weaponConfiguration,changed.magazines,changed.wardrobe);
    }
    if(previousFocus){
     const matched=Array.from(fieldHost.querySelectorAll<HTMLElement>(
      'button[aria-label],select[aria-label]')).find(el=>
       el.getAttribute('aria-label')===previousFocus&&
       !((el as HTMLButtonElement|HTMLSelectElement).disabled));
     matched?.focus({preventScroll:true});
    }
    config.refreshHud();
   };
   const editor=createFieldGadgetEditor({
    loadout:current.loadout,magazines:current.magazines,
    automatic:config.carryMode==='unified'?current:undefined,
    onInspectLocation:location=>equipmentWorkspace.preview?.highlightCarryLocation(location),
   onInspectItem:item=>equipmentWorkspace.preview?.inspectCarryItem(item),
   onModelThumbnail:item=>equipmentWorkspace.preview?.renderModelThumbnail(item)??null,
    onMoveMagazine:(magazineId,to,focusLabel)=>{
     if(config.getSession().phase!=='planning'||config.isReplaying())return;
     const prior=config.getRoster();
     const next=moveRosterMagazine(prior,current.id,magazineId,to);
     if(next===prior)return;
     const before=prior.members.find(m=>m.id===current.id);
     const changed=next.members.find(m=>m.id===current.id);
     if(before&&changed)carryUndo.record(current.id,
      captureCarryUndo(before.loadout,before.magazines),
      captureCarryUndo(changed.loadout,changed.magazines));
     config.setRoster(next);config.saveRoster();config.applyRoster();
     carryUndoButton.disabled=changed?!canUndoCarry(changed):true;
     if(changed){
      renderField(changed);
      equipmentWorkspace.preview?.updateEquipment(changed.weapon,changed.appearanceSeed,
       changed.loadout,changed.weaponConfiguration,changed.magazines,changed.wardrobe);
      if(focusLabel){
       Array.from(fieldHost.querySelectorAll<HTMLElement>('button[aria-label]'))
        .find(el=>el.getAttribute('aria-label')===focusLabel)
        ?.focus({preventScroll:true});
      }
     }
     config.refreshHud();
    },
    locked:config.getSession().phase!=='planning'||config.isReplaying(),
    copyTargets:config.getRoster().members.filter(m=>m.id!==current.id)
     .map(m=>({id:m.id,name:m.callsign,loadout:m.loadout,magazines:m.magazines})),
    onCopyLayout:targetId=>{
     if(config.getSession().phase!=='planning'||config.isReplaying())return;
     const before=config.getRoster();
     const next=copyRosterCarryLayout(before,current.id,targetId,config.carryMode);
     if(next===before){showFieldworkActionFeedback('CANNOT COPY LAYOUT · CHECK CARRY FIT');return;}
     const old=before.members.find(m=>m.id===targetId);
     const updated=next.members.find(m=>m.id===targetId);
     if(old&&updated)carryUndo.record(targetId,
      captureCarryUndo(old.loadout,old.magazines),
      captureCarryUndo(updated.loadout,updated.magazines));
     config.setRoster(next);config.saveRoster();config.applyRoster();
     renderOperationsBoard();config.refreshHud();
     showFieldworkActionFeedback('CARRY LAYOUT COPIED · POSITIONS ONLY');
    },
    onCopy:(targetId,inventory)=>{
     const before=config.getRoster();
     const next=equipRosterFieldInventory(before,targetId,inventory,config.carryMode);
     if(next===before)return;
     const prior=before.members.find(m=>m.id===targetId);
     const target=next.members.find(m=>m.id===targetId);
     if(prior&&target)fieldUndo.record(targetId,
      prior.loadout.fieldInventory??initialFieldInventory(prior.loadout),
      target.loadout.fieldInventory??initialFieldInventory(target.loadout));
     config.setRoster(next);config.saveRoster();config.applyRoster();
     if(target)showFieldworkActionFeedback('GADGETS COPIED · '+target.callsign.toUpperCase());
     config.refreshHud();
    },
    canUndo:!!fieldUndo.peek(current.id,
     current.loadout.fieldInventory??initialFieldInventory(current.loadout)),
    onUndo:()=>{
     const previous=fieldUndo.peek(current.id,
      current.loadout.fieldInventory??initialFieldInventory(current.loadout));
     if(previous)commitField(previous,true);
    },
    onCommit:(inventory,focusLabel)=>commitField(inventory,false,focusLabel)
   });
   const old=fieldHost.querySelector('.fw-field-inventory');
   if(old)old.replaceWith(editor);else fieldHost.append(editor);
  };
  renderField(member);
  // Factory body furniture and rail accessories share one spatial workbench.
  const weaponEditor=document.createElement('details');
  weaponEditor.className='fw-weapon-editor';
  weaponEditor.open=expandedQuickWeapon===member.id;
  const socketRows=new Map<WorkbenchSocket,HTMLElement>();
  const workbenchHost=document.createElement('div');
  workbenchHost.style.cssText='min-width:0;max-width:100%;width:100%;margin:8px 0';
  const socketPanel=document.createElement('div');
  socketPanel.className='fw-weapon-socket-panel';
  const socketHeading=document.createElement('strong');
  socketHeading.className='fw-weapon-section-label';
  const socketNote=document.createElement('p');
  socketNote.className='fw-weapon-helper';
  socketNote.textContent='Tap a white dot on the weapon to edit this part.';
  socketPanel.append(socketHeading,socketNote);
  socketPanel.hidden=true; // Selects remain authoritative but choices live beside the model.
  const initialSocket:WorkbenchSocket=member.weaponConfiguration.build?'body-receiver':'optic';
  let selectedSocket:WorkbenchSocket=
   selectedQuickWeaponSockets.get(member.id)??initialSocket;
  const showSocket=(slot:WorkbenchSocket)=>{
   const select=socketRows.get(slot)?.querySelector<HTMLSelectElement>('select');
   if(!select)return;
   selectedSocket=slot;
   selectedQuickWeaponSockets.set(member.id,slot);
   quickWorkbench?.showSocketChoices(slot,select);
  };
  const syncWorkbench=()=>{
   // A detached prior UI may emit a delayed <details> toggle event. It must
   // not dispose or reparent the current operator's live WebGL context.
   if(!kit.isConnected)return;
   if(config.board.hidden||!card.open)return;
   const active=kit.open&&advancedPanel.open&&loadout.group.weapon.open&&
    legacyControls.open&&weaponEditor.open;
   if(!active){if(quickWorkbenchId===member.id){
    rememberQuickWorkbenchView();
    quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
    quickWorkbenchConfigKey=null;
   }return;}
   const visualKey=JSON.stringify(member.weaponConfiguration);
   const view=resetQuickWorkbenchViews.has(member.id)?
    null:savedQuickWorkbenchViews.get(member.id);
   let rebuiltGeometry=false;
   if(quickWorkbench&&quickWorkbenchId===member.id){
    quickWorkbench.attachHost(workbenchHost,slot=>showSocket(slot));
    // Rebind accessory choice callbacks to the newly constructed selects
    // even if geometry is identical; old selects are detached after refresh.
    if(visualKey!==quickWorkbenchConfigKey){
     quickWorkbench.setConfiguration(member.weaponConfiguration);
     quickWorkbenchConfigKey=visualKey;
     rebuiltGeometry=true;
    }
   }else{
    rememberQuickWorkbenchView();
    quickWorkbench?.dispose();quickWorkbench=null;
    quickWorkbenchId=member.id;
    quickWorkbench=new WeaponWorkbenchPreview(workbenchHost,
     member.weaponConfiguration,slot=>showSocket(slot));
    quickWorkbenchConfigKey=visualKey;
    rebuiltGeometry=true;
   }
   // A spurious disclosure toggle must not reset orbit after a user drag.
   if(rebuiltGeometry&&view)quickWorkbench.restoreViewState(view);
   resetQuickWorkbenchViews.delete(member.id);
   const saved=selectedQuickWeaponSockets.get(member.id);
   if(saved&&socketRows.has(saved))showSocket(saved);
   else quickWorkbench.setActiveSlot(initialSocket,false);
  };
  legacyControls.addEventListener('toggle',()=>{
   if(legacyControls.open)expandedClassicWeaponControls.add(member.id);
   else expandedClassicWeaponControls.delete(member.id);
   syncWorkbench();
  });
  weaponEditor.addEventListener('toggle',()=>{
   if(weaponEditor.open)expandedQuickWeapon=member.id;
   else if(expandedQuickWeapon===member.id)expandedQuickWeapon=null;
   syncWorkbench();
  });
  kit.addEventListener('toggle',syncWorkbench);
  advancedPanel.addEventListener('toggle',syncWorkbench);
  loadout.group.weapon.addEventListener('toggle',syncWorkbench);
  const weaponTitle=document.createElement('summary');
  weaponTitle.textContent='WEAPON WORKBENCH · TAP PART TO EDIT';
  weaponEditor.append(weaponTitle,workbenchHost,socketPanel);
  for(const slot of WEAPON_ATTACHMENT_SLOTS){
   if(member.weaponConfiguration.build&&slot==='stock')continue;
   const row=document.createElement('label');
   row.className='fw-weapon-socket-row';
   const label=document.createElement('span');label.textContent=slot.toUpperCase();
   const select=document.createElement('select');
   select.setAttribute('aria-label',slot+' attachment for '+member.callsign);
   for(const part of Object.values(WEAPON_ATTACHMENTS)){
    if(part.slot!==slot||!weaponAttachmentAllowed(
     member.weaponConfiguration,slot,part.id))continue;
    const option=document.createElement('option');
    option.value=part.id;option.textContent=part.name;select.append(option);
   }
   select.value=member.weaponConfiguration.slots[slot];
   select.disabled=config.getSession().phase!=='planning'||config.isReplaying();
   select.addEventListener('focus',()=>quickWorkbenchId===member.id&&
    quickWorkbench?.setActiveSlot(slot));
   select.addEventListener('change',()=>{
    if(config.getSession().phase!=='planning'||config.isReplaying())return;
    config.setRoster(configureRosterWeapon(config.getRoster(),member.id,slot,select.value));
    config.saveRoster();config.applyRoster();
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    expandedQuickLoadoutGroup='weapon';renderOperationsBoard();config.refreshHud();
   });
   row.append(label,select);row.hidden=slot!==initialSocket;
   socketRows.set(slot,row);socketPanel.append(row);
  }
  const build=member.weaponConfiguration.build;
  if(build)for(const slot of FAMILY_PART_SLOTS){
   const socket=('body-'+slot) as WorkbenchSocket;
   const row=document.createElement('label');
   row.className='fw-weapon-socket-row';
   const label=document.createElement('span');label.textContent=slot.toUpperCase();
   const select=document.createElement('select');
   select.setAttribute('aria-label',slot+' body part for '+member.callsign);
   const length=FAMILY_PARTS[build.parts.barrel]?.length;
   for(const part of Object.values(FAMILY_PARTS)){
    if(part.slot!==slot)continue;
     if(part.id==='fnc-mag30'&&build.parts[slot]!=='fnc-mag30')continue;
     if(part.family!==build.family&&!(slot==='magazine'&&
      build.family==='fnc'&&part.family==='ar'))continue;
    const receiver=slot==='receiver'?part.id:build.parts.receiver;
    if(!compatibleFamilyPart(receiver,slot,part.id,member.weapon,length))continue;
    const option=document.createElement('option');
    option.value=part.id;option.textContent=part.name;select.append(option);
   }
   select.value=build.parts[slot];
   select.disabled=config.getSession().phase!=='planning'||config.isReplaying();
   select.addEventListener('focus',()=>quickWorkbenchId===member.id&&
    quickWorkbench?.setActiveSlot(socket));
   select.addEventListener('change',async()=>{
    if(config.getSession().phase!=='planning'||config.isReplaying())return;
    const proposal=proposeFamilyPartChange(build,member.weapon,
     slot as FamilyPartSlot,select.value);
    if(!proposal.valid){select.value=build.parts[slot];return;}
    const dependent=proposal.replacements.filter(x=>x.slot!==slot);
    if(dependent.length){
     if(!await confirmFieldworkAction({
      title:'Replace incompatible parts?',
      message:'Changing '+slot+' will also replace: '+
       dependent.map(x=>FAMILY_PARTS[x.from]?.name+' → '+
        FAMILY_PARTS[x.to]?.name).join('; '),
      confirmLabel:'APPLY CHANGES'
     })){select.value=build.parts[slot];return;}
    }
    if(slot==='receiver'||slot==='barrel')
     resetQuickWorkbenchViews.add(member.id);
    config.setRoster(configureRosterWeaponBodyPart(config.getRoster(),member.id,
     slot as FamilyPartSlot,select.value));
    config.saveRoster();config.applyRoster();
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    expandedQuickLoadoutGroup='weapon';renderOperationsBoard();config.refreshHud();
   });
   row.append(label,select);row.hidden=socket!==initialSocket;
   socketRows.set(socket,row);socketPanel.append(row);
  }
  if(!socketRows.has(selectedSocket)){
   selectedQuickWeaponSockets.delete(member.id);
   selectedSocket=initialSocket;
  }
  const measured=resolveWeaponAssembly(member.weaponConfiguration);
  const properties=document.createElement('p');
  properties.style.cssText='font-size:10px;opacity:.75;line-height:1.55';
  properties.textContent='ASSEMBLED MASS '+measured.massKg.toFixed(2)+' KG · BALANCE '+
   measured.balanceX.toFixed(1)+' · MUZZLE EXTENSION '+
   (measured.muzzleX-19.5).toFixed(1)+' UNITS';
  const diag=document.createElement('details');diag.className='fw-loadout-diagnostics';
  const diagTitle=document.createElement('summary');diagTitle.textContent='WEAPON MEASUREMENTS';
  diag.append(diagTitle,properties);weaponEditor.append(diag);
  legacyControls.append(weaponEditor);
  loadout.field('weapon').append(legacyControls);
  const carrying=carryCapacityReport(member.loadout,member.magazines);
  const carryItems=carrying.placements.filter(p=>p.kind!=='magazine');
  if(carryItems.length){
   const note=document.createElement('p');
   note.style.cssText='font-size:10px;opacity:.78;margin:10px 0';
   note.textContent='PHYSICAL CARRY · '+carryItems.map(p=>
    p.kind.toUpperCase()+' '+p.location.toUpperCase()+' / '+
    p.accessSeconds.toFixed(2)+'s').join(' · ');
   const carryDetails=document.createElement('details');carryDetails.className='fw-loadout-diagnostics';
   const summary=document.createElement('summary');summary.textContent='CARRY TIMINGS';
   carryDetails.append(summary,note);loadout.field('carry').append(carryDetails);
  }
  const carried=member.weapon==='shotgun'?[]:
   stageMagazines(member.magazines,member.loadout);
  if(carried.length){
   const heading=document.createElement('strong');
   heading.textContent='MAGAZINE LOCATIONS';
   heading.style.cssText='display:block;font-size:11px;margin:14px 0 6px';
   const magSection=document.createElement('details');magSection.className='fw-loadout-diagnostics';
   const magTitle=document.createElement('summary');magTitle.textContent='MAGAZINE LOCATIONS';
   magSection.append(magTitle);
   const capacity=magazineSpace(member.loadout);
   const where:MagazineLocation[]=['rig','belt','pocket','backpack','overflow'];
   for(const [index,mag] of carried.entries()){
    const row=document.createElement('label');
    row.style.cssText='display:flex;justify-content:space-between;gap:8px;align-items:center;margin:8px 0';
    const label=document.createElement('span');
    label.textContent='MAG '+(index+1)+' · '+mag.rounds+' RDS';
    label.style.fontSize='10px';row.append(label);
    const select=document.createElement('select');
    select.setAttribute('aria-label','Magazine '+(index+1)+' location for '+member.callsign);
    select.style.cssText='max-width:65%;min-height:40px;touch-action:manipulation;background:#243530;color:#e5e9d8;border-radius:7px;padding:6px';
    for(const loc of where){
     const option=document.createElement('option');option.value=loc;
     option.textContent=loc.toUpperCase();
     option.disabled=loc!=='overflow'&&loc!==mag.location&&
      carried.filter(m=>m.location===loc).length>=capacity[loc];
     select.append(option);
    }
    select.value=mag.location;
    select.addEventListener('change',()=>{
     if(config.getSession().phase!=='planning'||config.isReplaying())return;
     config.setRoster(moveRosterMagazine(config.getRoster(),member.id,
      mag.id,select.value as MagazineLocation));
     config.saveRoster();config.applyRoster();
     expandedQuickKit=member.id;renderOperationsBoard();config.refreshHud();
    });
    row.className='fw-equipment-choice';row.append(select);magSection.append(row);
   }
   loadout.field('carry').append(magSection);
  }
  // This is the same shared R5 equipment gallery used by Campaign Armory
  // and Quick Play mission setup. No second equipment choice implementation.
  const galleryHost=document.createElement('div');
  galleryHost.className='fw-quick-board-gallery';
  galleryHost.hidden=quickKitView!=='equipment';
  const sources=catalogOutfitterSources(member.loadout,member.weaponConfiguration);
  let showGallery:(slot:LoadoutSlot)=>void=()=>{};
  const zones=createOutfitterZoneNav({
   navClass:'fw-quick-board-zones',
   buttonClass:'fw-quick-board-zone',
   selected:quickBenchSlot,
   onSelect:slot=>{
    quickBenchSlot=slot;
    showGallery(slot);
    equipmentWorkspace.preview?.clearTransientSelection();
    equipmentWorkspace.preview?.setSelectedSlot(slot);
    equipmentWorkspace.preview?.focusOn(previewFocusForOutfitterSlot(slot));
   }
  });
  const selectZone=zones.select;
  modelStage.append(zones.nav);
  const clothing=document.createElement('button');
  clothing.type='button';clothing.className='fw-quick-board-clothing';
  clothing.textContent='CLOTHING';clothing.addEventListener('click',()=>selectZone('top'));
  galleryHost.append(clothing);
  const editable=config.getSession().phase==='planning'&&!config.isReplaying();
  const gallery=equipmentWorkspace.mountGallery(member.id,{
   host:galleryHost,sources,kit:member.loadout,magazines:member.magazines,
   locked:!editable,
   renderModel:(slot,itemId)=>equipmentWorkspace.preview?.renderModelThumbnailAsync(
    catalogOutfitterThumbnailTarget(member.loadout,member.weaponConfiguration,slot,itemId))??null,
   onEquip:(slot,itemId)=>{
    if(config.getSession().phase!=='planning'||config.isReplaying())return;
    const before=config.getRoster();
    let after=before;
    if(slot==='primary'){
     after=equipRosterCatalogPreset(before,member.id,itemId);
    }else if(slot==='rig'||slot==='belt'||slot==='backpack'){
     after=equipRosterCarryGear(before,member.id,slot,itemId,config.carryMode);
     const old=before.members.find(m=>m.id===member.id);
     const changed=after.members.find(m=>m.id===member.id);
     if(after!==before&&old&&changed)carryUndo.record(member.id,
      captureCarryUndo(old.loadout,old.magazines),
      captureCarryUndo(changed.loadout,changed.magazines));
    }else after=equipRosterGear(before,member.id,slot,itemId,config.carryMode);
    if(after===before){
     showFieldworkActionFeedback('EQUIPMENT CHANGE UNAVAILABLE');
     return;
    }
    config.setRoster(after);config.saveRoster();config.applyRoster();
    expandedQuickKit=member.id;quickKitView='equipment';
    renderOperationsBoard();config.refreshHud();
   },
   onArsenal:()=>{if(!arsenalAction.disabled)config.openArsenal(member.id);},
   arsenalDisabled:arsenalAction.disabled,
   onSelectCategory:selectZone,
   onInspect:(slot,itemId)=>equipmentWorkspace.preview?.selectItemDot(
    itemId?{kind:'gear',slot,itemId:slot==='primary'?member.loadout.slots.primary:itemId}:null),
   onAdvanced:()=>{
    quickKitView='carry';galleryHost.hidden=true;carryPanel.hidden=false;
    advancedPanel.open=false;
   }
  });
  showGallery=gallery.show;
  kit.insertBefore(galleryHost,advancedPanel);
  // Keep carry contents in the gallery's place, not below the advanced
  // workbench disclosure where it would require an extra vertical scroll.
  kit.insertBefore(carryPanel,advancedPanel);
  advancedPanel.addEventListener('toggle',()=>{
   if(!kit.isConnected||config.board.hidden)return;
   if(advancedPanel.open){
    quickKitView='advanced';galleryHost.hidden=true;carryPanel.hidden=true;
   }else if(quickKitView==='advanced'){
    quickKitView='equipment';galleryHost.hidden=false;
   }
  });
  selectZone(quickBenchSlot);
  card.append(kit);config.board.append(card);
  equipmentWorkspace.deferPreviewMount(
   ()=>kit.isConnected&&card.open&&kit.open&&!previewHost.hidden&&!config.board.hidden,
   ()=>{
    const preview=renderKitPreview();
    preview.setOnTapSlot(selectZone);
    preview.setSelectedSlot(quickBenchSlot);
   });

  // A newly opened details subtree can report zero width on iOS until
  // it is attached and laid out. Initialize after paint, not only on toggle.
  if(kit.open&&advancedPanel.open&&loadout.group.weapon.open&&legacyControls.open&&weaponEditor.open)
   requestAnimationFrame(()=>{if(kit.isConnected)syncWorkbench();});
  else if(quickWorkbench){
   // A closed editor does not hold onto an idle WebGL context.
   rememberQuickWorkbenchView();
   quickWorkbench.dispose();quickWorkbench=null;quickWorkbenchId=null;
   quickWorkbenchConfigKey=null;
  }
 }
 if(!mountedKit)dispose();
 const hint=document.createElement('p');
 hint.textContent='Select an operator to edit. Close to resume planning.';
 config.board.append(hint);
 config.board.scrollTop=priorScroll;
}

 function onQuickApplied(id:string):void{
   expandedQuickKit=id;expandedQuickWeapon=id;
   expandedQuickLoadoutGroup='weapon';
   renderOperationsBoard();
 }
 function dispose():void{
   rememberQuickWorkbenchView();
   quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
   quickWorkbenchConfigKey=null;
   equipmentWorkspace.dispose();
 }
 function syncVisibility():void{if(config.board.hidden)dispose();}
 return {render:renderOperationsBoard,onQuickApplied,dispose,syncVisibility};
}
