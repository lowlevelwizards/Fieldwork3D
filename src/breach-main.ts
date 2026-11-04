import {
  W,H,activeWorldBounds,WALLS,COVER,GRID,doorCenter,doorLeafSegment,activateSite,
  type Pt,type Segment,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  newSession,team,enemies,isSeen,lastKnown,missionText,debrief,
  operationBriefing,availableDeployments,selectDeployment,
  planMove,planMoveStroke,planNearbyInteraction,planAim,planWatch,
  retargetActiveWatch,removeActiveWatch,setFirePolicy,planWait,planWaitAt,setWaitDuration,
  plannedControl,setNodeControl,setStartPace,planReloadAt,planDoorFlash,
  planSync,movePlanNode,
  finalPoint,doorAtNode,backOne,
  deletePlanNode,insertPlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,liveVisibility,
  planReload,reloadNow,planFlash,moveFlashTarget,flashTrajectory,
  equipWeaponChoice,toggleWeaponLight,planMedicalTreatment,planEntryTool,
  planCasualtyTransport,planRecoverMedical,
} from './breach-game.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
import type {TacticalOrderPreview} from './ui/tactical-feedback.ts';
import {ExecutionNoticeFeed} from './ui/execution-feedback.ts';
import {executionStatus} from './breach-execution-state.ts';
import {currentSiteIdentity} from './ui/current-site-identity.ts';
import {tacticalHitProfile,preferSelectedHit,shouldAppendStrokePoint,
  simplifyStrokePoints} from './ui/touch-hit-targets.ts';
import {orderVisualScopes} from './ui/order-visual-state.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {interruptsWatch} from './breach-plan.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {equipmentTrainingSite} from './equipment-training-range.ts';
import {activeRangeDiagnostic,rangeDiagnosticLabel,captureRangeTrial,
 rangeTrialLabel,type RangeTrial} from './equipment-training-diagnostics.ts';
import type {Site} from './breach-site.ts';
import {equippedEntryMethods,issuedWedges} from './equipment-entry-tools.ts';
import {entryToolVerdict,type EntryTool} from './breach-entry-tools.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter}
 from './equipment-weapon-light-beam.ts';
import {WeaponWorkbenchPreview} from './equipment-weapon-workbench.ts';
import {carryCapacityReport} from './equipment-carry-placement.ts';
import {mostUrgentWound} from './breach-medical-wounds.ts';
import {treatmentSupplyForWound} from './breach-medical-treatment.ts';
import {lightControlState} from './equipment-weapon-light-ui.ts';
import type {SiteScale} from './breach-site.ts';
import type {LightingMode} from './equipment-site-lighting.ts';
import {lightingPresentation} from './equipment-lighting-presentation.ts';
import {renderSnapshot,type RenderActor}
  from './breach-frame-interpolation.ts';
import {routeLineHit} from './breach-route-edit.ts';
import {placeContextMenu,type AvoidRect,type ScreenPath,type MenuSide} from './breach-context-placement.ts';
import {spatialSurfaceState,shotVisibility,doorVisibility,contactFade} from './breach-presentation.ts';
import {heardIntensity} from './breach-acoustics.ts';
import {weaponAudioCue,audibleImpact} from './breach-combat-audio.ts';
import {parseOperationHistory,addOperationRecord,
  type OperationRecord} from './breach-operations.ts';
import {MissionRecorder,applyReplayFrame} from './breach-replay.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import {injuryOf,WEAPONS} from './breach-combat.ts';

import {stageMagazines,magazineSpace,type MagazineLocation} from './equipment-magazine-placement.ts';
import {doorReachable} from './breach-door.ts';
import {canRelocateCover} from './breach-movable-cover.ts';
import {INTEL_MODES,doorKnown,
  intelPassable,type IntelMode} from './breach-intel.ts';
import {orderFailureText} from './breach-nav-diagnostics.ts';
import {routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {DisplayRouteCache} from './breach-route-cache.ts';
import {FrameMeter} from './breach-perf.ts';
import {formatAfterAction} from './breach-after-action.ts';
import {formatMissionPacing} from './breach-mission-pacing.ts';
import {formatCombatReview} from './breach-combat-review.ts';
import {readRoster,applyRosterIdentity,freshQuickPlayRoster,
  serializeQuickPlayCosmetics,
  resupplyRoster,equipRoster,equipRosterGear,moveRosterMagazine,
 configureRosterWeapon,
 renameRosterMember,cycleRosterAppearance,setRosterWardrobe} from './breach-roster.ts';
import {validateStudioAppearanceEdits,applyStudioRosterEdits,
 applyStudioCampaignEdits} from './operator-studio-batch-save.ts';
import {LOADOUT_SLOTS,itemsForSlot} from './equipment-catalog.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 sameWeaponConfiguration,type WeaponAttachmentSlot} from './equipment-weapon-assemblies.ts';
import {newCampaign,readCampaign,acceptContract,resolveOperation,
 purchaseAmmo,purchaseMedical,resupplyOperator,resupplyMedicalOperator,treatOperator,
 hireRecruit,assignOperatorToSlot,tacticalSlotOperator,buyWeapon,equipCampaignWeapon,
 retireOperator,equipCampaignGear,moveCampaignMagazine,
 equipCampaignWeaponAttachment,purchaseAndEquipWeaponAttachment,
 saveCampaignKitPreset,applyCampaignKitPreset,
 deleteCampaignKitPreset,renameCampaignOperator,cycleCampaignAppearance,
 setCampaignWardrobe,
 repairCampaignArmor,serviceCampaignWeapon,purchaseFlash,
 type CampaignState,type CampaignReport} from './campaign-state.ts';
import {loadMovementScale,equippedFlashCharges} from './equipment-loadouts.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {allocateFlashSupply} from './equipment-supply.ts';
import {createHeadwearAppearancePicker} from './operator-headwear-picker.ts';
import {createWardrobeFabricCamoPicker} from './operator-fabric-camo-picker.ts';
import {topColorwayChoices,resolvedTopColorway} from './operator-upper-colorways.ts';
import {sleeveStateOptions} from './operator-wardrobe-data.ts';
import './operator-fabric-camo-picker.css';
import {WARDROBE_ACCESSORY_SLOTS,WARDROBE_ACCESSORY_OPTIONS}
 from './operator-wardrobe-accessories.ts';
import {readWardrobe,resolvedWardrobe,setWardrobeStyle,
 wardrobeItemsForSlot,WARDROBE_SLOTS,SLEEVE_STATES,TROUSER_HEMS,
 type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import {CampaignScreen} from './campaign-ui.ts';
import {exportCampaign,importCampaign} from './campaign-persistence.ts';
import {careerEventsForOperation} from './campaign-history.ts';
import {awarenessDebugLine} from './breach-awareness-debug.ts';
import {fixedStepBudget} from './breach-fixed-clock.ts';
import './breach-style.css';
import {fieldworkSelectField,confirmFieldworkAction} from './ui/fieldwork-controls.ts';
import {compactSiteTitle} from './ui/site-title.ts';
import {tacticalIcon,decorateIconButton,tacticalIconForState} from './ui/tactical-icons.ts';
import {contextActionChoices} from './ui/context-actions.ts';
import {PaletteMotion} from './ui/palette-motion.ts';
import {TacticalFeedback} from './ui/tactical-feedback.ts';
import {ContextualTeaching,resolveHudPresentation,type HudUrgency,type HudPhase}
  from './ui/contextual-teaching.ts';
import {recoveryAdviceFor} from './ui/recovery-guidance.ts';
import {paintFogMask,FOG_WIDTH,FOG_HEIGHT} from './breach-fog-mask.ts';

const el=<T extends HTMLElement>(id:string)=>{
  const node=document.getElementById(id);
  if(!node)throw Error('Missing tactical UI: '+id);
  return node as T;
};
const canvas=el<HTMLCanvasElement>('breachCanvas');
const feedbackLayer=document.createElement('canvas');
feedbackLayer.id='tacticalFeedback';
feedbackLayer.setAttribute('aria-hidden','true');
document.body.append(feedbackLayer);
const feedbackDraw=feedbackLayer.getContext('2d');
const tacticalFeedback=new TacticalFeedback();
const ctx=canvas.getContext('2d');
if(!ctx)throw Error('Canvas 2D unavailable');
const draw:CanvasRenderingContext2D=ctx;
const ui={
  rook:el<HTMLButtonElement>('rook'),
  moss:el<HTMLButtonElement>('moss'),
  rookHp:el<HTMLElement>('rookHp'),mossHp:el<HTMLElement>('mossHp'),
  clear:el<HTMLButtonElement>('clear'),
  play:el<HTMLButtonElement>('play'),restart:el<HTMLButtonElement>('restart'),
  phase:el<HTMLElement>('phase'),clock:el<HTMLOutputElement>('clock'),
  hint:el<HTMLElement>('hint'),feed:el<HTMLElement>('feed'),
  mission:el<HTMLElement>('mission'),
  briefingToggle:el<HTMLButtonElement>('briefingToggle'),
  uiHelp:el<HTMLButtonElement>('uiHelp'),
  uiSoundToggle:el<HTMLButtonElement>('uiSoundToggle'),
  briefingPanel:el<HTMLElement>('briefingPanel'),
  briefingTitle:el<HTMLElement>('briefingTitle'),
  briefingBody:el<HTMLElement>('briefingBody'),
  briefingCondition:el<HTMLElement>('briefingCondition'),
  briefingExtraction:el<HTMLElement>('briefingExtraction'),
  briefingSite:el<HTMLElement>('briefingSite'),
  briefingIntel:el<HTMLElement>('briefingIntel'),
  briefingRoster:el<HTMLElement>('briefingRoster'),
  briefingClose:el<HTMLButtonElement>('briefingClose'),
  context:el<HTMLElement>('contextTools'),
  quickStates:el<HTMLElement>('quickStates'),
  quickScope:el<HTMLElement>('quickScope'),
  tacticalHud:el<HTMLElement>('tacticalHud'),
  orders:el<HTMLElement>('advancedOrders'),
  moreOrders:el<HTMLButtonElement>('moreOrders'),
  cancelTarget:el<HTMLButtonElement>('cancelTarget'),
  siteSettingsToggle:el<HTMLButtonElement>('siteSettingsToggle'),
  siteSize:el<HTMLButtonElement>('siteSize'),
  siteLighting:el<HTMLButtonElement>('siteLighting'),
  siteSettings:el<HTMLElement>('siteSettings'),
  replayMore:el<HTMLButtonElement>('replayMore'),
  replayExtra:el<HTMLElement>('replayExtra'),
  viewIso:el<HTMLButtonElement>('viewIso'),
  viewTop:el<HTMLButtonElement>('viewTop'),
  view2d:el<HTMLButtonElement>('view2d'),
  cameraFit:el<HTMLButtonElement>('cameraFit'),
  intelMode:el<HTMLButtonElement>('intelMode'),
  ash:el<HTMLButtonElement>('ash'),vale:el<HTMLButtonElement>('vale'),
  ashHp:el<HTMLElement>('ashHp'),valeHp:el<HTMLElement>('valeHp'),
  back:el<HTMLButtonElement>('back'),
  undo:el<HTMLButtonElement>('undo'),redo:el<HTMLButtonElement>('redo'),
  wait:el<HTMLButtonElement>('wait'),sync:el<HTMLButtonElement>('sync'),
  reload:el<HTMLButtonElement>('reload'),flash:el<HTMLButtonElement>('flash'),
  loadout:el<HTMLButtonElement>('loadout'),
  stance:el<HTMLButtonElement>('stance'),variant:el<HTMLButtonElement>('variant'),
  contact:el<HTMLButtonElement>('contact'),
  debrief:el<HTMLElement>('debrief'),
  debriefTitle:el<HTMLElement>('debriefTitle'),
  debriefGrade:el<HTMLElement>('debriefGrade'),
  debriefSurvivors:el<HTMLElement>('debriefSurvivors'),
  debriefAccuracy:el<HTMLElement>('debriefAccuracy'),
  debriefObjective:el<HTMLElement>('debriefObjective'),
  debriefStats:el<HTMLElement>('debriefStats'),
  retry:el<HTMLButtonElement>('retry'),next:el<HTMLButtonElement>('next'),
  watchReplay:el<HTMLButtonElement>('watchReplay'),
  replayPanel:el<HTMLElement>('replayPanel'),
  replayPlay:el<HTMLButtonElement>('replayPlay'),
  replayBack:el<HTMLButtonElement>('replayBack'),
  replayForward:el<HTMLButtonElement>('replayForward'),
  replaySpeed:el<HTMLButtonElement>('replaySpeed'),
  replaySeek:el<HTMLInputElement>('replaySeek'),
  replayMarks:el<HTMLElement>('replayMarks'),
  replaySight:el<HTMLButtonElement>('replaySight'),
  replayView:el<HTMLButtonElement>('replayView'),
  replayExit:el<HTMLButtonElement>('replayExit'),
  replayPrevEvent:el<HTMLButtonElement>('replayPrevEvent'),
  replayNextEvent:el<HTMLButtonElement>('replayNextEvent'),
  replayFollow:el<HTMLButtonElement>('replayFollow'),
  replayAnalysis:el<HTMLButtonElement>('replayAnalysis'),
  replayEventText:el<HTMLOutputElement>('replayEventText'),
  replayClock:el<HTMLOutputElement>('replayClock'),
  rookAmmo:el<HTMLElement>('rookAmmo'),mossAmmo:el<HTMLElement>('mossAmmo'),
  ashAmmo:el<HTMLElement>('ashAmmo'),valeAmmo:el<HTMLElement>('valeAmmo'),
};
for(const key of ['back','undo','redo','moreOrders','siteSettingsToggle','cancelTarget'] as const){
  decorateIconButton(ui[key],key);
}
// Match the approved art across the stationary tools and replay strip.
for(const [key,glyph] of [
  ['wait','wait'],['reload','reload'],['flash','flash'],
  ['stance','crouch'],['briefingToggle','briefing'],
  ['cameraFit','fitView'],['restart','restart'],
  ['watchReplay','watchReplay'],['clear','clearPlan'],
  ['replayMore','settings']
] as const)decorateIconButton(ui[key],glyph);
for(const [key,glyph] of [
  ['replayPrevEvent','previousEvent'],['replayBack','rewind'],
  ['replayForward','fastForward'],['replayNextEvent','nextEvent']
] as const)ui[key].replaceChildren(tacticalIcon(glyph));
const randomSiteSeed=()=>{
  const bytes=new Uint32Array(1);
  if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);
  return bytes[0]||((Date.now()^Math.floor(Math.random()*1e9))>>>0);
};
const startupParams=new URLSearchParams(location.search);
const legacyStudy=startupParams.has('fixedSite');
const requestedSeed=Number(startupParams.get('seed'));
const initialSiteSeed=startupParams.has('seed')&&Number.isSafeInteger(requestedSeed)&&
 requestedSeed>0&&requestedSeed<=0xffffffff?requestedSeed:randomSiteSeed();
const INTEL_PREFERENCE_KEY='fieldwork3d.intel.mode.v1';
let selectedIntelMode:IntelMode=(()=>{
  try{
    const stored=localStorage.getItem(INTEL_PREFERENCE_KEY) as IntelMode|null;
    return stored&&INTEL_MODES.includes(stored)?stored:'exterior-known';
  }catch{return 'exterior-known';}
})();
const requestedConditionParam=startupParams.get('condition');
const requestedCondition=requestedConditionParam!==null&&
  Number.isFinite(Number(requestedConditionParam))?
  Math.max(0,Math.min(100,Number(requestedConditionParam))):null;
function applyRequestedCondition(session:Session){
  if(requestedCondition===null||!session.site)return;
  session.site={...session.site,conditionLevel:requestedCondition};
  activateSite(session.site);
}
const LIGHTING_MODES:LightingMode[]=['day','evening','night','blackout','emergency'];
let selectedLightingMode:LightingMode=
  LIGHTING_MODES.find(mode=>mode===startupParams.get('lighting'))??'day';
const requestedScaleParam=startupParams.get('scale');
let requestedSiteScale:SiteScale=
  ['standard','expanded','small','medium','large'].includes(requestedScaleParam??'')?
    requestedScaleParam as SiteScale:'standard';
const LEGACY_ROSTER_KEY='fieldwork3d.operator-roster.v1';
const QUICK_COSMETICS_KEY='fieldwork3d.quickplay-cosmetics.v1';
let persistentRoster=(()=>{
 let saved:string|null=null;
 try{saved=localStorage.getItem(QUICK_COSMETICS_KEY)??
   localStorage.getItem(LEGACY_ROSTER_KEY);}
 catch{/* Storage is optional. */}
 return freshQuickPlayRoster(readRoster(saved));
})();
// One-time migration: discard old Quick Play combat saves, keep appearances.
try{
 if(localStorage.getItem(LEGACY_ROSTER_KEY)!==null){
  localStorage.setItem(QUICK_COSMETICS_KEY,
   serializeQuickPlayCosmetics(persistentRoster));
  localStorage.removeItem(LEGACY_ROSTER_KEY);
 }
}catch{/* Private browser storage may be unavailable. */}
function saveRoster():boolean{
 try{localStorage.setItem(QUICK_COSMETICS_KEY,
   serializeQuickPlayCosmetics(persistentRoster));return true;}
 catch{return false;}
}
const CAMPAIGN_KEY='fieldwork3d.campaign.v1';
let campaign:CampaignState|null=(()=>{
 try{return readCampaign(localStorage.getItem(CAMPAIGN_KEY));}catch{return null;}
})();
let campaignMode:'menu'|'home'|'mission'|'quick'=
 legacyStudy||startupParams.has('quick')?'quick':'menu';
function saveCampaign():boolean{
 if(!campaign)return false;
 try{localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(campaign));return true;}
 catch{console.warn('Campaign save unavailable');return false;}
}
/** Embedded Studio keeps the live mission mounted. The game remains the
 * sole authority for campaign/Quick Play writes; the iframe edits a draft. */
let studioMode:'quick'|'campaign'='quick';
let studioSelected='rook';
let studioOverlay:HTMLDivElement|null=null;
let studioFrame:HTMLIFrameElement|null=null;
function sendStudioInit(){
 if(!studioFrame?.contentWindow)return;
 const people=studioMode==='campaign'?
  campaign?.operators.filter(o=>o.status!=='retired'&&o.status!=='lost')??[]:
  persistentRoster.members;
 studioFrame.contentWindow.postMessage({
  type:'fw-studio-init',mode:studioMode,selected:studioSelected,
  members:people.map(p=>({
   id:p.id,callsign:p.callsign,appearanceSeed:p.appearanceSeed,
   loadout:p.loadout,wardrobe:p.wardrobe
  })),
  readonly:studioMode==='campaign'?!!campaign?.activeContractId:
   state.phase!=='planning'||replaying
 },location.origin);
}
function closeOperatorStudio(){
 if(studioOverlay)studioOverlay.hidden=true;
 if(studioFrame)studioFrame.src='about:blank';
}
function openOperatorStudio(id?:string,requestedMode?:'quick'|'campaign'){
 studioMode=requestedMode??(campaignMode==='home'||campaignMode==='mission'?
  'campaign':'quick');
 if(studioMode==='campaign'&&!campaign)return;
 if(!studioOverlay){
  studioOverlay=document.createElement('div');
  studioOverlay.id='operatorStudioOverlay';studioOverlay.hidden=true;
  studioFrame=document.createElement('iframe');
  studioFrame.title='Fieldwork Operator Studio';
  studioOverlay.append(studioFrame);document.body.append(studioOverlay);
 }
 studioSelected=id??(studioMode==='campaign'?campaign?.operators[0]?.id:'rook')??'rook';
 studioOverlay.hidden=false;
 const url=new URL('./operator-studio.html',location.href);
 url.searchParams.set('embedded','1');url.searchParams.set('mode',studioMode);
 url.searchParams.set('operator',studioSelected);
 studioFrame!.src=url.href;
 studioFrame!.onload=sendStudioInit;
}
document.getElementById('openOperatorStudio')?.addEventListener('click',()=>
 openOperatorStudio(selected,'quick'));
window.addEventListener('message',event=>{
 if(!studioFrame?.contentWindow||event.source!==studioFrame.contentWindow||
    event.origin!==location.origin||!event.data||typeof event.data!=='object')return;
 const msg=event.data as {type?:string;id?:unknown;
  wardrobe?:unknown;entries?:unknown};
 if(msg.type==='fw-studio-ready'){sendStudioInit();return;}
 if(msg.type==='fw-studio-close'){closeOperatorStudio();return;}
 const batch=msg.type==='fw-studio-commit-batch';
 if(!batch&&msg.type!=='fw-studio-commit')return;
 const edits=validateStudioAppearanceEdits(batch?msg.entries:
  [{id:msg.id,wardrobe:msg.wardrobe}]);
 let ok=false;
 if(edits&&studioMode==='quick'&&state.phase==='planning'&&!replaying){
  const next=applyStudioRosterEdits(persistentRoster,edits);
  if(next){
   const previous=persistentRoster;persistentRoster=next;
   ok=saveRoster();
   if(ok){applyRosterIdentity(state,persistentRoster);
    renderOperationsBoard();updateHud();}
   else persistentRoster=previous;
  }
 }else if(edits&&studioMode==='campaign'&&campaign&&!campaign.activeContractId){
  const next=applyStudioCampaignEdits(campaign,edits);
  if(next){
   const previous=campaign;campaign=next;
   ok=saveCampaign();
   if(ok)showCampaignHome();
   else campaign=previous;
  }
 }
 if(edits?.length)studioSelected=edits[0].id;
 if(batch){
  studioFrame.contentWindow.postMessage({
   type:'fw-studio-batch-saved',ids:edits?.map(e=>e.id)??[],ok
  },location.origin);
 }else{
  studioFrame.contentWindow.postMessage({
   type:'fw-studio-saved',id:msg.id,ok
  },location.origin);
 }
});
function applyCampaignSkills(){
 if(campaignMode!=='mission'||!campaign)return;
 for(const a of team(state)){
  const m=tacticalSlotOperator(campaign,a.id);
  if(m){
   a.name=m.callsign;a.skills={...m.skills};a.weapon=m.weapon;
   a.appearanceSeed=m.appearanceSeed;
   a.wardrobe=m.wardrobe;
   a.equipment=m.loadout;
    a.weaponConfiguration=m.weaponConfiguration;
    a.medicalSupplies={...m.medicalSupplies};
    a.wedgeRemaining=issuedWedges(m.loadout);
    a.weaponLightOn=m.weaponConfiguration.slots.light==='light-compact';
   a.flashCharges=equippedFlashCharges(m.loadout);
   const protection=initialArmorIntegrity(m.loadout);
   a.armorIntegrity=Math.min(protection.torso,m.armorCondition.torso);
   a.helmetIntegrity=Math.min(protection.head,m.armorCondition.head);
   a.loadMovementScale=loadMovementScale(m.loadout,m.weaponConfiguration);
   a.magazine=m.magazine;a.reserve=m.reserve;
   a.insertedMagazineId=m.loadedMagazineId;
   a.spareMagazines=a.weapon==='shotgun'?[]:
    stageMagazines(m.magazines,m.loadout);
   if(m.recoveryDays>0&&m.injuries>0){
    a.injuryStage=Math.max(a.injuryStage,Math.min(2,m.injuries));
    a.health=Math.min(a.health,4-a.injuryStage);
   }
  }
 }
 if(!state.started){
  const squad=team(state);
  const issued=allocateFlashSupply(squad.map(a=>a.flashCharges),campaign.supplies.flash);
  squad.forEach((a,i)=>{a.flashCharges=issued[i];});
  state.flashRemaining=issued.reduce((n,qty)=>n+qty,0);
 }
}
let state:Session=newSession(0,legacyStudy?undefined:initialSiteSeed,
  selectedIntelMode,requestedSiteScale);
state.lightingMode=selectedLightingMode;
applyRequestedCondition(state);
applyRosterIdentity(state,persistentRoster);
applyCampaignSkills();
let recorder=new MissionRecorder();recorder.capture(state,true);
const deploymentButton=document.createElement('button');
deploymentButton.type='button';deploymentButton.id='deploymentChoice';
deploymentButton.style.cssText='display:block;margin:10px 0;padding:8px 12px;'+
 'font:inherit;letter-spacing:.06em;background:#222b2b;color:#e5e2ce;'+
 'border:1px solid #7b8475;border-radius:3px;cursor:pointer';
ui.briefingRoster.insertAdjacentElement('afterend',deploymentButton);
let deploymentState:Session|null=null;
let deployOptions:ReturnType<typeof availableDeployments>=[];
let selectedEntry='FRONT';
function refreshDeployment(){
 if(deploymentState!==state){
  deploymentState=state;selectedEntry='FRONT';
  deployOptions=availableDeployments(state).filter(c=>c.id!=='FRONT');
 }
 const editable=state.phase==='planning'&&!state.started&&!replaying&&
  team(state).every(a=>a.plan.length===0);
 deploymentButton.hidden=!state.site||state.started||deployOptions.length===0;
 deploymentButton.disabled=!editable;
 deploymentButton.textContent='ENTRY · '+
  (selectedEntry==='FRONT'?'FRONT (DEFAULT)':selectedEntry.toUpperCase())+
  ' · CHANGE';
 deploymentButton.title=editable?'Cycle physically verified exterior entry points':
  'Select the insertion before plotting routes or starting GO';
}
deploymentButton.addEventListener('click',()=>{
 refreshDeployment();
 if(deploymentButton.disabled)return;
 const ids=['FRONT',...deployOptions.map(c=>c.id)];
 const next=ids[(ids.indexOf(selectedEntry)+1)%ids.length];
 if(selectDeployment(state,next)){
  selectedEntry=next;
  recorder=new MissionRecorder();recorder.capture(state,true);
  refreshDeployment();
 }
});
const OPERATION_HISTORY_KEY='fieldwork3d.operation-history.v1';
let recordedOperation:Session|null=null;
function operationHistory():OperationRecord[]{
  try{return parseOperationHistory(localStorage.getItem(OPERATION_HISTORY_KEY));}
  catch{return [];}
}
function recordCompletedOperation(){
  if(replaying||recordedOperation===state||!state.started||
    (state.phase!=='won'&&state.phase!=='lost'))return;
  recordedOperation=state;
  if(campaignMode==='mission'&&campaign?.activeContractId){
   const members=team(state);
   const careerId=(slotId:string)=>tacticalSlotOperator(campaign!,slotId)?.id??slotId;
   const mapping=Object.fromEntries(members.map(a=>[a.id,careerId(a.id)]));
   const stats=debrief(state);
   const result:CampaignReport={
    id:'operation-'+campaign.activeContractId,contractId:campaign.activeContractId,
    day:campaign.day,outcome:state.phase==='won'?'success':'failure',
    grade:stats.grade,elapsed:stats.time,
    participatingIds:members.map(a=>careerId(a.id)),
    casualties:members.filter(a=>a.health<=0).map(a=>careerId(a.id)),
    stabilizedIds:stats.stabilizedCasualties.map(careerId),
    criticalIds:stats.criticalCasualties.map(careerId),
    evacuatedIds:stats.evacuatedCasualties.map(careerId),
    medicalRemaining:Object.fromEntries(members.map(a=>[
     careerId(a.id),{...a.medicalSupplies}])),
    objective:stats.objective,
    flashUsed:state.battleEvents.filter(e=>e.kind==='flash'&&
     e.actor!==undefined&&e.text.endsWith('FLASH OUT')).length,
    events:careerEventsForOperation(campaign,'operation-'+campaign.activeContractId,state.battleEvents,mapping),
    performance:members.map(a=>({
     id:careerId(a.id),shots:a.shots,hits:a.hits,pointShots:a.pointShots,
     aimedShots:a.aimedShots,longHits:a.longHits,injuryStage:a.injuryStage,
     survived:a.health>0,magazine:a.magazine,reserve:a.reserve,
     armorIntegrity:a.armorIntegrity,helmetIntegrity:a.helmetIntegrity,
     spareMagazines:a.spareMagazines.map(m=>({...m})),
     loadedMagazineId:a.insertedMagazineId
    }))
   };
   campaign=resolveOperation(campaign,result);saveCampaign();return;
  }
  const stats=debrief(state);
  const record:OperationRecord={
    seed:state.site?.seed??state.variant,
    kind:state.missionType,
    outcome:state.phase==='won'?'success':'failure',
    grade:stats.grade,elapsed:stats.time,casualties:stats.casualties
  };
  try{localStorage.setItem(OPERATION_HISTORY_KEY,
    JSON.stringify(addOperationRecord(operationHistory(),record)));}
  catch{/* Private mode may reject local storage. Game still works. */}
}
let replaying=false,replayPlaying=false,replayTime=0,replayRate=1;
let replayPresentation:ReplayPresentation|null=null;
let replayOmniscient=true,finishedSession:Session|null=null;
let replayFollow=false,replayAnalysis=false,replayFollowId='rook';
let stage:TacticalScene3D|null=null;
let viewMode:ViewMode='iso';
try{stage=new TacticalScene3D();}
catch(error){console.warn('3D unavailable; reverting to tactical plan',error);
  viewMode='plan2d';}
