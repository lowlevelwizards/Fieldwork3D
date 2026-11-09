import {createBreachCanvasGestureController,type TacticalPointer}
 from './breach-canvas-gesture-controller.ts';
import {installTouchCommandHelp as bindTouchCommandHelp}
 from './ui/touch-command-help.ts';
import {
  W,H,activeWorldBounds,doorCenter,doorLeafSegment,
  type Pt,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  team,enemies,isSeen,missionText,debrief,
  operationBriefing,
  planMove,planMoveStroke,planNearbyInteraction,
  planCivilianInteraction,planAim,planWatch,
  retargetActiveWatch,removeActiveWatch,setFirePolicy,planWait,planWaitAt,setWaitDuration,
  plannedControl,setNodeControl,setStartPace,planReloadAt,planDoorFlash,
  planSync,movePlanNode,
  finalPoint,doorAtNode,backOne,
  deletePlanNode,insertPlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,liveVisibility,
  planReload,reloadNow,planFlash,moveFlashTarget,
  equipWeaponChoice,toggleWeaponLight,planMedicalTreatment,planEntryTool,
  planCasualtyTransport,planRecoverMedical,planCivilianRelease,
} from './breach-game.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
import {createBreach2DWorldRenderer} from './breach-2d-world-renderer.ts';
import {createBreach2DActorRenderer} from './breach-2d-actor-renderer.ts';
import {createBreach2DVisibilityRenderer} from './breach-2d-visibility-renderer.ts';
import {createBreach2DReplayOverlays} from './breach-2d-replay-overlays.ts';
import {createBreach2DRouteOverlays} from './breach-2d-route-overlays.ts';
import {createBreach2DProjectedOverlays} from './breach-2d-projected-overlays.ts';
import {initialMiniatureFocusMode,MINIATURE_FOCUS_STORAGE_KEY,
 type MiniatureFocusMode} from './rendering/miniature-focus-config.ts';
import type {TacticalOrderPreview} from './ui/tactical-feedback.ts';
import {PhysicalActionRings} from './ui/physical-action-rings.ts';
import {executionStatus} from './breach-execution-state.ts';
import {currentSiteIdentity} from './ui/current-site-identity.ts';
import {tacticalHitProfile,shouldAppendStrokePoint,simplifyStrokePoints}
 from './ui/touch-hit-targets.ts';
import {resolveTacticalPick,screenSegmentDistance,
  type TacticalPick} from './ui/tactical-target-resolver.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {aimTargetFromTap,insideTacticalBounds} from './ui/aim-target.ts';
import {interruptsWatch,angleDifference} from './breach-plan.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {equipmentTrainingSite} from './equipment-training-range.ts';
import {activeRangeDiagnostic,rangeDiagnosticLabel,captureRangeTrial,
 rangeTrialLabel,type RangeTrial} from './equipment-training-diagnostics.ts';
import type {Site} from './breach-site.ts';
import {BreachMissionController,type MissionTransition} from './breach-mission-controller.ts';
import type {MissionStartSnapshot} from './breach-mission-restart.ts';
import type {FavoriteMission} from './breach-mission-favorites.ts';
import {compileMissionFacts} from './briefing/mission-facts.ts';
import {createOperationDossier} from './briefing/briefing-composer.ts';
import {createBriefingCardModel,type BriefingReport,type BriefingTab}
 from './briefing/briefing-view-model.ts';
import {sessionIntelligenceReview} from './briefing/briefing-after-action.ts';
import {attachCampaignDossierContext} from './briefing/campaign-context.ts';
import type {QuickPlayGenerationRequest,QuickPlayGenerationResponse}
 from './quick-play-generation.ts';
import {equippedEntryMethods,issuedWedges} from './equipment-entry-tools.ts';
import {entryToolVerdict,type EntryTool} from './breach-entry-tools.ts';
import {WeaponWorkbenchPreview,type WeaponWorkbenchViewState} from './equipment-weapon-workbench.ts';
import type {WorkbenchSocket} from './equipment-weapon-workbench-layout.ts';
import {carryCapacityReport} from './equipment-carry-placement.ts';
import {mostUrgentWound} from './breach-medical-wounds.ts';
import {treatmentSupplyForWound} from './breach-medical-treatment.ts';
import {lightControlState} from './equipment-weapon-light-ui.ts';
import type {SiteScale} from './breach-site.ts';
import type {LightingMode} from './equipment-site-lighting.ts';
import {renderSnapshot,type RenderActor}
  from './breach-frame-interpolation.ts';
import {routeLineHit} from './breach-route-edit.ts';
import {createBreachAudioController} from './breach-audio-controller.ts';
import {parseOperationHistory,addOperationRecord,
  type OperationRecord} from './breach-operations.ts';
