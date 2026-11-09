/** 2D authored-order route and marker presentation. No movement authority. */
import {W,H,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,team,flashTrajectory} from './breach-game.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {DisplayRouteCache} from './breach-route-cache.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {orderVisualScopes} from './ui/order-visual-state.ts';
import {intelPassable} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
export type Route2DFrame={
 state:Session;replaying:boolean;selected:string;selectedNode:number|null;
 selectedActiveWatch:boolean;draggingNode:Pt|null;draggingWatchTarget:boolean;
 trace:Pt[]|null;cursor:Pt|null;looking:boolean;
 replayPlanVersion:'active'|'original';replayPlanScope:'all'|'selected'|'none';
 recorder:MissionRecorder;
};
export function createBreach2DRouteOverlays(config:{
 draw:CanvasRenderingContext2D;
 line:(a:Pt,b:Pt,color:string,width:number)=>void;
 circle:(x:number,y:number,r:number,color:string)=>void;
 getFrame:()=>Route2DFrame;
 uid:(id:string)=>TeamActor|undefined;
 colorFor:(id:string)=>string;
 displayRouteCache:DisplayRouteCache;
}){
 const {draw,line,circle,getFrame,uid,colorFor,displayRouteCache}=config;
function draftRouteNeighbors(){
  const {selected,selectedNode,draggingNode,draggingWatchTarget}=getFrame();
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

/** Authored historical orders, not recomputed motor navigation. */
function replayPlanFor(a:TeamActor){
  const {replaying,replayPlanVersion,recorder}=getFrame();
  const initial=replaying&&replayPlanVersion==='original'?
    recorder.plans.initial(a.id):null;
  return {nodes:initial?.nodes??a.plan,
    origin:initial?.origin??a.p};
}
function paths(){
  const {state,replaying,selected,selectedNode,selectedActiveWatch,draggingNode,draggingWatchTarget,trace,cursor,looking,replayPlanVersion,replayPlanScope}=getFrame();
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

 return {paths,draftRouteNeighbors,drawActiveWatchMarker,replayPlanFor};
}
