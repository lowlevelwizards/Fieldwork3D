import {safetyBodyFor} from './breach-friendly-safety-volume.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {bloodMarkRadius,bloodMarkTint} from './breach-blood-evidence.ts';
import {damageRadius,damageTint} from './rendering/breach-stain-atlas.ts';
import {isIntermediateMaterialCue,MAX_MATERIAL_CUES} from './breach-material-cues.ts';
import {sampleBloodBurst,BLOOD_BURST_COUNT} from './rendering/breach-blood-burst.ts';
import {wallMarkPose,doorMarkLocalPose,coverMarkLocalPose,windowMarkPose,isGroundImpactMark,type SurfaceMarkPose} from './breach-impact-surface.ts';
import {hostileNpcTransitionKey,hostileCustodyWalkBlend}
 from './breach-hostile-pose-transition.ts';
import {rebuildFrameIdIndex} from './breach-frame-lookup.ts';
import {FrameActorNeighborhoodIndex} from './breach-actor-neighborhood.ts';
import {groundBloodFootprintOccluded,groundMarkHiddenByWallFromCamera,groundMarkOccludedFromCamera}
  from './breach-ground-geometry.ts';
import {lightingPresentation} from './equipment-lighting-presentation.ts';
import {SiteFixtureLightingPresenter} from './rendering/breach-site-light-presenter.ts';
import type {ReplayActorIdentity} from './breach-replay-manifest.ts';
import * as THREE from 'three';
import {ColdRendererTrace} from './rendering/breach-cold-renderer-trace.ts';
import {LiveShadowSubmitProfiler} from './rendering/breach-live-shadow-submit-profiler.ts';
import {LiveMainPassProfiler} from './rendering/breach-live-main-pass-profiler.ts';
import {stepCameraFocusGlide,type CameraFocusGlide}
  from './breach-camera-focus-glide.ts';
import {applyWorldSurfaceResponse} from './rendering/material-identity.ts';

import {GRAPHIC_LIGHT_PROFILE as G,configureGraphicRendererOutput} from './rendering/graphic-lighting-profile.ts';
import {SiteMaterialLifetime} from './rendering/site-material-lifetime.ts';
import {releaseSiteSceneObjects} from './rendering/site-scene-lifecycle.ts';
import type {SiteSceneBuildPort} from './rendering/breach-site-scene-builder.ts';
import type {BrokenDoorHardwareVisual} from './rendering/breach-door-broken-hardware-visual.ts';
import {fallenDoorHardwarePose} from './rendering/breach-door-broken-hardware-pose.ts';
import {composeBreachSiteRender} from './rendering/breach-site-render-composition.ts';
import {planGrassPatches,regroupGrassPatches} from './rendering/perplung-grass-placement.ts';
import {buildGrassPatchMeshes} from './rendering/perplung-grass-patches.ts';
import {createBushVisualResources} from './rendering/perplung-bush-atom.ts';
import {PRODUCTION_VFX} from './rendering/breach-vfx-preview-config.ts';
import {replaceTacticalFogGeometry} from './rendering/breach-fog-mesh-composition.ts';

import {APPROVED_GRAPHIC_LIGHTING}
 from './operator-studio-light-lab.ts';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION,studioShadowPalette}
 from './operator-studio-lighting.ts';
import {applyStudioGraphicLighting}
 from './operator-studio-graphic-lighting.ts';
import {BreachCombatEffectsPresenter} from './rendering/breach-combat-effects-presenter.ts';
import {PresentationSightMemo} from './rendering/breach-presentation-sight-memo.ts';
import {presentationSightPolicy,allowPresentationSightReuse}
 from './rendering/breach-presentation-sight-policy.ts';
import {presentActor,presentDecor,presentArchitecturalOpening,
  presentUnrecordedRescueMarker,resolveDoorPresentation}
 from './rendering/breach-3d-disclosure-presenter.ts';

import {windowShardPoseInto,WINDOW_SHARDS_PER_PANE,WINDOW_SHARD_CAPACITY,
 WINDOW_SETTLED_SHARDS_PER_PANE,settledWindowShardPose,WindowShardSlotCache,
 type SettledWindowShardPose}
 from './rendering/window-shatter-presentation.ts';
import {type CivilianRig} from './breach-civilian-visuals.ts';
import {doorDebrisSource,coverDebrisSource,fractureDebrisPose,debrisPoseContained,FractureSourceScratch} from './rendering/breach-fracture-debris.ts';
import {reconcileSceneActorLifetimes} from './rendering/breach-actor-frame-presenter.ts';
import {shouldPrewarmContactRig,withinContactPrewarmBudget,
  withPreparedVisibleRoot}
 from './rendering/breach-contact-rig-prewarm.ts';
import {ShotVisualPool} from './rendering/breach-shot-visual-pool.ts';
import {type ReplayDisclosure} from './breach-replay-visibility.ts';
import {graphicsBudget} from './breach-graphics-budget.ts';
import {initialMiniatureFocusMode,MINIATURE_FOCUS_STORAGE_KEY,
 miniatureFocusDecision,type MiniatureFocusMode,type MiniatureFocusView}
 from './rendering/miniature-focus-config.ts';
import {nextReplayTiltShiftCenter,type FocusPoint}
 from './rendering/miniature-focus-mask.ts';
import {MINIATURE_FOCUS_MAX_ANCHORS} from './rendering/miniature-focus-pass.ts';
import {MiniatureFocusPass,type MiniatureFocusDebug}
 from './rendering/miniature-focus-pass.ts';
import {MiniatureAttentionMask,type AttentionPolygon,type AttentionDisc}
 from './rendering/miniature-attention-mask.ts';
import {focusZoomMultiplier,recentRevealWeight,FOCUS_PROTECTION}
 from './rendering/miniature-attention-policy.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
import {sightRangeForSite} from './breach-visibility-range-policy.ts';
import {projectedOperatorHeightPx,operatorShadowDetail,
 applyOperatorShadowLod,cavityQualityForDetail}
 from './operator-shadow-quality.ts';
import {PixelTextureLibrary,mapBoxPixelUV,mapPackedWallUV,mapAtlasWallUV,mapPlanePixelUV,type PixelSurface} from './rendering/pixel-materials.ts';

import {wearFinish} from './rendering/wear-finish.ts';

import {fixtureFrameTransform} from './rendering/fixture-frame-transform.ts';
import {exteriorBriefedAt} from './breach-site-footprint.ts';
import {StaticSceneBatches} from './rendering/breach-static-batcher.ts';
import {StaticVisualTemplateLibrary,type StaticVisualLease}
 from './rendering/fieldwork-visual-template-library.ts';
import {BreachContactShadowBatch} from './rendering/breach-contact-shadow-batch.ts';
import {RepeatedFixtureBatches} from './rendering/breach-repeated-fixture-batches.ts';
import {PausedShadowSceneController,shadowEligibleBox}
  from './rendering/breach-shadow-controller.ts';

import {type WearKind,type WearMark} from './worldgen/environment-wear.ts';
import {summarizeWear} from './worldgen/wear-diagnostics.ts';
import {conditionFloorPixels,effectiveCondition} from './worldgen/condition-visual.ts';
import {planCompiledFloorWear,indexFloorWear} from './worldgen/floor-wear-plan.ts';
import {resolveFloorWear,writeFloorMaskSlot,type FloorMaskSlot} from './rendering/floor-surface-atlas.ts';

import {conditionWallPixels} from './worldgen/condition-wall.ts';
import {packedWallSurfacePixels,resolveWallSurfaceMode,type WallAudition,type WallSurfaceRecipe} from './worldgen/wall-surface-recipe.ts';
import {installWallShadowBounds,resolveWallStructureMode} from './rendering/wall-structural-packet.ts';
import {writeAtlasSlot,type WallAtlasSlot} from './rendering/wall-surface-atlas.ts';
import {type ObjectWear} from './worldgen/object-wear.ts';

import {wearPixels} from './rendering/pixel-decals.ts';
import {impactFinishScale} from './rendering/breach-impact-finish-scale.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './rendering/wear-opacity.ts';
import {pixelSign,type PixelSignKind} from './rendering/pixel-signage.ts';
import {pixelOverlay,type PixelOverlay} from './rendering/pixel-overlays.ts';
import {roofShouldShow} from './worldgen/roof-cutaways.ts';
import {W,H,WALLS,doorCenter,doorLeafSegment,activeSite,type Pt,type Segment} from './breach-core.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {handlingIntentForMovement,teammateAheadProjectedOffset}
  from './breach-handling-context.ts';
import {resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {weaponLightEmitting} from './equipment-weapon-light-operations.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter,LIGHT_BEAM_SAMPLES}
 from './equipment-weapon-light-beam.ts';
import {type Site,type Room,type WideOpening} from './breach-site.ts';
import {bakedOperatorCarry,prewarmSavedOperatorCarry}
 from './rendering/breach-saved-operator-carry-bake.ts';
import {updateOperatorAppearance} from './breach-operator-appearance.ts';
import {readEquipmentInteraction} from './breach-equipment-interaction-pose.ts';
import {type Session,type TeamActor,team,knownAt,liveVisibility} from './breach-game.ts';
import {downedTransportPresentation} from './breach-capture-transport-presentation.ts';
import {SurrenderedFirearmsPresenter} from './rendering/breach-surrendered-firearms-presenter.ts';
import {spatialSurfaceKnown,shotVisibility} from './breach-presentation.ts';
import {doorKnown} from './breach-intel.ts';
import {handlePoint,doorReachable} from './breach-door.ts';
import {entryToolVerdict} from './breach-entry-tools.ts';
import {doorHandPoint} from './breach-door-hand-contact.ts';
import {doorGripPhysicalContact} from './breach-physical-contact-anchor.ts';
import {preOpenDoorCandidate} from './breach-preopen-contact.ts';
import {validateThrow} from './breach-flash.ts';
import {footAnchorReachable} from './breach-navigation.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {armedPrecontactStyle} from './breach-idle-life.ts';
import {hostilePhysicalityAt} from './breach-hostile-physicality.ts';
import {WEAPONS} from './breach-combat.ts';
import {IMPACT_MARK_LIMIT,impactProfile} from './breach-effects.ts';
import {TransientLightPreview} from './rendering/breach-transient-light-preview.ts';
import {createMuzzleFlashGeometry,muzzleFlashAspect} from './rendering/breach-muzzle-flash-art.ts';
import {DustPuffBatch,puffCount,samplePuff,type PuffSample} from './rendering/breach-dust-puffs.ts';
import type {PuffKind} from './breach-atmosphere-evidence.ts';
import {makeStainMarkBatch,makeBloodDropletBatch,BLOOD_DROPLET_CAPACITY} from './rendering/breach-blood-preview.ts';
import {ImpactMarkSlotCache,MARK_MATRIX_DIRTY,MARK_COLOR_DIRTY,MARK_STYLE_DIRTY} from './rendering/breach-impact-mark-cache.ts';
import {MATERIAL_IMPACT_PROFILES,MATERIAL_IMPACT_PARTICLE_LIMIT,sampleMaterialImpact,type ImpactParticleSample} from './rendering/breach-material-impact-atom.ts';
import {presentSecondaryMuzzleFlash} from './secondary-holster-visual.ts';
import {muzzleFlashCue,mostRecentActiveMuzzleShot,impactPulse,
 RecentMuzzleShotFrameIndex}
 from './breach-combat-cues.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
import {WALL_VISUAL_HEIGHT} from './breach-door-proportions.ts';
import {paintFogMemory,paintFogVisibility,occupiedFogRooms,
  FOG_WIDTH,FOG_HEIGHT,maskSize,type FogDiagnostic}
  from './breach-fog-mask.ts';

import {FogRefreshGate,fogMemoryFingerprint} from './breach-fog-cache.ts';
import {wallOccludesFriendly} from './breach-camera-occlusion.ts';
import {groupWallPresentation,resolveWallPresentation,applyWallMaterialState,type WallPresentationOwner} from './rendering/breach-wall-presentation.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import {sampleBodycamSocket,applyBodycamCamera,smoothBodycamSample,
  type BodycamSetting,type BodycamSample} from './breach-replay-bodycam.ts';
import type {ReplayDoorKnowledgeHistory} from './breach-replay-door-knowledge.ts';
import type {ReplayWindowKnowledgeHistory} from './breach-replay-window-knowledge.ts';
import {personalCoverVisible}
  from './breach-replay-personal-visibility.ts';
import {interpolatedActor,type RenderFrame}
  from './breach-frame-interpolation.ts';

/** One authoritative 2D world, physically represented in one 3D scene.
 * Coordinates: tactics (x,y) => scene (x, elevation, y).
 * This module may not mutate simulation state. */
export type ViewMode='iso'|'top'|'plan2d';
export type ViewState={mode:ViewMode;yaw:number;zoom:number;pitch:number;focus:Pt};
export type PhotoCameraSnapshot={view:ViewState;anchor:Pt|null;focus:Pt|null;subjects:Pt[];fov:number;lens:'ortho'|'wide';bodycam:BodycamSetting|null;perspective:boolean;};
const color=(hex:number)=>new THREE.Color(hex);
const mat=(hex:number,roughness=.9)=>new THREE.MeshStandardMaterial({
  color:hex,roughness,flatShading:true,
});
type StagePhaseName='environment'|'camera'|'disclosure'|'actors'|
 'effects'|'fog'|'shadows'|'postCamera'|'gpuSubmit';
type ShotEffectVisual={
 style:string;root:THREE.Group;line:THREE.Mesh;impact:THREE.Mesh;
 chips:THREE.Mesh[];material:THREE.MeshBasicMaterial;
 impactMaterial:THREE.MeshBasicMaterial;
};
export class TacticalScene3D{
  private readonly hemisphere=new THREE.HemisphereLight(
   STUDIO_INSPECTION_LIGHT.sky,studioShadowPalette('plum-plus').ground,1.20);
  private readonly graphicFill=new THREE.DirectionalLight(
   studioShadowPalette('plum-plus').fill,.60);
  /** Renderer-only; ?presentationSight=legacy bypasses memo for A/B. */
  private readonly presentationSight=new PresentationSightMemo();
  private readonly v19FrameSight=new URLSearchParams(location.search).get('v19FrameSight')==='1';
  /** Reused every 3D frame; occupancy only affects roof presentation. */
  private readonly occupiedRoofRoomIds=new Set<string>();
  /** Render-only: a single history scan for all actors' overlapping muzzle
   * flashes; shot visibility stays evaluated by the original resolver. */
  private readonly recentMuzzleShots=
   new RecentMuzzleShotFrameIndex<Session['shots'][number]>();
  /** Same first-match references as Array.find, built once per 3D frame. */
  private readonly frameActorsById=new Map<string,Session['operators'][number]>();
  private readonly frameDoorsById=new Map<string,Session['doors'][number]>();
  /** Reusable ally-only spatial candidates for crowded 3D presentation. */
  private readonly frameActorNeighborhood=
   new FrameActorNeighborhoodIndex<Session['operators'][number]>();
  // E6.15: reuse existing P1.5 actor/scene phase counters only when the
  // user explicitly requests a local coldBench capture. Normal gameplay
  // still leaves pose/phase CPU timing entirely disabled.
  private profileSceneUpdate=(()=>{
   const params=new URLSearchParams(location.search);
   return params.has('perf')||params.get('coldBench')==='1';
  })();
  /** In-game PERF arms all scene timings even without ?perf=1 at launch.
   * Hidden PERF continues recording, without changing render behavior. */
  setPerformanceProfilingEnabled(enabled:boolean):void{
   this.profileSceneUpdate=enabled;
   // The in-game PERF switch may be armed after squad rigs were created.
   // Flip the existing diagnostic flag on toggle, never inside normal pose.
   for(const actor of this.actors.values())
    actor.physical.root.userData.fieldworkProfilePose=enabled;
  }
  /** E6.16: strictly opt-in shadow-map submission attribution. */
  private readonly liveShadowSubmitProfiler:LiveShadowSubmitProfiler|null;
  private readonly liveMainPassProfiler:LiveMainPassProfiler|null;
  private scenePhaseStart=0;
  /** Opt-in cold-rig vs pose timing. The actor phase can contain first-use
   * wardrobe material/shadow generation as well as steady-state posing. */
  private readonly actorPhaseCosts={
   rigMs:0,rigBuilds:0,poseMs:0,posePrepMs:0,poseCount:0,
   appearanceMs:0,weaponBuildMs:0,otherPoseMs:0,
   visualKitMs:0,receiverAtlasMs:0,
   appearanceFingerprintMs:0,appearanceInvalidations:0,
   allyContextMs:0,allyPeerVisits:0
  };
  /** CPU-only slices of a single 3D update. GPU time is NOT measured. */
  private readonly scenePhases:Record<StagePhaseName,number>={
   environment:0,camera:0,disclosure:0,actors:0,effects:0,
   fog:0,shadows:0,postCamera:0,gpuSubmit:0
  };
  private markScenePhase(key:StagePhaseName):void{
   if(!this.profileSceneUpdate)return;
   const now=performance.now();
   this.scenePhases[key]=now-this.scenePhaseStart;
   this.scenePhaseStart=now;
  }
  private readonly presentationSightPolicy=presentationSightPolicy(
   new URLSearchParams(location.search).get('presentationSight'));
  /** A/B baseline for perf audits; never changes tactical shadow resolution. */
  private readonly graphicLookEnabled=
   new URLSearchParams(location.search).get('lighting')!=='legacy';
  private graphicWorldMaterialCount=0;
  private graphicOperatorRestyles=0;
  private appliedLightingMode:import('./equipment-site-lighting.ts').LightingMode|null=null;
  private readonly quality=graphicsBudget(
    new URLSearchParams(location.search).get('quality'),
    navigator.maxTouchPoints>0);
  /** Shelved: default direct rendering, including old saved Subtle/Strong. */
  private miniFocusMode=initialMiniatureFocusMode(
    new URLSearchParams(location.search).get('focusFx'),
    (()=>{try{return localStorage.getItem(MINIATURE_FOCUS_STORAGE_KEY);}
      catch{return null;}})());
  private readonly miniFocusDebug:MiniatureFocusDebug=(()=>{
    // Standalone focusDebug must never invoke the shelved GPU pipeline.
    if(this.miniFocusMode==='off')return null;
    const d=new URLSearchParams(location.search).get('focusDebug');
    return d==='mask'||d==='protected'||d==='band'||d==='attention'?d:null;
  })();
  private miniFocusPass:MiniatureFocusPass|null=null;
  private miniFocusIsReplay=false;
  private miniFocusFrameDt=1/60;
  private miniFocusAttentionTime=.15;
  private miniFocusZoomStrength=1;
  private miniFocusCenterY=.54;
  private miniFocusSelectedId:string|null=null;
  private readonly miniFocusProjection=new THREE.Vector3();
  private readonly miniFocusAnchorPool:FocusPoint[]=Array.from(
    {length:MINIATURE_FOCUS_MAX_ANCHORS},()=>({x:0,y:0}));
  private readonly miniFocusVisibleAnchors:FocusPoint[]=[];
  private miniFocusAttention:MiniatureAttentionMask|null=null;
  private miniFocusSession:Session|null=null;
  private miniFocusDoorId:string|null=null;
  private miniFocusGroundOwner:Session|null=null;
  private miniFocusLastSeconds=-1;
  private miniFocusGroundRevision=-1;
  private readonly miniFocusRememberedFine=new Set<string>();
  private readonly miniFocusNewlySeen:Array<{
    key:string;x:number;z:number;at:number
  }>=[];
  private readonly miniFocusAttentionPolygons:AttentionPolygon[]=[];
  private readonly miniFocusAttentionDiscs:AttentionDisc[]=[];
  private readonly fogRefresh=new FogRefreshGate();
  /** W5 production depth; explicit legacy mode for diagnostic comparison. */
  wallDepthOpaque=typeof location==='undefined'||new URLSearchParams(location.search).get('wallDepth')!=='legacy';
  private lastMemoryFogSignature='';
  private lastMemoryFogSession:Session|null=null;
  private readonly fogDiagnostic:FogDiagnostic=
    new URLSearchParams(location.search).get('fogDebug')==='palette'?
      'palette':'normal';
  /** Scratch list for occluding operators; avoids two arrays per RAF. */
  private readonly nearbyAllyScratch:Pt[]=[];
  private fogMemoryPaints=0;
  private fogSightPaints=0;
  /** Dirtied CanvasTexture versions, not measured completed GPU uploads. */
  private fogTextureUpdateRequests=0;
  /** Renderer callback confirms WebGL upload submission, not GPU completion. */
  private fogTextureSubmittedUploads=0;
  private fogTextureSubmittedBytesEstimate=0;
  private fogComposeMs=0;
  private fogComposeCpuTotalMs=0;