import {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import {createBreachReplayTimelineController}
  from './ui/breach-replay-timeline-controller.ts';
import {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import {ReplayCameraController} from './breach-replay-camera-controller.ts';
import {createBreachReplayLibraryController}
  from './ui/breach-replay-library-controller.ts';
import {formatReplayTime} from './breach-replay-transport.ts';
import {REPLAY_SPEED_STOPS,speedIndex} from './breach-replay-speed.ts';
import {resolvedReplayCamera,type ReplayCameraChoice,type ReplayPerspective}
  from './breach-replay-ui-state.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import {shotScreenHit} from './breach-replay-shot-inspector.ts';
import {ReplayQuickVideo} from './breach-replay-video.ts';
import {ReplayMovementHistory} from './breach-replay-movement-history.ts';
import {measureReplaySquadDoorEntry} from './breach-replay-squad-entry.ts';
import {operatorContactAvailable} from './breach-replay-contact-lens.ts';
import {bodycamEligibleObserverIds,bodycamHasPersonalGround,
  bodycamDisclosureLabel}
  from './breach-replay-bodycam-controls.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import {WEAPONS} from './breach-combat.ts';
import {fitMagazineInventory}
 from './arsenal/live-magazine-capacity.ts';

import {stageMagazines,magazineSpace,type MagazineLocation} from './equipment-magazine-placement.ts';
import {doorReachable} from './breach-door.ts';
import {canRelocateCover,coverPushDistance} from './breach-movable-cover.ts';
import {INTEL_MODES,doorKnown,
  intelPassable,type IntelMode} from './breach-intel.ts';
import {orderFailureText} from './breach-nav-diagnostics.ts';
import {routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {DisplayRouteCache} from './breach-route-cache.ts';
import {ProjectedRouteCache} from './breach-plan-projection-cache.ts';
import {FrameMeter} from './breach-perf.ts';
import {drainSightDiagnostics,setSightDiagnosticsEnabled}
 from './breach-sight-cost-counters.ts';
import {formatAfterAction} from './breach-after-action.ts';
import {formatMissionPacing} from './breach-mission-pacing.ts';
import {formatCombatReview} from './breach-combat-review.ts';
import {readRoster,applyRosterIdentity,freshQuickPlayRoster,
  serializeQuickPlayCosmetics,
  resupplyRoster,equipRoster,equipRosterGear,moveRosterMagazine,
 configureRosterWeapon,configureRosterWeaponPreset,configureRosterWeaponBodyPart,
 renameRosterMember} from './breach-roster.ts';
import {validateStudioAppearanceEdits,applyStudioRosterEdits,
 applyStudioCampaignEdits} from './operator-studio-batch-save.ts';
import {LOADOUT_SLOTS,itemsForSlot} from './equipment-catalog.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 weaponAttachmentAllowed} from './equipment-weapon-assemblies.ts';
import {FAMILY_PART_SLOTS,FAMILY_PARTS,matchingFamilyPreset,compatibleFamilyPart,familyPreset,proposeFamilyPartChange,type FamilyPartSlot} from './equipment-weapon-families.ts';
import {createWeaponPresetBrowser} from './ui/weapon-preset-browser.ts';
import {newCampaign,readCampaign,acceptContract,resolveOperation,
 purchaseAmmo,purchaseMedical,resupplyOperator,resupplyMedicalOperator,treatOperator,
 hireRecruit,assignOperatorToSlot,tacticalSlotOperator,buyWeapon,equipCampaignWeapon,
 retireOperator,equipCampaignGear,moveCampaignMagazine,
 equipCampaignWeaponAttachment,purchaseAndEquipWeaponAttachment,
 equipCampaignWeaponPreset,equipCampaignWeaponFamilyPart,
 saveCampaignKitPreset,applyCampaignKitPreset,
 deleteCampaignKitPreset,renameCampaignOperator,cycleCampaignAppearance,
 setCampaignWardrobe,
 repairCampaignArmor,serviceCampaignWeapon,purchaseFlash,
 type CampaignState,type CampaignReport} from './campaign-state.ts';
import {loadMovementScale,equippedFlashCharges} from './equipment-loadouts.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {allocateFlashSupply} from './equipment-supply.ts';
import {CampaignScreen} from './campaign-ui.ts';
import {exportCampaign,importCampaign} from './campaign-persistence.ts';
import {careerEventsForOperation} from './campaign-history.ts';
import {awarenessDebugLine} from './breach-awareness-debug.ts';
import {fixedStepBudget} from './breach-fixed-clock.ts';
import './breach-style.css';
import './ui/ux-r1-sheets.css';
import './ui/ux-r3-hud.css';
import './ui/fieldwork-action-toast.css';
import {showFieldworkActionFeedback} from './ui/fieldwork-action-toast.ts';
import {confirmFieldworkAction,promptFieldworkText} from './ui/fieldwork-controls.ts';
import {createTacticalSheetNavigation} from './ui/tactical-sheet-navigation.ts';
import {buildQuickLoadoutGroups,loadoutGroupForSlot,
 type QuickLoadoutGroup} from './ui/quick-loadout-groups.ts';
import {compactSiteTitle} from './ui/site-title.ts';
import {tacticalIcon,decorateIconButton,tacticalIconForState} from './ui/tactical-icons.ts';
import {createTacticalHudController} from './ui/tactical-hud-controller.ts';
import {createTacticalPaletteController} from './ui/tactical-palette-controller.ts';

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
const hudController=createTacticalHudController();
const tacticalFeedback=hudController.feedback;
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
  briefingSituationBlock:el<HTMLElement>('briefingSituationBlock'),
  briefingSituation:el<HTMLElement>('briefingSituation'),
  briefingCondition:el<HTMLElement>('briefingCondition'),
  briefingExtraction:el<HTMLElement>('briefingExtraction'),
  briefingSite:el<HTMLElement>('briefingSite'),
  briefingIntel:el<HTMLElement>('briefingIntel'),
  briefingRoster:el<HTMLElement>('briefingRoster'),
  briefingClose:el<HTMLButtonElement>('briefingClose'),
  briefingPrimary:el<HTMLElement>('briefingPrimary'),
  briefingType:el<HTMLElement>('briefingType'),
  briefingLocation:el<HTMLElement>('briefingLocation'),
  briefingThreat:el<HTMLElement>('briefingThreat'),
  briefingLayout:el<HTMLElement>('briefingLayout'),
  briefingSteps:el<HTMLElement>('briefingSteps'),
  briefingOverview:el<HTMLElement>('briefingOverview'),
  briefingIntelView:el<HTMLElement>('briefingIntelView'),
  briefingIntelToggle:el<HTMLButtonElement>('briefingIntelToggle'),
  briefingEntryControls:el<HTMLElement>('briefingEntryControls'),
  briefingEntryLabel:el<HTMLElement>('briefingEntryLabel'),
  briefingCaseContext:el<HTMLElement>('briefingCaseContext'),
  briefingCampaignContext:el<HTMLElement>('briefingCampaignContext'),
  briefingSiteReports:el<HTMLElement>('briefingSiteReports'),
  briefingCaseReports:el<HTMLElement>('briefingCaseReports'),
  context:el<HTMLElement>('contextTools'),
  quickStates:el<HTMLElement>('quickStates'),
  quickScope:el<HTMLElement>('quickScope'),
  tacticalHud:el<HTMLElement>('tacticalHud'),
  cancelTarget:el<HTMLButtonElement>('cancelTarget'),
  siteSettingsToggle:el<HTMLButtonElement>('siteSettingsToggle'),
  siteSize:el<HTMLButtonElement>('siteSize'),
  siteLighting:el<HTMLButtonElement>('siteLighting'),
  siteSettings:el<HTMLElement>('siteSettings'),
  replayMore:el<HTMLButtonElement>('replayMore'),
  replayShareToggle:el<HTMLButtonElement>('replayShareToggle'),
  replayQuickView:el<HTMLSelectElement>('replayQuickView'),
  replayQuickCamera:el<HTMLSelectElement>('replayQuickCamera'),
  replayQuickSpeed:el<HTMLSelectElement>('replayQuickSpeed'),
  replayDirectSight:el<HTMLSelectElement>('replayDirectSight'),
  replayDirectTracers:el<HTMLButtonElement>('replayDirectTracers'),
  replayDirectXray:el<HTMLButtonElement>('replayDirectXray'),
  replayDirectDirector:el<HTMLButtonElement>('replayDirectDirector'),
  replayDirectLens:el<HTMLButtonElement>('replayDirectLens'),
  replayDirectBodycam:el<HTMLButtonElement>('replayDirectBodycam'),
  replayDirectMount:el<HTMLButtonElement>('replayDirectMount'),
  replayDirectFree:el<HTMLButtonElement>('replayDirectFree'),
  replayPresets:el<HTMLElement>('replayPresets'),
  replayActorControls:el<HTMLElement>('replayActorControls'),
  replayInspectActor:el<HTMLSelectElement>('replayInspectActor'),
  replayInspectActorButtons:el<HTMLElement>('replayInspectActorButtons'),
  replayInspectFollow:el<HTMLButtonElement>('replayInspectFollow'),
  replayInspectMovement:el<HTMLButtonElement>('replayInspectMovement'),
  replayIncidentInvestigate:el<HTMLButtonElement>('replayIncidentInvestigate'),
  replayPresetStatus:el<HTMLOutputElement>('replayPresetStatus'),
  replayDrawerTitle:el<HTMLElement>('replayDrawerTitle'),
  replayHighlights:el<HTMLElement>('replayHighlights'),
  replayAllEvents:el<HTMLElement>('replayAllEvents'),
  replayExtra:el<HTMLElement>('replayExtra'),
  replayDrawer:el<HTMLElement>('replayDrawer'),
  replayDrawerClose:el<HTMLButtonElement>('replayDrawerClose'),
  replayFeedPanel:el<HTMLElement>('replayFeedPanel'),
  replayPrevChapter:el<HTMLButtonElement>('replayPrevChapter'),
  replayNextChapter:el<HTMLButtonElement>('replayNextChapter'),
  replayBookmark:el<HTMLButtonElement>('replayBookmark'),
  replayChapterList:el<HTMLElement>('replayChapterList'),
  replayDebriefInfo:el<HTMLOutputElement>('replayDebriefInfo'),
  replayDebriefMoments:el<HTMLElement>('replayDebriefMoments'),
  replaySquadEntryPanel:el<HTMLElement>('replaySquadEntryPanel'),
  replaySquadEntryList:el<HTMLElement>('replaySquadEntryList'),
  replayIncidentDetails:el<HTMLElement>('replayIncidentDetails'),
  replayIncidentTitle:el<HTMLElement>('replayIncidentTitle'),
  replayIncidentSummary:el<HTMLOutputElement>('replayIncidentSummary'),
  replayIncidentWatch:el<HTMLButtonElement>('replayIncidentWatch'),
  replayIncidentLoop:el<HTMLButtonElement>('replayIncidentLoop'),
  replayIncidentClose:el<HTMLButtonElement>('replayIncidentClose'),
  replayShotInspector:el<HTMLElement>('replayShotInspector'),
  replayShotTitle:el<HTMLElement>('replayShotTitle'),
  replayShotDetails:el<HTMLOutputElement>('replayShotDetails'),
  replayShotClose:el<HTMLButtonElement>('replayShotClose'),
  replayShotPrev:el<HTMLButtonElement>('replayShotPrev'),
  replayShotNext:el<HTMLButtonElement>('replayShotNext'),
  replayShotFocus:el<HTMLButtonElement>('replayShotFocus'),
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
  debriefIntelBlock:el<HTMLElement>('debriefIntelBlock'),
  debriefIntelText:el<HTMLElement>('debriefIntelText'),
  debriefGrade:el<HTMLElement>('debriefGrade'),
  debriefSurvivors:el<HTMLElement>('debriefSurvivors'),
  debriefAccuracy:el<HTMLElement>('debriefAccuracy'),
  debriefObjective:el<HTMLElement>('debriefObjective'),
  debriefStats:el<HTMLElement>('debriefStats'),
  retry:el<HTMLButtonElement>('retry'),next:el<HTMLButtonElement>('next'),
  watchReplay:el<HTMLButtonElement>('watchReplay'),
  saveReplayDebrief:el<HTMLButtonElement>('saveReplayDebrief'),
  replaySaveArchive:el<HTMLButtonElement>('replaySaveArchive'),
  openReplayLibrary:el<HTMLButtonElement>('openReplayLibrary'),
  replayLibraryDialog:el<HTMLElement>('replayLibraryDialog'),
  replayLibraryBackdrop:el<HTMLElement>('replayLibraryBackdrop'),
  replayLibraryList:el<HTMLElement>('replayLibraryList'),
  replayLibraryStatus:el<HTMLOutputElement>('replayLibraryStatus'),
  closeReplayLibrary:el<HTMLButtonElement>('closeReplayLibrary'),
  replayImportButton:el<HTMLButtonElement>('replayImportButton'),
  replayImportInput:el<HTMLInputElement>('replayImportInput'),
  favoriteMission:el<HTMLButtonElement>('favoriteMission'),
  favoriteMissionsList:el<HTMLElement>('favoriteMissionsList'),
  replayPanel:el<HTMLElement>('replayPanel'),
  replayRail:el<HTMLElement>('replayRail'),
  replayTopHud:el<HTMLElement>('replayTopHud'),
  replayFollowStatus:el<HTMLOutputElement>('replayFollowStatus'),
  replayDockToggle:el<HTMLButtonElement>('replayDockToggle'),
  replayMiniPlay:el<HTMLButtonElement>('replayMiniPlay'),
  replayViewTrigger:el<HTMLButtonElement>('replayViewTrigger'),
  replayViewChoices:el<HTMLElement>('replayViewChoices'),
  replaySightTrigger:el<HTMLButtonElement>('replaySightTrigger'),
  replaySightChoices:el<HTMLElement>('replaySightChoices'),
  replaySpeedTrigger:el<HTMLButtonElement>('replaySpeedTrigger'),
  replaySpeedRange:el<HTMLInputElement>('replaySpeedRange'),
  replaySpeedValue:el<HTMLOutputElement>('replaySpeedValue'),
  replayRailToggle:el<HTMLButtonElement>('replayRailToggle'),
  replayOverlayTrigger:el<HTMLButtonElement>('replayOverlayTrigger'),
  replayOverlayChoices:el<HTMLElement>('replayOverlayChoices'),
  replaySpeedChoices:el<HTMLElement>('replaySpeedChoices'),
  replayPlay:el<HTMLButtonElement>('replayPlay'),
  replayBack:el<HTMLButtonElement>('replayBack'),
  replayForward:el<HTMLButtonElement>('replayForward'),
  replaySpeed:el<HTMLButtonElement>('replaySpeed'),
  replaySound:el<HTMLButtonElement>('replaySound'),
  replayPrevFrame:el<HTMLButtonElement>('replayPrevFrame'),
  replayNextFrame:el<HTMLButtonElement>('replayNextFrame'),
  replayPrevSample:el<HTMLButtonElement>('replayPrevSample'),
  replayNextSample:el<HTMLButtonElement>('replayNextSample'),
  replayLoopIn:el<HTMLButtonElement>('replayLoopIn'),
  replayLoopOut:el<HTMLButtonElement>('replayLoopOut'),
  replayLoopToggle:el<HTMLButtonElement>('replayLoopToggle'),
  replaySeek:el<HTMLInputElement>('replaySeek'),
  replayMarks:el<HTMLElement>('replayMarks'),
  replayClusterMenu:el<HTMLElement>('replayClusterMenu'),
  replaySight:el<HTMLButtonElement>('replaySight'),
  replayContactLens:el<HTMLButtonElement>('replayContactLens'),
  replayGroundLens:el<HTMLButtonElement>('replayGroundLens'),
  replayBodycam:el<HTMLButtonElement>('replayBodycam'),
  replayBodycamMount:el<HTMLButtonElement>('replayBodycamMount'),
  replayBodycamStatus:el<HTMLElement>('replayBodycamStatus'),
  replayContactNote:el<HTMLElement>('replayContactNote'),
  replayObserverTransitions:el<HTMLElement>('replayObserverTransitions'),
  replayView:el<HTMLButtonElement>('replayView'),
  replayExit:el<HTMLButtonElement>('replayExit'),
  replayPrevEvent:el<HTMLButtonElement>('replayPrevEvent'),
  replayNextEvent:el<HTMLButtonElement>('replayNextEvent'),
  replayFollow:el<HTMLButtonElement>('replayFollow'),
  replaySquad:el<HTMLButtonElement>('replaySquad'),
  replayDirector:el<HTMLButtonElement>('replayDirector'),
  replayAnalysis:el<HTMLButtonElement>('replayAnalysis'),
  replayPlans:el<HTMLButtonElement>('replayPlans'),
  replayPlanVersion:el<HTMLButtonElement>('replayPlanVersion'),
  replayNames:el<HTMLButtonElement>('replayNames'),
  replayTraces:el<HTMLButtonElement>('replayTraces'),
  replayGhosts:el<HTMLButtonElement>('replayGhosts'),
  replayTrails:el<HTMLButtonElement>('replayTrails'),
  replayExportJson:el<HTMLButtonElement>('replayExportJson'),
  replayExportVideo:el<HTMLButtonElement>('replayExportVideo'),
  replayEventText:el<HTMLOutputElement>('replayEventText'),
  replayClock:el<HTMLOutputElement>('replayClock'),
  replayStatusChip:el<HTMLOutputElement>('replayStatusChip'),
  replayFeedFollow:el<HTMLButtonElement>('replayFeedFollow'),
  replayFeedToggle:el<HTMLButtonElement>('replayFeedToggle'),
  replayFeedFilter:el<HTMLSelectElement>('replayFeedFilter'),
  replayFeed:el<HTMLElement>('replayFeed'),
  replayFeedInfo:el<HTMLOutputElement>('replayFeedInfo'),
  rookAmmo:el<HTMLElement>('rookAmmo'),mossAmmo:el<HTMLElement>('mossAmmo'),
  ashAmmo:el<HTMLElement>('ashAmmo'),valeAmmo:el<HTMLElement>('valeAmmo'),
};
for(const key of ['back','undo','redo','siteSettingsToggle','cancelTarget'] as const){
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
// The procedural dossier is the standard briefing; ?briefingV2=0 is an
// optional troubleshooting escape hatch, never a mission rule change.
const briefingPreviewEnabled=startupParams.get('briefingV2')!=='0';
function buildPreviewDossier(session:Session,risk?:1|2|3){
  if(!briefingPreviewEnabled||!session.site)return undefined;
  try{
    const dossier=createOperationDossier(compileMissionFacts(session,{contractRisk:risk}));
    return campaignMode==='mission'?
      attachCampaignDossierContext(dossier,campaign):dossier;
  }
  catch(error){
    // Narrative validation must never prevent a valid tactical mission loading.
    console.warn('[Briefing] Safe static contract fallback',error);
    return undefined;
  }
}
// Live civilian field testing is enabled in ordinary Quick Play/Campaign.
// ?civilians=0 is a deliberate rollback switch while testing on phones;
// seeded population limits, rescue compatibility and fog rules are unchanged.
const civilianPreview=startupParams.get('civilians')!=='0';
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
/** Keep one warm Studio context for short returns; release it after a bounded
 * hidden interval to avoid retaining two WebGL contexts indefinitely on iOS.
 * The iframe never owns tactical simulation or authoritative roster state. */
const STUDIO_WARM_RETAIN_MS=60_000;
let studioReady=false,studioOpenEpoch=0,studioInitSentEpoch=-1;
let studioReleaseTimer:ReturnType<typeof setTimeout>|null=null;
function sendStudioInit(){
 if(!studioOverlay||studioOverlay.hidden||
    studioInitSentEpoch===studioOpenEpoch)return;
 studioInitSentEpoch=studioOpenEpoch;
 if(!studioFrame?.contentWindow)return;
 const people=studioMode==='campaign'?
  campaign?.operators.filter(o=>o.status!=='retired'&&o.status!=='lost')??[]:
  persistentRoster.members;
 studioFrame.contentWindow.postMessage({
  type:'fw-studio-init',mode:studioMode,selected:studioSelected,
  members:people.map(p=>({
   id:p.id,callsign:p.callsign,appearanceSeed:p.appearanceSeed,
   loadout:p.loadout,wardrobe:p.wardrobe,
   weapon:p.weapon,weaponConfiguration:p.weaponConfiguration
  })),
  readonly:studioMode==='campaign'?!!campaign?.activeContractId:
   state.phase!=='planning'||replaying
 },location.origin);
}
function closeOperatorStudio(){
 if(!studioOverlay||studioOverlay.hidden)return;
 studioOverlay.hidden=true;
 studioFrame?.contentWindow?.postMessage({type:'fw-studio-suspend'},location.origin);
 if(studioReleaseTimer!==null)clearTimeout(studioReleaseTimer);
 studioReleaseTimer=setTimeout(()=>{
  studioReleaseTimer=null;
  if(!studioOverlay?.hidden||!studioFrame)return;
  studioFrame.src='about:blank';
  studioReady=false;studioInitSentEpoch=-1;
 },STUDIO_WARM_RETAIN_MS);
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
  studioFrame.onload=()=>{
   if(studioOverlay&&!studioOverlay.hidden)sendStudioInit();
  };
 }
 studioSelected=id??(studioMode==='campaign'?campaign?.operators[0]?.id:'rook')??'rook';
 if(studioReleaseTimer!==null){
  clearTimeout(studioReleaseTimer);studioReleaseTimer=null;
 }
 studioOpenEpoch++;
 studioOverlay.hidden=false;
 const url=new URL('./operator-studio.html',location.href);
 url.searchParams.set('embedded','1');url.searchParams.set('mode',studioMode);
 url.searchParams.set('operator',studioSelected);
 // A hidden frame still owns the already compiled rig and GPU resources.
 // Send fresh authoritative roster/readonly state rather than navigate it.
 if(!studioFrame!.getAttribute('src')||
    studioFrame!.getAttribute('src')==='about:blank'){
  studioReady=false;
  studioFrame!.src=url.href;
 }else if(studioReady)sendStudioInit();
}
document.getElementById('openOperatorStudio')?.addEventListener('click',()=>
 openOperatorStudio(selected,'quick'));
window.addEventListener('message',event=>{
 if(!studioFrame?.contentWindow||event.source!==studioFrame.contentWindow||
    event.origin!==location.origin||!event.data||typeof event.data!=='object')return;
 const msg=event.data as {type?:string;id?:unknown;
  wardrobe?:unknown;entries?:unknown};
 if(msg.type==='fw-studio-ready'){
  studioReady=true;sendStudioInit();return;
 }
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
function applyCampaignSkills(session:Session){
 if(campaignMode!=='mission'||!campaign)return;
 for(const a of team(session)){
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
   const fitted=fitMagazineInventory(a.id,a.weapon,m.weaponConfiguration,
    m.magazine,m.reserve,m.magazines);
   a.magazine=fitted.magazine;a.reserve=fitted.reserve;
   a.insertedMagazineId=m.loadedMagazineId;
   a.spareMagazines=a.weapon==='shotgun'?[]:
    stageMagazines(fitted.magazines,m.loadout);
   if(m.recoveryDays>0&&m.injuries>0){
    a.injuryStage=Math.max(a.injuryStage,Math.min(2,m.injuries));
    a.health=Math.min(a.health,4-a.injuryStage);
   }
  }
 }
 if(!session.started){
  const squad=team(session);
  const issued=allocateFlashSupply(squad.map(a=>a.flashCharges),campaign.supplies.flash);
  squad.forEach((a,i)=>{a.flashCharges=issued[i];});
  session.flashRemaining=issued.reduce((n,qty)=>n+qty,0);
 }
}
// One lifetime owner: creation, initial snapshots, deployment staging,
// restart/favorite restoration, and replay presentation sessions.
const missionController=new BreachMissionController({
  preferences:()=>({
    legacyStudy,civilianPreview,requestedCondition,
    selectedIntelMode,requestedSiteScale,selectedLightingMode,
    mode:campaignMode
  }),
  randomSeed:randomSiteSeed,
  refreshQuickRoster:()=>{
    persistentRoster=freshQuickPlayRoster(persistentRoster);
  },
  applyRoster:session=>applyRosterIdentity(session,persistentRoster),
  applyCampaign:applyCampaignSkills,
  buildDossier:buildPreviewDossier
});
// Front menu intentionally has no site; Quick Play and fixed study are
// initialized exactly once, using the ordinary authoritative session factory.
let state:Session=missionController.create({
  variant:0,seed:initialSiteSeed,
  withoutSite:legacyStudy||campaignMode==='menu',initial:true
});
let recorder=missionController.recordInitial(state);
const deploymentButton=document.createElement('button');
deploymentButton.type='button';deploymentButton.id='deploymentChoice';
deploymentButton.setAttribute('aria-label','Cycle available insertion points');
ui.briefingEntryControls.append(deploymentButton);
missionController.bindDeployment({
  button:deploymentButton,label:ui.briefingEntryLabel,
  getSession:()=>state,isReplaying:()=>replaying,
  onSelected:()=>{recorder=missionController.recordInitial(state);},
  reducedMotion:()=>reducedMotionMedia.matches
});
function restoreFavoriteMission(saved:FavoriteMission):void{
  if(campaignMode==='mission'){
    showUiHelp('FAVORITES PLAY AS QUICK PLAY PRACTICE',3400);return;
  }
  const start=structuredClone(saved.start);
  campaignMode='quick';
  reset(start.variant,start.seed,start.missionType,
    missionController.restartRequest(start).prebuiltSite,undefined,false,start);
  missionController.restoreStartingSetup(state,start,entry=>
    console.warn('[Favorite mission] Saved entry no longer valid',entry));
  replayLibrary.activateFavorite(saved.id);
  recorder=missionController.recordInitial(state);
  closeMissionSettings(false);
  layout();updateHud();
  showUiHelp('FAVORITE LOADED · ORIGINAL MISSION SETUP',3800);
}
function refreshDeployment():void{
  missionController.refreshDeployment(state,replaying);
}
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
let replaying=false;
const replayPlayback=new ReplayPlaybackController();

const replayQuickVideo=new ReplayQuickVideo(
  (blob,mime)=>{
    audioController.endVideoCapture();
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download='fieldwork-replay-'+(recorder.manifest?.site?.seed??'mission')+
      '-'+Math.floor(replayPlayback.time)+'s.'+(mime.includes('mp4')?'mp4':'webm');
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    ui.replayExportVideo.textContent='VIDEO 20S';
    showUiHelp('REPLAY VIDEO EXPORTED',3000);
  },
  reason=>{
    console.warn('[Replay Video]',reason);
    audioController.endVideoCapture();
    ui.replayExportVideo.textContent='VIDEO 20S';
    showUiHelp(reason,3600);
  }
);
let replayPresentation:ReplayPresentation|null=null;
let finishedSession:Session|null=null;
const replayKnowledge=new ReplayKnowledgeController();
/** Contact lens filters recorded hostile models/events only; environment is
 * still the shared team map until individual ground/door intel is recorded.
 */
/** Optional recorded floor-discovery overlay, not a full actor POV. */
const replayBodycam=new ReplayBodycamController();
let replayXrayOn=false;
function stopReplayBodycam():void{
  replayBodycam.stop(stage);
  ui.replayBodycamStatus.hidden=true;
}
function applyReplayBodycamMount():void{
  if(!replayBodycam.apply(stage,replayKnowledge.observerId))stopReplayBodycam();
}
function startReplayBodycam():boolean{
  const next=replayBodycam.start(replaying,stage,replayKnowledge.observerId);
  if(!next)return false;
  replayKnowledge.observerId=next;
  replayKnowledge.omniscient=false;replayKnowledge.groundLensOn=false;
  chooseReplayCamera('free');replayCamera.follow=false;
  selected=next;replayCamera.followId=next;
  replayAnalysisUi.closeReplayShotInspector();
  cameraMode('iso');
  applyReplayBodycamMount();
  fog2D.invalidate();return true;
}
let replayAnalysis=false;
const replayCamera=new ReplayCameraController();
const replayDirector=replayCamera.director;
let replayPlanScope:'all'|'selected'|'none'='selected';
let replayPlanVersion:'active'|'original'='active';
let replayNameTags=true;
let replayContactMarkers=true;
let replayObjectiveMarkers=true;
let replayTraceMode:'off'|'recent'|'selected'='off';
let replayGhostMode:'off'|'selected'|'squad'='off';
let replayTrailMode:'off'|'recent'|'full'='off';
let replayMovementHistory:ReplayMovementHistory|null=null;

let stage:TacticalScene3D|null=null;
let viewMode:ViewMode='iso';
try{stage=new TacticalScene3D();}
catch(error){console.warn('3D unavailable; reverting to tactical plan',error);
  viewMode='plan2d';}
/** All camera mode writes pass through the same availability policy. */
function chooseReplayCamera(mode:Parameters<ReplayCameraController['selectMode']>[0]):void{
  replayCamera.selectMode(mode,viewMode as ReplayPerspective,!!stage,replayBodycam.active);
}
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
const replayDirectorDiagnostics=new URLSearchParams(location.search).has('directorDebug');
const replayDirectorDebugPanel=replayDirectorDiagnostics?
  document.createElement('output'):null;
if(replayDirectorDebugPanel){
  replayDirectorDebugPanel.id='replayDirectorDiagnostics';
  Object.assign(replayDirectorDebugPanel.style,{
    position:'fixed',left:'8px',top:'134px',zIndex:'69',
    maxWidth:'210px',whiteSpace:'pre-wrap',pointerEvents:'none',
    padding:'7px',font:'11px/1.4 monospace',borderRadius:'5px',
    color:'#f4e7bc',background:'rgba(10,28,24,.87)'
  });
  replayDirectorDebugPanel.hidden=true;
  document.body.append(replayDirectorDebugPanel);
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
operationsBoard.className='fw-squad-sheet';
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
/** Full Arsenal editor uses the same pure draft and resolver as the standalone gallery.
 * Quick Play commits remain in the transient roster; weapon/kit progress is not saved.
 */
async function openQuickArsenal(id:string){
 if(state.phase!=='planning'||replaying||campaignMode!=='quick')return;
 const member=persistentRoster.members.find(m=>m.id===id);
 if(!member)return;
 try{
  const [{arsenalRecipeFromLegacy},{openArsenalWorkbench},
   {applyQuickPlayArsenalEdit,quoteQuickPlayArsenalEdit}]=await Promise.all([
    import('./arsenal/recipes.ts'),import('./arsenal/workbench-screen.ts'),
    import('./arsenal/quickplay-adapter.ts')]);
  if(state.phase!=='planning'||replaying||campaignMode!=='quick')return;
  const current=persistentRoster.members.find(m=>m.id===id);
  const recipe=current&&arsenalRecipeFromLegacy(current.weaponConfiguration);
  if(!current||!recipe){showUiHelp('THIS WEAPON USES THE LEGACY LOADOUT EDITOR',3000);return;}
  openArsenalWorkbench({id:'equipped-quick-'+id,name:current.callsign,recipe},undefined,{
   mode:'quick',applyLabel:'APPLY TO OPERATOR',
   quote:r=>{
    const result=quoteQuickPlayArsenalEdit(persistentRoster,id,r);
    return {...result,canCommit:result.valid};
   },
   onApply:nextRecipe=>{
    if(state.phase!=='planning'||replaying||campaignMode!=='quick')
     return {ok:false,message:'Equipment changes are only available before deployment'};
    const next=applyQuickPlayArsenalEdit(persistentRoster,id,nextRecipe);
    if(next===persistentRoster&&
     !persistentRoster.members.some(m=>m.id===id))
     return {ok:false,message:'Operator is unavailable'};
    persistentRoster=next;
    applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=id;expandedQuickWeapon=id;
    expandedQuickLoadoutGroup='weapon';
    renderOperationsBoard();updateHud();
    return {ok:true};
   }
  });
 }catch{
  showUiHelp('ARSENAL UNAVAILABLE · EXISTING LOADOUT EDITOR STILL WORKS',4000);
 }
}
function renderOperationsBoard(){
 const priorScroll=operationsBoard.scrollTop;
 rememberQuickWorkbenchView();
 quickWorkbench?.dispose();quickWorkbench=null;quickWorkbenchId=null;
 operationsBoard.replaceChildren();
 const heading=document.createElement('div');
 heading.className='fw-squad-sheet-header';
 const title=document.createElement('strong');
 title.textContent='SQUAD';heading.append(title);
 const close=document.createElement('button');
 close.type='button';close.textContent='CLOSE';
 close.addEventListener('click',()=>{
 operationsBoard.hidden=true;tacticalSheetNavigation.sync();operationsToggle.focus();
});
 heading.append(close);
 const more=document.createElement('details');more.className='fw-squad-more';
 const moreLabel=document.createElement('summary');moreLabel.textContent='MORE';
 more.append(moreLabel);
 const range=document.createElement('button');range.type='button';
 range.textContent='TEST RANGE';range.title='Nonpersistent equipment range';
 range.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  operationsBoard.hidden=true;tacticalSheetNavigation.sync();
  campaignMode='quick';lastRangeTrial=null;
  reset(state.variant,undefined,undefined,equipmentTrainingSite());
  showUiHelp('TEST RANGE · USE SUPPRESS TO FIRE AT TARGET PLATES',6500);
 });
 more.append(range);heading.append(more);operationsBoard.append(heading);
 const history=operationHistory();
 const intro=document.createElement('p');
 intro.className='fw-squad-intro';
 intro.textContent=persistentRoster.members.length+' OPERATORS · FRESH GEAR EACH ROUND'+
  (history.length?' · LAST '+(history.at(-1)?.grade??'—'):'');
 operationsBoard.append(intro);
 for(const member of persistentRoster.members){
  const card=document.createElement('details');
  card.dataset.squadCard=member.id;
  card.className='fw-squad-card';
  card.dataset.operatorId=member.id;
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
   operationsBoard.hidden=true;tacticalSheetNavigation.sync();
   openOperatorStudio(member.id,'quick');
  });
  const rename=document.createElement('button');
  rename.type='button';rename.textContent='CALLSIGN';
  rename.addEventListener('click',async()=>{
   if(state.phase!=='planning'||replaying)return;
   const next=await promptFieldworkText({
    title:'EDIT CALLSIGN',value:member.callsign,
    label:'CALLSIGN',maxLength:24,confirmLabel:'SAVE NAME'});
   if(next===null||state.phase!=='planning'||replaying)return;
   persistentRoster=renameRosterMember(persistentRoster,member.id,next);
   const saved=saveRoster();applyRosterIdentity(state,persistentRoster);
   if(saved)showFieldworkActionFeedback('CALLSIGN UPDATED · '+next.toUpperCase());
   renderOperationsBoard();updateHud();
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
  arsenalAction.disabled=state.phase!=='planning'||replaying||
   !member.weaponConfiguration.build;
  arsenalAction.addEventListener('click',()=>{void openQuickArsenal(member.id);});
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
    if(state.phase!=='planning'||replaying)return;
    const preset=familyPreset(presetId);if(!preset)return;
    let next=persistentRoster;
    if(member.weapon!==preset.weapon)next=equipRoster(next,member.id,preset.weapon);
    next=configureRosterWeaponPreset(next,member.id,presetId);
    const selected=next.members.find(m=>m.id===member.id);
    if(!selected?.weaponConfiguration.build)return;
    persistentRoster=next;
    selectedQuickWeaponSockets.delete(member.id);
    savedQuickWorkbenchViews.delete(member.id);resetQuickWorkbenchViews.add(member.id);
    saveRoster();applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    expandedQuickLoadoutGroup='weapon';renderOperationsBoard();updateHud();
   }
  });
  legacyControls.append(factoryLabel,factoryBrowser);
  const resupply=document.createElement('button');resupply.type='button';
  resupply.className='fw-squad-resupply';resupply.textContent='RESUPPLY';
  resupply.addEventListener('click',()=>{
   if(state.phase!=='planning'||replaying)return;
   persistentRoster=resupplyRoster(persistentRoster,member.id);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   expandedQuickKit=member.id;expandedQuickLoadoutGroup='weapon';
   renderOperationsBoard();updateHud();
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
    if(state.phase!=='planning'||replaying)return;
    persistentRoster=equipRosterGear(persistentRoster,member.id,slot,select.value);
    const saved=saveRoster();applyRosterIdentity(state,persistentRoster);
    if(saved){
     const chosen=itemsForSlot(slot).find(item=>item.id===select.value);
     showFieldworkActionFeedback(member.callsign+' · '+
      (chosen?.name??slot.toUpperCase())+' EQUIPPED');
    }
    expandedQuickKit=member.id;renderOperationsBoard();updateHud();
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
   select.disabled=state.phase!=='planning'||replaying;
   select.addEventListener('focus',()=>quickWorkbenchId===member.id&&
    quickWorkbench?.setActiveSlot(slot));
   select.addEventListener('change',()=>{
    if(state.phase!=='planning'||replaying)return;
    persistentRoster=configureRosterWeapon(persistentRoster,member.id,slot,select.value);
    saveRoster();applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    expandedQuickLoadoutGroup='weapon';renderOperationsBoard();updateHud();
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
   select.disabled=state.phase!=='planning'||replaying;
   select.addEventListener('focus',()=>quickWorkbenchId===member.id&&
    quickWorkbench?.setActiveSlot(socket));
   select.addEventListener('change',async()=>{
    if(state.phase!=='planning'||replaying)return;
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
    persistentRoster=configureRosterWeaponBodyPart(persistentRoster,member.id,
     slot as FamilyPartSlot,select.value);
    saveRoster();applyRosterIdentity(state,persistentRoster);
    expandedQuickKit=member.id;expandedQuickWeapon=member.id;
    expandedQuickLoadoutGroup='weapon';renderOperationsBoard();updateHud();
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
     if(state.phase!=='planning'||replaying)return;
     persistentRoster=moveRosterMagazine(persistentRoster,member.id,
      mag.id,select.value as MagazineLocation);
     saveRoster();applyRosterIdentity(state,persistentRoster);
     expandedQuickKit=member.id;renderOperationsBoard();updateHud();
    });
    row.className='fw-equipment-choice';row.append(select);magSection.append(row);
   }
   loadout.field('carry').append(magSection);
  }
  card.append(kit);operationsBoard.append(card);
  // A newly opened details subtree can report zero width on iOS until
  // it is attached and laid out. Initialize after paint, not only on toggle.
  if(kit.open&&loadout.group.weapon.open&&legacyControls.open&&weaponEditor.open)
   requestAnimationFrame(()=>{if(kit.isConnected)syncWorkbench();});
 }
 const hint=document.createElement('p');
 hint.textContent='Select an operator to edit. Close to resume planning.';
 operationsBoard.append(hint);
 operationsBoard.scrollTop=priorScroll;
}
const tacticalSheetNavigation=createTacticalSheetNavigation({
 settings:ui.siteSettings,squad:operationsBoard,briefing:ui.briefingPanel
},()=>{collapseTacticalSheets(null);updateContext();});
/** Only one major tactical sheet owns the viewport and touch focus at a time. */
function collapseTacticalSheets(except:'squad'|'weapon'|'settings'|'briefing'|null){
 if(except!=='squad')operationsBoard.hidden=true;
 if(except!=='weapon')hideWeaponChooser();
 if(except!=='settings'){
  ui.siteSettings.hidden=true;
  ui.siteSettingsToggle.setAttribute('aria-expanded','false');
  closeSiteChoice();
 }
 if(except!=='briefing'){
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
 }
 tacticalSheetNavigation.sync();
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
 tacticalSheetNavigation.sync();
 if(opening)tacticalSheetNavigation.focusFirst();
 updateContext();
});
let selected='rook';
let evacMode:{patientId:string;mode:'drag'|'carry'}|null=null;
let flashMode=false,pushMode=false;
let firePlacement:'suppress'|null=null;
// One presentation owner for dock/floating palette, touch pointer guard,
 // context command buttons, and screen-space obstruction avoidance.