// Explicit developer opt-in only; no hidden intelligence in normal gameplay.
const awarenessParam=new URLSearchParams(location.search).get('awareness');
const awarenessPanel=awarenessParam!==null?
  document.createElement('output'):null;
if(awarenessPanel){
 awarenessPanel.id='awarenessDiagnostics';
 Object.assign(awarenessPanel.style,{
  position:'fixed',right:'8px',top:'70px',zIndex:'75',
  maxWidth:'260px',whiteSpace:'pre-wrap',pointerEvents:'none',
  padding:'9px',font:'11px/1.35 monospace',
  color:'#dce3c9',background:'rgba(5,10,10,.88)'
 });
 document.body.append(awarenessPanel);
}
const navDiagnostics=new URLSearchParams(location.search).has('nav');
const navPanel=navDiagnostics?document.createElement('output'):null;
if(navPanel){
  navPanel.id='navDiagnostics';
  Object.assign(navPanel.style,{
    position:'fixed',left:'8px',top:'68px',zIndex:'70',
    pointerEvents:'none',background:'rgba(6,12,11,.83)',
    color:'#dce3c9',padding:'8px',font:'11px monospace',
    maxWidth:'210px',whiteSpace:'pre-wrap'
  });
  document.body.append(navPanel);
}
/** Optional, compact between-mission operations board.
 * No mandatory management screen blocks immediate mission deployment.
 */
const operationsToggle=document.createElement('button');
operationsToggle.id='operationsBoardToggle';operationsToggle.type='button';
operationsToggle.textContent='SQUAD';
operationsToggle.setAttribute('aria-label','Open Quick Play squad preparation and equipment');
operationsToggle.title='Edit squad and equipment before the mission';
(document.querySelector('.mode')??ui.siteSettings).append(operationsToggle);
let lastRangeTrial:RangeTrial|null=null;
const rangeTelemetry=document.createElement('aside');
rangeTelemetry.id='equipmentRangeTelemetry';
rangeTelemetry.hidden=true;
rangeTelemetry.style.cssText='position:fixed;top:65px;right:10px;z-index:15;'+
 'max-width:min(80vw,460px);padding:8px 12px;border:1px solid #6e9480;'+
 'border-radius:8px;background:#152421e8;color:#d9e7d6;'+
 'font:11px/1.6 Oxanium,sans-serif;pointer-events:none;white-space:pre-line';
rangeTelemetry.setAttribute('aria-label','Equipment range live metrics');
document.body.append(rangeTelemetry);
const operationsBoard=document.createElement('section');
operationsBoard.id='operationsBoard';
operationsBoard.hidden=true;
operationsBoard.setAttribute('aria-label','Squad operations board');
Object.assign(operationsBoard.style,{
 position:'fixed',right:'12px',
 bottom:'calc(var(--tactical-hud-height,138px) + 14px + env(safe-area-inset-bottom))',
 zIndex:'95',boxSizing:'border-box',
 width:'min(420px, calc(100vw - 24px))',maxHeight:'min(52dvh, 530px)',
 overflowY:'auto',padding:'14px',borderRadius:'12px',
 background:'rgba(12,20,20,.96)',border:'1px solid #687973',
 color:'#e0e9de',font:'13px/1.45 Oxanium, sans-serif',
 boxShadow:'0 12px 35px #0008'
});
document.body.append(operationsBoard);
// Weapon choices are explicit: never change the selected weapon merely by opening a menu.
const weaponChooser=document.createElement('section');
weaponChooser.id='quickWeaponChooser';
weaponChooser.className='fw-weapon-chooser';
weaponChooser.hidden=true;
weaponChooser.setAttribute('role','group');
weaponChooser.setAttribute('aria-label','Choose selected operator weapon');
document.body.append(weaponChooser);
function hideWeaponChooser(){
 weaponChooser.hidden=true;
 ui.loadout.setAttribute('aria-expanded','false');
}
function showWeaponChooser(){
 const current=team(state).find(a=>a.id===selected);
 if(!current||campaignMode==='mission'||state.phase!=='planning'||replaying)return;
 collapseTacticalSheets('weapon');
 weaponChooser.replaceChildren();
 const label=document.createElement('div');
 label.className='fw-weapon-chooser-title';
 label.textContent='CHOOSE WEAPON · '+current.name;
 weaponChooser.append(label);
 for(const id of ['carbine','smg','rifle','shotgun'] as const){
  const btn=document.createElement('button');
  btn.type='button';btn.className='fw-button';
  btn.textContent=WEAPONS[id].label;
  btn.setAttribute('aria-pressed',String(id===current.weapon));
  btn.addEventListener('click',()=>{
   if(equipWeaponChoice(state,selected,id)){
    hideWeaponChooser();updateHud();
   }
  });
  weaponChooser.append(btn);
 }
 const cancel=document.createElement('button');
 cancel.type='button';cancel.className='fw-button fw-weapon-dismiss';
 cancel.textContent='CLOSE';
 cancel.addEventListener('click',hideWeaponChooser);
 weaponChooser.append(cancel);
 weaponChooser.hidden=false;
 ui.loadout.setAttribute('aria-expanded','true');
}
weaponChooser.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();hideWeaponChooser();ui.loadout.focus();}
});
// One operator expanded at a time in the mobile preparation sheet.
let expandedQuickOperator:string|null='rook';
let expandedQuickKit:string|null=null;
let expandedQuickWardrobe:string|null=null;
let expandedQuickHeadwear:string|null=null;
let expandedQuickHeadwearCamo:string|null=null;
const quickFabricPickerState:{expanded:boolean;openChannel:null|import('./operator-fabric-camo-policy.ts').FabricCamoChannel;filter:string}={expanded:false,openChannel:null,filter:''};
let expandedQuickWeapon:string|null=null;
let quickWorkbench:WeaponWorkbenchPreview|null=null;
let quickWorkbenchId:string|null=null;
function renderOperationsBoard(){
 quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
 operationsBoard.replaceChildren();
 const heading=document.createElement('div');
 heading.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px';
 const title=document.createElement('strong');
 title.textContent='SQUAD OPERATIONS';heading.append(title);
 const close=document.createElement('button');
 close.type='button';close.textContent='CLOSE';
 close.addEventListener('click',()=>{operationsBoard.hidden=true;});
 heading.append(close);
 const customize=document.createElement('button');
 customize.type='button';customize.textContent='CUSTOMIZE SQUAD';
 customize.addEventListener('click',()=>openOperatorStudio(selected,'quick'));
 heading.append(customize);
 const range=document.createElement('button');range.type='button';
 range.textContent='TEST RANGE';range.title='Nonpersistent equipment range';
 range.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  campaignMode='quick';
  lastRangeTrial=null;
  reset(state.variant,undefined,undefined,equipmentTrainingSite());
  showUiHelp('TEST RANGE · USE SUPPRESS TO FIRE AT THE TARGET PLATES · RESTART OR LEAVE RANGE TO EXIT',9000);
 });
 heading.append(range);operationsBoard.append(heading);
 const history=operationHistory();
 const intro=document.createElement('p');
 intro.textContent='OPERATIONS: '+history.length+
  ' · LAST: '+(history.at(-1)?.grade??'NONE')+
  ' · Fresh health and equipment every Quick Play round.';
 operationsBoard.append(intro);
 for(const member of persistentRoster.members){
  const card=document.createElement('details');
  card.dataset.squadCard=member.id;
  card.className='fw-squad-card';
  card.open=expandedQuickOperator===member.id;
  card.addEventListener('toggle',()=>{
   if(card.open){
    expandedQuickOperator=member.id;
    for(const other of operationsBoard.querySelectorAll<HTMLDetailsElement>(
     'details[data-squad-card]')){
     if(other!==card&&other.open)other.open=false;
    }
   }else if(expandedQuickOperator===member.id)expandedQuickOperator=null;
  });
  const name=document.createElement('summary');
  name.textContent=member.callsign+' · '+member.weapon.toUpperCase();
  card.append(name);
  const details=document.createElement('p');
  details.textContent='FULL HEALTH · '+member.magazine+' / '+
   member.reserve+' RDS · '+member.magazines.length+' SPARE MAGS · READY';
  card.append(details);
  const actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  const supply=document.createElement('button');
  supply.type='button';supply.textContent='RESUPPLY';
  supply.setAttribute('aria-label','Resupply '+member.callsign);
  supply.addEventListener('click',()=>{
   if(state.phase!=='planning'||replaying)return;
   persistentRoster=resupplyRoster(persistentRoster,member.id);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   renderOperationsBoard();updateHud();
  });
  actions.append(supply);
  const equip=fieldworkSelectField('WEAPON · '+member.callsign,
   [{value:'carbine',label:'Carbine'},{value:'smg',label:'SMG'},
    {value:'rifle',label:'Rifle'},{value:'shotgun',label:'Shotgun'}],
   member.weapon,next=>{
    if(state.phase!=='planning'||replaying)return;
    persistentRoster=equipRoster(persistentRoster,member.id,next as typeof member.weapon);
    saveRoster();applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=member.id;renderOperationsBoard();updateHud();
   });
  const look=document.createElement('button');
  look.type='button';look.textContent='EDIT APPEARANCE';
  look.setAttribute('aria-label','Open wardrobe for '+member.callsign);
  look.addEventListener('click',()=>{
   expandedQuickKit=member.id;expandedQuickWardrobe=member.id;
   kit.open=true;wardrobeEditor.open=true;
   wardrobeEditor.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
  actions.append(equip,look);
  const rename=document.createElement('button');
  rename.type='button';rename.textContent='CALLSIGN';
  rename.addEventListener('click',()=>{
   if(state.phase!=='planning'||replaying)return;
   const next=window.prompt('Operator callsign',member.callsign);
   if(next===null)return;
   persistentRoster=renameRosterMember(persistentRoster,member.id,next);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   expandedQuickKit=member.id;renderOperationsBoard();updateHud();
  });
  actions.append(rename);
  card.append(actions);
  const kit=document.createElement('details');
  kit.open=expandedQuickKit===member.id;
  kit.addEventListener('toggle',()=>{if(kit.open)expandedQuickKit=member.id;
   else if(expandedQuickKit===member.id)expandedQuickKit=null;});
  const kitTitle=document.createElement('summary');
  kitTitle.textContent='EQUIPMENT / LOADOUT';
  kitTitle.style.cssText='min-height:40px;cursor:pointer;padding:11px 0;font-weight:700';
  kit.append(kitTitle);
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
    if(state.phase!=='planning'||replaying)return;
    persistentRoster=equipRosterGear(persistentRoster,member.id,slot,select.value);
    saveRoster();applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=member.id;renderOperationsBoard();updateHud();
   });
   row.append(label,select);kit.append(row);
  }
  const wardrobeEditor=document.createElement('details');
  wardrobeEditor.open=expandedQuickWardrobe===member.id;
  wardrobeEditor.addEventListener('toggle',()=>{
   if(wardrobeEditor.open)expandedQuickWardrobe=member.id;
   else if(expandedQuickWardrobe===member.id)expandedQuickWardrobe=null;
  });
  const wardrobeTitle=document.createElement('summary');
  wardrobeTitle.textContent='WARDROBE / COSMETIC APPEARANCE';
  wardrobeTitle.style.cssText='min-height:40px;cursor:pointer;padding:11px 0;font-weight:700';
  wardrobeEditor.append(wardrobeTitle);
  const currentWardrobe=readWardrobe(member.wardrobe);
  const effective=resolvedWardrobe(currentWardrobe,member.loadout);
  const writeCosmetics=(next:typeof currentWardrobe)=>{
   if(state.phase!=='planning'||replaying)return;
   persistentRoster=setRosterWardrobe(persistentRoster,member.id,next);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   expandedQuickKit=member.id;expandedQuickWardrobe=member.id;
   renderOperationsBoard();updateHud();
  };
  for(const slot of WARDROBE_SLOTS){
   const row=document.createElement('label');
   row.style.cssText='display:flex;justify-content:space-between;gap:8px;margin:7px 0';
   const label=document.createElement('span');
   label.textContent=slot.replace(/([A-Z])/g,' $1').toUpperCase();
   const select=document.createElement('select');
   select.style.cssText='max-width:65%;min-height:40px;background:#243530;color:#e5e9d8';
   for(const item of wardrobeItemsForSlot(slot)){
    const option=document.createElement('option');
    option.value=item.id;option.textContent=item.name;
    const next=setWardrobeStyle(currentWardrobe,slot,item.id);
    option.disabled=resolvedWardrobe(next,member.loadout)[slot]!==item.id;
    select.append(option);
   }
   select.value=effective[slot];
   select.addEventListener('change',()=>writeCosmetics(
    setWardrobeStyle(currentWardrobe,slot,select.value)));
   row.append(label,select);wardrobeEditor.append(row);
  }
  wardrobeEditor.append(createHeadwearAppearancePicker(member.loadout,
   currentWardrobe,writeCosmetics,{
    expanded:expandedQuickHeadwear===member.id,
    camoExpanded:expandedQuickHeadwearCamo===member.id,
    onExpandedChange:open=>{expandedQuickHeadwear=open?member.id:null;},
    onCamoExpandedChange:open=>{expandedQuickHeadwearCamo=open?member.id:null;}
   }));
  wardrobeEditor.append(createWardrobeFabricCamoPicker(member.loadout,
   currentWardrobe,writeCosmetics,quickFabricPickerState));
  const colors=topColorwayChoices(effective.top);
  if(colors.length){
   const row=document.createElement('label');
   row.style.cssText='display:flex;justify-content:space-between;gap:8px;margin:8px 0';
   const text=document.createElement('span');text.textContent='GARMENT MATERIAL';
   const select=document.createElement('select');
   select.setAttribute('aria-label','Garment material for '+member.callsign);
   select.style.cssText='min-height:40px;max-width:66%';
   for(const [value,name] of colors){
    const option=document.createElement('option');option.value=value;
    option.textContent=name;select.append(option);
   }
   select.value=resolvedTopColorway(effective.top,currentWardrobe.topColorway);
   select.addEventListener('change',()=>writeCosmetics({...currentWardrobe,
    topColorway:select.value}));
   row.append(text,select);wardrobeEditor.append(row);
  }
  for(const [field,label,options] of [
   ['sleeveState','SLEEVE FINISH',SLEEVE_STATES],
   ['trouserHem','TROUSER HEM',TROUSER_HEMS]
  ] as const){
   const row=document.createElement('label');
   row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0';
   const caption=document.createElement('span');caption.textContent=label;
   const select=document.createElement('select');
   select.setAttribute('aria-label',label+' for '+member.callsign);
   select.style.cssText='min-height:40px;max-width:66%;background:#243530;color:#e5e9d8';
   for(const id of options){
    const option=document.createElement('option');option.value=id;
    option.textContent=id.toUpperCase();select.append(option);
   }
   select.value=currentWardrobe[field];
   select.disabled=field==='sleeveState'?
    sleeveStateOptions(effective.top).length===1:
    !['bdu-trousers','acu-trousers','gorka-trousers'].includes(effective.trousers)||
    effective.footwear==='bare-feet';
   select.addEventListener('change',()=>{
    if(field==='sleeveState')writeCosmetics({...currentWardrobe,
     sleeveState:select.value as WardrobeOptions['sleeveState']});
    else writeCosmetics({...currentWardrobe,
     trouserHem:select.value as WardrobeOptions['trouserHem']});
   });
   row.append(caption,select);wardrobeEditor.append(row);
  }
  const randomize=document.createElement('button');
  randomize.type='button';randomize.textContent='RANDOMIZE FACE / LOOK';
  randomize.setAttribute('aria-label','Choose another appearance for '+member.callsign);
  randomize.addEventListener('click',()=>{
   if(state.phase!=='planning'||replaying)return;
   persistentRoster=cycleRosterAppearance(persistentRoster,member.id);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   expandedQuickKit=member.id;renderOperationsBoard();updateHud();
  });
  wardrobeEditor.append(randomize);

  const cosmeticExtras=document.createElement('details');
  const extraTitle=document.createElement('summary');
  extraTitle.textContent='EMPTY / COSMETIC ATTACHMENTS';
  cosmeticExtras.append(extraTitle);
  for(const slot of WARDROBE_ACCESSORY_SLOTS){
   const row=document.createElement('label');
   row.style.cssText='display:flex;justify-content:space-between;gap:8px;margin:7px 0';
   const label=document.createElement('span');
   label.textContent=slot.replace(/([A-Z])/g,' $1').toUpperCase();
   const picker=document.createElement('select');
   picker.style.cssText='max-width:65%;min-height:40px;background:#243530;color:#e5e9d8';
   for(const name of WARDROBE_ACCESSORY_OPTIONS[slot]){
    const option=document.createElement('option');
    option.value=name;option.textContent=name.replaceAll('-',' ');
    picker.append(option);
   }
   picker.value=currentWardrobe.accessories[slot];
   picker.addEventListener('change',()=>writeCosmetics({
    ...currentWardrobe,
    accessories:{...currentWardrobe.accessories,[slot]:picker.value}
   }));
   row.append(label,picker);cosmeticExtras.append(row);
  }
  wardrobeEditor.append(cosmeticExtras);
  kit.append(wardrobeEditor);
  const weaponEditor=document.createElement('details');
  weaponEditor.open=expandedQuickWeapon===member.id;
  const mountSelectors=new Map<WeaponAttachmentSlot,HTMLSelectElement>();
  const workbenchHost=document.createElement('div');
  workbenchHost.style.cssText='margin:10px 0 14px';
  const syncWorkbench=()=>{
   const active=kit.open&&weaponEditor.open;
   if(!active){if(quickWorkbenchId===member.id){
    quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
   }return;}
   if(quickWorkbenchId===member.id)return;
   quickWorkbench?.dispose();quickWorkbench=null;
   quickWorkbenchId=member.id;
   quickWorkbench=new WeaponWorkbenchPreview(workbenchHost,
    member.weaponConfiguration,slot=>{
     const select=mountSelectors.get(slot);
     if(!select)return;
     select.focus({preventScroll:true});
     select.scrollIntoView({block:'nearest',behavior:'smooth'});
     try{select.showPicker();}catch{/* native picker unavailable */}
    });
  };
  weaponEditor.addEventListener('toggle',()=>{
   if(weaponEditor.open)expandedQuickWeapon=member.id;
   else if(expandedQuickWeapon===member.id)expandedQuickWeapon=null;
   syncWorkbench();
  });
  kit.addEventListener('toggle',syncWorkbench);
  const weaponTitle=document.createElement('summary');
  weaponTitle.textContent='PRIMARY WEAPON / ATTACHMENTS';
  weaponTitle.style.cssText='min-height:40px;cursor:pointer;padding:12px 0;font-weight:700;font-size:11px';
  weaponEditor.append(weaponTitle,workbenchHost);
  for(const slot of WEAPON_ATTACHMENT_SLOTS){
   const row=document.createElement('label');
   row.style.cssText='display:flex;justify-content:space-between;gap:8px;align-items:center;margin:8px 0';
   const label=document.createElement('span');label.textContent=slot.toUpperCase();
   label.style.fontSize='10px';
   const select=document.createElement('select');
   select.setAttribute('aria-label',slot+' attachment for '+member.callsign);
   select.style.cssText='max-width:65%;min-height:44px;touch-action:manipulation;background:#243530;color:#e5e9d8;border-radius:7px;padding:6px';
   for(const item of Object.values(WEAPON_ATTACHMENTS)){
    if(item.slot!==slot||!item.compatible.includes(member.weapon))continue;
    const option=document.createElement('option');
    option.value=item.id;option.textContent=item.name;select.append(option);
   }
   select.value=member.weaponConfiguration.slots[slot];
   select.disabled=state.phase!=='planning'||replaying;
   mountSelectors.set(slot,select);
   select.addEventListener('focus',()=>quickWorkbenchId===member.id&&
    quickWorkbench?.setActiveSlot(slot));
   select.addEventListener('change',()=>{
    if(state.phase!=='planning'||replaying)return;
    persistentRoster=configureRosterWeapon(persistentRoster,member.id,slot,select.value);
    saveRoster();applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    renderOperationsBoard();updateHud();
   });
   row.append(label,select);weaponEditor.append(row);
  }
  const measured=resolveWeaponAssembly(member.weaponConfiguration);
  const properties=document.createElement('p');
  properties.style.cssText='font-size:10px;opacity:.75;line-height:1.55';
  properties.textContent='ASSEMBLED MASS '+measured.massKg.toFixed(2)+' KG · BALANCE '+
   measured.balanceX.toFixed(1)+' · MUZZLE EXTENSION '+
   (measured.muzzleX-19.5).toFixed(1)+' UNITS';
  weaponEditor.append(properties);kit.append(weaponEditor);
  const carrying=carryCapacityReport(member.loadout,member.magazines);
  const carryItems=carrying.placements.filter(p=>p.kind!=='magazine');
  if(carryItems.length){
   const note=document.createElement('p');
   note.style.cssText='font-size:10px;opacity:.78;margin:10px 0';
   note.textContent='PHYSICAL CARRY · '+carryItems.map(p=>
    p.kind.toUpperCase()+' '+p.location.toUpperCase()+' / '+
    p.accessSeconds.toFixed(2)+'s').join(' · ');
   kit.append(note);
  }
  const carried=member.weapon==='shotgun'?[]:
   stageMagazines(member.magazines,member.loadout);
  if(carried.length){
   const heading=document.createElement('strong');
   heading.textContent='MAGAZINE LOCATIONS';
   heading.style.cssText='display:block;font-size:11px;margin:14px 0 6px';
   kit.append(heading);
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
     if(state.phase!=='planning'||replaying)return;
     persistentRoster=moveRosterMagazine(persistentRoster,member.id,
      mag.id,select.value as MagazineLocation);
     saveRoster();applyRosterIdentity(state,persistentRoster);
     expandedQuickKit=member.id;renderOperationsBoard();updateHud();
    });
    row.append(select);kit.append(row);
   }
  }
  card.append(kit);operationsBoard.append(card);
 }
 const hint=document.createElement('p');
 hint.textContent='Select an operator to edit. Close to resume planning.';
 operationsBoard.append(hint);
}
operationsBoard.addEventListener('keydown',event=>{
 if(event.key==='Escape'){operationsBoard.hidden=true;operationsToggle.focus();}
});
/** Only one major tactical sheet owns the viewport and touch focus at a time. */
function collapseTacticalSheets(except:'squad'|'weapon'|'settings'|'tools'|'briefing'|null){
 if(except!=='squad')operationsBoard.hidden=true;
 if(except!=='weapon')hideWeaponChooser();
 if(except!=='settings'){
  ui.siteSettings.hidden=true;
  ui.siteSettingsToggle.setAttribute('aria-expanded','false');
  closeSiteChoice();
 }
 if(except!=='tools'){
  ui.orders.classList.add('compact');
  ui.moreOrders.setAttribute('aria-pressed','false');
  ui.moreOrders.setAttribute('aria-label','More tactical tools');
  ui.moreOrders.title='More tactical tools';
 }
 if(except!=='briefing'){
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
 }
}
operationsToggle.addEventListener('click',()=>{
 if(state.phase!=='planning'||replaying)return;
 const opening=operationsBoard.hidden;
 collapseTacticalSheets(opening?'squad':null);
 operationsBoard.hidden=!opening;
 if(opening){
  hideContextPalette();
  renderOperationsBoard();
 }
 updateContext();
});
let selected='rook';
let evacMode:{patientId:string;mode:'drag'|'carry'}|null=null;
let looking=false,flashMode=false;
let firePlacement:'suppress'|null=null;
let lookMode:'look'|'watch'='look';
let contextSignature='';
let contextActionsSignature='';
let lastContextSide:MenuSide|null=null;
let lastAuthoringAt=0;
const paletteMotion=new PaletteMotion();
const reducedMotionMedia=matchMedia('(prefers-reduced-motion: reduce)');
let paletteWidth=0,paletteHeight=0;
let lastPlacementKey='';
const contextPointerIds=new Set<number>();
let tetherBrightUntil=0;
let paletteExit:Animation|null=null;
const contextTether=document.createElement('div');
contextTether.id='contextTether';
contextTether.setAttribute('aria-hidden','true');
document.body.append(contextTether);
function hideContextPalette(){
  lastPlacementKey='';
  // Mutually exclusive sheets must take over immediately. A fading palette
  // still counts as visible/hit-testable and can obscure the TOOLS drawer.
  const exclusive=!ui.orders.classList.contains('compact')||
    !ui.siteSettings.hidden||!ui.briefingPanel.hidden;
  if(!paletteMotion.active){
    if(exclusive){paletteExit?.cancel();paletteExit=null;
      ui.context.hidden=true;contextTether.hidden=true;}
    return;
  }
  paletteMotion.hide();contextTether.hidden=true;
  ui.context.style.pointerEvents='none';
  if(reducedMotionMedia.matches||exclusive){
    paletteExit?.cancel();paletteExit=null;
    ui.context.hidden=true;return;
  }
  paletteExit?.cancel();
  paletteExit=ui.context.animate([
    {opacity:1,scale:1},{opacity:0,scale:.96}
  ],{duration:115,easing:'ease-in',fill:'forwards'});
  const exit=paletteExit;
  exit.onfinish=()=>{
    if(!paletteMotion.active){ui.context.hidden=true;exit.cancel();}
    if(paletteExit===exit)paletteExit=null;
  };
}
function advanceContextPalette(dt:number){
  if(ui.context.hidden||!paletteMotion.active){contextTether.hidden=true;return;}
  const reduced=reducedMotionMedia.matches;
  paletteMotion.step(dt,reduced);
  const x=paletteMotion.x.position,y=paletteMotion.y.position;
  ui.context.style.transform='translate3d('+x.toFixed(2)+'px,'+
    y.toFixed(2)+'px,0)';
  const w=paletteWidth,h=paletteHeight;
  const ax=paletteMotion.anchorX,ay=paletteMotion.anchorY;
  const bx=Math.max(x,Math.min(ax,x+w));
  const by=Math.max(y,Math.min(ay,y+h));
  const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
  const visible=length>24&&!reduced;
  contextTether.hidden=!visible;
  if(visible){
    // At long distance use only a nearby pointer instead of cutting
    // straight across the entire tactical board.
    const short=length>390,segment=short?45:length;
    const vx=dx/length,vy=dy/length;
    const sx=short?bx-vx*segment:ax,sy=short?by-vy*segment:ay;
    contextTether.style.left=sx+'px';contextTether.style.top=sy+'px';
    contextTether.style.width=segment+'px';
    contextTether.style.opacity=performance.now()<tetherBrightUntil?'.75':
      length>390?'.32':length>210?'.22':'.43';
    contextTether.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  }
}
const auditRouteMode=new URLSearchParams(location.search).has('audit');
let selectedNode:number|null=null;
// Executed WATCH has no queued waypoint, but its targeting handle is selectable.
let selectedActiveWatch=false;
let doorMenuDismissedId:string|null=null;
let flashDoorId:string|null=null;
let armedOrigin:'here'|'end'='end';
let doorFocusId:string|null=null;
let draggingNode:Pt|null=null;
let draggingWatchTarget=false;
function cancelTargeting(){
  const hadTarget=looking||flashMode||!!firePlacement||!!evacMode;
  if(hadTarget){
    const actor=uid(selected);
    if(actor)tacticalFeedback.emit('cancel',actor.p,'CANCELLED');
  }
  looking=false;flashMode=false;firePlacement=null;flashDoorId=null;
  evacMode=null;contextSignature='';updateHud();
}
const fogCanvas=document.createElement('canvas');
fogCanvas.width=FOG_WIDTH;fogCanvas.height=FOG_HEIGHT;
const fogContext=fogCanvas.getContext('2d');
if(!fogContext)throw Error('Fog canvas unavailable');
let fogStamp=-1;
let fogSession:Session|null=null;
let fogIntelMode='';
let audio:AudioContext|null=null;
let lastSoundShotId=0,lastEventAudio='';
let lastFootstepSoundTime=0;
const playTone=(frequency:number,decay:number,noise=false,
  level=1,pan=0)=>{
  try{
    if(!audio)return;
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=noise?'sawtooth':'triangle';osc.frequency.value=frequency;
    gain.gain.setValueAtTime(.065*Math.max(.02,level),audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+decay);
    osc.connect(gain);
    if(typeof audio.createStereoPanner==='function'){
      const stereo=audio.createStereoPanner();
      stereo.pan.value=Math.max(-1,Math.min(1,pan));
      gain.connect(stereo);stereo.connect(audio.destination);
    }else gain.connect(audio.destination);
    osc.start();osc.stop(audio.currentTime+decay+.01);
  }catch{/* Audio must never interrupt control. */}
};
// Separate, low-volume UI cues reuse the existing unlocked WebAudio context.
let uiSoundEnabled=true,lastUiCue=0;
try{uiSoundEnabled=localStorage.getItem('fieldwork3d.ui.sound')!=='off';}
catch{/* Storage is optional. */}
function uiClickTone(kind:'select'|'command'|'go'|'pause'|'warning'){
  if(!uiSoundEnabled)return;
  const now=performance.now();if(now-lastUiCue<75)return;
  lastUiCue=now;
  unlockAudio();
  try{
    if(!audio||audio.state!=='running')return;
    const frequencies={select:480,command:610,go:330,pause:255,warning:170};
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type=kind==='go'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(frequencies[kind],audio.currentTime);
    if(kind==='go')oscillator.frequency.exponentialRampToValueAtTime(
      240,audio.currentTime+.14);
    const duration=kind==='go'?.15:kind==='pause'?.085:.055;
    gain.gain.setValueAtTime(kind==='go'?.018:.010,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
    oscillator.connect(gain);gain.connect(audio.destination);
    oscillator.start();oscillator.stop(audio.currentTime+duration+.015);
  }catch{/* UI feedback never blocks interaction. */}
}
function unlockAudio(){
  try{
    if(!audio&&typeof AudioContext!=='undefined')audio=new AudioContext();
    if(audio?.state==='suspended')void audio.resume();
  }catch{/* WebAudio may be unavailable in embedded browsers. */}
}

let last=performance.now(),accum=0,hudAt=0;
let previousRenderActors:Record<string,RenderActor>|null=null;
const displayRouteCache=new DisplayRouteCache();
let cssW=innerWidth,cssH=innerHeight,dpr=1;
let viewScale=1,ox=0,oy=0,zoom=1,panX=0,panY=0;
let cursor:Pt|null=null;
let previewHover=false;
let trace:Pt[]|null=null;
const activePointers=new Map<number,{x:number;y:number;startX:number;startY:number;
  wasUnit:boolean;nodeId:number|null;
  mode:'undecided'|'route'|'pan'|'node'|'watchTarget'|'activeWatch'|'pivot'|'sweep'|'cameraOrbit'|'cameraPan'|'cameraMulti'|'targetPreview';moved:boolean}>();
let pinchDistance=0,panMid:Pt|null=null;
const colors:Record<string,string>={
  rook:'#a2d4ca',moss:'#b9c6a0',ash:'#dfb992',vale:'#b7b1d9',
};
const colorFor=(id:string)=>colors[id]??'#d9c5a3';
// One palette shared by world routes and the operator's on-screen controls.
// Skip redundant style writes in the frequently refreshed tactical HUD.
function paintOperatorAccent(element:HTMLElement,id:string){
  const accent=colorFor(id);
  if(element.style.getPropertyValue('--operator-accent')!==accent)
    element.style.setProperty('--operator-accent',accent);
}
const squadIds=['rook','moss','ash','vale'] as const;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function layout(){
  cssW=Math.max(1,innerWidth);cssH=Math.max(1,innerHeight);
  dpr=Math.min(devicePixelRatio||1,2);
  feedbackLayer.width=Math.round(cssW*dpr);
  feedbackLayer.height=Math.round(cssH*dpr);
  feedbackLayer.style.width=cssW+'px';
  feedbackLayer.style.height=cssH+'px';
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  stage?.resize(cssW,cssH);
  const available=Math.max(240,cssH-(cssH<500?85:172));
  const bounds=activeWorldBounds();
  const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
  const fit=Math.min((cssW-20)/width,available/height);
  viewScale=fit*zoom;
  ox=cssW/2-(bounds.minX+bounds.maxX)*viewScale/2+panX;
  oy=cssH/2-(bounds.minY+bounds.maxY)*viewScale/2-11+panY;
}
const toWorld=(x:number,y:number):Pt=>{
  if(stage&&viewMode!=='plan2d')return stage.screenToWorld(x,y)??{x:-500,y:-500};
  return {x:(x-ox)/viewScale,y:(y-oy)/viewScale};
};
const worldToScreen=(p:Pt,height=4):Pt=>
  stage&&viewMode!=='plan2d'?stage.project(p,height):
    {x:ox+p.x*viewScale,y:oy+p.y*viewScale};
function fitZoom(next:number,x=cssW/2,y=cssH/2){
  if(stage&&viewMode!=='plan2d'){
    stage.zoomAt(clamp(next,.65,6)/stage.view.zoom,x,y);
  }else{
    zoom=clamp(next,.65,4.8);layout();
  }
  updateContext();
}
function cameraMode(mode:ViewMode){
  viewMode=stage?mode:'plan2d';
  if(stage){stage.setMode(viewMode);stage.updateCamera(1);}
  for(const [m,button] of [['iso',ui.viewIso],
    ['top',ui.viewTop],['plan2d',ui.view2d]] as const){
    button.setAttribute('aria-pressed',String(m===viewMode));
  }
  contextSignature='';updateHud();
}
function turnCamera(shift:number){
  if(stage&&viewMode!=='plan2d'){
    stage.rotate(shift);updateContext();
  }
}
const uid=(id:string)=>team(state).find(o=>o.id===id);
function selectUnit(id:string){
  const actor=uid(id);if(!actor||actor.health<=0)return;
  hideWeaponChooser();
  uiClickTone('select');selected=id;looking=false;evacMode=null;
  selectedNode=null;selectedActiveWatch=false;doorFocusId=null;
  doorMenuDismissedId=null;updateHud();
}
// Progressive tips stay out of the player's way and never inspect game intel.
const teaching=new ContextualTeaching(
  key=>{try{return localStorage.getItem('fieldwork3d.ui.teach.v2.'+key)==='1';}
    catch{return false;}},
  key=>{try{localStorage.setItem('fieldwork3d.ui.teach.v2.'+key,'1');}
    catch{/* In-memory familiarity remains valid without browser storage. */}}
);
teaching.offer('planning-start',
  'Tap the floor to draw a route. Select a waypoint to LOOK, WATCH or WAIT.',
  performance.now(),6200);
function teach(key:string,description:string,duration=4200){
  teaching.offer(key,description,performance.now(),duration);
}
let helpText='',helpUntil=0;
function showUiHelp(text:string,duration=4200){
  if(!text)return;
  helpText=text;helpUntil=performance.now()+duration;
}
function discoverAction(action:string,description:string){
  teach('action-'+action,description,3600);
}

/** A hold shows the current action's description without executing that order.
 * Touch and pen only: desktop pointer hover keeps ordinary title tooltips. */
function installTouchCommandHelp(button:HTMLButtonElement){
 if(button.dataset.touchHelpInstalled==='true')return;
 button.dataset.touchHelpInstalled='true';
 let timer:ReturnType<typeof setTimeout>|null=null;
 let consumed=false,startX=0,startY=0;
 const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 const explain=()=>{
  const description=button.title||button.getAttribute('aria-label')||button.textContent;
  if(description){
   consumed=true;showUiHelp(description,5700);updateHud();
  }
 };
 button.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'||button.disabled)return;
  clear();consumed=false;startX=event.clientX;startY=event.clientY;
  timer=setTimeout(()=>{timer=null;explain();},540);
 });
 button.addEventListener('pointermove',event=>{
  if(Math.hypot(event.clientX-startX,event.clientY-startY)>14)clear();
 });
 button.addEventListener('pointerup',clear);
 button.addEventListener('pointercancel',()=>{clear();consumed=false;});
 button.addEventListener('lostpointercapture',clear);
 button.addEventListener('pointerleave',clear);
 button.addEventListener('click',event=>{
  if(!consumed)return;
  consumed=false;event.preventDefault();event.stopImmediatePropagation();
 },true);
 button.addEventListener('contextmenu',event=>{
  if(event instanceof PointerEvent&&event.pointerType==='mouse')return;
  event.preventDefault();clear();explain();
 });
}

