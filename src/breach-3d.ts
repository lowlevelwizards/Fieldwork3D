import {groundMarkOccludedFromCamera} from './breach-ground-geometry.ts';
import {lightingPresentation} from './equipment-lighting-presentation.ts';
import * as THREE from 'three';
import {APPROVED_GRAPHIC_LIGHTING}
 from './operator-studio-light-lab.ts';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION,studioShadowPalette}
 from './operator-studio-lighting.ts';
import {applyStudioGraphicLighting}
 from './operator-studio-graphic-lighting.ts';
import {applyWorldGraphicLighting,enableWorldGraphicMaterial}
 from './breach-graphic-world-lighting.ts';
import {propertySurfaceCenterHeight,PROPERTY_SURFACE_THICKNESS,
  exteriorZoneRenderLift} from './rendering/property-surface-elevation.ts';
import {windowShardPose,WINDOW_SHARDS_PER_PANE}
 from './rendering/window-shatter-presentation.ts';
import {createCivilianRig,updateCivilianRig,type CivilianRig}
 from './breach-civilian-visuals.ts';
import {civilianPresentationVisible} from './breach-civilian-visibility.ts';
import {replayActorVisible,replayActorDisclosed,replayCivilianDisclosed,
  type ReplayDisclosure} from './breach-replay-visibility.ts';
import {graphicsBudget} from './breach-graphics-budget.ts';
import {projectedOperatorHeightPx,operatorShadowDetail,
 applyOperatorShadowLod,cavityQualityForDetail}
 from './operator-shadow-quality.ts';
import {PixelTextureLibrary,mapBoxPixelUV,mapPlanePixelUV,type PixelSurface} from './rendering/pixel-materials.ts';
import {roomPixelSurface,zonePixelSurface,wallPixelSurface,fixturePixelSurface} from './worldgen/pixel-surface-selection.ts';
import {wearFinish} from './rendering/wear-finish.ts';
import {doubleSidedWallWear} from './rendering/wear-wall-geometry.ts';
import {ageMaterialColor} from './rendering/condition-materials.ts';
import {renderFixtureVisual,type FixtureVisualContext} from './worldgen/fixture-visuals.ts';
import {isArchitecturalSillCover} from './worldgen/architectural-cover-visuals.ts';
import {planFacadeAwnings} from './worldgen/facade-awnings.ts';
import {fixtureFrameTransform} from './rendering/fixture-frame-transform.ts';
import {exteriorBriefedAt} from './breach-site-footprint.ts';
import {StaticSceneBatches} from './rendering/breach-static-batcher.ts';
import {ShadowUpdateController,stationaryShadowFingerprint,shadowEligibleBox}
  from './rendering/breach-shadow-controller.ts';
import {buildingTheme,roomFloor} from './worldgen/building-palettes.ts';
import {planPropertySurfaces,type SurfaceKind} from './worldgen/property-surfaces.ts';
import {planEnvironmentalWear,type WearKind,type WearMark} from './worldgen/environment-wear.ts';
import {summarizeWear} from './worldgen/wear-diagnostics.ts';
import {conditionFloorPixels,effectiveCondition} from './worldgen/condition-visual.ts';
import {outdoorVisualCondition} from './worldgen/outdoor-condition.ts';
import {conditionWallPixels} from './worldgen/condition-wall.ts';
import {planObjectWear,type ObjectWear} from './worldgen/object-wear.ts';
import {planExposureWear} from './worldgen/wear-exposure.ts';
import {planActivityWear} from './worldgen/wear-sources.ts';
import {planHistoryWear} from './worldgen/surface-history.ts';
import {planThresholdTrafficWear} from './worldgen/threshold-traffic-wear.ts';
import {planMicroDebris,type DebrisKind} from './worldgen/micro-debris.ts';
import {planInteriorFragments,type InteriorFragment} from './worldgen/interior-fragments.ts';
import {visibleSurfaceHeight} from './worldgen/decoration-anchors.ts';
import {wearPixels} from './rendering/pixel-decals.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './rendering/wear-opacity.ts';
import {pixelSign,type PixelSignKind} from './rendering/pixel-signage.ts';
import {pixelOverlay,overlayForZone,type PixelOverlay} from './rendering/pixel-overlays.ts';
import {roofShouldShow} from './worldgen/roof-cutaways.ts';
import {W,H,activeWorldBounds,WALLS,COVER,initialDoors,doorCenter,doorLeafSegment,activeSite,
  type Pt,type Door,type Segment} from './breach-core.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {handlingIntentForMovement,teammateAheadForHandling}
  from './breach-handling-context.ts';
import {resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter,LIGHT_BEAM_SAMPLES}
 from './equipment-weapon-light-beam.ts';
import {type Site,type Room,type WideOpening} from './breach-site.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import {type Session,type TeamActor,team,knownAt,liveVisibility} from './breach-game.ts';
import {spatialSurfaceState,shotVisibility,architecturalOpeningKnown} from './breach-presentation.ts';
import {doorKnown} from './breach-intel.ts';
import {handlePoint,doorReachable,initDoor} from './breach-door.ts';
import {footAnchorReachable} from './breach-navigation.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {armedPrecontactStyle} from './breach-idle-life.ts';
import {WEAPONS} from './breach-combat.ts';
import {casingAt,CASING_LIMIT,IMPACT_MARK_LIMIT,impactProfile} from './breach-effects.ts';
import {muzzleFlashCue,mostRecentActiveMuzzleShot,impactPulse}
 from './breach-combat-cues.ts';
import {sampleThrow} from './breach-flash.ts';
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
import {personalDecorVisible,personalCoverVisible}
  from './breach-replay-personal-visibility.ts';
import {interpolatedActor,type RenderFrame}
  from './breach-frame-interpolation.ts';

/** One authoritative 2D world, physically represented in one 3D scene.
 * Coordinates: tactics (x,y) => scene (x, elevation, y).
 * This module may not mutate simulation state. */