const reducedMotionMedia=matchMedia('(prefers-reduced-motion: reduce)');
let lastAuthoringAt=0;
const paletteController=createTacticalPaletteController({
  context:ui.context,quickStates:ui.quickStates,tacticalHud:ui.tacticalHud,
  play:ui.play,briefingPanel:ui.briefingPanel,siteSettings:ui.siteSettings,
  hint:ui.hint,feed:ui.feed,
  worldToScreen:(p,z)=>worldToScreen(p,z),
  routePoints:(from,to)=>displayRouteCache.get(from,to,state.intel,true).points,
  iconFor:tacticalIconForState,makeIcon:tacticalIcon,
  installHelp:button=>installTouchCommandHelp(button),
  onLayoutChange:()=>updateContext()
});
function hideContextPalette():void{paletteController.hide();}
function advanceContextPalette(dt:number):void{paletteController.advance(dt);}
const auditRouteMode=new URLSearchParams(location.search).has('audit');
let selectedNode:number|null=null;
// Executed WATCH has no queued waypoint, but its targeting handle is selectable.
let selectedActiveWatch=false;
let doorMenuDismissedId:string|null=null;
let flashDoorId:string|null=null;
let doorFocusId:string|null=null;
let draggingNode:Pt|null=null;
let draggingWatchTarget=false;
function cancelTargeting(){
  const hadTarget=hudController.facing.looking||flashMode||pushMode||!!firePlacement||!!evacMode;
  if(hadTarget){
    const actor=uid(selected);
    if(actor)tacticalFeedback.emit('cancel',actor.p,'CANCELLED');
  }
  hudController.facing.looking=false;flashMode=false;pushMode=false;firePlacement=null;flashDoorId=null;
  evacMode=null;paletteController.invalidate();updateHud();
}

const audioController=createBreachAudioController({
  getContext:()=>({
    state,selected,bodycamActive:replayBodycam.active,
    observerId:replayKnowledge.observerId
  }),
  showUiHelp
});

let last=performance.now(),accum=0,hudAt=0;
let previousRenderActors:Record<string,RenderActor>|null=null;
let previousRenderDoors:Record<string,number>|null=null;
const displayRouteCache=new DisplayRouteCache();
const projectedRouteCache=new ProjectedRouteCache();
let cssW=innerWidth,cssH=innerHeight,dpr=1;
let viewScale=1,ox=0,oy=0,zoom=1,panX=0,panY=0;
let cursor:Pt|null=null;
let previewHover=false;
let trace:Pt[]|null=null;
// Pointer state, pinch continuity and iOS missing-release recovery now live in
// the input controller. The read-only pointer map is used for HUD previews.
const tacticalGestures=createBreachCanvasGestureController(canvas);
const activePointers=tacticalGestures.activePointers;
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
  const oldWidth=cssW,oldHeight=cssH;
  cssW=Math.max(1,innerWidth);cssH=Math.max(1,innerHeight);
  if((cssW!==oldWidth||cssH!==oldHeight)&&replayDirector.storyboard)
    replayDirector.storyboard.clear();
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
  if(replaying&&replayBodycam.active&&mode!=='iso')stopReplayBodycam();
  viewMode=stage?mode:'plan2d';
  if(replaying){
    if(viewMode!=='plan2d')replayKnowledge.groundLensOn=false;
    // Resolve follow/director compatibility for every perspective-change path,
    // including personal ground review and legacy advanced-view actions.
    chooseReplayCamera(resolvedReplayCamera(replayCamera.mode,
      viewMode as ReplayPerspective,!!stage,replayBodycam.active));
    
  }
  if(stage){stage.setMode(viewMode);stage.updateCamera(1);}
  for(const [m,button] of [['iso',ui.viewIso],
    ['top',ui.viewTop],['plan2d',ui.view2d]] as const){
    button.setAttribute('aria-pressed',String(m===viewMode));
  }
  paletteController.invalidate();updateHud();
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
  audioController.uiClickTone('select');selected=id;hudController.facing.looking=false;pushMode=false;evacMode=null;
  selectedNode=null;selectedActiveWatch=false;doorFocusId=null;
  doorMenuDismissedId=null;updateHud();
}
// The HUD controller owns transient guidance, instructional tips, and
// LOOK/WATCH arming. Only planning rules can commit the resulting orders.
function teach(key:string,description:string,duration=4200):void{
  hudController.teach(key,description,duration);
}
function showUiHelp(text:string,duration=4200):void{
  hudController.showHelp(text,duration);
}
function discoverAction(action:string,description:string):void{
  hudController.discoverAction(action,description);
}
const installTouchCommandHelp=(button:HTMLButtonElement)=>
  bindTouchCommandHelp(button,showUiHelp,updateHud);
function armFacing(mode:'look'|'watch'):void{
  hudController.toggleFacing(mode,selectedNode);
  updateHud();
}
/** The tray never competes with the expanded TOOLS panel or GO/BACK. */
function focusedDoor(a:TeamActor,node:ReturnType<typeof selectedPlanNode>){
  const points=node?[node.p]:[finalPoint(a),a.p];
  const explicit=state.doors.find(d=>d.id===doorFocusId&&
    doorKnown(state.intel,d.id)&&
    points.some(p=>doorReachable(p,d)));
  if(explicit)return explicit;
  // A single pass preserves the stable first-door tie break without
  // allocating and sorting every reachable door on context refresh.
  let closest:typeof state.doors[number]|undefined;
  let closestDistance=Infinity;
  for(const door of state.doors){
    if(door.id===doorMenuDismissedId||!doorKnown(state.intel,door.id)||
       !points.some(p=>doorReachable(p,door)))continue;
    const center=doorCenter(door);
    let range=Infinity;
    for(const point of points)range=Math.min(range,distance(point,center));
    if(range<closestDistance){
      closest=door;
      closestDistance=range;
    }
  }
  return closest;
}
function selectedPlanNode(){
  return uid(selected)?.plan.find(n=>n.id===selectedNode);
}
/** The actor itself is HERE. Selected plan nodes own subsequent orders;
 * a door tap brings up ONLY door actions. No redundant HERE/END buttons. */