function message(){
  if(replaying)return 'MISSION FILM · ORBIT, PAN, ZOOM AND SCRUB FREELY';
  if(flashMode)return 'FLASH: tap a target, or CANCEL to back out.';
  if(state.phase==='planning'){
    if(looking)return lookMode==='watch'?
      'WATCH ARMED · TAP A POINT · CANCEL/BACK TO EXIT. Replaces prior WATCH; RUN or interactions end tracking.':
      'LOOK ARMED · TAP ANY DIRECTION · CANCEL/BACK TO EXIT. Replaces prior WATCH.';
    if(selectedActiveWatch)return 'WATCH TARGET · DRAG THE RING TO RETARGET · DELETE WATCH TO RELEASE.';
    if(selectedNode!==null)return 'Waypoint: LOOK changes direction · WATCH tracks a point · choose another to replace · UNDO reverses it.';
    return 'Tap a route line to insert a waypoint · tap a node to edit or delete.';
  }
  if(state.phase==='running')return 'Executing. Pause to change your plan.';
  return state.phase==='won'?'Station secured. Review your report.':
    'Team lost. Review the debrief and try another approach.';
}
function armFacing(mode:'look'|'watch'){
  looking=!looking||lookMode!==mode;
  lookMode=mode;
  armedOrigin=selectedNode===null?'here':'end';
  updateHud();
}
/** The tray never competes with the expanded TOOLS panel or GO/BACK. */
function focusedDoor(a:TeamActor,node:ReturnType<typeof selectedPlanNode>){
  const points=node?[node.p]:[finalPoint(a),a.p];
  const explicit=state.doors.find(d=>d.id===doorFocusId&&
    doorKnown(state.intel,d.id)&&
    points.some(p=>doorReachable(p,d)));
  if(explicit)return explicit;
  return state.doors.filter(d=>doorKnown(state.intel,d.id)&&
    d.id!==doorMenuDismissedId&&points.some(p=>
    doorReachable(p,d)))
    .sort((x,y)=>{
      const dx=Math.min(...points.map(p=>distance(p,doorCenter(x))));
      const dy=Math.min(...points.map(p=>distance(p,doorCenter(y))));
      return dx-dy;
    })[0];
}
function selectedPlanNode(){
  return uid(selected)?.plan.find(n=>n.id===selectedNode);
}
/** The actor itself is HERE. Selected plan nodes own subsequent orders;
 * a door tap brings up ONLY door actions. No redundant HERE/END buttons. */
function updateContext(){
  if(state.phase!=='planning'||replaying||looking||flashMode||firePlacement||
     !ui.briefingPanel.hidden||
     draggingNode||trace||
     !ui.orders.classList.contains('compact')||!ui.siteSettings.hidden){
    hideContextPalette();return;
  }
  const a=uid(selected);
  if(!a||a.health<=0){hideContextPalette();return;}
  const node=selectedPlanNode();
  const selectedWatch=selectedActiveWatch?activeWatchTarget(a):null;
  // A watch ring is a sightline target, never a physical door/fixture.
  const nearbyDoor=selectedWatch?undefined:focusedDoor(a,node);
  const door=doorFocusId?nearbyDoor:undefined;
  const current=plannedControl(state,selected,node?.id);
  const at=finalPoint(a);
  const nearMovable=state.coverState.some(o=>canRelocateCover(o)&&
    distance(at,{x:o.x,y:o.y})<Math.max(o.w,o.h)/2+43);
  const nearWindow=state.windows.some(w=>w.operable&&!w.shattered&&
    distance(at,{x:w.x,y:w.y})<54);
  // WATCH remains active through later waypoints until LOOK or RELEASE.
  // Read the authored history, not merely this node's local modifier.
  let watchActive=a.aimInstruction?.mode==='track'&&a.pace!=='run';
  let planPace=a.pace;
  if(node)for(const order of a.plan){
    if(order.paceState)planPace=order.paceState;
    if(interruptsWatch(order,planPace))watchActive=false;
    else if(order.aimMode==='track')watchActive=true;
    else if(order.aimMode==='free'||order.aimMode==='fixed')
      watchActive=false;
    if(order.id===node.id)break;
  }
  const choices:ReturnType<typeof contextActionChoices>=selectedWatch?[
    {id:'ctxWatch',label:'RETARGET',group:'primary',
      pressed:true,title:'Choose a new point for this active WATCH'},
    {id:'ctxDelete',label:'DELETE WATCH',group:'destructive',
      title:'Stop tracking this point; leave movement orders unchanged'}
  ]:contextActionChoices({
    door:!!door,node:!!node,flashRemaining:state.flashRemaining,
    nearMovable,nearWindow,nearDoor:!door&&!!nearbyDoor,
    posture:current.posture,pace:current.pace,
    firePolicy:node?.firePolicyState??a.firePolicy,
    reserve:a.reserve,magazine:a.magazine,
    doorOpen:!!door&&(door.openFraction??(door.open?1:0))>=.35,
    availableTools:door?equippedEntryMethods(a.equipment)
      .filter(method=>entryToolVerdict(door,method).allowed):[],
    nodeKind:node?.kind,nodeMoveMode:node?.moveMode,aimLabel:node?.aimLabel,
    watchActive,
    nodeFirePolicy:node?.firePolicyState,
  });
  const paletteChoices=choices.filter(choice=>choice.group!=='state');
  // The four persistent toggles have their own stationary bar above the HUD.
  // Reconcile buttons in-place: avoid tearing down the menu when a toggle changes.
  const identity=(door?'door:'+door.id:node?'node:'+node.id:
    selectedWatch?'active-watch':'here')+'/'+selected;
  const contextChanged=contextSignature!==identity;
  if(contextChanged){
    tetherBrightUntil=performance.now()+420;
    contextActionsSignature='';
    contextSignature=identity;
    ui.context.replaceChildren();
    const heading=document.createElement('div');
    heading.className='fw-context-heading';
    heading.setAttribute('aria-live','off');
    ui.context.append(heading);
    // Keep the complete small command set visible in one predictable grid.
    // An expanding MORE ACTIONS drawer changed the menu's hitbox mid-plan.
    const primary=document.createElement('div');primary.className='context-primary';
    const secondary=document.createElement('div');secondary.className='context-state';
    const destructive=document.createElement('div');destructive.className='context-danger';
    ui.context.append(primary,secondary,destructive);
  }
  const contextHeading=ui.context.querySelector<HTMLElement>('.fw-context-heading');
  if(contextHeading){
    const nodeIndex=node?a.plan.findIndex(n=>n.id===node.id)+1:0;
    const title=door?'DOOR · '+(door.open?'OPEN':'CLOSED'):
      node?('WAYPOINT '+String(nodeIndex).padStart(2,'0')):
      selectedWatch?'WATCH TARGET':'OPERATOR / HERE';
    const scope=door?'Door interactions':
      node?'Orders queued at this waypoint':
      selectedWatch?'Drag the ring to reposition or DELETE WATCH to release':
      'Orders for the selected operator';
    const text=a.name.toUpperCase()+' · '+title;
    if(contextHeading.textContent!==text)contextHeading.textContent=text;
    contextHeading.title=scope;
  }
  const actionSignature=identity+'/'+paletteChoices.map(c=>
    c.id+':'+c.label+':'+c.group+':'+!!c.disabled+':'+!!c.pressed).join('|');
  const actionChanged=contextActionsSignature!==actionSignature;
  if(actionChanged){
  contextActionsSignature=actionSignature;
  const buckets:Record<string,HTMLElement>={
    primary:ui.context.querySelector<HTMLElement>('.context-primary')!,
    state:ui.context.querySelector<HTMLElement>('.context-state')!,
    destructive:ui.context.querySelector<HTMLElement>('.context-danger')!
  };
  const wanted=new Set<string>();
  for(const choice of paletteChoices){
    wanted.add(choice.id);
    let button=ui.context.querySelector<HTMLButtonElement>(
      'button[data-action="'+choice.id+'"]');
    if(!button){
      button=document.createElement('button');
      button.type='button';button.dataset.action=choice.id;
    }
    const iconKey=tacticalIconForState(choice.id,choice.label);
    if(button.dataset.icon!==iconKey){
      button.querySelector('.ui-icon')?.remove();
      button.prepend(tacticalIcon(iconKey));
      button.dataset.icon=iconKey;
    }
    let label=button.querySelector<HTMLElement>('.command-label');
    if(!label){
      label=document.createElement('span');label.className='command-label';
      button.append(label);
    }
    if(label.textContent!==choice.label)label.textContent=choice.label;
    button.setAttribute('aria-label',choice.label);
    button.title=choice.title??choice.label;
    installTouchCommandHelp(button);
    button.disabled=!!choice.disabled;
    if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
    else button.setAttribute('aria-pressed',String(choice.pressed));
    button.classList.toggle('danger',choice.group==='destructive');
    // Reconcile DOM order as well as membership: a newly available
    // contextual action must never reorder the fixed command slots.
    // 'advanced' is only a semantic group now: render those commands
    // alongside primary orders instead of inside a height-changing drawer.
    buckets[choice.group==='advanced'?'primary':choice.group].append(button);
  }
  for(const btn of ui.context.querySelectorAll<HTMLButtonElement>('button[data-action]')){
    if(!wanted.has(btn.dataset.action??''))btn.remove();
  }
  buckets.state.hidden=!buckets.state.childElementCount;
  buckets.destructive.hidden=!buckets.destructive.childElementCount;
  ui.context.classList.toggle('door-menu',!!door);
  }
  if(paletteExit){paletteExit.cancel();paletteExit=null;}
  ui.context.hidden=false;
  ui.context.style.pointerEvents='auto';
  if(contextChanged&&!reducedMotionMedia.matches)
    ui.context.animate([{opacity:.78,scale:.96},{opacity:1,scale:1}],
      {duration:160,easing:'cubic-bezier(.2,.8,.2,1)'});
  ui.context.dataset.door=door?.id??'';
  ui.context.setAttribute('aria-label',door?
    'Door actions':'Selected position actions and operator settings');
  // Keep the full operator bodies, selected route, and tap targets visible.
  // Don't inspect concealed enemies: context placement must not leak intel.
  const target=door?doorCenter(door):node?.p??selectedWatch??a.p;
  const anchor=worldToScreen(target,door?15:node?8:selectedWatch?12:24);
  // Re-measure DOM only when contents change; reading offset dimensions every
  // animation frame forces avoidable synchronous layout on mobile browsers.
  const measure=contextChanged||actionChanged||paletteWidth<=0||paletteHeight<=0;
  if(measure){paletteWidth=ui.context.offsetWidth;paletteHeight=ui.context.offsetHeight;}
  const w=paletteWidth,h=paletteHeight;
  const header=document.querySelector<HTMLElement>('.top');
  const nav=document.querySelector<HTMLElement>('.bar');
  const minY=Math.max(8,(header?.getBoundingClientRect().bottom??62)+8);
  const hudTop=!ui.quickStates.hidden?
    ui.quickStates.getBoundingClientRect().top:
    (nav?.getBoundingClientRect().top??ui.play.getBoundingClientRect().top);
  const maxY=Math.max(minY+h,hudTop-10);
  // Lightweight dirty key: only meaningfully changed screen geometry may
  // trigger the expensive avoid-zone and candidate placement calculations.
  // The existing palette holds its pocket through incidental frame updates.
  const unitKey=team(state).map(unit=>{
    const point=worldToScreen(unit.p,8);
    return unit.id+':'+Math.round(point.x/6)+','+Math.round(point.y/6)+
      ':'+unit.plan.map(n=>Math.round(n.p.x/3)+','+
      Math.round(n.p.y/3)+','+n.kind).join(';');
  }).join('|');
  const placementKey=[identity,actionSignature,Math.round(anchor.x/6),
    Math.round(anchor.y/6),Math.round(cssW),Math.round(cssH),
    Math.round(minY/3),Math.round(maxY/3),w,h,unitKey].join('|');
  if(paletteMotion.active&&!contextChanged&&!actionChanged&&
     (contextPointerIds.size>0||placementKey===lastPlacementKey))return;
  lastPlacementKey=placementKey;
  const avoid:AvoidRect[]=[{x:anchor.x-38,y:anchor.y-38,
    w:76,h:76,weight:3}];
  for(const unit of team(state)){
    const feet=worldToScreen(unit.p,0),head=worldToScreen(unit.p,30);
    avoid.push({x:Math.min(feet.x,head.x)-29,
      y:Math.min(feet.y,head.y)-17,
      w:Math.abs(head.x-feet.x)+58,
      h:Math.abs(head.y-feet.y)+34,weight:3});
  }
  // Known visible contacts also deserve clear sightlines. Hidden enemies must
  // never enter the placement heuristic (that would leak fog-of-war intel).
  for(const hostile of enemies(state)){
    if(hostile.health<=0||!isSeen(state,hostile))continue;
    const p=worldToScreen(hostile.p,20);
    avoid.push({x:p.x-31,y:p.y-38,w:62,h:76,weight:4});
  }
  const paths:ScreenPath[]=[];
  // Avoid all friendly-authored routes, not only the selected unit's plan.
  // Teammates and their paths remain known even behind current fog.
  for(const friendly of team(state)){
    let previous=friendly.p;
    for(const waypoint of friendly.plan){
      if(waypoint.kind==='move'||waypoint.kind==='door'){
        // Match the actual visible navigated polyline, not a straight
        // authored-endpoint chord that may cut across walls and doors.
        const routed=displayRouteCache.get(previous,waypoint.p,
          state.intel,true).points;
        let segmentStart=previous;
        for(const point of routed){
          paths.push({a:worldToScreen(segmentStart,8),
            b:worldToScreen(point,8)});
          segmentStart=point;
        }
        previous=waypoint.p;
      }
      const p=worldToScreen(waypoint.p,8);
      avoid.push({x:p.x-19,y:p.y-19,w:38,h:38,
        weight:friendly.id===selected?2:1.3});
    }
  }
  for(const overlay of [ui.hint,ui.feed]){
    if(overlay.hidden||!overlay.getClientRects().length)continue;
    const r=overlay.getBoundingClientRect();
    avoid.push({x:r.left-7,y:r.top-7,w:r.width+14,h:r.height+14});
  }
  // Protect the next-tap region, not just the selected node itself.
  // The palette should choose unused screen space away from the editing lane.
  const activeEditing=performance.now()-lastAuthoringAt<1150;
  const radius=cssW<=600?(activeEditing?148:118):100;
  const actorPoint=worldToScreen(a.p,8);
  const lastPoint=worldToScreen(finalPoint(a),8);
  const editingZones=[
    {x:anchor.x-radius,y:anchor.y-radius,w:radius*2,h:radius*2},
    {x:lastPoint.x-90,y:lastPoint.y-90,w:180,h:180},
    {x:actorPoint.x-75,y:actorPoint.y-75,w:150,h:150},
  ];
  const vx=lastPoint.x-actorPoint.x,vy=lastPoint.y-actorPoint.y;
  const length=Math.hypot(vx,vy);
  const dir=length>35?{x:vx/length,y:vy/length}:{x:0,y:-1};
  const corridor={a:anchor,b:{
    x:anchor.x+dir.x*(activeEditing?245:190),
    y:anchor.y+dir.y*(activeEditing?245:190)}};
  const placement=placeContextMenu({
    anchor,width:w,height:h,viewportWidth:cssW,
    top:minY,bottom:maxY,avoid,paths,preferredSide:lastContextSide,
    authoring:editingZones,corridor,
    minClearance:cssW<=600?(activeEditing?142:112):100,
    preferredPosition:paletteMotion.active?
      {x:paletteMotion.targetX,y:paletteMotion.targetY}:null,
  });
  lastContextSide=placement.side;
  paletteMotion.set(placement.x,placement.y,anchor.x,anchor.y);
  // Keep the actual menu hit target in its visually interpolated position.
  // Geometry measurement uses offsetWidth/Height (unaffected by transforms).
}
// While a command finger is down, freeze the palette's pocket so it cannot
// slip out from under the touch. This does not block camera or map rendering.
ui.context.addEventListener('pointerdown',event=>{
  if((event.target as HTMLElement).closest('button'))
    contextPointerIds.add(event.pointerId);
});
for(const type of ['pointerup','pointercancel'] as const)
  window.addEventListener(type,event=>{
    contextPointerIds.delete(event.pointerId);
  },{capture:true});