export type ViewMode='iso'|'top'|'plan2d';
export type ViewState={mode:ViewMode;yaw:number;zoom:number;pitch:number;focus:Pt};
const color=(hex:number)=>new THREE.Color(hex);
const v=(p:Pt,y=0)=>new THREE.Vector3(p.x,y,p.y);
const mat=(hex:number,roughness=.9)=>new THREE.MeshStandardMaterial({
  color:hex,roughness,flatShading:true,
});
/** Blueprint-style ground sweep, fixed to the actual hinge and opening side. */
function doorSweepArc(door:Door,length:number):THREE.Group{
  const group=new THREE.Group(),points:THREE.Vector3[]=[];
  const hinge=door.hinge==='b'?length/2:-length/2;
  const sign=door.hinge==='b'?-1:1;
  const reach=Math.max(0,length-DOOR_PANEL_END_RECESS);
  for(let i=0;i<=24;i++){
    const angle=(door.swing??-1)*1.54*i/24;
    points.push(new THREE.Vector3(
      hinge+sign*reach*Math.cos(angle),1.7,
      -sign*reach*Math.sin(angle)));
  }
  const material=new THREE.LineDashedMaterial({
    color:0xf5d68e,transparent:true,opacity:.9,
    dashSize:5,gapSize:4,depthTest:true,depthWrite:false});
  const stroke=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);
  stroke.computeLineDistances();group.add(stroke);
  const hingeDot=new THREE.Mesh(
    new THREE.CircleGeometry(3,12),
    new THREE.MeshBasicMaterial({color:0xffdb8b,side:THREE.DoubleSide,depthWrite:false}));
  hingeDot.rotation.x=-Math.PI/2;
  hingeDot.position.set(hinge,1.75,0);group.add(hingeDot);
  group.visible=false;
  return group;
}
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
    return {calls:info.calls,triangles:info.triangles,
      staticBatch:this.staticBatches.stats(),
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
  private actors=new Map<string,{root:THREE.Group;flash:THREE.Mesh;
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
  private impactDecalColor=new THREE.Color();
  private groundMarkTowardCamera=new THREE.Vector3();
  private casingMesh:THREE.InstancedMesh|null=null;
  private casingIds:number[]=[];
  private casingMatrix=new THREE.Object3D();
  private rescueFigure:THREE.Group|null=null;
  private civilianRigs=new Map<string,CivilianRig>();
  private discarded=new Map<number,THREE.Mesh>();
  private thrown=new Map<number,THREE.Mesh>();
  private detonations=new Map<number,THREE.Mesh>();
  private tracerAxis=new THREE.Vector3(0,1,0);
  private readonly shoeWorldPoint=new THREE.Vector3();
  private tracerGeometry=new THREE.CylinderGeometry(.65,.65,1,6);
  private impactGeometry=new THREE.IcosahedronGeometry(1,1);
  private walls:{mesh:THREE.Mesh;mid:Pt;segment:Segment}[]=[];
  private wallFade=new Map<THREE.Mesh,number>();
  private readonly roofGroups=new Map<string,THREE.Group>();
  private roofMaterial:THREE.MeshStandardMaterial|null=null;
  private intelSurfaces:{obj:THREE.Object3D;kind:'wall'|'cover';
    index:number}[]=[];
  private observedDetails:{obj:THREE.Object3D;position:Pt}[]=[];
  private architecturalOpenings:{obj:THREE.Object3D;opening:WideOpening}[]=[];
  private wallMaterials=new Set<THREE.Material>();
  private effects=new THREE.Group();
  private target=new THREE.Vector3(339,0,413);
  private currentElev=55*Math.PI/180;
  private readonly minZoom=.65;
  private readonly maxZoom=6.0;
  private lastCameraStatus='';
  private pickPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  private ray=new THREE.Raycaster();
  private width=1;private height=1;private fogAt=-1;
  private terminalPoseSeconds=0;private terminalSessionStamp=-1;
  /** Presentation clock alone runs on pause; simulation/replay stay frozen. */
  private idleLifeSeconds=0;private idleLifeSession:Session|null=null;
  private sun:THREE.DirectionalLight;
  private mats:THREE.Material[]=[];
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
  private windowGlass=new Map<string,THREE.Mesh>();
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
    this.fogTexture.minFilter=THREE.LinearFilter;
    this.fogTexture.magFilter=THREE.LinearFilter;
    const fogMat=new THREE.MeshBasicMaterial({
      map:this.fogTexture,transparent:true,depthTest:true,opacity:1,
      depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
    this.mats.push(fogMat);
    this.smoothFog=new THREE.Mesh(new THREE.PlaneGeometry(W,H),fogMat);
    this.smoothFog.rotation.x=-Math.PI/2;
    // Ground-space LOS mask, not a roof. The 3D unknown tint leaves a faint
    // known-plan silhouette, never live actors or undiscovered cover.
    // Opaque walls depth-test against it; translucent near-wall cutaways
    // draw after it so their outlines cannot disappear into solid black.
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
    // Ground-aligned fog is the sole map-space concealment layer.
    // Raised horizontal fog sheets suffer isometric parallax: they appear
    // skewed away from room footprints and black out exterior terrain.
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
    if(this.casingMesh)this.casingMesh.count=0;
    this.casingIds.length=0;
    for(const effect of this.effectCache.values()){
      this.effects.remove(effect.root);
      effect.material.dispose();effect.impactMaterial.dispose();
    }
    this.effectCache.clear();
    for(const cache of [this.discarded,this.thrown,this.detonations]){
      for(const mesh of cache.values()){
        this.effects.remove(mesh);mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      cache.clear();
    }
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
    const debris=planMicroDebris(site);
    const kinds:readonly DebrisKind[]=['stone','leaf','weed','flake'];
    const colors={stone:0x908f80,leaf:0x8f825d,weed:0x60774d,flake:0xc4b9a3};
    const obj=new THREE.Object3D();
    for(const kind of kinds){
      const picks=debris.filter(d=>d.kind===kind);
      if(!picks.length)continue;
      const geometry=new THREE.BoxGeometry(1,1,1);
      const material=this.solid(colors[kind],1,kind==='weed'?'foliage':
        kind==='stone'?'gravel':'paper');
      const mesh=new THREE.InstancedMesh(geometry,material,picks.length);
      mesh.castShadow=false;mesh.receiveShadow=false;
      picks.forEach((d,i)=>{
        obj.position.set(d.x,kind==='weed'?.5:-1.02,d.y);
        obj.rotation.set(0,d.angle,0);
        obj.scale.set(kind==='weed'?.6:d.size,kind==='weed'?d.size*1.2:.32,
          kind==='weed'?.6:d.size*.55);
        obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
      });
      mesh.instanceMatrix.needsUpdate=true;
      mesh.frustumCulled=false;
      this.root.add(mesh);
    }
  }
  private buildGenerated(site:Site){
    const theme=buildingTheme(site.archetype,site.seed);
    const finishCondition=effectiveCondition(site);
    const age=(hex:number,surface:PixelSurface|undefined,variation=0)=>
      ageMaterialColor(hex,surface,finishCondition,variation);
    const outdoors=outdoorVisualCondition(site);
    const earth=this.solid(age(site.layout==='courtyard'?0x69825e:0x607a58,'grass'),.9,'grass');
    const bounds=site.bounds??{minX:0,minY:0,maxX:W,maxY:H};
    const bw=bounds.maxX-bounds.minX,bh=bounds.maxY-bounds.minY;
    this.plane(this.root,(bounds.minX+bounds.maxX)/2,
      (bounds.minY+bounds.maxY)/2,bw,bh,-2,earth);
    const zoneColor={yard:0x70895e,patio:0x8b877a,driveway:0x737774,
      service:0x7f827b,garden:0x788d61,parking:0x676c6b} as const;
    for(const zone of site.exteriorZones??[]){
      const ground=zonePixelSurface(zone.kind,outdoors);
      const lift=exteriorZoneRenderLift(zone.id);
      this.plane(this.root,zone.x,zone.y,zone.w,zone.h,-1.45+lift,
        this.solid(age(zoneColor[zone.kind],ground),.91,ground));
      // One cheap repeated layer per relevant exterior zone, no dynamic allocation.
      const overlay=overlayForZone(outdoors,zone.kind);
      if(overlay){
        const mark=this.plane(this.root,zone.x,zone.y,zone.w,zone.h,-1.42+lift,
          this.groundOverlayMaterial(overlay));
        mark.castShadow=false;mark.receiveShadow=false;
      }
    }
    // Structural roofs are open-slat and translucent for tabletop cutaway.
    // Actual support posts are the collidable obstacles in site.cover.
    for(const structure of site.structures??[]){
      if(!['entry-canopy','porch-roof','service-awning'].includes(structure.kind))
        continue;
      const frame=this.solid(structure.kind==='service-awning'?0x59615e:
        structure.kind==='porch-roof'?0x86755d:0x727c76,.83,'wood');
      const roofMat=new THREE.MeshBasicMaterial({color:0x8b917e,transparent:true,
        opacity:.16,depthWrite:false,side:THREE.DoubleSide});
      const roof=this.box(this.root,structure.x,WALL_VISUAL_HEIGHT+1,structure.y,
        structure.w,1.2,structure.h,roofMat,false);
      roof.castShadow=false;roof.receiveShadow=false;
      this.box(this.root,structure.x,WALL_VISUAL_HEIGHT-.5,structure.y-structure.h/2,
        structure.w,2.5,2.5,frame,false);
      this.box(this.root,structure.x,WALL_VISUAL_HEIGHT-.5,structure.y+structure.h/2,
        structure.w,2.5,2.5,frame,false);
      this.box(this.root,structure.x-structure.w/2,WALL_VISUAL_HEIGHT-.5,structure.y,
        2.5,2.5,structure.h,frame,false);
      this.box(this.root,structure.x+structure.w/2,WALL_VISUAL_HEIGHT-.5,structure.y,
        2.5,2.5,structure.h,frame,false);
      for(const f of [-.26,.26])
        this.box(this.root,structure.x+structure.w*f,WALL_VISUAL_HEIGHT,structure.y,
          2,1.8,structure.h,frame,false);
    }
    // Fixed architectural window overhangs are tied to physical glass spans.
    // Keep the canopy translucent for the tactical cutaway and never imply
    // an elevated traversable surface or a new line-of-fire barrier.
    const awningRoof=new THREE.MeshStandardMaterial({color:0x85867a,
      roughness:.87,metalness:.08,transparent:true,opacity:.33,
      depthWrite:false,side:THREE.DoubleSide});
    const awningEdge=this.solid(0x5f6e6a,.83,'painted-metal');
    for(const awning of planFacadeAwnings(site)){
      const roof=this.box(this.root,awning.x,DOOR_CLEAR_VISUAL_HEIGHT+2.5,awning.y,
        awning.w,1.5,awning.h,awningRoof,false);
      roof.castShadow=false;roof.receiveShadow=false;
      const vertical=awning.w<awning.h;
      const edgeOffset=vertical?awning.w/2:awning.h/2;
      if(vertical){
        for(const x of [awning.x-edgeOffset,awning.x+edgeOffset])
          this.box(this.root,x,DOOR_CLEAR_VISUAL_HEIGHT+1.8,awning.y,2,2.2,awning.h,awningEdge,false);
      }else{
        for(const y of [awning.y-edgeOffset,awning.y+edgeOffset])
          this.box(this.root,awning.x,DOOR_CLEAR_VISUAL_HEIGHT+1.8,y,awning.w,2.2,2,awningEdge,false);
      }
    }
    const surfaceColor:Record<SurfaceKind,number>={
      path:0x919182,'driveway-stripe':0x858575,
      'parking-divider':0xd6caa9,'garden-border':0x4c5843,
      'service-pad':0x6c7069,'patio-paver':0x8b8578,
      'drainage-grate':0x394d50,
      sidewalk:0x92918b,'curb-edge':0x5c605e,
      'curb-ramp':0xb1aca0,'crosswalk-stripe':0xd8d2be,
      'reserved-parking':0x4f7880,'access-hatch':0xe2dfc9,
      'stall-end-line':0xc9c2a6,
      'loading-zone':0x9f9685,'maintenance-bay':0x7e877d,
      'waste-collection':0x696f65,'clear-route':0x8b8c7d,
    };
    // Exterior ground markings are legible construction details, not cover.
    // Sidewalk/path/curb/ramp markings overlap by design, but their top
    // planes must not coincide. Distinct narrow finish elevations prevent
    // moire and flashing without changing the tactical ground collider.
    for(const mark of planPropertySurfaces(site))
      this.box(this.root,mark.x,propertySurfaceCenterHeight(mark.kind),
        mark.y,mark.width,PROPERTY_SURFACE_THICKNESS,
        mark.depth,this.solid(age(surfaceColor[mark.kind],'concrete')),false);
    const road=this.solid(age(0x59584a,'asphalt'),.91,'asphalt');
    const side=site.entrySide??'south';
    if(side==='east'||side==='west'){
      const edge=side==='east'?bounds.maxX:bounds.minX;
      this.box(this.root,(site.entrance.x+edge)/2,-1.43,site.entrance.y,
        Math.abs(site.entrance.x-edge)+10,.30,85,road,false);
    }else{
      const edge=side==='south'?bounds.maxY:bounds.minY;
      this.box(this.root,site.entrance.x,-1.43,(site.entrance.y+edge)/2,
        85,.30,Math.abs(site.entrance.y-edge)+10,road,false);
    }
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
    for(const [index,wall] of site.walls.entries()){
      const group=new THREE.Group();this.root.add(group);
      this.intelSurfaces.push({obj:group,kind:'wall',index});
      const {a,b}=wall,len=Math.hypot(b.x-a.x,b.y-a.y);
      if(len<5)continue;
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
      this.walls.push({mesh:body,mid:{x,y:z},segment:wall});
      for(const mark of marksOn('wall',index))
        this.addSurfaceWear(body,mark,(mark.u-.5)*len,(mark.v-.5)*(WALL_VISUAL_HEIGHT-8),
          mark.face==='back'?-4.6:4.6,wallPixelSurface(site.archetype));
      const individualFoot=skirting.clone();
       this.wallMaterials.add(individualFoot);
       const foot=this.box(group,x,2,z,len,4,12,individualFoot,false);
       foot.rotation.y=angle;
       this.walls.push({mesh:foot,mid:{x,y:z},segment:wall});
      const individualCap=capMat.clone();
      this.wallMaterials.add(individualCap);
      const cap=this.box(group,x,WALL_VISUAL_HEIGHT+.3,z,len,2,11,
         individualCap,false);
      cap.rotation.y=angle;this.walls.push({mesh:cap,mid:{x,y:z},segment:wall});
    }
    const archMaterial=this.solid(theme.trim);
    for(const opening of site.openings??[]){
      const width=Math.hypot(opening.a.x-opening.b.x,opening.a.y-opening.b.y);
      const p={x:(opening.a.x+opening.b.x)/2,y:(opening.a.y+opening.b.y)/2};
      const group=new THREE.Group();group.position.set(p.x,0,p.y);
      group.rotation.y=Math.abs(opening.a.x-opening.b.x)<1?-Math.PI/2:0;
      for(const side of [-1,1])this.box(group,side*width/2,DOOR_CLEAR_VISUAL_HEIGHT/2,0,
        4,DOOR_CLEAR_VISUAL_HEIGHT,10,archMaterial);
      this.box(group,0,DOOR_CLEAR_VISUAL_HEIGHT+2,0,
        width+4,4,11,archMaterial);
      if(opening.kind==='serving'){
        this.box(group,0,10,0,width,20,10,archMaterial);
        this.box(group,0,20.5,3,width+3,2,12,archMaterial,false);
      }
      this.root.add(group);
      this.architecturalOpenings.push({obj:group,opening});
    }
    const doorMat=this.solid(age(theme.door,'door-wood'),.88,'door-wood'),
      doorTrim=this.solid(age(theme.trim,'painted-wood'),.9,'painted-wood');
    const metal=this.solid(0x586665,.78,'industrial-steel');
    const doorGlass=new THREE.MeshStandardMaterial({color:0xa8c2bf,roughness:.24,
      transparent:true,opacity:.29,depthWrite:false,side:THREE.DoubleSide});
    this.mats.push(doorGlass);
    for(const [doorIndex,sourceDoor] of site.doors.entries()){
      const door=initDoor(sourceDoor,doorIndex);
      const length=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
      const p=doorCenter(door);
      const root=new THREE.Group();root.position.set(p.x,0,p.y);
      root.rotation.y=-Math.atan2(door.b.y-door.a.y,door.b.x-door.a.x);
      const frame=new THREE.Group();root.add(frame);
      const profile=doorProportions(door);
      // Preserve the full structural opening: jambs are mounted outside
      // the walkable interval, instead of projecting into the threshold.
      const jambX=length/2+profile.jambWidth/2-DOOR_FRAME_INSET;
      const jambSides=door.pairedWith?
        [door.hinge==='b'?1:-1]:[-1,1];
      for(const side of jambSides){
        this.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,0,
          profile.jambWidth,DOOR_CLEAR_VISUAL_HEIGHT,profile.jambDepth,doorTrim);
        // Small face rebate keeps the chunky iconography without two
        // massive offset bars dominating the aperture.
        this.box(frame,side*jambX,DOOR_CLEAR_VISUAL_HEIGHT/2,
          profile.jambDepth/2+1.25,profile.casingWidth,
          DOOR_CLEAR_VISUAL_HEIGHT-3,
          profile.casingDepth,doorTrim,false);
      }
      this.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight/2,0,
        length+2*profile.jambWidth,
        profile.headerHeight,profile.headerDepth,doorTrim);
      this.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+profile.headerHeight+.5,1.50,
        length+2*profile.jambWidth+1,
        1.1,profile.headerDepth+.8,doorTrim,false);
      const threshold=this.box(frame,0,.275,0,length,
        profile.thresholdHeight,profile.thresholdDepth,doorTrim,false);
      const leaf=new THREE.Group();
      let glassPane:THREE.Mesh|undefined;
      const invert=door.hinge==='b';
      leaf.position.x=door.kind==='shutter'||door.kind==='sliding'?0:invert?length/2:-length/2;
      // Actual hinge barrels identify the swing side without requiring
      // a user to inspect a top-down arrow on every doorway.
      if(door.kind!=='shutter'&&door.kind!=='sliding')for(const y of [9,24,42])
        this.box(frame,invert?length/2:-length/2,y,0,
          profile.hingeDiameter,5.2,profile.hingeDepth,metal,false);
      root.add(leaf);
      if(door.kind==='shutter'){
        for(let y=2;y<DOOR_LEAF_VISUAL_HEIGHT;y+=5)
          this.box(leaf,0,y,0,length-3,4.7,4,metal,false);
        this.box(frame,0,WALL_VISUAL_HEIGHT,0,length+10,9,13,metal,false);
        for(const side of [-1,1])
          this.box(frame,side*length*.49,WALL_VISUAL_HEIGHT/2,2.1,
          2,WALL_VISUAL_HEIGHT-2,4,metal,false); // shutter runners
        this.box(leaf,0,4,2.5,length*.37,2,1.4,doorTrim,false); // lower pull
      }else{
        if(door.kind==='sliding'){
          this.box(frame,0,DOOR_CLEAR_VISUAL_HEIGHT+2,1.6,
            length*2.1,3,6,metal,false);
          this.box(frame,0,1,1.6,length*2.1,1.3,4,metal,false);
        }
        const style=door.style??'wood';
        const panel=style==='wood'?doorMat:style==='exit'?
          this.solid(0x996c53,.78,'painted-metal'):style==='reinforced'?
          this.solid(0x53615e,.78,'industrial-steel'):this.solid(0x72817d,.78,'painted-metal');
        const middle=door.kind==='sliding'?0:(invert?-1:1)*length/2;
        if(style==='mesh-gate'){
          const frameMaterial=this.solid(0x586665,.8,'industrial-steel');
          for(const sign of [-1,1])this.box(leaf,middle+sign*(length/2-2),
            DOOR_LEAF_VISUAL_HEIGHT/2,0,3,DOOR_LEAF_VISUAL_HEIGHT,3,
            frameMaterial,false);
          for(const y of [3,DOOR_LEAF_VISUAL_HEIGHT-3])this.box(leaf,middle,y,0,length-4,3,3,frameMaterial,false);
          for(let x=-length/2+7;x<length/2-3;x+=9)
            this.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,0,
              1,DOOR_LEAF_VISUAL_HEIGHT-6,1,frameMaterial,false);
          for(const y of [11,25,39])this.box(leaf,middle,y,0,length-6,1,1,frameMaterial,false);
        }else if(style==='french'||style==='screen'){
          for(const sign of [-1,1])
            this.box(leaf,middle+sign*(length/2-3),
              DOOR_LEAF_VISUAL_HEIGHT/2,0,
              3.2,DOOR_LEAF_VISUAL_HEIGHT,profile.leafThickness,metal,false);
          for(const y of [3,DOOR_LEAF_VISUAL_HEIGHT-3])this.box(leaf,middle,y,0,length-4,
              3.4,profile.leafThickness,metal,false);
          if(style==='french'){
            const pane=this.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
              length-8,DOOR_LEAF_VISUAL_HEIGHT-8,1,doorGlass,false);
            pane.castShadow=false;glassPane=pane;
            for(const y of [15,32])this.box(leaf,middle,y,0,length-5,2,3,metal,false);
            this.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,2,
              DOOR_LEAF_VISUAL_HEIGHT-7,3,metal,false);
          }else{
            for(let x=-length/2+5;x<length/2-2;x+=7)
              this.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,0,.9,
                DOOR_LEAF_VISUAL_HEIGHT-8,1,metal,false);
          }
        }else if(style==='glazed'){
          const pane=this.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
              length-8,DOOR_LEAF_VISUAL_HEIGHT-8,1,doorGlass,false);
          pane.castShadow=false;glassPane=pane;
          for(const sign of [-1,1])
            this.box(leaf,middle+sign*(length/2-3),
              DOOR_LEAF_VISUAL_HEIGHT/2,0,
              3.2,DOOR_LEAF_VISUAL_HEIGHT,profile.leafThickness,metal,false);
          for(const y of [3,DOOR_LEAF_VISUAL_HEIGHT-3])this.box(leaf,middle,y,0,length-4,
              3.8,profile.leafThickness,metal,false);
          this.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
            length-5,2.3,3,metal,false);
        }else this.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,0,
          length-4,DOOR_LEAF_VISUAL_HEIGHT,
          profile.leafThickness,panel);
        if(style==='wood'){
          // Quiet manufactured two-panel door joinery; no floorboard motif.
          const inset=this.solid(theme.door,.9,'painted-wood');
          for(const y of [12,26,40]){
            this.box(leaf,middle,y,
              profile.leafThickness/2+.16,length*.64,10,.7,inset,false);
            for(const sx of [-1,1])
              this.box(leaf,middle+sx*length*.32,y,
                profile.leafThickness/2+.24,1,10,.7,doorTrim,false);
          }
        }
        for(const sign of [-1,1]){
          // Hardware sits against the panel face, not at the old slab depth.
          const z=sign*(profile.leafThickness/2+1.05);
          const handleX=(invert?-1:1)*length*.70;
          this.box(leaf,handleX,18,z,3,5,1.9,metal,false);
          this.box(leaf,handleX+(invert?2:-2),18,z*1.12,4,1.4,1.6,metal,false);
          this.box(leaf,handleX,13,z,1,1.3,1.7,metal,false);
        }
        if(style==='steel'||style==='reinforced'){
          for(const y of style==='reinforced'?[6,17,28]:[8,28])
            this.box(leaf,middle,y,2.5,length*.78,2.2,1.2,metal,false);
        }
        if(style==='louvered'){
          for(let y=7;y<DOOR_LEAF_VISUAL_HEIGHT-4;y+=4)this.box(leaf,middle,y,3,length*.77,1.2,1.4,metal,false);
        }
        if(style==='barn'){
          for(const x of [-length*.31,length*.31])
            this.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,3,2.5,
              DOOR_LEAF_VISUAL_HEIGHT-8,3,metal,false);
          this.box(leaf,middle,DOOR_LEAF_VISUAL_HEIGHT/2,3,
            length*.84,3,2,metal,false);
        }
        if(style==='fire')this.box(leaf,middle,17,4,length*.66,2.5,3.5,metal,false);
        if(style==='reinforced')
          for(const x of [-length*.30,length*.30])
            this.box(leaf,middle+x,DOOR_LEAF_VISUAL_HEIGHT/2,2.5,2,
              DOOR_LEAF_VISUAL_HEIGHT-7,1.4,metal,false);
        if(style==='exit'){
          const bar=this.solid(0xc5ad88);
          this.box(leaf,middle,18,3.6,length*.75,2.2,3.2,bar,false);
          for(const x of [-length*.29,length*.29])
            this.box(leaf,middle+x,16.5,4,2,4,3.1,metal,false);
        }
      }
      for(const mark of marksOn('door',doorIndex)){
        const middle=(door.hinge==='b'?-1:1)*length/2;
        this.addSurfaceWear(leaf,mark,middle+(mark.u-.5)*(length-8),
          7+mark.v*(DOOR_LEAF_VISUAL_HEIGHT-14),profile.leafThickness/2+.27,
          door.style==='wood'?'door-wood':'painted-metal');
      }
      const halo=door.kind==='sliding'?new THREE.Group():doorSweepArc(door,length);
      root.add(halo);
      this.root.add(root);
      const wedge=this.box(frame,0,1.9,6,6,2.7,6,metal,false);
      wedge.visible=false;
      this.doors.set(door.id,{root,leaf,frame,halo,threshold,wedge,glassPane});
      this.observedDoorGlass.set(door.id,!!door.glassShattered);
      this.observedDoorOpen.set(door.id,door.openFraction??0);
    }
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
    for(const opening of site.windows??[]){
      const group=new THREE.Group();
      group.position.set(opening.x,0,opening.y);
      group.rotation.y=opening.vertical?-Math.PI/2:0;
      const style=opening.style??'standard';
      // Window families retain the SAME underlying structural aperture,
      // low sill and true planar glass for shots/visibility.
      const baseTop=opening.sillHeight??14;
      const glassTop=style==='tall'?37:style==='picture'||style==='storefront'?39:
        style==='industrial'?27:style==='clerestory'?39:
        style==='awning'?35:style==='wire'?34:32;
      const glassHeight=(opening.headHeight??glassTop)-baseTop;
      const trim=opening.interior?this.solid(0x4f605f,.66,'painted-metal'):
        ['industrial','wire','clerestory','storefront'].includes(style)?metal:
        style==='picture'?this.solid(0x627c79):doorTrim;
      if(baseTop>0)this.box(group,0,baseTop/2,0,opening.width,baseTop,9,wallMat);
      const actualTop=opening.headHeight??glassTop;
      if(actualTop<WALL_VISUAL_HEIGHT)this.box(group,0,
        (actualTop+WALL_VISUAL_HEIGHT)/2,0,opening.width,
        WALL_VISUAL_HEIGHT-actualTop,9,wallMat);
      if(baseTop>0)this.box(group,0,baseTop+.1,4,opening.width+3,2,12,trim,false); // sill projection
      const glass=this.box(group,0,baseTop+glassHeight/2,0,
        opening.width-3,glassHeight,1,paneMat,false);
      glass.castShadow=false;
      this.windowGlass.set(opening.id,glass);
      if(opening.treatment==='bars'){
        const bars=this.solid(0x586866,.64,'metal');
        for(const frac of [-.32,-.1,.12,.34])
          this.box(group,frac*opening.width,
            baseTop+glassHeight/2,2,1.8,glassHeight+1,2.2,bars,false);
        for(const y of [baseTop+3,glassTop-3])
          this.box(group,0,y,2,opening.width-3,1.7,2.2,bars,false);
      }
      if(opening.treatment==='open-curtains'){
        const fabric=this.solid(0x8f8779,.95,'fabric');
        for(const side of [-1,1]){
          this.box(group,side*(opening.width/2-4),
            baseTop+glassHeight/2,3,
            6,glassHeight*.91,3,fabric,false);
          this.box(group,side*(opening.width/2-4),
            baseTop+glassHeight*.17,3.2,6,1.7,3.7,doorTrim,false);
        }
      }

      for(const x of [-opening.width/2,opening.width/2])
        this.box(group,x,baseTop+glassHeight/2,0,3,
          glassHeight+2,9,trim,false);
      // Architectural divisions remain thin mullions, never extra cover.
      if(style==='standard'||style==='bay')
        this.box(group,0,baseTop+glassHeight*.48,1,
          opening.width-4,2.4,2.2,trim,false);
      if(style==='industrial'||style==='wire'||style==='storefront'){
        for(const f of style==='storefront'?[-.25,.25]:[-.28,0,.28])
          this.box(group,f*opening.width,baseTop+glassHeight/2,1,
            1.6,glassHeight,2.4,trim,false);
      }
      if(style==='wire'){
        for(const y of [baseTop+4,baseTop+10,baseTop+16,baseTop+22])
          if(y<actualTop-2)this.box(group,0,y,1.8,opening.width-4,.8,1.4,trim,false);
      }
      if(style==='storefront')
        this.box(group,0,baseTop+glassHeight*.51,1,opening.width-4,1.8,2.1,trim,false);
      if(style==='awning'){
        this.box(group,0,actualTop-2,1,opening.width-4,2,2.4,trim,false);
        this.box(group,0,baseTop+glassHeight*.50,1,opening.width-4,1,1.5,trim,false);
      }
      if(style==='tall'||style==='clerestory')
        this.box(group,0,baseTop+1,1,opening.width,1.6,2.4,trim,false);
      if(style==='bay'){
        // A shallow projecting frame; the gameplay glass remains central.
        this.box(group,-opening.width*.37,baseTop+glassHeight/2,-2.3,
          2.5,glassHeight,5,trim,false);
        this.box(group,opening.width*.37,baseTop+glassHeight/2,-2.3,
          2.5,glassHeight,5,trim,false);
        this.box(group,0,baseTop,-2.3,opening.width,2,5,trim,false);
        this.box(group,0,glassTop,-2.3,opening.width,2,5,trim,false);
      }
      const nearest=site.walls.findIndex(w=>
        Math.hypot(w.a.x-opening.x,w.a.y-opening.y)<38||
        Math.hypot(w.b.x-opening.x,w.b.y-opening.y)<38);
      if(nearest>=0)this.intelSurfaces.push({obj:group,kind:'wall',index:nearest});
      this.root.add(group);
    }
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
      this.observedDetails.push({obj:prop,position:{x:detail.x,y:detail.y}});
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
      this.observedDetails.push({obj:prop,position:{x:detail.x,y:detail.y}});
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
      this.walls.push({mesh,mid:{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2},segment});
      // Dark skirting separates the wall footprint from similar floor values.
      const skirting=this.box(this.root,mesh.position.x,2,mesh.position.z,
        len+4,4,12,this.solid(0x36453f),false);
      skirting.rotation.y=mesh.rotation.y;
       this.walls.push({mesh:skirting,mid:{x:mesh.position.x,y:mesh.position.z},segment});
      // A dark, legible wall cap communicates height in either camera mode.
      const cap=this.box(this.root,mesh.position.x,WALL_VISUAL_HEIGHT+.3,
        mesh.position.z,
        len+4,2,11,this.solid(0x51483a),false);cap.rotation.y=mesh.rotation.y;
      this.walls.push({mesh:cap,mid:{x:mesh.position.x,y:mesh.position.z},segment});
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
    if(mode==='plan2d')this.replayBodycam=null;
    this.view.mode=mode;
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
      this.directorOrthoCamera.left=-span*aspect/2;
      this.directorOrthoCamera.right=span*aspect/2;
      this.directorOrthoCamera.top=span/2;
      this.directorOrthoCamera.bottom=-span/2;
      this.directorOrthoCamera.updateProjectionMatrix();
      this.directorOrthoCamera.updateMatrixWorld(true);
      // Optional wide-perspective audition uses the SAME legal room and
      // shot timeline, but a more elevated, wider lens for group coverage.
      this.directorCamera.position.set(anchor.x,44,anchor.y);
      this.directorCamera.up.set(0,1,0);
      this.directorCamera.lookAt(
        this.view.focus.x,18,this.view.focus.y);
      this.directorCamera.aspect=aspect;
      this.directorCamera.fov=this.replayDirectorLensFov;
      this.directorCamera.updateProjectionMatrix();
      this.directorCamera.updateMatrixWorld(true);
    }
    const aspect=this.width/this.height;
    const bounds=activeWorldBounds();
    const diagonal=Math.hypot(bounds.maxX-bounds.minX,
      bounds.maxY-bounds.minY);
    // A yaw-invariant fit avoids breathing/scale changes while orbiting.
    const baseSpan=Math.max(820,(diagonal+66)/aspect);
    const span=baseSpan/this.view.zoom;
    this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;
    this.camera.top=span/2;this.camera.bottom=-span/2;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    // Lightweight observability for touch regression tests and camera QA.
    const signature=[
      this.view.mode,this.view.zoom.toFixed(3),this.view.yaw.toFixed(3),
      this.view.pitch.toFixed(3),this.view.focus.x.toFixed(2),
      this.view.focus.y.toFixed(2),this.replayDirectorLens,
      this.replayDirectorCameraAnchor?.x.toFixed(2)??'—',
      this.replayDirectorCameraAnchor?.y.toFixed(2)??'—',
    ].join('|');
    if(signature!==this.lastCameraStatus){
      this.lastCameraStatus=signature;
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
    const ndc=new THREE.Vector2(sx/this.width*2-1,1-sy/this.height*2);
    this.ray.setFromCamera(ndc,this.projectionCamera);
    const p=new THREE.Vector3();
    if(!this.ray.ray.intersectPlane(this.pickPlane,p))return null;
    if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;
    return {x:p.x,y:p.z};
  }
  project(p:Pt,y=4):Pt{
    const world=v(p,y).project(this.projectionCamera);
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
    this.actors.set(a.id,{root,flash,pack,weapon,status,
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
    for(const [id,glass] of this.windowGlass){
      const current=s.windows.find(w=>w.id===id);
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
      const known=spatialSurfaceState(s,'room',id,omniscient)!=='unknown';
      roof.visible=physicalDirector?false:
        bodycamAudition?known:
        roofShouldShow(omniscient,known,occupiedRoomIds.has(id));
    }
    for(const item of this.intelSurfaces){
      const squadKnown=spatialSurfaceState(s,item.kind,
        item.index,omniscient)!=='unknown';
      // Physically blocking structural WALLS never disappear in a POV.
      // Only decorative/cover meshes use recorded personal ground memory.
      // This is not omniscient actor knowledge: these are actual opaque
      // walls physically surrounding the in-room camera. Leaving them
      // missing would make even a perspective shot see through the map.
      const cover=s.coverState[item.index];
      const exteriorSetDressing=physicalDirector&&item.kind==='cover'&&
        s.intel.mode==='exterior-known'&&!!cover&&
        exteriorBriefedAt(s.site??undefined,{x:cover.x,y:cover.y});
      // The Director can frame already-briefed outdoor objects without
      // making them pop into existence mid-shot. Live tactical discovery,
      // personal bodycam evidence and all interior cover remain unchanged.
      item.obj.visible=item.kind==='wall'&&physicalDirector?true:
        exteriorSetDressing?true:
        item.kind==='cover'?
          personalCoverVisible(squadKnown,bodycamAudition,personalGroundEvidence,
            cover??null):squadKnown;
    }
    // Unlike the room's floor, decorative props must be individually
    // seen (or remembered at their own position) before they are rendered.
    for(const opening of this.architecturalOpenings)
      opening.obj.visible=architecturalOpeningKnown(s,opening.opening,omniscient);
    for(const detail of this.observedDetails){
      const p=detail.position;
      const micro='micro:'+Math.floor(p.x/10)+','+Math.floor(p.y/10);
      const fine='fine:'+Math.floor(p.x/20)+','+Math.floor(p.y/20);
      detail.obj.visible=personalDecorVisible(
        omniscient||s.seenGround.has(micro)||
          s.seenGround.has(fine)||liveVisibility(s,p),
        bodycamAudition,personalGroundEvidence,p);
      this.staticBatches.setVisible(detail.obj,detail.obj.visible);
    }
    // Director cuts walls around its actual historical friendly focal group,
    // rather than a potentially unrelated manually selected soldier.
    const fromCamera=this.projectionCamera.position.clone().sub(this.target);
    const pawn=this.replayDirectorFocus??
      team(s).find(a=>a.id===selected&&a.health>0)?.p;
    const subjects=this.replayDirectorSubjects.length?
      this.replayDirectorSubjects:pawn?[pawn]:[];
    const maxCutDistance=Math.max(40,Math.min(150,
      90/Math.tan(Math.max(.38,this.view.pitch))));
    for(const wall of this.walls){
      const cut=!bodycamAudition&&!physicalDirector&&this.view.mode==='iso'&&
        subjects.some(subject=>wallOccludesFriendly(
          wall.segment,subject,{x:fromCamera.x,y:fromCamera.z},maxCutDistance));
      // CUTAWAY never makes the whole building transparent. Only walls
      // between the camera and the selected friendly/Director subjects fade.
      // Historical knowledge and object visibility remain authoritative.
      const opacity=bodycamAudition||physicalDirector?1:transitionWallOpacity(
        this.wallFade.get(wall.mesh)??1,cut,dt,
        this.replayXrayOn?0.19:0.38);
      this.wallFade.set(wall.mesh,opacity);
      const translucent=opacity<.995;
      const material=wall.mesh.material as THREE.MeshStandardMaterial;
      if(material.transparent!==translucent){
        material.transparent=translucent;
        material.depthWrite=!translucent;material.needsUpdate=true;
      }
      material.opacity=opacity;
      const patina=wall.mesh.userData.patinaMaterial as THREE.MeshBasicMaterial|undefined;
      if(patina)patina.opacity=Math.max(.24,1-(1-opacity)*1.226);
      wall.mesh.renderOrder=translucent?1001:0;
    }
    // The selected endpoint is stable across this entire render. Do not
    // rebuild team/plan arrays once per door on large generated sites.
    const selectedActor=s.operators.find(a=>a.side==='blue'&&a.id===selected);
    const selectedEndpoint=selectedActor?.plan.at(-1)?.p;
    for(const door of s.doors){
      const object=this.doors.get(door.id);
      if(!object)continue;
      object.root.visible=physicalDirector||
        spatialSurfaceState(s,'door',door.id,omniscient)!=='unknown';
      this.staticBatches.setVisible(object.root,object.root.visible);
      // Personal review uses the LAST individually observed leaf state.
      // An unseen opening/kick cannot magically update this perspective.
      const personal=replayDisclosurePolicy?.mode==='operator';
      const observed=personal&&replayDoorHistory?
        replayDoorHistory.at(s.seconds,replayDisclosurePolicy.observerId,door.id):
        null;
      const directlyObserved=!personal&&liveVisibility(s,doorCenter(door));
      if(!personal&&(omniscient||directlyObserved)){
        this.observedDoorOpen.set(door.id,door.openFraction??(door.open?1:0));
        this.observedDoorGlass.set(door.id,!!door.glassShattered);
      }
      if(object.glassPane)
        object.glassPane.visible=personal?
          !(observed?.glassShattered??false):
          replay||renderFrame?
            !(omniscient||directlyObserved?!!door.glassShattered:false):
            !(this.observedDoorGlass.get(door.id)??false);
      object.wedge.visible=personal?
        !!observed?.wedged:
        door.wedged===true&&(omniscient||directlyObserved);
      const fraction=personal?(observed?.openFraction??0):
        omniscient||directlyObserved?
        (door.openFraction??(door.open?1:0)):
        (s.intel.doorMemory.get(door.id)??0);
      const replayProgress=replay?.doors[door.id];
      // Never apply hidden live leaf motion over remembered personal state.
      const shownFraction=personal?fraction:
        (omniscient||directlyObserved)?(replayProgress??fraction):fraction;
      if(door.kind==='shutter'){
        object.leaf.rotation.y=0;
        object.leaf.position.y=shownFraction*37;
      }else if(door.kind==='sliding'){
        object.leaf.rotation.y=0;
        object.leaf.position.x=shownFraction*
          Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y)*(door.slideDirection??1);
      }else{
        const age=s.seconds-(door.lastKickAt??-100);
        const wobble=!personal&&age>=0&&age<.34?
          Math.sin(age*76)*.045*(1-age/.34):0;
        // A failed kick visibly rattles the leaf in its frame; the hinge
        // yaw remains authoritative for collision, LOS and navigation.
        object.leaf.rotation.y=(door.swing??-1)*shownFraction*1.54+wobble;
      }
      const reachable=selectedActor&&selectedActor.health>0&&
        (doorReachable(selectedActor.p,door)||
          (!!selectedEndpoint&&doorReachable(selectedEndpoint,door)));
      const focused=focusedDoorId===door.id;
      object.halo.visible=door.kind!=='shutter'&&door.kind!=='sliding'&&
        object.root.visible&&s.phase==='planning'&&
        (!focused||!!reachable)&&
        (liveVisibility(s,doorCenter(door))||
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
    const current=new Set(s.operators.map(a=>a.id));
    for(const [id,object] of this.actors)if(!current.has(id)){
      object.root.visible=false;object.status.visible=false;
      for(const shadow of object.contactShadows)shadow.visible=false;
    }
    // Civilian meshes are created only once visibly encountered, then
    // reused; unrevealed people cannot leak through walls or player fog.
    const present=new Set(s.civilians.map(c=>c.id));
    for(const [id,rig] of this.civilianRigs){
      if(present.has(id))continue;
      this.scene.remove(rig.root);this.civilianRigs.delete(id);
    }
    for(const civil of s.civilians){
      const visible=replayDisclosurePolicy?.mode==='operator'?
        replayCivilianDisclosed(s,civil.id,replayDisclosurePolicy):
        civilianPresentationVisible(civil,
          civil.replayVisible!==undefined,omniscient,
          liveVisibility(s,civil.p));
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
      const visible=replayDisclosurePolicy?
        replayActorDisclosed(s,actor,replayDisclosurePolicy):
        replayActorVisible(s,actor,omniscient);
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
      const friendlyAhead=teammateAheadForHandling(
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
    if(!this.casingMesh){
      // One scene-lit brass material keeps the pooled instancing and zero
      // casing shadows. Deeper copper/gold, rather than flat yellow paint.
      // The graphic world's three-band lighting can shade it at no extra draw.
      const brass=new THREE.MeshStandardMaterial({
        color:0xb38d59,roughness:.48,metalness:.52,flatShading:true});
      if(this.graphicLookEnabled)enableWorldGraphicMaterial(brass);
      this.mats.push(brass);
      this.casingMesh=new THREE.InstancedMesh(
        new THREE.CylinderGeometry(.75,.75,3.1,6),brass,CASING_LIMIT);
      this.casingMesh.castShadow=false;
      this.casingMesh.receiveShadow=false;
      this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.casingMesh.frustumCulled=false;
      this.effects.add(this.casingMesh);
    }
    const casingDraw=this.casingMesh;
    let casingCount=0,casingDirty=false;
    for(const brass of s.casings){
      // Casing positions could reveal a shooter who was never confirmed
      // by the selected observer. Contact review has no shot forensics.
      if(replayDisclosurePolicy?.mode==='operator')continue;
      if(!omniscient&&!liveVisibility(s,{x:brass.x,y:brass.z}))continue;
      if(casingCount>=CASING_LIMIT)break;
      // Full ballistic + bounce motion ends comfortably before two seconds.
      // Settled cartridges retain their previous instance matrices.
      if(this.casingIds[casingCount]!==brass.id||
         s.seconds-brass.at<2){
        const p=casingAt(brass,s.seconds);
        this.casingMatrix.position.set(p.x,p.y,p.z);
        this.casingMatrix.rotation.set(.9,p.rotation,1.2);
        const factor=brass.weapon==='shotgun'?1.45:
          brass.weapon==='smg'?.73:brass.weapon==='rifle'?1.2:1;
        this.casingMatrix.scale.set(factor,factor,factor);
        this.casingMatrix.updateMatrix();
        casingDraw.setMatrixAt(casingCount,this.casingMatrix.matrix);
        casingDirty=true;
      }
      this.casingIds[casingCount++]=brass.id;
    }
    if(casingDraw.count!==casingCount)casingDirty=true;
    casingDraw.count=casingCount;
    this.casingIds.length=casingCount;
    if(casingDirty)casingDraw.instanceMatrix.needsUpdate=true;
    // 079: One persistent, ID-keyed effect per actual simulation shot.
    // Shared geometry and bounded per-shot materials avoid frame-by-frame GC.
    const active=new Set<number>();
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
      const start=v(shot.start,shot.muzzleHeight??15),
        end=v(shot.end,shot.impactHeight??12);
      const flight=end.clone().sub(start);
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
          opacity:.82,depthWrite:false,side:THREE.DoubleSide}),
        IMPACT_MARK_LIMIT);
      this.impactDecalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.impactDecalMesh.frustumCulled=false;
      this.effects.add(this.impactDecalMesh);
    }
    const markDraw=this.impactDecalMesh;
    // The intentionally translucent wall cutaway never reveals stains
    // that are physically on the far side of a full-height wall.
    this.projectionCamera.getWorldDirection(this.groundMarkTowardCamera).negate();
    let markCount=0;
    for(const mark of s.impactMarks){
      if(replayDisclosurePolicy?.mode==='operator')continue;
      if(!omniscient&&!liveVisibility(s,mark.p))continue;
      if(groundMarkOccludedFromCamera(mark.p,this.groundMarkTowardCamera,
          s.site?.walls??WALLS))continue;
      if(markCount>=IMPACT_MARK_LIMIT)break;
      const dark=mark.surface==='blood'?0x763c38:
        mark.surface==='wood'?0x3a2920:
        mark.surface==='stone'?0x38332c:
        mark.surface==='metal'?0x202b2e:0x514e42;
      const groundRadius=mark.surface==='blood'?
        confinedGroundRadius(mark.p,4,s.site?.walls??WALLS):2.3;
      if(groundRadius<.5)continue; // never bleed into a solid wall
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
    // Retained physical magazines, grenades in flight and expanding flashes.
    const activeMag=new Set<number>();
    for(const mag of s.dropped){
      activeMag.add(mag.id);
      let mesh=this.discarded.get(mag.id);
      if(!mesh){
        mesh=new THREE.Mesh(new THREE.BoxGeometry(6,1.5,3),
          new THREE.MeshStandardMaterial({color:0x313b37,roughness:.75}));
        this.discarded.set(mag.id,mesh);this.effects.add(mesh);
      }
      const t=Math.min(1.5,mag.age);
      mesh.position.set(mag.p.x+Math.sin(mag.id)*t*3.5,
        Math.max(1.1,7+10*t-27*t*t),mag.p.y+
          Math.cos(mag.id)*t*2.7);
      mesh.rotation.set(.2*Math.min(1,t*8),mag.id*2.13,
        Math.min(1,t*4)*Math.PI*.40);
    }
    const liveGrenades=new Set<number>();
    for(const grenade of s.grenades){
      liveGrenades.add(grenade.id);
      let mesh=this.thrown.get(grenade.id);
      if(!mesh){
        mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(2.7,0),
          new THREE.MeshStandardMaterial({color:0x879184,roughness:.75}));
        this.thrown.set(grenade.id,mesh);this.effects.add(mesh);
      }
      const t=Math.min(1,grenade.age/.55);
      const path=grenade.path?sampleThrow(grenade.path,t):null;
      mesh.position.set(grenade.p.x,path?.height??(1+20*4*t*(1-t)),
        grenade.p.y);
    }
    const liveBursts=new Set<number>();
    for(const burst of s.flashBursts){
      liveBursts.add(burst.id);
      let mesh=this.detonations.get(burst.id);
      if(!mesh){
        mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),
          new THREE.MeshBasicMaterial({color:0xfff1c7,transparent:true,
            opacity:.8,depthWrite:false}));
        this.detonations.set(burst.id,mesh);this.effects.add(mesh);
      }
      mesh.position.set(burst.p.x,13,burst.p.y);
      mesh.scale.setScalar(5+70*burst.age);
      (mesh.material as THREE.MeshBasicMaterial).opacity=
        Math.max(0,.78*(1-burst.age/.7));
    }
    for(const [cache,activeIds] of [
      [this.discarded,activeMag],[this.thrown,liveGrenades],
      [this.detonations,liveBursts],
    ] as [Map<number,THREE.Mesh>,Set<number>][])
      for(const [id,mesh] of cache)if(!activeIds.has(id)){
        this.effects.remove(mesh);mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();cache.delete(id);
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
    const memorySignature=fogMemoryFingerprint({
      mode:s.intel.mode,seed:s.site?.seed??null,
      seenRevision:s.seenGroundRevision,
      rooms:s.intel.rooms.size,walls:s.intel.walls.size,
      doors:s.intel.doors.size,cover:s.intel.cover.size
    });
    const fogSignature=omniscient?'omniscient':fogFingerprint({
      mode:s.intel.mode,seed:s.site?.seed??null,
      seenCount:s.seenGround.size,seenRevision:s.seenGroundRevision,
      revision:s.objectRevision,
      actors:team(s).filter(a=>a.health>0).map(a=>({
        id:a.id,x:a.p.x,y:a.p.y,heading:a.heading,
        posture:a.posture,health:a.health
      })),
      doors:s.doors.map(d=>({id:d.id,fraction:d.openFraction??(d.open?1:0)}))
    });
    // Two sessions may have identical knowledge counts but different sites.
    const sessionChanged=this.lastFogSession!==s;
    if(!omniscient&&(sessionChanged||
        this.fogAt>=(this.quality.mode==='quality'?.055:.10)||this.fogAt<0)&&
        (sessionChanged||fogSignature!==this.lastFogSignature)){
      this.fogAt=0;this.lastFogSignature=fogSignature;
      this.lastFogSession=s;
      if(this.fogLegacy){
        paintFogMask(this.fogContext,s,this.fogDiagnostic);
        this.fogMemoryPaints++;this.fogSightPaints++;
      }else{
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
    try{this.renderer.render(this.scene,camera);}
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
