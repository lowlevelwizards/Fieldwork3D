/** Breach runtime: fixed-step scheduling and presentation synchronization.
 * The authoritative motor, damage, AI and visibility remain in breach-game.ts.
 */
import {stepSession,team,type Session,type TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {fixedStepBudget} from './breach-fixed-clock.ts';
import {renderSnapshot,type RenderActor} from './breach-frame-interpolation.ts';
import {FrameMeter} from './breach-perf.ts';
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

type CampaignMode='menu'|'home'|'mission'|'quick';
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
 renderFrame:()=>void;
 drawTacticalFrameFeedback:(studioOccludesTactical:boolean)=>void;
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
 let last=performance.now(),accum=0,hudAt=0,running=false;
 let previousRenderActors:Record<string,RenderActor>|null=null;
 let previousRenderDoors:Record<string,number>|null=null;

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
  const perfStart=perfOverlay?performance.now():0;
  const frameGap=Math.max(0,now-last);
  const dt=Math.min(.08,frameGap/1000);last=now;
  if(frameMode==='suspended'){
   accum=0;previousRenderActors=null;previousRenderDoors=null;
   physicalActionRings.clear();
   requestAnimationFrame(tick);return;
  }
  let simSteps=0;
  let recordingMs=0;
  const simPhaseCosts=perfOverlay?new Map<string,number>():null;
  if(frameMode==='live'){
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
  // The Studio is an opaque full-screen view. Skip only hidden rendering,
  // never fixed-step gameplay or authoritative replay/simulation state.
  const studioOccludesTactical=config.isStudioVisible()&&
   !replayQuickVideo.active;
  if(!studioOccludesTactical&&stage&&viewMode!=='plan2d')
    stage.setMiniatureFocusContext(replaying,dt);
  if(!studioOccludesTactical&&stage&&viewMode!=='plan2d')
    stage.update(state,selected,dt,doorFocusId,
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
  const overlayBegin=perfOverlay?performance.now():0;
  const sceneUpdateEnd=perfOverlay?performance.now():0;
  if(!studioOccludesTactical)config.renderFrame();
  const renderEnd=perfOverlay?performance.now():0;
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
    const inspected=state.operators.find(a=>a.id===awarenessParam)??config.getSelectedActor();
    awarenessPanel.textContent=inspected?awarenessDebugLine(inspected):
      'No selected actor';
  }
  requestAnimationFrame(tick);
}
 /** Reset render-only leftovers across mission/replay transitions. */
 function resetPresentation():void{
  accum=0;hudAt=0;
  previousRenderActors=null;previousRenderDoors=null;
  physicalActionRings.clear();
 }
 function start():void{
  if(running)return;
  running=true;last=performance.now();requestAnimationFrame(tick);
 }
 function stop():void{
  running=false;resetPresentation();
 }
 return {start,stop,resetPresentation};
}
