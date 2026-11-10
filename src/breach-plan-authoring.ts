import {sessionWorldGeometry} from './breach-world-context.ts';
/** Authoritative authored-plan transactions and history; movement routes are transient. */
import {type Pt} from './breach-core.ts';
import {copyNodes,record,undo,redo,type PlanNode} from './breach-plan.ts';
import {routeWithSqueezeWorld,routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {validPieArc} from './breach-maneuvers.ts';
import {intelPassable} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import type {Session,TeamActor,SquadPlanTransaction} from './breach-game.ts';

export function pathFor(a:TeamActor,s?:Session){
  const points:Pt[]=[];let from=a.p;
  for(const n of a.plan){
    if(n.kind==='move'||n.kind==='door'){
      const segment=routeWithSqueezeWorld(from,n.p,[],s?sessionWorldGeometry(s):undefined);
      if(!segment.length)continue;
      points.push(...segment);from=n.p;
    }else if(n.kind==='pie'&&n.arc?.length){
      points.push(...n.arc);from=n.arc[n.arc.length-1];
    }
  }
  a.path=points;
  a.activeNode=-1;a.nav=[];a.autoSidestep=null;
  a.waitRemaining=0;a.actionTimer=0;
  a.syncReady=null;a.pieIndex=0;
}
export function edit(s:Session,a:TeamActor,fn:()=>void){
  if(s.phase!=='planning')return false;
  const before=copyNodes(a.plan);
  fn();
  record(a.history,before);pathFor(a,s);
  return true;
}

/** Recalculate dependent pie arcs when an earlier waypoint changes. */
export function validEditedPlan(s:Session,start:Pt,proposed:PlanNode[]){
  let from=start;
  for(const n of proposed){
  if(n.kind==='pie'){
      if(!n.pivot||!n.pieSide)return false;
      const arc=validPieArc(from,n.pivot,n.pieSide,s.doors,n.pieDegrees??54,sessionWorldGeometry(s));
      if(!arc.length)return false;
      n.arc=arc;n.p={...arc[arc.length-1]};from=n.p;
    }else if(n.kind==='move'||n.kind==='door'){
      if(n.kind==='move'?!intelPassable(n.p,s.intel,SQUEEZE_RADIUS)||
        !routeWithSqueezeIntel(s.intel,from,n.p).length:
        !sessionWorldGeometry(s).passable(n.p)||
        !sessionWorldGeometry(s).route(from,n.p).length)return false;
      from=n.p;
    }
  }
  return true;
}

type PartyLookup=(s:Session,id:string)=>TeamActor|undefined;
/** Exact-match squad transactions only apply while no participant's
 * authored orders have changed. Otherwise ordinary per-actor undo wins. */
function squadPlansMatch(s:Session,group:SquadPlanTransaction,party:PartyLookup,
 key:'before'|'after',direction:'undo'|'redo'):boolean{
 return group.members.every(id=>{
   const a=party(s,id);
   return !!a&&JSON.stringify(a.plan)===JSON.stringify(group[key][id])&&
     (direction==='undo'?a.history.undo.length:a.history.redo.length)>0;
 });
}
export function undoAuthoredPlan(s:Session,id:string,party:PartyLookup){
  const a=party(s,id);if(!a||s.phase!=='planning')return false;
  const group=s.squadEntryUndo;
  if(group&&group.members.includes(id)&&squadPlansMatch(s,group,party,'after','undo')){
    for(const member of group.members){
      const peer=party(s,member)!;
      const previous=undo(peer.history,peer.plan)!;
      peer.plan=previous;pathFor(peer,s);
    }
    s.squadEntryUndo=null;s.squadEntryRedo=group;
    return true;
  }
  s.squadEntryUndo=null;s.squadEntryRedo=null;
  const previous=undo(a.history,a.plan);if(!previous)return false;
  a.plan=previous;pathFor(a,s);return true;
}
export function redoAuthoredPlan(s:Session,id:string,party:PartyLookup){
  const a=party(s,id);if(!a||s.phase!=='planning')return false;
  const group=s.squadEntryRedo;
  if(group&&group.members.includes(id)&&squadPlansMatch(s,group,party,'before','redo')){
    for(const member of group.members){
      const peer=party(s,member)!;
      const next=redo(peer.history,peer.plan)!;
      peer.plan=next;pathFor(peer);
    }
    s.squadEntryRedo=null;s.squadEntryUndo=group;
    return true;
  }
  s.squadEntryUndo=null;s.squadEntryRedo=null;
  const next=redo(a.history,a.plan);if(!next)return false;
  a.plan=next;pathFor(a);return true;
}

