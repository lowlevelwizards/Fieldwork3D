/** Single owner of authored-plan mutation, coherent history and knowledge-safe preview.
 * Execution, physical collision and the 60 Hz clock stay in breach-game/motor.
 */
import {type Door,type Pt,doorCenter,segmentsCross} from './breach-core.ts';
import {copyNodes,record,undo,redo,makeHistory,type PlanNode,
  type PlanHistory,type PlanControlSnapshot} from './breach-plan.ts';
import {routeWithSqueezeWorld,routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {pieArc,type PieSide} from './breach-maneuvers.ts';
import {intelPassable,doorKnown} from './breach-intel.ts';
import {doorReachable,handlePoint} from './breach-door.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {Session,TeamActor,SquadPlanTransaction} from './breach-game.ts';

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const clonePt=(p:Pt|null|undefined)=>p?{...p}:null;
export function capturePlanControls(a:TeamActor):PlanControlSnapshot{
 return {
  posture:a.posture,pace:a.pace,firePolicy:a.firePolicy,
  suppressPoint:clonePt(a.suppressPoint),focusTargetId:a.focusTargetId,
  haltOnContact:a.haltOnContact,
  aimInstruction:a.aimInstruction?{...a.aimInstruction,
    point:clonePt(a.aimInstruction.point)??undefined}:null
 };
}
function copyControls(x:PlanControlSnapshot):PlanControlSnapshot{
 return {...x,suppressPoint:clonePt(x.suppressPoint),
  aimInstruction:x.aimInstruction?{...x.aimInstruction,
    point:clonePt(x.aimInstruction.point)??undefined}:null};
}
function restoreControls(a:TeamActor,x:PlanControlSnapshot){
 a.posture=x.posture;a.pace=x.pace;a.firePolicy=x.firePolicy;
 a.suppressPoint=clonePt(x.suppressPoint);
 a.focusTargetId=x.focusTargetId;a.haltOnContact=x.haltOnContact;
 a.aimInstruction=x.aimInstruction?{...x.aimInstruction,
   point:clonePt(x.aimInstruction.point)??undefined}:null;
}
/** Planner's derived path is not physical world truth. An undiscovered wall
 * cannot change a waypoint preview even though the live motor will collide. */
export function pathFor(a:TeamActor,s?:Session){
 const points:Pt[]=[];let from=a.p;
 for(const n of a.plan){
  if(n.kind==='move'||n.kind==='door'){
   const segment=s?routeWithSqueezeIntel(s.intel,from,n.p):
     routeWithSqueezeWorld(from,n.p);
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
function pushControlUndo(h:PlanHistory,before:PlanControlSnapshot){
 const length=h.undo.length;
 h.undoControls??=[];
 // Legacy plan-only histories cannot supply missing base snapshots.
 while(h.undoControls.length<length-1)h.undoControls.push(copyControls(before));
 h.undoControls.push(copyControls(before));
 if(h.undoControls.length>40)h.undoControls.shift();
 h.redoControls=[];
}
/** A commit is either one real change or none. No-op commands neither burn
 * IDs nor pollute undo history. Non-route actions do not reset motor state. */
export function edit(s:Session,a:TeamActor,fn:()=>void):boolean{
 if(s.phase!=='planning')return false;
 const before=copyNodes(a.plan),controls=capturePlanControls(a);
 const nextId=s.nextId,syncCode=s.syncCode;
 try{fn();}
 catch(error){
  a.plan=before;restoreControls(a,controls);
  s.nextId=nextId;s.syncCode=syncCode;
  throw error;
 }
 const planChanged=!same(before,a.plan);
 const controlChanged=!same(controls,capturePlanControls(a));
 if(!planChanged&&!controlChanged){
  s.nextId=nextId;s.syncCode=syncCode;
  return false;
 }
 record(a.history,before);
 pushControlUndo(a.history,controls);
 if(planChanged)pathFor(a,s);
 if(s.squadEntryUndo?.members.includes(a.id))s.squadEntryUndo=null;
 if(s.squadEntryRedo?.members.includes(a.id))s.squadEntryRedo=null;
 return true;
}

/** A PIE is a player prediction based on discovered obstacles, not a
 * speculative query against concealed collision or door state. */
export function validKnownPieArc(s:Session,start:Pt,pivot:Pt,
 side:PieSide,degrees=54):Pt[]{
 const arc=pieArc(start,pivot,side,degrees),world=sessionWorldGeometry(s);
 if(!arc.length||!intelPassable(start,s.intel,SQUEEZE_RADIUS))return [];
 let from=start;
 for(const p of arc){
  if(!intelPassable(p,s.intel,SQUEEZE_RADIUS))return [];
  const ray={a:from,b:p};
  if(world.walls.some((w,i)=>s.intel.walls.has(i)&&segmentsCross(ray,w)))
   return [];
  if(s.doors.some(door=>doorKnown(s.intel,door.id)&&
    (s.intel.doorMemory.get(door.id)??0)<.72&&
    segmentsCross(ray,door)))return [];
  if(!routeWithSqueezeIntel(s.intel,from,p).length)return [];
  from=p;
 }
 return arc;
}
/** Door staging considers the geometry of a KNOWN portal and otherwise only
 * discovered passability. The motor validates actual access on execution. */
export function knownDoorApproach(s:Session,from:Pt,door:Door):Pt|null{
 if(!doorKnown(s.intel,door.id))return null;
 const center=doorCenter(door),handle=handlePoint(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const length=Math.hypot(dx,dy)||1;
 const tangent={x:dx/length,y:dy/length};
 const normal={x:-tangent.y,y:tangent.x};
 const sign=Math.sign((from.x-center.x)*normal.x+
   (from.y-center.y)*normal.y)||1;
 const candidates:Pt[]=[from];
 for(const base of [handle,center])
  for(const depth of [20,24,29])
   for(const along of [0,-12,12])
    candidates.push({x:base.x+normal.x*depth*sign+tangent.x*along,
      y:base.y+normal.y*depth*sign+tangent.y*along});
 const legal=candidates.flatMap((p,index)=>{
  if(!doorReachable(p,door)||!intelPassable(p,s.intel,SQUEEZE_RADIUS))
   return [];
  const route=routeWithSqueezeIntel(s.intel,from,p);
  if(!route.length&&Math.hypot(from.x-p.x,from.y-p.y)>.01)return [];
  let prev=from,total=0;
  for(const next of route){total+=Math.hypot(prev.x-next.x,prev.y-next.y);prev=next;}
  return [{p,index,total}];
 });
 legal.sort((a,b)=>a.total-b.total||a.index-b.index);
 return legal[0]?.p??null;
}
/** Recalculate dependent PIE arcs after an earlier waypoint changes, always
 * using knowledge consistent with ordinary MOVE and gesture authoring. */
export function validEditedPlan(s:Session,start:Pt,proposed:PlanNode[]){
 let from=start;
 for(const n of proposed){
  if(n.kind==='pie'){
   if(!n.pivot||!n.pieSide)return false;
   const arc=validKnownPieArc(s,from,n.pivot,n.pieSide,n.pieDegrees??54);
   if(!arc.length)return false;
   n.arc=arc;n.p={...arc[arc.length-1]};from=n.p;
  }else if(n.kind==='move'||n.kind==='door'){
   if(!intelPassable(n.p,s.intel,SQUEEZE_RADIUS)||
      !routeWithSqueezeIntel(s.intel,from,n.p).length||
      (n.kind==='door'&&!!n.doorId&&!doorKnown(s.intel,n.doorId)))
    return false;
   from=n.p;
  }
 }
 return true;
}

type PartyLookup=(s:Session,id:string)=>TeamActor|undefined;
function cloneHistory(h:PlanHistory):PlanHistory{
 return {undo:h.undo.map(copyNodes),redo:h.redo.map(copyNodes),
  undoControls:h.undoControls?.map(copyControls),
  redoControls:h.redoControls?.map(copyControls)};
}
type SavedActor={
 actor:TeamActor;plan:PlanNode[];controls:PlanControlSnapshot;
 history:PlanHistory;path:Pt[];nav:Pt[];activeNode:number;
 autoSidestep:TeamActor['autoSidestep'];waitRemaining:number;
 actionTimer:number;syncReady:TeamActor['syncReady'];pieIndex:number;
};
function saveActor(actor:TeamActor):SavedActor{
 return {actor,plan:copyNodes(actor.plan),controls:capturePlanControls(actor),
  history:cloneHistory(actor.history),path:actor.path.map(p=>({...p})),
  nav:actor.nav.map(p=>({...p})),activeNode:actor.activeNode,
  autoSidestep:actor.autoSidestep,waitRemaining:actor.waitRemaining,
  actionTimer:actor.actionTimer,syncReady:actor.syncReady,pieIndex:actor.pieIndex};
}
function restoreActor(saved:SavedActor){
 const a=saved.actor;
 a.plan=copyNodes(saved.plan);a.history=cloneHistory(saved.history);
 restoreControls(a,saved.controls);
 a.path=saved.path.map(p=>({...p}));a.nav=saved.nav.map(p=>({...p}));
 a.activeNode=saved.activeNode;a.autoSidestep=saved.autoSidestep;
 a.waitRemaining=saved.waitRemaining;a.actionTimer=saved.actionTimer;
 a.syncReady=saved.syncReady;a.pieIndex=saved.pieIndex;
}
/** A multi-operator button action is one atomic user transaction. Internal
 * calls can freely use existing validation/edit APIs; failure rolls back all
 * authored states, history, IDs and coordination. Successful writes coalesce
 * into exactly one undo step per touched operator. */
export function atomicTeamEdit(s:Session,members:readonly TeamActor[],
 perform:()=>boolean):boolean{
 if(s.phase!=='planning'||!members.length)return false;
 const saved=[...new Set(members)].map(saveActor);
 const nextId=s.nextId,syncCode=s.syncCode;
 const undoGroup=s.squadEntryUndo,redoGroup=s.squadEntryRedo;
 const rollback=()=>{
  saved.forEach(restoreActor);
  s.nextId=nextId;s.syncCode=syncCode;
  s.squadEntryUndo=undoGroup;s.squadEntryRedo=redoGroup;
  return false;
 };
 let accepted=false;
 try{accepted=perform();}catch(error){rollback();throw error;}
 if(!accepted)return rollback();
 const changed=saved.filter(b=>!same(b.plan,b.actor.plan)||
   !same(b.controls,capturePlanControls(b.actor)));
 if(!changed.length)return rollback();
 for(const before of changed){
  const a=before.actor;
  a.history={undo:[...before.history.undo,copyNodes(before.plan)].slice(-40),
   redo:[],undoControls:[...(before.history.undoControls??[]),
     copyControls(before.controls)].slice(-40),redoControls:[]};
  if(!same(before.plan,a.plan))pathFor(a,s);
 }
 const group:SquadPlanTransaction={
  members:changed.map(b=>b.actor.id),
  before:Object.fromEntries(changed.map(b=>[b.actor.id,copyNodes(b.plan)])),
  after:Object.fromEntries(changed.map(b=>[b.actor.id,copyNodes(b.actor.plan)])),
  controlsBefore:Object.fromEntries(changed.map(b=>[b.actor.id,copyControls(b.controls)])),
  controlsAfter:Object.fromEntries(changed.map(b=>[b.actor.id,capturePlanControls(b.actor)]))
 };
 s.squadEntryUndo=group;s.squadEntryRedo=null;
 return true;
}
function plansMatch(s:Session,group:SquadPlanTransaction,party:PartyLookup,
 key:'before'|'after',direction:'undo'|'redo'):boolean{
 return group.members.every(id=>{
  const a=party(s,id);
  return !!a&&same(a.plan,group[key][id])&&
   same(capturePlanControls(a),group[key==='before'?
     'controlsBefore':'controlsAfter']?.[id]??capturePlanControls(a))&&
   (direction==='undo'?a.history.undo.length:a.history.redo.length)>0;
 });
}
function historyStep(s:Session,a:TeamActor,direction:'undo'|'redo'):boolean{
 const h=a.history,prior=capturePlanControls(a);
 const nodes=direction==='undo'?undo(h,a.plan):redo(h,a.plan);
 if(!nodes)return false;
 if(direction==='undo'){
  const restored=h.undoControls?.pop();
  h.redoControls??=[];h.redoControls.push(prior);
  if(restored)restoreControls(a,restored);
 }else{
  const restored=h.redoControls?.pop();
  h.undoControls??=[];h.undoControls.push(prior);
  if(restored)restoreControls(a,restored);
 }
 const planChanged=!same(a.plan,nodes);
 a.plan=nodes;
 if(planChanged)pathFor(a,s);
 return true;
}
export function undoAuthoredPlan(s:Session,id:string,party:PartyLookup):boolean{
 const a=party(s,id);if(!a||s.phase!=='planning')return false;
 const group=s.squadEntryUndo;
 if(group&&group.members.includes(id)&&plansMatch(s,group,party,'after','undo')){
  for(const member of group.members)historyStep(s,party(s,member)!,'undo');
  s.squadEntryUndo=null;s.squadEntryRedo=group;
  return true;
 }
 s.squadEntryUndo=null;s.squadEntryRedo=null;
 return historyStep(s,a,'undo');
}
export function redoAuthoredPlan(s:Session,id:string,party:PartyLookup):boolean{
 const a=party(s,id);if(!a||s.phase!=='planning')return false;
 const group=s.squadEntryRedo;
 if(group&&group.members.includes(id)&&plansMatch(s,group,party,'before','redo')){
  for(const member of group.members)historyStep(s,party(s,member)!,'redo');
  s.squadEntryRedo=null;s.squadEntryUndo=group;
  return true;
 }
 s.squadEntryUndo=null;s.squadEntryRedo=null;
 return historyStep(s,a,'redo');
}
/** An execution boundary closes planning history. Pausing again edits only
 * orders still queued, never resurrects orders that the motor consumed. */
export function sealPlanHistoryForExecution(s:Session):void{
 for(const a of s.operators)if(a.side==='blue')a.history=makeHistory();
 s.squadEntryUndo=null;s.squadEntryRedo=null;
}