window.addEventListener('blur',()=>contextPointerIds.clear());
// One shared long-press handler is installed on each actual command button.
// Duplicating a second timer on the palette caused conflicting 450/540ms holds.
const handleContextAction=(event:MouseEvent)=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(!button||state.phase!=='planning')return;
  const action=button.dataset.action;
  if(action)discoverAction(action,button.title);
  const a=uid(selected);
  if(!a)return;
  const beforeErrors=state.events.length;
  const node=selectedPlanNode();
  const door=doorFocusId?focusedDoor(a,node):undefined;
  const current=plannedControl(state,selected,node?.id);
  if(door&&action?.startsWith('ctxTool-')){
    const method=action.slice('ctxTool-'.length) as EntryTool;
    const nearNode=node&&distance(node.p,doorCenter(door))<=43;
    if(!planEntryTool(state,selected,door.id,method,
      nearNode?node.id:undefined))
      state.events.push('EQUIPPED TOOL CANNOT OPERATE THIS DOOR');
    doorFocusId=null;doorMenuDismissedId=door.id;
    updateHud();return;
  }
  switch(action){
    case 'ctxFire':{
      const active=node?.firePolicyState??a.firePolicy;
      const policy=active==='engage'?'hold':
        active==='hold'?'return':'engage';
      setFirePolicy(state,selected,policy,node?.id);
      break;
    }
    case 'ctxSuppress':
      firePlacement='suppress';looking=false;flashMode=false;
      tacticalFeedback.emit('armed',node?.p??a.p,'SUPPRESS READY');
      uiClickTone('select');updateHud();return;
    case 'ctxFlash':
      if(state.flashRemaining>0){flashMode=true;flashDoorId=null;
        looking=false;firePlacement=null;}
      break;
    case 'ctxLook':
      armFacing('look');
      if(looking)tacticalFeedback.emit('armed',node?.p??a.p,'TAP A DIRECTION');
      uiClickTone('select');return;
    case 'ctxDoor':{
      const available=focusedDoor(a,node);
      if(!available){state.events.push('NO KNOWN DOOR IN REACH');break;}
      doorFocusId=available.id;doorMenuDismissedId=null;
      uiClickTone('select');
      updateHud();return;
    }
    case 'ctxWatch':
      armFacing('watch');
      if(looking)tacticalFeedback.emit('armed',node?.p??a.p,'TAP WATCH TARGET');
      uiClickTone('select');return;
    case 'ctxWait':{
      if(node?.kind==='wait')setWaitDuration(state,selected,node.id,.5);
      else planWaitAt(state,selected,.5,node?'end':'here',node?.id);
      break;
    }
    case 'ctxStance':{
      const value=current.posture==='stand'?'crouch':'stand';
      if(node)setNodeControl(state,selected,node.id,'postureState',value);
      else posture(state,selected);
      fogStamp=-1;break;
    }
    case 'ctxPace':{
      const value=current.pace==='walk'?'run':'walk';
      if(node)setNodeControl(state,selected,node.id,'paceState',value);
      else setStartPace(state,selected,value);
      break;
    }
    case 'ctxReload':
      if(!planReloadAt(state,selected,node?.id))
        state.events.push('CANNOT PLAN RELOAD');
      break;
    case 'ctxPush':
      if(!planNearbyInteraction(state,selected,'push'))
        state.events.push('NO PUSHABLE OBJECT IN REACH');
      break;
    case 'ctxWindow':{
      const at=finalPoint(a);
      const nearby=state.windows.filter(w=>w.operable&&!w.shattered&&
        distance(at,{x:w.x,y:w.y})<54)
        .sort((x,y)=>distance(at,{x:x.x,y:x.y})-
          distance(at,{x:y.x,y:y.y}))[0];
      if(!nearby||!planNearbyInteraction(state,selected,
        nearby.open?'close-window':'open-window'))
        state.events.push('NO OPERABLE WINDOW IN REACH');
      break;
    }
    case 'ctxDoorFlash':
      if(!door){state.events.push('SELECT A DOOR FIRST');break;}
      flashDoorId=door.id;flashMode=true;looking=false;
      doorFocusId=null;doorMenuDismissedId=door.id;break;
    case 'ctxDelete':
      if(selectedActiveWatch)removeActiveWatch(state,selected);
      else if(node)deletePlanNode(state,selected,node.id);
      selectedNode=null;selectedActiveWatch=false;doorFocusId=null;break;
    case 'ctxOpen':
    case 'ctxClose':
    case 'ctxKick':
      if(door&&!doorAtNode(state,selected,door.id,
        action==='ctxOpen'?'open':action==='ctxClose'?'close':'kick',
        node&&distance(node.p,doorCenter(door))<=43?node.id:undefined))
        state.events.push('DOOR NOT REACHABLE FROM THAT POINT');
      doorFocusId=null;doorMenuDismissedId=door?.id??null;break;
  }
  const failed=state.events.length>beforeErrors;
  uiClickTone(failed?'warning':'command');
  const lastFailure=failed?state.events.at(-1)??'ACTION BLOCKED':'';
  tacticalFeedback.emit(failed?'error':'command',
    door?doorCenter(door):node?.p??a.p,
    failed?(recoveryAdviceFor(lastFailure)?.marker??'BLOCKED'):
      button.querySelector('.command-label')?.textContent??'');
  updateHud();
};
ui.context.addEventListener('click',handleContextAction);
ui.quickStates.addEventListener('click',handleContextAction);
// World-first event hierarchy: never read unobserved enemy state or persist
// old critical messages indefinitely. Only existing player-facing events.
const executionNoticeFeed=new ExecutionNoticeFeed();
function updateUiNotice(node:HTMLElement,events:string[],phase:string){
  const notice=executionNoticeFeed.update(events,phase,performance.now());
  node.hidden=!notice||replaying;
  if(!notice||replaying){
    node.removeAttribute('data-notice-key');
    return;
  }
  const key=notice.born+'|'+notice.label+'|'+notice.text;
  if(node.dataset.noticeKey!==key){
    const label=document.createElement('strong');
    label.className='fw-notice-label';
    label.textContent=notice.label;
    const body=document.createElement('span');
    body.className='fw-notice-body';
    const description=document.createElement('span');
    description.className='fw-notice-content';
    description.textContent=notice.text;
    body.append(description);
    if(notice.recovery){
      const next=document.createElement('span');
      next.className='fw-notice-recovery';
      next.textContent=notice.recovery;
      body.append(next);
    }
    node.replaceChildren(label,body);
    node.dataset.noticeKey=key;
  }
  node.dataset.severity=notice.severity;
  node.classList.toggle('critical',notice.severity==='danger');
}
function updateQuickStates(){
  const actor=uid(selected);
  const shown=state.phase==='planning'&&!replaying&&!!actor&&actor.health>0;
  ui.quickStates.hidden=!shown;
  // Keep secondary sheets above the *whole* HUD, not just its bottom row.
  const height=Math.ceil(ui.tacticalHud.getBoundingClientRect().height);
  const value=height+'px';
  if(document.documentElement.style.getPropertyValue('--tactical-hud-height')!==value)
    document.documentElement.style.setProperty('--tactical-hud-height',value);
  if(!shown||!actor)return;
  const node=selectedPlanNode();
  const index=node?actor.plan.findIndex(n=>n.id===node.id)+1:0;
  const scopeText=node?'WAYPOINT '+String(index).padStart(2,'0'):
    selectedActiveWatch&&activeWatchTarget(actor)?'WATCH TARGET':'OPERATOR / HERE';
  ui.quickScope.textContent=actor.name.toUpperCase()+' · '+scopeText+
    (actor.aimInstruction?.mode==='track'&&actor.pace!=='run'?' · WATCH ACTIVE':'');
  ui.quickScope.title=node?
    'Commands apply when '+actor.name+' reaches waypoint '+index:
    selectedActiveWatch&&activeWatchTarget(actor)?
      'The active WATCH point can be dragged or deleted from its marker':
      'Commands apply to '+actor.name+' at their current position';
  ui.quickStates.setAttribute('aria-label',actor.name+' · '+scopeText+' commands');
  const current=plannedControl(state,selected,node?.id);
  const choices=contextActionChoices({
    door:false,node:!!node,flashRemaining:state.flashRemaining,
    posture:current.posture,pace:current.pace,
    firePolicy:node?.firePolicyState??actor.firePolicy,
    reserve:actor.reserve,magazine:actor.magazine
  }).filter(c=>c.group==='state');
  for(const choice of choices){
    const button=ui.quickStates.querySelector<HTMLButtonElement>(
      'button[data-action="'+choice.id+'"]');
    if(!button)continue;
    const iconKey=tacticalIconForState(choice.id,choice.label);
    if(button.dataset.icon!==iconKey){
      button.querySelector('.ui-icon')?.remove();
      button.prepend(tacticalIcon(iconKey));
      button.dataset.icon=iconKey;
    }
    const label=button.querySelector<HTMLElement>('.command-label');
    if(label&&label.textContent!==choice.label)label.textContent=choice.label;
    button.title=choice.title??choice.label;
    installTouchCommandHelp(button);
    button.setAttribute('aria-label',(node?'Waypoint: ':'Operator: ')+
      choice.label+'. '+(choice.title??''));
    button.disabled=!!choice.disabled;
    if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
    else button.setAttribute('aria-pressed',String(choice.pressed));
  }
}
const siteIdentityOutput=el<HTMLOutputElement>('siteIdentity');
const blockedEpisode=new Map<string,string>();
let fieldLightButton:HTMLButtonElement|null=null;
let medicalButton:HTMLButtonElement|null=null;
let dragButton:HTMLButtonElement|null=null;
let carryButton:HTMLButtonElement|null=null;
let retrieveButton:HTMLButtonElement|null=null;
function casualtyCandidate(id:string){
 const operator=team(state).find(o=>o.id===id&&o.health>0);
 if(!operator)return null;
 return team(state).filter(o=>o.health<=0&&!o.surrendered)
  .sort((a,b)=>distance(operator.p,a.p)-distance(operator.p,b.p))[0]??null;
}
function medicalCandidate(id:string){
 const a=team(state).find(o=>o.id===id&&o.health>0);
 if(!a)return null;
 return team(state).filter(o=>{
  const wound=mostUrgentWound(o.medical);
  return wound&&treatmentSupplyForWound(wound,a.medicalSupplies);
 }).sort((x,y)=>distance(a.p,x.p)-distance(a.p,y.p))[0]??null;
}
function updateHud(){
  const identity=currentSiteIdentity(state.site,campaignMode==='quick');
  if(siteIdentityOutput.textContent!==identity.text)
    siteIdentityOutput.textContent=identity.text;
  if(identity.seed!==null)siteIdentityOutput.dataset.siteSeed=identity.seed;
  else delete siteIdentityOutput.dataset.siteSeed;
  const telemetry=activeRangeDiagnostic(state,selected);
  rangeTelemetry.hidden=!telemetry;
  if(telemetry){
   const line=rangeDiagnosticLabel(telemetry)+
    (lastRangeTrial?'\n'+rangeTrialLabel(lastRangeTrial):'');
   if(rangeTelemetry.textContent!==line)rangeTelemetry.textContent=line;
  }
  const leaveRange=document.querySelector<HTMLButtonElement>(
   '[data-equipment-range-exit]');
  if(leaveRange)leaveRange.hidden=!state.site?.training;
  const repeat=document.querySelector<HTMLButtonElement>('[data-range-repeat]');
  if(repeat)repeat.hidden=!state.site?.training;
  paintOperatorAccent(ui.quickStates,selected);
  paintOperatorAccent(ui.context,selected);
  paintOperatorAccent(contextTether,selected);
  updateQuickStates();
  if(medicalButton){
   const patient=medicalCandidate(selected);
   medicalButton.disabled=!patient||state.phase!=='planning'||replaying;
   medicalButton.textContent=patient?'TREAT · '+patient.name.toUpperCase():
    'TREAT · NO SUITABLE SUPPLIES';
   medicalButton.setAttribute('aria-label',patient?
    'Plan medical stabilization for '+patient.name:'No treatable wound with available supplies');
  }
  const casualty=casualtyCandidate(selected);
  for(const [button,mode] of [
   [dragButton,'DRAG'],[carryButton,'CARRY'],[retrieveButton,'RECOVER']
  ] as const){
   if(!button)continue;
   button.hidden=!casualty;
   button.disabled=!casualty||state.phase!=='planning'||replaying;
   button.textContent=casualty?mode+' · '+casualty.name.toUpperCase():mode;
  }
  if(fieldLightButton){
   const selectedActor=team(state).find(a=>a.id===selected);
   const light=lightControlState(selectedActor,state.phase,replaying);
   if(fieldLightButton.textContent!==light.text)fieldLightButton.textContent=light.text;
   fieldLightButton.setAttribute('aria-label',light.aria);
   fieldLightButton.setAttribute('aria-pressed',String(light.pressed));
   fieldLightButton.disabled=light.disabled;
   fieldLightButton.style.borderColor=light.pressed?colorFor(selected):'';
  }
  recordCompletedOperation();
  refreshDeployment();
  const brief=operationBriefing(state);
  ui.briefingTitle.textContent=brief.code+' / '+brief.name;
  ui.briefingBody.textContent=brief.objective;
  ui.briefingCondition.textContent=brief.condition;
  ui.briefingExtraction.textContent=brief.extraction;
  ui.briefingSite.textContent=brief.building+' · '+brief.layout;
  ui.briefingIntel.textContent=brief.notes;
  ui.briefingRoster.textContent=brief.squad+' OPERATORS · '+
    team(state).map(a=>a.name).join(' · ');
  if(state.phase!=='planning'){
    ui.briefingPanel.hidden=true;operationsBoard.hidden=true;
  }
  operationsToggle.hidden=campaignMode!=='quick'||state.phase!=='planning'||replaying;
  operationsToggle.disabled=operationsToggle.hidden;
  if(operationsToggle.hidden)operationsBoard.hidden=true;
  ui.phase.textContent=replaying?'REPLAY':
    state.phase==='planning'?(state.started?'PAUSED':'PLANNING'):
    state.phase==='running'?'EXECUTING':
    state.phase==='won'?'COMPLETE':'FAILED';
  ui.phase.classList.toggle('live',state.phase==='running');
  ui.phase.classList.toggle('done',state.phase==='won'||state.phase==='lost');
  const seconds=Math.floor(state.seconds);
  ui.clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0');
  const primaryMode=state.phase==='running'?'pause':
    state.phase==='planning'?'go':'reset';
  if(ui.play.dataset.mode!==primaryMode){
    const previousMode=ui.play.dataset.mode;
    ui.play.dataset.mode=primaryMode;
    const label=document.createElement('span');
    label.textContent=primaryMode==='go'?'GO':
      primaryMode==='pause'?'PAUSE':'RESET';
    label.className='go-label';
    ui.play.replaceChildren(tacticalIcon(primaryMode),label);
    ui.play.setAttribute('aria-label',primaryMode==='go'?'Execute plan':
      primaryMode==='pause'?'Pause execution':'Reset encounter');
    if(previousMode&&!reducedMotionMedia.matches){
      ui.play.animate([
        {transform:'scale(.93)',filter:'brightness(1.14)'},
        {transform:'scale(1.055)',filter:'brightness(1.25)',offset:.43},
        {transform:'scale(1)',filter:'brightness(1)'}
      ],{duration:295,easing:'cubic-bezier(.16,.85,.25,1)'});
      ui.phase.animate([
        {opacity:.65,transform:'translateY(3px)'},
        {opacity:1,transform:'translateY(-2px)',offset:.55},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:300,easing:'ease-out'});
    }
  }
  ui.play.classList.toggle('running',state.phase==='running');
  const active=uid(selected);
  if(navPanel){
    navPanel.textContent=team(state).map(a=>a.name+'  '+
      a.lastBlocker.toUpperCase()+
      '  blocked '+a.blockedTime.toFixed(2)+'s\n'+
      'nav '+a.nav.length+'  orders '+a.plan.length+
      '  ('+a.p.x.toFixed(0)+','+a.p.y.toFixed(0)+')').join('\n');
  }
  canvas.dataset.navBlock=active?.lastBlocker??'clear';
  // Read-only plan status for phone gesture regression tests.
  canvas.dataset.planNodes=String(active?.plan.length??0);
  canvas.dataset.selectedNode=selectedNode===null?'':String(selectedNode);
  // Explicit browser audit mode exposes ONLY already-authored friendly routes.
  // Use the actual rendered polyline, rather than guessing a touch coordinate
  // from an old screenshot or hardcoded map bounds.
  if(auditRouteMode&&active&&viewMode==='plan2d'){
    const candidates:{x:number;y:number;clearance:number}[]=[];
    let from=active.p;
    const markers=[...team(state).map(unit=>worldToScreen(unit.p,8)),
      ...active.plan.map(n=>worldToScreen(n.p,8))];
    for(const node of active.plan){
      if(node.kind!=='move'&&node.kind!=='door')continue;
      const steps=displayRouteCache.get(from,node.p,state.intel,true).points;
      let previous=from;
      for(const point of steps){
        for(const t of [.2,.35,.5,.65,.8]){
          const world={x:previous.x+(point.x-previous.x)*t,
            y:previous.y+(point.y-previous.y)*t};
          const p=worldToScreen(world,4);
          if(p.x<12||p.x>cssW-12||p.y<72||p.y>cssH-120)continue;
          const clearance=markers.length?Math.min(...markers.map(q=>distance(p,q))):99;
          if(clearance>=34)candidates.push({x:p.x,y:p.y,clearance});
        }
        previous=point;
      }
      from=node.p;
    }
    candidates.sort((a,b)=>b.clearance-a.clearance);
    canvas.dataset.auditRoutePoints=JSON.stringify(candidates.slice(0,40));
  }
  const stanceLabel=active?.posture==='crouch'?'STAND':'CROUCH';
  if(ui.stance.textContent!==stanceLabel)
    ui.stance.replaceChildren(tacticalIcon(stanceLabel==='STAND'?'stand':'crouch'),
      document.createTextNode(stanceLabel));
  ui.stance.setAttribute('aria-pressed',String(active?.posture==='crouch'));
  ui.contact.setAttribute('aria-pressed',String(active?.haltOnContact));
  ui.variant.textContent='NEW SITE';
  ui.variant.disabled=campaignMode==='mission';
  ui.siteSize.disabled=campaignMode==='mission';
  ui.intelMode.disabled=campaignMode==='mission';
  ui.restart.disabled=campaignMode==='mission';
  const homeButton=document.getElementById('campaignReturnButton') as HTMLButtonElement|null;
  if(homeButton)homeButton.disabled=campaignMode==='mission'&&state.phase==='running';
  ui.loadout.disabled=campaignMode==='mission';
  // These selectors configure the *next* site; they never reset current knowledge.
  ui.intelMode.textContent='NEXT SITE INTEL · '+selectedIntelMode.replaceAll('-', ' ').toUpperCase();
  ui.intelMode.disabled=campaignMode==='mission'||replaying;
  ui.intelMode.title=campaignMode==='mission'?
    'Campaign intelligence is defined by the active contract':
    'Applies to your next new site; current mission stays unchanged';
  ui.siteSize.textContent='NEXT SITE SIZE · '+requestedSiteScale.toUpperCase();
  ui.siteSize.disabled=campaignMode==='mission'||replaying;
  const flashLabel='FLASH ×'+state.flashRemaining;
  if(ui.flash.textContent!==flashLabel)
    ui.flash.replaceChildren(tacticalIcon('flash'),document.createTextNode(flashLabel));
  const activeTargetMode=state.phase!=='planning'||replaying?'':looking?
    lookMode.toUpperCase():flashMode?'FLASH':firePlacement?
    firePlacement.toUpperCase():'';
  ui.cancelTarget.hidden=!activeTargetMode;
  if(activeTargetMode){
    ui.cancelTarget.textContent='✕ CANCEL '+activeTargetMode;
    ui.cancelTarget.setAttribute('aria-label','Cancel '+activeTargetMode+' targeting');
  }
  ui.hint.dataset.targetMode=activeTargetMode;
  ui.loadout.textContent='WEAPON · '+(active?.weapon.toUpperCase()??'—');
  ui.loadout.disabled=campaignMode==='mission'||state.phase!=='planning'||replaying;
  if(ui.loadout.disabled&&!weaponChooser.hidden)hideWeaponChooser();
  ui.flash.disabled=state.flashRemaining<=0||replaying;
  ui.back.disabled=!active?.plan.length;
  ui.clear.disabled=!active?.plan.length||state.phase!=='planning'||replaying;
  ui.clear.title='Clear this operator\'s route (Undo restores it)';
  ui.undo.disabled=!(active?.history.undo.length);
  ui.redo.disabled=!(active?.history.redo.length);
  ui.debrief.hidden=replaying||(state.phase!=='won'&&state.phase!=='lost');
  ui.next.textContent=campaignMode==='mission'?'RETURN TO BASE':'NEXT ARRANGEMENT';
  ui.retry.disabled=campaignMode==='mission';
  if(!ui.debrief.hidden){
    const stats=debrief(state);
    ui.debriefTitle.textContent=state.phase==='won'?'OPERATION COMPLETE':'MISSION FAILED';
    ui.debriefGrade.textContent=stats.grade+' · '+stats.score;
    ui.debriefSurvivors.textContent=stats.survived+' / '+team(state).length;
    ui.debriefAccuracy.textContent=stats.accuracy+'%';
    ui.debriefObjective.textContent=stats.objective?
     'OBJECTIVE SECURED':'OBJECTIVE NOT COMPLETED';
    ui.debriefStats.textContent=
      'OPERATION: '+brief.name.toUpperCase()+'\nGRADE: '+stats.grade+
      ' · SCORE '+stats.score+'\nTIME: '+stats.time+'s'+
      '\nOBJECTIVE: '+(stats.objective?'SECURED':'NOT COMPLETED')+
      '\nSURVIVORS: '+stats.survived+'/'+team(state).length+
      '\nSHOTS: '+stats.shots+' | HITS: '+stats.hits+
      ' | ACCURACY: '+stats.accuracy+'%'+
      '\nCASUALTIES: '+stats.casualties+' · PAUSES: '+stats.pauses+
      '\n'+stats.squad.map(o=>o.name+' '+(o.survived?
        o.injury?'WOUNDED':'ACTIVE':'DOWN')+' · '+o.fired+' RDS').join('\n')+
      '\nOPERATIONS LOGGED: '+operationHistory().length+
      '\n\nMISSION PACING\n'+formatMissionPacing(recorder.events)+
      '\n\nCOMBAT REVIEW\n'+formatCombatReview(recorder.frames,recorder.events)+
      '\n\nTACTICAL TIMELINE\n'+formatAfterAction(recorder.events,10);
    if(campaignMode==='mission'&&campaign?.history.length){
     const recent=campaign.history[campaign.history.length-1];
     const lines=recent.gains?.flatMap(person=>{
      const member=campaign?.operators.find(m=>m.id===person.id);
      const improvements=Object.entries(person.gains)
       .filter(([,gain])=>(gain??0)>0)
       .map(([skill,gain])=>skill.replace(/([A-Z])/g,' $1')+' +'+((gain??0)*100).toFixed(1));
      return improvements.length?[((member?.callsign??person.id)+': '+improvements.join(', '))]:[];
     })??[];
     if(lines.length)ui.debriefStats.textContent+='\n\nCAREER DEVELOPMENT\n'+lines.join('\n');
    }
  }
  for(const id of squadIds){
    const a=uid(id),button=ui[id];
    paintOperatorAccent(button,id);
    button.hidden=!a;
    const title=button.querySelector('strong');
    if(title&&a)title.textContent=a.name;
    button.classList.toggle('selected',id===selected);
    button.classList.toggle('down',!a||a.health<=0);
    button.title=a?WEAPONS[a.weapon].label+' • '+
      injuryOf(a.injuryStage).toUpperCase():'NO OPERATOR';
    button.classList.toggle('loading',!!a&&a.reload>0);
    button.style.setProperty('--reload-progress',
      ((a?.reload??0)>0?Math.round(100*(1-a!.reload/
        (WEAPONS[a!.weapon].reload*(a!.injuryStage===2?1.5:
          a!.injuryStage===1?1.1:1)))):0)+'%');
    ui[(id+'Ammo') as 'rookAmmo'|'mossAmmo'|'ashAmmo'|'valeAmmo'].textContent=
      a?String(a.magazine).padStart(2,'0')+' / '+a.reserve+
      (a.reload>0?' ↻':''):'--';
    button.setAttribute('aria-pressed',String(id===selected));
    ui[(id+'Hp') as 'rookHp'|'mossHp'|'ashHp'|'valeHp'].textContent=
      !a?'--':a.health<=0?'DOWN':
      a.injuryStage===2?'HEAVY':a.injuryStage===1?'HURT':'OK';
    // Compact visual condition, with full text retained for accessibility.
    const condition=!a?'missing':a.health<=0?'down':
      a.injuryStage===2?'heavy':a.injuryStage===1?'hurt':'healthy';
    const fill=condition==='down'?0:condition==='heavy'?34:
      condition==='hurt'?67:100;
    button.style.setProperty('--health-fill',fill+'%');
    button.style.setProperty('--health-color',
      condition==='heavy'?'#c77f68':condition==='hurt'?'#d0ad76':'#91b5a5');
    button.dataset.condition=condition;
    // One quiet, persistent state line in each EXISTING operator card.
    // Its data comes from the motor and authored orders only; there is no
    // live enemy-intel lookup and no new permanent tactical control.
    let stateLine=button.querySelector<HTMLElement>('.unit-execution');
    if(!stateLine){
      stateLine=document.createElement('span');
      stateLine.className='unit-execution';button.append(stateLine);
    }
    const execution=a?executionStatus(a,{
      phase:state.phase==='planning'&&state.started?'running':state.phase,
      doors:state.doors,peers:team(state)
    }):null;
    stateLine.textContent=execution?execution.label+
      (execution.kind==='moving'?'':execution.detail?
        ' · '+execution.detail:''):'UNAVAILABLE';
    stateLine.dataset.kind=execution?.kind??'idle';
    stateLine.title=execution?.detail??'';
    if(execution?.progress!==undefined){
      stateLine.dataset.progress='true';
      stateLine.style.setProperty('--execution-progress',
        Math.round(execution.progress*100)+'%');
    }else{
      stateLine.removeAttribute('data-progress');
      stateLine.style.removeProperty('--execution-progress');
    }
    button.setAttribute('aria-label',a?
      a.name+', '+condition+', '+a.magazine+
      ' rounds loaded, '+a.reserve+' reserve'+(a.reload>0?', reloading':'')+
      '. '+(execution?.label??'IDLE')+'. '+(execution?.detail??''):
      id+', unavailable');
  }
  // Show the site as a place, not as a raw procedural generation dump.
  const siteHeader=document.querySelector<HTMLElement>('.ident strong');
  const siteSubheading=document.querySelector<HTMLElement>('.ident small');
  if(siteHeader)siteHeader.textContent=compactSiteTitle(state.site);
  if(siteSubheading)siteSubheading.textContent=state.site?
    team(state).length+' OPERATORS · '+
    (state.intel.mode==='floor-plan'?state.site.roomCount:'?')+' KNOWN ROOMS':
    'TACTICAL TRAINING';
  if(siteHeader)siteHeader.title=state.site?.name??'Cutwoods';
  updateUiNotice(ui.feed,state.events,state.phase);
  const now=performance.now();
  const hasHelp=now<helpUntil;
  const tip=teaching.current(now);
  const targeting=looking||flashMode||!!firePlacement||!!evacMode;
  const phase:HudPhase=replaying?'replay':
    state.phase==='planning'?(targeting?'targeting':'planning'):
    state.phase==='running'?'execution':'debrief';
  const severity=ui.feed.hidden?'normal':ui.feed.dataset.severity;
  const urgency:HudUrgency=severity==='warning'||severity==='contact'||
    severity==='danger'?severity:'normal';
  const presentation=resolveHudPresentation({
    phase,urgency,explicitHelp:hasHelp,coaching:!!tip,targetPrompt:targeting
  });
  document.body.dataset.hudPhase=phase;
  document.body.dataset.hudUrgency=urgency;
  ui.hint.dataset.hintKind=hasHelp?'help':targeting?'target':'coach';
  ui.hint.textContent=hasHelp?helpText:targeting?message():
    presentation.showCoaching?(tip?.text??''):message();
  ui.hint.hidden=!presentation.showGuidance;
  updateContext();
  const visible=enemies(state).filter(e=>e.health>0&&isSeen(state,e)).length;
  ui.mission.textContent=(state.phase==='planning'?
      brief.code+' • ':'')+missionText(state)+
    (visible?' • '+visible+' CONTACT'+(visible===1?'':'S'):'');
}
function rect(x:number,y:number,w:number,h:number,color:string){
  draw.fillStyle=color;draw.fillRect(x,y,w,h);
}
function line(a:Pt,b:Pt,color:string,width:number){
  draw.beginPath();draw.moveTo(a.x,a.y);draw.lineTo(b.x,b.y);
  draw.lineWidth=width;draw.strokeStyle=color;draw.stroke();
}
function circle(x:number,y:number,r:number,color:string){
  draw.beginPath();draw.arc(x,y,r,0,2*Math.PI);draw.fillStyle=color;draw.fill();
}
function noise(x:number,y:number){const v=Math.sin(x*123.31+y*98.717)*43897.44;return v-Math.floor(v);}
function terrain(){
  rect(0,0,W,H,'#2c3733');
  // A deterministic, low-contrast base, not another terrain simulation.
  for(let y=6;y<H;y+=17)for(let x=6;x<W;x+=17){
    const n=noise(x,y);
    if(n>.56)rect(x+3*n,y+2*n,2+n*3,2,n>.85?'#435348':'#35453d');
  }
  if(state.site){
    const site=state.site;
    // Exterior access follows this actual generated entrance, not a
    // decorative road still pointing at the obsolete fixed station.
    const x=site.entrance.x,y=site.entrance.y;
    draw.fillStyle='#514e43';draw.beginPath();
    draw.moveTo(x-52,H);draw.lineTo(x+52,H);
    draw.lineTo(x+34,y-21);draw.lineTo(x-34,y-21);
    draw.closePath();draw.fill();
    for(const room of site.rooms){
      if(spatialSurfaceState(state,'room',room.id,replaying&&replayOmniscient)==='unknown')continue;
      const palette=['#666558','#526b66','#77705c','#58605a'];
      rect(room.x+2,room.y+2,room.w-4,room.h-4,
        room.kind==='hall'?'#4a5c55':palette[room.tone]);
      draw.strokeStyle='#b9b09b18';draw.lineWidth=.8;
      for(let a=room.x+15;a<room.x+room.w-10;a+=25)
        for(let b=room.y+15;b<room.y+room.h-10;b+=25)
          draw.strokeRect(a,b,25,25);
    }
    draw.strokeStyle='rgba(161,192,175,.06)';
    for(let a=0;a<=W;a+=GRID*2)
      line({x:a,y:0},{x:a,y:H},'rgba(161,192,175,.045)',.6);
    for(let b=0;b<=H;b+=GRID*2)
      line({x:0,y:b},{x:W,y:b},'rgba(161,192,175,.045)',.6);
    return;
  }
  // Dirt service road leading to the lower door.
  draw.fillStyle='#4a4840';draw.beginPath();
  draw.moveTo(230,H);draw.lineTo(400,H);
  draw.lineTo(352,534);draw.lineTo(271,534);draw.closePath();draw.fill();
  draw.strokeStyle='#585648';draw.lineWidth=9;draw.beginPath();
  draw.moveTo(268,H);draw.lineTo(294,536);
  draw.moveTo(363,H);draw.lineTo(324,536);draw.stroke();
  for(let y=540;y<H;y+=14)for(let x=230;x<400;x+=13){
    const n=noise(x*.7,y*.3);
    if(n>.6)circle(x+4*n,y+3*n,1.4,'#676251');
  }
  // Outside boundary and an overhead planning-grid.
  draw.strokeStyle='rgba(159,182,165,.08)';draw.lineWidth=1;
  for(let x=0;x<=W;x+=GRID*2)line({x,y:0},{x,y:H},'rgba(161,192,175,.055)',.6);
  for(let y=0;y<=H;y+=GRID*2)line({x:0,y},{x:W,y},'rgba(161,192,175,.055)',.6);
  rect(113,101,268,430,'#555247');
  rect(383,101,206,430,'#4d5753');
  // Floor wear, tiles and loose clutter — only enough for level recognition.
  for(let x=121;x<591;x+=24)for(let y=110;y<529;y+=24){
    draw.strokeStyle='#c5bca018';draw.lineWidth=1;
    draw.strokeRect(x,y,24,24);
    if(noise(x*.21,y*.17)>.8)rect(x+4,y+6,5,3,'#a49b7955');
  }
  // Entry threshold, inner doorway and exit-facing mat.
  rect(269,524,69,23,'#3e4b49');
  rect(374,298,16,54,'#374643');
  rect(278,549,51,10,'#707164');
  // Yard: sparse barrels, netting and access stairs.
  rect(175,570,65,23,'#515f55');
  rect(184,577,48,5,'#84917c');
  for(const [x,y] of [[170,653],[470,654],[543,701],[107,652]]){
    circle(x,y,10,'#4f5e57');circle(x,y,6,'#2c3b39');
  }
  // Quiet exterior rust / earth patches.
  for(const [x,y,r] of [[85,441,28],[558,548,33],[74,221,35],[525,694,24]]){
    draw.fillStyle='rgba(112,106,78,.15)';
    draw.beginPath();draw.ellipse(x,y,r,r*.52,.4,0,Math.PI*2);draw.fill();
  }
}
function furniture(){
  for(const [i,c] of COVER.entries()){
    if(spatialSurfaceState(state,'cover',i,replaying&&replayOmniscient)==='unknown')continue;
    if(c.toppled){
      // Low, collapsed silhouette rather than a standing furniture block.
      draw.save();draw.globalAlpha=.84;
      rect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,'#756f57');
      draw.strokeStyle='#d5ae7d';draw.lineWidth=2.4;
      draw.beginPath();
      draw.moveTo(c.x-c.w/2+3,c.y+c.h/2-3);
      draw.lineTo(c.x+c.w/2-3,c.y-c.h/2+3);
      draw.stroke();draw.restore();
      continue;
    }
    draw.fillStyle='#0f1b1c66';
    draw.fillRect(c.x-c.w/2+6,c.y-c.h/2+7,c.w,c.h);
    rect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,c.low?'#81725b':'#485552');
    rect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8,c.low?'#60594b':'#394440');
    draw.strokeStyle='#a995777e';draw.lineWidth=2;
    draw.strokeRect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8);
    line({x:c.x-c.w/2+8,y:c.y},{x:c.x+c.w/2-8,y:c.y},'#9d907348',2);
  }
  if(state.site)return;
  // Furniture silhouettes reinforce sightline decisions.
  rect(170,140,35,22,'#51564c');rect(224,460,51,22,'#424b47');
  rect(438,303,32,38,'#505a52');rect(516,337,50,14,'#343f3e');
  circle(544,151,11,'#726d58');circle(544,151,7,'#494e46');
}
function wallShape(a:Pt,b:Pt){
  line({x:a.x+3,y:a.y+5},{x:b.x+3,y:b.y+5},'#0b181bd9',17);
  line(a,b,'#292f30',16);line(a,b,'#a39c86',7);
  line({x:a.x,y:a.y-2},{x:b.x,y:b.y-2},'#d5c9a962',1.4);
}
function architecture(){
  for(const [i,wall] of WALLS.entries())if(
    spatialSurfaceState(state,'wall',i,replaying&&replayOmniscient)!=='unknown')
    wallShape(wall.a,wall.b);
  // Closed doors obscure sight and movement; opened doors have an arc.
  for(const door of state.doors){
    if(spatialSurfaceState(state,'door',door.id,replaying&&replayOmniscient)==='unknown')continue;
    const a=door.a,b=door.b,center=doorCenter(door);
    const visuallyOpen=liveVisibility(state,center)?
      (door.openFraction??(door.open?1:0)):
      (state.intel.doorMemory.get(door.id)??0);
    // Every known hinged door has a true-to-geometry swing preview
    // before selection, so an entry side can be chosen from the briefing.
    if(state.phase==='planning'&&door.kind!=='sliding'&&door.kind!=='shutter'){
      const hinge=door.hinge==='b'?door.b:door.a;
      const end=doorLeafSegment({...door,openFraction:1}).b;
      draw.save();draw.globalAlpha=.62;
      line(hinge,end,'#d2ad7459',2);
      circle(hinge.x,hinge.y,4.2,'#f7d39c');
      draw.setLineDash([3,4]);draw.strokeStyle='#ecd5a47a';draw.lineWidth=1.3;
      draw.beginPath();
      for(let i=0;i<=8;i++){
        const tip=doorLeafSegment({...door,openFraction:i/8}).b;
        if(i===0)draw.moveTo(tip.x,tip.y);else draw.lineTo(tip.x,tip.y);
      }
      draw.stroke();draw.setLineDash([]);draw.restore();
    }
    if(door.wedged){
      circle(center.x,center.y,4.5,'#e8b36d');
      line({x:center.x-5,y:center.y+6},{x:center.x+5,y:center.y+6},'#33271b',2);
    }
    if(visuallyOpen<.14){
      line(a,b,'#1c2727',15);
      line(a,b,'#b5a17a',8);
      circle(a.x,a.y,3,'#ead0a0');circle(b.x,b.y,3,'#ead0a0');
      draw.save();draw.translate(center.x,center.y);
      draw.fillStyle='#e4d1a2';draw.font='700 11px "Saira Condensed",sans-serif';
      draw.textAlign='center';draw.fillText('Ⅱ',0,3);draw.restore();
    }else{
      // Remember only the last witnessed angle, never offscreen changes.
      const leaf=doorLeafSegment({...door,openFraction:visuallyOpen});
      line(leaf.a,leaf.b,'#c2b08a',7);
      circle(leaf.a.x,leaf.a.y,3,'#f0d8a9');
    }
  }
  const selectedDoor=state.doors.find(d=>
    d.id===doorFocusId&&doorKnown(state.intel,d.id));
  if(selectedDoor&&state.phase==='planning'){
    const hinge=selectedDoor.hinge==='b'?selectedDoor.b:selectedDoor.a;
    const swept=doorLeafSegment({...selectedDoor,openFraction:1});
    const current=doorLeafSegment(selectedDoor);
    draw.save();draw.globalAlpha=.36;draw.strokeStyle='#e7c995';
    draw.fillStyle='#d9b57b17';draw.setLineDash([5,5]);
    draw.beginPath();draw.moveTo(hinge.x,hinge.y);
    for(let i=0;i<=16;i++){
      const leaf=doorLeafSegment({...selectedDoor,openFraction:i/16});
      draw.lineTo(leaf.b.x,leaf.b.y);
    }
    draw.closePath();draw.fill();draw.stroke();draw.setLineDash([]);
    line(current.a,current.b,'#f4dba9',6);
    line(swept.a,swept.b,'#f4dba9',5);
    draw.restore();
  }
  // Narrow window markers (not navigable openings).
  if(state.site)return;
  for(const x of [211,501]){
    line({x,y:97},{x:x+52,y:97},'#8bb6af',4);
    line({x,y:94},{x:x+52,y:94},'#d4d5bb',2);
  }
}
function conical(a:TeamActor,radius=110){
  const a0=a.heading-.93,a1=a.heading+.93;
  draw.beginPath();draw.moveTo(a.p.x,a.p.y);
  draw.arc(a.p.x,a.p.y,radius,a0,a1);
  draw.closePath();
  draw.fillStyle=a.id===selected?'rgba(172,217,206,.075)':'rgba(178,199,168,.035)';
  draw.fill();
}
/** Show the provisional segment neighbors while dragging an existing move
 * waypoint. It is deliberately a neutral DRAFT, not a promised walkable path.
 * It never probes hidden navigation state or mutates the authored plan. */
