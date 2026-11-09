import {groundBloodFootprintOccluded,groundMarkHiddenByWallFromCamera}
  from './breach-ground-geometry.ts';
import {lightingPresentation} from './equipment-lighting-presentation.ts';
import * as THREE from 'three';
import {SiteMaterialLifetime} from './rendering/site-material-lifetime.ts';
import {buildSiteMicroDebrisMeshes} from './rendering/breach-site-micro-debris.ts';
import {buildSiteExterior} from './rendering/breach-site-exterior-builder.ts';
import {buildArchitecturalOpenings,buildSiteDoors,buildSiteWindows,doorSweepArc,
 type SiteOpeningsHost} from './rendering/breach-site-openings-builder.ts';

import {APPROVED_GRAPHIC_LIGHTING}
 from './operator-studio-light-lab.ts';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION,studioShadowPalette}
 from './operator-studio-lighting.ts';
import {applyStudioGraphicLighting}
 from './operator-studio-graphic-lighting.ts';
import {applyWorldGraphicLighting} from './breach-graphic-world-lighting.ts';
import {BreachCombatEffectsPresenter} from './rendering/breach-combat-effects-presenter.ts';
import {presentActor,presentCivilian,presentDecor,resolveDoorPresentation}
 from './rendering/breach-3d-disclosure-presenter.ts';

import {windowShardPose,WINDOW_SHARDS_PER_PANE}
 from './rendering/window-shatter-presentation.ts';
import {createCivilianRig,updateCivilianRig,type CivilianRig}
 from './breach-civilian-visuals.ts';
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
import {projectedOperatorHeightPx,operatorShadowDetail,
 applyOperatorShadowLod,cavityQualityForDetail}
 from './operator-shadow-quality.ts';
import {PixelTextureLibrary,mapBoxPixelUV,mapPlanePixelUV,type PixelSurface} from './rendering/pixel-materials.ts';
import {roomPixelSurface,wallPixelSurface,fixturePixelSurface} from './worldgen/pixel-surface-selection.ts';
import {wearFinish} from './rendering/wear-finish.ts';
import {doubleSidedWallWear} from './rendering/wear-wall-geometry.ts';
import {ageMaterialColor} from './rendering/condition-materials.ts';
import {renderFixtureVisual,type FixtureVisualContext} from './worldgen/fixture-visuals.ts';
import {isArchitecturalSillCover} from './worldgen/architectural-cover-visuals.ts';

import {fixtureFrameTransform} from './rendering/fixture-frame-transform.ts';
import {exteriorBriefedAt,accessibleExteriorWall} from './breach-site-footprint.ts';
import {StaticSceneBatches} from './rendering/breach-static-batcher.ts';
import {ShadowUpdateController,stationaryShadowFingerprint,shadowEligibleBox}
  from './rendering/breach-shadow-controller.ts';
import {buildingTheme,roomFloor} from './worldgen/building-palettes.ts';




import {planEnvironmentalWear,type WearKind,type WearMark} from './worldgen/environment-wear.ts';
import {summarizeWear} from './worldgen/wear-diagnostics.ts';
import {conditionFloorPixels,effectiveCondition} from './worldgen/condition-visual.ts';

import {conditionWallPixels} from './worldgen/condition-wall.ts';
import {planObjectWear,type ObjectWear} from './worldgen/object-wear.ts';
import {planExposureWear} from './worldgen/wear-exposure.ts';
import {planActivityWear} from './worldgen/wear-sources.ts';
import {planHistoryWear} from './worldgen/surface-history.ts';
import {planThresholdTrafficWear} from './worldgen/threshold-traffic-wear.ts';
import {planInteriorFragments,type InteriorFragment} from './worldgen/interior-fragments.ts';
import {visibleSurfaceHeight} from './worldgen/decoration-anchors.ts';
import {wearPixels} from './rendering/pixel-decals.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './rendering/wear-opacity.ts';
import {pixelSign,type PixelSignKind} from './rendering/pixel-signage.ts';
import {pixelOverlay,type PixelOverlay} from './rendering/pixel-overlays.ts';
import {roofShouldShow} from './worldgen/roof-cutaways.ts';
import {W,H,activeWorldBounds,WALLS,COVER,initialDoors,doorCenter,doorLeafSegment,activeSite,
  type Pt,type Segment} from './breach-core.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {handlingIntentForMovement,teammateAheadForHandling}
  from './breach-handling-context.ts';
import {resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter,LIGHT_BEAM_SAMPLES}
 from './equipment-weapon-light-beam.ts';
import {type Site,type Room,type WideOpening} from './breach-site.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import {type Session,type TeamActor,team,knownAt,liveVisibility} from './breach-game.ts';
import {spatialSurfaceKnown,shotVisibility,architecturalOpeningKnown} from './breach-presentation.ts';
import {doorKnown} from './breach-intel.ts';
import {handlePoint,doorReachable,initDoor} from './breach-door.ts';
import {footAnchorReachable} from './breach-navigation.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {armedPrecontactStyle} from './breach-idle-life.ts';
import {WEAPONS} from './breach-combat.ts';
import {IMPACT_MARK_LIMIT,impactProfile} from './breach-effects.ts';
import {muzzleFlashCue,mostRecentActiveMuzzleShot,impactPulse}
 from './breach-combat-cues.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
import {doorProportions,DOOR_PANEL_END_RECESS,DOOR_FRAME_INSET,
  WALL_VISUAL_HEIGHT,DOOR_CLEAR_VISUAL_HEIGHT,DOOR_LEAF_VISUAL_HEIGHT} from './breach-door-proportions.ts';
import {paintFogMask,paintFogMemory,paintFogVisibility,occupiedFogRooms,
  FOG_WIDTH,FOG_HEIGHT,maskSize,type FogDiagnostic}
  from './breach-fog-mask.ts';
import {exteriorKnownFogRects,fogUvAt} from './breach-fog-domain.ts';
import {fogFingerprint,fogMemoryFingerprint} from './breach-fog-cache.ts';
import {wallOccludesFriendly,transitionWallOpacity} from './breach-camera-occlusion.ts';
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
const color=(hex:number)=>new THREE.Color(hex);
const mat=(hex:number,roughness=.9)=>new THREE.MeshStandardMaterial({
  color:hex,roughness,flatShading:true,
});
export class TacticalScene3D{
  private readonly hemisphere=new THREE.HemisphereLight(
   STUDIO_INSPECTION_LIGHT.sky,studioShadowPalette('plum-plus').ground,1.20);
  private readonly graphicFill=new THREE.DirectionalLight(
   studioShadowPalette('plum-plus').fill,.60);
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
  private lastFogSignature='';
  private lastMemoryFogSignature='';
  private lastMemoryFogSession:Session|null=null;
  private readonly fogLegacy=new URLSearchParams(location.search).has('fogLegacy');
  private readonly fogDiagnostic:FogDiagnostic=
    new URLSearchParams(location.search).get('fogDebug')==='palette'?
      'palette':'normal';
  private fogMemoryPaints=0;
  private fogSightPaints=0;
  private lastFogSession:Session|null=null;
  /** Counts submitted WebGL work; GPU timings require a separate timer. */
  performanceStats(){
    const info=this.renderer.info.render;
    // Renderer-managed GPU resource *counts*, not VRAM byte estimates.
    const memory=this.renderer.info.memory;
    return {calls:info.calls,triangles:info.triangles,
      geometryCount:memory.geometries,textureCount:memory.textures,
      staticBatch:this.staticBatches.stats(),
      siteMaterialCount:this.siteMaterials.size,
      actorRigCount:this.actors.size,
      civilianRigCount:this.civilianRigs.size,
      shadowRefreshes:this.shadowUpdates.refreshes,
      shadowReuses:this.shadowUpdates.reuses,
      shadowLodTransitions:this.shadowLodTransitions,
      fogMemoryPaints:this.fogMemoryPaints,
      fogSightPaints:this.fogSightPaints,
      graphicWorldMaterialCount:this.graphicWorldMaterialCount,
      graphicOperatorRestyles:this.graphicOperatorRestyles,
      graphicLookEnabled:this.graphicLookEnabled};
  }
  readonly renderer:THREE.WebGLRenderer;
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
        const polygon=visionPolygon(friendly.p,friendly.heading,240,
          undefined,s.doors,friendly.posture==='crouch');
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
    const overviewZoom=activeSite()?1.48:1.25;
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
  readonly canvas:HTMLCanvasElement;
  private root=new THREE.Group();
  private readonly staticBatches=new StaticSceneBatches();
  private readonly shadowUpdates=new ShadowUpdateController();
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
  private beamBlockerRevision=-1;private beamBlockers:Segment[]=[];
  private doors=new Map<string,{root:THREE.Group;leaf:THREE.Group;
    frame:THREE.Group;halo:THREE.Group;threshold:THREE.Mesh;
    wedge:THREE.Mesh;glassPane?:THREE.Mesh}>();
  private observedDoorGlass=new Map<string,boolean>();
  private observedDoorOpen=new Map<string,number>();
  private effectCache=new Map<number,{root:THREE.Group;line:THREE.Mesh;
    impact:THREE.Mesh;chips:THREE.Mesh[];material:THREE.MeshBasicMaterial;
    impactMaterial:THREE.MeshBasicMaterial}>();
  // One instanced draw for every stain and impact mark, rather than a mesh
  // and transparent material allocation per hit.
  private impactDecalMesh:THREE.InstancedMesh|null=null;
  private impactDecalMatrix=new THREE.Object3D();
  private bloodCameraDirection=new THREE.Vector3();
  private impactDecalColor=new THREE.Color();

