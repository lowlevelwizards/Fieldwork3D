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
};
export function createBreachRuntimeLoop(config:BreachRuntimeLoopHooks){
 let last=performance.now(),accum=0,hudAt=0,running=false,frameQueued=false;
 let previousRenderActors:Record<string,RenderActor>|null=null;
 let previousRenderDoors:Record<string,number>|null=null;

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

// Opt-in developer overlay: add ?perf=1 to measure render and simulation
// without polling DOM/layout or allocating objects in the normal game loop.
const perfPanel=config.boot.perfOverlay?
  new BreachPerfTimelinePanel():null;
const perfOverlay=perfPanel?.root??null;
if(perfOverlay)document.body.append(perfOverlay);
// Sight instrumentation is opt-in only. Normal mission loops never record
// counters, and neither gameplay nor replay reads these diagnostics.
setSightDiagnosticsEnabled(!!perfOverlay);
const frameMeter=perfOverlay?new FrameMeter():null;
const perfTimeline=perfOverlay?new PerformanceTimeline():null;
let perfTimelineSession:Session|null=null;
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
  const frameMode=runtimeFrameMode({mode:campaignMode,
    quickPlayBusy:config.isQuickPlayBusy(),replaying,phase:state.phase});
  if(perfTimeline&&perfTimelineSession!==state){
   perfTimeline.reset();perfTimelineSession=state;
   previousPerfJs=undefined;previousPerfSim=undefined;
   previousPerfMode=undefined;previousPerfWork=undefined;
   previousHotSim=undefined;
   lastSightTotals=null;lastFogPaints=0;lastShadowRefreshes=0;
   for(const k of Object.keys(intervalSight) as Array<keyof SightTotal>)
    intervalSight[k]=0;
  }
  const perfStart=perfOverlay?performance.now():0;
  const frameGap=Math.max(0,now-last);
  const dt=Math.min(.08,frameGap/1000);last=now;
  if(frameMode==='suspended'){
   previousPerfJs=undefined;previousPerfSim=undefined;
   previousPerfMode=undefined;previousPerfWork=undefined;
   previousHotSim=undefined;
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
      previousRenderDoors=Object.fromEntries(state.doors.map(d=>
        [d.id,d.openFraction??(d.open?1:0)]));
      const simulationStart=perfOverlay?performance.now():0;
      stepSession(state,1/60,simPhaseCosts?
        (name,ms)=>simPhaseCosts.set(name,
          (simPhaseCosts.get(name)??0)+ms):undefined);
      if(perfOverlay)simulationMeasuredMs+=performance.now()-simulationStart;
      simSteps++;
      if(perfOverlay){
        const beforeRecording=performance.now();
        recorder.capture(state,config.isMissionTerminal(state));
        recordingMs+=performance.now()-beforeRecording;
      }else recorder.capture(state,config.isMissionTerminal(state));
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
  const runtimeUiStart=perfOverlay?performance.now():0;
  if(replaying)config.advanceReplayCamera(dt);
  audioController.consumeLiveFrame(state,recorder,selected,replaying);
  // Execution's full HUD reconciliation is DOM-heavy; explicit commands
  // still call updateHud() immediately, while live status refreshes ~5.5Hz.
  if(now-hudAt>(state.phase==='running'?180:120)){
    config.updateHud();if(replaying)config.updateReplayHud();hudAt=now;
  }
  // The manager owns its DOM nodes for the lifetime of this view.
  physicalActionRings.update(team(state),state.doors,
    frameMode==='live',
    p=>config.worldToScreen(p,viewMode==='plan2d'?14:34));
  const perfRenderStart=perfOverlay?performance.now():0;
  const runtimeUiMs=perfOverlay?perfRenderStart-runtimeUiStart:0;
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
  const sceneUpdateEnd=perfOverlay?performance.now():0;
  if(!studioOccludesTactical)config.renderFrame(dt);
  const renderEnd=perfOverlay?performance.now():0;
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
  const diagnosticsStart=perfOverlay?performance.now():0;
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
      for(const [name,ms] of simPhaseCosts)
       if(ms>maxMs){hotSim=name;maxMs=ms;}
      if(maxMs>0){
       const owner=hotSim;
       // Parent operator timing still measures the whole actor. Display
       // nested diagnostic CPU slices as additional context instead of
       // incorrectly allowing their overlapping costs to sum as work.
       let detail='';
       if(owner.startsWith('operator-')&&!owner.includes('/')){
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
      if(perfPanel&&perfTimeline)perfPanel.update(output,perfTimeline,
       stats?.presentationSightPolicy??'planning',
       idle3dExperiment?viewMode+' idle3d30':viewMode);
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
  if(perfTimeline){
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
  physicalActionRings.clear();
 }
 function start():void{
  if(running)return;
  running=true;last=performance.now();scheduleFrame();
 }
 function stop():void{
  running=false;resetPresentation();
 }
 return {start,stop,resetPresentation};
}
