import {matchActiveTouchPointers} from './breach-touch-recovery.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
import {
  W,H,activeWorldBounds,WALLS,COVER,GRID,doorCenter,doorLeafSegment,activateSite,
  type Pt,type Segment,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  newSession,team,enemies,isSeen,lastKnown,missionText,debrief,
  operationBriefing,availableDeployments,selectDeployment,
  planMove,planMoveStroke,plannedWindowRoute,planNearbyInteraction,
  planCivilianInteraction,planAim,planWatch,
  retargetActiveWatch,removeActiveWatch,setFirePolicy,planWait,planWaitAt,setWaitDuration,
  plannedControl,setNodeControl,setStartPace,planReloadAt,planDoorFlash,
  planSync,movePlanNode,
  finalPoint,doorAtNode,backOne,
  deletePlanNode,insertPlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,liveVisibility,
  planReload,reloadNow,planFlash,moveFlashTarget,flashTrajectory,
  equipWeaponChoice,toggleWeaponLight,planMedicalTreatment,planEntryTool,
  planCasualtyTransport,planRecoverMedical,planCivilianRelease,
} from './breach-game.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
import {initialMiniatureFocusMode,MINIATURE_FOCUS_STORAGE_KEY,
 type MiniatureFocusMode} from './rendering/miniature-focus-config.ts';
import type {TacticalOrderPreview} from './ui/tactical-feedback.ts';
import {ExecutionNoticeFeed} from './ui/execution-feedback.ts';
import {PhysicalActionRings} from './ui/physical-action-rings.ts';
import {executionStatus} from './breach-execution-state.ts';
import {compactExecutionStatus} from './ui/tactical-hud-density.ts';
import {currentSiteIdentity} from './ui/current-site-identity.ts';
import {tacticalHitProfile,shouldAppendStrokePoint,
  simplifyStrokePoints} from './ui/touch-hit-targets.ts';
import {resolveTacticalPick,screenSegmentDistance,watchDragReady,
  type TacticalPick} from './ui/tactical-target-resolver.ts';
import {orderVisualScopes} from './ui/order-visual-state.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {aimTargetFromTap,insideTacticalBounds} from './ui/aim-target.ts';
import {interruptsWatch,angleDifference} from './breach-plan.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {equipmentTrainingSite} from './equipment-training-range.ts';
import {activeRangeDiagnostic,rangeDiagnosticLabel,captureRangeTrial,
 rangeTrialLabel,type RangeTrial} from './equipment-training-diagnostics.ts';
import type {Site} from './breach-site.ts';
import {captureMissionStart,siteForMissionRestart,restoreMissionStartingTeam,
  type MissionStartSnapshot} from './breach-mission-restart.ts';
import {readFavoriteMissions,addFavoriteMission,removeFavoriteMission,
  writeFavoriteMissions,type FavoriteMission} from './breach-mission-favorites.ts';
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
import {weaponClearance} from './breach-weapon-clearance.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter}
 from './equipment-weapon-light-beam.ts';
import {WeaponWorkbenchPreview,type WeaponWorkbenchViewState} from './equipment-weapon-workbench.ts';
import type {WorkbenchSocket} from './equipment-weapon-workbench-layout.ts';
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
import {spatialSurfaceState,shotVisibility,doorVisibility,contactFade} from './breach-presentation.ts';
import {heardIntensity} from './breach-acoustics.ts';
import {weaponAudioCue,audibleImpact} from './breach-combat-audio.ts';
import {defaultSoundPack,readSoundPack,SOUND_STORAGE_KEY} from './sound-catalog.ts';
import {playPackSound} from './sound-synth.ts';
import {hashString} from './sound-live-tactility.ts';
import {withFieldworkLiveMix} from './breach-live-sound-pack.ts';
import {acousticResponseForCue} from './breach-audio-environment.ts';
import {parseOperationHistory,addOperationRecord,
  type OperationRecord} from './breach-operations.ts';
import {MissionRecorder,applyReplayFrame} from './breach-replay.ts';
import {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import {ReplayCameraController} from './breach-replay-camera-controller.ts';
import {captureReplayArchive,restoreReplayArchive} from './breach-replay-archive.ts';
import {createReplayLibraryUi} from './ui/breach-replay-library-ui.ts';
import {saveReplayArchive,loadSavedReplay,
  getSavedReplayBookmarks,saveReplayBookmarks}
  from './breach-replay-library.ts';
import {stepReplaySample,stepReplayPresentation,formatReplayTime}
  from './breach-replay-transport.ts';
import {ReplayEventIndex,type ReplayIndexedEvent} from './breach-replay-event-index.ts';
import {clusterReplayTimeline,replayTimelineBins} from './breach-replay-timeline-markers.ts';
import {replayFeedPosition} from './breach-replay-feed-window.ts';
import {REPLAY_SPEED_STOPS,speedIndex,speedFromIndex}
  from './breach-replay-speed.ts';
import {toggleReplaySurface,resolvedReplayCamera,isReplaySpeed,
  type ReplaySurface,type ReplayCameraChoice,type ReplayPerspective}
  from './breach-replay-ui-state.ts';
import {buildReplayChapters,addReplayBookmark,adjacentReplayChapter,
  type ReplayChapter,type ReplayBookmark} from './breach-replay-chapters.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import {inspectRecordedShot,shotScreenHit,adjacentRecordedShot}
  from './breach-replay-shot-inspector.ts';
import {serializeReplayReport} from './breach-replay-export-json.ts';
import {ReplaySoundTimeline,replayDoorSoundId} from './breach-replay-audio.ts';
import {ReplayQuickVideo} from './breach-replay-video.ts';
import {sampleReplayGhosts} from './breach-replay-ghosts.ts';
import {ReplayMovementHistory} from './breach-replay-movement-history.ts';
import {buildReplayExecutionInsights} from './breach-replay-debrief.ts';
import {indexReplayIncidents,featuredReplayIncidents,type ReplayIncident}
  from './breach-replay-incidents.ts';
import {featuredReplaySquadEntries,measureReplaySquadDoorEntry,
  type ReplaySquadEntryReview} from './breach-replay-squad-entry.ts';
import {incidentPlaybackWindow} from './breach-replay-incident-playback.ts';
import {makeReplayLoop} from './breach-replay-loop.ts';
import {replayActorDisclosed,replayCivilianDisclosed}
  from './breach-replay-visibility.ts';
import {operatorContactEventKnown,operatorContactAvailable}
  from './breach-replay-contact-lens.ts';
import {bodycamEligibleObserverIds,bodycamHasPersonalGround,
  bodycamDisclosureLabel,replayAudioListener,replayBodycamPan}
  from './breach-replay-bodycam-controls.ts';
import {applyReplayActorIdentity} from './breach-replay-manifest.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import {injuryOf,WEAPONS} from './breach-combat.ts';
import {liveMagazineCapacity,magazineAlert,fitMagazineInventory}
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
 sameWeaponConfiguration,weaponAttachmentAllowed} from './equipment-weapon-assemblies.ts';
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
import {contextActionChoices} from './ui/context-actions.ts';
import {placeContextMenu,type AvoidRect,type ScreenPath,type MenuSide}
  from './breach-context-placement.ts';
import {PaletteMotion} from './ui/palette-motion.ts';
import {TacticalFeedback} from './ui/tactical-feedback.ts';
import {ContextualTeaching,resolveHudPresentation,type HudUrgency,type HudPhase}
  from './ui/contextual-teaching.ts';
import {recoveryAdviceFor} from './ui/recovery-guidance.ts';
import {paintFogMask,maskBounds,FOG_WIDTH,FOG_HEIGHT}
  from './breach-fog-mask.ts';
import {paintReplayPersonalGround} from './breach-replay-ground-overlay.ts';
import {civilianPose} from './breach-civilian-pose.ts';
import {civilianPresentationVisible} from './breach-civilian-visibility.ts';

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
 if(!state.started){
  const squad=team(state);
  const issued=allocateFlashSupply(squad.map(a=>a.flashCharges),campaign.supplies.flash);
  squad.forEach((a,i)=>{a.flashCharges=issued[i];});
  state.flashRemaining=issued.reduce((n,qty)=>n+qty,0);
 }
}
// The front menu needs no procedural site. Generate exactly once when a mode starts.
let state:Session=newSession(0,legacyStudy||campaignMode==='menu'?undefined:initialSiteSeed,
  selectedIntelMode,requestedSiteScale,undefined,undefined,
  {enableCivilians:civilianPreview,enableIncidentIntent:true});
state.lightingMode=selectedLightingMode;
applyRequestedCondition(state);
applyRosterIdentity(state,persistentRoster);
applyCampaignSkills();
state.operationDossier=buildPreviewDossier(state);
let recorder=new MissionRecorder();recorder.capture(state,true);
const deploymentButton=document.createElement('button');
deploymentButton.type='button';deploymentButton.id='deploymentChoice';
deploymentButton.setAttribute('aria-label','Cycle available insertion points');
ui.briefingEntryControls.append(deploymentButton);
let deploymentState:Session|null=null;
let deployOptions:ReturnType<typeof availableDeployments>=[];
let selectedEntry='FRONT';
let missionStart:MissionStartSnapshot=captureMissionStart(
 state,requestedSiteScale,selectedEntry);
const FAVORITE_MISSIONS_STORAGE='fieldwork3d.favorite-missions.v1';
let activeFavoriteId:string|null=null;
function favoriteMissions():FavoriteMission[]{
  try{return readFavoriteMissions(localStorage.getItem(FAVORITE_MISSIONS_STORAGE));}
  catch{return [];}
}
function persistFavoriteMissions(history:FavoriteMission[]):boolean{
  try{
    localStorage.setItem(FAVORITE_MISSIONS_STORAGE,writeFavoriteMissions(history));
    return true;
  }catch{return false;}
}
function restoreFavoriteMission(saved:FavoriteMission):void{
  if(campaignMode==='mission'){
    showUiHelp('FAVORITES PLAY AS QUICK PLAY PRACTICE',3400);return;
  }
  const start=structuredClone(saved.start);
  campaignMode='quick';
  reset(start.variant,start.seed,start.missionType,
    siteForMissionRestart(start),undefined,false,start);
  restoreMissionStartingTeam(state,start);
  selectedEntry='FRONT';
  if(start.entryId!=='FRONT'){
    if(selectDeployment(state,start.entryId))selectedEntry=start.entryId;
    else console.warn('[Favorite mission] Saved entry no longer valid',start.entryId);
  }
  missionStart=start;activeFavoriteId=saved.id;
  recorder=new MissionRecorder();recorder.capture(state,true);
  closeMissionSettings(false);
  layout();updateHud();
  showUiHelp('FAVORITE LOADED · ORIGINAL MISSION SETUP',3800);
}
function renderFavoriteMissions():void{
  const list=ui.favoriteMissionsList;
  const entries=favoriteMissions().slice().reverse();
  const fragment=document.createDocumentFragment();
  if(!entries.length){
    const empty=document.createElement('p');empty.className='favorite-empty';
    empty.textContent='Favorite an operation from its debrief to play it again later.';
    fragment.append(empty);
  }
  for(const saved of entries){
    const row=document.createElement('div');row.className='favorite-mission-entry';
    row.setAttribute('role','listitem');
    const info=document.createElement('div');info.className='favorite-mission-name';
    const title=document.createElement('strong');title.textContent=saved.label;
    const caption=document.createElement('span');
    caption.textContent=saved.start.missionType.toUpperCase()+
      ' · '+(saved.start.site?.scale??'standard').toUpperCase();
    info.append(title,caption);
    const play=document.createElement('button');play.type='button';
    play.textContent='PLAY';play.disabled=campaignMode==='mission';
    play.title='Start an independent Quick Play rematch';
    play.addEventListener('click',()=>restoreFavoriteMission(saved));
    const remove=document.createElement('button');remove.type='button';
    remove.textContent='×';remove.setAttribute('aria-label',
      'Delete favorite '+saved.label);
    remove.addEventListener('click',()=>{
      if(!persistFavoriteMissions(removeFavoriteMission(favoriteMissions(),saved.id))){
        showUiHelp('COULD NOT UPDATE FAVORITES',2900);return;
      }
      if(activeFavoriteId===saved.id)activeFavoriteId=null;
      renderFavoriteMissions();updateHud();
    });
    row.append(info,play,remove);fragment.append(row);
  }
  list.replaceChildren(fragment);
}
function refreshDeployment(){
 if(deploymentState!==state){
  deploymentState=state;selectedEntry='FRONT';
  deployOptions=availableDeployments(state).filter(c=>c.id!=='FRONT');
 }
 const editable=state.phase==='planning'&&!state.started&&!replaying&&
  team(state).every(a=>a.plan.length===0);
 deploymentButton.hidden=!state.site||state.started||deployOptions.length===0;
 deploymentButton.disabled=!editable;
 deploymentButton.textContent='CHANGE ENTRY';
 ui.briefingEntryLabel.textContent=selectedEntry==='FRONT'?
   'FRONT ENTRANCE':selectedEntry.toUpperCase().replaceAll('-', ' ');
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
  if(state.operationDossier)state.operationDossier.identity.entryId=next;
  missionStart=captureMissionStart(state,requestedSiteScale,selectedEntry);
  recorder=new MissionRecorder();recorder.capture(state,true);
  refreshDeployment();
  if(!reducedMotionMedia.matches)ui.briefingEntryLabel.animate([
    {opacity:.5,transform:'translateY(2px)'},
    {opacity:1,transform:'translateY(0)'}
  ],{duration:180,easing:'ease-out'});
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
let replaying=false;
const replayPlayback=new ReplayPlaybackController();
let replayEventIndex:ReplayEventIndex|null=null;
let replaySoundTimeline:ReplaySoundTimeline|null=null;
let replayChapters:ReplayChapter[]=[];
let replayIncidents:ReplayIncident[]=[];
let replayFeaturedIncidents:ReplayIncident[]=[];
let replaySquadEntries:ReplaySquadEntryReview[]=[];
let selectedReplaySquadEntry:string|null=null;
let selectedReplayIncidentId:string|null=null;
let replayBookmarks:ReplayBookmark[]=[];
let replayBookmarkCounter=0;
let replaySoundEnabled=true;
const replayQuickVideo=new ReplayQuickVideo(
  (blob,mime)=>{
    videoAudioDestination=null;
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
    videoAudioDestination=null;
    ui.replayExportVideo.textContent='VIDEO 20S';
    showUiHelp(reason,3600);
  }
);
let savedReplayPreviousRecorder:MissionRecorder|null=null;
let activeSavedReplayId:string|null=null;
const savedRecordingIds=new WeakMap<MissionRecorder,string>();
let replayEntrySource:'debrief'|'library'='debrief';
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
  closeReplayShotInspector();
  cameraMode('iso');
  applyReplayBodycamMount();
  fogStamp=-1;return true;
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
let selectedReplayShotId:number|null=null;
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
let looking=false,flashMode=false,pushMode=false;
let firePlacement:'suppress'|null=null;
let lookMode:'look'|'watch'='look';
// The stationary dock remains the reliable default; Smart Floating may only
// occupy a verified quiet edge pocket, never the "least bad" map position.
const FLOAT_PREF='fieldwork3d.ui.contextLayout';
let contextPlacement:'dock'|'floating'='dock';
try{contextPlacement=localStorage.getItem(FLOAT_PREF)==='floating'?'floating':'dock';}
catch{/* Optional browser preference. */}
const contextLayoutButtons=Array.from(document.querySelectorAll<HTMLButtonElement>(
  '[data-context-layout]'));
function syncContextPlacement(){
  for(const button of contextLayoutButtons)
    button.setAttribute('aria-pressed',
      String(button.dataset.contextLayout===contextPlacement));
}
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
ui.context.dataset.layout='dock';
ui.tacticalHud.insertBefore(ui.context,ui.quickStates);
function setContextPresentation(mode:'dock'|'floating'){
  if(ui.context.dataset.layout===mode)return;
  paletteExit?.cancel();paletteExit=null;
  paletteMotion.hide();contextTether.hidden=true;
  ui.context.dataset.layout=mode;
  if(mode==='dock'){
    ui.tacticalHud.insertBefore(ui.context,ui.quickStates);
  }else document.body.append(ui.context);
  ui.context.style.transform='';
  contextActionsSignature='';lastPlacementKey='';
  paletteWidth=0;paletteHeight=0;
}
syncContextPlacement();
for(const button of contextLayoutButtons)button.addEventListener('click',()=>{
  const next=button.dataset.contextLayout==='floating'?'floating':'dock';
  if(next===contextPlacement)return;
  contextPlacement=next;
  try{localStorage.setItem(FLOAT_PREF,next);}
  catch{/* Optional browser preference. */}
  syncContextPlacement();
  updateContext();
});
function hideContextPalette(){
  lastPlacementKey='';
  // Docked commands never leave an invisible touch surface over the map.
  // Bubbles also dismiss immediately when the map enters target mode.
  const exclusive=!ui.siteSettings.hidden||!ui.briefingPanel.hidden;
  if(contextPlacement!=='floating'||!paletteMotion.active){
    paletteExit?.cancel();paletteExit=null;
    paletteMotion.hide();contextTether.hidden=true;
    ui.context.hidden=true;ui.context.style.pointerEvents='none';
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
  const visible=ui.context.dataset.layout==='floating'&&length>24&&!reduced;
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
  const hadTarget=looking||flashMode||pushMode||!!firePlacement||!!evacMode;
  if(hadTarget){
    const actor=uid(selected);
    if(actor)tacticalFeedback.emit('cancel',actor.p,'CANCELLED');
  }
  looking=false;flashMode=false;pushMode=false;firePlacement=null;flashDoorId=null;
  evacMode=null;contextSignature='';updateHud();
}
const fogCanvas=document.createElement('canvas');
fogCanvas.width=FOG_WIDTH;fogCanvas.height=FOG_HEIGHT;
const fogContext=fogCanvas.getContext('2d');
if(!fogContext)throw Error('Fog canvas unavailable');
const replayGroundCanvas=document.createElement('canvas');
const replayGroundContext=replayGroundCanvas.getContext('2d');
if(!replayGroundContext)throw Error('Replay ground canvas unavailable');
let fogStamp=-1;
let fogSession:Session|null=null;
let fogIntelMode='';let fogSeenRevision=-1;
let audio:AudioContext|null=null;
let videoAudioDestination:MediaStreamAudioDestinationNode|null=null;
const LIVE_MIX_PREF='fieldwork3d.sound.live-mix';
const ROOM_AUDIO_PREF='fieldwork3d.sound.room-acoustics';
let liveMixEnabled=true,roomAudioEnabled=true;
try{
 liveMixEnabled=localStorage.getItem(LIVE_MIX_PREF)!=='off';
 roomAudioEnabled=localStorage.getItem(ROOM_AUDIO_PREF)!=='off';
}catch{/* Private browsing still auditions the mix with safe defaults. */}
let approvedSoundPack=liveMixEnabled?
  withFieldworkLiveMix(readSoundPack()):defaultSoundPack();
function refreshSoundPack(){
 const base=readSoundPack();
 approvedSoundPack=liveMixEnabled?withFieldworkLiveMix(base):defaultSoundPack();
}
window.addEventListener('storage',event=>{
 if(event.key===LIVE_MIX_PREF){
  liveMixEnabled=event.newValue!=='off';refreshSoundPack();
 }else if(event.key===ROOM_AUDIO_PREF)roomAudioEnabled=event.newValue!=='off';
 else if(event.key===SOUND_STORAGE_KEY)refreshSoundPack();
});
const replaySoundNodes=new Set<OscillatorNode>();
const replaySoundBuffers=new Set<AudioBufferSourceNode>();
function stopReplaySounds():void{
  for(const node of replaySoundNodes){
    try{node.stop();}catch{/* Ended nodes are already silent. */}
  }
  replaySoundNodes.clear();
  for(const source of replaySoundBuffers){
    try{source.stop();}catch{/* Already stopped. */}
  }
  replaySoundBuffers.clear();
}
let lastSoundShotId=0,lastEventAudio='';
let lastFootstepSoundTime=0;
let liveAudioVariationCounter=0;
const playTone=(frequency:number,decay:number,noise=false,
  level=1,pan=0,replayCue=false)=>{
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
      if(replayCue&&videoAudioDestination)stereo.connect(videoAudioDestination);
    }else{
      gain.connect(audio.destination);
      if(replayCue&&videoAudioDestination)gain.connect(videoAudioDestination);
    }
    if(replayCue){
      replaySoundNodes.add(osc);
      osc.onended=()=>replaySoundNodes.delete(osc);
    }
    osc.start();osc.stop(audio.currentTime+decay+.01);
  }catch{/* Audio must never interrupt control. */}
};
/** Shared sound-pack bridge: the game only plays a cue when the actual
 * simulation / UI already emitted the corresponding event. Unknown cue IDs
 * retain the earlier generic tone; individually disabled cues stay silent.
 * Replay sources remain cancellable on pause / seek / export.
 */
