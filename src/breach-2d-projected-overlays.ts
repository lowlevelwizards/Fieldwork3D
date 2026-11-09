/** Draws tactical geometry projected over the Three.js camera. Only
 * presentation; hit testing, order execution and depth belong elsewhere.
 */
import {doorCenter,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,team,enemies,isSeen,lastKnown,
 liveVisibility,plannedWindowRoute,flashTrajectory} from './breach-game.ts';
import type {TacticalScene3D} from './breach-3d.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {orderVisualScopes} from './ui/order-visual-state.ts';
import {intelPassable} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {doorReachable} from './breach-door.ts';
import {doorVisibility} from './breach-presentation.ts';
import {replayActorDisclosed} from './breach-replay-visibility.ts';
import type {DisplayRouteCache} from './breach-route-cache.ts';
import type {ProjectedRouteCache} from './breach-plan-projection-cache.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {createBreach2DRouteOverlays} from './breach-2d-route-overlays.ts';
import type {createBreach2DReplayOverlays} from './breach-2d-replay-overlays.ts';
export type Projected2DFrame={
 state:Session;replaying:boolean;selected:string;selectedNode:number|null;
 selectedActiveWatch:boolean;draggingNode:Pt|null;draggingWatchTarget:boolean;
 trace:Pt[]|null;replayPlanVersion:'active'|'original';
 replayPlanScope:'all'|'selected'|'none';
 replayNameTags:boolean;replayContactMarkers:boolean;
 replayObjectiveMarkers:boolean;replayAnalysis:boolean;
 doorFocusId:string|null;stage:TacticalScene3D|null;
 cssW:number;cssH:number;dpr:number;
};
export function createBreach2DProjectedOverlays(config:{
 draw:CanvasRenderingContext2D;
 line:(a:Pt,b:Pt,color:string,width:number)=>void;
 uid:(id:string)=>TeamActor|undefined;
 circle:(x:number,y:number,r:number,color:string)=>void;
 worldToScreen:(p:Pt,height?:number)=>Pt;
 colorFor:(id:string)=>string;
 getFrame:()=>Projected2DFrame;
 selectedPlanNode:()=>TeamActor['plan'][number]|undefined;
 displayRouteCache:DisplayRouteCache;
 projectedRouteCache:ProjectedRouteCache;
 drawExecutionProblem:(a:TeamActor,projected:boolean)=>void;
 replayKnowledge:ReplayKnowledgeController;
 replayCamera:ReplayCameraController;
 route2D:ReturnType<typeof createBreach2DRouteOverlays>;
 replay2D:ReturnType<typeof createBreach2DReplayOverlays>;
}){
 const {draw,line,circle,uid,worldToScreen,colorFor,getFrame,selectedPlanNode,
   displayRouteCache,projectedRouteCache,drawExecutionProblem,replayKnowledge,
   replayCamera,route2D,replay2D}=config;
 const {draftRouteNeighbors,drawActiveWatchMarker,replayPlanFor}=route2D;
function renderProjectedPlans(){
 const {state,replaying,selected,selectedNode,selectedActiveWatch,draggingNode,draggingWatchTarget,trace,replayPlanVersion,replayPlanScope,replayNameTags,replayContactMarkers,replayObjectiveMarkers,replayAnalysis,doorFocusId,stage,cssW,cssH,dpr}=getFrame();
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
  replay2D.renderReplayMovementHistory(true);
  replay2D.renderReplayGhosts(true);
  replay2D.renderReplayBallistics(true);
  replay2D.renderReplayFollowMarker(true);
  if(!replaying||replayAnalysis)
    for(const a of team(state))drawExecutionProblem(a,true);
}

 return {renderProjectedPlans};
}
