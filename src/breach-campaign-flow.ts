/** Stage 10b: Campaign screen and transitions; authoritative state stays in host.
 * All Campaign actions continue using campaign-state and campaign-persistence.
 */
import {initialArmorIntegrity} from './equipment-armor.ts';
import {applyDeploymentInventory,limitDeployedFlashIssue}
 from './equipment-deployment-snapshot.ts';
import {allocateFlashSupply} from './equipment-supply.ts';
import {refillCampaignSquad} from './equipment-campaign-squad-refill.ts';
import {replenishCampaignFieldPieces}
 from './equipment-campaign-field-stock.ts';
import {undoCampaignCarryGear,copyCampaignCarryLayout} from './campaign-state.ts';
import type {CampaignMode} from './breach-app-mode.ts';
import {CampaignScreen} from './campaign-ui.ts';
import {team,debrief} from './breach-game.ts';
import {requestWithdrawal,deployedTeam,requestIndividualExtraction} from './breach-operation-outcomes.ts';
import {installMissingPersonRecovery} from './breach-missing-recovery.ts';
import type {OperationRecord} from './breach-operations.ts';
import {loadOperationHistory,appendOperationHistory} from './breach-persistence.ts';
import {careerEventsForOperation} from './campaign-history.ts';
import {resolveOperation,tacticalSlotOperator,campaignSquadPresent,type CampaignReport}
  from './campaign-state.ts';
import {newCampaign,acceptContract,purchaseAmmo,purchaseMedical,purchaseFlash,
 purchaseFieldStock,
  resupplyOperator,resupplyMedicalOperator,treatOperator,hireRecruit,
  assignOperatorToSlot,buyCatalogWeapon,equipCampaignCatalogWeapon,equipCampaignWeapon,repairCampaignArmor,
  serviceCampaignWeapon,equipCampaignGear,equipCampaignCarryGear,equipCampaignFieldInventory,equipCampaignPreGoFieldInventory,copyCampaignFieldInventory,equipCampaignWeaponPreset,
  equipCampaignWeaponFamilyPart,equipCampaignWeaponAttachment,
  purchaseAndEquipWeaponAttachment,moveCampaignMagazine,saveCampaignKitPreset,
  applyCampaignKitPreset,deleteCampaignKitPreset,renameCampaignOperator,
  setCampaignOperatorColor,cycleCampaignAppearance,setCampaignWardrobe,retireOperator,
  reconContract,contractObjectiveIntel,type CampaignState} from './campaign-state.ts';
import {exportCampaign,importCampaign} from './campaign-persistence.ts';
import {familyPreset,matchingFamilyPreset} from './equipment-weapon-families.ts';
import {catalogWeaponIssueOptions} from './campaign-weapon-procurement.ts';
import {campaignDeploymentSettings} from './campaign-rules.ts';
import {setObjectiveIntelLevel} from './breach-objective-intel.ts';
import {newDispatchPilotCampaign} from './dispatch-campaign-starter.ts';
import {createDispatchSetup,type DispatchCampaignDraft} from './dispatch-campaign-setup.ts';
import {isDispatchPilot} from './dispatch-campaign-eligibility.ts';
import {dispatchForceHistory} from './dispatch-force-review.ts';
import {deployedDispatchIncident,validatedDispatchIncident,
 type DispatchIncidentContext} from './dispatch-incident-context.ts';
import {validateCampaignDraft,type CampaignCreationDraft} from './campaign-creation.ts';
import type {CampaignSlot} from './campaign-save-slots.ts';
import {confirmFieldworkAction,showFieldworkNotice} from './ui/fieldwork-controls.ts';
import {showFieldworkActionFeedback} from './ui/fieldwork-action-toast.ts';
import {mountCampaignPreGoPrep} from './ui/campaign-pre-go-prep.ts';
import type {FieldInventory} from './equipment-field-inventory.ts';
import {captureMissionFieldInventory}
 from './equipment-mission-field-reconciliation.ts';
import type {IntelMode} from './breach-intel.ts';
import type {SiteScale} from './breach-site.ts';
import type {Session} from './breach-game.ts';