function updateContext(){
  if(state.phase!=='planning'||replaying||hudController.facing.looking||flashMode||pushMode||firePlacement||
     !ui.briefingPanel.hidden||
     draggingNode||trace||
     !ui.siteSettings.hidden){
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
  const at=node?.p??finalPoint(a);
  const nearMovable=state.coverState.some(o=>canRelocateCover(o)&&
    distance(at,{x:o.x,y:o.y})<Math.max(o.w,o.h)/2+43);
  const nearWindow=state.windows.some(w=>w.operable&&!w.shattered&&
    distance(at,{x:w.x,y:w.y})<54);
  const treatTarget=medicalCandidate(selected,at);
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
  const civilianAtPlan=state.civilians.filter(c=>
    c.health>0&&liveVisibility(state,c.p)&&
    distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0]??null;
  const casualtyAtPlan=state.civilians.filter(c=>c.health<=0&&
      !c.carriedById&&
      liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0]??null;
  const choices=paletteController.availableActions(!!selectedWatch,{
    door:!!door,node:!!node,flashRemaining:state.flashRemaining,
    nearMovable,nearWindow,treatTargetName:treatTarget?.name,
    nearDoor:!door&&!!nearbyDoor,
    nearCivilian:!!civilianAtPlan&&civilianAtPlan.state!=='compliant',
    escortableCivilian:!!civilianAtPlan&&
      civilianAtPlan.rescueTarget&&state.mission==='extract',
    nearCivilianCasualty:!!casualtyAtPlan,
    carryingCivilian:!!a.carryingId&&state.civilians.some(c=>
      c.id===a.carryingId&&c.carriedById===a.id),
    posture:current.posture,pace:current.pace,
    firePolicy:node?.firePolicyState??a.firePolicy,
    reserve:a.reserve,magazine:a.magazine,
    doorOpen:!!door&&(door.openFraction??(door.open?1:0))>=.98,
    doorPartial:!!door&&(door.openFraction??(door.open?1:0))>.08&&
      (door.openFraction??(door.open?1:0))<.98,
    availableTools:door?equippedEntryMethods(a.equipment)
      .filter(method=>entryToolVerdict(door,method).allowed):[],
    nodeKind:node?.kind,nodeMoveMode:node?.moveMode,aimLabel:node?.aimLabel,
    watchActive,nodeFirePolicy:node?.firePolicyState
  });
  paletteController.show({
    state,actor:a,selected,node,selectedWatch,door,actions:choices,
    width:cssW,height:cssH,lastAuthoringAt
  });
}
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
    case 'ctxSecureCivilian':
    case 'ctxFollowCivilian':{
      const civ=state.civilians.filter(c=>c.health>0&&
        liveVisibility(state,c.p)&&
        distance(finalPoint(a),c.p)<34)
        .sort((x,y)=>distance(finalPoint(a),x.p)-
          distance(finalPoint(a),y.p))[0];
      const mode=action==='ctxSecureCivilian'?'secure':'follow';
      if(!civ||!planCivilianInteraction(state,selected,civ.id,mode))
        state.events.push('CIVILIAN INTERACTION NOT REACHABLE');
      break;
    }
    case 'ctxReleaseCivilian':
      if(!planCivilianRelease(state,selected))
        state.events.push('NO CIVILIAN TRANSPORT TO RELEASE');
      break;
    case 'ctxDragCivilian':
    case 'ctxCarryCivilian':{
      const civ=state.civilians.filter(c=>c.health<=0&&
        (!c.carriedById||c.carriedById===a.id)&&
        liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
        .sort((x,y)=>distance(finalPoint(a),x.p)-
          distance(finalPoint(a),y.p))[0];
      if(!civ||!planCasualtyTransport(state,selected,civ.id,
         state.scenario.extract,
         action==='ctxCarryCivilian'?'carry':'drag'))
        state.events.push('CIVILIAN TRANSPORT ROUTE NOT AVAILABLE');
      break;
    }
    case 'ctxSuppress':
      firePlacement='suppress';hudController.facing.looking=false;flashMode=false;
      tacticalFeedback.emit('armed',node?.p??a.p,'SUPPRESS READY');
      audioController.uiClickTone('select');updateHud();return;
    case 'ctxFlash':
      if(state.flashRemaining>0){flashMode=true;flashDoorId=null;
        hudController.facing.looking=false;firePlacement=null;}
      break;
    case 'ctxLook':
      armFacing('look');
      if(hudController.facing.looking)tacticalFeedback.emit('armed',node?.p??a.p,'TAP A DIRECTION');
      audioController.uiClickTone('select');return;
    case 'ctxDoor':{
      const available=focusedDoor(a,node);
      if(!available){state.events.push('NO KNOWN DOOR IN REACH');break;}
      doorFocusId=available.id;doorMenuDismissedId=null;
      audioController.uiClickTone('select');
      updateHud();return;
    }
    case 'ctxWatch':
      armFacing('watch');
      if(hudController.facing.looking)tacticalFeedback.emit('armed',node?.p??a.p,'TAP WATCH TARGET');
      audioController.uiClickTone('select');return;
    case 'ctxWait':{
      if(node?.kind==='wait')setWaitDuration(state,selected,node.id,1);
      else planWaitAt(state,selected,1,node?'end':'here',node?.id);
      break;
    }
    case 'ctxStance':{
      const value=current.posture==='stand'?'crouch':'stand';
      if(node)setNodeControl(state,selected,node.id,'postureState',value);
      else posture(state,selected);
      fog2D.invalidate();break;
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
      pushMode=true;hudController.facing.looking=false;flashMode=false;firePlacement=null;
      tacticalFeedback.emit('armed',node?.p??a.p,'PUSH DIRECTION');
      showUiHelp('TAP OR DRAG AWAY FROM THE OBJECT TO CHOOSE PUSH DIRECTION',3600);
      audioController.uiClickTone('select');updateHud();return;
    case 'ctxTreat':{
      const patient=medicalCandidate(selected,node?.p??finalPoint(a));
      if(!patient||!planMedicalTreatment(state,selected,patient.id,node?.id))
        state.events.push('NO REACHABLE PATIENT WITH SUITABLE SUPPLIES');
      break;
    }
    case 'ctxWindow':{
      const at=node?.p??finalPoint(a);
      const nearby=state.windows.filter(w=>w.operable&&!w.shattered&&
        distance(at,{x:w.x,y:w.y})<54)
        .sort((x,y)=>distance(at,{x:x.x,y:x.y})-
          distance(at,{x:y.x,y:y.y}))[0];
      if(!nearby||!planNearbyInteraction(state,selected,
        nearby.open?'close-window':'open-window',node?.id))
        state.events.push('NO OPERABLE WINDOW IN REACH');
      break;
    }
    case 'ctxDoorFlash':
      if(!door){state.events.push('SELECT A DOOR FIRST');break;}
      flashDoorId=door.id;flashMode=true;hudController.facing.looking=false;
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
  hudController.completeAction(
    door?doorCenter(door):node?.p??a.p,
    failed?state.events.at(-1)??'ACTION BLOCKED':null,
    button.querySelector('.command-label')?.textContent??'',
    isFailure=>audioController.uiClickTone(isFailure?'warning':'command'));
  updateHud();
};
ui.context.addEventListener('click',handleContextAction);
ui.quickStates.addEventListener('click',handleContextAction);
function updateQuickStates():void{
  const actor=uid(selected)??null;
  hudController.renderQuickStates({
    state,replaying,actor,node:selectedPlanNode(),
    selectedActiveWatch,watchTargetPresent:!!(actor&&activeWatchTarget(actor)),
    quickStates:ui.quickStates,tacticalHud:ui.tacticalHud,scopeElement:ui.quickScope,
    iconFor:tacticalIconForState,icon:tacticalIcon,
    installHelp:installTouchCommandHelp,
    plannedControl:(nodeId)=>plannedControl(state,selected,nodeId)
  });
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
function medicalCandidate(id:string,origin?:Pt){
 const a=team(state).find(o=>o.id===id&&o.health>0);
 if(!a)return null;
 const at=origin??a.p;
 return team(state).filter(o=>{
  const wound=mostUrgentWound(o.medical);
  return wound&&treatmentSupplyForWound(wound,a.medicalSupplies);
 }).sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0]??null;
}
/** V3: render only when mission identity or roster changes; never on each frame. */
let briefingRenderedSession:Session|null=null;
let briefingRenderedDossier:Session['operationDossier'];
let briefingRenderedRoster='';
let briefingRenderedEntry='';
function renderBriefingReports(root:HTMLElement,reports:readonly BriefingReport[]):void{
 const fragment=document.createDocumentFragment();
 if(!reports.length){
  const message=document.createElement('p');message.className='fw-brief-v3-report-empty';
  message.textContent='No additional verified reports available.';
  fragment.append(message);
 }
 for(const report of reports){
  const article=document.createElement('article');article.className='fw-brief-v3-report';
  const meta=document.createElement('div');meta.className='fw-brief-v3-report-meta';
  meta.textContent=report.source.toUpperCase()+' · '+report.confidence.toUpperCase();
  const body=document.createElement('p');body.textContent=report.text;
  article.append(meta,body);fragment.append(article);
 }
 root.replaceChildren(fragment);
}
function syncBriefingCard():void{
 const dossier=briefingPreviewEnabled?state.operationDossier:undefined;
 const names=team(state).map(actor=>actor.name).join(' · ');
 if(state===briefingRenderedSession&&dossier===briefingRenderedDossier&&
    names===briefingRenderedRoster&&missionController.entryId===briefingRenderedEntry)return;
 briefingRenderedSession=state;
 briefingRenderedDossier=dossier;
 briefingRenderedRoster=names;
 briefingRenderedEntry=missionController.entryId;
 const brief=operationBriefing(state);
 const model=createBriefingCardModel(state.missionType,brief,dossier);
 ui.briefingTitle.textContent=model.title;
 ui.briefingType.textContent=model.missionLabel.toUpperCase();
 ui.briefingLocation.textContent=model.siteLabel;
 ui.briefingPrimary.textContent=model.primary;
 ui.briefingSituationBlock.hidden=false;
 ui.briefingSituation.textContent=model.situation;
 ui.briefingThreat.textContent=model.threat.value;
 ui.briefingLayout.textContent=model.layout;
 const steps=document.createDocumentFragment();
 model.steps.forEach((step,index)=>{
  const cell=document.createElement('div');cell.className='fw-brief-v3-step';
  const head=document.createElement('strong');
  head.textContent=String(index+1).padStart(2,'0')+' / '+step.action;
  const subtitle=document.createElement('small');subtitle.textContent=step.detail;
  cell.append(head,subtitle);steps.append(cell);
 });
 ui.briefingSteps.replaceChildren(steps);
 // Full authority remains available under ORDERS, never re-authored by prose.
 ui.briefingBody.textContent=brief.objective;
 ui.briefingCondition.textContent=brief.condition;
 ui.briefingExtraction.textContent=brief.extraction;
 ui.briefingSite.textContent=model.siteLabel+' · '+model.layout;
 ui.briefingCaseContext.textContent=model.situation+
   (model.caseContext?'\n\n'+model.caseContext:'');
 const job=campaignMode==='mission'&&campaign?.activeContractId?
   campaign.contracts.find(c=>c.id===campaign!.activeContractId):undefined;
 ui.briefingCampaignContext.textContent=[
   model.campaignLabel??(job?
     job.region.toUpperCase()+' · RISK '+job.risk+' · '+job.title:''),
   model.followUp??''
 ].filter(Boolean).join('\n');
 ui.briefingRoster.textContent=brief.squad+' OPERATORS · '+names;
 renderBriefingReports(ui.briefingIntel,model.reports.threat);
 renderBriefingReports(ui.briefingSiteReports,model.reports.site);
 renderBriefingReports(ui.briefingCaseReports,model.reports.case);
}
function setBriefingIntelTab(tab:BriefingTab):void{
 for(const control of ui.briefingPanel.querySelectorAll<HTMLButtonElement>(
   '[data-briefing-tab]'))
  control.setAttribute('aria-pressed',String(control.dataset.briefingTab===tab));
 for(const section of ui.briefingPanel.querySelectorAll<HTMLElement>(
   '[data-briefing-section]'))
  section.hidden=section.dataset.briefingSection!==tab;
}
function setBriefingView(mode:'brief'|'intel'):void{
 const intel=mode==='intel';
 ui.briefingOverview.hidden=intel;
 ui.briefingIntelView.hidden=!intel;
 ui.briefingIntelToggle.textContent=intel?'BACK TO BRIEF':'VIEW INTEL';
 ui.briefingIntelToggle.setAttribute('aria-expanded',String(intel));
 if(intel)setBriefingIntelTab('threat');
}

function updateHud(){
  if(!replaying&&state.phase==='planning')recorder.capturePlanning(state);
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
  paintOperatorAccent(paletteController.tether,selected);
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
  syncBriefingCard();
  if(state.phase!=='planning'){
    ui.briefingPanel.hidden=true;operationsBoard.hidden=true;
  }
  operationsToggle.hidden=campaignMode!=='quick'||state.phase!=='planning'||replaying;
  operationsToggle.disabled=operationsToggle.hidden;
  if(operationsToggle.hidden)operationsBoard.hidden=true;
  hudController.renderPhase({
    phase:state.phase,started:state.started,replaying,seconds:state.seconds,
    phaseNode:ui.phase,clock:ui.clock,play:ui.play,
    reducedMotion:reducedMotionMedia.matches,icon:tacticalIcon
  });
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
  hudController.renderTargetMode({
    cancelTarget:ui.cancelTarget,hint:ui.hint,
    phase:state.phase,replaying,flashMode,firePlacement
  });
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
  replayLibrary.syncSavedButtons();
  ui.favoriteMission.disabled=!state.site;
  ui.favoriteMission.textContent=replayLibrary.activeFavoriteId?
    '★ MISSION FAVORITED':'☆ FAVORITE MISSION';
  ui.next.textContent=campaignMode==='mission'?'RETURN TO BASE':'NEXT ARRANGEMENT';
  ui.retry.disabled=campaignMode==='mission';
  if(!ui.debrief.hidden){
    ui.debriefIntelBlock.hidden=!state.operationDossier;
    ui.debriefIntelText.textContent=state.operationDossier?
      sessionIntelligenceReview(state):'';
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
      '\n\nCOMBAT REVIEW\n'+formatCombatReview(recorder.frames,recorder.events,
      recorder.ballistics.shots)+
      '\n\nTACTICAL TIMELINE\n'+formatAfterAction(recorder.events,10);
    if(stats.rescueStatus!=='none')
      ui.debriefStats.textContent+='\nCIVILIAN RESCUE: '+
        stats.rescueStatus.toUpperCase().replaceAll('-',' ');
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
    hudController.renderOperatorCard({
      state,replaying,selected,id,actor:uid(id),
      button:ui[id],
      ammo:ui[(id+'Ammo') as 'rookAmmo'|'mossAmmo'|'ashAmmo'|'valeAmmo'],
      hp:ui[(id+'Hp') as 'rookHp'|'mossHp'|'ashHp'|'valeHp'],
      paintAccent:paintOperatorAccent
    });
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
  hudController.renderNotice(ui.feed,state.events,state.phase,replaying);
  hudController.renderGuidance({
    replaying,phase:state.phase,flashMode,pushMode,
    selectedNode,selectedActiveWatch,
    firePlacement:!!firePlacement,evacMode:!!evacMode,
    feed:ui.feed,hint:ui.hint
  });
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
/** Show the provisional segment neighbors while dragging an existing move
 * waypoint. It is deliberately a neutral DRAFT, not a promised walkable path.
 * It never probes hidden navigation state or mutates the authored plan. */
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
const actor2D=createBreach2DActorRenderer({
 draw,rect,line,circle,colorFor,worldToScreen,
 replayKnowledge,executionProblemStatus,executionMarkerPoint,
 getFrame:()=>({state,replaying,selected,replayPlanScope,replayNameTags,
  replayContactMarkers,replayObjectiveMarkers,replayAnalysis,viewMode})
});
/** Bounded forensic overlay; complete shot evidence stays in recorder. */
function historicalShotVisible(shot:RecordedShot):boolean{
  // Shot endpoints and impacts reveal more than the confirmed observer's
  // recorded contacts. Keep forensic trajectories in Team/Full modes only.
  if(replayKnowledge.observerId)return false;
  if(replayKnowledge.omniscient||shot.side==='blue')return true;
  const frame=recorder.at(shot.recordedAt);
  return !!frame?.knowledge?.visibleActorIds.includes(shot.shooterId);
}
const route2D=createBreach2DRouteOverlays({
 draw,line,circle,uid,colorFor,displayRouteCache,
 getFrame:()=>({state,replaying,selected,selectedNode,selectedActiveWatch,
  draggingNode,draggingWatchTarget,trace,cursor,looking:hudController.facing.looking,replayPlanVersion,
  replayPlanScope,recorder})
});
/** Gold denotes actual historically observed cells for the selected operator.
 * Shared geometry/doors/people remain shared and are NEVER claimed as POV.
 * Render only in the Floor Plan view; no speculative real-time raycasts.
 */
const fog2D=createBreach2DVisibilityRenderer({
 draw,getState:()=>state,isReplaying:()=>replaying,getViewMode:()=>viewMode,
 replayKnowledge,replayPlayback,
 debugPalette:new URLSearchParams(location.search).get('fogDebug')==='palette'
});
// Blood and bullet decals are part of the floor, not HUD sprites.
// Render beneath architecture AND fog so marks cannot float over walls
// or leak into an unrevealed room.
/** Shared 3D/2D light footprint, shaded beneath architecture and fog. */
const world2D=createBreach2DWorldRenderer({
 draw,rect,line,circle,getState:()=>state,isReplaying:()=>replaying,
 getDoorFocusId:()=>doorFocusId,replayKnowledge,replayPlayback
});
const replay2D=createBreach2DReplayOverlays({
 draw,worldToScreen,colorFor,historicalShotVisible,
 replayPlayback,replayCamera,replayBodycam,
 getFrame:()=>({state,replaying,selected,recorder,replayAnalysisUi.selectedReplayShotId,
  replayTraceMode,replayTrailMode,replayGhostMode,replayNameTags,viewScale,
  replayMovementHistory})
});
const projected2D=createBreach2DProjectedOverlays({
 draw,line,circle,uid,worldToScreen,colorFor,selectedPlanNode,
 displayRouteCache,projectedRouteCache,drawExecutionProblem:actor2D.drawExecutionProblem,
 replayKnowledge,replayCamera,route2D,replay2D,
 getFrame:()=>({state,replaying,selected,selectedNode,selectedActiveWatch,
  draggingNode,draggingWatchTarget,trace,replayPlanVersion,replayPlanScope,
  replayNameTags,replayContactMarkers,replayObjectiveMarkers,replayAnalysis,
  doorFocusId,stage,cssW,cssH,dpr})
});
function render(){
  if(stage&&viewMode!=='plan2d'){
    if(stage.isReplayBodycamActive()){
      // Bodycam footage is a clean perspective, not an X-ray tactical HUD.
      // Keep accessible replay transport as DOM, clear only projected plans,
      // floating names, objective circles and selection rings.
      draw.setTransform(dpr,0,0,dpr,0,0);
      draw.clearRect(0,0,cssW,cssH);
      return;
    }
    projected2D.renderProjectedPlans();return;
  }
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  draw.fillStyle='#52655b';draw.fillRect(-9,-9,W+18,H+18);
  world2D.terrain();world2D.furniture();world2D.renderGroundMarks();world2D.renderLightingMood2D();world2D.renderWeaponLights2D();
  world2D.architecture();fog2D.renderFog();fog2D.renderPersonalGround();actor2D.missionMarkers();
  route2D.paths();replay2D.renderReplayMovementHistory(false);
  for(const a of state.civilians)actor2D.civilianSprite(a);
  for(const a of state.operators)actor2D.sprite(a);
  if(!replaying||replayAnalysis)
    for(const a of team(state))actor2D.drawExecutionProblem(a,false);
  actor2D.contacts();replay2D.renderReplayGhosts(false);replay2D.renderReplayBallistics(false);
  replay2D.renderReplayFollowMarker(false);actor2D.endMessage();
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(0,0,W,H);
  draw.restore();
}
/** Rejected authoring orders keep the existing plan intact and mark only
 * the attempted world point; no hidden geometry or actors are inspected. */
function rejectAt(pt:Pt,reason:string){
  state.events.push(reason);
  hudController.rejectAttempt(pt,reason,
    ()=>audioController.uiClickTone('warning'));
}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning'||replaying)return;
  if(pushMode){
    const accepted=planNearbyInteraction(state,selected,'push',
      selectedNode??undefined,pt);
    if(!accepted)rejectAt(pt,'NO PUSHABLE OBJECT IN REACH');
    else{
      pushMode=false;tacticalFeedback.emit('command',pt,'PUSH');
      audioController.uiClickTone('command');
    }
    updateHud();return;
  }
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
      audioController.uiClickTone('command');firePlacement=null;
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
      audioController.uiClickTone('command');
      selectedNode=flashDoorId?state.nextId-1:id;
      flashMode=false;flashDoorId=null;
    }
    updateHud();return;
  }
  if(hudController.facing.looking){
    const placedId=state.nextId;
    const retargetingActive=hudController.facing.lookMode==='watch'&&selectedActiveWatch;
    const actor=uid(selected);
    const source=retargetingActive?actor?.p:selectedNode!==null?
      actor?.plan.find(node=>node.id===selectedNode)?.p:
      actor?(hudController.facing.armedOrigin==='here'?actor.p:finalPoint(actor)):null;
    const target=source?aimTargetFromTap(source,pt):null;
    const committed=!!target&&(retargetingActive?
      retargetActiveWatch(state,selected,target):
      hudController.facing.lookMode==='watch'?
        planWatch(state,selected,target,selectedNode??undefined,hudController.facing.armedOrigin):
        planAim(state,selected,'free',target,selectedNode??undefined,'look',hudController.facing.armedOrigin));
    if(!committed){
      rejectAt(pt,target?'AIM ORDER UNAVAILABLE':
        'AIM DIRECTION UNAVAILABLE · TAP AWAY FROM THE OPERATOR');
      showUiHelp('CHOOSE A LOOK / WATCH DIRECTION, OR CANCEL',3200);
    }
    else{
      tacticalFeedback.emit('command',target!,hudController.facing.lookMode==='watch'?'WATCH':'LOOK');
      audioController.playOrderCue(hudController.facing.lookMode==='watch'?'orders.watch':'orders.look');
      if(!retargetingActive&&selectedNode===null){
        selectedNode=placedId;selectedActiveWatch=false;
      }
      teach(hudController.facing.lookMode==='watch'?'watch-placed':'look-placed',
        hudController.facing.lookMode==='watch'?
          'WATCH stays on that point while moving. Drag its ring to adjust.':
          'LOOK checks that direction briefly, then returns to the route.',4100);
    }
    if(committed)hudController.facing.looking=false;
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
    audioController.playOrderCue('orders.waypoint');
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
/** Reapply recorded outcomes after timeline navigation, then refresh dependent
 * camera/audio/visibility presentation. The playback controller owns samples.
 */
function presentReplayAtCurrentTime():void{
  ui.replayClusterMenu.hidden=true;
  if(replayQuickVideo.active)replayQuickVideo.stop();
  audioController.stopReplaySounds();
  replayDirector.target=null;
  stage?.resetReplayBodycamSmoothing();
  const frame=replayPlayback.applyRecordedFrame(recorder,state);
  if(frame){
    replayPresentation=frame.presentation??null;
    fog2D.invalidate();
  }
  advanceReplayCamera(0,true);
  if(!ui.replayFeed.hidden)replayAnalysisUi.renderReplayEventFeed();
  updateReplayHud();
}
function seekReplay(t:number):void{
  replayPlayback.seek(t,recorder.duration);
  presentReplayAtCurrentTime();
}

function rebuildReplayEventIndex():void{
  const eventIndex=replayAnalysisUi.rebuildReplayEventIndex();
  // The Director controller owns historical camera evidence and the film.
  const headerBottom=Math.max(65,
    ui.replayTopHud.getBoundingClientRect().bottom,
    document.querySelector('.top')?.getBoundingClientRect().bottom??0);
  const dockRect=ui.replayPanel.getBoundingClientRect();
  const dockPixels=ui.replayPanel.hidden||dockRect.height<40?
    Math.min(205,cssH*.235):
    Math.max(cssH-dockRect.top,Math.min(205,cssH*.235));
  replayDirector.rebuild({
    recorder,eventIndex,state,
    observerId:replayKnowledge.observerId,omniscient:replayKnowledge.omniscient,
    isShotVisible:historicalShotVisible,width:cssW,height:cssH,
    headerBottom,dockPixels,baseSpan:stage?.replayCameraBaseSpan()??1100
  });
}
/** Runtime only bridges the camera controller to the current replay view. */
function advanceReplayCamera(dt:number,instant=false):void{
  replayCamera.advance({
    dt,instant,replaying,stage,viewMode,state,recorder,replayTime:replayPlayback.time,
    replayContactObserverId:replayKnowledge.observerId,
    replayOmniscient:replayKnowledge.omniscient,cssW,cssH,
    replayFollowStatus:ui.replayFollowStatus,debugPanel:replayDirectorDebugPanel
  });
}

function clearReplayPresentation():void{
  replayNameTags=false;replayContactMarkers=false;
  replayPlanScope='none';replayObjectiveMarkers=false;
  replayAnalysis=false;replayTraceMode='off';
  replayGhostMode='off';replayTrailMode='off';
  replayKnowledge.groundLensOn=false;replayAnalysisUi.selectedReplayShotId=null;
}

function applyReplayPreset(next:'clean'|'movement'|'combat'|'visibility'):void{
  replayAnalysisUi.replayPreset=next;
  if(next==='clean'){
    clearReplayPresentation();
  }else if(next==='movement'){
    replayAnalysis=true;replayPlanScope='selected';replayPlanVersion='active';
    replayTraceMode='off';replayGhostMode='off';replayTrailMode='recent';
  }else if(next==='combat'){
    replayAnalysis=false;replayPlanScope='none';replayTraceMode='recent';replayGhostMode='off';replayTrailMode='off';
  }else{
    replayAnalysis=false;replayPlanScope='none';replayTraceMode='off';replayGhostMode='off';replayTrailMode='off';
    const details=ui.replayExtra.querySelector<HTMLDetailsElement>('[data-replay-group="view"]');
    if(details)details.open=true;
    // A visibility preset must never change the historical disclosure policy.
  }
  updateReplayHud();
}
function populateReplayInspectActors():void{
  ui.replayInspectActor.replaceChildren();
  ui.replayInspectActorButtons.replaceChildren();
  for(const actor of team(state)){
    const option=document.createElement('option');
    option.value=actor.id;option.textContent=actor.name.toUpperCase();
    ui.replayInspectActor.append(option);
    const button=document.createElement('button');
    button.type='button';button.dataset.followActor=actor.id;
    button.textContent=actor.name.toUpperCase();
    button.title='Follow '+actor.name;
    button.addEventListener('click',()=>followReplayOperator(actor.id));
    ui.replayInspectActorButtons.append(button);
  }
}
function populateReplayCameraChoices():void{
  for(const option of ui.replayQuickCamera.querySelectorAll('option[data-actor]'))
    option.remove();
  for(const actor of team(state)){
    const option=document.createElement('option');
    option.value='operator:'+actor.id;option.dataset.actor=actor.id;
    option.textContent='FOLLOW '+actor.name.toUpperCase();
    ui.replayQuickCamera.append(option);
  }
}
function updateReplayHud(){
  ui.replaySeek.value=String(Math.round(replayPlayback.time*60));
  ui.replayMiniPlay.textContent=replayPlayback.playing?'Ⅱ':'▶';
  const following=replayCamera.mode==='operator'&&
    team(state).some(actor=>actor.id===replayCamera.followId&&actor.health>0);
  const followingName=team(state).find(actor=>actor.id===replayCamera.followId)?.name??
    replayCamera.followId;
  ui.replayFollowStatus.textContent=replayBodycam.active?
    'BODYCAM · '+followingName.toUpperCase():following?
    'FOLLOWING · '+followingName.toUpperCase():
    replayCamera.mode==='director'?
      'DIRECTOR · '+(replayDirector.target?.shotType.toUpperCase()??'SQUAD') :
    replayCamera.mode==='squad'?'FOLLOWING · SQUAD':'FREE CAMERA';
  ui.replayFollowStatus.dataset.following=String(following||replayBodycam.active);
  ui.replayClock.textContent=formatReplayTime(replayPlayback.time)+' / '+
    formatReplayTime(recorder.duration)+
    (recorder.completeness.complete?'':' · PARTIAL');
  ui.replaySeek.setAttribute('aria-valuetext',
    formatReplayTime(replayPlayback.time)+' of '+formatReplayTime(recorder.duration));
  ui.replayPlay.dataset.caption=replayPlayback.playing?'PAUSE':'PLAY';
  const playbackIcon=replayPlayback.playing?'pause':'replayPlay';
  if(ui.replayPlay.dataset.mode!==playbackIcon){
    ui.replayPlay.dataset.mode=playbackIcon;
    ui.replayPlay.replaceChildren(tacticalIcon(playbackIcon));
    ui.replayPlay.setAttribute('aria-label',replayPlayback.playing?'Pause replay':'Play replay');
    ui.replayPlay.title=replayPlayback.playing?'Pause replay':'Play replay';
  }
  ui.replaySpeed.textContent=replayPlayback.rate+'×';
  ui.replayQuickSpeed.value=String(replayPlayback.rate);
  ui.replayQuickSpeed.disabled=replayQuickVideo.active;
  ui.replaySpeedTrigger.querySelector('small')!.textContent=replayPlayback.rate+'×';
  ui.replaySpeedTrigger.setAttribute('aria-label','Playback speed '+replayPlayback.rate+' times');
  ui.replaySpeedTrigger.disabled=replayQuickVideo.active;
  ui.replaySpeedRange.disabled=replayQuickVideo.active;
  ui.replaySpeedRange.value=String(speedIndex(replayPlayback.rate));
  ui.replaySpeedRange.setAttribute('aria-valuetext',replayPlayback.rate+'×');
  ui.replaySpeedRange.style.setProperty('--speed-progress',
    (speedIndex(replayPlayback.rate)/(REPLAY_SPEED_STOPS.length-1)*100)+'%');
  ui.replaySpeedValue.textContent=replayPlayback.rate+'×';
  for(const b of ui.replayOverlayChoices
  .querySelectorAll<HTMLButtonElement>('[data-overlay-choice]')){
  b.addEventListener('click',()=>{
    const choice=b.dataset.overlayChoice;
    replayAnalysisUi.replayPreset='custom';
    if(choice==='names')replayNameTags=!replayNameTags;
    else if(choice==='contacts')replayContactMarkers=!replayContactMarkers;
    else if(choice==='plans')replayPlanScope=
      replayPlanScope==='none'?'selected':'none';
    else if(choice==='objectives')replayObjectiveMarkers=!replayObjectiveMarkers;
    else if(choice==='clear')clearReplayPresentation();
    else if(choice==='show'){
      replayNameTags=true;replayContactMarkers=true;
      replayPlanScope='selected';replayObjectiveMarkers=true;
    }
    updateReplayHud();
    if(choice==='clear'||choice==='show')replayAnalysisUi.closeReplayChoices();
  });
}
for(const b of ui.replaySpeedChoices.querySelectorAll<HTMLButtonElement>('[data-speed-choice]')){
    b.disabled=replayQuickVideo.active;
    b.setAttribute('aria-pressed',String(Number(b.dataset.speedChoice)===replayPlayback.rate));
  }
  const loop=replayPlayback.loopRange(recorder.duration);
  ui.replayLoopIn.textContent=replayPlayback.loopIn===null?'SET LOOP IN':
    'IN '+formatReplayTime(replayPlayback.loopIn);
  ui.replayLoopOut.textContent=replayPlayback.loopOut===null?'SET LOOP OUT':
    'OUT '+formatReplayTime(replayPlayback.loopOut);
  ui.replayLoopToggle.textContent=replayPlayback.loopEnabled?'LOOP ON':'LOOP OFF';
  ui.replayLoopToggle.disabled=!loop||replayQuickVideo.active;
  ui.replayLoopIn.disabled=replayQuickVideo.active;
  ui.replayLoopOut.disabled=replayQuickVideo.active;
  ui.replayLoopToggle.setAttribute('aria-pressed',String(replayPlayback.loopEnabled));
  ui.replayExportVideo.textContent=replayQuickVideo.active?'STOP VIDEO':'VIDEO 20S';
  ui.replaySpeed.disabled=replayQuickVideo.active;
  ui.replaySound.textContent=audioController.replaySoundEnabled?'SOUND ON':'SOUND OFF';
  ui.replaySound.setAttribute('aria-pressed',String(audioController.replaySoundEnabled));
  ui.replaySpeed.title='Playback speed '+replayPlayback.rate+'× · Tap to change';
  ui.replaySpeed.setAttribute('aria-label',
    'Playback speed '+replayPlayback.rate+' times. Tap to select next speed');
  ui.replaySight.textContent=replayKnowledge.omniscient?'FULL VIEW':'TEAM SIGHT';
  const replaySightMode=replayKnowledge.observerId?'operator':
    replayKnowledge.omniscient?'full':'team';
  ui.replayDirectSight.value=replaySightMode;
  ui.replaySightTrigger.querySelector('small')!.textContent=replaySightMode.toUpperCase();
  ui.replaySightTrigger.setAttribute('aria-label','Visibility: '+replaySightMode+' sight');
  for(const b of ui.replaySightChoices.querySelectorAll<HTMLButtonElement>('[data-sight-choice]')){
    b.setAttribute('aria-pressed',String(b.dataset.sightChoice===replaySightMode));
    b.disabled=b.dataset.sightChoice==='operator'&&!replayKnowledge.hasContactEvidence;
  }
  ui.replayDirectSight.querySelector<HTMLOptionElement>('option[value="operator"]')!
    .disabled=!replayKnowledge.hasContactEvidence;
  ui.replayDirectTracers.setAttribute('aria-pressed',
    String(replayTraceMode!=='off'));
  // Both director lenses keep walls opaque but cut away the ceiling.
  // The tactical X-ray toggle must not influence either film audition.
  ui.replayDirectXray.disabled=replayCamera.mode==='director';
  ui.replayDirectXray.setAttribute('aria-pressed',
    String(replayCamera.mode!=='director'&&replayXrayOn));
  ui.replayDirectXray.title=replayCamera.mode==='director'?
    'Director: solid walls, removed ceiling; wall X-ray unavailable':
    replayXrayOn?'Selective Cutaway on: fade only blocking walls':
      'Selective Cutaway off: retain normal architectural opacity';
  ui.replayDirectDirector.setAttribute('aria-pressed',
    String(replayCamera.mode==='director'));
  ui.replayDirectLens.hidden=replayCamera.mode!=='director';
  ui.replayDirectLens.setAttribute('aria-pressed',
    String(replayCamera.lens==='wide'));
  ui.replayDirectLens.setAttribute('aria-label',
    'Director camera lens: '+(replayCamera.lens==='ortho'?
      'in-room orthographic; audition wide perspective':
      'wide perspective audition; return to orthographic'));
  ui.replayDirectLens.title=replayCamera.lens==='ortho'?
    'ORTHO — in-room orthographic; tap to preview wide perspective':
    'WIDE — wide in-room perspective audition; tap for orthographic';
  ui.replayDirectLens.querySelector('small')!.textContent=
    replayCamera.lens==='ortho'?'ORTHO':'WIDE';
  const canBodycam=!!stage&&replayBodycam.observers.includes(replayCamera.followId);
  ui.replayDirectBodycam.hidden=!replayBodycam.active&&replayCamera.mode!=='operator';
  ui.replayDirectBodycam.title=canBodycam?
    'Reconstructed operator camera from recorded observation evidence':
    'This replay lacks recorded personal sight evidence for this operator';
  ui.replayDirectBodycam.disabled=!replayBodycam.active&&!canBodycam;
  ui.replayDirectBodycam.setAttribute('aria-pressed',String(replayBodycam.active));
  ui.replayDirectBodycam.querySelector('small')!.textContent=replayBodycam.active?'EXIT':'CAM';
  ui.replayDirectBodycam.setAttribute('aria-label',replayBodycam.active?'Exit Bodycam':'Enter Bodycam');
  ui.replayDirectMount.hidden=!replayBodycam.active;
  ui.replayDirectMount.querySelector('small')!.textContent=replayBodycam.mount==='chest'?'CHEST':'HEAD';
  ui.replayDirectMount.setAttribute('aria-label','Bodycam mount: '+replayBodycam.mount);
  ui.replayDirectFree.hidden=replayCamera.mode==='free'&&!replayBodycam.active;
  ui.replayDirectFree.querySelector('small')!.textContent=replayBodycam.active?'EXIT':'FREE';
  ui.replayDirectFree.setAttribute('aria-label',replayBodycam.active?'Exit Bodycam camera':'Free camera');
  ui.replayContactLens.disabled=!replayKnowledge.hasContactEvidence;
  ui.replayContactLens.textContent=replayKnowledge.observerId?
    'CONTACTS: '+replayKnowledge.observerId.toUpperCase():'CONTACTS: TEAM';
  ui.replayContactLens.title=replayKnowledge.hasContactEvidence?
    'Only confirmed enemy contacts and own activity; team map remains shared':
    'This recording has no individual operator contact evidence';
  ui.replayContactNote.hidden=!replayKnowledge.observerId;
  ui.replayContactNote.textContent=replayBodycam.active?
    'RECONSTRUCTED FIRST PERSON · PERSONAL CONTACTS · STRUCTURAL MAP FROM SHARED RECORDING.':
    replayKnowledge.groundLensOn?
    'GOLD CELLS: INDIVIDUALLY OBSERVED FLOOR · WORLD OBJECTS STILL SQUAD STATE · 2D ONLY.':
    'PERSONAL CONTACTS / LAST-SEEN DOORS · MAP/PROPS REMAIN SQUAD KNOWLEDGE. SHOT PATHS HIDDEN.';
  ui.replayGroundLens.disabled=!replayKnowledge.observerId||
    !replayKnowledge.personalGround||replayBodycam.active;
  ui.replayBodycam.disabled=!stage||!replaying||
    replayBodycam.observers.length===0;
  ui.replayBodycam.textContent=replayBodycam.active?'BODYCAM ON':'BODYCAM OFF';
  ui.replayBodycam.setAttribute('aria-pressed',String(replayBodycam.active));
  ui.replayBodycamMount.disabled=!replayBodycam.active;
  ui.replayBodycamMount.textContent='MOUNT '+replayBodycam.mount.toUpperCase();
  ui.replayBodycamStatus.hidden=!replayBodycam.active;
  if(replayBodycam.active&&replayKnowledge.observerId)
    ui.replayBodycamStatus.textContent=bodycamDisclosureLabel(
      replayKnowledge.observerId,replayBodycam.mount,
      replayBodycam.groundObservers.has(replayKnowledge.observerId));
  ui.replayGroundLens.textContent=replayKnowledge.groundLensOn?
    'GROUND: PERSONAL':'GROUND: OFF';
  ui.replayGroundLens.setAttribute('aria-pressed',
    String(replayKnowledge.groundLensOn));
  ui.replayView.textContent=viewMode.toUpperCase();
  ui.replayQuickView.value=viewMode;
  ui.replayQuickView.disabled=replayBodycam.active;
  ui.replayViewTrigger.querySelector('small')!.textContent=
    viewMode==='plan2d'?'PLAN':viewMode.toUpperCase();
  ui.replayViewTrigger.setAttribute('aria-label','Perspective: '+viewMode);
  ui.replayViewTrigger.disabled=replayBodycam.active;
  for(const b of ui.replayViewChoices.querySelectorAll<HTMLButtonElement>('[data-view-choice]'))
    b.setAttribute('aria-pressed',String(b.dataset.viewChoice===viewMode));
  ui.replayView.disabled=replayBodycam.active;
  ui.replayFollow.textContent=replayCamera.follow?'FOLLOW '+replayCamera.followId.toUpperCase():'FOLLOW';
  ui.replaySquad.textContent=replayCamera.mode==='squad'?'SQUAD ON':'FOLLOW SQUAD';
  ui.replayDirector.textContent=replayCamera.mode==='director'?'DIRECTOR ON':'DIRECTOR OFF';
  ui.replayQuickCamera.value=replayCamera.mode==='operator'?
    'operator:'+replayCamera.followId:replayCamera.mode;
  for(const option of ui.replayQuickCamera.options){
    const value=option.value;
    const mode:ReplayCameraChoice=value.startsWith('operator:')?'operator':
      value as ReplayCameraChoice;
    option.disabled=resolvedReplayCamera(mode,viewMode as ReplayPerspective,
      !!stage,replayBodycam.active)!==mode;
  }
  ui.replayQuickCamera.disabled=replayBodycam.active;
  if(team(state).some(a=>a.id===selected))ui.replayInspectActor.value=selected;
  for(const b of ui.replayInspectActorButtons.querySelectorAll<HTMLButtonElement>('[data-follow-actor]'))
    b.setAttribute('aria-pressed',String(replayCamera.mode==='operator'&&
      b.dataset.followActor===replayCamera.followId));
  ui.replaySquad.setAttribute('aria-pressed',String(replayCamera.mode==='squad'));
  ui.replayDirector.setAttribute('aria-pressed',String(replayCamera.mode==='director'));
  ui.replaySquad.disabled=viewMode==='plan2d'||!stage||replayBodycam.active;
  ui.replayDirector.disabled=viewMode==='plan2d'||!stage||replayBodycam.active;
  ui.replayFollow.disabled=viewMode==='plan2d'||!stage||replayBodycam.active;
  ui.replayAnalysis.textContent=replayAnalysis?'ANALYSIS ON':'ANALYSIS';
  ui.replayPlans.textContent='PLANS '+replayPlanScope.toUpperCase();
  ui.replayPlanVersion.textContent='PLAN '+replayPlanVersion.toUpperCase();
  ui.replayNames.textContent=replayNameTags?'NAMES ON':'NAMES OFF';
  replayAnalysisUi.syncReplayOverlayChoices();
  ui.replayTraces.textContent='TRACES '+replayTraceMode.toUpperCase();
  ui.replayGhosts.textContent='GHOSTS '+replayGhostMode.toUpperCase();
  ui.replayTrails.textContent='ACTUAL PATH '+replayTrailMode.toUpperCase();
  ui.replayPlans.setAttribute('aria-pressed',String(replayPlanScope!=='none'));
  ui.replayNames.setAttribute('aria-pressed',String(replayNameTags));
  for(const button of ui.replayPresets.querySelectorAll<HTMLButtonElement>('[data-replay-preset]'))
    button.setAttribute('aria-pressed',String(button.dataset.replayPreset===replayAnalysisUi.replayPreset));
  ui.replayPresetStatus.textContent=replayAnalysisUi.replayPreset==='custom'?'CUSTOM SETTINGS':'';
  ui.replayShareToggle.textContent=replayQuickVideo.active?'■ STOP VIDEO':'SAVE / SHARE';
  const replaySaved=!!(replayLibrary.activeSavedReplayId||replayLibrary.isRecorderSaved(recorder));
  ui.replaySaveArchive.disabled=replayLibrary.busy||replaySaved;
  ui.replaySaveArchive.textContent=replaySaved?'SAVED TO LIBRARY':'SAVE REPLAY';
  ui.replayShareToggle.setAttribute('aria-label',replayQuickVideo.active?
    'Stop replay video recording':'Open replay save and share');
  ui.replayPrevEvent.disabled=!replayAnalysisUi.replayEventIndex?.previous(replayPlayback.time);
  ui.replayNextEvent.disabled=!replayAnalysisUi.replayEventIndex?.next(replayPlayback.time);
  const event=replayAnalysisUi.replayEventIndex?.latest(replayPlayback.time+.14);
  ui.replayEventText.textContent=event&&replayPlayback.time-event.t<6.5?
    formatReplayTime(event.t)+' · '+event.text:
    replayPlayback.time<.5?'TAP AN OPERATOR TO FOLLOW · PLAYBACK STARTING':
    'NO RECENT RECORDED ACTION';
  const status=replayQuickVideo.active?'● RECORDING':
    replayPlayback.incident?.loop?'INCIDENT LOOP':
    replayPlayback.incident?'WATCHING MOMENT':
    replayPlayback.loopEnabled?'A/B LOOP':
    replayCamera.mode==='director'&&performance.now()<replayDirector.editNoticeUntil?
      'DIRECTOR EDIT · +'+replayDirector.editNoticeSeconds.toFixed(1)+'S':'';
  ui.replayStatusChip.textContent=status;
  ui.replayStatusChip.hidden=!status;
  replayAnalysisUi.syncReplayEventFeed();
}
/** Display compact clusters, not dozens of overlapping tap targets.
 * The scrubber and event navigation remain the accessible interactions.
 */

function enterReplay(){
  if(replaying||recorder.frames.length<2)return;
  finishedSession=state;replaying=true;
  replayPlayback.reset();replayPlayback.play();
  replayCamera.reset(stage);
  replayKnowledge.omniscient=false;hudController.facing.looking=false;flashMode=false;
  replayKnowledge.observerId=null;
  replayBodycam.active=false;replayBodycam.mount='chest';
  // Selective CUTAWAY is a harmless presentation default: only blocking
  // walls fade. The visible control can turn it off at any time.
  replayXrayOn=true;stage?.setReplayXray(true);
  replayBodycam.observers=[];replayBodycam.groundObservers.clear();
  replayKnowledge.prepare(recorder);
  replayKnowledge.omniscient=false;
  replayKnowledge.groundLensOn=false;replayKnowledge.groundCacheObserver=null;
  replayKnowledge.groundCacheCount=-1;replayKnowledge.groundCacheSite=null;
  replayAnalysis=false;
  replayDirector.indexPlans(recorder.plans.revisions);
  
  replayAnalysisUi.startSession();
  replayPlanScope='none';replayPlanVersion='active';
  replayNameTags=true;replayContactMarkers=true;
  replayObjectiveMarkers=true;
  replayTraceMode='off';replayGhostMode='off';
  replayTrailMode='off';

  replayMovementHistory=new ReplayMovementHistory(recorder.frames,
    team(finishedSession).map(a=>a.id));
  audioController.beginReplay(recorder);
  audioController.unlock();
  replayAnalysisUi.showReplayToolTab(null);
  state=missionController.createReplaySession(recorder,finishedSession);
  replayCamera.followId=team(state)[0]?.id??'rook';
  populateReplayCameraChoices();
  populateReplayInspectActors();
  replayBodycam.observers=bodycamEligibleObserverIds(
    recorder.frames.find(f=>!!f.knowledge?.operatorVisibleActorIds)?.knowledge,
    team(state).map(a=>a.id));
  replayBodycam.groundObservers=new Set(replayBodycam.observers.filter(id=>
    bodycamHasPersonalGround(recorder.personalGround,id)));
  stage?.applySite(state.site??null);
  stage?.setReplayBodycam(null);
  // The Director must build against the actual recorded site, not the prior
  // live session (which may be a different map when loading a saved replay).
  rebuildReplayEventIndex();
  // One-time historical index; only recorded friendly coordinates and
  // recorded door geometry, never current world positions or hidden AI.
  replayAnalysisUi.rebuildReplaySquadEntries();
  document.body.classList.add('replaying');
  ui.replayPanel.hidden=false;
  ui.replayTopHud.hidden=false;ui.replayRail.hidden=false;
  replayAnalysisUi.setReplayRailCollapsed(false);replayAnalysisUi.setReplayDockCollapsed(false);
  ui.replaySeek.max=String(Math.max(1,Math.ceil(recorder.duration*60)));
  replayAnalysisUi.renderReplayEventMarkers();seekReplay(0);updateHud();
}
function exitReplay(){
  if(!replaying)return;
  if(replayQuickVideo.active)replayQuickVideo.stop();
  stopReplayBodycam();replayBodycam.observers=[];
  replayXrayOn=false;stage?.setReplayXray(false);
  replayCamera.reset(stage);
  replayPlayback.reset();
  replayBodycam.groundObservers.clear();
  replaying=false;replayPresentation=null;
  replayAnalysisUi.reset();
  replayKnowledge.reset();
  replayMovementHistory=null;audioController.endReplay();
  document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  ui.replayTopHud.hidden=true;ui.replayRail.hidden=true;
  replayAnalysisUi.closeReplayChoices();
  if(finishedSession)state=missionController.resumeLiveSession(finishedSession);
  finishedSession=null;fog2D.invalidate();
  replayLibrary.afterReplayExit();
  stage?.applySite(state.site??null);
  updateHud();
}
/** Replay Library: load metadata only until a recording is selected.
 * No campaign result, equipment persistence, or live session is modified.
 */
const replayLibrary=createBreachReplayLibraryController({
  ui:{
    replayLibraryDialog:ui.replayLibraryDialog,
    replayLibraryStatus:ui.replayLibraryStatus,
    replayLibraryList:ui.replayLibraryList,
    replayLibraryBackdrop:ui.replayLibraryBackdrop,
    replayImportButton:ui.replayImportButton,
    replayImportInput:ui.replayImportInput,
    openReplayLibrary:ui.openReplayLibrary,
    closeReplayLibrary:ui.closeReplayLibrary,
    saveReplayDebrief:ui.saveReplayDebrief,
    replaySaveArchive:ui.replaySaveArchive,
    favoriteMission:ui.favoriteMission,
    favoriteMissionsList:ui.favoriteMissionsList,
    replayExportJson:ui.replayExportJson
  },
  showUiHelp,closeMissionSettings,isReplaying:()=>replaying,
  getRecorder:()=>recorder,
  setRecorder:value=>{recorder=value;},
  getBookmarks:()=>replayAnalysisUi.replayBookmarks,
  applyLoadedBookmarks:marks=>replayAnalysisUi.restoreBookmarks(marks),
  enterReplay,exitReplay,refreshHud:updateHud,
  getFavoriteDraft:()=>state.site?{
    start:missionController.start,
    label:state.site.name+' · '+state.missionType.toUpperCase()
  }:null,
  playFavorite:restoreFavoriteMission,
  canPlayFavorite:()=>campaignMode!=='mission',
  hideCampaignScreen:()=>campaignScreen.hide(),
  returnToCampaignMenu:()=>{
    campaignMode='menu';campaignScreen.entry(!!campaign);
  }
});
ui.watchReplay.addEventListener('click',()=>{
  replayLibrary.markDebriefEntry();enterReplay();
});
const replayTimeline=createBreachReplayTimelineController({
  ui:{
    replayPlay:ui.replayPlay,replayMiniPlay:ui.replayMiniPlay,
    replayBack:ui.replayBack,replayForward:ui.replayForward,
    replayPrevFrame:ui.replayPrevFrame,replayNextFrame:ui.replayNextFrame,
    replayPrevSample:ui.replayPrevSample,replayNextSample:ui.replayNextSample,
    replayLoopIn:ui.replayLoopIn,replayLoopOut:ui.replayLoopOut,
    replayLoopToggle:ui.replayLoopToggle,
    replaySpeedChoices:ui.replaySpeedChoices,
    replaySpeedRange:ui.replaySpeedRange,replaySpeedValue:ui.replaySpeedValue,
    replayQuickSpeed:ui.replayQuickSpeed,replaySpeed:ui.replaySpeed,
    replaySeek:ui.replaySeek,replayClusterMenu:ui.replayClusterMenu
  },
  playback:replayPlayback,
  duration:()=>recorder.duration,
  samples:()=>recorder.frames,
  isVideoActive:()=>replayQuickVideo.active,
  seek:seekReplay,stopAudio:()=>audioController.stopReplaySounds(),
  unlockAudio:()=>audioController.unlock(),
  refreshHud:updateReplayHud,showHelp:showUiHelp
});

const replayAnalysisUi=createBreachReplayAnalysisController({
 ui,playback:replayPlayback,camera:replayCamera,knowledge:replayKnowledge,
 getRecorder:()=>recorder,getSession:()=>state,shotVisible:historicalShotVisible,
 seek:seekReplay,presentCurrent:presentReplayAtCurrentTime,refreshHud:updateReplayHud,
 selectActor:id=>{selected=id;},
 enableMovementAnalysis:()=>{
   replayAnalysis=true;replayPlanScope='selected';
   replayPlanVersion='active';replayTrailMode='recent';
 },
 markRecentTrace:()=>{replayTraceMode='recent';},
 applyPreset:applyReplayPreset,
 getOverlayState:()=>({
   names:replayNameTags,contacts:replayContactMarkers,
   plans:replayPlanScope!=='none',objectives:replayObjectiveMarkers
 }),
 isVideoActive:()=>replayQuickVideo.active,
 persistBookmarks:()=>replayLibrary.persistCurrentBookmarks(),
 unlockAudio:()=>audioController.unlock(),showHelp:showUiHelp,
 focusShot:shot=>{
   chooseReplayCamera('free');replayCamera.follow=false;replayPlayback.pause();
   if(stage&&viewMode!=='plan2d'){
     stage.view.focus={...shot.end};
     stage.view.zoom=Math.max(stage.view.zoom,1.7);
     stage.updateCamera(1);
   }else{
     const projected=worldToScreen(shot.end);
     panX+=cssW/2-projected.x;panY+=cssH/2-projected.y;
     layout();
   }
   updateReplayHud();
 }
});
replayAnalysisUi.bindReplayUi();
ui.replayQuickView.addEventListener('change',()=>{
  if(replayBodycam.active)return;
  const next=ui.replayQuickView.value as ReplayPerspective;
  if(!['iso','top','plan2d'].includes(next))return;
  cameraMode(next);
  chooseReplayCamera(resolvedReplayCamera(replayCamera.mode,next,!!stage,replayBodycam.active));
  
  updateReplayHud();
});
ui.replayInspectActor.addEventListener('change',()=>{
  const id=ui.replayInspectActor.value;
  if(!team(state).some(a=>a.id===id))return;
  selected=id;
  if(replayCamera.mode==='operator'){
    replayCamera.followId=id;advanceReplayCamera(0,true);
  }
  updateReplayHud();
});
ui.replayInspectFollow.addEventListener('click',()=>{
  const id=ui.replayInspectActor.value;
  if(!team(state).some(a=>a.id===id)||replayBodycam.active)return;
  if(viewMode==='plan2d')cameraMode('iso');
  selected=id;replayCamera.followId=id;chooseReplayCamera('operator');replayCamera.follow=true;
  advanceReplayCamera(0,true);updateReplayHud();
});
ui.replayInspectMovement.addEventListener('click',()=>{
  const id=ui.replayInspectActor.value;
  if(!team(state).some(a=>a.id===id))return;
  selected=id;applyReplayPreset('movement');
});
ui.replayQuickCamera.addEventListener('change',()=>{
  if(replayBodycam.active)return;
  const choice=ui.replayQuickCamera.value;
  const mode:ReplayCameraChoice=choice.startsWith('operator:')?
    'operator':choice as ReplayCameraChoice;
  if(!['free','operator','squad','director'].includes(mode)||
      resolvedReplayCamera(mode,viewMode as ReplayPerspective,!!stage,replayBodycam.active)!==mode)
    return;
  if(mode==='operator'){
    const id=choice.slice('operator:'.length);
    if(!team(state).some(a=>a.id===id))return;
    replayCamera.followId=id;
  }
  chooseReplayCamera(mode);replayCamera.follow=mode==='operator';
  advanceReplayCamera(0,true);updateReplayHud();
});

audioController.bindReplayMute(ui.replaySound,updateReplayHud);
function changeReplaySight(mode:'team'|'full'|'operator'):void{
  if(mode==='operator'){
    if(!replayKnowledge.hasContactEvidence)return;
    const eligible=replayBodycam.observers;
    const next=eligible.includes(replayCamera.followId)?replayCamera.followId:
      eligible.includes(selected)?selected:eligible[0];
    if(!next)return;
    replayKnowledge.observerId=next;
    replayKnowledge.omniscient=false;
    replayAnalysisUi.closeReplayShotInspector();
    if(replayBodycam.active)applyReplayBodycamMount();
  }else{
    if(replayBodycam.active)stopReplayBodycam();
    replayKnowledge.groundLensOn=false;replayKnowledge.observerId=null;
    replayKnowledge.omniscient=mode==='full';
  }
  fog2D.invalidate();
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
}
function followReplayOperator(id:string):void{
  if(!replaying||!team(state).some(a=>a.id===id&&a.health>0))return;
  if(replayBodycam.active)stopReplayBodycam();
  if(viewMode==='plan2d'&&stage)cameraMode('iso');
  selected=id;replayCamera.followId=id;
  chooseReplayCamera('operator');replayCamera.follow=true;
  if(replayKnowledge.observerId){
    replayKnowledge.observerId=replayBodycam.observers.includes(id)?id:null;
    fog2D.invalidate();rebuildReplayEventIndex();
    replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  }
  advanceReplayCamera(0,true);
  updateReplayHud();
}
ui.replayDirectSight.addEventListener('change',()=>{
  const mode=ui.replayDirectSight.value;
  if(mode==='team'||mode==='full'||mode==='operator')
    changeReplaySight(mode);
});
ui.replayDirectTracers.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayTraceMode=replayTraceMode==='off'?'recent':'off';
  updateReplayHud();
});
ui.replayDirectXray.addEventListener('click',()=>{
  replayXrayOn=!replayXrayOn;
  stage?.setReplayXray(replayXrayOn);
  updateReplayHud();
});
ui.replayDirectDirector.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(viewMode!=='iso'&&stage)cameraMode('iso');
  chooseReplayCamera(replayCamera.mode==='director'?'free':'director');
  replayCamera.follow=false;
  replayDirector.target=null;
  
  advanceReplayCamera(1/60,false);updateReplayHud();
});
ui.replayDirectLens.addEventListener('click',()=>{
  if(!replaying||replayCamera.mode!=='director')return;
  replayCamera.lens=replayCamera.lens==='ortho'?'wide':'ortho';
  // Same exact film timestamp, room and camera anchor: honest A/B
  // comparison of projection/framing, without a reactive shot recut.
  advanceReplayCamera(0,true);
  updateReplayHud();
});
ui.replayDirectBodycam.addEventListener('click',()=>{
  if(replayBodycam.active){
    const returnId=replayCamera.followId;
    stopReplayBodycam();
    followReplayOperator(returnId);
  }else{
    if(replayCamera.mode!=='operator'||
      !replayBodycam.observers.includes(replayCamera.followId))return;
    replayKnowledge.observerId=replayCamera.followId;
    if(!startReplayBodycam())return;
  }
  fog2D.invalidate();rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  updateReplayHud();
});
ui.replayDirectMount.addEventListener('click',()=>ui.replayBodycamMount.click());
ui.replayDirectFree.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  chooseReplayCamera('free');replayCamera.follow=false;
  updateReplayHud();
});
ui.replaySight.addEventListener('click',()=>{
  stopReplayBodycam();
  replayKnowledge.groundLensOn=false;
  replayKnowledge.observerId=null;
  replayKnowledge.omniscient=!replayKnowledge.omniscient;fog2D.invalidate();
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
/** Only Vite DEVELOPMENT + explicit QA query can access this hook.
 * Production builds strip it; normal replay has NO Bodycam button yet.
 * Browser smoke uses historical replay disclosure, never simulated LOS.
 */
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('bodycamqa')){
  type BodycamQa={
    activate:(mount:'chest'|'helmet')=>boolean;
    seek:(time:number)=>boolean;
    stop:()=>void;
    diagnostic:()=>ReturnType<TacticalScene3D['inspectReplayBodycamQa']>|null;
    /** Read-only candidate taps; browser must author with real pointer input. */
    routeCandidates:()=>Array<{world:Pt;screen:Pt}>;
    planned:()=>{actorId:string;path:Pt[]}|null;
    motionSamples:()=>Array<{at:number;p:Pt;heading:number}>;
    prepareIndoorEntry:()=>boolean;
    indoorEntryReview:()=>ReplaySquadEntryReview|null;
  };
  const qa:BodycamQa={
    activate(mount){
      if(!replaying||!stage||viewMode==='plan2d')return false;
      const observer=team(state)[0];
      if(!observer||!recorder.frames[0]?.knowledge?.operatorVisibleActorIds?.[observer.id])
        return false;
      replayKnowledge.observerId=observer.id;
      replayKnowledge.omniscient=false;
      replayKnowledge.groundLensOn=false;
      replayPlayback.pause();
      chooseReplayCamera('free');
      selected=observer.id;
      replayCamera.followId=observer.id;
      cameraMode('iso');
      stage.setReplayBodycam({actorId:observer.id,mount,
        stabilization:'balanced',fov:95});
      seekReplay(Math.min(.1,recorder.duration));
      updateReplayHud();
      return true;
    },
    seek(time){
      if(!replaying||!Number.isFinite(time))return false;
      replayPlayback.pause();
      seekReplay(Math.max(0,Math.min(time,recorder.duration)));
      return true;
    },
    stop(){
      stage?.setReplayBodycam(null);
      replayKnowledge.observerId=null;
      replayKnowledge.omniscient=false;
      fog2D.invalidate();
      if(replaying)updateReplayHud();
    },
    diagnostic:()=>stage?.inspectReplayBodycamQa()??null,
    routeCandidates(){
      if(replaying||!stage||state.phase!=='planning')return [];
      const actor=team(state)[0];if(!actor)return [];
      const result:Array<{world:Pt;screen:Pt}>=[];
      for(const radius of [55,78,105,42])
        for(const bearing of [0,-.6,.6,-1.15,1.15,2.1,-2.1]){
          const angle=actor.heading+bearing;
          const world={x:actor.p.x+Math.cos(angle)*radius,
            y:actor.p.y+Math.sin(angle)*radius};
          if(!intelPassable(world,state.intel,SQUEEZE_RADIUS))continue;
          const screen=worldToScreen(world,0);
          if(screen.x<35||screen.x>cssW-35||
             screen.y<85||screen.y>cssH-200)continue;
          if(team(state).some(a=>distance(
             worldToScreen(a.p,24),screen)<38))continue;
          result.push({world,screen});
        }
      return result;
    },
    planned(){
      const actor=team(state)[0];
      return actor?{actorId:actor.id,
        path:actor.plan.filter(n=>n.kind==='move').map(n=>({...n.p}))}:null;
    },
    motionSamples(){
      const id=team(state)[0]?.id;
      if(!id)return [];
      return recorder.frames.flatMap(f=>{
        const actor=f.actors.find(a=>a.id===id);
        return actor?[{at:f.t,p:{...actor.p},heading:actor.heading}]:[];
      });
    },
    prepareIndoorEntry(){
      // Deterministic two-room indoor training fixture: two enclosed roofs,
      // one physical hinged doorway. This still uses the real session motor,
      // authored MOVE orders and normal MissionRecorder; no replay synthesis.
      if(replaying||state.phase!=='planning')return false;
      const at=(x:number,y:number):Pt=>({x,y});
      const site:Site={
        seed:731,name:'BODYCAM INDOOR ENTRY / QA',layout:'corridor',
        training:true,archetype:'office',roomCount:2,
        rooms:[
          {id:'entry-room',x:240,y:110,w:140,h:150,
            kind:'room',tone:.42,purpose:'lobby'},
          {id:'inner-room',x:240,y:260,w:140,h:180,
            kind:'room',tone:.39,purpose:'office'}
        ],
        walls:[
          {a:at(240,110),b:at(380,110)},
          {a:at(240,110),b:at(240,440)},
          {a:at(380,110),b:at(380,440)},
          {a:at(240,440),b:at(380,440)},
          {a:at(240,260),b:at(290,260)},
          {a:at(332,260),b:at(380,260)}
        ],
        doors:[{id:'ENTRY',a:at(290,260),b:at(332,260),
          kind:'hinged',hinge:'a',swing:-1,open:true,openedAt:0}],
        cover:[],windows:[],entrance:at(311,200),
        spawn:[at(300,200),at(308,173),at(316,146),at(325,119)],
        enemies:[],objective:at(320,400),extract:at(325,420),
        bounds:{minX:0,minY:0,maxX:640,maxY:500}
      };
      reset(0,731,'hold',site);
      const crew=team(state).slice(0,4);
      if(crew.length!==4)return false;
      const goals=[at(300,350),at(312,365),at(325,380),at(339,394)];
      const accepted=crew.every((actor,i)=>
        planMove(state,actor.id,goals[i]));
      updateHud();return accepted;
    },
    indoorEntryReview(){
      if(recorder.frames.length<2)return null;
      return measureReplaySquadDoorEntry(recorder.frames,'ENTRY',
        team(state).map(a=>a.id),0,recorder.duration);
    }
  };
  (window as typeof window&{__fieldworkBodycamQa?:BodycamQa})
    .__fieldworkBodycamQa=qa;
}
ui.replayContactLens.addEventListener('click',()=>{
  if(!replayKnowledge.hasContactEvidence)return;
  const known=recorder.frames.find(f=>
    !!f.knowledge?.operatorVisibleActorIds)?.knowledge;
  const ids=team(state).map(a=>a.id).filter(id=>
    operatorContactAvailable(known,id));
  if(!ids.length)return;
  const at=replayKnowledge.observerId===null?-1:
    ids.indexOf(replayKnowledge.observerId);
  replayKnowledge.observerId=at>=ids.length-1?null:ids[at+1];
  if(!replayKnowledge.observerId){
    replayKnowledge.groundLensOn=false;stopReplayBodycam();
  }else if(replayBodycam.active){
    if(replayBodycam.observers.includes(replayKnowledge.observerId))
      applyReplayBodycamMount();
    else stopReplayBodycam();
  }
  if(replayKnowledge.observerId){
    replayKnowledge.omniscient=false;
    selected=replayKnowledge.observerId;
    replayCamera.followId=replayKnowledge.observerId;
    replayAnalysisUi.closeReplayShotInspector();
  }
  fog2D.invalidate();
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
ui.replayGroundLens.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(!replayKnowledge.observerId||!replayKnowledge.personalGround)return;
  replayKnowledge.groundLensOn=!replayKnowledge.groundLensOn;
  if(replayKnowledge.groundLensOn&&viewMode!=='plan2d')cameraMode('plan2d');
  replayKnowledge.groundCacheObserver=null;
  replayKnowledge.groundCacheCount=-1;
  updateReplayHud();
});
ui.replayBodycam.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  else if(!startReplayBodycam())return;
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
ui.replayBodycamMount.addEventListener('click',()=>{
  if(!replayBodycam.active)return;
  replayBodycam.mount=replayBodycam.mount==='chest'?'helmet':'chest';
  applyReplayBodycamMount();updateReplayHud();
});
ui.replayView.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  cameraMode(viewMode==='iso'?'top':viewMode==='top'?'plan2d':'iso');
  chooseReplayCamera(resolvedReplayCamera(replayCamera.mode,
    viewMode as ReplayPerspective,!!stage,replayBodycam.active));
  
  updateReplayHud();
});