function playApprovedCue(id:string,level=1,pan=0,replayCue=false,
 rate=1,sourcePosition?:Pt,variationSeed?:number):boolean{
 if(!audio)return false;
 // Pure room presentation. Source geometry is read once per emitted event.
 // AI hearing and replay evidence are deliberately unaffected.
 const listener=replayCue&&replayBodycam.active?
  (replayKnowledge.observerId?
    replayAudioListener(team(state),selected,replayKnowledge.observerId)?.p:
    undefined):uid(selected)?.p;
 const acoustics=roomAudioEnabled&&sourcePosition?
  acousticResponseForCue(state.site??undefined,sourcePosition,id,
   listener,state.doors,WALLS):null;
 return playPackSound(audio,id,{
  level,pan,rate,acoustics,liveTactile:liveMixEnabled,
  variationSeed:liveMixEnabled?(variationSeed??++liveAudioVariationCounter):undefined,
  output:replayCue?videoAudioDestination:null,
  onSource:replayCue?(source)=>{
    replaySoundBuffers.add(source);
    const previous=source.onended;
    source.onended=(event)=>{
      previous?.call(source,event);
      replaySoundBuffers.delete(source);
    };
  }:undefined
 },approvedSoundPack);
}
/** Human-command sounds are event-driven; no movement tick ever emits them. */
function liveEventAudioPosition(event:string):Pt|undefined{
 const door=state.doors.find(d=>event.startsWith(d.id+' '));
 if(door)return doorCenter(door);
 if(event.includes('FLASH DETONATED'))return state.flashBursts.at(-1)?.p;
 const actor=state.operators.find(a=>event.startsWith(a.name+' '));
 return actor?.p??uid(selected)?.p;
}
/** Playback loudness and stereo position follow the real event origin.
 * No new AI/detection events and no HUD disclosure of hidden source positions. */
function playLiveEventCue(id:string,source?:Pt,scale=1):boolean{
 const listener=uid(selected)?.p;
 if(!source||!listener)return playApprovedCue(id,scale,0,false,1,source);
 const radius=id==='combat.flash'?420:
  id.startsWith('doors.')?265:
  id.startsWith('equipment.')?145:190;
 const level=heardIntensity(source,listener,radius,state.doors,WALLS);
 if(level<.025)return true;
 return playApprovedCue(id,Math.max(.02,level*scale),clamp(
  (source.x-listener.x)/210,-1,1),false,1,source);
}
function playOrderCue(id:string){
 if(!uiSoundEnabled)return;
 unlockAudio();playApprovedCue(id,.25);
}
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
    if(playApprovedCue('ui.'+(kind==='command'?'confirm':kind),.30))return;
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
let previousRenderDoors:Record<string,number>|null=null;
const displayRouteCache=new DisplayRouteCache();
const projectedRouteCache=new ProjectedRouteCache();
let cssW=innerWidth,cssH=innerHeight,dpr=1;
let viewScale=1,ox=0,oy=0,zoom=1,panX=0,panY=0;
let cursor:Pt|null=null;
let previewHover=false;
let trace:Pt[]|null=null;
const activePointers=new Map<number,{x:number;y:number;startX:number;startY:number;
  pointerType:string;wasUnit:boolean;nodeId:number|null;
  pick?:TacticalPick|null;dragCommitted?:boolean;
  selectionBefore?:{owner:string;node:number|null;watch:boolean;door:string|null};
  mode:'undecided'|'route'|'pan'|'node'|'watchTarget'|'activeWatch'|'pivot'|'sweep'|'cameraOrbit'|'cameraPan'|'cameraMulti'|'targetPreview';moved:boolean}>();
let pinchDistance=0,panMid:Pt|null=null;
/** Rebase the surviving pointers after a normal lift or a missing iOS lift. */
function settleCameraPointers():void{
  if(activePointers.size>=2){
    const pts=[...activePointers.values()].slice(0,2);
    pinchDistance=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    panMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
  }else{
    panMid=null;pinchDistance=0;
    if(activePointers.size===1){
      const remaining=[...activePointers.values()][0];
      if(remaining.mode==='cameraMulti'){
        // A lifted second finger must never leave the survivor in pinch.
        remaining.mode=viewMode==='plan2d'||!stage?'cameraPan':'cameraOrbit';
        remaining.moved=true;
        remaining.startX=remaining.x;remaining.startY=remaining.y;
      }
    }
  }
}
/**
 * iOS can drop a pointerup/lostcapture after a rapid pinch or an interrupted
 * touch. TouchEvent.touches is the browser's independent active-contact list;
 * reconcile ONLY surplus pointers, never synthesize a waypoint or a tap.
 * Touch identifiers aren't interchangeable with PointerEvent.pointerId, so
 * match by proximity instead of comparing their numeric IDs.
 */