function draftRouteNeighbors(){
  const actor=uid(selected);
  if(!actor||selectedNode===null||!draggingNode||draggingWatchTarget)return null;
  const index=actor.plan.findIndex(n=>n.id===selectedNode);
  if(index<0||!['move','door'].includes(actor.plan[index].kind))return null;
  const prior=actor.plan.slice(0,index).reverse().find(n=>
    n.kind==='move'||n.kind==='door')?.p??actor.p;
  const next=actor.plan.slice(index+1).find(n=>
    n.kind==='move'||n.kind==='door')?.p??null;
  return {prior,point:draggingNode,next};
}
/** Persistent active WATCH cue, independent of consumed route nodes.
 * Both Floor Plan and 3D overlay call this with coordinates in their own
 * projection. Every teammate's active target is visible, selected is bright.
 */
function drawActiveWatchMarker(from:Pt,to:Pt,color:string,highlight:boolean,
  callsign:string){
  draw.save();
  draw.globalAlpha=highlight?.94:.67;
  draw.strokeStyle=color;draw.fillStyle=color;
  draw.lineWidth=highlight?2.4:1.6;
  draw.setLineDash([4,6]);draw.beginPath();
  draw.moveTo(from.x,from.y);draw.lineTo(to.x,to.y);draw.stroke();
  draw.setLineDash([]);
  const radius=highlight?12:10;
  draw.beginPath();draw.arc(to.x,to.y,radius,0,Math.PI*2);draw.stroke();
  draw.beginPath();draw.moveTo(to.x-radius-5,to.y);
  draw.lineTo(to.x-radius+2,to.y);draw.moveTo(to.x+radius-2,to.y);
  draw.lineTo(to.x+radius+5,to.y);
  draw.moveTo(to.x,to.y-radius-5);draw.lineTo(to.x,to.y-radius+2);
  draw.moveTo(to.x,to.y+radius-2);draw.lineTo(to.x,to.y+radius+5);
  draw.stroke();
  draw.beginPath();draw.arc(to.x,to.y,2.8,0,Math.PI*2);draw.fill();
  draw.font='700 12px "Saira Condensed",sans-serif';
  draw.textAlign='left';
  draw.fillText(highlight?'WATCH · '+callsign:'WATCH',
    to.x+radius+8,to.y-radius-4);
  draw.restore();
}
/** Persistent order failure anchors use only the operator's own observed
 * motor and authored waypoint; they cannot reveal unseen map geometry.
 */
function executionProblemStatus(a:TeamActor){
  if(replaying||!state.started||a.health<=0)return null;
  const status=executionStatus(a,{
    phase:'running',doors:state.doors,peers:team(state)
  });
  return status.kind==='blocked'&&status.orderId!==null?status:null;
}
function executionMarkerPoint(a:TeamActor,projected:boolean):Pt{
  if(projected){
    const ground=worldToScreen(a.p,24);
    return {x:ground.x+15,y:ground.y-22};
  }
  return {x:a.p.x+15,y:a.p.y-25};
}
function drawExecutionProblem(a:TeamActor,projected:boolean){
  const status=executionProblemStatus(a);
  if(!status)return;
  const at=executionMarkerPoint(a,projected);
  draw.save();
  if(a.id===selected){
    const node=a.plan.find(n=>n.id===status.orderId);
    if(node){
      const target=projected?worldToScreen(node.p,8):node.p;
      draw.strokeStyle='#e4ac88';draw.globalAlpha=.58;
      draw.lineWidth=1.3;draw.setLineDash([3,5]);
      draw.beginPath();draw.moveTo(at.x,at.y);
      draw.lineTo(target.x,target.y);draw.stroke();draw.setLineDash([]);
    }
  }
  draw.globalAlpha=.98;
  draw.fillStyle='#a65b48';draw.strokeStyle='#e9b28f';draw.lineWidth=1.7;
  draw.beginPath();draw.arc(at.x,at.y,9,0,Math.PI*2);
  draw.fill();draw.stroke();
  draw.fillStyle='#fff0d8';draw.font='800 12px "Saira Condensed",sans-serif';
  draw.textAlign='center';draw.textBaseline='middle';
  draw.fillText('!',at.x,at.y+.25);
  draw.restore();
}
function paths(){
  for(const a of team(state)){
    if(a.health<=0)continue;
    const c=colorFor(a.id);
    const plan=a.plan;
    const activeTarget=activeWatchTarget(a);
    if(activeTarget)drawActiveWatchMarker(a.p,
      a.id===selected&&selectedActiveWatch&&draggingNode?
        draggingNode:activeTarget,c,a.id===selected,a.name);
    const visual=orderVisualScopes(plan,{
      watch:a.aimInstruction?.mode==='track',pace:a.pace,
      posture:a.posture,fire:a.firePolicy
    });
    if(plan.length){
      draw.beginPath();draw.moveTo(a.p.x,a.p.y);
      let from=a.p;
      for(const node of plan){
        if(node.kind==='move'||node.kind==='door'){
          const course=displayRouteCache.get(from,node.p,state.intel,state.phase==='planning').points;
          for(const p of course)draw.lineTo(p.x,p.y);
          from=node.p;
        }else if(node.kind==='pie'&&node.arc?.length){
          for(const p of node.arc)draw.lineTo(p.x,p.y);
          from=node.p;
        }
      }
      draw.strokeStyle=c;draw.globalAlpha=a.id===selected?.88:.40;
      draw.lineWidth=a.id===selected?2.6:1.6;
      draw.setLineDash([8,4]);draw.stroke();draw.setLineDash([]);
      draw.globalAlpha=1;
    }
    if(a.id===selected){
      let previous=a.p;
      for(let i=0;i<plan.length;i++){
        const node=plan[i];
        if(node.kind==='move'||node.kind==='door'){
          // A longer, amber dash reads as RUN without needing another label.
          if(visual[i].before.pace==='run'){
            const steps=displayRouteCache.get(previous,node.p,state.intel,
              state.phase==='planning').points;
            draw.save();draw.strokeStyle='#f0ce8e';draw.globalAlpha=.68;
            draw.lineWidth=2.2;draw.setLineDash([11,3]);draw.beginPath();
            draw.moveTo(previous.x,previous.y);
            for(const p of steps)draw.lineTo(p.x,p.y);
            draw.stroke();draw.restore();
          }
          previous=node.p;
        }else if(node.kind==='pie')previous=node.p;
      }
    }
    // Selected WATCH instructions remain readable throughout the route they
    // govern, without cluttering unselected operators' plans.
    if(a.id===selected){
      let previous=a.p;
      for(let i=0;i<plan.length;i++){
        const node=plan[i];
        if((node.kind==='move'||node.kind==='door')&&visual[i].before.watch){
          const course=displayRouteCache.get(previous,node.p,state.intel,
            state.phase==='planning').points;
          draw.save();draw.strokeStyle='#e6c990';draw.globalAlpha=.73;
          draw.lineWidth=3.2;draw.setLineDash([3,6]);draw.beginPath();
          draw.moveTo(previous.x,previous.y);
          for(const point of course)draw.lineTo(point.x,point.y);
          draw.stroke();draw.restore();
        }
        if(node.kind==='move'||node.kind==='door'||node.kind==='pie')
          previous=node.p;
      }
    }
    for(let i=0;i<plan.length;i++){
      const n=plan[i],selectedNow=a.id===selected&&selectedNode===n.id;
      const semantics=visual[i];
      const point=selectedNow&&draggingNode&&!draggingWatchTarget&&n.kind!=='flash'?
        draggingNode:n.p;
      circle(point.x,point.y,selectedNow?10:7,
        selectedNow?'#ecd29f':n.kind==='move'?c:'#c8ae7f');
      circle(point.x,point.y,3,'#263836');
      draw.textAlign='center';draw.fillStyle='#111e20';
      draw.font='700 12px "Saira Condensed",sans-serif';
      draw.fillText(String(i+1),point.x,point.y+3.1);
      if(n.facing!==undefined){
        const end={x:point.x+Math.cos(n.facing)*40,
          y:point.y+Math.sin(n.facing)*40};
        line(point,end,c,2.1);circle(end.x,end.y,2.2,c);
      }
      if(n.aimMode==='track'&&n.aimPoint){
        const watched=selectedNow&&draggingWatchTarget&&draggingNode?
          draggingNode:n.aimPoint;
        line(point,watched,c,1.8);
        circle(watched.x,watched.y,selectedNow?9:7,c);
        circle(watched.x,watched.y,3,'#203732');
        draw.textAlign='left';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillStyle='#e8cba2';
        draw.fillText('WATCH',point.x+12,point.y-12);
      }else if(n.aimMode==='fixed'||(n.aimMode==='free'&&n.facing!==undefined)){
        draw.textAlign='left';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillStyle='#d5e8de';
        draw.fillText(n.aimLabel==='strafe'?'HOLD DIR':'LOOK',
          point.x+12,point.y-12);
      }
      if(semantics.watchEnds&&n.facing===undefined){
        draw.textAlign='left';draw.font='bold 11px "Saira Condensed",sans-serif';
        draw.fillStyle='#ead5ad';
        draw.fillText('AUTO',point.x+12,point.y-12);
      }
      if(semantics.suppressionPoint){
        const target=semantics.suppressionPoint;
        draw.save();draw.strokeStyle='#e9a883';draw.lineWidth=1.8;
        draw.setLineDash([4,4]);draw.beginPath();
        draw.moveTo(point.x,point.y);draw.lineTo(target.x,target.y);draw.stroke();
        draw.setLineDash([]);draw.beginPath();
        draw.arc(target.x,target.y,20,0,Math.PI*2);draw.stroke();
        draw.restore();
      }
      if(n.kind==='flash'&&n.aimPoint){
        const path=flashTrajectory(state,a,n);
        const landing=selectedNow&&draggingNode?draggingNode:n.aimPoint;
        const points=path?.points??[n.p,landing];
        draw.strokeStyle='#f3c67e';draw.lineWidth=2.5;
        draw.setLineDash([5,5]);draw.beginPath();
        draw.moveTo(points[0].x,points[0].y);
        for(const p of points.slice(1))draw.lineTo(p.x,p.y);
        draw.stroke();draw.setLineDash([]);
        draw.strokeStyle='#f0af55';draw.lineWidth=2;
        draw.beginPath();draw.arc(landing.x,landing.y,26,0,Math.PI*2);draw.stroke();
        circle(landing.x,landing.y,selectedNow?11:9,'#dca053');
        draw.fillStyle='#1d2624';draw.font='600 12px "Work Sans",sans-serif';
        draw.textAlign='center';draw.fillText('F',landing.x,landing.y+4);
      }
      if(n.kind==='move'&&n.moveMode==='strafe'){
        draw.textAlign='left';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillStyle='#b8e7dd';
        draw.fillText('HOLD DIR',point.x+12,point.y-11);
      }
      if(n.kind==='pie'&&n.pivot&&n.arc?.length){
        draw.save();
        draw.strokeStyle=c;draw.lineWidth=3.2;
        draw.setLineDash([4,3]);draw.beginPath();
        const first=a.plan[i-1]?.p??a.p;
        draw.moveTo(first.x,first.y);
        for(const step of n.arc)draw.lineTo(step.x,step.y);
        draw.stroke();draw.setLineDash([]);
        line(point,n.pivot,'#d6b18b83',1.1);
        draw.fillStyle='#eacda0';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillText(n.pieSide==='cw'?'PIE ↷':'PIE ↶',point.x+12,point.y-11);
        draw.restore();
      }
      if(n.kind==='door'||n.kind==='wait'||n.kind==='holdClear'||n.kind==='sync'){
        draw.textAlign='left';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillStyle='#e7c797';
        draw.fillText(n.kind==='door'?(n.method??'open').toUpperCase():
          n.kind==='wait'||n.kind==='holdClear'?'◷ WAIT':n.kind.toUpperCase(),
          point.x+11,point.y-9);
      }
    }
    // A suppression order issued HERE belongs to the operator, not a node.
    if(a.id===selected&&a.firePolicy==='suppress'&&a.suppressPoint){
      draw.save();draw.strokeStyle='#e9a883';draw.lineWidth=1.8;
      draw.setLineDash([4,4]);draw.beginPath();
      draw.moveTo(a.p.x,a.p.y);
      draw.lineTo(a.suppressPoint.x,a.suppressPoint.y);draw.stroke();
      draw.setLineDash([]);draw.beginPath();
      draw.arc(a.suppressPoint.x,a.suppressPoint.y,20,0,Math.PI*2);
      draw.stroke();draw.restore();
    }
  }
  const draft=draftRouteNeighbors();
  if(draft){
    draw.save();draw.strokeStyle='#d5cb9d';draw.globalAlpha=.75;
    draw.lineWidth=2;draw.setLineDash([5,5]);
    draw.beginPath();draw.moveTo(draft.prior.x,draft.prior.y);
    draw.lineTo(draft.point.x,draft.point.y);
    if(draft.next)draw.lineTo(draft.next.x,draft.next.y);
    draw.stroke();draw.setLineDash([]);draw.fillStyle='#d5cb9d';
    draw.font='700 11px "Saira Condensed",sans-serif';
    draw.fillText('DRAFT',draft.point.x+13,draft.point.y-14);
    draw.restore();
  }
  if(trace&&trace.length>=1&&cursor){
    draw.beginPath();draw.moveTo(trace[0].x,trace[0].y);
    [...trace.slice(1),cursor].forEach(p=>draw.lineTo(p.x,p.y));
    draw.strokeStyle='#e4c998';draw.lineWidth=3;draw.stroke();
  }else if(cursor&&state.phase==='planning'){
    const a=uid(selected);
    if(a&&a.health>0&&cursor.x>=0&&cursor.x<W&&cursor.y>=0&&cursor.y<H){
      const start=a.plan.at(-1)?.p??a.p;
      draw.setLineDash([3,7]);line(start,cursor,
        looking?'#d8ad79':'rgba(193,219,213,.30)',1.4);
      draw.setLineDash([]);
    }
  }
}
function renderProjectedPlans(){
  if(!stage)return;
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.clearRect(0,0,cssW,cssH);
  for(const a of team(state)){
    if(a.health<=0)continue;
    const color=colorFor(a.id);
    const activeTarget=activeWatchTarget(a);
    if(activeTarget)drawActiveWatchMarker(
      worldToScreen(a.p,8),
      worldToScreen(a.id===selected&&selectedActiveWatch&&draggingNode?
        draggingNode:activeTarget,12),
      color,a.id===selected,a.name);
    let previous=a.p;
    const visual=orderVisualScopes(a.plan,{
      watch:a.aimInstruction?.mode==='track',pace:a.pace,
      posture:a.posture,fire:a.firePolicy
    });
    let visualIndex=0;
    for(const n of a.plan){
      const semantics=visual[visualIndex++];
      const cachedRoute=n.kind==='move'||n.kind==='door'?
        displayRouteCache.get(previous,n.p,state.intel,state.phase==='planning'):null;
      const steps=n.kind==='pie'?n.arc??[]:cachedRoute?.points??[];
      if(steps.length){
        draw.beginPath();
        const start=worldToScreen(previous,4);
        draw.moveTo(start.x,start.y);
        for(const point of steps){
          const projected=worldToScreen(point,4);
          draw.lineTo(projected.x,projected.y);
        }
        draw.strokeStyle=color;
        draw.globalAlpha=a.id===selected?.94:.50;
        draw.lineWidth=n.kind==='pie'?3:
          semantics.before.watch&&a.id===selected?3.6:2.4;
        const narrowOnly=n.kind==='move'&&!!cachedRoute?.narrowOnly;
        // Narrow routes use a finer dash without another overlay.
        draw.setLineDash(n.kind==='pie'?[3,3]:
          semantics.before.watch&&a.id===selected?[3,5]:
          semantics.before.pace==='run'?[12,3]:
          narrowOnly?[2,4]:[7,4]);
        draw.stroke();draw.setLineDash([]);draw.globalAlpha=1;
      }
      const selectedNow=a.id===selected&&selectedNode===n.id;
      const point=worldToScreen(selectedNow&&draggingNode&&!draggingWatchTarget&&n.kind!=='flash'?
        draggingNode:n.p,8);
      const invalidDrag=selectedNow&&draggingNode&&!draggingWatchTarget&&
        !intelPassable(draggingNode,state.intel,SQUEEZE_RADIUS);
      circle(point.x,point.y,selectedNow?11:7,
        invalidDrag?'#df8070':selectedNow?'#ecd29f':color);
      circle(point.x,point.y,3,'#233b39');
      draw.fillStyle='#142829';draw.font='700 12px "Saira Condensed",sans-serif';
      draw.textAlign='center';draw.fillText(String(a.plan.indexOf(n)+1),
        point.x,point.y+3);
      if(n.facing!==undefined){
        const aim=worldToScreen({x:n.p.x+Math.cos(n.facing)*38,
          y:n.p.y+Math.sin(n.facing)*38},8);
        line(point,aim,color,2);
        circle(aim.x,aim.y,3,color);
      }
      if(n.aimMode==='track'&&n.aimPoint){
        const watched=selectedNow&&draggingWatchTarget&&draggingNode?
          draggingNode:n.aimPoint;
        const target=worldToScreen(watched,12);
        line(point,target,color,1.8);
        circle(target.x,target.y,8,color);
        circle(target.x,target.y,3,'#264039');
        draw.fillStyle='#f1d7a4';draw.textAlign='left';
        draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillText('WATCH',point.x+12,point.y-13);
      }else if(n.aimMode==='fixed'||(n.aimMode==='free'&&n.facing!==undefined)){
        draw.fillStyle='#d2eee4';draw.textAlign='left';
        draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillText(n.aimLabel==='strafe'?'HOLD DIR':'LOOK',
          point.x+12,point.y-13);
      }
      if(n.kind==='move'&&n.moveMode==='strafe'){
        draw.fillStyle='#e0f7e9';draw.textAlign='left';
        draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillText('HOLD DIR',point.x+13,point.y-12);
      }
      if(semantics.watchEnds&&n.facing===undefined){
        draw.fillStyle='#ead5ad';draw.textAlign='left';
        draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillText('AUTO',point.x+12,point.y-14);
      }
      if(semantics.suppressionPoint){
        const target=worldToScreen(semantics.suppressionPoint,7);
        draw.save();draw.strokeStyle='#e9a883';draw.lineWidth=1.8;
        draw.setLineDash([4,4]);draw.beginPath();
        draw.moveTo(point.x,point.y);draw.lineTo(target.x,target.y);draw.stroke();
        draw.setLineDash([]);draw.beginPath();
        draw.arc(target.x,target.y,20,0,Math.PI*2);draw.stroke();
        draw.fillStyle='#e9a883';draw.textAlign='center';
        draw.font='700 11px "Work Sans",sans-serif';
        draw.fillText('SUP',target.x,target.y-24);
        draw.restore();
      }
      if(n.kind==='flash'&&n.aimPoint){
        const path=flashTrajectory(state,a,n);
        const landing=selectedNow&&draggingNode?draggingNode:n.aimPoint;
        const points=path?.points??[n.p,landing];
        draw.strokeStyle='#f0bd77';draw.lineWidth=2.2;
        draw.setLineDash([4,5]);draw.beginPath();
        const start=worldToScreen(points[0],7);draw.moveTo(start.x,start.y);
        for(const q of points.slice(1)){
          const project=worldToScreen(q,7);draw.lineTo(project.x,project.y);
        }
        draw.stroke();draw.setLineDash([]);
        const screen=worldToScreen(landing,7);
        draw.strokeStyle='#f1c17e';draw.beginPath();
        draw.arc(screen.x,screen.y,16,0,Math.PI*2);draw.stroke();
        circle(screen.x,screen.y,selectedNow?11:9,'#c88d4e');
        draw.fillStyle='#182b2c';draw.textAlign='center';
        draw.font='700 12px "Saira Condensed",sans-serif';draw.fillText('F',screen.x,screen.y+3);
      }
      if(n.kind==='door'){
        draw.fillStyle='#e2ca9f';draw.textAlign='left';
        draw.font='700 12px "Saira Condensed",sans-serif';
        const door=state.doors.find(d=>d.id===n.doorId);
        draw.fillText((n.method??'open').toUpperCase()+
          ((n.method??'open')==='open'?(door?.swing===1?' ↷':' ↶'):''),
          point.x+12,point.y-11);
      }
      if(n.kind==='pie'&&n.pivot){
        const pivot=worldToScreen(n.pivot,12);
        circle(pivot.x,pivot.y,7,'#e2b476');
        circle(pivot.x,pivot.y,3,'#24322f');
        line(point,pivot,'#e3b37c8a',1.5);
        draw.textAlign='left';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.fillStyle='#e3bb87';
        draw.fillText('PIVOT '+Math.round(n.pieDegrees??54)+'°',
          pivot.x+10,pivot.y-12);
      }
      if(n.kind==='pie'&&n.arc?.length&&a.id===selected){
        const finish=worldToScreen(n.arc.at(-1)!,8);
        draw.strokeStyle='#f0d3a4';draw.lineWidth=1.8;
        draw.strokeRect(finish.x-8,finish.y-8,16,16);
      }
      if(n.kind==='wait'||n.kind==='holdClear'){
        draw.fillStyle='#e5c58e';draw.font='600 12px "Work Sans",sans-serif';
        draw.fillText('◷ WAIT',point.x+12,point.y-14);
      }
      if(n.postureState||n.paceState||n.firePolicyState){
        draw.font='600 11px "Work Sans",sans-serif';draw.fillStyle='#a2d7c9';
        draw.fillText([n.postureState?.toUpperCase(),
          n.paceState?.toUpperCase(),n.firePolicyState?.toUpperCase()]
          .filter(Boolean).join(' · '),point.x+12,point.y+18);
      }
      if(n.kind==='move'||n.kind==='door'||n.kind==='pie')previous=n.p;
    }
    const pawn=worldToScreen(a.p,32),ground=worldToScreen(a.p,1);
    const squadIndex=team(state).findIndex(member=>member.id===a.id);
    const labelSpread=state.site?[
      {x:-27,y:-17},{x:27,y:-17},
      {x:-27,y:-36},{x:27,y:-36},
    ][squadIndex]??{x:0,y:-9}:{x:0,y:-9};
    draw.textAlign='center';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillStyle=color;
    if(a.id===selected||a.injuryStage>0||replayFollow&&
      replayFollowId===a.id)
      draw.fillText(a.name,pawn.x+labelSpread.x,pawn.y+labelSpread.y);
    if(a.id===selected){
      draw.strokeStyle='#e9d6b1';draw.lineWidth=2.1;
      draw.beginPath();draw.arc(ground.x,ground.y,14,0,Math.PI*2);draw.stroke();
    }
    if(a.suppression>.53){
      draw.font='700 11px "Saira Condensed",sans-serif';draw.fillStyle='#e5bc92';
      draw.fillText('SUPPRESSED',pawn.x,pawn.y-23);
    }
    if(a.id===selected&&a.firePolicy==='suppress'&&a.suppressPoint){
      const target=worldToScreen(a.suppressPoint,7);
      draw.save();draw.strokeStyle='#e9a883';draw.lineWidth=1.8;
      draw.setLineDash([4,4]);draw.beginPath();
      draw.moveTo(ground.x,ground.y);draw.lineTo(target.x,target.y);
      draw.stroke();draw.setLineDash([]);draw.beginPath();
      draw.arc(target.x,target.y,20,0,Math.PI*2);draw.stroke();draw.restore();
    }
  }
  // Screen-space icons stay readable regardless of ortho pitch or zoom.
  for(const hostile of enemies(state)){
    if(!liveVisibility(state,hostile.p))continue;
    const ground=worldToScreen(hostile.p,1);
    if(hostile.health<=0){
      // The actual grounded body and restrained blood mark communicate DOWN.
      draw.fillStyle='rgba(125,48,43,.52)';draw.beginPath();
      draw.ellipse(ground.x,ground.y,11,6,0,0,Math.PI*2);draw.fill();
    }else{
      draw.strokeStyle='#e2a18b';draw.lineWidth=1.6;
      draw.beginPath();draw.arc(ground.x,ground.y,12,0,Math.PI*2);draw.stroke();
    }
  }
  for(const member of team(state)){
    const pawn=worldToScreen(member.p,33);
    if(member.health<=0){
      draw.fillStyle='rgba(129,54,48,.35)';draw.beginPath();
      draw.ellipse(pawn.x,pawn.y+11,9,4,0,0,2*Math.PI);draw.fill();
    }else if(member.health===1){
      draw.fillStyle='#e6a485';draw.fillRect(pawn.x-10,pawn.y+1,20,3);
    }
  }
  // Door shapes communicate door identity. Only show a selector when the
  // selected operator or its planned endpoint can actually interact.
  const active=uid(selected);
  for(const door of state.doors){
    const visibility=doorVisibility(state,door);
    if(!visibility.known||!active||active.health<=0)continue;
    const node=selectedPlanNode();
    const physicallyReachable=team(state).some(actor=>
      actor.health>0&&doorReachable(actor.p,door));
    const plannedReachable=!!node&&doorReachable(node.p,door);
    if(!physicallyReachable&&!plannedReachable)continue;
    const p=worldToScreen(doorCenter(door),12);
    const chosen=doorFocusId===door.id;
    draw.save();
    draw.strokeStyle=chosen?'#ffe08b':
      physicallyReachable?'#f5e8cd96':'#c3d5c06c';
    draw.lineWidth=chosen?2.4:1.2;
    if(!physicallyReachable)draw.setLineDash([2,3]);
    draw.beginPath();draw.arc(p.x,p.y,chosen?10:6,0,Math.PI*2);draw.stroke();
    draw.restore();
  }
  const draft=draftRouteNeighbors();
  if(draft){
    const p=worldToScreen(draft.prior,8);
    const q=worldToScreen(draft.point,8);
    draw.save();draw.strokeStyle='#d5cb9d';draw.globalAlpha=.8;
    draw.lineWidth=2;draw.setLineDash([5,5]);
    draw.beginPath();draw.moveTo(p.x,p.y);draw.lineTo(q.x,q.y);
    if(draft.next){
      const next=worldToScreen(draft.next,8);
      draw.lineTo(next.x,next.y);
    }
    draw.stroke();draw.setLineDash([]);draw.fillStyle='#d5cb9d';
    draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillText('DRAFT',q.x+13,q.y-14);draw.restore();
  }
  // Physical muzzle flashes, tracers and impacts are rendered exclusively
  // by Three.js in 3D modes so depth testing never draws them over actors.
  // Unknown enemies stay unrendered; only grounded last-known reports show.
  for(const hostile of enemies(state)){
    if(isSeen(state,hostile)||hostile.health<=0)continue;
    const memory=lastKnown(state,hostile.id);
    if(!memory||state.seconds-memory.at>25)continue;
    const where=worldToScreen(memory.p,12);
    draw.font='700 17px "Saira Condensed",sans-serif';draw.textAlign='center';
    draw.fillStyle='#e6bb9d';
    draw.fillText(memory.status==='heard'?'~':'?',where.x,where.y);
  }
  if(trace&&trace.length>1){
    draw.beginPath();
    const first=worldToScreen(trace[0],8);
    draw.moveTo(first.x,first.y);
    for(const point of trace.slice(1)){
      const screen=worldToScreen(point,8);
      draw.lineTo(screen.x,screen.y);
    }
    draw.strokeStyle='#f0cd96';draw.lineWidth=3;draw.stroke();
  }
  if(state.mission!=='clear'&&state.mission!=='done'){
    const target=worldToScreen(state.mission==='secure'?
      state.scenario.objective:state.scenario.extract,9);
    draw.strokeStyle='#e8d5a6';draw.lineWidth=2;
    draw.beginPath();draw.arc(target.x,target.y,17,0,2*Math.PI);draw.stroke();
    draw.fillStyle='#e8d5a6';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillText(state.mission.toUpperCase(),target.x,target.y-23);
  }
  for(const a of team(state))drawExecutionProblem(a,true);
}
function fog(){
  if(replaying&&replayOmniscient)return;
  if(fogStamp<0||fogSession!==state||fogIntelMode!==state.intel.mode||
    state.seconds<fogStamp||state.seconds-fogStamp>.055){
    fogStamp=state.seconds;fogSession=state;fogIntelMode=state.intel.mode;
    paintFogMask(fogContext!,state);
  }
  draw.drawImage(fogCanvas,0,0,W,H);
}
function missionMarkers(){
  if(state.rescue&&liveVisibility(state,state.rescue.p)){
    const p=state.rescue.p;
    draw.strokeStyle='#eed9ad';draw.lineWidth=2.2;
    draw.beginPath();draw.arc(p.x,p.y,13,0,Math.PI*2);draw.stroke();
    draw.fillStyle='#ebdfc0';draw.textAlign='center';
    draw.font='700 12px "Saira Condensed",sans-serif';draw.fillText('CIV',p.x,p.y-18);
  }
  const p=state.mission==='extract'?state.scenario.extract:state.scenario.objective;
  if(state.mission==='clear'||state.mission==='done'||
    !liveVisibility(state,p))return;
  draw.strokeStyle='#d8cc98';draw.lineWidth=2;
  draw.beginPath();draw.arc(p.x,p.y,33,0,Math.PI*2);draw.stroke();
  draw.fillStyle='#e1d1a2';draw.font='600 12px "Work Sans",sans-serif';
  draw.textAlign='center';
  draw.fillText(state.mission==='secure'?'SECURE':'EXTRACT',p.x,p.y-39);
}
function sprite(a:TeamActor){
  if(a.side==='red'&&!(replaying&&replayOmniscient)){
    const visible=a.health>0?isSeen(state,a):liveVisibility(state,a.p);
    if(!visible){
      const memory=lastKnown(state,a.id);
      if(memory&&a.health>0&&state.seconds-memory.at<25){
        draw.fillStyle=memory.status==='heard'?'#e6bb828e':'#d19d837e';
        draw.font='700 16px "Saira Condensed",sans-serif';draw.textAlign='center';
        draw.fillText(memory.status==='heard'?'~':'?',memory.p.x,memory.p.y);
        if(memory.status==='heard'){
          draw.strokeStyle='#c9af7c4b';draw.lineWidth=1;
          draw.beginPath();draw.arc(memory.p.x,memory.p.y,30,0,Math.PI*2);draw.stroke();
        }
      }
      return;
    }
  }
  const friendly=a.side==='blue',c=friendly?colorFor(a.id):'#d3917b';
  if(a.health<=0){
    draw.save();draw.translate(a.p.x,a.p.y);
    draw.rotate(a.heading);
    rect(-13,-4,29,8,'#574d49');rect(-3,-9,5,18,'#a46556');
    draw.restore();
    draw.fillStyle='#7e363092';draw.beginPath();
    draw.ellipse(a.p.x,a.p.y,13,6,a.heading,0,2*Math.PI);draw.fill();
    return;
  }
  if(friendly&&(a.id===selected)){
    draw.strokeStyle='#e8d6b1';draw.lineWidth=1.6;
    draw.beginPath();draw.arc(a.p.x,a.p.y,16,0,2*Math.PI);draw.stroke();
    conical(a);
  }
  const impactAge=state.seconds-a.lastHitAt;
  const flinch=impactAge>=0&&impactAge<.28?1-impactAge/.28:0;
  const firing=state.shots.some(shot=>shot.shooterId===a.id&&
    shot.age<.11&&shotVisibility(state,shot).flash);
  draw.save();
  draw.translate(a.p.x-flinch*2.3,a.p.y+flinch*1.7);
  draw.rotate(a.heading+flinch*.14+
    (a.injuryStage===2?.14:a.injuryStage===1?.04:0));
  circle(0,2,11,'#0d1b20af');circle(0,0,9.2,friendly?'#4b756f':'#794a43');
  // Body and alternating leg extension are driven by actual travel.
  const gait=Math.sin(state.seconds*15+Math.floor(a.p.x*.15))*
    Math.min(1,a.velocity/70)*(a.injuryStage===2?2.1:3.5);
  rect(-9,-7+gait,9,5,friendly?'#304842':'#4b3633');
  rect(-9,2-gait,9,5,friendly?'#304842':'#4b3633');
  rect(-7,-5,14,10,c);
  rect(-10,-4,5,8,friendly?'#45625d':'#563e39');
  circle(4,0,3.8,friendly?'#d3dac1':'#d0a58a');
  rect(firing?2:5,-2,
    a.weapon==='smg'?13:a.weapon==='rifle'?23:a.weapon==='shotgun'?20:18,
    a.weapon==='shotgun'?5:4,'#1a2527');
  rect(firing?17:20,-1,6,2,'#a2a9a1');
  draw.restore();
  if(a.traversal){
    // Floor Plan has no vertical axis; retain a small physical crossing
    // indicator instead of making the operator vanish behind low furniture.
    const t=a.traversalElapsed/Math.max(.001,a.traversal.duration);
    draw.save();
    draw.strokeStyle='#e8cc8e';draw.lineWidth=2.2;
    draw.globalAlpha=.75;
    draw.beginPath();draw.arc(a.p.x,a.p.y,15,-Math.PI/2,
      -Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,t)));draw.stroke();
    draw.globalAlpha=1;draw.textAlign='center';
    draw.fillStyle='#f5dca0';
    draw.font='700 10px "Saira Condensed",sans-serif';
    draw.fillText(a.traversal.kind.toUpperCase(),a.p.x,a.p.y-36);
    draw.restore();
  }
  if(friendly){
    draw.textAlign='center';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillStyle=c;draw.fillText(a.name,a.p.x,a.p.y-21);
    if(a.aimInstruction?.mode==='track'&&a.pace!=='run'){
      draw.fillStyle='#f0cd96';draw.font='700 11px "Saira Condensed",sans-serif';
      draw.fillText('PIE ACTIVE',a.p.x,a.p.y-33);
    }
    if(a.suppression>.53){
      draw.fillStyle='#eac69d';draw.font='700 11px "Saira Condensed",sans-serif';
      draw.fillText('SUPP',a.p.x,a.p.y-43);
    }
    if(a.health===1){draw.fillStyle='#e7a886';
      draw.fillRect(a.p.x-8,a.p.y+13,16,2);}
  }else{
    draw.strokeStyle='#f0c5a4';draw.lineWidth=1.4;
    draw.strokeRect(a.p.x-12,a.p.y-12,24,24);
  }
}
function contacts(){
  if(replaying&&replayAnalysis)for(const a of enemies(state)){
    if(a.health<=0)continue;
    const start=viewMode==='plan2d'?a.p:worldToScreen(a.p,22);
    const focus=a.contact??a.watch;
    if(focus){
      const end=viewMode==='plan2d'?focus:worldToScreen(focus,22);
      draw.save();draw.strokeStyle='#e4ae78';draw.lineWidth=1.7;
      draw.setLineDash([5,4]);draw.beginPath();
      draw.moveTo(start.x,start.y);draw.lineTo(end.x,end.y);
      draw.stroke();draw.setLineDash([]);draw.restore();
    }
    if(a.defense){
      const p=viewMode==='plan2d'?a.defense:worldToScreen(a.defense,5);
      draw.strokeStyle='#d6b986';draw.lineWidth=2;
      draw.strokeRect(p.x-8,p.y-8,16,16);
    }
  }
  for(const m of state.dropped){
    rect(m.p.x-3,m.p.y-1,6,2,'#202e2d');
  }
  for(const g of state.grenades){
    circle(g.p.x,g.p.y,3,'#a7b4a0');
  }
  for(const b of state.flashBursts){
    draw.globalAlpha=Math.max(0,1-b.age/.7)*.85;
    circle(b.p.x,b.p.y,13+48*b.age,'#f6edcc');
    draw.globalAlpha=1;
  }
  for(const shot of state.shots){
    const visibility=replaying&&replayOmniscient?
      {trace:true,flash:true,impact:true}:shotVisibility(state,shot);
    const fade=contactFade(shot.age,.40);
    draw.globalAlpha=fade;
    if(visibility.trace&&shot.age<.23)
      line(shot.start,shot.end,
        shot.side==='blue'?'#f6db9d':'#f2a087',2.3);
    if(visibility.flash&&shot.age<.12)
      circle(shot.start.x,shot.start.y,4+fade*4,'#f4dbb0');
    if(visibility.impact){
      const color=shot.surface==='blood'?'#b46859':
        shot.surface==='metal'?'#f1cf91':
        shot.surface==='wood'?'#e9ba7e':'#dfc8a4';
      circle(shot.end.x,shot.end.y,shot.hit?5:3.7,color);
      if(shot.hit){
        draw.fillStyle='#efb19c';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.textAlign='center';
        // Physical impacts carry the outcome without a floating DOWN label.
      }
    }
    draw.globalAlpha=1;
  }
}
function endMessage(){
  if(!replaying&&(state.phase==='won'||state.phase==='lost')){
    // The HTML debrief owns the readable text and restart buttons.
    draw.fillStyle='#101c1f88';draw.fillRect(0,0,W,H);
  }
}
// Blood and bullet decals are part of the floor, not HUD sprites.
// Render beneath architecture AND fog so marks cannot float over walls
// or leak into an unrevealed room.
/** Shared 3D/2D light footprint, shaded beneath architecture and fog. */
let beam2DBlockers:Segment[]=[];
let beam2DBlockerTick=-1,beam2DSite=-1,beam2DRevision=-1;
const beam2DHistory=new Map<string,{x:number;y:number;yaw:number;tick:number;
 config:TeamActor['weaponConfiguration'];footprint:Pt[]}>();