ui.replayFollow.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(replayCamera.follow){
    const i=squadIds.indexOf(replayCamera.followId as typeof squadIds[number]);
    if(i===squadIds.length-1)replayCamera.follow=false;
    else replayCamera.followId=squadIds[i+1];
  }else replayCamera.follow=true;
  chooseReplayCamera(replayCamera.follow?'operator':'free');
  advanceReplayCamera(0,true);updateReplayHud();
});
ui.replaySquad.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  chooseReplayCamera(replayCamera.mode==='squad'?'free':'squad');
  replayCamera.follow=false;advanceReplayCamera(0,true);updateReplayHud();
});
ui.replayDirector.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  chooseReplayCamera(replayCamera.mode==='director'?'free':'director');
  replayCamera.follow=false;advanceReplayCamera(0,true);updateReplayHud();
});
ui.replayAnalysis.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayAnalysis=!replayAnalysis;updateReplayHud();
});
ui.replayPlans.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayPlanScope=replayPlanScope==='selected'?'all':
    replayPlanScope==='all'?'none':'selected';
  updateReplayHud();
});
ui.replayNames.addEventListener('click',()=>{
  replayNameTags=!replayNameTags;updateReplayHud();
});
ui.replayPlanVersion.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayPlanVersion=replayPlanVersion==='active'?'original':'active';
  updateReplayHud();
});
ui.replayTraces.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayTraceMode=replayTraceMode==='off'?'recent':
    replayTraceMode==='recent'?'selected':'off';
  updateReplayHud();
});
ui.replayGhosts.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayGhostMode=replayGhostMode==='off'?'selected':
    replayGhostMode==='selected'?'squad':'off';
  updateReplayHud();
});
ui.replayTrails.addEventListener('click',()=>{
  replayAnalysisUi.replayPreset='custom';
  replayTrailMode=replayTrailMode==='off'?'recent':
    replayTrailMode==='recent'?'full':'off';
  updateReplayHud();
});
ui.replayExportVideo.addEventListener('click',()=>{
  if(replayQuickVideo.active){
    replayQuickVideo.stop();ui.replayExportVideo.textContent='VIDEO 20S';return;
  }
  audioController.unlock();
  const videoAudioStream=audioController.beginVideoCapture();
  if(replayPlayback.time>=recorder.duration-.2)seekReplay(0);
  replayPlayback.prepareVideoExport();
  const started=replayQuickVideo.start(replayPlayback.time,
    {width:cssW,height:cssH},videoAudioStream);
  if(!started){
    audioController.endVideoCapture();
    showUiHelp('VIDEO CAPTURE NOT SUPPORTED IN THIS BROWSER',4200);
    return;
  }
  replayPlayback.play();
  ui.replayExportVideo.textContent='STOP VIDEO';
  ui.replayExportVideo.title=replayQuickVideo.audioTrackCount?
    'Recording replay video with audio':'Recording replay video without audio';
  updateReplayHud();
});
ui.replayExit.addEventListener('click',exitReplay);
/** A mission transition is an ordered release → creation → mount.
 * The lifecycle controller owns Session construction, snapshots, and recording;
 * the presentation owners release only their own graphics, UI and sound.
 */