  /** Counts submitted WebGL work; GPU timings require a separate timer. */
  performanceStats(){
    const info=this.renderer.info.render;
    // Renderer-managed GPU resource *counts*, not VRAM byte estimates.
    const memory=this.renderer.info.memory;
    return {calls:info.calls,triangles:info.triangles,
      geometryCount:memory.geometries,textureCount:memory.textures,
      staticBatch:this.staticBatches.stats(),
      staticModelTemplates:this.architecturalVisualTemplates.stats(),
      contactShadowBatch:this.contactShadowBatch.stats,
      repeatedFixtureBatch:this.repeatedFixtures.stats,
      siteMaterialCount:this.siteMaterials.size,
      actorRigCount:this.actors.size,
      civilianRigCount:this.civilianRigs.size,
      shadowSubmission:this.liveShadowSubmitProfiler?.last??null,
      mainPassSubmission:this.liveMainPassProfiler?.last??null,
      shadowRefreshes:this.shadowUpdates.refreshes,
      shadowReuses:this.shadowUpdates.reuses,
      shadowLodTransitions:this.shadowLodTransitions,
      shadowMapSize:this.sun.shadow.mapSize.x,
      fogMemoryPaints:this.fogMemoryPaints,
      fogSightPaints:this.fogSightPaints,
      fogTextureUpdateRequests:this.fogTextureUpdateRequests,
      fogTextureSubmittedUploads:this.fogTextureSubmittedUploads,
      fogTextureSubmittedBytesEstimate:this.fogTextureSubmittedBytesEstimate,
      fogTextureBytesPerRequest:this.fogCanvas.width*this.fogCanvas.height*4,
      fogComposeMs:this.profileSceneUpdate?this.fogComposeMs:null,
      fogComposeCpuTotalMs:this.profileSceneUpdate?
        this.fogComposeCpuTotalMs:null,
      presentationSight:this.presentationSight.stats(),
      presentationSightPolicy:this.presentationSightPolicy,
      scenePhases:this.profileSceneUpdate?this.scenePhases:null,
      actorPhaseCosts:this.profileSceneUpdate?this.actorPhaseCosts:null,
      graphicWorldMaterialCount:this.graphicWorldMaterialCount,
      graphicOperatorRestyles:this.graphicOperatorRestyles,
      graphicLookEnabled:this.graphicLookEnabled};
  }
  readonly renderer:THREE.WebGLRenderer;
  /** E6.8: only created by explicit ?gpuTrace=1 for one cold startup. */
  readonly coldRendererTrace:ColdRendererTrace|null;
  /** E6.10: already synchronized initial frame, never a second state tick. */
  private preparedColdFrame:{camera:THREE.Camera;at:number}|null=null;
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.OrthographicCamera(-320,320,370,-370,.1,2800);
  /** Director lenses share a legal in-room X/Z anchor, but use entirely
   * separate projection limits from the tactical orbit. */
  private readonly directorOrthoCamera=
    new THREE.OrthographicCamera(-320,320,370,-370,.1,2400);
  private readonly directorCamera=
    new THREE.PerspectiveCamera(108,1,.45,2400);
  /** Replay-only perspective camera; default rendering stays orthographic. */
  readonly bodycamCamera=new THREE.PerspectiveCamera(95,1,.8,2800);
  private readonly photoCamera=new THREE.PerspectiveCamera(72,1,.45,2800);
  private photoPerspective=false;
  private photoLiveBodycam=false;
  private photoClean=false;
  private replayBodycam:BodycamSetting|null=null;
  private bodycamSmooth:BodycamSample|null=null;
  private lastBodycamSampleTime:number|null=null;
  private replayXrayOn=false;
  private replayDirectorFocus:Pt|null=null;
  private replayDirectorSubjects:Pt[]=[];
  private replayDirectorCameraAnchor:Pt|null=null;
  private replayDirectorLensFov=108;
  private replayDirectorLens:'ortho'|'wide'='ortho';
  private get physicalDirectorActive():boolean{
    return !!this.replayDirectorCameraAnchor&&this.view.mode==='iso';
  }
  private get projectionCamera():THREE.Camera{
    if(this.photoPerspective)return this.photoCamera;
    return this.physicalDirectorActive?
      (this.replayDirectorLens==='wide'?
        this.directorCamera:this.directorOrthoCamera):this.camera;
  }
  getMiniatureFocusMode():MiniatureFocusMode{return this.miniFocusMode;}
  setMiniatureFocusMode(mode:MiniatureFocusMode):void{
    if(this.miniFocusMode===mode)return;
    this.miniFocusMode=mode;
    this.miniFocusAttentionTime=.15;
    if(mode==='off'){
      this.miniFocusPass?.dispose();this.miniFocusPass=null;
      this.miniFocusAttention?.dispose();this.miniFocusAttention=null;
    }
  }
  /** Focus never shuts off during gestures. Returning to the native
   * renderer whenever the camera moved caused the brightness flicker.
   * dt is only for optional replay-director's slow focus bias. */
  setMiniatureFocusContext(replaying:boolean,dt:number):void{
    if(this.miniFocusMode==='off')return;
    if(replaying!==this.miniFocusIsReplay)
      this.miniFocusCenterY=replaying?.54:.56;
    this.miniFocusIsReplay=replaying;
    this.miniFocusFrameDt=Math.max(0,Math.min(.15,dt));
  }
  /** Tiny, explicit readability exceptions only: the currently selected
   * friendly in gameplay, or up to two director-featured replay subjects.
   * Do NOT globally protect every actor/room or the effect disappears.
   */
  private miniatureFocusAnchors(
   camera:THREE.Camera,director:boolean):readonly FocusPoint[]{
    const output=this.miniFocusVisibleAnchors;
    output.length=0;
    const add=(x:number,y:number,z:number):void=>{
      if(output.length>=MINIATURE_FOCUS_MAX_ANCHORS)return;
      const clip=this.miniFocusProjection.set(x,y,z).project(camera);
      if(!Number.isFinite(clip.x)||!Number.isFinite(clip.y)||
         clip.z<-1||clip.z>1)return;
      const px=(clip.x+1)*this.width/2,py=(1-clip.y)*this.height/2;
      if(px<-65||px>this.width+65||
         py<-85||py>this.height+85)return;
      const point=this.miniFocusAnchorPool[output.length];
      point.x=px;point.y=py;output.push(point);
    };
    if(director){
      for(const p of this.replayDirectorSubjects.slice(0,2))
        add(p.x,22,p.y);
    }else if(this.miniFocusSelectedId){
      const selected=this.actors.get(this.miniFocusSelectedId);
      if(selected?.root.visible){
        const p=selected.root.position;
        add(p.x,p.y+20,p.z);
      }
    }
    return output;
  }
  /** A rare slow-follow option for replay only. No hunting in tactical mode;
   * a deadzone and clamp prevent the shot composer from being overridden. */
  private updateMiniatureReplayFocus(camera:THREE.Camera):void{
    let total=0,count=0;
    for(const p of this.replayDirectorSubjects.slice(0,2)){
      const projected=this.miniFocusProjection.set(p.x,20,p.y).project(camera);
      if(!Number.isFinite(projected.y)||projected.z<-1||projected.z>1)
        continue;
      total+=(1-projected.y)*.5;count++;
    }
    if(count)this.miniFocusCenterY=nextReplayTiltShiftCenter(
      this.miniFocusCenterY,total/count,this.miniFocusFrameDt);
  }
  /** Return screen position of a world point already permitted for display.
   * This is projection only: it never queries hidden contacts.
   */
  private miniatureScreenPoint(camera:THREE.Camera,
    x:number,z:number,y=12):FocusPoint|null{
    const clip=this.miniFocusProjection.set(x,y,z).project(camera);
    if(!Number.isFinite(clip.x)||!Number.isFinite(clip.y)||
       !Number.isFinite(clip.z)||clip.z< -1||clip.z>1)return null;
    return {x:(clip.x+1)*this.width/2,
      y:(1-clip.y)*this.height/2};
  }
  private miniatureFrameRoomCoverage(camera:THREE.Camera,s:Session):number{
    const selected=s.operators.find(a=>a.id===this.miniFocusSelectedId&&
      a.side==='blue');
    if(!selected||!s.site)return 0;
    const room=s.site.rooms.find(r=>
      selected.p.x>=r.x&&selected.p.x<=r.x+r.w&&
      selected.p.y>=r.y&&selected.p.y<=r.y+r.h);
    if(!room)return 0;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const x of [room.x,room.x+room.w])
      for(const z of [room.y,room.y+room.h])
        for(const y of [0,40]){
          const p=this.miniatureScreenPoint(camera,x,z,y);
          if(!p)continue;
          minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
          minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
        }
    if(!Number.isFinite(minX)||!Number.isFinite(minY))return 0;
    return Math.max(0,Math.min(1,Math.max(
      (maxX-minX)/Math.max(1,this.width),
      (maxY-minY)/Math.max(1,this.height))));
  }
  /** New reconnaissance uses only the authoritative, already-seen FINE
   * ground keys. No future/undisclosed level geometry is sampled. History
   * resets on mission changes, replay seeks and time reversal.
   */
  private miniatureUpdateRecentReveal(s:Session):void{
    if(this.miniFocusGroundOwner!==s||this.miniFocusIsReplay||
       s.seconds<this.miniFocusLastSeconds-.001){
      this.miniFocusAttention?.reset();
      this.miniFocusGroundOwner=s;this.miniFocusLastSeconds=s.seconds;
      this.miniFocusGroundRevision=s.seenGroundRevision;
      this.miniFocusRememberedFine.clear();
      this.miniFocusNewlySeen.length=0;
      for(const key of s.seenGround)
        if(key.startsWith('fine:'))this.miniFocusRememberedFine.add(key);
      return;
    }
    this.miniFocusLastSeconds=s.seconds;
    if(this.miniFocusGroundRevision!==s.seenGroundRevision){
      this.miniFocusGroundRevision=s.seenGroundRevision;
      for(const key of s.seenGround){
        if(!key.startsWith('fine:')||this.miniFocusRememberedFine.has(key))
          continue;
        this.miniFocusRememberedFine.add(key);
        const parts=key.slice(5).split(',');
        const col=Number(parts[0]),row=Number(parts[1]);
        if(!Number.isInteger(col)||!Number.isInteger(row))continue;
        this.miniFocusNewlySeen.push({
          key,x:col*20+10,z:row*20+10,at:s.seconds
        });
      }
    }
    // Only the most recent revelations, not every tile explored in a
    // mission: bounded memory and no global historical sharpness.
    while(this.miniFocusNewlySeen.length>96)
      this.miniFocusNewlySeen.shift();
    for(let i=this.miniFocusNewlySeen.length-1;i>=0;i--)
      if(s.seconds-this.miniFocusNewlySeen[i].at>3.6)
        this.miniFocusNewlySeen.splice(i,1);
  }
  /** Compose a soft, screen-space tactical attention matte. Authority for
   * live sight is the same vision polygon used by the FOW renderer.
   * Replay never recomputes live sight from hidden historical geometry:
   * actor meshes are used only if replay disclosure already shows them.
   */
  private miniatureUpdateAttention(camera:THREE.Camera,
    s:Session,director:boolean,elapsed:number):number{
    if(!this.miniFocusAttention)
      this.miniFocusAttention=new MiniatureAttentionMask();
    const polygons=this.miniFocusAttentionPolygons;
    const discs=this.miniFocusAttentionDiscs;
    polygons.length=0;discs.length=0;
    const disc=(p:FocusPoint|null,rx:number,ry:number,
      importance:number):void=>{
      if(!p||p.x< -rx||p.x>this.width+rx||
         p.y< -ry||p.y>this.height+ry)return;
      discs.push({x:p.x,y:p.y,radiusX:rx,radiusY:ry,importance});
    };
    if(!this.miniFocusIsReplay){
      for(const friendly of team(s)){
        if(friendly.health<=0)continue;
        const world=sessionWorldGeometry(s);
        const polygon=visionPolygon(friendly.p,friendly.heading,sightRangeForSite(s.site),
          world.walls,s.doors,friendly.posture==='crouch',world.cover);
        const projected:FocusPoint[]=[];
        for(const p of polygon){
          const xy=this.miniatureScreenPoint(camera,p.x,p.y,13);
          if(xy)projected.push(xy);
        }
        if(projected.length>=3)
          polygons.push({points:projected,importance:FOCUS_PROTECTION.sight});
      }
      this.miniatureUpdateRecentReveal(s);
      for(const reveal of this.miniFocusNewlySeen){
        const age=s.seconds-reveal.at;
        const importance=recentRevealWeight(age);
        if(importance<.005)continue;
        disc(this.miniatureScreenPoint(camera,reveal.x,reveal.z,12),
          30,30,importance*FOCUS_PROTECTION.recent);
      }
      // Known-last-position evidence only: never sample the real invisible
      // hostile location after contact is lost.
      for(const memory of s.known.values()){
        if(memory.status!=='seen')continue;
        const age=s.seconds-memory.at;
        const strength=recentRevealWeight(age);
        if(strength<=0)continue;
        disc(this.miniatureScreenPoint(camera,memory.p.x,memory.p.y,20),
          65,70,strength);
      }
      for(const shot of s.shots){
        if(shot.age>.55||!shotVisibility(s,shot).impact)continue;
        disc(this.miniatureScreenPoint(camera,shot.end.x,shot.end.y,15),
          58,63,FOCUS_PROTECTION.critical);
      }
    }else{
      // Explicitly remove a live tactical matte when transitioning to a
      // historical replay, including backwards seeks.
      this.miniFocusNewlySeen.length=0;
    }
    for(const actor of s.operators){
      const object=this.actors.get(actor.id);
      if(!object?.root.visible)continue;
      const selected=actor.id===this.miniFocusSelectedId;
      const critical=actor.side!=='blue'||selected;
      const p=this.miniatureScreenPoint(camera,
        object.root.position.x,object.root.position.z,
        object.root.position.y+21);
      disc(p,critical?78:50,critical?94:65,
        critical?FOCUS_PROTECTION.critical:FOCUS_PROTECTION.context);
    }
    for(const civil of s.civilians){
      const rig=this.civilianRigs.get(civil.id);
      if(!rig?.root.visible)continue;
      disc(this.miniatureScreenPoint(camera,
          rig.root.position.x,rig.root.position.z,
          rig.root.position.y+20),
        58,70,FOCUS_PROTECTION.critical);
    }
    if(director){
      for(const p of this.replayDirectorSubjects.slice(0,3))
        disc(this.miniatureScreenPoint(camera,p.x,p.y,22),90,105,1);
    }else{
      const selected=s.operators.find(a=>a.id===this.miniFocusSelectedId&&
        a.side==='blue');
      if(selected){
        disc(this.miniatureScreenPoint(camera,
          selected.p.x,selected.p.y,15),76,92,1);
        const upcoming=selected.plan[0]?.p;
        if(upcoming)disc(this.miniatureScreenPoint(camera,
          upcoming.x,upcoming.y,13),48,56,.92);
      }
      if(this.miniFocusDoorId){
        const door=s.doors.find(d=>d.id===this.miniFocusDoorId);
        if(door){
          const p=doorCenter(door);
          disc(this.miniatureScreenPoint(camera,p.x,p.y,22),
            64,70,FOCUS_PROTECTION.critical);
        }
      }
    }
    this.miniFocusAttention.update(
      this.width,this.height,elapsed,polygons,discs);
    const overviewZoom=this.displayedSite?1.48:1.25;
    return focusZoomMultiplier(
      this.view.zoom/overviewZoom,
      this.miniatureFrameRoomCoverage(camera,s));
  }
  private renderMiniatureFocus(camera:THREE.Camera):void{
    // Native renderer: no blur target, framebuffer copy or attention upload.
    if(this.miniFocusMode==='off'){
      this.renderer.render(this.scene,camera);return;
    }
    const director=this.miniFocusIsReplay&&this.physicalDirectorActive;
    const view:MiniatureFocusView=
      camera===this.bodycamCamera?'bodycam':
      this.view.mode==='top'?'top':
      this.view.mode==='plan2d'?'floor-plan':
      director?'director':this.miniFocusIsReplay?'free-replay':'tactical';
    const decision=miniatureFocusDecision({
      mode:this.miniFocusMode,view,quality:this.quality.mode,
      protectedRegionValid:this.width>0&&this.height>0,
      gesturesActive:false,capable:true,
    });
    if(!decision.active&&!this.miniFocusDebug){
      this.renderer.render(this.scene,camera);return;
    }
    // Static .56 focus in gameplay. Replay director may slowly bias the
    // horizontal band toward featured subjects without moving the camera.
    if(director)this.updateMiniatureReplayFocus(camera);
    else this.miniFocusCenterY=decision.centerY;
    if(director)decision.centerY=this.miniFocusCenterY;
    const anchors=this.miniatureFocusAnchors(camera,director);
    // Vision polygons perform geometry occlusion. Collect them ~10 Hz,
    // NOT at 60 Hz, and reuse the last attention texture for in-between
    // frames. This prevents scene-complexity-driven phone stutters.
    this.miniFocusAttentionTime+=this.miniFocusFrameDt;
    if(this.miniFocusSession&&
       (this.miniFocusAttentionTime>=.09||!this.miniFocusAttention)){
      const interval=this.miniFocusAttentionTime;
      this.miniFocusAttentionTime=0;
      this.miniFocusZoomStrength=this.miniatureUpdateAttention(
        camera,this.miniFocusSession,director,interval);
    }
    if(!this.miniFocusPass)this.miniFocusPass=new MiniatureFocusPass(this.renderer);
    this.miniFocusPass.render(this.scene,camera,decision,
      this.width,this.height,anchors,this.miniFocusDebug,
      this.miniFocusAttention?.texture??null,
      this.miniFocusZoomStrength);
  }
  inspectMiniatureFocus(){
    return {mode:this.miniFocusMode,debug:this.miniFocusDebug,
      ...this.miniFocusPass?.getDiagnostics(),
      attention:this.miniFocusAttention?.diagnostics()??null};
  }
  /** Default: in-room orthographic. WIDE is a deliberate A/B preview,
   * never changes the tactical camera, replay footage or simulation. */
  setReplayDirectorCameraAnchor(
    p:Pt|null,fov=108,lens:'ortho'|'wide'='ortho'):void{
    this.replayDirectorCameraAnchor=p?{...p}:null;
    this.replayDirectorLensFov=THREE.MathUtils.clamp(fov,82,116);
    this.replayDirectorLens=lens;
  }
  setReplayDirectorFocus(p:Pt|null):void{
    this.replayDirectorFocus=p?{...p}:null;
    if(!p)this.replayDirectorSubjects=[];
  }
  setReplayDirectorSubjects(subjects:readonly Pt[]):void{
    // Friendly positions only. Never pass enemy coordinates to the renderer
    // to guide cinematic architecture.
    this.replayDirectorSubjects=subjects.slice(0,4).map(p=>({...p}));
  }
  /** Presentation-only photo camera state; the same scene and actor rigs. */
  capturePhotoCameraSnapshot():PhotoCameraSnapshot{return {
    view:{...this.view,focus:{...this.view.focus}},
    anchor:this.replayDirectorCameraAnchor?{...this.replayDirectorCameraAnchor}:null,
    focus:this.replayDirectorFocus?{...this.replayDirectorFocus}:null,
    subjects:this.replayDirectorSubjects.map(p=>({...p})),
    fov:this.replayDirectorLensFov,lens:this.replayDirectorLens,
    bodycam:this.replayBodycam?{...this.replayBodycam}:null,
    perspective:this.photoPerspective
  };}
  restorePhotoCameraSnapshot(saved:PhotoCameraSnapshot):void{
    Object.assign(this.view,saved.view,{focus:{...saved.view.focus}});
    this.replayDirectorCameraAnchor=saved.anchor?{...saved.anchor}:null;
    this.replayDirectorFocus=saved.focus?{...saved.focus}:null;
    this.replayDirectorSubjects=saved.subjects.map(p=>({...p}));
    this.replayDirectorLensFov=saved.fov;this.replayDirectorLens=saved.lens;
    this.photoPerspective=saved.perspective;
    this.setReplayBodycam(saved.bodycam);this.updateCamera(0);
  }
  setPhotoLiveBodycam(enabled:boolean):void{this.photoLiveBodycam=enabled;}
  setPhotoClean(enabled:boolean):void{this.photoClean=enabled;}
  setPhotoPerspective(enabled:boolean):void{
    if(this.photoPerspective===enabled)return;
    this.photoPerspective=enabled;this.updateCamera(0);
  }
  /** Presentation-only wall transparency: recorded sight still governs actors. */
  setReplayXray(enabled:boolean):void{
    this.replayXrayOn=enabled;
  }
  private bodycamLastQa:{active:boolean;owner:string|null;masked:number;
    maskRestored:boolean;frame:number;at:number}|null=null;
  private renderFrameSerial=0;
  readonly view:ViewState={mode:'iso',yaw:Math.PI/4,zoom:1.25,
    pitch:55*Math.PI/180,
    focus:{x:W/2,y:H/2}};
  /** Camera framing follows the displayed site, not temporary editor or
   * replay construction global activation.
   */
  private displayedSite:Site|null=activeSite();
  private get displayedBounds(){
    return this.displayedSite?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
  }
  readonly canvas:HTMLCanvasElement;
  private root=new THREE.Group();
  private readonly staticBatches=new StaticSceneBatches();
  private readonly architecturalVisualTemplates=new StaticVisualTemplateLibrary();
  private readonly siteVisualLeases:StaticVisualLease[]=[];
  private readonly useArchitectureTemplates=new URLSearchParams(location.search)
    .get('e622Template')==='1';
  // Independent opt-in; rigid cover geometry is immutable, damage/wear is not.
  private readonly includeServiceFixtureTemplates=new URLSearchParams(location.search)
    .get('e624Service')==='1';
  private readonly useFixtureTemplates=this.includeServiceFixtureTemplates||
    new URLSearchParams(location.search).get('e623Fixture')==='1';
  private readonly repeatedFixtures=new RepeatedFixtureBatches();
  private readonly fixtureLights=new SiteFixtureLightingPresenter(this.scene);
  // One shared cosmetic draw rather than two transparent WebGL passes per rig.
  private readonly contactShadowBatch=new BreachContactShadowBatch(this.scene);
  private readonly shadowUpdates=new PausedShadowSceneController();
  private readonly shadowAppearanceKey=(actor:{id:string}):string|undefined=>
    this.actors.get(actor.id)?.physical.root.userData.fieldworkLightingAppearanceKey as string|undefined;
  private shadowLodTransitions=0;
  private fogUnknown:THREE.InstancedMesh;
  private fogExplored:THREE.InstancedMesh;
  private fogCanvas!:HTMLCanvasElement;
  private fogContext!:CanvasRenderingContext2D;
  private fogMemoryCanvas!:HTMLCanvasElement;
  private fogMemoryContext!:CanvasRenderingContext2D;
  private fogTexture!:THREE.CanvasTexture;
  private smoothFog!:THREE.Mesh;
  private exteriorKnownFog!:THREE.Mesh;
  private actors=new Map<string,{side:TeamActor['side'];root:THREE.Group;flash:THREE.Mesh;
    beam:THREE.Mesh;beamLast:{x:number;y:number;yaw:number;tick:number}|null;
    pack:THREE.Mesh;
    weapon:THREE.Group;status:THREE.Mesh;physical:OperatorRig;
    contactShadows:THREE.Mesh[]}>();
  private beamBlockerTick=-1;private beamBlockerSite=-1;
  private beamBlockerRevision=-1;private beamBlockerSignature='';
  private beamBlockers:Segment[]=[];
  private doors=new Map<string,{root:THREE.Group;leaf:THREE.Group;
    frame:THREE.Group;halo:THREE.Group;threshold:THREE.Mesh;
    wedge:THREE.Mesh;glassPane?:THREE.Mesh}&BrokenDoorHardwareVisual>();
  private observedDoorGlass=new Map<string,boolean>();
  private observedDoorBroken=new Map<string,boolean>();
  private observedDoorOpen=new Map<string,number>();
  private effectCache=new Map<number,ShotEffectVisual>();
  private readonly shotEffectPool=new ShotVisualPool<ShotEffectVisual>(20);
  // One instanced draw for every stain and impact mark, rather than a mesh
  // and transparent material allocation per hit.
  private impactDecalMesh:THREE.InstancedMesh|null=null;
  private readonly vfxPreview=PRODUCTION_VFX;
  private readonly materialImpactPreviewEnabled=this.vfxPreview.impacts;
  private readonly bloodPreviewEnabled=this.vfxPreview.blood;
  private readonly materialImpactScratch:ImpactParticleSample={x:0,y:0,z:0,yaw:0,roll:0,pitch:0,width:0,length:0,opacity:0,color:0};
  private stainPreview:ReturnType<typeof makeStainMarkBatch>|null=null;
  private dropletPreview:ReturnType<typeof makeBloodDropletBatch>|null=null;
  private readonly shotPulsePreviewEnabled=this.vfxPreview.pulses;
  private tracerBatch:ReturnType<typeof makeBloodDropletBatch>|null=null;
  private impactPulseBatch:ReturnType<typeof makeBloodDropletBatch>|null=null;
  private readonly shotPulseEuler=new THREE.Euler();
  private readonly shotPulseQuaternion=new THREE.Quaternion();
  private readonly persistentEvidencePreview=this.vfxPreview.evidence;
  private readonly impactMarkSlots=new ImpactMarkSlotCache(IMPACT_MARK_LIMIT);
  private impactDecalMatrix=new THREE.Object3D();
  private readonly impactDecalNormal=new THREE.Vector3();
  private readonly impactDecalAxis=new THREE.Vector3(0,0,1);
  private readonly impactDecalPoint=new THREE.Vector3();
  private readonly impactDecalNormalMatrix=new THREE.Matrix3();
  private bloodCameraDirection=new THREE.Vector3();
  private impactDecalColor=new THREE.Color();

  private rescueFigure:THREE.Group|null=null;
  private civilianRigs=new Map<string,CivilianRig>();
  /** World-owned dropped firearms survive the character pose; no per-frame model creation. */
  private surrenderedFirearms=new SurrenderedFirearmsPresenter(this.scene);
  private tracerAxis=new THREE.Vector3(0,1,0);
  /** Shot visuals copy these values into meshes immediately. Scratch vectors
   * avoid three new Vector3 allocations per visible shot per render frame. */
  private readonly shotStart=new THREE.Vector3();
  private readonly shotEnd=new THREE.Vector3();
  private readonly shotFlight=new THREE.Vector3();
  private readonly shoeWorldPoint=new THREE.Vector3();
  private tracerGeometry=new THREE.CylinderGeometry(.65,.65,1,6);
  private impactGeometry=new THREE.IcosahedronGeometry(1,1);
  private walls:{mesh:THREE.Mesh;mid:Pt;segment:Segment;
    index:number;exterior:boolean}[]=[];
  private wallOwners:WallPresentationOwner<THREE.Mesh>[]=[];
  private readonly roofGroups=new Map<string,THREE.Group>();
  private roofMaterial:THREE.MeshStandardMaterial|null=null;
  private intelSurfaces:{obj:THREE.Object3D;kind:'wall'|'cover';
    index:number}[]=[];
  private observedDetails:{obj:THREE.Object3D;position:Pt;
    microKey:string;fineKey:string}[]=[];
  private architecturalOpenings:{obj:THREE.Object3D;opening:WideOpening}[]=[];
  private wallMaterials=new Set<THREE.Material>();
  private effects=new THREE.Group();
  private grassPreview:ReturnType<typeof buildGrassPatchMeshes>|null=null;
  private bushPreview:ReturnType<typeof createBushVisualResources>|null=null;
  private target=new THREE.Vector3(339,0,413);
  private currentElev=55*Math.PI/180;
  private readonly minZoom=.65;
  private readonly maxZoom=8.0;
  /** Camera QA DOM state is only refreshed when its inputs change.
   * Do not format, join and allocate a status string on every render. */
  private lastCameraStatus:{
    mode:ViewMode;zoom:number;yaw:number;pitch:number;
    focusX:number;focusY:number;lens:string;
    anchorX:number|null;anchorY:number|null
  }|null=null;
  private pickPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  private aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-24);
  private ray=new THREE.Raycaster();
  /** Pointer projection is synchronous. Reuse math vectors across touch
   * updates and HUD projection rather than allocating every query. */
  private readonly screenNdc=new THREE.Vector2();
  private readonly screenIntersection=new THREE.Vector3();
  private readonly screenProjection=new THREE.Vector3();
  private width=1;private height=1;
  private terminalPoseSeconds=0;private terminalSessionStamp=-1;
  /** Presentation clock alone runs on pause; simulation/replay stay frozen. */
  private idleLifeSeconds=0;private idleLifeSession:Session|null=null;
  private sun:THREE.DirectionalLight;
  private mats:THREE.Material[]=[];
  private readonly combatEffects=new BreachCombatEffectsPresenter(
    this.effects,this.mats,this.graphicLookEnabled);
  // Unlike shared palettes, site-specific materials are released on every rebuild.
  private readonly siteMaterials=new SiteMaterialLifetime<THREE.Material>();
  // Shared render resources persist between sites; repeated site rebuilds
  // must not leak another material and geometry per identical fixture.
  private solidCache=new Map<string,THREE.MeshStandardMaterial>();
  private readonly pixelTextures=new PixelTextureLibrary();
  private pixelTexturesEnabled=true;
  private boxGeometryCache=new Map<string,THREE.BoxGeometry>();
  /** OC3 tiny world props. Session owns locations and disclosure, not meshes. */
  private readonly optionalEvidenceMeshes=new Map<string,THREE.Group>();
  private sharedBoxGeometries=new Set<THREE.BufferGeometry>();
  private windowPaneMaterial:THREE.MeshStandardMaterial|null=null;
  private readonly wearMaterials=new Map<string,THREE.MeshBasicMaterial>();
  private readonly surfaceWearMaterials=new Map<string,THREE.MeshStandardMaterial>();
  private sitePatinaTextures:THREE.DataTexture[]=[];
  private sitePatinaMaterials:THREE.MeshBasicMaterial[]=[];
  private patinaRoomSurfaces:{room:Room;texture:THREE.DataTexture;floorSlot?:FloorMaskSlot}[]=[];
  floorWearCompiled=resolveFloorWear(typeof location==='undefined'?null:new URLSearchParams(location.search).get('floorWear'));
  private patinaWallSurfaces:{index:number;texture:THREE.DataTexture;recipe?:WallSurfaceRecipe;patterned?:boolean;atlasSlot?:WallAtlasSlot}[]=[];
  /** W3 is the production default; legacy and packed are comparison modes. */
  wallStructureUnified=resolveWallStructureMode(typeof location==='undefined'?null:new URLSearchParams(location.search).get('wallStructure'))==='unified';
  wallStructureCompiled=resolveWallStructureMode(typeof location==='undefined'?null:new URLSearchParams(location.search).get('wallStructure'))==='compiled';
  wallAudition:WallAudition|undefined=(()=>{
    const mode=typeof location==='undefined'?null:new URLSearchParams(location.search).get('wallWear');
    return resolveWallSurfaceMode(mode);
  })();
  /** Live slider scrubbing changes pixel masks, not the physical scene. */
  previewConditionMasks(site:Site,level:number){
    const floorPages=new Set<THREE.DataTexture>();
    const floorMarks=this.floorWearCompiled?indexFloorWear(planCompiledFloorWear(site,level)):undefined;
    for(const item of this.patinaRoomSurfaces){
      if(item.floorSlot){writeFloorMaskSlot(site,item.floorSlot,level,floorMarks?.get(item.room.id),this.wearBoost);floorPages.add(item.texture);continue;}
      const image=item.texture.image as {data:Uint8Array};
      image.data.set(conditionFloorPixels(site,item.room,level));
      item.texture.needsUpdate=true;
    }
    for(const page of floorPages)page.needsUpdate=true;
    const dirtyAtlasPages=new Set<THREE.DataTexture>();
    for(const item of this.patinaWallSurfaces){
      if(item.atlasSlot){writeAtlasSlot(item.atlasSlot,level,this.wallAudition?.effect??'all');dirtyAtlasPages.add(item.texture);continue;}
      const image=item.texture.image as {
        data:Uint8Array;width:number;height:number};
      if(item.recipe)image.data.set(packedWallSurfacePixels(item.recipe,level,image.width,this.wallAudition?.effect??'all',item.patterned));
      else image.data.set(conditionWallPixels(site,item.index,level,
        image.width,image.height));
      item.texture.needsUpdate=true;
    }
    for(const page of dirtyAtlasPages)page.needsUpdate=true;
  }
  private currentWear:WearMark[]=[];
  private objectWear:ObjectWear[]=[];
  private wearBoost=1;
  private fixtureWearStrength={value:1};
  wearStats(){return summarizeWear(this.currentWear);}
  setWearExaggeration(multiplier:number){
    this.wearBoost=Math.max(1,Math.min(4,multiplier));
    this.fixtureWearStrength.value=this.wearBoost;
    if(this.floorWearCompiled&&this.displayedSite){
      const site=this.displayedSite;
      const level=effectiveCondition(site);
      this.previewConditionMasks(site,level);
    }
    for(const [key,material] of [...this.wearMaterials,...this.surfaceWearMaterials]){
      const bucket=Number(key.slice(key.lastIndexOf(':')+1));
      material.opacity=Math.min(1,WEAR_ALPHA_BANDS[bucket]*this.wearBoost);
    }
  }
  private readonly wearTextures=new Map<WearKind,THREE.DataTexture>();
  private readonly signMaterials=new Map<string,THREE.MeshBasicMaterial>();
  private readonly groundOverlays=new Map<PixelOverlay,THREE.MeshBasicMaterial>();
  // Scene reconciliation runs every RAF. Reuse transient membership sets
  // instead of allocating five new Sets (and temporary mapped arrays).
  private readonly frameActorIds=new Set<string>();
  private readonly frameCivilianIds=new Set<string>();
  private readonly frameShotIds=new Set<number>();
  private windowGlass=new Map<string,THREE.Mesh>();
  /** Scratch index rebuilt from current session data; never hold prior
   * replay snapshots or a site's mutable window array across frames. */
  private readonly frameWindowsById=new Map<string,Session['windows'][number]>();
  private windowShards:THREE.InstancedMesh|null=null;
  private readonly shardMatrix=new THREE.Object3D();
  private transientLights:TransientLightPreview|null=null;
  private readonly muzzleFlashGeometry=createMuzzleFlashGeometry();
  private readonly muzzleFlashMaterial=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.94,depthWrite:false});
  private readonly smokePreviewEnabled=this.vfxPreview.smoke;
  private dustPuffs:DustPuffBatch|null=null;
  private readonly puffScratch:PuffSample={x:0,y:0,z:0,size:0,alpha:0,color:0,phase:0};
  private readonly glassDebrisPreview=this.vfxPreview.glass;
  private readonly shardSlots=new WindowShardSlotCache();
  private readonly settledShardScratch:SettledWindowShardPose={x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1,heightScale:1};
  private readonly settledPanes:Session['windows'][number][]=[];
  private readonly fractureSources=new FractureSourceScratch();
  private readonly shardColors=new Int32Array(WINDOW_SHARD_CAPACITY).fill(-1);
  private readonly shardTint=new THREE.Color();
  private readonly shardOpacity=new THREE.InstancedBufferAttribute(
    new Float32Array(WINDOW_SHARD_CAPACITY).fill(1),1).setUsage(THREE.DynamicDrawUsage);
  private coverGroups=new Map<number,THREE.Group>();
  private coverVisualStates=new Map<number,{intact:THREE.Group;debris:THREE.Group}>();
  private readonly coverFrameValues=new Map<number,{
    x:number;y:number;w:number;h:number;destroyed:boolean;toppled:boolean
  }>();
  private solid=(hex:number,roughness=.9,surface?:PixelSurface)=>{
    const key=hex+':'+roughness+':'+(surface??'plain');
    let material=this.solidCache.get(key);
    if(!material){
      material=mat(hex,roughness);
      if(surface){
        applyWorldSurfaceResponse(material,surface);
        material.userData.pixelSurface=surface;
        if(this.pixelTexturesEnabled)material.map=this.pixelTextures.get(surface);
      }
      this.solidCache.set(key,material);this.mats.push(material);
    }
    return material;
  };
  constructor(){
    const canvas=document.createElement('canvas');
    canvas.id='breach3dCanvas';canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;'+
      'pointer-events:none;z-index:0;display:block';
    document.body.insertBefore(canvas,document.body.firstChild);
    this.canvas=canvas;
    const coldTraceEnabled=new URLSearchParams(window.location.search).
      get('gpuTrace')==='1';
    const rendererStarted=coldTraceEnabled?performance.now():0;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,
      alpha:false,powerPreference:'high-performance'});
    // The GL hook starts *after* renderer construction; this independent
    // constructor timer includes context creation, without GPU-time claims.
    this.coldRendererTrace=coldTraceEnabled?new ColdRendererTrace(
      this.renderer.getContext(),performance.now()-rendererStarted,
      ()=>({programs:this.renderer.info.programs?.length??0,
        geometries:this.renderer.info.memory.geometries,
        textures:this.renderer.info.memory.textures})):null;
    configureGraphicRendererOutput(this.renderer);
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.autoUpdate=false;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    // W4 uses original body bounds during shadow culling, not the larger trim packet.
    installWallShadowBounds(this.renderer.shadowMap as unknown as Parameters<typeof installWallShadowBounds>[0],()=>this.wallStructureUnified?this.walls:[]);
    // E6.16 does not install hooks in normal gameplay.
    this.liveShadowSubmitProfiler=
      new URLSearchParams(location.search).get('coldBench')==='1'?
       new LiveShadowSubmitProfiler(this.renderer as unknown as
         ConstructorParameters<typeof LiveShadowSubmitProfiler>[0]):null;
    this.liveMainPassProfiler=this.liveShadowSubmitProfiler?
      new LiveMainPassProfiler(this.renderer as unknown as
        ConstructorParameters<typeof LiveMainPassProfiler>[0],
        ()=>this.liveShadowSubmitProfiler?.isShadowPass??false):null;
    // Atmospheric distance fog was tinting every interior surface in ISO.
    // Visibility is handled separately by authoritative exploration tiles.
    this.scene.background=color(0x182a2a);
    this.scene.fog=null;
    this.graphicFill.position.set(-35,23,30);
    this.graphicFill.intensity=this.graphicLookEnabled?.60:0;
    if(this.graphicLookEnabled){
     this.hemisphere.color.setHex(STUDIO_INSPECTION_LIGHT.sky);
     this.hemisphere.groundColor.setHex(
      studioShadowPalette('plum-plus').ground);
    }else{
     this.hemisphere.color.setHex(0xdde8df);
     this.hemisphere.groundColor.setHex(0x24302e);
    }
    this.scene.add(this.hemisphere,this.graphicFill);
    this.sun=new THREE.DirectionalLight(
     this.graphicLookEnabled?STUDIO_INSPECTION_LIGHT.key:0xf4dab4,2.35);
    if(this.graphicLookEnabled)
     this.sun.position.copy(STUDIO_KEY_DIRECTION).multiplyScalar(300);
    else this.sun.position.set(-100,260,180);
    this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(this.quality.shadowSize,this.quality.shadowSize);
    Object.assign(this.sun.shadow.camera,{
      left:-320,right:320,top:320,bottom:-320,near:.5,far:800,
    });// A small normal offset mitigates repeated shadow-map stripes on flat
    // exterior terrain without removing contact shadows under operators.
    this.sun.shadow.bias=-.00012;this.sun.shadow.normalBias=.16;
    this.scene.add(this.sun,this.sun.target);
    // E6.17: semantic debug labels only, never alter rendering.
    this.root.userData.fieldworkRenderCategory='environment';
    this.effects.userData.fieldworkRenderCategory='effects';
    this.scene.add(this.root,this.effects);
    if(this.vfxPreview.lights)
      this.transientLights=new TransientLightPreview(this.scene,
        this.graphicLookEnabled?this.renderer:undefined);
    // First paint and mission reload now use the same build/batch/grade path.
    this.composeSiteWorld(this.displayedSite);
    if(this.displayedSite)this.view.zoom=1.48;
    // Architectural silhouettes remain visible (as in the 2D map), but
    // unknown cells are strongly darkened. Unseen soldiers and door states
    // are separately visibility-gated, so a huge opaque 'roof' is unnecessary.
    const fgeom=new THREE.PlaneGeometry(40.4,40.4);
    fgeom.rotateX(-Math.PI/2);
    const unknownMat=new THREE.MeshBasicMaterial({
      color:0x071416,side:THREE.DoubleSide,transparent:true,
      opacity:.52,depthWrite:false});
    const exploredMat=new THREE.MeshBasicMaterial({
      color:0x071819,side:THREE.DoubleSide,transparent:true,
      opacity:.18,depthWrite:false});
    this.mats.push(unknownMat,exploredMat);
    this.fogUnknown=new THREE.InstancedMesh(fgeom,unknownMat,16*19);
    this.fogExplored=new THREE.InstancedMesh(fgeom,exploredMat,16*19);
    this.fogUnknown.userData.fieldworkRenderCategory='fog';
    this.fogExplored.userData.fieldworkRenderCategory='fog';
    this.fogUnknown.frustumCulled=this.fogExplored.frustumCulled=false;
    this.fogUnknown.renderOrder=16;this.fogExplored.renderOrder=16;
    this.root.add(this.fogUnknown,this.fogExplored);
    this.fogUnknown.count=0;this.fogExplored.count=0;
    this.fogCanvas=document.createElement('canvas');
    this.fogCanvas.width=FOG_WIDTH;this.fogCanvas.height=FOG_HEIGHT;
    const context=this.fogCanvas.getContext('2d');
    if(!context)throw Error('Fog canvas unavailable');
    this.fogContext=context;
    this.fogMemoryCanvas=document.createElement('canvas');
    this.fogMemoryCanvas.width=FOG_WIDTH;
    this.fogMemoryCanvas.height=FOG_HEIGHT;
    const memoryContext=this.fogMemoryCanvas.getContext('2d');
    if(!memoryContext)throw Error('Fog memory canvas unavailable');
    this.fogMemoryContext=memoryContext;
    this.fogTexture=new THREE.CanvasTexture(this.fogCanvas);
    // The renderer invokes onUpdate after submitting a changed texture.
    // This is NOT a GPU timer or a completed-transfer measurement. Reuse
    // one callback and texture through map swaps; no separate renderer hook.
    this.fogTexture.onUpdate=()=>{
      this.fogTextureSubmittedUploads++;
      this.fogTextureSubmittedBytesEstimate+=
        this.fogCanvas.width*this.fogCanvas.height*4;
    };
    // Canvas pixels are authored as CSS/sRGB colors. Without this the GPU
    // interprets their values as linear and re-encodes them, turning the
    // intended dark #122022 concealment into a bright blue-grey sheet.
    this.fogTexture.colorSpace=THREE.SRGBColorSpace;
    this.fogTexture.minFilter=THREE.LinearFilter;
    this.fogTexture.magFilter=THREE.LinearFilter;
    const fogMat=new THREE.MeshBasicMaterial({
      map:this.fogTexture,transparent:true,depthTest:true,opacity:1,
      depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
    this.mats.push(fogMat);
    this.smoothFog=new THREE.Mesh(new THREE.PlaneGeometry(W,H),fogMat);
    this.smoothFog.userData.fieldworkRenderCategory='fog';
    this.smoothFog.rotation.x=-Math.PI/2;
    // Ground-space LOS mask, not a floating translucent roof. Keep ordinary
    // camera depth testing even though the sheet draws late: the prior
    // depthTest:false composited unknown interior pixels over *nearer* squad
    // members, doors and architecture, producing giant false overhead slabs
    // that sliced through the player on low-angle/rotated cameras.
    // Undiscovered raised geometry is hidden by the object-intel gates;
    // known solids naturally occlude the ground fog where physically nearer.
    // Keep the sheet on the GROUND to avoid isometric parallax/displacement.
    this.smoothFog.position.set(W/2,1.05,H/2);
    this.smoothFog.renderOrder=1000;
    this.smoothFog.frustumCulled=false;
    this.scene.add(this.smoothFog);
    // In Exterior Known, mask only actual building-floor footprints, not
    // the site bounding rectangle. It uses this SAME texture and material,
    // but cannot paint black over grass beyond the building walls.
    this.exteriorKnownFog=new THREE.Mesh(new THREE.BufferGeometry(),fogMat);
    this.exteriorKnownFog.userData.fieldworkRenderCategory='fog';
    this.exteriorKnownFog.renderOrder=1000;
    this.exteriorKnownFog.frustumCulled=false;
    this.exteriorKnownFog.visible=false;
    this.scene.add(this.exteriorKnownFog);
    // Ground-aligned fog is the sole map-space concealment layer. Depth
    // testing makes physical view occlusion authoritative; forced screen
    // compositing would hide nearby operators outside the covered footprint.
    this.resize(innerWidth,innerHeight);
  }
  private groundOverlayMaterial(kind:PixelOverlay){
    const existing=this.groundOverlays.get(kind);if(existing)return existing;
    const texture=new THREE.DataTexture(pixelOverlay(kind),32,32,THREE.RGBAFormat);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.magFilter=THREE.NearestFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;texture.needsUpdate=true;
    const material=new THREE.MeshBasicMaterial({map:texture,
      color:kind==='mud'?0x655440:kind==='tire'?0x3b403a:0x91806c,
      transparent:true,opacity:.25,depthWrite:false,polygonOffset:true,
      polygonOffsetFactor:-1});
    this.groundOverlays.set(kind,material);this.mats.push(material);
    return material;
  }
  private signMaterial(kind:PixelSignKind,variant=0){
    const key=kind+':'+(variant%3);
    const prior=this.signMaterials.get(key);if(prior)return prior;
    const texture=new THREE.DataTexture(pixelSign(kind,variant%3),32,32,THREE.RGBAFormat);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.magFilter=THREE.NearestFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;
    texture.needsUpdate=true;
    const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    this.signMaterials.set(key,material);this.mats.push(material);
    return material;
  }
  /** Toggle source maps for the asset showroom without rebuilding gameplay geometry. */
  setPixelTextures(enabled:boolean){
    if(this.pixelTexturesEnabled===enabled)return;
    this.pixelTexturesEnabled=enabled;
    this.scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      for(const material of materials){
        if(!(material instanceof THREE.MeshStandardMaterial))continue;
        const surface=material.userData.pixelSurface as PixelSurface|undefined;
        if(!surface)continue;
        material.map=enabled?this.pixelTextures.get(surface):null;
        material.needsUpdate=true;
      }
    });
  }
  /** Iconic low-poly dossier, communications set or laptop; at most six.
   * Entirely observational: neither raycast targets nor collection state
   * is stored on the scene graph. Do not animate in the main game loop. */
  private syncOptionalEvidenceMeshes(s:Session,replaying:boolean):void{
    for(const item of s.optionalIntel??[]){
      let group=this.optionalEvidenceMeshes.get(item.id);
      const exposed=!replaying&&item.discovered&&item.collectedBy===null;
      if(!group&&exposed){
        group=new THREE.Group();
        group.name='optional-intel:'+item.id;
        const shell=this.solid(0x555b45,.88);
        const detail=this.solid(0xdfc792,.89);
        const dark=this.solid(0x303d3a,.86);
        if(item.kind==='documents'){
          this.box(group,0,1.8,0,13,2.5,9,shell,false);
          this.box(group,0,3.2,-1,11,1,7,detail,false);
          this.box(group,0,3.8,-3,6,.7,1,dark,false);
        }else if(item.kind==='communications'){
          this.box(group,0,4.5,0,9,8,7,dark,false);
          this.box(group,0,8.7,-.7,7,1.8,5,shell,false);
          this.box(group,2.4,13.5,-1.5,1.5,9,1.5,detail,false);
          this.box(group,-2.5,5.5,-3.6,1.8,1.8,1.2,detail,false);
        }else{
          this.box(group,0,1.6,0,14,2.3,9,dark,false);
          this.box(group,0,5,-3.8,13,7,1.8,shell,false);
          this.box(group,0,5,-4.9,10,4,.9,detail,false);
        }
        this.root.add(group);
        this.optionalEvidenceMeshes.set(item.id,group);
      }
      if(group){group.visible=exposed;group.position.set(item.p.x,0,item.p.y);}
    }
  }
  private box(parent:THREE.Object3D,x:number,y:number,z:number,
    w:number,h:number,d:number,material:THREE.Material,cast=true,packedWall=false,atlasSlot?:WallAtlasSlot){
    const key=w+':'+h+':'+d+(packedWall?':wall-packed':'');
    let geometry=atlasSlot?mapAtlasWallUV(new THREE.BoxGeometry(w,h,d),atlasSlot.row,atlasSlot.texture.image.height):this.boxGeometryCache.get(key);
    if(!geometry){
      geometry=packedWall?mapPackedWallUV(new THREE.BoxGeometry(w,h,d)):mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
      // Bound cache memory; uncommon one-off sizes remain independently owned.
      if(this.boxGeometryCache.size<384){
        this.boxGeometryCache.set(key,geometry);
        this.sharedBoxGeometries.add(geometry);
      }
    }
    const o=new THREE.Mesh(geometry,material);
    o.position.set(x,y,z);
    o.castShadow=cast&&shadowEligibleBox(w,h,d);
    o.receiveShadow=true;
    parent.add(o);return o;
  }
  /** Lightweight surface-local visual layer; parents rotate/hide with architecture. */
  private addSurfaceWear(parent:THREE.Object3D,mark:ObjectWear,x:number,y:number,z:number,
    surface:PixelSurface){
    const bucket=wearOpacityBucket(mark.opacity);
    const key=surface+':'+mark.kind+':'+bucket;
    let material=this.surfaceWearMaterials.get(key);
    if(!material){
      let texture=this.wearTextures.get(mark.kind);
      if(!texture){
        texture=new THREE.DataTexture(wearPixels(mark.kind),32,32,THREE.RGBAFormat);
        texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
        texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
        texture.needsUpdate=true;this.wearTextures.set(mark.kind,texture);
      }
      material=new THREE.MeshStandardMaterial({map:texture,...wearFinish(surface,mark.kind),transparent:true,
        opacity:Math.min(1,WEAR_ALPHA_BANDS[bucket]*this.wearBoost),depthWrite:false,
        polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
      this.surfaceWearMaterials.set(key,material);this.mats.push(material);
    }
    const decal=new THREE.Mesh(new THREE.PlaneGeometry(mark.size,mark.size*.7),material);
    decal.position.set(x,y,z);
    if(mark.face==='back')decal.rotation.y=Math.PI;
    decal.castShadow=false;decal.receiveShadow=false;
    decal.userData.fieldworkDrawFamily='surface-wear-decal';
    decal.userData.fieldworkTransparencyRole='surface-wear-decal';
    parent.add(decal);
  }
  private plane(parent:THREE.Object3D,x:number,z:number,w:number,d:number,
    y:number,material:THREE.Material){
    const mesh=new THREE.Mesh(mapPlanePixelUV(new THREE.PlaneGeometry(w,d),w,d,x,z),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  /** Release a stale hostile rig on a site swap OR a replay seek with a
   * different actor roster. Hidden-yet-existing hostiles remain pooled.
   * Never dispose the four persistent friendly operators' rig resources.
   */
  private retireHostileActor(id:string):void{
    const actor=this.actors.get(id);
    if(!actor||actor.side==='blue')return;
    this.scene.remove(actor.root,actor.status,actor.beam);
    this.contactShadowBatch.unregister(id);
    // The flash is scene-owned, not part of the retired rig's resource tree.
    actor.flash.removeFromParent();
    actor.physical.dispose();
    // Contact shadow proxies share geometry and material with the persistent
    // instanced batch. Only these per-actor meshes own disposable resources.
    for(const mesh of [actor.status,actor.beam]){
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.actors.delete(id);
  }
  /** New mission replaces *only* architectural meshes. Soldiers and
   * camera remain alive, avoiding a WebGL context restart on each site.
   */
  applySite(site:Site|null){
    // A new site cannot reuse the previous scene/camera preparation.
    this.preparedColdFrame=null;
    // Scene persists across missions; retire read-only indices of the old
    // encounter immediately instead of keeping previous shot/actor objects
    // alive until a later scene update.
    this.recentMuzzleShots.clear();
    this.frameActorsById.clear();
    this.frameDoorsById.clear();
    this.frameActorNeighborhood.clear();
    this.displayedSite=site;
    // The site root is retired below; never retain stale meshes from it.
    this.optionalEvidenceMeshes.clear();
    this.staticBatches.clear();
    this.repeatedFixtures.clear();
    this.fixtureLights.reset();
    this.presentationSight.reset();
    // Friendly rigs survive map changes for responsive load-in. Hostile
    // models belong to the outgoing encounter and otherwise accumulate
    // indefinitely as procedural sites create new hostile actor IDs.
    for(const [id,actor] of this.actors){
      if(actor.side==='blue')continue;
      this.retireHostileActor(id);
    }
    // Civilians share module-level geometry/material resources; retire only
    // the scene nodes, never the shared resources themselves.
    for(const rig of this.civilianRigs.values())this.scene.remove(rig.root);
    // Shared character assets are rig-owned, unlike legacy module-level
    // cuboid materials; site swaps must release their GPU allocations.
    for(const rig of this.civilianRigs.values())
      if('character' in rig)rig.character.dispose();
    this.civilianRigs.clear();
    this.surrenderedFirearms.clear();
    if(this.rescueFigure)this.rescueFigure.visible=false;
    // A new layout can reuse the same seed, object revision and light tick.
    // Drop old beam obstruction geometry and force surviving friendly beams
    // to resample LOS before they appear on the replacement site.
    this.beamBlockerTick=-1;this.beamBlockerSite=-1;
    this.beamBlockerRevision=-1;this.beamBlockerSignature='';
    this.beamBlockers=[];
    for(const actor of this.actors.values()){
      actor.beam.visible=false;actor.beamLast=null;
    }
    this.grassPreview?.dispose();this.grassPreview=null;
    this.bushPreview?.dispose();this.bushPreview=null;
    this.siteMaterials.reset();
    this.shadowUpdates.invalidate();
    for(const texture of this.sitePatinaTextures)texture.dispose();
    for(const material of this.sitePatinaMaterials)material.dispose();
    this.sitePatinaTextures.length=0;this.sitePatinaMaterials.length=0;
    this.patinaRoomSurfaces.length=0;this.patinaWallSurfaces.length=0;
    // Site graph disposal includes Lines and InstancedMesh GPU buffers;
    // retain shared box geometry, fog resources, actors and live renderer.
    // StaticSceneBatches already released its own instance buffers above.
    releaseSiteSceneObjects(this.root,
      new Set([this.fogUnknown,this.fogExplored]),
      new Set([...this.sharedBoxGeometries,
       ...this.architecturalVisualTemplates.sharedGeometries()]));
    for(const lease of this.siteVisualLeases)lease.release();
    this.siteVisualLeases.length=0;
    for(const material of this.wallMaterials)material.dispose();
    this.wallMaterials.clear();
    this.walls.length=0;this.wallOwners=[];
    this.doors.clear();this.windowGlass.clear();
    this.frameWindowsById.clear();
    if(this.windowShards)this.windowShards.count=0;
    this.shardSlots.reset();this.shardColors.fill(-1);this.settledPanes.length=0;this.fractureSources.reset();
    this.transientLights?.reset();
    this.dustPuffs?.reset();
    this.observedDoorGlass.clear();this.observedDoorBroken.clear();
    this.currentWear=[];this.objectWear=[];
    this.roofGroups.clear();
    this.coverGroups.clear();this.coverFrameValues.clear();
    this.coverVisualStates.clear();
    this.intelSurfaces.length=0;this.observedDetails.length=0;
    this.architecturalOpenings.length=0;
    this.observedDoorOpen.clear();
    if(this.impactDecalMesh)this.impactDecalMesh.count=0;
    this.impactMarkSlots.reset();
    this.dropletPreview?.reset();
    this.tracerBatch?.reset();this.impactPulseBatch?.reset();
    this.combatEffects.reset();
    for(const effect of this.effectCache.values()){
      this.effects.remove(effect.root);
      effect.material.dispose();effect.impactMaterial.dispose();
    }
    this.effectCache.clear();
    this.shotEffectPool.clear(effect=>{
      effect.material.dispose();effect.impactMaterial.dispose();
    });
    // Only the site-dependent fog MESH geometry changes here.
    // Canvas and its disclosure/painting rules remain owned by this scene.
    const fogSize=maskSize(site);
    if(this.fogCanvas.width!==fogSize.width)this.fogCanvas.width=fogSize.width;
    if(this.fogCanvas.height!==fogSize.height)this.fogCanvas.height=fogSize.height;
    if(this.fogMemoryCanvas.width!==fogSize.width)
      this.fogMemoryCanvas.width=fogSize.width;
    if(this.fogMemoryCanvas.height!==fogSize.height)
      this.fogMemoryCanvas.height=fogSize.height;
    replaceTacticalFogGeometry(this.smoothFog,this.exteriorKnownFog,site);
    this.fogTexture.needsUpdate=true;
    this.fogTextureUpdateRequests++;
    this.composeSiteWorld(site);
    this.root.add(this.fogUnknown,this.fogExplored);
    this.fogRefresh.invalidate();
    this.lastMemoryFogSignature='';this.lastMemoryFogSession=null;
    this.resetCamera();
  }
  /** Scene lifecycle owns all resources; builders receive only the current
   * site's collections and mesh factories, never the live simulation. */
  private siteBuildPort():SiteSceneBuildPort{
    const scene=this;
    return {
      root:scene.root,
      box:(...args)=>scene.box(...args),
      plane:(...args)=>scene.plane(...args),
      solid:(...args)=>scene.solid(...args),
      groundOverlayMaterial:kind=>scene.groundOverlayMaterial(kind),
      signMaterial:(...args)=>scene.signMaterial(...args),
      addSurfaceWear:(...args)=>scene.addSurfaceWear(...args),
      staticBatches:scene.staticBatches,
      repeatedFixtures:scene.repeatedFixtures,
      sharedBoxGeometries:scene.sharedBoxGeometries,
      visualTemplates:scene.useArchitectureTemplates?
        scene.architecturalVisualTemplates:undefined,
      fixtureTemplates:scene.useFixtureTemplates?
        scene.architecturalVisualTemplates:undefined,
      includeServiceFixtureTemplates:scene.includeServiceFixtureTemplates,
      previewBush:scene.vfxPreview.bush?
        (parent,width,height,depth)=>{
          scene.bushPreview??=createBushVisualResources();
          parent.add(scene.bushPreview.createMesh(width,height,depth));
        }:undefined,
      registerVisualLease:lease=>scene.siteVisualLeases.push(lease),
      siteMaterials:scene.siteMaterials,
      mats:scene.mats,
      walls:scene.walls,
      doors:scene.doors,
      observedDoorOpen:scene.observedDoorOpen,
      observedDoorGlass:scene.observedDoorGlass,
      windowGlass:scene.windowGlass,
      architecturalOpenings:scene.architecturalOpenings,
      intelSurfaces:scene.intelSurfaces,
      observedDetails:scene.observedDetails,
      roofGroups:scene.roofGroups,
      get roofMaterial(){return scene.roofMaterial;},
      set roofMaterial(value){scene.roofMaterial=value;},
      get windowPaneMaterial(){return scene.windowPaneMaterial;},
      set windowPaneMaterial(value){scene.windowPaneMaterial=value;},
      patinaRoomSurfaces:scene.patinaRoomSurfaces,
      floorWearCompiled:scene.floorWearCompiled,
      fixtureWearStrength:scene.fixtureWearStrength,
      patinaWallSurfaces:scene.patinaWallSurfaces,
      wallAudition:scene.wallAudition,
      wallStructureCompiled:scene.wallStructureCompiled,
      wallStructureUnified:scene.wallStructureUnified,
      wallDepthOpaque:scene.wallDepthOpaque,
      sitePatinaTextures:scene.sitePatinaTextures,
      sitePatinaMaterials:scene.sitePatinaMaterials,
      wallMaterials:scene.wallMaterials,
      wearMaterials:scene.wearMaterials,
      wearTextures:scene.wearTextures,
      wearBoost:scene.wearBoost,
      get currentWear(){return scene.currentWear;},
      set currentWear(value){scene.currentWear=value;},
      get objectWear(){return scene.objectWear;},
      set objectWear(value){scene.objectWear=value;},
      coverGroups:scene.coverGroups,
      coverVisualStates:scene.coverVisualStates
    };
  }
  private composeSiteWorld(site:Site|null):void{
    // E6.23's browser-only timing uses the same full site construction
    // boundaries for opt-in ON/OFF; this is not a GPU or device FPS metric.
    const diagnostic=new URLSearchParams(location.search).get('coldBench')==='1';
    const started=diagnostic?performance.now():0;
    // One build port, one ordered composition for initial and swapped sites.
    const result=composeBreachSiteRender(
      site,this.siteBuildPort(),this.graphicLookEnabled);
    this.graphicWorldMaterialCount=result.graphicMaterials;
    this.wallOwners=groupWallPresentation(this.walls);
    if(site&&this.vfxPreview.grass){
      const fine=planGrassPatches(site);
      const patches=this.vfxPreview.grassCell===192?regroupGrassPatches(fine):fine;
      if(patches.length){
        this.grassPreview=buildGrassPatchMeshes(patches);
        this.grassPreview.group.name='vfx-grass-preview';
        this.grassPreview.group.visible=false;
        this.root.add(this.grassPreview.group);
      }
    }
    if(diagnostic)Object.assign(window,{__fieldworkE623SiteBuild:{
      elapsedMs:performance.now()-started,
      cache:this.architecturalVisualTemplates.stats(),
      repeated:this.repeatedFixtures.stats,
      coverCount:this.coverGroups.size
    }});
  }
  resize(w:number,h:number){
    this.width=Math.max(1,w);this.height=Math.max(1,h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,this.quality.pixelRatio));
    this.renderer.setSize(this.width,this.height,false);
    this.shadowUpdates.invalidate();
    this.updateCamera(1);
  }
  /** Audition-only until interior occlusion, owner meshes and personal fog
   * have passed their visual checks. The shipped View menu never calls this.
   */
  resetReplayBodycamSmoothing():void{
    this.bodycamSmooth=null;this.lastBodycamSampleTime=null;
  }
  setReplayBodycam(setting:BodycamSetting|null):void{
    const changed=this.replayBodycam?.actorId!==setting?.actorId||
      this.replayBodycam?.mount!==setting?.mount||!setting;
    this.replayBodycam=setting?{...setting}:null;
    if(changed){this.bodycamSmooth=null;this.lastBodycamSampleTime=null;}
    // Every mount/lens change invalidates the previous frame's diagnostic:
    // slow software WebGL must not report the old chest frame as helmet QA.
    this.bodycamLastQa=null;
  }
  /** Bodycam frames intentionally suppress tactical projection labels, which
   * would otherwise draw through walls as floating first-person nameplates.
   */
  isReplayBodycamActive():boolean{
    return this.bodycamLastQa?.active??false;
  }
  /** Read-only debug information for Vite dev Bodycam smoke; not a UI API. */
  inspectReplayBodycamQa(){
    const cam=this.bodycamCamera;
    return {
      active:this.bodycamLastQa?.active??false,
      owner:this.bodycamLastQa?.owner??null,
      masked:this.bodycamLastQa?.masked??0,
      maskRestored:this.bodycamLastQa?.maskRestored??true,
      frame:this.bodycamLastQa?.frame??-1,
      at:this.bodycamLastQa?.at??null,
      fov:cam.fov,aspect:cam.aspect,
      position:cam.position.toArray(),
      direction:cam.getWorldDirection(new THREE.Vector3()).toArray(),
      knownRoofs:[...this.roofGroups.values()].filter(r=>r.visible).length,
      transparentWalls:this.walls.filter(w=>
        (w.mesh.material as THREE.MeshStandardMaterial).transparent).length,
      fogUnknown:this.fogUnknown.visible,
      fogExplored:this.fogExplored.visible,
      fogSheet:this.smoothFog.visible,
      sceneChildren:this.scene.children.length
    };
  }
  private cameraFocusGlide:CameraFocusGlide|null=null;
  cancelFocusGlide():void{this.cameraFocusGlide=null;}
  /** Only explicit operator selection creates an animation. */
  glideFocusOn(point:Pt,instant=false):void{
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    if(instant){this.focusOn(point);return;}
    this.cameraFocusGlide={
      target:{...point},
      velocity:this.cameraFocusGlide?.velocity??{x:0,y:0}
    };
  }
  setMode(mode:ViewMode){
    this.cancelFocusGlide();
    if(mode==='plan2d'){
      this.replayBodycam=null;
      this.miniFocusPass?.dispose();
      this.miniFocusPass=null;
    }
    this.view.mode=mode;
    if(mode==='plan2d')this.miniFocusAttention?.reset();
    if(mode==='top')this.view.pitch=Math.PI/2;
    else if(mode==='iso')this.view.pitch=55*Math.PI/180;
    this.canvas.style.display=mode==='plan2d'?'none':'block';
    this.fogRefresh.invalidate();
    this.updateCamera(1);
  }
  /** Yaw is always around the current map focus, never the selected unit. */
  setYaw(angle:number){
    this.cancelFocusGlide();
    this.view.yaw=((angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    this.updateCamera(1);
  }
  rotate(delta:number){this.setYaw(this.view.yaw+delta);}
  orbit(dx:number,dy:number){
    // The world follows the finger: dragging right moves the orbit left,
    // and dragging downward lowers the camera angle (toward the horizon).
    // Yaw and pitch must use the same hand-directed convention.
    if(this.view.mode==='plan2d')return;
    this.view.mode='iso';
    this.view.pitch=THREE.MathUtils.clamp(
      this.view.pitch-dy*.004,25*Math.PI/180,Math.PI/2);
    this.setYaw(this.view.yaw-dx*.007);
  }
  /** One-time tactical framing after explicit unit selection. Do not follow
   * the actor continuously or interrupt future manual camera gestures.
   */
  focusOn(point:Pt):void{
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    this.cancelFocusGlide();
    this.view.focus={x:point.x,y:point.y};
    this.updateCamera(1);
  }
  /** Briefing-only north-aligned fit. Reserve space for the top and bottom
   * selector bars so entry markers stay readable on landscape phones too.
   * This intentionally permits a wider temporary zoom than normal gameplay.
   */
  fitEntryMap():void{
    this.cancelFocusGlide();
    const bounds=this.displayedBounds;
    const width=bounds.maxX-bounds.minX;
    const height=bounds.maxY-bounds.minY;
    const aspect=this.width/this.height;
    const diagonal=Math.hypot(width,height);
    const baseSpan=Math.max(820,(diagonal+66)/aspect);
    const usableFraction=Math.max(.38,Math.min(.78,
      (this.height-160)/this.height));
    const needed=Math.max(height*1.09/usableFraction,
      width*1.09/aspect);
    this.view.mode='top';
    this.view.pitch=Math.PI/2;this.view.yaw=0;
    this.view.focus={x:(bounds.minX+bounds.maxX)/2,
      y:(bounds.minY+bounds.maxY)/2};
    this.view.zoom=THREE.MathUtils.clamp(baseSpan/Math.max(1,needed),
      .2,this.maxZoom);
    this.updateCamera(1);
  }
  /** A reset is a predictable full-board fit, independent of unit selection. */
  resetCamera(){
    this.cancelFocusGlide();
    const bounds=this.displayedBounds;
    this.view.focus={x:(bounds.minX+bounds.maxX)/2,
      y:(bounds.minY+bounds.maxY)/2};this.view.yaw=Math.PI/4;
    this.view.zoom=this.displayedSite?1.48:1.25;
    this.view.pitch=this.view.mode==='top'?Math.PI/2:55*Math.PI/180;
    this.updateCamera(1);
  }
  /**
   * Drag world beneath a finger rather than guessing using camera-right/up
   * vectors. Works at any pitch/yaw including near-vertical overhead.
   */
  panBetween(prevX:number,prevY:number,nextX:number,nextY:number){
    this.cancelFocusGlide();
    this.updateCamera(0);
    const original=this.screenToWorld(prevX,prevY);
    const destination=this.screenToWorld(nextX,nextY);
    if(!original||!destination)return;
    this.shiftFocus(original.x-destination.x,original.y-destination.y);
  }
  pan(dx:number,dy:number){
    this.panBetween(this.width/2,this.height/2,
      this.width/2+dx,this.height/2+dy);
  }
  private shiftFocus(dx:number,dy:number){
    const marginX=140,marginY=150;
    this.view.focus.x=THREE.MathUtils.clamp(
      this.view.focus.x+dx,this.displayedBounds.minX-marginX,
      this.displayedBounds.maxX+marginX);
    this.view.focus.y=THREE.MathUtils.clamp(
      this.view.focus.y+dy,this.displayedBounds.minY-marginY,
      this.displayedBounds.maxY+marginY);
    this.updateCamera(0);
  }
  /**
   * Pinch/wheel zoom preserves the world point beneath the gesture centroid.
   * Does not recenter to a soldier or jump to the center of the map.
   */
  zoomAt(factor:number,x:number,y:number){
    if(!Number.isFinite(factor)||factor<=0)return;
    this.cancelFocusGlide();
    this.updateCamera(0);
    const before=this.screenToWorld(x,y);
    this.view.zoom=THREE.MathUtils.clamp(this.view.zoom*factor,
      this.minZoom,this.maxZoom);
    this.updateCamera(0);
    if(before){
      const after=this.screenToWorld(x,y);
      if(after)this.shiftFocus(before.x-after.x,before.y-after.y);
    }
  }
  /** The same world-size basis used by the ortho camera, for accurate
   * close-up framing independent of map size and mobile aspect ratio. */
  replayCameraBaseSpan():number{
    const b=this.displayedBounds;
    const diagonal=Math.hypot(b.maxX-b.minX,b.maxY-b.minY);
    return Math.max(820,(diagonal+66)/(this.width/Math.max(1,this.height)));
  }
  updateCamera(dt:number){
    if(this.cameraFocusGlide&&dt>0){
      const next=stepCameraFocusGlide(
        this.view.focus,this.cameraFocusGlide.target,
        this.cameraFocusGlide.velocity,dt);
      this.view.focus=next.point;
      if(next.finished)this.cancelFocusGlide();
      else this.cameraFocusGlide.velocity=next.velocity;
    }
    const targetElev=this.view.pitch;
    const blend=1-Math.exp(-Math.max(0,dt)*13);
    this.currentElev=THREE.MathUtils.lerp(this.currentElev,targetElev,blend);
    if(Math.abs(this.currentElev-targetElev)<.0001)
      this.currentElev=targetElev;
    this.target.set(this.view.focus.x,0,this.view.focus.y);
    const angle=this.view.yaw;
    const radius=1200;
    this.camera.position.set(
      this.target.x+radius*Math.cos(this.currentElev)*Math.sin(angle),
      this.target.y+radius*Math.sin(this.currentElev),
      this.target.z+radius*Math.cos(this.currentElev)*Math.cos(angle));
    this.camera.up.set(-Math.sin(angle),0,-Math.cos(angle));
    this.camera.lookAt(this.target);
    if(this.physicalDirectorActive){
      const anchor=this.replayDirectorCameraAnchor!;
      // Default orthographic camera lives in the occupied room footprint
      // and looks down over shoulders. Unlike the previous perspective
      // pass it isn't planted at face height beside one operator's back.
      this.directorOrthoCamera.position.set(anchor.x,53,anchor.y);
      this.directorOrthoCamera.up.set(0,1,0);
      this.directorOrthoCamera.lookAt(
        this.view.focus.x,17,this.view.focus.y);
      const aspect=this.width/this.height;
      const span=this.replayCameraBaseSpan()/Math.max(.65,this.view.zoom);
      // Recomputing a projection matrix at 60Hz is wasted work while the
      // framing is static; the pose still updates each camera tick.
      const left=-span*aspect/2,right=span*aspect/2;
      const top=span/2,bottom=-span/2;
      if(this.directorOrthoCamera.left!==left||
         this.directorOrthoCamera.right!==right||
         this.directorOrthoCamera.top!==top||
         this.directorOrthoCamera.bottom!==bottom){
        this.directorOrthoCamera.left=left;
        this.directorOrthoCamera.right=right;
        this.directorOrthoCamera.top=top;
        this.directorOrthoCamera.bottom=bottom;
        this.directorOrthoCamera.updateProjectionMatrix();
      }
      this.directorOrthoCamera.updateMatrixWorld(true);
      // Optional wide-perspective audition uses the SAME legal room and
      // shot timeline, but a more elevated, wider lens for group coverage.
      this.directorCamera.position.set(anchor.x,44,anchor.y);
      this.directorCamera.up.set(0,1,0);
      this.directorCamera.lookAt(
        this.view.focus.x,18,this.view.focus.y);
      if(this.directorCamera.aspect!==aspect||
         this.directorCamera.fov!==this.replayDirectorLensFov){
        this.directorCamera.aspect=aspect;
        this.directorCamera.fov=this.replayDirectorLensFov;
        this.directorCamera.updateProjectionMatrix();
      }
      this.directorCamera.updateMatrixWorld(true);
    }
    const aspect=this.width/this.height;
    const bounds=this.displayedBounds;
    const diagonal=Math.hypot(bounds.maxX-bounds.minX,
      bounds.maxY-bounds.minY);
    // A yaw-invariant fit avoids breathing/scale changes while orbiting.
    const baseSpan=Math.max(820,(diagonal+66)/aspect);
    const span=baseSpan/this.view.zoom;
    const left=-span*aspect/2,right=span*aspect/2;
    const top=span/2,bottom=-span/2;
    if(this.camera.left!==left||this.camera.right!==right||
       this.camera.top!==top||this.camera.bottom!==bottom){
      this.camera.left=left;this.camera.right=right;
      this.camera.top=top;this.camera.bottom=bottom;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld(true);
    if(this.photoPerspective){
      const fov=72,distance=(span*.5)/Math.tan(fov*Math.PI/360);
      this.photoCamera.position.copy(this.camera.position).sub(this.target)
        .normalize().multiplyScalar(distance).add(this.target);
      this.photoCamera.up.copy(this.camera.up);
      this.photoCamera.lookAt(this.target);
      if(this.photoCamera.aspect!==aspect||this.photoCamera.fov!==fov){
        this.photoCamera.aspect=aspect;this.photoCamera.fov=fov;
        this.photoCamera.updateProjectionMatrix();
      }
      this.photoCamera.updateMatrixWorld(true);
    }
    // Camera debug attributes are only needed when input state changes.
    // Keep numerical snapshots so static frames allocate no signature array.
    const previous=this.lastCameraStatus;
    const anchorX=this.replayDirectorCameraAnchor?.x??null;
    const anchorY=this.replayDirectorCameraAnchor?.y??null;
    if(!previous||previous.mode!==this.view.mode||
       previous.zoom!==this.view.zoom||previous.yaw!==this.view.yaw||
       previous.pitch!==this.view.pitch||
       previous.focusX!==this.view.focus.x||
       previous.focusY!==this.view.focus.y||
       previous.lens!==this.replayDirectorLens||
       previous.anchorX!==anchorX||previous.anchorY!==anchorY){
      this.lastCameraStatus={
        mode:this.view.mode,zoom:this.view.zoom,yaw:this.view.yaw,
        pitch:this.view.pitch,focusX:this.view.focus.x,
        focusY:this.view.focus.y,lens:this.replayDirectorLens,
        anchorX,anchorY
      };
      this.canvas.dataset.cameraMode=this.view.mode;
      this.canvas.dataset.cameraZoom=this.view.zoom.toFixed(3);
      this.canvas.dataset.cameraYaw=this.view.yaw.toFixed(3);
      this.canvas.dataset.cameraPitch=this.view.pitch.toFixed(3);
      this.canvas.dataset.cameraFocusX=this.view.focus.x.toFixed(2);
      this.canvas.dataset.cameraFocusY=this.view.focus.y.toFixed(2);
      this.canvas.dataset.replayDirectorLens=this.physicalDirectorActive?
        this.replayDirectorLens:'none';
      this.canvas.dataset.replayDirectorAnchorX=
        this.replayDirectorCameraAnchor?.x.toFixed(2)??'';
      this.canvas.dataset.replayDirectorAnchorY=
        this.replayDirectorCameraAnchor?.y.toFixed(2)??'';
    }
  }
  screenToWorld(sx:number,sy:number):Pt|null{
    if(this.view.mode==='plan2d')return null;
    this.screenNdc.set(sx/this.width*2-1,1-sy/this.height*2);
    this.ray.setFromCamera(this.screenNdc,this.projectionCamera);
    const point=this.screenIntersection;
    if(!this.ray.ray.intersectPlane(this.pickPlane,point))return null;
    if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return null;
    // The caller receives its own point, never a mutable scratch reference.
    return {x:point.x,y:point.z};
  }
  /** A screen-space LOOK/WATCH target is a direction through the tapped
   * pixel, not necessarily a ground point. A tap on a raised miniature,
   * door leaf or counter should not jump across the map when projected to
   * ground. No object picking or hidden-actor knowledge is involved. */
  screenToWorldAtHeight(sx:number,sy:number,height:number):Pt|null{
    if(this.view.mode==='plan2d'||!Number.isFinite(height))return null;
    this.screenNdc.set(sx/this.width*2-1,1-sy/this.height*2);
    this.ray.setFromCamera(this.screenNdc,this.projectionCamera);
    this.aimPlane.constant=-height;
    const point=this.screenIntersection;
    if(!this.ray.ray.intersectPlane(this.aimPlane,point))return null;
    if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return null;
    return {x:point.x,y:point.z};
  }
  project(p:Pt,y=4):Pt{
    const world=this.screenProjection.set(p.x,y,p.y)
      .project(this.projectionCamera);
    return {x:(world.x+1)*this.width/2,
      y:(1-world.y)*this.height/2};
  }
  /** A terminal mission may reuse the already-built friendly visual meshes.
   * Clone the scene graph (sharing geometry/materials, never reparenting live
   * models), take one deterministic low-ready sample, and restore the live rig
   * immediately so replay and the next mission retain sole pose ownership.
   * Called only for an active 3D mission's first debrief render.
   */
  captureAfterActionSquad(identities:readonly ReplayActorIdentity[]):Map<string,THREE.Group>{
    const copies=new Map<string,THREE.Group>();
    for(const actor of identities){
      if(actor.side!=='blue')continue;
      const live=this.actors.get(actor.id);
      if(!live||live.side!=='blue'||!live.physical.lastPose)continue;
      const previous={...live.physical.lastPose};
      const flashVisible=live.flash.visible;
      try{
        poseOperator(live.physical,{
          ...previous,
          x:0,z:0,heading:-Math.PI/2,travelYaw:-Math.PI/2,
          pelvisYaw:undefined,shotHeading:-Math.PI/2,
          velocity:0,stride:0,posture:'stand',injury:0,
          weapon:actor.weapon,weaponConfiguration:actor.weaponConfiguration,
          equipment:actor.equipment,wardrobe:actor.wardrobe,
          appearanceSeed:actor.appearanceSeed,
          down:false,surrender:false,worldWeaponReleased:false,
          aiming:false,firing:false,aimBlend:0,recoil:0,
          reload:0,lastDoorAt:-100,lastThrowAt:-100,
          equipmentInteraction:null,treatmentActive:false,
          physicalContact:null,doorGrip:null,secondarySwitch:undefined,
          handlingTransition:undefined,handlingOverride:'low',
          deterministic:true,poseDiagnostics:false
        },0);
        live.flash.visible=false;
        const copy=live.physical.root.clone(true);
        copy.visible=true;
        copy.position.set(0,0,0);
        copies.set(actor.id,copy);
      }catch(error){
        console.warn('[After Action 3D] Live pose snapshot unavailable',actor.id,error);
      }finally{
        live.flash.visible=flashVisible;
        try{poseOperator(live.physical,{...previous,deterministic:true},0);}
        catch(error){console.warn('[After Action 3D] Live pose restore failed',actor.id,error);}
      }
    }
    return copies;
  }
  /** Stage initial visible operator geometry separately from the first
   * tactical WebGL frame. Existing soldier models are reused without reset. */
  prepareOperatorModel(a:TeamActor):boolean{
    if(this.actors.has(a.id))return false;
    this.soldier(a);
    return true;
  }
  private soldier(a:TeamActor){
    // Saved operator kit pouch/mag placement is ready before first combat.
    prewarmSavedOperatorCarry(a);
    const physical=createOperatorRig(a.id,a.side,true);
    // Bake saved colors, field-gear geometry selection, shadow receivers,
    // and reusable texture atlases at rig preparation, not first contact.
    // Studio previews remain fully editable and animated bones unmerged.
    const precomputed=bakedOperatorCarry(a);
    updateOperatorAppearance(physical,{
      appearanceSeed:a.appearanceSeed,equipment:a.equipment,
      wardrobe:a.wardrobe,weaponConfiguration:a.weaponConfiguration,
      magazineCarryLocations:precomputed.locations,
      medicalCarryLocation:precomputed.medical,
      utilityCarryLocation:precomputed.utility,
      flashCharges:a.flashCharges,wedgeRemaining:a.wedgeRemaining,
      restraintRemaining:a.restraintRemaining,treatmentActive:a.treatmentActive,
      down:a.health<=0,surrender:a.surrendered
    });
    // Purely opt-in CPU phase marks inside poseOperator; no normal-play
    // instrumentation or changes to rig construction/animation decisions.
    if(this.profileSceneUpdate)
     physical.root.userData.fieldworkProfilePose=true;
    const {root,weapon,pack}=physical;
    if(this.graphicLookEnabled)
     weapon.userData.fieldworkWeaponPresentation=true;
    const flash=new THREE.Mesh(this.muzzleFlashGeometry,this.muzzleFlashMaterial);
    // Flash belongs to the firearm, not an independent actor-root guess.
    flash.position.set(19.5,0,0);flash.visible=false;weapon.add(flash);
    // One fixed-size buffer per soldier. Only filled when muzzle/door state moves.
    const beamPositions=new Float32Array((LIGHT_BEAM_SAMPLES-1)*9);
    const beamGeometry=new THREE.BufferGeometry();
    beamGeometry.setAttribute('position',
      new THREE.BufferAttribute(beamPositions,3).setUsage(THREE.DynamicDrawUsage));
    const beam=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({
      color:0xbde9d5,transparent:true,opacity:.15,depthWrite:false,
      side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    beam.userData.fieldworkRenderCategory='operator-effects';
    beam.frustumCulled=false;beam.visible=false;beam.renderOrder=4;
    this.scene.add(beam);
    const status=new THREE.Mesh(new THREE.RingGeometry(12,16,30),
      new THREE.MeshBasicMaterial({color:0xdb8d76,transparent:true,
        opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
    status.userData.fieldworkRenderCategory='operator-effects';
    root.userData.fieldworkRenderCategory='operator';
    status.rotation.x=-Math.PI/2;status.visible=false;
    this.scene.add(root,status);
    // Subtle cheap foot-contact shadows complement the real shadow map on
    // small mobile screens, where the filtered shadow can otherwise vanish.
    const contactShadows=this.contactShadowBatch.register(a.id);
    this.actors.set(a.id,{side:a.side,root,flash,pack,weapon,status,
      beam,beamLast:null,physical,contactShadows});
  }
  /** Draw exactly the prepared scene without re-running poses, fog or AI. */
  drawPreparedColdFrame():boolean{
    const prepared=this.preparedColdFrame;
    if(!prepared)return false;
    this.preparedColdFrame=null;
    try{
      if(this.liveMainPassProfiler)this.liveMainPassProfiler.capture(()=>
       this.liveShadowSubmitProfiler!.capture(()=>this.renderMiniatureFocus(prepared.camera)));
      else if(this.liveShadowSubmitProfiler)this.liveShadowSubmitProfiler.capture(
       ()=>this.renderMiniatureFocus(prepared.camera));
      else this.renderMiniatureFocus(prepared.camera);
     }
    finally{
      // Mirrors the ordinary default tactical first-draw bookkeeping.
      this.bodycamLastQa={active:false,owner:null,masked:0,
        maskRestored:true,frame:++this.renderFrameSerial,at:prepared.at};
    }
    this.markScenePhase('gpuSubmit');
    return true;
  }
  update(s:Session,selected:string,dt:number,
    focusedDoorId:string|null=null,omniscient=false,
    replay?:ReplayPresentation|null,
    renderFrame?:RenderFrame|null,
    liveMotion?:ReplayPresentation|null,
    replayDisclosurePolicy:ReplayDisclosure|null=null,
    replayDoorHistory:ReplayDoorKnowledgeHistory|null=null,
    personalGroundEvidence:ReadonlySet<string>|null=null,
    replayWindowHistory:ReplayWindowKnowledgeHistory|null=null,
    deferFirstDraw=false){
    this.preparedColdFrame=null;
    if(this.view.mode==='plan2d')return;
    if(this.profileSceneUpdate){
      this.scenePhaseStart=performance.now();
      for(const key of Object.keys(this.scenePhases) as StagePhaseName[])
       this.scenePhases[key]=0;
      this.actorPhaseCosts.rigMs=0;
      this.actorPhaseCosts.rigBuilds=0;
      this.actorPhaseCosts.poseMs=0;
      this.actorPhaseCosts.posePrepMs=0;
      this.actorPhaseCosts.allyContextMs=0;
      this.actorPhaseCosts.allyPeerVisits=0;
      this.actorPhaseCosts.poseCount=0;
      this.actorPhaseCosts.appearanceMs=0;
      this.actorPhaseCosts.weaponBuildMs=0;
      this.actorPhaseCosts.otherPoseMs=0;
      this.actorPhaseCosts.visualKitMs=0;
      this.actorPhaseCosts.receiverAtlasMs=0;
      this.actorPhaseCosts.appearanceFingerprintMs=0;
      this.actorPhaseCosts.appearanceInvalidations=0;
      this.fogComposeMs=0;
    }
    // Never memoize reconstructed current sight during historical replay.
    this.presentationSight.begin(s,allowPresentationSightReuse(
      this.presentationSightPolicy,s.phase,
      !!replay||!!replayDisclosurePolicy||!!replayDoorHistory||
      !!replayWindowHistory||this.physicalDirectorActive||
      !!this.replayBodycam),this.v19FrameSight&&this.presentationSightPolicy!=='legacy'&&
      !replay&&!replayDisclosurePolicy&&!replayDoorHistory&&!replayWindowHistory&&
      !this.physicalDirectorActive&&!this.replayBodycam);
    if(this.miniFocusMode!=='off'){
      this.miniFocusSession=s;
      this.miniFocusDoorId=focusedDoorId;
      this.miniFocusSelectedId=selected;
    }
    // Personal disclosure is observer-scoped, never camera-mount-scoped.
    const personalDisclosure=replayDisclosurePolicy?.mode==='operator';
    this.transientLights?.begin();
    let beamDoorSignature:string|null=null;
    const bodycamAudition=!!this.replayBodycam&&(
      replayDisclosurePolicy?.mode==='operator'&&
      replayDisclosurePolicy.observerId===this.replayBodycam.actorId||
      this.photoLiveBodycam&&!replayDisclosurePolicy&&
      this.replayBodycam.actorId===selected);
    if(this.appliedLightingMode!==s.lightingMode){
      const mood=lightingPresentation(s.lightingMode);
      this.hemisphere.intensity=this.graphicLookEnabled?
       mood.hemisphere*(STUDIO_INSPECTION_LIGHT.hemiIntensity/1.18):
       mood.hemisphere;
      this.sun.intensity=mood.sun;
      if(this.graphicLookEnabled)
       this.graphicFill.intensity=STUDIO_INSPECTION_LIGHT.fillIntensity*
        G.plumFillBoost*(mood.sun/2.35);
      this.appliedLightingMode=s.lightingMode;
    }
    this.fixtureLights.update(s,omniscient,personalDisclosure,
      personalGroundEvidence);
    for(const [index,group] of this.coverGroups){
      const before=s.site?.cover[index],current=s.coverState[index];
      if(!before||!current)continue;
      const last=this.coverFrameValues.get(index);
      // Live pushes, damage and replay may replace cover objects without
      // changing their array identity. Compare the actual visual inputs,
      // not just objectRevision or a session pointer.
      if(last&&last.x===current.x&&last.y===current.y&&
         last.w===current.w&&last.h===current.h&&
         last.destroyed===!!current.destroyed&&
         last.toppled===!!current.toppled)continue;
      const transform=fixtureFrameTransform(before,current);
      const collapsed=!!current.destroyed;
      const visuals=this.coverVisualStates.get(index);
      if(visuals){
        visuals.intact.visible=!collapsed;
        visuals.debris.visible=collapsed;
      }
      // The collider can shrink, but the intact mesh must never be rendered
      // at miniature scale. Debris geometry was authored to that footprint.
      group.scale.set(collapsed?1:transform.scaleX,
        collapsed?1:transform.scaleY,collapsed?1:transform.scaleZ);
      group.position.set(transform.x,
        collapsed?0:current.toppled?Math.min(10,current.h*.4):0,transform.y);
      // Tipped furniture remains physical. Ruins do not inherit a standing
      // object's 90-degree tilt when a replay scrubs across its destruction.
      group.rotation.x=!collapsed&&current.toppled?Math.PI*.48:0;
      this.coverFrameValues.set(index,{
        x:current.x,y:current.y,w:current.w,h:current.h,
        destroyed:!!current.destroyed,toppled:!!current.toppled
      });
      // Instanced repeated furniture follows the same physical transform.
      this.repeatedFixtures.sync(index,true);
    }
    // Evidence meshes are visual only; current-session discovery gates
    // visibility. Historical replay never borrows live future pickups.
    this.syncOptionalEvidenceMeshes(s,!!replay||!!replayDisclosurePolicy);
    // Personal replay (including non-bodycam operator views) reads only
    // historically observed panes. The global replay reads its exact frame.
    // Scrubbing cannot inherit future breakage from a previous seek.
    const personalWindows=replayDisclosurePolicy?.mode==='operator';
    if(!this.windowShards){
      const shardMaterial=new THREE.MeshStandardMaterial({
        color:0xffffff,emissive:0x343b39,emissiveIntensity:.35,
        roughness:.48,metalness:.04,flatShading:true,depthWrite:true,alphaHash:true,side:THREE.DoubleSide});
      // One pooled draw remains: glass gets a subtle coverage reduction,
      // opaque wood/stone/metal keep alpha=1. Alpha hash preserves depth
      // and avoids incorrectly sorting a transparent instanced batch.
      shardMaterial.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader
          .replace('#include <common>','#include <common>\nattribute float instanceShardOpacity;\nvarying float vShardOpacity;')
          .replace('#include <begin_vertex>','#include <begin_vertex>\nvShardOpacity = instanceShardOpacity;');
        shader.fragmentShader=shader.fragmentShader
          .replace('#include <common>','#include <common>\nvarying float vShardOpacity;')
          .replace('#include <alphahash_fragment>','diffuseColor.a *= vShardOpacity;\n#include <alphahash_fragment>');
      };
      shardMaterial.customProgramCacheKey=()=> 'shard-instance-alpha-v1';
      // Broad, thin asymmetric polygon: unmistakable fragments, not tiny pebbles.
      const shardShape=new THREE.Shape();
      shardShape.moveTo(-1.45,-1.2);shardShape.lineTo(.15,-2.05);
      shardShape.lineTo(1.35,.25);shardShape.lineTo(.75,1.8);shardShape.lineTo(-1.25,.6);shardShape.closePath();
      const shardGeometry=new THREE.ExtrudeGeometry(shardShape,{depth:.34,bevelEnabled:false});
      shardGeometry.rotateX(Math.PI/2);shardGeometry.center();
      shardGeometry.setAttribute('instanceShardOpacity',this.shardOpacity);
      this.mats.push(shardMaterial);
      this.windowShards=new THREE.InstancedMesh(
        shardGeometry,shardMaterial,WINDOW_SHARD_CAPACITY);
      this.windowShards.count=0;
      this.windowShards.frustumCulled=false;
      this.windowShards.castShadow=false;
      this.windowShards.receiveShadow=false;
      this.windowShards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.effects.add(this.windowShards);
    }
    let shardCount=0,shardWrites=0,colorWrites=0,opacityWrites=0;
    const shardMesh=this.windowShards;
    const debrisWorld=sessionWorldGeometry(s);
    const submit=(part:SettledWindowShardPose|import('./rendering/window-shatter-presentation.ts').WindowShardPose,color:number,heightScale=1,glass=true)=>{
      if(shardCount>=WINDOW_SHARD_CAPACITY)return;
      const alpha=glass?Math.fround(.85):1;
      if(this.shardOpacity.getX(shardCount)!==alpha){
        this.shardOpacity.setX(shardCount,alpha);opacityWrites++;
      }
      if(this.shardSlots.changed(shardCount,part,heightScale)){
        this.shardMatrix.position.set(part.x,part.y,part.z);
        this.shardMatrix.rotation.set(part.rx,part.ry,part.rz);
        this.shardMatrix.scale.set(part.scale,part.scale*heightScale,part.scale);
        this.shardMatrix.updateMatrix();shardMesh.setMatrixAt(shardCount,this.shardMatrix.matrix);shardWrites++;
      }
      if(this.shardColors[shardCount]!==color){
        this.shardColors[shardCount]=color;shardMesh.setColorAt(shardCount,this.shardTint.setHex(color));colorWrites++;
      }
      shardCount++;
    };
    this.settledPanes.length=0;this.fractureSources.beginFrame();
    // Larger generated sites have many panes. An ephemeral index avoids
    // scanning the entire window list once per rendered pane.
    const indexWindows=this.windowGlass.size>8&&s.windows.length>8;
    this.frameWindowsById.clear();
    if(indexWindows)for(const pane of s.windows)
      this.frameWindowsById.set(pane.id,pane);
    for(const [id,glass] of this.windowGlass){
      const current=indexWindows?this.frameWindowsById.get(id):
        s.windows.find(w=>w.id===id);
      const seen=personalWindows&&replayDisclosurePolicy?.observerId?
        replayWindowHistory?.at(s.seconds,replayDisclosurePolicy.observerId,id):
        null;
      const broken=personalWindows?!!seen?.shattered:!!current?.shattered;
      const opened=personalWindows?!!seen?.open:!!current?.open;
      glass.visible=!(broken||opened);
      // Time-stamped shards work in GO, paused playback and reverse scrubs.
      // In personal replay, unseen breakage never produces visible debris.
      if(!broken||!current||current.shatteredAt===undefined)continue;
      if(this.glassDebrisPreview&&!personalWindows&&
        (omniscient||this.presentationSight.query(s,'effect','glass:'+id,{x:current.x,y:current.y})))
        this.settledPanes.push(current);
      for(let i=0;i<WINDOW_SHARDS_PER_PANE&&shardCount<WINDOW_SHARD_CAPACITY;i++){
        const part=this.settledShardScratch;
        if(!windowShardPoseInto(current,s.seconds,i,part)||
          !debrisPoseContained(debrisWorld,current,part))continue;
        if(this.glassDebrisPreview&&(!personalWindows&&!omniscient&&
          !this.presentationSight.query(s,'effect','glass:'+id+':burst:'+i,{x:part.x,y:part.z})))continue;
        submit(part,0xd9f4ef);
      }
    }
    // Door/fixture debris uses captured world origins, not the current leaf
    // or furniture position. No personal replay inference from future state.
    if(this.glassDebrisPreview&&!personalWindows){
      for(const door of s.doors){
        if(!door.glassShattered||door.glassBreakX===undefined)continue;
        const source=doorDebrisSource(door,this.fractureSources.next());
        if(source&&(omniscient||this.presentationSight.query(s,'effect','fracture:'+source.id,{x:source.x,y:source.y})))this.fractureSources.accept(source);
      }
      for(let i=0;i<s.coverState.length;i++){
        const cover=s.coverState[i];if(!cover.destroyed||cover.destroyedAt===undefined)continue;
        const source=coverDebrisSource(cover,i,this.fractureSources.next());
        if(source&&(omniscient||this.presentationSight.query(s,'effect','fracture:'+source.id,{x:source.x,y:source.y})))this.fractureSources.accept(source);
      }
      const part=this.settledShardScratch;
      for(const source of this.fractureSources.active){
        for(let i=0;i<WINDOW_SHARDS_PER_PANE&&shardCount<WINDOW_SHARD_CAPACITY;i++){
          if(!fractureDebrisPose(source,s.seconds,i,false,part)||
            !debrisPoseContained(debrisWorld,source,part,part.heightScale))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','fracture:'+source.id+':burst:'+i,{x:part.x,y:part.z}))continue;
          submit(part,source.color,part.heightScale,source.kind==='glass');
        }
        if(shardCount>=WINDOW_SHARD_CAPACITY)break;
      }
    }
    // Prioritize all current bursts; resting shards consume only spare slots.
    if(this.glassDebrisPreview&&!personalWindows&&shardCount<WINDOW_SHARD_CAPACITY){
      const part=this.settledShardScratch;
      for(const pane of this.settledPanes){
        for(let i=0;i<WINDOW_SETTLED_SHARDS_PER_PANE&&shardCount<WINDOW_SHARD_CAPACITY;i++){
          if(!settledWindowShardPose(pane,s.seconds,i,part)||
            !debrisPoseContained(debrisWorld,pane,part,part.heightScale))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','glass:'+pane.id+':settled:'+i,{x:part.x,y:part.z}))continue;
          submit(part,0xd9f4ef,part.heightScale);
        }
        if(shardCount>=WINDOW_SHARD_CAPACITY)break;
      }
    }
    if(this.glassDebrisPreview&&!personalWindows&&shardCount<WINDOW_SHARD_CAPACITY){
      const part=this.settledShardScratch;
      for(const source of this.fractureSources.active){
        for(let i=0;i<WINDOW_SETTLED_SHARDS_PER_PANE&&shardCount<WINDOW_SHARD_CAPACITY;i++){
          if(!fractureDebrisPose(source,s.seconds,i,true,part)||
            !debrisPoseContained(debrisWorld,source,part,part.heightScale))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','fracture:'+source.id+':settled:'+i,{x:part.x,y:part.z}))continue;
          submit(part,source.color,part.heightScale,source.kind==='glass');
        }
        if(shardCount>=WINDOW_SHARD_CAPACITY)break;
      }
    }
    if(opacityWrites)this.shardOpacity.needsUpdate=true;
    if(colorWrites&&this.windowShards.instanceColor)this.windowShards.instanceColor.needsUpdate=true;
    if(this.windowShards.count!==shardCount){
      this.windowShards.count=shardCount;
    }
    if(shardWrites)this.windowShards.instanceMatrix.needsUpdate=true;
    this.markScenePhase('environment');
    this.updateCamera(dt);
    this.markScenePhase('camera');
    // Gameplay may stop on the exact downing tick. Finish visual collapse
    // independently, without advancing combat or modifying the replay film.
    const terminal=s.phase==='won'||s.phase==='lost';
    if(!terminal||this.terminalSessionStamp!==s.seconds){
      this.terminalPoseSeconds=0;this.terminalSessionStamp=s.seconds;
    }else this.terminalPoseSeconds=Math.min(1.0,
      this.terminalPoseSeconds+Math.max(0,dt));
    const poseSeconds=s.seconds+(terminal?this.terminalPoseSeconds:0)-
      (renderFrame&&!terminal?(1-renderFrame.alpha)/60:0);
    if(this.idleLifeSession!==s){
      this.idleLifeSession=s;this.idleLifeSeconds=poseSeconds;
    }
    if(s.phase==='planning'&&!replay)
      this.idleLifeSeconds+=Math.max(0,dt);
    else this.idleLifeSeconds=poseSeconds;
    // Unlike the tactical clock, this render-only value moves while paused.
    // Replay seeks always use the recorded timeline for deterministic results.
    const actorIdleSeconds=s.phase==='planning'&&!replay?
      this.idleLifeSeconds:poseSeconds;
    if(this.bushPreview)this.bushPreview.clock.value=actorIdleSeconds;
    if(this.grassPreview){
      this.grassPreview.clock.value=actorIdleSeconds;
      this.grassPreview.group.visible=replayDisclosurePolicy?.mode!=='operator'&&
        (omniscient||s.intel.mode==='exterior-known');
    }
    // The shadow map follows the active encounter to retain contact detail.
    // Share the frame's blue squad snapshot across shadow and Director views.
    // team(s) filters operators; repeated calls allocate arrays each frame.
    const squad=team(s);
    const selectedActor=squad.find(a=>a.id===selected);
    const shadowPoint=selectedActor?.p??this.view.focus;
    this.sun.position.set(shadowPoint.x-145,250,shadowPoint.y+175);
    this.sun.target.position.set(shadowPoint.x,0,shadowPoint.y);
    this.sun.target.updateMatrixWorld();
    // Hide undiscovered geometry at object level, including its shadows.
    // An operator physically standing in a room can still read that room's
    // structure even when their viewing cone is pointed at one corner.
    const occupiedRoomIds=occupiedFogRooms(s,this.occupiedRoofRoomIds);
    // An in-room Director keeps structural walls solid but removes
    // ceiling slabs, as in the readable tabletop game. No camera needs
    // to hover outside the building to see a room.
    const physicalDirector=this.physicalDirectorActive&&!bodycamAudition;
    if(this.roofMaterial){
      const opaque=bodycamAudition;
      if(this.roofMaterial.transparent===opaque){
        this.roofMaterial.transparent=!opaque;
        this.roofMaterial.depthWrite=opaque;
        this.roofMaterial.needsUpdate=true;
      }
      this.roofMaterial.opacity=opaque?1:.21;
    }
    for(const [id,roof] of this.roofGroups){
      const known=spatialSurfaceKnown(s,'room',id,omniscient);
      roof.visible=physicalDirector?false:
        bodycamAudition?known:
        roofShouldShow(omniscient,known,occupiedRoomIds.has(id));
    }
    for(const item of this.intelSurfaces){
      const squadKnown=spatialSurfaceKnown(s,item.kind,
        item.index,omniscient);
      // Physically blocking structural WALLS never disappear in a POV.
      // Only decorative/cover meshes use recorded personal ground memory.
      // This is not omniscient actor knowledge: these are actual opaque
      // walls physically surrounding the in-room camera. Leaving them
      // missing would make even a perspective shot see through the map.
      const cover=s.coverState[item.index];
      // The window opening is a physical public facade even if the
      // nearest full-wall segment is too far away to serve as its intel ID.
      const knownFacade=item.kind==='wall'&&
        item.obj.userData.fogFacade===true&&
        s.intel.mode==='exterior-known';
      const exteriorSetDressing=!personalDisclosure&&physicalDirector&&item.kind==='cover'&&
        s.intel.mode==='exterior-known'&&!!cover&&
        exteriorBriefedAt(s.site??undefined,{x:cover.x,y:cover.y});
      // The Director can frame already-briefed outdoor objects without
      // making them pop into existence mid-shot. Live tactical discovery,
      // personal bodycam evidence and all interior cover remain unchanged.
      item.obj.visible=item.kind==='wall'&&physicalDirector?true:
        knownFacade||exteriorSetDressing?true:
        item.kind==='cover'?
          personalCoverVisible(squadKnown,personalDisclosure,personalGroundEvidence,
            cover??null):squadKnown;
      if(item.kind==='cover')this.repeatedFixtures.sync(item.index);
    }
    // Unlike the room's floor, decorative props must be individually
    // seen (or remembered at their own position) before they are rendered.
    for(let i=0;i<this.architecturalOpenings.length;i++){
      const opening=this.architecturalOpenings[i];
      opening.obj.visible=presentArchitecturalOpening(s,opening.opening,
        omniscient,replayDisclosurePolicy,personalGroundEvidence,
        p=>this.presentationSight.query(s,'opening',i,p));
    }
    for(let i=0;i<this.observedDetails.length;i++){
      const detail=this.observedDetails[i];
      // Exact site-stable points; same visibility rule, fewer repeated rays.
      const previousVisibility=detail.obj.visible;
      detail.obj.visible=presentDecor(s,detail,omniscient,
        personalDisclosure,personalGroundEvidence,
        p=>this.presentationSight.query(s,'decor',i,p));
      if(detail.obj.visible!==previousVisibility)
       this.staticBatches.setVisible(detail.obj,detail.obj.visible);
    }
    // Director cuts walls around its actual historical friendly focal group,
    // rather than a potentially unrelated manually selected soldier.
    const fromCamera=this.projectionCamera.position.clone().sub(this.target);
    const pawn=this.replayDirectorFocus??
      (selectedActor&&selectedActor.health>0?selectedActor.p:undefined);
    const subjects=physicalDirector&&this.replayDirectorLens==='ortho'?
      squad.map(a=>a.p):this.replayDirectorSubjects.length?
      this.replayDirectorSubjects:pawn?[pawn]:[];
    const maxCutDistance=Math.max(40,Math.min(150,
      90/Math.tan(Math.max(.38,this.view.pitch))));
    // One camera/knowledge resolution per authoritative segment. The
    // disclosure parent still controls visibility independently of fading.
    const cameraDirection={x:fromCamera.x,y:fromCamera.z};
    const allowCut=!bodycamAudition&&this.view.mode==='iso'&&
      (!physicalDirector||this.replayDirectorLens==='ortho');
    for(const owner of this.wallOwners){
      const cut=allowCut&&subjects.some(subject=>wallOccludesFriendly(
        owner.segment,subject,cameraDirection,maxCutDistance));
      const knownFacade=owner.exterior&&!omniscient&&!bodycamAudition&&
        spatialSurfaceKnown(s,'wall',owner.index);
      const state=resolveWallPresentation(owner.opacity,cut,dt,
        bodycamAudition,physicalDirector,this.replayXrayOn,knownFacade,this.wallDepthOpaque);
      owner.opacity=state.opacity;
      for(const mesh of owner.pieces){
        const material=mesh.material as THREE.MeshStandardMaterial;
        applyWallMaterialState(material,state);
        mesh.userData.fieldworkTransparencyRole=state.role;
        mesh.renderOrder=state.renderOrder;
        const patina=mesh.userData.patinaMaterial as THREE.MeshBasicMaterial|undefined;
        if(patina)patina.opacity=state.patinaOpacity;
      }
    }
    // The selected endpoint is stable across this entire render. Do not
    // rebuild team/plan arrays once per door on large generated sites.
    // Selected endpoint reuses the same actor resolved for shadows.
    const selectedEndpoint=selectedActor?.plan.at(-1)?.p;
    for(const door of s.doors){
      const object=this.doors.get(door.id);
      if(!object)continue;
      object.root.visible=physicalDirector||
        spatialSurfaceKnown(s,'door',door.id,omniscient);
      this.staticBatches.setVisible(object.root,object.root.visible);
      // Resolve remembered/personal door state separately from cutaways.
      const personal=replayDisclosurePolicy?.mode==='operator';
      const observed=personal&&replayDoorHistory?
        replayDoorHistory.at(s.seconds,replayDisclosurePolicy.observerId,door.id):
        null;
      // FULL-view already discloses this door; avoid a redundant LOS ray.
      const directlyObserved=!personal&&(omniscient||this.presentationSight.query(
        s,'door',door.id,doorCenter(door)));
      const visual=resolveDoorPresentation({
        door,personal,observed,omniscient,directlyObserved,
        rememberedOpen:s.intel.doorMemory.get(door.id)??0,
        rememberedGlass:this.observedDoorGlass.get(door.id),
        replayFraction:replay?.doors[door.id],
        previousFraction:renderFrame?.previousDoors?.[door.id],
        renderAlpha:renderFrame?.alpha,
        replaying:!!replay,hasRenderFrame:!!renderFrame
      });
      if(visual.remember){
        this.observedDoorOpen.set(door.id,door.openFraction??(door.open?1:0));
        this.observedDoorGlass.set(door.id,!!door.glassShattered);
        this.observedDoorBroken.set(door.id,!!door.latchBroken);
      }
      // The personal replay observer may only see damage after the first
      // actual sighting; do not leak the live latch state into a past clip.
      const broken=personal?!!observed?.latchBroken:
        (omniscient||directlyObserved)?!!door.latchBroken:
        !!this.observedDoorBroken.get(door.id);
      object.intactHardware.visible=!broken;
      const separation=fallenDoorHardwarePose({
        ...door,
        hardwareDetachedAt:personal?observed?.hardwareDetachedAt:
          door.hardwareDetachedAt
      },s.seconds,Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y));
      object.fallenHardware.visible=broken&&separation.visible;
      if(object.fallenHardware.visible){
        object.fallenHardware.position.set(
          separation.x,separation.y,separation.z);
        object.fallenHardware.rotation.set(
          separation.tilt,separation.roll,.16*separation.tilt);
      }
      if(object.glassPane)object.glassPane.visible=visual.glassVisible;
      object.wedge.visible=visual.wedgeVisible;
      const drawFraction=visual.fraction;
      if(door.kind==='shutter'){
        object.leaf.rotation.y=0;
        object.leaf.position.y=drawFraction*37;
      }else if(door.kind==='sliding'){
        object.leaf.rotation.y=0;
        object.leaf.position.x=drawFraction*
          Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y)*(door.slideDirection??1);
      }else{
        const age=s.seconds-(door.lastKickAt??-100);
        const wobble=!personal&&age>=0&&age<.34?
          Math.sin(age*76)*.045*(1-age/.34):0;
        // A failed kick visibly rattles the leaf in its frame; the hinge
        // yaw remains authoritative for collision, LOS and navigation.
        object.leaf.rotation.y=(door.swing??-1)*drawFraction*1.54+wobble;
      }
      // A solid open leaf is still geometry. In orthographic Director
      // a door between the camera and a friendly fades as a very light
      // architectural ghost while the miniature stays fully opaque.
      // Clone each affected opaque material ONCE so changing one door
      // never fades other doors or the rest of the building.
      const leafCut=physicalDirector&&this.replayDirectorLens==='ortho'&&
        !['glazed','french','screen','mesh-gate'].includes(door.style??'')&&
        subjects.some(p=>wallOccludesFriendly(
          doorLeafSegment({...door,openFraction:drawFraction}),
          p,{x:fromCamera.x,y:fromCamera.z},maxCutDistance));
      object.leaf.userData.impactCut=leafCut;
      if(leafCut||object.leaf.userData.directorCutMaterials){
        object.leaf.userData.directorCutMaterials=true;
        object.leaf.traverse(child=>{
          if(!(child instanceof THREE.Mesh))return;
          const original=child.material;
          if(!(original instanceof THREE.MeshStandardMaterial))return;
          const facade=child.userData.fogFacade===true;
          if(!child.userData.directorCutMat){
            if(!leafCut||(original.transparent&&!facade))return;
            // The cutaway clone belongs to this site's door leaf, not the
            // persistent material palette. Release it on the next map swap.
            const clone=this.siteMaterials.track(original.clone());
            child.material=clone;
            child.userData.directorCutMat=clone;
          }
          const local=child.userData.directorCutMat as THREE.MeshStandardMaterial;
          const needsTransparency=leafCut||facade&&!this.wallDepthOpaque;
          if(local.transparent!==needsTransparency||
             local.depthWrite===leafCut){
            local.transparent=needsTransparency;
            local.depthWrite=!leafCut;
            local.needsUpdate=true;
          }
          local.opacity=leafCut?.12:1;
          child.renderOrder=leafCut?1001:facade&&!this.wallDepthOpaque?1002:0;
        });
      }
      const reachable=selectedActor&&selectedActor.health>0&&
        (doorReachable(selectedActor.p,door)||
          (!!selectedEndpoint&&doorReachable(selectedEndpoint,door)));
      const focused=focusedDoorId===door.id;
      object.halo.visible=!this.photoClean&&!replayDisclosurePolicy&&
        door.kind!=='shutter'&&door.kind!=='sliding'&&
        object.root.visible&&s.phase==='planning'&&
        (!focused||!!reachable)&&
        (directlyObserved||
         knownAt(s,doorCenter(door).x,doorCenter(door).y)||
         doorKnown(s.intel,door.id));
      for(const part of object.halo.children){
        const material=(part as THREE.Mesh).material as
          THREE.LineDashedMaterial|THREE.MeshBasicMaterial;
        if('opacity' in material){
          material.transparent=true;
          material.opacity=focused ? .95 : .27;
        }
      }
      // Ground sweep is visible from the briefing, not only after stacking.
    }
    reconcileSceneActorLifetimes(s,{
      scene:this.scene,actors:this.actors,civilianRigs:this.civilianRigs,
      actorIds:this.frameActorIds,civilianIds:this.frameCivilianIds,
      retireMissingHostile:id=>this.retireHostileActor(id)
    },omniscient,replayDisclosurePolicy);
    if(s.rescue&&!s.civilians.some(c=>c.rescueTarget)){
      if(!this.rescueFigure){
        this.rescueFigure=new THREE.Group();
        this.rescueFigure.userData.fieldworkRenderCategory='civilian';
        const civilian=new THREE.Mesh(new THREE.CapsuleGeometry(4.5,12,4,8),
          new THREE.MeshStandardMaterial({color:0xe0c58d,flatShading:true}));
        civilian.position.y=10;
        const head=new THREE.Mesh(new THREE.SphereGeometry(4.8,8,6),
          new THREE.MeshStandardMaterial({color:0xb99b7b,flatShading:true}));
        head.position.y=23;
        this.rescueFigure.add(civilian,head);
        this.scene.add(this.rescueFigure);
      }
      // Squad-wide rescue markers cannot appear as a witnessed person
      // within an uncompleted first-person history.
      this.rescueFigure.visible=!this.photoClean&&
        presentUnrecordedRescueMarker(s,omniscient,
        replayDisclosurePolicy);
      this.rescueFigure.position.set(s.rescue.p.x,0,s.rescue.p.y);
    }else if(this.rescueFigure)this.rescueFigure.visible=false;
    this.surrenderedFirearms.update(s.droppedFirearms??[],item=>{
      const owner=s.operators.find(a=>a.id===item.ownerId);
      return omniscient||(replayDisclosurePolicy?
        !!owner&&presentActor(s,owner,false,replayDisclosurePolicy):
        liveVisibility(s,item.p));
    });
    this.markScenePhase('disclosure');
    // One history pass per drawn frame, rather than rewalking all retained
    // shots for every friendly, hostile and recently undisclosed rig.
    this.recentMuzzleShots.rebuild(s.shots);
    rebuildFrameIdIndex(this.frameActorsById,s.operators);
    rebuildFrameIdIndex(this.frameDoorsById,s.doors);
    // Four-man missions use the original straight scan, avoiding index
    // overhead. Crowded scenes keep the original exact predicates/order.
    const useAllyBroadphase=s.operators.length>=16;
    if(useAllyBroadphase)this.frameActorNeighborhood.rebuild(s.operators);
    // Quality tier is camera-wide, not per-person. Calculate it once even
    // when twenty operators are animating this frame.
    const frameShadowDetail=operatorShadowDetail(
      projectedOperatorHeightPx(this.camera,this.height),this.quality.mode);
    // E6.1: budget cold unseen-hostile kit/rig work across planning RAFs.
    // A newly visible actor always bypasses this and poses immediately.
    let coldPrewarmBuilt=0;
    for(const actor of s.operators){
      const visible=presentActor(s,actor,omniscient,replayDisclosurePolicy);
      // Hostile first-contact should not trigger a full rig, costume/lightmap,
      // and weapon build on the active combat frame. Before the first GO,
      // prepare each unseen hostile once while it remains undisclosed.
      // Historical replay never prewarms from present-day hidden truth.
      const prewarmHostile=shouldPrewarmContactRig({
        phase:s.phase,started:s.started,side:actor.side,visible,
        hasRig:this.actors.has(actor.id),
        historical:!!replay||!!replayDisclosurePolicy||!!replayDoorHistory||
          !!replayWindowHistory
      })&&withinContactPrewarmBudget(true,coldPrewarmBuilt);
      if(prewarmHostile)coldPrewarmBuilt++;
      if(!visible&&!this.actors.has(actor.id)&&!prewarmHostile)continue;
      if(!this.actors.has(actor.id)){
       const rigStart=this.profileSceneUpdate?performance.now():0;
       this.soldier(actor);
       if(this.profileSceneUpdate){
        this.actorPhaseCosts.rigMs+=performance.now()-rigStart;
        this.actorPhaseCosts.rigBuilds++;
       }
      }
      const object=this.actors.get(actor.id)!;
      object.root.visible=visible;
      const hitTime=s.seconds-actor.lastHitAt;
      const down=actor.health<=0;
      object.status.visible=!this.photoClean&&object.root.visible&&
        !down&&(hitTime>=0&&hitTime<.28);
      if(object.status.visible){
        object.status.position.set(actor.p.x,1.15,actor.p.y);
        const pulse=down?1.15:1+.45*(1-hitTime/.28);
        object.status.scale.setScalar(pulse);
        const statusMat=object.status.material as THREE.MeshBasicMaterial;
        statusMat.opacity=down ? .85 :Math.max(0,1-hitTime/.28);
        statusMat.color.setHex(down?0xd99e83:0xf4c7aa);
      }
      if(!object.root.visible&&!prewarmHostile){
        // Beam and contact-shadows are independent scene roots, unlike the
        // actor body. Never leak their position after an enemy leaves sight.
        object.beam.visible=false;
        for(const shadow of object.contactShadows)shadow.visible=false;
        continue;
      }
      // Presentation samples do not alter authoritative collision or shot state.
      const posePrepStart=this.profileSceneUpdate?performance.now():0;
      const drawActor=interpolatedActor(actor,renderFrame);
      // Only an actual reciprocal GO-time carrier may lift or reorient a
      // downed body. Live and replay use their sampled actor roster.
      const transport=downedTransportPresentation(actor,s.operators);
      // Airborne body is a fixed-tick simulation outcome. Keep the 3D
      // miniature at its authored horizontal position, lifted only by the
      // recorded traversal arc (never by render-time speculative physics).
      // Scene root uses authoritative ground/traversal height once.
      // The 3D pose pass applies the recorded carry/drag lift below; adding
      // it here as well caused the same body to float at double elevation.
      object.root.position.set(drawActor.x,
        actor.traversalElevation,drawActor.z);
      // Build 120: the pose solver is the only writer of actor anatomical,
      // firearm and hit-reaction transforms; the scene owns world placement.
      const downProgress=actor.health<=0||actor.surrendered?
        Math.min(1,Math.max(0,(poseSeconds-(actor.surrendered&&actor.health>0?
          actor.lastSurrenderAt??actor.lastDownAt:actor.lastDownAt))/.78)):0;
      const hitAge=poseSeconds-actor.lastHitAt;
      const hitFade=actor.health>0&&hitAge>=0&&hitAge<.32?
        1-hitAge/.32:0;
      const reloadDuration=actor.reloadDuration||
        WEAPONS[actor.weapon].reload*
        (actor.injuryStage===2?1.5:actor.injuryStage===1?1.1:1);
      const muzzleAttachment=actor.weaponConfiguration?.slots.muzzle;
      // Rapid bursts can have overlapping live shot cues. Display the
      // newest physically recorded flash, never an older first match.
      const drawnPistol=actor.secondarySwitch?.active==='secondary'&&
        actor.secondarySwitch.fraction>=1&&!!actor.equipment?.secondary?.weapon;
      const flashWeapon=drawnPistol?'smg':actor.weapon;
      const flashAttachment=drawnPistol?null:muzzleAttachment;
      const firing=mostRecentActiveMuzzleShot(
        this.recentMuzzleShots.forShooter(actor.id),actor.id,
        flashWeapon,flashAttachment,
        shot=>!personalDisclosure&&!!shot.secondaryWeapon===drawnPistol&&
          (omniscient||shotVisibility(s,shot).flash));
      const flashCue=muzzleFlashCue(flashWeapon,
        firing?.age??Infinity,flashAttachment);
      object.flash.visible=flashCue.active&&actor.health>0;
      if(this.transientLights&&!personalDisclosure&&visible&&object.flash.visible&&firing&&
        (omniscient||this.presentationSight.query(s,'effect','muzzle-light:'+firing.id,firing.start)))
        this.transientLights.offer('muzzle',firing.id,firing.start.x,firing.muzzleHeight??15,
          firing.start.y,firing.age,flashCue.lightStrength);
      const gunTip=actor.weaponConfiguration?
       resolveWeaponAssembly(actor.weaponConfiguration):null;
      object.flash.position.x=gunTip?.muzzleX??19.5;
      object.flash.position.y=gunTip?.muzzleY??0;
      if(flashCue.active){
        const aspect=muzzleFlashAspect(flashWeapon,drawnPistol,flashAttachment);
        object.flash.scale.set(flashCue.scale*aspect.x,flashCue.scale*aspect.y,flashCue.scale*aspect.z);
      }
      // A paused OPEN requested beside the REAL doorway should preview
      // contact even if an unrelated, already-positioned MOVE precedes it.
      // Reach is checked against the live feet, not the future waypoint.
      const plannedOpenNode=s.phase==='planning'&&!replay?
        actor.plan.find(n=>n.kind==='door'&&
          (n.method==='open'||n.method===undefined)):undefined;
      const nextDoor=actor.plan[0]?.kind==='door'?
        actor.plan[0]:plannedOpenNode;
      const plannedDoor=nextDoor?.doorId!==undefined?
        this.frameDoorsById.get(nextDoor.doorId):undefined;
      const activeDoor=plannedDoor??(actor.lastDoorId?
        this.frameDoorsById.get(actor.lastDoorId):undefined);
      const handle=activeDoor?
        actor.lastDoorMethod==='kick'&&actor.kickImpactPoint?
          actor.kickImpactPoint:
        actor.lastDoorMethod==='kick'?
          (()=>{const leaf=doorLeafSegment(activeDoor);
            return {x:leaf.a.x+(leaf.b.x-leaf.a.x)*.78,
              y:leaf.a.y+(leaf.b.y-leaf.a.y)*.78};})():
          handlePoint(activeDoor):undefined;
      // D4: a moving leaf's current position owns the wrist target.
      // Only actors actually attached to a door resolve its geometry.
      const physicalGrip=actor.doorHandContact;
      const gripDoor=physicalGrip?
        this.frameDoorsById.get(physicalGrip.doorId):undefined;
      const doorGrip=physicalGrip?{
        point:gripDoor&&physicalGrip.releasedAt===null?
          doorHandPoint(gripDoor,physicalGrip.fraction):physicalGrip.point,
        mode:physicalGrip.mode,startedAt:physicalGrip.startedAt,
        releasedAt:physicalGrip.releasedAt
      }:undefined;
      // A3.5 maps the existing D4 fixed-step attachment to a shared
      // typed world anchor. No new motor or weapon authority is created.
      // Planning preview is a read-only projection of the SAME authored
      // OPEN order and same reachable face candidate used at GO-time.
      // The simulation owns subsequent acquisition/release; no motor tick
      // or phantom door command is created while paused.
      const doorFacing=plannedDoor&&handle?
        Math.atan2(handle.y-actor.p.y,handle.x-actor.p.x):actor.heading;
      // A paused frame can retain a previous running-step velocity or a
      // fully RELEASED old contact. Neither should suppress a newly queued
      // OPEN beside an actually reachable handle. This is read-only pose
      // projection; GO-time movement and hands stay motor-owned.
      const previewActor=plannedOpenNode&&plannedDoor&&
        actor.side==='blue'&&actor.health>0&&actor.targetId===null?
        {...actor,plan:[plannedOpenNode],heading:doorFacing,
          velocity:0,aim:0,aimInstruction:null,pace:'walk' as const}:null;
      const gripActive=!!physicalGrip&&physicalGrip.releasedAt===null;
      const contactActive=!!actor.physicalContact&&
        actor.physicalContact.releasedAt===null;
      const previewPreOpen=previewActor&&
        !gripActive&&!contactActive?
        preOpenDoorCandidate(s,previewActor,plannedDoor!,
          sessionWorldGeometry(s)):null;
      const physicalContact=gripActive&&physicalGrip&&gripDoor&&doorGrip?
        doorGripPhysicalContact(physicalGrip.doorId,doorGrip,
          doorLeafSegment(gripDoor),actor.p):
        contactActive?actor.physicalContact:
        previewPreOpen?{...previewPreOpen,startedAt:poseSeconds-.26}:
        actor.physicalContact;
      // A3.8-L: the actual simulation keyway anchor is the lockpick clock.
      // Replaying a recorded frame samples this same contact timestamp;
      // no rendering-only progress state can invent an unlock.
      const lockpickActive=physicalContact?.intent==='tool'&&
        physicalContact.releasedAt===null&&
        actor.plan[0]?.kind==='tool'&&
        actor.plan[0].toolMethod==='pick';
      const lockpickDoor=lockpickActive&&actor.plan[0]?.doorId!==undefined?
        this.frameDoorsById.get(actor.plan[0].doorId):undefined;
      const lockpickProgress=lockpickActive?
        Math.max(0,Math.min(1,(s.seconds-physicalContact.startedAt)/
          Math.max(.1,lockpickDoor?
            entryToolVerdict(lockpickDoor,'pick').seconds:1.5))):0;
      const threat=actor.targetId?
        this.frameActorsById.get(actor.targetId):null;
      const threatRange=threat?Math.hypot(threat.p.x-actor.p.x,
        threat.p.y-actor.p.y):null;
      // Tactical weapon readiness is presentation-only. Derive intent from
      // existing authored orders rather than mutating the movement plan.
      // Replays use the same pure rule on their recorded actor state.
      const handlingIntent=handlingIntentForMovement({
        order:actor.plan[0],running:actor.pace==='run',
        squeezing:actor.squeeze,traversing:!!actor.traversal,
        reloading:actor.reload>0,treating:!!actor.treatmentActive,
        hasContact:!!threat&&threat.health>0,
        hasAuthoredWatch:!!actor.aimInstruction&&
          actor.aimInstruction.source!=='stack',
        speed:actor.velocity
      });
      // E6.5: directional muzzle courtesy shares the existing roster pass
      // with stack proximity and safety. Previously the separate high-ready
      // scan repeated the roster walk and live-side/health comparisons.
      // Keep fixed-tick offsets and the exact shared directional predicate;
      // the independent shot-time fire-lane rule is not changed.
      const allyStart=this.profileSceneUpdate?performance.now():0;
      const stackContext=handlingIntent==='stack'||
        handlingIntent==='door'||handlingIntent==='entry';
      let stackCrowded=false,actuallyAhead=false;
      const facingX=Math.cos(actor.heading),facingY=Math.sin(actor.heading);
      const nearbyAllies=this.nearbyAllyScratch;
      nearbyAllies.length=0;
      const allyPeers=useAllyBroadphase?
        this.frameActorNeighborhood.candidates(
          actor.p.x,actor.p.y,drawActor.x,drawActor.z):s.operators;
      for(const peer of allyPeers){
        if(peer===actor||peer.side!==actor.side||peer.health<=0)continue;
        // Stack and high-ready use fixed-step actor positions, while weapon
        // safety still uses the interpolated presentation position.
        const stackX=peer.p.x-actor.p.x;
        const stackY=peer.p.y-actor.p.y;
        if(stackContext&&!stackCrowded&&
          stackX*stackX+stackY*stackY<40*40)stackCrowded=true;
        if(!actuallyAhead&&teammateAheadProjectedOffset(
          stackX,stackY,facingX,facingY))actuallyAhead=true;
        const safetyX=peer.p.x-drawActor.x;
        const safetyY=peer.p.y-drawActor.z;
        if(safetyX*safetyX+safetyY*safetyY<90*90)
          nearbyAllies.push(safetyBodyFor(peer));
      }
      if(this.profileSceneUpdate){
        this.actorPhaseCosts.allyContextMs+=performance.now()-allyStart;
        this.actorPhaseCosts.allyPeerVisits+=allyPeers.length;
      }
      const friendlyAhead=stackCrowded||actuallyAhead;
      // Physical contact is queried from the actual interpolated barrel,
      // never from a long ray projected along the feet/body heading.
      const clearance=weaponClearance({
        x:drawActor.x,z:drawActor.z,heading:drawActor.heading,
        weaponYaw:drawActor.weaponYaw,shoulderOffset:actor.aimSideOffset??0,
        weapon:actor.weapon,
         weaponConfiguration:actor.weaponConfiguration,
        equipment:actor.equipment,aim:actor.aim,velocity:actor.velocity,recoil:actor.recoil,
        posture:actor.posture,coverStanceDrop:actor.coverStanceDrop??0,
        threatRange,friendlyNear:friendlyAhead,
        friendlyAhead:actuallyAhead,handlingIntent
      },s.doors,s.coverState,sessionWorldGeometry(s).walls,nearbyAllies);
      const lightOn=weaponLightEmitting(actor)&&object.root.visible;
      object.beam.visible=lightOn;
      if(lightOn){
       const tick=Math.floor(s.seconds*8),siteSeed=s.site?.seed??-1;
       const signature=beamDoorSignature??=(s.doors.map(d=>d.id+':'+
        (d.openFraction??(d.open?1:0)).toFixed(4)+':'+
        (d.glassShattered?1:0)).join('|'));
       if(tick!==this.beamBlockerTick||siteSeed!==this.beamBlockerSite||
          this.beamBlockerRevision!==s.objectRevision||
          this.beamBlockerSignature!==signature){
        const geometry=sessionWorldGeometry(s);
        this.beamBlockers=lightBeamBlockers(geometry.walls,s.doors,s.coverState);
        this.beamBlockerSignature=signature;
        // Same-tick replay/door updates must not reuse stale actor polygons.
        for(const visible of this.actors.values())visible.beamLast=null;
        this.beamBlockerTick=tick;this.beamBlockerSite=siteSeed;
        this.beamBlockerRevision=s.objectRevision;
       }
       const angle=clearance.muzzle.yaw;
       const emitter=weaponLightEmitter(clearance.muzzle,actor.weaponConfiguration!);
       const bx=emitter.x,by=emitter.y;
       const prev=object.beamLast;
       if(!prev||Math.hypot(prev.x-bx,prev.y-by)>.7||
          Math.abs(Math.atan2(Math.sin(prev.yaw-angle),Math.cos(prev.yaw-angle)))>.025||
          prev.tick!==tick){
        const polygon=lightBeamFootprint({x:bx,y:by},angle,this.beamBlockers);
        const positions=object.beam.geometry.getAttribute('position') as THREE.BufferAttribute;
        const values=positions.array as Float32Array;
        for(let i=0;i<LIGHT_BEAM_SAMPLES-1;i++){
         const a=polygon[0],p=polygon[i+1],q=polygon[i+2],n=i*9;
         values[n]=a.x;values[n+1]=.38;values[n+2]=a.y;
         values[n+3]=p.x;values[n+4]=.38;values[n+5]=p.y;
         values[n+6]=q.x;values[n+7]=.38;values[n+8]=q.y;
        }
        positions.needsUpdate=true;object.beamLast={x:bx,y:by,yaw:angle,tick};
       }
      }
      // The quality tier is selected from screen pixels, not absolute world
      // distance. No new directional light or actor-specific shadow map.
      const shadowDetail=frameShadowDetail;
      object.physical.root.userData.fieldworkCavityQuality=
        cavityQualityForDetail(shadowDetail);
      // Shared, bounded inventory projection for both visible containers.
      const carried=bakedOperatorCarry(actor);
      const carriedMagazines=carried.magazines;
      // Actors generated as hostile 'occupants' are still ARMED. Visual
      // activity only adjusts existing idle head/breath, never stows rifles
      // or overrides the simulation. The resolved site is recorded with
      // replay manifests; historical sites without activity fail neutral.
      const siteActorIndex=actor.side==='red'&&/^guard[0-9]+$/.test(actor.id)?
        Number(actor.id.slice(5)):-1;
      const encounterSpec=siteActorIndex>=0?
        s.site?.encounter?.actors[siteActorIndex]:undefined;
      const precontact=armedPrecontactStyle({
        side:actor.side,
        activity:encounterSpec?.activity,
        alert:actor.alert,velocity:actor.velocity,aim:actor.aim,
        health:actor.health,surrendered:actor.surrendered,
        reloading:actor.reload>0,interacting:!!actor.treatmentActive||
          !!actor.traversal||actor.plan[0]?.kind==='door'
      });
      // Preview a hooked throw only while actively authoring/performing
      // the real FLASH node. No phantom grenade or second simulator.
      const flashOrder=actor.plan[0]?.kind==='flash'?actor.plan[0]:null;
      const hook=flashOrder?.aimPoint?
        validateThrow(actor.p,flashOrder.aimPoint,s.doors,[],
          sessionWorldGeometry(s)):null;
      const flashHookPoint=hook?.valid&&hook.mode==='doorway'?
        hook.via:undefined;
      const poseStart=this.profileSceneUpdate?performance.now():0;
      if(this.profileSceneUpdate)
        this.actorPhaseCosts.posePrepMs+=poseStart-posePrepStart;
      poseOperator(object.physical,{
        x:drawActor.x,z:drawActor.z,
        heading:transport?.heading??(previewPreOpen?
          doorFacing:drawActor.heading),
        handlingOverride:previewPreOpen?'high':undefined,
        velocity:actor.traversal?0:actor.velocity,
        seconds:poseSeconds,idleLifeSeconds:actorIdleSeconds,
        precontact,
        stride:actor.traversal?0:actor.stride,
        traversalProgress:actor.traversal?
          actor.traversalElapsed/Math.max(.001,actor.traversal.duration):0,
        appearanceSeed:actor.appearanceSeed,
        equipment:actor.equipment,wardrobe:actor.wardrobe,
        secondarySwitch:actor.secondarySwitch,
        secondaryReload:actor.secondaryReload,
        // B30: live and replay use the new posing by default.
        // This changes rendered anatomy only, not fixed-step ammo/shot.
        poseV3Preview:true,poseV4ReloadPreview:true,
        poseDiagnostics:false,
        magazineCarryLocations:carried.locations,
        magazineCarryItems:carriedMagazines,
        reloadSelectedMagazineId:actor.reloadSelectedMagazineId,
        medicalCarryLocation:carried.medical,
        utilityCarryLocation:carried.utility,
         weaponConfiguration:actor.weaponConfiguration,
         weaponLightOn:actor.weaponLightOn,
         nvgDeployed:actor.nvgDeployed===true,
        treatmentActive:actor.treatmentActive,
        treatmentProgress:actor.treatmentProgress,
        // Real GO-time civilian contact flashes a gentle support-hand
        // reach; never controls muzzle, hit logic or mission authority.
        civilianContactAge:poseSeconds-(actor.lastCivilianContactAt??-100),
        interactionCrouch:actor.treatmentActive?
          Math.min(1,Math.max(0,(s.seconds-actor.lastTreatmentAt)/.38)):
          actor.plan[0]?.interaction==='secure-firearm'?
          Math.min(1,actor.actionTimer/.34):
          actor.plan[0]?.kind==='tool'&&actor.plan[0]?.toolMethod==='pick'&&
          actor.actionTimer>0?
          Math.min(1,Math.max(0,(s.seconds-actor.lastDoorAt)/.38)):0,
        treatmentPoint:actor.treatmentActive&&
         actor.lastTreatmentTargetId!==null?
         this.frameActorsById.get(actor.lastTreatmentTargetId)?.p:undefined,
        flashCharges:actor.flashCharges,
        wedgeRemaining:actor.wedgeRemaining,
        restraintRemaining:actor.restraintRemaining,
        equipmentInteraction:readEquipmentInteraction(actor),
        // A path collision may leave residual motor velocity while position
        // is stationary: feet should brace, not march in place.
        blocked:!actor.traversal&&actor.blockedTime>.14&&
          (actor.nav.length>0||actor.plan.some(n=>
            n.kind==='move'||n.kind==='door'||n.kind==='pie')),
        // Moving teammates are not static terrain. They may influence
        // future foot placement but must not invalidate a planted boot
        // every frame while the two operators pass each other.
        footAllowed:pt=>footAnchorReachable(actor.p,pt,s.doors),
        // Build 181: both live and replay sample fixed-step recorded contacts;
        // rendering cannot advance a second independent live gait.
        deterministic:!!replay,
        replayFeet:replay?.feet[actor.id]??liveMotion?.feet[actor.id],
        hybridSupport:true,
        acceleration:replay?.acceleration[actor.id]??
          liveMotion?.acceleration[actor.id]??0,
        motionImpulse:replay?.momentum[actor.id]??
          liveMotion?.momentum[actor.id],
        pelvisYaw:replay?.pelvisYaw[actor.id]??liveMotion?.pelvisYaw[actor.id],
        travelYaw:replay?.travelYaw[actor.id]??
          liveMotion?.travelYaw[actor.id],
        posture:actor.posture,coverStanceDrop:actor.coverStanceDrop??0,
        injury:actor.injuryStage,weapon:actor.weapon,
        gait:actor.squeeze?'squeeze':
          actor.plan[0]?.kind==='pie'?'pie':
          actor.pace==='run'||actor.plan[0]?.moveMode==='sprint'?
            'run':'walk',
        reload:actor.reload,reloadDuration,
        reloadMode:actor.reloadMode,
        reloadRemoved:actor.reloadRemoved,
        reloadInserted:actor.reloadInserted,
        lastThrowAt:actor.lastThrowAt,lastDoorAt:actor.lastDoorAt,
        flashHookPoint,
        lastBashAt:actor.lastBashAt,bashRole:actor.lastBashRole,
        doorMethod:actor.lastDoorMethod,kickFoot:actor.kickFoot,
        kickImpactPoint:actor.kickImpactPoint??undefined,
        lockpickActive,lockpickProgress,
        doorPoint:handle?{x:handle.x,y:handle.y}:undefined,
         doorGrip:previewPreOpen?undefined:doorGrip,physicalContact,
        down:actor.health<=0,surrender:actor.surrendered,
        worldWeaponReleased:actor.surrendered&&actor.releasedWeaponId!=null,
        restrained:actor.restrained===true,
        // Gameplay and replay use the same named NPC transition contract as
        // the Lab. In particular surrender -> cuffed must not snap wrists.
        npcTransitionKey:actor.side==='red'?
          hostileNpcTransitionKey(actor):undefined,
        npcTransitionDuration:actor.surrendered?.34:.24,
        custodyWalkBlend:actor.side==='red'?
          hostileCustodyWalkBlend(actor,poseSeconds):undefined,
        // Escaping unrestrained captives remain visibly upright while
        // moving, rather than gliding on their knees in surrender pose.
        custodyWalking:actor.surrendered&&!!actor.escortLeaderId||
          actor.surrendered&&actor.suspectEscapeMode==='flee',
        aiming:!actor.traversal&&actor.aim>.20,
        turning:actor.turning,firing:!!firing&&!actor.traversal,
        aimBlend:actor.aim,recoil:actor.recoil*6,
        shotHeading:previewPreOpen?doorFacing:drawActor.weaponYaw,
        shoulderOffset:actor.aimSideOffset??0,
        shoulderPullback:clearance.shoulderPullback,
        hitAge,hitFade,downProgress,
        handlingIntent,
        threatRange,
        obstruction:clearance.obstruction,
        clearanceCarry:clearance.carryOverride,
        clearanceShortFrom:clearance.shortFrom,
        clearanceBlend:clearance.carryBlend,
        clearanceRetraction:clearance.retraction,
        shortCompression:handlingIntent==='squeeze'?1:
          clearance.obstruction?clearance.compression:undefined,
        clearanceBlocked:clearance.blocked,
        hitRegion:actor.lastHitRegion,hitYaw:actor.lastHitYaw,
        hitSeverity:actor.lastHitSeverity,downPose:actor.downPose,
        downClearance:actor.downClearance,
        flashActive:actor.flashUntil>s.seconds&&actor.health>0,
        friendlyNear:friendlyAhead,friendlyAhead:actuallyAhead
      },dt);
      // The shared pose solver publishes its local fall/root offset. Restore
      // only the actual transport elevation afterward (as for civilians);
      // otherwise the body stays floor-flat while physically carried.
      if(transport)object.root.position.y+=transport.lift;
      // One existing muzzle flash follows the actual physical Glock socket
      // only once a selected sidearm is completely drawn. The rifle retains
      // its original visual authority in every other phase.
      presentSecondaryMuzzleFlash(object.physical.root,
        object.physical.weapon,object.flash,object.physical.hip,
        actor.equipment?.secondary,
        drawnPistol?actor.secondarySwitch!.fraction:0,
        gunTip?.muzzleX??19.5,gunTip?.muzzleY??0);
      // Read-only, evidence-scoped head-only investigation. Apply AFTER
      // the existing weapon/IK owner resolves its pose; never rotate the
      // root or weapon, or grant an unseen source position in replay.
      if(actor.side==='red'){
        const attention=hostilePhysicalityAt(actor,poseSeconds);
        object.physical.head.rotation.y+=attention.headYaw;
        // Tiny suppression guard uses the head only: chest, weapon, and
        // physical motor remain exclusively owned by the combat pose solver.
        object.physical.head.rotation.x+=attention.headPitch;
      }
      if(this.profileSceneUpdate){
       this.actorPhaseCosts.poseMs+=performance.now()-poseStart;
       this.actorPhaseCosts.poseCount++;
       const breakdown=object.physical.root.userData.fieldworkPoseCpu as
        {appearanceMs:number;weaponBuildMs:number;otherMs:number;
         visualKitMs?:number;receiverAtlasMs?:number;
         appearanceFingerprintMs?:number;
         appearanceInvalidations?:number}|undefined;
       if(breakdown){
        this.actorPhaseCosts.appearanceMs+=breakdown.appearanceMs;
        this.actorPhaseCosts.weaponBuildMs+=breakdown.weaponBuildMs;
        this.actorPhaseCosts.otherPoseMs+=breakdown.otherMs;
        this.actorPhaseCosts.visualKitMs+=breakdown.visualKitMs??0;
        this.actorPhaseCosts.receiverAtlasMs+=breakdown.receiverAtlasMs??0;
        this.actorPhaseCosts.appearanceFingerprintMs+=
          breakdown.appearanceFingerprintMs??0;
        this.actorPhaseCosts.appearanceInvalidations+=
          breakdown.appearanceInvalidations??0;
       }
      }
      if(this.graphicLookEnabled&&(object.root.visible||prewarmHostile)){
       // Warm visual material composition before first contact too. Never
       // display a hidden hostile's textures, pose, beam or foot shadows.
       // Do not traverse hundreds of meshes every 60Hz frame. Recompose
       // only after costume/weapon source materials actually changed.
       const appearance=String(
        object.physical.root.userData.fieldworkLightingAppearanceKey??'');
       const stamp=appearance+'|'+actor.weapon;
       if(object.root.userData.fieldworkProductionGraphicStamp!==stamp){
        if(prewarmHostile)
         withPreparedVisibleRoot(object.root,()=>
          applyStudioGraphicLighting(object.root,APPROVED_GRAPHIC_LIGHTING));
        else applyStudioGraphicLighting(object.root,APPROVED_GRAPHIC_LIGHTING);
        object.root.userData.fieldworkProductionGraphicStamp=stamp;
        this.graphicOperatorRestyles++;
       }
      }
      // Rebuild caster choices only on projected-size/wardrobe tier changes.
      // A paused scene is explicitly invalidated when casters change.
      const shadowLod=applyOperatorShadowLod(
       object.physical.root,shadowDetail);
      if(shadowLod.casterChanges){
       this.shadowUpdates.invalidate();
       this.shadowLodTransitions++;
      }
      object.root.updateMatrixWorld(true);
      for(let i=0;i<2;i++){
        const shadow=object.contactShadows[i];
        shadow.visible=actor.health>0&&object.root.visible;
        if(!shadow.visible)continue;
        object.physical.feet[i].shoe.getWorldPosition(this.shoeWorldPoint);
        shadow.position.set(this.shoeWorldPoint.x,.16,this.shoeWorldPoint.z);
        const contact=replay?.feet[actor.id]?.[i]??
          liveMotion?.feet[actor.id]?.[i];
        const pulse=contact?.phase==='landing'?
          1+.12*Math.sin(Math.PI*(contact.progress??0)):1;
        shadow.scale.setScalar(
          (object.physical.feet[i].swinging?.74:1)*pulse);
      }
    }
    // Submit every independently revealed foot decal in one WebGL draw.
    // Hidden and removed operators never leak an undisclosed position.
    this.contactShadowBatch.sync();
    this.markScenePhase('actors');
    if(this.transientLights&&!personalDisclosure)
      for(const burst of s.flashBursts){
        if(!omniscient&&!this.presentationSight.query(s,'effect','flash-light:'+burst.id,burst.p))continue;
        this.transientLights.offer('flash',burst.id,burst.p.x,13,burst.p.y,burst.age);
      }
    this.transientLights?.confine(sessionWorldGeometry(s),s.doors);
    this.combatEffects.update(s,omniscient,
      personalDisclosure,p=>this.presentationSight.query(
        s,'effect',p.x+','+p.y,p));
    // 079: One persistent, ID-keyed effect per actual simulation shot.
    // Shared geometry and bounded per-shot materials avoid frame-by-frame GC.
    const active=this.frameShotIds;active.clear();
    let visibleShots=0;
    this.dropletPreview?.begin();
    this.tracerBatch?.begin();this.impactPulseBatch?.begin();
    this.dustPuffs?.begin();
    // Dense bursts keep their newest effects; older traces are cosmetic.
    for(let index=s.shots.length-1;index>=0;index--){
      if(visibleShots>=20)break;
      const shot=s.shots[index];
      if(replayDisclosurePolicy?.mode==='operator')continue;
      const visibility=omniscient?
        {flash:true,trace:true,impact:true}:shotVisibility(s,shot,
          p=>this.presentationSight.query(s,'effect',shot.id,p));
      if(!visibility.flash&&!visibility.trace&&!visibility.impact)continue;
      active.add(shot.id);visibleShots++;
      let effect=this.effectCache.get(shot.id);
      if(!effect&&!this.shotPulsePreviewEnabled){
        const style=shot.side+'|'+(shot.surface??'dust');
        effect=this.shotEffectPool.acquire(style,()=>{
        const root=new THREE.Group();
        const material=new THREE.MeshBasicMaterial({
          color:shot.side==='blue'?0xffde9d:0xff9b73,
          transparent:true,depthTest:true,depthWrite:false});
        const impactMaterial=new THREE.MeshBasicMaterial({
          color:shot.surface==='blood'?0xa65a4e:
            shot.surface==='metal'?0xffd697:
            shot.surface==='glass'?0xc8e4df:
            shot.surface==='wood'?0xdfb27a:
            shot.surface==='stone'?0xbeb9a2:0xe2d3b1,
          transparent:true,depthTest:true,depthWrite:false});
        const line=new THREE.Mesh(this.tracerGeometry,material);
        const impact=new THREE.Mesh(this.impactGeometry,impactMaterial);
        root.add(line,impact);
        const chips:THREE.Mesh[]=[];
        if(!this.materialImpactPreviewEnabled&&(shot.surface==='wood'||shot.surface==='stone'||
          shot.surface==='metal'||shot.surface==='glass'||
          shot.surface==='blood'&&!this.bloodPreviewEnabled)){
          for(let i=0;i<(shot.surface==='blood'?4:3);i++){
            const chip=new THREE.Mesh(this.tracerGeometry,impactMaterial);
            chip.scale.set(shot.surface==='blood'?.9:.42,
              shot.surface==='blood'?1.9:shot.surface==='wood'?4.2:2.4,
              shot.surface==='blood'?.9:.42);
            root.add(chip);chips.push(chip);
          }
        }
        return {style,root,line,impact,chips,material,impactMaterial};
        });
        // Inactive entries are detached from the render scene, retaining
        // only the exact same styled meshes/materials for the next shot.
        this.effects.add(effect.root);
        effect.root.visible=true;
        this.effectCache.set(shot.id,effect);
      }
      const start=this.shotStart.set(
        shot.start.x,shot.muzzleHeight??15,shot.start.y);
      const end=this.shotEnd.set(
        shot.end.x,shot.impactHeight??12,shot.end.y);
      const flight=this.shotFlight.copy(end).sub(start);
      const profile=impactProfile(shot.surface??'dust');
      const impact=impactPulse(shot.surface??'dust',shot.age,
        profile.lifetime);
      if(this.shotPulsePreviewEnabled){
        if(visibility.trace&&shot.age<.19){
          if(!this.tracerBatch){
            this.tracerBatch=makeBloodDropletBatch(this.tracerGeometry,20,'shot-tracer-batch');
            this.effects.add(this.tracerBatch.mesh);
          }
          const len=flight.length(),x=start.x+flight.x*.5,y=start.y+flight.y*.5,z=start.z+flight.z*.5;
          const rot=this.shotPulseEuler.setFromQuaternion(
            this.shotPulseQuaternion.setFromUnitVectors(this.tracerAxis,flight.normalize()));
          this.tracerBatch.addPose(x,y,z,rot.x,rot.y,rot.z,1,len,
            Math.max(0,1-shot.age/.20),shot.side==='blue'?0xffde9d:0xff9b73);
        }
        if(visibility.impact&&impact.active&&impact.opacity>0){
          if(!this.impactPulseBatch){
            this.impactPulseBatch=makeBloodDropletBatch(this.impactGeometry,20,'shot-pulse-batch');
            this.effects.add(this.impactPulseBatch.mesh);
          }
          const color=shot.surface==='blood'?0xa65a4e:MATERIAL_IMPACT_PROFILES[shot.surface??'dust'].pulseColor;
          this.impactPulseBatch.addPose(end.x,end.y,end.z,0,0,0,
            impact.scale,impact.scale,impact.opacity,color);
        }
      }else if(effect){
        effect.line.position.copy(start).addScaledVector(flight,.5);
        effect.line.scale.set(1,flight.length(),1);
        effect.line.quaternion.setFromUnitVectors(this.tracerAxis,flight.normalize());
        effect.line.visible=visibility.trace&&shot.age<.19;
        effect.material.opacity=Math.max(0,1-shot.age/.20);
        effect.impact.position.copy(end);
        effect.impact.scale.setScalar(impact.scale);
        effect.impactMaterial.opacity=impact.opacity;
        effect.impact.visible=visibility.impact&&impact.active;
      }
      if(this.bloodPreviewEnabled&&shot.surface==='blood'&&visibility.impact&&shot.age<profile.lifetime&&impact.opacity>0){
        const sample=this.materialImpactScratch;
        const yaw=shot.shotYaw??Math.atan2(end.z-start.z,end.x-start.x);
        for(let i=0;i<BLOOD_BURST_COUNT;i++){
          if(!sampleBloodBurst(shot.id,i,shot.age,yaw,end.x,end.y,end.z,sample))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect',shot.id+':chip:'+i,{x:sample.x,y:sample.z}))continue;
          if(!this.dropletPreview){
            this.dropletPreview=makeBloodDropletBatch(this.tracerGeometry,
              this.materialImpactPreviewEnabled?MATERIAL_IMPACT_PARTICLE_LIMIT:BLOOD_DROPLET_CAPACITY);
            this.effects.add(this.dropletPreview.mesh);
          }
          this.dropletPreview.addMaterial(sample);
        }
      }
      if(this.smokePreviewEnabled&&visibility.flash){
        const puff=this.puffScratch;
        if(samplePuff('muzzle',shot.id,0,shot.age,start.x,start.y,start.z,puff)&&
          (omniscient||this.presentationSight.query(s,'effect','muzzle-puff:'+shot.id,{x:puff.x,y:puff.z}))){
          if(!this.dustPuffs){this.dustPuffs=new DustPuffBatch();this.effects.add(this.dustPuffs.mesh);}
          this.dustPuffs.add(puff);
        }
      }
      const puffSurface=shot.surface??'dust';
      if(this.smokePreviewEnabled&&visibility.impact&&
        (puffSurface==='dust'||puffSurface==='wood'||puffSurface==='stone')){
        const puff=this.puffScratch;
        for(let i=0;i<puffCount(puffSurface);i++){
          if(!samplePuff(puffSurface,shot.id,i,shot.age,end.x,end.y,end.z,puff))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','puff:'+shot.id+':'+i,{x:puff.x,y:puff.z}))continue;
          if(!this.dustPuffs){this.dustPuffs=new DustPuffBatch();this.effects.add(this.dustPuffs.mesh);}
          this.dustPuffs.add(puff);
        }
      }
      if(this.materialImpactPreviewEnabled&&shot.surface!=='blood'&&visibility.impact&&
        !(this.smokePreviewEnabled&&puffSurface==='dust')){
        const surface=shot.surface??'dust',sample=this.materialImpactScratch;
        for(let i=0;i<MATERIAL_IMPACT_PROFILES[surface].count;i++){
          if(!sampleMaterialImpact(surface,shot.id,i,shot.age,end.x,end.y,end.z,sample))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect',shot.id+':chip:'+i,{x:sample.x,y:sample.z}))continue;
          if(!this.dropletPreview){
            this.dropletPreview=makeBloodDropletBatch(this.tracerGeometry,MATERIAL_IMPACT_PARTICLE_LIMIT);
            this.effects.add(this.dropletPreview.mesh);
          }
          this.dropletPreview.addMaterial(sample);
        }
      }
      if(effect)for(let i=0;i<effect.chips.length;i++){
        const chip=effect.chips[i];
        const theta=(shot.id*2.41+i*2.094);
        const progress=shot.age/.40;
        const radius=(2+15*progress)*(shot.surface==='blood'?.7:1);
        chip.position.set(end.x+Math.cos(theta)*radius,
          Math.max(2,end.y+6*Math.sin(Math.PI*progress)+i*1.5-4*progress),
          end.z+Math.sin(theta)*radius);
        chip.rotation.set(i*.73,theta,Math.PI*.5+progress*1.8);
        chip.visible=visibility.impact&&shot.age<profile.lifetime&&
          (omniscient||this.presentationSight.query(s,'effect',
            shot.id+':chip:'+i,{x:chip.position.x,y:chip.position.z}));
      }
    }
    // Final-shot effects have priority. Use spare slots in the same
    // batches for independently disclosed intermediate material contacts.
    // No extra tracer, muzzle event, or visibility inferred from the shooter.
    if(!personalDisclosure&&this.materialImpactPreviewEnabled){
      let count=0;
      for(let n=s.shots.length-1;n>=Math.max(0,s.shots.length-20)&&count<20;n--){
        const shot=s.shots[n];
        for(let j=0;j<Math.min(MAX_MATERIAL_CUES,shot.materialImpacts?.length??0)&&count<20;j++){
          const cue=shot.materialImpacts![j],surface=cue.surface;
          if(!isIntermediateMaterialCue(shot,cue))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','material:'+cue.id,cue.p))continue;
          const p=MATERIAL_IMPACT_PROFILES[surface],pulse=impactPulse(surface,shot.age,p.life);
          if(!pulse.active)continue;
          count++;
          if(this.shotPulsePreviewEnabled){
            if(!this.impactPulseBatch){
              this.impactPulseBatch=makeBloodDropletBatch(this.impactGeometry,20,'shot-pulse-batch');
              this.effects.add(this.impactPulseBatch.mesh);
            }
            this.impactPulseBatch.addPose(cue.p.x,cue.height,cue.p.y,0,0,0,pulse.scale,pulse.scale,pulse.opacity,p.pulseColor);
          }
          const sample=this.materialImpactScratch;
          if(!(this.smokePreviewEnabled&&surface==='dust'))
           for(let i=0;i<p.count;i++){
            if(!sampleMaterialImpact(surface,cue.id,i,shot.age,cue.p.x,cue.height,cue.p.y,sample))continue;
            if(!omniscient&&!this.presentationSight.query(s,'effect','material:'+cue.id+':chip:'+i,{x:sample.x,y:sample.z}))continue;
            if(!this.dropletPreview){
              this.dropletPreview=makeBloodDropletBatch(this.tracerGeometry,MATERIAL_IMPACT_PARTICLE_LIMIT);
              this.effects.add(this.dropletPreview.mesh);
            }
            this.dropletPreview.addMaterial(sample);
           }
          if(this.smokePreviewEnabled&&(surface==='dust'||surface==='wood'||surface==='stone')){
            const puff=this.puffScratch;
            for(let i=0;i<puffCount(surface);i++){
              if(!samplePuff(surface,cue.id,i,shot.age,cue.p.x,cue.height,cue.p.y,puff))continue;
              if(!omniscient&&!this.presentationSight.query(s,'effect','material:'+cue.id+':puff:'+i,{x:puff.x,y:puff.z}))continue;
              if(!this.dustPuffs){this.dustPuffs=new DustPuffBatch();this.effects.add(this.dustPuffs.mesh);}
              this.dustPuffs.add(puff);
            }
          }
        }
      }
    }
    this.dropletPreview?.finish();
    this.tracerBatch?.finish();this.impactPulseBatch?.finish();
    if(this.smokePreviewEnabled&&!personalDisclosure){
      const puff=this.puffScratch;
      for(let n=s.flashBursts.length-1;n>=Math.max(0,s.flashBursts.length-4);n--){
        const burst=s.flashBursts[n];
        if(!omniscient&&!this.presentationSight.query(s,'effect','puff-burst:'+burst.id,burst.p))continue;
        for(let i=0;i<puffCount('flash');i++){
          if(!samplePuff('flash',burst.id,i,burst.age,burst.p.x,13,burst.p.y,puff))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','puff-burst:'+burst.id+':'+i,{x:puff.x,y:puff.z}))continue;
          if(!this.dustPuffs){this.dustPuffs=new DustPuffBatch();this.effects.add(this.dustPuffs.mesh);}
          this.dustPuffs.add(puff);
        }
      }
    }
    // Expired shot/flash records retain only their small cosmetic cloud
    // cues. Final shots take priority over tails in the same fixed batch.
    if(this.smokePreviewEnabled&&!personalDisclosure&&s.atmosphere?.length){
      const puff=this.puffScratch;
      for(let n=s.atmosphere.length-1;n>=0;n--){
        const cue=s.atmosphere[n],kind:PuffKind=cue.kind,age=s.seconds-cue.at;
        if(!omniscient&&!this.presentationSight.query(s,'effect','cloud:'+cue.key,cue.p))continue;
        for(let i=0;i<puffCount(kind);i++){
          if(!samplePuff(kind,cue.id,i,age,cue.p.x,cue.height,cue.p.y,puff))continue;
          if(!omniscient&&!this.presentationSight.query(s,'effect','cloud:'+cue.key+':'+i,{x:puff.x,y:puff.z}))continue;
          if(!this.dustPuffs){this.dustPuffs=new DustPuffBatch();this.effects.add(this.dustPuffs.mesh);}
          if(!this.dustPuffs.add(puff))break;
        }
      }
    }
    this.dustPuffs?.finish();
    // Stable cap, one render call and no individual decal meshes/materials.
    if(!this.impactDecalMesh){
      if(this.bloodPreviewEnabled){
        this.stainPreview=makeStainMarkBatch(IMPACT_MARK_LIMIT);
        this.impactDecalMesh=this.stainPreview.mesh;
      }else this.impactDecalMesh=new THREE.InstancedMesh(
        new THREE.CircleGeometry(1,9),
        new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,
          opacity:.82,depthTest:true,depthWrite:false,
          side:THREE.DoubleSide}),
        IMPACT_MARK_LIMIT);
      this.impactDecalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.impactDecalMesh.frustumCulled=false;
      this.effects.add(this.impactDecalMesh);
    }
    const markDraw=this.impactDecalMesh;
    // The intentionally translucent wall cutaway never reveals stains
    // that are physically on the far side of a full-height wall.
    const opticalCamera=this.projectionCamera;
    const bloodCamera=opticalCamera.position;
    const orthoBlood=opticalCamera instanceof THREE.OrthographicCamera;
    opticalCamera.getWorldDirection(this.bloodCameraDirection).negate();
    // Opaque bodies already write depth. Do not hide an entire blood
    // footprint just because its owner stands or lies over its center.
    let markCount=0,markDirty=0;
    for(let markIndex=0;markIndex<s.impactMarks.length;markIndex++){
      const mark=s.impactMarks[markIndex];
      if(replayDisclosurePolicy?.mode==='operator')continue;
      let attached:SurfaceMarkPose|null=null;
      const ref=mark.surfaceRef;
      const artRadius=damageRadius(mark.surface,mark.damageCount);
      if(mark.surface!=='blood'&&ref){
        if(ref.kind==='wall'){
          const owner=this.wallOwners.find(w=>w.index===ref.index);
          if(!owner||owner.opacity<.995||!owner.pieces.some(m=>m.visible&&(!m.parent||m.parent.visible)))continue;
          attached=wallMarkPose(ref,owner.segment,artRadius*impactFinishScale(s.site,ref));
        }else if(ref.kind==='door'){
          const door=ref.ownerId?this.frameDoorsById.get(ref.ownerId):undefined;
          const visual=ref.ownerId?this.doors.get(ref.ownerId):undefined;
          if(!door||!visual?.root.visible||!visual.leaf.visible||visual.leaf.userData.impactCut)continue;
          if((door.style==='glazed'||door.style==='french')&&!visual.glassPane?.visible)continue;
          const local=doorMarkLocalPose(ref,door,artRadius);
          if(local){
            visual.leaf.updateWorldMatrix(true,false);
            this.impactDecalPoint.set(local.x,local.y,local.z).applyMatrix4(visual.leaf.matrixWorld);
            this.impactDecalNormal.set(local.nx,local.ny,local.nz).transformDirection(visual.leaf.matrixWorld);
            attached={...local,x:this.impactDecalPoint.x,y:this.impactDecalPoint.y,z:this.impactDecalPoint.z,nx:this.impactDecalNormal.x,ny:this.impactDecalNormal.y,nz:this.impactDecalNormal.z};
          }
        }else if(ref.kind==='cover'){
          const authored=s.site?.cover[ref.index],current=s.coverState[ref.index];
          const group=this.coverGroups.get(ref.index),visual=this.coverVisualStates.get(ref.index);
          if(!authored||!current||!group?.visible||!visual?.intact.visible)continue;
          const local=coverMarkLocalPose(ref,authored,current,artRadius);
          if(local){
            group.updateWorldMatrix(true,false);
            this.impactDecalPoint.set(local.x,local.y,local.z).applyMatrix4(group.matrixWorld);
            this.impactDecalNormalMatrix.getNormalMatrix(group.matrixWorld);
            this.impactDecalNormal.set(local.nx,local.ny,local.nz).applyNormalMatrix(this.impactDecalNormalMatrix);
            attached={...local,x:this.impactDecalPoint.x,y:this.impactDecalPoint.y,z:this.impactDecalPoint.z,nx:this.impactDecalNormal.x,ny:this.impactDecalNormal.y,nz:this.impactDecalNormal.z,
              radius:local.radius*Math.min(Math.abs(group.scale.x),Math.abs(group.scale.y),Math.abs(group.scale.z))};
          }
        }else if(ref.kind==='window'){
          const pane=s.windows[ref.index],glass=ref.ownerId?this.windowGlass.get(ref.ownerId):undefined;
          if(!pane||!glass?.visible||!glass.parent?.visible)continue;
          attached=windowMarkPose(ref,pane,artRadius);
        }
        // Unsupported collider/art correspondence fails closed.
        if(!attached)continue;
      }else if(!isGroundImpactMark(mark))continue;
      const markPoint=attached?{x:attached.x,y:attached.z}:mark.p;
      if(!omniscient&&!this.presentationSight.query(
        s,'impact',mark.id,markPoint))continue;
      // Blood remains floor-aligned; environmental marks follow their surface.
      // Transparent architecture may not write depth, so a blood stain
      // must also be culled when any part lies behind a cutaway wall.
      // Opaque actors are handled by depth. Camera rays differ for ORTHO and WIDE.
      const radius=mark.surface==='blood'?
        confinedGroundRadius(mark.p,bloodMarkRadius(mark),s.site?.walls??WALLS):attached?.radius??2.3;
      if(radius<.5)continue;
      if(mark.surface==='blood'&&groundBloodFootprintOccluded(
          mark.p,radius,bloodCamera,this.bloodCameraDirection,
          orthoBlood,s.site?.walls??WALLS,[],
          WALL_VISUAL_HEIGHT))continue;
      if(mark.surface!=='blood'){
        const y=attached?.y??1;
        if(attached){
          const vx=orthoBlood?this.bloodCameraDirection.x:bloodCamera.x-attached.x;
          const vy=orthoBlood?this.bloodCameraDirection.y:bloodCamera.y-attached.y;
          const vz=orthoBlood?this.bloodCameraDirection.z:bloodCamera.z-attached.z;
          if(vx*attached.nx+vy*attached.ny+vz*attached.nz<=0)continue;
        }
        if(orthoBlood?groundMarkOccludedFromCamera(markPoint,this.bloodCameraDirection,s.site?.walls??WALLS,WALL_VISUAL_HEIGHT,y):
          groundMarkHiddenByWallFromCamera(markPoint,bloodCamera,s.site?.walls??WALLS,WALL_VISUAL_HEIGHT,y))continue;
      }
      if(markCount>=IMPACT_MARK_LIMIT)break;
      const dark=mark.surface==='blood'?bloodMarkTint(mark):damageTint(mark.surface);
      const groundRadius=radius,markY=attached?.y??(mark.surface==='blood'?.85:1);
      const nx=attached?.nx??0,ny=attached?.ny??1,nz=attached?.nz??0;
      const fade=mark.surface==='blood'||mark.surfaceRef?1:Math.max(.28,1-mark.age*.027);
      const style=this.stainPreview?.styleFor(mark.surface,mark.p.x,mark.p.y,mark.bloodKind)??-1;
      const dirty=this.persistentEvidencePreview?this.impactMarkSlots.update(markCount,
        markPoint.x,markY,markPoint.y,groundRadius,dark,fade,style,nx,ny,nz):
        MARK_MATRIX_DIRTY|MARK_COLOR_DIRTY|MARK_STYLE_DIRTY;
      if(dirty&MARK_MATRIX_DIRTY){
        this.impactDecalMatrix.position.set(markPoint.x,markY,markPoint.y);
        this.impactDecalNormal.set(nx,ny,nz);
        this.impactDecalMatrix.quaternion.setFromUnitVectors(this.impactDecalAxis,this.impactDecalNormal);
        this.impactDecalMatrix.scale.setScalar(groundRadius);
        this.impactDecalMatrix.updateMatrix();
        markDraw.setMatrixAt(markCount,this.impactDecalMatrix.matrix);
      }
      if(dirty&MARK_COLOR_DIRTY){
        this.impactDecalColor.setHex(dark).multiplyScalar(fade);
        markDraw.setColorAt(markCount,this.impactDecalColor);
      }
      if(dirty&MARK_STYLE_DIRTY)this.stainPreview?.style.setX(markCount,style);
      markCount++;markDirty|=dirty;
    }
    markDraw.count=markCount;
    if(markDirty&MARK_MATRIX_DIRTY)markDraw.instanceMatrix.needsUpdate=true;
    if(markDirty&MARK_COLOR_DIRTY&&markDraw.instanceColor)markDraw.instanceColor.needsUpdate=true;
    if(markDirty&MARK_STYLE_DIRTY)this.stainPreview?.finish();
    for(const [id,effect] of this.effectCache){
      if(active.has(id))continue;
      this.effects.remove(effect.root);
      effect.root.visible=false;
      this.shotEffectPool.release(effect.style,effect,discard=>{
        discard.material.dispose();discard.impactMaterial.dispose();
      });
      this.effectCache.delete(id);
    }
    // Ground-aligned cone/memory mask: no elevated fog surfaces and no
    // automatic room clearing. Static objects are independently gated.
    this.fogUnknown.count=0;this.fogExplored.count=0;
    const clippedExteriorFog=!omniscient&&
      s.intel.mode==='exterior-known'&&!!s.site;
    this.smoothFog.visible=!omniscient&&!clippedExteriorFog;
    this.exteriorKnownFog.visible=clippedExteriorFog;
    // Limit moving fog repaint/upload to 10Hz on balanced/performance.
    // This changes presentation cadence only, not authored intel or LOS.
    // Do not repaint/re-upload an identical visibility texture every 55ms
    // while operators are stationary in planning. Quantized pose and intel
    // changes make the key; real LOS is still computed by the fog renderer.
    // Fingerprints allocate a per-actor/door signature. Compute them
    // only when the fog repaint cadence permits a change, never on the
    // intervening 60Hz scene frames. Session swaps bypass the cadence.
    this.markScenePhase('effects');
    if(omniscient)this.fogRefresh.invalidate();
    else{
      const decision=this.fogRefresh.poll(s,dt,this.quality.mode==='quality'?.055:.10,!!replay);
      if(decision.paint){
        const fogComposeStart=this.profileSceneUpdate?performance.now():0;
        // Static exploration memory changes less often than live sight.
        const memorySignature=fogMemoryFingerprint({
          mode:s.intel.mode,seed:s.site?.seed??null,
          seenRevision:s.seenGroundRevision,
          rooms:s.intel.rooms.size,walls:s.intel.walls.size,
          doors:s.intel.doors.size,cover:s.intel.cover.size
        });
        if(decision.memoryInvalid||this.lastMemoryFogSession!==s||
           this.lastMemoryFogSignature!==memorySignature){
          paintFogMemory(this.fogMemoryContext,s,this.fogDiagnostic);
          this.lastMemoryFogSignature=memorySignature;
          this.lastMemoryFogSession=s;
          this.fogMemoryPaints++;
        }
        this.fogContext.setTransform(1,0,0,1,0,0);
        this.fogContext.globalCompositeOperation='source-over';
        this.fogContext.clearRect(0,0,
          this.fogCanvas.width,this.fogCanvas.height);
        this.fogContext.drawImage(this.fogMemoryCanvas,0,0);
        paintFogVisibility(this.fogContext,s);
        this.fogSightPaints++;
        this.fogTexture.needsUpdate=true;
        this.fogTextureUpdateRequests++;
        if(this.profileSceneUpdate){
          this.fogComposeMs=performance.now()-fogComposeStart;
          this.fogComposeCpuTotalMs+=this.fogComposeMs;
        }
      }
    }
    this.markScenePhase('fog');
    const dynamicShadows=s.phase==='running'||
      ((s.phase==='won'||s.phase==='lost')&&
        this.terminalPoseSeconds<1.0);
    // Reuse the live rig's appearance fingerprint: no duplicated wardrobe
    // serialization or transient actor/door arrays on unchanged idle frames.
    // The controller compares every scalar and both complete ordered rosters.
    if(this.shadowUpdates.shouldRefresh(dynamicShadows,{
      site:s.site?.seed??null,phase:s.phase,selected,
      focusX:shadowPoint.x,focusY:shadowPoint.y,
      objectRevision:s.objectRevision,known:s.seenGround.size,
      intelMode:s.intel.mode,lighting:s.lightingMode,
      actors:s.operators,doors:s.doors,
      poseTime:this.terminalPoseSeconds,simulationTime:s.seconds,
      appearanceKey:this.shadowAppearanceKey
    }))this.renderer.shadowMap.needsUpdate=true;
    // Read from the already posed historical rig. No additional animation
    // tick, physics, awareness query or mutable replay state is introduced.
    // The QA bodycam is never active without explicit personal disclosure.
    this.markScenePhase('shadows');
    let camera:THREE.Camera=this.projectionCamera;
    let cameraOwner:OperatorRig|null=null;
    if(bodycamAudition&&this.replayBodycam){
      const rig=this.actors.get(this.replayBodycam.actorId)?.physical;
      if(rig?.root.visible){
        const socket=this.replayBodycam.mount==='helmet'?
          rig.bodycamHelmet:rig.bodycamChest;
        const sample=sampleBodycamSocket(
          socket,this.replayBodycam.stabilization,
          this.replayBodycam.mount==='chest'?.16:.11);
        const elapsed=this.lastBodycamSampleTime===null?Infinity:
          Math.abs(s.seconds-this.lastBodycamSampleTime);
        const cut=this.lastBodycamSampleTime!==null&&(
          s.seconds<this.lastBodycamSampleTime-.0001||elapsed>.55);
        this.bodycamSmooth=smoothBodycamSample(this.bodycamSmooth,
          sample,dt,cut);
        this.lastBodycamSampleTime=s.seconds;
        applyBodycamCamera(this.bodycamCamera,this.bodycamSmooth,
          this.replayBodycam.fov,this.width/this.height);
        camera=this.bodycamCamera;
        cameraOwner=rig;
      }
    }
    // This single-pass owner mask avoids seeing through our own face/armor,
    // while retaining hands, arms and weapon. Restore all visibility after
    // the draw; the tactical world and historical rig remain authoritative.
    const masked:Array<[THREE.Mesh,boolean]>=[];
    if(camera===this.bodycamCamera&&cameraOwner){
      const hide=(obj:THREE.Object3D)=>{
        if(!(obj instanceof THREE.Mesh)||!obj.visible)return;
        masked.push([obj,true]);obj.visible=false;
      };
      for(const child of cameraOwner.chest.children)hide(child);
      cameraOwner.head.traverse(hide);
    }
    this.markScenePhase('postCamera');
    // Quick Play cold prewarm only: all visibility, fog, lights, camera and
    // shadow-update flags are now live before compileAsync. Keep the first
    // WebGL draw for a separate paint turn, without a second state update.
    if(deferFirstDraw&&camera===this.projectionCamera&&masked.length===0){
      this.preparedColdFrame={camera,at:s.seconds};
      return;
    }
    try{
      if(this.liveMainPassProfiler)this.liveMainPassProfiler.capture(()=>
       this.liveShadowSubmitProfiler!.capture(()=>this.renderMiniatureFocus(camera)));
      else if(this.liveShadowSubmitProfiler)this.liveShadowSubmitProfiler.capture(
       ()=>this.renderMiniatureFocus(camera));
      else this.renderMiniatureFocus(camera);
     }
    finally{
      for(const [mesh,visible] of masked)mesh.visible=visible;
      this.bodycamLastQa={
        active:camera===this.bodycamCamera,
        owner:camera===this.bodycamCamera?this.replayBodycam?.actorId??null:null,
        masked:masked.length,
        maskRestored:masked.every(([mesh,visible])=>mesh.visible===visible),
        frame:++this.renderFrameSerial,at:s.seconds
      };
    }
    this.markScenePhase('gpuSubmit');
    // Effects geometry is released before rebuilding the next frame; pooled
    // material instances are reused for every shot to reduce phone GC work.
  }
}