  private rescueFigure:THREE.Group|null=null;
  private civilianRigs=new Map<string,CivilianRig>();
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
  private wallFade=new Map<THREE.Mesh,number>();
  private readonly roofGroups=new Map<string,THREE.Group>();
  private roofMaterial:THREE.MeshStandardMaterial|null=null;
  private intelSurfaces:{obj:THREE.Object3D;kind:'wall'|'cover';
    index:number}[]=[];
  private observedDetails:{obj:THREE.Object3D;position:Pt;
    microKey:string;fineKey:string}[]=[];
  private architecturalOpenings:{obj:THREE.Object3D;opening:WideOpening}[]=[];
  private wallMaterials=new Set<THREE.Material>();
  private effects=new THREE.Group();
  private target=new THREE.Vector3(339,0,413);
  private currentElev=55*Math.PI/180;
  private readonly minZoom=.65;
  private readonly maxZoom=6.0;
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
  private width=1;private height=1;private fogAt=-1;
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
  private sharedBoxGeometries=new Set<THREE.BufferGeometry>();
  private windowPaneMaterial:THREE.MeshStandardMaterial|null=null;
  private readonly wearMaterials=new Map<string,THREE.MeshBasicMaterial>();
  private readonly surfaceWearMaterials=new Map<string,THREE.MeshStandardMaterial>();
  private sitePatinaTextures:THREE.DataTexture[]=[];
  private sitePatinaMaterials:THREE.MeshBasicMaterial[]=[];
  private patinaRoomSurfaces:{room:Room;texture:THREE.DataTexture}[]=[];
  private patinaWallSurfaces:{index:number;texture:THREE.DataTexture}[]=[];
  /** Live slider scrubbing changes pixel masks, not the physical scene. */
  previewConditionMasks(site:Site,level:number){
    for(const item of this.patinaRoomSurfaces){
      const image=item.texture.image as {data:Uint8Array};
      image.data.set(conditionFloorPixels(site,item.room,level));
      item.texture.needsUpdate=true;
    }
    for(const item of this.patinaWallSurfaces){
      const image=item.texture.image as {data:Uint8Array};
      image.data.set(conditionWallPixels(site,item.index,level));
      item.texture.needsUpdate=true;
    }
  }
  private currentWear:WearMark[]=[];
  private objectWear:ObjectWear[]=[];
  private wearBoost=1;
  wearStats(){return summarizeWear(this.currentWear);}
  setWearExaggeration(multiplier:number){
    this.wearBoost=Math.max(1,Math.min(4,multiplier));
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
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,
      alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.autoUpdate=false;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
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
    this.scene.add(this.root,this.effects);
    this.buildWorld();
    if(this.graphicLookEnabled)
     this.graphicWorldMaterialCount=
      applyWorldGraphicLighting(this.root).materials;
    if(activeSite())this.view.zoom=1.48;
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
  private box(parent:THREE.Object3D,x:number,y:number,z:number,
    w:number,h:number,d:number,material:THREE.Material,cast=true){
    const key=w+':'+h+':'+d;
    let geometry=this.boxGeometryCache.get(key);
    if(!geometry){
      geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
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
    parent.add(decal);
  }
  private plane(parent:THREE.Object3D,x:number,z:number,w:number,d:number,
    y:number,material:THREE.Material){
    const mesh=new THREE.Mesh(mapPlanePixelUV(new THREE.PlaneGeometry(w,d),w,d,x,z),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  /** New mission replaces *only* architectural meshes. Soldiers and
   * camera remain alive, avoiding a WebGL context restart on each site.
   */
  applySite(site:Site|null){
    this.staticBatches.clear();
    // Friendly rigs survive map changes for responsive load-in. Hostile
    // models belong to the outgoing encounter and otherwise accumulate
    // indefinitely as procedural sites create new hostile actor IDs.
    for(const [id,actor] of this.actors){
      if(actor.side==='blue')continue;
      this.scene.remove(actor.root,actor.status,actor.beam,
        ...actor.contactShadows);
      // The physical rig owns its meshes and the flash attached to weapon.
      actor.physical.dispose();
      // Scene-owned status, beam and contact shadows are independent meshes.
      for(const mesh of [actor.status,actor.beam,...actor.contactShadows]){
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      this.actors.delete(id);
    }
    // Civilians share module-level geometry/material resources; retire only
    // the scene nodes, never the shared resources themselves.
    for(const rig of this.civilianRigs.values())this.scene.remove(rig.root);
    this.civilianRigs.clear();
    if(this.rescueFigure)this.rescueFigure.visible=false;
    // A new layout can reuse the same seed, object revision and light tick.
    // Drop old beam obstruction geometry and force surviving friendly beams
    // to resample LOS before they appear on the replacement site.
    this.beamBlockerTick=-1;this.beamBlockerSite=-1;
    this.beamBlockerRevision=-1;this.beamBlockers=[];
    for(const actor of this.actors.values()){
      actor.beam.visible=false;actor.beamLast=null;
    }
    this.staticBatches.clear();
    this.siteMaterials.reset();
    this.shadowUpdates.invalidate();
    for(const texture of this.sitePatinaTextures)texture.dispose();
    for(const material of this.sitePatinaMaterials)material.dispose();
    this.sitePatinaTextures.length=0;this.sitePatinaMaterials.length=0;
    this.patinaRoomSurfaces.length=0;this.patinaWallSurfaces.length=0;
    this.root.children.filter(c=>c!==this.fogUnknown&&
      c!==this.fogExplored).forEach(child=>{
      child.traverse(o=>{if(o instanceof THREE.Mesh&&
        !this.sharedBoxGeometries.has(o.geometry))o.geometry.dispose();});
      this.root.remove(child);
    });
    for(const material of this.wallMaterials)material.dispose();
    this.wallMaterials.clear();
    this.walls.length=0;this.wallFade.clear();
    this.doors.clear();this.windowGlass.clear();
    this.frameWindowsById.clear();
    if(this.windowShards)this.windowShards.count=0;
    this.observedDoorGlass.clear();
    this.currentWear=[];this.objectWear=[];
    this.roofGroups.clear();
    this.coverGroups.clear();this.coverFrameValues.clear();
    this.coverVisualStates.clear();
    this.intelSurfaces.length=0;this.observedDetails.length=0;
    this.architecturalOpenings.length=0;
    this.observedDoorOpen.clear();
    if(this.impactDecalMesh)this.impactDecalMesh.count=0;
    this.combatEffects.reset();
    for(const effect of this.effectCache.values()){
      this.effects.remove(effect.root);
      effect.material.dispose();effect.impactMaterial.dispose();
    }
    this.effectCache.clear();
    // Resize fog in the same authoritative coordinates used by nav/camera.
    const bounds=site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
    const fogSize=maskSize(site);
    if(this.fogCanvas.width!==fogSize.width)this.fogCanvas.width=fogSize.width;
    if(this.fogCanvas.height!==fogSize.height)this.fogCanvas.height=fogSize.height;
    if(this.fogMemoryCanvas.width!==fogSize.width)
      this.fogMemoryCanvas.width=fogSize.width;
    if(this.fogMemoryCanvas.height!==fogSize.height)
      this.fogMemoryCanvas.height=fogSize.height;
    this.smoothFog.geometry.dispose();
    this.smoothFog.geometry=new THREE.PlaneGeometry(
      bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
    this.smoothFog.position.set((bounds.minX+bounds.maxX)/2,
      1.05,(bounds.minY+bounds.maxY)/2);
    // One batched, nonoverlapping union of all actual room footprints.
    // No elevated parallax planes and no N separate draw calls per room.
    this.exteriorKnownFog.geometry.dispose();
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    for(const rect of site?exteriorKnownFogRects(site):[]){
      const corners=[
        {x:rect.x,y:rect.y},
        {x:rect.x,y:rect.y+rect.h},
        {x:rect.x+rect.w,y:rect.y+rect.h},
        {x:rect.x+rect.w,y:rect.y}
      ];
      const offset=positions.length/3;
      for(const p of corners){
        positions.push(p.x,1.05,p.y);
        const uv=fogUvAt(p,bounds);
        uvs.push(uv.u,uv.v);
      }
      indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.exteriorKnownFog.geometry=geometry;
    this.fogTexture.needsUpdate=true;
    this.buildWorld(site);
    if(site)this.buildStaticBatches();
    if(this.graphicLookEnabled)
     this.graphicWorldMaterialCount=
      applyWorldGraphicLighting(this.root).materials;
    this.root.add(this.fogUnknown,this.fogExplored);
    this.fogAt=-1;this.lastFogSignature='';this.lastFogSession=null;
    this.lastMemoryFogSignature='';this.lastMemoryFogSession=null;
    this.resetCamera();
  }
  /** Only site-static boxes owned by independently revealed props and door
   * frame roots are instanced. Cutaway walls, thresholds, animated leaves,
   * movable fixtures, glass and decals retain their existing meshes. */
  private buildStaticBatches(){
    this.root.updateWorldMatrix(true,true);
    for(const detail of this.observedDetails)
      this.staticBatches.collect(detail.obj,detail.obj,
        this.sharedBoxGeometries);
    for(const door of this.doors.values())
      this.staticBatches.collect(door.root,door.frame,
        this.sharedBoxGeometries,new Set([door.threshold,door.wedge]));
    this.staticBatches.flush(this.root);
  }
  private buildMicroDebris(site:Site){
    for(const mesh of buildSiteMicroDebrisMeshes(site,
      (hex,roughness,surface)=>this.solid(hex,roughness,surface)))
      this.root.add(mesh);
  }
  private buildGenerated(site:Site){
    const theme=buildingTheme(site.archetype,site.seed);
    const finishCondition=effectiveCondition(site);
    const age=(hex:number,surface:PixelSurface|undefined,variation=0)=>
      ageMaterialColor(hex,surface,finishCondition,variation);
    buildSiteExterior(site,{
      root:this.root,
      box:(...args)=>this.box(...args),
      plane:(...args)=>this.plane(...args),
      solid:(...args)=>this.solid(...args),
      overlay:kind=>this.groundOverlayMaterial(kind),
      track:material=>this.siteMaterials.track(material),
      age:(hex,surface)=>age(hex,surface)
    });
    this.objectWear=[...planObjectWear(site),...planExposureWear(site)];
    const marksOn=(owner:ObjectWear['owner'],index:number)=>
      this.objectWear.filter(m=>m.owner===owner&&m.index===index);
    this.buildMicroDebris(site);
    const decorativeRoomGroups=new Map<string,THREE.Group>();
    for(const room of site.rooms){
      const group=new THREE.Group();
      decorativeRoomGroups.set(room.id,group);this.root.add(group);
      // A floor remains physically present. Only the actual vision/memory
      // mask reveals its cells, never an entire rectangular room at once.
      const floorType=roomPixelSurface(site.archetype,room.purpose??room.kind);
      const base=this.solid(room.kind==='hall'?theme.hall:
        roomFloor(theme,room.purpose,room.tone),.92,floorType);
      // Connected blueprint cells make one continuous physical floor surface.
      // Legacy floor inset stays unchanged for historical visual parity.
      const floorInset=site.programLocked?0:2;
      this.box(group,room.x+room.w/2,-.8,room.y+room.h/2,
        room.w-floorInset,1.6,room.h-floorInset,base,false);
      // One whole-surface spatial aging field: rooms transform before decals.
      // Each room uses a small seeded map, with edge/fixture influences.
      if(effectiveCondition(site)>0){
        const texture=new THREE.DataTexture(conditionFloorPixels(site,room),64,64,THREE.RGBAFormat);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.magFilter=THREE.NearestFilter;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps=true;texture.needsUpdate=true;
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,
          depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
          side:THREE.DoubleSide});
        this.sitePatinaTextures.push(texture);this.sitePatinaMaterials.push(material);
        this.patinaRoomSurfaces.push({room,texture});
        const overlay=this.plane(group,room.x+room.w/2,room.y+room.h/2,
          room.w-floorInset,room.h-floorInset,.04,material);
        overlay.castShadow=false;overlay.receiveShadow=false;
      }
      // Pixel tile/board joints are already in the shared repeating texture.
      // Avoid redundant grout meshes and draw calls.
    }
    // Sparse, instanced fragments collect against physical room boundaries.
    // These are tiny render-only fragments, never new cover or navigation.
    const fragments=planInteriorFragments(site);
    const fragmentMaterial=this.solid(0x9b8e78,.98,'gravel');
    const fragmentGeometry=new THREE.BoxGeometry(1,1,1);
    const transform=new THREE.Object3D();
    // Group fragment instances once, instead of rescanning the complete
    // fragment list for every separate floor rectangle on large maps.
    const fragmentsByRoom=new Map<string,typeof fragments>();
    for(const fragment of fragments){
      const group=fragmentsByRoom.get(fragment.roomId)??[];
      group.push(fragment);fragmentsByRoom.set(fragment.roomId,group);
    }
    for(const room of site.rooms){
      const entries=fragmentsByRoom.get(room.id)??[];
      if(!entries.length)continue;
      const group=decorativeRoomGroups.get(room.id);if(!group)continue;
      const batch=new THREE.InstancedMesh(fragmentGeometry,fragmentMaterial,entries.length);
      const fragmentColors:Record<InteriorFragment['kind'],number>={
        flake:0xb6a893,dust:0x8b816d,plaster:0xc9bbaa,
        leaf:0x647257,paper:0xe3dccc,glass:0x8fbac0,
      };
      batch.frustumCulled=false;batch.castShadow=false;batch.receiveShadow=false;
      for(const [i,f] of entries.entries()){
        transform.position.set(f.x,.65,f.y);
        transform.rotation.set(0,f.angle,0);
        transform.scale.set(f.size,.5,f.size*.6);
        transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);
        batch.setColorAt(i,new THREE.Color(fragmentColors[f.kind]));
      }
      batch.instanceMatrix.needsUpdate=true;
      if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
      group.add(batch);
    }
    if(!fragments.length)fragmentGeometry.dispose();
    // Condition-dependent floor patina stays inside its room's fog group.
    // Decals are decorative only; they create no collision or cover.
    const wearColor:Record<WearKind,number>={
      dust:0x92816c,stain:0x655e4b,scrape:0xb2ae9e,scuff:0x444d47,
      oil:0x373834,grease:0x4e4538,rust:0xa2693f,chip:0xbab0a0,
      crack:0x4c4a43,scratch:0xd1cab7,drip:0x6e7771,mud:0x6b5641,
      footprint:0x655647,mineral:0xd3cec1,fade:0xc6bfaa,
      soot:0x343c39,moss:0x59714e,'paint-peel':0xbdb19f,
      fray:0xc4b9aa,abrade:0x918878,
    };
    this.currentWear=[...planEnvironmentalWear(site),...planActivityWear(site),
      ...planHistoryWear(site),...planThresholdTrafficWear(site)];
    for(const detail of this.currentWear){
      const roomGroup=decorativeRoomGroups.get(detail.roomId);
      if(!roomGroup)continue;
      const bucket=wearOpacityBucket(detail.opacity);
      const wearKey=detail.kind+':'+bucket;
      let material=this.wearMaterials.get(wearKey);
      if(!material){
        let texture=this.wearTextures.get(detail.kind);
        if(!texture){
          texture=new THREE.DataTexture(wearPixels(detail.kind),32,32,THREE.RGBAFormat);
          texture.colorSpace=THREE.SRGBColorSpace;
          texture.magFilter=THREE.NearestFilter;
          texture.minFilter=THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps=true;
          texture.needsUpdate=true;
          this.wearTextures.set(detail.kind,texture);
        }
        material=new THREE.MeshBasicMaterial({
          color:wearColor[detail.kind],map:texture,transparent:true,
          opacity:Math.min(1,WEAR_ALPHA_BANDS[bucket]*this.wearBoost),
          depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
          side:THREE.DoubleSide});
        this.wearMaterials.set(wearKey,material);
        this.mats.push(material);
      }
      const patch=this.plane(roomGroup,detail.x,detail.y,
        detail.width,detail.depth,.09,material);
      patch.rotation.z=detail.rotation;
      patch.castShadow=false;patch.receiveShadow=false;
    }
    // Light, room-aware roof slabs for known but unoccupied interiors.
    // Unknown rooms have NO roof geometry exposed above the ground fog.
    if(!this.roofMaterial){
      this.roofMaterial=new THREE.MeshStandardMaterial({
        color:theme.cap,roughness:.95,transparent:true,
        opacity:.21,depthWrite:false,side:THREE.DoubleSide});
      this.mats.push(this.roofMaterial);
    }else this.roofMaterial.color.setHex(theme.cap);
    // Camera cutaway roofs are independent of fog-of-war discovery.
    // Removing one to see a friendly does NOT reveal unseen floor cells.
    for(const room of site.rooms){
      const roof=new THREE.Group();
      roof.visible=false;this.root.add(roof);
      this.roofGroups.set(room.id,roof);
      this.box(roof,room.x+room.w/2,WALL_VISUAL_HEIGHT+3,room.y+room.h/2,
        Math.max(12,room.w+2),2,Math.max(12,room.h+2),
        this.roofMaterial,false).receiveShadow=false;
    }
    const wallMat=this.solid(age(theme.wall,wallPixelSurface(site.archetype)),.94,wallPixelSurface(site.archetype)),
      capMat=this.solid(theme.cap,.94,'concrete');
    const skirting=this.solid(theme.trim,.91,'painted-wood');
    // These known exterior frames must compose AFTER the ground-aligned
    // concealment overlay. Clone shared opaque materials once per site:
    // otherwise promoting a window sill would also expose interior props.
    // Every clone is retired by siteMaterials.reset() on mission swap.
    const facadeMaterialCache=new Map<THREE.Material,THREE.Material>();
    const promoteFacadeDetails=(group:THREE.Object3D)=>{
      group.traverse(node=>{
        if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
        const original=node.material;
        if(!original.transparent){
          let material=facadeMaterialCache.get(original);
          if(!material){
            material=this.siteMaterials.track(original.clone());
            material.transparent=true;
            material.needsUpdate=true;
            facadeMaterialCache.set(original,material);
          }
          node.material=material;
        }
        node.userData.fogFacade=true;
        node.renderOrder=1002;
      });
    };
    for(const [index,wall] of site.walls.entries()){
      const group=new THREE.Group();this.root.add(group);
      this.intelSurfaces.push({obj:group,kind:'wall',index});
      const {a,b}=wall,len=Math.hypot(b.x-a.x,b.y-a.y);
      if(len<5)continue;
      const exterior=accessibleExteriorWall(site,wall);
      const x=(a.x+b.x)/2,z=(a.y+b.y)/2;
      const angle=-Math.atan2(b.y-a.y,b.x-a.x);
      const individualWall=wallMat.clone();
      this.wallMaterials.add(individualWall);
      const body=this.box(group,x,WALL_VISUAL_HEIGHT/2,z,
        len,WALL_VISUAL_HEIGHT,9,individualWall);
      body.rotation.y=angle;
      // Whole-wall weathering follows the actual structural wall mesh.
      // Both faces share one deterministic texture, while a single instance
      // controls opacity during close-camera cutaways.
      if(effectiveCondition(site)>0){
        const texture=new THREE.DataTexture(conditionWallPixels(site,index),64,64,THREE.RGBAFormat);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.magFilter=THREE.NearestFilter;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps=true;texture.needsUpdate=true;
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,
          depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
          side:THREE.DoubleSide});
        this.sitePatinaTextures.push(texture);this.sitePatinaMaterials.push(material);
        this.patinaWallSurfaces.push({index,texture});
        body.userData.patinaMaterial=material;
        // A single mesh carries front and rear patina. Unlike two separate
        // transparent planes this submits one WebGL draw for each wall.
        const wearMesh=new THREE.Mesh(doubleSidedWallWear(len,WALL_VISUAL_HEIGHT-.4),material);
        wearMesh.castShadow=false;wearMesh.receiveShadow=false;
        body.add(wearMesh);
      }
      this.walls.push({mesh:body,mid:{x,y:z},segment:wall,index,exterior});
      // These child textures are already transparent, but would otherwise
      // draw BEFORE the fog and disappear from the restored façade.
      if(exterior)body.traverse(child=>{
        if(child!==body&&child instanceof THREE.Mesh)child.renderOrder=1002;
      });
      for(const mark of marksOn('wall',index))
        this.addSurfaceWear(body,mark,(mark.u-.5)*len,(mark.v-.5)*(WALL_VISUAL_HEIGHT-8),
          mark.face==='back'?-4.6:4.6,wallPixelSurface(site.archetype));
      const individualFoot=skirting.clone();
       this.wallMaterials.add(individualFoot);
       const foot=this.box(group,x,2,z,len,4,12,individualFoot,false);
       foot.rotation.y=angle;
       this.walls.push({mesh:foot,mid:{x,y:z},segment:wall,index,exterior});
      const individualCap=capMat.clone();
      this.wallMaterials.add(individualCap);
      const cap=this.box(group,x,WALL_VISUAL_HEIGHT+.3,z,len,2,11,
         individualCap,false);
      cap.rotation.y=angle;this.walls.push({mesh:cap,mid:{x,y:z},segment:wall,index,exterior});
    }
    const openingHost:SiteOpeningsHost={
      root:this.root,
      box:(...args)=>this.box(...args),
      solid:(...args)=>this.solid(...args),
      age:(hex,surface)=>age(hex,surface),
      track:material=>this.siteMaterials.track(material),
      addSurfaceWear:(...args)=>this.addSurfaceWear(...args),
      marksOn,promoteFacadeDetails,
      registerArch:(opening,obj)=>this.architecturalOpenings.push({opening,obj}),
      registerDoor:(id,visual)=>this.doors.set(id,visual),
      recordDoorGlass:(id,value)=>this.observedDoorGlass.set(id,value),
      recordDoorOpen:(id,value)=>this.observedDoorOpen.set(id,value),
      registerGlass:(id,glass)=>this.windowGlass.set(id,glass),
      registerWallSurface:(obj,index)=>this.intelSurfaces.push({obj,kind:'wall',index})
    };
    buildArchitecturalOpenings(site,openingHost,this.solid(theme.trim));
    const doorTrim=this.solid(age(theme.trim,'painted-wood'),.9,'painted-wood');
    const metal=this.solid(0x586665,.78,'industrial-steel');
    buildSiteDoors(site,openingHost,{theme,doorTrim,metal});
    const fixtureCtx:FixtureVisualContext={
      box:(parent,x,y,z,w,h,d,material,cast)=>
        this.box(parent,x,y,z,w,h,d,material,cast),
      solid:(hex,roughness,surface)=>this.solid(age(hex,surface),roughness,surface),
    };
    site.cover.forEach((c,i)=>{
      const group=new THREE.Group();this.root.add(group);
      this.coverGroups.set(i,group);
      this.intelSurfaces.push({obj:group,kind:'cover',index:i});
      // The aperture renderer already creates the sill/parapet. Its cover
      // footprint still blocks passage; do not place a second box on it.
      if(isArchitecturalSillCover(site,c))return;
      // Build models in local coordinates, so rotating a chair also rotates
      // its back, legs and surface wear around its actual center.
      group.position.set(c.x,0,c.y);
      group.rotation.y=(c.orientation??0)*Math.PI/2;
      const turned=(c.orientation??0)%2===1;
      const visual={...c,x:0,y:0,w:turned?c.h:c.w,h:turned?c.w:c.h};
      const intact=new THREE.Group(),debris=new THREE.Group();
      group.add(intact,debris);
      debris.visible=false;
      this.coverVisualStates.set(i,{intact,debris});
      // Five deterministic condition tones prevent furniture from looking
      // as though every object aged uniformly at precisely the same rate.
      const variant=((i%5)-2)/2;
      const localCtx:FixtureVisualContext={...fixtureCtx,
        solid:(hex,roughness,surface)=>this.solid(age(hex,surface,variant),roughness,surface)};
      renderFixtureVisual(intact,visual,i,localCtx,
        this.solid(age(theme.wood,'furniture-wood',variant),.9,'furniture-wood'),
        this.solid(age(0x465958,'metal',variant),.8,'metal'),
        this.solid(age(0x70715e,'fabric',variant),.9,'fabric'),
        this.solid(age(0x586665,'industrial-steel',variant),.78,'industrial-steel'));
      for(const mark of marksOn('fixture',i)){
        const height=visibleSurfaceHeight(c.fixture??'crate');
        if(height<8)continue;
        this.addSurfaceWear(intact,mark,(mark.u-.5)*visual.w,
          Math.min(height-2,Math.max(3,mark.v*height)),visual.h/2+.8,
          fixturePixelSurface(c.fixture));
      }
      // Destruction never scales a complete shelving/cabinet silhouette into
      // a miniature. A collapsed fixture becomes low, irregular remnants
      // centered on the ACTUAL reduced physical footprint instead.
      const residue=this.solid(age(theme.wood,'furniture-wood',variant),
        .93,'furniture-wood');
      const slag=this.solid(age(0x4c5955,'industrial-steel',variant),
        .85,'industrial-steel');
      for(let j=0;j<3;j++){
        const sx=(j%3-1)*visual.w*.105,sz=(Math.floor(j/3)-.5)*visual.h*.15;
        const width=Math.max(3.2,visual.w*(j%2?.16:.20));
        const depth=Math.max(3.2,visual.h*(j%2?.18:.20));
        const height=2.3+(j%3)*1.3;
        const fragment=this.box(debris,sx,height/2+.35,sz,
          width,height,depth,j%2?slag:residue,false);
        fragment.rotation.y=(j%2?-.22:.27);
        fragment.castShadow=false;
      }
    });
    // Glass does not impede sight; the low sill does impede traversal.
    if(!this.windowPaneMaterial){
      this.windowPaneMaterial=new THREE.MeshStandardMaterial({
        color:0xa7bdb9,roughness:.25,transparent:true,opacity:.35,
        side:THREE.DoubleSide,depthWrite:false});
      this.mats.push(this.windowPaneMaterial);
    }
    const paneMat=this.windowPaneMaterial;
    buildSiteWindows(site,openingHost,{paneMat,wallMat,doorTrim,metal});
    // Wall-mounted art and electrical hardware inherit room visibility.
    // They do not add collision, cover or new sightline blockers.
    const wallPaper=this.solid(0xb8ad8e,.97,'paper'),wallFrame=this.solid(0x615246,.9,'wood');
    const wallMetal=this.solid(0x697b79,.81,'metal'),wallDark=this.solid(0x343e3c,.82,'metal');
    const wallRed=this.solid(0xa66f57,.92,'paper');
    for(const detail of site.wallDetails??[]){
      if(!decorativeRoomGroups.has(detail.roomId))continue;
      const prop=new THREE.Group();
      prop.position.set(detail.x,detail.height,detail.y);
      prop.rotation.y=detail.angle;
      const w=detail.width,h=detail.depth;
      switch(detail.kind){
      case 'poster': case 'picture': case 'noticeboard':
        this.box(prop,0,0,0,w,h,.9,
          detail.kind==='noticeboard'?wallFrame:wallPaper,false);
        this.box(prop,0,0,.65,w-2,h-2,.5,
          detail.kind==='poster'?wallRed:
          detail.kind==='noticeboard'?wallPaper:wallMetal,false);
        this.box(prop,-w*.12,h*.14,.99,w*.45,1,.15,wallPaper,false);
        // A single shared texture communicates print/layout without extra geometry.
        const printed=new THREE.Mesh(new THREE.PlaneGeometry(w-3,h-3),
          this.signMaterial(detail.kind,site.seed));
        printed.position.z=1.18;prop.add(printed);
        break;
      case 'menu-board':case 'promotion-sign':case 'business-sign':
      case 'wayfinding-sign':case 'safety-sign':{
        const pixelKind=detail.kind==='menu-board'?'menu':
          detail.kind==='promotion-sign'?'sale':
          detail.kind==='business-sign'?'business':
          detail.kind==='safety-sign'?'safety':'wayfinding';
        const base=detail.kind==='safety-sign'?wallRed:
          detail.kind==='menu-board'?wallDark:wallMetal;
        this.box(prop,0,0,0,w,h,1.6,base,false);
        this.box(prop,0,0,1,w-2,h-2,.4,wallPaper,false);
        const front=new THREE.Mesh(new THREE.PlaneGeometry(w-3,h-3),
          this.signMaterial(pixelKind,site.seed+detail.roomId.length));
        front.position.z=1.25;prop.add(front);
        break;
      }
      case 'exit-sign':
        this.box(prop,0,0,0,w,h,1.3,wallRed,false);
        this.box(prop,0,0,.8,w*.67,2,.3,wallPaper,false);
        const exitGraphic=new THREE.Mesh(new THREE.PlaneGeometry(w-2,h-2),
          this.signMaterial('exit'));
        exitGraphic.position.z=1.05;prop.add(exitGraphic);
        break;
      case 'light-switch':
        this.box(prop,0,0,0,w,h,1.3,wallPaper,false);
        this.box(prop,0,0,1,1.4,3,.8,wallDark,false);
        break;
      case 'breaker-panel': case 'electrical-box':
        this.box(prop,0,0,0,w,h,3,wallMetal,false);
        this.box(prop,w*.25,0,1.8,1.5,h*.6,1,wallDark,false);
        if(detail.kind==='breaker-panel')
          for(const y of [-5,0,5])
            this.box(prop,-w*.16,y,2.2,w*.35,1.5,.7,wallDark,false);
        break;
      }
      this.root.add(prop);
      this.observedDetails.push({obj:prop,position:{x:detail.x,y:detail.y},
        microKey:'micro:'+Math.floor(detail.x/10)+','+Math.floor(detail.y/10),
        fineKey:'fine:'+Math.floor(detail.x/20)+','+Math.floor(detail.y/20)});
    }
    // Story props are discovered individually. Entering a room never
    // reveals its contents outside an operator's observed cone.
    const smallWood=this.solid(0x9a8669,.91,'wood'),smallPaper=this.solid(0xb8b4a0,.97,'paper');
    const smallGreen=this.solid(0x5f7b51,.94,'foliage'),smallClay=this.solid(0x947b60,.92,'concrete');
    for(const detail of site.dressing??[]){
      if(!decorativeRoomGroups.has(detail.roomId))continue;
      const prop=new THREE.Group();
      prop.position.set(detail.x,detail.elevation,detail.y);
      prop.rotation.y=detail.angle;
      switch(detail.kind){
      case 'mug':
        this.box(prop,0,2,0,5,4,5,smallClay,false);break;
      case 'books':
        for(let i=0;i<3;i++)this.box(prop,i*4-4,1.5,0,3,3,10,smallWood,false);
        break;
      case 'papers':
        this.box(prop,0,.35,0,12,.7,9,smallPaper,false);break;
      case 'tools':
        this.box(prop,0,1.5,0,13,2,3,smallWood,false);
        this.box(prop,3,1.5,3,3,3,7,smallPaper,false);break;
      case 'packages':{
        this.box(prop,0,5,0,11,10,9,smallWood,false);
        const label=new THREE.Mesh(new THREE.PlaneGeometry(7,5),
          this.signMaterial('package',site.seed));
        label.position.set(0,6,4.61);prop.add(label);break;
      }
      case 'plant':
        this.box(prop,0,4,0,8,8,8,smallClay,false);
        this.box(prop,0,12,0,11,9,11,smallGreen,false);break;
      case 'lamp':
        this.box(prop,0,8,0,2,16,2,smallWood,false);
        this.box(prop,0,17,0,12,7,12,smallPaper,false);break;
      case 'floor-lamp':
        this.box(prop,0,.8,0,10,1.6,10,smallWood,false);
        this.box(prop,0,15,0,2,29,2,smallWood,false);
        this.box(prop,0,31,0,13,9,13,smallPaper,false);break;
      case 'rug': case 'bedside-rug': case 'bath-mat':
      case 'welcome-mat': case 'runner':{
        const palette=detail.kind==='bath-mat'?0x728b83:
          detail.kind==='runner'?0x8a7c63:
          detail.kind==='welcome-mat'?0x635646:
          detail.kind==='bedside-rug'?0x8a7865:0x93765e;
        const textile=this.solid(palette,.95,'fabric');
        const border=this.solid(0xc1b295,.95,'fabric');
        const w=detail.width??42,d=detail.depth??24;
        this.box(prop,0,.11,0,w,.22,d,textile,false);
        if(w>16&&d>12)this.box(prop,0,.23,0,w-4,.08,d-4,border,false);
        if(w>21&&d>15)this.box(prop,0,.28,0,w-8,.08,d-8,textile,false);
        break;
      }
      }
      this.root.add(prop);
      this.observedDetails.push({obj:prop,position:{x:detail.x,y:detail.y},
        microKey:'micro:'+Math.floor(detail.x/10)+','+Math.floor(detail.y/10),
        fineKey:'fine:'+Math.floor(detail.x/20)+','+Math.floor(detail.y/20)});
    }
    // Important: avoid visual-only furniture outside authoritative cover.
  }
  private buildWorld(site=activeSite()){
    const earth=this.solid(0x34443e),road=this.solid(0x5d6358);
    const gravel=this.solid(0x6c7061),floorA=this.solid(0x817d6b);
    const floorB=this.solid(0x526b68),timber=this.solid(0x4b4437);
    const metal=this.solid(0x525e5d,.62),rust=this.solid(0x715e4d);
    const roof=this.solid(0x515d58),glass=this.solid(0x748b83,.18);
    if(site){this.buildGenerated(site);return;}
    this.plane(this.root,W/2,H/2,W,H,-2,earth);
    this.box(this.root,303,-1,630,124,1,215,road,false);
    this.box(this.root,294,-.15,643,7,.2,178,gravel,false);
    this.box(this.root,355,-.15,643,8,.2,178,gravel,false);
    // Two genuinely distinct interior floor constructions.
    this.box(this.root,247,-.65,316,270,1.5,432,floorA,false);
    this.box(this.root,485,-.65,316,207,1.5,432,floorB,false);
    const tile=this.solid(0x9a9683);
    const grout:Pt[]=[];
    for(let x=122;x<580;x+=28)for(let z=114;z<523;z+=28)
      grout.push({x,y:z});
    const strips=new THREE.InstancedMesh(
      new THREE.BoxGeometry(27,.10,1),tile,grout.length);
    const transform=new THREE.Object3D();
    grout.forEach((p,i)=>{
      transform.position.set(p.x,-.05,p.y);transform.updateMatrix();
      strips.setMatrixAt(i,transform.matrix);
    });
    strips.instanceMatrix.needsUpdate=true;strips.receiveShadow=true;
    this.root.add(strips);
    const crossGrout=new THREE.InstancedMesh(
      new THREE.BoxGeometry(1,.10,27),tile,grout.length);
    grout.forEach((p,i)=>{
      transform.position.set(p.x,-.04,p.y);transform.updateMatrix();
      crossGrout.setMatrixAt(i,transform.matrix);
    });
    crossGrout.instanceMatrix.needsUpdate=true;
    crossGrout.receiveShadow=true;this.root.add(crossGrout);
    // Each wall is one real mesh. Simulation geometry remains authoritative.
    for(let i=0;i<WALLS.length;i++){
      const segment=WALLS[i];
      const p1=segment.a,p2=segment.b;
      const dx=p2.x-p1.x,dz=p2.y-p1.y;
      const len=Math.hypot(dx,dz);
      const mesh=this.box(this.root,(p1.x+p2.x)/2,WALL_VISUAL_HEIGHT/2,
        (p1.y+p2.y)/2,len+3,WALL_VISUAL_HEIGHT,9,this.solid(i===4?0x81877d:0xb4a991));
      mesh.rotation.y=-Math.atan2(dz,dx);
      this.walls.push({mesh,mid:{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2},segment,index:i,exterior:i<5});
      // Dark skirting separates the wall footprint from similar floor values.
      const skirting=this.box(this.root,mesh.position.x,2,mesh.position.z,
        len+4,4,12,this.solid(0x36453f),false);
      skirting.rotation.y=mesh.rotation.y;
       this.walls.push({mesh:skirting,mid:{x:mesh.position.x,y:mesh.position.z},segment,index:i,exterior:i<5});
      // A dark, legible wall cap communicates height in either camera mode.
      const cap=this.box(this.root,mesh.position.x,WALL_VISUAL_HEIGHT+.3,
        mesh.position.z,
        len+4,2,11,this.solid(0x51483a),false);cap.rotation.y=mesh.rotation.y;
      this.walls.push({mesh:cap,mid:{x:mesh.position.x,y:mesh.position.z},segment,index:i,exterior:i<5});
    }
    for(const x of [209,502]){
      const pane=this.box(this.root,x+25,16,99,51,21,2,glass,false);
      this.box(this.root,x+25,28,97,56,2,5,timber,false);
      this.box(this.root,x+25,4,97,56,2,5,timber,false);
      pane.castShadow=false;
    }
    // 080: Doorways are real stateful meshes, not slabs that disappear.
    const doorMat=this.solid(0xab8655),doorTrim=this.solid(0xe0c28c);
    const thresholdMat=this.solid(0xc19b5c);
    for(const [doorIndex,sourceDoor] of initialDoors().entries()){
      const door=initDoor(sourceDoor,doorIndex);
      const width=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
      const p=doorCenter(door);
      const group=new THREE.Group();group.position.set(p.x,0,p.y);
      group.rotation.y=-Math.atan2(door.b.y-door.a.y,door.b.x-door.a.x);
      const frame=new THREE.Group();group.add(frame);
      const profile=doorProportions(door);
      const jambX=width/2+profile.jambWidth/2-DOOR_FRAME_INSET;
      for(const side of [-1,1]){
        this.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,0,
          profile.jambWidth,DOOR_CLEAR_VISUAL_HEIGHT,profile.jambDepth,doorTrim);
        this.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,
          profile.jambDepth/2+1.25,profile.casingWidth,
          DOOR_CLEAR_VISUAL_HEIGHT-3,
          profile.casingDepth,doorTrim,false);
      }
      this.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight/2,0,
        width+2*profile.jambWidth,
        profile.headerHeight,profile.headerDepth,doorTrim);
      this.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight+.5,1.50,
        width+2*profile.jambWidth+1,
        1.1,profile.headerDepth+.8,doorTrim,false);
      const threshold=this.box(frame,0,.275,0,width,
        profile.thresholdHeight,profile.thresholdDepth,thresholdMat,false);
      const hinge=new THREE.Group();hinge.position.x=door.hinge==='b'?width/2:-width/2;
      group.add(hinge);
      this.box(hinge,(door.hinge==='b'?-1:1)*width/2,
        DOOR_LEAF_VISUAL_HEIGHT/2,0,
        width-2*DOOR_PANEL_END_RECESS,DOOR_LEAF_VISUAL_HEIGHT,profile.leafThickness,doorMat);
      for(const side of [-1,1])
        this.box(hinge,(door.hinge==='b'?-1:1)*width*.7,18,
          side*(profile.leafThickness/2+1),3,4,2,doorTrim,false);
      const halo=doorSweepArc(door,width);
      group.add(halo);
      this.root.add(group);
      const wedge=this.box(frame,0,1.9,6,6,2.7,6,thresholdMat,false);
      wedge.visible=false;
      this.doors.set(door.id,{root:group,leaf:hinge,frame,halo,threshold,wedge});
      this.observedDoorOpen.set(door.id,0);
    }
    // Furniture height matches cover classification: low crates vs high cabinets.
    for(let i=0;i<COVER.length;i++){
      const c=COVER[i],height=c.low?11:27;
      this.box(this.root,c.x,height/2,c.y,c.w,height,c.h,
        i%3===0?metal:i%3===1?timber:rust);
      if(c.low){
        this.box(this.root,c.x,height+1,c.y,c.w-5,2,c.h-5,roof,false);
        for(let j=0;j<3;j++)
          this.box(this.root,c.x-c.w/3+j*c.w/3,height+2,c.y,
            2,3,c.h-4,timber,false);
      }else{
        for(let j=0;j<3;j++)
          this.box(this.root,c.x-c.w/3+j*c.w/3,height*.55,c.y+c.h/2+.8,
            1,8,2,metal,false);
      }
    }
    // Authored practical scenery beyond the collision boxes.
    const objects=[
      [190,143,32,17,12],[232,458,44,13,19],[440,306,21,25,20],
      [510,340,48,12,16],[175,570,62,14,26],[489,653,46,16,33],
    ];
    for(const [x,z,w,h,d] of objects){
      this.box(this.root,x,h/2,z,w,h,d,timber);
      this.box(this.root,x,h+.5,z,w+2,1,d+2,metal,false);
    }
    // Yard fence with actual posts, worn cross rails, perimeter clutter.
    for(const x of [62,608])for(let z=90;z<=560;z+=45){
      this.box(this.root,x,11,z,4,22,4,timber);
      if(z<545)this.box(this.root,x,13,z+22,2,2,44,rust,false);
    }
    const barrel=this.solid(0x6b7369),barrelTop=this.solid(0x343c39);
    for(const [x,z] of [[170,653],[473,654],[545,701],[102,656],
      [116,557],[548,574]]){
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(10,10,20,9),barrel);
      cyl.position.set(x,10,z);cyl.castShadow=true;this.root.add(cyl);
      const top=new THREE.Mesh(new THREE.CylinderGeometry(10.1,10.1,2,9),barrelTop);
      top.position.set(x,21,z);this.root.add(top);
    }
    // Small intentional vegetation grouped around the outside boundaries.
    const foliage=[this.solid(0x526749),this.solid(0x64724d),
      this.solid(0x4b5f4b)],stem=this.solid(0x565546);
    for(let i=0;i<105;i++){
      const x=15+((i*73)%607),z=21+((i*129)%697);
      if(x>107&&x<595&&z>98&&z<545)continue;
      if(Math.abs(x-303)<73&&z>525)continue;
      const m=this.box(this.root,x,3.5,z,2,7,2,stem,false);
      const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),
        foliage[i%3]);bush.position.set(x,9,z);
      bush.scale.set(6+(i%5)*2,6+(i%4)*2,7+(i%3)*2);
      bush.castShadow=i%4===0;this.root.add(bush);
      void m;
    }
    // Exterior hardware makes the station identifiable as a real place.
    const pole=this.solid(0x655e4d);
    for(const [x,z] of [[84,150],[603,510]]){
      this.box(this.root,x,52,z,5,104,5,pole);
      this.box(this.root,x,98,z,37,3,3,timber);
    }
    // A translucent roof lip gives silhouette without covering any rooms.
    const lip=this.box(this.root,352,36,100,474,5,18,roof,false);
    lip.castShadow=false;
    this.box(this.root,348,35,535,460,3,13,roof,false);
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
  setMode(mode:ViewMode){
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
    this.fogAt=-1;
    this.updateCamera(1);
  }
  /** Yaw is always around the current map focus, never the selected unit. */
  setYaw(angle:number){
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
      this.view.pitch-dy*.004,35*Math.PI/180,Math.PI/2);
    this.setYaw(this.view.yaw-dx*.007);
  }
  /** A reset is a predictable full-board fit, independent of unit selection. */
  resetCamera(){
    const bounds=activeWorldBounds();
    this.view.focus={x:(bounds.minX+bounds.maxX)/2,
      y:(bounds.minY+bounds.maxY)/2};this.view.yaw=Math.PI/4;
    this.view.zoom=activeSite()?1.48:1.25;
    this.view.pitch=this.view.mode==='top'?Math.PI/2:55*Math.PI/180;
    this.updateCamera(1);
  }
  /**
   * Drag world beneath a finger rather than guessing using camera-right/up
   * vectors. Works at any pitch/yaw including near-vertical overhead.
   */
  panBetween(prevX:number,prevY:number,nextX:number,nextY:number){
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
      this.view.focus.x+dx,activeWorldBounds().minX-marginX,
      activeWorldBounds().maxX+marginX);
    this.view.focus.y=THREE.MathUtils.clamp(
      this.view.focus.y+dy,activeWorldBounds().minY-marginY,
      activeWorldBounds().maxY+marginY);
    this.updateCamera(0);
  }
  /**
   * Pinch/wheel zoom preserves the world point beneath the gesture centroid.
   * Does not recenter to a soldier or jump to the center of the map.
   */
  zoomAt(factor:number,x:number,y:number){
    if(!Number.isFinite(factor)||factor<=0)return;
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
    const b=activeWorldBounds();
    const diagonal=Math.hypot(b.maxX-b.minX,b.maxY-b.minY);
    return Math.max(820,(diagonal+66)/(this.width/Math.max(1,this.height)));
  }
  updateCamera(dt:number){
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
    const bounds=activeWorldBounds();
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
  /** Stage initial visible operator geometry separately from the first
   * tactical WebGL frame. Existing soldier models are reused without reset. */
  prepareOperatorModel(a:TeamActor):boolean{
    if(this.actors.has(a.id))return false;
    this.soldier(a);
    return true;
  }
  private soldier(a:TeamActor){
    const physical=createOperatorRig(a.id,a.side,true);
    const {root,weapon,pack}=physical;
    if(this.graphicLookEnabled)
     weapon.userData.fieldworkWeaponPresentation=true;
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(3.5),
      new THREE.MeshBasicMaterial({color:0xffd59e,transparent:true,
        opacity:.94,depthWrite:false}));
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
    beam.frustumCulled=false;beam.visible=false;beam.renderOrder=4;
    this.scene.add(beam);
    const status=new THREE.Mesh(new THREE.RingGeometry(12,16,30),
      new THREE.MeshBasicMaterial({color:0xdb8d76,transparent:true,
        opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
    status.rotation.x=-Math.PI/2;status.visible=false;
    this.scene.add(root,status);
    // Subtle cheap foot-contact shadows complement the real shadow map on
    // small mobile screens, where the filtered shadow can otherwise vanish.
    const contactShadows=[0,1].map(()=>{
      const shadow=new THREE.Mesh(new THREE.CircleGeometry(7,14),
        new THREE.MeshBasicMaterial({color:0x0b1515,transparent:true,
          opacity:.20,depthWrite:false}));
      shadow.rotation.x=-Math.PI/2;shadow.position.y=.15;
      this.scene.add(shadow);return shadow;
    });
    this.actors.set(a.id,{side:a.side,root,flash,pack,weapon,status,
      beam,beamLast:null,physical,contactShadows});
  }
  update(s:Session,selected:string,dt:number,
    focusedDoorId:string|null=null,omniscient=false,
    replay?:ReplayPresentation|null,
    renderFrame?:RenderFrame|null,
    liveMotion?:ReplayPresentation|null,
    replayDisclosurePolicy:ReplayDisclosure|null=null,
    replayDoorHistory:ReplayDoorKnowledgeHistory|null=null,
    personalGroundEvidence:ReadonlySet<string>|null=null,
    replayWindowHistory:ReplayWindowKnowledgeHistory|null=null){
    if(this.view.mode==='plan2d')return;
    if(this.miniFocusMode!=='off'){
      this.miniFocusSession=s;
      this.miniFocusDoorId=focusedDoorId;
      this.miniFocusSelectedId=selected;
    }
    const bodycamAudition=!!this.replayBodycam&&
      replayDisclosurePolicy?.mode==='operator'&&
      replayDisclosurePolicy.observerId===this.replayBodycam.actorId;
    if(this.appliedLightingMode!==s.lightingMode){
      const mood=lightingPresentation(s.lightingMode);
      this.hemisphere.intensity=this.graphicLookEnabled?
       mood.hemisphere*(STUDIO_INSPECTION_LIGHT.hemiIntensity/1.18):
       mood.hemisphere;
      this.sun.intensity=mood.sun;
      if(this.graphicLookEnabled)
       this.graphicFill.intensity=STUDIO_INSPECTION_LIGHT.fillIntensity*
        1.35*(mood.sun/2.35);
      this.appliedLightingMode=s.lightingMode;
    }
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
    }
    // Personal replay (including non-bodycam operator views) reads only
    // historically observed panes. The global replay reads its exact frame.
    // Scrubbing cannot inherit future breakage from a previous seek.
    const personalWindows=replayDisclosurePolicy?.mode==='operator';
    if(!this.windowShards){
      const shardMaterial=new THREE.MeshStandardMaterial({
        color:0xaacac3,roughness:.27,metalness:.08,flatShading:true,
        transparent:true,opacity:.76,depthWrite:false,side:THREE.DoubleSide});
      this.mats.push(shardMaterial);
      this.windowShards=new THREE.InstancedMesh(
        new THREE.TetrahedronGeometry(.85,0),shardMaterial,96);
      this.windowShards.count=0;
      this.windowShards.frustumCulled=false;
      this.windowShards.castShadow=false;
      this.windowShards.receiveShadow=false;
      this.windowShards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.effects.add(this.windowShards);
    }
    let shardCount=0;
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
      for(let i=0;i<WINDOW_SHARDS_PER_PANE&&shardCount<96;i++){
        const part=windowShardPose(current,s.seconds,i);
        if(!part)continue;
        this.shardMatrix.position.set(part.x,part.y,part.z);
        this.shardMatrix.rotation.set(part.rx,part.ry,part.rz);
        this.shardMatrix.scale.setScalar(part.scale);
        this.shardMatrix.updateMatrix();
        this.windowShards.setMatrixAt(shardCount++,this.shardMatrix.matrix);
      }
    }
    if(this.windowShards.count!==shardCount){
      this.windowShards.count=shardCount;
    }
    if(shardCount)this.windowShards.instanceMatrix.needsUpdate=true;
    this.updateCamera(dt);
    this.fogAt+=dt;
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
    // The shadow map follows the active encounter to retain contact detail.
    const shadowPoint=team(s).find(a=>a.id===selected)?.p??this.view.focus;
    this.sun.position.set(shadowPoint.x-145,250,shadowPoint.y+175);
    this.sun.target.position.set(shadowPoint.x,0,shadowPoint.y);
    this.sun.target.updateMatrixWorld();
    // Hide undiscovered geometry at object level, including its shadows.
    // An operator physically standing in a room can still read that room's
    // structure even when their viewing cone is pointed at one corner.
    const occupiedRoomIds=new Set(occupiedFogRooms(s).map(room=>room.id));
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
      const exteriorSetDressing=physicalDirector&&item.kind==='cover'&&
        s.intel.mode==='exterior-known'&&!!cover&&
        exteriorBriefedAt(s.site??undefined,{x:cover.x,y:cover.y});
      // The Director can frame already-briefed outdoor objects without
      // making them pop into existence mid-shot. Live tactical discovery,
      // personal bodycam evidence and all interior cover remain unchanged.
      item.obj.visible=item.kind==='wall'&&physicalDirector?true:
        knownFacade||exteriorSetDressing?true:
        item.kind==='cover'?
          personalCoverVisible(squadKnown,bodycamAudition,personalGroundEvidence,
            cover??null):squadKnown;
    }
    // Unlike the room's floor, decorative props must be individually
    // seen (or remembered at their own position) before they are rendered.
    for(const opening of this.architecturalOpenings)
      opening.obj.visible=architecturalOpeningKnown(s,opening.opening,omniscient);
    for(const detail of this.observedDetails){
      // Object positions are site-static: precompute tile keys at build time.
      detail.obj.visible=presentDecor(s,detail,omniscient,
        bodycamAudition,personalGroundEvidence);
      this.staticBatches.setVisible(detail.obj,detail.obj.visible);
    }
    // Director cuts walls around its actual historical friendly focal group,
    // rather than a potentially unrelated manually selected soldier.
    const fromCamera=this.projectionCamera.position.clone().sub(this.target);
    const pawn=this.replayDirectorFocus??
      team(s).find(a=>a.id===selected&&a.health>0)?.p;
    const subjects=physicalDirector&&this.replayDirectorLens==='ortho'?
      team(s).map(a=>a.p):this.replayDirectorSubjects.length?
      this.replayDirectorSubjects:pawn?[pawn]:[];
    const maxCutDistance=Math.max(40,Math.min(150,
      90/Math.tan(Math.max(.38,this.view.pitch))));
    for(const wall of this.walls){
      const cut=!bodycamAudition&&this.view.mode==='iso'&&
        (!physicalDirector||this.replayDirectorLens==='ortho')&&
        subjects.some(subject=>wallOccludesFriendly(
          wall.segment,subject,{x:fromCamera.x,y:fromCamera.z},maxCutDistance));
      // CUTAWAY never makes the whole building transparent. Only walls
      // between the camera and the selected friendly/Director subjects fade.
      // Historical knowledge and object visibility remain authoritative.
      // For orthographic Director, the player-side friendly silhouette
      // remains readable behind a camera-facing wall. Wall structure
      // stays recognizable as a faint cutaway, never an operator fade.
      const opacity=bodycamAudition?1:physicalDirector?
        cut?.12:1:transitionWallOpacity(
          this.wallFade.get(wall.mesh)??1,cut,dt,
          this.replayXrayOn?0.19:0.38);
      this.wallFade.set(wall.mesh,opacity);
      const translucent=opacity<.995;
      // Known exterior wall surfaces retain their foreground/cutaway
      // rendering policy. The ground-aligned fog itself now depth-tests:
      // unknown interiors stay covered without crossing visible silhouettes.
      const knownFacade=wall.exterior&&!omniscient&&!bodycamAudition&&
        spatialSurfaceKnown(s,'wall',wall.index);
      const surfaceTransparent=translucent||knownFacade;
      const material=wall.mesh.material as THREE.MeshStandardMaterial;
      if(material.transparent!==surfaceTransparent){
        material.transparent=surfaceTransparent;
        material.depthWrite=!translucent;material.needsUpdate=true;
      }
      material.opacity=opacity;
      const patina=wall.mesh.userData.patinaMaterial as THREE.MeshBasicMaterial|undefined;
      if(patina)patina.opacity=Math.max(physicalDirector?.08:.24,
        1-(1-opacity)*1.226);
      wall.mesh.renderOrder=surfaceTransparent?1001:0;
    }
    // The selected endpoint is stable across this entire render. Do not
    // rebuild team/plan arrays once per door on large generated sites.
    const selectedActor=s.operators.find(a=>a.side==='blue'&&a.id===selected);
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
      const directlyObserved=!personal&&liveVisibility(s,doorCenter(door));
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
          const needsTransparency=leafCut||facade;
          if(local.transparent!==needsTransparency||
             local.depthWrite===leafCut){
            local.transparent=needsTransparency;
            local.depthWrite=!leafCut;
            local.needsUpdate=true;
          }
          local.opacity=leafCut?.12:1;
          child.renderOrder=leafCut?1001:facade?1002:0;
        });
      }
      const reachable=selectedActor&&selectedActor.health>0&&
        (doorReachable(selectedActor.p,door)||
          (!!selectedEndpoint&&doorReachable(selectedEndpoint,door)));
      const focused=focusedDoorId===door.id;
      object.halo.visible=!replayDisclosurePolicy&&
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
    // Switching procedurally generated sites may change hostile counts.
    // Hide cached actors absent from the new encounter.
    const current=this.frameActorIds;current.clear();
    for(const actor of s.operators)current.add(actor.id);
    for(const [id,object] of this.actors)if(!current.has(id)){
      object.root.visible=false;object.status.visible=false;
      for(const shadow of object.contactShadows)shadow.visible=false;
    }
    // Civilian meshes are created only once visibly encountered, then
    // reused; unrevealed people cannot leak through walls or player fog.
    const present=this.frameCivilianIds;present.clear();
    for(const civil of s.civilians)present.add(civil.id);
    for(const [id,rig] of this.civilianRigs){
      if(present.has(id))continue;
      this.scene.remove(rig.root);this.civilianRigs.delete(id);
    }
    for(const civil of s.civilians){
      const visible=presentCivilian(s,civil,omniscient,replayDisclosurePolicy);
      let rig=this.civilianRigs.get(civil.id);
      if(!visible&&!rig)continue;
      if(!rig){
        rig=createCivilianRig(civil);
        this.civilianRigs.set(civil.id,rig);
        this.scene.add(rig.root);
      }
      updateCivilianRig(rig,civil,s.seconds);
      rig.root.visible=visible;
    }
    if(s.rescue&&!s.civilians.some(c=>c.rescueTarget)){
      if(!this.rescueFigure){
        this.rescueFigure=new THREE.Group();
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
      this.rescueFigure.visible=!bodycamAudition&&
        (omniscient||liveVisibility(s,s.rescue.p));
      this.rescueFigure.position.set(s.rescue.p.x,0,s.rescue.p.y);
    }else if(this.rescueFigure)this.rescueFigure.visible=false;
    for(const actor of s.operators){
      const visible=presentActor(s,actor,omniscient,replayDisclosurePolicy);
      // Spawn full 3D rigs only when needed. Enemy AI, LOS and simulation
      // always exist; hidden actors incur no model construction on mobile.
      if(!visible&&!this.actors.has(actor.id))continue;
      if(!this.actors.has(actor.id))this.soldier(actor);
      const object=this.actors.get(actor.id)!;
      object.root.visible=visible;
      const hitTime=s.seconds-actor.lastHitAt;
      const down=actor.health<=0;
      object.status.visible=object.root.visible&&
        !down&&(hitTime>=0&&hitTime<.28);
      if(object.status.visible){
        object.status.position.set(actor.p.x,1.15,actor.p.y);
        const pulse=down?1.15:1+.45*(1-hitTime/.28);
        object.status.scale.setScalar(pulse);
        const statusMat=object.status.material as THREE.MeshBasicMaterial;
        statusMat.opacity=down ? .85 :Math.max(0,1-hitTime/.28);
        statusMat.color.setHex(down?0xd99e83:0xf4c7aa);
      }
      if(!object.root.visible)continue;
      // Presentation samples do not alter authoritative collision or shot state.
      const drawActor=interpolatedActor(actor,renderFrame);
      // Airborne body is a fixed-tick simulation outcome. Keep the 3D
      // miniature at its authored horizontal position, lifted only by the
      // recorded traversal arc (never by render-time speculative physics).
      object.root.position.set(drawActor.x,actor.traversalElevation,drawActor.z);
      // Build 120: the pose solver is the only writer of actor anatomical,
      // firearm and hit-reaction transforms; the scene owns world placement.
      const downProgress=actor.health<=0?
        Math.min(1,Math.max(0,(poseSeconds-actor.lastDownAt)/.78)):0;
      const hitAge=poseSeconds-actor.lastHitAt;
      const hitFade=actor.health>0&&hitAge>=0&&hitAge<.32?
        1-hitAge/.32:0;
      const reloadDuration=actor.reloadDuration||
        WEAPONS[actor.weapon].reload*
        (actor.injuryStage===2?1.5:actor.injuryStage===1?1.1:1);
      const muzzleAttachment=actor.weaponConfiguration?.slots.muzzle;
      // Rapid bursts can have overlapping live shot cues. Display the
      // newest physically recorded flash, never an older first match.
      const firing=mostRecentActiveMuzzleShot(s.shots,actor.id,
        actor.weapon,muzzleAttachment,
        shot=>omniscient||shotVisibility(s,shot).flash);
      const flashCue=muzzleFlashCue(actor.weapon,
        firing?.age??Infinity,muzzleAttachment);
      object.flash.visible=flashCue.active&&actor.health>0;
      const gunTip=actor.weaponConfiguration?
       resolveWeaponAssembly(actor.weaponConfiguration):null;
      object.flash.position.x=gunTip?.muzzleX??19.5;
      object.flash.position.y=gunTip?.muzzleY??0;
      if(flashCue.active)object.flash.scale.setScalar(flashCue.scale);
      const plannedDoor=actor.plan[0]?.kind==='door'?
        s.doors.find(d=>d.id===actor.plan[0].doorId):undefined;
      const activeDoor=plannedDoor??(actor.lastDoorId?
        s.doors.find(d=>d.id===actor.lastDoorId):undefined);
      const handle=activeDoor?
        actor.lastDoorMethod==='kick'?
          (()=>{const leaf=doorLeafSegment(activeDoor);
            return {x:leaf.a.x+(leaf.b.x-leaf.a.x)*.78,
              y:leaf.a.y+(leaf.b.y-leaf.a.y)*.78};})():
          handlePoint(activeDoor):undefined;
      const threat=actor.targetId?
        s.operators.find(o=>o.id===actor.targetId):null;
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
      const stackCrowded=(handlingIntent==='stack'||
        handlingIntent==='door'||handlingIntent==='entry')&&
        s.operators.some(peer=>peer!==actor&&peer.side===actor.side&&
          peer.health>0&&Math.hypot(peer.p.x-actor.p.x,
            peer.p.y-actor.p.y)<40);
      const friendlyAhead=stackCrowded||teammateAheadForHandling(
        actor.p,actor.heading,s.operators,actor);
      // Physical contact is queried from the actual interpolated barrel,
      // never from a long ray projected along the feet/body heading.
      const clearance=weaponClearance({
        x:drawActor.x,z:drawActor.z,heading:drawActor.heading,
        weaponYaw:drawActor.weaponYaw,weapon:actor.weapon,
         weaponConfiguration:actor.weaponConfiguration,
        equipment:actor.equipment,aim:actor.aim,velocity:actor.velocity,recoil:actor.recoil,
        posture:actor.posture,threatRange,friendlyNear:friendlyAhead
      },s.doors);
      const lightOn=!!actor.weaponLightOn&&actor.health>0&&
        actor.weaponConfiguration?.slots.light==='light-compact'&&object.root.visible;
      object.beam.visible=lightOn;
      if(lightOn){
       const tick=Math.floor(s.seconds*8),siteSeed=s.site?.seed??-1;
       if(tick!==this.beamBlockerTick||siteSeed!==this.beamBlockerSite||
          this.beamBlockerRevision!==s.objectRevision){
        this.beamBlockers=lightBeamBlockers(WALLS,s.doors,COVER);
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
      const px=projectedOperatorHeightPx(this.camera,this.height);
      const shadowDetail=operatorShadowDetail(px,this.quality.mode);
      object.physical.root.userData.fieldworkCavityQuality=
        cavityQualityForDetail(shadowDetail);
      // Shared, bounded inventory projection for both visible containers.
      const carried=actor.equipment?
       carryPlacementLedger(actor.equipment,actor.spareMagazines):[];
      const carriedMagazines=carried.filter(p=>p.kind==='magazine');
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
      poseOperator(object.physical,{
        x:drawActor.x,z:drawActor.z,heading:drawActor.heading,
        velocity:actor.traversal?0:actor.velocity,
        seconds:poseSeconds,idleLifeSeconds:actorIdleSeconds,
        precontact,
        stride:actor.traversal?0:actor.stride,
        traversalProgress:actor.traversal?
          actor.traversalElapsed/Math.max(.001,actor.traversal.duration):0,
        appearanceSeed:actor.appearanceSeed,
        equipment:actor.equipment,wardrobe:actor.wardrobe,
        // B30: live and replay use the new posing by default.
        // This changes rendered anatomy only, not fixed-step ammo/shot.
        poseV3Preview:true,poseV4ReloadPreview:true,
        poseDiagnostics:false,
        magazineCarryLocations:carriedMagazines.map(p=>p.location),
        magazineCarryItems:carriedMagazines,
        reloadSelectedMagazineId:actor.reloadSelectedMagazineId,
        medicalCarryLocation:carried.find(p=>p.kind==='medical')?.location,
        utilityCarryLocation:carried.find(p=>p.kind==='utility')?.location,
         weaponConfiguration:actor.weaponConfiguration,
         weaponLightOn:actor.weaponLightOn,
        treatmentActive:actor.treatmentActive,
        treatmentProgress:actor.treatmentProgress,
        lockpickActive:actor.plan[0]?.kind==='tool'&&
          actor.plan[0]?.toolMethod==='pick'&&actor.actionTimer>0,
        lockpickProgress:actor.plan[0]?.kind==='tool'&&
          actor.plan[0]?.toolMethod==='pick'?
          Math.min(1,actor.actionTimer/Math.max(.1,
            (actor.lastDoorId?s.doors.find(d=>d.id===actor.lastDoorId):null)?.
             style==='reinforced'?8.5:5.5)):0,
        interactionCrouch:actor.treatmentActive?
          Math.min(1,Math.max(0,(s.seconds-actor.lastTreatmentAt)/.38)):
          actor.plan[0]?.kind==='tool'&&actor.plan[0]?.toolMethod==='pick'&&
          actor.actionTimer>0?
          Math.min(1,Math.max(0,(s.seconds-actor.lastDoorAt)/.38)):0,
        treatmentPoint:actor.treatmentActive?
         s.operators.find(o=>o.id===actor.lastTreatmentTargetId)?.p:undefined,
        flashCharges:actor.flashCharges,
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
        pelvisYaw:replay?.pelvisYaw[actor.id]??liveMotion?.pelvisYaw[actor.id],
        travelYaw:replay?.travelYaw[actor.id]??
          liveMotion?.travelYaw[actor.id],
        posture:actor.posture,injury:actor.injuryStage,weapon:actor.weapon,
        gait:actor.squeeze?'squeeze':
          actor.plan[0]?.kind==='pie'?'pie':
          actor.pace==='run'||actor.plan[0]?.moveMode==='sprint'?
            'run':'walk',
        reload:actor.reload,reloadDuration,
        reloadMode:actor.reloadMode,
        reloadRemoved:actor.reloadRemoved,
        reloadInserted:actor.reloadInserted,
        lastThrowAt:actor.lastThrowAt,lastDoorAt:actor.lastDoorAt,
        lastBashAt:actor.lastBashAt,bashRole:actor.lastBashRole,
        doorMethod:actor.lastDoorMethod,
        doorPoint:handle?{x:handle.x,y:handle.y}:undefined,
        down:actor.health<=0,surrender:actor.surrendered,
        aiming:!actor.traversal&&actor.aim>.20,
        turning:actor.turning,firing:!!firing&&!actor.traversal,
        aimBlend:actor.aim,recoil:actor.recoil*6,
        shotHeading:drawActor.weaponYaw,hitAge,hitFade,downProgress,
        handlingIntent,
        threatRange,
        obstruction:clearance.obstruction,
        clearanceRetraction:clearance.retraction,
        shortCompression:handlingIntent==='squeeze'?1:
          clearance.obstruction?clearance.compression:undefined,
        clearanceBlocked:clearance.blocked,
        hitRegion:actor.lastHitRegion,hitYaw:actor.lastHitYaw,
        hitSeverity:actor.lastHitSeverity,downPose:actor.downPose,
        downClearance:actor.downClearance,
        flashActive:actor.flashUntil>s.seconds&&actor.health>0,
        friendlyNear:friendlyAhead
      },dt);
      if(this.graphicLookEnabled&&object.root.visible){
       // Do not traverse hundreds of meshes every 60Hz frame. Recompose
       // only after costume/weapon source materials actually changed.
       const appearance=String(
        object.physical.root.userData.fieldworkLightingAppearanceKey??'');
       const stamp=appearance+'|'+actor.weapon;
       if(object.root.userData.fieldworkProductionGraphicStamp!==stamp){
        applyStudioGraphicLighting(object.root,APPROVED_GRAPHIC_LIGHTING);
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
    this.combatEffects.update(s,omniscient,
      replayDisclosurePolicy?.mode==='operator',p=>liveVisibility(s,p));
    // 079: One persistent, ID-keyed effect per actual simulation shot.
    // Shared geometry and bounded per-shot materials avoid frame-by-frame GC.
    const active=this.frameShotIds;active.clear();
    let visibleShots=0;
    // Dense bursts keep their newest effects; older traces are cosmetic.
    for(let index=s.shots.length-1;index>=0;index--){
      if(visibleShots>=20)break;
      const shot=s.shots[index];
      if(replayDisclosurePolicy?.mode==='operator')continue;
      const visibility=omniscient?
        {flash:true,trace:true,impact:true}:shotVisibility(s,shot);
      if(!visibility.flash&&!visibility.trace&&!visibility.impact)continue;
      active.add(shot.id);visibleShots++;
      let effect=this.effectCache.get(shot.id);
      if(!effect){
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
        if(shot.surface==='wood'||shot.surface==='stone'||
          shot.surface==='metal'||shot.surface==='glass'||
          shot.surface==='blood'){
          for(let i=0;i<(shot.surface==='blood'?4:3);i++){
            const chip=new THREE.Mesh(this.tracerGeometry,impactMaterial);
            chip.scale.set(shot.surface==='blood'?.9:.42,
              shot.surface==='blood'?1.9:shot.surface==='wood'?4.2:2.4,
              shot.surface==='blood'?.9:.42);
            root.add(chip);chips.push(chip);
          }
        }
        this.effects.add(root);
        effect={root,line,impact,chips,material,impactMaterial};
        this.effectCache.set(shot.id,effect);
      }
      const start=this.shotStart.set(
        shot.start.x,shot.muzzleHeight??15,shot.start.y);
      const end=this.shotEnd.set(
        shot.end.x,shot.impactHeight??12,shot.end.y);
      const flight=this.shotFlight.copy(end).sub(start);
      effect.line.position.copy(start).addScaledVector(flight,.5);
      effect.line.scale.set(1,flight.length(),1);
      effect.line.quaternion.setFromUnitVectors(
        this.tracerAxis,flight.normalize());
      effect.line.visible=visibility.trace&&shot.age<.19;
      effect.material.opacity=Math.max(0,1-shot.age/.20);
      effect.impact.position.copy(end);
      const profile=impactProfile(shot.surface??'dust');
      const impact=impactPulse(shot.surface??'dust',shot.age,
        profile.lifetime);
      effect.impact.scale.setScalar(impact.scale);
      effect.impactMaterial.opacity=impact.opacity;
      effect.impact.visible=visibility.impact&&impact.active;
      for(let i=0;i<effect.chips.length;i++){
        const chip=effect.chips[i];
        const theta=(shot.id*2.41+i*2.094);
        const progress=shot.age/.40;
        const radius=(2+15*progress)*(shot.surface==='blood'?.7:1);
        chip.position.set(end.x+Math.cos(theta)*radius,
          Math.max(2,end.y+6*Math.sin(Math.PI*progress)+i*1.5-4*progress),
          end.z+Math.sin(theta)*radius);
        chip.rotation.set(i*.73,theta,Math.PI*.5+progress*1.8);
        chip.visible=visibility.impact&&shot.age<profile.lifetime&&
          (omniscient||liveVisibility(s,{x:chip.position.x,y:chip.position.z}));
      }
    }
    // Stable cap, one render call and no individual decal meshes/materials.
    if(!this.impactDecalMesh){
      this.impactDecalMesh=new THREE.InstancedMesh(
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
    const visibleBloodBlockers=s.operators.filter(a=>
      this.actors.get(a.id)?.root.visible).map(a=>a.p);
    let markCount=0;
    for(const mark of s.impactMarks){
      if(replayDisclosurePolicy?.mode==='operator')continue;
      if(!omniscient&&!liveVisibility(s,mark.p))continue;
      // Unlike a screen-space overlay, the decal is always ON the floor.
      // Transparent architecture may not write depth, so a blood stain
      // must also be culled when any part lies behind a cutaway wall or
      // a visible miniature. Camera rays differ for ORTHO and WIDE.
      const radius=mark.surface==='blood'?
        confinedGroundRadius(mark.p,4,s.site?.walls??WALLS):2.3;
      if(radius<.5)continue;
      if(mark.surface==='blood'&&groundBloodFootprintOccluded(
          mark.p,radius,bloodCamera,this.bloodCameraDirection,
          orthoBlood,s.site?.walls??WALLS,visibleBloodBlockers,
          WALL_VISUAL_HEIGHT))continue;
      if(mark.surface!=='blood'&&groundMarkHiddenByWallFromCamera(
          mark.p,bloodCamera,s.site?.walls??WALLS,WALL_VISUAL_HEIGHT,
          mark.height??1))continue;
      if(markCount>=IMPACT_MARK_LIMIT)break;
      const dark=mark.surface==='blood'?0x763c38:
        mark.surface==='wood'?0x3a2920:
        mark.surface==='stone'?0x38332c:
        mark.surface==='metal'?0x202b2e:0x514e42;
      const groundRadius=radius;
      this.impactDecalMatrix.position.set(mark.p.x,
        mark.surface==='blood'?.85:(mark.height??1),mark.p.y);
      this.impactDecalMatrix.rotation.set(-Math.PI/2,0,0);
      this.impactDecalMatrix.scale.setScalar(groundRadius);
      this.impactDecalMatrix.updateMatrix();
      markDraw.setMatrixAt(markCount,this.impactDecalMatrix.matrix);
      this.impactDecalColor.setHex(dark).multiplyScalar(
        Math.max(.28,1-mark.age*.027));
      markDraw.setColorAt(markCount++,this.impactDecalColor);
    }
    markDraw.count=markCount;
    if(markCount){
      markDraw.instanceMatrix.needsUpdate=true;
      if(markDraw.instanceColor)markDraw.instanceColor.needsUpdate=true;
    }
    for(const [id,effect] of this.effectCache){
      if(active.has(id))continue;
      this.effects.remove(effect.root);
      effect.material.dispose();effect.impactMaterial.dispose();
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
    const sessionChanged=this.lastFogSession!==s;
    const fogDue=!omniscient&&(sessionChanged||
      this.fogAt>=(this.quality.mode==='quality'?.055:.10)||this.fogAt<0);
    if(fogDue){
      const fogSignature=fogFingerprint({
        mode:s.intel.mode,seed:s.site?.seed??null,
        seenCount:s.seenGround.size,seenRevision:s.seenGroundRevision,
        revision:s.objectRevision,
        actors:team(s).filter(a=>a.health>0).map(a=>({
          id:a.id,x:a.p.x,y:a.p.y,heading:a.heading,
          posture:a.posture,health:a.health
        })),
        doors:s.doors.map(d=>({
          id:d.id,fraction:d.openFraction??(d.open?1:0)
        }))
      });
      // Two sessions may have identical knowledge counts but different sites.
      if(sessionChanged||fogSignature!==this.lastFogSignature){
        this.fogAt=0;this.lastFogSignature=fogSignature;
        this.lastFogSession=s;
        if(this.fogLegacy){
          paintFogMask(this.fogContext,s,this.fogDiagnostic);
          this.fogMemoryPaints++;this.fogSightPaints++;
        }else{
          // Static exploration memory is even less volatile than sight.
          // Avoid building its key unless a visibility redraw is needed.
          const memorySignature=fogMemoryFingerprint({
            mode:s.intel.mode,seed:s.site?.seed??null,
            seenRevision:s.seenGroundRevision,
            rooms:s.intel.rooms.size,walls:s.intel.walls.size,
            doors:s.intel.doors.size,cover:s.intel.cover.size
          });
          if(this.lastMemoryFogSession!==s||
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
        }
        this.fogTexture.needsUpdate=true;
      }
    }else if(omniscient)this.fogAt=-1;
    const dynamicShadows=s.phase==='running'||
      ((s.phase==='won'||s.phase==='lost')&&
        this.terminalPoseSeconds<1.0);
    const shadowSignature=dynamicShadows?'':stationaryShadowFingerprint({
      site:s.site?.seed??null,phase:s.phase,selected,
      focusX:shadowPoint.x,focusY:shadowPoint.y,
      objectRevision:s.objectRevision,known:s.seenGround.size,
      intelMode:s.intel.mode,lighting:s.lightingMode,
      actors:s.operators.map(a=>({
        id:a.id,x:a.p.x,y:a.p.y,heading:a.heading,
        posture:a.posture,health:a.health,weaponYaw:a.weaponYaw,
        recoil:a.recoil,reload:a.reload,stride:a.stride,
        weapon:a.weapon,equipment:a.equipment,wardrobe:a.wardrobe
      })),
      doors:s.doors.map(d=>({id:d.id,
        fraction:d.openFraction??(d.open?1:0),open:d.open})),
      poseTime:this.terminalPoseSeconds,simulationTime:s.seconds
    });
    if(this.shadowUpdates.shouldRefresh(dynamicShadows,shadowSignature))
      this.renderer.shadowMap.needsUpdate=true;
    // Read from the already posed historical rig. No additional animation
    // tick, physics, awareness query or mutable replay state is introduced.
    // The QA bodycam is never active without explicit personal disclosure.
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
    try{this.renderMiniatureFocus(camera);}
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
    // Effects geometry is released before rebuilding the next frame; pooled
    // material instances are reused for every shot to reduce phone GC work.
  }
}
