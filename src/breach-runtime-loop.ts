/** Breach runtime: fixed-step scheduling and presentation synchronization.
 * The authoritative motor, damage, AI and visibility remain in breach-game.ts.
 */
import type {BreachBootConfig} from './breach-boot-config.ts';
import type {CampaignMode} from './breach-app-mode.ts';
import {stepSession,team,type Session,type TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {fixedStepBudget} from './breach-fixed-clock.ts';
import {renderSnapshot,type RenderActor} from './breach-frame-interpolation.ts';
import {FrameMeter} from './breach-perf.ts';
import {shouldSubmitIdle3D} from './rendering/breach-idle-3d-cadence.ts';
import {PerformanceTimeline,emptyPerformanceSceneCosts,
 type PreviousFrameWork}
 from './breach-performance-timeline.ts';
import {BreachPerfTimelinePanel} from './ui/breach-perf-timeline-panel.ts';
import {drainSightDiagnostics,setSightDiagnosticsEnabled} from './breach-sight-cost-counters.ts';
import {PhysicalActionRings} from './ui/physical-action-rings.ts';
import {awarenessDebugLine} from './breach-awareness-debug.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import type {ReplayQuickVideo} from './breach-replay-video.ts';
import type {createBreachAudioController} from './breach-audio-controller.ts';


export type RuntimeFrameMode='suspended'|'live'|'replay'|'idle';
/** Pure dispatch policy. Never advances a simulation tick. */
export function runtimeFrameMode(input:{
 mode:CampaignMode;quickPlayBusy:boolean;replaying:boolean;phase:Session['phase'];
}):RuntimeFrameMode{
 if(input.quickPlayBusy||
    ((input.mode==='menu'||input.mode==='home')&&!input.replaying))
   return 'suspended';
 if(input.replaying)return 'replay';
 return input.phase==='running'?'live':'idle';
}
export type BreachRuntimeLoopHooks={
  boot:BreachBootConfig;
 getSession:()=>Session;
 getRecorder:()=>MissionRecorder;
 getMode:()=>CampaignMode;
 isReplaying:()=>boolean;
 isQuickPlayBusy:()=>boolean;
 getSelected:()=>string;
 getSelectedActor:()=>TeamActor|undefined;
 getDoorFocusId:()=>string|null;
 getStage:()=>TacticalScene3D|null;
 getViewMode:()=>ViewMode;
 isMissionTerminal:(session:Session)=>boolean;
 isStudioVisible:()=>boolean;
 getReplayPresentation:()=>ReplayPresentation|null;
 setReplayPresentation:(value:ReplayPresentation|null)=>void;
 invalidateFog:()=>void;
 advanceReplayCamera:(dt:number)=>void;
 updateHud:()=>void;
 updateReplayHud:()=>void;
 updateContext:()=>void;
 advanceContextPalette:(dt:number)=>void;
 renderFrame:(dt:number)=>void;
 drawTacticalFrameFeedback:(studioOccludesTactical:boolean)=>void;
 /** Optional post-round one-frame capture; no live-game GPU work. */
 captureHighlightFrame?:(scene:HTMLCanvasElement|null,
   overlay:HTMLCanvasElement,time:number,perspective:string)=>void;
 worldToScreen:(point:Pt,offset:number)=>Pt;
 canvas:HTMLCanvasElement;
 playback:ReplayPlaybackController;
 camera:ReplayCameraController;
 knowledge:ReplayKnowledgeController;
 bodycam:ReplayBodycamController;
 video:ReplayQuickVideo;
 audio:ReturnType<typeof createBreachAudioController>;
 /** Read-only notification for the in-match PERF HUD control. */
 onProfilerChange?:(visible:boolean,recording:boolean)=>void;
};
export function createBreachRuntimeLoop(config:BreachRuntimeLoopHooks){
 let last=performance.now(),accum=0,hudAt=0,running=false,frameQueued=false;
 let previousRenderActors:Record<string,RenderActor>|null=null;
 let previousRenderDoors:Record<string,number>|null=null;
 let profiledStage:TacticalScene3D|null=null;

const awarenessParam=config.boot.awareness;
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

// The 60s RAF bucket history is always collected at negligible cost during
// tactical gameplay; expensive attribution and DOM updates remain opt-in.
// ?perf=1 still opens the legacy detailed overlay immediately.
let perfPanel:BreachPerfTimelinePanel|null=config.boot.perfOverlay?
  new BreachPerfTimelinePanel(()=>{setProfilerOpen(false);}):null;
let perfOverlay=perfPanel?.root??null;
if(perfOverlay)document.body.append(perfOverlay);
setSightDiagnosticsEnabled(!!perfOverlay);
let frameMeter:FrameMeter|null=perfOverlay?new FrameMeter():null;
const perfTimeline=new PerformanceTimeline();
let perfTimelineSession:Session|null=null;
let previousCoarseJs:number|undefined;
let previousCoarseMode:RuntimeFrameMode|undefined;
// Low-cost, always-on parent CPU slices (no actor/scene instrumentation).
let previousCoarseWork:PreviousFrameWork|undefined;
let previousCoarseSim:number|undefined;
function performanceMatchContext(state:Session,mode:RuntimeFrameMode):string{
 const seed=state.site?.seed??'unknown';
 return 'FIELDWORK MATCH · seed '+seed+' · phase '+state.phase+
  ' · capture '+mode+' · detailed profiling '+(perfOverlay?'ON':'OFF');
}
function setProfilerOpen(open:boolean):boolean{
 if(open&&!perfPanel){
  perfPanel=new BreachPerfTimelinePanel(()=>{setProfilerOpen(false);});
  perfOverlay=perfPanel.root;
  document.body.append(perfOverlay);
  frameMeter=new FrameMeter();
  setSightDiagnosticsEnabled(true);
  // Activate full scene phase attribution immediately, even in a normal URL.
  config.getStage()?.setPerformanceProfilingEnabled?.(true);
  previousPerfJs=previousCoarseJs;
  previousPerfMode=previousCoarseMode;
  previousPerfWork=previousCoarseWork;
  previousPerfSim=previousCoarseSim;
 }
 if(!perfPanel||!perfOverlay)return false;
 perfOverlay.hidden=!open;
 if(open){
  perfPanel.update('Detailed CPU diagnostics armed. Earlier history includes RAF/JS only.',
   perfTimeline,'planning',config.getViewMode(),
   performanceMatchContext(config.getSession(),config.getSession().phase==='running'?'live':'idle'));
 }
 config.onProfilerChange?.(open,true);
 return open;
}
function toggleProfiler():boolean{return setProfilerOpen(!!perfOverlay?.hidden||!perfOverlay);}
function isProfilerVisible():boolean{return !!perfOverlay&&!perfOverlay.hidden;}
function isProfilerRecording():boolean{return !!perfOverlay;}
// Explicit A/B only. At rest, 3D can submit at 30Hz while the RAF,
// 2D order overlays, HUD, audio and all game simulation remain unchanged.
const idle3dExperiment=config.boot.idle3dExperiment;
let last3dInputAt=-Infinity,last3dUpdateAt=-Infinity;
let last3dSession:Session|null=null,last3dMode:RuntimeFrameMode|null=null;
let idle3dSkipped=0;
if(idle3dExperiment){
 const markInput=()=>{last3dInputAt=performance.now();};
 for(const event of ['pointerdown','pointermove','touchstart',
   'touchmove','wheel','keydown'])
  window.addEventListener(event,markInput,{passive:true});
}
// The RAF interval includes the *previous* callback, not the JS that
// runs after the current RAF fires. Include all preceding diagnostic work.
let previousPerfJs:number|undefined;
let previousPerfSim:number|undefined;
let previousPerfMode:RuntimeFrameMode|undefined;
let previousPerfWork:PreviousFrameWork|undefined;
let previousHotSim:string|undefined;
type SightTotal={queries:number;hits:number;misses:number;
 bypasses:number;invalidations:number};
let lastSightTotals:SightTotal|null=null;
let lastFogPaints=0,lastShadowRefreshes=0;
const intervalSight={queries:0,hits:0,misses:0,
 bypasses:0,invalidations:0};
const physicalActionRings=new PhysicalActionRings();
/** Idempotent RAF registration: fast stop/start cannot queue two frames. */
 function scheduleFrame():void{
  if(frameQueued)return;
  frameQueued=true;
  requestAnimationFrame(tick);
 }
function tick(now:number){
  frameQueued=false;
  if(!running)return;
  const state=config.getSession(),recorder=config.getRecorder(),
    replaying=config.isReplaying(),selected=config.getSelected();
  const campaignMode=config.getMode(),stage=config.getStage(),
    viewMode=config.getViewMode(),doorFocusId=config.getDoorFocusId();
  const replayPlayback=config.playback,replayCamera=config.camera,
    replayDirector=replayCamera.director,replayKnowledge=config.knowledge,
    replayBodycam=config.bodycam,replayQuickVideo=config.video,
    audioController=config.audio,canvas=config.canvas;
  // A new map can install its own scene after PERF was armed. Configure
  // that scene once; never re-arm or allocate during each steady RAF.
  if(stage!==profiledStage){
   stage?.setPerformanceProfilingEnabled?.(!!perfOverlay);
   profiledStage=stage;
  }
  const frameMode=runtimeFrameMode({mode:campaignMode,
    quickPlayBusy:config.isQuickPlayBusy(),replaying,phase:state.phase});
  if(perfTimeline&&perfTimelineSession!==state){
   perfTimeline.reset();perfTimelineSession=state;
   previousPerfJs=undefined;previousPerfSim=undefined;
   previousPerfMode=undefined;previousPerfWork=undefined;
   previousHotSim=undefined;
   previousCoarseJs=undefined;previousCoarseMode=undefined;
   previousCoarseWork=undefined;previousCoarseSim=undefined;
   lastSightTotals=null;lastFogPaints=0;lastShadowRefreshes=0;
   // Don't carry a previous map's door IDs into the next session.
   previousRenderActors=null;previousRenderDoors=null;
   for(const k of Object.keys(intervalSight) as Array<keyof SightTotal>)
    intervalSight[k]=0;
  }
  const coarseStart=perfOverlay?0:performance.now();
  const perfStart=perfOverlay?performance.now():0;
  const frameGap=Math.max(0,now-last);
  const dt=Math.min(.08,frameGap/1000);last=now;
  if(frameMode==='suspended'){
   previousPerfJs=undefined;previousPerfSim=undefined;
   previousPerfMode=undefined;previousPerfWork=undefined;
   previousHotSim=undefined;
   previousCoarseJs=undefined;previousCoarseMode=undefined;
   previousCoarseWork=undefined;previousCoarseSim=undefined;
   accum=0;previousRenderActors=null;previousRenderDoors=null;
   physicalActionRings.clear();
   scheduleFrame();return;
  }
  let simSteps=0;
  let recordingMs=0,simulationMeasuredMs=0;
  const simPhaseCosts=perfOverlay?new Map<string,number>():null;
  if(frameMode==='live'){
    const budget=fixedStepBudget(accum,dt);
    accum=budget.remaining;
    for(let i=0;i<budget.steps;i++){
      previousRenderActors=renderSnapshot(state.operators);
      // A previous-frame door sample is consumed synchronously by this
      // RAF's scene update. Reuse the same bounded object during the round
      // instead of allocating a map and tuples on every 60Hz tick.
      if(!previousRenderDoors)previousRenderDoors={};
      for(const door of state.doors)
       previousRenderDoors[door.id]=door.openFraction??(door.open?1:0);
      const simulationStart=performance.now();
      stepSession(state,1/60,simPhaseCosts?
        (name,ms)=>simPhaseCosts.set(name,
          (simPhaseCosts.get(name)??0)+ms):undefined);
      simulationMeasuredMs+=performance.now()-simulationStart;
      simSteps++;
      const beforeRecording=performance.now();
      recorder.capture(state,config.isMissionTerminal(state));
      recordingMs+=performance.now()-beforeRecording;
    }
  }else{accum=0;previousRenderActors=null;previousRenderDoors=null;}
  if(frameMode==='replay'&&replayPlayback.playing){
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
        config.setReplayPresentation(playbackStep.frame.presentation??null);
        config.invalidateFog();
      }
      if(playbackStep.resetAudio)audioController.stopReplaySounds();
      else audioController.playReplayBetween(playbackStep.previousTime,
        playbackStep.time,recorder,replayPlayback.rate);
      if(playbackStep.finishedIncident)audioController.stopReplaySounds();
    }
  }
  const runtimeUiStart=performance.now();
  if(replaying)config.advanceReplayCamera(dt);
  const uiCameraEnd=perfOverlay?performance.now():0;
  audioController.consumeLiveFrame(state,recorder,selected,replaying);
  const uiAudioEnd=perfOverlay?performance.now():0;
  // Execution's full HUD reconciliation is DOM-heavy; explicit commands
  // still call updateHud() immediately, while live status refreshes ~5.5Hz.
  // Completed missions have no live status clock to reconcile at 8 Hz.
  // Explicit selection/commands still update the HUD immediately. Keep
  // planning at 120ms and active execution at 180ms as before.
  const terminalHud=(state.phase==='won'||state.phase==='lost')&&!replaying;
  const hudPeriod=state.phase==='running'?180:terminalHud?750:120;
  // After an OS/browser suspension the completed HUD is already static.
  // Do not combine its costly DOM reconciliation with the first 3D resume
  // frame. Ordinary live/planning/replay resume paths remain untouched.
  if(terminalHud&&frameGap>1000)hudAt=now;
  if(now-hudAt>hudPeriod){
    config.updateHud();if(replaying)config.updateReplayHud();hudAt=now;
  }
  const uiHudEnd=perfOverlay?performance.now():0;
  // The manager owns its DOM nodes for the lifetime of this view.
  physicalActionRings.update(team(state),state.doors,
    frameMode==='live',
    p=>config.worldToScreen(p,viewMode==='plan2d'?14:34));
  const perfRenderStart=performance.now();
  const runtimeUiMs=perfRenderStart-runtimeUiStart;
  // Opt-in child timings. Each is part of UI / audio, never additive to
  // previous JS or the parent UI slice. No normal-frame performance probes.
  const runtimeUiDetail=perfOverlay?{
    camera:uiCameraEnd-runtimeUiStart,
    audio:uiAudioEnd-uiCameraEnd,
    hud:uiHudEnd-uiAudioEnd,
    rings:perfRenderStart-uiHudEnd
  }:undefined;
  // The Studio is an opaque full-screen view. Skip only hidden rendering,
  // never fixed-step gameplay or authoritative replay/simulation state.
  const studioOccludesTactical=config.isStudioVisible()&&
   !replayQuickVideo.active;
  const stageAvailable=!studioOccludesTactical&&!!stage&&viewMode!=='plan2d';
  const updated3d=stageAvailable&&shouldSubmitIdle3D({
   enabled:idle3dExperiment,mode:frameMode,viewMode,
   studioOccludes:studioOccludesTactical,now,
   lastSceneAt:last3dUpdateAt,lastSceneMode:last3dMode,
   sameSession:last3dSession===state,lastInputAt:last3dInputAt
  });
  if(stageAvailable&&!updated3d)idle3dSkipped++;
  // The presentation-only idle clock must advance by actual elapsed wall
  // time since the prior 3D submission, not by one skipped RAF's dt.
  const sceneDt=idle3dExperiment&&frameMode==='idle'&&
   last3dSession===state&&last3dMode==='idle'&&
   Number.isFinite(last3dUpdateAt)?
    Math.min(.08,Math.max(0,(now-last3dUpdateAt)/1000)):dt;
  if(updated3d&&stage){
    stage.setMiniatureFocusContext(replaying,sceneDt);
    stage.update(state,selected,sceneDt,doorFocusId,
      replaying&&replayKnowledge.omniscient&&
        !replayCamera.directorCamDisclosure(),
      replaying?config.getReplayPresentation():null,
      frameMode==='live'&&previousRenderActors?
        {previous:previousRenderActors,previousDoors:previousRenderDoors??undefined,
          alpha:Math.min(1,accum*60)}:null,
      // Pausing the encounter must NOT switch to render-local footsteps.
      !replaying?recorder.motion.presentation(Math.max(0,
        state.phase==='running'?
          state.seconds-(1-Math.min(1,accum*60))/60:
          state.seconds),state.operators.map(a=>a.id),false):null,
      // Director CAM uses personal sight only for its rendered view.
      // The replay-wide TEAM/FULL preference is never silently mutated.
      replaying?(replayCamera.directorCamDisclosure()??
        replayKnowledge.disclosure()):null,
      replaying?replayKnowledge.doorHistory:null,
      replaying&&(replayCamera.directorCamActor??
        replayKnowledge.observerId)?
        replayKnowledge.personalGround?.at(replayPlayback.time,
          replayCamera.directorCamActor??replayKnowledge.observerId!)??null:
        null,
      replaying?replayKnowledge.windowHistory:null);
    last3dUpdateAt=now;last3dSession=state;last3dMode=frameMode;
  }
  const overlayBegin=perfOverlay?performance.now():0;
  const sceneUpdateEnd=performance.now();
  if(!studioOccludesTactical)config.renderFrame(dt);
  const renderEnd=performance.now();
  if(replaying&&!studioOccludesTactical&&config.captureHighlightFrame)
    config.captureHighlightFrame(stage&&viewMode!=='plan2d'?stage.canvas:null,
      canvas,replayPlayback.time,
      replayCamera.mode==='director'&&replayCamera.lens==='cam'?
        'RECONSTRUCTED DIRECTOR CAM':viewMode==='plan2d'?
        'TACTICAL PLAN':'REPLAY '+replayCamera.mode.toUpperCase());
  if(replaying&&replayQuickVideo.active){
    replayQuickVideo.drawFrame(
      stage&&viewMode!=='plan2d'?stage.canvas:null,canvas,replayPlayback.time,
      replayBodycam.active&&replayKnowledge.observerId?
        {observerId:replayKnowledge.observerId,mount:replayBodycam.mount}:null);
    if(replayPlayback.time>=recorder.duration)replayQuickVideo.finishAtEnd();
    else if(!replayPlayback.playing)replayQuickVideo.stop();
  }
  config.drawTacticalFrameFeedback(studioOccludesTactical);
  config.updateContext();config.advanceContextPalette(dt);
  const diagnosticsStart=performance.now();
  let currentSceneCosts=emptyPerformanceSceneCosts();
  let currentActorCosts:PreviousFrameWork['actor'];
  let currentHotSim='';
  if(frameMeter&&perfOverlay){
    const end=performance.now(),stats=stage?.performanceStats();
    currentSceneCosts={
     ...(updated3d?stats?.scenePhases??emptyPerformanceSceneCosts():
      emptyPerformanceSceneCosts())
    };
    // Skipped 3D frames do not inherit stale phase timings from the last
    // submitted frame, or profiler samples would falsely claim 3D work.
    const actorCost=updated3d?stats?.actorPhaseCosts:null;
    currentActorCosts=actorCost?{...actorCost}:undefined;
    const sightTotal=stats?.presentationSight;
    const sightDelta={queries:0,hits:0,misses:0,
     bypasses:0,invalidations:0};
    if(sightTotal){
      for(const key of Object.keys(sightDelta) as Array<keyof SightTotal>){
        const value=sightTotal[key];
        const previous=lastSightTotals?.[key]??value;
        sightDelta[key]=value>=previous?value-previous:0;
        intervalSight[key]+=sightDelta[key];
      }
      lastSightTotals={queries:sightTotal.queries,hits:sightTotal.hits,
       misses:sightTotal.misses,bypasses:sightTotal.bypasses,
       invalidations:sightTotal.invalidations};
    }
    const fogNow=(stats?.fogSightPaints??0)+(stats?.fogMemoryPaints??0);
    const shadowNow=stats?.shadowRefreshes??0;
    const fogDelta=Math.max(0,fogNow-lastFogPaints);
    const shadowDelta=Math.max(0,shadowNow-lastShadowRefreshes);
    lastFogPaints=fogNow;lastShadowRefreshes=shadowNow;
    let hotSim='';
    if(simPhaseCosts){
      let maxMs=0;
      // A motor/LOS subphase is nested inside an operator's total CPU.
      // Prefer non-nested phases when naming the hot simulation owner;
      // otherwise the compact report can lose the actor's true total.
      for(const [name,ms] of simPhaseCosts)
       if(!name.includes('/')&&ms>maxMs){hotSim=name;maxMs=ms;}
      if(maxMs>0){
       const owner=hotSim;
       // Parent operator timing still measures the whole actor. Display
       // nested diagnostic CPU slices as additional context instead of
       // incorrectly allowing their overlapping costs to sum as work.
       let detail='';
       if((owner.startsWith('operator-')&&!owner.includes('/'))||
          owner==='civilian-motion'){
        const stages=[...simPhaseCosts].filter(([name])=>
          name.startsWith(owner+'/')).sort((a,b)=>b[1]-a[1]).slice(0,3);
        if(stages.length)detail=' ['+stages.map(([name,ms])=>
          name.slice(owner.length+1)+' '+ms.toFixed(0)).join(', ')+']';
       }
       hotSim+=' '+maxMs.toFixed(1)+'ms'+detail;
      }
    }
    currentHotSim=hotSim;
    if(perfTimeline){
      perfTimeline.add({at:now,raf:frameGap,js:end-perfStart,
       previousJs:previousPerfJs,previousSim:previousPerfSim,
       previousPhase:previousPerfMode,
       previousHotSim,
       previousWork:previousPerfWork,
       sync:sceneUpdateEnd-perfRenderStart,sim:simulationMeasuredMs,
       recording:recordingMs,ui:runtimeUiMs,overlay:end-overlayBegin,
       scene:currentSceneCosts,
       draws:updated3d?stats?.calls??0:0,steps:simSteps,phase:frameMode,
       camera:viewMode,hotSim,fogPaints:fogDelta,
       shadowRefreshes:shadowDelta,sight:sightDelta});
    }
    frameMeter.add({frame:end-perfStart,cadence:frameGap,sim:perfRenderStart-perfStart,
      scene:overlayBegin-perfRenderStart,
      sceneUpdate:sceneUpdateEnd-perfRenderStart,
      render:renderEnd-sceneUpdateEnd,overlay:end-overlayBegin,
      recording:recordingMs,steps:simSteps,
      draws:updated3d?stats?.calls??0:0,
      triangles:updated3d?stats?.triangles??0:0});
    // The optional diagnostics must not sort rolling samples every RAF:
    // that would contaminate the very hitch measurements they report.
    if(Math.floor(now/750)!==Math.floor((now-dt*1000)/750)){
      const m=frameMeter.summary();
      const sight=drainSightDiagnostics();
      const scenePhases=updated3d?stats?.scenePhases:null;
      const output='MODE '+frameMode+' (recent 120 frames)'+
        (idle3dExperiment?' · IDLE3D 30 · SKIPS '+idle3dSkipped:'')+
        '\nJS '+m.p50.toFixed(1)+'ms · P95 '+
        m.p95.toFixed(1)+' · MAX '+m.worst.toFixed(1)+
        '\nRAF GAP P50 '+m.rafP50.toFixed(1)+'ms · P95 '+
        m.rafP95.toFixed(1)+'ms'+
        '\nSIM+REC '+m.simulation.toFixed(1)+'ms / '+m.steps.toFixed(1)+
        ' ticks · REC '+m.recording.toFixed(1)+'ms · SCENE '+m.scene.toFixed(1)+'ms'+
        '\nSYNC '+m.sceneUpdate.toFixed(1)+'ms · RENDER '+m.render.toFixed(1)+'ms'+
        '\nCUM FOG M/S '+(stats?.fogMemoryPaints??0)+'/'+
          (stats?.fogSightPaints??0)+' · SHADOW REF/REUSE '+
          (stats?.shadowRefreshes??0)+'/'+(stats?.shadowReuses??0)+
          ' · MAP '+(stats?.shadowMapSize??0)+'px'+
        '\nSIGHT (750ms) '+sight.liveQueries+' Q / '+
          sight.liveOcclusionProbes+' LOS / '+sight.liveHits+
          ' HIT · FULL '+sight.fullViewQueries+
        '\nPERSONAL '+sight.personalQueries+' Q / '+
          sight.personalOcclusionProbes+' LOS'+
        '\nP1 VISIBLE Q/H/M/B '+(stats?.presentationSight.queries??0)+'/'+
          (stats?.presentationSight.hits??0)+'/'+
          (stats?.presentationSight.misses??0)+'/'+
          (stats?.presentationSight.bypasses??0)+
        '\nP1 750ms Q/H/M/B '+intervalSight.queries+'/'+
          intervalSight.hits+'/'+intervalSight.misses+'/'+
          intervalSight.bypasses+' · INVALID '+intervalSight.invalidations+
          ' · POLICY '+(stats?.presentationSightPolicy??'planning')+
        ' · INV/EVI '+(stats?.presentationSight.invalidations??0)+'/'+
          (stats?.presentationSight.evictions??0)+
        '\nP1 MISS D/O/DR/I/E '+(stats?.presentationSight.decorMisses??0)+'/'+
          (stats?.presentationSight.openingMisses??0)+'/'+
          (stats?.presentationSight.doorMisses??0)+'/'+
          (stats?.presentationSight.impactMisses??0)+'/'+
          (stats?.presentationSight.effectMisses??0)+
        '\nFILM '+recorder.frames.length+' frames · '+
        recorder.motion.stepEventCount+' step events'+
        '\nDOM '+document.getElementsByTagName('*').length+
        ' · ACTION RINGS '+physicalActionRings.size+
        ' · SITE MATS '+(stats?.siteMaterialCount??0)+
        ' · RIGS A/C '+(stats?.actorRigCount??0)+'/'+
          (stats?.civilianRigCount??0)+
        ' · GEO/TEX '+(stats?.geometryCount??0)+'/'+
          (stats?.textureCount??0)+
        '\nP1.5 SCENE ENV/CAM/VIS '+(scenePhases?.environment??0).toFixed(1)+'/'+
          (scenePhases?.camera??0).toFixed(1)+'/'+
          (scenePhases?.disclosure??0).toFixed(1)+'ms'+
        '\nP1.5 POSE/FX/FOG '+(scenePhases?.actors??0).toFixed(1)+'/'+
          (scenePhases?.effects??0).toFixed(1)+'/'+
          (scenePhases?.fog??0).toFixed(1)+'ms'+
        '\nP1.5 SHADOW/CAM/GPU-SUBMIT '+(scenePhases?.shadows??0).toFixed(1)+'/'+
          (scenePhases?.postCamera??0).toFixed(1)+'/'+
          (scenePhases?.gpuSubmit??0).toFixed(1)+'ms (CPU)'+
        '\nOVERLAY '+m.overlay.toFixed(1)+'ms · DRAWS '+
        m.draws.toFixed(0)+' · TRI '+m.triangles.toFixed(0)+
        (simPhaseCosts&&simPhaseCosts.size?'\nHOT SIM '+
          [...simPhaseCosts].sort((a,b)=>b[1]-a[1]).slice(0,2)
            .map(([name,ms])=>name+' '+ms.toFixed(1)+'ms').join(' / '):'');
      if(perfPanel&&!perfPanel.root.hidden)perfPanel.update(output,perfTimeline,
       stats?.presentationSightPolicy??'planning',
       idle3dExperiment?viewMode+' idle3d30':viewMode,
       performanceMatchContext(state,frameMode));
      for(const k of Object.keys(intervalSight) as Array<keyof SightTotal>)
       intervalSight[k]=0;
    }
  }
  if(awarenessPanel&&Math.floor(now/500)!==
      Math.floor((now-dt*1000)/500)){
    const inspected=state.operators.find(a=>a.id===awarenessParam)??config.getSelectedActor();
    awarenessPanel.textContent=inspected?awarenessDebugLine(inspected):
      'No selected actor';
  }
  if(!perfOverlay){
   // Idle and live RAF history remains available BEFORE opening the graph.
   // Record only one JS wall-time and bucket maxima; no phase probes or DOM.
   const js=performance.now()-coarseStart;
   perfTimeline.addCoarseFrame(now,frameGap,js,frameMode,viewMode,
    previousCoarseJs,previousCoarseMode,previousCoarseWork,previousCoarseSim);
   previousCoarseJs=js;previousCoarseMode=frameMode;
   // Archive one previous-callback breakdown only at the 250ms peak.
   // No detailed scene/pose tracing or diagnostic DOM work is activated.
   previousCoarseWork={
    beforeUi:runtimeUiStart-coarseStart,
    ui:runtimeUiMs,
    sceneSync:sceneUpdateEnd-perfRenderStart,
    render:renderEnd-sceneUpdateEnd,
    postRender:diagnosticsStart-renderEnd,
    diagnostics:0,scene:emptyPerformanceSceneCosts()
   };
   previousCoarseSim=simulationMeasuredMs;
  }
  if(perfOverlay){
   // Measure at the end, *after* optional 750ms panel reporting. Otherwise
   // diagnostic DOM/canvas work masquerades as unexplained callback wait.
   const afterDiagnostics=performance.now();
   previousPerfJs=afterDiagnostics-perfStart;
   previousPerfSim=simulationMeasuredMs;
   previousPerfMode=frameMode;
   previousHotSim=currentHotSim;
   previousPerfWork={
    beforeUi:Math.max(0,runtimeUiStart-perfStart-
     simulationMeasuredMs-recordingMs),
    ui:runtimeUiMs,
    uiDetail:runtimeUiDetail,
    sceneSync:sceneUpdateEnd-perfRenderStart,
    render:renderEnd-sceneUpdateEnd,
    postRender:diagnosticsStart-renderEnd,
    diagnostics:afterDiagnostics-diagnosticsStart,
    scene:currentSceneCosts,
    actor:currentActorCosts
   };
  }
  scheduleFrame();
}
 /** Reset render-only leftovers across mission/replay transitions. */
 function resetPresentation():void{
  accum=0;hudAt=0;
  last3dUpdateAt=-Infinity;last3dSession=null;last3dMode=null;
  idle3dSkipped=0;
  previousPerfJs=undefined;previousPerfSim=undefined;
  previousPerfMode=undefined;previousPerfWork=undefined;
  previousHotSim=undefined;
  previousRenderActors=null;previousRenderDoors=null;
  previousCoarseWork=undefined;previousCoarseSim=undefined;
  previousCoarseJs=undefined;previousCoarseMode=undefined;
  physicalActionRings.clear();
 }
 function start():void{
  if(running)return;
  running=true;last=performance.now();scheduleFrame();
 }
 function stop():void{
  running=false;resetPresentation();
 }
 return {start,stop,resetPresentation,toggleProfiler,isProfilerVisible,
  isProfilerRecording};
}