export type CampaignFlowHooks={
 getCampaign:()=>CampaignState|null;setCampaign:(value:CampaignState|null)=>void;
 saveCampaign:()=>boolean;
 getCampaignSlot:()=>CampaignSlot;
 getCampaignInSlot:(slot:CampaignSlot)=>CampaignState|null;
 switchCampaignSlot:(slot:CampaignSlot)=>boolean;
 replaceCampaignSlot:(campaign:CampaignState,slot:CampaignSlot)=>boolean;
 getMode:()=>CampaignMode;setMode:(value:CampaignMode)=>void;
 getIntel:()=>IntelMode;setIntel:(value:IntelMode)=>void;
 getScale:()=>SiteScale;setScale:(value:SiteScale)=>void;
 getSession:()=>Session;getSelected:()=>string;isReplaying:()=>boolean;
 siteSize:HTMLButtonElement;siteSettings:HTMLElement;briefingRoster:HTMLElement;
 refreshHud:()=>void;randomSeed:()=>number;
 resetContract:(job:CampaignState['contracts'][number])=>void;
 launchQuickPlay:()=>void|Promise<void>;
 launchTraining:()=>void;
 openReplayLibrary:()=>void;openMenuStudio:()=>void;
 openStudio:(id:string)=>void;openArsenal:(id:string)=>void;
 showBriefing:()=>void;
};
export function createBreachCampaignFlow(config:CampaignFlowHooks){
 const model={
   get campaign(){return config.getCampaign();},
   set campaign(next:CampaignState|null){config.setCampaign(next);},
   get mode(){return config.getMode();},
   set mode(next:CampaignMode){config.setMode(next);},
   get intel(){return config.getIntel();},
   set intel(next:IntelMode){config.setIntel(next);},
   get scale(){return config.getScale();},
   set scale(next:SiteScale){config.setScale(next);}
 };
let recordedOperation:Session|null=null;
let deployedIncident:DispatchIncidentContext|null=null;
/** Only the staged Dispatch mission in its originating career owns this. */
const currentIncident=()=>config.getMode()==='mission'&&!config.isReplaying()?
 validatedDispatchIncident(config.getCampaign(),deployedIncident):null;
const operationHistory=()=>loadOperationHistory();
function recordCompletedOperation(){
 const state=config.getSession();
 const currentCampaign=config.getCampaign();
  if(config.getMode()==='training'||state.site?.training||
    config.isReplaying()||recordedOperation===state||!state.started||
    (state.phase!=='won'&&state.phase!=='lost'))return;
  recordedOperation=state;
  if(config.getMode()==='mission'&&currentCampaign?.activeContractId){
   const members=deployedTeam(state);
   const careerId=(slotId:string)=>tacticalSlotOperator(currentCampaign!,slotId)?.id??slotId;
   const mapping=Object.fromEntries(members.map(a=>[a.id,careerId(a.id)]));
   const stats=debrief(state);
   const result:CampaignReport={
    id:'operation-'+currentCampaign.activeContractId,contractId:currentCampaign.activeContractId,
    day:currentCampaign.day,outcome:state.phase==='won'?'success':'failure',
    grade:stats.grade,elapsed:stats.time,
    disposition:stats.operationOutcome.disposition,
    objectiveSecured:stats.operationOutcome.objectiveSecured,
    ...(stats.missingPersonRecovery?{
      missingRecoveredId:stats.missingPersonRecovery.operatorId,
      missingRecoveredBy:careerId(stats.missingPersonRecovery.carrierId)}:{}),
    intelRecovered:stats.optionalIntel.recovered,
    intelRecoveryBy:Object.fromEntries(members.flatMap(member=>{
      const n=state.optionalIntel.filter(item=>item.collectedBy===member.id&&
        stats.optionalIntel.itemIds.includes(item.id)).length;
      return n?[[careerId(member.id),n]]:[];
    })),
    extractedIds:stats.operationOutcome.extractedOperatorIds.map(careerId),
    leftBehindIds:stats.operationOutcome.leftBehindOperatorIds.map(careerId),
    ...(isDispatchPilot(currentCampaign)?
      {dispatchForce:dispatchForceHistory(stats.forceReview)}:{}),
    participatingIds:members.map(a=>careerId(a.id)),
    casualties:members.filter(a=>a.health<=0).map(a=>careerId(a.id)),
    stabilizedIds:stats.stabilizedCasualties.map(careerId),
    criticalIds:stats.criticalCasualties.map(careerId),
    evacuatedIds:stats.evacuatedCasualties.map(careerId),
    medicalRemaining:Object.fromEntries(members.map(a=>[
     careerId(a.id),{...a.medicalSupplies}])),
    // Report the actual detached live carriers, keyed by authoritative career
    // identities (tactical slots may be mapped to different recruits).
    fieldRemaining:Object.fromEntries(members.flatMap(a=>{
     const remaining=captureMissionFieldInventory(a.equipment);
     return remaining?[[careerId(a.id),remaining]]:[];
    })),
    objective:stats.objective,
    flashUsed:state.battleEvents.filter(e=>e.kind==='flash'&&
     e.actor!==undefined&&e.text.endsWith('FLASH OUT')).length,
    events:careerEventsForOperation(currentCampaign,'operation-'+currentCampaign.activeContractId,state.battleEvents,mapping),
    performance:members.map(a=>({
     id:careerId(a.id),shots:a.shots,hits:a.hits,pointShots:a.pointShots,
     aimedShots:a.aimedShots,longHits:a.longHits,injuryStage:a.injuryStage,
     survived:a.health>0,magazine:a.magazine,reserve:a.reserve,
     armorIntegrity:a.armorIntegrity,helmetIntegrity:a.helmetIntegrity,
     spareMagazines:a.spareMagazines.map(m=>({...m})),
     loadedMagazineId:a.insertedMagazineId
    }))
   };
   config.setCampaign(resolveOperation(currentCampaign,result));config.saveCampaign();return;
  }
  const stats=debrief(state);
  const record:OperationRecord={
    seed:state.site?.seed??state.variant,
    kind:state.missionType,
    outcome:state.phase==='won'?'success':'failure',
    grade:stats.grade,elapsed:stats.time,casualties:stats.casualties
  };
  appendOperationHistory(record);
}

 const withdrawButton=document.createElement('button');
 withdrawButton.type='button';withdrawButton.id='campaignWithdrawButton';
 withdrawButton.textContent='WITHDRAW SQUAD';
 withdrawButton.title='Order an organized withdrawal; surviving mobile operators must reach extraction';
 config.siteSettings.append(withdrawButton);
 withdrawButton.addEventListener('click',()=>{
  const state=config.getSession();
  if(config.isReplaying()||!['mission','quick'].includes(config.getMode())||
     !state.started||!['running','planning'].includes(state.phase))return;
  if(state.withdrawalRequested){
   state.withdrawalRequested=false;
   if(state.pendingExtractionIds)state.pendingExtractionIds.length=0;
   showFieldworkActionFeedback('Withdrawal cancelled; already-extracted personnel remain evacuated');
  }else if(requestWithdrawal(state)){
   showFieldworkActionFeedback('Withdrawal ordered — move all mobile operators to extraction');
  }
  config.refreshHud();
 });
 const extractSelected=document.createElement('button');
 extractSelected.type='button';extractSelected.id='campaignExtractSelectedButton';
 extractSelected.textContent='EXTRACT SELECTED';
 extractSelected.title='Queue the selected operator to exit permanently, after reaching extraction and pressing GO';
 config.siteSettings.append(extractSelected);
 extractSelected.addEventListener('click',()=>{
  const state=config.getSession();
  if(config.isReplaying()||!['mission','quick'].includes(config.getMode())||
    !requestIndividualExtraction(state,config.getSelected())){
   showFieldworkActionFeedback('SELECT A MOBILE OPERATOR AT EXTRACTION; RELEASE CARRIED CASUALTIES FIRST');
  }else showFieldworkActionFeedback('INDIVIDUAL EXTRACTION QUEUED — PRESS GO');
  config.refreshHud();
 });
 const backButton=document.createElement('button');
 backButton.type='button';backButton.id='campaignReturnButton';
 backButton.textContent='OPERATIONS ROOM';
 backButton.setAttribute('aria-label','Return to campaign operations room');
 config.siteSettings.append(backButton);
function saveFile(campaign:CampaignState){
 const blob=new Blob([exportCampaign(campaign)],{type:'application/json'});
 const href=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=href;link.download='fieldwork-'+campaign.id+'.json';
 document.body.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function campaignMenu(){
 preGoPrep.setAvailable(false);
 deployedIncident=null;
 model.mode='menu';
 campaignScreen.entry(!!config.getCampaignInSlot('legacy'),
  !!config.getCampaignInSlot('sandbox'),config.getCampaignSlot(),
  !!config.getCampaignInSlot('dispatch'),'main',{
   legacy:config.getCampaignInSlot('legacy'),
   sandbox:config.getCampaignInSlot('sandbox'),
   dispatch:config.getCampaignInSlot('dispatch')
  });
}
function resumeSlot(slot:CampaignSlot){
 if(config.getMode()!=='menu'&&config.getMode()!=='home')return;
 if(config.switchCampaignSlot(slot))showCampaignHome();
 else void showFieldworkNotice('Campaign unavailable',
  'Could not open the selected campaign. Existing saves were not changed.');
}
/** Only acknowledge a campaign action when authoritative state actually changed. */
function applyVisibleCampaignAction(change:(current:CampaignState)=>CampaignState,message:string){
 const before=model.campaign;
 if(!before)return;
 const after=change(before);
 if(after===before)return;
 model.campaign=after;
 const saved=config.saveCampaign();
 showCampaignHome();
 if(saved)showFieldworkActionFeedback(message);
 else void showFieldworkNotice('Save unavailable',
  'The change is not yet saved. Export your campaign before leaving this session.');
}
/** L2.7: only the accepted mission's unstarted planning phase may
 * adjust issued field consumables. A failed save cannot quietly mutate the
 * tactical session or the campaign's authoritative stock.
 */
function issuePreGoFieldKit(operatorId:string,inventory:FieldInventory):boolean{
 const current=model.campaign;
 const session=config.getSession();
 if(!current?.activeContractId||model.mode!=='mission'||
   config.isReplaying()||session.started||session.phase!=='planning')return false;
 const next=equipCampaignPreGoFieldInventory(current,operatorId,inventory);
 if(next===current)return false;
 model.campaign=next;
 if(!config.saveCampaign()){
  model.campaign=current;
  void showFieldworkNotice('Equipment not saved',
   'The mission equipment has not changed. Free storage or export the campaign first.');
  return false;
 }
 applyCampaignRosterToSession(session,next);
 config.refreshHud();
 showFieldworkActionFeedback('PRE-GO EQUIPMENT UPDATED');
 return true;
}
const preGoPrep=mountCampaignPreGoPrep(config.briefingRoster,{
 getCampaign:()=>model.campaign,
 canPrepare:()=>{
  const s=config.getSession();
  return model.mode==='mission'&&!config.isReplaying()&&
   s.phase==='planning'&&!s.started;
 },
 issue:issuePreGoFieldKit
});

const campaignScreen=new CampaignScreen({
 newCampaign:async()=>{
  if(config.getCampaignInSlot('legacy')&&!await confirmFieldworkAction({
   title:'Start a new campaign?',
   message:'This replaces the active local campaign. Export a save first if you want to preserve it.',
   confirmLabel:'START NEW CAMPAIGN',danger:true
  }))return;
  const next=newCampaign(config.randomSeed());
  if(!config.replaceCampaignSlot(next,'legacy')){
   void showFieldworkNotice('Save unavailable',
    'Could not save the new campaign. Your existing campaign was preserved.');
   return;
  }
  showCampaignHome();
 },
 continueCampaign:()=>resumeSlot('legacy'),
 newSandbox:()=>campaignScreen.creator(),
 continueSandbox:()=>resumeSlot('sandbox'),
 newDispatch:()=>campaignScreen.dispatchCreator(),
 createDispatch:async(draft:DispatchCampaignDraft)=>{
  try{createDispatchSetup(draft);}catch{
   void showFieldworkNotice('Invalid Dispatch setup',
    'Choose a supported agency, era and compatible campaign rules.');
   return false;
  }
  if(config.getCampaignInSlot('dispatch')&&!await confirmFieldworkAction({
   title:'Replace existing Dispatch campaign?',
   message:'This replaces only the Dispatch save. Export it to keep the existing team and operation history.',
   confirmLabel:'REPLACE DISPATCH',danger:true
  }))return null;
  const next=newDispatchPilotCampaign(config.randomSeed(),draft);
  if(!config.replaceCampaignSlot(next,'dispatch')){
   void showFieldworkNotice('Save unavailable',
    'Dispatch campaign could not be saved. Other campaign saves were preserved.');
   return false;
  }
  showCampaignHome();return true;
 },
 exportDispatch:()=>{const c=config.getCampaignInSlot('dispatch');if(c)saveFile(c);},
 continueDispatch:()=>resumeSlot('dispatch'),
 showMenu:campaignMenu,
 exportSandbox:()=>{const c=config.getCampaignInSlot('sandbox');if(c)saveFile(c);},
 createSandbox:async(draft:CampaignCreationDraft)=>{
  const valid=validateCampaignDraft(draft);
  if(!valid.ok){void showFieldworkNotice('Invalid campaign',valid.error);return false;}
  if(config.getCampaignInSlot('sandbox')&&!await confirmFieldworkAction({
   title:'Replace Sandbox Campaign?',
   message:'This replaces the saved Sandbox Campaign. Export it first to keep your operators, equipment and history.',
   confirmLabel:'REPLACE SANDBOX',danger:true
  }))return null;
  const next=newCampaign(valid.seed??config.randomSeed(),valid.rules,valid.name);
  if(!config.replaceCampaignSlot(next,'sandbox')){
   void showFieldworkNotice('Save unavailable',
    'Sandbox Campaign could not be saved. Existing saves were preserved.');
   return false;
  }
  showCampaignHome();return true;
 },
 quickPlay:()=>{void config.launchQuickPlay();},
 training:()=>config.launchTraining(),
 openReplayLibrary:()=>config.openReplayLibrary(),
 openMenuStudio:()=>config.openMenuStudio(),
 chooseContract:(id)=>{
  const previous=model.campaign;
  if(!previous)return;
  const next=acceptContract(previous,id);
  if(next===previous)return;
  model.campaign=next;
  if(!config.saveCampaign()){
   model.campaign=previous;
   void showFieldworkNotice('Save unavailable',
    'The contract was not accepted. Free up storage or export your campaign, then try again.');
   return;
  }
  deployCampaignContract();
 },
 resumeContract:()=>deployCampaignContract(),
 reconContract:id=>applyVisibleCampaignAction(c=>reconContract(c,id),
  'Mission reconnaissance upgraded'),
 buyAmmo:()=>applyVisibleCampaignAction(purchaseAmmo,'60 rounds added to supplies'),
 buyMedical:()=>applyVisibleCampaignAction(purchaseMedical,'Medical kit added to supplies'),
 buyFlash:()=>applyVisibleCampaignAction(purchaseFlash,'2 flashbangs added to supplies'),
 buyWedges:()=>applyVisibleCampaignAction(c=>purchaseFieldStock(c,'wedges'),
  '4 door wedges added to HQ supplies'),
 buyCuffs:()=>applyVisibleCampaignAction(c=>purchaseFieldStock(c,'cuffs'),
  '6 flex cuff pairs added to HQ supplies'),
 resupply:(id)=>applyVisibleCampaignAction(c=>resupplyOperator(c,id),
  'Operator ammunition replenished'),
 resupplyMedical:(id)=>applyVisibleCampaignAction(c=>resupplyMedicalOperator(c,id),
  'Operator medical supplies replenished'),
 resupplySquad:()=>applyVisibleCampaignAction(refillCampaignSquad,
  'Squad inventory replenished from HQ stock'),
 resupplyField:(id)=>applyVisibleCampaignAction(
  c=>replenishCampaignFieldPieces(c,id).result,
  'Carried wedges and cuffs replenished from HQ'),
 treat:(id)=>applyVisibleCampaignAction(c=>treatOperator(c,id),
  'Treatment completed · recovery time reduced'),
 recruit:()=>applyVisibleCampaignAction(hireRecruit,'New operator joined the roster'),
 assignSlot:(slot,id)=>applyVisibleCampaignAction(
  c=>assignOperatorToSlot(c,slot,id),'Deployment squad updated'),
 buyCatalogWeapon:(presetId)=>applyVisibleCampaignAction(
  c=>buyCatalogWeapon(c,presetId),(familyPreset(presetId)?.name??'Weapon')+' added to armory'),
 equipCatalogWeapon:(id,serialId)=>applyVisibleCampaignAction(
  c=>equipCampaignCatalogWeapon(c,id,serialId),'Owned weapon issued'),
 equipWeapon:(id,weapon)=>applyVisibleCampaignAction(
  c=>equipCampaignWeapon(c,id,weapon),'Operator primary weapon updated'),
 repairArmor:(id)=>applyVisibleCampaignAction(
  c=>repairCampaignArmor(c,id),'Operator armor repaired'),
 serviceWeapon:(id)=>applyVisibleCampaignAction(
  c=>serviceCampaignWeapon(c,id),'Weapon maintenance completed'),
 equipFieldInventory:(id,inventory)=>applyVisibleCampaignAction(
  c=>equipCampaignFieldInventory(c,id,inventory),'Field equipment updated'),
 copyFieldInventory:(sourceId,targetId)=>applyVisibleCampaignAction(
  c=>copyCampaignFieldInventory(c,sourceId,targetId),'Carried gadgets copied'),
 copyCarryLayout:(sourceId,targetId)=>applyVisibleCampaignAction(
  c=>copyCampaignCarryLayout(c,sourceId,targetId),'Carry layout copied · positions only'),
 equipGear:(id,slot,itemId)=>applyVisibleCampaignAction(
  c=>equipCampaignGear(c,id,slot,itemId),'Operator equipment updated'),
 equipCarryGear:(id,slot,itemId)=>applyVisibleCampaignAction(
  c=>equipCampaignCarryGear(c,id,slot,itemId),'Carrying equipment updated'),
 undoCarryGear:(id,expected,before)=>applyVisibleCampaignAction(
  c=>undoCampaignCarryGear(c,id,expected,before),'Physical carry change undone'),
 equipWeaponPreset:(id,presetId)=>applyVisibleCampaignAction(current=>{
  if(current.activeContractId)return current;
  const preset=familyPreset(presetId);
  const member=current.operators.find(o=>o.id===id);
  if(!preset||!member)return current;
  if(member.weapon!==preset.weapon){
   const choice=catalogWeaponIssueOptions(current,id).find(o=>o.enabled&&
    current.inventory.serializedWeapons?.some(w=>w.id===o.serialId&&matchingFamilyPreset(w.catalogBody)?.id===presetId));
   return choice?equipCampaignCatalogWeapon(current,id,choice.serialId):current;
  }
  return equipCampaignWeaponPreset(current,id,presetId);
 },'Weapon family preset equipped'),
 equipWeaponFamilyPart:(id,slot,partId)=>applyVisibleCampaignAction(
  c=>equipCampaignWeaponFamilyPart(c,id,slot,partId),'Weapon component updated'),
 equipAttachment:(id,slot,partId,acquire)=>applyVisibleCampaignAction(
  c=>acquire?purchaseAndEquipWeaponAttachment(c,id,slot,partId):
   equipCampaignWeaponAttachment(c,id,slot,partId),
  acquire?'Attachment acquired and equipped':'Weapon attachment updated'),
 moveMagazine:(id,magazineId,location)=>applyVisibleCampaignAction(
  c=>moveCampaignMagazine(c,id,magazineId,location),'Magazine placement updated'),
 saveKitPreset:(id,name)=>applyVisibleCampaignAction(
  c=>saveCampaignKitPreset(c,id,name),'Operator kit preset saved'),
 applyKitPreset:(id,presetId)=>applyVisibleCampaignAction(
  c=>applyCampaignKitPreset(c,id,presetId),'Operator kit preset applied'),
 deleteKitPreset:(presetId)=>applyVisibleCampaignAction(
  c=>deleteCampaignKitPreset(c,presetId),'Operator kit preset deleted'),
 renameOperator:(id,callsign)=>applyVisibleCampaignAction(
  c=>renameCampaignOperator(c,id,callsign),'Operator callsign updated'),
 setOperatorColor:(id,color)=>applyVisibleCampaignAction(
  c=>setCampaignOperatorColor(c,id,color),'Operator identification color updated'),
 cycleAppearance:(id)=>applyVisibleCampaignAction(
  c=>cycleCampaignAppearance(c,id),'Operator appearance updated'),
 setWardrobe:(id,look)=>applyVisibleCampaignAction(
  c=>setCampaignWardrobe(c,id,look),'Operator wardrobe updated'),
 openStudio:(id)=>config.openStudio(id),
 openArsenal:(id)=>{void config.openArsenal(id);},
 exportSave:()=>{if(model.campaign)saveFile(model.campaign);},
 retire:(id)=>{
  if(!model.campaign||!window.confirm('Retire this operator from active service? Their career record will remain.'))return;
  applyVisibleCampaignAction(c=>retireOperator(c,id),'Operator retired from active service');
 },
 importSave:(raw,slot)=>{
  if(config.getMode()!=='menu'&&config.getMode()!=='home')return;
  const next=importCampaign(raw);
  if(!next){void showFieldworkNotice('Invalid import','This is not a valid Fieldwork campaign save.');return;}
  if(slot==='dispatch'&&next.rules?.template!=='dispatch'||
    slot!=='dispatch'&&next.rules?.template==='dispatch'){
   void showFieldworkNotice('Save belongs to another mode',
    'Import this save into the matching Dispatch or original campaign slot.');return;
  }
  if(config.getCampaignInSlot(slot)&&!window.confirm(
   'Replace the '+slot+' campaign save with this import? Export the current save first if needed.'))return;
  if(!config.replaceCampaignSlot(next,slot)){
   void showFieldworkNotice('Import not saved','Storage is unavailable. Existing campaign data was preserved.');
   return;
  }
  showCampaignHome();
 }
});
function showCampaignHome(){
 if(!model.campaign)return;
 preGoPrep.setAvailable(false);
 deployedIncident=null;
 model.mode='home';campaignScreen.home(model.campaign,config.getCampaignSlot());
}
function deployCampaignContract(){
 if(!model.campaign?.activeContractId)return;
 if(!campaignSquadPresent(model.campaign)){
  void showFieldworkNotice('Squad incomplete',
   'Missing, retired, or recovering personnel cannot deploy. Assign a ready replacement in Personnel.');
  showCampaignHome();return;
 }
 preGoPrep.close();
 const job=model.campaign.contracts.find(k=>k.id===model.campaign!.activeContractId);
 if(!job)return;
 model.mode='mission';
 const deployment=campaignDeploymentSettings(model.campaign,job);
 model.intel=deployment.intel;
 model.scale=deployment.scale;
 config.siteSize.textContent='MAP SIZE · '+model.scale.toUpperCase();
 config.resetContract(job);
 if(job.recoveryOperatorId&&
    !installMissingPersonRecovery(config.getSession(),job.recoveryOperatorId)){
  void showFieldworkNotice('Recovery mission unavailable',
   'Unable to establish a transportable casualty at this site.');
  showCampaignHome();return;
 }
 setObjectiveIntelLevel(config.getSession(),contractObjectiveIntel(job));
 // Capture AFTER reset: the reset pathway invalidates prior mission state.
 deployedIncident=deployedDispatchIncident(model.campaign,job.id);
 campaignScreen.hide();
 preGoPrep.setAvailable(true);
 config.showBriefing();
}
function returnAfterCampaignMission(){
 if(model.mode==='mission'&&(config.getSession().phase==='won'||config.getSession().phase==='lost')){
  showCampaignHome();return true;
 }
 return false;
}
backButton.addEventListener('click',()=>{
 if(model.mode==='mission'&&config.getSession().phase==='running')return;
 if(model.campaign)showCampaignHome();
 else campaignMenu();
});

 return {screen:campaignScreen,operationHistory,recordCompletedOperation,
   getIncident:currentIncident,
   resetOutcome:()=>{recordedOperation=null;},showHome:showCampaignHome,
   deployContract:deployCampaignContract,
   returnAfterMission:returnAfterCampaignMission};
}

export function applyCampaignRosterToSession(session:Session,campaign:CampaignState):void{
 for(const a of team(session)){
  const m=tacticalSlotOperator(campaign,a.id);
  if(m){
   a.name=m.callsign;a.skills={...m.skills};a.weapon=m.weapon;
   a.appearanceSeed=m.appearanceSeed;
   a.wardrobe=m.wardrobe;
   applyDeploymentInventory(a,m);
   const protection=initialArmorIntegrity(m.loadout);
   a.armorIntegrity=Math.min(protection.torso,m.armorCondition.torso);
   a.helmetIntegrity=Math.min(protection.head,m.armorCondition.head);
   if(m.recoveryDays>0&&m.injuries>0){
    a.injuryStage=Math.max(a.injuryStage,Math.min(2,m.injuries));
    a.health=Math.min(a.health,4-a.injuryStage);
   }
  }
 }
 if(!session.started){
  const squad=team(session);
  const requested=squad.map(a=>a.flashCharges);
  const issued=allocateFlashSupply(requested,campaign.supplies.flash,
   requested.reduce((n,qty)=>n+qty,0));
  squad.forEach((a,i)=>{limitDeployedFlashIssue(a,issued[i]);});
  session.flashRemaining=issued.reduce((n,qty)=>n+qty,0);
 }
}
