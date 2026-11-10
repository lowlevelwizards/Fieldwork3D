/** Stage 4: release semantics; gesture lifecycle remains in gesture controller.
 * No authoritative planning or camera sight runs from a pointer preview.
 */
import {team,planWatch,retargetActiveWatch,movePlanNode,moveFlashTarget,planMoveStroke,finalPoint,type Session,type TeamActor} from './breach-game.ts';
import {doorCenter,activeWorldBounds,type Pt} from './breach-core.ts';
import type {TacticalPointer} from './breach-canvas-gesture-controller.ts';
import type {TacticalPick} from './ui/tactical-target-resolver.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import type {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import type {createBreachReplayAnalysisController} from './ui/breach-replay-analysis-controller.ts';
import type {createTacticalHudController} from './ui/tactical-hud-controller.ts';
import type {TacticalFeedback} from './ui/tactical-feedback.ts';
import {shotScreenHit} from './breach-replay-shot-inspector.ts';
import {insideTacticalBounds,aimTargetFromTap} from './ui/aim-target.ts';
import {orderFailureText} from './breach-nav-diagnostics.ts';
import {intelPassable,doorKnown} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {simplifyStrokePoints} from './ui/touch-hit-targets.ts';
import {doorReachable} from './breach-door.ts';
export type PointerCommandPort={
 readonly state:Session;readonly replaying:boolean;
 readonly replayBodycam:Pick<ReplayBodycamController,'active'>;
 readonly replayTraceMode:string;readonly viewMode:'plan2d'|'iso'|'top';readonly recorder:MissionRecorder;
 readonly replayPlayback:ReplayPlaybackController;
 readonly replayAnalysisUi:ReturnType<typeof createBreachReplayAnalysisController>;
 readonly hudController:ReturnType<typeof createTacticalHudController>;
 readonly selected:string;selectedNode:number|null;
 selectedActiveWatch:boolean;doorFocusId:string|null;doorMenuDismissedId:string|null;
 readonly flashMode:boolean;readonly pushMode:boolean;
 readonly firePlacement:string|null;
 readonly evacMode:{patientId:string;mode:'drag'|'carry'}|null;
 readonly trace:Pt[]|null;readonly tacticalFeedback:TacticalFeedback;
 pointerAimWorld:(event:PointerEvent,height?:number)=>Pt;
 pointerWorld:(event:PointerEvent)=>Pt;
 worldToScreen:(p:Pt,height?:number)=>Pt;
 followReplayOperator:(id:string)=>void;
 historicalShotVisible:(shot:import('./breach-replay-ballistics.ts').RecordedShot)=>boolean;
 selectUnit:(id:string)=>void;useSelectedGround:(point:Pt)=>void;
 showUiHelp:(text:string,duration?:number)=>void;
 adoptPointerOwner:(pointer:{pick?:TacticalPick|null})=>void;
 uid:(id:string)=>TeamActor|undefined;
 rejectAt:(point:Pt,reason:string)=>void;
 teach:(key:string,text:string,duration?:number)=>void;
 insertAtRouteLine:(screen:Pt,pointerKind:string)=>boolean;
 selectedPlanNode:()=>TeamActor['plan'][number]|undefined;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function dispatchTacticalPointerRelease(port:PointerCommandPort,e:PointerEvent,
 p:TacticalPointer,cancelled:boolean,pointerCount:number):void{
  const pt=port.hudController.facing.looking?port.pointerAimWorld(e):
    p.mode==='activeWatch'||p.mode==='watchTarget'?
      port.pointerAimWorld(e,12):port.pointerWorld(e);
  // During replay, a deliberate single tap on a friendly miniature
  // follows that operator. Two-finger gestures, camera drags, and scrubbing
  // never steal camera focus. Avoid interpreting the same tap as a shot.
  let tappedReplayOperator=false;
  if(!cancelled&&port.replaying&&!port.replayBodycam.active&&
     pointerCount===1&&!p.moved&&p.mode==='undecided'){
    const finger={x:e.clientX,y:e.clientY};
    const nearest=team(port.state).filter(actor=>actor.health>0)
      .map(actor=>({id:actor.id,d:distance(
        port.worldToScreen(actor.p,port.viewMode==='plan2d'?0:24),finger)}))
      .sort((a,b)=>a.d-b.d)[0];
    if(nearest&&nearest.d<=(e.pointerType==='touch'?36:26)){
      tappedReplayOperator=true;
      port.followReplayOperator(nearest.id);
    }
  }
  if(!tappedReplayOperator&&!cancelled&&port.replaying&&port.replayTraceMode!=='off'&&
    pointerCount===1&&!p.moved&&p.mode==='undecided'){
    const hit=shotScreenHit(port.recorder.ballistics.between(
      Math.max(0,port.replayPlayback.time-3),port.replayPlayback.time),port.replayPlayback.time,
      {x:e.clientX,y:e.clientY},
      (point,height)=>port.worldToScreen(point,port.viewMode==='plan2d'?0:height),
      port.historicalShotVisible,e.pointerType==='touch'?30:22);
    if(hit)port.replayAnalysisUi.selectReplayShot(hit);
  }
  if(!cancelled&&!port.replaying&&port.state.phase!=='planning'&&
     pointerCount===1&&!p.moved&&p.mode==='undecided'&&
     p.pick?.kind==='operator'&&p.pick.owner){
    port.selectUnit(p.pick.owner);
  }
  // A surviving finger from a pinch/camera gesture is never a tactical tap.
  // Gesture cancellation is owned by the gesture controller; this boundary
  // independently refuses camera-mode releases even if moved is false.
  const cameraRelease=p.mode==='cameraMulti'||p.mode==='cameraOrbit'||
    p.mode==='cameraPan';
  if(!cancelled&&!cameraRelease&&port.state.phase==='planning'&&
     !port.replaying&&pointerCount===1){
    if((port.hudController.facing.looking||port.flashMode||port.pushMode||port.firePlacement||port.evacMode)&&
       (p.mode==='targetPreview'||p.mode==='undecided')){
      // A brief iPhone tap often travels a few pixels without entering
      // targetPreview. Always commit an armed target on release, even then.
      // CameraMulti/cancelled pointers remain excluded.
      // LOOK/WATCH are directions and may deliberately point across an
      // unseen door or beyond the property; other commands still require a
      // point inside the real procedural site bounds, not legacy W/H.
      if(port.hudController.facing.looking||insideTacticalBounds(pt,activeWorldBounds()))
        port.useSelectedGround(pt);
      else port.showUiHelp('TAP INSIDE THE MAP TO PLACE THE TARGET',2700);
    }else if(p.mode==='activeWatch'){
      port.adoptPointerOwner(p);
      const target=aimTargetFromTap(port.uid(port.selected)?.p??pt,pt);
      const accepted=!p.dragCommitted||
        (!!target&&retargetActiveWatch(port.state,port.selected,target));
      if(!accepted)port.rejectAt(pt,'WATCH TARGET TOO CLOSE OR INVALID');
      port.selectedNode=null;port.selectedActiveWatch=true;port.doorFocusId=null;
      if(accepted)port.tacticalFeedback.emit(p.dragCommitted?'command':'select',pt,
        p.dragCommitted?'WATCH RETARGETED':undefined);
    }else if(p.mode==='watchTarget'&&p.nodeId!==null){
      port.adoptPointerOwner(p);
      const node=port.uid(port.selected)?.plan.find(n=>n.id===p.nodeId);
      const target=node?aimTargetFromTap(node.p,pt):null;
      const accepted=!p.dragCommitted||
        (!!target&&planWatch(port.state,port.selected,target,p.nodeId));
      if(!accepted)port.rejectAt(pt,'WATCH TARGET UNAVAILABLE');
      port.selectedNode=p.nodeId;port.doorFocusId=null;
      if(accepted)port.tacticalFeedback.emit(p.dragCommitted?'command':'select',pt,
        p.dragCommitted?'WATCH UPDATED':undefined);
    }else if(p.mode==='node'&&p.nodeId!==null){
      port.adoptPointerOwner(p);
      if(p.dragCommitted){
        const moving=port.uid(port.selected)?.plan.find(node=>node.id===p.nodeId);
        const moved=moving?.kind==='flash'?
          moveFlashTarget(port.state,port.selected,p.nodeId,pt):
          movePlanNode(port.state,port.selected,p.nodeId,pt);
        if(!moved){
          const chosen=port.uid(port.selected)?.plan.find(n=>n.id===p.nodeId);
          const origin=port.uid(port.selected)?.p??pt;
          port.rejectAt(pt,orderFailureText(origin,pt,{
            // The failure message must use the SAME narrow-body clearance
            // rules as planning. Otherwise reachable squeeze positions are
            // incorrectly reported as having "insufficient clearance".
            canStand:at=>intelPassable(at,port.state.intel,SQUEEZE_RADIUS),
            routeTo:(a,b)=>routeWithSqueezeIntel(port.state.intel,a,b),
            remainingPlanValid:chosen?.kind==='move'?false:undefined
          }));
        }
      }
      port.selectedNode=p.nodeId;port.doorFocusId=null;
      const chosen=port.uid(port.selected)?.plan.find(n=>n.id===p.nodeId);
      if(chosen)port.tacticalFeedback.emit('node',chosen.p);
    }else if(p.mode==='route'&&port.trace&&
      distance(port.trace[0],pt)>16){
      // The finger trace is a high-frequency preview, NOT one order per
      // input sample. Preserve meaningful screen-space bends and reject
      // simplifications that would cut across KNOWN obstacles. Unseen
      // obstacles remain undisclosed to the plan author.
      const points=simplifyStrokePoints([...port.trace,pt],
        point=>port.worldToScreen(point,8),15,(from,to)=>{
          const span=distance(from,to);
          const steps=Math.max(1,Math.ceil(span/4));
          for(let i=1;i<steps;i++){
            const t=i/steps;
            if(!intelPassable({x:from.x+(to.x-from.x)*t,
               y:from.y+(to.y-from.y)*t},port.state.intel,SQUEEZE_RADIUS))
              return false;
          }
          return true;
        });
      // A stroke that starts on the operator's HERE marker REPLACES the
      // queued plan, even when it contains several waypoints. Appending
      // still happens via taps and gestures on the existing route end.
      // planMoveStroke records the entire replacement as one undoable edit.
      const strokeOutcome={clipped:false,endpoint:pt};
      if(!planMoveStroke(port.state,port.selected,points.slice(1),false,true,strokeOutcome))
        port.rejectAt(pt,'NO WALKABLE STROKE · PREVIOUS ROUTE KEPT');
      else{
        port.selectedActiveWatch=false;
        port.selectedNode=port.uid(port.selected)?.plan.filter(n=>n.kind==='move')
          .at(-1)?.id??null;
        const watchKept=port.uid(port.selected)?.plan.some(n=>n.aimMode==='track')||
          port.uid(port.selected)?.aimInstruction?.mode==='track';
        if(strokeOutcome.clipped)
          port.tacticalFeedback.emit('node',strokeOutcome.endpoint);
        port.showUiHelp((strokeOutcome.clipped?
          'ROUTE ENDS AT LAST CLEAR POINT · UNDO TO RESTORE':
          'ROUTE REPLACED FROM HERE · UNDO TO RESTORE')+
          (watchKept?' · WATCH KEPT':''),3200);
      }
      port.doorFocusId=null;
    }else if(!p.moved&&insideTacticalBounds(pt,activeWorldBounds())){
      // The hit was captured at pointer-down, but no selection/order was
      // committed before the gesture resolved. Camera gestures never reach
      // this branch and a tap can produce only one semantic outcome.
      const pick=p.pick;
      if(pick?.kind==='operator'&&pick.owner){
        port.selectUnit(pick.owner);
        port.tacticalFeedback.emit('select',port.uid(pick.owner)?.p??pt);
      }else if(pick?.kind==='door'&&pick.doorId){
        const door=port.state.doors.find(d=>d.id===pick.doorId&&
          doorKnown(port.state.intel,d.id));
        const actor=port.uid(port.selected),node=port.selectedPlanNode();
        const origins=actor?(node?[node.p]:[finalPoint(actor),actor.p]):[];
        if(door&&origins.some(origin=>doorReachable(origin,door))){
          port.doorFocusId=door.id;port.selectedNode=null;port.selectedActiveWatch=false;
          port.doorMenuDismissedId=null;
          port.tacticalFeedback.emit('select',doorCenter(door));
          port.teach('door-selected',
            'Door selected. Choose OPEN, KICK or another available action.',4700);
        }else if(door){
          port.showUiHelp('NO DOOR ACTION IN REACH · PLAN AN APPROACH',2200);
        }
      }else if(pick?.kind==='route'&&pick.owner){
        if(pick.owner!==port.selected){
          // First touch on another operator's line is selection only.
          port.selectUnit(pick.owner);
          port.tacticalFeedback.emit('select',port.uid(pick.owner)?.p??pt);
        }else{
          port.insertAtRouteLine({x:e.clientX,y:e.clientY},e.pointerType);
        }
      }else if(!pick){
        port.doorFocusId=null;port.useSelectedGround(pt);
      }

    }
  }
}