function reconcileCanvasTouches(event:TouchEvent):void{
  const touchPointers=new Map([...activePointers].filter(
    ([,pointer])=>pointer.pointerType==='touch'));
  const live=Array.from(event.touches,t=>({x:t.clientX,y:t.clientY}));
  if(touchPointers.size<=live.length)return;
  // A one-finger tactical tap/drag is completed on pointerup. Don't erase
  // it ahead of that event merely because touchend arrived first.
  if(touchPointers.size===1&&live.length===0&&
    !['cameraMulti','cameraOrbit','cameraPan'].includes(
      [...touchPointers.values()][0].mode))return;
  const retained=matchActiveTouchPointers(touchPointers,live);
  let pruned=false;
  for(const id of touchPointers.keys()){
    if(retained.has(id))continue;
    activePointers.delete(id);
    if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    pruned=true;
  }
  if(!pruned)return;
  trace=null;draggingNode=null;draggingWatchTarget=false;
  settleCameraPointers();
  probeCameraGesture('touch-recovered');
}
function probeCameraGesture(phase:string):void{
  if(!import.meta.env.DEV)return;
  canvas.dataset.gesturePhase=phase;
  canvas.dataset.gestureCount=String(activePointers.size);
  canvas.dataset.gestureModes=[...activePointers.values()].map(p=>p.mode).join(',');
}
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
  uiClickTone('select');selected=id;looking=false;pushMode=false;evacMode=null;
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
  if(pushMode)return 'PUSH: tap or drag a direction away from the selected object (±80°). CANCEL to exit.';
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
  if(state.phase!=='planning'||replaying||looking||flashMode||pushMode||firePlacement||
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
  const choices:ReturnType<typeof contextActionChoices>=selectedWatch?[
    {id:'ctxWatch',label:'RETARGET',group:'primary',
      pressed:true,title:'Choose a new point for this active WATCH'},
    {id:'ctxDelete',label:'DELETE WATCH',group:'destructive',
      title:'Stop tracking this point; leave movement orders unchanged'}
  ]:contextActionChoices({
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
    watchActive,
    nodeFirePolicy:node?.firePolicyState,
  });
  const paletteChoices=choices.filter(choice=>choice.group!=='state');
  // The two layouts use the very same buttons and action handler.
  setContextPresentation(contextPlacement);
  // Reconcile buttons in-place: never create a second action dispatcher.
  const identity=(door?'door:'+door.id:node?'node:'+node.id:
    selectedWatch?'active-watch':'here')+'/'+selected;
  const contextChanged=contextSignature!==identity;
  if(contextChanged){
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
  const actionSignature=contextPlacement+'/'+identity+'/'+paletteChoices.map(c=>
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
    // Original floating groups DELETE separately; Dock includes every
    // contextual command in the same stationary grid.
    const destination=contextPlacement==='floating'?
      buckets[choice.group==='advanced'?'primary':choice.group]:buckets.primary;
    destination.append(button);
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
  if(contextPlacement==='dock'){
    paletteMotion.hide();contextTether.hidden=true;
    ui.context.style.transform='';
    return;
  }
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
      if(node?.kind==='wait')setWaitDuration(state,selected,node.id,1);
      else planWaitAt(state,selected,1,node?'end':'here',node?.id);
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
      pushMode=true;looking=false;flashMode=false;firePlacement=null;
      tacticalFeedback.emit('armed',node?.p??a.p,'PUSH DIRECTION');
      showUiHelp('TAP OR DRAG AWAY FROM THE OBJECT TO CHOOSE PUSH DIRECTION',3600);
      uiClickTone('select');updateHud();return;
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
    names===briefingRenderedRoster&&selectedEntry===briefingRenderedEntry)return;
 briefingRenderedSession=state;
 briefingRenderedDossier=dossier;
 briefingRenderedRoster=names;
 briefingRenderedEntry=selectedEntry;
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
  syncBriefingCard();
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
  const replayIsSaved=!!savedRecordingIds.get(recorder);
  ui.saveReplayDebrief.disabled=replayLibrary.busy||replayIsSaved;
  ui.saveReplayDebrief.textContent=replayIsSaved?'REPLAY SAVED':'SAVE REPLAY';
  ui.saveReplayDebrief.disabled=recorder.frames.length<2||replayLibrary.busy;
  ui.favoriteMission.disabled=!state.site;
  ui.favoriteMission.textContent=activeFavoriteId?
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
    const ammo=ui[(id+'Ammo') as 'rookAmmo'|'mossAmmo'|'ashAmmo'|'valeAmmo'];
    const capacity=a?liveMagazineCapacity(a.weapon,a.weaponConfiguration):0;
    const alert=a?magazineAlert(a.magazine,capacity):'normal';
    ammo.dataset.ammo=alert;
    ammo.textContent=a?String(a.magazine).padStart(2,'0')+' / '+a.reserve+
      (a.reload>0?' ↻':''):'--';
    ammo.title=a?`${a.magazine} / ${capacity} loaded · ${a.reserve} reserve rounds`:'';
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
    const status=compactExecutionStatus(execution,{
      selected:id===selected,
      phase:state.phase==='running'?'execution':
        state.phase==='planning'?'planning':
        replaying?'replay':'debrief',
      down:!a||a.health<=0
    });
    stateLine.hidden=!status.visible;
    stateLine.textContent=status.label;
    stateLine.dataset.kind=execution?.kind??'idle';
    stateLine.dataset.priority=status.priority;
    button.dataset.executionVisible=String(status.visible);
    stateLine.title=status.detail;
    if(execution?.progress!==undefined){
      stateLine.dataset.progress='true';
      stateLine.style.setProperty('--execution-progress',
        Math.round(execution.progress*100)+'%');
    }else{
      stateLine.removeAttribute('data-progress');
      stateLine.style.removeProperty('--execution-progress');
    }
    button.setAttribute('aria-label',a?
      a.name+', '+condition+', '+a.magazine+' of '+capacity+
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
      if(spatialSurfaceState(state,'room',room.id,replaying&&replayKnowledge.omniscient)==='unknown')continue;
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
    if(spatialSurfaceState(state,'cover',i,replaying&&replayKnowledge.omniscient)==='unknown')continue;
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
    spatialSurfaceState(state,'wall',i,replaying&&replayKnowledge.omniscient)!=='unknown')
    wallShape(wall.a,wall.b);
  // Closed doors obscure sight and movement; opened doors have an arc.
  for(const door of state.doors){
    if(spatialSurfaceState(state,'door',door.id,replaying&&replayKnowledge.omniscient)==='unknown')continue;
    const a=door.a,b=door.b,center=doorCenter(door);
    // Personal contact review consumes the last door state this operator
    // actually witnessed. Never substitute today's door state after a rewind.
    const personalDoor=replaying&&replayKnowledge.observerId?
      replayKnowledge.doorHistory?.at(replayPlayback.time,replayKnowledge.observerId,door.id):null;
    const visuallyOpen=replaying&&replayKnowledge.observerId?
      (personalDoor?.openFraction??0):
      liveVisibility(state,center)?
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
    if(replaying&&replayKnowledge.observerId?
      !!personalDoor?.wedged:door.wedged){
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
/** Authored historical orders, not recomputed motor navigation. */
function replayPlanFor(a:TeamActor){
  const initial=replaying&&replayPlanVersion==='original'?
    recorder.plans.initial(a.id):null;
  return {nodes:initial?.nodes??a.plan,
    origin:initial?.origin??a.p};
}
function paths(){
  for(const a of team(state)){
    if(a.health<=0&&(!replaying||replayPlanVersion!=='original'))continue;
    if(replaying&&(replayPlanScope==='none'||
      replayPlanScope==='selected'&&a.id!==selected))continue;
    const c=colorFor(a.id);
    const {nodes:plan,origin}=replayPlanFor(a);
    const muted=!replaying&&a.id!==selected;
    const activeTarget=activeWatchTarget(a);
    if(activeTarget&&(!replaying||replayPlanVersion==='active')){
      draw.save();draw.globalAlpha=muted?.30:1;
      drawActiveWatchMarker(a.p,
        a.id===selected&&selectedActiveWatch&&draggingNode?
          draggingNode:activeTarget,c,a.id===selected,a.name);
      draw.restore();
    }
    const visual=orderVisualScopes(plan,{
      watch:a.aimInstruction?.mode==='track',pace:a.pace,
      posture:a.posture,fire:a.firePolicy
    });
    if(plan.length){
      draw.beginPath();draw.moveTo(origin.x,origin.y);
      let from=origin;
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
      draw.strokeStyle=c;draw.globalAlpha=a.id===selected?.94:muted?.18:.40;
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
    draw.save();draw.globalAlpha=muted?.32:1;
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
        const first=plan[i-1]?.p??origin;
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
    draw.restore();
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
/** Bounded forensic overlay; complete shot evidence stays in recorder. */
function historicalShotVisible(shot:RecordedShot):boolean{
  // Shot endpoints and impacts reveal more than the confirmed observer's
  // recorded contacts. Keep forensic trajectories in Team/Full modes only.
  if(replayKnowledge.observerId)return false;
  if(replayKnowledge.omniscient||shot.side==='blue')return true;
  const frame=recorder.at(shot.recordedAt);
  return !!frame?.knowledge?.visibleActorIds.includes(shot.shooterId);
}
function renderReplayBallistics(projected:boolean):void{
  if(!replaying||replayTraceMode==='off')return;
  const windowSeconds=replayTraceMode==='selected'?10:3;
  const recent=recorder.ballistics.between(
    Math.max(0,replayPlayback.time-windowSeconds),replayPlayback.time,
    replayTraceMode==='selected'?selected:undefined);
  // Cap only the rendered strokes, not the permanent shot history.
  draw.save();draw.lineWidth=1.8;
  for(const shot of recent.slice(-128)){
    if(!historicalShotVisible(shot))continue;
    const from=projected?
      worldToScreen(shot.start,shot.muzzleHeight??16):shot.start;
    const to=projected?
      worldToScreen(shot.end,shot.impactHeight??7):shot.end;
    draw.globalAlpha=.83-.49*Math.min(1,
      (replayPlayback.time-shot.recordedAt)/windowSeconds);
    draw.strokeStyle=shot.side==='blue'?'#e8c985':'#d88d75';
    draw.setLineDash(shot.hit?[]:[4,4]);
    draw.beginPath();draw.moveTo(from.x,from.y);
    draw.lineTo(to.x,to.y);draw.stroke();
    draw.setLineDash([]);
    draw.fillStyle=shot.hit?'#efc2a0':'#b5a998';
    draw.beginPath();draw.arc(to.x,to.y,shot.hit?4:2.5,0,Math.PI*2);
    draw.fill();
  }
  const selectedShot=selectedReplayShotId===null?null:
    recorder.ballistics.shots.find(s=>s.id===selectedReplayShotId);
  if(selectedShot&&historicalShotVisible(selectedShot)){
    const a=projected?worldToScreen(selectedShot.start,selectedShot.muzzleHeight??16):selectedShot.start;
    const b=projected?worldToScreen(selectedShot.end,selectedShot.impactHeight??7):selectedShot.end;
    draw.save();draw.globalAlpha=1;draw.strokeStyle='#f5e8b3';draw.lineWidth=3;
    draw.setLineDash([]);draw.beginPath();draw.moveTo(a.x,a.y);
    draw.lineTo(b.x,b.y);draw.stroke();
    draw.fillStyle='#fff0a6';draw.beginPath();draw.arc(b.x,b.y,6,0,Math.PI*2);
    draw.fill();draw.restore();
  }
  draw.restore();
}
/** Ghost sprites are intentionally abstract and share the operator palette. */
/** Replay R3: actual recorded route — not authored waypoints. */
/** Camera-follow selection is a spatial affordance, not just a HUD label.
 * The ring sits on the actual historical friendly; no enemy data is used. */
function renderReplayFollowMarker(projected:boolean):void{
  if(!replaying||!replayNameTags||replayCamera.mode!=='operator'||replayBodycam.active)return;
  const actor=team(state).find(a=>a.id===replayCamera.followId&&a.health>0);
  if(!actor)return;
  const point=projected?worldToScreen(actor.p,21):actor.p;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
  const px=projected?1:1/Math.max(.3,viewScale);
  const radius=22*px;
  const pulse=1.5*Math.sin(replayPlayback.time*2.2);
  draw.save();
  draw.lineWidth=3*px;
  draw.strokeStyle='#1b302b';
  draw.beginPath();draw.arc(point.x,point.y,radius+2*px,0,Math.PI*2);
  draw.stroke();
  draw.lineWidth=2.3*px;
  draw.strokeStyle='#f0d394';
  draw.beginPath();draw.arc(point.x,point.y,radius+pulse*px,0,Math.PI*2);
  draw.stroke();
  draw.fillStyle='#f5e4bb';
  draw.font='700 '+(11*px)+'px "Saira Condensed",sans-serif';
  draw.textAlign='center';
  draw.fillText('FOLLOW · '+actor.name.toUpperCase(),
    point.x,point.y-(radius+10*px));
  draw.restore();
}
function renderReplayMovementHistory(projected:boolean):void{
  if(!replaying||replayTrailMode==='off'||!replayMovementHistory)return;
  draw.save();draw.globalAlpha=.58;draw.lineWidth=2.15;draw.setLineDash([]);
  for(const a of team(state)){
    const trail=replayMovementHistory.segment(a.id,replayPlayback.time,
      replayTrailMode==='recent'?15:Infinity,350);
    if(trail.length<2)continue;
    draw.strokeStyle=colorFor(a.id);draw.beginPath();
    for(let i=0;i<trail.length;i++){
      const p=projected?worldToScreen(trail[i].p,2):trail[i].p;
      if(i===0)draw.moveTo(p.x,p.y);else draw.lineTo(p.x,p.y);
    }
    draw.stroke();
  }
  draw.restore();
}
function renderReplayGhosts(projected:boolean):void{
  if(!replaying||replayGhostMode==='off')return;
  const ids=new Set(replayGhostMode==='selected'?[selected]:
    team(state).map(a=>a.id));
  const ghosts=sampleReplayGhosts(recorder,replayPlayback.time,ids);
  draw.save();draw.lineWidth=1.5;
  for(const ghost of ghosts){
    const p=projected?worldToScreen(ghost.p,20):ghost.p;
    draw.save();
    draw.translate(p.x,p.y);draw.rotate(ghost.heading);
    draw.globalAlpha=.34/(1+ghost.ageSeconds*.28);
    draw.strokeStyle=colorFor(ghost.actorId);
    draw.fillStyle=colorFor(ghost.actorId);
    // Simple body-and-weapon symbol; never creates another expensive rig.
    draw.strokeRect(-7,-5,14,10);
    draw.fillRect(4,-2,8,4);
    draw.restore();
  }
  draw.restore();
}
function renderProjectedPlans(){
  if(!stage)return;
  // Compare exact camera matrices; active zoom/orbit easing invalidates
  // immediately, while unchanged path projections are reused.
  projectedRouteCache.beginFrame(stage.camera,cssW,cssH);
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.clearRect(0,0,cssW,cssH);
  for(const a of team(state)){
    if(a.health<=0&&(!replaying||replayPlanVersion!=='original'))continue;
    if(replaying&&(replayPlanScope==='none'||
      replayPlanScope==='selected'&&a.id!==selected))continue;
    const {nodes:plan,origin}=replayPlanFor(a);
    const color=colorFor(a.id);
    const muted=!replaying&&a.id!==selected;
    const activeTarget=activeWatchTarget(a);
    if(activeTarget&&(!replaying||replayPlanVersion==='active')){
      draw.save();draw.globalAlpha=muted?.30:1;
      drawActiveWatchMarker(worldToScreen(a.p,8),
        worldToScreen(a.id===selected&&selectedActiveWatch&&draggingNode?
          draggingNode:activeTarget,12),color,a.id===selected,a.name);
      draw.restore();
    }
    let previous=origin;
    const visual=orderVisualScopes(plan,{
      watch:a.aimInstruction?.mode==='track',pace:a.pace,
      posture:a.posture,fire:a.firePolicy
    });
    let visualIndex=0;
    draw.save();
    for(const n of plan){
      const semantics=visual[visualIndex++];
      const cachedRoute=n.kind==='move'||n.kind==='door'?
        displayRouteCache.get(previous,n.p,state.intel,state.phase==='planning',
          (from,to,ordinary)=>plannedWindowRoute(state,from,to,ordinary),
          state.objectRevision):null;
      const steps=n.kind==='pie'?n.arc??[]:cachedRoute?.points??[];
      if(steps.length){
        draw.beginPath();
        const start=worldToScreen(previous,4);
        draw.moveTo(start.x,start.y);
        const projectedSteps=cachedRoute?
          projectedRouteCache.get(steps,4,p=>worldToScreen(p,4)):
          steps.map(p=>worldToScreen(p,4));
        for(const projected of projectedSteps)
          draw.lineTo(projected.x,projected.y);
        draw.strokeStyle=color;
        draw.globalAlpha=a.id===selected?.96:muted?.18:.50;
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
      draw.globalAlpha=muted?.32:1;
      const selectedNow=a.id===selected&&selectedNode===n.id;
      const point=worldToScreen(selectedNow&&draggingNode&&!draggingWatchTarget&&n.kind!=='flash'?
        draggingNode:n.p,8);
      const invalidDrag=selectedNow&&draggingNode&&!draggingWatchTarget&&
        !intelPassable(draggingNode,state.intel,SQUEEZE_RADIUS);
      circle(point.x,point.y,selectedNow?11:7,
        invalidDrag?'#df8070':selectedNow?'#ecd29f':color);
      circle(point.x,point.y,3,'#233b39');
      draw.fillStyle='#142829';draw.font='700 12px "Saira Condensed",sans-serif';
      draw.textAlign='center';draw.fillText(String(plan.indexOf(n)+1),
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
    draw.restore();
    const pawn=worldToScreen(a.p,32),ground=worldToScreen(a.p,1);
    const squadIndex=team(state).findIndex(member=>member.id===a.id);
    const labelSpread=state.site?[
      {x:-27,y:-17},{x:27,y:-17},
      {x:-27,y:-36},{x:27,y:-36},
    ][squadIndex]??{x:0,y:-9}:{x:0,y:-9};
    draw.textAlign='center';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillStyle=color;
    if(!replaying&&(a.id===selected||a.injuryStage>0||replayCamera.follow&&
      replayCamera.followId===a.id))
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
  // Recorded operator labels are independent of route visibility.
  if(replaying&&replayNameTags)for(const member of team(state)){
    const pawn=worldToScreen(member.p,32);
    draw.textAlign='center';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillStyle=colorFor(member.id);
    draw.fillText(member.name,pawn.x,pawn.y-23);
  }
  // Screen-space icons stay readable regardless of ortho pitch or zoom.
  for(const hostile of enemies(state)){
    if(replaying?!replayActorDisclosed(state,hostile,replayKnowledge.disclosure()):
      !liveVisibility(state,hostile.p))continue;
    const ground=worldToScreen(hostile.p,1);
    // Do not paint projected blood/bodies over the finished 3D scene:
    // Canvas2D cannot depth-test against walls, packs or door leaves.
    // The grounded miniature and actual world-space floor stain carry DOWN.
    if(hostile.health>0&&(!replaying||replayContactMarkers)){
      draw.strokeStyle='#e2a18b';draw.lineWidth=1.6;
      draw.beginPath();draw.arc(ground.x,ground.y,12,0,Math.PI*2);draw.stroke();
    }
  }
  for(const member of team(state)){
    const pawn=worldToScreen(member.p,33);
    if(member.health===1){
      draw.fillStyle='#e6a485';draw.fillRect(pawn.x-10,pawn.y+1,20,3);
    }
  }
  // Door shapes communicate door identity. Only show a selector when the
  // selected operator or its planned endpoint can actually interact.
  const active=uid(selected);
  if(!replaying)for(const door of state.doors){
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
    if(replaying&&(!replayContactMarkers||replayKnowledge.observerId))continue;
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
  if((!replaying||replayObjectiveMarkers)&&
    state.mission!=='clear'&&state.mission!=='done'){
    const target=worldToScreen(state.mission==='secure'?
      state.scenario.objective:state.scenario.extract,9);
    draw.strokeStyle='#e8d5a6';draw.lineWidth=2;
    draw.beginPath();draw.arc(target.x,target.y,17,0,2*Math.PI);draw.stroke();
    draw.fillStyle='#e8d5a6';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillText(state.mission.toUpperCase(),target.x,target.y-23);
  }
  renderReplayMovementHistory(true);
  renderReplayGhosts(true);
  renderReplayBallistics(true);
  renderReplayFollowMarker(true);
  if(!replaying||replayAnalysis)
    for(const a of team(state))drawExecutionProblem(a,true);
}
/** Gold denotes actual historically observed cells for the selected operator.
 * Shared geometry/doors/people remain shared and are NEVER claimed as POV.
 * Render only in the Floor Plan view; no speculative real-time raycasts.
 */
function renderReplayPersonalGround():void{
  if(!replaying||!replayKnowledge.groundLensOn||viewMode!=='plan2d'||
    !replayKnowledge.observerId||!replayKnowledge.personalGround)return;
  const observed=replayKnowledge.personalGround.at(
    replayPlayback.time,replayKnowledge.observerId);
  if(!observed)return;
  if(replayKnowledge.groundCacheObserver!==replayKnowledge.observerId||
     replayKnowledge.groundCacheCount!==observed.size||
     replayKnowledge.groundCacheSite!==state.site){
    paintReplayPersonalGround(replayGroundContext!,state.site,observed);
    replayKnowledge.groundCacheObserver=replayKnowledge.observerId;
    replayKnowledge.groundCacheCount=observed.size;
    replayKnowledge.groundCacheSite=state.site;
  }
  const b=maskBounds(state.site);
  draw.drawImage(replayGroundCanvas,b.minX,b.minY,
    b.maxX-b.minX,b.maxY-b.minY);
}
function fog(){
  if(replaying&&replayKnowledge.omniscient)return;
  if(fogStamp<0||fogSession!==state||fogIntelMode!==state.intel.mode||
    fogSeenRevision!==state.seenGroundRevision||
    state.seconds<fogStamp||state.seconds-fogStamp>.055){
    fogStamp=state.seconds;fogSession=state;fogIntelMode=state.intel.mode;
    fogSeenRevision=state.seenGroundRevision;
    paintFogMask(fogContext!,state,
      new URLSearchParams(location.search).get('fogDebug')==='palette'?
        'palette':'normal');
  }
  draw.drawImage(fogCanvas,0,0,W,H);
}
function missionMarkers(){
  if(replaying&&!replayObjectiveMarkers)return;
  if(state.rescue&&!state.civilians.some(c=>c.rescueTarget)&&
     liveVisibility(state,state.rescue.p)){
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
function civilianSprite(c:import('./breach-civilian-types.ts').CivilianActor){
  // Personal observation is not shared civilian intel. Old films omit the
  // observer evidence and must fail closed, not re-evaluate future LOS.
  if(replaying&&replayKnowledge.observerId){
    if(!replayCivilianDisclosed(state,c.id,replayKnowledge.disclosure()))return;
  }else if(!civilianPresentationVisible(c,replaying,replayKnowledge.omniscient,
       liveVisibility(state,c.p)))return;
  const coats=['#766e62','#637d75','#82726b','#667985'];
  const trousers=['#454c4b','#61574d','#4e5664'];
  const coat=coats[(c.appearanceSeed>>>0)%coats.length];
  const pants=trousers[(c.appearanceSeed>>>4)%trousers.length];
  draw.save();draw.translate(c.p.x,c.p.y);draw.rotate(c.heading);
  const pose=civilianPose(c);
  if(pose==='down'||pose==='carried'||pose==='dragged'){
    draw.globalAlpha=pose==='carried'?.96:.83;
    rect(-10,-6,23,12,coat);rect(7,-5,8,10,'#ba9880');
  }else{
    rect(-12,-6,7,5,pants);rect(-12,1,7,5,pants);
    rect(-7,-8,16,16,coat);
    rect(7,-4.5,9,9,'#b9997e');
    if(pose==='compliant'){
      rect(2,-16,5,9,'#b9997e');rect(2,7,5,9,'#b9997e');
    }else if(pose==='hide'||pose==='injured'||pose==='seated'){
      rect(-5,-11,7,3,'#b9997e');rect(-5,8,7,3,'#b9997e');
    }else{
      const swing=pose==='run'?
        Math.sin(state.seconds*13+c.appearanceSeed)*3:
        pose==='walk'?Math.sin(state.seconds*8+c.appearanceSeed)*1.5:
        pose==='injured-walk'?
          Math.sin(state.seconds*5+c.appearanceSeed)*.9:0;
      rect(-5+swing,-12,8,4,'#b9997e');
      rect(-5-swing,8,8,4,'#b9997e');
    }
  }
  draw.restore();
}
function sprite(a:TeamActor){
  if(a.side==='red'&&!(replaying&&replayKnowledge.omniscient)){
    const visible=replaying?replayActorDisclosed(state,a,replayKnowledge.disclosure()):
      a.health>0?isSeen(state,a):liveVisibility(state,a.p);
    if(!visible){
      const memory=lastKnown(state,a.id);
      if(!replayKnowledge.observerId&&memory&&a.health>0&&state.seconds-memory.at<25){
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
  if(friendly&&(a.id===selected)&&
     (!replaying||replayPlanScope!=='none')){
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
    draw.fillStyle=c;
    if(!replaying||replayNameTags)draw.fillText(a.name,a.p.x,a.p.y-21);
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
    // The enemy is still drawn; only the optional red tactical outline
    // disappears when replay contact markers are disabled.
    if(!replaying||replayContactMarkers){
      draw.strokeStyle='#f0c5a4';draw.lineWidth=1.4;
      draw.strokeRect(a.p.x-12,a.p.y-12,24,24);
    }
    // Enemy names are intentionally never shown.
  }
}
function contacts(){
  if(replaying&&replayAnalysis&&replayContactMarkers)
    for(const a of enemies(state)){
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
    // Shot geometry can expose an unconfirmed enemy position in a personal
    // contact review; team-wide ballistic evidence is disabled in this mode.
    if(replaying&&replayKnowledge.observerId)continue;
    const visibility=replaying&&replayKnowledge.omniscient?
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
  if(actor.side==='red'&&!replayActorDisclosed(state,actor,
      replaying?replayKnowledge.disclosure():{mode:'squad'}))continue;
  const previous=beam2DHistory.get(actor.id);
  const yaw=actor.weaponYaw;
  if(!previous||previous.tick!==tick||!sameWeaponConfiguration(previous.config,actor.weaponConfiguration)||
   Math.hypot(previous.x-actor.p.x,previous.y-actor.p.y)>.7||
   Math.abs(Math.atan2(Math.sin(previous.yaw-yaw),Math.cos(previous.yaw-yaw)))>.025){
   const muzzle=weaponClearance({x:actor.p.x,z:actor.p.y,
    heading:actor.heading,weaponYaw:yaw,weapon:actor.weapon,
    weaponConfiguration:actor.weaponConfiguration,
    equipment:actor.equipment,aim:actor.aim,
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
    if(!(replaying&&replayKnowledge.omniscient)&&!liveVisibility(state,mark.p))continue;
    const radius=mark.surface==='blood'?
      confinedGroundRadius(mark.p,4,state.site?.walls??WALLS):2.5;
    if(radius<.5)continue;
    draw.globalAlpha=Math.max(.18,.78-mark.age*.023);
    circle(mark.p.x,mark.p.y,radius,
      mark.surface==='blood'?'#914a44':
      mark.surface==='wood'?'#42332a':
      mark.surface==='stone'?'#363936':
      mark.surface==='metal'?'#262e30':'#4e4b40');
    draw.globalAlpha=1;
  }
 }
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
    renderProjectedPlans();return;
  }
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  draw.fillStyle='#52655b';draw.fillRect(-9,-9,W+18,H+18);
  terrain();furniture();renderGroundMarks();renderLightingMood2D();renderWeaponLights2D();
  architecture();fog();renderReplayPersonalGround();missionMarkers();
  paths();renderReplayMovementHistory(false);
  for(const a of state.civilians)civilianSprite(a);
  for(const a of state.operators)sprite(a);
  if(!replaying||replayAnalysis)
    for(const a of team(state))drawExecutionProblem(a,false);
  contacts();renderReplayGhosts(false);renderReplayBallistics(false);
  renderReplayFollowMarker(false);endMessage();
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(0,0,W,H);
  draw.restore();
}
/** Rejected authoring orders keep the existing plan intact and mark only
 * the attempted world point; no hidden geometry or actors are inspected. */
function rejectAt(pt:Pt,reason:string){
  state.events.push(reason);
  tacticalFeedback.emit('error',pt,recoveryAdviceFor(reason)?.marker??'INVALID');
  uiClickTone('warning');
}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning'||replaying)return;
  if(pushMode){
    const accepted=planNearbyInteraction(state,selected,'push',
      selectedNode??undefined,pt);
    if(!accepted)rejectAt(pt,'NO PUSHABLE OBJECT IN REACH');
    else{
      pushMode=false;tacticalFeedback.emit('command',pt,'PUSH');
      uiClickTone('command');
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
    const actor=uid(selected);
    const source=retargetingActive?actor?.p:selectedNode!==null?
      actor?.plan.find(node=>node.id===selectedNode)?.p:
      actor?(armedOrigin==='here'?actor.p:finalPoint(actor)):null;
    const target=source?aimTargetFromTap(source,pt):null;
    const committed=!!target&&(retargetingActive?
      retargetActiveWatch(state,selected,target):
      lookMode==='watch'?
        planWatch(state,selected,target,selectedNode??undefined,armedOrigin):
        planAim(state,selected,'free',target,selectedNode??undefined,'look',armedOrigin));
    if(!committed){
      rejectAt(pt,target?'AIM ORDER UNAVAILABLE':
        'AIM DIRECTION UNAVAILABLE · TAP AWAY FROM THE OPERATOR');
      showUiHelp('CHOOSE A LOOK / WATCH DIRECTION, OR CANCEL',3200);
    }
    else{
      tacticalFeedback.emit('command',target!,lookMode==='watch'?'WATCH':'LOOK');
      playOrderCue(lookMode==='watch'?'orders.watch':'orders.look');
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
    playOrderCue('orders.waypoint');
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
/** Only continuous playback crosses sound timestamps; seeks never audition
 * an accumulated event backlog. All cues use the shared unlocked context. */
function playReplayAudioBetween(start:number,end:number):void{
  if(!replaying||!replaySoundEnabled||!replaySoundTimeline||
    !audio||audio.state!=='running'||end<=start)return;
  if(replayPlayback.rate>2)return; // Rapid scan is deliberately quiet.
  // First-person audio follows the recorded operator, not a teammate.
  const listenerActor=replayBodycam.active&&!replayKnowledge.observerId?null:
    replayAudioListener(team(state),selected,
      replayBodycam.active?replayKnowledge.observerId:null);
  if(replayBodycam.active&&!listenerActor)return;
  const listener=listenerActor?.p;
  const rateScale=Math.max(.5,Math.min(2,1/replayPlayback.rate));
  for(const event of replaySoundTimeline.between(start,end,7)){
    const p=event.p;
    const level=p&&listener?heardIntensity(p,listener,
      event.kind==='gunshot'?WEAPONS[event.weapon??'carbine'].noise:150,
      state.doors,WALLS):.35;
    if(level<.025)continue;
    const pan=p&&listener?
      (replayBodycam.active&&listenerActor?
        replayBodycamPan(p,listenerActor):(p.x-listener.x)/210):0;
    if(event.kind==='gunshot'){
      const cue=weaponAudioCue(event.weapon??'carbine',event.suppressed);
      if(!playApprovedCue('weapons.'+(event.weapon??'carbine')+
        (event.suppressed?'_suppressed':''),level,pan,true,1/rateScale,
         p??undefined,hashString(event.id))){
        playTone(cue.crackHz,cue.crackSeconds*rateScale,true,level,pan,true);
        playTone(cue.bodyHz,cue.bodySeconds*rateScale,false,
          level*cue.bodyLevel,pan,true);
      }
      // Do not play exact-hit confirmation: the team may not have perceived it.
    }else{
      const tones={door:[160,.16],flash:[1350,.65],
        reload:[280,.09],interaction:[210,.12],
        surrender:[210,.22]} as const;
      const [hz,length]=tones[event.kind];
      const soundId={door:replayDoorSoundId(event.description),flash:'combat.flash',
        reload:'equipment.reload',interaction:'',surrender:'people.surrender'
      }[event.kind];
      if(!soundId||!playApprovedCue(soundId,Math.min(level,.7),
        pan,true,1/rateScale,p??undefined,hashString(event.id)))
        playTone(hz,length*rateScale,event.kind==='flash',
          Math.min(level,.7),pan,true);
    }
  }
  // 60 Hz-authored touchdown positions already exist in the motion track.
  const ids=team(state).map(a=>a.id);
  const touches=recorder.motion.touchdownsBetween(start,end,ids);
  for(const touch of touches.slice(-6)){
    const level=listener?heardIntensity(touch.position,listener,
      36,state.doors,WALLS):.2;
    if(level<.025)continue;
    const pan=listener?
      (replayBodycam.active&&listenerActor?
        replayBodycamPan(touch.position,listenerActor):
        (touch.position.x-listener.x)/210):0;
    if(!playApprovedCue('movement.boot',level*.20,pan,true,1/rateScale,
       touch.position,hashString(touch.id+'|'+touch.foot+'|'+touch.at.toFixed(3))))
      playTone(touch.foot===0?62:67,.055*rateScale,true,
        level*.12,pan,true);
  }
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
  ui.replayClusterMenu.hidden=true;
  // Direct navigation deliberately exits a bounded incident film.
  replayPlayback.incident=null;
  if(replayQuickVideo.active)replayQuickVideo.stop();
  stopReplaySounds();
  replayPlayback.time=Math.max(0,Math.min(recorder.duration,t));
  replayDirector.target=null;
  
  stage?.resetReplayBodycamSmoothing();
  applyReplayFrameAt(replayPlayback.time);advanceReplayCamera(0,true);
  if(!ui.replayFeed.hidden)renderReplayEventFeed();
  updateReplayHud();
}
/** Replay event feed and navigation share the same disclosure boundary. */
function replayEventKnown(e:ReplayIndexedEvent):boolean{
  if(replayKnowledge.observerId){
    const recorded=recorder.at(e.t)?.knowledge??null;
    return operatorContactEventKnown(e,recorded,replayKnowledge.observerId,
      new Set(team(state).map(a=>a.id)));
  }
  if(replayKnowledge.omniscient||e.kind==='objective')return true;
  if(team(state).some(a=>a.id===e.actor))return true;
  const frame=recorder.at(e.t);
  if(!frame)return false;
  if(frame.knowledge)return !!e.actor&&
    frame.knowledge.visibleActorIds.includes(e.actor);
  // Older recordings lack recorded visibility. Keep the guarded prior fallback.
  const p=e.p;
  return !!p&&(frame.seenGround.includes(
    Math.floor(p.x/40)+','+Math.floor(p.y/40))||
    frame.seenGround.includes(
      'fine:'+Math.floor(p.x/20)+','+Math.floor(p.y/20)));
}
/** Shot investigation never introduces unrecorded future information. */
function currentReplayShot():RecordedShot|null{
  return selectedReplayShotId===null?null:
    recorder.ballistics.shots.find(s=>s.id===selectedReplayShotId)??null;
}
function closeReplayShotInspector():void{
  selectedReplayShotId=null;
  ui.replayShotInspector.hidden=true;
}
function refreshReplayShotInspector():void{
  const shot=currentReplayShot();
  if(!shot||!historicalShotVisible(shot)){
    closeReplayShotInspector();return;
  }
  const knowledge=recorder.at(shot.recordedAt)?.knowledge??null;
  const detail=inspectRecordedShot(shot,knowledge,replayKnowledge.omniscient);
  ui.replayShotInspector.hidden=false;
  ui.replayShotTitle.textContent='SHOT '+detail.id+' · '+
    formatReplayTime(detail.time);
  ui.replayShotDetails.textContent=
    detail.shooterId.toUpperCase()+' · '+detail.weapon.toUpperCase()+'\n'+
    (detail.targetId?('TARGET '+detail.targetId.toUpperCase()+' · '+
      (detail.hit?'HIT':'MISS')+
      (detail.healthAfter!==null?' · HP '+detail.healthBefore+
        ' → '+detail.healthAfter:'')):
      'TARGET DETAILS UNCONFIRMED')+'\n'+
    'IMPACT '+detail.end.x.toFixed(0)+', '+detail.end.y.toFixed(0)+
    (detail.surface?' · '+detail.surface.toUpperCase():'');
  const all=recorder.ballistics.shots;
  ui.replayShotPrev.disabled=!adjacentRecordedShot(all,shot.id,false,
    historicalShotVisible);
  ui.replayShotNext.disabled=!adjacentRecordedShot(all,shot.id,true,
    historicalShotVisible);
}
function selectReplayShot(shot:RecordedShot):void{
  if(!historicalShotVisible(shot))return;
  selectedReplayShotId=shot.id;
  replayTraceMode='recent';
  replayPlayback.playing=false;seekReplay(shot.recordedAt);
  showReplayToolTab('layers');
  const layers=ui.replayExtra.querySelector<HTMLDetailsElement>(
    '[data-replay-group="layers"]');
  if(layers)layers.open=true;
  refreshReplayShotInspector();
}
function focusReplayShot():void{
  const shot=currentReplayShot();
  if(!shot)return;
  chooseReplayCamera('free');replayCamera.follow=false;replayPlayback.playing=false;
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
/** Rebuild chapter buttons only on replay entry, intel change or bookmark. */
function renderReplayChapters():void{
  const fragment=document.createDocumentFragment();
  const entries=[
    ...replayChapters.map(c=>({t:c.t,label:c.label,kind:'chapter'})),
    ...replayBookmarks.map(b=>({t:b.t,label:b.label,kind:'bookmark'}))
  ].sort((a,b)=>a.t-b.t);
  for(const entry of entries){
    const button=document.createElement('button');
    button.type='button';button.className='replay-chapter-item';
    button.dataset.kind=entry.kind;
    button.textContent=formatReplayTime(entry.t)+' · '+entry.label;
    button.addEventListener('click',()=>{
      replayPlayback.playing=false;seekReplay(entry.t);
    });
    fragment.append(button);
  }
  ui.replayChapterList.replaceChildren(fragment);
}
/** At most a short horizontal row: every item is a real, disclosed fact.
 * Movement inspection enables existing planned/actual overlays without
 * changing the recorded film or issuing any gameplay orders.
 */
function renderReplayIncidentFocus():void{
  const incident=replayIncidents.find(i=>i.id===selectedReplayIncidentId);
  ui.replayIncidentDetails.hidden=!incident;
  if(!incident)return;
  ui.replayIncidentTitle.textContent=formatReplayTime(incident.start)+' · '+
    incident.label;
  ui.replayIncidentSummary.textContent=incident.summary;
}
/** Sparse personal observation events are independent of team battle feed.
 * Importantly a lost contact contains no guessed position or threat state.
 */
function renderObserverSightTransitions():void{
  const observer=replayKnowledge.observerId;
  const mount=ui.replayObserverTransitions;
  mount.hidden=!observer;
  if(!observer){mount.replaceChildren();return;}
  const transitions=replayKnowledge.sightIndex?.forObserver(observer)??[];
  const fragment=document.createDocumentFragment();
  if(!transitions.length){
    const empty=document.createElement('span');
    empty.className='replay-observer-empty';
    empty.textContent='NO PERSONAL CONTACT TRANSITIONS RECORDED';
    fragment.append(empty);
  }
  for(const event of transitions.slice(0,16)){
    const button=document.createElement('button');
    button.type='button';
    button.className='replay-debrief-moment';
    button.dataset.kind=event.kind;
    const time=document.createElement('span');
    time.className='time';
    time.textContent=formatReplayTime(event.t)+' · '+
      (event.kind==='visible-at-start'?'ALREADY VISIBLE':
        event.kind==='acquired'?'CONTACT ACQUIRED':'CONTACT LOST');
    const target=document.createElement('span');
    target.className='detail';target.textContent=event.targetId;
    button.append(time,target);
    button.title=event.targetId+' · '+event.kind;
    button.addEventListener('click',()=>{
      replayPlayback.playing=false;selected=observer;replayCamera.followId=observer;
      seekReplay(event.t);
    });
    fragment.append(button);
  }
  mount.replaceChildren(fragment);
}
/** R4.4: only recorded friendly threshold crossing facts. No inferred
 * breach timing, synchronized intent, or knowledge of unseen enemies.
 */
function renderReplaySquadEntries():void{
  const host=ui.replaySquadEntryList;
  const panel=ui.replaySquadEntryPanel;
  panel.hidden=replaySquadEntries.length===0;
  if(panel.hidden){host.replaceChildren();return;}
  const fragment=document.createDocumentFragment();
  for(const entry of replaySquadEntries){
    const count=entry.crossings.filter(c=>c.crossedAt!==null).length;
    const button=document.createElement('button');
    button.type='button';button.className='replay-entry-review-item';
    button.setAttribute('aria-pressed',
      String(entry.doorId===selectedReplaySquadEntry));
    const title=document.createElement('strong');
    title.textContent=entry.doorId+' · '+count+'/'+entry.crossings.length+
      ' CROSSED'+(entry.spreadSeconds===null?'': ' · '+
      entry.spreadSeconds.toFixed(1)+'S SPREAD');
    const details=document.createElement('small');
    details.textContent=entry.crossings.map(c=>
      c.actorId.toUpperCase()+' '+
      (c.crossedAt===null?(c.alreadyBeyond?'ALREADY PAST':'NOT RECORDED'):
        formatReplayTime(c.crossedAt))).join(' · ');
    button.title='Measured crossings only · '+details.textContent;
    button.append(title,details);
    button.addEventListener('click',()=>{
      if(entry.firstCrossingAt===null)return;
      selectedReplaySquadEntry=entry.doorId;
      replayPlayback.playing=false;
      seekReplay(Math.max(0,entry.firstCrossingAt-.6));
      renderReplaySquadEntries();
    });
    fragment.append(button);
  }
  host.replaceChildren(fragment);
}
function renderReplayDebrief():void{
  const stalls=buildReplayExecutionInsights(recorder.executionEvents,
    recorder.duration,5).filter(x=>
      (!replayKnowledge.observerId||x.actor===replayKnowledge.observerId)&&
      (x.end===null||(x.seconds??0)>=2))
    .slice(0,2);
  const fragment=document.createDocumentFragment();
  for(const incident of replayFeaturedIncidents){
    const button=document.createElement('button');
    button.type='button';button.className='replay-debrief-moment';
    button.dataset.kind=incident.kind;
    button.setAttribute('aria-pressed',
      String(incident.id===selectedReplayIncidentId));
    button.title=incident.label+' · '+incident.summary;
    const stamp=document.createElement('span');
    stamp.className='time';
    stamp.textContent=formatReplayTime(incident.start)+' · '+incident.label;
    const description=document.createElement('span');
    description.className='detail';
    description.textContent=incident.summary;
    button.append(stamp,description);
    button.addEventListener('click',()=>{
      replayPlayback.playing=false;
      selectedReplayIncidentId=incident.id;
      const friendly=incident.actorIds.find(id=>
        team(state).some(a=>a.id===id));
      if(friendly){selected=friendly;replayCamera.followId=friendly;}
      if(incident.kind==='movement'){
        replayAnalysis=true;replayPlanScope='selected';
        replayPlanVersion='active';replayTrailMode='recent';
      }
      seekReplay(incident.start);
      renderReplayDebrief();
    });
    fragment.append(button);
  }
  for(const stall of stalls.filter(x=>!replayFeaturedIncidents.some(i=>
    i.kind==='movement'&&i.actorIds.includes(x.actor)&&
    x.t>=i.start-.5&&x.t<=i.end+.5))){
    const button=document.createElement('button');
    button.type='button';button.className='replay-debrief-moment';
    button.dataset.kind='movement';
    button.title=stall.detail;
    const stamp=document.createElement('span');
    stamp.className='time';
    stamp.textContent=formatReplayTime(stall.t)+' · ORDER INTERRUPTION';
    const detail=document.createElement('span');
    detail.className='detail';
    detail.textContent=stall.detail+' · '+(stall.seconds===null?
      'NO RECORDED RESOLUTION':stall.seconds.toFixed(1)+'S');
    button.append(stamp,detail);
    button.addEventListener('click',()=>{
      replayPlayback.playing=false;selectedReplayIncidentId=null;
      if(team(state).some(a=>a.id===stall.actor)){
        selected=stall.actor;replayCamera.followId=stall.actor;
      }
      replayAnalysis=true;replayPlanScope='selected';
      replayPlanVersion='active';replayTrailMode='recent';
      seekReplay(stall.t);renderReplayDebrief();
    });
    fragment.append(button);
  }
  ui.replayDebriefMoments.replaceChildren(fragment);
  ui.replayDebriefInfo.textContent=replayFeaturedIncidents.length?
    replayFeaturedIncidents.length+' KEY INCIDENTS':
    'NO DISCLOSED INCIDENTS';
  renderReplayIncidentFocus();
  renderObserverSightTransitions();
}
function startReplayIncident(loop:boolean):void{
  const incident=replayIncidents.find(i=>i.id===selectedReplayIncidentId);
  if(!incident)return;
  const range=incidentPlaybackWindow(incident,recorder.duration);
  if(!range){
    showUiHelp('INCIDENT TOO SHORT TO PLAY',2500);return;
  }
  replayPlayback.playing=false;
  seekReplay(range.start);
  replayPlayback.incident={range,loop};
  // A/B and incident playback are mutually exclusive control surfaces.
  replayPlayback.loopEnabled=false;
  replayPlayback.rate=1;replayPlayback.effectiveRate=1;replayPlayback.playing=true;
  unlockAudio();
  showReplayToolTab(null);
  updateReplayHud();
}
function rebuildReplayEventIndex():void{
  replayEventIndex=new ReplayEventIndex(recorder.events,
    recorder.executionEvents,e=>replayEventKnown(e));
  // The Director controller owns historical camera evidence and the film.
  const headerBottom=Math.max(65,
    ui.replayTopHud.getBoundingClientRect().bottom,
    document.querySelector('.top')?.getBoundingClientRect().bottom??0);
  const dockRect=ui.replayPanel.getBoundingClientRect();
  const dockPixels=ui.replayPanel.hidden||dockRect.height<40?
    Math.min(205,cssH*.235):
    Math.max(cssH-dockRect.top,Math.min(205,cssH*.235));
  replayDirector.rebuild({
    recorder,eventIndex:replayEventIndex,state,
    observerId:replayKnowledge.observerId,omniscient:replayKnowledge.omniscient,
    isShotVisible:historicalShotVisible,width:cssW,height:cssH,
    headerBottom,dockPixels,baseSpan:stage?.replayCameraBaseSpan()??1100
  });
  replayChapters=buildReplayChapters(replayEventIndex.all,recorder.duration);
  replayIncidents=indexReplayIncidents(replayEventIndex.all,recorder.duration);
  replayFeaturedIncidents=featuredReplayIncidents(replayIncidents,5);
  selectedReplayIncidentId=null;
  replayPlayback.incident=null;
  renderReplayChapters();
  renderReplayDebrief();
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
const replayFeedKinds:Record<string,readonly string[]>={
  all:[],
  combat:['shot','impact','wound','down','flash','surrender'],
  orders:['started','blocked','resumed','completed','door','reload','interaction'],
  contacts:['intel'],
  objectives:['objective']
};
let replayFeedEvents:readonly ReplayIndexedEvent[]=[];
let replayFeedRangeStart=0,replayFeedRangeEnd=0;
let replayFeedActiveKey:string|null=null;
let replayFeedFollowing=false;
function scrollReplayFeedSelection():void{
  ui.replayFeed.querySelector<HTMLElement>('.selected')?.
    scrollIntoView({block:'nearest'});
}
function renderReplayEventFeed():void{
  if(ui.replayFeed.hidden||!replayEventIndex)return;
  const allowed=replayFeedKinds[ui.replayFeedFilter.value]??[];
  replayFeedEvents=replayEventIndex.all.filter(event=>
    !allowed.length||allowed.includes(event.kind));
  const position=replayFeedPosition(replayFeedEvents,replayPlayback.time);
  replayFeedRangeStart=position.start;replayFeedRangeEnd=position.end;
  replayFeedActiveKey=replayFeedEvents[position.focusIndex]?.key??null;
  const fragment=document.createDocumentFragment();
  for(const event of replayFeedEvents.slice(position.start,position.end)){
    const button=document.createElement('button');
    button.type='button';button.className='replay-feed-item';
    button.dataset.kind=event.kind;button.dataset.eventKey=event.key;
    button.classList.toggle('selected',event.key===replayFeedActiveKey);
    button.textContent=formatReplayTime(event.t)+' · '+
      event.kind.toUpperCase()+' · '+event.text;
    button.addEventListener('click',()=>{
      replayPlayback.playing=false;seekReplay(event.t);
      if(event.kind==='shot'){
        const shot=recorder.ballistics.shots.find(s=>
          Math.abs(s.recordedAt-event.t)<.17&&s.shooterId===event.actor&&
          historicalShotVisible(s));
        if(shot)selectReplayShot(shot);
      }
    });
    fragment.append(button);
  }
  ui.replayFeed.replaceChildren(fragment);
  ui.replayFeedInfo.textContent=replayFeedEvents.length+
    ' KNOWN EVENTS · SHOWING '+(replayFeedEvents.length?position.start+1:0)+
    '–'+position.end;
  if(replayFeedFollowing)scrollReplayFeedSelection();
}
function syncReplayEventFeed():void{
  if(ui.replayFeed.hidden||!replayEventIndex)return;
  const position=replayFeedPosition(replayFeedEvents,replayPlayback.time);
  const key=replayFeedEvents[position.focusIndex]?.key??null;
  if(replayFeedFollowing&&position.focusIndex>=0&&
     (position.focusIndex<replayFeedRangeStart||
      position.focusIndex>=replayFeedRangeEnd)){
    renderReplayEventFeed();return;
  }
  if(key===replayFeedActiveKey)return;
  replayFeedActiveKey=key;
  for(const button of ui.replayFeed.querySelectorAll<HTMLButtonElement>('[data-event-key]'))
    button.classList.toggle('selected',button.dataset.eventKey===key);
  if(replayFeedFollowing)scrollReplayFeedSelection();
}
/** One tool surface at a time; never let advanced controls grow the dock. */
type ReplayToolTab='layers'|'export'|'events';
type ReplayPreset='clean'|'movement'|'combat'|'visibility'|'custom';
let replayToolTab:ReplayToolTab|null=null;
let replaySurface:ReplaySurface='none';
let replaySurfaceOpener:HTMLButtonElement|null=null;
let replayClusterOpener:HTMLButtonElement|null=null;
function closeReplaySurface(restoreFocus=true):void{
  const focusWasInside=ui.replayDrawer.contains(document.activeElement);
  const opener=replaySurfaceOpener??ui.replayMore;
  showReplayToolTab(null);
  replaySurfaceOpener=null;
  if(restoreFocus&&focusWasInside&&opener.isConnected)
    opener.focus({preventScroll:true});
}
function closeReplayCluster(restoreFocus=true):void{
  const focusWasInside=ui.replayClusterMenu.contains(document.activeElement);
  ui.replayClusterMenu.hidden=true;
  ui.replayClusterMenu.replaceChildren();
  const opener=replayClusterOpener;
  replayClusterOpener=null;
  if(restoreFocus&&focusWasInside&&opener?.isConnected)
    opener.focus({preventScroll:true});
}
let replayMomentsView:'highlights'|'events'='highlights';
let replayPreset:ReplayPreset='clean';
function setReplayMomentsView(view:'highlights'|'events'):void{
  replayMomentsView=view;
  ui.replayHighlights.hidden=view!=='highlights';
  ui.replayAllEvents.hidden=view!=='events';
  const active=replaySurface==='moments'&&view==='events';
  ui.replayFeed.hidden=!active;
  ui.replayFeedFilter.hidden=!active;
  ui.replayFeedInfo.hidden=!active;
  for(const b of ui.replayFeedPanel.querySelectorAll<HTMLButtonElement>('[data-moments-view]'))
    b.setAttribute('aria-pressed',String(b.dataset.momentsView===view));
  if(active)renderReplayEventFeed();
}
let replayDockCollapsed=false;
type ReplayChoiceKey='view'|'sight'|'speed'|'overlay';
const replayChoices={
  view:{trigger:ui.replayViewTrigger,menu:ui.replayViewChoices},
  sight:{trigger:ui.replaySightTrigger,menu:ui.replaySightChoices},
  speed:{trigger:ui.replaySpeedTrigger,menu:ui.replaySpeedChoices},
  overlay:{trigger:ui.replayOverlayTrigger,menu:ui.replayOverlayChoices}
};
let replayRailCollapsed=false;
let replayOverlaySignature='';
/** One fast signature gate: replay transport refreshes every frame; overlay
 * controls should update only when a visibility preference changes. */
function syncReplayOverlayChoices():void{
  const signature=[
    replayNameTags,replayContactMarkers,
    replayPlanScope,replayObjectiveMarkers].join('|');
  if(signature===replayOverlaySignature)return;
  replayOverlaySignature=signature;
  const states:Record<string,boolean>={
    names:replayNameTags,contacts:replayContactMarkers,
    plans:replayPlanScope!=='none',objectives:replayObjectiveMarkers};
  for(const button of ui.replayOverlayChoices
    .querySelectorAll<HTMLButtonElement>('[data-overlay-choice]')){
    const key=button.dataset.overlayChoice??'';
    if(!(key in states))continue;
    const value=states[key];
    button.textContent=key.toUpperCase()+' '+(value?'ON':'OFF');
    button.setAttribute('aria-pressed',String(value));
  }
  const cleared=Object.values(states).every(v=>!v);
  ui.replayOverlayTrigger.dataset.cleared=String(cleared);
  ui.replayOverlayTrigger.title=cleared?'Show replay overlays':
    'Show or hide replay overlays';
}
function clearReplayPresentation():void{
  replayNameTags=false;replayContactMarkers=false;
  replayPlanScope='none';replayObjectiveMarkers=false;
  replayAnalysis=false;replayTraceMode='off';
  replayGhostMode='off';replayTrailMode='off';
  replayKnowledge.groundLensOn=false;selectedReplayShotId=null;
}
function setReplayRailCollapsed(collapsed:boolean):void{
  replayRailCollapsed=collapsed;
  closeReplayChoices();
  ui.replayRail.dataset.collapsed=String(collapsed);
  ui.replayRailToggle.textContent=collapsed?'›':'‹';
  const description=collapsed?'Expand replay side controls':
    'Collapse replay side controls';
  ui.replayRailToggle.setAttribute('aria-label',description);
  ui.replayRailToggle.title=description;
  ui.replayRailToggle.setAttribute('aria-expanded',String(!collapsed));
}
function closeReplayChoices():void{
  for(const {trigger,menu} of Object.values(replayChoices)){
    menu.hidden=true;
    trigger.setAttribute('aria-expanded','false');
  }
}
function toggleReplayChoice(key:ReplayChoiceKey):void{
  const {trigger,menu}=replayChoices[key];
  const open=menu.hidden;
  closeReplayChoices();
  menu.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));
}
function setReplayDockCollapsed(collapsed:boolean):void{
  replayDockCollapsed=collapsed;
  if(collapsed)showReplayToolTab(null);
  ui.replayPanel.dataset.collapsed=String(collapsed);
  ui.replayDockToggle.textContent=collapsed?'⌃':'⌄';
  ui.replayDockToggle.title=collapsed?'Expand replay timeline':'Minimize replay timeline';
  ui.replayDockToggle.setAttribute('aria-label',ui.replayDockToggle.title);
  ui.replayDockToggle.setAttribute('aria-expanded',String(!collapsed));
  ui.replayMiniPlay.hidden=!collapsed;
  ui.replayMiniPlay.textContent=replayPlayback.playing?'Ⅱ':'▶';
}
function showReplayToolTab(tab:ReplayToolTab|null):void{
  replayToolTab=tab;
  replaySurface=tab===null?'none':tab==='events'?'moments':tab==='export'?'share':'analyze';
  const analyze=replaySurface==='analyze',share=replaySurface==='share';
  ui.replayDrawer.hidden=replaySurface==='none';
  ui.replayDrawerTitle.textContent=replaySurface==='moments'?'MOMENTS':
    share?'SAVE / SHARE':'ANALYZE';
  ui.replayExtra.hidden=!(analyze||share);
  ui.replayFeedPanel.hidden=replaySurface!=='moments';
  ui.replayPresets.hidden=!analyze;
  ui.replayActorControls.hidden=!analyze;
  ui.replayMore.setAttribute('aria-expanded',String(analyze));
  ui.replayFeedToggle.setAttribute('aria-expanded',String(replaySurface==='moments'));
  ui.replayShareToggle.setAttribute('aria-expanded',String(share));
  for(const group of ui.replayExtra.querySelectorAll<HTMLElement>('[data-replay-group]'))
    group.hidden=share?group.dataset.replayGroup!=='export':
      !analyze||group.dataset.replayGroup==='export';
  setReplayMomentsView(replayMomentsView);
}
function toggleReplayPanel(surface:Exclude<ReplaySurface,'none'>,
  opener:HTMLButtonElement):void{
  const next=toggleReplaySurface(replaySurface,surface);
  if(next==='none'){closeReplaySurface(false);return;}
  replaySurfaceOpener=opener;
  setReplayDockCollapsed(false);
  showReplayToolTab(next==='moments'?'events':
    next==='share'?'export':'layers');
}
function applyReplayPreset(next:Exclude<ReplayPreset,'custom'>):void{
  replayPreset=next;
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
    replayPreset='custom';
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
    if(choice==='clear'||choice==='show')closeReplayChoices();
  });
}
for(const b of ui.replaySpeedChoices.querySelectorAll<HTMLButtonElement>('[data-speed-choice]')){
    b.disabled=replayQuickVideo.active;
    b.setAttribute('aria-pressed',String(Number(b.dataset.speedChoice)===replayPlayback.rate));
  }
  const loop=makeReplayLoop(replayPlayback.loopIn,replayPlayback.loopOut,recorder.duration);
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
  ui.replaySound.textContent=replaySoundEnabled?'SOUND ON':'SOUND OFF';
  ui.replaySound.setAttribute('aria-pressed',String(replaySoundEnabled));
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
  syncReplayOverlayChoices();
  ui.replayTraces.textContent='TRACES '+replayTraceMode.toUpperCase();
  ui.replayGhosts.textContent='GHOSTS '+replayGhostMode.toUpperCase();
  ui.replayTrails.textContent='ACTUAL PATH '+replayTrailMode.toUpperCase();
  ui.replayPlans.setAttribute('aria-pressed',String(replayPlanScope!=='none'));
  ui.replayNames.setAttribute('aria-pressed',String(replayNameTags));
  for(const button of ui.replayPresets.querySelectorAll<HTMLButtonElement>('[data-replay-preset]'))
    button.setAttribute('aria-pressed',String(button.dataset.replayPreset===replayPreset));
  ui.replayPresetStatus.textContent=replayPreset==='custom'?'CUSTOM SETTINGS':'';
  ui.replayShareToggle.textContent=replayQuickVideo.active?'■ STOP VIDEO':'SAVE / SHARE';
  const replaySaved=!!(activeSavedReplayId||savedRecordingIds.get(recorder));
  ui.replaySaveArchive.disabled=replayLibrary.busy||replaySaved;
  ui.replaySaveArchive.textContent=replaySaved?'SAVED TO LIBRARY':'SAVE REPLAY';
  ui.replayShareToggle.setAttribute('aria-label',replayQuickVideo.active?
    'Stop replay video recording':'Open replay save and share');
  ui.replayPrevEvent.disabled=!replayEventIndex?.previous(replayPlayback.time);
  ui.replayNextEvent.disabled=!replayEventIndex?.next(replayPlayback.time);
  const event=replayEventIndex?.latest(replayPlayback.time+.14);
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
  syncReplayEventFeed();
}
/** Display compact clusters, not dozens of overlapping tap targets.
 * The scrubber and event navigation remain the accessible interactions.
 */
function renderReplayEventMarkers():void{
  ui.replayMarks.replaceChildren();
  ui.replayClusterMenu.hidden=true;
  ui.replayClusterMenu.replaceChildren();
  const duration=recorder.duration;
  if(duration<=0)return;
  const width=ui.replayMarks.clientWidth||ui.replaySeek.clientWidth||320;
  const bins=replayTimelineBins(width);
  const events=replayEventIndex?.markers??[];
  const clusters=clusterReplayTimeline(events,duration,width);
  const byBin=new Map<number,ReplayIndexedEvent[]>();
  for(const event of events){
    if(!Number.isFinite(event.t))continue;
    const bin=Math.min(bins-1,Math.max(0,Math.floor(event.t/duration*bins)));
    const list=byBin.get(bin);
    if(list)list.push(event);else byBin.set(bin,[event]);
  }
  const fragment=document.createDocumentFragment();
  for(const cluster of clusters){
    const members=byBin.get(cluster.index)??[];
    if(!members.length)continue;
    const marker=document.createElement('button');
    marker.type='button';
    marker.className='replay-mark replay-mark-'+cluster.kind;
    marker.style.left=((cluster.index+.5)/bins*100).toFixed(3)+'%';
    marker.dataset.cluster=String(members.length>1);
    marker.title=members.length+' event'+(members.length===1?'':'s')+
      ' near '+clockText(cluster.time);
    marker.setAttribute('aria-label',members.length===1?
      'Go to '+formatReplayTime(members[0].t)+': '+members[0].text:
      'Choose among '+members.length+' recorded events near '+
        formatReplayTime(cluster.time));
    marker.addEventListener('click',()=>{
      closeReplayCluster(false);
      if(members.length===1){
        replayPlayback.playing=false;seekReplay(members[0].t);return;
      }
      const heading=document.createElement('strong');
      heading.textContent=members.length+' EVENTS · '+
        formatReplayTime(cluster.time);
      ui.replayClusterMenu.append(heading);
      for(const event of members){
        const choice=document.createElement('button');
        choice.type='button';choice.textContent=formatReplayTime(event.t)+
          ' · '+event.kind.toUpperCase()+' · '+event.text;
        choice.addEventListener('click',()=>{
          replayPlayback.playing=false;seekReplay(event.t);
          ui.replayClusterMenu.hidden=true;
          marker.focus();
        });
        ui.replayClusterMenu.append(choice);
      }
      replayClusterOpener=marker;
      ui.replayClusterMenu.hidden=false;
      ui.replayClusterMenu.querySelector('button')?.focus({preventScroll:true});
    });
    fragment.append(marker);
  }
  ui.replayMarks.append(fragment);
}
function enterReplay(){
  if(replaying||recorder.frames.length<2)return;
  finishedSession=state;replaying=true;
  replayPlayback.reset();replayPlayback.playing=true;
  replayCamera.reset(stage);
  replayKnowledge.omniscient=false;looking=false;flashMode=false;
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
  
  replayBookmarks=[];replayBookmarkCounter=0;
  replayPlanScope='none';replayPlanVersion='active';
  replayNameTags=true;replayContactMarkers=true;
  replayObjectiveMarkers=true;replayOverlaySignature='';
  replayTraceMode='off';replayGhostMode='off';
  replayTrailMode='off';
  replayPreset='clean';replayMomentsView='highlights';
  replayFeedFollowing=false;replayFeedActiveKey=null;
  ui.replayFeedFollow.setAttribute('aria-pressed','false');
  ui.replayFeedFollow.textContent='FOLLOW TIME OFF';
  closeReplayShotInspector();
  replayMovementHistory=new ReplayMovementHistory(recorder.frames,
    team(finishedSession).map(a=>a.id));
  replaySoundTimeline=new ReplaySoundTimeline(recorder.ballistics.shots,
    recorder.events);
  unlockAudio();
  showReplayToolTab(null);
  const recordedSite=recorder.manifest?.site;
  state=newSession(recorder.manifest?.variant??finishedSession.variant,
    recorder.manifest?.site?.seed??finishedSession.site?.seed,
    recorder.manifest?.intelMode??finishedSession.intel.mode,
    recorder.manifest?.site?.scale??finishedSession.site?.scale??'standard',
    recorder.manifest?.missionType,
    recordedSite?structuredClone(recordedSite):undefined);
  state.lightingMode=recorder.manifest?.lightingMode??finishedSession.lightingMode;
  state.operationDossier=recorder.manifest?.dossier?
    structuredClone(recorder.manifest.dossier):undefined;
  applyRequestedCondition(state);
  applyRosterIdentity(state,persistentRoster);
  applyReplayActorIdentity(state,recorder.manifest);
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
  replaySquadEntries=featuredReplaySquadEntries(recorder.frames,
    team(state).map(a=>a.id),recorder.duration,3);
  selectedReplaySquadEntry=null;
  renderReplaySquadEntries();
  document.body.classList.add('replaying');
  ui.replayPanel.hidden=false;
  ui.replayTopHud.hidden=false;ui.replayRail.hidden=false;
  setReplayRailCollapsed(false);setReplayDockCollapsed(false);
  ui.replaySeek.max=String(Math.max(1,Math.ceil(recorder.duration*60)));
  renderReplayEventMarkers();seekReplay(0);updateHud();
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
  replayEventIndex=null;
  
  replayChapters=[];replayBookmarks=[];
  replayIncidents=[];replayFeaturedIncidents=[];
  replaySquadEntries=[];selectedReplaySquadEntry=null;
  renderReplaySquadEntries();
  replayKnowledge.reset();
  selectedReplayIncidentId=null;
  ui.replayIncidentDetails.hidden=true;
  closeReplayShotInspector();
  replaySoundTimeline=null;replayMovementHistory=null;stopReplaySounds();
  ui.replayFeed.replaceChildren();
  ui.replayDebriefMoments.replaceChildren();
  ui.replayObserverTransitions.replaceChildren();
  ui.replayObserverTransitions.hidden=true;
  ui.replayDebriefInfo.textContent='';
  showReplayToolTab(null);
  document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  ui.replayTopHud.hidden=true;ui.replayRail.hidden=true;
  closeReplayChoices();
  if(finishedSession)state=finishedSession;
  finishedSession=null;fogStamp=-1;
  if(savedReplayPreviousRecorder){
    recorder=savedReplayPreviousRecorder;
    savedReplayPreviousRecorder=null;
  }
  activeSavedReplayId=null;
  stage?.applySite(state.site??null);
  updateHud();
  if(replayEntrySource==='library'){
    replayEntrySource='debrief';showSavedReplayLibrary();
  }
}
/** Replay Library: load metadata only until a recording is selected.
 * No campaign result, equipment persistence, or live session is modified.
 */
const replayLibrary=createReplayLibraryUi({
  ui:{
    replayLibraryDialog:ui.replayLibraryDialog,
    replayLibraryStatus:ui.replayLibraryStatus,
    replayLibraryList:ui.replayLibraryList,
    replayLibraryBackdrop:ui.replayLibraryBackdrop,
    replayImportButton:ui.replayImportButton,
    replayImportInput:ui.replayImportInput
  },
  showUiHelp,playSavedReplay:(id)=>{void playSavedReplay(id);},
  closeMissionSettings,isReplaying:()=>replaying
});
const renderSavedReplayLibrary=()=>replayLibrary.render();
const replayLibraryFailure=(error:unknown)=>replayLibrary.failure(error);
const showSavedReplayLibrary=()=>replayLibrary.show();
const hideSavedReplayLibrary=()=>replayLibrary.hide();
async function saveCurrentReplay():Promise<void>{
  if(replayLibrary.busy||recorder.frames.length<2)return;
  if(activeSavedReplayId||savedRecordingIds.has(recorder)){
    showUiHelp('REPLAY ALREADY SAVED TO LIBRARY',2800);return;
  }
  replayLibrary.busy=true;
  ui.saveReplayDebrief.disabled=true;ui.replaySaveArchive.disabled=true;
  try{
    const id='replay-'+Date.now().toString(36)+'-'+
      Math.random().toString(36).slice(2,9);
    const archive=captureReplayArchive(recorder,id,Date.now());
    await saveReplayArchive(archive);
    savedRecordingIds.set(recorder,id);
    if(replaying)activeSavedReplayId=id;
    if(replayBookmarks.length)await saveReplayBookmarks(id,replayBookmarks);
    showUiHelp('FULL REPLAY SAVED TO DEVICE LIBRARY',3400);
    if(!ui.replayLibraryDialog.hidden)await renderSavedReplayLibrary();
  }catch(error){replayLibraryFailure(error);}
  finally{
    replayLibrary.busy=false;
    const saved=!!(activeSavedReplayId||savedRecordingIds.get(recorder));
    ui.saveReplayDebrief.disabled=saved;ui.replaySaveArchive.disabled=saved;
    if(saved){
      ui.saveReplayDebrief.textContent='REPLAY SAVED';
      ui.replaySaveArchive.textContent='SAVED TO LIBRARY';
    }
  }
}
async function playSavedReplay(id:string):Promise<void>{
  if(replayLibrary.busy||replaying)return;
  replayLibrary.busy=true;
  try{
    const archived=await loadSavedReplay(id);
    const stored=restoreReplayArchive(archived);
    if(stored.frames.length<2)throw Error('Replay recording has no film');
    const savedMarks=await getSavedReplayBookmarks(id);
    // Preserve the current live recorder and return to it on replay exit.
    savedReplayPreviousRecorder=recorder;
    recorder=stored;
    hideSavedReplayLibrary();
    closeMissionSettings(false);
    replayEntrySource='library';enterReplay();
    if(replaying){
      activeSavedReplayId=id;
      replayBookmarks=savedMarks;
      replayBookmarkCounter=Math.max(savedMarks.length,
        ...savedMarks.map(mark=>Number(mark.id.match(/bookmark-(\d+)/)?.[1]??0)));
      renderReplayChapters();
    }
    if(!replaying){
      recorder=savedReplayPreviousRecorder;savedReplayPreviousRecorder=null;
      throw Error('Could not open saved replay');
    }
    showUiHelp('PLAYING SAVED OPERATION · ORIGINAL MISSION UNCHANGED',3800);
  }catch(error){
    activeSavedReplayId=null;
    // A failed import must never leave the current mission's film replaced.
    if(replaying)exitReplay();
    if(savedReplayPreviousRecorder){
      recorder=savedReplayPreviousRecorder;
      savedReplayPreviousRecorder=null;
    }
    replayLibraryFailure(error);
  }
  finally{replayLibrary.busy=false;}
}
ui.openReplayLibrary.addEventListener('click',showSavedReplayLibrary);
ui.closeReplayLibrary.addEventListener('click',hideSavedReplayLibrary);
ui.replayLibraryBackdrop.addEventListener('click',hideSavedReplayLibrary);
ui.saveReplayDebrief.addEventListener('click',()=>{void saveCurrentReplay();});
ui.replaySaveArchive.addEventListener('click',()=>{void saveCurrentReplay();});

ui.watchReplay.addEventListener('click',()=>{
  replayEntrySource='debrief';enterReplay();
});
ui.favoriteMission.addEventListener('click',()=>{
  if(!state.site)return;
  const favorites=favoriteMissions();
  if(activeFavoriteId&&favorites.some(item=>item.id===activeFavoriteId)){
    showUiHelp('MISSION ALREADY IN FAVORITES',2700);return;
  }
  const id='favorite-'+Date.now().toString(36)+'-'+
    Math.random().toString(36).slice(2,9);
  const label=state.site.name+' · '+state.missionType.toUpperCase();
  try{
    if(!persistFavoriteMissions(addFavoriteMission(
      favorites,missionStart,id,label,Date.now())))
      throw Error('Storage unavailable');
    activeFavoriteId=id;
    renderFavoriteMissions();updateHud();
    showUiHelp('MISSION SAVED TO FAVORITES',3200);
  }catch(error){
    console.warn('[Favorite mission]',error);
    showUiHelp('COULD NOT SAVE FAVORITE · CHECK LOCAL STORAGE',3500);
  }
});
ui.replayPlay.addEventListener('click',()=>{
  if(replayPlayback.time>=recorder.duration)seekReplay(0);
  replayPlayback.playing=!replayPlayback.playing;
  if(replayPlayback.playing)unlockAudio();else stopReplaySounds();
  updateReplayHud();
});
ui.replayBack.addEventListener('click',()=>seekReplay(replayPlayback.time-10));
ui.replayForward.addEventListener('click',()=>seekReplay(replayPlayback.time+10));
const stepReplay=(kind:'sample'|'frame',direction:-1|1)=>{
  replayPlayback.playing=false;
  seekReplay(kind==='sample'?
    stepReplaySample(recorder.frames,replayPlayback.time,direction):
    stepReplayPresentation(replayPlayback.time,recorder.duration,direction));
};
ui.replayPrevFrame.addEventListener('click',()=>stepReplay('frame',-1));
ui.replayNextFrame.addEventListener('click',()=>stepReplay('frame',1));
ui.replayPrevSample.addEventListener('click',()=>stepReplay('sample',-1));
ui.replayNextSample.addEventListener('click',()=>stepReplay('sample',1));
ui.replayLoopIn.addEventListener('click',()=>{
  replayPlayback.loopIn=replayPlayback.time;
  if(replayPlayback.loopOut!==null&&replayPlayback.loopOut-replayPlayback.loopIn<.35)replayPlayback.loopOut=null;
  replayPlayback.loopEnabled=false;updateReplayHud();
});
ui.replayLoopOut.addEventListener('click',()=>{
  if(replayPlayback.loopIn===null)replayPlayback.loopIn=0;
  const proposal=makeReplayLoop(replayPlayback.loopIn,replayPlayback.time,recorder.duration);
  if(!proposal){
    showUiHelp('LOOP OUT MUST BE AT LEAST 0.35S AFTER IN',3300);return;
  }
  replayPlayback.loopOut=proposal.end;replayPlayback.loopEnabled=true;updateReplayHud();
});
ui.replayLoopToggle.addEventListener('click',()=>{
  if(!makeReplayLoop(replayPlayback.loopIn,replayPlayback.loopOut,recorder.duration))return;
  replayPlayback.loopEnabled=!replayPlayback.loopEnabled;updateReplayHud();
});
ui.replayMore.addEventListener('click',()=>
  toggleReplayPanel('analyze',ui.replayMore));
ui.replayShareToggle.addEventListener('click',()=>{
  if(replayQuickVideo.active){ui.replayExportVideo.click();return;}
  toggleReplayPanel('share',ui.replayShareToggle);
});
for(const [key,{trigger}] of Object.entries(replayChoices) as
  Array<[ReplayChoiceKey,{trigger:HTMLButtonElement;menu:HTMLElement}]>){
  trigger.addEventListener('click',()=>toggleReplayChoice(key));
}
for(const b of ui.replayViewChoices.querySelectorAll<HTMLButtonElement>('[data-view-choice]')){
  b.addEventListener('click',()=>{
    ui.replayQuickView.value=b.dataset.viewChoice??'iso';
    ui.replayQuickView.dispatchEvent(new Event('change'));
    closeReplayChoices();
  });
}
for(const b of ui.replaySightChoices.querySelectorAll<HTMLButtonElement>('[data-sight-choice]')){
  b.addEventListener('click',()=>{
    ui.replayDirectSight.value=b.dataset.sightChoice??'team';
    ui.replayDirectSight.dispatchEvent(new Event('change'));
    closeReplayChoices();
  });
}
for(const b of ui.replaySpeedChoices.querySelectorAll<HTMLButtonElement>('[data-speed-choice]')){
  b.addEventListener('click',()=>{
    ui.replayQuickSpeed.value=b.dataset.speedChoice??'1';
    ui.replayQuickSpeed.dispatchEvent(new Event('change'));
  });
}
ui.replaySpeedRange.addEventListener('input',()=>{
  const rate=speedFromIndex(Number(ui.replaySpeedRange.value));
  ui.replaySpeedValue.textContent=rate+'×';
  ui.replaySpeedRange.setAttribute('aria-valuetext',rate+'×');
  ui.replaySpeedRange.style.setProperty('--speed-progress',
    (Number(ui.replaySpeedRange.value)/
      (REPLAY_SPEED_STOPS.length-1)*100)+'%');
});
ui.replaySpeedRange.addEventListener('change',()=>{
  if(replayQuickVideo.active)return;
  ui.replayQuickSpeed.value=String(speedFromIndex(
    Number(ui.replaySpeedRange.value)));
  ui.replayQuickSpeed.dispatchEvent(new Event('change'));
});
document.addEventListener('pointerdown',e=>{
  if(!(e.target instanceof Node)||ui.replayRail.contains(e.target))return;
  closeReplayChoices();
});
ui.replayDockToggle.addEventListener('click',()=>setReplayDockCollapsed(!replayDockCollapsed));
ui.replayRailToggle.addEventListener('click',()=>
  setReplayRailCollapsed(!replayRailCollapsed));
ui.replayMiniPlay.addEventListener('click',()=>ui.replayPlay.click());
ui.replayQuickSpeed.addEventListener('change',()=>{
  const rate=Number(ui.replayQuickSpeed.value);
  if(!isReplaySpeed(rate)||replayQuickVideo.active)return;
  stopReplaySounds();replayPlayback.rate=rate;updateReplayHud();
});
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
for(const button of ui.replayPresets.querySelectorAll<HTMLButtonElement>('[data-replay-preset]'))
  button.addEventListener('click',()=>{
    const p=button.dataset.replayPreset;
    if(p==='clean'||p==='movement'||p==='combat'||p==='visibility')applyReplayPreset(p);
  });
for(const button of ui.replayFeedPanel.querySelectorAll<HTMLButtonElement>('[data-moments-view]'))
  button.addEventListener('click',()=>setReplayMomentsView(
    button.dataset.momentsView==='events'?'events':'highlights'));
ui.replayFeedToggle.addEventListener('click',()=>
  toggleReplayPanel('moments',ui.replayFeedToggle));
ui.replayDrawerClose.addEventListener('click',()=>closeReplaySurface());
ui.replayFeedFilter.addEventListener('change',renderReplayEventFeed);
ui.replayFeedFollow.addEventListener('click',()=>{
  replayFeedFollowing=!replayFeedFollowing;
  ui.replayFeedFollow.setAttribute('aria-pressed',String(replayFeedFollowing));
  ui.replayFeedFollow.textContent=replayFeedFollowing?'FOLLOW TIME ON':'FOLLOW TIME OFF';
  if(replayFeedFollowing)renderReplayEventFeed();
});
ui.replayIncidentWatch.addEventListener('click',()=>startReplayIncident(false));
ui.replayIncidentLoop.addEventListener('click',()=>startReplayIncident(true));
ui.replayIncidentInvestigate.addEventListener('click',()=>{
  const incident=replayIncidents.find(i=>i.id===selectedReplayIncidentId);
  if(!incident)return;
  replayPlayback.playing=false;seekReplay(incident.start);
  const actor=incident.actorIds.find(id=>team(state).some(a=>a.id===id));
  if(actor)selected=actor;
  const preset=incident.kind==='movement'||incident.kind==='door'||
    incident.kind==='orders'?'movement':
    incident.kind==='contact'?'visibility':'combat';
  applyReplayPreset(preset);
  showReplayToolTab('layers');
  const layers=ui.replayExtra.querySelector<HTMLDetailsElement>(
    '[data-replay-group="layers"]');
  if(layers)layers.open=true;
});
ui.replayIncidentClose.addEventListener('click',()=>{
  replayPlayback.incident=null;selectedReplayIncidentId=null;
  renderReplayDebrief();
});
ui.replayPrevChapter.addEventListener('click',()=>{
  const chapter=adjacentReplayChapter(replayChapters,replayPlayback.time,false);
  if(chapter){replayPlayback.playing=false;seekReplay(chapter.t);}
});
ui.replayNextChapter.addEventListener('click',()=>{
  const chapter=adjacentReplayChapter(replayChapters,replayPlayback.time,true);
  if(chapter){replayPlayback.playing=false;seekReplay(chapter.t);}
});
ui.replayBookmark.addEventListener('click',()=>{
  const id='bookmark-'+(++replayBookmarkCounter);
  replayBookmarks=addReplayBookmark(replayBookmarks,replayPlayback.time,recorder.duration,
    id,'MARK '+String(replayBookmarkCounter).padStart(2,'0'));
  renderReplayChapters();
  if(activeSavedReplayId){
    const replayId=activeSavedReplayId;
    void saveReplayBookmarks(replayId,replayBookmarks).then(()=>{
      if(activeSavedReplayId===replayId)
        showUiHelp('BOOKMARK SAVED TO REPLAY LIBRARY',2400);
    }).catch(error=>replayLibraryFailure(error));
  }else showUiHelp('BOOKMARK ADDED · SAVE REPLAY TO PRESERVE',2800);
});
ui.replayShotClose.addEventListener('click',closeReplayShotInspector);
ui.replayShotFocus.addEventListener('click',focusReplayShot);
ui.replayShotPrev.addEventListener('click',()=>{
  const s=currentReplayShot();
  const prev=s&&adjacentRecordedShot(recorder.ballistics.shots,s.id,
    false,historicalShotVisible);
  if(prev)selectReplayShot(prev);
});
ui.replayShotNext.addEventListener('click',()=>{
  const s=currentReplayShot();
  const next=s&&adjacentRecordedShot(recorder.ballistics.shots,s.id,
    true,historicalShotVisible);
  if(next)selectReplayShot(next);
});
ui.replaySound.addEventListener('click',()=>{
  replaySoundEnabled=!replaySoundEnabled;
  if(!replaySoundEnabled)stopReplaySounds();
  else unlockAudio();
  updateReplayHud();
});
ui.replaySpeed.addEventListener('click',()=>{
  ui.replayQuickSpeed.value=String(speedFromIndex(
    (speedIndex(replayPlayback.rate)+1)%REPLAY_SPEED_STOPS.length));
  ui.replayQuickSpeed.dispatchEvent(new Event('change'));
});
ui.replaySeek.addEventListener('input',()=>{
  ui.replayClusterMenu.hidden=true;
  replayPlayback.playing=false;
  seekReplay(Number(ui.replaySeek.value)/60);
});
function changeReplaySight(mode:'team'|'full'|'operator'):void{
  if(mode==='operator'){
    if(!replayKnowledge.hasContactEvidence)return;
    const eligible=replayBodycam.observers;
    const next=eligible.includes(replayCamera.followId)?replayCamera.followId:
      eligible.includes(selected)?selected:eligible[0];
    if(!next)return;
    replayKnowledge.observerId=next;
    replayKnowledge.omniscient=false;
    closeReplayShotInspector();
    if(replayBodycam.active)applyReplayBodycamMount();
  }else{
    if(replayBodycam.active)stopReplayBodycam();
    replayKnowledge.groundLensOn=false;replayKnowledge.observerId=null;
    replayKnowledge.omniscient=mode==='full';
  }
  fogStamp=-1;
  rebuildReplayEventIndex();
  renderReplayEventMarkers();renderReplayEventFeed();
  refreshReplayShotInspector();updateReplayHud();
}
function followReplayOperator(id:string):void{
  if(!replaying||!team(state).some(a=>a.id===id&&a.health>0))return;
  if(replayBodycam.active)stopReplayBodycam();
  if(viewMode==='plan2d'&&stage)cameraMode('iso');
  selected=id;replayCamera.followId=id;
  chooseReplayCamera('operator');replayCamera.follow=true;
  if(replayKnowledge.observerId){
    replayKnowledge.observerId=replayBodycam.observers.includes(id)?id:null;
    fogStamp=-1;rebuildReplayEventIndex();
    renderReplayEventMarkers();renderReplayEventFeed();
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
  replayPreset='custom';
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
  fogStamp=-1;rebuildReplayEventIndex();
  renderReplayEventMarkers();renderReplayEventFeed();
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
  replayKnowledge.omniscient=!replayKnowledge.omniscient;fogStamp=-1;
  rebuildReplayEventIndex();
  renderReplayEventMarkers();renderReplayEventFeed();
  refreshReplayShotInspector();updateReplayHud();
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
      replayPlayback.playing=false;
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
      replayPlayback.playing=false;
      seekReplay(Math.max(0,Math.min(time,recorder.duration)));
      return true;
    },
    stop(){
      stage?.setReplayBodycam(null);
      replayKnowledge.observerId=null;
      replayKnowledge.omniscient=false;
      fogStamp=-1;
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
    closeReplayShotInspector();
  }
  fogStamp=-1;
  rebuildReplayEventIndex();
  renderReplayEventMarkers();renderReplayEventFeed();
  refreshReplayShotInspector();updateReplayHud();
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
  renderReplayEventMarkers();renderReplayEventFeed();
  refreshReplayShotInspector();updateReplayHud();
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
const jumpReplayEvent=(forward:boolean)=>{
  const item=forward?replayEventIndex?.next(replayPlayback.time):
    replayEventIndex?.previous(replayPlayback.time);
  if(item){replayPlayback.playing=false;seekReplay(item.t);}
};
ui.replayPrevEvent.addEventListener('click',()=>jumpReplayEvent(false));
ui.replayNextEvent.addEventListener('click',()=>jumpReplayEvent(true));
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
  replayPreset='custom';
  replayAnalysis=!replayAnalysis;updateReplayHud();
});
ui.replayPlans.addEventListener('click',()=>{
  replayPreset='custom';
  replayPlanScope=replayPlanScope==='selected'?'all':
    replayPlanScope==='all'?'none':'selected';
  updateReplayHud();
});
ui.replayNames.addEventListener('click',()=>{
  replayNameTags=!replayNameTags;updateReplayHud();
});
ui.replayPlanVersion.addEventListener('click',()=>{
  replayPreset='custom';
  replayPlanVersion=replayPlanVersion==='active'?'original':'active';
  updateReplayHud();
});
ui.replayTraces.addEventListener('click',()=>{
  replayPreset='custom';
  replayTraceMode=replayTraceMode==='off'?'recent':
    replayTraceMode==='recent'?'selected':'off';
  updateReplayHud();
});
ui.replayGhosts.addEventListener('click',()=>{
  replayPreset='custom';
  replayGhostMode=replayGhostMode==='off'?'selected':
    replayGhostMode==='selected'?'squad':'off';
  updateReplayHud();
});
ui.replayTrails.addEventListener('click',()=>{
  replayPreset='custom';
  replayTrailMode=replayTrailMode==='off'?'recent':
    replayTrailMode==='recent'?'full':'off';
  updateReplayHud();
});
ui.replayExportVideo.addEventListener('click',()=>{
  if(replayQuickVideo.active){
    replayQuickVideo.stop();ui.replayExportVideo.textContent='VIDEO 20S';return;
  }
  unlockAudio();
  videoAudioDestination=audio?.state==='running'&&replaySoundEnabled?
    audio.createMediaStreamDestination():null;
  if(replayPlayback.time>=recorder.duration-.2)seekReplay(0);
  replayPlayback.rate=1;replayPlayback.effectiveRate=1;
  replayPlayback.loopEnabled=false;replayPlayback.loopIn=null;replayPlayback.loopOut=null;
  const started=replayQuickVideo.start(replayPlayback.time,
    {width:cssW,height:cssH},videoAudioDestination?.stream??null);
  if(!started){
    videoAudioDestination=null;
    showUiHelp('VIDEO CAPTURE NOT SUPPORTED IN THIS BROWSER',4200);
    return;
  }
  replayPlayback.playing=true;
  ui.replayExportVideo.textContent='STOP VIDEO';
  ui.replayExportVideo.title=replayQuickVideo.audioTrackCount?
    'Recording replay video with audio':'Recording replay video without audio';
  updateReplayHud();
});
ui.replayExportJson.addEventListener('click',()=>{
  try{
    const report=serializeReplayReport(recorder);
    const blob=new Blob([report],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const seed=recorder.manifest?.site?.seed??'mission';
    a.href=url;a.download='fieldwork-breach-'+seed+'-'+
      Math.round(recorder.duration)+'s-report.json';
    document.body.append(a);a.click();a.remove();
    // iOS WebKit may need the object URL until after navigation begins.
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showUiHelp('FULL-RECONSTRUCTION JSON REPORT EXPORTED',2500);
  }catch(error){
    console.warn('[Replay JSON export]',error);
    showUiHelp('JSON EXPORT UNAVAILABLE',3500);
  }
});
ui.replayExit.addEventListener('click',exitReplay);
function reset(next=state.variant,siteSeed?:number,
 missionOverride?:Session['missionType'],prebuiltSite?:Site,
 encounterRisk?:1|2|3,deferScene=false,
 restartStart?:MissionStartSnapshot){
  replaying=false;replayPlayback.playing=false;finishedSession=null;
  savedReplayPreviousRecorder=null;
  hideSavedReplayLibrary();
  activeFavoriteId=null;
  replayEventIndex=null;
  operationsBoard.hidden=true;
  hideWeaponChooser();
  flashMode=false;document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  ui.replayTopHud.hidden=true;ui.replayRail.hidden=true;
  closeReplayChoices();
  state=newSession(next,legacyStudy?undefined:
    siteSeed??randomSiteSeed(),restartStart?.intelMode??selectedIntelMode,
    restartStart?.scale??requestedSiteScale,missionOverride,
    prebuiltSite,{risk:encounterRisk,enableCivilians:civilianPreview,
   enableIncidentIntent:true});
  executionNoticeFeed.reset();
  state.lightingMode=restartStart?.lightingMode??selectedLightingMode;
  if(campaignMode==='quick')persistentRoster=freshQuickPlayRoster(persistentRoster);
  applyRequestedCondition(state);
  applyRosterIdentity(state,persistentRoster);
  applyCampaignSkills();
  // One resolved story per mission; restart restores the saved artifact.
  state.operationDossier=restartStart?.dossier?
    structuredClone(restartStart.dossier):
    buildPreviewDossier(state,encounterRisk);
  missionStart=captureMissionStart(state,requestedSiteScale);
  flashDoorId=null;
  if(!deferScene)stage?.applySite(state.site??null);
  selected='rook';looking=false;
  selectedNode=null;doorFocusId=null;draggingNode=null;
  cursor=null;trace=null;zoom=1;panX=panY=0;
  fogStamp=-1;lastSoundShotId=0;lastEventAudio='';
  lastFootstepSoundTime=0;
  recorder=new MissionRecorder();recorder.capture(state,true);
  tacticalFeedback.clear();
  if(!deferScene){layout();updateHud();}
}
/** Repeat the exact resolved site and the same briefing/insertion.
 * newSession resets living actors, doors, fog, AI, objectives and orders.
 * It must never regenerate a different layout or use next-site preferences.
 */
function restartMission():void{
 // Before first GO, preserve any last-minute kit/entry changes, not orders.
 const start=state.started?missionStart:
   captureMissionStart(state,requestedSiteScale,selectedEntry);
 reset(start.variant,start.seed,start.missionType,
   siteForMissionRestart(start),undefined,false,start);
 restoreMissionStartingTeam(state,start);
 if(start.entryId!=='FRONT'){
  if(selectDeployment(state,start.entryId))selectedEntry=start.entryId;
  else console.warn('[Restart mission] Original entry no longer valid',start.entryId);
 }
 missionStart=start;
 recorder=new MissionRecorder();recorder.capture(state,true);
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
   playOrderCue('ui.cancel');updateHud();
 }
});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;playOrderCue('orders.undo');updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;playOrderCue('orders.redo');updateHud();});
ui.wait.addEventListener('click',()=>{planWait(state,selected,1);playOrderCue('orders.wait');updateHud();});
fieldLightButton=document.createElement('button');
fieldLightButton.type='button';fieldLightButton.textContent='WEAPON LIGHT';
fieldLightButton.setAttribute('aria-label','Toggle selected operator weapon light');
fieldLightButton.addEventListener('click',()=>{
 if(replaying)return;
 toggleWeaponLight(state,selected);playOrderCue('equipment.flashlight_click');updateHud();
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
  looking=false;
  updateHud();
});
ui.sync.addEventListener('click',()=>{planSync(state);playOrderCue('orders.sync');updateHud();});
ui.stance.addEventListener('click',()=>{
  posture(state,selected);playOrderCue('orders.stance');fogStamp=-1;updateHud();
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
  unlockAudio();uiClickTone(state.phase==='running'?'pause':'go');
  if(state.phase==='won'||state.phase==='lost'){
   if(!returnAfterCampaignMission())reset();
  }else{
    looking=false;pushMode=false;
    if(state.phase==='planning'){
      if(!state.started)
        missionStart=captureMissionStart(state,requestedSiteScale,selectedEntry);
      recorder.capture(state,true);
    }
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
    if(!ui.replayClusterMenu.hidden)closeReplayCluster();
    else if(replayToolTab!==null)closeReplaySurface();
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
      e.preventDefault();replayPlayback.playing=!replayPlayback.playing;
      if(replayPlayback.playing)unlockAudio();else stopReplaySounds();
      updateReplayHud();
    }
    if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&!(
      target instanceof HTMLElement&&target.closest('button,summary,[role="button"]'))){
      e.preventDefault();
      const direction:-1|1=e.code==='ArrowLeft'?-1:1;
      if(e.ctrlKey||e.metaKey)jumpReplayEvent(direction>0);
      else if(e.shiftKey){replayPlayback.playing=false;seekReplay(replayPlayback.time+direction);}
      else stepReplay('frame',direction);
    }
    return;
  }
  if(e.code==='Space'&&!e.repeat){
    e.preventDefault();unlockAudio();
    if(state.phase==='won'||state.phase==='lost'){
      if(!returnAfterCampaignMission())reset();
    }else{
      if(state.phase==='planning'){
        if(!state.started)
          missionStart=captureMissionStart(state,requestedSiteScale,selectedEntry);
        recorder.capture(state,true);
      }
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
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerenter',e=>{
  if(e.pointerType!=='touch'){previewHover=true;cursor=pointerWorld(e);}
});
canvas.addEventListener('pointerleave',()=>{previewHover=false;});
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const pt=looking?pointerAimWorld(e):pointerWorld(e);
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
      startX:e.clientX,startY:e.clientY,pointerType:e.pointerType,wasUnit:false,nodeId:null,
      mode:orbit?'cameraOrbit':'cameraPan',moved:false});
  }else{
    const contextual=looking||flashMode||pushMode||!!firePlacement||!!evacMode;
    const pick=contextual?null:tacticalPickAt({x:e.clientX,y:e.clientY},
      e.pointerType);
    const handle=pick?.kind==='activeWatch'?'activeWatch':
      pick?.kind==='watch'?'watchTarget':
      pick&&['node','flash','problem'].includes(pick.kind)?'node':'undecided';
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,pointerType:e.pointerType,
      wasUnit:pick?.kind==='operator',nodeId:pick?.nodeId??null,
      pick,mode:handle,moved:false,dragCommitted:false,
      selectionBefore:{owner:selected,node:selectedNode,
        watch:selectedActiveWatch,door:doorFocusId}});

  }
  if(activePointers.size>=2){
    // Cancel any tentative route gesture when a second finger arrives.
    // The remaining finger is never retroactively treated as a map tap.
    for(const pointer of activePointers.values()){
      if(pointer.dragCommitted)restorePointerSelection(pointer);
      pointer.mode='cameraMulti';pointer.dragCommitted=false;
    }
    const pts=[...activePointers.values()];
    pinchDistance=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    panMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    trace=null;draggingNode=null;draggingWatchTarget=false;
  }
  probeCameraGesture('down');
});
canvas.addEventListener('pointermove',e=>{
  const p=activePointers.get(e.pointerId);
  cursor=looking?pointerAimWorld(e):
    p&&(p.mode==='activeWatch'||p.mode==='watchTarget')?
      pointerAimWorld(e,12):pointerWorld(e);
  if(!p)return;
  e.preventDefault();
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>
     tacticalHitProfile(e.pointerType).dragStart)p.moved=true;
  if(activePointers.size>=2){
    const pts=[...activePointers.values()].slice(0,2);
    const gap=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    if(stage&&viewMode!=='plan2d'){
      if(replaying&&replayCamera.mode!=='free'){
        chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
      }
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
    if(replaying&&replayCamera.mode!=='free'){
      chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
    }
    stage.orbit(dx,dy);
    probeCameraGesture('orbit');
    for(const [mode,button] of [['iso',ui.viewIso],
      ['top',ui.viewTop],['plan2d',ui.view2d]] as const)
      button.setAttribute('aria-pressed',String(mode===stage.view.mode));
    return;
  }
  if(p.mode==='cameraPan'){
    if(replaying&&replayCamera.mode!=='free'){
      chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
    }
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
    return;
  }
  if(p.mode==='cameraMulti')return;
  // While a command is armed, one-finger dragging previews its target.
  // Two fingers still exclusively pan/pinch and never author an order.
  if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
     (looking||flashMode||pushMode||!!firePlacement||!!evacMode)){
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
  if(p.mode==='activeWatch'||p.mode==='watchTarget'){
    const travel=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
    if(watchDragReady(travel,e.pointerType)&&
      (p.mode==='activeWatch'||p.nodeId!==null)){
      if(!p.dragCommitted)activatePointerEdit(p);
      p.dragCommitted=true;draggingNode=cursor;draggingWatchTarget=true;
    }
    return;
  }
  if(p.mode==='node'&&p.moved&&p.nodeId!==null){
    if(!p.dragCommitted)activatePointerEdit(p);
    p.dragCommitted=true;draggingWatchTarget=false;draggingNode=cursor;return;
  }
  if(state.phase==='planning'&&p.wasUnit&&p.moved){
    if(!p.dragCommitted)adoptPointerOwner(p);
    p.dragCommitted=true;p.mode='route';
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
  if(cancelled&&p.dragCommitted)restorePointerSelection(p);
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  const pt=looking?pointerAimWorld(e):
    p.mode==='activeWatch'||p.mode==='watchTarget'?
      pointerAimWorld(e,12):pointerWorld(e);
  // During replay, a deliberate single tap on a friendly miniature
  // follows that operator. Two-finger gestures, camera drags, and scrubbing
  // never steal camera focus. Avoid interpreting the same tap as a shot.
  let tappedReplayOperator=false;
  if(!cancelled&&replaying&&!replayBodycam.active&&
     activePointers.size===1&&!p.moved&&p.mode==='undecided'){
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
    activePointers.size===1&&!p.moved&&p.mode==='undecided'){
    const hit=shotScreenHit(recorder.ballistics.between(
      Math.max(0,replayPlayback.time-3),replayPlayback.time),replayPlayback.time,
      {x:e.clientX,y:e.clientY},
      (point,height)=>worldToScreen(point,viewMode==='plan2d'?0:height),
      historicalShotVisible,e.pointerType==='touch'?30:22);
    if(hit)selectReplayShot(hit);
  }
  if(!cancelled&&!replaying&&state.phase!=='planning'&&
     activePointers.size===1&&!p.moved&&p.mode==='undecided'&&
     p.pick?.kind==='operator'&&p.pick.owner){
    selectUnit(p.pick.owner);
  }
  if(!cancelled&&state.phase==='planning'&&!replaying&&activePointers.size===1){
    if((looking||flashMode||pushMode||firePlacement||evacMode)&&
       (p.mode==='targetPreview'||p.mode==='undecided')){
      // A brief iPhone tap often travels a few pixels without entering
      // targetPreview. Always commit an armed target on release, even then.
      // CameraMulti/cancelled pointers remain excluded.
      // LOOK/WATCH are directions and may deliberately point across an
      // unseen door or beyond the property; other commands still require a
      // point inside the real procedural site bounds, not legacy W/H.
      if(looking||insideTacticalBounds(pt,activeWorldBounds()))
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
  trace=null;draggingNode=null;draggingWatchTarget=false;
  activePointers.delete(e.pointerId);
  if(e.pointerType==='touch')previewHover=false;
  settleCameraPointers();
  probeCameraGesture('up');
  updateHud();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('lostpointercapture',e=>releasePointer(e,true));
// A second, independent touch stream repairs missing mobile pointer releases
// without waiting for a page reload. Run in capture phase so the next camera
// move cannot see a ghost second finger.
for(const name of ['touchstart','touchmove','touchend','touchcancel'] as const)
  window.addEventListener(name,reconcileCanvasTouches,{capture:true,passive:true});
function clearTacticalGestureState():void{
  activePointers.clear();trace=null;
  panMid=null;pinchDistance=0;draggingWatchTarget=false;draggingNode=null;
}
window.addEventListener('blur',clearTacticalGestureState);
window.addEventListener('pagehide',clearTacticalGestureState);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearTacticalGestureState();
});
// Prevent iOS Safari's native page-scale gesture from competing with our
// Two-finger world pan/zoom while the canvas owns the gesture.
for(const gesture of ['gesturestart','gesturechange','gestureend']){
  canvas.addEventListener(gesture,e=>e.preventDefault(),{passive:false});
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
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
renderFavoriteMissions();
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
const liveMixToggle=el<HTMLButtonElement>('liveMixToggle');
const roomAudioToggle=el<HTMLButtonElement>('roomAudioToggle');
function updateAudioLabButtons(){
 liveMixToggle.textContent=liveMixEnabled?'TEST MIX ON':'TEST MIX OFF';
 liveMixToggle.setAttribute('aria-pressed',String(liveMixEnabled));
 roomAudioToggle.textContent=roomAudioEnabled?'ROOM ACOUSTICS ON':'ROOM ACOUSTICS OFF';
 roomAudioToggle.setAttribute('aria-pressed',String(roomAudioEnabled));
}
updateAudioLabButtons();
liveMixToggle.addEventListener('click',()=>{
 liveMixEnabled=!liveMixEnabled;refreshSoundPack();
 try{localStorage.setItem(LIVE_MIX_PREF,liveMixEnabled?'on':'off');}
 catch{/* Optional preference persistence. */}
 updateAudioLabButtons();
 showUiHelp(liveMixEnabled?'APPROVED SOUND LAB MIX ACTIVE':'TEST MIX OFF · ORIGINAL GAME AUDIO ACTIVE',2400);
});
roomAudioToggle.addEventListener('click',()=>{
 roomAudioEnabled=!roomAudioEnabled;
 try{localStorage.setItem(ROOM_AUDIO_PREF,roomAudioEnabled?'on':'off');}
 catch{/* Optional preference persistence. */}
 updateAudioLabButtons();
 showUiHelp(roomAudioEnabled?'ROOM ACOUSTICS ENABLED':'ROOM ACOUSTICS OFF · DRY SOURCE AUDIO',2400);
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
  if(opening)selectMissionSettingsTab('mission');
  tacticalSheetNavigation.sync();
  if(opening)tacticalSheetNavigation.focusFirst();
  else ui.siteSettingsToggle.focus();
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
    const playbackStep=replayPlayback.advance(dt,recorder.duration,{
      director:replayCamera.mode==='director',
      videoActive:replayQuickVideo.active,
      tempoEdits:replayDirector.tempoEdits
    });
    if(playbackStep){
      if(playbackStep.trimmedSeconds>0){
        replayDirector.editNoticeSeconds=playbackStep.trimmedSeconds;
        replayDirector.editNoticeUntil=performance.now()+1850;
      }
      applyReplayFrameAt(playbackStep.time);
      if(playbackStep.resetAudio)stopReplaySounds();
      else playReplayAudioBetween(playbackStep.previousTime,playbackStep.time);
      if(playbackStep.finishedIncident)stopReplaySounds();
    }
  }
  if(replaying)advanceReplayCamera(dt);
  // 079: shot IDs are monotonic, unlike the short-lived shot array length.
  // A new shot can arrive on exactly the tick an old shot expires.
  // Track the newest three audible shots without a per-frame filter/slice.
  const freshShots:typeof state.shots=[];
  let newestShotId=lastSoundShotId;
  for(const shot of state.shots){
    if(shot.id<=lastSoundShotId)continue;
    if(shot.id>newestShotId)newestShotId=shot.id;
    if(audio&&!replaying){
      if(freshShots.length===3)freshShots.shift();
      freshShots.push(shot);
    }
  }
  if(audio&&!replaying)for(const shot of freshShots){
    const firingActor=state.operators.find(a=>a.id===shot.shooterId);
    const weapon=firingActor?.weapon??'carbine';
    const listener=uid(selected)?.p;
    const level=listener?heardIntensity(shot.start,listener,
      WEAPONS[weapon].noise,state.doors,WALLS):1;
    if(level<.01)continue; // Outside acoustic range is genuinely quiet.
    const pan=listener?(shot.start.x-listener.x)/210:0;
    const cue=weaponAudioCue(weapon,
      firingActor?.weaponConfiguration?.slots.muzzle==='muzzle-suppressor');
    if(!playApprovedCue('weapons.'+weapon+
      (firingActor?.weaponConfiguration?.slots.muzzle==='muzzle-suppressor'?
      '_suppressed':''),level,pan,false,1,shot.start,shot.id)){
      playTone(cue.crackHz,cue.crackSeconds,true,level,pan);
      playTone(cue.bodyHz,cue.bodySeconds,false,level*cue.bodyLevel,pan);
    }
    // Never play the exact-hit cue merely because a hidden shot hit.
    // An operator must see the impact or be close enough to hear it.
    const impactLevel=listener?heardIntensity(shot.end,listener,
      88,state.doors,WALLS):0;
    if(shot.hit&&audibleImpact(shotVisibility(state,shot).impact,
        impactLevel))
      if(!playApprovedCue('impacts.body_hit',
        level*Math.max(.22,impactLevel),pan,false,1,shot.end,shot.id+197))
        playTone(shot.down?75:225,shot.down?.25:.10,
          shot.down,level*Math.max(.22,impactLevel),pan);
  }
  lastSoundShotId=newestShotId;
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
        if(!playApprovedCue('movement.boot',level*.20,pan,false,1,
           touch.position,hashString(touch.id+'|'+touch.foot+'|'+touch.at.toFixed(3))))
          playTone(touch.foot===0?62:67,.055,true,level*.12,pan);
      }
    }
  }
  lastFootstepSoundTime=state.seconds;
  const event=state.events.at(-1)??'';
  // Event origin is used only for audio; never as newly revealed intel.
  const eventSource=!replaying&&event!==lastEventAudio?
   liveEventAudioPosition(event):undefined;
  if(!replaying&&event!==lastEventAudio&&
      (event.includes('OPENED')||event.includes('CLOSING')))
    {if(!playLiveEventCue(event.includes('CLOSING')?'doors.close':'doors.open',
      eventSource))
      playTone(160,.16);}
  if(!replaying&&event!==lastEventAudio&&event.includes('KICK RESISTED')){
    // Every real kick should play the approved kick sound, with its own
    // secondary latch/body outcome at reduced level.
    if(!playLiveEventCue('doors.kick',eventSource))playTone(90,.25,true);
    playLiveEventCue('doors.kick_resisted',eventSource,.30);
  }
  if(!replaying&&event!==lastEventAudio&&event.includes('FORCED OPEN')){
    if(!playLiveEventCue('doors.kick',eventSource))playTone(90,.25,true);
    playLiveEventCue('doors.forced_open',eventSource,.33);
  }
  if(!replaying&&event!==lastEventAudio&&event.includes('KICKED'))
    {if(!playLiveEventCue('doors.kick',eventSource))playTone(90,.25,true);}
  if(!replaying&&event!==lastEventAudio&&event.includes('FLASH DETONATED'))
    {if(!playLiveEventCue('combat.flash',eventSource))playTone(1350,.65,true);}
  if(!replaying&&event!==lastEventAudio&&event.includes('RELOADED'))
    {if(!playLiveEventCue('equipment.reload',eventSource))playTone(280,.09);}
  if(!replaying&&event!==lastEventAudio&&event.includes('FLASH OUT'))
    {if(!playLiveEventCue('equipment.flash_throw',eventSource))playTone(420,.07);}
  if(!replaying&&event!==lastEventAudio&&event.includes('SURRENDERED'))
    {if(!playLiveEventCue('people.surrender',eventSource))playTone(210,.22);}
  lastEventAudio=event;
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