function releaseMissionPresentation():void{
  if(replayQuickVideo.active)replayQuickVideo.stop();
  if(replaying){
    stopReplayBodycam();
    replayCamera.reset(stage);
    replayKnowledge.reset();
    audioController.endReplay();
    replayXrayOn=false;stage?.setReplayXray(false);
  }
  replaying=false;replayPlayback.pause();finishedSession=null;
  replayLibrary.resetSession();
  // Clear old recording indexes and UI selections on every replacement.
  replayAnalysisUi.reset();replayPresentation=null;
  replayMovementHistory=null;
  replayDirector.reset();
  replayKnowledge.reset();
  replayBodycam.observers=[];replayBodycam.groundObservers.clear();
  audioController.endReplay();
  recordedOperation=null;
  operationsBoard.hidden=true;
  hideWeaponChooser();
  flashMode=false;document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  ui.replayTopHud.hidden=true;ui.replayRail.hidden=true;
  replayAnalysisUi.closeReplayChoices();
  hudController.resetNotices();
  blockedEpisode.clear();
  physicalActionRings.clear();
  missionController.releasePresentation();
}
function mountMissionSession(transition:MissionTransition):void{
  state=transition.session;
  flashDoorId=null;
  if(!transition.deferScene)stage?.applySite(state.site??null);
  selected='rook';hudController.facing.looking=false;
  selectedNode=null;selectedActiveWatch=false;
  doorFocusId=null;draggingNode=null;draggingWatchTarget=false;
  tacticalGestures.clear();cursor=null;trace=null;zoom=1;panX=panY=0;
  fog2D.invalidate();audioController.resetLive();
  recorder=transition.recorder;
  tacticalFeedback.clear();
  if(!transition.deferScene){layout();updateHud();}
}
function reset(next=state.variant,siteSeed?:number,
  missionOverride?:Session['missionType'],prebuiltSite?:Site,
  encounterRisk?:1|2|3,deferScene=false,
  restartStart?:MissionStartSnapshot):void{
  missionController.transition(state,{
    variant:next,seed:siteSeed,missionOverride,prebuiltSite,
    risk:encounterRisk,deferScene,restartStart
  },{
    beforeReplace:releaseMissionPresentation,
    mount:mountMissionSession
  });
}
/** RESTART and debrief RETRY restore the same resolved site, squad and
 * insertion snapshot. NEW SITE deliberately creates a new session instead.
 */
function restartMission():void{
  const start=missionController.restartSnapshot(state);
  const request=missionController.restartRequest(start);
  reset(request.variant,request.seed,request.missionOverride,
    request.prebuiltSite,undefined,false,start);
  missionController.restoreStartingSetup(state,start,entry=>
    console.warn('[Restart mission] Original entry no longer valid',entry));
  recorder=missionController.recordInitial(state);
  layout();updateHud();
}
/* Quick Play uses Map Lab-style progress checkpoints. Percentages represent
 * completed work, not predicted time; expensive 3D mesh creation remains
 * synchronous, but the status is painted immediately before it begins. */
let quickPlayBusy=false;
let quickPlayRun=0;
let quickPlayWorker:Worker|null=null;
let quickPlayReject:((reason:Error)=>void)|null=null;
let quickPlayClockTimer:ReturnType<typeof setInterval>|null=null;
let quickPlayStarted=0,quickPlayLastUpdate=0,quickPlayPercent=0;
const quickPlayPanel=el<HTMLElement>('quickPlayProgress');
const quickPlayBar=el<HTMLProgressElement>('quickPlayBar');
const quickPlayPercentText=el<HTMLOutputElement>('quickPlayPercent');
const quickPlayStageText=el<HTMLElement>('quickPlayStage');
const quickPlayDetailText=el<HTMLElement>('quickPlayDetail');
const quickPlayClockText=el<HTMLElement>('quickPlayClock');
const quickPlayCancelButton=el<HTMLButtonElement>('quickPlayCancel');
function quickPlayCheckpoint(value:number,stageName:string,detail:string){
  quickPlayPercent=Math.max(quickPlayPercent,Math.min(100,Math.round(value)));
  quickPlayBar.value=quickPlayPercent;
  quickPlayPercentText.textContent=quickPlayPercent+'%';
  quickPlayStageText.textContent=stageName;
  quickPlayDetailText.textContent=detail;
  quickPlayLastUpdate=performance.now();
}
function quickPlayClockTick(){
  const elapsed=Math.floor((performance.now()-quickPlayStarted)/1000);
  const quiet=Math.floor((performance.now()-quickPlayLastUpdate)/1000);
  quickPlayClockText.textContent=elapsed+'s elapsed'+
    (quickPlayBusy&&quiet>10?' · Still working on this stage':'');
}
function finishQuickPlayClock(){
  if(quickPlayClockTimer!==null){
    clearInterval(quickPlayClockTimer);quickPlayClockTimer=null;
  }
}
const allowQuickPlayPaint=()=>new Promise<void>(resolve=>
  requestAnimationFrame(()=>setTimeout(resolve,0)));
quickPlayCancelButton.addEventListener('click',()=>{
  if(quickPlayPanel.dataset.state==='error'){
    quickPlayPanel.hidden=true;return;
  }
  if(!quickPlayBusy||quickPlayCancelButton.hidden)return;
  ++quickPlayRun;
  quickPlayReject?.(new Error('Quick Play loading cancelled'));
  quickPlayReject=null;
  quickPlayWorker?.terminate();quickPlayWorker=null;
  quickPlayBusy=false;finishQuickPlayClock();
  quickPlayPanel.hidden=true;
});
async function launchQuickPlay(){
  if(quickPlayBusy)return;
  const id=++quickPlayRun,priorMode=campaignMode;
  const seed=randomSiteSeed(),scale=requestedSiteScale;
  quickPlayBusy=true;quickPlayPercent=0;
  quickPlayPanel.hidden=false;quickPlayPanel.dataset.state='running';
  quickPlayCancelButton.hidden=false;quickPlayCancelButton.textContent='CANCEL';
  quickPlayStarted=performance.now();quickPlayLastUpdate=quickPlayStarted;
  quickPlayCheckpoint(0,'Starting tactical sandbox',
    'Preparing '+scale+' site · seed '+seed);
  quickPlayClockTick();
  finishQuickPlayClock();quickPlayClockTimer=setInterval(quickPlayClockTick,1000);
  try{
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const generated=await new Promise<Extract<QuickPlayGenerationResponse,
       {kind:'done'}>>((resolve,reject)=>{
      quickPlayReject=reject;
      const worker=new Worker(new URL('./quick-play-worker.ts',import.meta.url),
        {type:'module'});
      quickPlayWorker=worker;
      quickPlayCheckpoint(3,'Starting architecture worker',
        'Planning a reproducible tactical environment');
      worker.onmessage=(event:MessageEvent<QuickPlayGenerationResponse>)=>{
        const message=event.data;
        if(id!==quickPlayRun||message.id!==id)return;
        if(message.kind==='progress'){
          quickPlayCheckpoint(message.percent,message.stage,message.detail);
          return;
        }
        worker.terminate();quickPlayWorker=null;quickPlayReject=null;
        if(message.kind==='error')reject(new Error(message.message));
        else resolve(message);
      };
      worker.onerror=event=>{
        event.preventDefault();
        worker.terminate();quickPlayWorker=null;quickPlayReject=null;
        reject(new Error('Architecture worker stopped unexpectedly'));
      };
      const request:QuickPlayGenerationRequest={id,seed,scale};
      worker.postMessage(request);
    });
    if(id!==quickPlayRun)return;
    quickPlayCancelButton.hidden=true;
    quickPlayCheckpoint(76,'Preparing tactical session',
      'Creating squad, navigation, intel and encounter state');
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const sessionStart=performance.now();
    campaignMode='quick';
    // Reuse the completed site rather than compiling the same map again.
    reset(state.variant,seed,undefined,generated.site,undefined,true);
    const sessionMs=Math.round(performance.now()-sessionStart);
    quickPlayCheckpoint(86,'Building 3D environment',
      'Generating room meshes, fixtures, materials and static batches');
    await allowQuickPlayPaint();
    const sceneStart=performance.now();
    stage?.applySite(state.site??null);
    const sceneMs=Math.round(performance.now()-sceneStart);
    // First rendered scene would otherwise construct every friendly rig at
    // once. Spread that expensive, reusable model allocation over paint turns.
    const operatorStart=performance.now();
    const initialTeam=team(state),operatorStageMs:number[]=[];
    for(let i=0;i<initialTeam.length;i++){
      quickPlayCheckpoint(88+Math.floor(6*i/initialTeam.length),
        'Preparing operator models',
        initialTeam[i].name+' · '+(i+1)+' / '+initialTeam.length);
      await allowQuickPlayPaint();
      if(id!==quickPlayRun)return;
      const modelStart=performance.now();
      stage?.prepareOperatorModel(initialTeam[i]);
      const modelMs=Math.round(performance.now()-modelStart);
      operatorStageMs.push(modelMs);
      quickPlayDetailText.textContent=initialTeam[i].name+' ready in '+
        (modelMs/1000).toFixed(2)+'s · '+(i+1)+' / '+initialTeam.length;
    }
    const operatorMs=Math.round(performance.now()-operatorStart);
    quickPlayCheckpoint(95,'Preparing tactical controls',
      'Fitting the camera and updating the mission HUD');
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const hudStart=performance.now();
    layout();updateHud();
    const hudMs=Math.round(performance.now()-hudStart);
    // Shader preparation can use KHR_parallel_shader_compile on capable
    // browsers. It does not pre-render the game or upload the whole wardrobe.
    // Keep an A/B opt-out: ?gpuWarmup=0 allows identical-seed comparisons.
    let shaderPreparationMs=0;
    if(stage&&viewMode!=='plan2d'&&
       new URLSearchParams(location.search).get('gpuWarmup')!=='0'){
      quickPlayCheckpoint(96,'Preparing GPU programs',
        'Warming visible materials before the first 3D draw');
      await allowQuickPlayPaint();
      if(id!==quickPlayRun)return;
      const shaderStart=performance.now();
      try{
        await stage.renderer.compileAsync(stage.scene,stage.camera);
      }catch(error){
        // A failed async warmup must never prevent the ordinary first frame.
        console.warn('[Quick Play shader preparation fallback]',error);
      }
      shaderPreparationMs=Math.round(performance.now()-shaderStart);
      if(id!==quickPlayRun)return;
    }
    // The first WebGL render is the last major synchronous initialization
    // step (costume materials, visibility, fog, shadow atlas and shaders).
    // Keep the loading mask up while it runs and measure its real duration.
    quickPlayCheckpoint(97,'Rendering first 3D frame',
      'Applying uniforms, fog, lighting and GPU materials');
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const firstFrameStart=performance.now();
    if(stage&&viewMode!=='plan2d'){
      stage.update(state,selected,0,doorFocusId,false,null,null,
        recorder.motion.presentation(0,state.operators.map(a=>a.id)));
    }
    render();
    const firstFrameMs=Math.round(performance.now()-firstFrameStart);
    quickPlayCheckpoint(99,'Revealing tactical scene',
      'First render completed · preparing controls');
    campaignScreen.hide();
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const totalMs=Math.round(performance.now()-quickPlayStarted);
    quickPlayCheckpoint(100,'TACTICAL SANDBOX READY',
      (state.site?.name??'Site')+' · '+state.operators.length+' actors');
    quickPlayPanel.dataset.state='ready';
    quickPlayClockText.textContent=(totalMs/1000).toFixed(1)+'s total · map '+
      (generated.generationMs/1000).toFixed(1)+'s · 3D '+
      (sceneMs/1000).toFixed(1)+'s · operators '+
      (operatorMs/1000).toFixed(1)+'s · frame '+
      (firstFrameMs/1000).toFixed(1)+'s';
    console.info('[Quick Play startup]',{
      seed,scale,generationMs:generated.generationMs,sessionMs,sceneMs,
      operatorMs,operatorStageMs,hudMs,firstFrameMs,totalMs,
      shaderPreparationMs
    });
    // Now that an actual complete frame exists behind the overlay, allow
    // live RAF updates. Never declare READY before the render has returned.
    quickPlayBusy=false;
    finishQuickPlayClock();
    // The prior 1400ms READY hold made an already prepared game look frozen.
    // Let the resumed gameplay loop paint a frame behind the mask, then
    // release it on the next paint turn with no artificial countdown.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(id===quickPlayRun&&!quickPlayBusy&&
         quickPlayPanel.dataset.state==='ready')
        {
          quickPlayPanel.hidden=true;
          showMissionBriefing();
        }
    }));
  }catch(error){
    if(id!==quickPlayRun)return;
    quickPlayWorker?.terminate();quickPlayWorker=null;quickPlayReject=null;
    campaignMode=priorMode;quickPlayBusy=false;finishQuickPlayClock();
    quickPlayPanel.dataset.state='error';quickPlayCancelButton.hidden=false;
    quickPlayCancelButton.textContent='BACK';
    quickPlayStageText.textContent='TACTICAL SANDBOX FAILED';
    quickPlayDetailText.textContent=error instanceof Error?error.message:String(error);
    quickPlayClockText.textContent='Stopped · return to menu and retry';
    console.error('[Quick Play startup]',error);
  }
}
const campaignBackButton=document.createElement('button');
campaignBackButton.type='button';campaignBackButton.id='campaignReturnButton';
campaignBackButton.textContent='OPERATIONS ROOM';
campaignBackButton.setAttribute('aria-label','Return to campaign operations room');
ui.siteSettings.append(campaignBackButton);
/** Campaign Arsenal drafts are always re-quoted against live ownership and credits.
 * The existing editor remains usable until the new UI completes its cutover.
 */
