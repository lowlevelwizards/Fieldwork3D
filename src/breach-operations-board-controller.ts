/** Stage 10e: Quick Play squad board & equipment presentation.
 * No separate roster/mission persistence is held by this UI controller.
 */
import type {Session} from './breach-game.ts';
import {resupplyRoster,equipRoster,equipRosterGear,moveRosterMagazine,
 configureRosterWeapon,configureRosterWeaponPreset,configureRosterWeaponBodyPart,
 renameRosterMember,type RosterState} from './breach-roster.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 weaponAttachmentAllowed} from './equipment-weapon-assemblies.ts';
import {FAMILY_PART_SLOTS,FAMILY_PARTS,matchingFamilyPreset,compatibleFamilyPart,
 familyPreset,proposeFamilyPartChange,type FamilyPartSlot}
 from './equipment-weapon-families.ts';
import {createWeaponPresetBrowser} from './ui/weapon-preset-browser.ts';
import {LOADOUT_SLOTS,itemsForSlot} from './equipment-catalog.ts';
import {carryCapacityReport} from './equipment-carry-placement.ts';
import {stageMagazines,magazineSpace,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {WeaponWorkbenchPreview,type WeaponWorkbenchViewState}
 from './equipment-weapon-workbench.ts';
import type {WorkbenchSocket} from './equipment-weapon-workbench-layout.ts';
import {buildQuickLoadoutGroups,loadoutGroupForSlot,
 type QuickLoadoutGroup} from './ui/quick-loadout-groups.ts';
import {confirmFieldworkAction,promptFieldworkText} from './ui/fieldwork-controls.ts';
import {showFieldworkActionFeedback} from './ui/fieldwork-action-toast.ts';
import type {OperationRecord} from './breach-operations.ts';
type CampaignMode='menu'|'home'|'mission'|'quick';
export type OperationsBoardHooks={
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
let expandedQuickLoadoutGroup:QuickLoadoutGroup='weapon';
let expandedQuickWeapon:string|null=null;
/** Keep the intentional classic fallback open across part/weapon rerenders. */
const expandedClassicWeaponControls=new Set<string>();
let quickWorkbench:WeaponWorkbenchPreview|null=null;
let quickWorkbenchId:string|null=null;
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
 const priorScroll=config.board.scrollTop;
 rememberQuickWorkbenchView();
 quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
 config.board.replaceChildren();
 const heading=document.createElement('div');
 heading.className='fw-squad-sheet-header';
 const title=document.createElement('strong');
 title.textContent='SQUAD';heading.append(title);
 const close=document.createElement('button');
 close.type='button';close.textContent='CLOSE';
 close.addEventListener('click',()=>{
 config.board.hidden=true;config.syncSheets();config.toggleButton.focus();
});
 heading.append(close);
 const more=document.createElement('details');more.className='fw-squad-more';
 const moreLabel=document.createElement('summary');moreLabel.textContent='MORE';
 more.append(moreLabel);
 const range=document.createElement('button');range.type='button';
 range.textContent='TEST RANGE';range.title='Nonpersistent equipment range';
 range.addEventListener('click',()=>{
  if(config.getSession().phase!=='planning'||config.isReplaying())return;
  config.board.hidden=true;config.syncSheets();
  config.enterTrainingRange();
 });
 more.append(range);heading.append(more);config.board.append(heading);
 const history=config.history();
 const intro=document.createElement('p');
 intro.className='fw-squad-intro';
 intro.textContent=config.getRoster().members.length+' OPERATORS · FRESH GEAR EACH ROUND'+
  (history.length?' · LAST '+(history.at(-1)?.grade??'—'):'');
 config.board.append(intro);
 for(const member of config.getRoster().members){
  const card=document.createElement('details');
  card.dataset.squadCard=member.id;
  card.className='fw-squad-card';
  card.dataset.operatorId=member.id;
  card.open=expandedQuickOperator===member.id;
  card.addEventListener('toggle',()=>{
   if(card.open){
    expandedQuickOperator=member.id;
    for(const other of config.board.querySelectorAll<HTMLDetailsElement>(
     'details[data-squad-card]')){
     if(other!==card&&other.open)other.open=false;
    }
   }else if(expandedQuickOperator===member.id)expandedQuickOperator=null;
  });
  const name=document.createElement('summary');
  const identity=document.createElement('strong');identity.textContent=member.callsign.toUpperCase();
  const status=document.createElement('small');status.textContent=member.weapon.toUpperCase()+' · READY';
  name.append(identity,status);card.append(name);
  const details=document.createElement('p');
  details.className='fw-squad-summary';
  details.textContent=member.magazine+' / '+member.reserve+' RDS · '+
   member.magazines.length+' SPARE MAGS · FULL HEALTH';
  card.append(details);
  const actions=document.createElement('div');

  actions.className='fw-squad-actions';
  const loadoutAction=document.createElement('button');
  loadoutAction.type='button';loadoutAction.textContent='LOADOUT';
  loadoutAction.setAttribute('aria-label','Edit equipment for '+member.callsign);
  loadoutAction.addEventListener('click',()=>{
   const opening=!kit.open;kit.open=opening;
   expandedQuickKit=opening?member.id:null;
   if(opening){expandedQuickWeapon=member.id;weaponEditor.open=true;}
   if(opening)kit.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
  const look=document.createElement('button');
  look.type='button';look.textContent='APPEARANCE';
  look.setAttribute('aria-label','Customize '+member.callsign+' in Operator Studio');
  look.addEventListener('click',()=>{
   config.board.hidden=true;config.syncSheets();
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
  kit.addEventListener('toggle',()=>{if(kit.open)expandedQuickKit=member.id;
   else if(expandedQuickKit===member.id)expandedQuickKit=null;});
  const kitTitle=document.createElement('summary');
  kitTitle.textContent='LOADOUT · '+member.weapon.toUpperCase();
  kit.append(kitTitle);
  const loadout=buildQuickLoadoutGroups(kit,expandedQuickLoadoutGroup,group=>{
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
    let next=config.getRoster();
    if(member.weapon!==preset.weapon)next=equipRoster(next,member.id,preset.weapon);
    next=configureRosterWeaponPreset(next,member.id,presetId);
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
  for(const slot of LOADOUT_SLOTS){
   if(slot==='primary')continue; // Existing NEXT WEAPON action stays authoritative.
   const row=document.createElement('label');
   row.style.cssText='display:flex;justify-content:space-between;gap:8px;align-items:center;margin:8px 0';
   const label=document.createElement('span');
   label.textContent=slot.toUpperCase();label.style.fontSize='10px';
   const select=document.createElement('select');
   select.setAttribute('aria-label',slot+' for '+member.callsign);
   select.style.cssText='max-width:65%;min-height:40px;touch-action:manipulation;background:#243530;color:#e5e9d8;border-radius:7px;padding:6px';
   for(const item of itemsForSlot(slot)){
    const option=document.createElement('option');
    option.value=item.id;option.textContent=item.name;select.append(option);
   }
   select.value=member.loadout.slots[slot];
   select.addEventListener('change',()=>{
    if(config.getSession().phase!=='planning'||config.isReplaying())return;
    config.setRoster(equipRosterGear(config.getRoster(),member.id,slot,select.value));
    const saved=config.saveRoster();config.applyRoster();
    if(saved){
     const chosen=itemsForSlot(slot).find(item=>item.id===select.value);
     showFieldworkActionFeedback(member.callsign+' · '+
      (chosen?.name??slot.toUpperCase())+' EQUIPPED');
    }
    expandedQuickKit=member.id;renderOperationsBoard();config.refreshHud();
   });
   row.className='fw-equipment-choice';
   row.append(label,select);loadout.field(loadoutGroupForSlot(slot)).append(row);
  }
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
   const active=kit.open&&loadout.group.weapon.open&&legacyControls.open&&weaponEditor.open;
   if(!active){if(quickWorkbenchId===member.id){
    rememberQuickWorkbenchView();
    quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
   }return;}
   if(quickWorkbenchId===member.id)return;
   rememberQuickWorkbenchView();
   quickWorkbench?.dispose();quickWorkbench=null;
   quickWorkbenchId=member.id;
   quickWorkbench=new WeaponWorkbenchPreview(workbenchHost,
    member.weaponConfiguration,slot=>showSocket(slot));
   const view=resetQuickWorkbenchViews.has(member.id)?
    null:savedQuickWorkbenchViews.get(member.id);
   if(view)quickWorkbench.restoreViewState(view);
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
    if(part.slot!==slot||part.family!==build.family)continue;
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
  card.append(kit);config.board.append(card);
  // A newly opened details subtree can report zero width on iOS until
  // it is attached and laid out. Initialize after paint, not only on toggle.
  if(kit.open&&loadout.group.weapon.open&&legacyControls.open&&weaponEditor.open)
   requestAnimationFrame(()=>{if(kit.isConnected)syncWorkbench();});
 }
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
   quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
 }
 return {render:renderOperationsBoard,onQuickApplied,dispose};
}
