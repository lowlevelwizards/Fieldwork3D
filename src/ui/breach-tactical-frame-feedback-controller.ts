/** Roadmap 2 Stage 4: tactical command feedback and preview presentation.
 * The live simulation owns blocking, order feasibility and all mutations.
 */
import {type Pt} from '../breach-core.ts';
import {sessionWorldGeometry} from '../breach-world-context.ts';
import {insideTacticalBounds} from './aim-target.ts';
import {team,finalPoint,type Session,type TeamActor} from '../breach-game.ts';
import {canRelocateCover,coverPushDistance} from '../breach-movable-cover.ts';
import {angleDifference} from '../breach-plan.ts';
import type {TacticalPointer} from '../breach-canvas-gesture-controller.ts';
import type {createTacticalHudController} from './tactical-hud-controller.ts';
import type {TacticalFeedback,TacticalOrderPreview} from './tactical-feedback.ts';
import {KnownRoutePreviewSampler} from './known-route-preview.ts';
export type FrameFeedbackState={
 state:Session;replaying:boolean;selected:string;
 feedbackDraw:CanvasRenderingContext2D|null;
 dpr:number;cssW:number;cssH:number;
 activePointers:ReadonlyMap<number,TacticalPointer>;
 cursor:Pt|null;previewHover:boolean;
 hudController:ReturnType<typeof createTacticalHudController>;
 flashMode:boolean;firePlacement:'suppress'|null;
 evacMode:{patientId:string;mode:'drag'|'carry'}|null;pushMode:boolean;
 uid:(id:string)=>TeamActor|undefined;
 selectedPlanNode:()=>TeamActor['plan'][number]|undefined;
 tacticalFeedback:TacticalFeedback;
 worldToScreen:(p:Pt,height?:number)=>Pt;
 reducedMotion:boolean;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function createBreachTacticalFrameFeedbackController(config:{
 snapshot:()=>FrameFeedbackState;
 warn:()=>void;
}){
 const blockedEpisode=new Map<string,string>();
 const routePreview=new KnownRoutePreviewSampler();
 function rejectAt(pt:Pt,reason:string):void{
  const {state,hudController}=config.snapshot();
  state.events.push(reason);
  hudController.rejectAttempt(pt,reason,config.warn);
 }
 function draw(studioOccludesTactical:boolean):void{
 const {state,replaying,selected,feedbackDraw,dpr,cssW,cssH,
   activePointers,cursor,previewHover,hudController,flashMode,firePlacement,
   evacMode,pushMode,uid,selectedPlanNode,tacticalFeedback,worldToScreen,
   reducedMotion}=config.snapshot();
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
        authoringPointer.mode))&&
      insideTacticalBounds(cursor,sessionWorldGeometry(state).bounds);
    const orderMode=hudController.facing.looking?hudController.facing.lookMode:flashMode?'flash':
      firePlacement??evacMode?.mode;
    const origin=hudController.facing.looking?
      (selectedPlanNode()?.p??(hudController.facing.armedOrigin==='here'?actor?.p:
        actor?finalPoint(actor):undefined)):
      actor?finalPoint(actor):undefined;
    const preview:TacticalOrderPreview|undefined=canPreview&&actor&&origin&&
      orderMode?{origin,direction:cursor!,mode:orderMode}:undefined;
    // Only briefing intel participates: preview is not a promise of a
    // traversable physical route once undiscovered obstacles are revealed.
    const showingMove=canPreview&&actor&&!orderMode&&!pushMode&&
      (!authoringPointer||
       authoringPointer.mode==='route'||authoringPointer.mode==='undecided');
    const proposal=showingMove?
      routePreview.sample(finalPoint(actor),cursor!,state.intel,
        performance.now(),state.objectRevision):null;
    if(proposal){
      const target=worldToScreen(proposal.to,7);
      feedbackDraw.save();
      const reachable=proposal.kind!=='unavailable';
      feedbackDraw.strokeStyle=proposal.kind==='narrow'?'#e8b97c':
        reachable?'#a6d4c4':'#d68e83';
      feedbackDraw.fillStyle=feedbackDraw.strokeStyle;
      feedbackDraw.lineWidth=2;
      feedbackDraw.globalAlpha=.75;
      feedbackDraw.setLineDash(reachable?[5,5]:[2,5]);
      if(reachable){
        const start=worldToScreen(proposal.from,7);
        feedbackDraw.beginPath();feedbackDraw.moveTo(start.x,start.y);
        for(const step of proposal.points){
          const point=worldToScreen(step,7);
          feedbackDraw.lineTo(point.x,point.y);
        }
        feedbackDraw.stroke();
      }
      feedbackDraw.setLineDash([]);
      feedbackDraw.beginPath();
      feedbackDraw.arc(target.x,target.y,reachable?8:11,0,Math.PI*2);
      feedbackDraw.stroke();
      feedbackDraw.globalAlpha=.91;
      feedbackDraw.font='600 10px "Work Sans",sans-serif';
      feedbackDraw.textAlign='center';
      feedbackDraw.fillText(proposal.kind==='normal'?'KNOWN PATH':
        proposal.kind==='narrow'?'NARROW PASSAGE':'NO KNOWN ROUTE',
        target.x,target.y-19);
      feedbackDraw.restore();
    }
    tacticalFeedback.draw(feedbackDraw,p=>worldToScreen(p,7),
      performance.now(),preview,reducedMotion);
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

}



 return {draw,rejectAt,reset:()=>{blockedEpisode.clear();routePreview.reset();}};
}