async function openCampaignArsenal(id:string){
 if(!campaign||campaign.activeContractId)return;
 try{
  const [{arsenalRecipeFromLegacy},{openArsenalWorkbench},
   {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}]=await Promise.all([
    import('./arsenal/recipes.ts'),import('./arsenal/workbench-screen.ts'),
    import('./arsenal/campaign-adapter.ts')]);
  const member=campaign?.operators.find(o=>o.id===id&&o.status!=='retired'&&o.status!=='lost');
  if(!campaign||campaign.activeContractId||!member)return;
  const recipe=arsenalRecipeFromLegacy(member.weaponConfiguration);
  if(!recipe){showUiHelp('THIS WEAPON USES THE LEGACY ARMORY',3000);return;}
  openArsenalWorkbench({id:'equipped-campaign-'+id,name:member.callsign,recipe},undefined,{
   mode:'campaign',applyLabel:'EQUIP WEAPON',
   quote:r=>campaign?quoteCampaignArsenalEdit(campaign,id,r):
    {valid:false,canCommit:false,reason:'Campaign unavailable'},
   onApply:r=>{
    if(!campaign)return {ok:false,message:'Campaign unavailable'};
    const before=campaign;
    const result=commitCampaignArsenalEdit(before,id,r);
    if(!result.quote.canCommit)
     return {ok:false,message:result.quote.reason??'Cannot equip this build'};
    if(result.state===before)return {ok:true};
    campaign=result.state;
    if(!saveCampaign()){
     campaign=before;return {ok:false,message:'Could not save Campaign. No equipment was changed.'};
    }
    showCampaignHome();return {ok:true};
   }
  });
 }catch{
  showUiHelp('ARSENAL UNAVAILABLE · EXISTING ARMORY STILL WORKS',4000);
 }
}
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
 quickPlay:()=>{void launchQuickPlay();},
 openReplayLibrary:()=>replayLibrary.openFromMenu(),
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
 equipWeaponPreset:(id,presetId)=>{if(campaign&&!campaign.activeContractId){
  const preset=familyPreset(presetId);
  const member=campaign.operators.find(o=>o.id===id);
  if(!preset||!member)return;
  let next=campaign;
  if(member.weapon!==preset.weapon){
   if((campaign.inventory.weapons[preset.weapon]??0)<1)return;
   next=equipCampaignWeapon(next,id,preset.weapon);
   if(next===campaign)return;
  }
  next=equipCampaignWeaponPreset(next,id,presetId);
  if(next===campaign)return;
  campaign=next;saveCampaign();showCampaignHome();}},
 equipWeaponFamilyPart:(id,slot,partId)=>{if(campaign){
  campaign=equipCampaignWeaponFamilyPart(campaign,id,slot,partId);
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
 openArsenal:(id)=>{void openCampaignArsenal(id);},
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
 showMissionBriefing();
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
  audioController.uiClickTone('select');
  // BACK must always escape an unfinished targeting gesture first.
  // It cannot accidentally remove an unrelated prior waypoint.
  if(hudController.facing.looking||flashMode||firePlacement||evacMode){cancelTargeting();return;}
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
   audioController.playOrderCue('ui.cancel');updateHud();
 }
});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;audioController.playOrderCue('orders.undo');updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;audioController.playOrderCue('orders.redo');updateHud();});
ui.wait.addEventListener('click',()=>{planWait(state,selected,1);audioController.playOrderCue('orders.wait');updateHud();});
fieldLightButton=document.createElement('button');
fieldLightButton.type='button';fieldLightButton.textContent='WEAPON LIGHT';
fieldLightButton.setAttribute('aria-label','Toggle selected operator weapon light');
fieldLightButton.addEventListener('click',()=>{
 if(replaying)return;
 toggleWeaponLight(state,selected);audioController.playOrderCue('equipment.flashlight_click');updateHud();
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
 hudController.facing.looking=false;flashMode=false;firePlacement=null;
 showUiHelp('TAP DESTINATION FOR CASUALTY DRAG',5500);
});
carryButton=casualtyActionButton('CARRY',target=>{
 evacMode={patientId:target.id,mode:'carry'};
 hudController.facing.looking=false;flashMode=false;firePlacement=null;
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
  hudController.facing.looking=false;
  updateHud();
});
ui.sync.addEventListener('click',()=>{planSync(state);audioController.playOrderCue('orders.sync');updateHud();});
ui.stance.addEventListener('click',()=>{
  posture(state,selected);audioController.playOrderCue('orders.stance');fog2D.invalidate();updateHud();
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
ui.retry.addEventListener('click',()=>{if(campaignMode!=='mission')restartMission();});
ui.next.addEventListener('click',()=>{if(!returnAfterCampaignMission())reset(state.variant+1);});
ui.play.addEventListener('click',()=>{
  audioController.unlock();audioController.uiClickTone(state.phase==='running'?'pause':'go');
  if(state.phase==='won'||state.phase==='lost'){
   if(!returnAfterCampaignMission())reset();
  }else{
    hudController.facing.looking=false;pushMode=false;
    missionController.captureBeforeExecution(state,recorder);
    toggling(state);updateHud();
  }
});
ui.restart.addEventListener('click',async()=>{
  if(campaignMode==='mission'||replaying)return;
  if((state.started||team(state).some(a=>a.plan.length>0))&&
    !await confirmFieldworkAction({
      title:'Restart this mission?',
      message:'All current orders and discoveries will be discarded.',
      confirmLabel:'RESTART MISSION',danger:true
    }))return;
  restartMission();
  closeMissionSettings(false);
  showMissionBriefing();
});
window.addEventListener('keydown',e=>{
  // Global game shortcuts must never fire while the player edits a name,
  // operates a dialog, or navigates Campaign / the front menu.
  if(e.isComposing||e.altKey||campaignMode==='menu'||campaignMode==='home')return;
  if(document.querySelector('.fw-confirm-backdrop'))return;
  const target=e.target;
  // Escape is handled before the usual input guard so a focused replay
  // range/button can dismiss its panel; native select popups keep Escape.
  if(replaying&&e.code==='Escape'&&
     !(target instanceof HTMLSelectElement)&&
     !(target instanceof HTMLElement&&target.closest(
       '[role="dialog"],[role="alertdialog"],textarea,[contenteditable="true"]'))){
    e.preventDefault();
    if(!ui.replayClusterMenu.hidden)replayAnalysisUi.closeReplayCluster();
    else if(replayAnalysisUi.replayToolTab!==null)replayAnalysisUi.closeReplaySurface();
    else exitReplay();
    return;
  }
  if(target instanceof HTMLElement&&
    (target.isContentEditable||target.closest(
      'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="alertdialog"]'
    )))return;
  if(replaying){
    if(e.code==='Space'&&!e.repeat&&!(
      target instanceof HTMLElement&&target.closest('button,[role="button"]'))){
      e.preventDefault();replayTimeline.togglePlay();
    }
    if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&!(
      target instanceof HTMLElement&&target.closest('button,summary,[role="button"]'))){
      e.preventDefault();
      const direction:-1|1=e.code==='ArrowLeft'?-1:1;
      if(e.ctrlKey||e.metaKey)replayAnalysisUi.jumpEvent(direction>0);
      else if(e.shiftKey){replayPlayback.pause();seekReplay(replayPlayback.time+direction);}
      else replayTimeline.step('frame',direction);
    }
    return;
  }
  if(e.code==='Space'&&!e.repeat){
    e.preventDefault();audioController.unlock();
    if(state.phase==='won'||state.phase==='lost'){
      if(!returnAfterCampaignMission())reset();
    }else{
      missionController.captureBeforeExecution(state,recorder);
      toggling(state);
    }
    updateHud();
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
/** Aim can be placed through the rendered silhouette of a door, enemy,
 * window or counter, whether or not that object is known. This reads only
 * the camera ray: never query hidden actors to snap a LOOK/WATCH marker. */
function pointerAimWorld(e:PointerEvent,height=24):Pt{
 return stage&&viewMode!=='plan2d'?
   stage.screenToWorldAtHeight(e.clientX,e.clientY,height)??
     pointerWorld(e):pointerWorld(e);
}
/** One shared screen-space picker for the visible planning surface.
 * Routes, doors and order handles compete by explicit geometry, never by
 * separate first-match handlers or unseen world information. */
function tacticalPickAt(screen:Pt,pointerKind:string):TacticalPick|null{
  if(replaying)return null;
  const touch=pointerKind==='touch',pen=pointerKind==='pen';
  // GO/PAUSE still permit direct operator selection. The rest of the
  // planning surface is deliberately non-interactive while executing.
  if(state.phase!=='planning'){
    return resolveTacticalPick(team(state).filter(a=>a.health>0).map(a=>({
      kind:'operator' as const,owner:a.id,
      distancePx:distance(worldToScreen(a.p,viewMode==='plan2d'?0:24),screen),
      corePx:touch?18:pen?16:14,haloPx:touch?30:pen?25:21
    })),selected);
  }
  const hits:TacticalPick[]=[];
  const actor=uid(selected);
  for(const unit of team(state)){
    if(unit.health<=0)continue;
    const here=worldToScreen(unit.p,viewMode==='plan2d'?0:24);
    // A 44 px direct finger target is generous without an invisible 60 px
    // magnetic halo that steals floor taps beside a stacked teammate.
    hits.push({kind:'operator',owner:unit.id,distancePx:distance(here,screen),
      corePx:touch?22:pen?18:15});
    const problem=executionProblemStatus(unit);
    if(problem?.orderId!=null){
      const marker=executionMarkerPoint(unit,viewMode!=='plan2d');
      const point=viewMode==='plan2d'?worldToScreen(marker,0):marker;
      hits.push({kind:'problem',owner:unit.id,nodeId:problem.orderId,
        distancePx:distance(point,screen),corePx:touch?15:12,haloPx:19});
    }
    const active=activeWatchTarget(unit);
    if(active){
      hits.push({kind:'activeWatch',owner:unit.id,
        distancePx:distance(worldToScreen(active,12),screen),
        corePx:touch?17:pen?15:12,
        haloPx:unit.id===selected&&touch?24:undefined});
    }
    for(const node of unit.plan){
      const here=worldToScreen(node.p,8);
      const selectedHandle=unit.id===selected&&node.id===selectedNode;
      hits.push({kind:'node',owner:unit.id,nodeId:node.id,
        distancePx:distance(here,screen),
        corePx:touch?(unit.id===selected?19:17):pen?16:13,
        haloPx:selectedHandle&&touch?24:undefined});
      if(node.aimPoint&&node.aimMode==='track')
        hits.push({kind:'watch',owner:unit.id,nodeId:node.id,
          distancePx:distance(worldToScreen(node.aimPoint,12),screen),
          corePx:touch?17:pen?15:12,
          haloPx:selectedHandle&&touch?23:undefined});
      if(node.aimPoint&&node.kind==='flash')
        hits.push({kind:'flash',owner:unit.id,nodeId:node.id,
          distancePx:distance(worldToScreen(node.aimPoint,12),screen),
          corePx:touch?17:pen?15:12});
    }
    const hit=routeLineHit(unit.p,unit.plan,screen,
      point=>worldToScreen(point,4),
      unit.id===selected?(touch?14:pen?12:10):(touch?8:pen?7:6),
      (from,to)=>displayRouteCache.get(from,to,state.intel,true).points);
    if(hit)hits.push({kind:'route',owner:unit.id,
      routeIndex:hit.index,routePoint:hit.point,
      distancePx:hit.distancePx,corePx:unit.id===selected?
        (touch?14:pen?12:10):(touch?8:pen?7:6)});
  }
  // Known doors only. The painted leaf and visible door selector own the
  // tap, not a cluster of broad, overlapping circles around the threshold.
  // Interaction reach is checked at commit using the selected command origin.
  if(actor)for(const door of state.doors){
    if(!doorKnown(state.intel,door.id))continue;
    const fraction=liveVisibility(state,doorCenter(door))?
      (door.openFraction??(door.open?1:0)):
      (state.intel.doorMemory.get(door.id)??0);
    const leaf=doorLeafSegment({...door,openFraction:fraction});
    const a=worldToScreen(leaf.a,10),b=worldToScreen(leaf.b,10);
    const center=worldToScreen(doorCenter(door),12);
    const gap=Math.min(screenSegmentDistance(screen,a,b),
      Math.max(0,distance(screen,center)-4));
    hits.push({kind:'door',doorId:door.id,distancePx:gap,
      corePx:touch?(door.id===doorFocusId?15:12):pen?11:9});
  }
  return resolveTacticalPick(hits,selected);
}
function adoptPointerOwner(p:{pick?:TacticalPick|null}):void{
  const owner=p.pick?.owner;
  if(owner&&owner!==selected)selectUnit(owner);
}
function activatePointerEdit(p:{pick?:TacticalPick|null}):void{
  adoptPointerOwner(p);
  const pick=p.pick;
  if(!pick)return;
  selectedActiveWatch=pick.kind==='activeWatch';
  selectedNode=selectedActiveWatch?null:pick.nodeId??null;
  doorFocusId=null;
}
function restorePointerSelection(p:{selectionBefore?:{
  owner:string;node:number|null;watch:boolean;door:string|null
}}):void{
  const prior=p.selectionBefore;
  if(!prior)return;
  if(selected!==prior.owner)selectUnit(prior.owner);
  selectedNode=prior.node;selectedActiveWatch=prior.watch;
  doorFocusId=prior.door;
}
// The input controller owns DOM pointer events, camera gesture arbitration and
// interruption cleanup. This scene retains semantic picking and plan edits.
tacticalGestures.install({
  is3D:()=>!!stage&&viewMode!=='plan2d',
  isPlanning:()=>state.phase==='planning',
  isLooking:()=>!!hudController.facing.looking,
  targetArmed:()=>!!(hudController.facing.looking||flashMode||pushMode||firePlacement||evacMode),
  world:pointerWorld,
  aimWorld:pointerAimWorld,
  pick:tacticalPickAt,
  selection:()=>({owner:selected,node:selectedNode,watch:selectedActiveWatch,
    door:doorFocusId}),
  restoreSelection:restorePointerSelection,
  activateEdit:activatePointerEdit,
  adoptOwner:adoptPointerOwner,
  cursor:point=>{cursor=point;},
  hover:(active,point)=>{previewHover=active;if(point)cursor=point;},
  clearDrag:()=>{trace=null;draggingNode=null;draggingWatchTarget=false;},
  dragNode:(point,watch)=>{draggingNode=point;draggingWatchTarget=watch;},
  traceRoute:(screen,point)=>{
    if(!trace)trace=[{...uid(selected)!.p}];
    if(shouldAppendStrokePoint(worldToScreen(trace.at(-1)!,8),screen))
      trace.push({...point});
  },
  orbit:(dx,dy)=>{
    if(replaying&&replayCamera.mode!=='free'){
      chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
    }
    stage?.orbit(dx,dy);
    for(const [mode,button] of [['iso',ui.viewIso],
      ['top',ui.viewTop],['plan2d',ui.view2d]] as const)
      button.setAttribute('aria-pressed',String(mode===stage?.view.mode));
  },
  pan:(dx,dy)=>{
    if(replaying&&replayCamera.mode!=='free'){
      chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
    }
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
  },
  pinch:(previous,current,ratio)=>{
    if(stage&&viewMode!=='plan2d'){
      if(replaying&&replayCamera.mode!=='free'){
        chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
      }
      if(previous)stage.panBetween(previous.x,previous.y,current.x,current.y);
      if(ratio!==1)stage.zoomAt(ratio,current.x,current.y);
    }else{
      if(previous){panX+=current.x-previous.x;panY+=current.y-previous.y;}
      if(ratio!==1)zoom=clamp(zoom*ratio,.65,4.8);
      layout();
    }
  },
  release:commitPointerRelease,
  complete:updateHud,
  wheel:e=>{
    const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
    fitZoom(z*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
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
  selectedNode=id;doorFocusId=null;paletteController.invalidate();
  return true;
}
/** Map gestures have resolved; this is the gameplay-only commit boundary. */
function commitPointerRelease(e:PointerEvent,p:TacticalPointer,
  cancelled:boolean,pointerCount:number):void{
  const pt=hudController.facing.looking?pointerAimWorld(e):
    p.mode==='activeWatch'||p.mode==='watchTarget'?
      pointerAimWorld(e,12):pointerWorld(e);
  // During replay, a deliberate single tap on a friendly miniature
  // follows that operator. Two-finger gestures, camera drags, and scrubbing
  // never steal camera focus. Avoid interpreting the same tap as a shot.
  let tappedReplayOperator=false;
  if(!cancelled&&replaying&&!replayBodycam.active&&
     pointerCount===1&&!p.moved&&p.mode==='undecided'){
    const finger={x:e.clientX,y:e.clientY};
    const nearest=team(state).filter(actor=>actor.health>0)
      .map(actor=>({id:actor.id,d:distance(
        worldToScreen(actor.p,viewMode==='plan2d'?0:24),finger)}))
      .sort((a,b)=>a.d-b.d)[0];
    if(nearest&&nearest.d<=(e.pointerType==='touch'?36:26)){
      tappedReplayOperator=true;
      followReplayOperator(nearest.id);
    }
  }
  if(!tappedReplayOperator&&!cancelled&&replaying&&replayTraceMode!=='off'&&
    pointerCount===1&&!p.moved&&p.mode==='undecided'){
    const hit=shotScreenHit(recorder.ballistics.between(
      Math.max(0,replayPlayback.time-3),replayPlayback.time),replayPlayback.time,
      {x:e.clientX,y:e.clientY},
      (point,height)=>worldToScreen(point,viewMode==='plan2d'?0:height),
      historicalShotVisible,e.pointerType==='touch'?30:22);
    if(hit)replayAnalysisUi.selectReplayShot(hit);
  }
  if(!cancelled&&!replaying&&state.phase!=='planning'&&
     pointerCount===1&&!p.moved&&p.mode==='undecided'&&
     p.pick?.kind==='operator'&&p.pick.owner){
    selectUnit(p.pick.owner);
  }
  if(!cancelled&&state.phase==='planning'&&!replaying&&pointerCount===1){
    if((hudController.facing.looking||flashMode||pushMode||firePlacement||evacMode)&&
       (p.mode==='targetPreview'||p.mode==='undecided')){
      // A brief iPhone tap often travels a few pixels without entering
      // targetPreview. Always commit an armed target on release, even then.
      // CameraMulti/cancelled pointers remain excluded.
      // LOOK/WATCH are directions and may deliberately point across an
      // unseen door or beyond the property; other commands still require a
      // point inside the real procedural site bounds, not legacy W/H.
      if(hudController.facing.looking||insideTacticalBounds(pt,activeWorldBounds()))
        useSelectedGround(pt);
      else showUiHelp('TAP INSIDE THE MAP TO PLACE THE TARGET',2700);
    }else if(p.mode==='activeWatch'){
      adoptPointerOwner(p);
      const target=aimTargetFromTap(uid(selected)?.p??pt,pt);
      const accepted=!p.dragCommitted||
        (!!target&&retargetActiveWatch(state,selected,target));
      if(!accepted)rejectAt(pt,'WATCH TARGET TOO CLOSE OR INVALID');
      selectedNode=null;selectedActiveWatch=true;doorFocusId=null;
      if(accepted)tacticalFeedback.emit(p.dragCommitted?'command':'select',pt,
        p.dragCommitted?'WATCH RETARGETED':undefined);
    }else if(p.mode==='watchTarget'&&p.nodeId!==null){
      adoptPointerOwner(p);
      const node=uid(selected)?.plan.find(n=>n.id===p.nodeId);
      const target=node?aimTargetFromTap(node.p,pt):null;
      const accepted=!p.dragCommitted||
        (!!target&&planWatch(state,selected,target,p.nodeId));
      if(!accepted)rejectAt(pt,'WATCH TARGET UNAVAILABLE');
      selectedNode=p.nodeId;doorFocusId=null;
      if(accepted)tacticalFeedback.emit(p.dragCommitted?'command':'select',pt,
        p.dragCommitted?'WATCH UPDATED':undefined);
    }else if(p.mode==='node'&&p.nodeId!==null){
      adoptPointerOwner(p);
      if(p.dragCommitted){
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
      const strokeOutcome={clipped:false,endpoint:pt};
      if(!planMoveStroke(state,selected,points.slice(1),false,true,strokeOutcome))
        rejectAt(pt,'NO WALKABLE STROKE · PREVIOUS ROUTE KEPT');
      else{
        selectedActiveWatch=false;
        selectedNode=uid(selected)?.plan.filter(n=>n.kind==='move')
          .at(-1)?.id??null;
        const watchKept=uid(selected)?.plan.some(n=>n.aimMode==='track')||
          uid(selected)?.aimInstruction?.mode==='track';
        if(strokeOutcome.clipped)
          tacticalFeedback.emit('node',strokeOutcome.endpoint);
        showUiHelp((strokeOutcome.clipped?
          'ROUTE ENDS AT LAST CLEAR POINT · UNDO TO RESTORE':
          'ROUTE REPLACED FROM HERE · UNDO TO RESTORE')+
          (watchKept?' · WATCH KEPT':''),3200);
      }
      doorFocusId=null;
    }else if(!p.moved&&insideTacticalBounds(pt,activeWorldBounds())){
      // The hit was captured at pointer-down, but no selection/order was
      // committed before the gesture resolved. Camera gestures never reach
      // this branch and a tap can produce only one semantic outcome.
      const pick=p.pick;
      if(pick?.kind==='operator'&&pick.owner){
        selectUnit(pick.owner);
        tacticalFeedback.emit('select',uid(pick.owner)?.p??pt);
      }else if(pick?.kind==='door'&&pick.doorId){
        const door=state.doors.find(d=>d.id===pick.doorId&&
          doorKnown(state.intel,d.id));
        const actor=uid(selected),node=selectedPlanNode();
        const origins=actor?(node?[node.p]:[finalPoint(actor),actor.p]):[];
        if(door&&origins.some(origin=>doorReachable(origin,door))){
          doorFocusId=door.id;selectedNode=null;selectedActiveWatch=false;
          doorMenuDismissedId=null;
          tacticalFeedback.emit('select',doorCenter(door));
          teach('door-selected',
            'Door selected. Choose OPEN, KICK or another available action.',4700);
        }else if(door){
          showUiHelp('NO DOOR ACTION IN REACH · PLAN AN APPROACH',2200);
        }
      }else if(pick?.kind==='route'&&pick.owner){
        if(pick.owner!==selected){
          // First touch on another operator's line is selection only.
          selectUnit(pick.owner);
          tacticalFeedback.emit('select',uid(pick.owner)?.p??pt);
        }else{
          insertAtRouteLine({x:e.clientX,y:e.clientY},e.pointerType);
        }
      }else if(!pick){
        doorFocusId=null;useSelectedGround(pt);
      }

    }
  }
}
window.addEventListener('resize',layout);
// The Settings trigger lives in the collapsible Tools drawer. Settings
// therefore owns an always-visible close action, and camera changes return
// immediately to the map without leaving a hidden trigger focused.
const closeSiteSettingsButton=el<HTMLButtonElement>('closeSiteSettings');
function closeMissionSettings(returnFocus=true){
  if(ui.siteSettings.hidden)return;
  collapseTacticalSheets(null);
  if(returnFocus)ui.siteSettingsToggle.focus();
  updateContext();
}
closeSiteSettingsButton.addEventListener('click',()=>{
 closeMissionSettings();tacticalSheetNavigation.sync();
});
const missionSettingsTabs=Array.from(ui.siteSettings.querySelectorAll<HTMLButtonElement>(
 '[data-site-tab]'));
const missionSettingsPanels=Array.from(ui.siteSettings.querySelectorAll<HTMLElement>(
 '[data-site-panel]'));
function selectMissionSettingsTab(tab:string){
 for(const button of missionSettingsTabs)
  button.setAttribute('aria-pressed',String(button.dataset.siteTab===tab));
 for(const panel of missionSettingsPanels)
  panel.hidden=panel.dataset.sitePanel!==tab;
 const title=ui.siteSettings.querySelector<HTMLElement>('.site-settings-heading strong');
 if(title)title.textContent=tab==='environment'?'ENVIRONMENT':
  tab==='preferences'?'PREFERENCES':'MISSION';
}
replayLibrary.renderFavorites();
for(const button of missionSettingsTabs)button.addEventListener('click',()=>{
 selectMissionSettingsTab(button.dataset.siteTab??'mission');
});
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
function showMissionBriefing(){
  if(state.phase!=='planning'||replaying||!state.site)return;
  // Always open on the five-second overview; details are optional.
  setBriefingView('brief');
  updateHud();
  collapseTacticalSheets('briefing');
  ui.briefingPanel.hidden=false;
  ui.briefingToggle.setAttribute('aria-expanded','true');
  tacticalSheetNavigation.sync();tacticalSheetNavigation.focusFirst();
  updateContext();
}
ui.briefingToggle.addEventListener('click',showMissionBriefing);
ui.briefingIntelToggle.addEventListener('click',()=>{
 const opening=ui.briefingIntelView.hidden;
 setBriefingView(opening?'intel':'brief');
});
for(const button of ui.briefingPanel.querySelectorAll<HTMLButtonElement>(
 '[data-briefing-tab]')){
 button.addEventListener('click',()=>setBriefingIntelTab(
  button.dataset.briefingTab as BriefingTab));
}
ui.briefingClose.addEventListener('click',()=>{
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
  tacticalSheetNavigation.sync();
  updateContext();
});
// Shelved graphics experiment: the controls remain in source for future
// development but are hidden. Only explicit ?focusFx developer URLs opt in.
const miniatureFocusButtons=Array.from(
 ui.siteSettings.querySelectorAll<HTMLButtonElement>('[data-miniature-focus]'));
function storedMiniatureFocus():string|null{
 try{return localStorage.getItem(MINIATURE_FOCUS_STORAGE_KEY);}
 catch{return null;}
}
let miniatureFocusSetting:MiniatureFocusMode=stage?.getMiniatureFocusMode()??
 initialMiniatureFocusMode(
   new URLSearchParams(location.search).get('focusFx'),storedMiniatureFocus());
function syncMiniatureFocusPreference():void{
 for(const button of miniatureFocusButtons){
   const active=button.dataset.miniatureFocus===miniatureFocusSetting;
   button.setAttribute('aria-pressed',String(active));
 }
}
for(const button of miniatureFocusButtons)button.addEventListener('click',()=>{
 const value=button.dataset.miniatureFocus;
 if(value!=='off'&&value!=='subtle'&&value!=='strong'&&value!=='replay')return;
 miniatureFocusSetting=value;
 stage?.setMiniatureFocusMode(value);
 try{localStorage.setItem(MINIATURE_FOCUS_STORAGE_KEY,value);}
 catch{/* Preference remains active for this session without storage. */}
 syncMiniatureFocusPreference();
});
syncMiniatureFocusPreference();
audioController.bindSettings({
  liveMix:el<HTMLButtonElement>('liveMixToggle'),
  roomAudio:el<HTMLButtonElement>('roomAudioToggle'),
  uiSound:ui.uiSoundToggle
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
  if(opening)selectMissionSettingsTab('mission');
  tacticalSheetNavigation.sync();
  if(opening)tacticalSheetNavigation.focusFirst();
  else ui.siteSettingsToggle.focus();
  updateContext();
});
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
// Sight instrumentation is opt-in only. Normal mission loops never record
// counters, and neither gameplay nor replay reads these diagnostics.
setSightDiagnosticsEnabled(!!perfOverlay);
const frameMeter=perfOverlay?new FrameMeter():null;
const physicalActionRings=new PhysicalActionRings();
function tick(now:number){
  const perfStart=perfOverlay?performance.now():0;
  const frameGap=Math.max(0,now-last);
  const dt=Math.min(.08,frameGap/1000);last=now;
  if(quickPlayBusy||((campaignMode==='menu'||campaignMode==='home')&&!replaying)){
   accum=0;previousRenderActors=null;previousRenderDoors=null;
   physicalActionRings.clear();
   requestAnimationFrame(tick);return;
  }
  let simSteps=0;
  let recordingMs=0;
  const simPhaseCosts=perfOverlay?new Map<string,number>():null;
  if(!replaying&&state.phase==='running'){
    const budget=fixedStepBudget(accum,dt);
    accum=budget.remaining;
    for(let i=0;i<budget.steps;i++){
      previousRenderActors=renderSnapshot(state.operators);
      previousRenderDoors=Object.fromEntries(state.doors.map(d=>
        [d.id,d.openFraction??(d.open?1:0)]));
      stepSession(state,1/60,simPhaseCosts?
        (name,ms)=>simPhaseCosts.set(name,
          (simPhaseCosts.get(name)??0)+ms):undefined);
      simSteps++;
      if(perfOverlay){
        const beforeRecording=performance.now();
        recorder.capture(state,isMissionTerminal(state));
        recordingMs+=performance.now()-beforeRecording;
      }else recorder.capture(state,isMissionTerminal(state));
    }
  }else{accum=0;previousRenderActors=null;previousRenderDoors=null;}
  if(replaying&&replayPlayback.playing){
    const playbackStep=replayPlayback.advanceAndApply(dt,recorder,state,{
      director:replayCamera.mode==='director',
      videoActive:replayQuickVideo.active,
      tempoEdits:replayDirector.tempoEdits
    });
    if(playbackStep){
      if(playbackStep.trimmedSeconds>0){
        replayDirector.editNoticeSeconds=playbackStep.trimmedSeconds;
        replayDirector.editNoticeUntil=performance.now()+1850;
      }
      if(playbackStep.frame){
        replayPresentation=playbackStep.frame.presentation??null;
        fog2D.invalidate();
      }
      if(playbackStep.resetAudio)audioController.stopReplaySounds();
      else audioController.playReplayBetween(playbackStep.previousTime,
        playbackStep.time,recorder,replayPlayback.rate);
      if(playbackStep.finishedIncident)audioController.stopReplaySounds();
    }
  }
  if(replaying)advanceReplayCamera(dt);
  audioController.consumeLiveFrame(state,recorder,selected,replaying);
  // Execution's full HUD reconciliation is DOM-heavy; explicit commands
  // still call updateHud() immediately, while live status refreshes ~5.5Hz.
  if(now-hudAt>(state.phase==='running'?180:120)){
    updateHud();if(replaying)updateReplayHud();hudAt=now;
  }
  // The manager owns its DOM nodes for the lifetime of this view.
  physicalActionRings.update(team(state),state.doors,
    !replaying&&state.phase==='running',
    p=>worldToScreen(p,viewMode==='plan2d'?14:34));
  const perfRenderStart=perfOverlay?performance.now():0;
  // The Studio is an opaque full-screen view. Skip only hidden rendering,
  // never fixed-step gameplay or authoritative replay/simulation state.
  const studioOccludesTactical=!!studioOverlay&&!studioOverlay.hidden&&
   !replayQuickVideo.active;
  if(!studioOccludesTactical&&stage&&viewMode!=='plan2d')
    stage.setMiniatureFocusContext(replaying,dt);
  if(!studioOccludesTactical&&stage&&viewMode!=='plan2d')
    stage.update(state,selected,dt,doorFocusId,
      replaying&&replayKnowledge.omniscient,replaying?replayPresentation:null,
      !replaying&&state.phase==='running'&&previousRenderActors?
        {previous:previousRenderActors,previousDoors:previousRenderDoors??undefined,
          alpha:Math.min(1,accum*60)}:null,
      // Pausing the encounter must NOT switch to render-local footsteps.
      !replaying?recorder.motion.presentation(Math.max(0,
        state.phase==='running'?
          state.seconds-(1-Math.min(1,accum*60))/60:
          state.seconds),state.operators.map(a=>a.id),false):null,
      replaying?replayKnowledge.disclosure():null,
      replaying?replayKnowledge.doorHistory:null,
      replaying&&replayKnowledge.observerId?
        replayKnowledge.personalGround?.at(replayPlayback.time,replayKnowledge.observerId)??null:
        null,
      replaying?replayKnowledge.windowHistory:null);
  const overlayBegin=perfOverlay?performance.now():0;
  const sceneUpdateEnd=perfOverlay?performance.now():0;
  if(!studioOccludesTactical)render();
  const renderEnd=perfOverlay?performance.now():0;
  if(replaying&&replayQuickVideo.active){
    replayQuickVideo.drawFrame(
      stage&&viewMode!=='plan2d'?stage.canvas:null,canvas,replayPlayback.time,
      replayBodycam.active&&replayKnowledge.observerId?
        {observerId:replayKnowledge.observerId,mount:replayBodycam.mount}:null);
    if(replayPlayback.time>=recorder.duration)replayQuickVideo.finishAtEnd();
    else if(!replayPlayback.playing)replayQuickVideo.stop();
  }
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
  if(feedbackDraw&&!studioOccludesTactical){
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
    const orderMode=hudController.facing.looking?hudController.facing.lookMode:flashMode?'flash':
      firePlacement??evacMode?.mode;
    const origin=hudController.facing.looking?
      (selectedPlanNode()?.p??(hudController.facing.armedOrigin==='here'?actor?.p:
        actor?finalPoint(actor):undefined)):
      actor?finalPoint(actor):undefined;
    const preview:TacticalOrderPreview|undefined=canPreview&&actor&&origin&&
      orderMode?{origin,direction:cursor!,mode:orderMode}:undefined;
    tacticalFeedback.draw(feedbackDraw,p=>worldToScreen(p,7),
      performance.now(),preview,reducedMotionMedia.matches);
    // Direction-only preview of an authored furniture push. The authoritative
    // simulation still decides how far the real object can move on contact;
    // this never mutates cover, reveals unknown obstacles, or guarantees travel.
    if(pushMode&&state.phase==='planning'&&!replaying&&actor){
      const from=selectedPlanNode()?.p??finalPoint(actor);
      // Find the nearest known movable cover in one pass. Sorting and
      // allocating a candidate array every RAF is unnecessary here.
      let candidate:{object:(typeof state.coverState)[number];index:number;range:number}|undefined;
      for(let index=0;index<state.coverState.length;index++){
        const object=state.coverState[index];
        if(!state.intel.cover.has(index)||!canRelocateCover(object))continue;
        const range=distance(from,{x:object.x,y:object.y});
        if(range>=Math.max(object.w,object.h)/2+43)continue;
        if(!candidate||range<candidate.range){
          candidate={object,index,range};
        }
      }
      if(candidate){
        const obj=candidate.object,center={x:obj.x,y:obj.y};
        const base=Math.atan2(obj.y-from.y,obj.x-from.x);
        const aimed=canPreview&&cursor&&distance(cursor,center)>4?
          Math.atan2(cursor.y-center.y,cursor.x-center.x):base;
        const yaw=base+Math.max(-Math.PI*4/9,Math.min(Math.PI*4/9,
          angleDifference(base,aimed)));
        const dist=Math.max(7,coverPushDistance(obj));
        const end={x:obj.x+Math.cos(yaw)*dist,
          y:obj.y+Math.sin(yaw)*dist};
        const startPx=worldToScreen(center,13),endPx=worldToScreen(end,13);
        feedbackDraw.save();
        feedbackDraw.strokeStyle='#e4c998';feedbackDraw.fillStyle='#e4c998';
        feedbackDraw.lineWidth=2.4;feedbackDraw.setLineDash([5,4]);
        feedbackDraw.beginPath();feedbackDraw.arc(startPx.x,startPx.y,15,
          0,Math.PI*2);feedbackDraw.stroke();
        feedbackDraw.setLineDash([]);
        feedbackDraw.beginPath();feedbackDraw.moveTo(startPx.x,startPx.y);
        feedbackDraw.lineTo(endPx.x,endPx.y);feedbackDraw.stroke();
        const direction=Math.atan2(endPx.y-startPx.y,endPx.x-startPx.x);
        feedbackDraw.beginPath();feedbackDraw.moveTo(endPx.x,endPx.y);
        for(const side of [-1,1])
          feedbackDraw.lineTo(endPx.x-Math.cos(direction+side*.48)*13,
            endPx.y-Math.sin(direction+side*.48)*13);
        feedbackDraw.closePath();feedbackDraw.fill();
        feedbackDraw.restore();
      }
    }
  }
  updateContext();advanceContextPalette(dt);
  if(frameMeter&&perfOverlay){
    const end=performance.now(),stats=stage?.performanceStats();
    frameMeter.add({frame:end-perfStart,cadence:frameGap,sim:perfRenderStart-perfStart,
      scene:overlayBegin-perfRenderStart,
      sceneUpdate:sceneUpdateEnd-perfRenderStart,
      render:renderEnd-sceneUpdateEnd,overlay:end-overlayBegin,
      recording:recordingMs,steps:simSteps,draws:stats?.calls??0,triangles:stats?.triangles??0});
    // The optional diagnostics must not sort rolling samples every RAF:
    // that would contaminate the very hitch measurements they report.
    if(Math.floor(now/750)!==Math.floor((now-dt*1000)/750)){
      const m=frameMeter.summary();
      const sight=drainSightDiagnostics();
      perfOverlay.textContent='JS '+m.p50.toFixed(1)+'ms · P95 '+
        m.p95.toFixed(1)+' · MAX '+m.worst.toFixed(1)+
        '\nRAF GAP P50 '+m.rafP50.toFixed(1)+'ms · P95 '+
        m.rafP95.toFixed(1)+'ms'+
        '\nSIM+REC '+m.simulation.toFixed(1)+'ms / '+m.steps.toFixed(1)+
        ' ticks · REC '+m.recording.toFixed(1)+'ms · SCENE '+m.scene.toFixed(1)+'ms'+
        '\nSYNC '+m.sceneUpdate.toFixed(1)+'ms · RENDER '+m.render.toFixed(1)+'ms'+
        '\nCUM FOG M/S '+(stats?.fogMemoryPaints??0)+'/'+
          (stats?.fogSightPaints??0)+' · SHADOW REF/REUSE '+
          (stats?.shadowRefreshes??0)+'/'+(stats?.shadowReuses??0)+
        '\nSIGHT (750ms) '+sight.liveQueries+' Q / '+
          sight.liveOcclusionProbes+' LOS / '+sight.liveHits+
          ' HIT · FULL '+sight.fullViewQueries+
        '\nPERSONAL '+sight.personalQueries+' Q / '+
          sight.personalOcclusionProbes+' LOS'+
        '\nFILM '+recorder.frames.length+' frames · '+
        recorder.motion.stepEventCount+' step events'+
        '\nDOM '+document.getElementsByTagName('*').length+
        ' · ACTION RINGS '+physicalActionRings.size+
        ' · SITE MATS '+(stats?.siteMaterialCount??0)+
        ' · RIGS A/C '+(stats?.actorRigCount??0)+'/'+
          (stats?.civilianRigCount??0)+
        ' · GEO/TEX '+(stats?.geometryCount??0)+'/'+
          (stats?.textureCount??0)+
        '\nOVERLAY '+m.overlay.toFixed(1)+'ms · DRAWS '+
        m.draws.toFixed(0)+' · TRI '+m.triangles.toFixed(0)+
        (simPhaseCosts&&simPhaseCosts.size?'\nHOT SIM '+
          [...simPhaseCosts].sort((a,b)=>b[1]-a[1]).slice(0,2)
            .map(([name,ms])=>name+' '+ms.toFixed(1)+'ms').join(' / '):'');
    }
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