function renderLightingMood2D(){
 const mood=lightingPresentation(state.lightingMode);
 if(mood.floorTint<=0)return;
 draw.save();
 draw.fillStyle='rgba(2,7,11,'+mood.floorTint+')';
 draw.fillRect(-9,-9,W+18,H+18);
 draw.restore();
}
function renderWeaponLights2D(){
 const active=state.operators.filter(a=>a.health>0&&a.weaponLightOn&&
  a.weaponConfiguration?.slots.light==='light-compact');
 if(!active.length)return;
 const tick=Math.floor(state.seconds*8),site=state.site?.seed??-1;
 if(tick!==beam2DBlockerTick||site!==beam2DSite||
  state.objectRevision!==beam2DRevision){
  beam2DBlockers=lightBeamBlockers(WALLS,state.doors,COVER);
  beam2DBlockerTick=tick;beam2DSite=site;
  beam2DRevision=state.objectRevision;
 }
 draw.save();draw.fillStyle='rgba(183,240,205,.12)';
 for(const actor of active){
  if(actor.side==='red'&&!replayOmniscient&&!isSeen(state,actor))continue;
  const previous=beam2DHistory.get(actor.id);
  const yaw=actor.weaponYaw;
  if(!previous||previous.tick!==tick||!sameWeaponConfiguration(previous.config,actor.weaponConfiguration)||
   Math.hypot(previous.x-actor.p.x,previous.y-actor.p.y)>.7||
   Math.abs(Math.atan2(Math.sin(previous.yaw-yaw),Math.cos(previous.yaw-yaw)))>.025){
   const muzzle=weaponClearance({x:actor.p.x,z:actor.p.y,
    heading:actor.heading,weaponYaw:yaw,weapon:actor.weapon,
    weaponConfiguration:actor.weaponConfiguration,aim:actor.aim,
    velocity:actor.velocity,recoil:actor.recoil,posture:actor.posture},
    state.doors).muzzle;
   const from=weaponLightEmitter(muzzle,actor.weaponConfiguration!);
   beam2DHistory.set(actor.id,{x:actor.p.x,y:actor.p.y,yaw,tick,
    config:actor.weaponConfiguration,
    footprint:lightBeamFootprint(from,muzzle.yaw,beam2DBlockers)});
  }
  const polygon=beam2DHistory.get(actor.id)!.footprint;
  draw.beginPath();draw.moveTo(polygon[0].x,polygon[0].y);
  for(let i=1;i<polygon.length;i++)draw.lineTo(polygon[i].x,polygon[i].y);
  draw.closePath();draw.fill();
 }
 draw.restore();
}
function renderGroundMarks(){
  for(const mark of state.impactMarks){
    if(!(replaying&&replayOmniscient)&&!liveVisibility(state,mark.p))continue;
    draw.globalAlpha=Math.max(.18,.78-mark.age*.023);
    circle(mark.p.x,mark.p.y,mark.surface==='blood'?4:2.5,
      mark.surface==='blood'?'#914a44':
      mark.surface==='wood'?'#42332a':
      mark.surface==='stone'?'#363936':
      mark.surface==='metal'?'#262e30':'#4e4b40');
    draw.globalAlpha=1;
  }
 }
function render(){
  if(stage&&viewMode!=='plan2d'){
    renderProjectedPlans();return;
  }
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  draw.fillStyle='#52655b';draw.fillRect(-9,-9,W+18,H+18);
  terrain();furniture();renderGroundMarks();renderLightingMood2D();renderWeaponLights2D();
  architecture();fog();missionMarkers();
  paths();
  for(const a of state.operators)sprite(a);
  for(const a of team(state))drawExecutionProblem(a,false);
  contacts();endMessage();
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(0,0,W,H);
  draw.restore();
}
/** Rejected authoring orders keep the existing plan intact and mark only
 * the attempted world point; no hidden geometry or actors are inspected. */
function rejectAt(pt:Pt,reason:string){
  state.events.push(reason);
  tacticalFeedback.emit('error',pt,recoveryAdviceFor(reason)?.marker??'INVALID');
}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning'||replaying)return;
  if(evacMode){
   const mode=evacMode;evacMode=null;
   if(!planCasualtyTransport(state,selected,mode.patientId,pt,mode.mode))
    showUiHelp('CASUALTY ROUTE BLOCKED — CHOOSE A REACHABLE DESTINATION');
   updateHud();return;
  }
  if(firePlacement){
    const nodeId=selectedNode??undefined;
    const accepted=setFirePolicy(state,selected,'suppress',nodeId,pt);
    if(!accepted)rejectAt(pt,'INVALID SUPPRESSION POINT');
    else{
      tacticalFeedback.emit('command',pt,'SUPPRESS');
      uiClickTone('command');firePlacement=null;
    }
    updateHud();return;
  }
  if(flashMode){
    const id=state.nextId;
    const accepted=flashDoorId?
      planDoorFlash(state,selected,flashDoorId,pt):
      planFlash(state,selected,pt);
    if(!accepted)rejectAt(pt,'FLASH TARGET BLOCKED / OUT OF RANGE');
    else{
      tacticalFeedback.emit('command',pt,'FLASH');
      uiClickTone('command');
      selectedNode=flashDoorId?state.nextId-1:id;
      flashMode=false;flashDoorId=null;
    }
    updateHud();return;
  }
  if(looking){
    const placedId=state.nextId;
    const retargetingActive=lookMode==='watch'&&selectedActiveWatch;
    const committed=retargetingActive?
      retargetActiveWatch(state,selected,pt):
      lookMode==='watch'?
        planWatch(state,selected,pt,selectedNode??undefined,armedOrigin):
        planAim(state,selected,'free',pt,selectedNode??undefined,'look',armedOrigin);
    if(!committed){
      rejectAt(pt,'AIM TOO CLOSE · TAP FARTHER FROM THE OPERATOR OR WAYPOINT');
      showUiHelp('AIM TOO CLOSE · TAP FARTHER AWAY, OR CANCEL',3200);
    }
    else{
      tacticalFeedback.emit('command',pt,lookMode==='watch'?'WATCH':'LOOK');
      uiClickTone('command');
      if(!retargetingActive&&selectedNode===null){
        selectedNode=placedId;selectedActiveWatch=false;
      }
      teach(lookMode==='watch'?'watch-placed':'look-placed',
        lookMode==='watch'?
          'WATCH stays on that point while moving. Drag its ring to adjust.':
          'LOOK checks that direction briefly, then returns to the route.',4100);
    }
    if(committed)looking=false;
    updateHud();return;
  }
  const beforeRoute=uid(selected)?finalPoint(uid(selected)!):pt;
  lastAuthoringAt=performance.now();
  if(!planMove(state,selected,pt))
    rejectAt(pt,!intelPassable(pt,state.intel)?
      'DESTINATION BLOCKED · CHOOSE NEARBY FLOOR':
      'NO WALKABLE ROUTE · CHECK DOOR OR PATH');
  else{
    selectedActiveWatch=false;
    selectedNode=uid(selected)?.plan.at(-1)?.id??null;
    tacticalFeedback.emit('route',pt,undefined,beforeRoute);
    teach('waypoint-created',
      'Waypoint added. Drag to move it; choose LOOK / WATCH, or DELETE.',4900);
  }
  updateHud();
}
function isMissionTerminal(s:Session){return s.phase==='won'||s.phase==='lost';}
function clockText(t:number){
  const seconds=Math.floor(Math.max(0,t));
  return String(Math.floor(seconds/60)).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0');
}
function applyReplayFrameAt(t:number){
  const frame=recorder.sample(t);
  if(!frame)return;
  replayPresentation=frame.presentation??null;
  applyReplayFrame(state,frame);
  // Scrubbed time can move backwards: invalidate cached fog/effect time.
  fogStamp=-1;
}
function seekReplay(t:number){
  replayTime=Math.max(0,Math.min(recorder.duration,t));
  applyReplayFrameAt(replayTime);updateReplayHud();
}
function updateReplayHud(){
  ui.replaySeek.value=String(recorder.duration?
    Math.round(1000*replayTime/recorder.duration):0);
  ui.replayClock.textContent=clockText(replayTime)+' / '+
    clockText(recorder.duration);
  ui.replaySeek.setAttribute('aria-valuetext',
    clockText(replayTime)+' of '+clockText(recorder.duration));
  ui.replayPlay.dataset.caption=replayPlaying?'PAUSE':'PLAY';
  const playbackIcon=replayPlaying?'pause':'replayPlay';
  if(ui.replayPlay.dataset.mode!==playbackIcon){
    ui.replayPlay.dataset.mode=playbackIcon;
    ui.replayPlay.replaceChildren(tacticalIcon(playbackIcon));
    ui.replayPlay.setAttribute('aria-label',replayPlaying?'Pause replay':'Play replay');
    ui.replayPlay.title=replayPlaying?'Pause replay':'Play replay';
  }
  ui.replaySpeed.textContent=replayRate+'×';
  ui.replaySpeed.title='Playback speed '+replayRate+'× · Tap to change';
  ui.replaySpeed.setAttribute('aria-label',
    'Playback speed '+replayRate+' times. Tap to select next speed');
  ui.replaySight.textContent=replayOmniscient?'FULL VIEW':'TEAM SIGHT';
  ui.replayView.textContent=viewMode.toUpperCase();
  ui.replayFollow.textContent=replayFollow?'FOLLOW '+replayFollowId.toUpperCase():'FOLLOW';
  ui.replayAnalysis.textContent=replayAnalysis?'ANALYSIS ON':'ANALYSIS';
  const execution=recorder.executionEvents.filter(e=>
    e.kind==='blocked'||e.kind==='resumed'||e.kind==='completed');
  const event=[...recorder.events,...execution]
    .filter(e=>e.t<=replayTime+.14).sort((a,b)=>a.t-b.t).at(-1);
  ui.replayEventText.textContent=event&&replayTime-event.t<4.5?
    clockText(event.t)+' · '+event.text:'';
}
function renderReplayEventMarkers(){
  ui.replayMarks.replaceChildren();
  const duration=recorder.duration;
  if(duration<=0)return;
  const friendlyIds=new Set(team(state).map(a=>a.id));
  let lastShot=-Infinity,count=0;
  const significant=recorder.executionEvents.filter(e=>
    e.kind==='blocked'||e.kind==='resumed'||e.kind==='completed');
  for(const event of [...recorder.events,...significant].sort((a,b)=>a.t-b.t)){
    if(count>=85)break;
    if(event.kind==='shot'){
      if(event.t-lastShot<3)continue;
      lastShot=event.t;
    }
    const frame=recorder.at(event.t);
    const knownPoint=!!event.p&&!!frame&&(
      frame.seenGround.includes(Math.floor(event.p.x/40)+','+
        Math.floor(event.p.y/40))||
      frame.seenGround.includes('fine:'+Math.floor(event.p.x/20)+','+
        Math.floor(event.p.y/20)));
    if(!replayOmniscient&&!friendlyIds.has(event.actor??'')&&!knownPoint)
      continue;
    const marker=document.createElement('button');
    marker.type='button';
    marker.className='replay-mark replay-mark-'+event.kind;
    marker.style.left=(event.t/duration*100).toFixed(3)+'%';
    marker.title=clockText(event.t)+' · '+event.text;
    marker.setAttribute('aria-label',marker.title);
    marker.addEventListener('click',()=>{
      replayPlaying=false;seekReplay(event.t);
    });
    ui.replayMarks.append(marker);count++;
  }
}
function enterReplay(){
  if(replaying||recorder.frames.length<2)return;
  finishedSession=state;replaying=true;replayPlaying=true;replayTime=0;
  replayRate=1;replayOmniscient=false;looking=false;flashMode=false;
  replayFollow=false;replayAnalysis=false;replayFollowId='rook';
  ui.replayExtra.hidden=true;ui.replayMore.setAttribute('aria-expanded','false');
  state=newSession(finishedSession.variant,finishedSession.site?.seed,
    finishedSession.intel.mode,finishedSession.site?.scale??'standard');
  state.lightingMode=finishedSession.lightingMode;
  applyRequestedCondition(state);
  applyRosterIdentity(state,persistentRoster);
  stage?.applySite(state.site??null);
  document.body.classList.add('replaying');
  ui.replayPanel.hidden=false;
  renderReplayEventMarkers();seekReplay(0);updateHud();
}
function exitReplay(){
  if(!replaying)return;
  replaying=false;replayPlaying=false;replayPresentation=null;
  document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  if(finishedSession)state=finishedSession;
  finishedSession=null;fogStamp=-1;
  stage?.applySite(state.site??null);
  updateHud();
}
ui.watchReplay.addEventListener('click',enterReplay);
ui.replayPlay.addEventListener('click',()=>{
  if(replayTime>=recorder.duration)seekReplay(0);
  replayPlaying=!replayPlaying;updateReplayHud();
});
ui.replayBack.addEventListener('click',()=>seekReplay(replayTime-10));
ui.replayForward.addEventListener('click',()=>seekReplay(replayTime+10));
ui.replayMore.addEventListener('click',()=>{
  ui.replayExtra.hidden=!ui.replayExtra.hidden;
  ui.replayMore.setAttribute('aria-expanded',String(!ui.replayExtra.hidden));
});
ui.replaySpeed.addEventListener('click',()=>{
  replayRate=({0.5:1,1:2,2:4,4:0.5} as Record<number,number>)[replayRate]??1;
  updateReplayHud();
});
ui.replaySeek.addEventListener('input',()=>{
  replayPlaying=false;
  seekReplay(Number(ui.replaySeek.value)/1000*recorder.duration);
});
ui.replaySight.addEventListener('click',()=>{
  replayOmniscient=!replayOmniscient;fogStamp=-1;
  renderReplayEventMarkers();updateReplayHud();
});
ui.replayView.addEventListener('click',()=>{
  cameraMode(viewMode==='iso'?'top':viewMode==='top'?'plan2d':'iso');
  updateReplayHud();
});
const jumpReplayEvent=(forward:boolean)=>{
  const events=[...recorder.events.filter(e=>e.kind!=='shot'),
    ...recorder.executionEvents.filter(e=>e.kind==='blocked'||
      e.kind==='resumed'||e.kind==='completed')].sort((a,b)=>a.t-b.t);
  const item=forward?events.find(e=>e.t>replayTime+.15):
    events.slice().reverse().find(e=>e.t<replayTime-.15);
  if(item){replayPlaying=false;seekReplay(item.t);}
};
ui.replayPrevEvent.addEventListener('click',()=>jumpReplayEvent(false));
ui.replayNextEvent.addEventListener('click',()=>jumpReplayEvent(true));
ui.replayFollow.addEventListener('click',()=>{
  if(replayFollow){
    const i=squadIds.indexOf(replayFollowId as typeof squadIds[number]);
    if(i===squadIds.length-1)replayFollow=false;
    else replayFollowId=squadIds[i+1];
  }else replayFollow=true;
  updateReplayHud();
});
ui.replayAnalysis.addEventListener('click',()=>{
  replayAnalysis=!replayAnalysis;updateReplayHud();
});
ui.replayExit.addEventListener('click',exitReplay);
function reset(next=state.variant,siteSeed?:number,
 missionOverride?:Session['missionType'],prebuiltSite?:Site,
 encounterRisk?:1|2|3){
  replaying=false;replayPlaying=false;finishedSession=null;
  operationsBoard.hidden=true;
  hideWeaponChooser();
  flashMode=false;document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  state=newSession(next,legacyStudy?undefined:
    siteSeed??randomSiteSeed(),selectedIntelMode,requestedSiteScale,missionOverride,
    prebuiltSite,{risk:encounterRisk});
  executionNoticeFeed.reset();
  state.lightingMode=selectedLightingMode;
  if(campaignMode==='quick')persistentRoster=freshQuickPlayRoster(persistentRoster);
  applyRequestedCondition(state);
  applyRosterIdentity(state,persistentRoster);
  applyCampaignSkills();
  flashDoorId=null;
  stage?.applySite(state.site??null);selected='rook';looking=false;
  selectedNode=null;doorFocusId=null;draggingNode=null;
  cursor=null;trace=null;zoom=1;panX=panY=0;
  fogStamp=-1;lastSoundShotId=0;lastEventAudio='';
  lastFootstepSoundTime=0;
  recorder=new MissionRecorder();recorder.capture(state,true);
  tacticalFeedback.clear();layout();updateHud();
}
const campaignBackButton=document.createElement('button');
campaignBackButton.type='button';campaignBackButton.id='campaignReturnButton';
campaignBackButton.textContent='OPERATIONS ROOM';
campaignBackButton.setAttribute('aria-label','Return to campaign operations room');
ui.siteSettings.append(campaignBackButton);
const campaignScreen=new CampaignScreen({
 newCampaign:async()=>{
  if(campaign&&!await confirmFieldworkAction({
   title:'Start a new campaign?',
   message:'This replaces the active local campaign. Export a save first if you want to preserve it.',
   confirmLabel:'START NEW CAMPAIGN',danger:true
  }))return;
  campaign=newCampaign(randomSiteSeed());
  saveCampaign();showCampaignHome();
 },
 continueCampaign:()=>showCampaignHome(),
 quickPlay:()=>{campaignMode='quick';campaignScreen.hide();reset();},
 chooseContract:(id)=>{
  if(!campaign)return;
  const next=acceptContract(campaign,id);
  if(next===campaign)return;
  campaign=next;saveCampaign();deployCampaignContract();
 },
 resumeContract:()=>deployCampaignContract(),
 buyAmmo:()=>{if(campaign){campaign=purchaseAmmo(campaign);saveCampaign();showCampaignHome();}},
 buyMedical:()=>{if(campaign){campaign=purchaseMedical(campaign);saveCampaign();showCampaignHome();}},
 buyFlash:()=>{if(campaign){campaign=purchaseFlash(campaign);saveCampaign();showCampaignHome();}},
 resupply:(id)=>{if(campaign){campaign=resupplyOperator(campaign,id);saveCampaign();showCampaignHome();}},
 resupplyMedical:(id)=>{if(campaign){
  campaign=resupplyMedicalOperator(campaign,id);saveCampaign();showCampaignHome();}},
 treat:(id)=>{if(campaign){campaign=treatOperator(campaign,id);saveCampaign();showCampaignHome();}},
 recruit:()=>{if(campaign){campaign=hireRecruit(campaign);saveCampaign();showCampaignHome();}},
 assignSlot:(slot,id)=>{if(campaign){campaign=assignOperatorToSlot(campaign,slot,id);
  saveCampaign();showCampaignHome();}},
 buyWeapon:(weapon)=>{if(campaign){campaign=buyWeapon(campaign,weapon);saveCampaign();showCampaignHome();}},
 equipWeapon:(id,weapon)=>{if(campaign){campaign=equipCampaignWeapon(campaign,id,weapon);
  saveCampaign();showCampaignHome();}},
 repairArmor:(id)=>{if(campaign){campaign=repairCampaignArmor(campaign,id);
  saveCampaign();showCampaignHome();}},
 serviceWeapon:(id)=>{if(campaign){campaign=serviceCampaignWeapon(campaign,id);
  saveCampaign();showCampaignHome();}},
 equipGear:(id,slot,itemId)=>{if(campaign){
  campaign=equipCampaignGear(campaign,id,slot,itemId);
  saveCampaign();showCampaignHome();}},
 equipAttachment:(id,slot,partId,acquire)=>{if(campaign){
  campaign=acquire?
   purchaseAndEquipWeaponAttachment(campaign,id,slot,partId):
   equipCampaignWeaponAttachment(campaign,id,slot,partId);
  saveCampaign();showCampaignHome();}},
 moveMagazine:(id,magazineId,location)=>{if(campaign){
  campaign=moveCampaignMagazine(campaign,id,magazineId,location);
  saveCampaign();showCampaignHome();}},
 saveKitPreset:(id,name)=>{if(campaign){campaign=saveCampaignKitPreset(campaign,id,name);
  saveCampaign();showCampaignHome();}},
 applyKitPreset:(id,presetId)=>{if(campaign){campaign=applyCampaignKitPreset(campaign,id,presetId);
  saveCampaign();showCampaignHome();}},
 deleteKitPreset:(presetId)=>{if(campaign){campaign=deleteCampaignKitPreset(campaign,presetId);
  saveCampaign();showCampaignHome();}},
 renameOperator:(id,callsign)=>{if(campaign){campaign=renameCampaignOperator(campaign,id,callsign);
  saveCampaign();showCampaignHome();}},
 cycleAppearance:(id)=>{if(campaign){campaign=cycleCampaignAppearance(campaign,id);
  saveCampaign();showCampaignHome();}},
 setWardrobe:(id,look)=>{if(campaign){
  campaign=setCampaignWardrobe(campaign,id,look);
  saveCampaign();showCampaignHome();}},
 openStudio:(id)=>openOperatorStudio(id,'campaign'),
 exportSave:()=>{
  if(!campaign)return;
  const blob=new Blob([exportCampaign(campaign)],{type:'application/json'});
  const href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='fieldwork-'+campaign.id+'.json';
  document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
 },
 retire:(id)=>{
  if(!campaign||!window.confirm('Retire this operator from active service? Their career record will remain.'))return;
  campaign=retireOperator(campaign,id);saveCampaign();showCampaignHome();
 },
 importSave:(raw)=>{
  const next=importCampaign(raw);
  if(!next){window.alert('The selected file is not a valid Fieldwork campaign save.');return;}
  if(campaign&&!window.confirm('Replace the saved campaign with this import?'))return;
  campaign=next;saveCampaign();showCampaignHome();
 }
});
function showCampaignHome(){
 if(!campaign)return;
 campaignMode='home';campaignScreen.home(campaign);
}
function deployCampaignContract(){
 if(!campaign?.activeContractId)return;
 const job=campaign.contracts.find(k=>k.id===campaign!.activeContractId);
 if(!job)return;
 campaignMode='mission';
 selectedIntelMode=job.intel==='unknown'?'true-blind':
  job.intel==='scouted'?'exterior-known':'floor-plan';
 requestedSiteScale=job.scale;
 ui.siteSize.textContent='MAP SIZE · '+requestedSiteScale.toUpperCase();
 reset(0,job.seed,job.kind,undefined,job.risk);
 campaignScreen.hide();
}
function returnAfterCampaignMission(){
 if(campaignMode==='mission'&&(state.phase==='won'||state.phase==='lost')){
  showCampaignHome();return true;
 }
 return false;
}
campaignBackButton.addEventListener('click',()=>{
 if(campaignMode==='mission'&&state.phase==='running')return;
 if(campaign)showCampaignHome();
 else{campaignMode='menu';campaignScreen.entry(false);}
});
ui.rook.addEventListener('click',()=>selectUnit('rook'));
ui.back.addEventListener('click',()=>{
  uiClickTone('select');
  // BACK must always escape an unfinished targeting gesture first.
  // It cannot accidentally remove an unrelated prior waypoint.
  if(looking||flashMode||firePlacement||evacMode){cancelTargeting();return;}
  if(selectedActiveWatch){
    selectedActiveWatch=false;updateHud();return;
  }
  // Build 076 accidentally removed this listener when slimming the HUD.
  if(backOne(state,selected)){
    selectedNode=null;doorFocusId=null;
  }
  updateHud();
});
ui.moss.addEventListener('click',()=>selectUnit('moss'));
ui.ash.addEventListener('click',()=>selectUnit('ash'));
ui.vale.addEventListener('click',()=>selectUnit('vale'));
ui.clear.addEventListener('click',async()=>{
 if(state.phase!=='planning'||replaying)return;
 const session=state,targetId=selected;
 const operator=team(session).find(a=>a.id===targetId);
 const count=operator?.plan.length??0;
 if(count===0)return;
 if(count>=3&&!await confirmFieldworkAction({
   title:'Clear '+(operator?.name??'operator')+' route?',
   message:count+' queued orders will be cleared. Undo can restore the route.',
   confirmLabel:'CLEAR ROUTE',danger:true
 }))return;
 if(session!==state||state.phase!=='planning')return;
 if(clearPlan(state,targetId)){
   selectedNode=null;
   showUiHelp('ROUTE CLEARED · UNDO TO RESTORE',3000);
   updateHud();
 }
});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;updateHud();});
ui.wait.addEventListener('click',()=>{planWait(state,selected,.5);updateHud();});
fieldLightButton=document.createElement('button');
fieldLightButton.type='button';fieldLightButton.textContent='WEAPON LIGHT';
fieldLightButton.setAttribute('aria-label','Toggle selected operator weapon light');
fieldLightButton.addEventListener('click',()=>{
 if(replaying)return;
 toggleWeaponLight(state,selected);updateHud();
});
ui.siteSettings.append(fieldLightButton);
const leaveRangeButton=document.createElement('button');
leaveRangeButton.type='button';leaveRangeButton.textContent='LEAVE TEST RANGE';
leaveRangeButton.dataset.equipmentRangeExit='';
leaveRangeButton.addEventListener('click',()=>{
 if(state.site?.training){lastRangeTrial=null;reset();updateHud();}
});
ui.siteSettings.append(leaveRangeButton);
const rangeRepeat=document.createElement('button');
rangeRepeat.type='button';rangeRepeat.textContent='RESTART RANGE TRIAL';
rangeRepeat.dataset.rangeRepeat='';
rangeRepeat.addEventListener('click',()=>{
 if(!state.site?.training)return;
 lastRangeTrial=captureRangeTrial(state,selected);
 reset(state.variant,undefined,undefined,equipmentTrainingSite());
 updateHud();
});
ui.siteSettings.append(rangeRepeat);
medicalButton=document.createElement('button');
medicalButton.type='button';
medicalButton.className=ui.loadout.className;
medicalButton.textContent='TREAT';
medicalButton.setAttribute('aria-label','Plan medical stabilization');
medicalButton.addEventListener('click',()=>{
 if(replaying||state.phase!=='planning')return;
 const patient=medicalCandidate(selected);
 if(patient)planMedicalTreatment(state,selected,patient.id);
 updateHud();
});
ui.loadout.insertAdjacentElement('afterend',medicalButton);
function casualtyActionButton(label:string,action:(target:TeamActor)=>void){
 const button=document.createElement('button');button.type='button';
 button.className=ui.loadout.className;button.textContent=label;
 button.hidden=true;
 button.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  const patient=casualtyCandidate(selected);
  if(patient)action(patient);
  updateHud();
 });
 medicalButton!.insertAdjacentElement('afterend',button);
 return button;
}
dragButton=casualtyActionButton('DRAG',target=>{
 evacMode={patientId:target.id,mode:'drag'};
 looking=false;flashMode=false;firePlacement=null;
 showUiHelp('TAP DESTINATION FOR CASUALTY DRAG',5500);
});
carryButton=casualtyActionButton('CARRY',target=>{
 evacMode={patientId:target.id,mode:'carry'};
 looking=false;flashMode=false;firePlacement=null;
 showUiHelp('TAP DESTINATION FOR CASUALTY CARRY',5500);
});
retrieveButton=casualtyActionButton('RECOVER',target=>{
 if(!planRecoverMedical(state,selected,target.id))
  showUiHelp('NO ACCESSIBLE MEDICAL SUPPLY OR ROUTE');
});
ui.loadout.setAttribute('aria-haspopup','true');
ui.loadout.setAttribute('aria-expanded','false');
ui.loadout.addEventListener('click',()=>{
 if(weaponChooser.hidden)showWeaponChooser();
 else hideWeaponChooser();
});
ui.reload.addEventListener('click',()=>{
  if(state.phase==='planning')planReload(state,selected);
  else if(state.phase==='running')reloadNow(state,selected);
  updateHud();
});
ui.cancelTarget.addEventListener('click',cancelTargeting);
ui.flash.addEventListener('click',()=>{
  if(state.phase!=='planning')return;
  flashMode=!flashMode;flashDoorId=null;
  looking=false;ui.orders.classList.add('compact');
  updateHud();
});
ui.sync.addEventListener('click',()=>{planSync(state);updateHud();});
ui.stance.addEventListener('click',()=>{
  posture(state,selected);fogStamp=-1;updateHud();
});
ui.contact.addEventListener('click',()=>{toggleContactRule(state,selected);updateHud();});
ui.siteLighting.textContent='LIGHTING · '+selectedLightingMode.toUpperCase();
ui.siteLighting.addEventListener('click',()=>{
  if(replaying||state.started||state.phase!=='planning'){
    showUiHelp('CHOOSE LIGHTING BEFORE DEPLOYMENT');return;
  }
  const current=LIGHTING_MODES.indexOf(selectedLightingMode);
  selectedLightingMode=LIGHTING_MODES[(current+1)%LIGHTING_MODES.length];
  state.lightingMode=selectedLightingMode;
  ui.siteLighting.textContent='LIGHTING · '+selectedLightingMode.toUpperCase();
  const url=new URL(location.href);
  if(selectedLightingMode==='day')url.searchParams.delete('lighting');
  else url.searchParams.set('lighting',selectedLightingMode);
  history.replaceState(null,'',url.href);
  updateHud();
});
ui.siteSize.textContent='MAP SIZE · '+requestedSiteScale.toUpperCase();
// Explicit, touch-friendly choices for next-site rules. This chooser only
// updates future generation settings and never mutates the active mission.
const siteChoicePopup=document.createElement('div');
siteChoicePopup.className='fw-site-choice';
let siteChoiceOwner:HTMLButtonElement|null=null;
function closeSiteChoice(){
 siteChoicePopup.remove();
 siteChoiceOwner?.setAttribute('aria-expanded','false');
 siteChoiceOwner=null;
}
function openSiteChoices(button:HTMLButtonElement,label:string,
 choices:readonly {value:string;label:string;description:string}[],
 selectedValue:string,choose:(value:string)=>void){
 if(siteChoiceOwner===button){closeSiteChoice();return;}
 closeSiteChoice();
 siteChoiceOwner=button;
 button.setAttribute('aria-expanded','true');
 siteChoicePopup.replaceChildren();
 const heading=document.createElement('strong');
 heading.textContent=label+' · NEXT SITE';
 siteChoicePopup.append(heading);
 for(const choice of choices){
  const option=document.createElement('button');
  option.type='button';option.className='fw-site-choice-option';
  option.setAttribute('aria-pressed',String(choice.value===selectedValue));
  const name=document.createElement('strong');name.textContent=choice.label;
  const detail=document.createElement('small');detail.textContent=choice.description;
  option.append(name,detail);
  option.addEventListener('click',()=>{choose(choice.value);closeSiteChoice();});
  siteChoicePopup.append(option);
 }
 button.insertAdjacentElement('afterend',siteChoicePopup);
}
ui.siteSize.addEventListener('click',()=>{
 if(replaying||campaignMode==='mission')return;
 openSiteChoices(ui.siteSize,'BUILDING SIZE',[
  {value:'small',label:'SMALL',description:'Shorter operation · compact site'},
  {value:'medium',label:'MEDIUM',description:'Balanced layout and encounter'},
  {value:'large',label:'LARGE',description:'Larger, more involved operation'}
 ],requestedSiteScale,selected=>{
  requestedSiteScale=selected as SiteScale;
  ui.siteSize.textContent='NEXT SITE SIZE · '+selected.toUpperCase();
  const url=new URL(location.href);
  url.searchParams.set('scale',selected);
  history.replaceState(null,'',url.href);
  showUiHelp('NEXT SITE SIZE SET · CURRENT SITE UNCHANGED',2300);
 });
});
ui.variant.addEventListener('click',async()=>{
  if(replaying||campaignMode==='mission')return;
  if((state.started||team(state).some(a=>a.plan.length>0))&&
    !await confirmFieldworkAction({
      title:'Generate a new site?',
      message:'Your current routes and progress will be replaced. Your Quick Play campaign data remains separate.',
      confirmLabel:'GENERATE NEW SITE',danger:true
    }))return;
  reset(state.variant+1);
});
ui.intelMode.addEventListener('click',()=>{
 if(replaying||campaignMode==='mission')return;
 openSiteChoices(ui.intelMode,'INTELLIGENCE',[
  {value:'true-blind',label:'TRUE BLIND',description:'Discover the environment during play'},
  {value:'exterior-known',label:'EXTERIOR KNOWN',description:'Exterior known · interior unexplored'},
  {value:'floor-plan',label:'FLOOR PLAN',description:'Building plan known · threats unknown'},
  {value:'full-view',label:'FULL VIEW',description:'Sandbox-style full site knowledge'}
 ],selectedIntelMode,selected=>{
  if(!INTEL_MODES.includes(selected as IntelMode))return;
  selectedIntelMode=selected as IntelMode;
  try{localStorage.setItem(INTEL_PREFERENCE_KEY,selectedIntelMode);}
  catch{/* Preferences are optional in restricted browsing contexts. */}
  showUiHelp('NEXT SITE INTEL SET · CURRENT KNOWLEDGE UNCHANGED',3000);
  updateHud();
 });
});
ui.retry.addEventListener('click',()=>{if(campaignMode!=='mission')reset();});
ui.next.addEventListener('click',()=>{if(!returnAfterCampaignMission())reset(state.variant+1);});
ui.play.addEventListener('click',()=>{
  unlockAudio();uiClickTone(state.phase==='running'?'pause':'go');
  if(state.phase==='won'||state.phase==='lost'){
   if(!returnAfterCampaignMission())reset();
  }else{looking=false;toggling(state);updateHud();}
});
ui.restart.addEventListener('click',async()=>{
  if(campaignMode==='mission'||replaying)return;
  if((state.started||team(state).some(a=>a.plan.length>0))&&
    !await confirmFieldworkAction({
      title:'Restart this mission?',
      message:'All current orders and discoveries will be discarded.',
      confirmLabel:'RESTART MISSION',danger:true
    }))return;
  reset();
});
window.addEventListener('keydown',e=>{
  // Global game shortcuts must never fire while the player edits a name,
  // operates a dialog, or navigates Campaign / the front menu.
  if(e.isComposing||e.altKey||campaignMode==='menu'||campaignMode==='home')return;
  const target=e.target;
  if(target instanceof HTMLElement&&
    (target.isContentEditable||target.closest(
      'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="alertdialog"]'
    )))return;
  if(document.querySelector('.fw-confirm-backdrop'))return;
  if(replaying){
    if(e.code==='Space'&&!e.repeat){e.preventDefault();replayPlaying=!replayPlaying;}
    if(e.code==='Escape')exitReplay();
    if(e.code==='ArrowLeft')seekReplay(replayTime-5);
    if(e.code==='ArrowRight')seekReplay(replayTime+5);
    return;
  }
  if(e.code==='Space'&&!e.repeat){
    e.preventDefault();unlockAudio();
    if(state.phase==='won'||state.phase==='lost'){
      if(!returnAfterCampaignMission())reset();
    }else toggling(state);updateHud();
  }
  if(e.code==='Digit1')selectUnit('rook');
  if(e.code==='Digit2')selectUnit('moss');
  if(e.code==='Digit3')selectUnit('ash');
  if(e.code==='Digit4')selectUnit('vale');
  if(e.code==='KeyX'&&!e.repeat){
    e.preventDefault();
    // Keyboard and touch must use the exact same guarded clear-plan workflow.
    ui.clear.click();
  }
  if(e.code==='KeyL')armFacing('look');
  if(e.code==='Backspace'&&!e.repeat){
    e.preventDefault();ui.back.click();
  }
  if(e.code==='Escape'){
    e.preventDefault();
    if(!weaponChooser.hidden)hideWeaponChooser();
    else if(!operationsBoard.hidden)operationsBoard.hidden=true;
    else if(!ui.briefingPanel.hidden){
      ui.briefingClose.click();
    }else if(!ui.siteSettings.hidden){
      ui.siteSettingsToggle.click();
    }else if(!ui.orders.classList.contains('compact')){
      ui.moreOrders.click();
    }else cancelTargeting();
    return;
  }
  if(e.code==='KeyW'&&!e.repeat)armFacing('watch');
  if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    if(e.shiftKey)redoPlan(state,selected);
    else undoPlan(state,selected);updateHud();
  }
  if(e.code==='KeyR'&&!e.repeat&&campaignMode!=='mission'){
    e.preventDefault();
    ui.restart.click();
  }
  if(e.code==='KeyV'&&!e.repeat)cameraMode(viewMode==='iso'?'top':'iso');
  if(e.code==='KeyQ'&&!e.repeat)turnCamera(-Math.PI/8);
  if(e.code==='KeyE'&&!e.repeat)turnCamera(Math.PI/8);
  if(e.code==='Digit0'&&!e.repeat)ui.cameraFit.click();
});
function pointerWorld(e:PointerEvent){return toWorld(e.clientX,e.clientY);}
const hitNode=(cursor:Pt,pointerKind:string):{id:number;index:number;owner:string;marker:'node'|'watch'|'flash'|'activeWatch'}|null=>{
  const radius=tacticalHitProfile(pointerKind).waypoint;
  const candidates:{id:number;index:number;owner:string;gap:number;marker:'node'|'watch'|'flash'|'activeWatch'}[]=[];
  for(const unit of team(state))if(unit.health>0){
    const problem=executionProblemStatus(unit);
    if(problem?.orderId!==null&&problem){
      const marker=executionMarkerPoint(unit,viewMode!=='plan2d');
      const gap=distance(marker,cursor);
      if(gap<Math.min(radius,19))
        candidates.push({id:problem.orderId!,index:0,owner:unit.id,
          gap:Math.max(0,gap-2),marker:'node'});
    }
    const activeTarget=activeWatchTarget(unit);
    if(activeTarget){
      const gap=distance(worldToScreen(activeTarget,12),cursor);
      if(gap<radius)candidates.push({id:-1,index:-1,
        owner:unit.id,gap,marker:'activeWatch'});
    }
    for(let i=unit.plan.length-1;i>=0;i--){
      const n=unit.plan[i];
      const targets:[Pt,'node'|'watch'|'flash'][]=[[n.p,'node']];
      if(n.aimPoint&&n.aimMode==='track')targets.push([n.aimPoint,'watch']);
      if(n.aimPoint&&n.kind==='flash')targets.push([n.aimPoint,'flash']);
      for(const [point,kind] of targets){
        const projected=worldToScreen(point,kind==='node'?8:12);
        const gap=distance(projected,cursor);
        if(gap<radius)candidates.push({id:n.id,index:i,owner:unit.id,gap,marker:kind});
      }
    }
  }
  // Keep the selected operator's node when it is essentially as close as
  // a competing marker. Avoid unpredictable swaps in crowded four-unit stacks.
  return preferSelectedHit(candidates.map(c=>({...c,distancePx:c.gap})),selected);
};
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerenter',e=>{
  if(e.pointerType!=='touch'){previewHover=true;cursor=pointerWorld(e);}
});
canvas.addEventListener('pointerleave',()=>{previewHover=false;});
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  cursor=pt;
  if(e.pointerType==='touch')previewHover=false;
  // Explicit camera interaction does NOT select units or place orders.
  // Touch defaults to direct orbit on empty ground after a drag threshold.
  // Desktop retains RMB orbit, MMB/Shift pan; plain clicks still plan.
  const cameraModeInput=e.button===1||e.shiftKey||
    (viewMode!=='plan2d'&&e.button===2);
  if(cameraModeInput){
    const orbit=viewMode!=='plan2d'&&e.button===2;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:false,nodeId:null,
      mode:orbit?'cameraOrbit':'cameraPan',moved:false});
  }else{
    const contextual=looking||flashMode||!!firePlacement||!!evacMode;
    // A selected route can pass near a teammate. Its line remains tappable
    // unless the finger is directly over the teammate's physical icon.
    // Previously the oversized soldier hitbox stole mid-route insert taps.
    const selectedActor=uid(selected);
    const overSelectedLine=!contextual&&state.phase==='planning'&&
      !!selectedActor&&!!routeLineHit(selectedActor.p,selectedActor.plan,
        {x:e.clientX,y:e.clientY},p=>worldToScreen(p,4),
        tacticalHitProfile(e.pointerType).route,
        (from,to)=>displayRouteCache.get(from,to,state.intel,true).points);
    const hit=contextual?undefined:team(state).find(a=>{
      if(a.health<=0)return false;
      const direct=overSelectedLine&&a.id!==selected;
      // All camera modes use the same CSS-pixel finger target; world-space
      // distances would make Floor Plan selection scale with zoom.
      const hitRadius=direct?(e.pointerType==='touch'?18:15):
        (e.pointerType==='touch'?31:25);
      return distance(worldToScreen(a.p,viewMode==='plan2d'?0:24),
        {x:e.clientX,y:e.clientY})<hitRadius;
    });
    // Tapping the operator always selects HERE, even if a waypoint
    // happens to overlap its icon.
    const touch={x:e.clientX,y:e.clientY};
    const candidate=state.phase==='planning'&&!contextual?
      hitNode(touch,e.pointerType):null;
    // Preserve actor-first selection, except when the finger is directly
    // on a WATCH ring even if its screen footprint overlaps the operator.
    const activeRingHit=candidate?.marker==='activeWatch'&&
      distance(worldToScreen(activeWatchTarget(uid(candidate.owner)!)!,12),
        touch)<=Math.min(22,tacticalHitProfile(e.pointerType).waypoint);
    // The small persistent problem marker takes precedence over the actor
    // body hit. Its target is that existing, editable authored order.
    const problemTap=!!candidate&&candidate.marker==='node'&&
      !!team(state).find(unit=>unit.id===candidate.owner&&
        executionProblemStatus(unit)?.orderId===candidate.id&&
        distance(executionMarkerPoint(unit,viewMode!=='plan2d'),
          touch)<=19);
    const node=candidate&&(!hit||activeRingHit||problemTap)?candidate:null;
    if(node){
      lastAuthoringAt=performance.now();
      if(node.owner!==selected)selectUnit(node.owner);
      selectedActiveWatch=node.marker==='activeWatch';
      selectedNode=selectedActiveWatch?null:node.id;
      doorFocusId=null;
      teach(selectedActiveWatch?'watch-active-selected':'waypoint-selected',
        selectedActiveWatch?
          'Active WATCH: drag this ring to retarget; DELETE WATCH releases it.':
          'Drag this waypoint to move it. LOOK checks briefly; WATCH persists.',4200);
    }else if(hit)selectUnit(hit.id);
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:!!hit&&!node,
      nodeId:node?.id??null,
      mode:node?.marker==='activeWatch'?'activeWatch':
        node?.marker==='watch'?'watchTarget':node?'node':'undecided',moved:false});
  }
  if(activePointers.size>=2){
    // Cancel any tentative route gesture when a second finger arrives.
    // The remaining finger is never retroactively treated as a map tap.
    for(const pointer of activePointers.values())pointer.mode='cameraMulti';
    const pts=[...activePointers.values()];
    pinchDistance=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    panMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    trace=null;draggingNode=null;draggingWatchTarget=false;
  }
});
canvas.addEventListener('pointermove',e=>{
  const p=activePointers.get(e.pointerId);
  cursor=pointerWorld(e);
  if(!p)return;
  e.preventDefault();
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>
     tacticalHitProfile(e.pointerType).dragStart)p.moved=true;
  if(activePointers.size===2){
    const pts=[...activePointers.values()];
    const gap=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    if(stage&&viewMode!=='plan2d'){
      if(panMid)stage.panBetween(panMid.x,panMid.y,mid.x,mid.y);
      if(pinchDistance>8)stage.zoomAt(gap/pinchDistance,mid.x,mid.y);
      // Two fingers have ONLY pan/pinch behavior: never rotate accidentally.
    }else{
      if(panMid){panX+=mid.x-panMid.x;panY+=mid.y-panMid.y;}
      if(pinchDistance>8)zoom=clamp(zoom*gap/pinchDistance,.65,4.8);
      layout();
    }
    pinchDistance=gap;panMid=mid;return;
  }
  if(p.mode==='cameraOrbit'&&stage&&viewMode!=='plan2d'){
    stage.orbit(dx,dy);
    for(const [mode,button] of [['iso',ui.viewIso],
      ['top',ui.viewTop],['plan2d',ui.view2d]] as const)
      button.setAttribute('aria-pressed',String(mode===stage.view.mode));
    return;
  }
  if(p.mode==='cameraPan'){
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
    return;
  }
  if(p.mode==='cameraMulti')return;
  // While a command is armed, one-finger dragging previews its target.
  // Two fingers still exclusively pan/pinch and never author an order.
  if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
     (looking||flashMode||!!firePlacement||!!evacMode)){
    p.mode='targetPreview';
    return;
  }
  if(p.mode==='targetPreview')return;
  // On touch a drag starting in empty space or the map ground orbits.
  // Tapping that same spot still creates a waypoint; dragging from a
  // selected operator or node keeps its deliberate tactical editing semantics.
  if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
     !(state.phase==='planning'&&p.wasUnit)){
    if(viewMode==='plan2d'||!stage){
      // Empty-ground drags pan Floor Plan rather than becoming dead input.
      // A drag starting on a unit remains owned by route authoring.
      p.mode='cameraPan';panX+=dx;panY+=dy;layout();
    }else{
      p.mode='cameraOrbit';stage.orbit(dx,dy);
    }
    return;
  }
  if(p.mode==='activeWatch'){
    if(p.moved){draggingNode=cursor;draggingWatchTarget=true;}
    return;
  }
  if(p.mode==='watchTarget'){
    if(p.moved&&p.nodeId!==null){
      draggingNode=cursor;draggingWatchTarget=true;
    }
    return;
  }
  if(p.mode==='node'&&p.moved&&p.nodeId!==null){
    draggingWatchTarget=false;draggingNode=cursor;return;
  }
  if(state.phase==='planning'&&p.wasUnit&&p.moved){
    p.mode='route';
    if(!trace)trace=[{...uid(selected)!.p}];
    if(shouldAppendStrokePoint(worldToScreen(trace.at(-1)!,8),
       {x:e.clientX,y:e.clientY}))trace.push({...cursor});
  }else if(p.moved&&e.pointerType==='mouse'&&(e.buttons&4)){
    panX+=dx;panY+=dy;layout();
  }
});
/** Insert precisely where the player tapped the existing routed line.
 * The original plan before and after the inserted node stays intact. */
function insertAtRouteLine(screen:Pt,pointerKind:string):boolean{
  const actor=uid(selected);
  if(!actor||state.phase!=='planning')return false;
  const hit=routeLineHit(actor.p,actor.plan,screen,
    point=>worldToScreen(point,4),tacticalHitProfile(pointerKind).route,
    (from,to)=>displayRouteCache.get(from,to,state.intel,true).points);
  if(!hit){canvas.dataset.lastRouteTap='miss:'+actor.plan.length+'/'+selected;return false;}
  canvas.dataset.lastRouteTap='route:'+hit.index;
  const id=state.nextId;
  if(!insertPlanNode(state,selected,hit.index,hit.point)){
    canvas.dataset.lastRouteTap='blocked:'+hit.index;
    rejectAt(hit.point,'CANNOT INSERT WAYPOINT HERE');
    return true; // This was a route tap, not a new destination order.
  }
  canvas.dataset.lastRouteTap='inserted:'+hit.index;
  lastAuthoringAt=performance.now();
  tacticalFeedback.emit('node',hit.point);
  teach('route-inserted','Waypoint inserted. Drag to reposition, or add LOOK / WATCH.',4100);
  selectedNode=id;doorFocusId=null;contextSignature='';
  return true;
}
function releasePointer(e:PointerEvent,cancelled=false){
  const p=activePointers.get(e.pointerId);if(!p)return;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  if(!cancelled&&state.phase==='planning'&&!replaying&&activePointers.size===1){
    if((looking||flashMode||firePlacement||evacMode)&&
       (p.mode==='targetPreview'||p.mode==='undecided')){
      // A brief iPhone tap often travels a few pixels without entering
      // targetPreview. Always commit an armed target on release, even then.
      // CameraMulti/cancelled pointers remain excluded.
      if(pt.x>=0&&pt.y>=0&&pt.x<=W&&pt.y<=H)useSelectedGround(pt);
      else showUiHelp('TAP INSIDE THE MAP TO PLACE THE TARGET',2700);
    }else if(p.mode==='activeWatch'){
      const accepted=!p.moved||retargetActiveWatch(state,selected,pt);
      if(!accepted)rejectAt(pt,'WATCH TARGET TOO CLOSE OR INVALID');
      selectedNode=null;selectedActiveWatch=true;doorFocusId=null;
      if(accepted)tacticalFeedback.emit(p.moved?'command':'select',pt,
        p.moved?'WATCH RETARGETED':undefined);
    }else if(p.mode==='watchTarget'&&p.nodeId!==null){
      const accepted=!p.moved||planWatch(state,selected,pt,p.nodeId);
      if(!accepted)rejectAt(pt,'WATCH TARGET UNAVAILABLE');
      selectedNode=p.nodeId;doorFocusId=null;
      if(accepted)tacticalFeedback.emit(p.moved?'command':'select',pt,
        p.moved?'WATCH UPDATED':undefined);
    }else if(p.mode==='node'&&p.nodeId!==null){
      if(p.moved){
        const moving=uid(selected)?.plan.find(node=>node.id===p.nodeId);
        const moved=moving?.kind==='flash'?
          moveFlashTarget(state,selected,p.nodeId,pt):
          movePlanNode(state,selected,p.nodeId,pt);
        if(!moved){
          const chosen=uid(selected)?.plan.find(n=>n.id===p.nodeId);
          const origin=uid(selected)?.p??pt;
          rejectAt(pt,orderFailureText(origin,pt,{
            // The failure message must use the SAME narrow-body clearance
            // rules as planning. Otherwise reachable squeeze positions are
            // incorrectly reported as having "insufficient clearance".
            canStand:at=>intelPassable(at,state.intel,SQUEEZE_RADIUS),
            routeTo:(a,b)=>routeWithSqueezeIntel(state.intel,a,b),
            remainingPlanValid:chosen?.kind==='move'?false:undefined
          }));
        }
      }
      selectedNode=p.nodeId;doorFocusId=null;
      const chosen=uid(selected)?.plan.find(n=>n.id===p.nodeId);
      if(chosen)tacticalFeedback.emit('node',chosen.p);
    }else if(p.mode==='route'&&trace&&
      distance(trace[0],pt)>16){
      // The finger trace is a high-frequency preview, NOT one order per
      // input sample. Preserve meaningful screen-space bends and reject
      // simplifications that would cut across KNOWN obstacles. Unseen
      // obstacles remain undisclosed to the plan author.
      const points=simplifyStrokePoints([...trace,pt],
        point=>worldToScreen(point,8),15,(from,to)=>{
          const span=distance(from,to);
          const steps=Math.max(1,Math.ceil(span/4));
          for(let i=1;i<steps;i++){
            const t=i/steps;
            if(!intelPassable({x:from.x+(to.x-from.x)*t,
               y:from.y+(to.y-from.y)*t},state.intel,SQUEEZE_RADIUS))
              return false;
          }
          return true;
        });
      // A stroke that starts on the operator's HERE marker REPLACES the
      // queued plan, even when it contains several waypoints. Appending
      // still happens via taps and gestures on the existing route end.
      // planMoveStroke records the entire replacement as one undoable edit.
      if(!planMoveStroke(state,selected,points.slice(1),false,true))
        rejectAt(pt,'NO WALKABLE STROKE · PREVIOUS ROUTE KEPT');
      else{
        selectedActiveWatch=false;
        selectedNode=uid(selected)?.plan.filter(n=>n.kind==='move')
          .at(-1)?.id??null;
        showUiHelp('ROUTE REPLACED FROM HERE · UNDO TO RESTORE',3200);
      }
      doorFocusId=null;
    }else if(!p.moved&&!p.wasUnit&&pt.x>=0&&pt.y>=0&&
      pt.x<=W&&pt.y<=H){
      const selectedActor=uid(selected);
      // Out-of-reach door geometry must NOT steal a ground tap intended
      // to author a waypoint beside the door. Once the planned endpoint
      // is within reach, the physical door becomes selectable.
      const tap={x:e.clientX,y:e.clientY};
      const door=state.doors.find(d=>{
        if(!doorKnown(state.intel,d.id)||!selectedActor||
          ![selectedActor.p,finalPoint(selectedActor)].some(p=>
            doorReachable(p,d)))return false;
        const fraction=liveVisibility(state,doorCenter(d))?
          (d.openFraction??(d.open?1:0)):
          (state.intel.doorMemory.get(d.id)??0);
        const leaf=doorLeafSegment({...d,openFraction:fraction});
        const midpoint={x:(leaf.a.x+leaf.b.x)/2,
          y:(leaf.a.y+leaf.b.y)/2};
        return [doorCenter(d),midpoint,leaf.b].some(p=>
          distance(worldToScreen(p,10),tap)<tacticalHitProfile(e.pointerType).reachableDoor||
          distance(worldToScreen(p,38),tap)<tacticalHitProfile(e.pointerType).reachableDoor);
      });
      if(door&&!looking&&!flashMode&&!firePlacement){
        doorFocusId=door.id;selectedNode=null;
        doorMenuDismissedId=null;
        tacticalFeedback.emit('select',doorCenter(door));
        teach('door-selected','Door selected. Choose OPEN, KICK or another available action.',4700);
      }else if(!looking&&!flashMode&&!firePlacement&&insertAtRouteLine({x:e.clientX,y:e.clientY},e.pointerType)){
        // Insert-and-select: contextual LOOK/WATCH/WAIT/DELETE are immediately
        // available on the newly authored waypoint.
      }else{
        doorFocusId=null;useSelectedGround(pt);
      }
    }
  }
  trace=null;draggingNode=null;draggingWatchTarget=false;
  activePointers.delete(e.pointerId);
  if(e.pointerType==='touch')previewHover=false;
  if(activePointers.size<2){panMid=null;pinchDistance=0;}
  updateHud();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('lostpointercapture',e=>releasePointer(e,true));
window.addEventListener('blur',()=>{activePointers.clear();trace=null;
  panMid=null;pinchDistance=0;draggingWatchTarget=false;});
window.addEventListener('resize',layout);
// The Settings trigger lives in the collapsible Tools drawer. Settings
// therefore owns an always-visible close action, and camera changes return
// immediately to the map without leaving a hidden trigger focused.
const closeSiteSettingsButton=el<HTMLButtonElement>('closeSiteSettings');
function closeMissionSettings(returnFocus=true){
  if(ui.siteSettings.hidden)return;
  collapseTacticalSheets(null);
  if(returnFocus)ui.moreOrders.focus();
  updateContext();
}
closeSiteSettingsButton.addEventListener('click',()=>closeMissionSettings());
function chooseCameraView(mode:ViewMode){
  cameraMode(mode);
  closeMissionSettings();
}
ui.viewIso.addEventListener('click',()=>chooseCameraView('iso'));
ui.viewTop.addEventListener('click',()=>chooseCameraView('top'));
ui.view2d.addEventListener('click',()=>chooseCameraView('plan2d'));
ui.cameraFit.addEventListener('click',()=>{
  if(stage&&viewMode!=='plan2d')stage.resetCamera();
  else{zoom=1;panX=0;panY=0;layout();}
  closeMissionSettings();
  updateContext();
});
ui.briefingToggle.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  collapseTacticalSheets('briefing');
  ui.briefingPanel.hidden=false;
  ui.briefingToggle.setAttribute('aria-expanded','true');
  updateContext();
});
ui.briefingClose.addEventListener('click',()=>{
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
  updateContext();
});
ui.uiSoundToggle.textContent=uiSoundEnabled?'UI SOUND ON':'UI SOUND OFF';
ui.uiSoundToggle.setAttribute('aria-pressed',String(uiSoundEnabled));
ui.uiSoundToggle.addEventListener('click',()=>{
  uiSoundEnabled=!uiSoundEnabled;
  ui.uiSoundToggle.textContent=uiSoundEnabled?'UI SOUND ON':'UI SOUND OFF';
  ui.uiSoundToggle.setAttribute('aria-pressed',String(uiSoundEnabled));
  try{localStorage.setItem('fieldwork3d.ui.sound',uiSoundEnabled?'on':'off');}
  catch{/* Optional setting persistence. */}
  if(uiSoundEnabled)uiClickTone('select');
});
ui.uiHelp.addEventListener('click',()=>{
  closeMissionSettings();
  showUiHelp('Tap a route line to insert a waypoint · LOOK = brief check · WATCH = keep watching as you move · Hold a command for help.',8500);
  updateHud();
});
ui.siteSettingsToggle.addEventListener('click',()=>{
  const opening=ui.siteSettings.hidden;
  collapseTacticalSheets(opening?'settings':null);
  ui.siteSettings.hidden=!opening;
  ui.siteSettingsToggle.setAttribute('aria-expanded',String(opening));
  if(opening)closeSiteSettingsButton.focus();
  else ui.moreOrders.focus();
  updateContext();
});
ui.moreOrders.addEventListener('click',()=>{
  const expanded=ui.orders.classList.contains('compact');
  collapseTacticalSheets(expanded?'tools':null);
  ui.orders.classList.toggle('compact',!expanded);
  ui.moreOrders.setAttribute('aria-pressed',String(expanded));
  ui.moreOrders.replaceChildren(tacticalIcon('moreOrders'));
  ui.moreOrders.setAttribute('aria-label',expanded?'Close tools':'More tactical tools');
  ui.moreOrders.title=expanded?'Close tactical tools':'More tactical tools';
  // Never render two command overlays on top of each other.
  updateContext();
});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
  fitZoom(z*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
},{passive:false});
// Opt-in developer overlay: add ?perf=1 to measure render and simulation
// without polling DOM/layout or allocating objects in the normal game loop.
const perfOverlay=new URLSearchParams(location.search).has('perf')?
  document.createElement('div'):null;
if(perfOverlay){
  perfOverlay.style.cssText='position:fixed;top:4px;right:4px;z-index:9999;'+
    'background:#102021e8;color:#d5ebd8;font:11px monospace;padding:6px;'+
    'pointer-events:none;white-space:pre;max-width:50vw';
  document.body.append(perfOverlay);
}
const frameMeter=perfOverlay?new FrameMeter():null;
function tick(now:number){
  const perfStart=perfOverlay?performance.now():0;
  const frameGap=Math.max(0,now-last);
  const dt=Math.min(.08,frameGap/1000);last=now;
  if((campaignMode==='menu'||campaignMode==='home')&&!replaying){
   accum=0;previousRenderActors=null;
   requestAnimationFrame(tick);return;
  }
  let simSteps=0;
  const simPhaseCosts=perfOverlay?new Map<string,number>():null;
  if(!replaying&&state.phase==='running'){
    const budget=fixedStepBudget(accum,dt);
    accum=budget.remaining;
    for(let i=0;i<budget.steps;i++){
      previousRenderActors=renderSnapshot(state.operators);
      stepSession(state,1/60,simPhaseCosts?
        (name,ms)=>simPhaseCosts.set(name,
          (simPhaseCosts.get(name)??0)+ms):undefined);
      simSteps++;
      recorder.capture(state,isMissionTerminal(state));
    }
  }else{accum=0;previousRenderActors=null;}
  if(replaying&&replayFollow&&stage&&viewMode!=='plan2d'){
    const a=team(state).find(x=>x.id===replayFollowId);
    if(a){
      stage.view.focus={...a.p};
      stage.updateCamera(dt);
    }
  }
  if(replaying&&replayPlaying){
    replayTime=Math.min(recorder.duration,replayTime+dt*replayRate);
    applyReplayFrameAt(replayTime);
    if(replayTime>=recorder.duration)replayPlaying=false;
  }
  // 079: shot IDs are monotonic, unlike the short-lived shot array length.
  // A new shot can arrive on exactly the tick an old shot expires.
  const fresh=state.shots.filter(shot=>shot.id>lastSoundShotId);
  if(audio&&!replaying)for(const shot of fresh.slice(-3)){
    const firingActor=state.operators.find(a=>a.id===shot.shooterId);
    const weapon=firingActor?.weapon??'carbine';
    const listener=uid(selected)?.p;
    const level=listener?heardIntensity(shot.start,listener,
      WEAPONS[weapon].noise,state.doors,WALLS):1;
    if(level<.01)continue; // Outside acoustic range is genuinely quiet.
    const pan=listener?(shot.start.x-listener.x)/210:0;
    const cue=weaponAudioCue(weapon,
      firingActor?.weaponConfiguration?.slots.muzzle==='muzzle-suppressor');
    playTone(cue.crackHz,cue.crackSeconds,true,level,pan);
    playTone(cue.bodyHz,cue.bodySeconds,false,level*cue.bodyLevel,pan);
    // Never play the exact-hit cue merely because a hidden shot hit.
    // An operator must see the impact or be close enough to hear it.
    const impactLevel=listener?heardIntensity(shot.end,listener,
      88,state.doors,WALLS):0;
    if(shot.hit&&audibleImpact(shotVisibility(state,shot).impact,
        impactLevel))
      playTone(shot.down?75:225,shot.down?.25:.10,
        shot.down,level*Math.max(.22,impactLevel),pan);
  }
  if(fresh.length)lastSoundShotId=fresh.at(-1)!.id;
  // One restrained boot thud per recorded physical touchdown; never an
  // independent timed walking loop, and never an audio burst on resume.
  if(!replaying&&state.phase==='running'){
    const from=Math.max(lastFootstepSoundTime,state.seconds-.16);
    if(audio?.state==='running'){
      const ids=team(state).map(a=>a.id);
      for(const touch of recorder.motion.touchdownsBetween(
        from,state.seconds,ids).slice(-5)){
        const listener=uid(selected)?.p;
        const level=listener?heardIntensity(touch.position,listener,
          36,state.doors,WALLS):.24;
        if(level<.025)continue;
        const pan=listener?(touch.position.x-listener.x)/210:0;
        playTone(touch.foot===0?62:67,.055,true,level*.12,pan);
      }
    }
  }
  lastFootstepSoundTime=state.seconds;
  const event=state.events.at(-1)??'';
  if(event!==lastEventAudio&&(event.includes('OPENED')||event.includes('CLOSING')))
    playTone(160,.16);
  if(event!==lastEventAudio&&event.includes('KICK RESISTED'))
    playTone(115,.15,true);
  if(event!==lastEventAudio&&event.includes('FORCED OPEN'))
    playTone(80,.24,true);
  if(event!==lastEventAudio&&event.includes('KICKED'))
    playTone(90,.25,true);
  if(event!==lastEventAudio&&event.includes('FLASH DETONATED'))
    playTone(1350,.65,true);
  if(event!==lastEventAudio&&event.includes('RELOADED'))
    playTone(280,.09);
  if(event!==lastEventAudio&&event.includes('FLASH OUT'))
    playTone(420,.07);
  if(event!==lastEventAudio&&event.includes('SURRENDERED'))
    playTone(210,.22);
  lastEventAudio=event;
  if(now-hudAt>120){updateHud();if(replaying)updateReplayHud();hudAt=now;}
  const perfRenderStart=perfOverlay?performance.now():0;
  if(stage&&viewMode!=='plan2d')
    stage.update(state,selected,dt,doorFocusId,
      replaying&&replayOmniscient,replaying?replayPresentation:null,
      !replaying&&state.phase==='running'&&previousRenderActors?
        {previous:previousRenderActors,alpha:Math.min(1,accum*60)}:null,
      // Pausing the encounter must NOT switch to render-local footsteps.
      !replaying?recorder.motion.presentation(Math.max(0,
        state.phase==='running'?
          state.seconds-(1-Math.min(1,accum*60))/60:
          state.seconds),state.operators.map(a=>a.id)):null);
  const overlayBegin=perfOverlay?performance.now():0;
  render();
  // One local, intelligible pulse per distinct blocked episode.
  for(const actor of team(state)){
    const old=blockedEpisode.get(actor.id);
    if(actor.blockedTime<.3||actor.lastBlocker==='clear'){
      blockedEpisode.delete(actor.id);continue;
    }
    if(actor.blockedTime>=.95&&(old!==actor.lastBlocker)){
      blockedEpisode.set(actor.id,actor.lastBlocker);
      if(!replaying)tacticalFeedback.emit('error',actor.p,
        actor.lastBlocker==='furniture'?'OBSTRUCTED':actor.lastBlocker);
    }
  }
  if(feedbackDraw){
    feedbackDraw.setTransform(dpr,0,0,dpr,0,0);
    feedbackDraw.clearRect(0,0,cssW,cssH);
    const actor=uid(selected);
    const authoringPointer=activePointers.size===1?
      [...activePointers.values()][0]:null;
    const canPreview=state.phase==='planning'&&!replaying&&
      !!cursor&&(previewHover||!!authoringPointer)&&
      (!authoringPointer||!['cameraMulti','cameraOrbit','cameraPan'].includes(
        authoringPointer.mode))&&cursor.x>=0&&cursor.y>=0&&
      cursor.x<=W&&cursor.y<=H;
    const orderMode=looking?lookMode:flashMode?'flash':
      firePlacement??evacMode?.mode;
    const origin=looking?
      (selectedPlanNode()?.p??(armedOrigin==='here'?actor?.p:
        actor?finalPoint(actor):undefined)):
      actor?finalPoint(actor):undefined;
    const preview:TacticalOrderPreview|undefined=canPreview&&actor&&origin&&
      orderMode?{origin,direction:cursor!,mode:orderMode}:undefined;
    tacticalFeedback.draw(feedbackDraw,p=>worldToScreen(p,7),
      performance.now(),preview,reducedMotionMedia.matches);
  }
  updateContext();advanceContextPalette(dt);
  if(frameMeter&&perfOverlay){
    const end=performance.now(),stats=stage?.performanceStats();
    frameMeter.add({frame:end-perfStart,cadence:frameGap,sim:perfRenderStart-perfStart,
      scene:overlayBegin-perfRenderStart,overlay:end-overlayBegin,
      steps:simSteps,draws:stats?.calls??0,triangles:stats?.triangles??0});
    const m=frameMeter.summary();
    if(Math.floor(now/750)!==Math.floor((now-dt*1000)/750))
      perfOverlay.textContent='JS '+m.p50.toFixed(1)+'ms · P95 '+
        m.p95.toFixed(1)+' · MAX '+m.worst.toFixed(1)+
        '\\nRAF GAP P50 '+m.rafP50.toFixed(1)+'ms · P95 '+
        m.rafP95.toFixed(1)+'ms'+
        '\\nSIM '+m.simulation.toFixed(1)+'ms / '+m.steps.toFixed(1)+
        ' ticks · SCENE '+m.scene.toFixed(1)+'ms'+
        '\\nOVERLAY '+m.overlay.toFixed(1)+'ms · DRAWS '+
        m.draws.toFixed(0)+' · TRI '+m.triangles.toFixed(0)+
        (simPhaseCosts&&simPhaseCosts.size?'\\nHOT SIM '+
          [...simPhaseCosts].sort((a,b)=>b[1]-a[1]).slice(0,2)
            .map(([name,ms])=>name+' '+ms.toFixed(1)+'ms').join(' / '):'');
  }
  if(awarenessPanel&&Math.floor(now/500)!==
      Math.floor((now-dt*1000)/500)){
    const inspected=state.operators.find(a=>a.id===awarenessParam)??uid(selected);
    awarenessPanel.textContent=inspected?awarenessDebugLine(inspected):
      'No selected actor';
  }
  requestAnimationFrame(tick);
}
layout();cameraMode(viewMode);updateHud();
if(campaignMode==='menu')campaignScreen.entry(!!campaign);
requestAnimationFrame(tick);
